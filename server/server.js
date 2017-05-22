#!/usr/bin/env node

"use strict";

var getArg = require("./getArg.js");

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number


// Log levels
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var log; // Using small caps because it looks and feels better
(function setLogginModule() { // Self calling function to not clutter script scope
	// Enhanced console.log ...
	var logModule = require("./log.js");

	logModule.setLogLevel(LOGLEVEL);
	log = logModule.log;

	var logFile = getArg(["lf", "logfile"]) || null; // default: Write to stdout, if specified write to a file

	if(logFile) logModule.setLogFile(logFile);

})();


(function() {
  // Make sure we are in the server directory
  var dir = process.cwd();
  var folders = dir.split(/\/|\\/);
  var lastFolder = folders[folders.length-1];
  
  //console.log('Starting directory: ' + dir + " lastFolder=" + lastFolder);
  
  if(lastFolder == "jzedit") {
    try {
      process.chdir('./server');
      //console.log('New directory: ' + process.cwd());
    }
    catch (err) {
      console.log('chdir: ' + err);
    }
  }
})();



var CURRENT_USER = "ROOT";

var USERNAME = getArg(["u", "user", "username"]);
var PASSWORD = getArg(["pw", "pw", "password"]);

if(USERNAME && !PASSWORD) {
	// Ask for password ...
}


var NOUID = getArg(["nouid"]) || false; // Use -nouid to allow users without a uid specified

var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || "./users.pw";

var UTIL = require("../client/UTIL.js");

var GS = String.fromCharCode(29);
var APC = String.fromCharCode(159);



var USER_CONNECTIONS = {}; // username: {connections: [], counter: 0}

var HTTP_SERVER;

// On some systems (Mac) you need elevated privilege (sudo) to listen to ports below 1024
// Use -p 8099 or --port 8099 as start arguments to listen to port 8099 instead of port 80
var HTTP_PORT = getArg(["p", "port"]) || 80; 
if(!isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))


// Use -ip "::" or -ip "0.0.0.0" to make it listen on unspecified addresses.
var HTTP_IP = getArg(["ip", "ip"]) || "127.0.0.1";






process.on("SIGINT", function sigInt() {
	log("Received SIGINT");

	HTTP_SERVER.close();
	
	process.exit();

});

process.on("exit", function () {
	log("Program exit\n\n", 6, true);
});

function main() {


	// Get the current user (who runs this server)
	var os = require("os");
	var info = os.userInfo ? os.userInfo() : {username: "ROOT"};
	var env = process.env;

	CURRENT_USER = env.SUDO_USER ||	env.LOGNAME || env.USER || env.LNAME ||	env.USERNAME || info.username;

	log("Server running as user=" + CURRENT_USER);

	if(info.uid < 0) log("RUNNING IN INSECURE OPERATING SYSTEM\nThe editor will not be able to isolate users.\nMake sure you trust all users.", 4);





	var sockJs = require("sockjs");
	var wsServer = sockJs.createServer();
	wsServer.on("connection", sockJsConnection);

	var http = require("http");
	
	HTTP_SERVER = http.createServer(handleHttpRequest);
	
	HTTP_SERVER.on("error", function(err) {
		console.log("err.code=" + err.code);
		if(err.code == "EACCES") {
			log("Unable to create server on port=" + HTTP_PORT + " and ip=" + HTTP_IP + "\nUse -p or --port to use another port.\nOr try with a privileged (sudo) user account.", 5, true);
			process.exit();
		}
		else throw err;
	});

	if(isIpV4(HTTP_IP)) {
		if(!isPrivatev4IP(HTTP_IP)) log("NOT A PRIVATE IP=" + HTTP_IP, 4);
	}
	else log("Not a IPv4 address");


	HTTP_SERVER.listen(HTTP_PORT, HTTP_IP);


	wsServer.installHandlers(HTTP_SERVER, {prefix:'/jzedit'});

	var serverAdvertiseMessage = "jzedit server url: " + makeUrl();
	
	log(serverAdvertiseMessage, 6);
	
	// Open client url in browser !?

	if(HTTP_IP != "127.0.0.1") {
		(function broadcast(myIp) {

			// Listen to and answer broadcast messages
			// http://stackoverflow.com/questions/6177423/send-broadcast-datagram
			
			var broadcastAddresses = [];
			
			var broadcastPort = 6024;
			
			if(myIp == "0.0.0.0") {
				// We'll have to find all broadcast addresses ...
				var os = require('os');
				
				var interfaces = os.networkInterfaces();
				var addresses = [];
				for (var k in interfaces) {
					for (var k2 in interfaces[k]) {
						var address = interfaces[k][k2];
						if (address.family === 'IPv4' && !address.internal && isPrivatev4IP(address.address)) {
							broadcastAddresses.push(broadcastAddress(address.address));
						}
					}
				}
			}
			else broadcastAddresses.push(broadcastAddress(myIp));
			
			console.log("broadcastAddresses: ", broadcastAddresses);
			
			var dgram = require('dgram');
			
			// Server
			var broadcastServer = dgram.createSocket("udp4");
			broadcastServer.bind(function() {
				broadcastServer.setBroadcast(true);
				// We must send at least one broadcast message to be able to receive messages!
				for(var i=0; i<broadcastAddresses.length; i++) setAdvertiseInterval(broadcastAddresses[i]);
			});

			// Client
			var broadcastClient = dgram.createSocket('udp4');

			broadcastClient.on('listening', function () {
				var address = broadcastClient.address();
				console.log('UDP Client listening on ' + address.address + ":" + address.port);
				broadcastClient.setBroadcast(true);
			});

			broadcastClient.on('message', function (message, rinfo) {
				console.log('Message from: ' + rinfo.address + ':' + rinfo.port +' - ' + message);
				
				var lookForServerMessage = "Where can I find a jzedit server?"
			
				if(rinfo.address != myIp && message == lookForServerMessage) advertise(rinfo.address);
				
			});

			broadcastClient.bind(broadcastPort);
			
			function setAdvertiseInterval(broadcastAddress) {
				// We need to keep sending messages, or we will not receive any!
				setInterval(function() {
					advertise(broadcastAddress, broadcastServer);
				}, 4500); // Need to send often (every 4500ms) to be able to receive messages
			}
			
			function advertise(broadcastAddress) {
				var message = new Buffer(serverAdvertiseMessage);
				broadcastClient.send(message, 0, message.length, broadcastPort, broadcastAddress, function() {
					console.log("Sent '" + message + "'");
				});
			}
			
			function broadcastAddress(ip) {
				// Asume 255.255.255.0 netmask
				var arr = ip.split(".");
				arr[3] = "255";
				return arr.join(".");
			}

		})(HTTP_IP);
	}
	
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function isIpV4(ip) {
	if(ip.match(/^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}$/)) return true;
	else return false; 
}

