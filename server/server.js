#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

if(process.version.indexOf("v8.") != 0) console.warn("The editor has only been tested with node.js version 8!");

var EDITOR_VERSION = 0; // Populated by release script. Or it will be the latest commit id

var DEFAULT = require("./default_settings.js");

var getArg = require("../shared/getArg.js");

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number

var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email;

var STDIN_PORT = DEFAULT.stdin_channel_port;

var SMTP_PORT = getArg(["mp", "smtp_port"]) || DEFAULT.smtp_port;
var SMTP_HOST = getArg(["mh", "smtp_host"]) || DEFAULT.smtp_host;
var SMTP_USER = getArg(["mu", "smtp_user"]) || "";
var SMTP_PW = getArg(["mpw", "smtp_pass"]) || "";

var CRAZY = getArg(["crazy", "crazy"]); // If specified in arguments, allows user workers to run as root

var UTIL = require("../client/UTIL.js");

var HTTP_ENDPOINTS = {};
var defaultHomeDir = DEFAULT.home_dir;
var HOME_DIR = getArg(["h", "homedir"]) || defaultHomeDir;
if(HOME_DIR != defaultHomeDir) HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter

var DEBUG_CHROOT = false;

var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

var NO_BROADCAST = !!(getArg(["nobroadcast"]) || false);

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
			process.chdir(__dirname);
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

var GUEST_COUNTER = 0; // Incremented each time we create a new guest user
var GUEST_POOL = []; // Because it's a bit slow to create new users
var CREATE_USER_LOCK = false; // Can only create one user at a time

var GCSF = {}; // username: GCSF session

// Declare modules here as a OPTIMIZATION
var module_fs = require("fs");
var module_child_process = require('child_process');
var module_path = require("path");
var module_letsencrypt = require("../shared/letsencrypt.js");
var module_os = require("os");
var module_sockJs = require("sockjs");
var module_http = require("http");
var module_generator = require('generate-password');
var module_dgram = require('dgram');
var module_pwHash = require("./pwHash.js");
var module_mimeMap = require("./mimeMap.js");
var module_httpProxy = require('http-proxy');
var module_mount = require("../shared/mount.js");
var module_string_decoder = require('string_decoder');
var module_net = require("net");

// Optional modules:
try {
	var module_nodemailer = require('nodemailer');
	var module_smtpTransport = require('nodemailer-smtp-transport');
	var module_ps = require('ps-node');
}
catch(err) {
	log("Unable to load optional module(s): " + err.message);
}

var FAILED_SSL_REG = {}; // List of failed letsencrypt registrations, in order to not hit quota limits

var stdinChannelBuffer = "";
var editorProcessArguments = "";
var STDOUT_SOCKETS = [];

process.on("SIGINT", function sigInt() {
	log("Received SIGINT");
	
	HTTP_SERVER.close();
	
	for(var displayId in VNC_CHANNEL) stopVncChannel(displayId);
	
	
	process.exit();
	
});

process.on("exit", function () {
	log("Program exit\n\n", 6, true);
});

function unixTimeStamp() {
	return Math.floor(Date.now() / 1000);
}

function fillGuestPool(id, callback) {
	// Increase the guest pool
	
	if(typeof id == "function") {
		callback = id;
		id = undefined;
	}
	
	if(id == undefined) {
		createGuestUser(id, guestUserCreatedMaybe);
	}
	else if(typeof id == "number") {
		readPasswd("guest" + id, function(err, passwd) {
			if(err) {
				if(err.code == "USER_NOT_FOUND") {
					createGuestUser(id, guestUserCreatedMaybe);
				}
				else throw err;
			}
			else {
				guestUserCreatedMaybe(null, passwd);
			}
		});
	}
	else {
		throw new Error("id=" + id + " needs to be a number or undefined!");
	}
	
	function guestUserCreatedMaybe(err, userInfo) {
		if(err) {
			if(callback) return callback(err);
			else if(err.code == "LOCK") {
				console.warn("An account is already being created!");
			}
			else throw err;
		}
		else {
			if(!userInfo.username) throw new Error("No username in userInfo=" + JSON.stringify(userInfo));
			// Check mounts etc when filling the guest pool, instead of when logging in
			checkMounts(userInfo.username, userInfo.homeDir, userInfo.uid, userInfo.gid, function checkedMounts(err) {
				
				GUEST_POOL.push(userInfo.username);
				console.log("Guest account " + userInfo.username + " added to GUEST_POOL.length=" + GUEST_POOL.length);
				if(callback) callback(null);
				
			});
		}
	}
}

function readPasswd(username, readPasswdCallback) {
	if(username == undefined) throw new Error("username=" + username);
	console.log("Check for username=" + username + " in /etc/passwd ...");
	module_fs.readFile("/etc/passwd", "utf8", function readPasswdFile(err, etcPasswd) {
		if(err) {
			console.warn("Unable to read /etc/passwd !");
return readPasswdCallback(new Error("Unable to read /etc/passwd: " + err.message));
		}
		else {
			// format: testuser2:x:1001:1001:Test user 2,,,:/home/testuser2:/bin/bash
			var rows = etcPasswd.trim().split("\n");
			
			for(var i=0, row, pName, pUid, pGid, pDir, pShell; i<rows.length; i++) {
				row = rows[i].trim().split(":");
				
				var pName = row[0];
				var pUid = row[2];
				var pGid = row[3];
				var pDir = row[5];
				var pShell = row[6];
				
				if(pName == username) {
					console.log("Found username=" + username + " in /etc/passwd");
					
					readPasswdCallback(null, {
						username: username,
						homeDir: UTIL.trailingSlash(pDir), 
						uid: parseInt(pUid), 
						gid: parseInt(pGid),
						shell: pShell
					});
					
					return;
				}
			}
			
			console.warn("Did not find username=" + username + " in /etc/passwd");
			
			var error = new Error("Unable to find username=" + username + " in /etc/passwd ! A server admin need to add the user to the system.");
			error.code = "USER_NOT_FOUND";
			readPasswdCallback(error);
			// Add user account: sudo useradd -r -s /bin/false nameofuser
		}
	});
}

function recycleGuestAccounts(callback) {
	
	log("Recycling guest accounts ...");
	
	var currentTime = unixTimeStamp();
	var countLeft = GUEST_COUNTER-1;
	
	for (var i=1; i<GUEST_COUNTER; i++) tryRecycle(i);
	
	function tryRecycle(id) {
		console.log("tryRecycle: id=" + id);
		var homeDir = UTIL.joinPaths([HOME_DIR, "guest" + id]);
		module_fs.readdir(homeDir, function dir(err, files) {
			if(err && err.code == "ENOENT") {
				console.log(homeDir + " doesn't exist! Attempting to re-create guest" + id + " ...");
				// If the home dir doesn't exist usually mean there is a gap in the GUEST_COUNTER series, so try filling that gap
				fillGuestPool(id, function guestPoolFilledMaybe(err) {
					if(err) {
						if(err.code != "LOCK") {
							// Some accounts are "nuked" eg there's a group id still lingering after a failed removeuser run.
							// We don't want the editor to fail to start because of those "nuked" accounts
							log(err.message);
							sendMail("jzedit@" + HOSTNAME, ADMIN_EMAIL, "Error recycling guest" + id, "Error: " + err.message);
						}
					}
					processedGuestId(id);
					
				});
			}
			else if(err) throw err;
			else {
				var lastLoginFile = UTIL.joinPaths([homeDir, ".jzeditStorage", "lastLogin"]);
				module_fs.readFile(lastLoginFile, "utf8", function readLastLoginFile(err, data) {
					if(err && err.code == "ENOENT") {
						// If no lastLogin file exist should mean the user has *never* logged in
						console.log("guest" + id + ": " + err.code + " " + lastLoginFile);
						
						fillGuestPool(id);
						
						return processedGuestId(id);
					}
					else if(err) throw err;
					else {
						var lastLogin = parseInt(data);
						var timeDiff = currentTime - lastLogin; // In seconds
						var daysSinceLastLogin = Math.floor(timeDiff / (60 * 60 * 24));
						if(daysSinceLastLogin > 14) {
							console.log("guest" + id + ": lastLogin=" + lastLogin + " currentTime=" + currentTime + " timeDiff=" + timeDiff + " daysSinceLastLogin=" + daysSinceLastLogin);
							return resetGuest(id);
						}
						else return processedGuestId(id);
					}
				});
			}
		});
	}
	
	function resetGuest(id) {
		/*
			Just delete the user instead of trying to reset.
			We could use ZFS to restore, but then the account might not get all the latest features
			*/
		
		var username = "guest" + id;
		log("Removing guest user: " + username);
		
		var exec = module_child_process.exec;
		
		// Pass the arguments as JSON in case some hacker use a very clever password
		var commandArg = {
			username: username,
			noPwHash: NO_PW_HASH, // bang bang (!!) converts the value to a boolean
			};
		
		var options = {
			cwd: module_path.join(__dirname, "../") // Run in jzedit folder where removeuser.js is located
		}
		//console.log("Running in options.cwd=" + options.cwd);
		var scriptPath = UTIL.trailingSlash(options.cwd) + "removeuser.js";
		
		// Enclose argument with '' to send it "as is" (bash/sh will remove ")
		var command = scriptPath + " " + username;
		//console.log("command=" + command);
		
		exec(command, options, function removeuser(error, stdout, stderr) {
			CREATE_USER_LOCK = false;
			
			if(error) {
				log("Error when removing user: (error is probably in " + scriptPath + ")");
				throw error;
			}
			
			stderr = stderr.trim(); // Can be a new line (LF)
			stdout = stdout.trim();
			
			if(stderr) log(stderr, NOTICE);
			
			if(!stdout) throw new Error("Problem when removing username=" + username + "! Exec command=" + command + " did not return anyting!");
			
			log("stdout=" + stdout, DEBUG);
			
			var checkre = /User (.*) deleted!/g;
			var check = checkre.exec(stdout);
			if(check == null) throw new Error("It seems command=" + command + " failed! error=" + (error && error.message) + " stderr=" + stderr + " stdout=" + stdout);
			// Should have: User nameOfUser deleted!
			var reG1User = check[1];
			
			if(reG1User != username) throw new Error("Wrong user deleted !? reG1User=" + reG1User + " username=" + username);
			
			// Do not re-create the user right away. Wait for next call to recycleGuestAccounts.
			
			processedGuestId(id);
			
		});
		
	}
	
	function processedGuestId(id) {
		countLeft--;
		
		console.log("Done recycling id=" + id + " countLeft=" + countLeft);
		
		if(countLeft == 0) callback(null);
	}
	
}

