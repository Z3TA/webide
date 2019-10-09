/*
	
	Note: Always use execPath (/usr/bin/node) when forking under chroot!
	
*/

"use strict";

// Need to require non native modules here before we are chrooted

var UTIL = require("../client/UTIL.js");
var DEFAULT = require("./default_settings.js");
var API = require("./server_api.js");

// Server plugin API's
//API.test = require("./plugin/test.js"); // Make sure the files have read persmission!
API.SSG = require("./plugin/static_site_generator/ssg-api.js");
API.mercurial = require("./plugin/mercurial.js");
API.spellcheck = require("./plugin/spellcheck/spellcheck.js");
API.terminal = require("./plugin/terminal.js");
API.mysql = require("./plugin/mysql.js");

var REMOTE_PROTOCOLS = ["ftp", "ftps", "sftp"]; // Supported remote connections

var copyFolderRecursively = require('ncp').ncp;

var logModule = require("../shared/log.js");
var log = logModule.log;

var getArg = require("../shared/getArg.js");

var module_Websocket = require("ws");

var nodejsDeamonManagerPort = DEFAULT.nodejs_deamon_manager_port;
var TLD = DEFAULT.domain;

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number
logModule.setLogLevel(LOGLEVEL);
//logModule.setLogFile("./user_worker.log");
// console.log messages from here is visible on the parent!

// Log levels
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var USER_PROD_FOLDER = "/.prod/";

var USE_CHROOT = !!(getArg(["chroot", "chroot"]) || false);
//log("USE_CHROOT=" + USE_CHROOT + " getArg('chroot'):" + getArg('chroot') + " (" + JSON.stringify(process.argv) + ")", 7);
//log("process.env.uid=" + process.env.uid, 7);
//log("process.env=" + JSON.stringify(process.env));

var VIRTUAL_ROOT = !!(getArg(["virtualroot", "virtualroot"]) || false);


if(USE_CHROOT) {
	var npmOptions = {
	env: {
			HOME: "/",
		PATH: "/usr/bin:/bin:/.npm-packages/bin", // npm want node to be inside PATH
		NPM_CONFIG_PREFIX: "/.npm-packages", // Help npm figure out where to put global packages
		dev: true // So that scripts know we're in "development"
	},
};
}
else {
	var npmOptions = {
		env: process.env
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
	var posix = require("posix"); // Very much needed for chroot to work. 
	// The posix module is not optional if you want to chroot.
	// Use the -nochroot flag to run the server without chroot!
	
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
	
	// Unshare network namespace
	/*
		var CLONE_NEWNET = 0x40000000;
		var unshare = require("unshare");
		unshare(CLONE_NEWNET);
	*/
	
	process.env.HOME = "/";
	
}
else {
	var isRoot = process.getuid && process.getuid() === 0;
	if(isRoot && !USE_CHROOT) log("It's strongly adviced not to run worker process as superuser unless chroot flag is used!")
	//if(isRoot && !USE_CHROOT) throw new Error("Can not run worker process as superuser unless chroot flag is used!")
}

var processUser = process.env.SUDO_USER || process.env.LOGNAME || process.env.USER || process.env.LNAME || process.env.USERNAME || process.env.username;

if(process.getuid) log("Running user worker process with uid=" + process.getuid() + " (" + processUser + ")");
else log("Unable to get process uid!", 4);

// Set default file permissions
//var newmask = parseInt("0022", 8); // four digits, last three mask, ex: 0o027 ==> 750 file permissions
/*
	Group wwww-data needs needs to have write permission to files in /sock/
	If we need another default umask we could reset the umask after the script has forked!
*/
var newmask = parseInt("0002", 8); // four digits, last three mask, ex: 0o027 ==> 750 file permissions
var oldmask = process.umask(newmask);
//log("Changed umask from " + oldmask.toString(8) + " to " + newmask.toString(8), DEBUG);

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

if(USE_CHROOT) user.chrooted = true;

user.identify = function identify(info) {
	
	//console.log("user.identify: info=" + JSON.stringify(info));
	
	user.id = info.id;
	user.name = info.name;
	user.rootPath = info.rootPath;
	user.defaultWorkingDirectory = info.homeDir;
	user.homeDir = info.homeDir;
	
	//console.log("user.defaultWorkingDirectory=" + user.defaultWorkingDirectory);
	
	var path = require("path");
	
	if(user.rootPath) { // Use "true" path
		user.rootPath = path.resolve(user.rootPath);
		user.rootPath = UTIL.trailingSlash(user.rootPath);
		user.defaultWorkingDirectory = "/";
		//console.log("user.defaultWorkingDirectory=" + user.defaultWorkingDirectory + " (because user.rootPath=" + user.rootPath + ")");
	}
	else if(!user.defaultWorkingDirectory) {
		var editorDir = path.resolve("./../");
		user.defaultWorkingDirectory = UTIL.trailingSlash(editorDir);
		//console.log("user.defaultWorkingDirectory=" + user.defaultWorkingDirectory + " (because user had no defaultWorkingDirectory)");
	}
	
	if(USE_CHROOT) {
		user.rootPath = null;
		user.defaultWorkingDirectory = "/";
		user.homeDir = "/";
		//console.log("user.defaultWorkingDirectory=" + user.defaultWorkingDirectory + " (because USE_CHROOT=" + USE_CHROOT + ")");
	}
	
	var lastCharOfDir = user.defaultWorkingDirectory.substr(user.defaultWorkingDirectory.length-1);
	if(lastCharOfDir != "/" && lastCharOfDir != "\\") throw new Error("user.defaultWorkingDirectory=" + user.defaultWorkingDirectory + " does not end with a slash! info=" + JSON.stringify(info));
	
	
	user.workingDirectory = user.defaultWorkingDirectory;
	
	user.storageDir = user.translatePath(user.defaultWorkingDirectory + ".jzeditStorage" + path.sep) ;
	
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
		else log("Waiting fo " + scriptsToStop + " scripts to stop before closing user worker.");
	}
}

