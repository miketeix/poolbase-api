// Initializes the `fees` service on path `/fees`
// const createService = require('feathers-nedb');
import createService from 'feathers-mongoose';
const createModel = require('../../models/fees.model');
const hooks = require('./fees.hooks');
const filters = require('./fees.filters');

module.exports = function() {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'fees',
    Model,
    paginate,
  };

  // Initialize our service with any options it requires
  app.use('/fees', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('fees');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
