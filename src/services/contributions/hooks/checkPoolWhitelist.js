import errors from 'feathers-errors';
import logger from 'winston';

export default async context => {
  const { pool: poolId, ownerAddress } = context.data;
  try {
    const { hasWhitelist, whitelist } = await context.app.service('pools').get(poolId);
    if (hasWhitelist) {
      const matchingWhitelistItem = whitelist.find(({address}) => {
        return address.toUpperCase() === ownerAddress.toUpperCase();
      });
      if(!matchingWhitelistItem) {
        throw new errors.BadRequest(
          `Contribution ownerAddress ${ownerAddress} is not on the pool whitelist, poolid: ${poolId}`,
        );
        return;
      }
    }
  } catch(err) {
    logger.error(err);
  }

  return context;

}
