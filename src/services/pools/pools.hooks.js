import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';
import logger from 'winston';
import intersection from 'lodash.intersection';
import { restrictToOwner } from 'feathers-authentication-hooks';

import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import setStatus from '../../hooks/setStatus';
import setUserId from '../../hooks/setUserId';
import sanitizeHtml from '../../hooks/sanitizeHtml';
import hasQueryParam from '../../hooks/hasQueryParam';
import { updatedAt, createdAt } from '../../hooks/timestamps';
import { addLastStatus } from '../../hooks/addLastStatus';

import addPendingDeployTx from './hooks/addPendingDeployTx';
import addPendingTx from './hooks/addPendingTx';
import addInputsHash from './hooks/addInputsHash';
import isPoolAdmin from './hooks/isPoolAdmin';
import updateUserWalletList from './hooks/updateUserWalletList';
import handlePauseUnpause from './hooks/handlePauseUnpause';
import revertToLastStatus from './hooks/revertToLastStatus';
import addContributionCounts from './hooks/addContributionCounts';
import getUserWhitelistedAddresses from './hooks/getUserWhitelistedAddresses';

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

module.exports = {
  before: {
    all: [],
    find: [], // sanitizeAddress('ownerAddress')], //ToDo: Add restriction only Owner can fetch Pools
    get: [],
    create: [
      createdAt,
      setStatus('pending_deployment'),
      setUserId('owner'),
      addInputsHash,
      addPendingDeployTx,
      // sanitizeAddress('ownerAddress', {
      //   required: true,
      //   validate: true,
      // }),
    ],
    update: [ // for pool edit page
      commons.unless(isPoolAdmin, restrictToOwner({ idField: '_id', ownerField: 'owner'})),
      restrict(),
      sanitizeAddress('ownerAddress', { required: true, validate: true }),
      sanitizeHtml('description'),
      updatedAt,
    ],
    patch: [
      commons.unless(isPoolAdmin, restrictToOwner({ idField: '_id', ownerField: 'owner'})),
      commons.stashBefore(),
      commons.iff((({data: { status }}) => (status === 'paused')), revertToLastStatus),
      addLastStatus,
      sanitizeAddress('ownerAddress', { validate: true }),
      sanitizeHtml('description'),
      addPendingTx,
      updatedAt,
    ],
    remove: [commons.disallow()],
  },

  after: {
    all: [commons.populate({ schema })],
    find: [addContributionCounts], // commons.fastJoin(poolResolvers)],//commons.populate({ schema: contributionCountSchema })],
    get: [
      commons.iff(hasQueryParam('userWhitelisted'), getUserWhitelistedAddresses),
      commons.unless(isPoolAdmin, commons.discard('pendingTx')),
      commons.unless(isPoolAdmin, commons.discard('whitelist')),
      addContributionCounts
    ],
    create: [
      updateUserWalletList
    ],
    update: [],
    patch: [
      handlePauseUnpause
    ],
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
