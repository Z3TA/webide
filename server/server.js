#!/usr/bin/env node

var UTIL = require("../client/UTIL.js");

var GS = String.fromCharCode(29);
var APC = String.fromCharCode(159);

var API = require("./server_api.js");

/*

API.foo = require("server_plugin/foo.js");
API.bar = require("server_plugin/bar.js"); 

todo: Make it possible to call server method foo.baz so you can group many server api's under the same namespace

*/

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
		
		log(IP + " => " + message);
		
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
			
			if(!user) {
				
				console.log("json=" + JSON.stringify(json));
				
				if(command != "identify") commandQueue.push(message); // The user is trying to send a command before authorized
				else identify(json, IP, function(err, usr) {
					if(err) {
						log(err);
						send({error: err.message});
						//connection.close();
					}
					else {
						user = usr;
						
						userConnectionId = user.connected(connection);
						
						user.IP = IP;
						
						send({resp: {user: user.name, cId: userConnectionId}})
						
						/*
						setTimeout(function() {
							user.send({resp: {
								test: {foo: 1, bar: 2}
							}});
							
						}, 3000);
						*/
						
						for(var i=0; i<commandQueue.length; i++) {
							handle(commandQueue[i]);
						}
						commandQueue.length = 0;
					}
				});
				
			}
			else {
				
				if( !API.hasOwnProperty(command) ) return send({error: "Unknown command=" + command + ": " + message});
				
				var funToRun = API[command];
				
				funToRun(user, json, function(err, answer) {
					if(err) {
						log(err + err.stack);
						
						send({error: "API error: " + err.message + ""});
						//send({error: "API error (" + err.message + "): " + message});
					}
					else {
						send({resp: answer});
					}
				}, userConnectionId);
				
			}
			
			function send(answer) {
				
				answer.id = id;
				
				var str = JSON.stringify(answer);
				log(IP + " <= " + str);
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
				test = row[i].split("|");
				if(test[0] == json.username && test[1] == json.password) userOK(i, test[0], test[2]);
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
	
	if(rootPath) { // Use "true" path
		var path = require("path");
		rootPath = path.resolve(rootPath);
		rootPath = UTIL.trailingSlash(rootPath);
	}
	
	user.rootPath = rootPath;
	
	if(user.rootPath) user.defaultWorkingDirectory = "/";
	else user.defaultWorkingDirectory = UTIL.trailingSlash(process.cwd());
	user.workingDirectory = user.defaultWorkingDirectory;
	
	user.storageFile = user.translatePath(user.defaultWorkingDirectory) + ".localStorage";
	
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
	
	if(user.rootPath) {
		var url = require("url");
		var path = require("path");
		
		var parse = url.parse(pathToFileOrDir);
		
		if(REMOTE_PROTOCOLS.indexOf(parse.protocol) != -1) return pathToFileOrDir;
		
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
	else return pathToFileOrDir;
}

User.prototype.toVirtualPath = function toVirtualPath(realPath) {
	var user = this;
	
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
	var storageFile = user.storageFile;
	
	console.log("Reading storage file for user=" + user.name + " in location: " + storageFile);
	fs.readFile(storageFile, "utf8", function(err, data) {
		if(err) {
			if(err.code == "ENOENT") {
				
				user.storage = {};
				console.log("Creating storage file for user=" + user.name + " in location: " + storageFile);
				fs.writeFile(storageFile, "{}", function(err) {
					if(err) {
						callback(new Error("Unable to retrieve storage! Error: " + err.message));
						throw err;
					}
					else callback(null, user.storage);
					
				}); 
				
			}
			else {
				callback(new Error("Unable to retrieve storage! Error: " + err.message));
				throw err;
			}
		}
		else {
			try {
				user.storage = JSON.parse(data);
			}
			catch(err) {
				callback(new Error("Unable to retrieve storage! Error: " + err.message));
				throw new Error("Unable to parse storage data for user=" + user.name + "\nstorageFile: " + storageFile + "\nParse error: " + err.message);
			}
			
			return callback(null, user.storage);
		
		}			
		
	});
}

User.prototype.saveStorage = function saveStorage(callback) {
	var user = this;
	
	var fs = require("fs");
	
	fs.writeFile(user.storageFile, JSON.stringify(user.storage, null, 2), function(err) {
		if(err) {
			callback(new Error("Unable to save storage! Error: " + err.message));
			throw err;
		}
		callback(null, {storage: JSON.stringify(user.storage)});
		
	}); 
}


function isObject(obj) {
	return obj === Object(obj);
}

main();
