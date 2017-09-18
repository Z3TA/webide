/*
	
	
*/

"use strict";

// Need to require non native modules here before we are chrooted


var UTIL = require("../client/UTIL.js");

var API = require("./server_api.js");


// Server plugin API's
API.SSG = require("./plugin/static_site_generator/ssg-api.js");
API.mercurial = require("./plugin/mercurial.js");



var REMOTE_PROTOCOLS = ["ftp", "ftps", "sftp"]; // Supported remote connections


var logModule = require("./log.js");
var log = logModule.log;

var getArg = require("./getArg.js");

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number
logModule.setLogLevel(LOGLEVEL);
//logModule.setLogFile("./user_worker.log");
// console.log messages from here is visible on the parent!

// Log levels
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var USE_CHROOT = !!(getArg(["chroot", "chroot"]) || false);
log("process.env.uid=" + process.env.uid);

var npmExecFileOptions = {
	env: {
		HOME: "/"
	}
}


if(parseInt(process.env.uid)) {

	USE_CHROOT = true;
	/* Change root ...
		posix seem to need node module version 48? 46? See: https://nodejs.org/en/download/releases/
		nvm install or nvm use (the version you want)
		npm rebuild
		
		The idea with chroot is that we do not have to translate paths to virtual root.
		But when running with chroot we are not able to spawn any processes!!
		
	*/
	var posix = require("posix");
	var username = process.env.username; // getArg(["u", "user", "username"]);
	var uid = parseInt(process.env.uid); // getArg(["uid", "uid"])
	var gid = parseInt(process.env.gid); // getArg(["gid", "gid"])
	posix.chroot('/home/' + username);
	//posix.setegid(gid);
	//posix.seteuid(uid);
	
	process.setgid(gid);
	process.setuid(uid);
	
	log(username + " worker process uid=" + uid + " gid=" + gid);
	
	if(uid === 0) log(username + " RUNNING AS ROOT!!!", WARN);
	
	if(process.getuid && process.getuid() === 0) throw new Error("Failed to change user! Worker process is still root! process.getuid()=" + process.getuid());
	
	//var chroot = require("chroot");
	//chroot("/home/" + username + "/", username);
	}
else {
	var isRoot = process.getuid && process.getuid() === 0;
if(isRoot && !USE_CHROOT) throw new Error("Can not run worker process as superuser unless chroot flag is used!")
}

// Set default file permissions
var newmask = parseInt("0022", 8); // four digits, last three mask, ex: 0o027 ==> 750 file permissions
var oldmask = process.umask(newmask);
log("Changed umask from " + oldmask.toString(8) + " to " + newmask.toString(8), DEBUG);

// Changed umask from 22 to 77


var parentRequestCallback = {}; // id: callback function
var parentRequestId = 0; // Counter (id) for parentRequestCallback

var user = {};
user.id = 0;
user.name = "";
user.remoteConnections = {};
user.storage = null;
user.connectionId = 0;
user.isSavingStorage = [];
user.rootPath = undefined;
user.runningNodeJsScripts = {};

user.identify = function identify(info) {
	
	console.log("info: ", info);
	
	user.id = info.id;
	user.name = info.name;
	user.rootPath = info.rootPath;
	user.defaultWorkingDirectory = info.homeDir;
	
	var path = require("path");
	
	if(user.rootPath) { // Use "true" path
		user.rootPath = path.resolve(user.rootPath);
		user.rootPath = UTIL.trailingSlash(user.rootPath);
		user.defaultWorkingDirectory = "/";
	}
	else if(!user.defaultWorkingDirectory) {
		var editorDir = path.resolve("./../");
		user.defaultWorkingDirectory = UTIL.trailingSlash(editorDir);
	}
	
	if(USE_CHROOT) {
		user.rootPath = null;
		user.defaultWorkingDirectory = "/";
	}
	
	user.workingDirectory = user.defaultWorkingDirectory;
	
	user.storageDir = user.translatePath(user.defaultWorkingDirectory + ".editorStorage" + path.sep) ;
	
	console.log("Identified as user.name=" + user.name + " workingDirectory=" + user.workingDirectory);
	
}

