function FeathersClient(server, port) {
  const socketio = feathers.socketio
  const hooks = feathers.hooks
  const errors = feathers.errors // An object with all of the custom error types.
  const authentication = feathers.authentication
  const io = io()

  const socket = io(`http://${server}:${port}`, {
    transports: ['websocket']
  })

  const feathersClient = feathers()
    .configure(socketio(socket))
    .configure(hooks())
    .configure(authentication())

  return feathersClient
}
