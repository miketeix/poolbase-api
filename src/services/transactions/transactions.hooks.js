import commons from 'feathers-hooks-common';
import errors from 'feathers-errors';
import logger from 'winston';
import { createdAt } from '../../hooks/timestamps';

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [createdAt],
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
