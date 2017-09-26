const assert = require('assert');
const app = require('../../src/app');

describe('\'file-contents\' service', () => {
  it('registered the service', () => {
    const service = app.service('file-contents');

    assert.ok(service, 'Registered the service');
  });
});
