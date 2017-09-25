/* eslint-disable no-unused-vars */
class Service {
  constructor (options) {
    this.options = options || {};
  }

  find (params) {
    return Promise.resolve({
      name: 'file-collector',
      widgets: [
        {
          name: 'File Contents',
          endpoint: 'file-contents'
        }
      ]
    });
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
