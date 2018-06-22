import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';

import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import sanitizeHtml from '../../hooks/sanitizeHtml';
import isProjectAllowed from '../../hooks/isProjectAllowed';
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
const countMilestones = (item, service) =>
  service
    .find({
      query: {
        poolId: item._id,
        projectId: {
          $gt: '0', // 0 is a pending milestone
        },
        $limit: 0,
      },
    })
    .then(count => Object.assign(item, { milestonesCount: count.total }));

// add milestonesCount to each DAC object
const addMilestoneCounts = () => context => {
  const service = context.app.service('milestones');

  const items = commons.getItems(context);

  let promises;
  if (Array.isArray(items)) {
    promises = items.map(item => countMilestones(item, service));
  } else {
    promises = [countMilestones(items, service)];
  }

  return Promise.all(promises).then(
    results =>
      Array.isArray(items)
        ? commons.replaceItems(context, results)
        : commons.replaceItems(context, results[0]),
  );
};

module.exports = {
  before: {
    all: [],
    find: [sanitizeAddress('ownerAddress')],
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
    find: [addMilestoneCounts()],
    get: [addMilestoneCounts()],
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
