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

var NODE_INIT = {}; // username:childProcess, list of nodejs initors

var fs = require("fs");
fs.readFile(PW_FILE, "utf8", function(err, data) {
	if(err) throw err;
	
	// Start a nodejs worker/init script for each user
	var row = data.trim().split(/\n|\r\n/);
	
	console.log("Loaded " + PW_FILE + " (" + row.length + " users found)");
	
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
		
		//startNodejsInitWorker(pRootDir, pUser, pUid, pGid);
	
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
	console.log("Request to " + request.url + " from " + (request.headers["x-real-ip"] || request.connection.remoteAddress));
	
	var auth = getAuth(request.headers["authorization"]);
	var username = auth.username;
	var password = aut.password;
	
	if(!NO_PW_HASH) {
		var pwHash = require("./server/pwHash.js");
		password = pwHash(password);
	}
	
	fs.readFile(PW_FILE, "utf8", function(err, data) {
		if(err) throw err;
		
		// Start a nodejs worker/init script for each user
		var row = data.trim().split(/\n|\r\n/);
		
		console.log("Loaded " + PW_FILE + " (" + row.length + " users found)");
		
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
		response.end('Authorization failed! username=' + username);
		
	});
	
	
	function executeOrder(homeDir, username, uid, gid) {
		// example: /service-name/restart
		var arr = request.url.split("/");
		var projectName = arr[1];
		var action = arr[2];
		
		if(!CHILD.hasOwnProperty(username)) {
			startNodejsInitWorker(homeDir, username, uid, gid);
			
			// Don't have to wait for the init worker, ...
		}
		
		if(action == "start") {
			CHILD[username].send({restart: projectName});
			response.writeHead(200);
			response.end('Starting ' + projectName);
		}
		else if(action == "stop") {
			CHILD[username].send({stop: projectName});
			response.writeHead(200);
			response.end('Stopping ' + projectName);
		}
		else if(action == "restart") {
			CHILD[username].send({restart: projectName});
			response.writeHead(200);
			response.end('Restarting ' + projectName);
		}
		// debug ?
		else {
			response.writeHead(400);
			response.end('Unknown action: ' + action);
		}
	}
	
	}

function httpServerError(err) {
	throw err;
}

function httpServerListening() {
	console.log("Listening on http://" + HTTP_IP + ":" + HTTP_PORT);
}

function startNodejsInitWorker(homeDir, username, uid, gid) {
	
	homeDir = UTIL.trailingSlash(homeDir);
	
	var nodeWorkerArgs = [];
	var nodeWorkerOptions = {
		cwd: homeDir,
		execPath: "/usr/bin/nodejs_" + username,
		env: {
			homeDir: homeDir,
			uid: uid,
			gid: guid
		}
	};
	
	NODE_INIT[username] = child_process.fork("./node_init_worker.js", nodeWorkerArgs, nodeWorkerOptions);
	
}
