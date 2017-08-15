
var http = require('http')
var unixSocket = "/sock/_http1";

// We need the group to have write access for the unix socket to work
var newMask = parseInt("0007", 8); // four digits, last three mask, ex: 0o027 ==> 750 file permissions
var oldMask = process.umask(newMask);
console.log("Changed umask from " + oldMask.toString(8) + " to " + newMask.toString(8));


var httpServer = http.createServer(requestHandler)
httpServer.on("error", httpServerError);
httpServer.on("listening", notifyListening);
httpServer.listen(unixSocket);

function requestHandler(request, response) {
	console.log("Request to " + request.url + " from " + (request.headers["x-real-ip"] || request.connection.remoteAddress));
	response.end('Hello from Node.js HTTP Server!');
}

function httpServerError(err) {
	console.log("HTTP server error: " + err.message);
	if (err.code == 'EADDRINUSE') {
		console.log("Deleting socket and retry listening ...");
		var fs = require("fs");
		fs.unlinkSync(unixSocket);
		httpServer.listen(unixSocket);
	}
	else throw err; // Something else is wrong
}

function notifyListening() {
	console.log("Listening on http://" + process.env.myName + ".webide.se/" + unixSocket.split("/")[2]);
}
