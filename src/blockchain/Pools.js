import logger from 'winston';

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

  static async updatePool(newStatus, event, additionalUpdates) {
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

      newStatus
        ? logger.info(`Updating status of pool ${contractAddress} from ${pool.status} to ${status}`)
        : logger.info(
            `Reverting status of pool ${contractAddress} from ${pool.status} to ${pool.lastStatus}`,
          );

      return await this.pools.patch(pool._id, {
        status: newStatus,
        $push: { transactions: transaction.txHash },
        $unset: { pendingTx: true},
        ...additionalUpdates
      });
    } catch (err) {
      logger.error(err);
    }
  }
}

export default Pools;
