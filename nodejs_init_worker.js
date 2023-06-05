/*
	
	A node script that manage other node scripts ...
	
	Each webide user has it's own nodejs deamon manager worker (this script)
	
	* Set uid and gid to the user's id.
	* Open log file in user's home dir ~/log/deamon_manager.log
	
	* traverse the USER_PROD_FOLDER (~/.webide/prod/) and look for a package.json file.
	* look for main script and start it
	* restart the script if it exits, and notify the user via e-mail or sms
	
	* open a scriptname.stdout.log file for each micro-service
	
	note: We might have to move the nodejs_init to another server, so we should not depend on the users home dir too much! 
	(and vice versa, client should not depend on the .prod files being stored in .webide/prod/ !!)


	When running manually (for testing)
	-----------------------------------
	Arguments: --home=/home/ltest1 --uid=120 --gid=127 --email=zeta@zetafiles.org

	messageToInitWorker=$(printf '{"/home/ltest1/.webide/prod/hello_world":{"action":"stop","id":1}}') node nodejs_init_worker.js -home /home/ltest1 -uid 1000 -gid 1000 -user ltest1 --trace-deprecation --email=


	Notes
	------
	Don't call log until initLogStream has been initialized! (or messages wont be logged)
	
	problem: If we have a syntax error in this script, nodejs_init.js will just keep restarting it!
	solution: nodejs_init.js (our parent process) will email ADMIN_EMAIL if this script restarts more then 3 times


	todo: Able to run any executable, not just Node.JS scripts.
	

*/

"use strict"

// Need the following to detect syntax errors and other errors like trying to call a function that doesn't exist
process.on('uncaughtException', hardError);

var getArg = require("./shared/getArg.js");

var DEFAULT = require("./server/default_settings.js");

var DOMAIN = getArg(["domain", "domain", "tld"]) || DEFAULT.domain;

var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email; // Errors with This script is sent here

var UTIL = require("./client/UTIL.js");
var HOMEDIR = getArg(["home", "home", "homeDir"]) || process.env.homeDir;
var EMAIL = getArg(["email", "email"]) || process.env.email; // E-mail address of the user. An service specific adress can also be specified in package.json!
var UID = getArg(["uid", "uid"]) || process.env.uid;
var GID = getArg(["gid", "gid"]) || process.env.gid;
var USERNAME = getArg(["user", "user", "username"]) || process.env.user;
var INIT_MESSAGE = getArg(["action", "action", "msg", "message"]) || process.env.messageToInitWorker; // JSON: {pathToFolder: {action: action, id:id}}


// For sending errors via email to an admin
var SMTP_PORT = getArg(["mp", "smtp_port"]) || DEFAULT.smtp_port;
var SMTP_HOST = getArg(["mh", "smtp_host"]) || DEFAULT.smtp_host;
var SMTP_USER = getArg(["mu", "smtp_user"]) || "";
var SMTP_PW = getArg(["mpw", "smtp_pass"]) || "";

var CHILD = {}; // Holds references to the child processes
var START_DATE = []; // When the process was last (re)started
var STOP = []; // List of processes being stopped, so they wont restart

var SHUTDOWN = false;

var PROCESS_TIMERS = {}; // Tracking all process specific timers so we can exit gracefully
var GLOBTMERS = []; // Tracking all global setTimeout so that we can exit gracefully (note: you don't have to remove them from the array when they are cleared)'
var UTC = false; // If set to true, use GMT+0 on time stamps

var CLOSE_CALLBACK = {}; // pathToFolder: function (call this function when child process exit)

// Require non-native modules before entering chroot!
var NODE_MAILER = require('nodemailer');
var SMTP_TRANSPORT = require('nodemailer-smtp-transport');

var TLD = DEFAULT.domain;

if(!HOMEDIR) return hardError(new Error("No HOMEDIR specified. Use argument: --homeDir=/home/username/"));
if(!UID) return hardError(new Error("No UID specified. Use argument: --uid=123"));
if(!GID) return hardError(new Error("No UID specified. Use argument: --gid=123"));
if(!USERNAME) return hardError(new Error("No USERNAME specified. Use argument: --user=123"));



// tip: type "id -u username" and "id -g username" in a terminal to get some user's user id and group id

// Systemd console message leveles
var DEBUG = 7; // <7>This is a DEBUG level message
var INFO = 6; // <6>This is an INFO level message
var NOTICE = 5; // <5>This is a NOTICE level message
var WARNING = 4; // <4>This is a WARNING level message
var WARN = 4;
var ERR = 3; // <3>This is an ERR level message
var ERROR = 3;

HOMEDIR = UTIL.trailingSlash(HOMEDIR); // Make sure it ends with a slash

var USER_PROD_FOLDER = UTIL.joinPaths(HOMEDIR, ".webide/prod/");


var ERR_GENERAL_HARD_ERROR = 100;
var ERR_DISCONNECTED_FROM_PARENT = 101
var ERR_PARSING_INIT_MESSAGE = 102;


var MAX_MAIL_RATE = 5000; // Queue up mails if a mail already has been sent within this time interval (in milliseconds)

var module_ps = require("ps-node");

// What happens if we open a file stream before chroot ?
// answer: the file stream will be kept open =)
// We need to wait after setuid though, unless we want to allow dac_read_search (allows root to override read-file permission)


var shutdownWhenNothingTodoTimer;
var lastMailDate;
var mailQueue = {}; // to: {subject:subject, text:text, from:from}
var sendMailInQueueTimer;

// Must be numbers!
GID = parseInt(GID);
UID = parseInt(UID);

var posix = require("posix");
try {
	process.setgid(GID);
}
catch(err) {
	if(err.code == "EPERM") return hardError(new Error("Not running as root! (try using sudo)"));
	else hardError(err);
}



// We must init groups or the user will be member of the root group!!
posix.initgroups(USERNAME, GID);

process.setuid(UID);


