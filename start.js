#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	Universal editor start script
	
	First try to find a server on localhost
	Then listen to editor broadcasts on the lan.
	But if no server is found, start one on localhost
	
	Then try to run the client in nw.js
	But if that fails launch the client in a browser: Chrome, Firefox, IE or Safari
	
*/

"use strict";

var log = require("./shared/log.js").log;

// Log levels
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var serverFound = false;

setTimeout(startNewServer, 1000); // 3000ms

var serversChecked = 0;
var serversToCheck = 0;

var HTTP_REQUESTS = [];
//return startClient("127.0.0.1", "8099");


log("Check if server is running on localhost ...", INFO);
checkServer("127.0.0.1", serverChecked);

var adresses = getIpv4Ips();
for(var i=0; i<adresses.length; i++) checkServer(adresses[i], serverChecked);


function serverChecked(online, ip, port) {
	//log("server ip:" + ip + " is", online ? "ON" : "offline");
	
	serversChecked++;
	
	log("serversChecked=" + serversChecked + " serversToCheck=" + serversToCheck + " serverFound=" + serverFound, DEBUG);
	
	
	if(online) {
		log("Found server running on ip=" + ip + " port=" + port, INFO);
		
		serverFound = true;
		
		startClient(ip, port);
		abortHttpRequests();
		
		
	}
	else {
		if(serversChecked == serversToCheck && !serverFound) broadcast();
	}
}



function abortHttpRequests() {
	for(var i=0; i<HTTP_REQUESTS.length; i++) HTTP_REQUESTS[i].abort();
}


function startNewServer() {
	
	if(serverFound) return;
	
	abortHttpRequests();

	serverFound = true;

	log("Starting new server ...");
	
	var serverPort = "8099";
	var serverIp = "127.0.0.1";

	var serverArg = ["server/server.js", "--loglevel=6", "--username=admin", "--password=admin", "--ip=" + serverIp, "--port=" + serverPort, "-nochroot"];

	var serverOptions = {
		stdio: "inherit"
	}

	//var child = require('child_process').spawn("node", serverArg, serverOptions); 




	/*
	child.stdout.on('data', function(data) {
	    console.log(data.toString()); 
	});
	*/

	
	attemptLaunch("node", serverArg, function(err) {
		if(err) log("Unable to start server!");
		else {
			log("Server started!");
			startClient(serverIp, serverPort);
		}
	}, serverOptions);
	
 
}


function broadcast() {

	// Listen to and send broadcast messages asking for jzedit server
	// http://stackoverflow.com/questions/6177423/send-broadcast-datagram
	
	var broadcastPort = 6024;
	var myIps = getIpv4Ips();
	var broadcastAddresses = myIps.map(broadcastAddress);
	
	console.log("broadcastAddresses: ", broadcastAddresses);
	
	var dgram = require('dgram');
	
	// Server
	var broadcastServer = dgram.createSocket("udp4");
	broadcastServer.bind(function() {
		broadcastServer.setBroadcast(true);
		// We must send at least one broadcast message to be able to receive messages!
		for(var i=0; i<broadcastAddresses.length; i++) ask(broadcastAddresses[i]);
	});

	// Client
	var broadcastClient = dgram.createSocket('udp4');

	broadcastClient.on('listening', function () {
		var address = broadcastClient.address();
		console.log('UDP Client listening on ' + address.address + ":" + address.port);
		broadcastClient.setBroadcast(true);
	});

	broadcastClient.on('message', function (message, rinfo) {
		console.log('Message from: ' + rinfo.address + ':' + rinfo.port +' - ' + message);
		

		// jzedit server url: http://127.0.0.1/
		// jzedit server url: http://127.0.0.1:8099/
		
		message = message.toString("utf8");
		
		var matchUrl = message.match(/jzedit server url: (https?):\/\/(\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}):?(\d*)?/);
		
		if(matchUrl) {
			var proto = matchUrl[1];
			var ip = matchUrl[2];
			var port = matchUrl[3];
			
			serverFound = true;
			startClient(ip, port, proto);
			
			//clearInterval(askForServerInterval);
			
			broadcastClient.close();
			broadcastServer.close();
			
		}
		
	});

	broadcastClient.bind(broadcastPort);

	function ask(broadcastAddress) {
		var lookForServerMessage = "Where can I find a jzedit server?"
		var message = new Buffer(lookForServerMessage);
		broadcastClient.send(message, 0, message.length, broadcastPort, broadcastAddress, function() {
			console.log("Sent '" + message + "'");
		});
	}
	
	function broadcastAddress(ip) {
		// Asume 255.255.255.0 netmask
		var arr = ip.split(".");
		arr[3] = "255";
		return arr.join(".");
	}



	
}


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
	
	return addresses;
}

