/*
	
	A node script that manage other node scripts ...
	
	Each webide user has it's own nodejs deamon manager worker (this script)
	
	* Set uid and gid to the user's id.
	* Open log file in user's home dir ~/log/deamon_manager.log
	
	* traverse the USER_PROD_FOLDER (~/.webide/prod/) and look for a package.json file.
	* look for main script and start it
	* restart the script if it exits, and notify the user via e-mail or sms
	
	* open a scriptname.stdout.log and scriptname.stderr.log file for each micro-service
	
	note: We might have to move the nodejs_init to another server, so we should not depend on the users home dir too much! 
	(and vice versa, client should not depend on the .prod files being stored in .webide/prod/ !!)

	Arguments: --home=/home/ltest1 --uid=120 --gid=127 --email=zeta@zetafiles.org
	sudo node nodejs_init_worker.js -home /home/ltest1 -uid 1000 -gid 1000 -user ltest1 


	Don't call log until initLogStream has been initialized! (or messages wont be logged)
*/

"use strict"

process.on('uncaughtException', initError);

var getArg = require("./shared/getArg.js");

var DEFAULT = require("./server/default_settings.js");

var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email; // Errors with This script is sent here

var UTIL = require("./client/UTIL.js");
var HOMEDIR = getArg(["home", "home", "homeDir"]) || process.env.homeDir;
var EMAIL = getArg(["email", "email"]) || process.env.email; // E-mail address of the user
var UID = getArg(["uid", "uid"]) || process.env.uid;
var GID = getArg(["gid", "gid"]) || process.env.gid;
var USERNAME = getArg(["user", "user", "username"]) || process.env.user;
var INIT_MESSAGE = getArg(["action", "action", "msg", "message"]) || process.env.messageToInitWorker; // JSON: {action: action, id:id}


// For sending errors via email to an admin
var SMTP_PORT = getArg(["mp", "smtp_port"]) || DEFAULT.smtp_port;
var SMTP_HOST = getArg(["mh", "smtp_host"]) || DEFAULT.smtp_host;
var SMTP_USER = getArg(["mu", "smtp_user"]) || "";
var SMTP_PW = getArg(["mpw", "smtp_pass"]) || "";

var CHILD = {}; // Holds references to the child processes
var STOP = []; // List of processes being stopped, so they wont restart

var SHUTDOWN = false;

var TIMERS = {};
var GLOBTMERS = [];
var UTC = false; // If set to true, use GMT+0 on time stamps

// Require non-native modules before entering chroot!
var NODE_MAILER = require('nodemailer');
var SMTP_TRANSPORT = require('nodemailer-smtp-transport');

var TLD = DEFAULT.domain;

if(!HOMEDIR) return initError(new Error("No HOMEDIR specified. Use argument: --homeDir=/home/username/"));
if(!UID) return initError(new Error("No UID specified. Use argument: --uid=123"));
if(!GID) return initError(new Error("No UID specified. Use argument: --gid=123"));
if(!USERNAME) return initError(new Error("No USERNAME specified. Use argument: --user=123"));



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

var module_ps = require("ps-node");

// What happens if we open a file stream before chroot ?
// answer: the file stream will be kept open =)
// We need to wait after setuid though, unless we want to allow dac_read_search (allows root to override read-file permission)




// Must be numbers!
GID = parseInt(GID);
UID = parseInt(UID);

var posix = require("posix");
try {
	process.setgid(GID);
}
catch(err) {
	if(err.code == "EPERM") return initError(new Error("Not running as root! (try using sudo)"));
	else throw err;
}



// We must init groups or the user will be member of the root group!!
posix.initgroups(USERNAME, GID);

process.setuid(UID);


if(process.getuid && process.getuid() === 0) throw new Error("Failed to change user! Worker process is still root! process.getuid()=" + process.getuid());


