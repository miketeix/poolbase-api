/* eslint-disable no-unused-vars */
import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';

import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import addTxData from '../../hooks/addTxData';
import { updatedAt, createdAt } from '../../hooks/timestamps';

// restrict(),

module.exports = {
  before: {
    all: [commons.paramsFromClient('schema')],
    find: [sanitizeAddress('contributorAddress')],
    get: [],
    create: [
      createdAt,
      context => {
        if (context.data.createdAt) return context;
        context.data.createdAt = new Date();
      },
    ],
    update: [ commons.disallow()],
    // update: [ sanitizeAddress('contributorAddress', { validate: true }), updatedAt],
    patch: [ commons.disallow()],
    // patch: [
    //   restrict(),
    //   sanitizeAddress('contributorAddress', { validate: true }),
    //   stashDonationIfPending(),
    //   updatedAt,
    // ],
    remove: [commons.disallow()],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [addTxData],
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
