/*
	
	A node script that manage other node scripts ...
	
	Each jzedit/webide user has it's own nodejs deamon manager worker (this script)
	chroot into the user's home dir and set uid and gid to the user's id.
	
	open log file in user's home dir /log/deamon_manager.log
	
	traverse the USER_PROD_FOLDER and look for a package.json file.
	look for main script and start it
	restart the script if it exits, and notify the user via e-mail or sms
	
	open a scriptname.stdout.log and scriptname.stderr.log file for each micro-service
	
	Arguments: --path=/home/ltest1 --uid=120 --gid=127 --email=zeta@zetafiles.org
	
*/

"use strict"

var getArg = require("./shared/getArg.js");

var DEFAULT = require("./default.js");

var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email; // Errors with This script is sent here

var UTIL = require("./client/UTIL.js");

var PATH = getArg(["path", "path", "homeDir"]) || process.env.homeDir;
var EMAIL = getArg(["email", "email"]) || process.env.email; // E-mail address of the user
var UID = getArg(["uid", "uid"]) || process.env.uid;
var GID = getArg(["gid", "gid"]) || process.env.gid;
var USERNAME = getArg(["user", "user", "username"]) || process.env.user;

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

if(!PATH) return initError(new Error("No path specified. Use argument: --path=/path/to/folder/"));
if(!UID) return initError(new Error("No UID specified. Use argument: --uid=123"));
if(!GID) return initError(new Error("No UID specified. Use argument: --gid=123"));

// tip: type "id -u username" and "id -g username" in a terminal to get some user's user id and group id

// Systemd console message leveles
var DEBUG = 7; // <7>This is a DEBUG level message
var INFO = 6; // <6>This is an INFO level message
var NOTICE = 5; // <5>This is a NOTICE level message
var WARNING = 4; // <4>This is a WARNING level message
var WARN = 4;
var ERR = 3; // <3>This is an ERR level message
var ERROR = 3;

var USER_PROD_FOLDER = "/.prod/";

PATH = UTIL.trailingSlash(PATH); // Make sure it ends with a slash

// What happens if we open a file stream before chroot ?
// answer: the file stream will be kept open =)
// We need to wait after setuid though, unless we want to allow dac_read_search (allows root to override read-file permission)


var posix = require("posix");
try {
	posix.chroot(PATH);
}
catch(err) {
	if(err.code == "EPERM") return initError(new Error("Not running as root! (try using sudo)"));
	else throw err;
}

//log("GID=" + GID + " UID=" + UID);

process.setgid(parseInt(GID));
process.setuid(parseInt(UID));

// We are not in chroot!
var initLogFilePath = "/log/nodejs_init_worker.log";
var fs = require("fs");
var initLogStream = fs.createWriteStream(initLogFilePath, {'flags': 'a'});

log("Starting nodejs init worker ...");

if(getArg(["runtests"]) !== undefined) {
	runTests();
}
else {
	
	findScripts(USER_PROD_FOLDER, function(scripts) {
		
		if(scripts.length == 0) {
			log("No nodejs services found!");
			// Make sure there's nothing to do and gracefully exit
			initLogStream.end();
			process.disconnect();
		}
		
		for (var i=0; i<scripts.length; i++) {
			startService(scripts[i].main, scripts[i].name, scripts[i].pathToFolder, scripts[i].log, scripts[i].email);
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
	
	log("Recieved rcp: " + JSON.stringify(message));
	
	if(message == undefined) throw new Error("User worker message=" + message);
	
	if(message.restart) restart(message.restart);
	else if(message.stop) stop(message.stop);
	else if(message.start) start(message.start);
	else if(message.shutdown) shutdownInitWorker();
	else if(message.ping) process.send({pong: message.ping});
	else throw new Error("Unknown message=" + JSON.stringify(message));
	
}

function restart(pathToFolder) {
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved restart command for " + pathToFolder);
	
	if(!CHILD.hasOwnProperty(pathToFolder)) return start(pathToFolder);
	
	if(CHILD[pathToFolder].connected) {
	log("Sending stop signals and disconnecting from: " + pathToFolder);
	closeChild(CHILD[pathToFolder]);
		// it will be restarted!
	}
	else {
		closeChild(CHILD[pathToFolder]); // Just in case
		start(pathToFolder);
	}
	
}

function stop(pathToFolder) {
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved stop command for " + pathToFolder);
	
	if(!CHILD.hasOwnProperty(pathToFolder)) return log( "Service is not running: " + pathToFolder + " Running services: " + Object.getOwnPropertyNames(CHILD) );
	
	STOP.push(pathToFolder);
	
	log("Clearing " + TIMERS[pathToFolder].length + " timers from " + pathToFolder);
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
	
}

function start(pathToFolder) {
	
	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	log("Recieved start command for project folder: " + pathToFolder);
	
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
					if(err) initError(err);
					else {
						folderItems.forEach(function(fileName) {
							
							var path = require("path");
							var scriptFilePath = path.join(pathToFolder, fileName);
							
							if(fileName == findFile + ".js") startService(scriptFilePath, findFile, pathToFolder, "/log/" + fileName + ".log");
							
						});
					}
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
				var path = require("path");
				var mainFile = path.join(pathToFolder, json.main);
				startService(mainFile, name, pathToFolder, "/log/" + name + ".log", json.email);
			}
			else return log(packageJson + " has no main file entry!");
		}
		
	});
	
}

