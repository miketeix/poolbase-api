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

    }
  }

  constructor(app, web3) {
    this.app = app;
    this.web3 = web3;
    this.pools = this.app.service('pools');
  }

  deployed(event) {
    if (event.event !== this.EVENTS.CONTRACT_INSTANTIATION)
      throw new Error(`pools.deployed only handles ${this.EVENTS.CONTRACT_INSTANTIATION} events`);

    const { sender, instantiation, hashMessage } = event.returnValues;

    this.pools
      .find({
        query: {
          ownerAddress: sender,
          status: 'pending_deployment', // ToDo: after updating to mongo, will place all statuses in enum
          inputsHash: hashMessage 
        }
      })
      .then(({ data }) => {
        const pool = data[0];
        if (!pool) return;

        return this.pools.patch(pool._id, {
          status: 'active',
          txHash: event.transactionHash,
          contractAddress: instantiation,
        });
      })
      .catch(logger.error);
  }
  closed(event) {
    if (event.event !== this.EVENTS.CLOSED)
      throw new Error(`pools.closed only handles ${this.EVENTS.CLOSED} events`);

    const { poolContractAddress } = event.returnValues;

    this.updatePoolStatus(poolContractAddress, 'closed');
  }
  async newTokenBatch(event) {
    if (event.event !== this.EVENTS.TOKEN_PAYOUTS_ENABLED)
      throw new Error(`pools.newTokenBatch only handles ${this.EVENTS.TOKEN_PAYOUTS_ENABLED} events`);

    const { poolContractAddress } = event.returnValues;

    await this.updatePoolStatus(poolContractAddress, 'payout_enabled');
    // ToDo: find all contributions for this pool and flip status to tokens_available

  }
  async refundsEnabled(event) {
    if (event.event !== this.EVENTS.REFUNDS_ENABLED)
      throw new Error(`pools.refundsEnabled only handles ${this.EVENTS.REFUNDS_ENABLED} events`);

    const { poolContractAddress } = event.returnValues;
    await this.updatePoolStatus(poolContractAddress, 'refunds_enabled');
    // ToDo: find all contributions for this pool and flip status to refund_enabled
  }
  async paused(event) {
    if (event.event !== this.EVENTS.PAUSE)
      throw new Error(`pools.paused only handles ${this.EVENTS.PAUSE} events`);

    const { poolContractAddress } = event.returnValues;

    await this.updatePoolStatus(poolContractAddress, 'paused');
  }
  unpaused(event) {
    if (event.event !== this.EVENTS.UNPAUSE)
      throw new Error(`pools.paused only handles ${this.EVENTS.UNPAUSE} events`);

    const { poolContractAddress } = event.returnValues;

    this.updatePoolStatus(poolContractAddress, null);
  }

  static async updatePoolStatus(contractAddress, status) {
    try {
      const { data: [pool] } = await this.pools
        .find({
          query: {
            contractAddress
          }
        })
      if (!pool) return;

      // ToDo: check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');

      status ?
        logger.info(`Updating status of pool ${contractAddress} from ${pool.status} to ${status}`) :
        logger.info(`Reverting status of pool ${contractAddress} from ${pool.status} to ${pool.lastStatus}`);

      return await this.pools.patch(pool._id, {
        status: status ? status: pool.lastStatus,
        lastStatus: pool.status
      });
    } catch(err) {
      logger.error(err);
    };
  }
}

export default Pools;
