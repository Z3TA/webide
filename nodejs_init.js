/*
	
	Listen on HTTP
	
	Start nodejs_init_worker.js that chroots into a users home dir, sets uid and manages nodejs scripts for a user
	
	When incomming HTTP, send cmd to nodejs_init_worker.js or start it if it's not running
	
*/

"use strict";

var getArg = require("./server/getArg.js");

var UTIL = require("./client/UTIL.js");

var defaultHomeDir = "/home/";
var HOME_DIR = getArg(["h", "homedir"]) || defaultHomeDir;
if(HOME_DIR != defaultHomeDir) HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter

var defaultPasswordFile = process.platform == "win32" ? "./users.pw" : "/etc/jzedit_users"
var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;

var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

var nodejsDeamonManagerPort = 8100;
var HTTP_PORT = getArg(["p", "port"]) || nodejsDeamonManagerPort; 
var HTTP_IP = getArg(["ip", "ip"]) || "127.0.0.1";

var NODE_INIT_WORKER = {}; // username:childProcess

var UTC = false;

// Systemd console message leveles
var DEBUG = 7; // <7>This is a DEBUG level message
var INFO = 6; // <6>This is an INFO level message
var NOTICE = 5; // <5>This is a NOTICE level message
var WARNING = 4; // <4>This is a WARNING level message
var WARN = 4;
var ERR = 3; // <3>This is an ERR level message
var ERROR = 3;


var fs = require("fs");
fs.readFile(PW_FILE, "utf8", function(err, data) {
	if(err) throw err;
	
	// Start a nodejs worker/init script for each user
	var row = data.trim().split(/\n|\r\n/);
	
	log("Loaded " + PW_FILE + " (" + row.length + " users found)");
	
	// format: username|password|rootDir|uid|gid
	
	// note: usernames can not contain |
	
	for(var i=0, test, pUser, pPass, pRootDir, pUid, pGid; i<row.length; i++) {
		test = row[i].trim().split("|");
		
		pUser = test[0];
		
		if(pUser.charAt(0) == "#") continue; // Ignore users who's username starts with #
		
		pPass = test[1];
		pRootDir = test[2];
		pUid = test[3];
		pGid = test[4];
		
		startNodejsInitWorker(pRootDir, pUser, pUid, pGid);
	
	}
	
	var http = require('http');
	var httpServer = http.createServer();
	httpServer.on("request", httpRequest);
	httpServer.on("error", httpServerError);
	httpServer.on("listening", httpServerListening);
	httpServer.listen(HTTP_PORT, HTTP_IP);
	
	
	
});


function getAuth(authorization_header_string) {
	var username = "";
	var password = "";
	
	if(authorization_header_string != undefined) {
		
		var arr = authorization_header_string.split(" ");
		
		if(arr.length > 0) {
			
			var authType = arr[0];
			var base64str = arr[1];
			
			var buf = new Buffer(base64str, 'base64');
			var str = buf.toString("utf8");
			var arrAuth = str.split(":");
			
			if(arrAuth.length == 2) {
				username = arrAuth[0];
				password = arrAuth[1];
			}
			else {
				log("Bad auth! type=" + authType + " str=" + str + "");
			}
		}
		else {
			log("Weird auth! (" + authorization_header_string + ")");
		}
	}
	else {
		log("No auth data! (" + authorization_header_string + ")");
	}
	
	return {username: username, password: password};
	
}

function httpRequest(request, response) {
	log("Request to " + request.url + " from " + (request.headers["x-real-ip"] || request.connection.remoteAddress));
	
	var auth = getAuth(request.headers["authorization"]);
	var username = auth.username;
	var password = auth.password;
	
	if(!NO_PW_HASH) {
		var pwHash = require("./server/pwHash.js");
		password = pwHash(password);
	}
	
	fs.readFile(PW_FILE, "utf8", function(err, data) {
		if(err) throw err;
		
		// Start a nodejs worker/init script for each user
		var row = data.trim().split(/\n|\r\n/);
		
		log("Loaded " + PW_FILE + " (" + row.length + " users found)");
		
		// format: username|password|rootDir|uid|gid
		
		// note: usernames can not contain |
		
		for(var i=0, test, pUser, pPass, pRootDir, pUid, pGid; i<row.length; i++) {
			test = row[i].trim().split("|");
			
			pUser = test[0];
			
			if(pUser.charAt(0) == "#") continue; // Ignore users who's username starts with #
			
			pPass = test[1];
			pRootDir = test[2];
			pUid = test[3];
			pGid = test[4];
			
			if(pUser == username && pPass == password) {
				return executeOrder(pRootDir, pUser, pUid, pGid);
		}
			
		}
		
		response.writeHead(401);
		response.end('Authorization failed! username=' + username + "\n");
		
	});
	
	
	function executeOrder(homeDir, name, uid, gid) {
		// example: /service-name/restart
		var arr = request.url.split("?");
		var pathToFolder = arr[0];
		var action = arr[1];
		
		if(!NODE_INIT_WORKER.hasOwnProperty(name)) {
			startNodejsInitWorker(homeDir, name, uid, gid);
			// Don't have to wait for the init worker, ... or ?
		}
		else if(!NODE_INIT_WORKER[name].connected) {
			startNodejsInitWorker(homeDir, name, uid, gid);
			// Don't have to wait for the init worker, ... or ?
		}
		
			if(action == "start") {
				NODE_INIT_WORKER[name].send({restart: pathToFolder});
				response.writeHead(200);
				response.end('Starting ' + pathToFolder + "\n");
			}
			else if(action == "stop") {
				NODE_INIT_WORKER[name].send({stop: pathToFolder});
				response.writeHead(200);
				response.end('Stopping ' + pathToFolder + "\n");
			}
			else if(action == "restart") {
				NODE_INIT_WORKER[name].send({restart: pathToFolder});
				response.writeHead(200);
				response.end('Restarting ' + pathToFolder + "\n");
			}
			// debug ?
			else {
				response.writeHead(400);
				response.end('Unknown action: ' + action + "\n");
			}
		}
	
	}

