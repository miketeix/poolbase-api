import logger from 'winston';

import PoolEventHandler from './PoolEventHandler';
import ContributionEventHandler from './ContributionEventHandler';

import createModel from '../models/blockchain.model'; // for storing blocknumber in db

import poolbaseFactoryAbi from './contracts/PoolbaseFactoryAbi.json';
import poolbaseEventEmitterAbi from './contracts/PoolbaseEventEmitterAbi.json';

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
}} = PoolEventHandler;

const { EVENTS: {
  CONTRIBUTION_MADE,
  TOKEN_CLAIMED,
  REFUNDED,
}} = ContributionEventHandler;

export default class {
  constructor(app) {
    this.app = app;
    this.web3 = app.getWeb3();

    this.PoolEventHandler = new PoolEventHandler(app);
    this.ContributionEventHandler = new ContributionEventHandler(app);

    const mongooseClient = app.get('mongooseClient');
    this.blockchainMongooseModel = mongooseClient.models.blockchain || createModel(app); // for storing blocknumber in db

    this.subscribePoolFactoryEvents = this.subscribePoolFactoryEvents.bind(this)
    this.subscribePoolbaseEvents = this.subscribePoolbaseEvents.bind(this)
  }

  /**
   * subscribe to all events that we are interested in
   */
  async start() {
    // starts listening to all events emitted by poolbase
    const { poolFactoryAddress, eventEmitterAddress } = this.app.get('blockchain');

    this.poolbaseFactory = await new this.web3.eth.Contract(
      poolbaseFactoryAbi,
      poolFactoryAddress,
    );

    this.poolbaseEventEmitter = await new this.web3.eth.Contract(
      poolbaseEventEmitterAbi,
      eventEmitterAddress,
    );

    this.config = await this.getConfig();

    this.subscribePoolFactoryEvents();
    this.subscribePoolbaseEvents();
  }

  stop() {
    this.factorySubscription.unsubscribe()
    this.poolbaseSubscription.unsubscribe()
  }

  // semi-private methods:

  /**
   * subscribe to Pool Factory events
   */
  subscribePoolFactoryEvents() {
    // starts a listener on the pool factory contract
    this.factorySubscription = this.poolbaseFactory.events
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
    this.poolbaseSubscription = this.poolbaseEventEmitter.events
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

    const { startingBlock } = this.app.get('blockchain');
    const defaultConfig = {
      lastBlock: undefined
    };

    if (startingBlock && startingBlock !== 0) {
      defaultConfig.lastBlock = startingBlock - 1;
    }

    return new Promise((resolve, reject) => {
      this.blockchainMongooseModel.findOne({}, 'lastBlock', { lean: true}, (err, doc) => {
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
  async updateConfig(blockNumber) {
    let onConfigInitialization;
    if (this.initializingConfig) {
      onConfigInitialization = async() => await this.updateConfig(blockNumber);
      return;
    }

    if (!this.config.lastBlock || this.config.lastBlock < blockNumber) {
      this.config.lastBlock = blockNumber;

      if (!this.config._id) this.initializingConfig = true;

      const docId = this.config._id || null;

      try {
        const doc = await this.blockchainMongooseModel.findOneAndUpdate(docId, {
          lastBlock: this.config.lastBlock
        }, {
            upsert: true,
            new: true,
            lean: true,
            strict: false
        });
        this.initializingConfig = false;
        if (doc) {
          this.config._id = doc._id;
          if (onConfigInitialization) onConfigInitialization();
        }
      } catch(err) {
        if (err) logger.error('updateConfig err ->', err);
      }
    }
  }

  async handleEvent(poolbaseEvent) {
    logger.info('handlingEvent: ', poolbaseEvent);

    const { event: eventName, blockNumber } = poolbaseEvent;
    await this.updateConfig(blockNumber);

    const {
      deployed,
      closed,
      newTokenBatch,
      refundsEnabled,
      paused,
      unpaused,
      adminPayoutWalletSet,
      adminPoolFeeSet,
      maxAllocationChanged,
    } = this.PoolEventHandler;

    const {
      contributionMade,
      tokenClaimed,
      refunded,
    } = this.ContributionEventHandler;

    const eventHandlerMap = {
      // PoolbaseFactory
      [CONTRACT_INSTANTIATION]: deployed,
      // PoolbaseEventEmitter events
      //  Pools
      [CLOSED]: closed,
      [TOKEN_PAYOUTS_ENABLED]: newTokenBatch,
      [REFUNDS_ENABLED]: refundsEnabled,
      [PAUSE]: paused,
      [UNPAUSE]: unpaused,
      [ADMIN_PAYOUT_WALLET_SET]: adminPayoutWalletSet,
      [ADMIN_POOL_FEE_SET]: adminPoolFeeSet,
      [MAX_ALLOCATION_CHANGED]: maxAllocationChanged,
      //  Contributions
      [CONTRIBUTION_MADE]: contributionMade,
      [TOKEN_CLAIMED]: tokenClaimed,
      [REFUNDED]: refunded,
    }

    const eventHandler = eventHandlerMap[eventName] ;

    if ( eventHandler ) eventHandler(poolbaseEvent);
      else logger.error('Unknown event: ', eventName);

  }
}
