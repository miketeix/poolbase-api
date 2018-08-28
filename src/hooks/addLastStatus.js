import { setByDot } from 'feathers-hooks-common';
import logger from 'winston';

export default context => {
  if (!context.params.before) logger.warn('stashBefore was not implemented, could not addLastStatus');
  if (context.data && context.data.status && context.params.before) {
    const { status: lastStatus } = context.params.before;
    console.log('lastStatus', lastStatus);
    setByDot(context.data, 'lastStatus', lastStatus);
  }
  return context;
};