if(process.getuid && process.getuid() === 0) return hardError(new Error("Failed to change user! Worker process is still root! process.getuid()=" + process.getuid()));


var initLogFilePath = UTIL.joinPaths(HOMEDIR, "log/nodejs_init_worker.log");
var fs = require("fs");
var initLogStream = fs.createWriteStream(initLogFilePath, {'flags': 'a'});

log("Starting nodejs init worker...");
log("GID=" + GID + " UID=" + UID);
log("EMAIL=" + EMAIL);


if(INIT_MESSAGE) {

	//log("INIT_MESSAGE=" + INIT_MESSAGE);
	//log("\nprocess.env.messageToInitWorker=" + process.env.messageToInitWorker);

	try {
		INIT_MESSAGE = JSON.parse(INIT_MESSAGE);
	}
	catch(err) {
		log("Unable to parse INIT_MESSAGE=" + INIT_MESSAGE + " error: " + err.message, ERROR);
		exit(ERR_PARSING_INIT_MESSAGE);
	}

	log("INIT_MESSAGE: \n" + JSON.stringify(INIT_MESSAGE, null, 2));
}

if(getArg(["runtests"]) !== undefined) {
	runTests();
}
else {
	
	if(INIT_MESSAGE && INIT_MESSAGE.hasOwnProperty(USER_PROD_FOLDER)) {
		var action = INIT_MESSAGE[USER_PROD_FOLDER].action;
		var reqId = INIT_MESSAGE[USER_PROD_FOLDER].id;
		if(action == "list") {
			findScriptList(function(err, obj) {
				if(err) send({id: reqId, error: err.message});
				else send({id: reqId, scripts: obj.scripts});
			});
			delete INIT_MESSAGE[USER_PROD_FOLDER]; // Remove after use to prevent re-run
		}
	}

	findScripts(USER_PROD_FOLDER, function(err, scripts) {
		if(err) return hardError(err);

		//log("scripts.length=" + scripts.length);

		if(scripts.length == 0) {
			log("No scripts found in " + USER_PROD_FOLDER);
			if(reqId) send({id: reqId, error: "No scripts found in " + USER_PROD_FOLDER});
			idle();
			return;
		}

		scripts.forEach(startMaybe);

		function startMaybe(script) {
			var statusFile = UTIL.joinPaths(script.pathToFolder, ".webide_init_status");
			
			if(INIT_MESSAGE && INIT_MESSAGE.hasOwnProperty(script.pathToFolder)) {
				var action = INIT_MESSAGE[script.pathToFolder].action;
				var reqId = INIT_MESSAGE[script.pathToFolder].id;
			}
			else if(INIT_MESSAGE) {
				log("Did not find " + script.pathToFolder + " in INIT_MESSAGE:" + JSON.stringify(Object.keys(INIT_MESSAGE)) );
			}
			else {
				log("Empty INIT_MESSAGE=" + INIT_MESSAGE);
			}

			log("startMaybe: script.pathToFolder=" + script.pathToFolder + " action=" + action + " reqId=" + reqId + " INIT_MESSAGE=" + JSON.stringify(INIT_MESSAGE), DEBUG);

			fs.readFile(statusFile, "utf8", function(err, status){
				
				if(err) {
					if(err.code != "ENOENT") return hardError(err);
					// ENOENT means that the script has never been run! We will thus set the status to the default status=start
					log("Setting status to start for " + script.pathToFolder + " because there was an error when opening " + statusFile + ". Error:" + err.message);
					setStatus(script.pathToFolder, "start");
					status ="start";
				}
				else if(action) {
					// Init actions overrides the statusfile
					if(action=="start" || action=="restart") {
						setStatus(script.pathToFolder, "start");
						status ="start";
					}
					else if(action=="stop") { // The init action will unlikely be "stop", but we have it here anyway so we can override the statusfile
						setStatus(script.pathToFolder, "stop");
						status ="stop";
					}
					else {
						log("Unexpected init action=" + action + " in INIT_MESSAGE=" + JSON.stringify(INIT_MESSAGE, null, 2));
						if(reqId) send({id: reqId, error: "Unexpected init action=" + action});
					}
				}

				status = status.trim();

				if(status=="stop") {
					log("Not starting " + script.pathToFolder + " because last status was stop!");
					
					var afterStop = function() {
						if(scripts.indexOf(script) != -1) scripts.splice(scripts.indexOf(script), 1);
						else return hardError(new Error("Did not find script=" + script + " in scripts=" + JSON.stringify(scripts, null, 2)));

						if(reqId) {
							send({id: reqId, stopped: script.pathToFolder});
							delete INIT_MESSAGE[script.pathToFolder]; // Remove after use
						}

						if(scripts.length == 0) {
							log("Nothing else to do");
							idle();
						}
					}

					makeSureItsDead(script.pathToFolder, function(err) {
						if(err && err.code != "IN_PROGRESS") return hardError(err);
						afterStop();
					});
					
					return;
				}

				startService({scriptPath: script.main, projectName: script.name, pathToFolder: script.pathToFolder, logFilePath: script.log, email: script.email || EMAIL, nodeVersion: script.nodeVersion}, function(err) {
					if(reqId && (action=="start" || action=="restart")) {
						send({id: reqId, restarting: script.pathToFolder});
					}

					if(INIT_MESSAGE) delete INIT_MESSAGE[script.pathToFolder]; // Remove after use
				});
				
			});
		}
	});
}

process.on("SIGINT", sigint);

process.on('message', commandMessage);

function sigint() {
	log("Received SIGINT");
	shutdownInitWorker();
}

function send(msg) {
	if(!process.send || !process.connected) {
		log("No longer connected to parent process!");
		shutdownInitWorker(ERR_DISCONNECTED_FROM_PARENT);
		return;
	}

	process.send(msg);
}