var initLogFilePath = UTIL.joinPaths(HOMEDIR, "log/nodejs_init_worker.log");
var fs = require("fs");
var initLogStream = fs.createWriteStream(initLogFilePath, {'flags': 'a'});

log("Starting nodejs init worker...");
log("GID=" + GID + " UID=" + UID);

if(INIT_MESSAGE) {
	INIT_MESSAGE = JSON.parse(INIT_MESSAGE);
	log("INIT_MESSAGE: \n" + JSON.stringify(INIT_MESSAGE, null, 2));
}

if(getArg(["runtests"]) !== undefined) {
	runTests();
}
else {
	
	findScripts(USER_PROD_FOLDER, function(scripts) {
		
		//log("scripts.length=" + scripts.length);

		if(scripts.length == 0) {
			log("No scripts found in " + USER_PROD_FOLDER);
			shutdown(0);
			return;
		}

		if(INIT_MESSAGE && INIT_MESSAGE.hasOwnProperty(USER_PROD_FOLDER)) {
			var action = INIT_MESSAGE[USER_PROD_FOLDER].action;
			var reqId = INIT_MESSAGE[USER_PROD_FOLDER].id;
			if(action == "list") {
				list(reqId, scripts);
				delete INIT_MESSAGE[USER_PROD_FOLDER]; // Remove after use to prevent re-run
			}
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
				log("INIT_MESSAGE=" + INIT_MESSAGE);
			}

			fs.readFile(statusFile, "utf8", function(err, status){
				
				if(err) {
					if(err.code != "ENOENT") throw err;
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
						if(reqId) process.send({id: reqId, error: "Unexpected init action=" + action});
					}
				}

				status = status.trim();

				if(status=="stop") {
					log("Not starting " + script.pathToFolder + " because last status was stop!");
					
					scripts.splice(scripts.indexOf(script), 1);
					if(scripts.length == 0) {
						log("Nothing else to do");
						shutdown(0);
					}
					return;
				}

				startService(script.main, script.name, script.pathToFolder, script.log, script.email);

				if(reqId && (action=="start" || action=="restart")) {
					process.send({id: reqId, restarting: script.pathToFolder});
				}

				if(INIT_MESSAGE) delete INIT_MESSAGE[script.pathToFolder]; // Remove after use
				
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

function commandMessage(message) {
	
	log("Recieved: " + JSON.stringify(message));
	
	if(message == undefined) throw new Error("User worker message=" + message);

	if(message.ping) {
		process.send({pong: message.ping});
		return;
	}

	var item = "", id = 0;
	for(var pathToFolder in message) {
		item = message[pathToFolder];

		log("Recieved item: " + JSON.stringify(item));

		if(item.id == undefined) throw new Error("Worker command " + JSON.stringify(message) + " does not have an id!");

		if(item.action=="restart") restart(pathToFolder, item.id);
		else if(item.action=="stop") stop(pathToFolder, item.id);
		else if(item.action=="start") start(pathToFolder, item.id);
		else if(item.action=="shutdown") shutdownInitWorker(item.id);
		else if(item.action=="list") findScriptList(item.id);

		else throw new Error("Unknown message=" + JSON.stringify(message));
	}

}

function findScriptList(reqId) {
	findScripts(USER_PROD_FOLDER, function(scripts) {
		list(reqId, scripts);
	});
}

function list(reqId, scripts) {
	var json = scripts.map(function(script) {
		/*
			{main: scriptFilePath, name: findFile, pathToFolder: UTIL.trailingSlash(pathToFolder), log: HOMEDIR + "log/" + folderItem + ".log"}
		*/

		return {
			main: script.main,
			name: script.name,
			pathToFolder: script.pathToFolder,
			log: script.log,
			running: CHILD.hasOwnProperty(script.pathToFolder)
		}
	});

	process.send({id: reqId, scripts: json});
}

function restart(pathToFolder, reqId) {
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved restart command for " + pathToFolder);
	
	//log("restart: pathToFolder=" + pathToFolder + " CHILD=" + JSON.stringify(Object.keys(CHILD)));

	if(!CHILD.hasOwnProperty(pathToFolder)) {
		//log("pathToFolder=" + pathToFolder + " not in CHILD=" + JSON.stringify(Object.keys(CHILD)) + " so calling start() ...");
		return start(pathToFolder, reqId);
	}

	if(CHILD[pathToFolder].connected) {
		//log("Sending stop signals and disconnecting from: " + pathToFolder);
		closeChild(CHILD[pathToFolder]);
		// it will be automatically restarted!
	}
	else {
		/*
			There is a respawn timer waiting ...
			But we want to restart it right away!
			We can't call the respawn function because it can only be called inside startService()
			Stopping is slow because we are making sure it's really dead by sending additional kill commands

		*/
		
		//log("pathToFolder=" + pathToFolder + " not connected, so closing and then starting ...");
		closeChild(CHILD[pathToFolder]); // Send kill signal and disconnect just in case
		
		for(var timer in TIMERS[pathToFolder]) {
			clearTimeout(TIMERS[pathToFolder][timer]);
		}

		delete CHILD[pathToFolder];

		start(pathToFolder, reqId);
	}
	
	process.send({id: reqId, restarting: pathToFolder}); // Tell parent process we are handeling the request

}

function stop(pathToFolder, reqId) {
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved stop command for " + pathToFolder);
	
	setStatus(pathToFolder, "stop");

	if(!CHILD.hasOwnProperty(pathToFolder)) {
		log( "Service is not running: " + pathToFolder + " Running services: " + Object.getOwnPropertyNames(CHILD) );
		process.send({id: reqId, stopping: pathToFolder});
		/*
			Look for ghost scripts !? module_ps
		*/
		return;
	}

	STOP.push(pathToFolder);
	
	//log("Clearing " + TIMERS[pathToFolder].length + " timers from " + pathToFolder);
	TIMERS[pathToFolder].forEach(clearTimeout);
	TIMERS[pathToFolder].length = 0;
	
	closeChild(CHILD[pathToFolder]);
	
	var killTimeout = setTimeout(function makeSureItsDead() {
		
		log("Sending SIGKILL to " + pathToFolder);
		
		CHILD[pathToFolder].kill('SIGKILL');
		
		GLOBTMERS.splice(GLOBTMERS.indexOf(killTimeout), 1);
		
		if(TIMERS[pathToFolder].length > 0) initError( new Error(pathToFolder + " has " + TIMERS[pathToFolder].length + " timers!") );
		
		delete TIMERS[pathToFolder];
		delete CHILD[pathToFolder];
		
		while(STOP.indexOf(pathToFolder) != -1) STOP.splice(STOP.indexOf(pathToFolder), 1);
		
	}, 5000);
	GLOBTMERS.push(killTimeout);

	process.send({id: reqId, stopping: pathToFolder});
	
}

function setStatus(pathToFolder, status) {
	if(status != "start" && status != "stop") throw new Error("status=" + status + " should be either start or stop!");
	var statusFile = UTIL.joinPaths(pathToFolder, ".webide_init_status");
	fs.writeFileSync(statusFile, status);
}

function start(pathToFolder, reqId) {
	if(reqId == undefined) throw new Error("Did not expect reqId=" + reqId + " to be undefined!");

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
					if(err) initError(err, reqId);
					else {
						folderItems.forEach(function(folderItem) {
							
							var path = require("path");
							var scriptFilePath = path.join(pathToFolder, folderItem);
							
							if(folderItem == findFile + ".js") {
								startService(scriptFilePath, findFile, pathToFolder, HOMEDIR+"log/" + folderItem + ".log");
								process.send({id: reqId, starting: pathToFolder});
							}
						});
					}
				});
				
			}
			else initError(err, reqId);
		}
		else {
			
			try {
				var json = JSON.parse(data);
			}
			catch(err) {
				return initError(new Error("Unable to parse " + packageJson + " : " + err.message), reqId);
			}
			
			if(json.main) {
				var name = json.name || findFile;
				var path = require("path");
				var mainFile = path.join(pathToFolder, json.main);
				startService(mainFile, name, pathToFolder, HOMEDIR+"log/" + name + ".log", json.email);
				process.send({id: reqId, starting: pathToFolder});
			}
			else {
				var error = new Error(packageJson + " has no main file entry!");
				process.send({id: reqId, error: error.message});
			}
		}
	});
}

