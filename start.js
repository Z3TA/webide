#!/usr/bin/env node

/*
	Starts the editor ...
	
	In Apple producs, we need to have a developer licence, 
	or users will not be able to run our scripts or apps ...
	Users can run Node-JS scripts if NodeJS is installed though!
	
*/


var log = require("./server/log.js").log;
var serverFound = false;
	
// Check if server is running on localhost
checkServer("127.0.0.1", serverChecked);
	


function getIpv4Ips() {
	var os = require('os');

	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
	    for (var k2 in interfaces[k]) {
	        var address = interfaces[k][k2];
	        if (address.family === 'IPv4' && !address.internal) {
	            addresses.push(address.address);
	        }
	    }
	}
}

	
function serverChecked(online, ip, port) {
	log("server ip:" + ip + " is", online ? "ON" : "offline");

	if(online) {
		serverFound = true;

		startClient(ip, port);

	}

}


// Check if server is running on localhost
checkServer("127.0.0.1", serverChecked);

// Check if server is running on private subnet



// Start a local server if we did not find any

// If not running with sudo, use port 8099 instead of port 80 to prevent EACCESS error


	



function checkServer(ip, callback) {
	if(serverFound) return;

	var http = require("http");

	var portFound = false;
	var portsChecked = 0;

	var portsToCheck = [80, 8080, 8099];

	function portChecked(itsTheServer, port) {
		portsChecked++;

		if(itsTheServer) {
			portFound = true;
			callback(true, ip, port);
		}
		else if(portsChecked == portsToCheck.length && !portFound) callback(false, ip);
	}

	function checkPort(port, checkPortCallback) {

		if(serverFound) return;

		var options = {
		  host: ip,
		  port: port,
		  path: '/jzedit',
		  method: 'GET'
		};

		var req = http.request(options, function(res) {
			log('STATUS: ' + res.statusCode, 7);
			log('HEADERS: ' + JSON.stringify(res.headers), 7);
			res.setEncoding('utf8');
			var body = "";
			res.on('data', function (chunk) {
				log('BODY: "' + chunk + '"', 7);
				body += chunk;
			});
			res.on("end", function(chunk) {
				log('END: body="' + body + '"', 7);
				if(body == "Welcome to SockJS!\n") checkPortCallback(true, port);
				else checkPortCallback(false, port);
			});
		});

		req.on('error', function(e) {
		  log('problem with request: ' + e.message, 7);
		  checkPortCallback(false, port);
		});

		req.end();
	}
}
	
function startClient(ip, port) {

	// Attempt to start the client using nw.js

		// Check for Chrome/Chromium
		
		// Check for Firefox
		
		// Check for IE/Edge
		
		// Check for Safari
		
	// Launch the client in any of the browsers detected
}

