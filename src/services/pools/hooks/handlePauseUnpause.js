import errors from 'feathers-errors';
import logger from 'winston';
import { setByDot, checkContext } from 'feathers-hooks-common';

export default async context => {
    const { status } = context.before;

    try {
      switch (status) {
        case 'paused':

          await this.contributions.patch(
            null,
            {
              status: 'paused'
            },
            {
              query: {
                pool: context.id
              }
            }
          );
          break;
        case 'unpaused':
          const contributions = await context.app.service('contributions').find({
            paginate: false,
            query: {
              pool: context.id,
              status: 'paused'
            }
          });
          await Promise.all(contributions.map(async contribution => {
            return await this.contributions.patch(contribution._id, { status: contribution.lastStatus });
          }));

          break;
        default:
          return context;
    }
  } catch(err) {
    logger.error(err)
    return errors.GeneralError('handlePauseUnpause', err);
  }
};