function commandMessage(message) {
	
	log("Recieved: " + JSON.stringify(message));
	
	clearTimeout(shutdownWhenNothingTodoTimer);

	if(message == undefined) return hardError(new Error("undefined user worker message=" + message));


	if(message.ping) {
		send({pong: message.ping});
		return;
	}

	if(SHUTDOWN) {
		for(var pathToFolder in message) {
			item = message[pathToFolder];
			send({error: "Init worker is shutting down...", id: item.id});
		}

		return;
	}

	var item = "", id = 0;

	for(var pathToFolder in message) takeAction(pathToFolder);

	function takeAction(pathToFolder) {
		var item = message[pathToFolder];

		log("Recieved item: " + JSON.stringify(item));

		if(item.id == undefined) return hardError(new Error("Worker command " + JSON.stringify(message) + " does not have an id!"));

		pathToFolder = UTIL.trailingSlash(pathToFolder);

		if(item.action=="restart") restart(pathToFolder, 5000, cb);
		else if(item.action=="stop") stop(pathToFolder, true, 5000, cb);
		else if(item.action=="start") start(pathToFolder, cb);
		//else if(item.action=="shutdown") shutdownInitWorker(0, cb);
		else if(item.action=="list") findScriptList(cb);

		else cb(new Error("Unknown message=" + JSON.stringify(message)));
	
		function cb(err, obj) {
			if(err) obj = {error: err.message, errorCode: err.code};
			
			if(typeof obj != "object") obj = {};

			obj.id = item.id;
			send(obj);

			log("Answered request id=" + id + " with obj=" + JSON.stringify(obj));

			if(err && err.code != "IN_PROGRESS") return hardError(err);
		}
	}
}

function findScriptList(callback) {
	findScripts(USER_PROD_FOLDER, function(err, scripts) {
		if(err) return callback(err);

		var json = scripts.map(function(script) {
			/*
				{main: scriptFilePath, name: findFile, pathToFolder: UTIL.trailingSlash(pathToFolder), log: HOMEDIR + "log/" + folderItem + ".log"}
			*/

			return {
				main: script.main,
				name: script.name,
				pathToFolder: script.pathToFolder,
				log: script.log,
				running: CHILD.hasOwnProperty(script.pathToFolder) && STOP.indexOf(script.pathToFolder) == -1
			}
		});

		if(scripts.length == 0) {
			callback(null, {scripts: json});
			log("There are no longer any scripts");
			idle();
			return;
		}

		var statusToCollect = 0;
		var statusCollected = 0;

		json.forEach(attachStatus);

		function attachStatus(script) {
			statusToCollect++;
			getStatus(script.pathToFolder, function(err, status) {
				statusCollected++;

				if(err) {
					callback(err);
					callback = null;
					return;
				}

				script.status = status;

				//log("statusToCollect=" + statusToCollect + " statusCollected=" + statusCollected);

				if(statusCollected == statusToCollect) {
					callback(null, {scripts: json});
				}

			});
		}
	});
}

function getStatus(pathToFolder, callback) {

	log("getStatus: pathToFolder=" + pathToFolder + " ...");

	var pidList = [];
	var strStatus = "";

	module_ps.lookup({
		psargs: "lxa" // add a to show all
	}, function(err, resultList ) {
		if (err) return callback(err);

		var found = false;

		resultList.forEach(function( process ) {

			//log(JSON.stringify(process));

			if( process && process.arguments ) {
				//log("process.arguments=" + process.arguments + " typeof " + typeof process.arguments);

				process.arguments.forEach(function(arg) {
					if(arg.indexOf(pathToFolder) != -1) {
						log("Found " + pathToFolder + " with pid=" + process.pid);
						found = true;
						pidList.push(process.pid);
					}
				});
			}
		});

		var statusFile = UTIL.joinPaths(pathToFolder, ".webide_init_status");
		log("getStatus: check default action ...");
		fs.readFile(statusFile, "utf8", function(err, defaultStatus){
			if(err) defaultStatus = "unknown";

			if(found) {
				if(pidList.length > 1) {
					strStatus = "" + pidList.length + " processes "
				}
				else {
					strStatus = "" + pidList.length + " process "
				}
				strStatus = strStatus + "(" + pidList.join(",") + ") ";

				if(STOP.indexOf(pathToFolder) != -1) {
					strStatus = strStatus + "about to be stopped "
				}

				if(START_DATE.hasOwnProperty(pathToFolder)) {
					var diff = (new Date()) - START_DATE[pathToFolder];

					if(diff < 60000) {
						strStatus = strStatus + "started " + Math.round(diff/1000) + " second(s) ago "
					}
					else if(diff < 3600000) {
						strStatus = strStatus + "started " + Math.round(diff/60000) + " minute(s) ago "
					}
					else if(diff < 864000000) {
						strStatus = strStatus + "started " + Math.round(diff/3600000) + " hour(s) ago "
					}
					else {
						strStatus = strStatus + "started " + Math.round(diff/864000000) + " day(s) ago "
					}
				}

			}
			else {
				strStatus = strStatus + "not started "
			}

			strStatus = strStatus.trim() + ", default=" + defaultStatus + " ";

			strStatus = strStatus.trim();

			//log("getStatus: calling back!");

			callback(null, strStatus);

		});

	});

}

function restart(pathToFolder, waitForGracefulShutdown, callback) {
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved restart command for " + pathToFolder);
	
	stop(pathToFolder, false, waitForGracefulShutdown, function(err) {
		if(err && err.code != "IN_PROGRESS") return callback(err);
		start(pathToFolder, function(err) {
			callback(err);
		});
	});
}

