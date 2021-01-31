/*
	This file runs when you require webide.se as a module
	(Or when using nw.js as client)
*/

if(typeof nw != "undefined") {
	nw.Window.open('client/index.htm', {}, function(win) {});
	return;
}

var module_log = require("./shared/log.js");
var UTIL = require("./client/UTIL.js");

var log = module_log.log;
module_log.overrideConsole();

var DEBUG = module_log.DEBUG;

function startServer(options) {

	if( options == undefined || Object.keys(options).length == 0 ) {

		throw new Error("No options given! Minimum options are username and password! (and probabably nattype: client)");

	}


	console.log("Starting webide.se server...");

	// Convert options objec to shell arguments array
	var argsArr = []; 
	for(var prop in options) {
		argsArr.push("--" + prop + "=" + options[prop]);
	}

	var WEBIDE_LOCATION = __dirname;

	var pathDelimiter = UTIL.getPathDelimiter(WEBIDE_LOCATION);

	var server = require('child_process').spawn("node", [
		'"' + WEBIDE_LOCATION + pathDelimiter + 'server' + pathDelimiter + 'server.js"',
	].concat(argsArr) , {
		env: process.env,
		cwd: WEBIDE_LOCATION,
		shell: true // Maybe needed on Windows !? to prevent early exist?
	});

	server.on("error", function serverError(err) {
		console.log("Server error: " + err.message);
		if(callback) {
			callback( err );
			callback = null;
		}
	});

	server.on("close", function serverClosed(code) {
		console.log("server.js closed. code=" + code);

		console.log("Exiting because server.js closed.")
		process.exit(0); // Always exit (this script) when the server exit
	});

	server.stdout.on("data", function serverStdout(data) {
		//console.log("server.js stdout: " + data);
		serverLog(data);
	});

	server.stderr.on("data", function editorStderr(data) {
		//console.log("server.js stderr: " + data);
		serverLog(data);
	});

	function serverLog(data) {

		if(typeof data == "object") data = data.toString();

		log(data, DEBUG);

	}

}


function staticClient() {
	throw new Error("Not yet implemented");
}

module.exports = {
	run: startServer,
	serveClient: staticClient
}


