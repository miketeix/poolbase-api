// Application hooks that run for every service
import { restrictToAuthenticated } from 'feathers-authentication-hooks';
import auth from 'feathers-authentication';
import logger from './hooks/logger';

const AUTHENTICATION_SERVICE = 'authentication';
const USERS_SERVICE = 'users';
const CONTRIBUTIONS_SERVICE = 'contributions';

const excludableRestrictToAuthenticated = (...servicesToExclude) => context => {
  if (servicesToExclude.indexOf(context.path) > -1) return context;

  return restrictToAuthenticated()(context);
};

const authenticate = () => context => {
  // socket connection is already authenticated
  if (context.params.provider !== 'rest') return context;

  return auth.hooks.authenticate(['jwt', 'local'])(context); //, 'local'
};

export default {
  before: {
    all: [],
    find: [],
    get: [],
    create: [authenticate(), excludableRestrictToAuthenticated(AUTHENTICATION_SERVICE, USERS_SERVICE, CONTRIBUTIONS_SERVICE)],
    update: [authenticate(), restrictToAuthenticated()],
    patch: [authenticate(), restrictToAuthenticated()],
    remove: [authenticate(), excludableRestrictToAuthenticated(AUTHENTICATION_SERVICE)],
  },

  after: {
    all: [logger()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [logger()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
