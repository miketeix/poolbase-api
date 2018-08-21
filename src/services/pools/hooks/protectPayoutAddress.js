import { deleteByDot } from 'feathers-hooks-common';
export default context => {
  const { params: { before, provider }} = context;
  console.log('before.lockPayoutAddess', before.lockPayoutAddess);
  if (typeof provider === 'undefined') return context
  if (before.status === 'active' || before.status === 'pending_close_pool') return context;
  if (
    before.lockPayoutAddess !== null &&
    typeof before.lockPayoutAddess !== 'undefined') {
      deleteByDot(context.data, 'lockPayoutAddress');
      deleteByDot(context.data, 'payoutAddress');
      setByDot(context.data, 'payoutAddress', before.payoutAddress);
  }
  return context;
}
