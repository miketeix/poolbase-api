import logger from 'winston';
import Pools from './Pools';
import Contributions from './Contributions';
import createModel from '../models/blockchain.model'; // for storing blocknumber in db

const { EVENTS: {
  CONTRACT_INSTANTIATION,
  CLOSED,
  TOKEN_PAYOUTS_ENABLED,
  REFUNDS_ENABLED,
  PAUSE,
  UNPAUSE,
  ADMIN_PAYOUT_WALLET_SET,
  ADMIN_POOL_FEE_SET,
  MAX_ALLOCATION_CHANGED,
}} = Pools;

const { EVENTS: {
  CONTRIBUTION_MADE,
  TOKEN_CLAIMED,
  REFUNDED,
}} = Contributions;

// Storing this in the db ensures that we don't miss any events on a restart
const defaultConfig = {
  lastBlock: undefined,
};

export default class {
  constructor(app, web3, poolbaseFactory, poolbaseEventEmitter, poolbase, opts) {
    this.app = app;
    this.web3 = web3;
    this.poolbaseFactory = poolbaseFactory;
    this.poolbaseEventEmitter = poolbaseEventEmitter;
    this.poolbase = poolbase;

    this.pools = new Pools(app, this.poolbase);
    this.contributions = new Contributions(app, this.poolbase);
    this.model = createModel(app); // for storing blocknumber in db

    if (opts.startingBlock && opts.startingBlock !== 0) {
      defaultConfig.lastBlock = opts.startingBlock - 1;
    }

    this.subscribePoolFactoryEvents = this.subscribePoolFactoryEvents.bind(this)
    this.subscribePoolbaseEvents = this.subscribePoolbaseEvents.bind(this)
  }

  /**
   * subscribe to all events that we are interested in
   */
  start() {
    // starts listening to all events emitted by poolbase
    this.getConfig().then(config => {
      this.config = config;
      this.subscribePoolFactoryEvents();
      this.subscribePoolbaseEvents();
    });

  }

  // semi-private methods:

  /**
   * subscribe to Pool Factory events
   */
  subscribePoolFactoryEvents() {
    // starts a listener on the pool factory contract
    this.poolbaseFactory.events
      .allEvents({ fromBlock: this.config.lastBlock + 1 || 1 })
      .on('data', this.handleEvent.bind(this))
      .on('changed', event => {
        // I think this is emitted when a chain reorg happens and the tx has been removed
        logger.info('changed: ', event);
        // new LiquidPledgingState(this.liquidPledging).getState().then(state => {
        //   logger.info('liquidPledging state at changed event: ', JSON.stringify(state, null, 2));
        // });
      })
      .on('error', err => logger.error('SUBSCRIPTION ERROR: ', err));
  }
  /**
   * subscribe to PB events
   */
  subscribePoolbaseEvents() {
    // starts a listener on the liquidPledging contract
    this.poolbaseEventEmitter.events
      .allEvents({ fromBlock: this.config.lastBlock + 1 || 1 })
      .on('data', this.handleEvent.bind(this))
      .on('changed', event => {
        // I think this is emitted when a chain reorg happens and the tx has been removed
        logger.info('changed: ', event);
        // new LiquidPledgingState(this.liquidPledging).getState().then(state => {
        //   logger.info('liquidPledging state at changed event: ', JSON.stringify(state, null, 2));
        // });
      })
      .on('error', err => logger.error('SUBSCRIPTION ERROR: ', err));
  }

  /**
   * get config from database
   *
   * @return {Promise}
   * @private
   */
  getConfig() {
    return new Promise((resolve, reject) => {
      this.model.findOne({}, 'lastBlock', { lean: true}, (err, doc) => {
        if (err) {
          reject(err);
          return;
        }

        if (!doc) {
          resolve(defaultConfig);
          return;
        }

        resolve(doc);
      });
    });
  }

  /**
   * update the config if needed
   *
   * @param blockNumber
   * @private
   */
  updateConfig(blockNumber) {
    let onConfigInitialization;
    if (this.initializingConfig) {
      onConfigInitialization = () => this.updateConfig(blockNumber);
      return;
    }

    if (!this.config.lastBlock || this.config.lastBlock < blockNumber) {
      this.config.lastBlock = blockNumber;

      if (!this.config._id) this.initializingConfig = true;

      const docId = this.config._id || null;
      this.model.findOneAndUpdate(docId, {
        lastBlock: this.config.lastBlock
      }, {
          upsert: true,
          new: true,
          lean: true,
          strict: false
      }).then((doc, err) => {
        this.initializingConfig = false;
        if (err) logger.error('updateConfig ->', err);

        if (doc) {
          this.config._id = doc._id;
          this.initializingConfig = false;
          if (onConfigInitialization) onConfigInitialization();
        }
      });
    }
  }

  handleEvent(event) {
    this.updateConfig(event.blockNumber);

    logger.info('handlingEvent: ', event);

    switch (event.event) {
      // PoolbaseFactory events
      case CONTRACT_INSTANTIATION:
      this.pools.deployed(event);
      break;

      // PoolbaseEventEmitter events
      //      ** Pool Events **
      case CLOSED:
      this.pools.closed(event);
      break;

      case TOKEN_PAYOUTS_ENABLED:
      this.pools.newTokenBatch(event);
      break;

      case REFUNDS_ENABLED:
      this.pools.refundsEnabled(event);
      break;

      case PAUSE:
      this.pools.paused(event);
      break;

      case UNPAUSE:
      this.pools.unpaused(event);
      break;

      case ADMIN_PAYOUT_WALLET_SET:
      this.pools.adminPayoutWalletSet(event);
      break;

      case ADMIN_POOL_FEE_SET:
      this.pools.adminPoolFeeSet(event);
      break;

      case MAX_ALLOCATION_CHANGED:
      this.pools.maxAllocationChanged(event);
      break;

      //      ** Contribution Events **
      case CONTRIBUTION_MADE:
      this.contributions.contributionMade(event);
      break;

      case TOKEN_CLAIMED:
      this.contributions.tokenClaimed(event);
      break;

      case REFUNDED:
      this.contributions.refunded(event);
      break;

      default:
        logger.error('Unknown event: ', event);
    }
  }
}
