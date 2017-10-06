/*
	
	A node script that manage other node scripts ...
	
	Each jzedit/webide user has it's own nodejs deamon manager worker (this script)
	chroot into the user's home dir and set uid and gid to the user's id.
	
	open log file in user's home dir /log/deamon_manager.log
	
	traverse the .prod folder and look for a package.json file.
	look for main script and start it
	restart the script if it exits, and notify the user via e-mail or sms
	
	open a scriptname.stdout.log and scriptname.stderr.log file for each micro-service
	
	start a http service used for manually restarting a deamon. 
	
	
	
	Add watcher and automatically restart the script if the main file changes
	
	
	
	Arguments: --path=/tank/nodejs/johan/ --email=zeta@zetafiles.org --sms=0738498018
	
	<7>This is a DEBUG level message
	<6>This is an INFO level message
	<5>This is a NOTICE level message
	<4>This is a WARNING level message
	<3>This is an ERR level message
	<2>This is a CRIT level message
	<1>This is an ALERT level message
	<0>This is an EMERG level message
	
*/

"use strict"

log("Starting nodeinit");

  var DEFAULT_EMAIL = "zeta@zetafiles.org"; // Errors with This script is sent here
var DEFAULT_PATH = "/tank/nodejs/";

var ARG = getArguments(process.argv);

	var PATH = ARG["path"];
	var EMAIL = ARG["email"];

var CHILD = {}; // Holds references to the child processes

var SHUTDOWN = false;

	if(!PATH) {
	return initError(new Error("No path specified. Use argument: --path=/path/to/folder/!"));
	}
	
	if(!EMAIL) {
		log("No email specified. Default email will be used!", 4);
		EMAIL= DEFAULT_EMAIL;
	}
	
if(ARG["runtests"] !== undefined) {
	runTests();
	}
else {
	
 findScripts(PATH, function(scripts) {
		
		scripts.forEach(fork);
		
	});
	}

process.on("SIGINT", function () {
	log("Received SIGINT");
	
	if(SHUTDOWN) {
		// Second time receiving the SIGINT, kill all children and exit
		
		log("Killing all child processes!");
		
		for(var name in CHILD) CHILD[name].kill('SIGKILL');
		
		process.exit();
		
	}
	
	SHUTDOWN = true;
	
	// Close all child processes ...
	
	var closed = [];
	
	for(var name in CHILD) {
		closeChild(CHILD[name]);
		log("Closing " + name);
		closed.push(name);
	}
	
	if(closed.length > 0) {
		// Tell what process was killed
	sendMail(EMAIL, "Killing processes due to SIGINT", "The daemon master process received a SIGINT and killed the following daemons:\n * " + closed.join("\n * "), undefined, function() {
		process.exit();
	});
	}
	else process.exit();
	
});

function closeChild(childProcess) {
	// Allow the process to gracefully shut down
	
	if(childProcess.connected) childProcess.disconnect();
	
	childProcess.kill('SIGTERM');
	childProcess.kill('SIGINT');
	childProcess.kill('SIGQUIT');
	childProcess.kill('SIGHUP');
	}


function getArguments(argArr) {
	var args = {};
	
	for(var i=2, arg; i<argArr.length; i++) {
		if(argArr[i].substr(0, 2) == "--") {
			var arr = argArr[i].substr(2).split("=");
			var name = arr[0];
			var value = arr[1] || "";
			
			args[name] = value;
		}
	}
	return args;
}