user.send = function send(msg, code) {
	
	if(msg !== Object(msg)) {
		msg = {msg: msg};
		if(code) msg.code = code;
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
	
	console.log(user.name + " translatePath=" + pathToFileOrDir + " user.rootPath=" + user.rootPath + " USE_CHROOT=" + USE_CHROOT + " VIRTUAL_ROOT=" + VIRTUAL_ROOT);
	
	pathToFileOrDir = UTIL.removeFileColonSlashSlash(pathToFileOrDir);
	
	if(pathToFileOrDir[0] == "~") {
		pathToFileOrDir = pathToFileOrDir.replace("~", user.homeDir);
	}
	
	if(user.rootPath && !USE_CHROOT && VIRTUAL_ROOT) {
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
	
	// Only translate paths that link to the local file system
	var urlModule = require("url");
	var pathModule = require("path");
	var parsedUrl = urlModule.parse(realPath);
	var protocol = parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : "LOCAL:";
	protocol = protocol.substring(0, protocol.length-1); // Remove colon:
	if(REMOTE_PROTOCOLS.indexOf(protocol) != -1) return realPath;
	
	
	if(  realPath.indexOf(user.rootPath) != 0) {
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
	
	//console.log("Reading storage files for user=" + user.name + " in directory: " + user.storageDir);
	
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
			
			//console.log("Loading item=" + itemName);
			fs.readFile(user.storageDir + fileItemName, "utf8", function readStorageFileItem(err, data) {
				if(err) {
					if(err.code == "EACCES") {
						console.warn("Do not have access to read " + user.storageDir + fileItemName);
						//return callback(err);
					}
					else throw err;
				}
				
				user.storage[itemName] = data;
				
				filesRead++;
				
				//console.log("Done loading item=" + itemName + " (" + filesRead + " or " + files.length + ")");
				
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
	// # Process Message
	
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
					
					if(err.code) {
						console.log("err.code=" + err.code);
						msg.errorCode = err.code;
					}
					
					if(answer) msg.resp = answer;
					
					send(msg);
					
				}
				else {
					if(!answer) {
						console.warn("No data in answer from command=" + command)
						answer = {};
					}
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
	
});


API.run_nodejs = function run_nodejs(user, json, callback) {
	
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	var debugit = json.debug || false;
	
	if(user.runningNodeJsScripts.hasOwnProperty(filePath)) {
		// Stop the current running script before starting the same script again
		stopNodeJsScript(filePath, function nodeJsScriptKilled() {
			runNodeJsScript(filePath, json.args, json.installAllModules, debugit, callback);
		});
	}
	else runNodeJsScript(filePath, json.args, json.installAllModules, debugit, callback);
	
}

API.stop_nodejs = function stop_nodejs(user, json, callback) {
	
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	stopNodeJsScript(filePath, function nodeJsScriptKilled(err) {
		callback(err, {filePath: filePath});
	});
	
}

API.install_nodejs_module = function install_nodejs_module(user, json, callback) {
	
	if(json.name == undefined) return callback(new Error("Need name of module!"));
	if(json.filePath == undefined) return callback(new Error("Need filePath for where it should be installed!"));
	
	var moduleName = json.name;
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	var directory = UTIL.getDirectoryFromPath(filePath);
	npmOptions.cwd = directory;
	
	var saveType = "--save"; // Package will appear in your dependencies.
	if(json.saveDev) saveType = "--save-dev"; // Package will appear in your devDependencies
	else if(json.saveOptional) saveType = "--save-optional"; // Package will appear in your optionalDependencies.
	
	installNodejsModule(filePath, moduleName, saveType, function nodejsModuleInstalled(err) {
		callback(err, {name: moduleName});
	});
	
}

API.nodejs_init_stop = function nodejs_init_stop(user, json, callback) {
	
	var folder = json.folder;
	var pw = json.pw;
	
	if(!folder.match(/(\/|\\)$/)) return callback(new Error("Folder path need to end with a folder delimiter (slash)!"));
	if(pw == undefined) return callback(new Error("User password is needed to stop Node.JS script!"));
	
	var folderName = UTIL.getFolderName(folder);
	
	var prodFolder = USER_PROD_FOLDER + folderName + "/";
	
	nodejs_init_action("stop", prodFolder, pw, callback);
	
}

API.nodejs_init_restart = function nodejs_init_restart(user, json, callback) {
	
	var folder = json.folder;
	var pw = json.pw;
	var folderName = UTIL.getFolderName(folder);
	var prodFolder = USER_PROD_FOLDER + folderName + "/";
	
	if(!folder.match(/(\/|\\)$/)) return callback(new Error("Folder path need to end with a folder delimiter (slash)!"));
	if(pw == undefined) return callback(new Error("User password needed to restart " + prodFolder + " !"));
	
	nodejs_init_action("restart", prodFolder, pw, callback);
	
}

API.nodejs_init_remove = function nodejs_init_removet(user, json, callback) {
	
	var folder = json.folder;
	var pw = json.pw;
	var folderName = UTIL.getFolderName(folder);
	var prodFolder = USER_PROD_FOLDER + folderName + "/";
	
	if(!folder.match(/(\/|\\)$/)) return callback(new Error("Folder path need to end with a folder delimiter (slash)!"));
	if(pw == undefined) return callback(new Error("User password needed to remove " + prodFolder + " !"));
	
	API.deleteDirectory(user, {directory: prodFolder, recursive: true}, function(err, resp) {
		if(err) callback(err);
		else nodejs_init_action("stop", prodFolder, pw, callback);
	});
	
}

API.nodejs_init_deploy = function nodejs_init_deploy(user, json, callback) {
	var folder = json.folder;
	var pw = json.pw;
	
	if(folder == undefined) return callback(new Error("A folder need to be specified where to the find the source code to be deployed! folder=" + folder));
	
	if(!folder.match(/(\/|\\)$/)) return callback(new Error("Folder paths need to end with a folder delimiter (slash)!"));
	if(pw == undefined) return callback(new Error("User password is needed to deploy Node.JS script!"));
	
	
	var pjPath = folder + "package.json";
	
	var fs = require("fs");
	
	fs.readFile(pjPath, "utf-8", function(pjReadErr, pjContent) {
		if(pjReadErr) {
			if(pjReadErr.code == "ENOEND") return callback(new Error("There need to be a package.json the folder: " + folder));
			else return callback(new Error("Unable to read package.json: " + pjReadErr.message));
		}
		
		try {
			var pjParsed = JSON.parse(pjContent);
		}
		catch(pjParseErr) {
			return callback(new Error("Unable to parse package.json: " + pjParseErr.message));
		}
		
		var mainFile = pjParsed.main;
		var projectName = pjParsed.name;
		
		if(mainFile == undefined) {
			var pjMainErr = new Error("package.json needs to have a main entry file specified!");
			pjMainErr.code = "PJMAIN";
			return callback(pjMainErr);
		}
		
		var foldername = UTIL.getFolderName(folder);
		var prodFolder = USER_PROD_FOLDER + foldername;
		
		/*
			note: We could also fpt/sftp/rsync the files to another server!
			And talk to the nodejs_init.service on that server.
		*/
		
		var fs = require("fs");
		fs.mkdir(USER_PROD_FOLDER, function makeSureProdFolderExist(err) {
			if(err) {
				if(err.code != "EEXIST") return callback(err);
			}
			
			copyFolderRecursively(folder, prodFolder, {filter: filterPath}, function(copyFolderErr) {
				if(copyFolderErr) return callback(copyFolderErr);
				else {
					nodejs_init_action("restart", prodFolder, pw, callback);
				}
			});
			
			function filterPath(path) {
				if(path.match(/data\/?$/)) return false;
				else return true;
			}
			});
		});
	}

API.nodejs_init_ping = function nodejs_init_ping(user, json, callback) {
	// Check if the init server is alive
	
	var rnd = "";
	for (var i=0; i<6; i++) {
		rnd += Math.floor(Math.random() * 10).toString();
	}
	
	nodejs_init_action(rnd, "/ping", "", function(err, resp) {
		if(err) callback(null, {online: false, message: err.message, code: err.code});
		else {
			console.log(resp);
			var online = false;
			if(resp.text.indexOf("Pong " + rnd) == 0) {
				online = true;
			}
			callback(null, {online: online, message: resp.text, code: 200})
		}
	});
}

// ## Special API's (that has to use parentRequest)...

API.identify = function identify(user, json, callback) {
	// Handle weird edge case when the user manages to login twice
	
	if(!user.name) throw new Error("Unexpected: user.name=" + user.name);
	
	callback(new Error("Already identified as " + user.name));
}

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
	
	// Stop serving a folder
	
	var folder = user.translatePath(json.folder);
	if(folder instanceof Error) return callback(folder);
	
	console.log("user.name=" + user.name + " wants to stop serving folder=" + folder);
	
	parentRequest({removeHttpEndpoint: {folder: folder}}, function(err, resp) {
		callback(err, {folder: resp.folder});
	});
}

API.proxy = function createProxy(user, json, callback) {
	// Proxy a URL so it can be accesses from http://currentDomain.com/proxy/name/
	parentRequest({proxy: {name: json.name, url: json.url}}, function(err, resp) {
		if(err) callback(err);
		else callback(err, {name: resp.name, url: resp.url});
	});
}

API.stopProxy = function serve(user, json, callback) {
	// Stop serving a folder
	parentRequest({stopProxy: {name: json.name}}, function(err, resp) {
		callback(err);
	});
}

API.debugInBrowserVnc = function serve(user, json, callback) {
	
	var url = json.url;
	var scriptUrl = json.scriptUrl;
	var breakPoints = json.breakPoints;
	var sourceFile = json.sourceFile;
	
	console.log("user.name=" + user.name + " requesting chromium-browser in VNC and node-inspect");
	
	parentRequest({debugInBrowserVnc: {url: url}}, function(err, resp) {
		console.log("parentRequest returned err=" + err + " resp=" + resp);
		
		if(err) return callback(err);
		
		//debugUsingChromeDebuggingProtocol(resp.chromiumDebuggerPort, url, breakPoints, sourceFile, function(err) {
		callback(err, resp);
		//});
		
	});
}

API.googleDrive = function googleDrive(user, options, callback) {
	/*
		Mount google drive
	*/
	
	parentRequest({googleDrive: options}, function(err, resp) {
		if(err) callback(err);
		else callback(err, resp);
	});
}

API.createMysqlDb = function createMysqlDb(user, options, callback) {
	
	parentRequest({createMysqlDb: options}, function(err, resp) {
		if(err) callback(err);
		else callback(err, resp);
	});
}

API.remoteFile = function remoteFile(user, options, callback) {
	parentRequest({remoteFile: options}, function(err, resp) {
		callback(err, resp);
	});
}

API.remoteFileSave = function remoteFileSave(user, options, callback) {
	parentRequest({remoteFileSave: options}, function(err, resp) {
		callback(err, resp);
	});
}

API.remotePipe = function remotePipe(user, options, callback) {
	parentRequest({pipe: options}, function(err, resp) {
		callback(err, resp);
	});
}

function nodejs_init_action(action, prodFolder, pw, callback) {
	if(action == undefined) throw new Error("action=" + action);
	if(prodFolder == undefined) throw new Error("prodFolder=" + prodFolder);
	if(pw == undefined) throw new Error("pw=" + pw);
	if(callback == undefined) throw new Error("callback=" + callback);
	
	var http = require("http");
	var options = {
		auth: user.name + ":" + pw,
		hostname: "127.0.0.1",
		port: nodejsDeamonManagerPort,
		path: prodFolder + "?" + action
	};
	log("Connecting to " + options.hostname + " port=" + options.port + " path=" + options.path + " ...", DEBUG);
	httpGet(options, function nodejsInitActionCommand(err, resp) {
		if(err) {
			var error = new Error("Failed to " + action + " " + prodFolder + "\n" + err.message)
			err.code = err.code;
			return callback(error);
		}
		else {
			return callback(null, {prodFolder: prodFolder, text: resp});
		}
	});
}


function httpGet(options, callback) {
	
	var url = require('url');
	var address;
	
	if(typeof options == "string") {
		address = options;
		var parse = url.parse(address);
		options = {
			hostname: parse.host,
			port: parse.port || 80,
			path: parse.path,
		};
	}
	
	if(typeof callback != "function") throw new Error("allback function expected! callback=" + callback);
	
	options.method = "GET";
	
	if(!options.headers) options.headers = {
		"Cache-Control": "no-cache"
	}
	
	if(options.port == undefined) options.port = 80;
	
	var http = require("http");
	var req = http.request(options, function (res) {
		
		res.setEncoding('utf8');
		var rawData = '';
		res.on('data', function http_data(chunk) { rawData += chunk; });
		res.on('end', function http_req_end() {
			if(res.statusCode != 200) {
				callback(new Error("Failed to get " + options.path + " statusCode=" + res.statusCode + " data=" + rawData));
			}
			else {
				callback(null, rawData);
			}
		});
	});
	
	req.on('error', function (err) {
		callback(err);
	});
	
	req.end();
}


function installNodejsModule(filePath, moduleName, saveType, callback) {
	var fs = require("fs");
	
	if(filePath == undefined) throw new Error("filePath not defined! filePath=" + filePath);
	if(moduleName == undefined) throw new Error("moduleName not defined! moduleName=" + moduleName);
	if(saveType == undefined) throw new Error("saveType not defined! saveType=" + saveType);
	
	if(typeof callback != "function") throw new Error("Expected callback (" + typeof callback + ") to be a function!");
	
	var directory = UTIL.getDirectoryFromPath(filePath);
	var fileName = UTIL.getFilenameFromPath(filePath);
	var folderName = UTIL.getFolderName(filePath);
	npmOptions.cwd = directory;
	
	console.log("installNodejsModule: moduleName=" + moduleName + " saveType=" + saveType + " npmOptions=" + JSON.stringify(npmOptions)); 
	
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
		var arg = ["install", moduleName, saveType];
		npm(arg, function(err, stdout, stderr) {
			
			console.log("npm " + JSON.stringify(arg) + " err=" + err + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(arg));
			
			if(err) return callback(new Error("Failed to install '" + moduleName + "': " + err.message));
			
			if(stderr) {
				
				[stderr, stdout] = filterNpm(stderr, stdout);
				
				if(stderr) return callback(new Error("Problem installing '" + moduleName + "': " + stderr));
			}
			
			if(stdout) {
				user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), stdout: stdout, type: "npm"}});
			}
			
			return callback(null);
			
		});
	}
}

