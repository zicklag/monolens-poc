function client(server, port) {
  const feathers = require('feathers-client')
  const socketio = feathers.socketio
  const hooks = feathers.hooks
  const errors = feathers.errors // An object with all of the custom error types.
  const authentication = feathers.authentication
  const io = require('socket.io-client')

  const socket = io(`http://${server}:${port}`, {
    transports: ['websocket']
  })

  const feathersClient = feathers()
    .configure(socketio(socket))
    .configure(hooks())
    .configure(authentication())

  return feathersClient
}

module.exports = client
