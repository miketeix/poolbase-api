import Web3 from 'web3';
import errors from 'feathers-errors';
import { setByDot } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber } from 'web3-utils';

const findNonceForPool = async (poolAddress, wallet, service) => {
  const result = await service
    .find({
      query: {
        address: poolAddress,
        $select: [ 'nonces' ]
      }
    });

  const pool = result.data[0];

  if (pool) {
    if (wallet in pool.nonces) {
      return pool.nonces[wallet];
    } else {
      return 0;
    }
  } else {
      throw new Error('No such pool exists');
  }
}

export default async context => {

  // ToDo: checkWhitelist
  const { dataFieldAddress, nodeUrl } = context.app.get('blockchain');
  const web3 = new Web3(nodeUrl);
  const { wallet, amount, poolAddress } = context.result;
  const service = context.app.service('pools');
  const nonce = await findNonceForPool(poolAddress, wallet, service);

  const hash = soliditySha3(wallet, amount, poolAddress, nonce);
  const signature = await web3.eth.sign(hash, dataFieldAddress );

  const r = signature.slice(0, 66);
  const s = `0x${signature.slice(66, 130)}`;
  const v = hexToNumber(signature.slice(130, 132))+27;

  const txData = 'DepostiFunctionEncodedAbi'+r+s+v;
  const gasLimit = 2000000;
  setByDot(context.result, 'txData', txData);
  setByDot(context.result, 'gasLimit', gasLimit);
  return context;
};