user.teardown = function teardown(msg, terddownComplete) {
	// Cleanup and then exit!
	
	console.log("Recived teardown request from parent process!");
	
	// Stop running NodeJS scrips
	var scriptsToStop = 0;
	for(var filePath in user.runningNodeJsScripts) {
		scriptsToStop++;
		stopNodeJsScript(filePath, nodeJsScriptStopped);
	}
	
	doneMaybe();
	
	// Disconnect from remote servers etc ...

	function nodeJsScriptStopped() {
		scriptsToStop--;
		doneMaybe();
	}
	
	function doneMaybe() {
		if(scriptsToStop === 0) {
			//process.send({done: "teardown"});
			process.exit();
		}
	}
}

user.send = function send(msg) {
	
	if(msg !== Object(msg)) {
		msg = {msg: msg};
	}
	
	process.send({message: msg})
	
}


user.changeWorkingDir = function changeWorkingDir(path) {
	
	user.workingDirectory = path;
	
	return user.workingDirectory;
}

user.remoteConnectionClosed = function remoteConnectionClosed(protocol, serverAddress) {
	
	// Notify the client about closed connection
	user.send({
		connectionClosed: {protocol: protocol, serverAddress: serverAddress}
	});
	
	delete user.remoteConnections[serverAddress]; // Remove the connection
	
}

user.translatePath = function translatePath(pathToFileOrDir) {
	
	// Translates a virtual path to a real file-system path
	
	if(pathToFileOrDir == undefined) throw new Error("pathToFileOrDir=" + pathToFileOrDir);
	
	//console.log(user.name + " translatePath=" + pathToFileOrDir);
	
	pathToFileOrDir = UTIL.removeFileColonSlashSlash(pathToFileOrDir);
	
	if(user.rootPath && !USE_CHROOT) {
		var urlModule = require("url");
		var pathModule = require("path");
		
		var parsedUrl = urlModule.parse(pathToFileOrDir);
		
		//console.log("parsedUrl=" + JSON.stringify(parsedUrl));
		
		var protocol = parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : "LOCAL:";
		protocol = protocol.substring(0, protocol.length-1); // Remove colon: 
		
		//console.log("protocol=" + protocol + " indexOf [" + REMOTE_PROTOCOLS.join(",") + "] = " + REMOTE_PROTOCOLS.indexOf(protocol));
		
		if(REMOTE_PROTOCOLS.indexOf(protocol) != -1) return pathToFileOrDir;
		
		// else: The protocol is not allowed or its a local path
		//console.log("Not a URL (at least not a supported url) pathToFileOrDir=" + pathToFileOrDir);
		
		var lastCharOfPath = pathToFileOrDir.charAt(pathToFileOrDir.length-1);
		
		var isDirectory = (lastCharOfPath == "/" || lastCharOfPath == "\\");
		
		// Problem: //foo/bar/baz will be parsed as root=//foo/bar
		// Solution: Remove double delimiters at start of path
		//var delimiter = UTIL.getPathDelimiter(pathToFileOrDir);
		var delimiter = "/"; // \\[server]\[sharename]\ is a valid (root) path
		while(pathToFileOrDir.charAt(0) == delimiter && pathToFileOrDir.charAt(1) == delimiter) pathToFileOrDir = pathToFileOrDir.substr(1);
		
		var parsedPath = pathModule.parse(pathToFileOrDir);
		
		//console.log("parsedPath=" + JSON.stringify(parsedPath));
		
		var pathToFileOrDirWithoutRoot = pathToFileOrDir.replace(parsedPath.root, "");
		//console.log("pathToFileOrDirWithoutRoot=" + pathToFileOrDirWithoutRoot);
		
		
		// Convert path delimiters to FS delimiters
		//pathToFileOrDirWithoutRoot = UTIL.toSystemPathDelimiters(pathToFileOrDirWithoutRoot);
		
		var translatedPath = pathModule.join(user.rootPath, pathToFileOrDirWithoutRoot);
		//console.log("(after join) translatedPath=" + translatedPath);
		
		translatedPath = pathModule.resolve(translatedPath);
		//console.log("(after resolve) translatedPath=" + translatedPath);
		
		if(translatedPath == pathModule.resolve("users.pw")) {
			console.warn("User name=" + user.name + " is accessing users.pw");
		}
		else if(translatedPath == "/etc/jzedit_user") {
			console.warn("User name=" + user.name + " is accessing /etc/jzedit_user");
		}
		
		if(isDirectory) translatedPath = UTIL.trailingSlash(translatedPath);
		
		//console.log("translatedPath=" + translatedPath);
		
		// Make sure virutal path is in user.rootPath
		if(translatedPath.indexOf(user.rootPath) != 0) {
			//console.warn("translatedPath=" + translatedPath + " does not contain user.rootPath=" + user.rootPath);
			return new Error("Unable to access path=" + pathToFileOrDir);
		}
		else return translatedPath;
		
	}
	else {
		//console.log("No need to translate (no rootPath)");
		return pathToFileOrDir;
	}
}

