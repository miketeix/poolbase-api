import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';
import logger from 'winston';
import { createdAt } from '../../hooks/timestamps';
import onlyInternal from '../../hooks/onlyInternal';

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      createdAt,
      commons.disallow('external')
    ],
    update: [commons.disallow()],
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