function shutdownInitWorker() {
	
	if(SHUTDOWN) {
		// Second time receiving the SIGINT, kill all children and exit
		
		log("Killing all child processes!");
		
		for(var name in CHILD) CHILD[name].kill('SIGKILL');
		
		shutdown(0);
	}
	
	SHUTDOWN = true;
	
	// Close all child processes ...
	var closed = [];
	
	for(var name in CHILD) {
		TIMERS[name].forEach(clearTimeout);
		closeChild(CHILD[name]);
		log("Closing " + name);
		closed.push(name);
	}
	
	if(closed.length > 0) {
		// Tell what process was killed
		if(EMAIL) sendMail(EMAIL, "Killing processes due to SIGINT", "The nodejs init script reaceaved a SIGINT ...\nThis is most likely due to a server reboot or upgrade.\nThe following nodejs services where stopped:\n * " + closed.join("\n * "), undefined, function() {
			doneShutdown();
		});
	}
	
	GLOBTMERS.forEach(clearTimeout);
	
	function doneShutdown() {
		
	}
	
}


function closeChild(childProcess) {
	// Allow the process to gracefully shut down
	
	if(childProcess.connected) childProcess.disconnect();
	
	childProcess.kill('SIGTERM');
	childProcess.kill('SIGINT');
	childProcess.kill('SIGQUIT');
	childProcess.kill('SIGHUP');
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
			if(err.code == "ENOENT") return callback(scripts);
			else return initError(err);
		}
		if(folderItems.length == 0) {
			log("No files found in pathToFolder=" + pathToFolder, ERR); 
			shutdown(0); // A clean exit, because we have nothing to do 
		}
		else {
			folderItems.forEach(function(folderItem) {
				
				var filePath = path.join(pathToFolder, folderItem)
				
				if(folderItem.indexOf("�") != -1) log("Encoding problem in filePath=" + filePath, 4);
				
				stat(folderItem, filePath);
				
			});
		}
		
		checkDone();
		
	});
	
	function stat(folderItem, filePath) {
		//log("Making stat filePath=" + filePath + "", 7);
		
		filesToStat++;
		
		fs.stat(filePath, function stat(err, stats) {
			
			if(err) initError(err);
			else if(stats.isDirectory()) {
				lookForScript(folderItem, filePath);
			}
			
			filesToStat--;
			checkDone();
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
						if(err) initError(err);
						else {
							folderItems.forEach(function(folderItem) {
								
								var scriptFilePath = path.join(pathToFolder, folderItem);
								
								if(folderItem == findFile + ".js") scripts.push({main: scriptFilePath, name: findFile, pathToFolder: UTIL.trailingSlash(pathToFolder), log: HOMEDIR + "log/" + folderItem + ".log"});
								
							});
						}
						
						foldersToLookIn--;
						checkDone();
					});
					
				}
				else initError(err);
			}
			else {
				
				try {
					var json = JSON.parse(data);
				}
				catch(err) {
					return initError(new Error("Unable to parse " + packageJson + " : " + err.message));
				}
				
				if(json.main) {
					var name = json.name || findFile;
					var mainFile = path.join(pathToFolder, json.main);
					scripts.push({main: mainFile, name: name, pathToFolder: UTIL.trailingSlash(pathToFolder), log: HOMEDIR + "log/" + name + ".log", email: json.email});
				}
				else return log(packageJson + " has no main file entry!");
				
				checkDone();
			}
			
			
		});
		
		
	}
	
	function checkDone() {
		if(foldersToLookIn == 0 && filesToStat == 0 && readingFiles == 0) callback(scripts);
	}
	
}

