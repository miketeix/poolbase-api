import Web3 from 'web3';
import errors from 'feathers-errors';
import logger from 'winston';
import { setByDot } from 'feathers-hooks-common';
import { soliditySha3, hexToNumber, toWei, toBN } from 'web3-utils';
import { percentToFractionArray } from '../../../utils/fractions';
import { estimateGas, getFunctionAbiByName } from '../../../utils/blockchain';
import { nullAddress } from '../../../constants';

import poolbaseFactoryAbi from '../../../blockchain/contracts/PoolbaseFactoryAbi.json';

export default async context => {
  try {
    const { poolFactoryAddress, eventEmitterAddress, nodeUrl } = context.app.get('blockchain');
    const web3 = new Web3(nodeUrl);

    const {
      maxAllocation,
      fee,
      poolbaseFee,
      feePayoutCurrency,
      payoutAddress,
      adminPayoutAddress,
      admins,
    } = context.data;

    const argMap = {
      _maxAllocation: toWei(maxAllocation.toString()),
      _adminPoolFee: percentToFractionArray(parseFloat(fee, 10)),
      _poolbaseFee: percentToFractionArray(parseFloat(poolbaseFee, 10)),
      _isAdminFeeInWei: feePayoutCurrency === 'ether',
      _payoutWallet: payoutAddress || nullAddress,
      _adminPayoutWallet: adminPayoutAddress,
      _eventEmitterContract: eventEmitterAddress,
      _admins: admins.map(({ address }) => address),
    };

    console.log('argMap', argMap);

    const args = Object.values(argMap);

    const functionName = 'create';
    const functionAbi = getFunctionAbiByName( poolbaseFactoryAbi, functionName);

    const gasLimit = await estimateGas(web3, poolbaseFactoryAbi, poolFactoryAddress, functionName, args);
    const data = web3.eth.abi.encodeFunctionCall(functionAbi, args);

    const pendingTx = {
      toAddress: poolFactoryAddress,
      amount: 0,
      gasLimit,
      data
    };

    setByDot(context.data, 'pendingTx', pendingTx);
    return context;
  } catch (err) {
    logger.error(err);
      throw new errors.GeneralError(
        `Error while adding pendingTx`, JSON.stringify(err)
      );
    };

};
