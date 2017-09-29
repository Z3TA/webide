#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var getArg = require("./getArg.js");

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number

var CRAZY = getArg(["crazy", "crazy"]); // If specified in arguments, allows user workers to run as root

var UTIL = require("../client/UTIL.js");

var HTTP_ENDPOINTS = {};
var defaultHomeDir = "/home/";
var HOME_DIR = getArg(["h", "homedir"]) || defaultHomeDir;
if(HOME_DIR != defaultHomeDir) HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter


var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var NO_CHROOT = !!(getArg(["nochroot", "nochroot"]) || false);

var NODE_INIT = {}; // username:childProcess, list of nodejs initors

var DISPLAY_ID = 0; // Counter of visual displays

var VNC_CHANNEL = {}; // displayId: {proxy: http-proxy, name: username}

	
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
	
	
	// Use -nouid to allow users without a uid specified
	// Windows can not set uid, so don't bother checking if users have uid specified
	var NOUID = getArg(["nouid"]) || (process.platform == "win32"); 
	
	var defaultPasswordFile = process.platform == "win32" ? "./users.pw" : "/etc/jzedit_users"
	var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;
	
	
	
	var GS = String.fromCharCode(29);
	var APC = String.fromCharCode(159);
	
	
	
	var USER_CONNECTIONS = {}; // username: {connections: [], counter: 0}
	
	var HTTP_SERVER;
	
	// Use -ip "::" or -ip "0.0.0.0" to make it listen on unspecified addresses.
	var HTTP_IP = getArg(["ip", "ip"]) || "127.0.0.1";
	
	// On some systems (Mac) you need elevated privilege (sudo) to listen to ports below 1024
	var HTTP_PORT = getArg(["p", "port"]) || 8099; 
	if(!UTIL.isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))
	
	// For generating URL's
	var PUBLIC_PORT = getArg(["pp", "public_port"]) || HTTP_PORT; // Server might run on localhost behind a proxy sunch as nginx
	var HOSTNAME = getArg(["host", "host", "hostname"]) || HTTP_IP; // Same as "server_name" in nginx profile or "VirtualHost" on other web servers
	
var CHROMIUM_DEBUG_PORT = 9222;
var VNC_PORT = 5901;

