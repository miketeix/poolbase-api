/* eslint-disable no-unused-vars */
import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';
import { restrictToOwner } from 'feathers-authentication-hooks';

import hasQueryParam from '../../hooks/hasQueryParam';
import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import setUserId from '../../hooks/setUserId';
import setStatus from '../../hooks/setStatus';
import { addLastStatus } from '../../hooks/addLastStatus';
import addPendingTx from './hooks/addPendingTx';
import checkPoolWhitelist from './hooks/checkPoolWhitelist';
import { updatedAt, createdAt } from '../../hooks/timestamps';

//
// const contributorCountByPoolAddress = async context => {
//   try {
//     const poolAddress = context.params.query.countByPool;
//     const { total: count } = await context.service.find( { query: { $limit: 0, poolAddress }});
//
//     context.result = { count };
//     return context;
//   } catch(err) {
//     logger.error(err);
//     throw new errors.BadRequest();
//   }
// }

const schema = {
  include: [
    {
      service: 'pools',
      nameAs: 'pool',
      parentField: 'pool',
      childField: '_id',
    },
  ],
};

module.exports = {
  before: {
    all: [commons.paramsFromClient('schema')],
    find: [
      // sanitizeAddress('contributorAddress')],x
      // commons.iff(hasQueryParam('countByPoolAddress'), contributorCountByPoolAddress)
    ],
    get: [],
    create: [
      checkPoolWhitelist,
      setStatus('pending_confirmation'),
      createdAt,
      setUserId('owner'),
      addPendingTx
    ],
    update: [commons.disallow()],
    // update: [ sanitizeAddress('contributorAddress', { validate: true }), updatedAt],
    patch: [
      // restrict,
      // sanitizeAddress('contributorAddress', { validate: true }),
      restrictToOwner({ idField: '_id', ownerField: 'owner'}),
      addPendingTx,
      commons.iff(({ data: { status }}) => !!status, commons.stashBefore(), addLastStatus),
      updatedAt,
    ],

    remove: [commons.disallow()],
  },

  after: {
    all: [commons.populate({ schema })],
    find: [],
    get: [],
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
