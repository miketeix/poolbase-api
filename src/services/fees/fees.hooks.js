import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';
import logger from 'winston';
import { createdAt, updatedAt } from '../../hooks/timestamps';

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [commons.disallow('external')],  // unless superAdmin disallow('external')
    update: [
      commons.disallow('external'), // unless superAdmin disallow('external')
      updatedAt
    ],
    patch: [commons.disallow()],
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
