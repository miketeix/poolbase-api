/* eslint-disable no-unused-vars */
import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';

import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import { updatedAt, createdAt } from '../../hooks/timestamps';

// restrict(),

module.exports = {
  before: {
    all: [commons.paramsFromClient('schema')],
    find: [sanitizeAddress('investorAddress')],
    get: [],
    create: [
      setAddress('investorAddress'),
      sanitizeAddress(
        'investorAddress',
        {
          required: true,
          validate: true,
        },
      ),
      createdAt,
      context => {
        if (context.data.createdAt) return context;
        context.data.createdAt = new Date();
      },
    ],
    update: [ commons.disallow()],
    // update: [ sanitizeAddress('investorAddress', { validate: true }), updatedAt],
    patch: [ commons.disallow()],
    // patch: [
    //   restrict(),
    //   sanitizeAddress('investorAddress', { validate: true }),
    //   stashDonationIfPending(),
    //   updatedAt,
    // ],
    remove: [commons.disallow()],
  },

  after: {
    all: [],
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
