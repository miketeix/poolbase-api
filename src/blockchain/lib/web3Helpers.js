const Web3 = require('web3');
const logger = require('winston');
const EventEmitter = require('events');

const THIRTY_SECONDS = 30 * 1000;

// if the websocket connection drops, attempt to re-connect
// upon successful re-connection, we re-start all listeners
const reconnectOnEnd = (web3, nodeUrl) => {
  web3.currentProvider.on('end', e => {
    if (web3.reconnectInterval) return;

    web3.emit(web3.DISCONNECT_EVENT);
    logger.error(`connection closed reason: ${e.reason}, code: ${e.code}`);

    web3.pingInterval = undefined;
    

    web3.reconnectInterval = setInterval(() => {
      logger.info('attempting to reconnect');

      const newProvider = new web3.providers.WebsocketProvider(nodeUrl);

      newProvider.on('connect', () => {
        logger.info('successfully connected');
        clearInterval(web3.reconnectInterval);
        web3.reconnectInterval = undefined;
        // note: "connection not open on send()" will appear in the logs when setProvider is called
        // This is because web3.setProvider will attempt to clear any subscriptions on the currentProvider
        // before setting the newProvider. Our currentProvider has been disconnected, so thus the not open
        // error is logged
        web3.setProvider(newProvider);
        // attach reconnection logic to newProvider
        reconnectOnEnd(web3, nodeUrl);
        web3.emit(web3.RECONNECT_EVENT);
      });
    }, THIRTY_SECONDS);
  });
};

function instantiateWeb3(nodeUrl) {
  const w3 = Object.assign(new Web3(nodeUrl), EventEmitter.prototype);

  if (w3.currentProvider.on) {
    w3.currentProvider.on('connect', () => {
      // keep geth node connection alive
      w3.pingInterval = setInterval(w3.eth.net.getId, 45 * 1000);
    });

    // attach the re-connection logic to the current web3 provider
    reconnectOnEnd(w3, nodeUrl);

    Object.assign(w3, {
      DISCONNECT_EVENT: 'disconnect',
      RECONNECT_EVENT: 'reconnect',
    });
  }

  return w3;
}

let web3;
let homeWeb3;
/**
 * returns the cached web3 instance or instantiates a new one.
 *
 * This web3 instance will emit the following events:
 *   - disconnect
 *   - reconnect
 * @param {object} app feathers application object
 */
function getWeb3(app) {
  if (web3) return web3;

  const { nodeUrl } = app.get('blockchain');

  web3 = instantiateWeb3(nodeUrl);
  return web3;
}


module.exports = {
  getWeb3,
};
