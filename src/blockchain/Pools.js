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
  }

  async deployed(event) {
    if (event.event !== this.EVENTS.CONTRACT_INSTANTIATION)
      throw new Error(`pools.deployed only handles ${this.EVENTS.CONTRACT_INSTANTIATION} events`);

    const { msgSender, instantiation, hashMessage } = event.returnValues;
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
        txHash: event.transactionHash,
        poolAddress: instantiation,
        msgSender,
        data: {},
      });

      return this.pools.patch(pool._id, {
        status: 'active',
        contractAddress: instantiation,
        $push: { transactions: transaction.txHash },
      });
    } catch (err) {
      logger.error(err);
    }
  }
  closed(event) {
    if (event.event !== this.EVENTS.CLOSED)
      throw new Error(`pools.closed only handles ${this.EVENTS.CLOSED} events`);

    this.updatePool('closed', event);
  }
  async newTokenBatch(event) {
    if (event.event !== this.EVENTS.TOKEN_PAYOUTS_ENABLED)
      throw new Error(
        `pools.newTokenBatch only handles ${this.EVENTS.TOKEN_PAYOUTS_ENABLED} events`,
      );

    await this.updatePool('payout_enabled', event);
    // ToDo: find all contributions for this pool and flip status to tokens_available
  }
  async refundsEnabled(event) {
    if (event.event !== this.EVENTS.REFUNDS_ENABLED)
      throw new Error(`pools.refundsEnabled only handles ${this.EVENTS.REFUNDS_ENABLED} events`);

    await this.updatePool('refunds_enabled', event);
    // ToDo: find all contributions for this pool and flip status to refund_enabled
  }
  async paused(event) {
    if (event.event !== this.EVENTS.PAUSE)
      throw new Error(`pools.paused only handles ${this.EVENTS.PAUSE} events`);

    await this.updatePool('paused', event);
    // ToDo: find all contributions for this pool and flip status to paused
  }
  unpaused(event) {
    if (event.event !== this.EVENTS.UNPAUSE)
      throw new Error(`pools.paused only handles ${this.EVENTS.UNPAUSE} events`);

    this.updatePool(null, event);
  }

  static async updatePool(newStatus, event) {
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
        // eventName ??
        sender: event.returnValues.msgSender,
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
        status: newStatus || pool.lastStatus,
        lastStatus: pool.status,
        $push: { transactions: transaction.txHash },
      });
    } catch (err) {
      logger.error(err);
    }
  }
}

export default Pools;
