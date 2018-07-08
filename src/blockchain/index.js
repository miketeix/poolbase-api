import Web3 from 'web3';
import logger from 'winston';

import PoolBaseMonitor from './PoolBaseMonitor';
import poolbaseFactoryArtifact from './contracts/PoolbaseFactory.json';
import poolbaseEventEmitterArtifact from './contracts/PoolbaseEventEmitter.json';
import poolbaseArtifact from './contracts/Poolbase.json';

// import LiquidPledgingMonitor from './LiquidPledgingMonitor';
// import FailedTxMonitor from './FailedTxMonitor';
// import { LiquidPledging, LPVault } from 'giveth-liquidpledging-token';
// import { LPPCappedMilestones } from 'lpp-capped-milestone-token';
// import { LPPDacs } from 'lpp-dacs';

const ONE_MINUTE = 60 * 1000;

export default function() {
  const app = this;
  const blockchain = app.get('blockchain');

  const web3 = new Web3(blockchain.nodeUrl);

  const opts = {
    startingBlock: blockchain.startingBlock,
  };

  let failedTxMonitor;
  let poolbaseMonitor;

  // initialize the event listeners
  const init = async () => {
    web3.currentProvider.on('connect', () => {
      // keep geth node connection alive
      setInterval(web3.eth.net.getId, 45 * 1000);
    });

    const [coinbaseAccount] = await web3.eth.getAccounts();
    console.log('coinbaseAccount', coinbaseAccount);

    // txMonitor = new FailedTxMonitor(web3, app);
    // txMonitor.start();

    // TODO investigate this
    // for some reason, if we have the contracts in getNetwork as in commit #67196cd807c52785367aee5224e8d6e5134015c8
    // upon reconnection, the web3 provider will not update and will throw "connection not open on send()"
    // maybe https://github.com/ethereum/web3.js/issues/1188 is the issue?
    console.log('blockchain.poolFactoryAddress', blockchain.poolFactoryAddress);
    const poolbaseFactory = await new web3.eth.Contract(
      poolbaseFactoryArtifact.abi,
      blockchain.poolFactoryAddress,
      {
        from: coinbaseAccount,
        gasPrice: '20000000000'
    });

    const poolbaseEventEmitter = await new web3.eth.Contract(
      poolbaseEventEmitterArtifact.abi,
      blockchain.eventEmitterAddress,
      {
        from: coinbaseAccount,
        gasPrice: '20000000000'
      });

    const poolbase = await new web3.eth.Contract(poolbaseArtifact.abi);

    // const liquidPledging = new LiquidPledging(web3, blockchain.liquidPledgingAddress);
    // liquidPledging.$vault = new LPVault(web3, blockchain.vaultAddress);
    // const cappedMilestones = new LPPCappedMilestones(web3, blockchain.cappedMilestoneAddress);
    // const lppDacs = new LPPDacs(web3, blockchain.dacsAddress);
    // const poolbaseFactory = new LPPDacs(web3, blockchain.dacsAddress);


    poolbaseMonitor = new PoolBaseMonitor(
      app,
      web3,
      poolbaseFactory,
      poolbaseEventEmitter,
      poolbase,
      failedTxMonitor,
      opts,
    );
    poolbaseMonitor.start();
  };

  // if the websocket connection drops, attempt to re-connect
  // upon successful re-connection, we re-start all listeners
  const reconnectOnEnd = () => {
    web3.currentProvider.on('end', e => {
      logger.error(`connection closed reason: ${e.reason}, code: ${e.code}`);

      // txMonitor.close();

      const intervalId = setInterval(() => {
        logger.info('attempting to reconnect');

        const newProvider = new web3.providers.WebsocketProvider(blockchain.nodeUrl);

        newProvider.on('connect', () => {
          logger.info('successfully connected');
          clearInterval(intervalId);
          web3.setProvider(newProvider);
          reconnectOnEnd();

          // TODO fix bug that prevents the following from working
          // lpMonitor.start will throw "connection not open on send()" for each subscribe
          // not sure of the cause, but it appears the the subscriptions are not updated
          // with the latest provider. https://github.com/ethereum/web3.js/issues/1188 may
          // be something to look into

          // txMonitor.start();
          // if (lpMonitor) {
          // web3.setProvider will clear any existing subscriptions, so we need to re-subscribe
          // lpMonitor.start();
          // }

          // using this instead of the above.
          init();
        });
      }, ONE_MINUTE);
    });
  };

  init();

  // attach the re-connection logic to the current web3 provider
  reconnectOnEnd();
}
