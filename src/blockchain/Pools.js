import logger from 'winston';
import { fractionArrayToPercent } from '../utils/fractions';
/**
 * class to keep feathers cache in sync with pools contract
 */
class Pools {
  static get EVENTS() {
    return {
      CONTRACT_INSTANTIATION: 'ContractInstantiation',
      CLOSED: 'Closed',
      TOKEN_PAYOUTS_ENABLED: 'TokenPayoutsEnabled',
      REFUNDS_ENABLED: 'RefundsEnabled',
      PAUSE: 'Pause',
      UNPAUSE: 'Unpause',
      ADMIN_PAYOUT_WALLET_SET: 'AdminPayoutWalletSet',
      ADMIN_POOL_FEE_SET: 'AdminPoolFeeSet',
      MAX_ALLOCATION_CHANGED: 'MaxAllocationChanged',
    };
  }

  constructor(app, web3) {
    this.app = app;
    this.web3 = web3;
    this.pools = this.app.service('pools');
    this.transactions = this.app.service('transactions');
    this.contributions = this.app.service('contributions');

    this.deployed = this.deployed.bind(this);
  }

  async deployed(event) {
    if (event.event !== Pools.EVENTS.CONTRACT_INSTANTIATION)
      throw new Error(`pools.deployed only handles ${Pools.EVENTS.CONTRACT_INSTANTIATION} events`);

    const { msgSender, instantiation, hashMessage, transactionHash, event: eventName } = event.returnValues;
    try {
      const { data: [pool] } = await this.pools.find({
        query: {
          ownerAddress: msgSender,
          status: 'pending_deployment', // ToDo: after updating to mongo, will place all statuses in enum
          inputsHash: hashMessage,
        },
      });

      if (!pool) {
        logger.warn(`No pool found for contract instantiation event from message sender ${msgSender} and pool contract ${instantiation}`);
        return;
      }

      const transaction = await this.transactions.create({
        poolStatus: 'pending_deployment',
        txHash: transactionHash,
        poolAddress: instantiation,
        msgSender,
        eventName,
        data: {},
      });
      return this.pools.patch(pool._id, {
        status: 'active',
        contractAddress: instantiation,
        $push: { transactions: transaction.txHash },
        $unset: { pendingTx: true}
      });
    } catch (err) {
      logger.error(err);
    }
  }
  closed(event) {
    if (event.event !== Pools.EVENTS.CLOSED)
      throw new Error(`pools.closed only handles ${Pools.EVENTS.CLOSED} events`);

    this.updatePool('closed', event);
  }
  async newTokenBatch(event) {
    if (event.event !== Pools.EVENTS.TOKEN_PAYOUTS_ENABLED)
      throw new Error(
        `pools.newTokenBatch only handles ${Pools.EVENTS.TOKEN_PAYOUTS_ENABLED} events`,
      );
    try {
      await this.updatePool('payout_enabled', event, { $inc: { tokenBatchCount: 1 }});
      //patch(null=multi, update, params: {query})
      console.log('event.returnValues.poolContractAddress', event.returnValues.poolContractAddress);
      await this.contributions.patch( // must come before other patch below
        null,
        {
          $push: {
            statusChangeQueue: 'tokens_available'
          }
        },
        {
          query: {
            poolAddress: event.returnValues.poolContractAddress,
            status: {
              $in: ['tokens_available', 'pending_claim', 'paused']
            }
          }
        }
      );
      await this.contributions.patch(
        null,
        {
          status: 'tokens_available'
        },
        {
          query: {
            poolAddress: event.returnValues.poolContractAddress,
            status: {
              $in: ['confirmed', 'claim_made']
            }
          }
        }
      );

    } catch(err) {
      logger.error(err);
    }
  }
  async refundsEnabled(event) {
    if (event.event !== Pools.EVENTS.REFUNDS_ENABLED)
      throw new Error(`pools.refundsEnabled only handles ${Pools.EVENTS.REFUNDS_ENABLED} events`);

    await this.updatePool('refunds_enabled', event);

    await this.contributions.patch(
      null,
      {
        status: 'refund_enabled'
      },
      {
        query: {
          poolAddress: event.returnValues.poolContractAddress
        }
      }
    );
  }
  async paused(event) {
    if (event.event !== Pools.EVENTS.PAUSE)
      throw new Error(`pools.paused only handles ${Pools.EVENTS.PAUSE} events`);

    await this.updatePool('paused', event);
    await this.contributions.patch(
      null,
      {
        status: 'paused'
      },
      {
        query: {
          poolAddress: event.returnValues.poolContractAddress
        }
      }
    );

  }
  async unpaused(event) {
    if (event.event !== Pools.EVENTS.UNPAUSE)
      throw new Error(`pools.paused only handles ${Pools.EVENTS.UNPAUSE} events`);

    this.updatePool('unpaused', event);

    try {
      const contributions = await this.contributions.find({
        paginate: false,
        query: {
          poolAddress: event.returnValues.poolContractAddress,
          status: 'paused'
        }
      });
      await Promise.all(contributions.map(async contribution => {
        return await this.contributions.patch(contribution._id, { status: contribution.lastStatus });
      }));
    } catch(err) {
      logger.error(err);
    }

  }

  async adminPayoutWalletSet(event) {
    if (event.event !== Pools.EVENTS.ADMIN_PAYOUT_WALLET_SET)
      throw new Error(`pools.adminPayoutWalletSet only handles ${Pools.EVENTS.ADMIN_PAYOUT_WALLET_SET} events`);

    await this.updatePool(null, event, { adminPayoutAddress: event.returnValues.adminPayoutWallet });
  }

  async adminPoolFeeSet(event) {
    if (event.event !== Pools.EVENTS.ADMIN_POOL_FEE_SET)
      throw new Error(`pools.adminPoolFeeSet only handles ${Pools.EVENTS.ADMIN_POOL_FEE_SET} events`);

    await this.updatePool(null, event, { fee: fractionArrayToPercent(event.returnValues.adminPoolFee) });
  }

  async maxAllocationChanged(event) {
    if (event.event !== Pools.EVENTS.MAX_ALLOCATION_CHANGED)
      throw new Error(`pools.maxAllocationChanged only handles ${Pools.EVENTS.MAX_ALLOCATION_CHANGED} events`);

    const {fromWei, toBN} = this.web3.utils;
    await this.updatePool(null, event, { fee: fromWei(toBN(event.returnValues.maxAllocation)) });
  }

  async updatePool(newStatus, event, additionalUpdates) {
    try {
      const { data: [pool] } = await this.pools.find({
        query: {
          contractAddress: event.returnValues.poolContractAddress,
        },
      });
      if (!pool) return;

      logger.info(`Creating Transaction object for txHash ${event.transactionHash}`);

      const transaction = await this.transactions.create({
        poolStatus: pool.status, // borrowing the pool or contribution status
        txHash: event.transactionHash,
        poolAddress: pool.address,
        eventName: event.event,
        msgSender: event.returnValues.msgSender,
        data: { ...event.returnValues },
      });

      // ToDo: check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');

      newStatus && logger.info(`Updating status of pool ${pool.contractAddress} from ${pool.status} to ${newStatus}`)

      const payload = {
        $push: { transactions: transaction.txHash },
        $unset: { pendingTx: true},
        ...additionalUpdates
      }

      if (newStatus) {
        payload.status = newStatus
      }

      return await this.pools.patch(pool._id, payload);

    } catch (err) {
      logger.error(err);
    }
  }
}

export default Pools;
