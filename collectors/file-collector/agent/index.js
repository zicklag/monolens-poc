const fs = require('fs')
const feathersClient = require('./feathers-client')

const client = feathersClient('localhost', 3030)

const fileContentsService = client.service('/file-contents')

let filename = '/tmp/feathers-test.txt'

fileContentsService.find().then((result) => {
  console.log("Successfully executed query on server");
}).catch((err) => {
  throw err
})

function updateFileContents() {
  fs.readFile(filename, (err, data) => {
    if (err) throw err
    content = data.toString('utf-8')
    fileContentsService.create({content}).then(result => {
      console.log("updated file on server");
    }).catch(err => {
      throw err
    })
  })
}

// Get the content from the file
updateFileContents()

console.log(`Listening for changes to file: ${filename}`);

// Watch for changes to the file and update the service when a change occurs
fs.watch(filename, (eventName) => {
  updateFileContents()
  console.log("File changed");
})