function filterNpm(stderr, stdout) {
	// Move non critical errors to stdout
	
	stderr = stderr.replace(/npm WARN (.*) No description/, "").trim();
	stderr = stderr.replace(/npm WARN (.*) No repository field\./, "").trim();
	stderr = stderr.replace(/npm WARN (.*) No license field\./, "").trim();
	stderr = stderr.replace(/npm notice created a lockfile as package-lock\.json\. You should commit this file\./, "").trim();
	
	// Move non errors to stdout
	cleanStdErr([
		/^\[BABEL\] Note:.*/,
		/^npm WARN.*/,
		/.*SKIPPING OPTIONAL DEPENDENCY.*/,
		/^WARN.*/
	]);
	
	stderr = stderr.replace(/^npm/, "").trim();
	
	return [stderr, stdout];
	
	function cleanStdErr(regs) {
		var match;
		for (var i=0; i<regs.length; i++) {
			while(match = stderr.match(regs[i])) {;
				stdout += match[0] + "\n";
				stderr = stderr.replace(match[0], "").trim();
			}
		}
	}
	
}

function npm(arg, extraOptions, callback) {
	// Run a NPM command
	
	if(typeof extraOptions == "function" && callback == undefined) {
		callback = extraOptions;
		extraOptions = undefined;
	}
	
	if(typeof callback != "function") throw new Error("callback need to be a function!"); // sanity
	
	if(typeof extraOptions == "object") {
		for(var name in extraOptions) {
			npmOptions[name] = extraOptions[name];
		}
	}
	
	npmOptions.execPath = USE_CHROOT ? "/usr/bin/node" : process.argv[0];
	npmOptions.silent = true // Makes us able to capture stdout and stderr, otherwise it will use our stdout and stderr
	
	// The update notifier gives spawn EACCESS because in one of those 238 files it tries to read or write to a file or folder it doesn't have access to.
	// I have not been able to figure out which one it is, just that it does a file operation and spawn pass on the error code
	arg.push("--no-update-notifier"); 
	
	//stdio: ['pipe', 'pipe', 'pipe', 'ipc']; // To be able to access stdout from npmProcess.stdout
	
	var stdout = "";
	var stderr = "";
	var npmError = null;
	
	// We hardcode the path because of Apparmor!?
	if(process.platform == "win32") { 
		var npmPath = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
		/*
			On Windows we might have to edit (as Administrator) C:\Program Files\nodejs\node_modules\npm\npmrc
			And hardcore the prefix to C:\Program Files\nodejs\node_modules\npm
			in order to prevent error: "Failed to replace env in config: ${APPDATA}"
		*/
	}
	else {
		var npmPath = "/usr/lib/node_modules/npm/bin/npm-cli.js";
	}
	
	console.log("Spawning npmPath=" + npmPath + " with arg=" + JSON.stringify(arg) + " npmOptions=" + JSON.stringify(npmOptions) + " ...");
	npmPath = (npmPath + " ").trim();
	// Use fork instead of spawn to prevent running shebang ? 
	// Nope: Fork also executes the shebang!? or does it!? todo: find out!
	var npmProcess = require('child_process').fork(npmPath, arg, npmOptions);
	
	var fakeProgressInterval = setInterval(fakeProgress, 500);
	
	npmProcess.stdout.on('data', function npmProcessStdout(data) {
		stdout += data;
		
		var incrementProgress = 1;
		var incrementProgressMax = 0;
		
		if(data.toString().match(/make:/)) incrementProgressMax += 15;
		
		user.send({progress: [incrementProgress, incrementProgressMax]});
		
		console.log("npm stdout data=" + data);
		
	});
	
	npmProcess.stderr.on('data', function npmProcessStderr(data) {
		stderr += data;
	});
	
	npmProcess.on('error', function npmProcessError(err) {
		
		npmError = err;
		
		console.log("npm error stdout=" + stdout + " stderr=" + stderr + " err.code=" + err.code);
		
		//user.send({npmProgress: {max: 1, value: 1}});
		
		if(err.code == "ENOENT") {
			/*
				
				Possible causes:
				1. It can't find /usr/bin/env 
				
			*/
			var fs = require("fs");
			
			fs.access(npmPath, fs.constants.R_OK, function (err) {
				console.log(err ? 'No Read access to ' +  npmPath: 'Got read access to ' + npmPath);
			});
			
			var folder = UTIL.getDirectoryFromPath(npmPath);
			
			fs.access(folder, fs.constants.R_OK, function (err) {
				console.log(err ? 'No Read access to ' +  folder: 'Got read access to ' + folder);
			});
			
			fs.access(npmPath, fs.constants.F_OK, function (err) {
				console.log(err ? 'No access to ' +  npmPath + " (it doesn't seem to exist)" : 'Got access to ' + npmPath + " (it exist!)");
			});
			
			fs.access(npmPath, fs.constants.X_OK, function (err) {
				console.log(err ? 'No execute access to ' +  npmPath: 'Got execute access to ' + npmPath);
			});
			
			fs.open(npmPath, 'r', (err, fd) => {
				if (err) console.log("Not able to fs.open read " + npmPath);
				else console.log("It's possible to fs.open read " + npmPath);
			});
			
			fs.stat(npmPath, function(err, stats) {
				if(err && err.code == "ENOENT") console.warn("Unable to stat (it doesn't exist): " + npmPath);
				else if(err) throw err;
				else {
					console.log(JSON.stringify(stats, null, 2));
					console.log("isBlockDevice ? " + stats.isBlockDevice());
					console.log("isCharacterDevice ? " + stats.isCharacterDevice());
					console.log("isDirectory ? " + stats.isDirectory());
					console.log("isFIFO ? " + stats.isFIFO());
					console.log("isFile ? " + stats.isFile());
					console.log("isSocket ? " + stats.isSocket());
					console.log("isSymbolicLink ? " + stats.isSymbolicLink());
				}
			});
			
			fs.readFile(npmPath, "utf8", function(err, data) {
				if(err) console.log("Not able to fs.readFile " + npmPath + " (" + err.message + ") code=" + err.code);
				else console.log("It's possible to fs.readFile " + npmPath);
			});
			
			fs.readdir(folder, function(err, files) {
				if(err) return console.log("Not able to fs.readdir " + folder + " (" + err.message + ") code=" + err.code);
				
				console.log("It's possible to fs.readdir " + folder);
				
				var exist = false;
				var fileName = UTIL.getFilenameFromPath(npmPath);
				for (var i=0; i<files.length; i++) {
					if(files[i] == fileName) {
						exist = true;
						break;
					}
				}
				
				if(exist) console.log(fileName + " exists in " + folder);
				else console.log(fileName + " does Not exists in " + folder);
			});
			
		}
		
		// We always get the close event !? Yep
		
	});
	
	npmProcess.on('close', function npmProcessClose(exitCode) {
		console.log("npm " + arg[0] + " exitCode=" + exitCode + " stdout=" + UTIL.shortString(stdout) + "stderr=" + stderr + " stderr.length=" + (stderr && stderr.length));
		if(callback) callback(npmError, stdout, stderr);
		
		clearInterval(fakeProgressInterval);
		user.send({progress: []}); // Finish
	});
	
	function fakeProgress() {
		user.send({progress: [1]});
	}
	
}


