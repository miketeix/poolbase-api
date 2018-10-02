/* eslint-disable no-unused-vars */
import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';
import { restrictToOwner } from 'feathers-authentication-hooks';

import hasQueryParam from '../../hooks/hasQueryParam';
import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import setUserId from '../../hooks/setUserId';
import setStatus from '../../hooks/setStatus';
import sanitizePayloadAddresses from '../../hooks/sanitizePayloadAddresses';
import protectFromUpdate from '../../hooks/protectFromUpdate';
import { addLastStatus } from '../../hooks/addLastStatus';
import addPendingTx from './hooks/addPendingTx';
import checkPoolWhitelist from './hooks/checkPoolWhitelist';
import { updatedAt, createdAt } from '../../hooks/timestamps';

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
      sanitizePayloadAddresses([
        { fieldName: 'ownerAddress' },
        { fieldName: 'poolAddress' },
      ]),
      checkPoolWhitelist,
      setStatus('pending_confirmation'),
      createdAt,
      setUserId('owner'),
      addPendingTx
    ],
    update: [commons.disallow()],
    // update: [ sanitizeAddress('contributorAddress', { validate: true }), updatedAt],
    patch: [
      protectFromUpdate([
        'ownerAddress',
        'poolAddress',
        'owner',
        'amount'
      ]),
      // commons.stashBefore(), // can't be multi where id is null, maybe check somehow
      restrictToOwner({ idField: '_id', ownerField: 'owner'}),
      commons.iff((({data: { status }}) => (['pending_claim_tokens', 'pending_refund'].includes(status))),
        addPendingTx),
      // addLastStatus,
      updatedAt,
    ],

    remove: [commons.disallow()],
  },

  after: {
    all: [commons.populate({ schema })], //commons.populate({ schema })
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
