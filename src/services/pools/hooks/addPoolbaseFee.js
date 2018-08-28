import { soliditySha3, toWei } from 'web3-utils';
import { percentToFractionArray } from '../../../utils/fractions';

export default context => {
  const { percentFee } = context.app.get('poolbase'); //ToDo: if user has a promotional fee, use that instead
  context.data.poolbaseFee = percentFee;
  return context;
};