function makeSureItsDead(pathToFolder, callback) {
	log("Making sure it's dead: " + pathToFolder);

	module_ps.lookup({
		psargs: "lxa" // add a to show all
	}, function(err, resultList ) {
		if (err) return callback(err);

		var found = false;

		resultList.forEach(function( process ) {

			//log(JSON.stringify(process));

			if( process && process.arguments ) {
				//log("process.arguments=" + process.arguments + " typeof " + typeof process.arguments);

				process.arguments.forEach(function(arg) {
					if(arg.indexOf(pathToFolder) != -1) {
						log(pathToFolder + " is still running with pid=" + process.pid);
						found = true;
						module_ps.kill( process.pid, function( err ) {
							if (err) {
								log("Failed to kill pid=" + pid);
							}
							else {
								log("Killed pid=" + process.pid);
							}
							callback(err);
						});
					}
				});
			}
		});

		if(!found) {
			log(pathToFolder + " is definitely not running!");
			var error = new Error( pathToFolder + " was already stopped!");
			error.code = "IN_PROGRESS";
			callback(error);
		}
	});
}

function stop(pathToFolder, permanentStop, waitForGracefulShutdown, callback) {
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("stop: " + pathToFolder);
	
	if(permanentStop) setStatus(pathToFolder, "stop");

	if(!CHILD.hasOwnProperty(pathToFolder)) {
		log( "Service is not running: " + pathToFolder + " Running services: " + Object.getOwnPropertyNames(CHILD) );
		makeSureItsDead(pathToFolder, function(err) {
			callback(err);
		});
		return;
	}

	if(STOP.indexOf(pathToFolder) != -1) {
		var error = new Error(pathToFolder + " is already being stopped");
		error.code = "IN_PROGRESS";
		return callback(error);
	}

	STOP.push(pathToFolder);
	
	closeChild(pathToFolder, waitForGracefulShutdown, function(err, code, signal) {
		while(STOP.indexOf(pathToFolder) != -1) STOP.splice(STOP.indexOf(pathToFolder), 1);
		callback(err);
	});

	function closeChild(pathToFolder, timeout, closeChildCallback) {

		log("Closing " + pathToFolder);

		var childProcess = CHILD[pathToFolder];

		//log("Clearing " + PROCESS_TIMERS[pathToFolder].length + " timers from " + pathToFolder);
		PROCESS_TIMERS[pathToFolder].forEach(clearTimeout);
		PROCESS_TIMERS[pathToFolder].length = 0;

		CLOSE_CALLBACK[pathToFolder] = function() {
			log(pathToFolder + " closed gracefully");

			clearTimeout(killTimeout);
			if(GLOBTMERS.indexOf(killTimeout) != -1) GLOBTMERS.splice(GLOBTMERS.indexOf(killTimeout), 1);

			PROCESS_TIMERS[pathToFolder].forEach(clearTimeout);

			delete PROCESS_TIMERS[pathToFolder];
			delete CHILD[pathToFolder];

			closeChildCallback(null);
			closeChildCallback = null;
		};

		// Allow the process to gracefully shut down by sending signals
		if(childProcess.connected) childProcess.disconnect();
		childProcess.kill('SIGTERM');
		childProcess.kill('SIGINT');
		childProcess.kill('SIGQUIT');
		childProcess.kill('SIGHUP');

		// If the process has not exited gracefully we need to force kill it ...
		var killTimeout = setTimeout(finalKillTimeout, timeout);
		GLOBTMERS.push(killTimeout);

		function finalKillTimeout() {
			log("finalKillTimeout: pathToFolder=" + pathToFolder);
			delete CLOSE_CALLBACK[pathToFolder];
			if(GLOBTMERS.indexOf(killTimeout) != -1) GLOBTMERS.splice(GLOBTMERS.indexOf(killTimeout), 1);
			kill(pathToFolder, closeChildCallback);
		}
	}
}

function kill(pathToFolder, callback) {
	// Force stop a process

	log("Sending SIGKILL to " + pathToFolder);

	var childProcess = CHILD[pathToFolder];
	childProcess.kill('SIGKILL');

	if(childProcess.connected) childProcess.disconnect();
	
	PROCESS_TIMERS[pathToFolder].forEach(clearTimeout);

	delete PROCESS_TIMERS[pathToFolder];
	delete CHILD[pathToFolder];

	makeSureItsDead(pathToFolder, callback);
}

function setStatus(pathToFolder, status) {
	if(status != "start" && status != "stop") return hardError(new Error("status=" + status + " should be either start or stop!"));
	var statusFile = UTIL.joinPaths(pathToFolder, ".webide_init_status");
	fs.writeFileSync(statusFile, status);
}

function start(pathToFolder, callback) {
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved start command for project folder: " + pathToFolder);
	
	setStatus(pathToFolder, "start");

	// Look up start parameters ...
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	var findFile = UTIL.getFolderName(pathToFolder);
	var packageJson = pathToFolder + "package.json";
	fs.readFile(packageJson, "utf8", function(err, data) {
		if(err) {
			if(err.code == "ENOENT") {
				log("File not found: " + packageJson, DEBUG);
				// See if there is a file with the same name as the folder, then use that file
				log("Looking for " + findFile + ".js in " + pathToFolder + " ...", DEBUG);
				fs.readdir(pathToFolder, function (err, folderItems) {
					if(err) {
						return callback(err);
					}
					else {
						folderItems.forEach(function(folderItem) {
							
							var path = require("path");
							var scriptFilePath = path.join(pathToFolder, folderItem);
							
							if(folderItem == findFile + ".js") {
								startService({scriptPath: scriptFilePath, projectName: findFile, pathToFolder: pathToFolder, logFilePath: HOMEDIR+"log/" + folderItem + ".log", email: EMAIL}, function(err) {
									callback(err);
								});
							}
						});
					}
				});
				
			}
			else return callback(err);
		}
		else {
			log("Found " + packageJson);
			try {
				var json = JSON.parse(data);
			}
			catch(err) {
				return callback(new Error("Unable to parse " + packageJson + " : " + err.message));
			}
			
			if(json.main) {
				var name = json.name || findFile;
				var path = require("path");
				var mainFile = path.join(pathToFolder, json.main);
				var nodeVersion = json.engines && json.engines.node;
				startService({scriptPath: mainFile, projectName: name, pathToFolder: pathToFolder, logFilePath: HOMEDIR+"log/" + name + ".log", email: json.email || EMAIL, nodeVersion: nodeVersion}, function(err) {
					callback(err);
				});
				
			}
			else {
				var error = new Error(packageJson + " has no main file entry!");
				callback(error);
			}
		}
	});
}

