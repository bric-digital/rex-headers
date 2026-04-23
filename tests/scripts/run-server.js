// Testing web server to validate that headers are being set correctly.

import express from 'express'
import multer from 'multer'

const app = express();
const port = 3000;

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const upload = multer()

app.get('/', (request, response) => {
  response.send('The only way to pass a test is to take the test.')
});

app.get('/headers', (request, response) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json')

  response.send(JSON.stringify(request.headers, null, '  '))
});

app.post('/post', upload.none(), (request, response) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json')

  if ([null, undefined, ''].includes(request.body)) {
    request.body = {}
  }

  response.send(JSON.stringify(request.body, null, '  '))
});

app.listen(port, () => {
  console.log(`Server running on port ${port}...`);
});
