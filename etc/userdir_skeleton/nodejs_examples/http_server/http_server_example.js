/*
	Boilerplate code to get a http server running.
	Can for example be used to create a REST API.
	
	Press F2 to run this Node.JS program
	Then press F4 (or close the editor) to stop it.
	
	All HTTP requests to app.%USERNAME%.%DOMAIN% will be proxied
	to the corresponding unix socket at /sock/app .
	Instead of a port number, use the path to the unix socket:
	For example port 80 can be replaced with /sock/test 
	which can be accessed from test.%USERNAME%.%DOMAIN%
	
	When the script is started in the editor, process.env.dev will exist.
	When the script is started in "production", process.env.prod will exist.

	Press Ctrl+F2 to deploy into production.
	
	Scripts deployed to production will keep running even if you close the editor.
	Press Ctrl+F4 to stop a in-production script.
	(note: A script in production will be automatically restarted after 
	a server machine reboot, even if it was stopped!)
	Press Shift+Ctrl+F4 to remove a script from production.
	
	
*/

if(process.env.dev) var unixSocket = "/sock/http_server_example_dev";
else if(process.env.prod) var unixSocket = "/sock/http_server_example";
else throw new Error("Did not find dev nor prod environment variables!");

// We need the group (www-data) to have write access to the unix socket
// This is only needed in production, the editor will do it automatically in dev
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
		// This is only needed in production, the editor will do it automatically in dev
	var fs = require("fs");
	fs.unlinkSync(unixSocket);
	httpServer.listen(unixSocket);
	}
	else throw err; // Something else is wrong
	}
	
	function notifyListening() {
	console.log("Listening on http://" + unixSocket.split("/")[2] + "." + process.env.myName + ".%DOMAIN%/");
	}

