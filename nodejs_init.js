/*
	
	Listen on HTTP
	
	Start nodejs_init_worker.js that chroots into a users home dir, sets uid and manages nodejs scripts for a user
	
	When incomming HTTP, send cmd to nodejs_init_worker.js or start it if it's not running
	
*/

"use strict";

var getArg = require("./shared/getArg.js");

var UTIL = require("./client/UTIL.js");

var DEFAULT = require("./server/default_settings.js");

var HOME_DIR = getArg(["h", "homedir"]) || DEFAULT.home_dir;
HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter

var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

var HTTP_PORT = getArg(["p", "port"]) || DEFAULT.nodejs_deamon_manager_port; 
var HTTP_IP = getArg(["ip", "ip"]) || DEFAULT.http_ip;
var DOMAIN = getArg(["domain", "domain", "tld"]) || DEFAULT.domain;

var INSIDE_DOCKER = getArg(["insidedocker", "insidedocker", "insidecontainer"]);

var NODE_INIT_WORKER = {}; // username:childProcess

var UTC = false;

var SHUTDOWN = false;

var TIMERS = [];

var REQUESTS = []; // id: For recieving answers from workers
var REQUEST_ID = 0;

// Systemd console message leveles
var DEBUG = 7; // <7>This is a DEBUG level message
var INFO = 6; // <6>This is an INFO level message
var NOTICE = 5; // <5>This is a NOTICE level message
var WARNING = 4; // <4>This is a WARNING level message
var WARN = 4;
var ERR = 3; // <3>This is an ERR level message (ONLY USE FOR FATAL ERRORS)
var ERROR = 3;

var HTTP_SERVER;

var sigIntCount = 0;

process.on("SIGINT", sigint);

var fs = require("fs");

var module_mount = require("./shared/mount.js");

	// Start a nodejs init worker for each user
	var eachUser = require("./shared/eachUser.js");
	eachUser(HOME_DIR, userFound, allUsersFound);
	

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
		NODE_INIT_WORKER[name].kill('SIGINT');
		NODE_INIT_WORKER[name].kill('SIGQUIT');
		NODE_INIT_WORKER[name].kill('SIGHUP');
		NODE_INIT_WORKER[name].kill('SIGTERM');

		if(NODE_INIT_WORKER[name].connected) NODE_INIT_WORKER[name].disconnect();

		log("Worker: " + name + ": connected=" + NODE_INIT_WORKER[name].connected + " exitCode=" + NODE_INIT_WORKER[name].exitCode + " killed=" + NODE_INIT_WORKER[name].killed + " pid=" + NODE_INIT_WORKER[name].pid + " signalCode=" + NODE_INIT_WORKER[name].signalCode + "");
	
		NODE_INIT_WORKER[name].unref();
	}
	
	HTTP_SERVER.close();
	
	// The process should now exit by itself as there is nothing left to do

	if(++sigIntCount > 2) process.exit();

}

function httpRequest(request, response) {
	
	log("Request to " + request.url + " from " + (request.headers["x-real-ip"] || request.connection.remoteAddress || HTTP_PORT));
	
	// note: All successful requests should respond with a JSON string!

	var arr = request.url.split("?");
	if(arr[0] == "/ping") {
		response.writeHead(200);
		response.end('{"pong":' + arr[1] + '}');
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
	var pwFilePath = UTIL.joinPaths([homeDir, ".webide", "password"]);
	
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
		
// Make shure path exist
		fs.stat(pathToFolder, function(err) {
			if(err) {
				response.writeHead(400);
				response.end('Error: ' + err.message + "\n");
				return;
			}
			
			userInfo(username, function(err, user) {
				
				if(err) throw err;
				
				var validActions = ["start", "stop", "restart", "list"];
				if(validActions.indexOf(action) == -1) {
					response.writeHead(400);
					response.end('Unknown action: ' + action + "\n");
					return;
				}

				response.writeHead(200);

				var message = {};
				message[pathToFolder] = {action: action, id: ++REQUEST_ID};
				REQUESTS[REQUEST_ID] = function (json) {
					response.end(JSON.stringify(json));
				}
				
				if(  (!NODE_INIT_WORKER.hasOwnProperty(username) || !NODE_INIT_WORKER[username].connected) && action != "stop"  ) {
					log("No NODE_INIT_WORKER for username=" + username + " ...");
					startNodejsInitWorker(user.homeDir, user.name, user.uid, user.gid, message);
				}
				else {
					log("Sending to NODE_INIT_WORKER[" + username + "] message=" + JSON.stringify(message));
					NODE_INIT_WORKER[username].send(message);
				}
				
			});
		});
		
	}
}

