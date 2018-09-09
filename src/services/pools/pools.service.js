// Initializes the `pools` service on path `/pools`
import createService from 'feathers-mongoose';
const { createModel } = require('../../models/pools.model');
const hooks = require('./pools.hooks');
const filters = require('./pools.filters');

module.exports = function() {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'pools',
    Model,
    paginate,
  };

  // Initialize our service with any options it requires
  app.use('/pools', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('pools');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
