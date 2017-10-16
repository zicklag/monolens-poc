const fileContentsWidget = require('../../hooks/file-contents-widget');
const { setNow } = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ setNow('timestamp') ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [ fileContentsWidget() ],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
