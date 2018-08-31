import { setByDot } from 'feathers-hooks-common';

export default async context => {
  const { percentFee } = context.app.get('poolbase'); //ToDo: if user has a promotional fee, use that instead
  // const { percent } = context.service('fees').get(1); // alternatively get from db
  setByDot(context.data, 'poolbaseFee', percentFee);
  return context;
}
