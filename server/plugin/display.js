/*
	
	
	
*/
"use strict";

var module_ps = require('ps-node');
var UTIL = require("../../client/UTIL.js");
var module_child_process = require('child_process');
var logModule = require("../../shared/log.js");
var log = logModule.log;

// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;


var SCREEN = {};

var DISPLAY = {
	
	start: function(user, json, callback) {
		
		var username = user.name;
		var displayId = user.id;
		log("****************************************************************************")
		log("DISPLAY START! username=" + username + " displayId=" + displayId, NOTICE);
		log("****************************************************************************")
		
		if(displayId == undefined) return callback(new Error("No display assigned because user.id=" + user.id + ""));
		
		if(SCREEN.hasOwnProperty(displayId)) {
			
			if(SCREEN[displayId].stopping) return callback(new Error("Screen is being stopped..."));
			else if(SCREEN[displayId].starting) return callback(new Error("Screen is starting..."));
			else if(SCREEN[displayId].started) return callback(null, SCREEN[displayId].vnc);
			else throw new Error("Don't know what to do... SCREEN[" + displayId + "]=" + JSON.stringify(SCREEN[displayId]));
		}
		
		// The screen might be running in the background (worker process crashed without cleanup?), but we can't reuse it because we don't know the password
		killProcess("socat", function(err) {
			if(err) log(err.message, INFO) 
			killProcess("x11vnc", function(err) {
				if(err) log(err.message, INFO) 
				killProcess("xvfb", function(err) {
					if(err) log(err.message, INFO) 
					
					start();
				});
			});
		});
		
		
		
		function start() {
			
			if(SCREEN.hasOwnProperty(displayId)) throw new Error("SCREEN[" + displayId + "]=" + JSON.stringify(SCREEN[displayId]));
			
		SCREEN[displayId] = {
			vnc: {},
			stopping: false,
			starting: true
		};
		
		createScreen(username, displayId, json.width, json.height);
		
		// We can't get x server to listen on TCP, it only wants to listen on unix socket. So we have to proxy to the socket
		// By listening on TCP we can allow VM's and Docker containers to start GUI apps on our display!
		// The xclient will connect to port 6000 + displayNr
		// todo: Add iptables rules so that only the user and the docker VM can connect to the display
		spawnTcpProxyToUnixSocket(6000+user.id, "/tmp/.X11-unix/X" + user.id, displayId, user.name)
		
		
		var x11vncPort = 7000 + user.id; // The port to run the VNC protocol on
		startX11vnc(username, displayId, x11vncPort);
		
		setTimeout(function() {
			SCREEN[displayId].starting = false;
		}, 3000);
		
			callback(null, SCREEN[displayId].vnc);
		}
		
	},
	status: function(user, json, callback) {
		
		// Note: a undefined or null response will be converted to {}
		
		var status = {
			noDisplays: true
		};
		
		for(var displayId in SCREEN) {
			checkStatus(displayId);
		}
		
		callback(null, status);
		
		function checkStatus(displayId) {
			var socat = SCREEN[displayId].socat && isStream(SCREEN[displayId].socat.stdout);
			var x11vnc = SCREEN[displayId].x11vnc && isStream(SCREEN[displayId].x11vnc.stdout);
			var xvfb = SCREEN[displayId].xvfb && isStream(SCREEN[displayId].xvfb.stdout);
			
			delete status.noDisplays
			
			log("socat=" + socat, DEBUG);
			
			
			status[displayId] = {
				socat: socat,
				x11vnc: x11vnc,
				xvfb: xvfb,
				starting: SCREEN[displayId].starting,
				stopping: SCREEN[displayId].stopping
			};
			
			if(x11vnc) status[displayId].started = true;
			else status[displayId].started = false;
		}
		
	},
	stop: function(user, json, callback) {
		
		log("Stopping all displays...", DEBUG);
		
		var counter = 0;
		
		for(var displayId in SCREEN) {
			counter++;
			
			log("Maybe stop displayId=" + displayId + " ...", DEBUG);
			
			if( SCREEN[displayId].starting ) {
				var error = new Error("Can't stop display while it's starting!");
				if(callback) callback(error);
				else LOG(error.message, WARN);
				return;
			}
			
			stop(displayId);
		}
		
		if(callback) callback(null, counter);
		
		function stop(displayId) {
			log("Stopping displayId=" + displayId + " ...", DEBUG);
			
			var screen = SCREEN[displayId]
			
			screen.stopping = true;
			
			if(screen.socat) {
				log("Killing socat...", DEBUG);
				screen.socat.stdin.pause();
				screen.socat.kill();
			}
			if(screen.x11vnc) {
				log("Killing x11vnc...", DEBUG);
				screen.x11vnc.stdin.pause();
screen.x11vnc.kill();
			}
			if(screen.xvfb) {
				log("Killing xvfb...", DEBUG);
				screen.xvfb.stdin.pause();
				screen.xvfb.kill();
			}
			
			setTimeout(function() {
				//screen.stopping = false;
				
				delete SCREEN[displayId];
			}, 3000);
			
			
		}
		
	}
	
}