user.toVirtualPath = function toVirtualPath(realPath) {
	
	//console.log(user.name + " toVirtualPath realPath=" + realPath);
	
	if(!user.rootPath || USE_CHROOT) {
		//console.log("No need to translate (no rootPath)");
		return realPath;
	}
	
	if(realPath.indexOf(user.rootPath) != 0) {
		throw new Error("realPath=" + realPath + " does not contain user.rootPath=" + user.rootPath);
	}
	
	var virtualPath = realPath.replace(user.rootPath, "");
	
	// Always use slashes for virtual paths
	virtualPath = virtualPath.replace(/\\/g, "/");
	
	// Add a root slash if it doesn't start with a slash
	if(virtualPath.charAt(0) != "/" ) virtualPath = "/" + virtualPath;
	
	
	//console.log("virtualPath=" + virtualPath);
	
	return virtualPath;
	
}


user.loadStorage = function loadStorage(callback) {
	
	// callback storage as a object
	
	var filesRead = 0;
	
	console.log("Reading storage files for user=" + user.name + " in directory: " + user.storageDir);
	
	if(!user.storageDir.match(/\/|\\$/)) throw new Error("Does not end with a slash: user.storageDir=" + user.storageDir);
	
	if(user.isSavingStorage.length > 0) {
		callback(new Error("Can not retrieve the storage while " + JSON.stringify(user.isSavingStorage) + " is being saved!"));
		throw new Error("Can not read the storage when it's being saved! user.isSavingStorage=" + JSON.stringify(user.isSavingStorage));
	}
	
	var fs = require("fs");
	fs.readdir(user.storageDir, function readingStorageDir(err, files) {
		
		if(err) {
			
			if(err.code == "ENOENT") {
				
				console.log("Creating directory: " + user.storageDir)
				fs.mkdir(user.storageDir, function createdStorageDir(err) {
					if(err) {
						callback(err);
						throw err;
					}
					
					user.storage = {};
					callback(null, user.storage);
					
					console.log("Directory created: " + user.storageDir)
					
				});
			}
			else {
				callback(err);
				console.warn("readdir err code=" + err.code);
				throw err;
			}
		}
		else {
			
			if(Object.prototype.toString.call( files ) !== '[object Array]') throw new Error("Expected files to be an Array! typeof=" + (typeof files) + " files=" + JSON.stringify(files));
			
			user.storage = {};
			
			if(files.length > 0)  {
				for(var i=0; i<files.length; i++) loadItem(files[i]);
			}
			else {
				callback(null, user.storage);
			}
		}
		
		function loadItem(fileItemName) {
			
			var itemName = decodeURIComponent(fileItemName);
			
			console.log("Loading item=" + itemName);
			fs.readFile(user.storageDir + fileItemName, "utf8", function readStorageFileItem(err, data) {
				if(err) {
					callback(err);
					throw err;
				}
				
				user.storage[itemName] = data;
				
				filesRead++;
				
				console.log("Done loading item=" + itemName + " (" + filesRead + " or " + files.length + ")");
				
				if(filesRead == files.length) callback(null, user.storage);
				
			});
		}
		
	});
	
	
}

