import PoolBaseMonitor from './PoolBaseMonitor';
const eventHandler = require('./lib/eventHandler');
const { getWeb3 } = require('./lib/web3Helpers');

module.exports = function init() {
  const app = this;

  const web3 = getWeb3(app);
  app.getWeb3 = getWeb3.bind(null, app);

  // initialize the event listeners
  // const handler = eventHandler(app);

  const poolBaseMonitor = PoolBaseMonitor(app);
  poolBaseMonitor.start();

  web3.on(web3.DISCONNECT_EVENT, () => {
    poolBaseMonitor.close();
  });

  web3.on(web3.RECONNECT_EVENT, () => {
    // web3.setProvider will clear any existing subscriptions, so we need to re-subscribe
    poolBaseMonitor.start();
  });
};







import Web3 from 'web3';
import logger from 'winston';

import PoolBaseMonitor from './PoolBaseMonitor';
import poolbaseFactoryAbi from './contracts/PoolbaseFactoryAbi.json';
import poolbaseEventEmitterAbi from './contracts/PoolbaseEventEmitterAbi.json';
import poolbaseAbi from './contracts/PoolbaseAbi.json';

const { getWeb3 } = require('./lib/web3Helpers');

const ONE_MINUTE = 60 * 1000;

export default function() {
  const app = this;
  const blockchain = app.get('blockchain');
  // { startingBlock, nodeUrl, poolFactoryAddress, eventEmitterAddress }

  const web3 = getWeb3(app)//new Web3(blockchain.nodeUrl);

  const opts = {
    startingBlock: blockchain.startingBlock,
  };

  let poolbaseMonitor;

  // initialize the event listeners
  const init = async () => {
    web3.currentProvider.on('connect', () => {
      // keep geth node connection alive
      setInterval(web3.eth.net.getId, 45 * 1000);
    });

    const [coinbaseAccount] = await web3.eth.getAccounts();
    console.log('coinbaseAccount', coinbaseAccount);

    const poolbaseFactory = await new web3.eth.Contract(
      poolbaseFactoryAbi,
      blockchain.poolFactoryAddress,
    );

    const poolbaseEventEmitter = await new web3.eth.Contract(
      poolbaseEventEmitterAbi,
      blockchain.eventEmitterAddress,
      contractOptions,
    );

    const poolbase = await new web3.eth.Contract(poolbaseAbi, contractOptions);

    poolbaseMonitor = new PoolBaseMonitor(
      app,
      web3,
      poolbaseFactory,
      poolbaseEventEmitter,
      poolbase,
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
