#!/usr/bin/env node

/*
	Starts the editor ...
	
	In Apple producs, we need to have a developer licence, 
	or users will not be able to run our scripts or apps ...
	Users can run Node-JS scripts if NodeJS is installed though!
	
*/


var log = require("./server/log.js").log;

// Log levels
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var serverFound = false;
	
// Check if server is running on localhost
//checkServer("127.0.0.1", serverChecked);
	

// Check if server is running on private subnet



// Start a local server if we did not find any

// If not running with sudo, use port 8099 instead of port 80 to prevent EACCESS error

startClient("127.0.0.1", "8099");


	
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

function timeStamp() {
	return (new Date()).getTime()/1000|0; // Unix timestamp
}

function startClient(ip, port) {

	var url = "http://" + ip + ":" + port + "/";
	
	var uid, gid;

	var nwRuntime = "";
	var platform = process.platform;
	if(platform == "darwin") nwRuntime = "./runtime/nwjs-v0.12.3-osx-x64/nwjs.app/Contents/MacOS/nwjs";
	else if(platform == "win32")  nwRuntime = "./runtime/nwjs-v0.12.3-win-x64/nw.exe";
	else if(platform == "linux")  nwRuntime = "./runtime/nwjs-v0.12.3-linux-x64/nw";
	else log("platform=" + platform + " not yet supported by nw.js", INFO);
	

	var tryPrograms = [];
		
	// Always try nw.js first!
	tryPrograms.push(["nw", ["."]]); // Any version of nw.js
	tryPrograms.push([nwRuntime, ["."]]); // The included nw.js runtime
	
	// We prefare the chromium/chrome browser!
	tryPrograms.push(["chromium-browser", ["--app=" + url]]); 
	tryPrograms.push(["chrome", ["--app=" + url]]);

	// It seems Firefox doesn't want to open URL's in chromeless mode (-chrome), only files 
	//tryPrograms.push(["firefox", ["-new-tab", url]]); // We can open a url in a new tab though
	tryPrograms.push(["firefox", ["-chrome", "client/index.htm"]]);
	
	if(platform == "win32") {
		// Only try IE on Windows
		tryPrograms.push(["iexplore", ["-k", url]]);
	}
	
	if(platform == "darwin") {
		// Only try Safari on Mac
		// Unfortunately Safari doesn't support chromless
		// We might be able to remote the chrome after it started though, by using osascript

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

	
	function attemptLaunch(process, args, callbackFunction) {

		if(typeof callback != "function") throw new Error("No callback function!");

		var childProcess = require("child_process");
		
		// You can have different group and user. Default is the user/group running the node process
		var options = {};
		
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
}