function findScripts(pathToFolder, callback) {
	var fs = require("fs");
	var path = require("path");
	
	var scripts = []; // Scripts found
	
	var foldersToLookIn = 0;
	var filesToStat = 0;
	
	log("Reading directory pathToFolder=" + pathToFolder, 7);
	
	fs.readdir(pathToFolder, function readdir(err, folderItems) {
		if(err) {
			return initError(err);
		}
		if(folderItems.length == 0) initError( new Error("No files found in pathToFolder=" + pathToFolder) ); 
		else {
			folderItems.forEach(function(fileName) {
				
				if(fileName == "nodeinit") return; // Ignore ourselves
				
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
			foldersToLookIn++;
			fs.readdir(pathToFolder, function (err, folderItems) {
				if(err) initError(err);
				else {
					folderItems.forEach(function(fileName) {
						
						var filePath = path.join(pathToFolder, fileName);
						
						if(fileName == findFile + ".js") scripts.push(filePath);
						
					});
				}
				
				foldersToLookIn--;
				checkDone();
			});
			
		}
		
		function checkDone() {
			if(foldersToLookIn == 0 && filesToStat == 0) callback(scripts);
		}
		
	}
	
	function fork(scriptPath) {
		
	var scriptName = getFileNameFromPath(scriptPath);
	
	log("Found scriptName=" + scriptName + " scriptPath=" + scriptPath, 7);
	
		var waitRestart = [2000,5000,10000,30000,60000,1800000];
	var waitKill = 1000; // How long to wait from SIGHUB to SIGKILL
		
		var restarts = 0;
		var respawnTimer;
		var stdHistory = []; // History of stdout and stderr messages
		var historyLimit = 100;
	var isRestarting = true; // Prevent killing a process that is about to respawn
	var resetRestartsTimer;
	
		var cp = require('child_process');
		var arg = [];
		var opt = {silent: true};
		var childProcess;
		
		respawn(); // Starts the child process
		
	var watcherTimer;
		var chokidar = require('chokidar');
		var watcher = chokidar.watch(scriptPath);
		watcher.on('change', function(path) {
			log("Script changed: " + scriptPath);
			
			restarts = 0;
			
		if(isRestarting) {
			// Wait one second for all writes to finish, so we don't load a corrupt file
			clearTimeout(watcherTimer);
			watcherTimer = setTimeout(function() {
				if(isRestarting) {
					// Now restart it right away
					respawn();
				}
			}, 1000);
		}
		else {
			
			closeChild(childProcess);
			
			setTimeout(function() {
				// Kill the process if it's still running
				if(!isRestarting) childProcess.kill('SIGKILL');
				
				}, waitKill);
			}
		});
		
		
		function respawn() {
		
		clearTimeout(respawnTimer);
		
		if(SHUTDOWN) return;
		
		if(childProcess) {
			// Make sure the old one is really really dead
		childProcess.kill('SIGKILL');
		if(childProcess.connected) childProcess.disconnect();
		}
		
			log("Starting: " + scriptPath, 7);
			
			stdHistory.length = 0; // Reset the history
			
		CHILD[scriptName] = cp.fork(scriptPath, arg, opt);
			
		childProcess = CHILD[scriptName];
		
			// Attach event listeners
			childProcess.stdout.on('data', stdout);
			childProcess.stderr.on('data', stderr);
		childProcess.on('close', closeStdioStreams);
		childProcess.on('exit', childProcessEnded);
		
		isRestarting= false;
			
		}
		
		function stdout(data) {
		var txtArr = data.toString("utf8").trim().split("\n");
		
		for(var i=0; i<txtArr.length; i++) {
			log(scriptName + ": " + txtArr[i], 7);
		historyAdd(txtArr[i]);
		}
		
	}
	
	function stderr(data) {
		var txtArr = data.toString("utf8").trim().split("\n");
		
		for(var i=0; i<txtArr.length; i++) {
			log(scriptName + ": " + txtArr[i], 3);
			historyAdd(txtArr[i]);
		}
		
		// Send the error message via email
		
		var firstLineInErrMsg = txtArr[0];
		
		sendMail(EMAIL, scriptName + ": " + txtArr[4], data);
		
			// Log the error
			
		log(scriptName + ": " + txtArr[0] + " " + txtArr[4], 3);
		
		}
	
	
	function closeStdioStreams(code, signal) {
		
		log(scriptName + " closed stdio streams! code=" + code + " signal=" + signal);
		
	}
	
	function childProcessEnded(code, signal) {
		var finalExit = (code !== null);
		
		log(scriptName + " ended! code=" + code + " signal=" + signal + " finalExit=" + finalExit);
		
		// NodeJS errors will have a code, but if the process is killed via a signal, we wont get a final exit
		// So always restart!
		
		if(!finalExit) closeChild(childProcess); // Make sure it's really dead, and disconnect from it
		// (but do not send SIGKILL because we want to give it a chance to gracefully shut down)
		
		exit(code, signal);
		
	}
	
	
	function exit(code, signal) {
		
		isRestarting = true;
		
		if(SHUTDOWN) return;
		
		var waitForRespawn = 0;
		if(restarts < waitRestart.length-1) waitForRespawn = waitRestart[restarts];
		else waitForRespawn = waitRestart[waitRestart.length-1];
		
		sendMail(EMAIL, scriptName + ": Exit code=" + code + " signal=" + signal, stdHistory.join("\n"));
		
		log("Waiting " + waitForRespawn + "ms to restart: " + scriptPath, 7);
		
		clearTimeout(resetRestartsTimer);
		clearTimeout(respawnTimer);
		
		respawnTimer = setTimeout(function() {
			
			restarts++;
			
			respawn();
			
			resetRestartsTimer = setTimeout(function() {
				// Reset the restarts counter if the service has been running for more then 60 seconds ...
				restarts = 0;
			}, 60000);
			
		}, waitForRespawn);
		
	}
	
	function historyAdd(msg) {
		
		stdHistory.push(myDate() + ": " + msg);
		
		if(stdHistory.length > historyLimit) stdHistory.shift();
		
		
		function myDate() {
			var d = new Date();
			
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
	
		var nodemailer = require('nodemailer');
		var smtpTransport = require('nodemailer-smtp-transport');
		
		var transporter = nodemailer.createTransport(smtpTransport({
			port: 25,
		host: "zetafiles.org",
		auth: {
				user: "mailform@zetafiles.org",
				pass: "oijafs8419jifg555757fsdds3fhkl4edgggsd"
			}
		}));
		
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
	
	sendMail(DEFAULT_EMAIL, "Init error: " + err.message, "Message: " + err.message + "\n\nStack:\n" + callstack + "\n\n Arguments:\n" + process.argv.join("\n"));
}


function log(msg, level) {
	if(level == undefined) level = 6;
	
	if(process.stdout.isTTY) {
		console.log(myDate() + " " + msg);
	}
	else {
		// Probably running under systemd
		console.log("<" + level + ">" + msg);
	}
	
	function myDate() {
		var d = new Date();
		
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



