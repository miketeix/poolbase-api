import errors from 'feathers-errors';
import logger from 'winston';
import intersection from 'lodash.intersection';
import commons from 'feathers-hooks-common';

export default async (context) => {
  commons.checkContext(context, null, ['get', 'patch'], 'isPoolAdmin');

  console.log('context.params.user', context.params.user);

  if (!context.params.user) return false;
  let pool;
  try {
    pool = await context.service.get(context.id);
  } catch(err) {
    logger.error(err)
    return errors.GeneralError('handlePauseUnpause', err);
  }

  console.log('pool.owner', pool.owner);
  if (context.params.user._id === pool.owner._id ) return true;

  const userAddresses = context.params.user.wallets && context.params.user.wallets.map(({address}) => address) || []
  if (!userAddresses.length) return false;

  const poolAdminAddresses = pool.admins && pool.admins.map(({address}) => address);
  poolAdminAddresses.push(pool.owner.address);

  const userAdminAddresses = intersection(userAddresses, poolAdminAddresses);

  return !!userAdminAddresses.length;

};
