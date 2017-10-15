var express = require('express')

var server = express()

server.use('/', express.static(__dirname))

server.listen(8080)

console.log('Started client on http://localhost:8080')