function stopNodeJsScript(filePath, callback) {
	
	console.log(user.name + " killing NodeJS script: filePath=" + filePath);
	
	if(!user.runningNodeJsScripts.hasOwnProperty(filePath)) {
		var error = new Error(filePath + " is not running");
		error.code = "NOT_RUNNING";
		return callback(error);
	}
	
	var childProcess = user.runningNodeJsScripts[filePath].childProcess;
	var inspector = user.runningNodeJsScripts[filePath].inspector;
	
	if(inspector) inspector.stop();
	
	// Give it a chance to teardown before killing it
	childProcess.kill('SIGTERM');
	childProcess.kill('SIGINT');
	if(process.platform != "win32") childProcess.kill('SIGQUIT'); // Node.JS on Windows will throw "Unknown signal: SIGQUIT"
	if(process.platform != "win32") childProcess.kill('SIGHUP'); // Node.JS on Windows will throw "Error: kill ENOSYS""
	
	// Give the other kill signals a chance before sending final kill signal
	var killTimeout = setTimeout(function kill() {
		// Now kill it for good
		childProcess.kill('SIGKILL');
		if(childProcess.connected) childProcess.disconnect();
		setTimeout(function wait() {
			// Make sure it has exited
			if(user.runningNodeJsScripts.hasOwnProperty(filePath)) throw new Error("Script should not be running: " + filePath);
			callback(null);
		}, 300);
	}, 3000);
	
	setTimeout(function checkIfStillRunning() {
		// Check if it has exited
		if(!user.runningNodeJsScripts.hasOwnProperty(filePath)) {
			//clearTimeout(signalTimeout);
			clearTimeout(killTimeout);
			if(childProcess.connected) childProcess.disconnect();
			callback(null);
		}
	}, 500);
	
}

