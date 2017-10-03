/*
	Boilerplate code to get a http server runnning.
	Can for example be used to create a REST API.
	
	Press F1 to run this Node.JS program
	Then press F3 (or close the editor) to stop it.
	
	All HTTP requests (including Websockets) starting with _ (underscore) will be proxied
	to the corresponding unix socket in your /sock/ folder.
	
	When the script is started in the editor, process.env.dev will exist.
	When the script is started in "production", process.env.prod will exist.
*/

if(process.env.dev) var unixSocket = "/sock/_http_server_example_dev";
else if(process.env.prod) var unixSocket = "/sock/_http_server_example";
else throw new Error("No dev or prod enviroment variables!");

// We need the group (www-data) to have write access to the unix socket
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
	