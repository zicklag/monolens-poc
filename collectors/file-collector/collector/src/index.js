/* eslint-disable no-console */
const logger = require('winston');
const app = require('./app');
const port = app.get('port');
const server = app.listen(port);

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

server.on('listening', () =>
  logger.info('Feathers application started on http://%s:%d', app.get('host'), port)
);


// Push file change events to the monolens server
const feathersClient = require('./feathers-client')
const client = feathersClient('localhost', 3090)

const fileContentsService = client.service('/file-contents')

app.service('/file-contents')
  .on('created', data => {
    fileContentsService.create(data).then(result => {
      console.log("Updated file on server");
    }).catch(err => {
      throw err
    })
  })
