// Initializes the `investments` service on path `/investments`
const createService = require('feathers-nedb');
const createModel = require('../../models/investments.model');
const hooks = require('./investments.hooks');
const filters = require('./investments.filters');

module.exports = function() {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'investments',
    Model,
    paginate,
  };

  // Initialize our service with any options it requires
  app.use('/investments', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('investments');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