user.saveStorageItem = function saveStorage(itemName, callback) {
	
	console.log("Saving storage item=" + itemName + " for user=" + user.name + " ...");
	
	var fs = require("fs");
	
	var storageString = user.storage[itemName];
	
	// The storage might change while waiting for the file system!!!
	
	if(user.isSavingStorage.indexOf(itemName) != -1) {
		console.warn("USER " + user.name + " IS CURRENTLY SAVING itemName=" + itemName);
		return callback(new Error("Please wait until " + itemName + " has been saved!"));
	}
	
	user.isSavingStorage.push(itemName);
	
	var filePath = user.storageDir + encodeURIComponent(itemName);
	
	//console.log("Creating backup of filePath=" + filePath);
	fs.rename(filePath, filePath + ".backup", function backedUpStorage(err) {
		
		if(err) {
			
			if(err.code != "ENOENT") {
				callback(new Error("Not possible to backup " + itemName + " when saving! Error: " + err.message));
				throw err;
			}
			// else: Just create the file if it doesn't exist
		}
		
		//console.log("Saving data to filePath=" + filePath);
		var fs = require("fs");
		fs.writeFile(filePath, storageString, function writeStorage(err) {
			if(err) {
				callback(new Error("Unable to save storage item=" + itemName + " ! Error: " + err.message));
				throw err;
			}
			
			// Some times the file gets corrupt! No idea why. Check if it's corrupt ...
			//console.log("Reading to check for errors: filePath=" + filePath);
			fs.readFile(filePath, "utf8", function checkCorrupt(err, data) {
				if(err) throw err;
				
				if(data != storageString) {
					
					user.send({storageCorrupt: {data: data, storageString: storageString}});
					
					callback(new Error("The storage got corrupt when saving!"));
					
					throw new Error("Storage got corrupt when saving data for user=" + user.name + "\n\
					user.storageDir: " + user.storageDir + "\n\
					itemName: " + itemName + "\n\
					filePath: " + filePath + "\n\
					data: " + data + "\n\
					storageString:" + storageString);
					
					// Attempt to save it again ??
					
				}
				
				var json = {};
				json[itemName] = storageString;
				
				callback(null, json);
				
				while(user.isSavingStorage.indexOf(itemName) != -1) user.isSavingStorage.splice(user.isSavingStorage.indexOf(itemName), 1);
				console.log("Done saving storage item=" + itemName + " for user=" + user.name, 7);
				
			});
			
		});
	});
}


user.removeStorageItem = function removeStorageItem(itemName, callback) {
	
	var fs = require("fs");
	
	var filePath = user.storageDir + encodeURIComponent(itemName);
	
	fs.unlink(filePath, function storageItemFileDeleted(err) {
		if(err) {
			
			callback(err);
			throw err;
			
			/*
				if(err.code == "ENOENT") {
				console.warn(err.message);
				
				user.isSavingStorage.splice(user.isSavingStorage.indexOf(itemName), 1);
				callback(null);
				
				}
				else {
				callback(err);
				throw err;
				}
			*/
		}
		else {
			
			callback(null);
		}
	});
	
}


