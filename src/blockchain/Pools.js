import logger from 'winston';
import { fractionArrayToPercent } from '../utils/fractions';
import { PoolStatus } from '../models/pools.model'
import { ContributionStatus } from '../models/contributions.model'
/**
 * class to keep feathers cache in sync with pools contract
 */

const UNPAUSED = 'unpaused';

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

    const {
      returnValues: {
        msgSender,
        instantiation,
        hashMessage,
      },
      transactionHash,
      event: eventName,
    } = event;

    try {
      const { data: [pool] } = await this.pools.find({
        query: {
          ownerAddress: msgSender,
          status: PoolStatus.PENDING_DEPLOYMENT,
          inputsHash: hashMessage,
        },
      });

      if (!pool) {
        logger.warn(
          `No pool found for contract instantiation event from message sender ${msgSender} and pool contract ${instantiation}`,
        );
        return;
      }

      const transaction = await this.transactions.create({
        poolStatus: PoolStatus.PENDING_DEPLOYMENT,
        txHash: transactionHash,
        poolAddress: instantiation,
        msgSender,
        eventName,
        data: {},
      });
      return this.pools.patch(pool._id, {
        status: PoolStatus.ACTIVE,
        contractAddress: instantiation,
        $push: { transactions: transaction.txHash },
        $unset: { pendingTx: true },
      });
    } catch (err) {
      logger.error(err);
    }
  }
  closed(event) {
    if (event.event !== Pools.EVENTS.CLOSED)
      throw new Error(`pools.closed only handles ${Pools.EVENTS.CLOSED} events`);

    this.updatePool(PoolStatus.CLOSED, event);
  }
  async newTokenBatch(event) {
    if (event.event !== Pools.EVENTS.TOKEN_PAYOUTS_ENABLED)
      throw new Error(
        `pools.newTokenBatch only handles ${Pools.EVENTS.TOKEN_PAYOUTS_ENABLED} events`,
      );
    try {
      await this.updatePool(PoolStatus.PAYOUT_ENABLED, event, { $inc: { tokenBatchCount: 1 } });
      // patch(null=multi, update, params: {query})

      await this.contributions.patch(
        // must come before other patch below
        null,
        {
          $push: {
            statusChangeQueue: ContributionStatus.TOKENS_AVAILABLE,
          },
        },
        {
          query: {
            poolAddress: event.returnValues.poolContractAddress,
            status: {
              $in: [ContributionStatus.TOKENS_AVAILABLE, ContributionStatus.PENDING_CLAIM_TOKENS, ContributionStatus.PAUSED],
            },
          },
        },
      );
      await this.contributions.patch(
        null,
        {
          status: ContributionStatus.TOKENS_AVAILABLE,
        },
        {
          query: {
            poolAddress: event.returnValues.poolContractAddress,
            status: {
              $in: [ContributionStatus.CONFIRMED, ContributionStatus.TOKENS_CLAIMED],
            },
          },
        },
      );
    } catch (err) {
      logger.error(err);
    }
  }
  async refundsEnabled(event) {
    if (event.event !== Pools.EVENTS.REFUNDS_ENABLED)
      throw new Error(`pools.refundsEnabled only handles ${Pools.EVENTS.REFUNDS_ENABLED} events`);

    await this.updatePool(PoolStatus.REFUNDS_ENABLED, event);

    await this.contributions.patch(
      null,
      {
        status: ContributionStatus.REFUND_AVAILABLE,
      },
      {
        query: {
          poolAddress: event.returnValues.poolContractAddress,
        },
      },
    );
  }
  async paused(event) {
    if (event.event !== Pools.EVENTS.PAUSE)
      throw new Error(`pools.paused only handles ${Pools.EVENTS.PAUSE} events`);

    await this.updatePool(ContributionStatus.PAUSED, event);
    await this.contributions.patch(
      null,
      {
        status: ContributionStatus.PAUSED,
      },
      {
        query: {
          poolAddress: event.returnValues.poolContractAddress,
        },
      },
    );
  }
  async unpaused(event) {
    if (event.event !== Pools.EVENTS.UNPAUSE)
      throw new Error(`pools.paused only handles ${Pools.EVENTS.UNPAUSE} events`);

    this.updatePool(UNPAUSED, event);

    try {
      const contributions = await this.contributions.find({
        paginate: false,
        query: {
          poolAddress: event.returnValues.poolContractAddress,
          status: ContributionStatus.PAUSED,
        },
      });
      
      await Promise.all(
        contributions.map(async contribution => {
          return await this.contributions.patch(contribution._id, {
            status: contribution.lastStatus,
          });
        }),
      );
    } catch (err) {
      logger.error(err);
    }
  }

  async adminPayoutWalletSet(event) {
    if (event.event !== Pools.EVENTS.ADMIN_PAYOUT_WALLET_SET)
      throw new Error(
        `pools.adminPayoutWalletSet only handles ${Pools.EVENTS.ADMIN_PAYOUT_WALLET_SET} events`,
      );

    await this.updatePool(null, event, {
      adminPayoutAddress: event.returnValues.adminPayoutWallet,
    });
  }

  async adminPoolFeeSet(event) {
    if (event.event !== Pools.EVENTS.ADMIN_POOL_FEE_SET)
      throw new Error(
        `pools.adminPoolFeeSet only handles ${Pools.EVENTS.ADMIN_POOL_FEE_SET} events`,
      );

    await this.updatePool(null, event, {
      fee: fractionArrayToPercent(event.returnValues.adminPoolFee),
    });
  }

  async maxAllocationChanged(event) {
    if (event.event !== Pools.EVENTS.MAX_ALLOCATION_CHANGED)
      throw new Error(
        `pools.maxAllocationChanged only handles ${Pools.EVENTS.MAX_ALLOCATION_CHANGED} events`,
      );

    const { fromWei, toBN } = this.web3.utils;
    await this.updatePool(null, event, { maxAllocation: parseFloat(fromWei(event.returnValues.maxAllocation)) });
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
        poolStatus: pool.status,
        txHash: event.transactionHash,
        poolAddress: pool.contractAddress,
        eventName: event.event,
        msgSender: event.returnValues.msgSender,
        data: { ...event.returnValues },
      });

      // ToDo: check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');

      newStatus &&
        logger.info(
          `Updating status of pool ${pool.contractAddress} from ${pool.status} to ${newStatus}`,
        );

      const payload = {
        $push: { transactions: transaction.txHash },
        $unset: { pendingTx: true },
        ...additionalUpdates,
      };

      if (newStatus) {
        payload.status = newStatus;
      }

      if (newStatus === UNPAUSED ) {
        payload.status = pool.lastStatus
      }

      return await this.pools.patch(pool._id, payload);
    } catch (err) {
      logger.error(err);
    }
  }
}

export default Pools;
