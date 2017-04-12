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
API.mercurial = require("./plugin/mercurial.js");



var REMOTE_PROTOCOLS = ["ftp", "ftps", "sftp"]; // Supported remote connections

var CONNECTED_USERS = {};

var HTTP_SERVER;

// On some systems (Mac) you need elevated privilege (sudo) to listen to ports below 1024
// Use -p 8099 or --port 8099 as start arguments to listen to port 8099 instead of port 80
var HTTP_PORT = getArg(["p", "port"]) || 80; 

process.on("SIGINT", function sigInt() {
	log("Received SIGINT");

	HTTP_SERVER.close();
	
	process.exit();

});

process.on("exit", function () {
	log("Program exit\n\n");
});
	
function main() {
	
	var sockJs = require("sockjs");
	var wsServer = sockJs.createServer();
	wsServer.on("connection", sockJsConnection);

	var http = require("http");
	
	HTTP_SERVER = http.createServer(handleHttpRequest);
	HTTP_SERVER.listen(HTTP_PORT);

	wsServer.installHandlers(HTTP_SERVER, {prefix:'/jzedit'});

	console.log("Editor server url: " + makeUrl());
	
	// Open client url in browser !?
	
}

function getArg(word) {
	
	/*
		Searches the process arguments for 
		ex: word = ["p", "papa", "pap"];
		
		-p 123 
		--papa 123 
		--pap 123
		--papa=123 
		--pap=123
	*/
	
	var args = process.argv.join(" ");
	
	if(typeof word == "string") {
		word = [word];
	}
	
	if(word.length == 0) throw new Error("Need at least one word to find an argument!");
	
	var regexStr = "(-" + word[0];
	for(var i=1; i<word.length; i++) regexStr += "|--" + word[i] + "=?";
	regexStr += ")\\s?([^-\\s]+)?"
	
	console.log("regexStr=" + regexStr);
	
	var argReg = new RegExp(regexStr, "i");
	
	var match = args.match(argReg);
	console.log("match=" + JSON.stringify(match));
	if(match !== null) {
		console.log("match.length=" + match.length);
		var value = match[match.length-1];
		console.log("value=" + value);
		if(value === undefined) return true;
		else return value;
	}
	else return undefined;
	
}


function sockJsConnection(connection) {
	
	var user = null;
	var userConnectionId = -1;
	var IP = connection.remoteAddress;
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	
	console.log("connection.remoteAddress=" + connection.remoteAddress);
	
	console.log(connection);
	
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
					for(var i=0; i<commands.length; i++) {
						if(funToRun.hasOwnProperty(commands[i])) funToRun = funToRun[commands[i]];
						else return send({error: "Unknown command=" + command + ": " + message});
					}
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
				
				while(user.isSavingStorage.indexOf(itemName) != -1) user.isSavingStorage.splice(user.isSavingStorage.indexOf(itemName), 1);
				log("Done saving storage item=" + itemName + " for user=" + user.name);
				
			});

		});
	});
}


