import Web3 from 'web3';
import logger from 'winston';
import errors from 'feathers-errors';
import { setByDot, checkContext } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber, toWei, toBN, asciiToHex } from 'web3-utils';

import { percentToFractionArray } from '../../../utils/fractions';
import { estimateGas, getFunctionAbiByName } from '../../../utils/blockchain';

import poolbaseAbi from '../../../blockchain/contracts/PoolbaseAbi.json';

export default async context => {
  checkContext(context, 'before', ['patch']);

  if (typeof context.params.provider === 'undefined') return context // allow patch from internal call

  const { nodeUrl } = context.app.get('blockchain');
  const web3 = new Web3(nodeUrl);
  const poolId = context.id;

  try {

    const {
      status,
      maxAllocation,
      fee,
      adminPayoutAddress,
      ...rest
    } = context.data;

    // if (!status) return context;

    let poolContractFunctionName;
    let poolContractFunctionArgs;

    if (status) {
      switch (status) {
        case 'pending_close_pool':
            let { payoutAddress, payoutTxData } = rest;

            // logic to handle no payoutAddress - currently in protectPayoutAddress hook

            payoutAddress = payoutAddress || context.params.before.payoutAddress;
            // const { payoutAddress, payoutTxData } = context.params.before;

            if (!payoutAddress && !payoutTxData) {
              logger.error(`Missing args to status change ${status}`);
              return new errors.BadRequest( `Missing args for status change ${status}`);
            }
            console.log('payoutTxData', payoutTxData);
            console.log('typeof payoutTxData', typeof payoutTxData);
            console.log('asciiToHex(payoutTxData)', asciiToHex(payoutTxData));
            console.log('asciiToHex(\'payoutTxData\')', asciiToHex('payoutTxData'));
            console.log('asciiToHex(\'0xAA\')', asciiToHex('0xAA'));
            //ToDo: validate is Hex on backend
            // ToDo: need to test with smartContract is asciiToHex needed if client is providing a hex string
            poolContractFunctionArgs = [ payoutAddress, asciiToHex(payoutTxData)  ];
            poolContractFunctionName = 'adminClosesPool';
            break;
        case 'pending_token_batch':
          const { tokenAddress } = rest;

          //ToDo: check pool state must be in  closed or tokenpayout state otherwise transaction will fail

          if (!tokenAddress) {
            logger.error(`Missing args to status change ${status}`);
            return new errors.BadRequest( `Missing args for status change ${status}`);
          }
          poolContractFunctionArgs = [ tokenAddress ];
          poolContractFunctionName = 'adminSetsBatch';
          break;
        case 'pending_enable_refunds':
          poolContractFunctionArgs = [];
          poolContractFunctionName = 'enableRefunds';
          break;
        default:
          return context;
          break;
      }
    } else if (maxAllocation) {
      poolContractFunctionArgs = [ toWei(toBN(maxAllocation)) ];
      poolContractFunctionName = 'changeMaxAllocation';
    } else if (fee) {
      poolContractFunctionArgs = [ percentToFractionArray(parseFloat(fee, 10)) ];
      poolContractFunctionName = 'setAdminPoolFee';
    } else if (adminPayoutAddress) {
      poolContractFunctionArgs = [ adminPayoutAddress ];
      poolContractFunctionName = 'setAdminPayoutWallet';
    } else {
      return context;
    }

    const { contractAddress: poolAddress } = context.params.before;

    const functionAbi = getFunctionAbiByName(poolbaseAbi, poolContractFunctionName);

    const gasLimit = await estimateGas(web3, poolbaseAbi, poolAddress, poolContractFunctionName, poolContractFunctionArgs);

    const data = web3.eth.abi.encodeFunctionCall(functionAbi, poolContractFunctionArgs);
    // ToDo: add gasPrice
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