function spawnTcpProxyToUnixSocket(port, unixSocket, displayId, username) {
	var args = [
		"TCP-LISTEN:" + port + ",fork",
		"UNIX-CONNECT:" + unixSocket
	];
	
	var errAddressInUse = false;
	
	log("Starting socat with args=" + JSON.stringify(args), DEBUG);
	var socat = module_child_process.spawn("socat", args);
	
	socat.on("close", function (code, signal) {
		log(username + " socat close: code=" + code + " signal=" + signal, NOTICE);
		
		log("errAddressInUse=" + errAddressInUse, DEBUG);
		
		if(code != 0 && errAddressInUse && !(SCREEN[displayId] && SCREEN[displayId].stopping)) {
			// The address is taken for 20-30 seconds
			var waitSeconds = 10;
			log(username + " waiting " + waitSeconds + " seconds before restarting socat...", DEBUG);
			setTimeout(function() {
				if( SCREEN[displayId] && SCREEN[displayId].stopping ) return;
				
				log(username + " restarting socat!", DEBUG);
				spawnTcpProxyToUnixSocket(port, unixSocket, displayId, username);
			}, waitSeconds*1000);
		}
	});
	
	socat.on("disconnect", function () {
		log(username + " socat disconnect: socat.connected=" + socat.connected, DEBUG);
	});
	
	socat.on("error", function (err) {
		log(username + " socat error: err.message=" + err.message, ERROR);
		console.error(err);
	});
	
	socat.stdout.on("data", function (data) {
		log(username + " socat stdout: " + data, DEBUG);
	});
	
	socat.stderr.on("data", function (data) {
		log(username + " socat stderr: " + data, INFO);
		
		var str = data.toString();
		
		if(str.indexOf("Address already in use") != -1) errAddressInUse = true;
		else errAddressInUse = false;
		
	});
	
	SCREEN[displayId].socat = socat;
}

function getWindowId(displayId, callback) {
	module_child_process.exec("xwininfo -display :" + displayId + " -root -children", function(error, stdout, stderr) {
		if(error) return callback(error);
		if(stderr) log("getWindowId: stderr=" + stderr, NOTICE);
		
		log("getWindowId: displayId=" + displayId + " stdout=" + stdout, DEBUG);
		/*
			
			xwininfo: Window id: 0x298 (the root window) (has no name)
			
			Root window id: 0x298 (the root window) (has no name)
			Parent window id: 0x0 (none)
			4 children:
			0x200003 "Calculator": ("mate-calc" "Mate-calc")  312x225+0+0  +0+0
			0x200001 "mate-calc": ("mate-calc" "Mate-calc")  10x10+10+10  +10+10
			0x400001 (has no name): ()  10x10+1+1  +1+1
			0x1600003 (has no name): ()  3x3+0+0  +0+0
			
			
		*/
		
		var reWindowId = /window id: (.*) /;
		var matchWindowId = stdout.match(reWindowId);
		if(!matchWindowId) throw new Error("Unable to find reWindowId=" + reWindowId + " in stdout=" + stdout);
		var windowId = matchWindowId[1];
		
		return callback(null, windowId);
		
	});
	
}

function startX11vnc(username, displayId, x11vncPort, windowId) {
	
	if(!x11vncPort) throw new Error("x11vncPort=" + x11vncPort);
	
	// ### x11vnc
	
	if(!UTIL.isNumeric(x11vncPort)) {
		var unixPipe = true;
		var vncUnixSocket = x11vncPort;
	}
	
	if(unixPipe) x11vncPort = 0;
	
	// note: x11vnc supports both websockets and normal tcp on the same port!
	
	var vncPassword = generatePassword(8);
	SCREEN[displayId].vnc.password = vncPassword;
	
	// http://www.karlrunge.com/x11vnc/x11vnc_opts.html
	var x11vncArgs = [
		"-usepw", // We shall use a password! To prevent users getting into each others vnc session.
		"-passwd",
		vncPassword,
		"-rfbport",
		x11vncPort,
		"-display",
		":" + displayId,
		//"-id",
		//windowId,
		"-forever"
	];
	
	if(unixPipe) {
		x11vncArgs.push("unixsock");
		x11vncArgs.push(vncUnixSocket);
		SCREEN[displayId].vnc.socket = vncUnixSocket;
	}
	else {
		//SCREEN[displayId].vnc.host = HOSTNAME;
		SCREEN[displayId].vnc.port = x11vncPort;
	}
	
	// debug: xwininfo -display :5 -root -children
	// debug: x11vnc -rfbport 5901 -display :5 -id 0x400001 -forever
	restart();

	function restart() {
	log("Starting x11vnc with args=" + JSON.stringify(x11vncArgs));
	var x11vnc = module_child_process.spawn("x11vnc", x11vncArgs);
	
	x11vnc.on("close", function (code, signal) {
		log(username + " x11vnc (displayId=" + displayId + ") close: code=" + code + " signal=" + signal, NOTICE);
			
			log("SCREEN[" + displayId + "].stopping=" + SCREEN[displayId].stopping, DEBUG);
			
			// We seem to get a restart loop, so don't restart (need to do it manually?) Can't restart display manually!
			if(!SCREEN[displayId].stopping) setTimeout(restart, 5000);
			
			
		});
		
		x11vnc.on("disconnect", function () {
			log(username + " x11vnc (displayId=" + displayId + ") disconnect: x11vnc.connected=" + x11vnc.connected, DEBUG);
	});
	
	x11vnc.on("error", function (err) {
		log(username + " x11vnc (displayId=" + displayId + ") error: err.message=" + err.message, ERROR);
		console.error(err);
		//throw err;
	});
	
	x11vnc.stdout.on("data", function (data) {
		log(username + " x11vnc (displayId=" + displayId + ") stdout: " + data, INFO);
	});
	
	x11vnc.stderr.on("data", function (data) {
		log(username + " x11vnc (displayId=" + displayId + ") stderr: " + data, DEBUG);
	});
	
	SCREEN[displayId].x11vnc = x11vnc;
	}
	
}