function runNodeJsScript(filePath, args, installAllModules, debugit, callback) {
	
	if(args == undefined) args = "";
	if(typeof args != "string") throw new Error("args=" + args + " (" + (typeof args) + ") need to be a string!");
	
	var directory = UTIL.getDirectoryFromPath(filePath);
	
	var inspectorPort = 9229;
	var packageJsonExist = false;
	var scriptFilePath = filePath;
	/*
		Clean up .tmp files when nodejs script exit !?
		Keep them in case we need to debug.
	*/
	
	var fs = require("fs");
	
	var rootFolder;
	
	
	findRootFolder(directory);
	
	
	function installDependencies(directory) {
		console.log("installDependencies: directory=" + directory);
		
		if(!directory) return askForDebugPort();
		
		// Only run npm install if node_modules are missing!
		fs.readdir(directory + "node_modules/", function(err, files) {
			if((err && err.code == "ENOENT") || (!err && files.length > 0)) {
				return askForDebugPort();
			}
			else if(err) return callback(err);
			else {
				fs.readFile(directory + "package.json", "utf-8", function(err, packageTxt) {
					if(err) {
						if(err.code == "ENOENT") {
							packageJsonExist = false;
							return askForDebugPort();
						}
						else return callback(err);
					}
					else {
						try {
							var packageObj = JSON.parse(packageTxt);
						}
						catch(parseError) {
							packageJsonExist = false;
							return askForDebugPort();
						}
						
						// Estimate progress
						user.send({progress: [1, Object.keys(packageObj.dependencies).length*2]});
						
						// package.json was found. Lets make sure dependencies exist
						var execFile = require('child_process').execFile;
						var arg = ["install", "--no-progress", "--no-audit"];
						npm(arg, {cwd: directory}, function (err, stdout, stderr) {
							
							user.send({progress: []}); // Finish progress
							
							console.log("npm install err=" + err + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(arg));
							
							if(err) return callback(new Error("Failed to install dependencies: " + err.message));
							
							if(stderr) {
								
								[stderr, stdout] = filterNpm(stderr, stdout);
								
								
								if(stderr) return callback(new Error("Problem installing modules/dependencies': " + stderr));
							}
							
							stdout = stdout.replace(/up to date in [0-9.]*s/, "").trim();
							stdout = stdout.replace(/found 0 vulnerabilities/, "").trim();
							stdout = stdout.replace(/audited (.*) (package|packages) in (.*)/, "").trim();
							
							
							if(stdout) {
								stdout += "\n"; // Re-add the new line after running trim()
								user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), stdout: stdout, type: "npm"}});
							}
							
							packageJsonExist = true;
							askForDebugPort();
							
						});
					}
				});
			}
		});
	}
	
	
	function findRootFolder(directory) {
		console.log("findRootFolder: directory=" + directory);
		/*
			Check for package.json or .hg or .git
		*/
		
		var fs = require("fs");
		fs.readdir(directory, function readdir(err, folderItems) {
			if(err) return callback(err);
			
			// folderItems is name of files and folders
			for (var i=0; i<folderItems.length; i++) {
				if(folderItems[i] == "package.json") {
					packageJsonExist = true;
					rootFolder = directory;
				}
				else if(folderItems[i] == ".hg" || folderItems[i] == ".git") {
					rootFolder = directory;
				}
			}
			
			if(rootFolder) {
				installDependencies(rootFolder);
			}
			else {
				var folders = UTIL.getFolders(directory);
				
				if(folders.length > 1) {
					findRootFolder(folders[folders.length-2]);
				}
				else installDependencies();
			}
		});
	}
	
	function askForDebugPort() {
		if(debugit) {
			parentRequest({tcpPort: 1024}, function(err, port) {
				console.log("parentRequest returned err=" + err + " port=" + port);
				
				if(err) return callback(err);
				
				inspectorPort = port;
				
				if(!inspectorPort) throw new Error("Did not get a tcp port from the parent process! port=" + port);
				
				runIt();
			});
		}
		else runIt()
	}
	
	function runIt() {
		
		console.log(user.name + " starting NodeJS script: filePath=" + filePath);
		
		var fileName = UTIL.getFilenameFromPath(filePath);
		var nodeScript;
		var nodeScriptArgs = args.split(" ");
		
		if(USE_CHROOT) {
			var nodejsPath = "/usr/bin/node";
		}
		else {
			var nodejsPath = process.argv[0]; // First argument is the path to the nodejs executable!
		}
		
		var nodeScriptOptions = {
			execPath: nodejsPath, 
			cwd: directory,
			env: {
				myName: user.name,
				dev: true,
				tld: TLD,
				PATH: "/usr/bin:/bin"
			},
			silent: true // Makes it possible to capture stdout and stderr, otherwise it will use this process's stdout and stderr
		};
		
		if(debugit) {
			var inspectStr = "--inspect-brk=" + inspectorPort;
			if(nodeScriptOptions.execArgv) nodeScriptOptions.execArgv.unshift(inspectStr);
			else nodeScriptOptions.execArgv = [inspectStr];
		}
		
		if(rootFolder && USE_CHROOT) {
			nodeScriptOptions.env.PORT = "/sock/" + UTIL.getFolderName(rootFolder);
		}
		
		start();
		
		
		function start() {
			var child_process = require("child_process");
			console.log("Forking " + scriptFilePath + " ...");
			console.log("nodeScriptArgs=" + JSON.stringify(nodeScriptArgs) + "");
			console.log("nodeScriptOptions=" + JSON.stringify(nodeScriptOptions));
			
			if(USE_CHROOT) {
				// Watch for new unix named pipes (unix sockets) so we can delete them when the script stops
				var fs = require("fs");
				var sockWatcher = fs.watch('/sock/', sockEvent);
				var createdSockets = [];
			}
			
			nodeScript = child_process.fork(scriptFilePath, nodeScriptArgs, nodeScriptOptions);
			// The node worker will chroot to user's home dir, setegid and seteuid ????? HUH ?
			
			nodeScript.on("message", messageFromNodeScript);
			nodeScript.on("error", nodeScriptError);
			nodeScript.on("close", nodejScriptClose); // Use close instead of exit, becuase it will not exit if it fails to start (but will always close)
			
			nodeScript.stdout.on('data', nodejsScriptStdout);
			nodeScript.stderr.on('data', nodejsScriptStderr);
			
			// note: The worker process will not close/exit (unless there's an error) if it has to listen for messages from parent
			
			user.runningNodeJsScripts[filePath] = {childProcess: nodeScript, isDebugger: debugit, sockWatcher: sockWatcher, createdSockets: createdSockets};
			
			callback(null, {filePath: filePath});
			
			
			function sockEvent(eventType, filename) {
				// filename is just the file name, not the whole path!
				console.log("sockEvent: eventType=" + eventType + " filename=" + filename);
				if(!filename) console.warn("sockEvent: eventType=" + eventType + " filename=" + filename);
				else {
createdSockets.push("/sock/" + filename);
					// Always use http: just in case the SSL registration failed (even though it will result in an additional roundtrip)
					user.send({nodejsUrl: {url: "http://" + filename + "." + user.name + "." + TLD, scriptName: user.toVirtualPath(filePath)}});
					
				}
			}
		}
		
		function messageFromNodeScript(message, handle) {
			console.log(user.name + ":" + filePath + ":message: message=" + message + " handle=" + handle);
			console.log(message);
			user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), ICP: message}});
		}
		
		function nodejScriptClose(code, signal) {
			console.log(user.name + ":" + filePath + ":close: code=" + code + " signal=" + signal);
			
			var script = user.runningNodeJsScripts[filePath];
			
			if(script.createdSockets) script.createdSockets.forEach(deleteFile); // Delete so user wont get "address in use" error next time the script is run
			if(script.sockWatcher) script.sockWatcher.close(); // Stop watching for changes!
			if(script.inspector) script.inspector.stop(); // Stop the inspector client
			
			delete user.runningNodeJsScripts[filePath];
			
			user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), close: {code: code, signal: signal}}});
			
			function deleteFile(filePath) {
				var fs = require("fs");
				fs.unlink(filePath, function localFileDeleted(err) {
					if(err) console.warn("Failed to delete unix named pipe (socket): filePath=" + filePath);
				});
			}
		}
		
		function nodeScriptError(err) {
			console.log(user.name + " nodejs script error: err=" + err);
			
			// Note: There will be no exit event if nodejs fail to start! So we'll listen for close instead, which will always fire, even if it fails to start.
			
			console.log("err.code=" + err.code);
			console.log("err.message=" + err.message);
			
			if(err.message == "spawn /usr/bin/node ENOENT") user.send("Failed to start nodejs. Contact system administrator.");
			
			//user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), error: err.message}});
		}
		
		function stdin(text) {
			console.log(user.name + ":" + filePath + ":stdin: " + text);
			
			nodeScript.stdin.write(text + "\n");
		}
		
		function nodejsScriptStdout(data) {
			var text = data.toString("utf8");
			console.log(user.name + ":" + filePath + ":stdout: " + UTIL.lbChars(text) + "");
			
			user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), stdout: text}});
		}
		
		function nodejsScriptStderr(data) {
			
			var stderr = data.toString("utf8");
			
			console.log(user.name + ":" + filePath + ":stderr: " + debugText(stderr) + " (" + (typeof data) + ") =  " + data + "");
			
			if(debugit) {
				
				// Ignore debugger messages
				if(stderr == "Debugger attached.\n") return; 
				
				if(stderr == "Waiting for the debugger to disconnect...\n") {
					if( user.runningNodeJsScripts[filePath].inspector ) user.runningNodeJsScripts[filePath].inspector.stop();
					return;
				}
				
				
				// Check for debugger url
				// Debugger listening on ws://127.0.0.1:1030/3ad4f49d-215f-40b7-b85a-1fd27c0bd0e5
				var matchDebugger = stderr.match(/Debugger listening on ([^\n]*)/);
				if(matchDebugger) {
					var debuggerUrl = matchDebugger[1];
					user.runningNodeJsScripts[filePath].inspector = createInspector(debuggerUrl);
					return; // Don't send the message to the user
				}
			}
			
			var matchModuleError = stderr.match(/Error: Cannot find module '(.*)'/);
			
			if(matchModuleError) {
				
				if(installAllModules) {
					// Try to install the module and run the script again
					installNodejsModule(filePath, matchModuleError[1], "--save", function(err) {
						if(err) user.send(err.message);
						else {
							
							if(user.runningNodeJsScripts.hasOwnProperty(filePath)) stopNodeJsScript(filePath, function scriptStopped(err) {
								if(err) console.log(err.message); // Means the script was already stopped.
								runNodeJsScript(filePath, args, installAllModules, debugit, function(err) {
									if(err) user.send(err.message);
								});
							})
							
						}
					});
					
				}
				else {
					user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), cannotFindModule: matchModuleError[1]}});
				}
			}
			
			user.send({nodejsMessage: {scriptName: user.toVirtualPath(filePath), stderr: stderr}});
		}
	}
}