function findScripts(pathToFolder, callback) {
	/*
		Search each folder for a package.json file, 
		read the package.json,
		main entry is the script name
	*/
	
	var fs = require("fs");
	var path = require("path");
	
	var scripts = []; // Scripts found
	
	var foldersToLookIn = 0;
	var filesToStat = 0;
	var readingFiles = 0;
	
	log("Looking for scripts in " + pathToFolder, 7);
	
	fs.readdir(pathToFolder, function readdir(err, folderItems) {
		if(err) {
			if(err.code == "ENOENT") {
				callback(null, scripts);
				callback = null;
				return;
			}
			else return callback(err);
		}
		if(folderItems.length == 0) {
			log("No files found in pathToFolder=" + pathToFolder, ERR); 
			callback(null, scripts);
			callback = null;
			return;
		}
		else {
			folderItems.forEach(function(folderItem) {
				
				var filePath = path.join(pathToFolder, folderItem)
				
				if(folderItem.indexOf("�") != -1) log("Encoding problem in filePath=" + filePath, 4);
				
				stat(folderItem, filePath);
				
			});
		}
		
		checkDoneMaybe();
		
	});
	
	function stat(folderItem, filePath) {
		//log("Making stat filePath=" + filePath + "", 7);
		
		filesToStat++;
		
		fs.stat(filePath, function stat(err, stats) {
			
			if(err) return callback(err);
			else if(stats.isDirectory()) {
				lookForScript(folderItem, filePath);
			}
			
			filesToStat--;
			checkDoneMaybe();
		});
		
	}
	
	function lookForScript(findFile, pathToFolder) {
		
		var packageJson = path.join(pathToFolder, "package.json");
		
		readingFiles++;
		log("Opening " + packageJson, DEBUG);
		fs.readFile(packageJson, "utf8", function(err, data) {
			readingFiles--;
			if(err) {
				if(err.code == "ENOENT") {
					log("File not found: " + packageJson, DEBUG);
					// See if there is a file with the same name as the folder, then use that file
					foldersToLookIn++;
					log("Looking for " + findFile + ".js in " + pathToFolder + "", DEBUG);
					fs.readdir(pathToFolder, function (err, folderItems) {
						if(err) return callback(err);
						else {
							folderItems.forEach(function(folderItem) {
								
								var scriptFilePath = path.join(pathToFolder, folderItem);
								
								if(folderItem == findFile + ".js") scripts.push({main: scriptFilePath, name: findFile, pathToFolder: UTIL.trailingSlash(pathToFolder), log: HOMEDIR + "log/" + folderItem + ".log"});
								
							});
						}
						
						foldersToLookIn--;
						checkDoneMaybe();
					});
					
				}
				else return callback(err);
			}
			else {
				
				try {
					var json = JSON.parse(data);
				}
				catch(err) {
					return callback(new Error("Unable to parse " + packageJson + " : " + err.message));
				}
				
				if(json.main) {
					var name = json.name || findFile;
					var mainFile = path.join(pathToFolder, json.main);
					var nodeVersion = json.engines && json.engines.node;
					scripts.push({main: mainFile, name: name, pathToFolder: UTIL.trailingSlash(pathToFolder), log: HOMEDIR + "log/" + name + ".log", email: json.email, nodeVersion: nodeVersion});
				}
				else return log(packageJson + " has no main file entry!");
				
				checkDoneMaybe();
			}
			
			
		});
		
		
	}
	
	function checkDoneMaybe() {
		if(foldersToLookIn == 0 && filesToStat == 0 && readingFiles == 0) callback(null, scripts);
	}
	
}