function httpServerError(err) {
	throw err;
}

function httpServerListening() {
	log("Listening on http://" + HTTP_IP + ":" + HTTP_PORT);
}

function startNodejsInitWorker(homeDir, name, uid, gid, callback) {
	
	var restartWaitTime  = 1000; // How long to wait for restart
	var restartTimer;
	var resetRestartWaitTime;
	var firstPing = randomNr(6);
	
	homeDir = UTIL.trailingSlash(homeDir);
	
	var nodeWorkerArgs = [];
	var nodeWorkerOptions = {
		execPath: "/usr/bin/nodejs_" + name,
		env: {
			homeDir: homeDir,
			uid: uid,
			gid: gid
		}
	};
	
	restart();
	
	function restart() {
		var child_process = require("child_process");
		
		if(NODE_INIT_WORKER.hasOwnProperty(name)) {
			// Make sure it's dead
			log("Making sure init worker for " + name + " is dead ...");
			if(NODE_INIT_WORKER[name].connected) NODE_INIT_WORKER[name].disconnect();
			NODE_INIT_WORKER[name].kill('SIGKILL');
		}
		
		log("Starting init worker for " + name + " ...");
		NODE_INIT_WORKER[name] = child_process.fork("./nodejs_init_worker.js", nodeWorkerArgs, nodeWorkerOptions);
		var worker = NODE_INIT_WORKER[name];
		
		worker.on("close", workerClose);
		worker.on("disconnect", workerDisconnect);
		worker.on("error", workerError);
		worker.on("message", messageFromWorker);
		worker.on("exit", workerExitHandler);
		
		
		
		worker.send({ping: firstPing});
		
	}
	
	
	function workerDisconnect() {
		log(name + " worker disconnect: worker.connected=" + NODE_INIT_WORKER[name].connected);
	}
	
	function workerError(err) {
		log(name + " worker error: err.message=" + err.message);
	}
	
	function messageFromWorker(msg, handle) {
		
		if(msg.message) {
			log(name + " worker message: " + msg.message.msg, msg.message.level);
		}
		else if(msg.pong) {
			if(msg.pong == firstPing) {
				//callback(null);
				firstPing = null;
			}
		}
		
	}
	
	function workerClose(code, signal) {
		log(name + " worker close: code=" + code + " signal=" + signal);
	}
	
	function workerExitHandler(code, signal) {
		log(name + " worker exit: code=" + code + " signal=" + signal);
		
		// A non zero exit code is fatal and we need to restart the worker
		if(parseInt(code) !== 0) {
			log(name + " worker process exited with code=" + code, ERR);
			
			restartTimer = setTimeout(function () {
				restartWaitTime = restartWaitTime * 2;
				clearTimeout(resetRestartWaitTime);
				
				restart();
				
				resetRestartWaitTime = setTimeout(function() {
					// If the worker has not crashed in 30 seconds
					restartWaitTime = 1000;
				}, 30000);
				
			}, restartWaitTime);
		}
		
	}
	
}

function log(msg, level) {
	if(level == undefined) level = 6;
	
	if(process.stdout.isTTY) {
		console.log(myDate() + " " + msg);
	}
	else {
		/* 
			Probably running under systemd:
			<7>This is a DEBUG level message
			<6>This is an INFO level message
			<5>This is a NOTICE level message
			<4>This is a WARNING level message
			<3>This is an ERR level message
			<2>This is a CRIT level message
			<1>This is an ALERT level message
			<0>This is an EMERG level message
		*/
		console.log("<" + level + ">" + myDate() + ":" + msg);
	}
}


function myDate() {
	var d = new Date();
	
	if(UTC) {
		var timezone =  d.getTimezoneOffset() // difference in minutes from GMT
		d.setTime(d.getTime() + (timezone*60*1000));
	}
	
	var hour = addZero(d.getHours());
	var minute = addZero(d.getMinutes());
	var second = addZero(d.getSeconds());
	
	var day = addZero(d.getDate());
	var month = addZero(1+d.getMonth());
	var year = d.getFullYear();
	
	return year + "-" + month + "-" + day + " (" + hour + ":" + minute + ":" + second + ")";
	
	function addZero(n) {
		if(n < 10) return "0" + n;
		else return n;
	}
}

function randomNr(n) {
	var nr = "1"; // Always start with nr 1 to prevent a zero
	for (var i=0; i<n-1; i++) {
		nr += Math.floor(Math.random() * 10);
	}
	return parseInt(nr);
}


