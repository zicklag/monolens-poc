function FileContentsTelemetryPlugin(feathersClient) {
  return function install (openmct) {
    const fileContentsService = feathersClient.service('/file-contents')
    var provider = {
      supportsRequest: function (domainObject) {
        return domainObject.type === 'monolens-file-contents'
      },
      request: function (domainObject, options) {
        return Promise.resolve(fileContentsService.find())
      },
      supportsSubscribe: function (domainObject) {
        return domainObject.type ==='monolens-file-contents'
      },
      subscribe: function (domainObject, callback, options) {
        var onCreated = datum => {
          console.log(datum)
          callback(datum)
        }
        fileContentsService.on('created', onCreated)

        return function unsubscribe () {
          fileContentsService.removeListener('created', onCreated)
        }
      }
    }

    openmct.telemetry.addProvider(provider)
  }
}
