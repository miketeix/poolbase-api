import PoolBaseMonitor from './PoolBaseMonitor';
const { getWeb3 } = require('./lib/web3Helpers');

module.exports = async function init() {
  const app = this;

  const web3 = getWeb3(app);
  app.getWeb3 = getWeb3.bind(null, app);

  const poolBaseMonitor = new PoolBaseMonitor(app);
  poolBaseMonitor.start();

  web3.on(web3.DISCONNECT_EVENT, () => {
    poolBaseMonitor.stop();
  });

  web3.on(web3.RECONNECT_EVENT, () => {
    poolBaseMonitor.start();
  });
};