function httpServerError(err) {
	throw err;
}

function httpServerListening() {
	
	
	
	if(isNaN(parseInt(HTTP_PORT)) && typeof HTTP_PORT == "string") {
		log("Listening on " + HTTP_PORT);
		
		var fs = require("fs");
		fs.chmod(HTTP_PORT, 0o777, function(err) {
			if (err) throw err;
			log('The permissions for ' + HTTP_PORT + ' successfully set!', DEBUG);
		});
		
	}
	else {
		log("Listening on http://" + HTTP_IP + ":" + HTTP_PORT);
	}
	
	
	
}

function startNodejsInitWorker(homeDir, username, uid, gid, messageToWorker) {
	log("startNodejsInitWorker: homeDir=" + homeDir + " username=" + username + " uid=" + uid + " gid=" + gid + " messageToWorker=" + JSON.stringify(messageToWorker));

	if(typeof homeDir != "string") throw new Error("homeDir=" + homeDir + " needs to be a string (folder)!");
	if(typeof username != "string") throw new Error("username=" + username + " needs to be a string!");
	if(typeof uid != "number") throw new Error("uid=" + uid + " needs to be a number!");
	if(typeof gid != "number") throw new Error("gid=" + gid + " needs to be a number!");
	
	var restartWaitTime  = 1000; // How long to wait for restart
	var restartTimer;
	var resetRestartWaitTime;
	var firstPing = randomNr(6);
	
	homeDir = UTIL.trailingSlash(homeDir);
	
	var workerArgs = [];
	var spawnOptions = {
		//execPath: "/usr/bin/nodejs_" + username,
		env: {
			homeDir: homeDir,
			uid: uid,
			gid: gid,
			user: username,
			tld: DOMAIN
		}
	};
	
	if(messageToWorker) {
		spawnOptions.env.messageToInitWorker = JSON.stringify(messageToWorker);
	}

	restart();
	
	function respondWithErrorMaybe(err) {
		log("startNodejsInitWorker:respondWithErrorMaybe: messageToWorker=" + JSON.stringify(messageToWorker) + " err.message=" + err.message);
		if(!messageToWorker) return;

		if(err==undefined) throw new Error("Expected err=" + err + " to be defined");

		var resp = {error: err.message};

		for(var pathToFolder in messageToWorker) {
			var id = messageToWorker[pathToFolder].id;
			if( REQUESTS.hasOwnProperty(id) ) {
				REQUESTS[id](resp);
				delete REQUESTS[id];
			}
		}
	}

	function restart() {
		log("startNodejsInitWorker:restart...");
		// Check the .prod folder
		var prodFolder = UTIL.joinPaths(homeDir, ".webide/prod/");
		var fs = require("fs");
		log("Reading " + prodFolder + " ...");
		fs.readdir(prodFolder, function(err, filesInProdDir) {
			if(err) {
				var error = new Error("Failed to start init worker for " + username + " because we can't find " + prodFolder + " ! " + err.message + " (" + err.code + ")");
				log(err.message, NOTICE);
				log(error.message);
				delete NODE_INIT_WORKER[username];
				return respondWithErrorMaybe(error);
			}
			
			// Don't bother starting the worker if prod is empty
			if(filesInProdDir.length == 0) {
				var error = new Error("No files in " + prodFolder + " wont bother to start the init worker for " + username);
				log(error.message);
				delete NODE_INIT_WORKER[username];
				return respondWithErrorMaybe(error);
			}
			
			if(NODE_INIT_WORKER.hasOwnProperty(username)) {
				// Make sure it's dead
				log("Making sure init worker for " + username + " is dead ...");
				if(NODE_INIT_WORKER[username].connected) NODE_INIT_WORKER[username].disconnect();
				NODE_INIT_WORKER[username].kill('SIGKILL');
			}
				
			var workerScript = "./nodejs_init_worker.js";
			
			var workerNode = process.argv[0]; // First argument is the path to the nodejs executable!
			var command = "/sbin/ip";
			//var args = ["netns", "exec", username, "sudo -u " + username, workerNode, workerScript].concat(workerArgs);
			var args = ["netns", "exec", username, workerNode, workerScript].concat(workerArgs);
			var netnsIP = UTIL.int2ip(167772162 + uid); // Starts on 10.0.0.2 then adds the uid to get a unique local IP address
			spawnOptions.env.HOST = netnsIP;
			spawnOptions.env.DISPLAY = netnsIP + ":" + uid; // Users must first create their display using display.start
			
			spawnOptions.shell = "/bin/dash";
			
			spawnOptions.stdio = ['pipe', 'pipe', 'pipe', "ipc"]; // ipc needed for sending messages to the worker
			// stdio: inherit sends log message to this process stdout, but that doesn't work when using network namespaces!
			var stdioPipe = true;
			
			if(INSIDE_DOCKER) {
				command = workerNode;
				args = [workerScript].concat(workerArgs);
			}

			log("Starting init worker for " + username + ": Forking " + workerScript + " by running command=" + command + " args=" + JSON.stringify(args) + " spawnOptions=" + JSON.stringify(spawnOptions));

			var module_child_process = require("child_process");
			NODE_INIT_WORKER[username] = module_child_process.spawn(command, args, spawnOptions, function spawnCallback(err, stdout, stderr) {
				log("Spawn callback for ");
				if(err) log(err.message, ERROR);
				else if(stderr) log(stderr, WARN);
				else if(stdout) log(stdout);
				else log("Spawn success!");
			});

			// We might get a seg fault here - which we can not try-catch!
			// Then try with a new version of nodejs ... lets hope this doesn't happen in prod
				
			/*
				Might also get: Cannot open network namespace "ltest1": No such file or directory
				How do we capture those errors !?!?!?
			*/

			var worker = NODE_INIT_WORKER[username];
				
			worker.on("close", workerClose);
			worker.on("disconnect", workerDisconnect);
			worker.on("error", workerError);
			worker.on("message", messageFromWorker);
			worker.on("exit", workerExitHandler);
				
			log("worker.connected=" + worker.connected + " worker.killed=" + worker.killed + " worker.pid=" + worker.pid + " ", DEBUG);
				
			worker.send({ping: firstPing});
				
		});
	}
	
	function workerDisconnect() {
		log(username + " worker disconnect: worker.connected=" + NODE_INIT_WORKER[username].connected);
	}
	
	function workerError(err) {
		log(username + " worker error: err.message=" + err.message);
	}
	
	function messageFromWorker(msg, handle) {
		if(msg.message) {
			log(username + " worker message: " + msg.message.msg, msg.message.level);
		}
		else if(msg.pong) {
			if(msg.pong == firstPing) {
				firstPing = randomNr(6);
			}
		}
		else if (msg.id) { // It's a response'
			var id = msg.id;
			if(REQUESTS.hasOwnProperty(id)) {
				delete msg["id"];
				REQUESTS[id](msg);
				delete REQUESTS[id];
			}
		}
	}
	
	function workerClose(code, signal) {
		log(username + " worker close: code=" + code + " signal=" + signal);
	}
	
	function workerExitHandler(code, signal) {
		log(username + " worker exit: code=" + code + " signal=" + signal);
		
		// A non zero exit code is fatal and we need to restart the worker
		if(parseInt(code) !== 0) {
			log(username + " worker process exited with code=" + code, ERR);
			
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