function isPrivatev4IP(ip) {
   var parts = ip.split('.');
   return parts[0] === '10' || parts[0] === '127' ||
	  (parts[0] === '172' && (parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) || 
	  (parts[0] === '192' && parts[1] === '168');
}


function sockJsConnection(connection) {
	
	var userWorker = null;
	var userName = null;
	var userConnectionId = -1;
	var IP = connection.remoteAddress;
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	
	console.log("connection.remoteAddress=" + connection.remoteAddress);
	
	//console.log(connection);
	
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
			
			console.log("connection.headers=" + JSON.stringify(connection.headers));
			
			var xRealIp = connection.headers["x-real-ip"]; // X-Real-IP  x-real-ip

			if(xRealIp == undefined) {
				log("Unable to get IP address from x-real-ip headers", DEBUG);
			}

		}
	}
	
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
			
			if(!userWorker) {
				
				//console.log("json=" + JSON.stringify(json));
				
				if(command != "identify") {
					console.log("Adding Command '" + command + "' to command queue because client has not yet identified");
					commandQueue.push(message);
				}
				else {
					
					// # Identify

					(function checkUser(username, password) {
						
						if(USERNAME) {
							console.log("Using USERNAME=" + USERNAME+ " from argument ...")
							if(USERNAME == username && PASSWORD == password) userOK(0, USERNAME, true);
							else {
								console.log("'" + USERNAME + "' != '" + username + "' or '" + PASSWORD + "' != '" + password + "'");
								wrongPw();
							}
						}
						else {
							console.log("Using PW_FILE=" + PW_FILE + " ...");
							var fs = require("fs");
							fs.readFile(PW_FILE, "utf8", function(err, data) {
								if(err) throw err;
								
								var row = data.trim().split(/\r|\r\n/);
								
								console.log("Loaded " + PW_FILE + " (" + row.length + " users found)");
								
								// format: username|password|rootDir|uid|gid

								for(var i=0, test, hasPw, hasUid, pUser, pPass, pRootDir, pUid, pGid; i<row.length; i++) {
									test = row[i].trim().split("|");

									pUser = test[0];
									pPass = test[1];
									pRootDir = test[2];
									pUid = test[3];
									pGid = test[4];

									hasPw = pPass ? pPass.length > 0 : false;
									hasUid = pUid ? pUid.length > 0 : false;

									if(pUser == username && pPass == password) {
										
										if(!hasUid && !NOUID) {
											throw new Error("user=" + pUser + " in " + PW_FILE + " has no uid! (uid=" + pUid + ")\nIngore this check by adding -nouid to the arguments.");
										}
										userOK(i, pUser, hasPw, pRootDir, pUid, pGid);
									}
									else console.log("Not " + pUser);
									// Check all to prevent timing attack (no break or return)
								}
								
								if(!userName) wrongPw();

							});
						}

						function wrongPw() {
							var errorMsg = "Wrong username=" + username + " or password";
							if(USERNAME) errorMsg += "(Username specified in server arguments)";
							send({error: errorMsg});
						}

						function userOK(index, name, hasPassword, rootPath, uid, gid) {
							
							userName = name;

							if(uid != undefined) {

								var fs = require("fs");

								fs.readFile("/etc/passwd", "utf8", gotMoreUserInfo);

								function gotMoreUserInfo(err, etcPasswd) {
									
									if(err) {
										console.warn("Unable to read /etc/passwd !");
										throw new Error("Unable to read /etc/passwd to check uid=" + uid + " matching");
									}
									else {
										// format: testuser2:x:1001:1001:Test user 2,,,:/home/testuser2:/bin/bash
										var rows = etcPasswd.trim().split("\n");

										for(var i=0, row; i<rows.length; i++) {
											row = rows[i].trim().split(":");
											if(foundUserIn(row)) return;
										}

										throw new Error("Unable to find user name=" + name + " or uid=" + uid + " in /etc/passwd");

									}

									function foundUserIn(row) {
										var pName = row[0];
										var pUid = row[2];
										var pGid = row[3];
										var pDir = row[5];
										var pShell = row[6];

										var found = false;
										if(pName == name) {
											console.log("Found name=" + name + " in /etc/passwd");
											if(pUid != uid) throw new Error("name=" + name + " does not match uid=" + uid + " with pUid=" + pUid);
											found = true;
										}
										else if(pUid == uid) {
											console.log("Found uid=" + uid + " in /etc/passwd");
											if(pName != name) throw new Error("uid=" + uid + " does not match name=" + name + " with pName=" + pName);
											found = true;
										}

										if(found) {
											acceptUser(pDir, pShell);
											return true;
										}
										else return false;
									}

								}
							}
							else {
								

								acceptUser();
							}

							function acceptUser(homeDir, shell) {
								

								if(gid == undefined) gid = uid;

								if(!USER_CONNECTIONS.hasOwnProperty(name)) {
									USER_CONNECTIONS[name] = {
										connections: [connection],
										counter: 0
									}
									userConnectionId = 0;
								}
								else {
									USER_CONNECTIONS[name].connections.push(connection);
									userConnectionId = ++USER_CONNECTIONS[name].counter;
								}

								userWorker = createUserWorker(name, uid, gid)

								var userInfo = {id: index, name: name, rootPath: rootPath, homeDir: homeDir, shell: shell};

								log("User name=" + name + " logged in! " + JSON.stringify(userInfo));

								userWorker.send({identify: userInfo});
								
								userWorker.on("message", function messageFromWorker(workerMessage, handle) {
									console.log("Worker message from " + name + ": " + shortString(workerMessage) + " handle=" + handle);

									if(workerMessage.resp || workerMessage.error) send(workerMessage);
									else if(workerMessage.message) {
										for(var conn in USER_CONNECTIONS[name].connections) {
											send(workerMessage.message, conn);
										}
									}
									else if(workerMessage.request) {
										// For special functionality ...

										var id = workerMessage.id;
										var req = workerMessage.request;

										if(id == undefined) throw new Error("Got worker request without a id! id=" + id);

										if(req.createHttpEndpoint) {

											createHttpEndpoint(req.createHttpEndpoint.folder, function(err, url) {
												if(err) throw err;
												workerResp(req, {url: url})

											});

										}
										else throw new Error("Unknown request from worker: " + JSON.stringify(req, null, 2));

									}
									else throw new Error("Bad message from worker: workerMessage=" + JSON.stringify(workerMessage, null, 2));
									
									function workerResp(req, resp) {
										if(id == undefined) throw new Error("id=" + id);
										userWorker.send({id: id, parentResponse: resp});
									}

								});
								
								/*
								setTimeout(function() {
									user.send({resp: {
										test: {foo: 1, bar: 2}
									}});
									
								}, 3000);
								*/
								
								console.log("userConnectionId=" + userConnectionId);

								send({resp: {loginSuccess: {user: userName, cId: userConnectionId}}});

								if(commandQueue.length > 0) {
									console.log("Running " + commandQueue.length + " commands from the command queue ...");
									for(var i=0; i<commandQueue.length; i++) {
										handle(commandQueue[i]);
									}
									commandQueue.length = 0;
								}

								return true;
							}
						}

					})(json.username, json.password);


				}
			}
			else {
				
				userWorker.send({commands: {command: command, json: json, id: id}});
				
			}
			
			function send(answer, conn) {
				
				if(conn == undefined) conn = connection;

				if(answer.id == undefined) answer.id = id;

				var str = JSON.stringify(answer);
				
				log(IP + " => " + shortString(str));
				
				conn.write(str);
			}
		}

	});

	connection.on("close", function() {
		
		log("Closed " + protocol + " from " + IP);
		
		if(userWorker) {
			
			USER_CONNECTIONS[userName].connections.splice(USER_CONNECTIONS[userName].connections.indexOf(connection), 1);

			if(USER_CONNECTIONS[userName].connections.length === 0) {
				userWorker.send({teardown: true}); // Worker should be exiting ...
				delete USER_CONNECTIONS[userName];
			}

		}

	});
	
}


