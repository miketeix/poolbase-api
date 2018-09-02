import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';
import logger from 'winston';
import intersection from 'lodash.intersection';
import { restrictToOwner } from 'feathers-authentication-hooks';

import sanitizeAddress from '../../hooks/sanitizeAddress';
import sanitizePayloadAddresses from '../../hooks/sanitizePayloadAddresses';
import sanitizeQueryAddresses from '../../hooks/sanitizeQueryAddresses';
import setAddress from '../../hooks/setAddress';
import setStatus from '../../hooks/setStatus';
import setUserId from '../../hooks/setUserId';
import sanitizeHtml from '../../hooks/sanitizeHtml';
import hasQueryParam from '../../hooks/hasQueryParam';
import { updatedAt, createdAt } from '../../hooks/timestamps';
import addLastStatus from '../../hooks/addLastStatus';
import protectFromUpdate from '../../hooks/protectFromUpdate';

import addPendingDeployTx from './hooks/addPendingDeployTx';
import addPendingTx from './hooks/addPendingTx';
import addInputsHash from './hooks/addInputsHash';
import setPoolbaseFee from './hooks/setPoolbaseFee';
import isPoolAdmin from './hooks/isPoolAdmin';
import protectPayoutAddress from './hooks/protectPayoutAddress';
import updateUserWalletList from './hooks/updateUserWalletList';
import handlePauseUnpause from './hooks/handlePauseUnpause';
import revertToLastStatus from './hooks/revertToLastStatus';
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
    all: [context=> {
      console.log('context.params.query', context.params.query);
    }],
    find: [
      sanitizeQueryAddresses
    ],
    get: [],
    create: [
      createdAt,
      setStatus('pending_deployment'),
      setUserId('owner'),
      setPoolbaseFee,
      addInputsHash,
      addPendingDeployTx,
      sanitizePayloadAddresses([
        { fieldName: 'ownerAddress'},
        { fieldName: 'payoutAddress'},
        { fieldName: 'adminPayoutAddress'},
        { fieldName: 'whitelist', objectArrayKey: 'address'},
        { fieldName: 'admins', objectArrayKey: 'address'},
      ]),
    ],
    update: [ // for pool edit page
      commons.unless(isPoolAdmin, restrictToOwner({ idField: '_id', ownerField: 'owner'})),
      restrict(),
      sanitizeAddress('ownerAddress', { required: true, validate: true }),
      sanitizeHtml('description'),
      updatedAt,
    ],
    patch: [
      // context => {
      //   console.log('context.params.user', context.params.user)
      //   return context
      // }
      sanitizePayloadAddresses([
        { fieldName: 'payoutAddress'},
        { fieldName: 'adminPayoutAddress'},
        { fieldName: 'tokenAddress'},
        { fieldName: 'whitelist', objectArrayKey: 'address'},
        { fieldName: 'admins', objectArrayKey: 'address'},
      ]),
      // sanitizeQueryAddresses
      commons.unless(isPoolAdmin, restrictToOwner({ idField: '_id', ownerField: 'owner'})),
      commons.stashBefore(),
      commons.iff((({data: { status }}) => (status === 'unpaused')),
        revertToLastStatus),
      addLastStatus,
      commons.iff((({data: { status }}) => ([
        'pending_close_pool',
        'pending_token_batch',
        'pending_enable_refunds'].includes(status))),
        addPendingTx),
      protectFromUpdate([
        'ownerAddress',
        'owner',
        'maxAllocation',
        'feeCurrency',
        'admins',
        'payoutAddress',
        'lockPayoutAddress',
        'payoutAddress',
        'poolbaseAddress',
        'poolbaseFee',
        ]),
      protectPayoutAddress,

      // sanitizeHtml('description'),
      updatedAt,
    ],
    remove: [commons.disallow()],
  },

  after: {
    all: [commons.populate({ schema })],
    find: [
      // commons.unless(isPoolAdmin, commons.discard('pendingTx')),
      // commons.unless(isPoolAdmin, commons.discard('whitelist')),
    ],
    get: [
      // commons.iff(hasQueryParam('userWhitelisted'), getUserWhitelistedAddresses),
      commons.unless(isPoolAdmin, commons.discard('pendingTx')),
      commons.unless(isPoolAdmin, commons.discard('whitelist')),
    ],
    create: [
      updateUserWalletList
    ],
    update: [],
    patch: [
      // handlePauseUnpause
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
