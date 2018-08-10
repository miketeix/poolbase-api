import errors from 'feathers-errors';
export default async context => {
  try {
    const pools = context.result.data;
    
    const poolsWithCounts = await Promise.all(
      pools.map(async (pool) => {
        const { total: count } = await context.app.service('contributions').find({ query: { $limit: 0, pool: pool._id }});
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
