/*
	
	
	
*/
"use strict";

var UTIL = require("../../client/UTIL.js");
var module_child_process = require('child_process');
var module_ps = require('ps-node');
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
		
		if(displayId == undefined) throw new Error("displayId=" + displayId + "");
		
		if(SCREEN.hasOwnProperty(displayId)) {
			return callback(null, SCREEN[displayId].vnc);
		}
		
		SCREEN[displayId] = {
			vnc: {}
		};
		
		createScreen(username, displayId, json.width, json.height);
		
		// We can't get x server to listen on TCP, it only wants to listen on unix socket. So we have to proxy to the socket
		// By listening on TCP we can allow VM's and Docker containers to start GUI apps on our display!
		// The xclient will connect to port 6000 + displayNr
		// todo: Add iptables rules so that only the user and the docker VM can connect to the display
		spawnTcpProxyToUnixSocket(6000+user.id, "/tmp/.X11-unix/X" + user.id, displayId, user.name)
		
		
		var x11vncPort = 7000 + user.id; // The port to run the VNC protocol on
		startX11vnc(username, displayId, x11vncPort);
		
		return callback(null, SCREEN[displayId].vnc);
		
		
	},
	status: function(user, json, callback) {
		
		var status = {
			started: false
		};
		
		for(var displayId in SCREEN) {
			counter++;
			checkStatus(displayId);
		}
		
		callback(null, status);
		
		function checkStatus(displayId) {
			var socat = SCREEN[displayId].socat && SCREEN[displayId].socat.connected;
			var x11vnc = SCREEN[displayId].x11vnc && SCREEN[displayId].x11vnc.connected;
			var xvfb = SCREEN[displayId].xvfb && SCREEN[displayId].xvfb.connected;
			
			status[displayId] = {
				socat: socat,
				x11vnc: x11vnc,
				xvfb: xvfb
			};
			
			if(x11vnc) status.started = true;
		}
		
	},
	stop: function(user, json, callback) {
		
		var counter = 0;
		
		for(var displayId in SCREEN) {
			counter++;
			stop(displayId);
		}
		
		if(callback) callback(null, counter);
		
		function stop(displayId) {
			var screen = SCREEN[displayId]
			if(screen.socat) screen.socat.kill();
			if(screen.x11vnc) screen.x11vnc.kill();
			if(screen.xvfb) screen.xvfb.kill();
			delete SCREEN[displayId];
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
		
		if(code != 0 && errAddressInUse) {
			// The address is taken for 20-30 seconds
			var waitSeconds = 10;
			log(username + " waiting " + waitSeconds + " seconds before restarting socat...", DEBUG);
			setTimeout(function() {
				log(username + " restarting socat!", DEBUG);
				SCREEN[displayId].socat = spawnTcpProxyToUnixSocket(port, unixSocket, displayId, username);
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
	}
	
	// debug: xwininfo -display :5 -root -children
	// debug: x11vnc -rfbport 5901 -display :5 -id 0x400001 -forever
	
	log("Starting x11vnc with args=" + JSON.stringify(x11vncArgs));
	var x11vnc = module_child_process.spawn("x11vnc", x11vncArgs);
	
	x11vnc.on("close", function (code, signal) {
		log(username + " x11vnc (displayId=" + displayId + ") close: code=" + code + " signal=" + signal, NOTICE);
		//throw new Error("x11vnc close code=" + code);
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
	
	SCREEN[displayId].vnc.password = vncPassword;
	
	
	if(unixPipe) {
		SCREEN[displayId].vnc.socket = vncUnixSocket;
	}
	else {
		//SCREEN[displayId].vnc.host = HOSTNAME;
		SCREEN[displayId].vnc.port = x11vncPort;
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

function generatePassword(n) {
	if(n == undefined) n = 8;
	var pw = "";
	for(var i=0; i<n; i++) pw += Math.floor(Math.random() * 10);
	return pw;
}


module.exports = DISPLAY;