function main() {
	
	// Get the current user (who runs this server)
	
	var info = module_os.userInfo ? module_os.userInfo() : {username: "ROOT", uid: process.geteuid()};
	var env = process.env;
	
	CURRENT_USER = env.SUDO_USER ||	env.LOGNAME || env.USER || env.LNAME ||	env.USERNAME || info.username;
	
	log("Server running as user=" + CURRENT_USER);
	
	if(info.uid < 0) log("Warning: Your system do not support setuid and chroot. All users will have the same security privaleges as the current user!", 4);
	
	if(info.uid !== 0 && !USERNAME && !NO_CHROOT) {
		log("Run the server with a previleged user (sudo). Or use the -nochroot flag.", 5);
		log(info);
		process.exit();
	}
	
	if(EDITOR_VERSION == 0) {
		var exec = module_child_process.exec;
		var getLatestCommitId = "hg log -l 1"
		exec(getLatestCommitId, function(error, stdout, stderr) {
			//console.log("stdout: " + stdout);
			//console.log("stderr: " + stderr);
			if (error !== null) {
				log("exec '" + getLatestCommitId + "' error: " + error, WARN);
			}
			
			//changeset:\s*(\d*):
			var findChangeset = /changeset:\s*(\d*):/g;
			
			var matchChangeset = findChangeset.exec(stdout);
			
			if(!matchChangeset) log("Unable to find changeset in '" + stdout + "'", WARN);
			else EDITOR_VERSION = parseInt(matchChangeset[1].toString());
			
			getGuestCount();
			
		});
	}
	else getGuestCount();
	
	function getGuestCount() {
		if(!USERNAME && !NO_CHROOT) {
		module_fs.readFile(__dirname + "/GUEST_COUNTER", "utf8", function(err, data) {
		if(err) {
			if(err.code != "ENOENT") throw err;
			// Create the file if it doesn't exist
			// Creating a guest account will create the GUEST_COUNTER file!
			fillGuestPool(function guestPoolFilledMaybe(err) {
				if(err && err.code != "LOCK") throw err;
				else startServer();
			});
			/*
					module_fs.writeFile(__dirname + "/GUEST_COUNTER", "0", { flag: 'wx' }, function (err) {
				if (err) throw err;
				console.log("Created " + __dirname + "/GUEST_COUNTER");
			});
			*/
		}
else {
			GUEST_COUNTER = parseInt(data);
			recycleGuestAccounts(function guestAccountsRecycled(err) {
					log("GUEST_POOL.length=" + GUEST_POOL.length);
				if(err) throw err;
				startServer();
			});
		}
	});
	}
	else startServer();
	}
	
	function startServer() {
		
		var wsServer = module_sockJs.createServer();
		wsServer.on("connection", sockJsConnection);
		
		HTTP_SERVER = module_http.createServer(handleHttpRequest);
		
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
		
		
		if(HTTP_IP == "127.0.0.1") {
			if(NO_CHROOT && USERNAME ) {
				openStdinChannel();
			}
			
			log("Server running on URL/address: http://" + makeUrl() + "");
			
		}
		
		if(HTTP_IP != "127.0.0.1" && !NO_BROADCAST) {
			broadcast(HTTP_IP);
		}
		
	}
}

function openStdinChannel() {
	var env = process.env;
	var StringDecoder = module_string_decoder.StringDecoder;
	var decoder = new StringDecoder('utf8');
	var stdInFileName = "stdin";
	var client_connections;
	var gotArguments = false; // The data will always start with process arguments and then a line-break
	
	var stdinServer = module_net.createServer();
	
	stdinServer.on("listening", function stdinServerListening() {
		log("stdin channel listening on port " + STDIN_PORT, DEBUG);
	});
	
	stdinServer.on("connection", function stdinConnection(socket) {
		log("stdin channel connection !");
		
		// Reset state for each connection
		gotArguments = false;

		STDOUT_SOCKETS.push(socket);
		
		socket.on("data", stdIn);
		socket.on("end", stdEnd);
		
		socket.on("close", function sockClose(hadError) {
			console.log("stdin channel socket closed. hadError=" + hadError);
			STDOUT_SOCKETS.splice(STDOUT_SOCKETS.indexOf(socket));
		});
		
		// Must listen for errors or node -v 8 on Windows will throw on any socket error!
		socket.on("error", function sockError(err) {
			console.log("stdin channel socket error: " + err.message);
		});
		
	});
	
	stdinServer.on("error", function stdSocketError(err) {
		console.warn("stdin channel error: " + err.message);
	});
	
	stdinServer.listen(STDIN_PORT, "127.0.0.1");
	
	
	function sendToAll(user_connections, data) {
		for (var i=0, conn; i<user_connections.connections.length; i++) {
			user_connections.connections[i].write(data);
		}
	}
	
	function sendOrBuffer(str) {
		client_connections = USER_CONNECTIONS[USERNAME];
		
		if(client_connections) {
			var data = JSON.stringify({stdin: str}); // Serialize
			console.log("Sending data to editor client user " + USERNAME + " (str.length=" + str.length + ")");
			sendToAll(client_connections, data);
		}
		else {
			console.log("Editor client user " + USERNAME + " not connected! str.length=" + str.length);
			stdinChannelBuffer += str;
		}
	}
	
	function stdIn(data) {
		var str = decoder.write(data);
		
		if(!gotArguments) {
			// Look for a linebreak
			var lbIndex = str.indexOf("\n");
			if(lbIndex != -1) {
				var args = str.slice(0, lbIndex);
				console.log("args=" + UTIL.lbChars(args));
				if(args.length > 0) {
					client_connections = USER_CONNECTIONS[USERNAME];
					if(client_connections) {
						var data = JSON.stringify({arguments: args}); // Serialize
						console.log("Sending editor arguments to client user " + USERNAME + " (str.length=" + str.length + ")");
						sendToAll(client_connections, data);
					}
					else {
						console.log("Editor client user " + USERNAME + " not connected! Saving arguments for when the user logs in: args=" + args);
						editorProcessArguments = args;
					}
				}
				str = str.slice(lbIndex+1);
				gotArguments = true;
			}
		}
		
		if(str.length > 0) sendOrBuffer(str);
		console.log("STDIN: data.length=" + data.length + " stdinChannelBuffer.length=" + stdinChannelBuffer.length + " data=" + data);
	}
	
	function stdEnd(endData) {
		if(endData) sendOrBuffer(decoder.write(endData));
		console.log("STDIN: END: endData.length=" + (endData && endData.length) );
	}
	
	
}

