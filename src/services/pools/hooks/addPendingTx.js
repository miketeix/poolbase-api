import Web3 from 'web3';
import errors from 'feathers-errors';
import { setByDot, checkContext } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber, toWei, toBN } from 'web3-utils';

import { estimateGas, getFunctionAbiByName } from '../../../utils/blockchain';

import poolbaseAbi from '../../../blockchain/contracts/PoolbaseAbi.json';

export default async context => {
  checkContext(context, 'before', ['patch']);

  const { nodeUrl } = context.app.get('blockchain');
  const web3 = new Web3(nodeUrl);
  const poolId = context.id;

  try {

    const {
      status,
      amount,
      ...rest
    } = context.data;

    let poolContractFunctionName;
    let poolContractFunctionArgs;

    switch (status) {
      case 'pending_close_pool':
        const { payoutAddress, payoutTxData } = rest;
        poolContractFunctionArgs = [ payoutAddress, payoutTxData ];
        poolContractFunctionName = 'adminClosesPool';
        break;
      case 'pending_token_batch':
        const { tokenAddress } = rest;
        poolContractFunctionArgs = [ tokenAddress ];
        poolContractFunctionName = 'adminSetsBatch';
        break;
      case 'pending_enable_refunds':
        poolContractFunctionArgs = [];
        poolContractFunctionName = 'adminSetsBatch';
        break;
      default:
        return context;
        break;
    }

    const { address: poolAddress } = await context.app.service('pools').get(poolId);

    const functionAbi = getFunctionAbiByName(poolbaseAbi, poolContractFunctionName);
    const gasLimit = await estimateGas(web3, poolbaseAbi, poolAddress, functionName, poolContractFunctionArgs);
    const data = web3.eth.abi.encodeFunctionCall(functionAbi, poolContractFunctionArgs);

    const pendingTx = {
      toAddress: poolAddress,
      amount: 0,
      gasLimit,
      data
    };

    setByDot(context.data, 'pendingTx', pendingTx);
    return context;

  } catch(err) {
    logger.error(err);
    throw new errors.GeneralError(
      `Error while adding pendingTx`, JSON.stringify(err)
    );
  }

};