var PORTS_IN_USE = [HTTP_PORT];

	process.on("SIGINT", function sigInt() {
		log("Received SIGINT");
		
		HTTP_SERVER.close();
		
	for(var displayId in VNC_CHANNEL) stopVncChannel(displayId);
	
	
		process.exit();
		
	});
	
	process.on("exit", function () {
		log("Program exit\n\n", 6, true);
	});
	
	function main() {
		
		
		// Get the current user (who runs this server)
		var os = require("os");
		var info = os.userInfo ? os.userInfo() : {username: "ROOT", uid: process.geteuid()};
		var env = process.env;
		
		CURRENT_USER = env.SUDO_USER ||	env.LOGNAME || env.USER || env.LNAME ||	env.USERNAME || info.username;
		
		log("Server running as user=" + CURRENT_USER);
		
		if(info.uid < 0) log("RUNNING IN INSECURE OPERATING SYSTEM\nThe editor will not be able to isolate users.\nMake sure you trust all users.", 4);
		
		if(info.uid !== 0 && !USERNAME && !NO_CHROOT) {
			log("You need to start the server with a previleged user (using sudo) or root account.", 5);
			log(info);
			process.exit();
		}
		
		
		
		var sockJs = require("sockjs");
		var wsServer = sockJs.createServer();
		wsServer.on("connection", sockJsConnection);
		
		var http = require("http");
		
		HTTP_SERVER = http.createServer(handleHttpRequest);
		
		HTTP_SERVER.on("error", function(err) {
			console.log("err.code=" + err.code);
			if(err.code == "EACCES") {
				log("Unable to create server on port=" + HTTP_PORT + " and ip=" + HTTP_IP + "\nUse -p or --port to use another port.\nOr try with a privileged (sudo) user account.", 5, true);
				process.exit(1);
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
		
		log(serverAdvertiseMessage);
		
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
				else if(isPrivatev4IP(myIp)) broadcastAddresses.push(broadcastAddress(myIp));
				
				if(broadcastAddresses.length > 0) {
					
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
				}
				
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
		
		
		if(!USERNAME && 1==2) {
			// Start a nodejs worker/init script for each user
			var username = "test123";
			var nodeWorkerArgs = [];
			var nodeWorkerOptions = {
				cwd: "/home/" + username,
				env: {username: username},
				execPath: "/usr/bin/nodejs_" + username
			};
			
			NODE_INIT["test123"] = child_process.fork("./node_init.js", nodeWorkerArgs, nodeWorkerOptions);
		}
		
		
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
		var awaitingMessagesFromWorker = {};
		
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
		
		connection.on("data", function sockJsMessage(message) {
			
			if(message.length > 100) log(IP + " => " + message.substr(0,100) + " ... (" + message.length + " characters)");
			else log(IP + " => " + message);
			
			handle(message);
			
			function handle(message) { // A function so it can call itself from the queue
				
				if(message.indexOf(GS) == -1) {
					return send({error: "Command does not contain " + GS + " separator : " + message});
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
						//console.log("Adding Command '" + command + "' to command queue because client has not yet identified");
						//commandQueue.push(message);
						
						send({error: "You need to login!", resp: {loginNeeded: command}});
						
					}
					else {
						
						// # Identify
						
						(function checkUser(username, password) {
							
							if(USERNAME) {
								console.log("Using USERNAME=" + USERNAME+ " from argument ...")
								
								// Use CURRENT_USER instead of USERNAME as username to prevent issies with /home/username
								if(USERNAME == username && PASSWORD == password) userOK(0, CURRENT_USER, true);
								else {
									console.log("'" + USERNAME + "' != '" + username + "' or '" + PASSWORD + "' != '" + password + "'");
									wrongPw();
								}
							}
							else {
								console.log("Using PW_FILE=" + PW_FILE + " ...");
								var fs = require("fs");
								fs.readFile(PW_FILE, "utf8", function(err, data) {
									if(err) {
										if(err.code == "ENOEND") {
											log("Could not find PW_FILE=" + PW_FILE + " ... Add users by running ./adduser.js user pw", NOTICE);
										}
										else throw err;
									}
									//console.log("data=" + data);
									//console.log("data.trim()=" + data.trim());
									//console.log("data.trim().split()=" + JSON.stringify(data.trim().split(/\n|\r\n/)));
									
									var row = data.trim().split(/\n|\r\n/);
									
									console.log("Loaded " + PW_FILE + " (" + row.length + " users found)");
									
									if(!NO_PW_HASH) {
										var pwHash = require("./pwHash.js");
										password = pwHash(password);
									}
									
									// format: username|password|rootDir|uid|gid
									
									// note: usernames can not contain |
									
									for(var i=0, test, hasPw, hasUid, pUser, pPass, pRootDir, pUid, pGid; i<row.length; i++) {
										test = row[i].trim().split("|");
										
										pUser = test[0];
										
										if(pUser.charAt(0) == "#") continue; // Ignore users who's username starts with #
										
										pPass = test[1];
										pRootDir = test[2];
										pUid = test[3];
										pGid = test[4];
										
										hasPw = pPass ? pPass.length > 0 : false;
										hasUid = pUid ? pUid.length > 0 : false;
										
										if(pUser == username && pPass == password) {
											console.log("username and passwords match user=" + pUser);
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
								
								log("username=" + username + " failed to login! Check if the password='" + password + "' in " + PW_FILE + " match and the user exist. If the passwords are not hashed, start the server with argument -nopwhash", NOTICE);
							}
							
							function userOK(index, name, hasPassword, rootPath, uid, gid) {
								
								userName = name;
								
								if(uid != undefined) {
									
									var fs = require("fs");
									
									fs.readFile("/etc/passwd", "utf8", gotMoreUserInfo);
									
									function gotMoreUserInfo(err, etcPasswd) {
										
										if(err) {
											console.warn("Unable to read /etc/passwd !");
											throw new Error("Unable to read /etc/passwd to check uid=" + uid + " matching: " + err.message);
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
								else if(USERNAME && NO_CHROOT) {
									// Running as standalone desktop app
									var homeDir = process.env.HOME || process.env.USERPROFILE;
									if(homeDir) homeDir = UTIL.trailingSlash(homeDir);
									acceptUser(homeDir);
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
									
									userWorker = createUserWorker(name, uid, gid);
									
									var userInfo = {id: index, name: name, rootPath: rootPath, homeDir: homeDir, shell: shell};
									
									log("User name=" + name + " logged in! userConnectionId=" + userConnectionId + " userInfo=" + JSON.stringify(userInfo));
									
									userWorker.send({identify: userInfo});
									userWorker.on("message", messageFromWorker);
									userWorker.on("exit", workerExitHandler);
									
									/*
										setTimeout(function() {
										user.send({resp: {
										test: {foo: 1, bar: 2}
										}});
										
										}, 3000);
									*/
									
									console.log("userConnectionId=" + userConnectionId);
									
									var installDirectory = "/";
									
									if(NO_CHROOT) installDirectory = __dirname.replace(/\/server$/, "/");
									else log("name=" + name + " NO_CHROOT=" + NO_CHROOT);
									
									send({resp: {loginSuccess: {user: userName, cId: userConnectionId, installDirectory: installDirectory}}});
									
									if(commandQueue.length > 0) {
										console.log("Running " + commandQueue.length + " commands from the command queue ...");
										for(var i=0; i<commandQueue.length; i++) {
											handle(commandQueue[i]);
										}
										commandQueue.length = 0;
									}
									
									return true;
									
									function messageFromWorker(workerMessage, handle) {
										console.log("Worker message from " + name + ": " + UTIL.shortString(workerMessage) + " handle=" + handle);
										
										if(workerMessage.resp || workerMessage.error) send(workerMessage);
										else if(workerMessage.message) {
											if(USER_CONNECTIONS.hasOwnProperty(name)) {
												for (var i=0, conn; i<USER_CONNECTIONS[name].connections.length; i++) {
													send(workerMessage.message, USER_CONNECTIONS[name].connections[i]);
												}
											}
										}
										else if(workerMessage.done) { // Not used! Saved if we need it in the future
											if(awaitingMessagesFromWorker.hasOwnProperty(workerMessage.done)) {
												awaitingMessagesFromWorker[workerMessage.done]();
											}
										}
										else if(workerMessage.request) {
											// For special functionality ...
											
											var id = workerMessage.id;
											var req = workerMessage.request;
											
											if(id == undefined) throw new Error("Got worker request without a id! id=" + id);
											
											if(req.createHttpEndpoint) {
												
												var folder = req.createHttpEndpoint.folder;
												
												if(!NO_CHROOT && HOME_DIR) folder = HOME_DIR + name + folder;
												
												console.log("createHttpEndpoint: NO_CHROOT=" + NO_CHROOT + " req.createHttpEndpoint.folder=" + req.createHttpEndpoint.folder + " folder=" + folder);
												
												createHttpEndpoint(name, folder, function(err, url) {
													if(err) workerResp(req, null, err.message);
													else workerResp(req, {url: url});
												});
											}
											else if(req.removeHttpEndpoint) {
												
												var folder = req.removeHttpEndpoint.folder;
												
												if(!NO_CHROOT && HOME_DIR) folder = HOME_DIR + name + folder;
												
												removeHttpEndpoint(name, folder, function(err, folder) {
													if(err) throw err;
													workerResp(req, {folder: folder});
												});
											}
										else if(req.debugInBrowserVnc) {
											var url = req.debugInBrowserVnc.url;
											startChromiumBrowserInVnc(name, uid, gid, url, function(err, resp) {
												workerResp(req, resp, err);
												});
												
											}
											
											else throw new Error("Unknown request from worker: " + JSON.stringify(req, null, 2));
											
										}
										else throw new Error("Bad message from worker: workerMessage=" + JSON.stringify(workerMessage, null, 2));
										
										
										function workerResp(req, resp, err) {
											if(id == undefined) throw new Error("id=" + id);
											var obj = {id: id, parentResponse: resp};
											if(err) obj.err = err.message ? err.message : err;
											userWorker.send(obj);
										}
										
									}
									
									function workerExitHandler(code, signal) {
										console.log(name + " worker exit: code=" + code + " signal=" + signal);
										
										var msg = "Your worker process exited with code=" + code + " and signal=" + signal;
										
										if(code !== 0) {
											msg += " Which means it crashed. And you should probably file a bug report!\n\n(worker process is being restarted ...)";
											
											log("Recreating user worker process for " + name);
											
											userWorker = createUserWorker(name, uid, gid);
											userWorker.send({identify: userInfo});
											
											userWorker.on("message", messageFromWorker);
											userWorker.on("exit", workerExitHandler);
											
										}
										
										send({msg: msg, id: 0});
										
									}
									
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
					
					if(answer.id == undefined && id) answer.id = id;
					
					if(answer.id == id) id = null; // Do not reuse the same id
					
					if(!answer.id && answer.hasOwnProperty("resp")) throw new Error("No id in answer with resp! answer=" + JSON.stringify(answer));
					if(!answer.id && answer.hasOwnProperty("error")) throw new Error("No id in answer with error! answer=" + JSON.stringify(answer));
					// Possible cause: callback being called twice or a "resp" that should be an "event" instead.
					
					var str = JSON.stringify(answer);
					
					log(IP + " <= " + UTIL.shortString(str));
					
					conn.write(str);
				}
			}
			
		});
		
		connection.on("close", function sockJsClose() {
			
			// Thankfully users are not disconnected "right away", there are some tolerence for unstable networks
			
			log("Closed client connection (protocol=" + protocol + ") from " + IP);
			
			
			if(userWorker) {
				
				// Each connection has it's own worker process!
				
				userWorker.send({teardown: true}); // Worker should be exiting ...
				
				/*
					awaitingMessagesFromWorker["teardownComplete"] = function afterTeardown() {
					userWorker.kill('SIGTERM');
					};
				*/
				
				// Users logged in with the same name can however send messages to each others ...
				
				USER_CONNECTIONS[userName].connections.splice(USER_CONNECTIONS[userName].connections.indexOf(connection), 1);
				
				if(USER_CONNECTIONS[userName].connections.length === 0) {
					delete USER_CONNECTIONS[userName];
				}
			
			for(var displayId in VNC_CHANNEL) {
				if(VNC_CHANNEL[displayId].startedBy == userName) stopVncChannel(displayId);
			}
			
			
			}
			else console.log("Client had not worker process! userName=" + userName + " userConnectionId=" + userConnectionId + " IP=" + IP);
			
		});
		
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
	
	
	function createHttpEndpoint(username, folder, callback) {
		
		log("Creating HTTP endpoint to folder=" + folder + " ...");
		
		if(HOME_DIR) {
			if(folder.indexOf(HOME_DIR + username) !== 0) throw new Error("Can not create an http-endpoint outside HOME_DIR=" + HOME_DIR + username);
		}
		
		// Make sure the path exist
		var fs = require("fs");
		fs.stat(folder, function statResult(err, stats) {
			if(err) return callback(err);
			
			for(var endPoint in HTTP_ENDPOINTS) {
				if(HTTP_ENDPOINTS[endPoint] == folder) {
					return callback(null, makeUrl(endPoint));
				}
			}
			
			var endPoint = randomString(10).toLowerCase(); // JavaScript is case sensitive while the www is not
			
			HTTP_ENDPOINTS[endPoint] = folder;
			
			log("Created HTTP endPoint=" + endPoint + " to folder=" + folder);
			
			callback(null, makeUrl(endPoint));
			
			
		});
		
	}
	
	function removeHttpEndpoint(username, folder, callback) {
		
		log("Removing HTTP endpoint to folder=" + folder + " ...");
		
		if(HOME_DIR) {
			if(folder.indexOf(HOME_DIR + username) !== 0) throw new Error("Can not remove an http-endpoint outside HOME_DIR=" + HOME_DIR + username);
		}
		
		var endpointDeleted = false;
		for(var endPoint in HTTP_ENDPOINTS) {
			if(HTTP_ENDPOINTS[endPoint] == folder) {
				delete HTTP_ENDPOINTS[endPoint];
				endpointDeleted = true;
			}
		}
		
		if(endpointDeleted) callback(null, folder);
		else callback("Endpoint to folder=" + folder + " not found!");
		
	}
	
function handleHttpRequest(request, response) {
		
		
	// socketPath
	
	
		var IP = request.headers["x-real-ip"] || request.connection.remoteAddress;
		var urlPath = UTIL.getPathFromUrl(request.url);
		
		
		
		var dirs = urlPath.split("/");
		
		var firstDir = dirs[0] || dirs[1]; // Urls usually start with an /
	var secondDir = dirs[1] ? dirs[2] : dirs[1];
	
	
		var path = require("path");
		
		var folder;
		var localFolder;
		
		/*
			var authHeader = request.headers["authorization"] || "";
			var authToken = authHeader.split(/\s+/).pop() || "";
			var authBuffer = new Buffer(authToken, "base64").toString(); // convert from base64
			var authParts = authBuffer.split(/:/);
			var username=authParts[0];
			var password=authParts[1];
		*/
		
	log("HTTP request from IP=" + IP + " urlPath=" + urlPath + " request.url=" + request.url + " host=" + request.headers.host + " firstDir=" + firstDir + " secondDir=" + secondDir);
		
		/*
			http "endpoints" needs to pass same origin policy!
		*/
		
		var responseHeaders = {'Content-Type': 'text/plain; charset=utf-8'};
		
	if(firstDir == "vnc" && secondDir) {
		
		if(VNC_CHANNEL.hasOwnProperty(secondDir)) {
		
			console.log("Proxying request to VNC channel: " + secondDir);
		
			VNC_CHANNEL[secondDir].proxy.web(request, response);
		
		}
		else {
			response.writeHead(404, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("VNC channel not found: " + secondDir);
			
		}
		
		return;
	}
	else if(HTTP_ENDPOINTS.hasOwnProperty(firstDir)) {
		
			localFolder = HTTP_ENDPOINTS[firstDir];
			
			localFolder = UTIL.toSystemPathDelimiters(localFolder);
			
			urlPath = urlPath.replace(firstDir + "/", "");
			
			responseHeaders['Cache-Control'] = 'no-cache';
			
			console.log("Serving from http-endpoint=" + firstDir + " localFolder=" + localFolder + "");
			
		}
		else {
			
			console.log("firstDir=" + firstDir + " not in endpoints: " + JSON.stringify(HTTP_ENDPOINTS));
			
			if(urlPath == "/" || urlPath == "") urlPath = "/index.htm";
			
			localFolder = path.resolve("../client/");
			
			console.log("Serving from the jzedit client folder: " + localFolder);
			
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
		
		
		if(filePath.indexOf(localFolder) != 0 || !path.isAbsolute(filePath) || filePath.indexOf(PW_FILE) != -1) {
			if(filePath.indexOf(localFolder) != 0) console.log("filePath=" + filePath + " does not start with localFolder=" + localFolder);
			if(!path.isAbsolute(filePath)) console.log("Not absolute: filePath=" +filePath);
			if(filePath.indexOf(PW_FILE) != -1) console.log("PW_FILE=" + PW_FILE);
			
			console.log("urlPath=" + urlPath);
			
			response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("Bad path: " + urlPath);
			return;
		}
		
		
		
		
		var fileExtension = UTIL.getFileExtension(urlPath);
		
		var mimeMap = require("./mimeMap.js");
		
		if(fileExtension && !mimeMap.hasOwnProperty(fileExtension)) {
			response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("Bad file type: '" + fileExtension + "'");
			
			console.warn("Unknown mime type: fileExtension=" + fileExtension);
			
			return;
		}
		
		var fs = require("fs");
		
		var stat = fs.stat(filePath, function(err, stats) {
			
			if(err) {
				
				response.writeHead(404, "Error", responseHeaders);
				
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
				
				response.writeHead(404, "Error", responseHeaders);
				response.end("Not a file: " + filePath);
				
			}
			else {
				
				responseHeaders['Content-Type'] = mimeMap[fileExtension];
				responseHeaders['Content-Length'] = stats.size;
				
				response.writeHead(200, responseHeaders);
				
				var readStream = fs.createReadStream(filePath);
				readStream.pipe(response);
				
			}
			
		});
		
		
	}
	
	
	function makeUrl(endPoint) {
		
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
		
		var url = ""; // "http://";
		
		if(HOSTNAME) url += HOSTNAME;
		else url += ip;
		
		if(PUBLIC_PORT != 80) url += ":" + PUBLIC_PORT;
		
		url += "/";
		
		if(endPoint) url += endPoint + "/";
		
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
		var args = ["--loglevel=" + LOGLEVEL, "--username=" + name, "--uid=" + uid, "--gid=" + gid];
		
		options.env = {
			username: name,
			uid: uid,
			gid: gid,
			loglevel: LOGLEVEL
		}
		
		if(NO_CHROOT) {
			if(uid != undefined) options.uid = parseInt(uid);
			if(gid != undefined) options.gid = parseInt(gid);
		}
		
		if(uid) options.execPath = "/usr/bin/nodejs_" + name; // Hard link to nodejs binary so each user can have an unique apparmor profile
		
		if((uid == undefined || uid == -1)) {
			log("No uid specified!\nUSER WILL RUN AS username=" + CURRENT_USER, WARN);
			
			if(process.getuid) {
				if(process.getuid() == 0 && !CRAZY) {
					throw new Error("It's not recommended to run a user worker process as root (Use argument -crazy if you want to do it anyway)");
				}
			}
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
		
		/*
			worker.on("exit", function workerExit(code, signal) {
			console.log(name + " worker exit: code=" + code + " signal=" + signal);
			});
		*/
		
		return worker;
		
	}
	
function startChromiumBrowserInVnc(username, uid, gid, url, callback) {
		
		if(username == undefined && !CRAZY) throw new Error("username required!");
		if(uid == undefined && !CRAZY) throw new Error("uid required!");
	if(gid == undefined && !CRAZY) throw new Error("gid required!");
		
	// If chromium-browser is already running on a display (by the same user ??),
	// it will make a clean close (no useful message). Probabbly because it detects that the user is already runnig another chromium-browser
	for(var displayId in VNC_CHANNEL) {
		if(VNC_CHANNEL[displayId].startedBy == username) {
			// Give the old session
			return callback(null, VNC_CHANNEL[displayId].info);
		}
	}
	
	var displayId = 5; // Don't start on a low number, if running on a dev box it might already have one or more monitors!
	
	// Pick a channel (display id) that is not used
	while(VNC_CHANNEL.hasOwnProperty(displayId) && displayId < 10000) displayId++;
	
	if(displayId >= 9999) throw new Error("Too many active VNC channels!");
	
	var httpProxy = require('http-proxy');
	var vncUnixSocket =  HOME_DIR + username + "/sock/vnc";
	// https://github.com/nodejitsu/node-http-proxy#proxying-websockets
	VNC_CHANNEL[displayId] = {startedBy: username};
	
	
	
	// The proxy that will proxy requests to the x11vnc server (using websocket)
	// unix socket (AF_UNIX) requires the modified libvncserver
	// bundled in the the x11vnc 0.9.13 tarball and later.
	var modifiedLibvncserver = false;
	if(modifiedLibvncserver) {
		VNC_CHANNEL[displayId].proxy = new httpProxy.createProxyServer({
			target: {
				socketPath: vncUnixSocket
			},
			ws: true
		});
	}
	
	var childProcess = require("child_process");
		var xvfbOptions = {};
		var chromiumBrowserOptions = {};
		var x11vncOptions = {};
	
	var chromiumDebuggerPort = getTcpPort(CHROMIUM_DEBUG_PORT);
	var chromeWindowId = "0x400001"; // It's hopefully always the same
		
	
		if((uid == undefined || uid == -1)) {
			log("No uid specified! Browser will run as username=" + CURRENT_USER, WARN);
		}
		
		if(uid != undefined) {
			xvfbOptions.uid = parseInt(uid);
			chromiumBrowserOptions.uid = parseInt(uid);
			x11vncOptions.uid = parseInt(uid);
		}
		if(gid != undefined) {
			xvfbOptions.gid = parseInt(gid);
			chromiumBrowserOptions.gid = parseInt(gid);
			x11vncOptions.gid = parseInt(gid);
		}
		
	log("Creating VNC for username=" + username + " uid=" + uid + " gid=" + gid, DEBUG);
	
	var xvfbStartCounter = 0;
	
	startXvfb();
	
	function startXvfb() {
		
		xvfbStartCounter++;
		
		var xvfbArgs = [
			":" + displayId,  // Server/monitor/display ... ?
			"-screen",
			"0",
			"800x600x24", // Screen 0 res and depth, I guess you can have many screens on one Server/monitor/display !?
			"-ac" // Disables X access control
		];
		
		// debug: Xvfb :5 -screen 0 800x600x24 -ac &
		// debug: xwininfo -display :5 -root -children
		// debug: ps ax | grep Xvfb
		
		log("Starting Xvfb with args=" + JSON.stringify(xvfbArgs) + " (" + xvfbArgs.join(" ") + ") xvfbOptions=" + JSON.stringify(xvfbOptions));
		var xvfb = childProcess.spawn("Xvfb", xvfbArgs, xvfbOptions);
		
		VNC_CHANNEL[displayId].xvfb = xvfb;
		
		xvfb.on("close", function (code, signal) {
			log(username + " xvfb (displayId=" + displayId + ") close: code=" + code + " signal=" + signal, NOTICE);
		});
		
		xvfb.on("disconnect", function () {
			log(username + " xvfb (displayId=" + displayId + ") disconnect: xvfb.connected=" + xvfb.connected, DEBUG);
		});
		
		xvfb.on("error", function (err) {
			log(username + " xvfb (displayId=" + displayId + ") error: err.message=" + err.message, ERROR);
			console.error(err);
		});
		
		xvfb.stdout.on("data", function(data) {
			log(username + " xvfb (displayId=" + displayId + ") stdout: " + data, WARN);
		});
		
		xvfb.stderr.on("data", function (data) {
			log(username + " xvfb (displayId=" + displayId + ") stderr: " + data, ERROR);
			
			if(data.indexOf("(EE) Server is already active for display " + displayId) != -1) {
				/*
					The server was probably restarted without killing xvfb
					This means a chromium-browser and x11vnc is also probably running !
					And will make x11vnc close (ListenOnTCPPort: Address already in use)
					
					We don't want to reuse chromium-browser inside the "ghost" Xvfb because we don't know what user started it.
					And it's probably best to not reuse the Xvfb either.
					But the user has already been sent the callback ...
					
					Killing a xvfb will kill both chromium-browser's inside it and x11vnc ...
					
				*/
				var ps = require('ps-node');
				
				
				ps.lookup({
					command: 'Xvfb',
					arguments: xvfbArgs.join(" "),
				}, function(err, resultList ) {
					if (err) {
						throw new Error( err );
					}
					
					resultList.forEach(function( p ){
						if( p ){
							console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', p.pid, p.command, p.arguments );
							ps.kill( p.pid, function( err ) {
								if (err) {
									throw new Error( err );
								}
								else {
									console.log( 'Process %s has been killed!', pid );
									// Restart Xvfb. But only if it has not already been restarted to prevent endless loop.
									if(xvfbStartCounter <= 1) startXvfb();
									
								}
							});
						}
						else throw new Error("Expected p");
					});
				});
			}
			
		});
		
		// Wait until Xvfb is successfully running before starting chromium-browser !
		var timeInterval = 100;
		var maxCheck = 10;
		var checkCounter = 0;
		
		setTimeout(isXvfbRunning, timeInterval);
		
		function isXvfbRunning() {
			
			var xwininfoArg = ["-display", ":" + displayId, "-root", "-children"];
			childProcess.execFile("xwininfo", xwininfoArg, function (err, stdout, stderr) {
				console.log("xwininfo err=" + err + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(xwininfoArg));
				
				if(++checkCounter > maxCheck) {
					xvfb.kill();
					callback(new Error("Failed to start Xvfb in a timely manner"));
				}
				if(stderr.indexOf('xwininfo: error: unable to open display ":' + displayId + '"') != -1) {
					// The Xvfb has not yet started, or it has crashed!
					setTimeout(isXvfbRunning, timeInterval);
				}
				else if(stdout.indexOf(chromeWindowId) != -1) {
					// A chromium-browser is already running inside. That means it's a "ghost" Xvfb
					// Wait until Xvfb gives an "(EE) Server is already active for display" message on stderr
					// Which will trigger a restart of Xvfb
					setTimeout(isXvfbRunning, timeInterval);
				}
				else {
					// Xvfb has started, and no chromium-browser window exists (yet)
					startChromiumBrowser();
				}
				
			});
			}
		}
	
	
	function startChromiumBrowser() {
		
	if(url == undefined) url = "about:blank";
	
	// https://peter.sh/experiments/chromium-command-line-switches/#condition-6
		var chromiumBrowserArgs = [
			//"--chrome", // No idea what --chrome flag does ...
			"--user-data-dir=" + HOME_DIR + username,
		"--kiosk", // Full screen
		url,
			"--incognito", // Don't save cache or history
			"--disable-pinch", // Disables compositor-accelerated touch-screen pinch gestures. Why not ?
			"--overscroll-history-navigation=0", // disable history navigation in response to horizontal overscroll. Why not ?
			"--remote-debugging-port=" + chromiumDebuggerPort // Port that we can connect chrome inspector to
		];
		
		// debug: xwininfo -display :5 -root -children
		// debug: Xvfb :5 -screen 0 800x600x24 -ac &
		// debug: ps ax | grep chromium
		// debug: runuser -l demo -c 'DISPLAY=:5 chromium-browser --chrome --kiosk http://www.webtigerteam.com/johan/ --incognito --disable-pinch --overscroll-history-navigation=0 --remote-debugging-port=9222' & 
		// debug: DISPLAY=:5 chromium-browser --chrome --kiosk http://www.webtigerteam.com/johan/ --incognito --disable-pinch --overscroll-history-navigation=0
		
		chromiumBrowserOptions.env = {DISPLAY: ":" + displayId};
		
		log("Starting chromium-browser with args=" + JSON.stringify(chromiumBrowserArgs) 
		+ " chromiumBrowserOptions=" + JSON.stringify(chromiumBrowserOptions) + " on displayId=" + displayId);
	var chromiumBrowser = childProcess.spawn("chromium-browser", chromiumBrowserArgs, chromiumBrowserOptions);
		
	VNC_CHANNEL[displayId].chromiumBrowser = chromiumBrowser;
	
		chromiumBrowser.on("close", function (code, signal) {
		log(username + " chromium-browser (displayId=" + displayId + ") close: code=" + code + " signal=" + signal, NOTICE);
			freeTcpPort(chromiumDebuggerPort);
			
			// Should we restart chromium-browser !?
			
		});
		
		chromiumBrowser.on("disconnect", function () {
		log(username + " chromium-browser (displayId=" + displayId + ") disconnect: chromiumBrowser.connected=" + chromiumBrowser.connected, DEBUG);
		});
		
		chromiumBrowser.on("error", function (err) {
		log(username + " chromium-browser (displayId=" + displayId + ") error: err.message=" + err.message, ERROR);
			console.error(err);
		});
		
	chromiumBrowser.stdout.on("data", function(data) {
		log(username + " chromiumBrowser (displayId=" + displayId + ") stdout: " + data, INFO);
	});
	
	chromiumBrowser.stderr.on("data", function (data) {
		log(username + " chromiumBrowser (displayId=" + displayId + ") stderr: " + data, DEBUG);
	});
	
	// Wait until chromium-browser has started ...
	var timeInterval = 100;
	var maxCheck = 10;
	var checkCounter = 0;
	setTimeout(checkIfChromiumBrowserHasStarted, timeInterval);
	
	function checkIfChromiumBrowserHasStarted() {
		var xwininfoArg = ["-display", ":" + displayId, "-root", "-children"];
		childProcess.execFile("xwininfo", xwininfoArg, function (err, stdout, stderr) {
			console.log("xwininfo err=" + err + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(xwininfoArg));
				if(stdout.indexOf(chromeWindowId) != -1) startX11vnc();
			else if(++checkCounter < maxCheck) setTimeout(checkIfChromiumBrowserHasStarted, timeInterval);
			else {
					VNC_CHANNEL[displayId].xvfb.kill();
				callback(new Error("Failed to start chromium-browser in a timely manner. Result from xwininfo: + " + stdout));
			}
		});
	}
	}
	
	function startX11vnc() {
		
		// x11vnc    
		var x11vncPort = getTcpPort(VNC_PORT);
		
		if(modifiedLibvncserver) x11vncPort = 0;
		
		// note: x11vnc supports both websockets and normal tcp on the same port! 
		
		var vncPassword = generatePassword(8);
		
		
		// http://www.karlrunge.com/x11vnc/x11vnc_opts.html
	var x11vncArgs = [
			"-usepw", // We shall use a password! To prevent users getting into each others vnc session.
		"-passwd",
		vncPassword,
		"-rfbport",
		x11vncPort,
		"-display",
		":" + displayId,
		"-id",
			chromeWindowId,
			"-forever"
		];
		
		if(modifiedLibvncserver) {
			x11vncArgs.push("unixsock");
			x11vncArgs.push(vncUnixSocket);
		}
		
		// debug: xwininfo -display :5 -root -children
		// debug: x11vnc -rfbport 5901 -display :5 -id 0x400001 -forever
		
		log("Starting x11vnc with args=" + JSON.stringify(x11vncArgs)
		+ " x11vncOptions=" + JSON.stringify(x11vncOptions) + "");
	var x11vnc = childProcess.spawn("x11vnc", x11vncArgs, x11vncOptions);
		
		VNC_CHANNEL[displayId].x11vnc = x11vnc;
		
		x11vnc.on("close", function (code, signal) {
			log(username + " x11vnc (displayId=" + displayId + ") close: code=" + code + " signal=" + signal, NOTICE);
			freeTcpPort(chromiumDebuggerPort);
		});
		
		x11vnc.on("disconnect", function () {
			log(username + " x11vnc (displayId=" + displayId + ") disconnect: x11vnc.connected=" + x11vnc.connected, DEBUG);
		});
		
		x11vnc.on("error", function (err) {
			log(username + " x11vnc (displayId=" + displayId + ") error: err.message=" + err.message, ERROR);
			console.error(err);
		});
		
	x11vnc.stdout.on("data", function (data) {
			log(username + " x11vnc (displayId=" + displayId + ") stdout: " + data, INFO);
	});
	
	x11vnc.stderr.on("data", function (data) {
			log(username + " x11vnc (displayId=" + displayId + ") stderr: " + data, DEBUG);
	});
	
		var resp = {
			chromiumDebuggerPort: chromiumDebuggerPort,
		vncPassword: vncPassword
		}
		
		if(modifiedLibvncserver) {
			resp.vncChannel = displayId;
		}
		else {
			resp.vncHost = HOSTNAME;
			resp.vncPort = x11vncPort;
		}
		
		VNC_CHANNEL[displayId].info = resp;
		
		callback(null, resp);
	}
}

function stopVncChannel(displayId) {
	if(VNC_CHANNEL[displayId].proxy) VNC_CHANNEL[displayId].proxy.close();
	if(VNC_CHANNEL[displayId].x11vnc) VNC_CHANNEL[displayId].x11vnc.kill();
	if(VNC_CHANNEL[displayId].chromiumBrowser) VNC_CHANNEL[displayId].chromiumBrowser.kill();
	if(VNC_CHANNEL[displayId].xvfb) VNC_CHANNEL[displayId].xvfb.kill();
	delete VNC_CHANNEL[displayId];
}

function generatePassword(n) {
	if(n == undefined) n = 8;
	var pw = "";
	for(var i=0; i<n; i++) pw += Math.floor(Math.random() * 10);
	return pw;
}

	function getTcpPort(preferPort) {
	// There are only 65,535 ports ...
	
	var port = preferPort;
	
	while(PORTS_IN_USE.indexOf(port) != -1 && port < 65535) {
		port++;
		} 
	
	if(port >= 65535) throw new Error("We are out of ports!");
	
	PORTS_IN_USE.push(port);
	
	return port;
	}

function freeTcpPort(port) {
	while(PORTS_IN_USE.indexOf(port) != -1) PORTS_IN_USE.splice(PORTS_IN_USE.indexOf(port), 1);
	}

	
	main();
	