function createGuestUser(id, callback) {
	
	if(typeof id == "function") {
		callback = id;
		id = undefined;
	}
	else if(typeof id != "number" && typeof id != "undefined") {
		throw new Error("id=" + id + " needs to be a number or undefined!");
	}
	
	if(typeof callback != "function") throw new Error("createGuestUser must have a callback function!");
	
	if(CREATE_USER_LOCK) {
		var err = new Error("A user is already about the be created!");
		err.code = "LOCK";
		return callback(err);
	}
	CREATE_USER_LOCK = true;
	
	if( id ) {
		var guestId = id;
		var username = "guest" + guestId;
		console.time("Create " + username + " account");
		guestCounterSaved(null);
	}
	else {
		var guestId = ++GUEST_COUNTER;
		var username = "guest" + guestId;
		console.time("Create " + username + " account");
		
		// Save guest counter so that we can continue the number serie after server restarts
		// It's not that bad if there are holes in the number serie. 
		// We however don't want to give two people the same guest account!
		module_fs.writeFile(__dirname + "/GUEST_COUNTER", GUEST_COUNTER, guestCounterSaved);
	}
	
	function guestCounterSaved(err) {
		if(err) return callback(err);
		
		if(username == undefined || username == "guestundefined" || username == "[object Object]") {
			throw new Error("username=" + username + " id=" + id + " guestId=" + guestId);
		}
		
		var password = module_generator.generate({
			length: 10,
			numbers: true
		});

		console.log("Creating guest user: " + username);
		
		if(!username) throw new Error("username=" + username);
		
		var exec = module_child_process.exec;
		
		// Pass the arguments as JSON in case some hacker use -pwfile /etc/something in their password
		var commandArg = {
			username: username,
			password: password,
			noPwHash: NO_PW_HASH, // bang bang (!!) converts the value to a boolean
			noCert: false
		};
		
		
		var options = {
			cwd: module_path.join(__dirname, "../") // Run in jzedit folder where adduser.js is located
		}
		console.log("Running in options.cwd=" + options.cwd);
		var scriptPath = UTIL.trailingSlash(options.cwd) + "adduser.js";
		
		// Enclose argument with '' to send it "as is" (bash/sh will remove ")
		var command = scriptPath + " '" + JSON.stringify(commandArg) + "'";
		console.log("command=" + command);
		
		exec(command, options, function adduser(error, stdout, stderr) {
			CREATE_USER_LOCK = false;
			
			if(error) {
				log("Error when adding username=" + username + " user: (error is probably in " + scriptPath + ")");
				return callback(error);
			}
			
			console.log("stderr=" + UTIL.lbChars(stderr));
			
			stderr = stderr.trim(); // Can be a new line (LF)
			stdout = stdout.trim();
			
			if(stderr) return callback(new Error("stderr=" + stderr + " (stderr.length=" + stderr.length + ")"));
			if(!stdout) throw new Error("Problem when creating username=" + username + "! Exec command=" + command + " did not return anyting!");

			log("stdout=" + stdout, DEBUG);
			var checkre = /User with username=(.*), password=(.*), uid=(.*), gid=(.*), homeDir=(.*) successfully added!/g;
			
			var check = checkre.exec(stdout);
			if(check == null) throw new Error("It seems command=" + command + " failed! error=" + (error && error.message) + " stderr=" + stderr + " stdout=" + stdout);
			// User with username=demo4 and password=demo4 successfully added!
			var reG1User = check[1];
			var reG2Pw = check[2];
			var reG3Uid = parseInt(check[3]);
			var reG4Gid = parseInt(check[4]);
			var reG5HomeDir = UTIL.trailingSlash(check[5]);
			
			console.timeEnd("Create " + username + " account");
			
			if(check == null) {
				return callback(new Error("Unable to create username=" + username + "! checkre=" + checkre + " failed! check=" + check + " stdout=" + stdout));
			}
			else if(reG1User == username && reG2Pw == password) {
				log("Account username='" + username + "' successfully created!");
				return callback(null, {username: username, password: password, uid: reG3Uid, gid: reG4Gid, homeDir: reG5HomeDir});
			}
			else {
				return callback(new Error("Problem when creating username=" + username + " with password=" + password +
				" reG1User=" + reG1User + " reG2Pw=" + reG2Pw + " " +
				" check=" + JSON.stringify(check, null, 2) + " stdout=" + stdout));
			}
			
		});
	}
}