function startService(options, callback) {
	var scriptPath = options.scriptPath;
	var projectName = options.projectName;
	var pathToFolder = options.pathToFolder;
	var logFilePath = options.logFilePath;
	var email = options.email;
	var nodeVersion = options.nodeVersion;

	if(scriptPath == undefined) return callback(new Error("startService: scriptPath=" + scriptPath));
	if(pathToFolder == undefined) return callback(new Error("startService: pathToFolder=" + pathToFolder));
	if(logFilePath == undefined) return callback(new Error("startService: logFilePath=" + logFilePath));
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("startService: scriptPath=" + scriptPath + " CHILD=" + JSON.stringify(Object.keys(CHILD)));

	if(CHILD.hasOwnProperty(pathToFolder)) return log("Already initiated: " + pathToFolder + " (try stopping it)"); 
	if(STOP.indexOf(pathToFolder) != -1) return log("Can not start Script while it's being stopped: " + pathToFolder + "");
	
	log("Starting service: " + pathToFolder + " ... ( main: " + scriptPath + " log: " + logFilePath + " )", 7);
	
	PROCESS_TIMERS[pathToFolder] = [];
	
	var waitRestart = [0, 2000,5000,10000,30000,60000,1800000];
	
	var restarts = 0;
	var respawnTimer;
	var stdHistory = []; // History of stdout and stderr messages
	var historyLimit = 100;
	var isRestarting = true; // Prevent killing a process that is about to respawn
	var resetRestartsTimer;
	
	var resetRestartsTimerCounter = 0;
	
	var cp = require('child_process');
	var arg = [];
	var opt = {
		silent: true,
		env: {
			prod: true, // Tell scripts we are in "production"
			myName: USERNAME,
			tld: TLD,
			PATH: "/usr/bin:/bin:/.npm-packages/bin", // Able to find "executables"
			NPM_CONFIG_PREFIX: "/.npm-packages", // Help npm figure out where global packages are
		}
	};

	var childProcess;
	
	var logStream = fs.createWriteStream(logFilePath, {'flags': 'a'});
	logStream.write(myDate() + ": Starting ...\n");
	
	log("nodeVersion=" + nodeVersion);

	if(nodeVersion != undefined) {
		// Make sure the executable exist
		opt.execPath = "/usr/local/n/versions/node/" + nodeVersion + "/bin/node"
		fs.stat(opt.execPath, function(err, stats) {
			if(err) {
				opt.execPath = undefined;
				var os = require("os");
				var hostname = os.hostname();
				sendMail(ADMIN_EMAIL, hostname + " Node executable don't exist: " + err.message, "startService options: " + JSON.stringify(options, null, 2) + "\n\nWorker arguments:\n" + process.argv.join("\n"), function(mailError) {
					if(mailError) log("Error sending email: " + mailError.message);
				});
			}
			respawn(); // Starts the child process
			
		});
	}
	else {
		respawn(); // Starts the child process
	}

	function respawn() {
		
		if(SHUTDOWN) return;
		
		if(STOP.indexOf(pathToFolder) != -1) {
			var error = new Error("Not respawning " + pathToFolder + " because it's being stopped!");
			log(error.message);
			if(callback) {
				callback(error);
				callback = null;
			}
			return;
		}

		START_DATE[pathToFolder] = new Date();

		if(childProcess) {
			// Make sure the old one is really really dead
			childProcess.kill('SIGKILL');
			if(childProcess.connected) childProcess.disconnect();
		}
		
		log("Running main script: " + scriptPath, 7);
		
		stdHistory.length = 0; // Reset the history
		
		logStream = fs.createWriteStream(logFilePath, {'flags': 'a'});
		logStream.write(myDate() + ": Starting " + scriptPath + " using argv=[" + arg.join(",") + "]\n");
		
		log("Forking " + scriptPath + " with arg=" + JSON.stringify(arg, null, 2) + "\noptions=" + JSON.stringify(opt, null, 2) + "");

		CHILD[pathToFolder] = cp.fork(scriptPath, arg, opt);
		
		childProcess = CHILD[pathToFolder];
		
		// Attach event listeners
		childProcess.stdout.on('data', stdout);
		childProcess.stderr.on('data', stderr);
		childProcess.on('close', closeStdioStreams);
		childProcess.on('exit', childProcessExit);
		
		isRestarting= false;

		if(callback) {
			callback(null);
			callback = null;
		}
	}
	
	function stdout(data) {
		
		logStream.write(data);
		
		var txtArr = data.toString("utf8").trim().split("\n");
		
		for(var i=0; i<txtArr.length; i++) {
			//log(projectName + ": " + txtArr[i], 7);
			historyAdd(txtArr[i]);
			//logStream.write(myDate() + ": " + txtArr[i] + "\n");
		}
		
	}
	
	function stderr(data) {
		var txtArr = data.toString("utf8").trim().split("\n");
		
		for(var i=0; i<txtArr.length; i++) {
			log(projectName + ": " + txtArr[i], 3);
			historyAdd(txtArr[i]);
			logStream.write(myDate() + ": " + txtArr[i] + "\n");
		}
		
		// Send the error message via email
		var firstLineInErrMsg = txtArr[0];
		if(email) sendMail(email, projectName + ": " + txtArr[4], txtArr.join("\n"), function(mailError) {
			if(mailError) log("Error sending email: " + mailError.message);
		});
		
		// Log the error
		log(projectName + ": " + txtArr[0] + " " + txtArr[4], 3);
		
	}
	
	
	function closeStdioStreams(code, signal) {
		
		log(projectName + " closed stdio streams! code=" + code + " signal=" + signal);
		
	}
	
	function childProcessExit(code, signal) {
		log(pathToFolder + " exit! code=" + code + " signal=" + signal + "");
		
		logStream.end(myDate() + ": Exit: code=" + code + " signal=" + signal + "\n");
		
		if(CLOSE_CALLBACK.hasOwnProperty(pathToFolder)) {
			CLOSE_CALLBACK[pathToFolder](null, code, signal);
			// Let whoever ordered the close/kill decide whether to restart or not
			return;
		}

		if(STOP.indexOf(pathToFolder) != -1) {
			log("No restarting " + pathToFolder + " because it's in STOP=" + JSON.stringify(STOP));
			return;
		}

		if(SHUTDOWN) {
			log("Not restarting " + pathToFolder + " becaused worker init service is shutting down!");
			return;
		}

		isRestarting = true;

		if(restarts < waitRestart.length-1) var waitForRespawn = waitRestart[restarts];
		else var waitForRespawn = waitRestart[waitRestart.length-1];
		
		// Only send mail on errors (not restarts)
		
		log("Waiting " + waitForRespawn + "ms to restart: " + scriptPath, 7);
		
		clearTimeout(resetRestartsTimer);
		resetRestartsTimerCounter--;
		//log("Cleared a resetRestartsTimer! resetRestartsTimerCounter=" + resetRestartsTimerCounter);
		if(PROCESS_TIMERS[pathToFolder].indexOf(resetRestartsTimer) != -1) PROCESS_TIMERS[pathToFolder].splice(PROCESS_TIMERS[pathToFolder].indexOf(resetRestartsTimer), 1);
		
		// note PROCESS_TIMERS are cleared and reset when stopping the service!

		clearTimeout(respawnTimer);
		//log("Cleared a respawnTimer!");
		if(PROCESS_TIMERS[pathToFolder].indexOf(respawnTimer) != -1) PROCESS_TIMERS[pathToFolder].splice(PROCESS_TIMERS[pathToFolder].indexOf(respawnTimer), 1);
		
		respawnTimer = setTimeout(function() {
			//log("Executed a respawnTimer!");
			if(PROCESS_TIMERS[pathToFolder].indexOf(respawnTimer) != -1) PROCESS_TIMERS[pathToFolder].splice(PROCESS_TIMERS[pathToFolder].indexOf(respawnTimer), 1);
			
			restarts++;
			
			respawn();
			
			resetRestartsTimer = setTimeout(function() {
				resetRestartsTimerCounter--;
				//log("Resetting respawntime for " + pathToFolder);
				if(PROCESS_TIMERS[pathToFolder].indexOf(resetRestartsTimer) != -1) PROCESS_TIMERS[pathToFolder].splice(PROCESS_TIMERS[pathToFolder].indexOf(resetRestartsTimer), 1);
				
				// note PROCESS_TIMERS are cleared and reset when stopping the service!

				// Reset the restarts counter if the service has been running for more then 60 seconds ...
				restarts = 0;
				
			}, 60000);
			resetRestartsTimerCounter++;
			//log("Started a resetRestartsTimer! resetRestartsTimerCounter=" + resetRestartsTimerCounter);
			PROCESS_TIMERS[pathToFolder].push(resetRestartsTimer);
			
			
		}, waitForRespawn);
		//log("Started a respawnTimer!");
		PROCESS_TIMERS[pathToFolder].push(respawnTimer);
	}
	
	function historyAdd(msg) {
		
		stdHistory.push(myDate() + ": " + msg);
		
		if(stdHistory.length > historyLimit) stdHistory.shift();
		
	}
}