process.on('message', function commandMessage(message) {
	
	// We can not recive sockJS connection handles!
	
	if(message == undefined) throw new Error("User worker message=" + message);
	
	if(message.identify) {
		user.identify(message.identify);
	}
	else if(message.teardown) {
		user.teardown();
	}
	else if(message.id) {
		var id = message.id;
		var resp = message.parentResponse;
		var err = message.err;
		if(parentRequestCallback.hasOwnProperty(id)) {
			parentRequestCallback[id](err, resp);
			delete parentRequestCallback[id];
		}
		else throw new Error("No callback saved for parentRequestCallback id=" + id);
	}
	else if(message.commands) {
		
		var command = message.commands.command;
		var commands = command.split(".");
		var json = message.commands.json;
		var id = message.commands.id;
		
		var funToRun;
		
		if(commands.length > 1) {
			// foo.bar.baz
			funToRun = API;
			for(var i=0; i<commands.length; i++) {
				if(funToRun.hasOwnProperty(commands[i])) funToRun = funToRun[commands[i]];
				else return send({error: "Unknown command=" + command + ": " + UTIL.shortString(message)});
			}
		}
		else {
			if( !API.hasOwnProperty(command) ) return send({error: "Unknown command=" + command + ": " + UTIL.shortString(message)});
			
			funToRun = API[command];
			
		}
		
		if (typeof funToRun !== "function") {
			send({error: "API error: Unknown command: " + command});
		}
		else {
			funToRun(user, json, function(err, answer) {
				if(err) {
					console.log(err);
					
					if(!err.stack) console.trace("Stack ...")
					else console.log(err.stack);
					
					var msg = {
						error: "API error: " + (err.message ? err.message : err) + ""
					}
					
					if(err.code) msg.errorCode = err.code;
					
					if(answer) msg.resp = answer;
					
					send(msg);
					
				}
				else {
					send({resp: answer});
				}
			});
		}
	}
	else throw new Error("Unable to handle: message=" + JSON.stringify(message));
	
	function send(answer) {
		
		if(id) answer.id = id;
		
		process.send(answer);
		
	}
	
})



// ## Special API's (that has to use parentRequest)...

API.serve = function serve(user, json, callback) {
	
	// Serve a folder via HTTP
	
	var folder = user.translatePath(json.folder);
	if(folder instanceof Error) return callback(folder);
	
	console.log("user.name=" + user.name + " serving folder=" + folder);
	
	parentRequest({createHttpEndpoint: {folder: folder}}, function(err, resp) {
		if(err) callback(err);
		else callback(err, {url: resp.url});
	});
	}

API.stop_serve = function serve(user, json, callback) {
	
	// Serve a folder via HTTP
	
	var folder = user.translatePath(json.folder);
	if(folder instanceof Error) return callback(folder);
	
	console.log("user.name=" + user.name + " wants to stop serving folder=" + folder);
	
	parentRequest({removeHttpEndpoint: {folder: folder}}, function(err, resp) {
		callback(err, {folder: resp.folder});
	});
}

API.run_nodejs = function run_nodejs(user, json, callback) {
	
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	if(user.runningNodeJsScripts.hasOwnProperty(filePath)) {
		// Stop the current running script before starting the same script again
		stopNodeJsScript(filePath, function nodeJsScriptKilled() {
			runNodeJsScript(filePath, json.installAllModules, callback);
		});
	}
	else runNodeJsScript(filePath, json.installAllModules, callback);
	
}

API.stop_nodejs = function stop_nodejs(user, json, callback) {
	
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	if(!user.runningNodeJsScripts.hasOwnProperty(filePath)) return callback("The script is not running: " + filePath, {filePath: filePath});
	
	stopNodeJsScript(filePath, function nodeJsScriptKilled(err) {
		callback(err, {filePath: filePath});
	});
	
}

API.install_nodejs_module = function install_nodejs_module(user, json, callback) {
	
	var moduleName = json.name;
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	var directory = UTIL.getDirectoryFromPath(filePath);
	npmExecFileOptions.cwd = directory;
	
	var saveType = "--save"; // Package will appear in your dependencies.
	if(json.saveDev) saveType = "--save-dev"; // Package will appear in your devDependencies
	else if(json.saveOptional) saveType = "--save-optional"; // Package will appear in your optionalDependencies.

	installNodejsModule(filePath, moduleName, saveType, function nodejsModuleInstalled(err) {
		callback(err, {name: moduleName});
	});
	
}

