import commons from 'feathers-hooks-common';
import { restrictToOwner } from 'feathers-authentication-hooks';
import local from '@feathersjs/authentication-local';
import { toChecksumAddress } from 'web3-utils';

import isOwner from './hooks/isOwner';

import notifyOfChange from '../../hooks/notifyOfChange';
import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import { updatedAt, createdAt } from '../../hooks/timestamps';

const normalizeId = () => context => {
  if (context.id) {
    context.id = toChecksumAddress(context.id);
  }
  return context;
};

// ToDo: figure out what ownerField means in this context
const restrict = [
  // normalizeId(),
  restrictToOwner({
    idField: '_id',
    ownerField: '_id',
  }),
];

const address = [
  setAddress('address'),
  sanitizeAddress('address', { required: true, validate: true }),
];

// ToDo: Sort out realtime updates to other models
const notifyParents = [
  // {
  //   service: 'pools',
  //   parentField: 'ownerId',
  //   childField: '_id',
  //   watchFields: ['avatar', 'name'],
  // }
];

// TODO write a hook to prevent overwriting a non-zero giverId with 0

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [local.hooks.hashPassword(), commons.discard('_id'), createdAt],
    update: [...restrict, commons.stashBefore(), updatedAt],
    patch: [...restrict, commons.stashBefore(), updatedAt],
    remove: [commons.disallow()],
  },

  after: {
    all: [
      commons.when(hook => hook.params.provider),
      local.hooks.protect('password')
    ], //commons.discard('_id')
    find: [
      commons.iff( commons.isNot(isOwner), commons.discard('email')),
    ],
    get: [
      commons.iff( commons.isNot(isOwner), commons.discard('email')),
    ],
    create: [],
    update: [notifyOfChange(...notifyParents)],
    patch: [notifyOfChange(...notifyParents)],
    remove: [notifyOfChange(...notifyParents)],
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
