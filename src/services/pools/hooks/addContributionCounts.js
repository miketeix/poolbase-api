import errors from 'feathers-errors';
import logger from 'winston';
export default async context => {
  try {
    const pools = context.result;
    console.log('context.params.query', context.params.query);
    console.log('context.result', context.result);
    console.log('pools', pools);
    const poolsWithCounts = await Promise.all(
      pools.map(async (pool) => {
        const { total: count } = await context.app.service('contributions')
          .find({
            query: {
              $limit: 0,
              status: {
                $ne: 'pending_confirmation'
              },
              pool: pool._id
            }
          });
        console.log('count', count);
        pool.contributionCount = count;
        return pool;
      })
    );
    context.result.data = poolsWithCounts;
    return context;
  } catch(err) {
    logger.error(err);
    throw new errors.GeneralError();
  }
  return context;
};
