import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';
import logger from 'winston';
import intersection from 'lodash.intersection';

import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import sanitizeHtml from '../../hooks/sanitizeHtml';
import isProjectAllowed from '../../hooks/isProjectAllowed';
import hasQueryParam from '../../hooks/hasQueryParam';
import { updatedAt, createdAt } from '../../hooks/timestamps';

const restrict = () => context => {
  // internal call are fine
  if (!context.params.provider) return context;

  const { data, service } = context;
  const user = context.params.user;

  if (!user) throw new errors.NotAuthenticated();

  const getPools = () => {
    if (context.id) return service.get(context.id);
    if (!context.id && context.params.query) return service.find(context.params.query);
    return undefined;
  };

  const canUpdate = pool => {
    if (!pool) throw new errors.Forbidden();

    // reviewer Canceled
    if (data.status === 'Canceled' && data.mined === false) {
      if (user.address !== pool.reviewerAddress && user.address !== pool.ownerAddress)
        throw new errors.Forbidden();

      // whitelist of what the reviewer can update
      // ToDo: update
      const approvedKeys = ['txHash', 'status', 'mined'];

      const keysToRemove = Object.keys(data).map(key => !approvedKeys.includes(key));
      keysToRemove.forEach(key => delete data[key]);
    } else if (user.address !== pool.ownerAddress) throw new errors.Forbidden();
  };

  return getPools().then(
    pools => (Array.isArray(pools) ? pools.forEach(canUpdate) : canUpdate(pools)),
  );
};

const schema = {
  include: [
    {
      service: 'users',
      nameAs: 'owner',
      parentField: 'owner',
      childField: '_id',
    },
  ],
};

const userWhitelistedAddresses = async context => {
  try {
    // console.log('context.params', context.params);
    const { wallets } = await context.app.service('users').get(context.params.query.userWhitelisted)
    const walletAddresses = wallets.map(({address})=> address);
    const { whitelist } = context.result;
    context.result = intersection(walletAddresses, whitelist);
    return context;
  } catch(err) {
    logger.error(err);
    throw new errors.BadRequest();
  }
}

const addContributionCounts = async context => {
  try {
    const pools = context.result.data;
    const poolsWithCounts = await Promise.all(
      pools.map(async (pool) => {
        const { total: count } = await context.app.service('contributions').find({ query: { $limit: 0, poolAddress: pool.address }});
        console.log('count', count);
        pool.contributionCount = count;
        return pool;
      })
    );
    context.result.data = poolsWithCounts;
    return context;
  } catch(err) {
    logger.error(err);
    throw new errors.BadRequest();
  }
}


module.exports = {
  before: {
    all: [],
    find: [ sanitizeAddress('ownerAddress')], //ToDo: Add restriction only Owner can fetch Pools
    get: [],
    create: [
      createdAt,
      // setAddress('ownerAddress'),
      // sanitizeAddress('ownerAddress', {
      //   required: true,
      //   validate: true,
      // }),
      // isProjectAllowed(),
      sanitizeHtml('description'),
    ],
    update: [
      restrict(),
      sanitizeAddress('ownerAddress', { required: true, validate: true }),
      sanitizeHtml('description'),
      updatedAt,
    ],
    patch: [
      restrict(),
      sanitizeAddress('ownerAddress', { validate: true }),
      sanitizeHtml('description'),
      updatedAt,
    ],
    remove: [commons.disallow()],
  },

  after: {
    all: [commons.populate({ schema })],
    find: [addContributionCounts],
    get: [commons.iff(hasQueryParam('userWhitelisted'), userWhitelistedAddresses )],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
