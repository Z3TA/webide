/*
	
	Listen on HTTP
	
	Start nodejs_init_worker.js that chroots into a users home dir, sets uid and manages nodejs scripts for a user
	
	When incomming HTTP, send cmd to nodejs_init_worker.js or start it if it's not running
	
*/

"use strict";

var getArg = require("./shared/getArg.js");

var UTIL = require("./client/UTIL.js");

var DEFAULT = require("./server/default_settings.js");

var defaultHomeDir = DEFAULT.home_dir;
var HOME_DIR = getArg(["h", "homedir"]) || defaultHomeDir;
if(HOME_DIR != defaultHomeDir) HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter

var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

var HTTP_PORT = getArg(["p", "port"]) || DEFAULT.nodejs_deamon_manager_port; 
var HTTP_IP = getArg(["ip", "ip"]) || DEFAULT.http_ip;

var NODE_INIT_WORKER = {}; // username:childProcess

var UTC = false;

var SHUTDOWN = false;

var TIMERS = [];


// Systemd console message leveles
var DEBUG = 7; // <7>This is a DEBUG level message
var INFO = 6; // <6>This is an INFO level message
var NOTICE = 5; // <5>This is a NOTICE level message
var WARNING = 4; // <4>This is a WARNING level message
var WARN = 4;
var ERR = 3; // <3>This is an ERR level message (ONLY USE FOR FATAL ERRORS)
var ERROR = 3;

var HTTP_SERVER;

process.on("SIGINT", sigint);

var fs = require("fs");

var module_mount = require("./shared/mount.js");

// Get the node inode id
var NODE_INODE = 0;
var usrBinNode = "/usr/bin/node";
fs.stat(usrBinNode, function(err, stats) {
	if(err) throw err; // fatal
	
	NODE_INODE = stats.ino;
	
	// Start a nodejs init worker for each user
	var eachUser = require("./shared/eachUser.js");
	eachUser(HOME_DIR, userFound, allUsersFound);
	
});

function userFound(user) {
	startNodejsInitWorker(user.homeDir, user.name, user.uid, user.gid);
}

function allUsersFound() {
	var http = require('http');
	HTTP_SERVER = http.createServer();
	HTTP_SERVER.on("request", httpRequest);
	HTTP_SERVER.on("error", httpServerError);
	HTTP_SERVER.on("listening", httpServerListening);
	HTTP_SERVER.listen(HTTP_PORT, HTTP_IP);
}

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

function sigint() {
	log("Received SIGINT!");
	
	SHUTDOWN = true;
	
	TIMERS.forEach(clearTimeout);
	
	for(var name in NODE_INIT_WORKER) {
		NODE_INIT_WORKER[name].kill('SIGTERM');
		NODE_INIT_WORKER[name].kill('SIGINT');
		NODE_INIT_WORKER[name].kill('SIGQUIT');
		NODE_INIT_WORKER[name].kill('SIGHUP');
	}
	
	HTTP_SERVER.close();
	
	// The process should now exit by itself as there is nothing left to do
}

function httpRequest(request, response) {
	
	log("Request to " + request.url + " from " + (request.headers["x-real-ip"] || request.connection.remoteAddress));
	
	var arr = request.url.split("?");
	if(arr[0] == "/ping") {
		response.writeHead(200);
		response.end("Pong " + arr[1] + "\n");
		return;
	}
	else console.log(arr);
	
	var auth = getAuth(request.headers["authorization"]);
	var username = auth.username;
	var password = auth.password;
	
	if(!NO_PW_HASH) {
		var pwHash = require("./server/pwHash.js");
		password = pwHash(password);
	}
	
	var homeDir = UTIL.trailingSlash(UTIL.joinPaths([HOME_DIR, username]));
	var pwFilePath = UTIL.joinPaths([homeDir, ".jzeditpw"]);
	
	fs.readFile(pwFilePath, "utf8", function(err, pwFileContent) {
		if(err) {
			if(err.code != "ENOENT") throw err;

response.writeHead(401);
response.end('Authorization failed! Unknown username=' + username + "\n");
}
			
		if(pwFileContent == password) return executeOrder();
		else {
			response.writeHead(401);
			response.end('Authorization failed! Bad password for username=' + username + "\n");
		}
		
	});
				
			function executeOrder() {
			// example: /service-name/restart
			var arr = request.url.split("?");
			var pathToFolder = arr[0];
			var action = arr[1];
			var isStarting = false;
		var userInfo = require("./shared/userInfo.js");
		
		userInfo(username, function(err, user) {
		
			if(err) throw err;
			
			if(!NODE_INIT_WORKER.hasOwnProperty(username) && action != "stop") {
				startNodejsInitWorker(user.homeDir, user.name, user.uid, user.gid);
				isStarting = true;
			}
			else if(!NODE_INIT_WORKER[username].connected && action != "stop") {
				startNodejsInitWorker(user.homeDir, user.name, user.uid, user.gid);
				isStarting = true;
			}
			
			if(action == "start") {
				if(isStarting) return;
				NODE_INIT_WORKER[username].send({restart: pathToFolder});
				response.writeHead(200);
				response.end('Starting ' + pathToFolder + "\n");
			}
			else if(action == "stop") {
				NODE_INIT_WORKER[username].send({stop: pathToFolder});
				response.writeHead(200);
				response.end('Stopping ' + pathToFolder + "\n");
			}
			else if(action == "restart") {
				if(isStarting) return;
				NODE_INIT_WORKER[username].send({restart: pathToFolder});
				response.writeHead(200);
				response.end('Restarting ' + pathToFolder + "\n");
			}
			// debug ?
			else {
				response.writeHead(400);
				response.end('Unknown action: ' + action + "\n");
			}
		
	});
	}
}