function getFileNameFromPath(path) {
	var file = "";
	if(path.indexOf("/") > -1) {
		file = path.substr(path.lastIndexOf('/')+1);
	}
	else {
		// Assume \ is the folder separator
		file = path.substr(path.lastIndexOf('\\')+1);
	}
	
	var dot = file.indexOf(".");
	
	if(dot > 0) file = file.substr(0, dot);
	
	return file;
}

function sendMailInQueue(forceSendAll, callback) {

	// Each reciever has their own list
	var sendList = Object.keys(mailQueue);

	var howMany = sendList.map(function(to) {
		return to + ": " + mailQueue[to].length;
	});

	log("Sending mail in mail queue " + JSON.stringify(howMany) + "...", DEBUG);

	if(typeof forceSendAll == "function") {
		callback = forceSendAll;
		forceSendAll = false;
	}

	var mailToSend = 0;
	var mailSent = 0;

	var lastMailDiff = lastMailDate ? ((new Date()) - lastMailDate) : MAX_MAIL_RATE+1;

	if(!forceSendAll && lastMailDiff < MAX_MAIL_RATE) {
		return hardError("sendMailInQueue() called even though lastMailDiff=" + lastMailDiff + " < MAX_MAIL_RATE=" + MAX_MAIL_RATE);
	}

	if(!forceSendAll) {
		var to = sendList[0];
		concatAndSendEmails(mailQueue[to], to);
		delete mailQueue[to];

		if(Object.keys(mailQueue).length > 0) {
			sendMailInQueueTimer = setTimeout(sendMailInQueue, 5500);
			GLOBTMERS.push(sendMailInQueueTimer);
		}
	}
	else {
		clearTimeout(sendMailInQueueTimer);
		sendList.forEach(function(to) {
			concatAndSendEmails(mailQueue[to], to);
			delete mailQueue[to];
		});
	}

	function concatAndSendEmails(mails, to) {

		log("concatAndSendEmails: to=" + to + " mails=" + JSON.stringify(mails, null, 2));

		var mailBody = [];
		var mailSubject = mails[0].subject + " et.al";
		var mailFrom = mails[0].from;

		mails.forEach(function(mail) {
			mailBody.push(mail.subject + "\n" + mail.text)
		});

		var mailText = "The following " + mails.length + " mail where queued up:\n\n" + mailBody.join("\n\n");

		if(forceSendAll) lastMailDate = null;
		mailToSend++;
		sendMail(to, mailSubject, mailText, mailFrom, function(mailError) {
			if(mailError) log("Error sending email: " + mailError.message);
			mailSent++;

			if(mailToSend == mailSent) {
				callback(null);
				callback = null;
			}
		});
	}
}

function sendMail(to, subject, text, from, callback) {
	if(typeof from == "function") {
		callback = from;
		from = undefined;
	}

	if(from == undefined) from = "nodejs_init@" + DOMAIN;

	if(typeof text != "string") return callback(new Error("Parameter text (" + (typeof text) + ") is not a string: " + text));

	//log("sendMail:1");

	clearTimeout(sendMailInQueueTimer);

	var lastMailDiff = lastMailDate ? ((new Date()) - lastMailDate) : MAX_MAIL_RATE+1;

	if(lastMailDiff < MAX_MAIL_RATE) {
		if(!mailQueue.hasOwnProperty[to]) mailQueue[to] = [];
		
		if(mailQueue[to].length > 10) {
			// note: We don't want to call any function here as it could put us into yet another loop!
			return callback(new Error("Mail loop detected! mailQueue[" + to + "].length=" + mailQueue[to].length));
		}
		
		mailQueue[to].push({subject:subject, text:text, from:from});
		log("Added mail to=" + to + " queue. lastMailDiff=" + lastMailDiff);
		sendMailInQueueTimer = setTimeout(sendMailInQueue, 60000);
		GLOBTMERS.push(sendMailInQueueTimer);
		
		return callback(null);
	}
	lastMailDate = new Date();

	
	//text = String(text); // WHY ???
	
	log("Sending mail from=" + from + " to=" + to + " subject=" + subject + " text=\n********************************************\n* " + text.replace(/\n/g, "\n* ") + "\n********************************************\n", 7);
	
	var mailSettings = {
		port: SMTP_PORT,
		host: SMTP_HOST
	};
	
	if(SMTP_USER) mailSettings.auth = {user: SMTP_USER, pass: SMTP_PW};
	
	var transporter = NODE_MAILER.createTransport(SMTP_TRANSPORT(mailSettings));
	
	transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: text
		
	}, function(err, info){
		
		if(err){
			log("Failed to send send e-mail! " + err.message, 2);
		}
		else{
			log("Mail sent: " + info.response);
		}
		
		if(callback) callback(err, info);
	});
}