function createScreen(username, displayId, width, height) {
	
	if(width == undefined) width = 800;
	if(height == undefined) height = 900;
	
	var res = width + "x" + height + "x24";
	
	SCREEN[displayId].vnc.width = width;
	SCREEN[displayId].vnc.height = height;
	
	var xvfbArgs = [
		":" + displayId,  // Server/monitor/display ... ?
		"-screen",
		"0",
		res, // Screen 0 res and depth, I guess you can have many screens on one Server/monitor/display !?
		"-ac" // Disables X access control
	];
	
	// debug: Xvfb :5 -screen 0 800x600x24 -ac &
	// debug: xwininfo -display :5 -root -children
	// debug: ps ax | grep Xvfb
	
	log(   "Starting Xvfb with args=" + JSON.stringify(xvfbArgs) + " (" + xvfbArgs.join(" ") + ")"   );
	var xvfb = module_child_process.spawn("Xvfb", xvfbArgs);
	
	xvfb.on("close", function (code, signal) {
		log(username + " xvfb (displayId=" + displayId + ") close: code=" + code + " signal=" + signal, NOTICE);
		//throw new Error("xvfb close: code=" + code);
	});
	
	xvfb.on("disconnect", function () {
		log(username + " xvfb (displayId=" + displayId + ") disconnect: xvfb.connected=" + xvfb.connected, DEBUG);
	});
	
	xvfb.on("error", function (err) {
		log(username + " xvfb (displayId=" + displayId + ") error: err.message=" + err.message, ERROR);
		console.error(err);
		//throw err;
	});
	
	xvfb.stdout.on("data", function(data) {
		log(username + " xvfb (displayId=" + displayId + ") stdout: " + data, WARN);
	});
	
	xvfb.stderr.on("data", function (data) {
		log(username + " xvfb (displayId=" + displayId + ") stderr: " + data, ERROR);
	});
	
	SCREEN[displayId].xvfb = xvfb
	
}

function killProcess(command, callback) {
	log("killProcess: Killing existing " + command + " ...", DEBUG);
	
	var abort = false;
	var killed = 0;
	var tokill = 0;
	
	module_ps.lookup({command: command}, lookedUp);
	
	function lookedUp(err, resultList ) {
		if(err) return error(err);
		
		if(resultList.length == 0) {
			log("killProcess: Did not find command=" + command, DEBUG);
			callback(null, false); callback=null; return;
		}
		
		resultList.forEach(kill);
	}
	
	function kill(p) {
		if(!p) return error(new Error("p=" + p));
		
		tokill++;
		
		log( 'killProcess: Found PID: ' + p.pid + ', COMMAND: ' + p.command + ', ARGUMENTS: ' + p.arguments + ' ', DEBUG );
		module_ps.kill( p.pid, function( err ) {
			killed++;
			if(err) return error(err);
			
			log( 'killProcess: Process ' + p.pid + ' has been killed!', DEBUG);
			
			allKilledMaybe();
			
		});
	}
	
	function allKilledMaybe() {
		if(abort) return; // Might have got an error
		if(killed == tokill) {callback(null, true); callback=null;}
	}
	
	function error(err) {
		callback(err);
		callback = null;
		abort = true;
	}
}

function generatePassword(n) {
	if(n == undefined) n = 8;
	var pw = "";
	for(var i=0; i<n; i++) pw += Math.floor(Math.random() * 10);
	return pw;
}

function isStream(stream) {
	return stream !== null &&
	typeof stream === 'object' &&
	typeof stream.pipe === 'function';
}

module.exports = DISPLAY;