function shortString(stringOrObject, limit) {
	if(limit == undefined) limit = 100;

	var str = (typeof stringOrObject == "object") ? JSON.stringify(stringOrObject) : stringOrObject; 

	if(str.length > limit) str = str.substr(0,limit) + " ... (" + str.length + " characters)";
	
	return str;
}

// Overload console.log 
console.log = function() {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	log(msg, 7);
}

// Overload console.warn
console.warn = function() {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	log(msg, 4);
}


function isObject(obj) {
	return obj === Object(obj);
}

/*
API.serve = function serve(user, json, callback) {
	
	// Serve a folder via HTTP
	
	var folder = user.translatePath(json.folder);
	
	console.log("user.name=" + user.name + " serving folder=" + folder);
	
	createHttpEndpoint(folder, function(err, url) {
		if(err) throw err;
		callback(err, {url: url});
	});
	
}
*/


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

function createHttpEndpoint(folder, callback) {
	
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
	
	
	var port = HTTP_PORT;

	if(address) { // Sanity check
		if(address.port) {
			if(address.port != HTTP_PORT) throw new Error("address.port=" + address.port + " is not the same as HTTP_PORT=" + HTTP_PORT);
		}

	}

	
	var ip = HTTP_IP;
	if(ip == "0.0.0.0" || ip == "::") {
		// Find servers IP
		var ipList = [];
		var os = require('os');
		var ifaces = os.networkInterfaces();
		log("Listening IP's:", 7);
		Object.keys(ifaces).forEach(function (ifname) {
		  var alias = 0;

		  ifaces[ifname].forEach(function (iface) {
			if ('IPv4' !== iface.family || iface.internal !== false) {
			  // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
			  log(ifname + "=" + iface.address + " (internal)", 7);
			  return;
			}

			if (alias >= 1) {
			  // this single interface has multiple ipv4 addresses
			  log(ifname + '=' + alias + ", " + iface.address, 7);
			} else {
			  // this interface has only one ipv4 adress
			  log(ifname + "=" + iface.address, 7);
			}
			++alias;
			
			ipList.push(iface.address);
			
		  });
		});
		
		ip = ipList[0];
	}
		
	//console.log(address);
	//console.log("ipList=" + JSON.stringify(ipList));
	
	var url = "http://" + ip;
	
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

function createUserWorker(name, uid, gid) {
	var childProcess = require("child_process");


	// You can have different group and user. Default is the user/group running the node process
	var options = {};
	var args = ["--loglevel=" + LOGLEVEL];

	if(uid != undefined) options.uid = parseInt(uid);
	if(gid != undefined) options.gid = parseInt(gid);

	if((uid == undefined || uid == -1)) {
		log("No uid specified!\nUSER WILL RUN AS username=" + CURRENT_USER, WARN);
	}

	log("Spawning worker name=" + name + " uid=" + uid + " gid=" + gid, DEBUG);

	try {
		var worker = childProcess.fork("user_worker.js", args, options);
	}
	catch(err) {
		if(err.code == "EPERM") {
			if(uid != undefined) log("Unable to spawn worker with uid=" + uid + " and gid=" + gid + ".\nTry running the server with a privileged (sudo) user.", NOTICE);
			throw new Error("Unable to spawn worker! (" + err.message + ")");
		}
		else throw err;
	}

	worker.on("close", function workerClose(code, signal) {
		console.log(name + " worker close: code=" + code + " signal=" + signal);
	});

	worker.on("disconnect", function workerDisconnect() {
		console.log(name + " worker disconnect: worker.connected=" + worker.connected);
	});

	worker.on("error", function workerClose(err) {
		console.log(name + " worker error: err.message=" + err.message);
	});

	worker.on("exit", function workerExit(code, signal) {
		console.log(name + " worker exit: code=" + code + " signal=" + signal);
	});


	return worker;

}

main();
