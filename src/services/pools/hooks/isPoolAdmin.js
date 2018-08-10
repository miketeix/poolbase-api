import errors from 'feathers-errors';
import logger from 'winston';
import intersection from 'lodash.intersection';
import commons from 'feathers-hooks-common';

export default async (context) => {
  commons.checkContext(context, null, ['get', 'patch'], 'isPoolAdmin');

  if (!context.params.user) return false;

  try {
    const pool = await context.service.get(context.id);
  } catch(err) {
    logger.error(err)
    return errors.GeneralError('handlePauseUnpause', err);
  }

  if (context.params.user._id === pool.owner._id ) return true;

  const userAddresses = context.params.user.wallets && context.params.user.wallets.map(({address}) => address);
  if (!userWalletAddresses.length) return false;

  const poolAdminAddresses = pool.admins && pool.admins.map(({address}) => address);
  adminAddresses.push(pool.owner.address);

  userAdminAddresses = intersection(userAddresses, poolAdminAddresses);

  return !!userAdminAddresses.length;

};
