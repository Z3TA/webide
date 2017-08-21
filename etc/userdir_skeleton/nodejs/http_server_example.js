/*
	Boilerplate code to get a http server runnning
	Can for example be used to create a REST API
	
	All HTTP requests (including Websockets) starting with _ (underscore) will be proxied
	to the corresponding unix socket in your /sock/ folder. See example below ...
	
*/

var unixSocket = "/sock/_http_server_example";
	
// We need the group (www-data) to have write access for the unix socket to work
	var newMask = parseInt("0007", 8); // four digits, last three mask, ex: 0o027 => 750 file permissions
	var oldMask = process.umask(newMask);
	console.log("Changed umask from " + oldMask.toString(8) + " to " + newMask.toString(8));
	
var http = require('http');
var httpServer = http.createServer();
httpServer.on("request", httpRequest);
	httpServer.on("error", httpServerError);
	httpServer.on("listening", notifyListening);
	httpServer.listen(unixSocket);

function httpRequest(request, response) {
	console.log("Request to " + request.url + " from " + (request.headers["x-real-ip"] || request.connection.remoteAddress));
	response.end('Hello from Node.js HTTP Server!');
	}
	
	function httpServerError(err) {
	console.log("HTTP server error: " + err.message);
	if (err.code == 'EADDRINUSE') {
		// We'll delete the existing socket and retry listening ...
	var fs = require("fs");
	fs.unlinkSync(unixSocket);
	httpServer.listen(unixSocket);
	}
	else throw err; // Something else is wrong
	}
	
	function notifyListening() {
	console.log("Listening on http://" + process.env.myName + ".webide.se/" + unixSocket.split("/")[2]);
	}
	