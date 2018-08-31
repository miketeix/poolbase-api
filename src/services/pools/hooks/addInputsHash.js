import { soliditySha3, toWei } from 'web3-utils';
import { percentToFractionArray } from '../../../utils/fractions';

export default context => {
  const {
    maxAllocation,
    fee,
    poolbaseFee,
    feePayoutCurrency,
    payoutAddress,
    adminPayoutAddress,
    admins,
  } = context.data;

  const itemsToHash = {
    // map of all values being hashed in PoolFactory smart contract
    _maxAllocation: { t: 'uint256', v: toWei(maxAllocation.toString()) },
    _adminPoolFee: { t: 'uint256[]', v: percentToFractionArray(parseFloat(fee, 10)) },
    _poolbaseFee: { t: 'uint256[]', v: percentToFractionArray(parseFloat(poolbaseFee, 10)) },
    _isAdminFeeInWei: { t: 'bool', v: feePayoutCurrency === 'ether' },
    _payoutWallet: { t: 'address', v: payoutAddress },
    _adminPayoutWallet: { t: 'address', v: adminPayoutAddress },
    _admins: { t: 'address[]', v: admins.map(({ address }) => address) },
  };
  // ToDo: write a test to make sure hashing on SmartContract and here always produces the same result
  context.data.inputsHash = soliditySha3(...Object.values(itemsToHash));
  return context;
};