function broadcast(myIp) {
	
	// Listen to and answer broadcast messages
	// http://stackoverflow.com/questions/6177423/send-broadcast-datagram
	
	var serverAdvertiseMessage = "jzedit server url: " + makeUrl();
	
	log(serverAdvertiseMessage);
	
	var broadcastAddresses = [];
	
	var broadcastPort = 6024;
	
	if(myIp == "0.0.0.0") {
		// We'll have to find all broadcast addresses ...
		
		var interfaces = module_os.networkInterfaces();
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
		
		// Server
		var broadcastServer = module_dgram.createSocket("udp4");
		broadcastServer.bind(function() {
			broadcastServer.setBroadcast(true);
			// We must send at least one broadcast message to be able to receive messages!
			for(var i=0; i<broadcastAddresses.length; i++) setAdvertiseInterval(broadcastAddresses[i]);
		});
		
		// Client
		var broadcastClient = module_dgram.createSocket('udp4');
		
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
	var recreateUserProcessSleepTime = 0;
	var lastUserProcessCrash = new Date();
	
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
		
		gcsfCleanup(userConnectionName);
		
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
		throw new Error("DEPRECATED");
		
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
		"use strict";
		
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
		
		if(command == "stdout") {
			try {
			for (var i=0; i<STDOUT_SOCKETS.length; i++) {
				STDOUT_SOCKETS[i].write(json.data);
			}
			}
			catch(err) {
				send({error: err.message});
			}
			
			return;
		}
		else if(command == "log") {
			log((userConnectionName ? userConnectionName : IP) + ": " + json.data, DEBUG);
			
			return false;
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
				var createUserRetries = 0;
				
				(function checkUser(username, password) {
					
					//console.log(IP + " loggingin as " + username + ": " + (new Date()).getTime());
					console.time("Login " + IP); // user=guest can change to user###
					
					if(!NO_PW_HASH && !PASSWORD) {
						
						password = module_pwHash(password);
					}
					
					if(USERNAME) {
						console.log("Using USERNAME=" + USERNAME+ " from argument ...")
						
						// Use CURRENT_USER instead of USERNAME as username to prevent issies with /home/username
						if(USERNAME == username && PASSWORD == password) idSuccess();
						else idFail("Wong username or password! (Username specified in server arguments)");
					}
					else if(username == "guest") {
// ### Login as guest
// Assign a user from the guest pool
if(GUEST_POOL.length == 0) {
							// Need to wait until a new guest account is created
							console.log("Creating new guest user because GUEST_POOL.length=" + GUEST_POOL.length);
							createGuestUser(function guestUserCreated(err, createdUser) {
								if(err) {
									if(err.code != "LOCK") throw err;
									if(++createUserRetries > 3) {
										return send({error: "Unable to create guest account. Try again later. Or login with existing account."});
									}
									return setTimeout(function retryCreateAccount() {
										console.log("Retrying guest login ...");
										checkUser(username, password);
									}, 1000);
								}
								else loginAsGuest(createdUser.username, createdUser.password, false);
							});
						}
						else {
							var guestUser = GUEST_POOL.shift();
							console.log("Using guest account " + guestUser + " from GUEST_POOL");
							var guestPw = module_generator.generate({
								length: 10,
								numbers: true
							});
							loginAsGuest(guestUser, guestPw, true);
							// Save/Reset the password
							if(!NO_PW_HASH) {
								
								guestPw = module_pwHash(guestPw);
							}
							
							module_fs.writeFile(UTIL.joinPaths([HOME_DIR, username, ".jzeditpw"]), guestPw, function(err) {
								if(err) throw err;
								console.log("Saved guest=" + guestUser + " new password");
							});
						}
					}
					else {
						
						module_fs.readdir(HOME_DIR, function readDir(err, files) {
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
					
					function loginAsGuest(guestUser, guestPassword, alreadyCheckedMounts) {

						console.log("New guest login: " + guestUser);
						
						sendMail("jzedit@" + HOSTNAME, ADMIN_EMAIL, guestUser, "New guest login: user=" + guestUser + " IP=" + IP);
						
username = guestUser;
						idSuccess(alreadyCheckedMounts);

						send({saveLogin: {user: username, pw: guestPassword}, id: 0});
						
						if(GUEST_POOL.length <= 0) {
							// Increase the guest pool
							// But wait until user has logged in ()
							setTimeout(fillGuestPool, 3000);
						}
					}
					
					function checkPw() {
						
						module_fs.readFile(UTIL.joinPaths([HOME_DIR, username, ".jzeditpw"]), "utf8", function readPw(err, pwstringFromFile) {
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
					
						console.timeEnd("Login " + IP);
						
					}
					
					function idSuccess(alreadyCheckedMounts) {
						
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
							readPasswd(username, function(err, passwd) {
								if(err) throw err;
								
								homeDir = passwd.homeDir;
								shell = passwd.shell;
								uid = passwd.uid;
								gid = passwd.gid;
								rootPath = passwd.homeDir;
								
								if(alreadyCheckedMounts) acceptUser();
								else checkMounts(username, homeDir, uid, gid, checkedMounts);
								
							});
						}
						
						function checkedMounts(err) {
							if(err) idFail("Problem creating mounts: " + err.message);
							else acceptUser();
						}
						
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
							// Tell the worker process which user
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
							
							if(NO_CHROOT) installDirectory = __dirname.replace(/server$/, "");
							else log("userConnectionName=" + userConnectionName + " NO_CHROOT=" + NO_CHROOT);
							
							// Respond to the client that the login was successful
							send({resp: {loginSuccess: {user: userConnectionName, cId: userConnectionId, installDirectory: installDirectory, editorVersion: EDITOR_VERSION}}});
							
							if(commandQueue.length > 0) {
								console.log("Running " + commandQueue.length + " commands from the command queue ...");
								for(var i=0; i<commandQueue.length; i++) {
									handleUserMessage(commandQueue[i]);
								}
								commandQueue.length = 0;
							}
							
							if(userConnectionName == USERNAME) {
								if(stdinChannelBuffer) {
									var data = JSON.stringify({stdin: stdinChannelBuffer});
									connection.write(data);
									stdinChannelBuffer = "";
								}
								
								if(editorProcessArguments) {
									var data = JSON.stringify({arguments: editorProcessArguments});
									connection.write(data);
									editorProcessArguments = "";
								}
							}
							
							module_fs.writeFile(UTIL.joinPaths([homeDir, ".jzeditStorage/lastLogin"]), unixTimeStamp(), function(err) {
								if(err) throw err;
								
								console.timeEnd("Login " + IP);
								console.log(IP + " logged in as " + username + "");
							});
							
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
											if(err) workerResp(err.message);
											else workerResp(null, {url: url});
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
											workerResp(err, resp);
										});
										}
									else if(req.googleDrive) {
										console.log("req.googleDrive=" + JSON.stringify(req.googleDrive));
										if(req.googleDrive.code) {
											if(!GCSF[userConnectionName]) return workerResp(new Error("No active GCSF sessions for " + userConnectionName));
											GCSF[userConnectionName].enterCode(req.googleDrive.code, function(err, resp) {
												workerResp(err, resp);
											});
										}
										else if(req.googleDrive.umount) {
											// Both gcsfUmount and gcsfLogout will call gcsfCleanup() which closes any GCSF login or mount session
											gcsfUmount(userConnectionName, function(umountError) {
												gcsfLogout(userConnectionName, function(logoutErr) {
													var errMsg = "";
													if(umountError) errMsg += "Failed to umount!"; // Don't give too much info (might be sensitive)
													if(logoutErr) errMsg += "Failed to logout: " + logoutErr.message;
													
													workerResp(errMsg || null);
												});
											});
										}
										else if(req.googleDrive.cancelLogin) {
											if(!GCSF[userConnectionName]) return workerResp(new Error("No active GCSF sessions for " + userConnectionName));
											
											gcsfCleanup(userConnectionName);
											
											return workerResp(null);
											
										}
										else {
											gcsfLogin(userConnectionName, 0, function(err, resp) {
												workerResp(err, resp);
											});
										}
									}
									
									else throw new Error("Unknown request from worker: " + JSON.stringify(req, null, 2));
									
								}
								else throw new Error("Bad message from worker: workerMessage=" + JSON.stringify(workerMessage, null, 2));
								
								
								function workerResp(err, resp) {
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
									
									log("Recreating user worker process for " + userConnectionName);
									
									var timeSinceLastCrash = new Date() - lastUserProcessCrash;
									console.log("timeSinceLastCrash=" + timeSinceLastCrash);
									if( timeSinceLastCrash > (10000 + recreateUserProcessSleepTime*2) ) recreateUserProcessSleepTime = 0;
									else recreateUserProcessSleepTime = 2000 + recreateUserProcessSleepTime * 2;
									
									lastUserProcessCrash = new Date();
									
									msg += " Which means it crashed. And you should probably file a bug report!\n\n(worker process is being restarted in " + recreateUserProcessSleepTime/1000 + " seconds ...)";
									
									console.log("Waiting " + recreateUserProcessSleepTime/1000 + " seconds before restarting worker process for user " + username);
									setTimeout(function restartWorkerProcess() {
										userWorker = createUserWorker(userConnectionName, uid, gid);
									userWorker.send({identify: userInfo});
									
									userWorker.on("message", messageFromWorker);
									userWorker.on("close", workerCloseHandler);
									}, recreateUserProcessSleepTime);
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
			
			if(answer.id === 0) delete answer["id"];
			
			if(!answer.id && answer.hasOwnProperty("resp")) throw new Error("No id in answer with resp! answer=" + JSON.stringify(answer));
			if(!answer.id && answer.hasOwnProperty("error")) throw new Error("No id in answer with error! answer=" + JSON.stringify(answer));
			// Possible cause: callback being called twice or a "resp" that should be an "event" instead.
			
			var str = JSON.stringify(answer);
			
			log(IP + " <= " + (answer.id ? answer.id : "") + UTIL.shortString(str));
			
			conn.write(str);
		}
	}
	
}


function checkMounts(username, homeDir, uid, gid, checkMountsCallback) {
	"use strict";
	
	if(username == "guestundefined") throw new Error("username=" + username);
	
	if(username == undefined) throw new Error("username=" + username);
	if(homeDir == undefined) throw new Error("homeDir=" + homeDir);
	if(uid == undefined) throw new Error("uid=" + uid);
	if(gid == undefined) throw new Error("gid=" + gid);
	if(checkMountsCallback == undefined) throw new Error("checkMountsCallback=" + checkMountsCallback);
	
	// Make sure everything is mounted etc ...
	
	// When a user have been moved to another server, the user id will be different.
	// So we have to reset the user permissions!
	// www-data user id might be the same though, depending on distro
	
	if(NO_CHROOT) {
		console.log("Not checking mounts because -nochroot option in server parameters");
		return acceptUser();
	}
	
	console.log("Checking mounts for username=" + username + " ...");
	console.time("check " + username + " mounts");
	
	var nginxProfileOK = false;
	var foldersToMount = 24;
	var apparmorProfilesToCreate = 6;
	var reloadApparmor = false;
	var reloadedApparmor = false;
	var checkMountsReady = false;
	var sslCertChecked = false;
	var npmSymLinkCreated = false;
	var hgrccacertsUptodate = true;
	var passwdCreated = false;
	var checkMountsAbort = false;
	
	var apparmorProfiles = [
		"../etc/apparmor/usr.bin.nodejs_someuser",
		"../etc/apparmor/home.someuser.usr.bin.node",
		"../etc/apparmor/home.someuser.usr.bin.python",
		"../etc/apparmor/home.someuser.usr.bin.hg",
		"../etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npm-cli.js",
		"../etc/apparmor/home.someuser.bin.bash"
	];
	
	checkUserRights(username, function checkedUserRights(err) {
		if(err) return checkMountsError(err);
		
		console.log("User rights OK for username=" + username);
		
		/*
			// Check if cacerts need to be updated
			var userHgrccacertsPath = HOME_DIR + username + "/etc/mercurial/hgrc.d/cacerts.rc";
			var systemHgrccacertsPath = "/etc/mercurial/hgrc.d/cacerts.rc";
			module_fs.stat(userHgrccacertsPath, function (err, userHgrccacerts) {
			if(err) return checkMountsError(err);
			if(checkMountsAbort) return;
			module_fs.stat(userHgrccacertsPath, function (err, systemHgrccacerts) {
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
		
		
		/*
			Make sure mounts exist
			----------------------
			Mount these instead of copying to save hdd space
			Don't forget to update var foldersToMount=
			
			Problem: Racing to create folders
			Solution: Create folder before mounting
			
			Each mount takes ca 150ms, so only mount bare minimum for performance!
			(it's better performance wise to mount a whole folder then many separate files in the same folder)
			
			Sort alpabetically. And don't forget to update removeuser.js !
		*/
		
		console.time("Mount " + username + " files and folders");
		
		if(!DEBUG_CHROOT) {
			foldersToMount += 9; // <-- Update
			
			module_mount("/etc/ssl/certs", homeDir + "etc/ssl/certs", folderMounted); // Sometimes? Needed for SSL verfification
			
			module_mount("/usr/bin/env", homeDir + "usr/bin/env", folderMounted); // common in shebangs (npm needs it)
			module_mount("/usr/bin/hg", homeDir + "usr/bin/hg", folderMounted);
			module_mount(process.argv[0], homeDir + "usr/bin/node", folderMounted);
			module_mount("/usr/bin/python", homeDir + "usr/bin/python", folderMounted);
			module_mount("/usr/bin/ssh", homeDir + "usr/bin/ssh", folderMounted); // So users can ssh into other machines (and use git+ssh !?)
			module_mount("/usr/bin/ssh-keygen", homeDir + "usr/bin/ssh-keygen", folderMounted); // Generating ssh keys
			module_mount("/usr/bin/unrar", homeDir + "usr/bin/unrar", folderMounted);
			module_mount("/usr/bin/unzip", homeDir + "usr/bin/unzip", folderMounted);
			
			// Be able to type npm in terminal:
			module_fs.symlink("../lib/node_modules/npm/bin/npm-cli.js", homeDir + "usr/bin/npm", function symLinkCreated(err) {
				if(err && err.code != "EEXIST") throw err; // It's allright if the link already exist
				npmSymLinkCreated = true;
			});
		}
		else {
			foldersToMount += 2;
			module_mount("/usr/bin/", homeDir + "usr/bin/", folderMounted);
			module_mount("/etc/", homeDir + "etc/", folderMounted);
			npmSymLinkCreated = true;
		}
		
		module_mount("/bin/bash", homeDir + "bin/bash", folderMounted); // Shell for "terminal"
		module_mount("/bin/gunzip", homeDir + "bin/gunzip", folderMounted);
		module_mount("/bin/gzip", homeDir + "bin/gzip", folderMounted); // gunzip seems to need it
		module_mount("/bin/ln", homeDir + "bin/ln", folderMounted); // can be useful when fiddling in the terminal
		module_mount("/bin/ls", homeDir + "bin/ls", folderMounted); // for debugging
		module_mount("/bin/mkdir", homeDir + "bin/mkdir", folderMounted); // can be useful when fiddling in the terminal
		module_mount("/bin/mv", homeDir + "bin/mv", folderMounted); // can be useful when fiddling in the terminal
		module_mount("/bin/rm", homeDir + "bin/rm", folderMounted); // can be useful when fiddling in the terminal
		module_mount("/bin/rmdir", homeDir + "bin/rmdir", folderMounted); // can be useful when fiddling in the terminal
		module_mount("/bin/sh", homeDir + "bin/sh", folderMounted); // gunzip will give ENOENT error without it
		module_mount("/bin/tar", homeDir + "bin/tar", folderMounted);
		
		// Some programs don't like if we create them using mkdnod
		module_mount("/dev/urandom", homeDir + "dev/urandom", folderMounted);
		module_mount("/dev/null", homeDir + "dev/null", folderMounted);
		module_mount("/dev/ptmx", homeDir + "dev/ptmx", folderMounted); // Needed for pseudo terminals (forkpty / pty.js)
		module_mount("/dev/pts/", homeDir + "dev/pts/", folderMounted); // Needed for pseudo terminals (forkpty / pty.js)
		
		module_mount("/lib/", homeDir + "lib", folderMounted);
		module_mount("/lib64/", homeDir + "lib64", folderMounted);
		
		module_mount("/proc/cpuinfo", homeDir + "proc/cpuinfo", folderMounted); // Needed for os.cpus()
		module_mount("/proc/stat", homeDir + "proc/stat", folderMounted); // Needed for nodejs/npm
		module_mount("/proc/sys/vm/overcommit_memory", homeDir + "proc/sys/vm/overcommit_memory", folderMounted); // Needed for nodejs/npm
		
		module_mount("/usr/lib/", homeDir + "usr/lib", folderMounted);
		module_mount("/usr/local/lib", homeDir + "usr/local/lib", folderMounted); // Needed for Python packages (hggit)
		module_mount("/usr/share/", homeDir + "usr/share", folderMounted); // Some python scripts (Mercurial) and others need it (sometimes)
		
		// We need separate executables to have separate apparmor profiles for user scripts and user_worker.js script
		module_mount(process.argv[0], '/usr/bin/nodejs_' + username, folderMounted);
		
		
		// Create apparmor profiles unless they already exist
		// createApparmorProfile returns the destination path from apparmorProfiles which is the path to the templates
		console.time("Creating " + username + " apparmor profiles");
		for (var i=0; i<apparmorProfiles.length; i++) {
			apparmorProfiles[i] = createApparmorProfile(apparmorProfiles[i], username, apparmorProfileCreated);
		}
		
		
		// Create a fake /etc/passwd that some programs use to lookup home dir and username
		// We don't want to use the systems /etc/passwd or these program will complain about /home/user not exist in the chroot
		if(!DEBUG_CHROOT) {
			module_fs.writeFile(homeDir + "etc/passwd", username + ":x:" + uid + ":" + gid + "::/:/bin/bash", function(err) {
				passwdCreated = true;
				checkMountsReadyMaybe();
			});
		}
		else passwdCreated = true;
		
		// Make sure nginx profile exist
		console.time("Check " + username + " nginx profile");
		var url_user = UTIL.urlFriendly(username);
		var nginxProfilePath = "/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx";
		module_fs.stat(nginxProfilePath, function (err, stats) {
			if(checkMountsAbort) return;
			
			if(err) {
				if(err.code != "ENOENT") throw err;
				
				module_fs.readFile("../etc/nginx/user.webide.se.nginx", "utf8", function(err, nginxProfile) {
					if(checkMountsAbort) return;
					
					if(err) throw err;
					
					nginxProfile = nginxProfile.replace(/%USERNAME%/g, url_user);
					nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, homeDir);
					nginxProfile = nginxProfile.replace(/%DOMAIN%/g, DOMAIN);
					
					module_fs.writeFile(nginxProfilePath, nginxProfile, function(err) {
						if(err) throw err;
						console.log("Nginx profile created!");
						console.timeEnd("Check " + username + " nginx profile");
						checkNginxEnabled();
					});
					
				});
			}
			else {
				console.timeEnd("Check " + username + " nginx profile");
				checkNginxEnabled();
			}
			
			function checkNginxEnabled() {
				console.time("Check " + username + " Nginx enabled");
				var nginxProfileEnabledPath = "/etc/nginx/sites-enabled/" + url_user + "." + DOMAIN;
				module_fs.stat(nginxProfileEnabledPath, function (err, stats) {
					if(checkMountsAbort) return;
					
					if(err) {
						if(err.code != "ENOENT") throw err;
						
						module_fs.symlink(nginxProfilePath, nginxProfileEnabledPath, function(err) {
							if(err && err.code != "EEXIST") throw err;
							
							var exec = module_child_process.exec;
							exec("service nginx reload", function(error, stdout, stderr) {
								if(error) throw(error);
								if(stderr) throw new Error(stderr);
								if(stdout) throw new Error(stdout);
								
								nginxProfileOK = true;
								console.timeEnd("Check " + username + " Nginx enabled");
								
								checkSslCert();
								
								checkMountsReadyMaybe();
							});
							
						});
					}
					else {
						nginxProfileOK = true;
						console.timeEnd("Check " + username + " Nginx enabled");
						
						checkSslCert();
						
						checkMountsReadyMaybe();
					}
				});
			}
			
		});
		
	}); // checked user rights
	
	function checkUserRights(username, callback) {
		var toChown = 0;
		var toStat = 0;
		
		console.log("Checking user rights for username=" + username + " ...");
		console.time("Check " + username + " user rights");
		module_fs.stat(HOME_DIR + username, function (err, stats) {
			if(err) throw err;
			
			if(stats.uid != uid || stats.gid != gid) {
				// Reset the fs user rights
				// Don't chown all dirs though, chowning the mounted files could be disastrous!'
				
				// www user needs to have write access to /sock and read access to /wwwpub
				// make sure the right www user id
				getGroupId("www-data", function(err, wwwgid) {
					if(err) throw err;
					
					module_fs.readdir(HOME_DIR + username, function (err, files) {
						if(err) throw err;
						
						for (var i=0; i<files.length; i++) {
							check(files[i]);
						}
						
					});
					
					toChown++;
					module_fs.chown(HOME_DIR + username, uid, gid, function chowned(err) {
						toChown--;
						if(err) throw err;
						checkedUserRights();
					});
					
					function check(file) { // Closure so we know which path
						var path = UTIL.joinPaths([HOME_DIR, username, file]);
						
						console.log("checkUserRights: Checking file=" + file + " path=" + path);
						
						if(file=="dev" || file=="proc" || file=="bin" || file=="usr" || file=="lib" || file=="lib64") {
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
							module_fs.stat(path, function (err, stats) {
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
									module_fs.chown(path, uid, gid, function chowned(err) {
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
					console.timeEnd("Check " + username + " user rights");
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
			console.timeEnd("Creating " + username + " apparmor profiles");
			
			console.time(username + " Reloading apparmor");
			var exec = module_child_process.exec;
			
			var apparmorReloadTimer = setInterval(checkApparmorReloaded, 500);
			//var apparmorReloadCommand = "service apparmor reload";
			//var apparmorReloadCommand = "apparmor_parser -r ";
			var apparmorReloadCommand = "apparmor_parser -r";
			for (var i=0; i<apparmorProfiles.length; i++) {
				//apparmorReloadCommand += " && apparmor_parser -r " + apparmorProfiles[i];
				apparmorReloadCommand += " " + apparmorProfiles[i];
			}
			console.log("exec: " + apparmorReloadCommand);
			exec(apparmorReloadCommand, function(error, stdout, stderr) {
				console.timeEnd(username + " Reloading apparmor");
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
		
		if(foldersToMount == 0) console.timeEnd("Mount " + username + " files and folders");
		
		checkMountsReadyMaybe();
	}
	
	function checkMountsReadyMaybe() {
		if(checkMountsAbort) return;
		
		/*
			console.log("checkMounts: nginxProfileOK=" + nginxProfileOK + " passwdCreated=" + passwdCreated +
			" foldersToMount=" + foldersToMount + " apparmorProfilesToCreate=" + apparmorProfilesToCreate
			+ " reloadApparmor=" + reloadApparmor + " reloadedApparmor=" + reloadedApparmor + " sslCertChecked=" + sslCertChecked
			+ " npmSymLinkCreated=" + npmSymLinkCreated + " ");
		*/
		
		if(nginxProfileOK && foldersToMount == 0 && apparmorProfilesToCreate == 0 && passwdCreated && ((reloadApparmor && reloadedApparmor) || !reloadApparmor ) && npmSymLinkCreated) {
			
			if(!checkMountsReady) { // Prevent double accept
				checkMountsReady = true;
				console.timeEnd("check " + username + " mounts");
				checkMountsCallback(null);
			}
			else throw new Error("checkMounts already callced checkMountsCallback!");
			
		}
	}
	
	
	function checkMountsError(err) {
		if(checkMountsAbort) return;
		checkMountsAbort = true;
		
		checkMountsCallback(err);
		
	}
	
	function createApparmorProfile(template, username, callback) {
		/*
			example profile: "../etc/apparmor/usr.bin.nodejs_someuser"
		*/
		var dest = template.replace("someuser", username);
		
		var homeDot = HOME_DIR.substr(1).replace(/\//g, "."); // Remove first slash and replace remaining slashes with dots
		dest = dest.replace("home.", homeDot);
		dest = dest.replace("../etc/apparmor/", "/etc/apparmor.d/");
		
		//console.log("Apparmor: template=" + template + " dest=" + dest);
		
		// First check if the profile exist
		module_fs.stat(dest, function (err, stats) {
			
			if(err) {
				if(err.code != "ENOENT") throw err;
				
				module_fs.readFile(template, "utf8", function (err, apparmorProfile) {
					if(err) throw err;
					
					apparmorProfile = apparmorProfile.replace(/%HOME%/g, HOME_DIR);
					apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
					apparmorProfile = apparmorProfile.replace(/%JZEDIT%/g, UTIL.parentFolder(__dirname));
					
					// Create the profile
					module_fs.writeFile(dest, apparmorProfile, function (err) {
						if(err) throw err;
						
						reloadApparmor = true;
						
						/*
							var bin = dest.replace("/etc/apparmor.d", "");
							bin = dest.replace(".", "/");
							
							//var enforceApparmorProfileStdout = module_child_process.execSync("aa-enforce " + bin).toString(ENCODING).trim();
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
		
		return dest;
	}
	
	function checkSslCert() {
		// Check ssl certificate
		console.time("Check " + username + " SSL Cert");
		var url_user = UTIL.urlFriendly(username);
		var userDomain = url_user + "." + DOMAIN;
		
		var certPath = "/etc/letsencrypt/live/" + url_user + "." + DOMAIN + "/fullchain.pem";
		module_fs.stat(certPath, function(err, stat) {
			if(err == null) {
				console.log("SSL certificate for " + url_user + "." + DOMAIN + " exist!");
				
				enableSSL(userDomain); // Check if Nginx needs to be updated
				
				return;
			}
			else if(err.code == 'ENOENT') {
				console.log("ENOENT: certPath=" + certPath);
				
				if(FAILED_SSL_REG.hasOwnProperty(url_user + "." + DOMAIN)) {
					log("Skipping SSL registration because of too many failed attempts!");
					sslCertChecked = true;
					console.timeEnd("Check " + username + " SSL Cert");
					
					return;
				}
				
				// the cert does not exist. Try to register it
				
				console.time("Register " + userDomain + " with letsencrypt");
				var wildcard = false; // Check if johan.webide.se auto registers before starting using wildcards (Your cert will expire on 2018-12-03.)
				module_letsencrypt.register(userDomain, ADMIN_EMAIL, wildcard, function(err) {
					console.timeEnd("Register " + userDomain + " with letsencrypt");
					if(err) {
						if(FAILED_SSL_REG.hasOwnProperty(userDomain)) FAILED_SSL_REG[userDomain]++;
						else FAILED_SSL_REG[userDomain] = 1;
						
						if(err.code == "ENOENT") console.warn("certbot not installed!");
						else if(err.code == "RATE_LIMIT") console.warn("Unable to create letsencrypt cert because of rate limit!");
						else {
							console.warn(err.message);
						}
						
						sslCertChecked = true;
						console.timeEnd("Check " + username + " SSL Cert");
					}
					else {
						console.log("SSL certificate for " + userDomain + " installed!");
						
						enableSSL(userDomain);
					}
				}); // letsencrypt.register
			}
			else {
				// Another module_fs.stat ssl file error
				throw err;
			}
		});
		
		function enableSSL(userDomain) {
			// Enable SSL on the site
			var nginxProfilePath = "/etc/nginx/sites-available/" + userDomain + ".nginx";
			module_fs.readFile(nginxProfilePath, "utf8", function read(err, data) {
				if(err) throw err;
				
				if(data.indexOf("#SSL#") == -1 || data.indexOf("#NOSSL#") == -1) {
					log("SSL already configured on " + userDomain);
					sslCertChecked = true;
					console.timeEnd("Check " + username + " SSL Cert");
					
					return;
				}
				
				data = data.replace(/#SSL#/g, "");
				data = data.replace(/listen 80;#NOSSL#/g, "");
				data = data.replace(/listen [::]:80;#NOSSL#/g, "");
				
				module_fs.writeFile(nginxProfilePath, data, function(err) {
					if(err) throw err;
					
					console.log("SSL enabled: " + nginxProfilePath);
					
					// Don't make the user wait for nginx config to reload (ca 70ms)
					console.time(username + " nginx reload");
					var exec = module_child_process.exec;
					exec("service nginx reload", function(error, stdout, stderr) {
						console.timeEnd(username + " nginx reload");
						
						if(error) throw(error);
						if(stderr) throw new Error(stderr);
						if(stdout) throw new Error(stdout);
						
						sslCertChecked = true;
						console.timeEnd("Check " + username + " SSL Cert");
						
					});
				});
			});
		}
		
		
	} // checkSslCert
	
} // checkMounts

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
	module_fs.stat(folder, function statResult(err, stats) {
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
	
	var IP = request.headers["x-real-ip"] || request.connection.remoteAddress;
	var protocol = request.headers["x-forwarded-proto"] || "https";
	
	var urlPath = UTIL.getPathFromUrl(request.url);
	
	var dirs = urlPath.split("/");
	
	var firstDir = dirs[0] || dirs[1]; // Urls usually start with an /
	var secondDir = dirs[1] ? dirs[2] : dirs[1];
	
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
	
	log("HTTP-req " + IP + ": " + request.url);
	
	//log("HTTP-req IP=" + IP + " urlPath=" + urlPath + " request.url=" + request.url + " host=" + request.headers.host + " firstDir=" + firstDir + " secondDir=" + secondDir);
	
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
	else if(firstDir == "oembed") {
		/*
			https://embed.ly/providers/validate/oembed
			
			https://iframely.com/embed
		*/
		
		var url = JSON.stringify( request.url.replace("oembed/", "") ).slice(1,-1);
		if(url.indexOf("?") == -1) url += "?embed=true";
		else url += "&embed=true";
		
		response.writeHead(200, "OK", {'Content-Type': 'application/json; charset=utf-8'});
		response.end('{"type": "rich", "provider_name": "' + DOMAIN + '", "provider_url": "' + protocol + '://' + DOMAIN + '/", "width": 800, "height": 500, "html": "<iframe width=\\\"800\\\" height=\\\"500\\\" src=\\\"' + protocol + '://' + DOMAIN + url + '\\\"></iframe>"}\n');
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
		
		//console.log("firstDir=" + firstDir + " not in endpoints: " + JSON.stringify(HTTP_ENDPOINTS));
		
		if(urlPath == "/" || urlPath == "") urlPath = "/index.htm";
		
		localFolder = module_path.resolve("../client/");
		
		//console.log("Serving from the jzedit client folder: " + localFolder);
		
		/*
			response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("Unknown endpoint: '" + firstDir + "' of " + urlPath);
			return;
		*/
		
	}
	
	//console.log("localFolder=" + localFolder);
	//console.log("urlPath=" + urlPath);
	
	
	if(urlPath == "") {
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("No file in url: " + urlPath);
		return;
	}
	
	
	var filePath = module_path.join(localFolder, urlPath);
	
	
	if(filePath.indexOf(localFolder) != 0 || !module_path.isAbsolute(filePath)) {
		if(filePath.indexOf(localFolder) != 0) console.log("filePath=" + filePath + " does not start with localFolder=" + localFolder);
		if(!module_path.isAbsolute(filePath)) console.log("Not absolute: filePath=" +filePath);
		
		console.log("urlPath=" + urlPath);
		
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("Bad path: " + urlPath);
		return;
	}
	
	
	
	
	var fileExtension = UTIL.getFileExtension(urlPath);
	
	
	
	if(fileExtension && !module_mimeMap.hasOwnProperty(fileExtension)) {
		response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
		response.end("Bad file type: '" + fileExtension + "'");
		
		console.warn("Unknown mime type: fileExtension=" + fileExtension);
		
		return;
	}
	
	var stat = module_fs.stat(filePath, function(err, stats) {
		
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
			
			responseHeaders['Content-Type'] = module_mimeMap[fileExtension];
			responseHeaders['Content-Length'] = stats.size;
			
			response.writeHead(200, responseHeaders);
			
			var readStream = module_fs.createReadStream(filePath);
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
		var ifaces = module_os.networkInterfaces();
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
	
	var scriptPath = module_path.resolve(__dirname, "./user_worker.js");

	try {
		var worker = module_child_process.fork(scriptPath, args, options);
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
	
	if(!module_ps) return callback(new Error("Module ps not loaded."));
	
	if(username == undefined && !CRAZY) throw new Error("username needed to start chromium browser!");
	if(uid == undefined && !CRAZY) throw new Error("uid needed to start chromium browser!");
	if(gid == undefined && !CRAZY) throw new Error("gid eeded to start chromium browser!");
	
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
	
	var vncUnixSocket =  HOME_DIR + username + "/sock/vnc";
	// https://github.com/nodejitsu/node-http-proxy#proxying-websockets
	VNC_CHANNEL[displayId] = {startedBy: username};
	
	
	
	// The proxy that will proxy requests to the x11vnc server (using websocket)
	// unix socket (AF_UNIX) needs the modified libvncserver
	// bundled in the the x11vnc 0.9.13 tarball and later.
	var modifiedLibvncserver = false;
	if(modifiedLibvncserver) {
		VNC_CHANNEL[displayId].proxy = new module_httpProxy.createProxyServer({
			target: {
				socketPath: vncUnixSocket
			},
			ws: true
		});
	}
	
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
		var xvfb = module_child_process.spawn("Xvfb", xvfbArgs, xvfbOptions);
		
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
				
				module_ps.lookup({
					command: 'Xvfb',
					arguments: xvfbArgs.join(" "),
				}, function(err, resultList ) {
					if (err) {
						throw new Error( err );
					}
					
					resultList.forEach(function( p ){
						if( p ){
							console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', p.pid, p.command, p.arguments );
							module_ps.kill( p.pid, function( err ) {
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
			module_child_process.execFile("xwininfo", xwininfoArg, function (err, stdout, stderr) {
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
		var chromiumBrowser = module_child_process.spawn("chromium-browser", chromiumBrowserArgs, chromiumBrowserOptions);
		
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
			module_child_process.execFile("xwininfo", xwininfoArg, function (err, stdout, stderr) {
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
		var x11vnc = module_child_process.spawn("x11vnc", x11vncArgs, x11vncOptions);
		
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
	module_fs.readFile("/etc/group", "utf8", function(err, groupData) {
		
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
	
	path = UTIL.trailingSlash(path); // Path is always a directory, put a slash after it to ease concatenation
	
	var abort = false;
	
	var dirsToRead = 0;
	var pathsToStat = 0;
	var pathsToChown = 0;
	var arrPathsToChown = [];
	
	dirsToRead++;
	module_fs.readdir(path, function readDir(err, files) {
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
	module_fs.chown(path, uid, gid, function chowned(err) {
		pathsToChown--;
		arrPathsToChown.splice(arrPathsToChown.indexOf(path), 1);
		if(err) return chownDirRecursiveDone(err);
		
		chownDirRecursiveDoneMaybe();
	});
	
	// Closure for path so statResult know's which path it stat'ed
	function doPath(path) {
		
		// Check if it's a directory
		pathsToStat++;
		module_fs.stat(path, function statResult(err, stats) {
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
				module_fs.chown(path, uid, gid, function chowned(err) {
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




function umount(path, callback) {
	
	
	var exec = module_child_process.exec;
	
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

function copyFile(source, target, cb) {
	var cbCalled = false;
	
	var rd = module_fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	var wr = module_fs.createWriteStream(target);
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

function sendMail(from, to, subject, text) {
	
	log( "Sending mail from=" + from + " to=" + to + " subject=" + subject + " text.length=" + text.length + "" );
	
	var mailSettings = {
		port: SMTP_PORT,
		host: SMTP_HOST
	};
	
	if(SMTP_USER) mailSettings.auth = {user: SMTP_USER, pass: SMTP_PW};
	
	if(!module_nodemailer) return log("Module nodemailer not loaded!");
	if(!module_smtpTransport) return log("Module smtpTransport not loaded!");
	
	var transporter = module_nodemailer.createTransport(module_smtpTransport(mailSettings));
	
	transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: text
		
	}, function(err, info){
		if(err) {
			//if(err.message.match(/Hostname\/IP doesn't match certificate's altnames: "IP: (192\.168\.0\.1)|(127\.0\.0\.1) is not in the cert's list/)) {
			console.warn("Unable to send e-mail (" + subject + "): " + err.message);
			//}
			//else throw new Error(err);
		}
		else {
			log("Mail sent: " + info.response);
		}
	});
	
}

function gcsfLogin(username, loginRetries, gcsfLoginCallback) {
	/*
		
		Need to create a "native" Google OAuth 2.0 client ID from here:
		https://console.developers.google.com/apis/credentials?pli=1&project=webide-203608&folder&organizationId
		
		Then edit gcsf/src/gcsf/drive_facade.rs and update the client_id, project_id and client_secret !
		(also remove the http port 8081 auto code entry, because Google API can only redirect to localhost!!)
		
	*/
	
	if(typeof username != "string") throw new Error("typeof username=" + typeof username);
	if(typeof loginRetries != "number") throw new Error("typeof loginRetries=" + typeof loginRetries);
	if(typeof gcsfLoginCallback != "function") throw new Error("typeof gcsfLoginCallback=" + typeof gcsfLoginCallback);

	var maxLoginRetries = 1;
	
	if(GCSF.hasOwnProperty(username)) {
gcsfLoginCallback(new Error("There is already a GCSF session for " + username));
		gcsfLoginCallback = null;
		return;
	}
	
	var enterCodeCallback = undefined; // Call this function when mounted
	var loginSuccess = false;
	
	// Where configDir + .config/gcsf/gcsf.toml should be saved
	var configDir = UTIL.trailingSlash( module_path.normalize(__dirname + "/..") );
	
	console.log("configDir=" + configDir);
	
	var gcsfOptions = {};

	//gcsfOptions.env = {XDG_CONFIG_HOME: configDir,HOME: configDir};

	
	var gcsfArgs = ["login", username];
	
	var reBrowserUrl = /Please direct your browser to (.*), follow the instructions/;
	var reTokenFileExist = /token file (.*) already exists/;
	
	log("Starting gcsfLoginSession with args=" + JSON.stringify(gcsfArgs) + " gcsfOptions=" + JSON.stringify(gcsfOptions));
	
	var gcsfLoginSession = module_child_process.spawn("./../gcsf", gcsfArgs, gcsfOptions);
	
	GCSF[username] = {};

	GCSF[username].loginSession = gcsfLoginSession;
	GCSF[username].enterCode = function enterGcsfCodeForLoginSession(code, cb) {
		log("enter gcsf code called for " + username + " from login session", DEBUG);
			enterCodeCallback = cb;
		this.loginSession.stdin.write(code + "\n");
		}
	
	gcsfLoginSession.on("close", function (code, signal) {
		log(username + " gcsfLoginSession close: code=" + code + " signal=" + signal, NOTICE);
		
		// The GCS sessions might already have been "cleaned"
		if( GCSF.hasOwnProperty(username) ) {
			GCSF[username].loginSession = null;
			GCSF[username].enterCode = null; // So we get an error if it's called
		}
		
		if(gcsfLoginCallback) {
			gcsfLoginCallback( new Error("gcsf login session closed with code=" + code + " and signal=" + signal) );
			gcsfLoginCallback = null;
		}
		
	});
	
	gcsfLoginSession.on("disconnect", function () {
		log(username + " gcsfLoginSession disconnect: gcsfLoginSession.connected=" + gcsfLoginSession.connected, DEBUG);
	});
	
	gcsfLoginSession.on("error", function (err) {
		log(username + " gcsfLoginSession error: err.message=" + err.message, ERROR);
		console.error(err);
		if(gcsfLoginCallback) {
			gcsfLoginCallback(err);
			gcsfLoginCallback = null;
		}
		gcsfCleanup(username);
	});
	
	gcsfLoginSession.stdout.on("data", function(data) {
		log(username + " gcsfLoginSession stdout: " + data, INFO);
		
		var str = data.toString();
		
		var matchBrowserUrl = str.match(reBrowserUrl);
		
		if(matchBrowserUrl) {
			log("gcsfLoginSession Need to request Google auth code for " + username + " before logging in to Google Drive ...", DEBUG);
			var authUrl = matchBrowserUrl[1];
			gcsfLoginCallback(null, {url: authUrl});
			gcsfLoginCallback = null;
		}
		else if( str.match(/Successfully logged in/) ) {
			if(loginSuccess === true) throw new Error(username + " gcsfLoginSession already logged in successfully !?");
			loginSuccess = true;
			log("Running gcsf mount for " + username + " because gcsf login successfully ....", DEBUG);
			gcsfMount(username, function(err) {
				if(err) {
					log("Error when running gcsf mount for " + username + " after gcsf login success: " + err.message, INFO);
					enterCodeCallback(err);
				}
				else {
					log("gcsf mount successful for " + username + " after gcsf login success!", DEBUG);
enterCodeCallback(null, {mounted: true});
				}
				
				enterCodeCallback = null;
			});
		}
	});
	
	gcsfLoginSession.stderr.on("data", function (data) {
		log(username + " gcsfLoginSession stderr: " + data, DEBUG);
		
		var str = data.toString();
		
		if( str.match(reTokenFileExist) ) {
			/*
				Already logged in !?
				
				gcsf login session will close!
				
			*/
			
			// We don't want to call the gcsfLoginCallback just yet (close event will call it)
			var alreadyLoggedInCallback = gcsfLoginCallback;
			gcsfLoginCallback = null;
			
			// Sanity check: We should not have a enterCodeCallback
			if(enterCodeCallback) throw new Error("Unexpected enterCodeCallback " + !!enterCodeCallback);
			
			log("Running gcsf mount for " + username + " because most likely already logged in ...", DEBUG);
			gcsfMount(username, function(err, mntInfo) {
				if(err) {
					log("gcsf mount error for " + username + ": " + err.message, INFO);
					
					if(err.code=="ENTER_CODE") {
						log(err.message, DEBUG);
						alreadyLoggedInCallback(null, {url: mntInfo.url});
						alreadyLoggedInCallback = null;
					}
					else if(err.code=="UMOUNT_THEN_TRY_AGAIN" && loginRetries < maxLoginRetries) {
						loginRetries++;
						
						log("fusermount for " + username + " before retrying gcsf login ...", DEBUG);
						gcsfUmount(username, function(err) {
							if(err) console.error(err);
							
							log("Retrying (" + loginRetries + ") gcsf login for " + username + " ...", INFO);
							gcsfLogin(username, loginRetries, alreadyLoggedInCallback);
							alreadyLoggedInCallback = null;
							
						});
					}
					else {
						log("gcsf mount error code=" + err.code + " loginRetries=" + loginRetries + " Not trying again!", INFO);
						alreadyLoggedInCallback(err);
						alreadyLoggedInCallback = null;
					}
				}
				else {
					log("gcsf mount success for " + username + "", DEBUG);
					alreadyLoggedInCallback(null, {mounted: true});
					alreadyLoggedInCallback = null;
				}
			});
		}
	});
	
	function gcsfMount(username, gcsfMountCallback) {
		var mountDir = HOME_DIR + username + "/googleDrive";
		var mountSuccessString = "Mounted to " + mountDir;
		var gcsfMountArgs = ["mount", mountDir, "-s", username];
		var notImplementString = "Function not implemented (os error 38)";
		var mountpointNotEmptyString = "fuse: mountpoint is not empty";
		var notConnectedString = "Transport endpoint is not connected";
		var driveBuzy = "Device or resource busy";
		var gcsfMountSession;
		
		// First create the folder to mount to
		module_fs.mkdir(mountDir, function(err) {
			if(err && err.code != "EEXIST") throw err;
			
			log("Starting gcsfMountSession with args=" + JSON.stringify(gcsfMountArgs) + " gcsfOptions=" + JSON.stringify(gcsfOptions) + "");
			
			gcsfMountSession = module_child_process.spawn("./../gcsf", gcsfMountArgs, gcsfOptions);
			
			GCSF[username].mountSession = gcsfMountSession;
			
			gcsfMountSession.on("close", gcsfMountSessionClose);
			gcsfMountSession.on("disconnect", gcsfMountSessionDisconnect);
			gcsfMountSession.on("error", gcsfMountSessionError);
			gcsfMountSession.stdout.on("data", gcsfMountSessionStdout);
			gcsfMountSession.stderr.on("data", gcsfMountSessionStderr);
			
		});
		
		function gcsfMountSessionClose(code, signal) {
			log(username + " gcsfMountSession close: code=" + code + " signal=" + signal, NOTICE);
			
			// The closing might be due to a cleanup
			if( GCSF.hasOwnProperty(username) ) GCSF[username].loginSession = null;
			
			// Always do a cleanup when mount session closes!
			gcsfCleanup(username);
			
			if(gcsfMountCallback) {
				gcsfMountCallback( new Error("gcsf mount session closed with code=" + code + " and signal=" + signal) );
				gcsfMountCallback = null;
			}
		}
		
		function gcsfMountSessionDisconnect() {
			log(username + " gcsfMountSession disconnect: gcsfMountSession.connected=" + gcsfMountSession.connected, DEBUG);
		}
		
		function gcsfMountSessionError(err) {
			log(username + " gcsfMountSession error: err.message=" + err.message, ERROR);
			console.error(err);
			if(gcsfMountCallback) {
				gcsfMountCallback(err);
				gcsfMountCallback = null;
			}
		}
		
		function gcsfMountSessionStdout(data) {
			log(username + " gcsfMountSession stdout: " + data, INFO);
			parseGcsfOutput(data);
		}
		
		function gcsfMountSessionStderr(data) {
			// For some reason gcsf mount outputs everything to stderr !? :P
			log(username + " gcsfMountSession stderr: " + data, DEBUG);
			parseGcsfOutput(data);
		}
		
		function parseGcsfOutput(data) {
			var str = data.toString();
			
			var matchBrowserUrl = str.match(reBrowserUrl);
			
			if(matchBrowserUrl) {
				log("gcsfMount session Need to request Google auth code for " + username + " before logging in to Google Drive ...", DEBUG);
				var authUrl = matchBrowserUrl[1];
				
				var error = new Error("gcsf mount session waiting for Google auth code on stdin ...");
				error.code = "ENTER_CODE";
				gcsfMountCallback(error, {url: authUrl});
				gcsfMountCallback = null;
				
				GCSF[username].enterCode = function enterGcsfCodeToMountSession(code, cb) {
					log("enter gcsf code called for " + username + " from mount session", DEBUG);
					gcsfMountCallback = cb;
					this.mountSession.stdin.write(code + "\n");
				}
				
			}
			else if( str.indexOf(mountSuccessString) != -1 ) {
				console.log("Mount success string detected!");
				gcsfMountCallback(null);
				gcsfMountCallback = null;
				// The process will continue to live and output debug info
			}
			else if( str.indexOf(notImplementString) != -1 ) {
				/*
					Most likely the dir is still mounted, but we are logged out
					This error will close the mount session
					Try umount and then mount again !?
				*/
				var error = new Error("Unable to mount Google Drive. Please try again.");
				error.code = "UMOUNT_THEN_TRY_AGAIN";
				gcsfMountCallback(error);
				gcsfMountCallback = null;
				
			}
			else if( str.indexOf(mountpointNotEmptyString) != -1 ) {
				/*
					Probably means the dir is already mounted.
					Which is unexpected ... There is probably a gcsf mount session still lingering ...
					*this* mount session will close.
					I guess this should count as a mount success :P
				*/
				log("GCSF mountpoint is not empty! Assuming mount sucess", INFO);
				gcsfMountCallback(null);
				gcsfMountCallback = null;
			}
			else if( str.indexOf(notConnectedString) != -1 ) {
				/*
					GCSH has somehow lost connection to Google Drive
					*this* mount session will close.
					
					It usually happens when the user forgot to logout/umount google drive from an earlier session
				*/
				
				var error = new Error("We got disconnected from Google Drive. Please try again.")
				error.code = "UMOUNT_THEN_TRY_AGAIN";
				gcsfMountCallback(error);
				gcsfMountCallback = null;
				
			}
			else if( str.indexOf(driveBuzy) != -1 ) {
				/*
					Probably some reference still lingering to the old mount
					
					
					This error will *NOT* close the mount session
				*/
				
				gcsfMountCallback( new Error("Unable to mount Google Drive: Device or resource busy. Please try again later.") );
				gcsfMountCallback = null;
				
				gcsfMountSession.kill();
				
			}
		}
		}
}

function gcsfUmount(username, callback) {
	var exec = module_child_process.exec;
	var mountDir = HOME_DIR + username + "/googleDrive";
	var command = "fusermount -u " + mountDir;
	
	gcsfCleanup(username);
	
	exec(command,function fusermount(error, stdout, stderr) {
		console.log(command + " error=" + (error ? error.message : error) + " stdout=" + stdout + " stderr=" + stderr);
		
		/*
			If you get /bin/sh: 1: fusermount: not found
			try: apt-get install fuse
		*/
		
		if(error) callback(error);
		else if(stderr) callback(new Error(stderr));
		else callback(null);
		
		module_fs.rmdir(mountDir, function(err) {
			if(err) console.error(err);
		});
		
	});
}

function gcsfLogout(username, callback) {
	var exec = module_child_process.exec;
	var mountDir = HOME_DIR + username + "/googleDrive";
	var command = "./gcsf logout " + username;
	var options = {
		cwd: module_path.join(__dirname, "../") // Run in jzedit folder where removeuser.js is located
	}
	
	gcsfCleanup(username);
	
	exec(command, options, function logout(error, stdout, stderr) {
		console.log(command + " error=" + (error ? error.message : error) + " stdout=" + stdout + " stderr=" + stderr);
		
		var reSuccess = /Successfully removed (.*)/;
		
		if(error) callback(error);
		else if(stderr) callback(new Error(stderr));
		else callback(null);
		
	});
}

function gcsfCleanup(username) {
	if( GCSF.hasOwnProperty(username) ) {
		if( GCSF[username].loginSession ) GCSF[username].loginSession.kill();
		if( GCSF[username].mountSession ) GCSF[username].mountSession.kill();
		delete GCSF[username];
		return true;
	}
	return false;
}

main();

