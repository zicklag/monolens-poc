/* eslint-disable no-unused-vars */
class Service {
  constructor (options) {
    this.options = options || {};
    this.data = []
  }

  find (params) {
    return Promise.resolve(this.data);
  }

  create (data, params) {
    this.data.push(data)
    return Promise.resolve(this.data);
  }
}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
