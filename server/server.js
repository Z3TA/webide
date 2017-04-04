#!/usr/bin/env node

(function() {
  // Make sure we are in the server directory
  var dir = process.cwd();
  var folders = dir.split(/\/|\\/);
  var lastFolder = folders[folders.length-1];
  
  console.log('Starting directory: ' + dir + " lastFolder=" + lastFolder);
  
  if(lastFolder == "jzedit") {
    try {
      process.chdir('./server');
      console.log('New directory: ' + process.cwd());
    }
    catch (err) {
      console.log('chdir: ' + err);
    }
  }
  


})();






var UTIL = require("../client/UTIL.js");

var GS = String.fromCharCode(29);
var APC = String.fromCharCode(159);

var API = require("./server_api.js");


// Server plugin API's
API.SSG = require("./plugin/static_site_generator/ssg-api.js");



var REMOTE_PROTOCOLS = ["ftp", "ftps", "sftp"]; // Supported remote connections

var CONNECTED_USERS = {};

function main() {

	var port = 8099;

	var sockJs = require("sockjs");
	var wsServer = sockJs.createServer();
	wsServer.on("connection", connection);

	var http = require("http");
	var httpServer = http.createServer();
	httpServer.listen(port);
		wsServer.installHandlers(httpServer, {prefix:'/jzedit'});

	process.on("exit", function () {
	log("Program exit\n\n");
	});

	process.on("SIGINT", function sigInt() {
	log("Received SIGINT");

	httpServer.close();
		
		process.exit();

});

}


function connection(connection) {
	
	var user = null;
	var userConnectionId = -1;
	var IP = connection.remoteAddress;
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	
	console.log("connection.remoteAddress=" + connection.remoteAddress);
	
	if(IP == undefined) {
		// Maybe because the user is connecting via HTTP instead of Websockets!?
		IP = connection.headers["x-real-ip"];
		//console.log(JSON.stringify(connection.headers, null, 2));
	}
	else {
		// Update: nginx gives ::ffff:127.0.0.1 !!!?
		var ipLength = IP.length;
		var nginxIP = "127.0.0.1";
		
		if(IP.substring(ipLength - nginxIP.length) == "127.0.0.1") {
			// From nginx
			
			console.log( JSON.stringify(connection.headers));
			
			IP = connection.headers["x-real-ip"]; // X-Real-IP  x-real-ip
			
		}
	}
	
	if(IP == undefined) console.warn("Unable to get IP address from x-real-ip headers");
	
	log("Connection on " + protocol + " from " + IP);
	
	/*
		
		Everything sent must be commands.
		If not identified/logged in, commands will be queued
		
	*/
	
	connection.on("data", function(message) {
		
		if(message.length > 100) log(IP + " => " + message.substr(0,100) + " ... (" + message.length + " characters)");
		else log(IP + " => " + message);
		
		handle(message);
		
		function handle(message) { // A function so it can call itself from the queue
			
			if(message.indexOf(GS) == -1) {
				return send({error: "Not a proper jzedit command (does not contain " + GS + " separator) : " + message});
			}
			
			var json;
			var arr = message.split(GS);
			var id = arr[0];
			var command = arr[1];
			
			if(isNaN(parseInt(id))) return send({msg: "id=" + id + " is not an integer: " + message});
			
			if(arr.length >= 3) {
				try {
					json = JSON.parse(arr[2]);
				}
				catch(err) {
					return send({error: "Failed to parse JSON (" + err.message + "): " + message});
				}
			}
			
			console.log("The command queue has " + commandQueue.length + " items.");
			
			if(!user) {
				
				//console.log("json=" + JSON.stringify(json));
				
				if(command != "identify") {
					console.log("Adding Command '" + command + "' to command queue because client has not yet identified");
					commandQueue.push(message);
				}
				else identify(json, IP, function(err, usr) {
					if(err) {
						log(err);
						send({error: err.message, resp: {loginFail: err.message}});
						//connection.close();
					}
					else {
						user = usr;
						
						userConnectionId = user.connected(connection);
						
						user.IP = IP;
						
						send({resp: {loginSuccess: {user: user.name, cId: userConnectionId}}});
						
						/*
						setTimeout(function() {
							user.send({resp: {
								test: {foo: 1, bar: 2}
							}});
							
						}, 3000);
						*/
						
						console.log("Running " + commandQueue.length + " commands from the command queue ...");
						for(var i=0; i<commandQueue.length; i++) {
							handle(commandQueue[i]);
						}
						commandQueue.length = 0;
						
					}
				});
				
			}
			else {
				
				var commands = command.split(".");
				
				var funToRun;
				
				if(commands.length > 1) {
					// foo.bar.baz
					funToRun = API;
					for(var i=0; i<commands.length; i++) funToRun = funToRun[commands[i]];

				}
				else {
					if( !API.hasOwnProperty(command) ) return send({error: "Unknown command=" + command + ": " + message});
					
					funToRun = API[command];

				}
				
				if (typeof funToRun !== "function") {
					send({error: "API error: Unknown command=" + command});
				}
				else {
					funToRun(user, json, function(err, answer) {
						if(err) {
							log(err);
							
							if(!err.stack) console.trace("Stack ...")
							else log(err.stack);
							
							send({error: "API error: " + err.message + ""});
							//send({error: "API error (" + err.message + "): " + message});
						}
						else {
							send({resp: answer});
						}
					}, userConnectionId);
				}
				
			}
			
			function send(answer) {
				
				answer.id = id;
				
				var str = JSON.stringify(answer);
				
				if(str.length > 100) log(IP + " <= " + str.substr(0,100) + " ... (" + str.length + " characters)");
				else log(IP + " => " + str);
				
				connection.write(str);
			}
		}
		
		
		
	});
	connection.on("close", function() {
		
		log("Closed " + protocol + " from " + IP);
		
		if(user) {
			
			var connections = user.disconnected(userConnectionId);
			
			if(connections === 0) delete CONNECTED_USERS[user.name];
		}

	});
	
}


