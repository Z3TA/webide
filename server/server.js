#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

if(process.version.indexOf("v8.") != 0) console.warn("The editor has only been tested with node.js version 8!");

var DEFAULT = require("./default_settings.js");

var getArg = require("../shared/getArg.js");

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number

var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email;

var CRAZY = getArg(["crazy", "crazy"]); // If specified in arguments, allows user workers to run as root

var UTIL = require("../client/UTIL.js");

var HTTP_ENDPOINTS = {};
var defaultHomeDir = DEFAULT.home_dir;
var HOME_DIR = getArg(["h", "homedir"]) || defaultHomeDir;
if(HOME_DIR != defaultHomeDir) HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter

var DEBUG_CHROOT = false;

var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var NO_CHROOT = !!(getArg(["nochroot", "nochroot"]) || false);

var DISPLAY_ID = 0; // Counter of visual displays

var VNC_CHANNEL = {}; // displayId: {proxy: http-proxy, name: username}


var log; // Using small caps because it looks and feels better
(function setLogginModule() { // Self calling function to not clutter script scope
	// Enhanced console.log ...
	var logModule = require("../shared/log.js");
	
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
	
	if(lastFolder != "server") {
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




var GS = String.fromCharCode(29);
var APC = String.fromCharCode(159);



var USER_CONNECTIONS = {}; // username: {connections: [], counter: 0}

var HTTP_SERVER;

// Use -ip "::" or -ip "0.0.0.0" to make it listen on unspecified addresses.
var HTTP_IP = getArg(["ip", "ip"]) || DEFAULT.http_ip;

// On some systems (Mac) you need elevated privilege (sudo) to listen to ports below 1024
var HTTP_PORT = getArg(["p", "port"]) || DEFAULT.editor_http_port; 
if(!UTIL.isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))

// For generating URL's
var PUBLIC_PORT = getArg(["pp", "public_port"]) || HTTP_PORT; // Server might run on localhost behind a proxy sunch as nginx
var HOSTNAME = getArg(["host", "host", "hostname"]) || HTTP_IP; // Same as "server_name" in nginx profile or "VirtualHost" on other web servers

var defaultDomain = DEFAULT.domain;
var DOMAIN = getArg(["d", "domain"]) || (parseInt(HOSTNAME.slice(0,1)) ? defaultDomain : HOSTNAME); // Use hostname!

var CHROMIUM_DEBUG_PORT = 9222;
var VNC_PORT = 5901;

var PORTS_IN_USE = [HTTP_PORT];

var fs = require("fs");

var FAILED_SSL_REG = {}; // List of failed letsencrypt registrations, in order to not hit quota limits

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
	var userConnectionName = null;
	var userConnectionId = -1;
	var IP = connection.remoteAddress;
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	var awaitingMessagesFromWorker = {};
	
	console.log("connection.remoteAddress=" + connection.remoteAddress);
	
	//console.log(connection);
	if(connection.headers["x-real-ip"]) IP = connection.headers["x-real-ip"];
	else console.log("connection.headers=" + JSON.stringify(connection.headers));
	
	// ipv6 can give ::ffff:127.0.0.1 or 127.0.0.1-xxxx
	// PS: SockJS filters connection headers! The version we use lets x-real-ip through though.
	
	log("Connection on " + protocol + " from " + IP);
	
	/*
		
		Everything sent must be commands.
		If not identified/logged in, commands will be queued
		
	*/
	
	connection.on("data", sockJsMessage);
	
	connection.on("close", sockJsClose);
	
	
	function sockJsMessage(message) {
		
		if(message.length > 100) log(IP + " => " + message.substr(0,100) + " ... (" + message.length + " characters)");
		else log(IP + " => " + message);
		
		handleUserMessage(message);
		
	}
	
	function sockJsClose() {
		
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
			
			USER_CONNECTIONS[userConnectionName].connections.splice(USER_CONNECTIONS[userConnectionName].connections.indexOf(connection), 1);
			
			if(USER_CONNECTIONS[userConnectionName].connections.length === 0) {
				delete USER_CONNECTIONS[userConnectionName];
			}
			
			for(var displayId in VNC_CHANNEL) {
				if(VNC_CHANNEL[displayId].startedBy == userConnectionName) stopVncChannel(displayId);
			}
			
		}
		else console.log("Client had no worker process! userConnectionName=" + userConnectionName + " userConnectionId=" + userConnectionId + " IP=" + IP);
		
		/*
			if(IP == "127.0.0.1" && HTTP_PORT == "8099") {
			console.log("We are running locally. Close down the server when client exit.");
			process.exit(0);
		}
		*/
		
		// The user might reconnect, so we don't want to unmount stuff!
		/*
			setTimeout(function() {
			unmountMounts(userConnectionName);
			}, 2000);
		*/
		
	}
	
	function unmountMounts(username, callback) {
		
		var toUnmount = 9;
		
		if(!DEBUG_CHROOT) {
			toUnmount++;
			umount(UTIL.joinPaths([HOME_DIR, username, "/etc/ssl/certs"]), unmounted);
		}
		
		umount(UTIL.joinPaths([HOME_DIR, username, "/dev/urandom"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/lib"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/lib64"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/lib"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/local/lib"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/share"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/bin/hg"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/bin/python"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/bin/nodejs"]), unmounted);
		
		function unmounted(err) {
			toUnmount--;
			if(err) {
				if(callback) callback(err);
				else console.warn(err.message);
				callback = null;
			}
			else if(toUnmount == 0) {
				if(callback) callback(null);
			}
		}
		
	}
	
	
	function handleUserMessage(message) { // A function so it can call itself from the queue
		
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
				
				send({error: "You need to login!", errorCode: "LOGIN_NEEDED", resp: {loginNeeded: command}});
				
			}
			else {
				
				// # Identify
				
				(function checkUser(username, password) {
					
					if(!NO_PW_HASH && !PASSWORD) {
						var pwHash = require("./pwHash.js");
						password = pwHash(password);
					}
					
					if(USERNAME) {
						console.log("Using USERNAME=" + USERNAME+ " from argument ...")
						
						// Use CURRENT_USER instead of USERNAME as username to prevent issies with /home/username
						if(USERNAME == username && PASSWORD == password) idSuccess();
						else idFail("Wong username or password! (Username specified in server arguments)");
					}
					else {
						
						var fs = require("fs");
						
						fs.readdir(HOME_DIR, function readDir(err, files) {
							if(err) throw err;
							
							var checkingPw = false;
							for (var i=0; i<files.length; i++) {
								if(files[i] == username) {
									checkingPw = true;
									checkPw();
									break;
								}
							}
							
							if(!checkingPw) idFail("User does not exist: " + username);
							
						});
					}
					
					function checkPw() {
						
						fs.readFile(UTIL.joinPaths([HOME_DIR, username, ".jzeditpw"]), "utf8", function readPw(err, pwstringFromFile) {
							if(err) {
								console.error(err);
								idFail(err.message);
							}
							else {
								if(password == pwstringFromFile) idSuccess();
								else {
idFail("Wrong password for user: " + username);
									console.log("Hashed pw *" + password + "* (entered by user) != *" + pwstringFromFile + "* (.jzeditpw file)");
								}
							}
						});
						
					}
					
					function idFail(errorMsg) {
						
						if(errorMsg instanceof Error) errorMsg = errorMsg.message;
						
						send({error: errorMsg});
						log("username=" + username + " failed to login: " + errorMsg);
					}
					
					function idSuccess() {
						
						var rootPath; // The path to chroot into (currently same as home dir)
						var uid, gid; // System user-id and group-id
						var homeDir; // User's home dir
						var shell; // User's shell (currently disabled/not implemented)
						
						userConnectionName = username;
						
						if(USERNAME && NO_CHROOT) {
							// Running as standalone desktop app
							homeDir = process.env.HOME || process.env.USERPROFILE;
							if(homeDir) homeDir = UTIL.trailingSlash(homeDir);
							acceptUser();
						}
						else {
							
							// Get home, uid and gid
							
							var fs = require("fs");
							fs.readFile("/etc/passwd", "utf8", gotMoreUserInfo);
						}
						
						function gotMoreUserInfo(err, etcPasswd) {
							
							if(err) {
								console.warn("Unable to read /etc/passwd !");
								throw new Error("Unable to read /etc/passwd: " + err.message);
							}
							else {
								// format: testuser2:x:1001:1001:Test user 2,,,:/home/testuser2:/bin/bash
								var rows = etcPasswd.trim().split("\n");
								
								for(var i=0, row; i<rows.length; i++) {
									row = rows[i].trim().split(":");
									if(foundUserIn(row)) return checkMounts();
								}
								
								idFail("Unable to find username=" + username + " in /etc/passwd ! A server admin need to add the user to the system.");
								// Add user account: sudo useradd -r -s /bin/false nameofuser
							}
							
							function foundUserIn(row) {
								var pName = row[0];
								var pUid = row[2];
								var pGid = row[3];
								var pDir = row[5];
								var pShell = row[6];
								
								var found = false;
								if(pName == username) {
									console.log("Found username=" + username + " in /etc/passwd");
									
									homeDir = UTIL.trailingSlash(pDir);
									shell = pShell;
									uid = parseInt(pUid);
									gid = parseInt(pGid);
									rootPath = pDir;
									
									return true;
								}
								else return false;
							}
							
						}
						
						function checkMounts() {
							// Make sure everything is mounted etc ...
							
							// When a user have been moved to another server, the user id will be different.
							// So we have to reset the user permissions! 
							// www-data user id might be the same though, depending on distro
							
							if(NO_CHROOT) {
								console.log("Not checking mounts because -nochroot option in server parameters");
								return acceptUser();
							}
							
							console.log("Checking mounts ...");
							
							var nginxProfileOK = false;
							var foldersToMount = 15;
							var apparmorProfilesToCreate = 6;
							var reloadApparmor = false;
							var reloadedApparmor = false;
							var checkMountsAbort = false;
							var sslCertChecked = false;
							var userAccepted = false;
							var npmSymLinkCreated = false;
							var hgrccacertsUptodate = true;
							var passwdCreated = false;
							
							checkUserRights(username, function checkedUserRights(err) {
								if(err) return checkMountsError(err);
								
								console.log("User rights OK for username=" + username);
								
								/*
									// Check if cacerts need to be updated
									var userHgrccacertsPath = HOME_DIR + username + "/etc/mercurial/hgrc.d/cacerts.rc";
									var systemHgrccacertsPath = "/etc/mercurial/hgrc.d/cacerts.rc";
									fs.stat(userHgrccacertsPath, function (err, userHgrccacerts) {
									if(err) return checkMountsError(err);
									if(checkMountsAbort) return;
									fs.stat(userHgrccacertsPath, function (err, systemHgrccacerts) {
									if(err) return checkMountsError(err);
									console.log("userHgrccacerts.mtimeMs=" + userHgrccacerts.mtimeMs);
									console.log("systemHgrccacerts.mtimeMs=" + systemHgrccacerts.mtimeMs);
									process.exit();
									if(userHgrccacerts.mtimeMs >= systemHgrccacerts.mtimeMs) {
									// The cacerts.rc file is up to date or have been modified by the user
									hgrccacertsUptodate = true;
									checkMountsReadyMaybe();
									}
									else {
									copyFile(systemHgrccacertsPath, userHgrccacertsPath, function copied(err) {
									if(err) return checkMountsError(err);
									hgrccacertsUptodate = true;
									checkMountsReadyMaybe();
									});
									}
									});
									});
								*/
								
								// Create a fake /etc/passwd that some programs use to lookup home dir and username
								// We don't want to use the systems /etc/passwd or these program will complain about /home/user not exist in the chroot
								if(!DEBUG_CHROOT) {
									fs.writeFile(homeDir + "etc/passwd", username + ":x:" + uid + ":" + gid + "::/:/bin/bash", function(err) {
										passwdCreated = true;
										checkMountsReadyMaybe();
									});
								}
								else passwdCreated = true;
								
								// Make sure nginx profile exist
								var url_user = UTIL.urlFriendly(username);
								var nginxProfilePath = "/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx";
								fs.stat(nginxProfilePath, function (err, stats) {
									if(checkMountsAbort) return;
									
									if(err) {
										if(err.code != "ENOENT") throw err;
										
										fs.readFile("../etc/nginx/user.webide.se.nginx", "utf8", function(err, nginxProfile) {
											if(checkMountsAbort) return;
											
											if(err) throw err;
											
											nginxProfile = nginxProfile.replace(/%USERNAME%/g, url_user);
											nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, homeDir);
											nginxProfile = nginxProfile.replace(/%DOMAIN%/g, DOMAIN);
											
											fs.writeFile(nginxProfilePath, nginxProfile, function(err) {
												if(err) throw err;
												checkNginxEnabled();
											});
											
										});
									}
									else {
										checkNginxEnabled();
									}
									
									function checkNginxEnabled() {
										
										var nginxProfileEnabledPath = "/etc/nginx/sites-enabled/" + url_user + "." + DOMAIN;
										fs.stat(nginxProfileEnabledPath, function (err, stats) {
											if(checkMountsAbort) return;
											
											if(err) {
												if(err.code != "ENOENT") throw err;
												
												fs.symlink(nginxProfilePath, nginxProfileEnabledPath, function(err) {
													if(err) throw err;
													
													var exec = require('child_process').exec;
													exec("service nginx reload", function(error, stdout, stderr) {
														if(error) throw(error);
														if(stderr) throw new Error(stderr);
														if(stdout) throw new Error(stdout);
														
														nginxProfileOK = true;
														
														checkSslCert();
														
														checkMountsReadyMaybe();
													});
													
												});
											}
											else {
												nginxProfileOK = true;
												
												checkSslCert();
												
												checkMountsReadyMaybe();
											}
										});
									}
									
								});
								
								/*
									Make sure mounts exist
									----------------------
									Mount these instead of copying to save hdd space
									Don't forget to update var foldersToMount=
									
									Problem: Racing to create folders
									Solution: Create folder before mounting
								*/
								
								if(!DEBUG_CHROOT) {
									foldersToMount += 7;
mount("/etc/ssl/certs", homeDir + "etc/ssl/certs", folderMounted); // Sometimes? Needed for SSL verfification
									
									mount("/usr/bin/ssh", homeDir + "usr/bin/ssh", folderMounted); // So users can ssh into other machines (and use git+ssh !?)
									mount("/usr/bin/ssh-keygen", homeDir + "usr/bin/ssh-keygen", folderMounted); // Generating ssh keys
									
									mount("/usr/bin/env", homeDir + "usr/bin/env", folderMounted); // common in shebangs (npm needs it)
									mount("/usr/bin/hg", homeDir + "usr/bin/hg", folderMounted);
									mount("/usr/bin/python", homeDir + "usr/bin/python", folderMounted);
									mount(process.argv[0], homeDir + "usr/bin/node", folderMounted);
									
									// Be able to type npm in terminal:
									fs.symlink("../lib/node_modules/npm/bin/npm-cli.js", homeDir + "usr/bin/npm", function symLinkCreated(err) {
										if(err && err.code != "EEXIST") throw err; // It's allright if the link already exist
										npmSymLinkCreated = true;
									});
								}
								else {
									foldersToMount += 2;
									mount("/usr/bin/", homeDir + "usr/bin/", folderMounted);
									mount("/etc/", homeDir + "etc/", folderMounted);
									npmSymLinkCreated = true;
								}
								
								// Some programs don't like if we create them using mkdnod 
								mount("/dev/urandom", homeDir + "dev/urandom", folderMounted);
								mount("/dev/null", homeDir + "dev/null", folderMounted);
								
								mount("/usr/share/", homeDir + "usr/share", folderMounted); // Some python scripts (Mercurial) and others need it (sometimes)
								
								mount("/lib/", homeDir + "lib", folderMounted);
								mount("/lib64/", homeDir + "lib64", folderMounted);
								mount("/usr/lib/", homeDir + "usr/lib", folderMounted);
								mount("/usr/local/lib", homeDir + "usr/local/lib", folderMounted); // Needed for Python packages (hggit)
								
								mount("/bin/bash", homeDir + "bin/bash", folderMounted); // Shell for "terminal"
								mount("/bin/ls", homeDir + "bin/ls", folderMounted); // for debugging
								
								mount("/dev/ptmx", homeDir + "dev/ptmx", folderMounted); // Needed for pseudo terminals (forkpty / pty.js)
								mount("/dev/pts/", homeDir + "dev/pts/", folderMounted); // Needed for pseudo terminals (forkpty / pty.js)
								
								mount("/proc/cpuinfo", homeDir + "proc/cpuinfo", folderMounted); // Needed for require('os').cpus()
								mount("/proc/stat", homeDir + "proc/stat", folderMounted); // Needed for nodejs/npm
								mount("/proc/sys/vm/overcommit_memory", homeDir + "proc/sys/vm/overcommit_memory", folderMounted); // Needed for nodejs/npm
								
								// We need separate executables to have separate apparmor profiles for user scripts and user_worker.js script
								mount(process.argv[0], '/usr/bin/nodejs_' + username, folderMounted); 
								
								
								// Create apparmor profiles unless they already exist
								createApparmorProfile("../etc/apparmor/usr.bin.nodejs_someuser", username, apparmorProfileCreated);
								createApparmorProfile("../etc/apparmor/home.someuser.usr.bin.node", username, apparmorProfileCreated);
								createApparmorProfile("../etc/apparmor/home.someuser.usr.bin.python", username, apparmorProfileCreated);
								createApparmorProfile("../etc/apparmor/home.someuser.usr.bin.hg", username, apparmorProfileCreated);
								createApparmorProfile("../etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npm-cli.js", username, apparmorProfileCreated);
								createApparmorProfile("../etc/apparmor/home.someuser.bin.bash", username, apparmorProfileCreated);
								
							});
							
							function checkUserRights(username, callback) {
								var toChown = 0;
								var toStat = 0;
								
								console.log("Checking user rights ...");
								
								fs.stat(HOME_DIR + username, function (err, stats) {
									if(err) throw err;
									
									if(stats.uid != uid || stats.gid != gid) {
										// Reset the fs user rights
										// Don't chown all dirs though, chowning the mounted files could be disastrous!'
										
										// www user needs to have write access to /sock and read access to /wwwpub
										// make sure the right www user id
										getGroupId("www-data", function(err, wwwgid) {
											if(err) throw err;
											
											fs.readdir(HOME_DIR + username, function (err, files) {
												if(err) throw err;
												
												for (var i=0; i<files.length; i++) {
													check(files[i]);
												}
												
											});
											
											toChown++;
											fs.chown(HOME_DIR + username, uid, gid, function chowned(err) {
												toChown--;
												if(err) throw err;
												checkedUserRights();
											});
											
											function check(file) { // Closure so we know which path
												var path = UTIL.joinPaths([HOME_DIR, username, file]);
												
												console.log("checkUserRights: Checking file=" + file + " path=" + path);
												
												if(file=="dev" || file=="lib" || file=="lib64" || file=="usr") {
													// Ignore these. Chown'ing these could be disastrous!
													checkedUserRights();
													return;
												}
												else if(file=="wwwpub" || file == "sock") {
													// www-data should be the group
													toChown++;
													chownDirRecursive(path, uid, wwwgid, function(err) {
														toChown--;
														if(err) throw err;
														checkedUserRights();
													});
													return;
												}
												else {
													
													// Is it a folder ?
													toStat++;
													fs.stat(path, function (err, stats) {
														toStat--;
														if(err) throw err;
														
														if(stats.isDirectory()) {
															toChown++;
															chownDirRecursive(path, uid, gid, function(err) {
																toChown--;
																if(err) throw err;
																checkedUserRights();
															});
														}
														else {
															toChown++;
															fs.chown(path, uid, gid, function chowned(err) {
																toChown--;
																if(err) throw err;
																checkedUserRights();
															});
														}
													});
												}
											}
											
										});
									}
									else {
										checkedUserRights();
									}
								});
								
								function checkedUserRights() {
									if(toChown == 0 && toStat == 0) {
										if(callback) {
											callback(null);
											callback = null;
										}
									}
									else console.log("checkUserRights: toChown=" + toChown + " toStat=" + toStat);
								}
								}
							
							function apparmorProfileCreated(err) {
								if(err) throw err;
								apparmorProfilesToCreate--;
								var counter = 0;
								if(apparmorProfilesToCreate == 0 && reloadApparmor) {
									var exec = require('child_process').exec;
									console.log("exec: service apparmor reload ...");
									var apparmorReloadTimer = setInterval(checkApparmorReloaded, 500);
									exec("service apparmor reload", function(error, stdout, stderr) {
										if(error) throw(error);
										if(stderr) throw new Error(stderr);
										if(stdout) throw new Error(stdout);
										
										console.log("done: service apparmor reload");
										
										clearInterval(apparmorReloadTimer);
										
										reloadedApparmor = true;
										checkMountsReadyMaybe();
									});
								} 
								
								checkMountsReadyMaybe();
								
								function checkApparmorReloaded() {
									console.log("Waiting for apparmor to reload ... " + ++counter);
								}
								
							}
							
							function folderMounted(err) {
								foldersToMount--;
								if(err) {
									// Error: Target directory not empty! Can not mount to targetPath=/home/johan/etc/ssl/certs targetStats=[object Object]
									return checkMountsError(err);
									//throw err;
								}
								if(foldersToMount < 0) throw new Error("foldersToMount=" + foldersToMount);
								checkMountsReadyMaybe();
							}
							
							function checkMountsReadyMaybe() {
								if(checkMountsAbort) return;
								
								console.log("checkMounts: nginxProfileOK=" + nginxProfileOK + " passwdCreated=" + passwdCreated +
								" foldersToMount=" + foldersToMount + " apparmorProfilesToCreate=" + apparmorProfilesToCreate
								+ " reloadApparmor=" + reloadApparmor + " reloadedApparmor=" + reloadedApparmor + " sslCertChecked=" + sslCertChecked
								+ " npmSymLinkCreated=" + npmSymLinkCreated + " ");
								
								if(nginxProfileOK && foldersToMount == 0 && apparmorProfilesToCreate == 0 && passwdCreated && 
								((reloadApparmor && reloadedApparmor) || !reloadApparmor ) && sslCertChecked && npmSymLinkCreated) {
									if(!userAccepted) { // Prevent double accept
										acceptUser();
										userAccepted = true;
									}
									else throw new Error("User already accepted!");
								}
								}
							
							
							function checkMountsError(err) {
								if(checkMountsAbort) return;
								checkMountsAbort = true;
								idFail("Problem creating mounts: " + err.message);
							}
							
							function createApparmorProfile(template, username, callback) {
								/*
									example profile: "../etc/apparmor/usr.bin.nodejs_someuser"
								*/
								
								var dest = template.replace("someuser", username);
								var homeDot = HOME_DIR.substr(1).replace(/\//g, "."); // Remove first slash and replace remaining slashes with dots
								dest = dest.replace("home.", homeDot);
								dest = dest.replace("../etc/apparmor/", "/etc/apparmor.d/");
								
								console.log("Apparmor: template=" + template + " dest=" + dest);
								
								// First check if the profile exist
								fs.stat(dest, function (err, stats) {
									
									if(err) {
										if(err.code != "ENOENT") throw err;
										
										fs.readFile(template, "utf8", function (err, apparmorProfile) {
											if(err) throw err;
											
											apparmorProfile = apparmorProfile.replace(/%HOME%/g, HOME_DIR);
											apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
											apparmorProfile = apparmorProfile.replace(/%JZEDIT%/g, UTIL.parentFolder(__dirname));
											
											// Create the profile
											fs.writeFile(dest, apparmorProfile, function (err) {
												if(err) throw err;
												
												reloadApparmor = true;
												
												/*
													var bin = dest.replace("/etc/apparmor.d", "");
													bin = dest.replace(".", "/");
													
													//var enforceApparmorProfileStdout = child_process.execSync("aa-enforce " + bin).toString(ENCODING).trim();
													//if(!enforceApparmorProfileStdout.match(/Setting (.*) to enforce mode./)) throw new Error(enforceApparmorProfileStdout);
												*/
												
												return callback(null);
											});
										});
									}
									else {
										// profile already exist!
										return callback(null);
									}
									
								});
							}
							
							function checkSslCert() {
								// Check ssl certificate
								
								var url_user = UTIL.urlFriendly(username);
								
								var certPath = "/etc/letsencrypt/live/" + url_user + "." + DOMAIN + "/fullchain.pem";
								fs.stat(certPath, function(err, stat) {
									if(err == null) {
										console.log("SSL certificate for " + url_user + "." + DOMAIN + " exist!");
										sslCertChecked = true;
										return checkMountsReadyMaybe();
										}
									else if(err.code == 'ENOENT') {
										console.log("ENOENT: certPath=" + certPath);
										
										if(FAILED_SSL_REG.hasOwnProperty(url_user + "." + DOMAIN)) {
											log("Skipping SSL registration because of too many failed attempts!");
											sslCertChecked = true;
											return checkMountsReadyMaybe();
										}
										
										// the cert does not exist. Try to register it
										var letsencrypt = require("../shared/letsencrypt.js");
										letsencrypt.register(url_user + "." + DOMAIN, ADMIN_EMAIL, function(err) {
											if(err) {
												
												if(FAILED_SSL_REG.hasOwnProperty(url_user + "." + DOMAIN)) FAILED_SSL_REG[url_user + "." + DOMAIN]++;
												else FAILED_SSL_REG[url_user + "." + DOMAIN] = 1;
												
												if(err.code == "ENOENT") console.warn("certbot not installed!");
												else if(err.code == "RATE_LIMIT") console.warn("Unable to create letsencrypt cert because of rate limit!");
												else {
													console.warn(err.message);
												}
												
												sslCertChecked = true;
												return checkMountsReadyMaybe();
											}
											else {
												console.log("SSL certificate for " + url_user + "." + DOMAIN + " installed!");
												
												// Enable SSL on the site
												var nginxProfilePath = "/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx";
												fs.readFile(nginxProfilePath, "utf8", function read(err, data) {
													if(err) throw err;
													data = data.replace(/#SSL#/g, "");
													data = data.replace(/listen 80;#NOSSL#/g, "");
													data = data.replace(/listen [::]:80;#NOSSL#/g, "");
													
													fs.writeFile(nginxProfilePath, data, function(err) {
														if(err) throw err;
														
														console.log("SSL enabled: " + nginxProfilePath);
														
														var exec = require('child_process').exec;
														exec("service nginx reload", function(error, stdout, stderr) {
															if(error) throw(error);
															if(stderr) throw new Error(stderr);
															if(stdout) throw new Error(stdout);
															
															console.log("nginx reloaded!");
															
															sslCertChecked = true;
															return checkMountsReadyMaybe();
														});
														});
												});
											}
										});
									}
									else {
										// Another error
										throw err;
									}
								});
							}
							
						} // checkMounts
						
						
						function acceptUser() {
							
							if(gid == undefined) gid = uid;
							
							if(!USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
								USER_CONNECTIONS[userConnectionName] = {
									connections: [connection],
									counter: 0
								}
								userConnectionId = 0;
							}
							else {
								USER_CONNECTIONS[userConnectionName].connections.push(connection);
								userConnectionId = ++USER_CONNECTIONS[userConnectionName].counter;
							}
							
							userWorker = createUserWorker(userConnectionName, uid, gid);
							
							var userInfo = {name: userConnectionName, rootPath: !NO_CHROOT && rootPath, homeDir: homeDir, shell: shell};
							
							log("User userConnectionName=" + userConnectionName + " logged in! userConnectionId=" + userConnectionId + " userInfo=" + JSON.stringify(userInfo));
							
							userWorker.send({identify: userInfo});
							userWorker.on("message", messageFromWorker);
							userWorker.on("close", workerCloseHandler);
							
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
							else log("userConnectionName=" + userConnectionName + " NO_CHROOT=" + NO_CHROOT);
							
							send({resp: {loginSuccess: {user: userConnectionName, cId: userConnectionId, installDirectory: installDirectory}}});
							
							if(commandQueue.length > 0) {
								console.log("Running " + commandQueue.length + " commands from the command queue ...");
								for(var i=0; i<commandQueue.length; i++) {
									handleUserMessage(commandQueue[i]);
								}
								commandQueue.length = 0;
							}
							
							return true;
							
							function messageFromWorker(workerMessage, handle) {
								console.log("Worker message from " + userConnectionName + ": " + UTIL.shortString(workerMessage) + " handle=" + handle);
								
								if(workerMessage.resp || workerMessage.error) send(workerMessage);
								else if(workerMessage.message) {
									if(USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
										for (var i=0, conn; i<USER_CONNECTIONS[userConnectionName].connections.length; i++) {
											send(workerMessage.message, USER_CONNECTIONS[userConnectionName].connections[i]);
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
										
										if(!NO_CHROOT && HOME_DIR) folder = HOME_DIR + userConnectionName + folder;
										
										console.log("createHttpEndpoint: NO_CHROOT=" + NO_CHROOT + " req.createHttpEndpoint.folder=" + req.createHttpEndpoint.folder + " folder=" + folder);
										
										createHttpEndpoint(userConnectionName, folder, function(err, url) {
											if(err) workerResp(req, null, err.message);
											else workerResp(req, {url: url});
										});
									}
									else if(req.removeHttpEndpoint) {
										
										var folder = req.removeHttpEndpoint.folder;
										
										if(!NO_CHROOT && HOME_DIR) folder = HOME_DIR + userConnectionName + folder;
										
										removeHttpEndpoint(userConnectionName, folder, function(err, folder) {
											//if(err) throw err;
											workerResp(err, {folder: folder});
										});
									}
									else if(req.debugInBrowserVnc) {
										var url = req.debugInBrowserVnc.url;
										startChromiumBrowserInVnc(userConnectionName, uid, gid, url, function(err, resp) {
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
							
							function workerCloseHandler(code, signal) {
								console.log(userConnectionName + " worker close: code=" + code + " signal=" + signal);
								
								var msg = "Your worker process closed with code=" + code + " and signal=" + signal;
								
								if(code !== 0) {
									msg += " Which means it crashed. And you should probably file a bug report!\n\n(worker process is being restarted ...)";
									
									log("Recreating user worker process for " + userConnectionName);
									
									userWorker = createUserWorker(userConnectionName, uid, gid);
									userWorker.send({identify: userInfo});
									
									userWorker.on("message", messageFromWorker);
									userWorker.on("close", workerCloseHandler);
									
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
	
	if(HOME_DIR && !USERNAME) {
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
	
	if(HOME_DIR && !USERNAME) {
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
	
	//responseHeaders['Cache-Control'] = 'no-cache'; // For debugging
	
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
	
	
	if(filePath.indexOf(localFolder) != 0 || !path.isAbsolute(filePath)) {
		if(filePath.indexOf(localFolder) != 0) console.log("filePath=" + filePath + " does not start with localFolder=" + localFolder);
		if(!path.isAbsolute(filePath)) console.log("Not absolute: filePath=" +filePath);
		
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
			responseHeaders['Access-Control-Allow-Origin'] = "*";
			
			response.writeHead(404, "Error", responseHeaders);
			
			if(err.code == "ENOENT") {
				//var virtualPath = user.toVirtualPath(filePath);
				//response.end("File not found: " + virtualPath);
				
				response.end("File not found: " + filePath);
				
				console.warn("HTTP Server: File not found: " + filePath);
				
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
	var args = ["--loglevel=" + LOGLEVEL, "--username=" + name, "--uid=" + uid, "--gid=" + gid, "--chroot=" + !NO_CHROOT];
	
	options.env = {
		username: name,
		loglevel: LOGLEVEL,
		HOME: "/",
		USER: name,
		LOGNAME: name,
		USER_NAME: name
	}
	
	if(NO_CHROOT) {
		if(uid != undefined) options.uid = parseInt(uid);
		if(gid != undefined) options.gid = parseInt(gid);
	}
	else {
		options.env.uid = uid;
		options.env.gid = gid;
		
		if(uid) options.execPath = "/usr/bin/nodejs_" + name; // Hard link to nodejs binary so each user can have an unique apparmor profile
		}
	
	if((uid == undefined || uid == -1)) {
		log("No uid specified!\nUSER WILL RUN AS username=" + CURRENT_USER, WARN);
		
		if(process.getuid) {
			if(process.getuid() == 0 && !CRAZY) {
				throw new Error("It's not recommended to run a user worker process as root (Use argument -crazy if you want to do it anyway)");
			}
		}
	}
	
	log("Spawning worker name=" + name + " uid=" + uid + " gid=" + gid + " options=" + JSON.stringify(options), DEBUG);
	
	try {
		var worker = childProcess.fork("user_worker.js", args, options);
	}
	catch(err) {
		if(err.code == "EPERM") {
			if(uid != undefined) log("Unable to spawn worker with uid=" + uid + " and gid=" + gid + ".\nTry running the server with a privileged (sudo) user.", NOTICE);
			throw new Error("Unable to spawn worker! (" + err.message + ")");
		}
		else {
			console.log("args=" + JSON.stringify(args) + " options=" + JSON.stringify(options));
			// If you get spawn EACCES it probably means that the hard link or mount to /usr/bin/nodejs_username no longer exist!
			// Easiest solution is to remove and re-add the user. If it's in production you should install the jzedit_user_mounts.service'
			if(uid) log("Did you reboot !? Check if mount to /usr/bin/nodejs_" + name + " exist!", NOTICE);
			throw err;
		}
	}
	
	worker.on("close", function workerClose(code, signal) {
		console.log(name + " worker close: code=" + code + " signal=" + signal);
	});
	
	worker.on("disconnect", function workerDisconnect() {
		console.log(name + " worker disconnect: worker.connected=" + worker.connected);
	});
	
	worker.on("error", function workerError(err) {
		console.log(name + " worker error: err.message=" + err.message);
	});
	
	// Update between node4 and node8: It no longer calls exit, only close
	worker.on("exit", function workerExit(code, signal) {
		console.log(name + " worker exit: code=" + code + " signal=" + signal);
		});
	
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
		// debug: Try starting google-chrome: https://askubuntu.com/questions/79280/how-to-install-chrome-browser-properly-via-command-line
		
		
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

function getGroupId(groupName, callback) {
	var fs = require("fs");
	fs.readFile("/etc/group", "utf8", function(err, groupData) {
		
		if(err) return callback(err);
		
		//console.log("groupData=" + groupData);
		
		var groups = groupData.split(/\r|\n/);
		
		// format: jzedit_users:x:115:
		
		for (var i=0, group, name, id; i<groups.length; i++) {
			group = groups[i].split(":");
			name = group[0];
			id = group[2];
			
			if(name == groupName) return callback(null, parseInt(id));
		}
		
		return callback(new Error("Unable to find id for groupName=" + groupName));
	});
}

function chownDirRecursive(path, uid, gid, callback) {
	
	if(typeof callback != "function") throw new Error("Expected fourth parameter callback=" + callback + " to be a callback function!");
	
	var fs = require("fs");
	
	path = UTIL.trailingSlash(path); // Path is always a directory, put a slash after it to ease concatenation
	
	var abort = false;
	
	var dirsToRead = 0;
	var pathsToStat = 0;
	var pathsToChown = 0;
	var arrPathsToChown = [];
	
	dirsToRead++;
	fs.readdir(path, function readDir(err, files) {
		dirsToRead--;
		if(abort) return;
		if(err) return chownDirRecursiveDone(err);
		
		for (var i=0; i<files.length; i++) {
			doPath(path + files[i]);
		}
		
		chownDirRecursiveDoneMaybe();
	});
	
	pathsToChown++;
	arrPathsToChown.push(path);
	fs.chown(path, uid, gid, function chowned(err) {
		pathsToChown--;
		arrPathsToChown.splice(arrPathsToChown.indexOf(path), 1);
		if(err) return chownDirRecursiveDone(err);
		
		chownDirRecursiveDoneMaybe();
	});
	
	// Closure for path so statResult know's which path it stat'ed
	function doPath(path) {
		
		// Check if it's a directory
		pathsToStat++;
		fs.stat(path, function statResult(err, stats) {
			pathsToStat--;
			if(abort) return;
			if(err) return chownDirRecursiveDone(err);
			
			if(stats.isDirectory()) {
				// recursively chown if it's a directory
				pathsToChown++;
				arrPathsToChown.push(path);
				chownDirRecursive(path, uid, gid, function(err) {
					pathsToChown--;
					arrPathsToChown.splice(arrPathsToChown.indexOf(path), 1);
					if(err) return chownDirRecursiveDone(err);
					
					chownDirRecursiveDoneMaybe();
					
				});
			}
			else {
				// chown the file
				pathsToChown++;
				arrPathsToChown.push(path);
				fs.chown(path, uid, gid, function chowned(err) {
					pathsToChown--;
					arrPathsToChown.splice(arrPathsToChown.indexOf(path), 1);
					if(err) return chownDirRecursiveDone(err);
					
					chownDirRecursiveDoneMaybe();
				});
			}
		});
		
	}
	
	function chownDirRecursiveDoneMaybe() {
		if(pathsToStat == 0 && dirsToRead == 0 && pathsToChown == 0 && !abort) {
			console.log("chownDirRecursive: Done! path=" + path);
			chownDirRecursiveDone(null);
		}
		else {
			console.log("chownDirRecursive: path=" + path + " pathsToStat=" + pathsToStat + " dirsToRead=" + dirsToRead + 
			" pathsToChown=" + pathsToChown + " abort=" + abort + " arrPathsToChown=" + JSON.stringify(arrPathsToChown));
		}
	}
	
	function chownDirRecursiveDone(err) {
		abort = true;
		
		if(callback) {
			callback(err);
			console.log("chownDirRecursive: Called callback! pack=" + path + " err=" + err);
			callback = null;
		}
		else throw new Error("Callback to be called twice!");
	}
	
}


function mount(sourcePath, targetPath, callback) {
	var fs = require("fs");
	
	var abort = false;
	
	// Are we mounting a file or a folder !?
	
	fs.stat(sourcePath, function(err, sourceStats) {
		
		if(err) return mountDone(err);
		
		console.log("Folder exist: " + sourcePath);
		
		// Does the target exist ?
		fs.stat(targetPath, function(err, targetStats) {
			
			if(err) {
				if(err.code != "ENOENT") return mountDone(err);
				
				console.log("Target doesn't exist: " + targetPath);
				
				if(sourceStats.isDirectory()) {
					console.log("Source is a directory: " + targetPath);
					makeDirP(targetPath, function(err) {
						if(err) return mountDone(err);
						console.log("Target directory created: " + targetPath);
						targetCreated();
					});
				}
				else {
					console.log("Source is a file: " + targetPath);
					var parentFolder = UTIL.parentFolder(targetPath);
					makeDirP(parentFolder, function(err) {
						if(err) {
							if(err.code == "EEXIST" && err.message.indexOf(parentFolder) != -1) {
								// If mount is called several time with the same root folders there can be racing 
								console.log("Racing to create parentFolder=" + parentFolder + ": " + err.message);
							}
							else {
								console.log("makeDirP failed!");
								console.log("err.code=" + err.code + " ==EEXIST ? " + (err.code == "EEXIST") + "");
								console.log("parentFolder=" + parentFolder);
								console.log("err.message=" + err.message + " (err.message.indexOf(parentFolder)=" + err.message.indexOf(parentFolder) + ")");
								return mountDone(err);
							}
						}
						
						// Create emty file
						console.log("Creating emty file: " + targetPath);
						fs.open(targetPath, 'w', function (err, fileDescriptor) {
							if(err) {
								console.log("fs.open targetPath=" + targetPath + " error: " + err.message);
								return mountDone(err);
							}
							console.log("File opened for write: " + targetPath);
							
							fs.close(fileDescriptor, function(err) {
								if(err) {
									console.log("fs.close targetPath=" + targetPath + " error: " + err.message);
									return mountDone(err);
								}
								console.log("Emty file created: " + targetPath);
								targetCreated();
							}); 
						});
					});
				}
			}
			else {
				
				console.log("Target exist: " + targetPath);
				
				if(sourceStats.ino == targetStats.ino) return mountDone(null); // Already mounted!
				
				if(sourceStats.isDirectory()) {
					
					if(!targetStats.isDirectory()) return mountDone(new Error("Source is a directory, but target is not! sourcePath=" + sourcePath + 
					" targetPath=" + targetPath + " sourceStats=" + sourceStats + " targetStats=" + targetStats + " "));
					
					// Check if the target folder is emty
					fs.readdir(targetPath, function readDir(err, files) {
						if(err) return mountDone(err);
						
						if(files.length > 0) return mountDone(new Error("Target directory not empty! Can not mount to targetPath=" + targetPath + " targetStats=" + JSON.stringify(targetStats) + " "));
						else targetCreated();
						
					});
				}
				else {
					// Make sure the file is emty
					if(targetStats.size !== 0) {
mountDone(new Error("Target file not emty! Can not mount sourcePath=" + sourcePath + " to targetPath=" + targetPath + 
						" targetStats=" + targetStats + " sourceStats.ino=" + sourceStats.ino + " targetStats.ino=" + targetStats.ino + ""));
					}
					else targetCreated();
					
				}
			}
			
			function targetCreated() {
				
				var exec = require('child_process').exec;
				
				exec("mount --bind " + sourcePath + " " + targetPath , function(error, stdout, stderr) {
					if(error) return mountDone(error);
					if(stderr) return mountDone(new Error(stderr));
					if(stdout) return mountDone(new Error(stdout));
					
					return mountDone(null);
				});
				
			}
			
		});
		
	});
	
	function mountDone(err) {
		abort = true;
		if(callback) {
			callback(err);
			callback = null;
		}
	}
	
	/*
		
		
		if ( fs.lstatSync( source ).isDirectory() ) {
		// The source is a directory. Create a directory!
		makeDirPsync(target);
		
		} else {
		// The source is not a directory (it's a file!?). Check if the file exist, then create it
		if ( fs.existsSync( target ) ) throw new Error("File aready exist: " + target); // Prevent overwriting
		fs.closeSync(fs.openSync(target, 'w')); // Create emty file
		}
		
		var mountResult = child_process.execSync("mount --bind " + source + " " + target ).toString(ENCODING).trim();
		if(mountResult != "") throw mountResult;
		
		// Append to /etc/fstab so it is re-mounted after reboot
		//fs.appendFileSync('/etc/fstab', source + '   ' +  target + ' none bind 0 0\n')
		// Server was unable to boot after adding stuff to fstab!!
	*/
}


function umount(path, callback) {
	
	
	var exec = require('child_process').exec;
	
	exec("umount " + path + " --force --lazy" , function(error, stdout, stderr) {
		
		console.log("umount: path=" + path + " error=" + error + " stdout=" + stdout + " stderr=" + stderr);
		
		if(error) {
			if(error.message.indexOf("umount: " + path + ": not mounted") != -1) {
				console.warn("not mounted: path=" + path);
			}
			else if(error.message.indexOf("umount: " + path + ": mountpoint not found") != -1) {
				console.warn("mountpoint not found: path=" + path);
			}
			else if(error.message.indexOf("umount: " + path + ": No such file or directory") != -1) {
				console.warn("No such file or directory: path=" + path);
			}
			else return callback(error);
		}
		else {
			if(stderr) return callback(new Error(stderr));
			if(stdout) return callback(new Error(stdout));
		}
		
		console.log("umount: success! path=" + path);
		
		return callback(null);
		
	});
	
}


function makeDirP(path, callback) {
	
	var folders = UTIL.getFolders(path);
	
	if(folders.length == 0) throw new Error("Unable to get folders from path=" + path + " folders=" + JSON.stringify(folders));
	
	// Create the folders if they don't exist
	
	checkFolder(folders.shift());
	
	function checkFolder(folderPath) {
		if(!folderPath) throw new Error("folderPath=" + folderPath + " path=" + path + " folders=" + JSON.stringify(folders)); // For sanity
		
		fs.stat(folderPath, function(err, stats) {
			if(err) {
				if(err.code != "ENOENT") return makeDirPDone(err);
				
				// The path does not exist. Create it!
				fs.mkdir(folderPath, function (err) {
					if(err && err.code != "EEXIST") return makeDirPDone(err);
					
					if(folders.length > 0) checkFolder(folders.shift());
					else makeDirPDone(null);
				});
			}
			else if(!stats.isDirectory()) {
				return makeDirPDone(new Error("Not a directory: folderPath=" + folderPath + " path=" + path + " folders=" + JSON.stringify(folders)));
			}
			else {
				if(folders.length > 0) checkFolder(folders.shift());
				else makeDirPDone(null);
			}
		});
	}
	
	function makeDirPDone(err) {
		if(callback) {
			callback(err);
			callback = null;
		}
	}
}

function copyFile(source, target, cb) {
	var cbCalled = false;
	
	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	wr.on("close", function(ex) {
		done();
	});
	rd.pipe(wr);
	
	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
}

main();

