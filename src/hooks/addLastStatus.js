import { setByDot } from 'feathers-hooks-common';

export default context => {
  const { status: lastStatus } = context.params.before;
  setByDot(context.data, 'lastStatus', lastStatus);
  return context;
};
