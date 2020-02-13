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
			var vnc = SCREEN[displayId];
			return callback(null, {port: vnc.vncPort, password: vnc.vncPassword});
		}
		
		SCREEN[displayId] = {};
		
		SCREEN[displayId].xvfb = createScreen(username, displayId);
		
		// We can't get x server to listen on TCP, it only wants to listen on unix socket. So we have to proxy to the socket
		// By listening on TCP we can allow VM's and Docker containers to start GUI apps on our display!
		// The xclient will connect to port 6000 + displayNr
		// todo: Add iptables rules so that only the user and the docker VM can connect to the display
		SCREEN[displayId].socat = spawnTcpProxyToUnixSocket(6000+user.id, "/tmp/.X11-unix/X" + user.id)
		
		
		getWindowId(displayId, function(err, windowId) {
			if(err) return callback(err);
			
			var x11vncPort = 7000 + user.id; // The port to run the VNC protocol on
			var vnc = startX11vnc(username, displayId, windowId, x11vncPort);
			
			return callback(null, {port: vnc.vncPort, password: vnc.vncPassword});
		});
		
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
			if(screen.proxy) screen.proxy.close();
			if(screen.sockat) screen.sockat.kill();
			if(screen.x11vnc) screen.x11vnc.kill();
			if(screen.xvfb) screen.xvfb.kill();
			delete SCREEN[displayId];
		}
		
	}
	
}

function spawnTcpProxyToUnixSocket(port, unixSocket) {
	var args = [
		"TCP-LISTEN:" + port + ",fork",
		"UNIX-CONNECT:" + unixSocket
	];
	
	log("Starting socat with args=" + JSON.stringify(args), DEBUG);
	var socat = module_child_process.spawn("socat", args);
	
	socat.on("close", function (code, signal) {
		log(username + " socat close: code=" + code + " signal=" + signal, NOTICE);
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
	});
	
	return socat;
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

function startX11vnc(username, displayId, windowId, x11vncPort) {
	
	if(!x11vncPort) throw new Error("x11vncPort=" + x11vncPort);
	
	// ### x11vnc
	
	if(!UTIL.isNumeric(x11vncPort)) {
		var modifiedLibvncserver = true;
		var vncUnixSocket = x11vncPort;
	}
	
	if(modifiedLibvncserver) x11vncPort = 0;
	
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
		"-id",
		windowId,
		"-forever"
	];
	
	if(modifiedLibvncserver) {
		x11vncArgs.push("unixsock");
		x11vncArgs.push(vncUnixSocket);
	}
	
	// debug: xwininfo -display :5 -root -children
	// debug: x11vnc -rfbport 5901 -display :5 -id 0x400001 -forever
	
	log("Starting x11vnc with args=" + JSON.stringify(x11vncArgs));
	var x11vnc = module_child_process.spawn("x11vnc", x11vncArgs);
	
	var channelId = displayId;
	var vncChannel = SCREEN[displayId]
	
	vncChannel.x11vnc = x11vnc;
	
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
	
	var resp = {
		vncPassword: vncPassword
	}
	
	
	
	var proxyOptions = {
		ws: true
	}
	
	if(modifiedLibvncserver) {
		resp.socket = vncUnixSocket;
		
		proxyOptions.target = {
			socketPath: vncUnixSocket
		};
	}
	else {
		//resp.vncHost = HOSTNAME;
		resp.vncPort = x11vncPort;
		proxyOptions.target = 'ws://127.0.0.1:' + x11vncPort;
	}
	
	proxyOptions.ws = true
	
	// The proxy was unable to proxy the request. It however worked with Nginx!
	//vncChannel.proxy = new module_httpProxy.createProxyServer(proxyOptions);
	
	vncChannel.vnc = resp;
	
	return resp;
}

function createScreen(username, displayId) {
	
	var xvfbArgs = [
		":" + displayId,  // Server/monitor/display ... ?
		"-screen",
		"0",
		"800x600x24", // Screen 0 res and depth, I guess you can have many screens on one Server/monitor/display !?
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
	
	return xvfb;
}

function generatePassword(n) {
	if(n == undefined) n = 8;
	var pw = "";
	for(var i=0; i<n; i++) pw += Math.floor(Math.random() * 10);
	return pw;
}


module.exports = DISPLAY;
