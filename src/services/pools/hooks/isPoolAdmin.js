import errors from 'feathers-errors';
import logger from 'winston';
import intersection from 'lodash.intersection';
import commons from 'feathers-hooks-common';

export default async (context) => {
  commons.checkContext(context, null, ['get', 'patch'], 'isPoolAdmin');

  let pool;
  if (context.type === 'after') {
    pool = context.result
  }
  if (context.type === 'before') { // ensure hook is used after stashBefore
    pool = context.params.before
  }


  if (!context.params.user) return false;

  if (context.params.user._id === pool.owner._id ) return true;

  const userAddresses = context.params.user.wallets && context.params.user.wallets.map(({address}) => address) || []
  if (!userAddresses.length) return false;

  const poolAdminAddresses = pool.admins && pool.admins.map(({address}) => address);
  const poolOwnerAddresses = pool.owner.wallets && pool.owner.wallets.map(({address}) => address) || []
  poolAdminAddresses.push(...poolOwnerAddresses);

  const userAdminAddresses = intersection(userAddresses, poolAdminAddresses);

  return !!userAdminAddresses.length;

};