function createInspector(url) {
	
	var ws = new module_Websocket(url);
	var reqId = 0;
	
	ws.on('open', function wsOpen() {
		req("Runtime.enable");
		req("Runtime.runIfWaitingForDebugger");
	});
	
	ws.on('close', function wsClose(code, reason) {
		console.log("wsClose: code=" + code + " reason=" + reason);
	});
	
	ws.on('error', function wsError(err, code, reason) {
		console.log("wsError: code=" + code + " reason=" + reason);
	});
	
	ws.on('message', function wsMessage(data) {
		console.log("wsMessage: data=" + data);
		
		try {
			var json = JSON.parse(data);
		}
		catch(err) {
			console.warn("Failed to parse (" + err.message + "): " + data);
			return;
		}
		
		var method = json.method;
		
		if(json.error) {
			return console.warn( "Inspector error: \n" + JSON.stringify(json, null, 2) );
		}
		
		if(method=="Runtime.consoleAPICalled") {
			var strings = [];
			var args = json.params.args;
			for (var i=0; i<args.length; i++) {
				if(args[i].hasOwnProperty("value")) strings.push( string(args[i].value) );
				else if( args[i].type=="object" && args[i].preview) {
					strings.push( getProps( args[i].preview.properties ) );
				}
			}
			
			var text = strings.join(" ");
			
			user.send({
				nodejsDebug: {
					console: {
						type: json.params.type, 
						msg: text,
						stack: json.params.stackTrace
					}
				} 
			});
		}
		
		function getProps(prop) {
			var str = "{";
			for (var i=0; i<prop.length; i++) {
				str = str + prop[i].name + ": ";
				
				if( prop[i].type == "string") str = str + '"' + prop[i].value + '"';
				else str = str + prop[i].value
				
				str += ", ";
			}
			
			str = str.slice(0, -2) + "}";
			
			return str;
		}
		
	});
	
	function string(x) {
		return JSON.stringify(x);
	}
	
	function req(method, params) {
		if(ws.readyState != ws.OPEN) return console.warn("Winsocket not open! Unable to send req: method=" + method + " params=" + params);
		
		var json = {
			id: ++reqId,
			method: method,
		}
		
		if(params) json.params = params;
		
		var data = JSON.stringify(json);
		
		ws.send(data);
	}
	
	var inspector = {
		stop: function stop() {
			// Check to avoaid Error: WebSocket is not open: readyState 2 (CLOSING)
			if(ws.readyState != ws.CLOSING && ws.readyState != ws.CLOSED) ws.close();
		},
		setBreakPoint: function breakpoint() {
		}
	}
	
	return inspector;
}





