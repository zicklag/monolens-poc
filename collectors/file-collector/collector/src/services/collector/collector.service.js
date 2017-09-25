// Initializes the `collector` service on path `/collector`
const createService = require('./collector.class.js');
const hooks = require('./collector.hooks');
const filters = require('./collector.filters');

module.exports = function () {
  const app = this;
  const paginate = app.get('paginate');

  const options = {
    name: 'collector',
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/collector', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('collector');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