User.prototype.removeStorageItem = function saveStorage(itemName, callback) {
	var user = this;
	
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

function isObject(obj) {
	return obj === Object(obj);
}


API.serve = function serve(user, json, callback) {
	
	// Serve a folder via HTTP
	
	var folder = user.translatePath(json.folder);
	
	console.log("user.name=" + user.name + " serving folder=" + folder);
	
	createHttpEndpoint(folder, user, function(err, url) {
		callback(err, {url: url});
	});
	
}



var httpEndpoints = {};
var httpServer;

var mimeMap = {
	css: "text/css",
	doc: "application/msword",
	exe: "application/octet-stream",
	gif: "image/gif",
	gz: "application/x-gzip",
	html: "text/html",
	htm: "text/html",	
	jpg: "image/jpeg",
	js: "application/x-javascript",
	midi: "audio/x-midi",
	mp3: "audio/mpeg",
	mpeg: "video/mpeg",
	ogg: "audio/vorbis",
	pdf: "application/pdf",
	png: "image/png",
	ppt: "application/vnd.ms-powerpoint",
	svg: "image/svg+xml",
	"tar.gz": "application/x-tar",
	tgz: "application/x-tar",
	txt: "text/plain",
	wav: "audio/wav",
	xls: "application/vnd.ms-excel",
	xml: "application/xml",
	zip: "application/x-compressed-zip",
	ico: "image/x-icon",
	ttf: "application/octet-stream"
}

function createHttpEndpoint(folder, user, callback) {
	
	for(var dir in httpEndpoints) {
		if(httpEndpoints[dir] == folder) {
			return callback(null, makeUrl(dir));
		}
	}
	
	var dir = randomString(10);
	
	httpEndpoints[dir] = folder;
	
	callback(null, makeUrl(dir));
}


function handleHttpRequest(request, response){
	
	
	var IP = request.headers["x-real-ip"] || request.connection.remoteAddress;
	var urlPath = UTIL.getPathFromUrl(request.url);
	
	console.log("HTTP request from IP=" + IP + " urlPath=" + urlPath + " request.url=" + request.url + " host=" + request.headers.host);
	
	var dirs = urlPath.split("/");
	
	var firstDir = dirs[0] || dirs[1]; // Urls usually start with an /
	
	var path = require("path");

	var folder;
	var localFolder;
	
	if(httpEndpoints.hasOwnProperty(firstDir)) {
		
		localFolder = httpEndpoints[firstDir];
		urlPath = urlPath.replace(firstDir + "/", "");

	}
	else {
		// Serve from the jzedit client folder
		
		if(urlPath == "/" || urlPath == "") urlPath = "/index.htm";
		
		localFolder = path.resolve("../client/");
		
		/*
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("Unknown endpoint: '" + firstDir + "' of " + urlPath);
		return;
		*/
		
	}
	
	console.log("localFolder=" + localFolder);
	console.log("urlPath=" + urlPath);
	
	
	if(urlPath == "") {
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("No file in url: " + urlPath);
		return;
	}
	
	
	var filePath = path.join(localFolder, urlPath);
	
	if(filePath.indexOf(localFolder) != 0) {
		console.log("filePath=" + filePath);
		console.log("localFolder=" + localFolder);
		console.log("urlPath=" + urlPath);
		
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("Bad path: " + urlPath);
		return;
	}

	
	var fileExtension = UTIL.getFileExtension(urlPath);
	
	if(fileExtension && !mimeMap.hasOwnProperty(fileExtension)) {
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("Bad file type: '" + fileExtension + "'");
		
		console.warn("Unknown mime type: fileExtension=" + fileExtension);
		
		return;
	}
	
	var fs = require("fs");
	
	var stat = fs.stat(filePath, function(err, stats) {
		
		if(err) {
			
			response.writeHead(404, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			
			if(err.code == "ENOENT") {
				//var virtualPath = user.toVirtualPath(filePath);
				//response.end("File not found: " + virtualPath);
				
				response.end("File not found: " + filePath);
				
				console.warn("File not found: " + filePath);
				
			}
			else {
				response.end(err.message);
			}
			
			
		}
		else if(stats == undefined) throw new Error("No stats!");
		else if(!stats.isFile()) {
			
			response.writeHead(404, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("Not a file: " + filePath);
			
		}
		else {
			response.writeHead(200, {
				'Content-Type': mimeMap[fileExtension],
				'Content-Length': stats.size
			});
			
			var readStream = fs.createReadStream(filePath);
			readStream.pipe(response);
			
		}
		
	});


}


function makeUrl(dir) {
	
	if(!HTTP_SERVER) throw new Error("No HTTP_SERVER available!");
	if(!HTTP_SERVER.address) {
		console.log(HTTP_SERVER);
		throw new Error("HTTP_SERVER has no address property!");
	}
	
	var address = HTTP_SERVER.address();
	
	
	var port = address ? address.port : HTTP_PORT;
	
	
	// Find servers IP
	var ipList = [];
	var os = require('os');
	var ifaces = os.networkInterfaces();

	Object.keys(ifaces).forEach(function (ifname) {
	  var alias = 0;

	  ifaces[ifname].forEach(function (iface) {
		if ('IPv4' !== iface.family || iface.internal !== false) {
		  // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
		  return;
		}

		if (alias >= 1) {
		  // this single interface has multiple ipv4 addresses
		  console.log(ifname + ':' + alias, iface.address);
		} else {
		  // this interface has only one ipv4 adress
		  console.log(ifname, iface.address);
		}
		++alias;
		
		ipList.push(iface.address);
		
	  });
	});
	
	
	
	//console.log(address);
	console.log("ipList=" + JSON.stringify(ipList));
	
	var url = "http://" + ipList[0];
	
	if(port != 80) url += ":" + port;
	
	url += "/";
	
	if(dir) url += dir + "/";
	
	
	return url;
}

function randomString(letters) {
	
	if(letters == undefined) letters = 5;
	
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for( var i=0; i < letters; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}


main();
