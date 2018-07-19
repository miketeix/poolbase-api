import Web3 from 'web3';
import errors from 'feathers-errors';
import { setByDot } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber, toWei } from 'web3-utils';


export default async context => {

  // ToDo: checkWhitelist
  const { poolbaseSignerAddress, nodeUrl } = context.app.get('blockchain');
  const web3 = new Web3(nodeUrl);
  const { wallet, amount, pool } = context.result;

  const nonce = (wallet in pool.nonces) ?  pool.nonces[wallet] : 0;

  const hash = soliditySha3(wallet, toWei(parseFloat(amount, 10)), pool.address, nonce);
  const signature = await web3.eth.sign(hash, poolbaseSignerAddress );

  const r = signature.slice(0, 66);
  const s = `0x${signature.slice(66, 130)}`;
  const v = hexToNumber(signature.slice(130, 132))+27;

  // ToDo: abi encode function and estimate gas limit
  const txData = 'DepostiFunctionEncodedAbi'+r+s+v;
  const gasLimit = 2000000;
  setByDot(context.result, 'txData', txData);
  setByDot(context.result, 'gasLimit', gasLimit);
  return context;
};
