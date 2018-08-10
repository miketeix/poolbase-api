import Web3 from 'web3';
import errors from 'feathers-errors';
import { setByDot } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber, toWei } from 'web3-utils';
import { estimateGas, getFunctionAbiByName } from '../../../utils/blockchain';

import poolbaseAbi from '../../../blockchain/contracts/PoolbaseAbi.json';

export default async context => {
  checkContext(context, 'before', ['patch', 'create']);
  const { poolbaseSignerAddress, nodeUrl } = context.app.get('blockchain');
  const web3 = new Web3(nodeUrl);

  const { status, ownerAddress, poolAddress, amount: contributionAmount } = context.data; // grab poolId or poolAddress

  let functionName;
  switch (status) {
    case 'pending_confirmation':
      functionName = 'deposit';
      break;
    case 'pending_claim':
      functionName = 'claimToken';
      break;
    case 'pending_refund':
      functionName = 'refund';
      break;
    default:
      return context;
      break;
  }

  const functionAbi = getFunctionAbiByName(poolbaseAbi, functionName);

  const hash = soliditySha3(poolAddress, ownerAddress);
  const signature = await web3.eth.sign(hash, poolbaseSignerAddress);

  let amount = 0;
  if (status === 'pending_confirmation') {
    amount = toWei(toBN(contributionAmount));
  }
  const data = web3.eth.abi.encodeFunctionCall(functionAbi, [signature]);
  const gasLimit = await estimateGas(web3, functionName, [signature]);

  const pendingTx = {
    toAddress: poolAddress,
    amount,
    gasLimit,
    data
  }

  setByDot(context.data, 'pendingTx', pendingTx);
  return context;
};
