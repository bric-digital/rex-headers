// Testing web server to validate that headers are being set correctly.

import http from 'node:http'

const hostname = '127.0.0.1'
const port = 3000

const server = http.createServer((request, response) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json')

  response.end(JSON.stringify(request.headers, null, '  '))
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});