function httpServerError(err) {
	throw err;
}

function httpServerListening() {
	log("Listening on http://" + HTTP_IP + ":" + HTTP_PORT);
}

function startNodejsInitWorker(homeDir, name, uid, gid) {
	
	if(typeof homeDir != "string") throw new Error("homeDir=" + homeDir + " needs to be a string (folder)!");
	if(typeof name != "string") throw new Error("name=" + name + " needs to be a string!");
	if(typeof uid != "number") throw new Error("uid=" + uid + " needs to be a number!");
	if(typeof gid != "number") throw new Error("gid=" + gid + " needs to be a number!");
	
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
			gid: gid,
			user: name
		}
	};
	
	restart();
	
	function restart() {
		// Check the .prod folder
		var prodFolder = homeDir + ".prod";
		var fs = require("fs");
		fs.readdir(prodFolder, function(err, filesInProdDir) {
			if(err) {
				log(err.message, NOTICE);
				log("Failed to start init worker for " + name + " because we can't find " + prodFolder + " !");
				delete NODE_INIT_WORKER[name];
				return;
			}
			
			// Don't bother starting the worker if prod is empty
			if(filesInProdDir.length == 0) {
				log("No files in " + prodFolder + " wont bother to start the init worker for " + name);
				delete NODE_INIT_WORKER[name];
				return;
			}
			
			// Make sure nodejs worker exec exist
			fs.stat(nodeWorkerOptions.execPath, function(err, stats) {
				
				//console.log(nodeWorkerOptions.execPath + " stats=" + JSON.stringify(stats));
				
				if(err) {
					log(err.message, NOTICE);
					log("We will no longer retry restarting the init worker for " + name + " because " + err.code + " " + nodeWorkerOptions.execPath + " !", NOTICE);
					delete NODE_INIT_WORKER[name];
					return;
				}
				
				if(stats.ino != NODE_INODE) {
					log(nodeWorkerOptions.execPath + " has inode " + stats.ino + " but it should be " + NODE_INODE);
					log("Mounting " + usrBinNode + " to " + nodeWorkerOptions.execPath + " ...", DEBUG)
					module_mount(usrBinNode, nodeWorkerOptions.execPath, function mounted(err) {
						if(err) {
							log("Failed to mount " + usrBinNode + " to " + nodeWorkerOptions.execPath + ": " + err.message, NOTICE);
							// Should this be fatal !? eg throw ?
							delete NODE_INIT_WORKER[name];
							return;
						}
						else {
							return restart(); // Try again
						}
					});
				}
				
				var child_process = require("child_process");
				
				if(NODE_INIT_WORKER.hasOwnProperty(name)) {
					// Make sure it's dead
					log("Making sure init worker for " + name + " is dead ...");
					if(NODE_INIT_WORKER[name].connected) NODE_INIT_WORKER[name].disconnect();
					NODE_INIT_WORKER[name].kill('SIGKILL');
				}
				
				var workerScript = "./nodejs_init_worker.js";
				log("Starting init worker for " + JSON.stringify(name) + ": Forking " + workerScript + " nodeWorkerArgs=" + JSON.stringify(nodeWorkerArgs) + " nodeWorkerOptions=" + JSON.stringify(nodeWorkerOptions));
				
				NODE_INIT_WORKER[name] = child_process.fork(workerScript, nodeWorkerArgs, nodeWorkerOptions);
				// We might get a seg fault here - which we can not try-catch!
				// Then try with a new version of nodejs ... lets hope this doesn't happen in prod
				
				var worker = NODE_INIT_WORKER[name];
				
				worker.on("close", workerClose);
				worker.on("disconnect", workerDisconnect);
				worker.on("error", workerError);
				worker.on("message", messageFromWorker);
				worker.on("exit", workerExitHandler);
				
				worker.send({ping: firstPing});
				
			});
		});
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
				firstPing = randomNr(6);
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
			
			if(SHUTDOWN) return;
			
			restartTimer = setTimeout(function () {
				restartWaitTime = restartWaitTime * 2;
				clearTimeout(resetRestartWaitTime);
				
				restart();
				
				resetRestartWaitTime = setTimeout(function() {
					// If the worker has not crashed in 30 seconds
					restartWaitTime = 1000;
					TIMERS.splice(TIMERS.indexOf(resetRestartWaitTime), 1);
				}, 30000);
				TIMERS.push(resetRestartWaitTime);
				
				TIMERS.splice(TIMERS.indexOf(restartTimer), 1);
				
			}, restartWaitTime);
			TIMERS.push(restartTimer);
			
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