function identify(json, IP, callback) {
	
	// Do not put this into the API because it would be weird handling user id
	
	if(json.hasOwnProperty("username") && json.hasOwnProperty("password")) {
		var fs = require("fs");
		
		fs.readFile("users.pw", "utf8", function(err, data) {
			if(err) throw err;
			
			var row = data.split(/\r|\r\n/);
			
			var user;
			
			for(var i=0, test; i<row.length; i++) {
				test = row[i].trim().split("|");
				if(test[0] == json.username && test[1] == json.password) userOK(i, test[0], test[2]);
				else console.log("Not " + test[0]);
				// Check all to prevent timing attack
			}
			
			if(user) callback(null, user);
			else callback(new Error("Wrong username=" + json.username + " or password"));
			
			function userOK(index, name, dir) {
				
				if(!CONNECTED_USERS.hasOwnProperty(name)) {
					CONNECTED_USERS[name] = new User(index, name, dir);
				}
				
				user = CONNECTED_USERS[name];
			}
			
		});
		
	}
	else {
		callback(new Error("Identify with username and password"));
	}
	
}


function log(msg) {
	
	console.log(myDate() + " " + msg);
	
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


function User(id, name, rootPath) {
	var user = this;
	
	log("Creating NEW user session! name=" + name);
	
	user.id = id;
	user.name = name;
	user.remoteConnections = {};
	user.clientConnections = {}; // A user can be connected from many places
	user.storage = null;
	user.connectionId = 0;
	user.isSavingStorage = [];
	
	if(rootPath) { // Use "true" path
		var path = require("path");
		rootPath = path.resolve(rootPath);
		rootPath = UTIL.trailingSlash(rootPath);
	}
	
	user.rootPath = rootPath;
	
	var path = require("path");
	
	if(user.rootPath) user.defaultWorkingDirectory = "/";
	else {
		
		var editorDir = path.resolve("./../");
		
		user.defaultWorkingDirectory = UTIL.trailingSlash(editorDir);
	
	}
	
	user.workingDirectory = user.defaultWorkingDirectory;
	
	user.storageDir = user.translatePath(user.defaultWorkingDirectory + ".editorStorage" + path.sep) ;
	
	console.log(user.name + " workingDirectory=" + user.workingDirectory);
	
}

User.prototype.connected = function connected(connection) {
	var user = this;

	user.connectionId++;
	
	user.clientConnections[user.connectionId] = connection;
	
	log("Connected connectionId=" + user.connectionId + " to user.name=" + user.name);
	
	return user.connectionId;
}

User.prototype.disconnected = function disconnected(connectionId) {
	var user = this;
	
	delete user.clientConnections[connectionId];
	
	var connections = Object.keys(user.clientConnections).length;
	
	if(connections === 0) user.teardown();
	
	return connections;
	
}

User.prototype.teardown = function teardown(msg) {
	var user = this;
	
	// Disconnect from remote servers etc ...
}

User.prototype.send = function send(msg) {
	var user = this;
	
	if(!isObject(msg)) {
		msg = {msg: msg};
	}
	
	var str = JSON.stringify(msg);
	
	var msgSent = false;
	
	for(var connectionId in user.clientConnections) {
		log(user.name + " (" + connectionId + ") <= " + str);
		user.clientConnections[connectionId].write(str);
		msgSent = true;
	}
	
	if(!msgSent) {
		console.warn("No user.name=" + user.name + " clients connected! Unable to send msg:\n" + JSON.stringify(msg, null, 2) );
	}
	
}


User.prototype.changeWorkingDir = function changeWorkingDir(path) {
	var user = this;
	
	user.workingDirectory = path;
	
	return user.workingDirectory;
}

User.prototype.remoteConnectionClosed = function remoteConnectionClosed(protocol, serverAddress) {
	var user = this;
	
	// Notify the client about closed connection
	user.send({resp: {
		connectionClosed: {protocol: protocol, serverAddress: serverAddress}
	}});
	
	delete user.remoteConnections[serverAddress]; // Remove the connection
	
}

User.prototype.translatePath = function translatePath(pathToFileOrDir) {
	var user = this;

	// Translates a virtual path to a real file-system path

	console.log(user.name + " translatePath=" + pathToFileOrDir);
	
	pathToFileOrDir = UTIL.removeFileColonSlashSlash(pathToFileOrDir);

	if(user.rootPath) {
		var url = require("url");
		var path = require("path");
		
		var parse = url.parse(pathToFileOrDir);
		
		console.log(parse);
		
		var protocol = parse.protocol ? parse.protocol.toLowerCase() : "LOCAL:";
		protocol = protocol.substring(0, protocol.length-1); // Remove colon: 
		
		console.log("protocol=" + protocol + " indexOf [" + REMOTE_PROTOCOLS.join(",") + "] = " + REMOTE_PROTOCOLS.indexOf(protocol));
		
		if(REMOTE_PROTOCOLS.indexOf(protocol) != -1) return pathToFileOrDir;
		
		// else: The protocol is not allowed or its a local path
		
		
		var lastCharOfPath = pathToFileOrDir.charAt(pathToFileOrDir.length-1);
		
		var isDirectory = (lastCharOfPath == "/" || lastCharOfPath == "\\");

		
		parse = path.parse(pathToFileOrDir);
		
		var pathToFileOrDirWithoutRoot = pathToFileOrDir.replace(parse.root, "");
		
		var translatedPath = path.join(user.rootPath, pathToFileOrDirWithoutRoot);
		
		translatedPath = path.resolve(translatedPath);
		
		if(translatedPath == path.resolve("users.pw")) {
			console.warn("User name=" + user.name + " is accessing users.pw");
		}
		
		if(isDirectory) translatedPath = UTIL.trailingSlash(translatedPath);
		
		console.log("translatedPath=" + translatedPath);
		
		// Make sure virutal path is in user.rootPath
		if(translatedPath.indexOf(user.rootPath) != 0) {
			console.warn("translatedPath=" + translatedPath + " does not contain user.rootPath=" + user.rootPath);
			return new Error("Unable to access path=" + pathToFileOrDir);
		}
		else return translatedPath;
		
	}
	else {
		console.log("No need to translate (no rootPath)");
		return pathToFileOrDir;
	}
}

User.prototype.toVirtualPath = function toVirtualPath(realPath) {
	var user = this;
	
	console.log(user.name + " toVirtualPath realPath=" + realPath);
	
	if(!user.rootPath) {
		console.log("No need to translate (no rootPath)");
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

	
	console.log("virtualPath=" + virtualPath);
	
	return virtualPath;
	
}


User.prototype.loadStorage = function loadStorage(callback) {
	var user = this;
	
	// callback storage as a object

	var fs = require("fs");
	var filesRead = 0;
	
	log("Reading storage files for user=" + user.name + " in directory: " + user.storageDir);
	
	if(!user.storageDir.match(/\/|\\$/)) throw new Error("Does not end with a slash: user.storageDir=" + user.storageDir);
	
	if(user.isSavingStorage.length > 0) {
		callback(new Error("Can not retrieve the storage while " + JSON.stringify(user.isSavingStorage) + " is being saved!"));
		throw new Error("Can not read the storage when it's being saved! user.isSavingStorage=" + JSON.stringify(user.isSavingStorage));
	}
	
	fs.readdir(user.storageDir, function readingStorageDir(err, files) {
		
		if(Object.prototype.toString.call( files ) !== '[object Array]') throw new Error("Expected files to be an Array!");

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
		
		user.storage = {};
		
		if(files.length > 0)  {
			for(var i=0; i<files.length; i++) loadItem(files[i]);
		}
		else {
			callback(null, user.storage);
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

User.prototype.saveStorageItem = function saveStorage(itemName, callback) {
	var user = this;
	
	log("Saving storage item=" + itemName + " for user=" + user.name + " ...");
	
	var fs = require("fs");
	
	var storageString = user.storage[itemName];
	
	// The storage might change while waiting for the file system!!!
	
	if(user.isSavingStorage.indexOf(itemName) != -1) {
		console.warn("USER " + user.name + " IS CURRENTLY SAVING itemName=" + itemName);
		return callback(new Error("Please wait until " + itemName + " has been saved!"));
	}
	
	user.isSavingStorage.push(itemName);
	
	var filePath = user.storageDir + encodeURIComponent(itemName);
	
	console.log("Creating backup of filePath=" + filePath);
	fs.rename(filePath, filePath + ".backup", function backedUpStorage(err) {
		
		if(err) {
			
			if(err.code != "ENOENT") {
				callback(new Error("Not possible to backup " + itemName + " when saving! Error: " + err.message));
				throw err;
			}
			// else: Just create the file if it doesn't exist
		}
		
		console.log("Saving data to filePath=" + filePath);
		fs.writeFile(filePath, storageString, function writeStorage(err) {
			if(err) {
				callback(new Error("Unable to save storage item=" + itemName + " ! Error: " + err.message));
				throw err;
			}
			
			// Some times the file gets corrupt! No idea why. Check if it's corrupt ...
			console.log("Reading to check for errors: filePath=" + filePath);
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
				
				user.isSavingStorage.splice(user.isSavingStorage.indexOf(itemName), 1);
				log("Done saving storage item=" + itemName + " for user=" + user.name);
				
			});

		});
	});
}


User.prototype.removeStorageItem = function saveStorage(itemName, callback) {
	var user = this;
	
	var fs = require("fs");
	
	var filePath = user.storageDir + itemName;
	
	user.isSavingStorage.push(itemName);
	
	fs.unlink(filePath, function storageItemFileDeleted(err) {
		if(err) {
			callback(err);
			throw err;
		}
		else {
			
			user.isSavingStorage.splice(user.isSavingStorage.indexOf(itemName), 1);
			
			callback(null);
		}
	});
	
}

function isObject(obj) {
	return obj === Object(obj);
}

main();