function installNodejsModule(filePath, moduleName, saveType, callback) {
	var fs = require("fs");
	
	var directory = UTIL.getDirectoryFromPath(filePath);
	var fileName = UTIL.getFilenameFromPath(filePath);
	var folderName = UTIL.getFolderName(filePath);
	npmExecFileOptions.cwd = directory;
	
	console.log("installNodejsModule: moduleName=" + moduleName + " saveType=" + saveType + " npmExecFileOptions=" + JSON.stringify(npmExecFileOptions)); 
	
	fs.readFile(directory + "package.json", "utf-8", function(err, packageTxt) {
		if(err) {
			if(err.code == "ENOENT") {
				// package.json don't exist! Create it.
				fs.writeFile(directory + "package.json", '' + 
				'{\n' +
				'"name": "' + folderName + '",\n' +
				'"version": "1.0.0",\n' +
				'"description": "",\n' +
				'"main": "' + fileName + '",\n' +
				'"scripts": {\n' +
				'  "test": "echo \\\"Error: no test specified\\\" && exit 1"\n' +
				'},\n' +
				'"keywords": [],\n' +
				'"author": "' + user.name + '",\n' +
				'"license": "ISC"\n' +
				'}\n', "utf8", function (err) {
				
					if(err) return callback(new Error("Failed to create package.json: " + err.message));
					
					return installModule();
					
				});
				
			}
			else return callback(err);
		}
		else {
			
			try {
				var packageObj = JSON.parse(packageTxt);
			}
			catch(parseError) {
				return callback(new Error("Unable to parse package.json: " + parseError.message));
			}
			
			installModule();
		}
	});
	
	function installModule() {
		var execFile = require('child_process').execFile;
		var arg = ["install", moduleName, saveType];
		execFile("/usr/share/npm/bin/npm-cli.js", arg, npmExecFileOptions, function (err, stdout, stderr) {
			console.log("npm " + JSON.stringify(arg) + " err=" + err + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(arg));
			
			if(err) return callback(new Error("Failed to install '" + moduleName + "': " + err.message));
			
			if(stderr) {
				
				stderr = stderr.replace(/npm WARN (.*) No description/, "").trim();
				stderr = stderr.replace(/npm WARN (.*) No repository field\./, "").trim();
				
				if(stderr) return callback(new Error("Problem installing '" + moduleName + "': " + stderr));
			}
			
			if(stdout) {
					user.send({nodejsMessage: {
							scriptName: filePath,
							stdout: stdout
						}
					});
				}
			
			return callback(null);
			
		});
	}
}


function stopNodeJsScript(filePath, callback) {
	
	console.log(user.name + " killing NodeJS script: filePath=" + filePath);
	
	if(!user.runningNodeJsScripts.hasOwnProperty(filePath)) return callback(new Error(filePath + " is not running"));
	
	var childProcess = user.runningNodeJsScripts[filePath];
	
	if(childProcess.connected) childProcess.disconnect();
	
	// Give it a chance to teardown before killing it
	childProcess.kill('SIGTERM');
	childProcess.kill('SIGINT');
	childProcess.kill('SIGQUIT');
	childProcess.kill('SIGHUP');
	
	var killTimeout = setTimeout(function kill() {
		// Now kill it for good
		childProcess.kill('SIGKILL');
		setTimeout(function wait() {
			// Make sure it has exited
			if(user.runningNodeJsScripts.hasOwnProperty(filePath)) throw new Error("Script should not be running: " + filePath);
			callback(null);
		}, 300);
	}, 3000);
	
	setTimeout(function checkIfStillRunning() {
		// Check if it has exited
		if(!user.runningNodeJsScripts.hasOwnProperty(filePath)) {
			clearTimeout(killTimeout);
			callback(null);
		}
	}, 500);
	
}

