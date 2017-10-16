var MonolensFileContents = openmct => {
  return openmct => {
    console.log('Added the MonolensFileContents plugin')

    openmct.types.addType('monolens-file-contents', {
      name: 'File Contents Monitor',
      description: 'Monitors the contents of a file',
      createable: true,
      cssClass: 'icon-page'
    })

    openmct.objects.addRoot({
      namespace: 'monolens',
      key: 'root'
    })

    openmct.composition.addProvider({
      appliesTo: domainObject => {
        return domainObject.identifier.namespace === 'monolens' &&
               domainObject.type === 'folder'
      },
      load: domainObject => {
        return Promise.resolve([
          {
            namespace: 'monolens',
            key: 'file-contents'
          }
        ])
      }
    })

    openmct.objects.addProvider('monolens', {
      get: identifier => {
        if (identifier.key === 'root') {
          return Promise.resolve({
            identifier,
            name: 'Monolens',
            type: 'folder',
            location: 'ROOT',
            composition: []
          })
        }
        else if (identifier.key === 'file-contents') {
          return Promise.resolve({
            identifier,
            name: 'File Contents',
            type: 'monolens-file-contents',
            telemetry: {
              values: [
                {
                  key: 'content',
                  name: 'Content'
                },
                {
                  key: 'utc',
                  source: 'timestamp',
                  name: 'Timestamp',
                  format: 'utc',
                  hints: {
                    domain: 1
                  }
                }
              ]
            },
            location: 'monolens:root'
          })
        }
      }
    })
  }
}