function hardError(err) {
	// Only use this function for hard errors! Eg. errors where we want send a report and stop the program

	// Get the proper position for this error
	var callsites = callsite();
	var callstack = "";
	var firstSite = callsites[1];
	var position = (firstSite.getFunctionName() || '(anonymous function)') + "@" + firstSite.getFileName() + ":" + firstSite.getLineNumber();
	for(var i=1; i<callsites.length; i++) callstack += (callsites[i].getFunctionName() || 'anonymous') + "@" + callsites[i].getFileName() + ":" + callsites[i].getLineNumber() + "\n";
	
	//console.log(callstack);
	
	log(position + "\n\n" + err.stack + "\n\n" + err.message, 3);
	
	var os = require("os");
	var hostname = os.hostname();

	if(SHUTDOWN) return; // Prevent mail loop

	var errorCode = ERR_GENERAL_HARD_ERROR;
	if(UTIL.isNumeric(err.code)) errorCode = err.code;

	sendMail(ADMIN_EMAIL, hostname + " Node.js Init error: " + err.message, "Message: " + err.message + "\n\nStack:\n" + callstack + "\n\nerr.stack:\n" + err.stack + "\n\n Arguments:\n" + process.argv.join("\n"), function(mailError) {
		if(mailError) log("Error sending email: " + mailError.message);

		shutdownInitWorker(errorCode);
	});
	
}

function log(msg, level) {
	
	//if(SHUTDOWN) return; // Prevent EPIPE on process.send and  write after end on initLogStream

	if(initLogStream && !initLogStream.ended) initLogStream.write(myDate() + ": " + msg + "\n");
	
	if(process.send && process.connected) {
		// Forked from another nodejs process
		send({message: {msg: msg, level: level}});
	}
	else {
		if(level == undefined) level = 6;
		
		if(process.stdout.isTTY) {
			// Probably started from command line
			console.log(myDate() + ": " + msg);
		}
		else {
			// Probably started by systemd
			console.log("<" + level + ">" + msg);
		}
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

function runTests() {
	sendMail(EMAIL, "test", "test text", function(mailError) {
		if(mailError) log("Error sending email: " + mailError.message);
	});
}

function callsite() {
	var orig = Error.prepareStackTrace;
	Error.prepareStackTrace = function(_, stack){ return stack; };
	var err = new Error;
	Error.captureStackTrace(err, callsite);
	var stack = err.stack;
	Error.prepareStackTrace = orig;
	return stack;
}

function idle() {
	log("idling");
	// Don't shutdown right away in case we have more request coming...
	shutdownWhenNothingTodoTimer = setTimeout(shutdownInitWorker, 600000);
	GLOBTMERS.push(shutdownWhenNothingTodoTimer);
	//shutdownInitWorker(0);
}

function shutdownInitWorker(exitCode, callback) {

	log("shutdownInitWorker: exitCode=" + exitCode);

	var childrenToClose = 0;
	var childrenClosed = 0;
	var mailToSend = 0;
	var mailSent = 0;
	var processesToKill = 0;
	var processesKilled = 0;

	GLOBTMERS.forEach(clearTimeout);

	if(SHUTDOWN === true) {
		// Second time receiving the SIGINT, go directly for the kill (don't wait for graceful shutdown)

		log("shutdownInitWorker() called yet again! Killing all child processes!");

		for(var pathToFolder in CHILD) {
			processesToKill++;
			kill(pathToFolder, doneKill);
		}

		return doneMaybe();
	}

	SHUTDOWN = true;

	var waitForGracefulShutdown = 5000;
	var closed = [];
	for(var pathToFolder in CHILD) {
		childrenToClose++;
		stop(pathToFolder, false, waitForGracefulShutdown, whenChildClosed);
		closed.push(pathToFolder);
	}

	if(closed.length > 0 && EMAIL) {
		// Tell what process was killed
		mailToSend++;
		sendMail(EMAIL, "Killing processes due to shutdown", "The nodejs init script reaceaved a SIGINT ...\nThis is most likely due to a server reboot or upgrade.\nThe following nodejs services where stopped:\n * " + closed.join("\n * "), undefined, function(mailError) {
			if(mailError) log("Error sending email: " + mailError.message);
			mailSent++;
			doneMaybe();
		});
	}
	else {
		doneMaybe();
	}

	function whenChildClosed(err, code, signal) {
		childrenClosed++;
		doneMaybe();
	}

	function doneKill() {
		processsesKilled++;
	}

	function doneMaybe() {
		log("shutdownInitWorker:doneMaybe: childrenClosed=" + childrenClosed + " childrenToClose=" + childrenToClose + " mailToSend=" + mailToSend + " mailSent=" + mailSent + " processesToKill=" + processesToKill + " processesKilled=" + processesKilled + " ");
		if(childrenClosed == childrenToClose && mailToSend == mailSent && processesToKill == processesKilled) {
			if(callback) callback(null);
			exit(exitCode);
		}
	}

}

function exit(exitCode) {

	// Note: The worker process is only restarted if we exit with a non zero exit code!
	// so if we have nothing to do, exit with 0, but if there was an error, exit with that error code

	if(SHUTDOWN !== true) hardError(new Error("Called exit without calling shutdownInitWorker() first"));

	if(exitCode != undefined) process.exitCode = exitCode;

	log("Shutting down init worker!");

	if(Object.keys(mailQueue).length > 0) {
		sendMailInQueue(true, endLog);
	}
	else endLog();

	function endLog() {
		initLogStream.ended = true;
		initLogStream.end(function() {

			// note: initLogStream.closed is still false !..

			if(typeof process.disconnect == "function") process.disconnect(); // Only available when we get spawned from another proces!?

			exitNow();

		});
	}

	function exitNow() {
		log("Exit with exitCode=" + process.exitCode);
		//process.exit(); // We havet to call this because we might be stuck in an error loop
	}
}