function isPrivatev4IP(ip) {
   var parts = ip.split('.');
   return parts[0] === '10' || parts[0] === '127' ||
	  (parts[0] === '172' && (parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) || 
	  (parts[0] === '192' && parts[1] === '168');
}

function checkServer(ip, callback) {
	
	serversToCheck++;
	
	if(typeof callback != "function") throw new Error("callback=" + callback + " need to be a callback function!");
	
	if(serverFound) {
		//log("A server has already been found. Aborting checkServer", DEBUG);
		return;
	}

	log("Checking for a jzedit server on ip=" + ip + " ...", DEBUG);
	
	var http = require("http");

	var portFound = false;
	var portsChecked = 0;

	var portsToCheck = [80, 8080, 8099];
	
	for(var i=0; i<portsToCheck.length; i++) checkPort(portsToCheck[i], portChecked);
	
	function portChecked(itsTheServer, port) {
		portsChecked++;

		if(itsTheServer) {
			portFound = true;
			callback(true, ip, port);
		}
		else if(portsChecked == portsToCheck.length && !portFound) callback(false, ip);
	}

	function checkPort(port, checkPortCallback) {
		
		if(serverFound) {
			//log("A server has already been found. Aborting checkServer checkPort", DEBUG);
			return;
		}

		log("Checking port=" + port + " on ip=" + ip, DEBUG);
		
		
		var options = {
		  host: ip,
		  port: port,
		  path: '/jzedit',
		  method: 'GET'
		};

		var req = http.request(options, function(res) {

			if(serverFound) return;

			log("Answer on port=" + port + " on ip=" + ip, INFO);
			log('STATUS: ' + res.statusCode, DEBUG);
			log('HEADERS: ' + JSON.stringify(res.headers), DEBUG);
			res.setEncoding('utf8');
			var body = "";
			res.on('data', function (chunk) {
				log('BODY: "' + chunk + '"', DEBUG);
				body += chunk;
			});
			res.on("end", function(chunk) {
				log('END: body="' + body + '"', DEBUG);
				if(body == "Welcome to SockJS!\n") checkPortCallback(true, port);
				else checkPortCallback(false, port);
			});
		});
		
		HTTP_REQUESTS.push(req);
		
		req.on('error', function(e) {
		  if(!serverFound) log('problem with request: ' + e.message, DEBUG);
		  checkPortCallback(false, port);
		});

		req.end();
	}
}

function timeStamp() {
	return (new Date()).getTime()/1000|0; // Unix timestamp
}

function startClient(ip, port, proto) {
	
	log("Starting client ...");
	
	var portPart = "";
	
	if(port != undefined) portPart = ":" + port;
	
	if(proto == undefined) proto = "http";
	var url = "http://" + ip + portPart + "/";
	
	var nwRuntime = "";
	var platform = process.platform;
	if(platform == "darwin") nwRuntime = "./runtime/nwjs-v0.12.3-osx-x64/nwjs.app/Contents/MacOS/nwjs";
	else if(platform == "win32")  nwRuntime = "./runtime/nwjs-v0.12.3-win-x64/nw.exe";
	else if(platform == "linux")  nwRuntime = "./runtime/nwjs-v0.12.3-linux-x64/nw";
	else log("platform=" + platform + " not yet supported by nw.js", INFO);
	

	var tryPrograms = [];
		
	// Always try nw.js first!
	//tryPrograms.push(["nw", ["."]]); // Any version of nw.js
	//tryPrograms.push([nwRuntime, ["."]]); // The included nw.js runtime
	
	// We prefer the chromium/chrome browser!
	tryPrograms.push(["chromium-browser", ["--app=" + url]]); 
	tryPrograms.push(["chrome", ["--app=" + url]]);
	
	// It seems Firefox doesn't want to open URL's in chromeless mode (-chrome), only files 
	// We want to open files via http/https though! Using file:// protocol will cause issues.
	tryPrograms.push(["firefox", ["-new-tab", url]]); // We can open a url in a new tab though
	//tryPrograms.push(["firefox", ["-chrome", "client/index.htm"]]);
	
	
	if(platform == "win32") {
		// Only try IE on Windows
		tryPrograms.push(["iexplore", ["-k", url]]);
	}
	
	if(platform == "darwin") {
		// Only try Safari on Mac
		// Unfortunately Safari doesn't support chromless
		// We might be able to remove the chrome after it started though, by using osascript

		//tryPrograms.push(["/Applications/Safari.app/Contents/MacOS/Safari & sleep 1 && osascript -e 'tell application \"Safari\" to open location \"http://www.google.com\"'"]);

		tryPrograms.push(["safari", [url]]);
	}
	

	var programIndex = 0;
	var startTime = timeStamp();
	var maxTime = 3; // Seconds
	var programStarted = false;
	
	tryProgram(tryPrograms[programIndex]);

	

	function tryProgram(arr) {
		var programOriginal = arr[0];
		var args = arr[1] || [];
		var program;
		
		if(platform == "darwin") {
			
			args.unshift(programOriginal);
			args.unshift("-a");
			program = "open";
		}
		else if(platform == "win32") {
			
			args.unshift(programOriginal);
			args.unshift('""');
			args.unshift("start");
			args.unshift("/C"); // /C
			
			program = "cmd";

		}
		else program = programOriginal;

		attemptLaunch(program, args, function triedProgram(err) {
			if(err) {

				var time = timeStamp();

				if(time - startTime > maxTime && programStarted) {
					log((time - startTime) + " seconds since start. Asuming exit");
					return process.exit();
				}

				log("Failed to start program=" + programOriginal);
				programIndex++;
				if(programIndex >= tryPrograms.length) throw new Error("Unable to start browser engine!");
				else tryProgram(tryPrograms[programIndex]);
			}
			else {
				log("Successfully started program=" + programOriginal);
				programStarted = true;
			}
		});
	}
}

function attemptLaunch(process, args, callbackFunction, options, uid, gid) {

	if(typeof callback != "function") throw new Error("No callback function!");

	var childProcess = require("child_process");
	
	// You can have different group and user. Default is the user/group running the node process
	var options = {};
	
	var gotStdoutData = false;

	if(uid != undefined) options.uid = parseInt(uid);
	if(gid != undefined) options.gid = parseInt(gid);
	
	log("Attemting to start process=" + process + " args=" + JSON.stringify(args) + " uid=" + uid + " gid=" + gid, DEBUG);
	
	try {
		var cp = childProcess.spawn(process, args, options);
	}
	catch(err) {
		if(err.code == "EPERM") {
			if(uid != undefined) log("Unable to spawn process=" + process + " with uid=" + uid + " and gid=" + gid + ".\nTry running the script with a privileged (sudo) user.", NOTICE);
		}
		var msg = "Unable to spawn process! (" + err.message + ")";
		log(msg, DEBUG)
		return callback(new Error(msg));
	}
	
	if(cp.connected) {
		log("Asuming process=" + process + " was successful because it's connected!", DEBUG);
		return callback(null);
	}
	
	cp.on("close", function programClose(code, signal) {
		var msg = process + " close: code=" + code + " signal=" + signal
		log(msg, DEBUG);
		
		code = parseInt(code);
		if(code === 0) {
			log("Asuming process=" + process + " was successful because close code=" + code);
			callback(null);
		}
		else callback(new Error(msg));

	});
	
	cp.on("disconnect", function programDisconnect() {
		var msg = process + " disconnect: cp.connected=" + cp.connected;
		log(msg, DEBUG)
		callback(new Error(msg));
	});
	
	cp.on("error", function programClose(err) {
		var msg = process + " error: err.message=" + err.message
		log(msg, DEBUG);
		callback(new Error(msg));
	});
	
	cp.on("exit", function programExit(code, signal) {
		var msg = process + " exit: code=" + code + " signal=" + signal;
		log(msg, DEBUG);
	});

	cp.stdout.on("data", function programStdout(data) {
		var msg = process + " stdout data: " + data;
		log(msg, DEBUG);

		if(!gotStdoutData) {
			gotStdoutData = true;
			log("Asuming process=" + process + " was successful because something was returned from stdout!", DEBUG);
			callback(null);
		}

	});
	
	cp.stderr.on("data", function programStderr(data) {
		var msg = process + " stderr data: " + data;
		log(msg, DEBUG);
	});

	/*
	var waitTime = 250;
	setTimeout(function started() {
		log("Asuming process=" + process + " successful because nothing happened within " + waitTime + "ms!");
		callback(null);
	}, waitTime);
	*/
	
	function callback(err) {
		if(callbackFunction) callbackFunction(err);
		callbackFunction = null; // Only callback once!
	}
	
}
