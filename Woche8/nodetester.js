var http = require("http");
const hostname = '127.0.0.1';
const port = 3003;
var server = http.createServer(function(req, res) {
       // callback is called  for each http request
       const method = request.method // "GET"
       const url = request.url // "/path/to/the-page.html"
       const version = request.httpVersion // "1.1"
       const headers = request.headers // {host: "website.com"}
       console.log('Received new request from' +url+':Method' +method+':Version' +version+':Headers'+headers)
       res.statusCode = 200;
       res.setHeader('Content-Type', 'text/html');
       res.end('<!DOCTYPE html><html><head></head><body><h1>läuft</h1><h2> gg easy </h2></body></html>')
       });

server.listen(port, hostname, () => {
console.log('Server läuft unter http://'+hostname +':'+port);
});       
