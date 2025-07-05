var http = require("http");
const hostname = '127.0.0.1';
const port = 8000;
var server = http.createServer(function(req, res) {
       // callback is called  for each http request
       const method = request.method // "GET"
       const url = request.url // "/path/to/the-page.html"
       const version = request.httpVersion // "1.1"
       const headers = request.headers // {host: "website.com"}
       console.log('Received new request from' +url+':Method' +method+':Version' +version+':Headers'+headers)
       res.statusCode = 200;
       res.setHeader('Content-Type', 'text/html');
       res.end('<!DOCTYPE html><html><head><title>Stundenplan</title></head><body><table><caption> Stundenplan 2.Semester </caption><tr><th>Block:</th><th>Montag</th><th>Dienstag</th><th>Mittwoch</th><th>Donnerstag</th><th>Freitag</th></tr><th>1</th><th>/</th><th>Biochem.</th><th>/</th><th>/</th><th>Alg. Dat.</th><tr><th>2</th><th>Englisch</th><th>Internettech.</th><th>/</th><th>Mathe</th><th>Alg. Dat.</th></tr><tr><th>3</th><th>Englisch</th><th>Internettech</th><th>/</th><th>/</th><th>Alg. Dat.</th></tr><tr><th>/</th><th>/</th><th>/</th><th>/</th><th>/</th><th>/</th></tr><tr><th>4</th><th>Prog. 2</th><th>/</th><th>/</th><th>Mol. Bio</th><th>/</th></tr><tr><th>5</th><th>Prog. 2</th><th>/</th><th>/</th><th>/</th><th>/</th></tr><tr><th>6</th><th>/</th><th>/</th><th>/</th><th>/</th><th>/</th></tr></table></body></html>')
       });

server.listen(port, hostname, () => {
console.log('Server läuft unter http://'+hostname +':'+port);
});       