function parentRequest(req, callback) {
	
	var id = ++parentRequestId;
	
	process.send({id: id, request: req});
	parentRequestCallback[id] = callback;
}

function debugText(text) {
	var d = "";
	for (var i=0, c; i<text.length; i++) {
		c = text.charCodeAt(i);
		if(c==0) d += "NUL";
		else if(c==1) d += "SOH";
		else if(c==2) d += "STX";
		else if(c==3) d += "ETX";
		else if(c==4) d += "EOT";
		else if(c==5) d += "ENQ";
		else if(c==6) d += "ACK";
		else if(c==7) d += "BEL";
		else if(c==8) d += "BS";
		else if(c==9) d += "HT";
		else if(c==10) d += "LF";
		else if(c==11) d += "VT";
		else if(c==12) d += "FF";
		else if(c==13) d += "CR";
		else if(c==14) d += "SO";
		else if(c==15) d += "SI";
		else if(c==16) d += "DLE";
		else if(c==17) d += "DC1";
		else if(c==18) d += "DC2";
		else if(c==19) d += "DC3";
		else if(c==20) d += "DC4";
		else if(c==21) d += "NAK";
		else if(c==22) d += "SYN";
		else if(c==23) d += "ETB";
		else if(c==24) d += "CAN";
		else if(c==25) d += "EM";
		else if(c==26) d += "SUB";
		else if(c==27) d += "ESC";
		else if(c==28) d += "FS";
		else if(c==29) d += "GS";
		else if(c==30) d += "RS";
		else if(c==31) d += "US";
		else if(c>=32 && c<=126) d += text.charAt(i);
		else if(c==127) d += "DEL";
		
		else if(c==160) d += "SPACE";
		else if(c>=161 && c<=255) d += text.charAt(i);
		else d += "_" + c + "_";
	}
	
	return d;
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