function startService(scriptPath, projectName, pathToFolder, logFilePath, email) {
	
	if(scriptPath == undefined) throw new Error("scriptPath=" + scriptPath);
	if(pathToFolder == undefined) throw new Error("pathToFolder=" + pathToFolder);
	if(logFilePath == undefined) throw new Error("logFilePath=" + logFilePath);
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("startService: scriptPath=" + scriptPath + " CHILD=" + JSON.stringify(Object.keys(CHILD)));

	if(CHILD.hasOwnProperty(pathToFolder)) return log("Already initiated: " + pathToFolder + " (try stopping it)"); 
	if(STOP.indexOf(pathToFolder) != -1) return log("Can not start Script while it's being stopped: " + pathToFolder + "");
	
	log("Starting service: " + pathToFolder + " ... ( main: " + scriptPath + " log: " + logFilePath + " )", 7);
	
	TIMERS[pathToFolder] = [];
	
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
		},
		execPath: "/usr/bin/node" // note: we are in chroot!
	};
	var childProcess;
	
	respawn(); // Starts the child process
	
	var logStream = fs.createWriteStream(logFilePath, {'flags': 'a'});
	logStream.write(myDate() + ": Starting ...\n");
	
	function respawn() {
		
		if(SHUTDOWN) return;
		
		if(childProcess) {
			// Make sure the old one is really really dead
			childProcess.kill('SIGKILL');
			if(childProcess.connected) childProcess.disconnect();
		}
		
		log("Running main script: " + scriptPath, 7);
		
		stdHistory.length = 0; // Reset the history
		
		logStream = fs.createWriteStream(logFilePath, {'flags': 'a'});
		logStream.write(myDate() + ": Restarting ....\n");
		
		CHILD[pathToFolder] = cp.fork(scriptPath, arg, opt);
		
		childProcess = CHILD[pathToFolder];
		
		// Attach event listeners
		childProcess.stdout.on('data', stdout);
		childProcess.stderr.on('data', stderr);
		childProcess.on('close', closeStdioStreams);
		childProcess.on('exit', childProcessExit);
		
		isRestarting= false;
		
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
		if(email) sendMail(email, projectName + ": " + txtArr[4], data);
		
		// Log the error
		log(projectName + ": " + txtArr[0] + " " + txtArr[4], 3);
		
	}
	
	
	function closeStdioStreams(code, signal) {
		
		log(projectName + " closed stdio streams! code=" + code + " signal=" + signal);
		
	}
	
	function childProcessExit(code, signal) {
		var finalExit = (code !== null);
		
		log(pathToFolder + " exit! code=" + code + " signal=" + signal + " finalExit=" + finalExit);
		
		// NodeJS errors will have a code, but if the process is killed via a signal, we wont get a final exit
		// So always restart!
		
		if(!finalExit) closeChild(childProcess); // Make sure it's really dead, and disconnect from it
		// (but do not send SIGKILL because we want to give it a chance to gracefully shut down)
		
		logStream.end(myDate() + ": Exit: code=" + code + " signal=" + signal + "\n");
		
		isRestarting = true;
		
		if(SHUTDOWN || STOP.indexOf(pathToFolder) != -1) return;
		
		if(restarts < waitRestart.length-1) var waitForRespawn = waitRestart[restarts];
		else var waitForRespawn = waitRestart[waitRestart.length-1];
		
		//if(email) sendMail(email, projectName + ": Exit code=" + code + " signal=" + signal, stdHistory.join("\n"));
		// Only send mail on errors (not restarts)
		
		log("Waiting " + waitForRespawn + "ms to restart: " + scriptPath, 7);
		
		clearTimeout(resetRestartsTimer);
		resetRestartsTimerCounter--;
		//log("Cleared a resetRestartsTimer! resetRestartsTimerCounter=" + resetRestartsTimerCounter);
		TIMERS[pathToFolder].splice(TIMERS[pathToFolder].indexOf(resetRestartsTimer), 1);
		clearTimeout(respawnTimer);
		//log("Cleared a respawnTimer!");
		TIMERS[pathToFolder].splice(TIMERS[pathToFolder].indexOf(respawnTimer), 1);
		
		respawnTimer = setTimeout(function() {
			//log("Executed a respawnTimer!");
			TIMERS[pathToFolder].splice(TIMERS[pathToFolder].indexOf(respawnTimer), 1);
			
			restarts++;
			
			respawn();
			
			resetRestartsTimer = setTimeout(function() {
				resetRestartsTimerCounter--;
				//log("Resetting respawntime for " + pathToFolder);
				TIMERS[pathToFolder].splice(TIMERS[pathToFolder].indexOf(resetRestartsTimer), 1);
				
				// Reset the restarts counter if the service has been running for more then 60 seconds ...
				restarts = 0;
				
			}, 60000);
			resetRestartsTimerCounter++;
			//log("Started a resetRestartsTimer! resetRestartsTimerCounter=" + resetRestartsTimerCounter);
			TIMERS[pathToFolder].push(resetRestartsTimer);
			
			
		}, waitForRespawn);
		//log("Started a respawnTimer!");
		TIMERS[pathToFolder].push(respawnTimer);
		
		
		//log(pathToFolder + " timers=" + TIMERS[pathToFolder].length);
		
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

function sendMail(to, subject, text, from, callback) {
	
	if(from == undefined) from = "mailform@zetafiles.org";
	
	text = String(text);
	
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


function initError(err, reqId) {
	// Only use this function for hard errors!

	// Get the proper position for this error
	var callsites = callsite();
	var callstack = "";
	var firstSite = callsites[1];
	var position = (firstSite.getFunctionName() || '(anonymous function)') + "@" + firstSite.getFileName() + ":" + firstSite.getLineNumber();
	for(var i=1; i<callsites.length; i++) callstack += (callsites[i].getFunctionName() || 'anonymous') + "@" + callsites[i].getFileName() + ":" + callsites[i].getLineNumber() + "\n";
	
	//console.log(callstack);
	
	log(position + "\n\n" + err.stack + "\n\n" + err.message, 3);
	
	if(reqId && process.connected) process.send({id: reqId, error: err.message});

	var os = require("os");
	var hostname = os.hostname();

	sendMail(ADMIN_EMAIL, hostname + " Node.js Init error: " + err.message, "Message: " + err.message + "\n\nStack:\n" + callstack + "\n\nerr.stack:\n" + err.stack + "\n\n Arguments:\n" + process.argv.join("\n"), function(err) {
		shutdown(err.code == 0 ? 1 : err.code)
	});
	
}

function log(msg, level) {
	
	if(SHUTDOWN) return; // Prevent EPIPE on process.send and  write after end on initLogStream

	if(!initLogStream) {
		console.warn("initLogStream=" + initLogStream);
		console.log(msg + "\n");
	}
	else initLogStream.write(myDate() + ": " + msg + "\n");
	
	if(process.send && process.connected) {
		// Forked from another nodejs process
		process.send({message: {msg: msg, level: level}});
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
	sendMail(EMAIL, "test", "test text");
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

function shutdown(exitCode) {

	initLogStream.end(function() {

		SHUTDOWN = true;

		if(typeof process.disconnect == "function") process.disconnect(); // Only available when we get spawned from another proces!?

		setTimeout(function() {
			process.exit(exitCode);
		}, 100);

	});

}
