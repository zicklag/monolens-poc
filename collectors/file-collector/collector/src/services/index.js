const collector = require('./collector/collector.service.js');
const fileContents = require('./file-contents/file-contents.service.js');
module.exports = function () {
  const app = this; // eslint-disable-line no-unused-vars
  app.configure(collector);
  app.configure(fileContents);
};
