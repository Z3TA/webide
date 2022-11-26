/*
	This script contain boilerplate code to get a HTTP server running.
	
	Press F2 to run this Node.JS program
	Then press F4 to stop it.
	
	All HTTP requests to app.%USERNAME%.%DOMAIN% will be proxied
	to the corresponding unix socket at %HOMEDIR%sock/app
	(in most Node.JS libraries you can replace the port nr with a unix socket)

	Press Ctrl+F2 to deploy into production.
	(the project root folder will be copied to a production environment)

	When the script is started in the editor, process.env.dev will exist.
	When the script is started in production, process.env.prod will exist.

	Scripts deployed to production will keep running even if you close the editor.
	Press Ctrl+F4 to stop a in-production script.
	(note: A script in production will be automatically restarted)
	Press Shift+Ctrl+F4 to remove a script from production.
	
*/

if(process.env.dev) var unixSocket = "%HOMEDIR%sock/http_server_example_dev";
else if(process.env.prod) var unixSocket = "%HOMEDIR%sock/http_server_example";
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
	console.log("Listening on http://" + unixSocket.split("/")[4] + "." + process.env.myName + "." + process.env.tld);
	}