function runNodeJsScript(filePath, installAllModules, callback) {
	
	var directory = UTIL.getDirectoryFromPath(filePath);
	npmExecFileOptions.cwd = directory;
	
	var fs = require("fs");
	fs.readFile(directory + "package.json", "utf-8", function(err, packageTxt) {
		if(err) {
			if(err.code == "ENOENT") runIt(false);
			else return callback(err);
		}
		else {
			
			try {
				var packageObj = JSON.parse(packageTxt);
		}
			catch(parseError) {
				return runIt(false);
			}
			
			// package.json was found. Lets make sure dependencies exist
			var execFile = require('child_process').execFile;
			var arg = ["install"];
			execFile("/usr/share/npm/bin/npm-cli.js", arg, npmExecFileOptions, function (err, stdout, stderr) {
			
				console.log("npm install err=" + err + "stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(arg));
				
				if(err) return callback(new Error("Failed to install dependencies: " + err.message));
				
				if(stderr) {
					
					stderr = stderr.replace(/npm WARN (.*) No description/, "").trim();
					stderr = stderr.replace(/npm WARN (.*) No repository field\./, "").trim();
					
					if(stderr) return callback(new Error("Problem installing '" + moduleName + "': " + err.message));
				}
				
					if(stdout) {
					user.send({nodejsMessage: {
							scriptName: filePath,
								stdout: stdout
						}
					});
					}
					return runIt(true);
					
			});
			
		}
	});
	
	function runIt(packageJsonExist) {
		
	console.log(user.name + " starting NodeJS script: filePath=" + filePath);
	
	var nodeScriptArgs = [];
	var nodeScriptOptions = {
		execPath: "/usr/bin/nodejs",
		env: {
			myName: user.name
		},
		silent: true // Makes us able to capture stdout and stderr, otherwise it will use our stdout and stderr
	};
	
	var child_process = require("child_process");
	var nodeScript = child_process.fork(filePath, nodeScriptArgs, nodeScriptOptions);
	// The node worker will chroot to user's home dir, setegid and seteuid
	
	nodeScript.on("message", messageFromNodeScript);
	nodeScript.on("error", nodeScriptError);
	nodeScript.on("exit", nodejScriptExit);
	nodeScript.stdout.on('data', nodejScriptStdout);
	nodeScript.stderr.on('data', nodejScriptStderr);
	
	// note: The worker process will not exit (unless there's an error) if it has to listen for messages from parent
	
	user.runningNodeJsScripts[filePath] = nodeScript;
	callback(null, {filePath: filePath});
	
	
	function messageFromNodeScript(message, handle) {
		console.log(user.name + ":" + filePath + ":message: message=" + message + " handle=" + handle);
		console.log(message);
		user.send({nodejsMessage: {
				scriptName: filePath,
				message: message
			}
		});
		}
	
	function nodejScriptExit(code, signal) {
		console.log(user.name + ":" + filePath + ":exit: code=" + code + " signal=" + signal);
		
		delete user.runningNodeJsScripts[filePath];
		
		user.send({nodejsMessage: {
				scriptName: filePath,
				exit: {
					code: code,
					signal: signal
				}
			}
		});
		
	}
	
	function nodeScriptError(err) {
		console.log(user.name + " nodejs script error: err=" + err);
	}
	
	function nodejScriptStdout(data) {
		console.log(user.name + ":" + filePath + ":stdout: data=" + data + "");
		
		user.send({nodejsMessage: {
				scriptName: filePath,
				stdout: data.toString("utf8")
			}
		});
		
	}
	
	function nodejScriptStderr(data) {
			console.log(user.name + ":" + filePath + ":stderr: data (" + (typeof data) + ") =  " + data + "");
		
			var stderr = data.toString("utf8");
			
			var matchModuleError = stderr.match(/Error: Cannot find module '(.*)'/);
			
			if(matchModuleError) {
				
				if(installAllModules) {
					// Try to install the module and run the script again
					installNodejsModule(filePath, matchModuleError[1], undefined, function(err) {
						if(err) user.send(err.message);
						else {
							
							if(user.runningNodeJsScripts.hasOwnProperty(filePath)) stopNodeJsScript(filePath, function scriptStopped(err) {
								if(err) console.log(err.message); // Means the script was already stopped.
								runNodeJsScript(filePath, installAllModules, function(err) {
									if(err) user.send(err.message);
								});
							})
							
						}
					});
					
				}
				else {
				user.send({nodejsMessage: {
						scriptName: filePath,
							cannotFindModule: matchModuleError[1]
						}
					});
				}
			}
			
			user.send({nodejsMessage: {
					scriptName: filePath,
					stdout: stderr
				}
			});
		}
		
	}
}


function parentRequest(req, callback) {
	
	var id = ++parentRequestId;
	
	process.send({id: id, request: req});
	parentRequestCallback[id] = callback;
}



// Overload console.log 
console.log = function() {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	log(user.name + ": " + msg, 7);
}

// Overload console.warn
console.warn = function() {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	log(user.name + ": " + msg, 4);
}

// Overload console.error
console.error = function() {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	log(user.name + ": " + msg, 3);
}
