/*



*/

"use strict";

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




var USE_CHROOT = getArg(["chroot", "chroot"]) || false;

var isRoot = process.getuid && process.getuid() === 0;

if(isRoot && !USE_CHROOT) throw new Error("Can not run worker process as superuser unless chroot flag is used!")

if(USE_CHROOT) {
	/* Change root ...
	posix seem to need node module version 48? 46? See: https://nodejs.org/en/download/releases/
		nvm install or nvm use (the version you want)
		npm rebuild
		
		The idea with chroot is that we do not have to translate paths to virtual root.
		But when running with chroot we are not able to spawn any processes!!
		
	*/
	var posix = require("posix");
	var username = getArg(["u", "user", "username"]);
	var uid = parseInt(getArg(["uid", "uid"]));
	var gid = parseInt(getArg(["gid", "gid"]));
	posix.chroot('/home/' + username);
	posix.setegid(gid);
	posix.seteuid(uid);
	
	
	//var chroot = require("chroot");
	//chroot("/home/" + username + "/", username);
	
}

// Set default file permissions
var newmask = parseInt("0027", 8); // four digits, last three mask, ex: 0o027 ==> 750 file permissions
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
	
	user.workingDirectory = user.defaultWorkingDirectory;
	
	user.storageDir = user.translatePath(user.defaultWorkingDirectory + ".editorStorage" + path.sep) ;
	
	console.log("Identified as user.name=" + user.name + " workingDirectory=" + user.workingDirectory);
	
}

user.teardown = function teardown(msg) {
	
	// Disconnect from remote servers etc ...
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

	var fs = require("fs");
	var filesRead = 0;
	
	console.log("Reading storage files for user=" + user.name + " in directory: " + user.storageDir);
	
	if(!user.storageDir.match(/\/|\\$/)) throw new Error("Does not end with a slash: user.storageDir=" + user.storageDir);
	
	if(user.isSavingStorage.length > 0) {
		callback(new Error("Can not retrieve the storage while " + JSON.stringify(user.isSavingStorage) + " is being saved!"));
		throw new Error("Can not read the storage when it's being saved! user.isSavingStorage=" + JSON.stringify(user.isSavingStorage));
	}
	
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
	else if(message.parentResponse) {
		var id = message.id;
		var resp = message.parentResponse;

		if(parentRequestCallback.hasOwnProperty(id)) {
			parentRequestCallback[id](null, resp);
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



// ## Special API's ...

API.serve = function serve(user, json, callback) {
	
	// Serve a folder via HTTP
	
	var folder = user.translatePath(json.folder);
	
	console.log("user.name=" + user.name + " serving folder=" + folder);
	
	parentRequest({createHttpEndpoint: {folder: folder}}, function(err, resp) {
		callback(err, {url: resp.url});
	});
	
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
