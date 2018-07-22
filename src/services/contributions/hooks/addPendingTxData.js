import Web3 from 'web3';
import errors from 'feathers-errors';
import { setByDot } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber, toWei } from 'web3-utils';

import poolbaseArtifact from '../../../blockchain/contracts/Poolbase.json';
const { abi: poolbaseAbi } = poolbaseArtifact;

async function estimateGas(web3, functionName, params = []) {
  const contract = new web3.eth.Contract(poolbaseAbi);
  return await contract.methods[functionName](...params).estimateGas();
}

function getFunctionAbiByName(functionName) {
  return poolbaseAbi.find(({name, type}) => (name === functionName && type === 'function'));
}

const statusToFunctionNameMap = {
  pending_confirmation: 'deposit',
  pending_claim: 'claimToken',
  pending_refund: 'refund'
};

export default async context => {

  const { poolbaseSignerAddress, nodeUrl } = context.app.get('blockchain');
  const web3 = new Web3(nodeUrl);

  const { status, ownerAddress  } = context.data; // grab poolId or poolAddress

  const functionName = statusToFunctionNameMap[status];
  const functionAbi = getFunctionAbiByName(functionName);

  const hash = soliditySha3(poolAddress, ownerAddress);
  const signature = await web3.eth.sign(hash, poolbaseSignerAddress);

  const pendingTxData = web3.eth.abi.encodeFunctionCall(functionAbi, [signature]);
  const gasLimit = await estimateGas(web3, functionName,[signature]);

  setByDot(context.data, 'pendingTxData', pendingTxData);
  setByDot(context.data, 'gasLimit', gasLimit);
  return context;
};
