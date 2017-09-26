// Initializes the `file-contents` service on path `/file-contents`
const createService = require('./file-contents.class.js');
const hooks = require('./file-contents.hooks');
const filters = require('./file-contents.filters');

module.exports = function () {
  const app = this;
  const paginate = app.get('paginate');

  const options = {
    name: 'file-contents',
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/file-contents', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('file-contents');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