function shutdownInitWorker() {
	
	if(SHUTDOWN) {
		// Second time receiving the SIGINT, kill all children and exit
		
		log("Killing all child processes!");
		
		for(var name in CHILD) CHILD[name].kill('SIGKILL');
		
		initLogStream.end();
		process.disconnect();
		process.exit(0);
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
	
	log("Reading directory pathToFolder=" + pathToFolder, 7);
	
	fs.readdir(pathToFolder, function readdir(err, folderItems) {
		if(err) {
			if(err.code == "ENOENT") return callback(scripts);
			else return initError(err);
		}
		if(folderItems.length == 0) {
			log("No files found in pathToFolder=" + pathToFolder, ERR); 
			process.exit(0); // A clean exit, because we have nothing to do 
		}
		else {
			folderItems.forEach(function(fileName) {
				
				var filePath = path.join(pathToFolder, fileName)
				
				if(fileName.indexOf("�") != -1) log("Encoding problem in filePath=" + filePath, 4);
				
				stat(fileName, filePath);
				
			});
		}
		
		checkDone();
		
	});
	
	function stat(fileName, filePath) {
		log("Making stat filePath=" + filePath + "", 7);
		
		filesToStat++;
		
		fs.stat(filePath, function stat(err, stats) {
			
			if(err) initError(err);
			else if(stats.isDirectory()) {
				lookForScript(fileName, filePath);
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
					log("Looking for " + findFile + ".js in " + pathToFolder + " ...", DEBUG);
					fs.readdir(pathToFolder, function (err, folderItems) {
						if(err) initError(err);
						else {
							folderItems.forEach(function(fileName) {
								
								var scriptFilePath = path.join(pathToFolder, fileName);
								
								if(fileName == findFile + ".js") scripts.push({main: scriptFilePath, name: findFile, pathToFolder: pathToFolder, log: "/log/" + fileName + ".log"});
								
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
					scripts.push({main: mainFile, name: name, pathToFolder: pathToFolder, log: "/log/" + name + ".log", email: json.email});
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
	
	if(CHILD.hasOwnProperty(pathToFolder)) return log("Already initiated: " + pathToFolder + " (try stopping it)"); 
	if(STOP.indexOf(pathToFolder) != -1) return log("Can not start Script while it's being stopped: " + pathToFolder + "");
	
	log("Starting service: " + pathToFolder + " ... ( main: " + scriptPath + " log: " + logFilePath + " )", 7);
	
	TIMERS[pathToFolder] = [];
	
	var waitRestart = [2000,5000,10000,30000,60000,1800000];
	var waitKill = 1000; // How long to wait from SIGHUB to SIGKILL
	
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
			prod: true,
			myName: USERNAME
		},
		execPath: "/usr/bin/nodejs" // note: we are in chroot!
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
		
		var waitForRespawn = 2000;
		if(restarts < waitRestart.length-1) waitForRespawn = waitRestart[restarts];
		else waitForRespawn = waitRestart[waitRestart.length-1];
		
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
				log("Resetting respawntime for " + pathToFolder);
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


function initError(err) {
	
	// Get the proper position for this error
	var callsites = callsite();
	var callstack = "";
	var firstSite = callsites[1];
	var position = (firstSite.getFunctionName() || '(anonymous function)') + "@" + firstSite.getFileName() + ":" + firstSite.getLineNumber();
	for(var i=1; i<callsites.length; i++) callstack += (callsites[i].getFunctionName() || 'anonymous') + "@" + callsites[i].getFileName() + ":" + callsites[i].getLineNumber() + "\n";
	
	//console.log(callstack);
	
	log(position + "\n    " + err.message, 3);
	
	sendMail(ADMIN_EMAIL, "Init error: " + err.message, "Message: " + err.message + "\n\nStack:\n" + callstack + "\n\n Arguments:\n" + process.argv.join("\n"));
	
	process.exit(1);
}


function log(msg, level) {
	
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
