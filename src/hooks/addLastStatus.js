import { setByDot } from 'feathers-hooks-common';

export default context => {
  if (context.data && !!context.data.status) {
    const { status: lastStatus } = context.params.before;
    console.log('lastStatus', lastStatus);
    setByDot(context.data, 'lastStatus', lastStatus);
  }
  return context;
};
