#!/usr/bin/env node

/*
	Starts the editor ...
	
	In Apple producs, we need to have a developer licence, 
	or users will not be able to run our scripts or apps ...
	Users can run Node-JS scripts if NodeJS is installed though!
	
*/

	
	// Check if server is running on localhost
	checkServer("127.0.0.1", serverChecked);
	
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

console.log(addresses);
	
	
	function serverChecked(online, ip) {
		console.log("server ip:" + ip + " is", online ? "ON" : "offline");
	}
	
	// Check if server is running on private subnet
	
	// Start a server if we did not find any
	
	// If on OSX, use port 8099 instead of port 80 to prevent EACCESS error
	
	
	
// Attempt to start the client using nw.js

	// Check for Chrome/Chromium
	
	// Check for Firefox
	
	// Check for IE/Edge
	
	// Check for Safari
	
// Launch the client in any of the browsers detected
	
	
function checkServer(ip, callback) {
	var http = require("http");

	var options = {
	  host: ip,
	  port: 80,
	  path: '/jzedit',
	  method: 'GET'
	};

	var req = http.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		var body = "";
		res.on('data', function (chunk) {
			console.log('BODY: "' + chunk + '"');
			body += chunk;
		});
		res.on("end", function(chunk) {
			console.log('END: body="' + body + '"');
			if(body == "Welcome to SockJS!\n") callback(true, ip);
			else callback(false, ip);
		});
	});

	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	  callback(false, ip);
	});

	req.end();

}
	
	