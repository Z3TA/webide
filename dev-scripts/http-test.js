var http = require('http');

http.createServer(function (req, res) {
console.log("req.url=" + req.url);
res.write('Hello World!');
res.end();
}).listen(9999);
