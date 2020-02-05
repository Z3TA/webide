#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var getArg = require("../shared/getArg.js");

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number
var log; // Using small caps because it looks and feels better
(function setLogginModule() { // Self calling function to not clutter script scope
	// Enhanced console.log ...
	var logModule = require("../shared/log.js");
	
	logModule.setLogLevel(LOGLEVEL);
	log = logModule.log;
	
	var logFile = getArg(["log", "logfile"]) || null; // default: Write to stdout, if specified write to a file
	
	if(logFile) logModule.setLogFile(logFile);
	
})();

var nodeVersion = parseInt(process.version.match(/v(\d*)\./)[1]);
var testedNodeVersions = [0,4,6,8,10];
if(testedNodeVersions.indexOf(nodeVersion) == -1) log("The editor has only been tested with node.js versions " + JSON.stringify(testedNodeVersions) + " ! You are running version=" + process.version, WARN);

var EDITOR_VERSION = 0; // Populated by release script. Or it will be the latest commit id
var LAST_RELEASE_TIME = 0; // unix_timestamp populated by release script

var DEFAULT = require("./default_settings.js");


var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email;

var STDIN_PORT = DEFAULT.stdin_channel_port;

var REMOTE_FILE_PORT =  getArg(["remote-file-port", "remote-file-port"]) || DEFAULT.remote_file_port || 8103;

var SMTP_PORT = getArg(["smtp_port", "smtp_port"]) || DEFAULT.smtp_port;
var SMTP_HOST = getArg(["smtp_host", "smtp_host"]) || DEFAULT.smtp_host;
var SMTP_USER = getArg(["smtp_user", "smtp_user"]) || "";
var SMTP_PW = getArg(["smtp_pass", "smtp_pass"]) || "";

var CRAZY = getArg(["crazy", "crazy"]); // If specified in arguments, allows user workers to run as root

var UTIL = require("../client/UTIL.js");

var HTTP_ENDPOINTS = {};

var defaultHomeDir = DEFAULT.home_dir;
var HOME_DIR = UTIL.trailingSlash(getArg(["home", "homedir", "home"]) || defaultHomeDir); // Not including the user name!
if(HOME_DIR != defaultHomeDir) HOME_DIR = UTIL.trailingSlash(HOME_DIR); // Make sure the dir ends with a path delimiter
else if(HOME_DIR == "/home/" && process.platform === "win32") (function getWindowsHomeDir() {
	// Only use this on Windows, or we would end up with / because HOME=/root
		var homeDir = process.env["USERPROFILE"] || (process.env["HOMEDRIVE"] + process.env["HOMEPATH"]);
		if(homeDir) HOME_DIR= getUserDirFromHomeDir(homeDir);
	
	if(HOME_DIR != defaultHomeDir) log("Set HOME_DIR=" + HOME_DIR, DEBUG);
	
	function getUserDirFromHomeDir(homeDir) {
		var lastChar = homeDir.slice(-1);
		if(lastChar == "/" || lastChar == "\\") homeDir = homeDir.slice(0, -1); // Remove last slash if it ends with a slash, so that we will get the parent directory below
		return UTIL.getDirectoryFromPath(homeDir);
	}
})();

/*
	DEBUG_CHROOT has to be set manually!
	When you set it back to false from true, make sure you carefully unmount the mounted dirs first!!!
	Do NOT mess with this flag in production (it might corrupt or delete parts of your system!!!)
	Make BACKUPS before changing this flag: (sudo zfs snapshot rpool/ROOT/ubuntu@test)
*/
var DEBUG_CHROOT = false; // Mounts everyhing into the chroot if set to true
var MOUNT_BINS = false; // Mounts /bin and /usr/bin
if(MOUNT_BINS == true && DEBUG_CHROOT == true) throw new Error("Not both DEBUG_CHROOT and MOUNT_BINS can be true, choose one!");


var NO_PW_HASH = !!(getArg(["nopwhash"]) || false);

var NO_BROADCAST = !!(getArg(["nobroadcast"]) || false);

var MYSQL_PORT = getArg(["mysql", "mysql_port", "mysql_unix_socket"]) || "/var/run/mysqld/mysqld.sock";

var EOF = String.fromCharCode(3);

// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

/*
	The reason why we are not using CHROOT by default is because of relative paths to work, in for example docker-compose
	Dealing with chroot's have also been an headache... So we want to avoid chroot if possible!
*/
var CHROOT = !!(getArg(["chroot", "chroot"]) || false);

var NO_NETNS = !!(getArg(["nonetns", "nonetns"]) || false);

var VIRTUAL_ROOT = !!(getArg(["virtualroot", "virtualroot"]) || false); // Translate all paths like if the home dir was the root folder

var DISPLAY_ID = 0; // Counter of visual displays

var PIPE_COUNTER = 0;

var VNC_CHANNEL = {}; // displayId: {proxy: http-proxy, name: username}

var INVITATIONS = {}; // Users can invite other users, which allows them to login as the same user, without sharing the pw (a new temporary pw is generated)

var PROXY = {}; // id: {proxy: http-proxy, startedBy: username}

var EXEC_OPTIONS = {shell: "/bin/dash"};

var VPN = {}; // username: {type, conf} (Keep track of VPN tunnels so we can stop a connection if the user disconnects)

var LAST_USERADD = ""; // For debugging

(function() {
	// Make sure we are in the server directory
	var workingDirectory = process.cwd();
	var serverDirectory = __dirname;
	console.log('Working directory: ' + workingDirectory);
	
	if(workingDirectory != serverDirectory) {
		try {
			process.chdir(serverDirectory);
			console.log('Changed working directory to ' + process.cwd());
		}
		catch (err) {
			console.log('Unable to change working directory! chdir: ' + err);
		}
		}
	
})();



var CURRENT_USER = "ROOT";

var USERNAME = getArg(["user", "user", "username"]);
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

var USE_HTTPS = !!(getArg(["ssl", "https"]) || false); // Only use for local development! Run a HTTPS proxy in production (nginx) because Node.JS is too slow!

// Use -ip "::" or -ip "0.0.0.0" to make it listen on unspecified addresses.
var HTTP_IP = getArg(["ip", "ip"]) || DEFAULT.http_ip;

// On some systems (Mac) you need elevated privilege (sudo) to listen to ports below 1024
var HTTP_PORT = getArg(["port", "port"]) || DEFAULT.editor_http_port; 
if(!UTIL.isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))

// For generating URL's
var PUBLIC_PORT = getArg(["pp", "public_port"]) || HTTP_PORT; // Server might run on localhost behind a proxy sunch as nginx
var HOSTNAME = getArg(["host", "host", "hostname"]) || HTTP_IP; // Same as "server_name" in nginx profile or "VirtualHost" on other web servers

var defaultDomain = DEFAULT.domain;
var DOMAIN = getArg(["domain", "domain"]) || (parseInt(HOSTNAME.slice(0,1)) ? defaultDomain : HOSTNAME); // Use hostname!

var CHROMIUM_DEBUG_PORT = 9222;
var VNC_PORT = 5901;

var PORTS_IN_USE = [HTTP_PORT];

var GUEST_COUNTER = 0; // Incremented each time we create a new guest user
var GUEST_POOL = []; // Because it's a bit slow to create new users
var CREATE_USER_LOCK = false; // Can only create one user at a time
var ALLOW_GUESTS = true;
var GUEST_POOL_MAX_LENGTH = 3;
var IS_GUEST_USER_RECYCLING = false;

if(getArg(["noguest", "noguests"])) ALLOW_GUESTS = false;
if( getArg(["guest", "guest", "guests"]) == "no") ALLOW_GUESTS = false;
//console.log("ALLOW_GUESTS=" + ALLOW_GUESTS + " " + getArg(["guest", "guest", "guests"]));


var GCSF = {}; // username: GCSF session
var DROPBOX = {}; // username: Dropbox daemon

// Declare modules here as a OPTIMIZATION
var module_fs = require("fs");
var module_child_process = require('child_process');
var module_path = require("path");
var module_letsencrypt = require("../shared/letsencrypt.js");
var module_os = require("os");
var module_sockJs = require("sockjs");
var module_http = require("http");
var module_https = require("https");
var module_dns = require("dns");
var module_dgram = require("dgram");
var module_pwHash = require("./pwHash.js");
var module_mimeMap = require("./mimeMap.js");

var module_mount = require("../shared/mount.js");
var module_string_decoder = require('string_decoder');
var module_net = require("net");

//var module_copyFile = require("../shared/copyFile.js");
//var module_copyDirRecursive = require("../shared/copyDirRecursive.js");
//var module_rmDirRecursive = require("../shared/rmDirRecursive.js");

// Optional modules:
try {
	var module_generator = require('generate-password');
	var module_httpProxy = require('http-proxy');
	
	var module_nodemailer = require('nodemailer');
	var module_smtpTransport = require('nodemailer-smtp-transport');
	var module_ps = require('ps-node');
	var module_mysql = require("mysql2");
}
catch(err) {
	log("Unable to load optional module(s): " + err.message);
}

var FAILED_SSL_REG = {}; // List of failed letsencrypt registrations, in order to not hit quota limits

var stdinChannelBuffer = "";
var editorProcessArguments = "";
var STDOUT_SOCKETS = [];

var REMOTE_FILE_SOCKETS = {}; // username:fileName=socket
var NO_REMOTE_FILES = getArg(["no-remote", "no-remote", "no-remote-files"]) || false;

var mysqlConnection;


process.on("SIGINT", function sigInt() {
	log("Received SIGINT");
	
	HTTP_SERVER.close();
	
	for(var displayId in VNC_CHANNEL) stopVncChannel(displayId);
	
	if(mysqlConnection && !mysqlConnection._fatalError) {
		// It seems mysqlConnection.end never calls back if there is a problem ...
		log("mysqlConnection=" + UTIL.objInfo(mysqlConnection), DEBUG);
		
		mysqlConnection.end(function(err) {
			log("MySQL connection ended!");
			if(err) console.error(err);
			
			end();
		});
	}
	else end();
	
	
	function end() {
		process.exit();
	}
});

process.on("exit", function () {
	
	// Also close spawned process!
	// Hmm, it seems Node/Linux automatically cleans up after us!? (so we don't have to do this?)
	for(var username in DROPBOX) {
		log("Killing Dropbox daemon for username=" + username, DEBUG);
		try {
			DROPBOX[username].kill();
		}
		catch(err) {
			log("Unable to close Dropbox daemon for username=" + username + " Error: " + err.message, WARN);
		}
	}
	
	log("Program exit\n\n", DEBUG, true);
});

function mysqlConnect() {
	
	log("Connecting to mySQL database ...", DEBUG);
	
	var mysqlConnectionOptions = {port: MYSQL_PORT, database: "mysql", user: "root", authSwitchHandler: true};
	// note: without authSwitchHandler auth_socket will fail!
	
	if(!module_mysql) return log("module_mysql not loaded!");
	
	// Recreate the connection, since the old one cannot be reused.
	mysqlConnection = module_mysql.createConnection(mysqlConnectionOptions);          
	
	mysqlConnection.connect(function(err) {                       
		if(err) {                                  
			// The server is either down or restarting (takes a while sometimes).
			console.error(err);
			log("Failed to connect to mySQL database!", WARN);
			
			if(err.code == "ENOENT") return; // Socket not found, meaning mySQL server is not installed !?
			
			// We introduce a delay before attempting to reconnect, to avoid a hot loop
			setTimeout(mysqlConnect, 2000);    
		}
		else {
			log("Successfully connected to mySQL database!", INFO);
		}
	});                                              
	
	mysqlConnection.on('error', function(err) {
		log("MySQL error: (code=" + err.code + ") " + err.message, NOTICE);
		if(err.code == "ENOENT") {
			log("Mysql server is probably not installed, will not bother to try connecting to it.", NOTICE);
		}
		else if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
			/*
				Connection to the MySQL server is usually lost due to either server restart, 
				or a connnection idle timeout (the wait_timeout server variable configures this)
			*/
			mysqlConnect();
		} else {
			console.error(err);
			setTimeout(mysqlConnect, 10000);    
		}
	});
}

function createMysqlDb(username, options, callback) {
	var dbName = options.name;
	if(dbName == undefined) return callback("name can not be undefined!");
	
	var db = mysqlConnection;
	
	console.log("db.state=" + db.state);
	
	// First check if user exist
	db.query("SELECT user FROM user WHERE user = ? AND host = 'localhost'", [username], function(err, rows, fields) {
		if (err) {
			console.error(err);
			return callback(err);
		}
		
		if(rows.length == 0) {
			db.query("CREATE USER ?@'localhost' IDENTIFIED WITH auth_socket", [username], function(err, rows, fields) {
				if (err) {
					console.error(err);
					return callback(err);
				}
				
				create();
			});
		}
		else create();
	});
	
	function create() {
		/*
			GRANT SELECT ON *.* TO 'username'@'localhost'
			
			CREATE DATABASE mydatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
			https://stackoverflow.com/questions/766809/whats-the-difference-between-utf8-general-ci-and-utf8-unicode-ci
			
			Also dont forget "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" when creating the tables!!?
			
			Need to use module_mysql.escapeId(dbName) for identifiers such as database / table / column name (can't be surrounded by ')
			
		*/
		
		db.query("CREATE DATABASE " + module_mysql.escapeId(dbName) + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", function(err, rows, fields) {
			if (err) {
				console.error(err);
				return callback(err);
			}
			
			db.query("GRANT SELECT,UPDATE,DELETE,INSERT,ALTER,DROP,CREATE,INDEX,LOCK TABLES ON " + module_mysql.escapeId(dbName) + ".* TO ?@'localhost'", [username], function(err, rows, fields) {
				if (err) {
					console.error(err);
					return callback(err);
				}
				
				callback(null);
			});
		});
	}
}

function unixTimeStamp(date) {
	if(date) return Math.floor(date.getTime() / 1000);
	else return Math.floor(Date.now() / 1000);
}

function fillGuestPool(id, fromRecycler, callback) {
	/*
		Increase the guest pool ...
		If id is specified, and guest#id exist, that guest user will be added to the guest pool
		Otherwise if id is undefined or the guest#id user does not exist, a *new* user is created and added to the guest pool
	*/
	log("fillGuestPool: id=" + id + " fromRecycler=" + fromRecycler + "", DEBUG);
	
	if(LAST_USERADD == "guest" + id) throw new Error("LAST_USERADD=" + LAST_USERADD);
	
	if(typeof id == "function") {
		callback = id;
		id = undefined;
	}
	
	if(typeof fromRecycler == "function") {
		callback = fromRecycler;
		fromRecycler = undefined;
	}
	
	if(GUEST_POOL.length >= GUEST_POOL_MAX_LENGTH) {
		var msg = "GUEST_POOL.length=" + GUEST_POOL.length + " already at GUEST_POOL_MAX_LENGTH=" + GUEST_POOL_MAX_LENGTH;
		if(callback) callback(new Error(msg));
		else msg(msg, NOTICE);
		return;
	}
	
	if(id == undefined) {
		log("fillGuestPool: Creating a new guest user because id=" + id, DEBUG);
		createGuestUser(undefined, fromRecycler, guestUserCreatedMaybe);
	}
	else if(typeof id == "number") {
		var username = "guest" + id;
		var homeDir = UTIL.joinPaths([HOME_DIR, "guest" + id]);
		
		if(GUEST_POOL.indexOf(username) != -1) throw new Error(username + " is already in the GUEST_POOL=" + JSON.stringify(GUEST_POOL));
		
		readEtcPasswd(username, function(err, passwd) {
			if(err) {
				if(err.code == "USER_NOT_FOUND") {
					/*
						Problem: The home dir might exist, but the user doesn't
						If neither the home dir nor the user account exist, create the guest user,
						
						Another problem: user might exist in /etc/passwd but not in /etc/group or /etc/shadow
						Then we have to deal with it manually.
					*/
					module_fs.stat(homeDir, function dir(err, homeDirStat) {
						if(err && err.code == "ENOENT") {
							// The user has no home dir and no user account. So create it!
							
							log("fillGuestPool: Going to create a new guest with id=" + id + " because username=" + username + " was not found in /etc/passwd and home dir don't exist", DEBUG);
							createGuestUser(id, fromRecycler, guestUserCreatedMaybe);
							
						}
						else if(err) throw err;
						else {
							var error = new Error("Can not add " + username + " to guest pool because the user has a home dir, but no system account!");
							error.code = "USER_NOT_FOUND";
							if(callback) callback(error);
							else console.error(error);
							return;
						}
					});
					
				}
				else throw err;
			}
			else {
				// An user account exist
				// Check if home dir exist before adding the user to the guest pool
				
				module_fs.stat(homeDir, function dir(err, homeDirStat) {
					if(err && err.code == "ENOENT") {
						// The user exist in /etc/passwd but has no home dir ...
						var error = new Error("homeDir=" + homeDir + " does not exist!");
						error.code = "NO_HOME_DIR";
						if(callback) return callback(error);
						else log(error.message, NOTICE);
					}
else if(err) throw err;
					else {
						log("Existing user " + passwd.username + " will be added to the guest pool!..", INFO);
				guestUserCreatedMaybe(null, passwd);
					}
				});
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
				log("Unable to fill the guest pool with id=" + id + " because an account is already being created!", WARN);
			}
			else throw err;
		}
		else {
			if(!userInfo.username) throw new Error("No username in userInfo=" + JSON.stringify(userInfo));
			// Check mounts etc when filling the guest pool, instead of when logging in
			checkMounts({username: userInfo.username, homeDir: userInfo.homeDir, uid: userInfo.uid, gid: userInfo.gid, waitForSSL: true}, function checkedMounts(err) {
				
				GUEST_POOL.push(userInfo.username);
				log("Guest account " + userInfo.username + " added to GUEST_POOL.length=" + GUEST_POOL.length + " GUEST_POOL_MAX_LENGTH=" + GUEST_POOL_MAX_LENGTH);
				if(callback) callback(null);
				
			});
		}
	}
}

function readEtcPasswd(username, readEtcPasswdCallback) {
	if(username == undefined) throw new Error("username=" + username);
	//log("readEtcPasswd: Check for username=" + username + " in /etc/passwd ...", DEBUG);
	
	var checked_passwd = false;
	var checked_groups = false;
	var error;
	var info = {groups: {}};
	
	module_fs.readFile("/etc/group", "utf8", function readEtcPasswdFile(err, str) {
		checked_groups = true;
		
		if(err) {
			log("readEtcPasswd: Unable to read /etc/group !", WARN);
			error = new Error("Unable to read /etc/group: " + err.message);
			return doneMaybe();
		}
		
		var groups = str.split("\n");
		for (var i=0, gName, gId, gUsers; i<groups.length; i++) {
			
			groups[i] = groups[i].split(":");
			gUsers = groups[i][3];
			
			//log(JSON.stringify(groups[i]), DEBUG);
			
			if(gUsers && gUsers.indexOf(username) != -1) {
				gName = groups[i][0];
				gId = groups[i][2];
				info.groups[gName] = gId;
			}
		}
		
		doneMaybe();
		
	});
	
	module_fs.readFile("/etc/passwd", "utf8", function readEtcPasswdFile(err, etcPasswd) {
		checked_passwd = true;
		
		if(err) {
			log("readEtcPasswd: Unable to read /etc/passwd !", WARN);
			error = new Error("Unable to read /etc/passwd: " + err.message);
			return doneMaybe();
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
					log("readEtcPasswd: Found username=" + username + " in /etc/passwd", DEBUG);
					
					info.username = username;
					info.homeDir = UTIL.trailingSlash(pDir);
					info.uid = parseInt(pUid);
					info.gid = parseInt(pGid);
					info.shell = pShell
					
					return doneMaybe();
				}
			}
			
			log("readEtcPasswd: Did not find username=" + username + " in /etc/passwd CHROOT=" + CHROOT, INFO);
			
			error = new Error("Unable to find username=" + username + " in /etc/passwd ! A server admin need to add the user to the system. Or use the -nochroot flag!");
			error.code = "USER_NOT_FOUND";
			// Add user account: sudo useradd -r -s /bin/false nameofuser
		}
		
		doneMaybe();
	});
	
	function doneMaybe() {
		if(checked_passwd && checked_groups) {
			readEtcPasswdCallback(error, info);
			readEtcPasswdCallback = null;
		}
	}
}

function recycleGuestAccounts(callback) {
	
	log("Recycling guest accounts ...");
	
	var currentTime = unixTimeStamp();
	var countLeft = GUEST_COUNTER;
	var maxConcurrency = 1;
	var currentConcurrency = 0;
	var currentlyRecyclingId = -1;
	var lastRecycledId = -1;
	
	// We don't want to create any new guest users while we are recycling'
	IS_GUEST_USER_RECYCLING = true;
	
	continueRecycling();
	
	function continueRecycling() {
		log("continueRecycling: currentlyRecyclingId=" + currentlyRecyclingId + " lastRecycledId=" + lastRecycledId + " GUEST_COUNTER=" + GUEST_COUNTER + " countLeft=" + countLeft + " currentConcurrency=" + currentConcurrency + " maxConcurrency=" + maxConcurrency, DEBUG);
		if(currentlyRecyclingId==-1) currentlyRecyclingId = GUEST_COUNTER+1;
		// Go backwards to make it possible to decrement GUEST_COUNTER
		for (var i=currentlyRecyclingId-1; i>0 && currentConcurrency < maxConcurrency; i--) tryRecycle(i);
	}
	
	function tryRecycle(id) {
		currentConcurrency++;
		if(id == lastRecycledId || id == currentlyRecyclingId) throw new Error("id=" + id + " lastRecycledId=" + lastRecycledId + " currentlyRecyclingId=" + currentlyRecyclingId + " currentConcurrency=" + currentConcurrency);
		currentlyRecyclingId = id;
		var username = "guest" + id;
		log("tryRecycle: " + username, DEBUG);
		var homeDir = UTIL.joinPaths([HOME_DIR, username]);
		module_fs.stat(homeDir, function dir(err, homeDirStat) {
			if(err && err.code == "ENOENT") {
				log(homeDir + " doesn't exist!", DEBUG);
				/*
					No home dir probably means the user does not exist.
					But it can also mean that the user exist in /etc/passwd but has no home dir!
					We want to re-create that user in order to fill the gap in GUEST_COUNTER
					
					We however don't want to fill the system with hundreds of zombie accounts ...
					
				*/
				
				// We want to decrease the GUEST_COUNTER if possible
				if(currentlyRecyclingId == GUEST_COUNTER && GUEST_COUNTER > GUEST_POOL_MAX_LENGTH) {
					deleteGuest(id, function(err) {
						if(err) {
							// If we get an error here it means the GUEST_COUNTER will keep increasing, which need attention
							reportError(err);
							processedGuestId(id, "Was unable to delete the user");
						}
						else {
							// Account successfully deleted. We can now decrement GUEST_COUNTER 
							log("Decrementing GUEST_COUNTER=" + GUEST_COUNTER + " during recycle after deletion of " + username);
							module_fs.writeFile(__dirname + "/GUEST_COUNTER", --GUEST_COUNTER, function(err) {
								if(err) {
									log("Failed to save GUEST_COUNTER=" + GUEST_COUNTER + " during recycle after deletion of " + username);
									throw err;
								}
								log("Saved GUEST_COUNTER=" + GUEST_COUNTER + " during recycle after deletion of " + username);
								processedGuestId(id, "Successfully deleted");
							});
						}
					});
				}
				else if(GUEST_POOL.length < GUEST_POOL_MAX_LENGTH) {
					
					fillGuestPool(id, true, function guestPoolFilledMaybe(err) {
						if(err) {
							log("User account recycling error after fillGuestPool: " + err.message, DEBUG);
						
						if(err.code == "NO_HOME_DIR") {
							// Some accounts are "nuked" eg there's a group id still lingering after a failed removeuser run.
							// Try to delete the "nuked" guest account
							resetGuest(id); // resetGuest will call processedGuestId
						}
						else if(err.code == "LOCK") {
							// Another guest account is already being created. We can only create one account at a time.
							processedGuestId(id, "Failed to add to guest pool! err.code=" + err.code + " err.message=" + err.message);
						}
						else {
							// We got an unknown error ... We however don't want the server to restart, or it would go into a restart loop
								reportError(err);
processedGuestId(id, "Failed to add to guest pool! err.code=" + err.code + " err.message=" + err.message);
						}
					}
					else processedGuestId(id, "Added to guest pool");
				});
				}
				else {
					log("currentlyRecyclingId=" + currentlyRecyclingId + " GUEST_COUNTER=" + GUEST_COUNTER + " GUEST_POOL_MAX_LENGTH=" + GUEST_POOL_MAX_LENGTH + " GUEST_POOL.length=" + GUEST_POOL.length, DEBUG);
					processedGuestId(id, "Did nothing because guest pool already full");
				}
			}
			else if(err) throw err;
			else {
				// Sometimes the home dir doesn't exist! wtf!?
				log("id=" + id + " homeDir=" + homeDir + " homeDirStat=" + JSON.stringify(homeDirStat), DEBUG);
				
				var lastLoginFile = UTIL.joinPaths([homeDir, ".webide/", "storage/", "lastLogin"]);
				module_fs.readFile(lastLoginFile, "utf8", function readLastLoginFile(err, data) {
					if(err && err.code == "ENOENT") {
						// If no lastLogin file exist should mean the user has *never* logged in
						log(username + ": " + err.code + " " + lastLoginFile, DEBUG);
						
						/*
							Problem: We don't want to add old users to the guest pool as they will have outdated example files and settings
							Solution: Check when the home dir was created, and only add it to the guest pool if it's fresh, otherwise delete it
							Solution 2: Check if the skeleton files (examples, etc) have been updated after the home dir was made
						*/
						
						var skeletonDir = module_path.join(__dirname, "../etc/userdir_skeleton/");
						module_fs.stat(skeletonDir, function dir(err, skeletonDirStat) {
							if(err) throw err;
							
							var homeDirLastModified = unixTimeStamp(homeDirStat.mtime);
							var daysSinceLastChanged = Math.floor( ( currentTime - homeDirLastModified ) / (60 * 60 * 24) );
							var daysSinceRelease = Math.floor( ( homeDirLastModified - LAST_RELEASE_TIME ) / (60 * 60 * 24) );
							var skeletonDirLastModified = unixTimeStamp(skeletonDirStat.mtime);
							var daysSinceSkeleton = Math.floor( ( currentTime - skeletonDirLastModified ) / (60 * 60 * 24) );
							
							log("id=" + id + " homeDirLastModified=" + homeDirLastModified + " skeletonDirLastModified=" + skeletonDirLastModified + " currentTime=" + currentTime + " LAST_RELEASE_TIME=" + LAST_RELEASE_TIME, DEBUG);
							
							if(homeDirLastModified - skeletonDirLastModified > 0 && daysSinceLastChanged < 5) {
								// Home dir is fresh
								// Check if a user account exist
								readEtcPasswd(username, function(err, passwd) {
									if(err) {
										if(err.code == "USER_NOT_FOUND") {
											log("Resetting " + username + " because no system account.", DEBUG);
											resetGuest(id);
}
										else {
											reportError(err);
											processedGuestId(id, "Attempted fill guest pool because the home dir is fresh - but got an unknown error when checking if user exist");
										}
}
									else {
										// A system account exist!
										fillGuestPool(id, true, function(err) {
											if(err) {
												console.error(err);
												processedGuestId(id, "Attempted fill guest pool because the home dir is fresh - but failed!");
											}
											else {
												processedGuestId(id, "Added to guest pool because the home dir is fresh. (daysSinceRelease=" + daysSinceRelease + " daysSinceLastChanged=" + daysSinceLastChanged + " daysSinceSkeleton=" + daysSinceSkeleton + ")");
											}
										});
									}
								});
							}
							else {
								log("id=" + id + ": Example files etc for " + homeDir + " need to be updated: daysSinceRelease=" + daysSinceRelease + " daysSinceLastChanged=" + daysSinceLastChanged + " daysSinceSkeleton=" + daysSinceSkeleton + "", DEBUG);
								resetGuest(id);
							}
						});
						
						return;
						
					}
					else if(err) throw err;
					else {
						log("id=" + id + " lastLoginFile=" + lastLoginFile + " data=" + data, DEBUG);
						var lastLogin = parseInt(data);
						var timeDiff = currentTime - lastLogin; // In seconds
						var daysSinceLastLogin = Math.floor(timeDiff / (60 * 60 * 24));
						if(daysSinceLastLogin > 14) {
							log(username + ": lastLogin=" + lastLogin + " currentTime=" + currentTime + " timeDiff=" + timeDiff + " daysSinceLastLogin=" + daysSinceLastLogin, DEBUG);
							return resetGuest(id);
						}
						else return processedGuestId(id, "Not inactive: daysSinceLastLogin=" + daysSinceLastLogin);
					}
				});
			}
		});
	}
	
	function deleteGuest(id, callback) {
		var username = "guest" + id;
		log("Removing guest user: " + username);
		
		var exec = module_child_process.exec;
		
		var options = {
			cwd: module_path.join(__dirname, "../"), // Run in webide folder where removeuser.js is located
			shell: EXEC_OPTIONS.shell
		}
		//log("Running in options.cwd=" + options.cwd, DEBUG);
		var scriptPath = UTIL.trailingSlash(options.cwd) + "removeuser.js";
		
		var command = scriptPath + " " + username + " -unattended -force";
		//log("command=" + command, DEBUG);
		
		exec(command, options, function removeuser(error, stdout, stderr) {
			
			if(error) {
				log("Error when removing user: (error is probably in " + scriptPath + ")");
				console.error(error);
				
				callback(new Error("Failed to delete " + username + "! Error: " + error.message));
				return;
			}
			
			stderr = stderr.trim(); // Can be a new line (LF)
			stdout = stdout.trim();
			
			if(stderr) log(stderr, NOTICE);
			
			if(!stdout) throw new Error("Problem when removing username=" + username + "! Exec command=" + command + " did not return anyting!");
			
			log("command=" + command + " stdout=" + stdout, DEBUG);
			
			var checkre = /User (.*) deleted!/g;
			var check = checkre.exec(stdout);
			if(check == null) throw new Error("It seems command=" + command + " failed! error=" + (error && error.message) + " stderr=" + stderr + " stdout=" + stdout);
			// Should have: User nameOfUser deleted!
			var reG1User = check[1];
			
			if(reG1User != username) throw new Error("Wrong user deleted !? reG1User=" + reG1User + " username=" + username);
			
			
			callback(null);
			
		});
	}
	
	function resetGuest(id) {
		/*
			Just delete the user instead of trying to reset.
			We could use ZFS to restore, but then the account might not get all the latest features
			
			Don't re-creating the user. Next time the editor is started or recycleGuestAccounts() is run,
			the GUEST_COUNTER will either be decremented and the guest account deleted,
			or it will be re-created and added to the guest pool,
			or deleted again
		*/
		
		deleteGuest(id, function(err) {
			if(err) {
				processedGuestId(id, err.message);
				return;
			}
			else {
				processedGuestId(id, "Account was successfully deleted");
			}
		});
	}
	
	function processedGuestId(id, debugComment) {
		countLeft--;
		currentConcurrency--;
		
		log("Done recycling guest" + id + " (" + debugComment + ") countLeft=" + countLeft + " lastRecycledId=" + lastRecycledId + " currentlyRecyclingId=" + currentlyRecyclingId, INFO);
		
		lastRecycledId = id;
		
		if(countLeft == 0) {
			IS_GUEST_USER_RECYCLING = false;
			callback(null);
			callback = null;
			log("Done recycling all guest accounts!", INFO);
		}
		else if(countLeft < 0) {
			throw new Error("countLeft=" + countLeft + " currentConcurrency=" + currentConcurrency + " currentlyRecyclingId=" + currentlyRecyclingId + " GUEST_COUNTER=" + GUEST_COUNTER + " IS_GUEST_USER_RECYCLING=" + IS_GUEST_USER_RECYCLING);
		}
		else continueRecycling();
	}
	
}

function main() {
	
	// Get the current user (who runs this server)
	var info = module_os.userInfo ? module_os.userInfo() : {username: "ROOT", uid: process.geteuid()};
	var env = process.env;
	
	CURRENT_USER = env.SUDO_USER ||	env.LOGNAME || env.USER || env.LNAME ||	env.USERNAME || info.username;
	
	log("Server running as user=" + CURRENT_USER, DEBUG);
	
	if(info.uid < 0) {
		log("Warning: Your system do not support setuid!\nAll users will have the same security privaleges as the current user (" + CURRENT_USER + ") ! ", 4);
	}
	
	if(CHROOT) {
		// Make sure we can load the posix module before continuing with chroot
		try {
			require("posix");
		}
		catch(err) {
			log(err.message);
			log("posix module needed for chroot! Try with -nochroot flag!\nYou can also use a virtual root with the -virtualroot flag", NOTICE);
			process.exit(1);
		}
	}
	
	if(!NO_NETNS && !USERNAME && process.platform=="linux") {
		// Make sure we have a bridge setup for Linux network namespaces
		module_child_process.exec("ip addr | grep -q netnsbridge", EXEC_OPTIONS, function(error, stdout, stderr) {
			if(error) {
				module_child_process.exec("ip link add name netnsbridge type bridge && ip link set netnsbridge up && ip addr add 10.0.0.1/16 brd + dev netnsbridge", EXEC_OPTIONS, function(error, stdout, stderr) {
					if(error) throw error;
					if(stdout) log("netnsbridge: stdout=" + stdout, NOTICE);
					if(stderr) log("netnsbridge: stderr=" + stderr, WARN);
					/*
						Use a submask of 16 (255.255.0.0) instead of 24 (255.255.255.0) because
						we will give each user their uid (decimal) as IP
						ip= 167772162 + uid (so that a uid of 0 would get ip=10.0.0.2)
						
						Note: If you get DNS issues in the netns it's probably because the ip in /etc/resolve.conf is unreachable!
						
					*/
					
					module_child_process.exec("iptables -S -t nat | grep -q -A POSTROUTING -s 10.0.0.0/16 -j MASQUERADE", EXEC_OPTIONS, function(error, stdout, stderr) {
						if(error) {
							module_child_process.exec("iptables -t nat -A POSTROUTING -s 10.0.0.0/16 -j MASQUERADE", EXEC_OPTIONS, function(error, stdout, stderr) {
								if(error) throw error;
							});
						}
					});
					
				});
			}
		});
	}
	
	if(info.uid > 0 && !USERNAME && CHROOT) {
		log("Run the server with a previleged user (sudo). Or use the -nochroot flag.", 5);
		log(info);
		process.exit();
	}
	
	if(info.uid == 0 && process.platform=="linux") {
		module_child_process.exec("bash linux_harderning_after_reboot.sh", function(error, stdout, stderr) {
			if(error) throw new Error("Hardening failed: " + error.message);
			if(stdout) log(stdout, DEBUG);
			if(stderr) log(stderr, NOTICE);
		});
	}
	
	if(info.uid > 0 && !USERNAME && CURRENT_USER) {
		var passwordFile = UTIL.joinPaths(HOME_DIR, CURRENT_USER, ".webide/", "password");
		module_fs.readFile(passwordFile, "utf8", function(err, data) {
			if(err && err.code == "ENOENT") {
				log("Did not find " + passwordFile, NOTICE);
				log("Please specify --username=user and --password=pw in argv!\nOr use ./hashPw.js to generate a password hash and save it in " + passwordFile + "\nAnd specify the home root folder using -h or --homedir=path", NOTICE);
				process.exit();
			}
		});
	}
	
	if(EDITOR_VERSION == 0) {
		var exec = module_child_process.exec;
		var getLatestCommitId = "hg log -l 1"
		exec(getLatestCommitId, EXEC_OPTIONS, function(error, stdout, stderr) {
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
		
		mysqlConnect();
		
		if(!USERNAME && !DEBUG_CHROOT && ALLOW_GUESTS) {
			
			module_fs.readFile(__dirname + "/GUEST_COUNTER", "utf8", function(err, data) {
				if(err) {
					if(err.code != "ENOENT") throw err;
					// Create the file if it doesn't exist
					// Creating a guest account will create the GUEST_COUNTER file!
					fillGuestPool(function guestPoolFilledMaybe(err) {
						if(err && err.code != "LOCK") throw err;
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
					});
				}
				
				startServer();
			});
		}
		else startServer();
	}
	
	function startServer() {
		
		log("Starting server ...");
		
		var wsServer = module_sockJs.createServer();
		wsServer.on("connection", sockJsConnection);
		
		if(USE_HTTPS) {
			// Note: You should never share your private key(s)!
			var httpsOptions = {
				cert: module_fs.readFileSync("fullchain.pem"),
				key: module_fs.readFileSync("privkey.pem")
			};
			HTTP_SERVER = module_https.createServer(httpsOptions, handleHttpRequest);
		}
		else {
			HTTP_SERVER = module_http.createServer(handleHttpRequest);
		}
		
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
		
		
		if(USE_HTTPS) {
			HTTP_SERVER.listen(443, HTTP_IP);
		}
		else {
			HTTP_SERVER.listen(HTTP_PORT, HTTP_IP);
		}
		
		wsServer.installHandlers(HTTP_SERVER, {prefix:'/webide'});
		
		
		if(HTTP_IP == "127.0.0.1") {
			if(!CHROOT && USERNAME ) {
				openStdinChannel();
			}
			
			log("Server running on URL/address: http://" + makeUrl() + "");
			
		}
		
		if(HTTP_IP != "127.0.0.1" && !NO_BROADCAST) {
			broadcast(HTTP_IP);
		}
		
		if(!NO_REMOTE_FILES) openRemoteFileServer();
		
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
		log("stdin channel error: " + err.message, WARN);
	});
	
	stdinServer.listen(STDIN_PORT, "127.0.0.1");
	
	
	function sendToAll(user_connections, data) {
		for (var i=0, conn; i<user_connections.connections.length; i++) {
			if(LOGLEVEL >= DEBUG) log(getIp(user_connections.connections[i]) + " <= " + UTIL.shortString(data, 256));
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

function openRemoteFileServer() {
	/*
		Enable users to write
		sudo webider /path/to/file
		while ssh:ed into a server
		and the file will open in the editor client,
		then sent back when saved.
		
		The reason why we have this code here and not in the user worker is so that all users can share the same port
	*/
	
	var StringDecoder = module_string_decoder.StringDecoder;
	var remoteFileServer = module_net.createServer();
	
	remoteFileServer.on("listening", function stdinServerListening() {
		log("Remote file server listening on port " + REMOTE_FILE_PORT, DEBUG);
	});
	
	remoteFileServer.on("connection", function stdinConnection(socket) {
		
		var decoder = new StringDecoder('utf8');
		var username; // username for this socket
		var fileName; // File name for this socket
		var strBuffer = "";
		var content = "";
		var client_connections; // Client connections for this file transfer session
		var metadataFound = false;
		var fileContentReceived = false;
		var remoteHost = socket.remoteAddress;
		var pipeId = false;
		
		log("Remote file server connection from " + remoteHost);
		
		module_dns.reverse(remoteHost, function(err, domains) {
			if(err) return log("Unable to find DNS name for ip=" + remoteHost);
			console.log("ip=" + remoteHost + " have domains: " + JSON.stringify(domains));
			if(domains.length > 0) remoteHost = domains[0];
		});
		
		socket.on("data", remoteFileSocketData);
		socket.on("end", remoteFileSocketEnd);
		socket.on("close", remoteFileSocketClose);
		
		// Must listen for errors or node -v 8 on Windows will throw on any socket error!
		socket.on("error", remoteFileSocketError);
		
		function remoteFileSocketData(data) {
			// The data will always start with username, linbreak, filename || STDIN, linebreak. 
			
			console.log("Remote file socket received " + data.length + " bytes of data ...");
			
			if(fileContentReceived) {
				log("Received data after file content EOF! data=" + data + " Destroying socket!", WARN);
				socket.destroy();
				return;
			}
			
			strBuffer += decoder.write(data);
			
			if(!username) username = findMetaData();
			if(!fileName) fileName = findMetaData();
			
			if(username && fileName) {
				
				if(!metadataFound) {
					metadataFound = true;
					client_connections = findClients(username);
					if(!client_connections) return;
					
					if(!REMOTE_FILE_SOCKETS.hasOwnProperty(username)) REMOTE_FILE_SOCKETS[username] = {};
					
					if(REMOTE_FILE_SOCKETS[username].hasOwnProperty(fileName)) {
						log("An old socket exist for fileName=" + fileName + ". Closing the old socket!", WARN);
						REMOTE_FILE_SOCKETS[username][fileName].close();
					}
					
					if(fileName == "STDIN") {
						pipeId = ++PIPE_COUNTER;
						fileName = "pipe" + pipeId;
						sendToAll(client_connections, JSON.stringify({remotePipe: {host: remoteHost, start: true, id: pipeId}}));
					}
					
					REMOTE_FILE_SOCKETS[username][fileName] = socket;
					log("Added socket to username=" + username + " fileName=" + fileName);
					
					
				}
				
				if(pipeId) {
					// We are receiving a stdin stream
					sendToStdin();
				}
				else {
					// We are receiving file conent
					
					if(strBuffer.charAt(strBuffer.length-1) == EOF) {
						strBuffer = strBuffer.slice(0, -1);
						console.log("Recieved content (" + strBuffer.length + " bytes) for " + fileName);
						
						var msg = JSON.stringify({remoteFile: {fileName: fileName, content: strBuffer, host: remoteHost}}); // Serialize
						sendToAll(client_connections, msg);
						fileContentReceived = true;
						// We want to keep the connection open, so we can send back the content when it's saved!
						
					}
					else console.log("Waiting for file content ...");
				}
			}
			
			function findMetaData() {
				// Look for a linebreak
				var lbIndex = strBuffer.indexOf("\n");
				if(lbIndex != -1) {
					var value = strBuffer.slice(0, lbIndex);
					console.log("found value=" + UTIL.lbChars(value));
					strBuffer = strBuffer.slice(lbIndex+1); // Cut out the value
					return value;
				}
				return null;
			}
			
		}
		
		function sendToStdin() {
			var msg = JSON.stringify({remotePipe: {host: remoteHost, content: strBuffer, id: pipeId}}); // Serialize
			
			console.log("Sending data to editor client user " + USERNAME + " (strBuffer.length=" + strBuffer.length + ")");
			sendToAll(client_connections, msg);
			strBuffer = ""; // Clear the buffer
		}
		
		function remoteFileSocketEnd(endData) {
			if(endData && endData.length > 0) {
				strBuffer += decoder.write(endData);
				if(pipeId) sendToStdin();
			}
			console.log("remoteFileSocketEnd: endData.length=" + (endData && endData.length) );
		}
		
		function remoteFileSocketError(err) {
			console.log("Remote file socket server error: " + err.message);
		}
		
		function remoteFileSocketClose(hadError) {
			console.log("Remote file socket closed. hadError=" + hadError);
			if(username && REMOTE_FILE_SOCKETS.hasOwnProperty(username) && REMOTE_FILE_SOCKETS[username].hasOwnProperty(fileName)) delete REMOTE_FILE_SOCKETS[username][fileName];
			
			if(pipeId) {
				sendToAll(client_connections, JSON.stringify({remotePipe: {host: remoteHost, end: true, id: pipeId}}));
			}
		}
		
		function findClients(name) {
			var clients = USER_CONNECTIONS[name];
			var users = Object.keys(USER_CONNECTIONS);
			
			if(!clients && name == "root" && USER_CONNECTIONS.hasOwnProperty("admin")) {
				clients = USER_CONNECTIONS["admin"];
				username = "admin";
			}
			
			if(!clients && name == CURRENT_USER && users.length == 1) {
				console.log("Assuming " + users[0] + " == " + CURRENT_USER);
				clients = USER_CONNECTIONS[ users[0] ];
				username = users[0];
			}
			
			if(!clients) {
				log("Unable to find a connected client for username=" + username + "! Aborting remote file transfer! Currently logged in users: " + JSON.stringify(users), NOTICE);
				socket.destroy();
			}
			
			return clients;
		}
		
	});
	
	
	remoteFileServer.on("error", function stdSocketError(err) {
		log("Remote file server error: " + err.message, WARN);
	});
	
	remoteFileServer.listen(REMOTE_FILE_PORT, "0.0.0.0");
	// Listen on all IP's so that we can get files from anywhere ...
	
	
	function sendToAll(user_connections, data) {
		for (var i=0, conn; i<user_connections.connections.length; i++) {
			if(LOGLEVEL >= DEBUG) log(getIp(user_connections.connections[i]) + " <= " + UTIL.shortString(data, 256));
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
	
	
}

function createGuestUser(id, fromRecycler, callback) {
	
	log("createGuestUser id=" + id + " fromRecycler=" + fromRecycler, DEBUG);
	
	if(typeof id == "function") {
		callback = id;
		id = undefined;
	}
	
	if(typeof fromRecycler == "function") {
		callback = fromRecycler;
		fromRecycler = undefined;
	}
	
	if(typeof id != "number" && typeof id != "undefined") {
		throw new Error("id=" + id + " needs to be a number or undefined!");
	}
	
	if(typeof callback != "function") throw new Error("createGuestUser must have a callback function!");
	
	if(!fromRecycler && IS_GUEST_USER_RECYCLING) {
		var err = new Error("Can not create a new guest user while guest users are being recycled!");
		err.code = "LOCK";
		return callback(err);
	}
	
	
	if(CREATE_USER_LOCK) {
		var err = new Error("A user is already about the be created! current id=" + id + " LAST_USERADD=" + LAST_USERADD);
		err.code = "LOCK";
		return callback(err);
	}
	CREATE_USER_LOCK = true;
	
	if( id ) {
		var guestId = id;
		var username = "guest" + guestId;
		console.time("Create " + username + " account");
		createUser();
	}
	else {
		log("createGuestUser " + username + ": Incrementing GUEST_COUNTER=" + GUEST_COUNTER + " because id=" + id, DEBUG);
		
		if(id !== undefined) throw new Error("Expected id=" + id + " to be undefined!");
		
		if(IS_GUEST_USER_RECYCLING) throw new Error("IS_GUEST_USER_RECYCLING=" + IS_GUEST_USER_RECYCLING + " Cannot increment GUEST_COUNTER while guest users are being recycled!");
		
		var guestId = ++GUEST_COUNTER;
		var username = "guest" + guestId;
		console.time("Create " + username + " account");
		
		// Save guest counter so that we can continue the number serie after server restarts
		// It's not that bad if there are holes in the number serie. 
		// We however don't want to give two people the same guest account!
		module_fs.writeFile(__dirname + "/GUEST_COUNTER", GUEST_COUNTER, function guestCounterSaved(err) {
			if(err) {
				log("createGuestUser " + username + ": Failed to save GUEST_COUNTER=" + GUEST_COUNTER + "", NOTICE);
				return callback(err);
			}
			else {
				createUser();
			}
		});
	}
	
	function createUser() {
		
		if(username == undefined || username == "guestundefined" || username == "[object Object]") {
			throw new Error("username=" + username + " id=" + id + " guestId=" + guestId);
		}
		
		if(LAST_USERADD == username) throw new Error("LAST_USERADD=" + LAST_USERADD);
		LAST_USERADD = username;
		
		var password = module_generator.generate({
			length: 10,
			numbers: true
		});
		
		if(!username) throw new Error("username=" + username);
		
		var exec = module_child_process.exec;
		
		// Pass the arguments as JSON in case some hacker use -pwfile /etc/something in their password
		var commandArg = {
			username: username,
			password: password,
			noPwHash: NO_PW_HASH, // bang bang (!!) converts the value to a boolean
			noCert: true // A certificate will be requested in saveMounts
		};
		
		
		var options = {
			cwd: module_path.join(__dirname, "../"), // Run in webide folder where adduser.js is located
			shell: EXEC_OPTIONS.shell
		}
		log("createGuestUser " + username + ": Running in options.cwd=" + options.cwd, DEBUG);
		var scriptPath = UTIL.trailingSlash(options.cwd) + "adduser.js";
		
		// Enclose argument with '' to send it "as is" (bash/sh will remove ")
		var command = scriptPath + " '" + JSON.stringify(commandArg) + "'";
		log("createGuestUser " + username + ": command=" + command, DEBUG);
		
		exec(command, options, function adduser(error, stdout, stderr) {
			CREATE_USER_LOCK = false;
			
			if(error) {
				log("createGuestUser " + username + ": " + error.message + " (error is probably in " + scriptPath + ")", NOTICE);
				return callback(error);
			}
			
			//log("createGuestUser " + username + ": stdout=" + UTIL.lbChars(stderr), DEBUG);
			//log("createGuestUser " + username + ":  stderr=" + UTIL.lbChars(stderr), DEBUG);
			
			stderr = stderr.trim(); // Can be a new line (LF)
			stdout = stdout.trim();
			
			if(stderr) return callback(new Error("Error when creating username=" + username + "! Exec command=" + command + "\nstderr=" + stderr + " (stderr.length=" + stderr.length + ")\nstdout=" + stdout + " (stdout.length=" + stdout.length + ")"));
			if(!stdout) throw new Error("Problem when creating username=" + username + "! Exec command=" + command + " did not return anyting!");
			
			
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
				log("createGuestUser " + username + ": Successfully created!");
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
	
	var serverAdvertiseMessage = "WebIDE server url: " + makeUrl();
	
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
			if(rinfo && rinfo.address != myIp) {
				console.log('broadcastClient: message: address=' + rinfo.address + ' port=' + rinfo.port +' message=' + message);
			}
			
			var lookForServerMessage = "Where can I find a WebIDE server?"
			
			if(rinfo.address != myIp && message == lookForServerMessage) advertise(rinfo.address);
			
		});
		
		broadcastClient.on('error', function (err) {
			console.error(err);
			
			log(err.message, WARN);
			
			// Clear intervals!?
			
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
			//console.log("advertise: Sent '" + message + "'");
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

function getIp(connection) {
	var IP = connection.remoteAddress;
	if(connection.headers["x-real-ip"]) IP = connection.headers["x-real-ip"];
	return IP;
}

function sockJsConnection(connection) {
	
	var userWorker = null;
	var userConnectionName = null;
	var userConnectionId = -1;
	var IP = getIp(connection);
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	var awaitingMessagesFromWorker = {};
	var recreateUserProcessSleepTime = 0;
	var lastUserProcessCrash = new Date();
	var userBrowser = UTIL.checkBrowser(agent);
	var clientSessionId = "";
	var checkingUser = false;
	
	
	
	var userAlias = userBrowser + "(" + IP + ")";
	
	// ipv6 can give ::ffff:127.0.0.1 or 127.0.0.1-xxxx
	// PS: SockJS filters connection headers! The version we use lets x-real-ip through though.
	
	log("Connection on " + protocol + " from " + IP);
	
	/*
		
		Everything sent must be commands.
		If not identified/logged in, commands will be queued
		
	*/
	
	connection.on("data", sockJsMessage);
	
	connection.on("close", sockJsClose);
	
	var data = '{"editorVersion": ' + EDITOR_VERSION + '}';
	if(LOGLEVEL >= DEBUG) log(IP + " <= " + UTIL.shortString(data, 256));
	connection.write(data);
	
	function sockJsMessage(message) {
		log(UTIL.shortString(IP + " => " + message));
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
			
			// Users logged in with the same username can send messages to each other
			
			USER_CONNECTIONS[userConnectionName].connectedClientIds.splice( USER_CONNECTIONS[userConnectionName].connectedClientIds.indexOf(userConnectionId), 1 );
			USER_CONNECTIONS[userConnectionName].connections.splice(USER_CONNECTIONS[userConnectionName].connections.indexOf(connection), 1);
			USER_CONNECTIONS[userConnectionName].sessionId.splice(USER_CONNECTIONS[userConnectionName].sessionId.indexOf(clientSessionId), 1);
			
			delete USER_CONNECTIONS[userConnectionName].connectionCLientAliases[userConnectionId];
			
			if(USER_CONNECTIONS[userConnectionName].connections.length === 0) {
				delete USER_CONNECTIONS[userConnectionName];
				
				if(DROPBOX.hasOwnProperty(userConnectionName)) {
					if(!DROPBOX[userConnectionName].linked) stopDropboxDaemon(userConnectionName);
					// else: Keep it running so that it will be synced once the user logs back in
				}
				
				if(VPN.hasOwnProperty(userConnectionName)) vpnCommand(userConnectionName, VPN[userConnectionName].homeDir, VPN[userConnectionName], function() {
					log("Stopped VPN connection for " + userConnectionName + "");
				});
				
			}
			else {
				// Tell all remaining clients that this client disconnected
				var disconnectMsg = {
					clientLeave: {
						ip: IP, 
						cId: userConnectionId, 
						connectedClientIds: USER_CONNECTIONS[userConnectionName].connectedClientIds, 
						alias: userAlias,
						connectionCLientAliases: USER_CONNECTIONS[userConnectionName].connectionCLientAliases
					}
				};
				
				var data = JSON.stringify(disconnectMsg);
				
				for (var i=0, conn; i<USER_CONNECTIONS[userConnectionName].connections.length; i++) {
					if(LOGLEVEL >= DEBUG) log(getIp(USER_CONNECTIONS[userConnectionName].connections[i]) + " <= " + UTIL.shortString(data, 256));
					USER_CONNECTIONS[userConnectionName].connections[i].write(data);
				}
			}
			
			for(var displayId in VNC_CHANNEL) {
				if(VNC_CHANNEL[displayId].startedBy == userConnectionName) stopVncChannel(displayId);
			}
			
			for(var name in PROXY) {
				if(PROXY[name].startedBy == userConnectionName) {
					if(PROXY[name].proxy) PROXY[name].proxy.close();
					delete PROXY[name];
				}
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
		
		var toUnmount = 10;
		
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
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/bin/git"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/bin/python"]), unmounted);
		umount(UTIL.joinPaths([HOME_DIR, username, "/usr/bin/nodejs"]), unmounted);
		
		function unmounted(err) {
			toUnmount--;
			if(err) {
				if(callback) callback(err);
				else log(err.message, WARN);
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
else if(command == "ping") {
send({resp: json.data});

return false;
}
		
		//console.log("The command queue has " + commandQueue.length + " items.");
		
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
				
				if(json.editorVersion == undefined) {
					return send({error: "You are using an old version of the client. Try restarting the browser (two times) and refresh the page.\nIf that doesn't work, go to developer tools (Ctrl+Shift+I) for Chrome, click Application tab at the top, then Service Workers to the left, and try clicking on the links labaled Update, Reload, Unregister, or check Update on reload. Then reload the page.", errorCode: "OLD_VERSION"});
				}
				// No need to compare version, the server has already sent it's version to the client, and the client will deal with it ...
				
				if(!json.sessionId) return send({error: "sessionId required", errorCode: "SESSIONID_REQUIRED"});
				
				if(USER_CONNECTIONS[userConnectionName] && USER_CONNECTIONS[userConnectionName].sessionId.indexOf(json.sessionId) != -1) {
					return send({error: "A connection with the session id " + json.sessionId + " already exist!", errorCode: "SESSIONID_ALREADY_CONNECTED"});
				}
				
				if(json.alias) userAlias = json.alias;
				
				if(checkingUser) {
					return send({error: "Authorizing in progress ... Please wait for a login success/error before trying agian! Or reload the browser if this error message persist.", errorCode: "AUTH_IN_PROGRESS"});
				}
				
				checkingUser = true;
				
				(function checkUser(username, password) {
					/*
						DO NOT ATTEMPT TO REFACTOR THIS FUNCTION!
						Better have the closure chain be obvious,
						as the socket connection need to have user worker etc
					*/
					
					//console.log(IP + " loggingin as " + username + ": " + (new Date()).getTime());
					console.time("Login " + IP); // user=guest can change to user###
					
					var nonHashedPw = password;
					
					var invitations = INVITATIONS[username];
					if(invitations) {
						for (var i=0; i<invitations.length; i++) {
							if(invitations[i] == nonHashedPw) {
								return idSuccess();
							}
						}
					}
					
					if(!NO_PW_HASH && !PASSWORD) {
						
						password = module_pwHash(password);
					}
					
					if(USERNAME) {
						console.log("Using USERNAME=" + USERNAME+ " from argument ...")
						
						// Use CURRENT_USER instead of USERNAME as username to prevent issies with /home/username
						if(USERNAME == username && PASSWORD == password) idSuccess();
						else idFail("Wong username or password! (Username specified in server arguments)");
					}
					else if(username == "guest" && ALLOW_GUESTS) {
						// ### Login as guest
						// Assign a user from the guest pool
						if(GUEST_POOL.length == 0) {
							// Need to wait until a new guest account is created
							if(IS_GUEST_USER_RECYCLING) {
								return idFail(new Error("The server is currenctly recycling guest users. Try again later. Or login with an existing account."));
							}
							else {
								console.log("Creating new guest user because GUEST_POOL.length=" + GUEST_POOL.length);
								createGuestUser(function guestUserCreated(err, createdUser) {
									if(err) {
										if(err.code != "LOCK") {
											return idFail(new Error("A fatal error (" + err.code + ") occured during guest account creation. Try again later. Or login with an existing account."));
throw err;
										}
										else if(++createUserRetries > 3) {
											return idFail(new Error("Could not create a guest user because new guest accounts are currently locked. Try again later. Or login with an existing account."));
										}
										
										return setTimeout(function retryCreateAccount() {
											console.log("Retrying guest login ...");
											checkUser(username, password);
										}, 1000);
									}
									else loginAsGuest(createdUser.username, createdUser.password, false);
								});
							}
						}
						else {
							var guestUser = GUEST_POOL.shift();
							log("Using guest account " + guestUser + " from GUEST_POOL (new length=" + GUEST_POOL.length + ")");
							var guestPw = module_generator.generate({
								length: 10,
								numbers: true
							});
							loginAsGuest(guestUser, guestPw, true);
							// Save/Reset the password
							if(!NO_PW_HASH) {
								
								guestPw = module_pwHash(guestPw);
							}
							
							module_fs.writeFile(UTIL.joinPaths([HOME_DIR, username, ".webide/", "password"]), guestPw, function(err) {
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
						
						sendMail("webide@" + HOSTNAME, ADMIN_EMAIL, guestUser, "New guest login: user=" + guestUser + " IP=" + IP);
						
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
						
						var passwordFile = UTIL.joinPaths([HOME_DIR, username, ".webide/", "password"]);
						module_fs.readFile(passwordFile, "utf8", function readPw(err, pwstringFromFile) {
							if(err) {
								console.error(err);
								idFail(err.message);
							}
							else {
								if(pwstringFromFile.slice(-1) == "\n") {
									log("Ignoring line-feed in " + passwordFile + "", DEBUG);
									pwstringFromFile = pwstringFromFile.slice(0, -1);
								}
								if(password == pwstringFromFile) idSuccess();
								else {
									idFail("Wrong password for user: " + username);
									console.log("Hashed pw *" + password + "* (entered by user) != *" + pwstringFromFile + "* (.webide/password file)");
								}
							}
						});
						
					}
					
					function idFail(errorMsg) {
						
						if(errorMsg instanceof Error) errorMsg = errorMsg.message;
						
						send({error: errorMsg});
						log("username=" + username + " failed to login: " + errorMsg);
						
						console.timeEnd("Login " + IP);
						
						checkingUser = false;
					}
					
					function idSuccess(alreadyCheckedMounts) {
						
						log("idSuccess: " + username, DEBUG);
						
						var rootPath; // The path to chroot into
						var uid, gid; // System user-id and group-id
						var homeDir; // User's home dir
						var shell; // User's shell (currently disabled/not implemented)
						var groups; // Object with groupName:groupId
						
						userConnectionName = username;
						
						if(USERNAME && !CHROOT) {
							// Running as standalone desktop app
							homeDir = process.env.HOME || process.env.USERPROFILE;
							if(homeDir) homeDir = UTIL.trailingSlash(homeDir);
							rootPath = VIRTUAL_ROOT ? homeDir : module_path.parse(homeDir).root;
							acceptUser();
						}
						else {
							// Get home, uid and gid (and also the groups the user belongs to)
							log("readEtcPasswd... username=" + username, DEBUG);
							readEtcPasswd(username, function(err, passwd) {
								if(err) {
									if(process.platform === "win32") {
										
										homeDir = UTIL.trailingSlash(UTIL.joinPaths(HOME_DIR, username));
										shell = false;
										uid = undefined;
										gid = undefined;
										rootPath = VIRTUAL_ROOT ? homeDir : module_path.parse(homeDir).root;
										acceptUser();
										return;
									}
									else {
										send({error: err.message});
									throw err;
										return;
									}
									
									return;
								}
								
								log(username + " passwd=" + JSON.stringify(passwd), DEBUG);
								
								homeDir = passwd.homeDir;
								shell = passwd.shell;
								uid = passwd.uid;
								gid = passwd.gid;
								rootPath = passwd.homeDir;
								groups = passwd.groups;
								
								if(alreadyCheckedMounts) acceptUser();
								else checkMounts({username: username, homeDir: homeDir, uid: uid, gid: gid}, checkedMounts);
								
							});
						}
						
						function checkedMounts(err, mountInfo) {
							if(err) idFail("Problem creating mounts: " + err.message);
							else acceptUser();
						}
						
						function acceptUser() {
							
							clientSessionId = json.sessionId;
							
							if(!USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
								userConnectionId = 1;
								
								USER_CONNECTIONS[userConnectionName] = {
									connections: [connection],
									connectionCounter: 1, // Start with 1 so it's true:ish. Keep incrementing so we get a unique id
									echoCounter: 1, // Start with 1 so it's true:ish
									connectedClientIds: [userConnectionId],
									connectionCLientAliases: {1: userAlias},
									sessionId: [clientSessionId]
								}
								
							}
							else {
								userConnectionId = ++USER_CONNECTIONS[userConnectionName].connectionCounter;
								
								USER_CONNECTIONS[userConnectionName].connections.push(connection);
								USER_CONNECTIONS[userConnectionName].connectedClientIds.push(userConnectionId);
								USER_CONNECTIONS[userConnectionName].connectionCLientAliases[userConnectionId] = userAlias;
								USER_CONNECTIONS[userConnectionName].sessionId.push(clientSessionId);
							}
							
							if(gid == undefined) gid = uid;
							
							userWorker = createUserWorker(userConnectionName, uid, gid, homeDir, groups);
							// Tell the worker process which user
							var userInfo = {name: userConnectionName, rootPath: (CHROOT || VIRTUAL_ROOT) && rootPath, homeDir: homeDir, shell: shell};
							
							log("User userConnectionName=" + userConnectionName + " logged in! CHROOT=" + CHROOT + " VIRTUAL_ROOT=" + VIRTUAL_ROOT + " rootPath=" + rootPath + " userConnectionId=" + userConnectionId + " sessionId=" + json.sessionId + " userInfo=" + JSON.stringify(userInfo));
							
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
							
							//console.log("userConnectionId=" + userConnectionId);
							


							// Respond to the client that the login was successful
							var userInfo = {
								user: userConnectionName,
								alias: userAlias,
								sessionId: json.sessionId,
								ip: IP,
								cId: userConnectionId,
								connectedClientIds: USER_CONNECTIONS[userConnectionName].connectedClientIds,
								editorVersion: EDITOR_VERSION,
								platform: process.platform,
								homeDir: (CHROOT || VIRTUAL_ROOT) ? "/" : homeDir
							};
							
							if(CHROOT) {
								userInfo.installDirectory = __dirname.replace(/server$/, "");
							}
							
							if(uid && process.platform=="linux") {
var netnsIP = UTIL.int2ip(167772162 + uid); // Starts on 10.0.0.2 then adds the uid to get a unique local IP address
userInfo.netnsIP = netnsIP;
}

							send({resp: {loginSuccess: userInfo}});
							
							// Tell all client that a new client has connected
							var clientJoin = {
								ip: IP,
								cId: userConnectionId,
								connectedClientIds: USER_CONNECTIONS[userConnectionName].connectedClientIds,
								alias: userAlias,
								connectionCLientAliases: USER_CONNECTIONS[userConnectionName].connectionCLientAliases
							};
							
							for (var i=0, conn; i<USER_CONNECTIONS[userConnectionName].connections.length; i++) {
								send({clientJoin: clientJoin, id: 0}, USER_CONNECTIONS[userConnectionName].connections[i]);
							}
							
							if(commandQueue.length > 0) {
								console.log("Running " + commandQueue.length + " commands from the command queue ...");
								for(var i=0; i<commandQueue.length; i++) {
									handleUserMessage(commandQueue[i]);
								}
								commandQueue.length = 0;
							}
							
							if(userConnectionName == USERNAME) {
								if(stdinChannelBuffer) {
send({stdin: stdinChannelBuffer, id: 0});
									stdinChannelBuffer = "";
								}
								
								if(editorProcessArguments) {
									send({arguments: editorProcessArguments, id: 0});
									editorProcessArguments = "";
								}
							}
							else {
								// Save last login date and update loginCounter
							module_fs.writeFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "lastLogin"]), unixTimeStamp(), function createLastLoginFile(err) {
								if(err && err.code == "ENOENT") {
									// .webide/storage/ probably doesn't exist in the home dir!
										module_fs.mkdir(UTIL.joinPaths([homeDir, ".webide/", "storage/"], {recursive: true}), function(err) {
											if(err && err.code != "EEXIST") throw err;
											
											// Try again
											module_fs.writeFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "lastLogin"]), unixTimeStamp(), function(err) {
												if(err) throw err;
												else lastLoginFileUpdated()
											});
											
										});
										
									return;
								}
								else if(err) throw err;
								else lastLoginFileUpdated();
								
								function lastLoginFileUpdated() {
										// Update loginCounter
										module_fs.readFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "loginCounter"]), function readLoginCounter(err, data) {
											if(err) {
if(err.code != "ENOENT") throw err;
var loginCounter = 0;
}
											else {
												var loginCounter = parseInt(data);
											}
											
											loginCounter++;
											
											send({loginCounter: loginCounter, id: 0});
											
											//var data = JSON.stringify();
											//connection.write(data);
											
											module_fs.writeFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "loginCounter"]), loginCounter.toString(), function readLoginCounter(err) {
												if(err) throw err;
												
												
												console.timeEnd("Login " + IP);
												console.log(IP + " logged in as " + username + "");
												
												checkingUser = false;
												
												
});

										});
										
										
								}
								
							});
							}
							
							return true;
							
							function messageFromWorker(workerMessage, handle) {
								//console.log("Worker message from " + userConnectionName + ": " + UTIL.shortString(workerMessage) + " handle=" + handle);
								
								if(workerMessage.resp || workerMessage.error) {
									send(workerMessage);
								}
								else if(workerMessage.message) {
									var obj;
									if(USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
										for (var i=0, conn; i<USER_CONNECTIONS[userConnectionName].connections.length; i++) {
											
											// Need to copy the props into another object so the object passed to send will be unique (and have id=0)
											obj = {};
											for(var name in workerMessage.message) {
												obj[name] = workerMessage.message[name];
											}
											obj.id = 0;
											
											send(obj, USER_CONNECTIONS[userConnectionName].connections[i]);
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
										
										if(CHROOT && HOME_DIR) folder = HOME_DIR + userConnectionName + folder;
										
										console.log("createHttpEndpoint: CHROOT=" + CHROOT + " req.createHttpEndpoint.folder=" + req.createHttpEndpoint.folder + " folder=" + folder);
										
										createHttpEndpoint(userConnectionName, folder, function(err, url) {
											if(err) workerResp(err.message);
											else workerResp(null, {url: url});
										});
									}
									else if(req.removeHttpEndpoint) {
										
										var folder = req.removeHttpEndpoint.folder;
										
										if(CHROOT && HOME_DIR) folder = HOME_DIR + userConnectionName + folder;
										
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
									
									else if(req.tcpPort) {
										// Find a free TCP port
										var tcpPort = parseInt(req.tcpPort);
										if(isNaN(tcpPort)) tcpPort = 1024;
										// Make sure the port is not used
										getTcpPort(tcpPort, function(err, port) {
											if(err) workerResp(err);
											else workerResp(null, port);
										});
									}
									
									else if(req.proxy) {
										// So the editor client can access another url from the current server URL to avoid CORS-errors
										// only works for http(s)!? Not Websockets!?
										
										var proxyName = req.proxy.name;
										var proxyUrl = req.proxy.url;
										var proxyWs = req.proxy.ws;
										
										for(var name in PROXY) {
											if(name == proxyName) return workerResp(new Error("There's already a proxy named " + proxyName));
										}
										
										PROXY[proxyName] = {
											startedBy: username,
											proxy: new module_httpProxy.createProxyServer({
												target: proxyUrl,
												ws: proxyWs
											})
										};
										
										PROXY[proxyName].proxy.on('error', function (err, req, res) {
											res.writeHead(502, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
											res.end("Proxy failed: " + err.message);
										});
										
										PROXY[proxyName].proxy.on('proxyReq', function(proxyReq, req, res, options){
											var rewritedPath = req.url.replace('/proxy/' + proxyName, '');
											proxyReq.path = rewritedPath;
										});
										
										var resp = {
											name: proxyName,
											url: proxyUrl
										};
										
										workerResp(null, resp);
										
									}
									else if(req.stopProxy) {
										var proxyName = req.proxy.name;
										
										if(!PROXY.hasOwnProperty(proxyName)) {
											return workerResp(new Error("There's no proxy named " + proxyName));
										}
										
										if(PROXY[proxyName].startedBy != username) {
											return workerResp(new Error("The proxy named " + proxyName + " was not started by you!"));
										}
										
										if(PROXY[proxyName].proxy) PROXY[proxyName].proxy.close();
										
										delete PROXY[proxyName]
									}
									
									else if(req.createMysqlDb) {
										createMysqlDb(username, req.createMysqlDb, workerResp);
									}
									
									else if(req.remoteFile) {
										var fileName = req.remoteFile.name;
										
										if( !REMOTE_FILE_SOCKETS.hasOwnProperty(username) ) {
											workerResp("No remote file sockets found for username=" + username);
											log( "Users with remote file sockets: " + Object.keys(REMOTE_FILE_SOCKETS) );
											return;
										}
										else if( !REMOTE_FILE_SOCKETS[username].hasOwnProperty(fileName) ) {
											workerResp("No remote file socket found for fileName= " + fileName + "");
											log( "Remote file sockets: " + Object.keys(REMOTE_FILE_SOCKETS[username]) );
											return;
										}
										else {
											var socket = REMOTE_FILE_SOCKETS[username][fileName];
											if(req.remoteFile.content) {
												// File saved
												socket.write(req.remoteFile.content + EOF);
											}
											if(req.remoteFile.close) {
												// File closed
												socket.destroy();
											}
											workerResp(null);
										}
									}
									
									else if(req.pipe) {
										if( !REMOTE_FILE_SOCKETS.hasOwnProperty(username) ) {
											workerResp("No remote pipe sockets found for username=" + username);
											log( "Users with pipe sockets: " + Object.keys(REMOTE_FILE_SOCKETS) );
											return;
										}
										else if( !REMOTE_FILE_SOCKETS[username].hasOwnProperty("pipe" + req.pipe.id) ) {
											workerResp("No remote pipe socket found for id= " + req.pipe.id + "");
											log( "Remote sockets: " + Object.keys(REMOTE_FILE_SOCKETS[username]) );
											return;
										}
										else {
											var socket = REMOTE_FILE_SOCKETS[username]["pipe" + req.pipe.id];
											if(req.pipe.content) {
												log("Sending " + req.pipe.content.length + " characters through remote pipe " + req.pipe.id)
												socket.write(req.pipe.content);
											}
											if(req.pipe.close) {
												socket.destroy();
											}
											workerResp(null);
										}
										
									}
									
									// ### Dropbox worker requests
									else if(req.startDropboxDaemon) {
										startDropboxDaemon(userConnectionName, uid, gid, homeDir, function(err, resp) {
											workerResp(err, resp);
										});
									}
									else if(req.checkDropboxDaemon) {
										checkDropboxDaemon(userConnectionName, function(err, resp) {
											workerResp(err, resp);
										});
									}
									else if(req.stopDropboxDaemon) {
										stopDropboxDaemon(userConnectionName, function(err, resp) {
											workerResp(err, resp);
										});
									}
									else if(req.vpn) {
										vpnCommand(userConnectionName, homeDir, req.vpn, workerResp);
									}
									else if(req.dockerDaemon) {
										dockerDaemon(userConnectionName, homeDir, uid, req.dockerDaemon, workerResp);
									}
									
									
									else throw new Error("Unknown request from worker: " + JSON.stringify(req, null, 2));
									}
								else throw new Error("Bad message from worker: workerMessage=" + JSON.stringify(workerMessage, null, 2));
								
								
								function workerResp(err, resp) {
									if(id == undefined) throw new Error("id=" + id);
									var obj = {id: id, parentResponse: resp};
									if(err) obj.err = err.message ? {message: err.message, code: err.code} : err;
									userWorker.send(obj);
								}
								
							}
							
							function workerCloseHandler(code, signal) {
								//console.log(userConnectionName + " worker close: code=" + code + " signal=" + signal);
								
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
										userWorker = createUserWorker(userConnectionName, uid, gid, homeDir);
										userWorker.send({identify: userInfo});
										
										userWorker.on("message", messageFromWorker);
										userWorker.on("close", workerCloseHandler);
									}, recreateUserProcessSleepTime);
								}
								
								send({msg: msg, code: "WORKER_CLOSE", id: 0});
								
							}
							
						}
					}
					
				})(json.username, json.password);
				
				
			}
		}
		else {
			// We got a user worker!
			
			if(command == "echo") {
				// Send the data to all other connected client, except the client that sent the echo msg
				json.echoCounter = ++USER_CONNECTIONS[userConnectionName].echoCounter;
				
				if(json.echoCounter != json.order) log( "Out of sync: echo: echoCounter=" + json.echoCounter + " json=" + UTIL.shortString(JSON.stringify(json)) , NOTICE);
				
				json.cId = userConnectionId;
				json.alias = userAlias;
				
				for (var i=0, conn; i<USER_CONNECTIONS[userConnectionName].connections.length; i++) {
					//if(USER_CONNECTIONS[userConnectionName].connections[i] != connection) {
						send({echo: json, id: 0}, USER_CONNECTIONS[userConnectionName].connections[i]);
					//}
				}
			}
			else if(command == "invite") {
				
				if(!INVITATIONS.hasOwnProperty(userConnectionName)) INVITATIONS[userConnectionName] = [];
				
				var password = module_generator.generate({
					length: 5,
					numbers: true
				});
				
				INVITATIONS[userConnectionName].push(password);
				
				var answer = {
					resp: {
						username: userConnectionName,
						password: password
					}
				};
				send(answer);
				
				
			}
			else {
				
				userWorker.send({commands: {command: command, json: json, id: id}});
			}
			
		}
		
		function send(answer, conn) {
			
			if(conn == undefined) conn = connection;
			
			//console.log("answer.id=" + answer.id);
			
			if(answer.id == undefined && id) {
				//console.log("Setting answer.id to id=" + id + " because answer.id=" + answer.id + "==undefined && id=" + id + " answer=" + JSON.stringify(answer, null, 2));
				answer.id = id;
			}
			
			if(answer.id == id) id = null; // Do not reuse the same id
			
			if(answer.id === 0) delete answer["id"]; // Use id=0 to avoid taking another id
			
			// Sanity check
			// Note: This function mutates the answer object, so if it's called in a loop, next iteration will have id==undefined
			if( answer.hasOwnProperty("echo") && answer.hasOwnProperty("id") ) throw new Error("echo with id=" + answer.id + ": " + JSON.stringify(echo, null, 2));
			
			if(!answer.id && answer.hasOwnProperty("resp")) throw new Error("No id in answer with resp! answer=" + JSON.stringify(answer));
			if(!answer.id && answer.hasOwnProperty("error")) throw new Error("No id in answer with error! answer=" + JSON.stringify(answer));
			// Possible cause: callback being called twice or a "resp" that should be an "event" instead.
			
			var str = JSON.stringify(answer);
			
			log(IP + " <= " + (answer.id ? answer.id : "") + UTIL.shortString(str, 256));
			conn.write(str);
		}
	}
	
}


function checkMounts(options, checkMountsCallback) {
	/*
		This function will make sure that the user has everything setup.
		It will create everything the user need to run on the server
		(to make it easy to move users between servers)
	*/
	
	if(process.platform != "linux") throw new Error("checkMounts should only run in Linux!");
	
	var username = options.username;
	var homeDir = options.homeDir;
	var uid = options.uid;
	var gid = options.gid;
	
	var mountErrorMessages = [];
	
	if(username == "guestundefined") throw new Error("username=" + username);
	
	if(username == undefined) throw new Error("username=" + username);
	if(homeDir == undefined) throw new Error("homeDir=" + homeDir);
	if(uid == undefined) throw new Error("uid=" + uid);
	if(gid == undefined) throw new Error("gid=" + gid);
	if(checkMountsCallback == undefined) throw new Error("checkMountsCallback=" + checkMountsCallback);
	
	log("checkMounts: username=" + username + " CHROOT=" + CHROOT, DEBUG);
	
	// Make sure everything is mounted etc ...
	
	
	//console.log("Checking mounts for username=" + username + " ...");
	console.time("check " + username + " mounts");
	
	
	var nginxProfileOK = false;
	var foldersToMount = 0;
	var foldersMounted = 0;
	var apparmorProfilesToCreate = 0;
	var reloadApparmor = false;
	var reloadedApparmor = false;
	var checkMountsReady = false;
	var sslCertChecked = false;
	var hgrccacertsUptodate = true;
	var passwdCreated = true;
	var subuidCreated = true;
	var subgidCreated = true;
	var checkMountsAbort = false;
	var mysqlCheck = false;
	var createdNetworkNamespaces = (process.platform != "linux");
	var filesToWrite = 0;
	var filesWritten = 0;
	
	
	// When a user have been moved to another server, the user id will be different.
	// So we have to reset the user permissions!
	// www-data user id might be the same though, depending on distro
	// this means USER NAMES NEED TO BE UNIQUE!
	checkUserRights(username, function checkedUserRights(err) {
		if(err) return checkMountsError(err);
		
		//console.log("User rights OK for username=" + username);
		
		console.time("Mount " + username + " files and folders");
		
		if(CHROOT) {
			
			/*
				Make sure mounts exist
				----------------------
				Mount instead of copying to save hdd space
				
				Problem: Racing to create folders
				Solution: Create folder before mounting
				
				Each mount takes ca 150ms, so only mount bare minimum for performance!
				(it's better performance wise to mount a whole folder then many separate files in the same folder)
				
				Don't forget to update removeuser.js !
			*/
			
			// !!!! IF ANY FOLDER FAILS TO UNMOUNT IT IS NOT SAFE TO DELETE THE HOME DIR !!!!
			// !!!! IF THE HOME DIR IS DELETED WHILE A FOLDER IS STILL MOUNTED THAT FOLDER WILL BE DELETED !!!!
			
			// ALSO UPDATE removeuser.js !!!
			
			var apparmorProfiles = [
				"../etc/apparmor/usr.bin.nodejs_someuser",
				"../etc/apparmor/home.someuser.usr.bin.node",
				"../etc/apparmor/home.someuser.usr.bin.python",
				"../etc/apparmor/home.someuser.usr.bin.hg",
				"../etc/apparmor/home.someuser.usr.bin.git",
				"../etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npm-cli.js",
				"../etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npx-cli.js",
				"../etc/apparmor/home.someuser.bin.bash"
			];
			
			var apparmorProfilesToCreate = apparmorProfiles.length;
			var foldersToMount = 3;
			
			var passwdCreated = false;
			var subuidCreated = false;
			var subgidCreated = false;
			
		// We need separate executables to have separate apparmor profiles for user scripts and user_worker.js script
		module_mount(process.argv[0], '/usr/bin/nodejs_' + username, folderMounted);
		
		module_mount("/lib/", homeDir + "lib", folderMounted);
		module_mount("/lib64/", homeDir + "lib64", folderMounted);
		
		if(DEBUG_CHROOT) {
			foldersToMount += 9;
			
			// Note you need to manually delete /home/user/etc
			
			module_mount("/usr/", homeDir + "usr/", folderMounted);
			module_mount("/etc/", homeDir + "etc/", folderMounted);
			module_mount("/proc/", homeDir + "proc/", folderMounted);
			module_mount("/bin/", homeDir + "bin/", folderMounted);
			module_mount("/dev/", homeDir + "dev/", folderMounted);
			module_mount("/run/", homeDir + "run/", folderMounted);
			module_mount("/var/", homeDir + "var/", folderMounted);
			module_mount("/sys/", homeDir + "sys/", folderMounted);
			module_mount("/sbin/", homeDir + "sbin/", folderMounted);
		}
		else {
			
			if(MOUNT_BINS) {
				// Useful if you want all programs available in the chroot
				foldersToMount += 2;
				module_mount("/usr/bin/", homeDir + "usr/bin/", folderMounted);
				module_mount("/bin/", homeDir + "bin/", folderMounted);
				
			}
			else {
				// Only pick some of the programs from /usr/bin/ and /bin/
				
				foldersToMount++;
				module_mount(process.argv[0], homeDir + "usr/bin/node", function(err) {
					if(err) throw err;
					// Some programs like to use nodejs instead of node
					module_fs.symlink("node", homeDir + "usr/bin/nodejs", function (err) {
						if(err && err.code != "EEXIST") throw err; // It's allright if the link already exist
						foldersMounted++;
						checkMountsReadyMaybe();
					});
				});
				
				// Don't forget to investigate all links and add umount to removeuser.js!!!
				foldersToMount++;mountFollowSymlink("/usr/bin/python", homeDir, function(err, targetRelative) {
					if(err) throw err;
					
					// Mercurial wants a python2
					module_fs.symlink(targetRelative, homeDir + "usr/bin/python2", function (err) {
						if(err && err.code != "EEXIST") throw(err);
						foldersMounted++;
						checkMountsReadyMaybe();
					});
				});
				
				// Don't forget to investigate all links and add umount to removeuser.js!!!
				
				
				
				// For bins that are symlinks
				foldersToMount++;mountFollowSymlink("/bin/sh", homeDir, folderMounted); // gunzip will give ENOENT error without /bin/sh
				foldersToMount++;mountFollowSymlink("/usr/bin/g++", homeDir, folderMounted); // Needed by some make scripts
				foldersToMount++;mountFollowSymlink("/usr/bin/as", homeDir, folderMounted); // Needed by g++
				foldersToMount++;mountFollowSymlink("/usr/bin/ld", homeDir, folderMounted); // Needed by make scripts
				foldersToMount++;mountFollowSymlink("/usr/bin/ar", homeDir, folderMounted); // Needed to compile Node.js!?
				foldersToMount++;mountFollowSymlink("/usr/bin/ranlib", homeDir, folderMounted); // Needed to compile Node.js!?
				//foldersToMount++;mountFollowSymlink("/usr/bin/which", homeDir, folderMounted); // Needed by docker install script
				foldersToMount++;mountFollowSymlink("/usr/bin/touch", homeDir, folderMounted); // Needed by make scripts
				foldersToMount++;mountFollowSymlink("/usr/bin/less", homeDir, folderMounted); // Wanted by Mercurial
				
				
				// for debugging
				foldersToMount++;module_mount("/bin/ping", homeDir + "bin/ping", folderMounted);

				
				foldersToMount++;module_mount("/usr/bin/env", homeDir + "usr/bin/env", folderMounted); // common in shebangs (npm needs it)
				foldersToMount++;module_mount("/usr/bin/hg", homeDir + "usr/bin/hg", folderMounted);
				foldersToMount++;module_mount("/usr/bin/git", homeDir + "usr/bin/git", folderMounted);
				
				foldersToMount++;module_mount("/usr/bin/ssh", homeDir + "usr/bin/ssh", folderMounted); // So users can ssh into other machines (and use git+ssh !?)
				foldersToMount++;module_mount("/usr/bin/ssh-keygen", homeDir + "usr/bin/ssh-keygen", folderMounted); // Generating ssh keys
				foldersToMount++;module_mount("/usr/bin/unrar-nonfree", homeDir + "usr/bin/unrar", folderMounted);
				foldersToMount++;module_mount("/usr/bin/unzip", homeDir + "usr/bin/unzip", folderMounted);
				foldersToMount++;module_mount("/usr/bin/zip", homeDir + "usr/bin/zip", folderMounted); // Create .zip files (zip folders)
				foldersToMount++;module_mount("/usr/bin/make", homeDir + "usr/bin/make", folderMounted); // Needed by some npm modules to install
				foldersToMount++;module_mount("/usr/bin/printf", homeDir + "usr/bin/printf", folderMounted); // Needed by some make scripts
				
				foldersToMount++;module_mount("/usr/bin/x86_64-linux-gnu-gcc-7", homeDir + "usr/bin/cc", folderMounted); // Needed by g++ ??
				
				foldersToMount++;module_mount("/usr/bin/tr", homeDir + "usr/bin/tr", folderMounted); // Used by nvm
				foldersToMount++;module_mount("/usr/bin/tail", homeDir + "usr/bin/tail", folderMounted); // Used by nvm
				foldersToMount++;module_mount("/usr/bin/gawk", homeDir + "usr/bin/awk", folderMounted); // Used by nvm
				foldersToMount++;module_mount("/usr/bin/sort", homeDir + "usr/bin/sort", folderMounted); // Used by nvm
				foldersToMount++;module_mount("/usr/bin/sha256sum", homeDir + "usr/bin/sha256sum", folderMounted); // Used by nvm
				foldersToMount++;module_mount("/usr/bin/dirname", homeDir + "usr/bin/dirname", folderMounted); // Used by nvm
				
				foldersToMount++;module_mount("/usr/bin/openssl", homeDir + "usr/bin/openssl", folderMounted); // Needed to compile Node.js!?
				foldersToMount++;module_mount("/usr/bin/pkg-config", homeDir + "usr/bin/pkg-config", folderMounted); // Needed to compile Node.js!? (to find openssl)
				foldersToMount++;module_mount("/usr/bin/curl", homeDir + "usr/bin/curl", folderMounted); // Needed by some install scripts (curl | sh) :P
				//foldersToMount++;module_mount("/usr/bin/id", homeDir + "usr/bin/id", folderMounted); // Needed by docker install script
				//foldersToMount++;module_mount("/usr/bin/newuidmap", homeDir + "usr/bin/newuidmap", folderMounted); // Needed by docker install script
				foldersToMount++;module_mount("/usr/bin/head", homeDir + "usr/bin/head", folderMounted); // Wanted by rclone install
				foldersToMount++;module_mount("/usr/bin/expr", homeDir + "usr/bin/expr", folderMounted); // Wanted dropbox config
				foldersToMount++;module_mount("/usr/bin/wget", homeDir + "usr/bin/wget", folderMounted); // Can be useful
				
foldersToMount++;module_mount("/usr/bin/docker", homeDir + "usr/bin/docker", folderMounted); // Docker
				foldersToMount++;module_mount("/usr/local/bin/docker-compose", homeDir + "usr/local/bin/docker-compose", folderMounted); // Docker
				foldersToMount++;module_mount("/var/run/docker.sock", homeDir + "sock/docker", folderMounted); // Docker
				
				
				
				//foldersToMount++;module_mount("/bin/mktemp", homeDir + "bin/mktemp", folderMounted); // Needed by docker install script
				//foldersToMount++;module_mount("/bin/cat", homeDir + "bin/cat", folderMounted); // Needed by docker install script
				foldersToMount++;module_mount("/bin/bash", homeDir + "bin/bash", folderMounted); // Shell for "terminal"
				foldersToMount++;module_mount("/bin/gunzip", homeDir + "bin/gunzip", folderMounted);
				foldersToMount++;module_mount("/bin/gzip", homeDir + "bin/gzip", folderMounted); // gunzip seems to need it
				foldersToMount++;module_mount("/bin/ln", homeDir + "bin/ln", folderMounted); // can be useful when fiddling in the terminal
				foldersToMount++;module_mount("/bin/ls", homeDir + "bin/ls", folderMounted); // for debugging
				foldersToMount++;module_mount("/bin/mkdir", homeDir + "bin/mkdir", folderMounted); // can be useful when fiddling in the terminal
				foldersToMount++;module_mount("/bin/mv", homeDir + "bin/mv", folderMounted); // can be useful when fiddling in the terminal
				foldersToMount++;module_mount("/bin/rm", homeDir + "bin/rm", folderMounted); // can be useful when fiddling in the terminal
				foldersToMount++;module_mount("/bin/rmdir", homeDir + "bin/rmdir", folderMounted); // can be useful when fiddling in the terminal
				foldersToMount++;module_mount("/bin/tar", homeDir + "bin/tar", folderMounted);
				foldersToMount++;module_mount("/bin/sed", homeDir + "bin/sed", folderMounted); // Needed by make scripts
				foldersToMount++;module_mount("/bin/grep", homeDir + "bin/grep", folderMounted); // Needed by make scripts
				foldersToMount++;module_mount("/bin/cp", homeDir + "bin/cp", folderMounted); // Needed by make scripts
				foldersToMount++;module_mount("/bin/uname", homeDir + "bin/uname", folderMounted); // Wanted by nvm
				foldersToMount++;module_mount("/bin/bzip2", homeDir + "bin/bzip2", folderMounted); // Needed by tar
				foldersToMount++;module_mount("/bin/readlink", homeDir + "bin/readlink", folderMounted); // Needed by Dropbox client
				
			}
			
			// Put programs outside /bin/ and /usr/bin here
			
			//foldersToMount++;mountFollowSymlink("/sbin/iptables", homeDir, folderMounted); // Needed by docker
			//foldersToMount++;mountFollowSymlink("/sbin/lsmod", homeDir, folderMounted); // Needed by docker
			
			foldersToMount++;module_mount("/usr/include", homeDir + "usr/include", folderMounted); // Needed by g++
			
			foldersToMount++;module_mount("/usr/local/lib", homeDir + "usr/local/lib", folderMounted); // Needed for Python packages (hggit)
			
			
			
			// ALSO UPDATE removeuser.js !!!
			
			
			foldersToMount++;module_mount("/etc/ssl/certs", homeDir + "etc/ssl/certs", folderMounted); // Sometimes? Needed for SSL verfification
			
			
			


			//foldersToMount++;module_mount("/sys/module/", homeDir + "sys/module", folderMounted); // Needed by lsmod (Docker dep)
			
			
			
			// Some python scripts (Mercurial) need /usr/share
			foldersToMount++;module_mount("/usr/share/", homeDir + "usr/share", folderMounted);
			
			
			// npm
			foldersToMount++;module_mount("/usr/lib/", homeDir + "usr/lib", function(err) {
				if(err) throw err;
				/*
					npm creastes a symlink in /usr/bin/
					npm can be installed on different places depending on OS and distro and package maintainer ...
					In Ubuntu run: dpkg -L npm
					
					Nodesource puts it in /usr/lib/node_modules/npm/bin/npm-cli.js
					Ubuntu 18 puts it in  /usr/share/npm/bin/npm-cli.js
					Arch Linux puts it in /usr/lib/node_modules/npm/bin/npm-cli.js
					
					So we'll force everyone to have it in /usr/lib/node_modules/npm/bin/ (sorry Ubuntu)
					You need nodejs v10 to support Ubuntu-18 meanwhile Ubuntu-18 comes with nodejs v8 !
					So Ubuntu server admins need to uninstall nodejs and npm and install it from nodesource
					(see instructions in README.txt)
					
				*/
				
				var npmBin = "/usr/lib/node_modules/npm/bin/";
				module_fs.stat(npmBin, function(err, stats) {
					if(err && err.code == "ENOENT") {
						throw new Error("npm-cli.js needs to be installed in " + npmBin + "\nUninstall nodejs and npm, then install nodejs from nodesource! See instructions in README");
					}
					else if(err) throw err;
					
					var usrBinRelativeNpmBinDir = npmBin
					usrBinRelativeNpmBinDir = usrBinRelativeNpmBinDir.replace(/^\/usr\/lib/, "../lib"); // Nodesource
					
					module_fs.symlink(usrBinRelativeNpmBinDir + "npm-cli.js", homeDir + "usr/bin/npm", function symLinkCreated(err) {
						if(err && err.code != "EEXIST") throw err; // It's allright if the link already exist
						
						module_fs.symlink(usrBinRelativeNpmBinDir + "/npx-cli.js", homeDir + "usr/bin/npx", function symLinkCreated(err) {
							if(err && err.code != "EEXIST") throw err; // It's allright if the link already exist
							foldersMounted++;
							checkMountsReadyMaybe();
						});
					});
				});
			});
			
			/*
				## mount proc
				/proc/ is a psuedo filesystem needed by many apps
				/proc/cpuinfo - Needed for os.cpus()
				/proc/stat - Needed for nodejs/npm
				/proc/sys/vm/overcommit_memory - Needed for nodejs/npm
				
				question: What's the difference between -t proc none and -t proc proc !?
				answer: The proc filesystem is not associated with a special device, and when mounting it, an arbitrary keyword, such as proc can be used instead of a device specification
				ref: https://linux.die.net/man/8/mount
			*/
			foldersToMount++;module_mount(null, homeDir + "proc/", 'mount -t proc ' + username + '-proc-temp "' + homeDir + 'proc/" -o hidepid=2,gid=2', folderMounted);
			/*
				must make a remount in order to hidepid to take effect!
				must also use gid=1 (a number other then 0) in order to hidepid to take effect!
			*/
			foldersToMount++;module_mount(null, homeDir + "proc/", 'mount -t proc ' + username + '-proc "' + homeDir + 'proc/" -o remount,hidepid=2,gid=2', folderMounted);
			
			
			// ## mount dev
			// Need to create the dev and dev/pts folder first because mount devpts wont create it
			foldersToMount += 3;
			module_fs.mkdir(homeDir + "dev/", function(err) {
				if(err && err.code != "EEXIST") throw err;
				
				module_mount("/dev/urandom", homeDir + "dev/urandom", folderMounted);
				module_mount("/dev/null", homeDir + "dev/null", folderMounted);
				
				// Needed for pseudo terminals 
				// First dev/pts need to be created with rwrwrw, then dev/pts/ptmx need to be mounted to dev/ptmx (Ubuntu 18)
				module_fs.mkdir(homeDir + "dev/pts/", function(err) {
					if(err && err.code != "EEXIST") throw err;
					
					module_mount(null, homeDir + "dev/pts/", 'mount -t devpts none "' + homeDir + 'dev/pts/" -o ptmxmode=0666,newinstance', function(err) {
						if(err) throw err;
						
						module_mount(homeDir + "dev/pts/ptmx", homeDir + "dev/ptmx", folderMounted);
					});
				});
			});
			
		}
		
		// ALSO UPDATE removeuser.js !!!
		
			
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
		
		/*
			// Docker needs /etc/subuid, but we don't want to show what other users are on the system
			if(!DEBUG_CHROOT) {
			module_fs.readFile("/etc/subuid", "utf8", function(err, data) {
			var rows = data.split("\n");
			var foundUser = false;
			for (var i=0, col; i<rows.length; i++) {
			col = rows[i].split(":");
			if(col[0]==username) found(rows[i]);
			}
			if(!foundUser) {
			reportError("Did not find username=" + username + " in /etc/subuid data=" + data);
			subuidCreated = true;
			checkMountsReadyMaybe();
			return;
			}
			function found(data) {
			foundUser = true;
			module_fs.writeFile(homeDir + "etc/subuid", data + "\n", function(err) {
			subuidCreated = true;
			checkMountsReadyMaybe();
			});
			}
			});;
			}
			else subuidCreated = true;
		*/
		subuidCreated = true;
		
		/*
			// Docker needs /etc/subgid, but we don't want to show what other users are on the system
			if(!DEBUG_CHROOT) {
			module_fs.readFile("/etc/subgid", "utf8", function(err, data) {
			var rows = data.split("\n");
			var foundUser = false;
			for (var i=0, col; i<rows.length; i++) {
			col = rows[i].split(":");
			if(col[0]==username) found(rows[i]);
			}
			if(!foundUser) {
			reportError("Did not find username=" + username + " in /etc/subgid data=" + data);
			subgidCreated = true;
			checkMountsReadyMaybe();
			return;
			}
			function found(data) {
			foundUser = true;
			module_fs.writeFile(homeDir + "etc/subgid", data + "\n", function(err) {
			subgidCreated = true;
			checkMountsReadyMaybe();
			});
			}
			});;
			}
			else subgidCreated = true;
		*/
		subgidCreated = true;


		} // end if(CHROOT)
		
		
		
		
		
		if(!createdNetworkNamespaces) {
			
			var IP = UTIL.int2ip(167772162 + uid);
			
			var createNetnsFile = function createNetnsFile(etcFile, content) {
				filesToWrite++;
				
				var stats = 0;
				var writes = 0;
				
				stats++;module_fs.stat("/etc/" + etcFile + "", function(err) {stats--;
					if(err && err.code == "ENOENT") {
						// ip netns exec wont unshare bind if the file don't exist in /etc/
						
						stats++;module_fs.stat(UTIL.joinPaths("/etc/netns/", username, etcFile), function(err) {stats--;
							if(err && err.code == "ENOENT") return doneMaybe();
							else if(err) throw err;
							
							// Make sure there is no file in /etc/netns/ or mount will throw errors!
							writes++;module_fs.unlink(UTIL.joinPaths("/etc/netns/", username, etcFile), content, function (err) {writes--;
								if (err) throw err;
								doneMaybe();
							});
							
						});
						
						return doneMaybe();
					}
					else if(err) throw err;
					
					writes++;module_fs.writeFile(UTIL.joinPaths("/etc/netns/", username, etcFile), content, function (err) {writes--;
						if (err) throw err;
						doneMaybe();
					});
				});
				
				if(etcFile.charAt(etcFile.length-1) != "-") {
					// Also unshare mount the backup files!
					createNetnsFile(etcFile + "-", content)
				}
				
				function doneMaybe() {
					if(stats==0 && writes==0) {
						filesWritten++;
						checkMountsReadyMaybe();
					}
				}
				
			}
			
			var copyEntryFrom = function copyEntryFrom(etcFile) {
				filesToWrite++;module_fs.readFile("/etc/" + etcFile, "utf8", function(err, text) {filesWritten++;
					if(err && err.code=="ENOENT") {
						log("/etc/" + etcFile + " does not exist!", INFO);
						return;
					}
					else if(err) throw err;
					
					// Find line beginning with the username
					var lines = text.split("\n");
					for (var i=0; i<lines.length; i++) {
						if(lines[i].indexOf(username+":") == 0) {
							var line = lines[i];
							break;
						}
					}
					if(!line) {
						log("Unable to find " + username + ": in /etc/" + etcFile, INFO);
						return;
					}
					
					createNetnsFile(etcFile, line);
				});
			}
			
			// When user launches for example a node.js web server listening on "localhost"
			// We want it to listen on the user IP in order to be accessible from https://####.user.TLD
			createNetnsFile("hosts", IP + "\tlocalhost");
			
			// Override host's resolvers
			createNetnsFile("resolv.conf", "nameserver 8.8.8.8\nnameserver 8.8.4.4");
			
			
			// Make it harder to see other users on the system by faking...
			createNetnsFile("passwd", username + ":x:" + uid + ":" + gid + "::" + HOME_DIR + username + ":/bin/bash");
			createNetnsFile("group", username + ":x:" + gid + ":");
			
			copyEntryFrom("subuid");
			copyEntryFrom("subgid");
			
			createNetnsFile("mtab", "");
			
			
			
			
			module_child_process.exec("bash addnetns.sh " + username + " --unattended", EXEC_OPTIONS, function(error, stdout, stderr) {
				//if(error) log("addnetns error: " + error.message, WARN);
				if(error && error.code != 17) throw new Error("Error: " + error.message + " error.code=" + error.code + " stdout=" + stdout + " stderr=" + stderr);
				
				if(stdout) log("addnetns stdout: " + stdout, INFO);
				if(stderr) log("addnetns stderr: " + stderr, WARN);
				
				var reIP = /^IP=(.*)/m;
				var matchIP = stdout.match(reIP);
				if(!matchIP) throw new Error("Unable to find " + reIP + " in stdout=" + stdout);
				var parsedIP = matchIP[1];
				if(parsedIP != IP) throw new Error("Unexpected parsedIP=" + parsedIP + " IP=" + IP + "  ");
				
				createdNetworkNamespaces = true;
				checkMountsReadyMaybe();
			});
			
			
			
		}
		
		
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
			module_copyFile(systemHgrccacertsPath, userHgrccacertsPath, function copied(err) {
			if(err) return checkMountsError(err);
			hgrccacertsUptodate = true;
			checkMountsReadyMaybe();
			});
			}
			});
			});
		*/
		
		
		// ### MySQL
		module_mount(MYSQL_PORT, homeDir + "sock/mysql", function(err) {
			if(err) {
				
				if(err.code == "ENOENT") {
					log("MySQL socket does not exist: " + MYSQL_PORT, WARN);
				}
				else {
					// Sometimes we get code=32 mount failure...
					log("Problems mounting MySQL socket: " + MYSQL_PORT + " code=" + err.code, WARN);
				}
				
				console.error(err);
				mysqlCheck = true;
				checkMountsReadyMaybe();
				return;
			}
			
			// Make sure a mysql user exist
			mysqlConnection.query("SELECT user FROM user WHERE user = ? AND host = 'localhost'", [username], function(err, rows, fields) {
				if(err) throw err;
				
				if(rows.length == 0) {
					mysqlConnection.query("CREATE USER ?@'localhost' IDENTIFIED WITH auth_socket", [username], function(err, rows, fields) {
						if(err) throw err;
						
						mountMysqlClient();
					});
				}
				else mountMysqlClient();
			});
			
			function mountMysqlClient() {
				if(DEBUG_CHROOT || MOUNT_BINS) {
					// /usr/bin will be mounted anyway
					mysqlCheck = true;
					checkMountsReadyMaybe();
					return;
				}
				else  {
					module_mount("/usr/bin/mysql", homeDir + "usr/bin/mysql", function(err) {
						if(err) throw err;
						
						mysqlCheck = true;
						checkMountsReadyMaybe();
						return;
					});
				}
			}
		});
		
		// Make sure nginx profile exist
		var nginxSitesAvailable = "/etc/nginx/sites-available/"
		// Allow Nginx not to be installed
		module_fs.stat(nginxSitesAvailable, function (err, stats) {
			if(err) {
				log(err.message+ "\nNginx is probably not installed. User's Nginx profile was Not installed!", NOTICE);
				mountErrorMessages.push(err);
				nginxProfileOK = true;
				sslCertChecked = true;
				checkMountsReadyMaybe();
				return;
			}
			console.time("Check " + username + " nginx profile");
			var url_user = UTIL.urlFriendly(username);
			var nginxProfilePath = nginxSitesAvailable + url_user + "." + DOMAIN + ".nginx";
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
								exec("service nginx reload", EXEC_OPTIONS, function(error, stdout, stderr) {
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
		});
		
	}); // checked user rights
	
	function checkUserRights(username, callback) {
		var toChown = 0;
		var toStat = 0;
		
		//console.log("Checking user rights for username=" + username + " ...");
		console.time("Check " + username + " user rights");
		module_fs.stat(HOME_DIR + username, function (err, stats) {
			if(err) throw err;
			/*
				If you get ENOENT: no such file or directory, stat '/home/guest1'
				It's possible that the user was not fully deleted, eg. the user exist, but not the home dir,
				try userdel guest1, or restore the home dir from backup.
			*/
			
			
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
			// Note: Need to have a debug message infront of all spawn and exec because they do not get proper call stacks
			log("exec: " + apparmorReloadCommand, DEBUG);
			exec(apparmorReloadCommand, EXEC_OPTIONS, function(error, stdout, stderr) {
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
		foldersMounted++;
		
		//if(err) return checkMountsError(err);
		
		// Let the user login even if there is a mount error
		if(err) mountErrorMessages.push(err);
		
		if(foldersMounted > foldersToMount) throw new Error("foldersMounted=" + foldersMounted + " foldersToMount=" + foldersToMount);
		
		if(foldersMounted == foldersToMount) console.timeEnd("Mount " + username + " files and folders");
		
		checkMountsReadyMaybe();
	}
	
	function checkMountsReadyMaybe() {
		if(checkMountsAbort) return;
		
		console.log("checkMounts: nginxProfileOK=" + nginxProfileOK + " passwdCreated=" + passwdCreated + " foldersToMount=" + foldersToMount + " foldersMounted=" + foldersMounted + " apparmorProfilesToCreate=" + apparmorProfilesToCreate + " reloadApparmor=" + reloadApparmor + " reloadedApparmor=" + reloadedApparmor + " sslCertChecked=" + sslCertChecked + " mysqlCheck=" + mysqlCheck + " ");
		
		if(createdNetworkNamespaces && nginxProfileOK && foldersToMount == foldersMounted && apparmorProfilesToCreate == 0 && passwdCreated && subuidCreated && subgidCreated 
		&& ((reloadApparmor && reloadedApparmor) || !reloadApparmor ) && (sslCertChecked || !options.waitForSSL) && mysqlCheck && filesToWrite==filesWritten) {
			
			if(!checkMountsReady) { // Prevent double accept
				checkMountsReady = true;
				
				if(mountErrorMessages.length > 0) {
					// Send the server admin a message !?
					var errorMessages = "The following errors occured when the mount points where checked:\n";
					for (var i=0; i<mountErrorMessages.length; i++) {
						errorMessages = errorMessages+ mountErrorMessages[i] + "\n";
					}
					log(errorMessages, WARN);
				}
				
				console.timeEnd("check " + username + " mounts");
				checkMountsCallback(null);
			}
			else throw new Error("checkMounts already callced checkMountsCallback!");
			
		}
		else {
			
			if(!createdNetworkNamespaces) log("Waiting for network namespace to be created...", DEBUG);
			if(!nginxProfileOK) log("Waiting for Nginx profiles to be created...", DEBUG);
			if(foldersToMount != foldersMounted) log("Waiting for foldersToMount=" + foldersToMount + " foldersMounted=" + foldersMounted + " ...", DEBUG);
			if(apparmorProfilesToCreate != 0) log("Waiting for apparmorProfilesToCreate=" + apparmorProfilesToCreate, DEBUG)
			if(!passwdCreated) log("Waiting for /etc/passwd to be created...", DEBUG);
			if(!subuidCreated)  log("Waiting for /etc/subuid to be created...", DEBUG);
			if(!subgidCreated)  log("Waiting for /etc/subgid to be created...", DEBUG);
			if((reloadApparmor && !reloadedApparmor) || reloadApparmor ) log("Waiting for apparmor to be reloaded...", DEBUG);
			if((!sslCertChecked && options.waitForSSL)) log("Waiting for SSL certificates to be created...", DEBUG);
			if(!mysqlCheck) log("Waiting for mySQL socket to be created ...", DEBUG);
			if(filesToWrite!=filesWritten) log("Waiting for filesToWrite=" + filesToWrite + " filesWritten=" + filesWritten + "  ", DEBUG);
			
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
					apparmorProfile = apparmorProfile.replace(/%WEBIDE%/g, UTIL.parentFolder(__dirname));
					
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
					if(options.waitForSSL) checkMountsReadyMaybe();
					return;
				}
				
				// the cert does not exist. Try to register it
				
				console.time("Register " + userDomain + " with letsencrypt");
				var wildcard = true;
				module_letsencrypt.register(userDomain, ADMIN_EMAIL, wildcard, function(err) {
					console.timeEnd("Register " + userDomain + " with letsencrypt");
					if(err) {
						if(FAILED_SSL_REG.hasOwnProperty(userDomain)) FAILED_SSL_REG[userDomain]++;
						else FAILED_SSL_REG[userDomain] = 1;
						
						if(err.code == "ENOENT") log("certbot not installed!", WARN);
						else if(err.code == "RATE_LIMIT") log("Unable to create letsencrypt cert because of rate limit!", WARN);
						else {
							log(err.message, WARN);
						}
						sslCertChecked = true;
						console.timeEnd("Check " + username + " SSL Cert");
						if(options.waitForSSL) checkMountsReadyMaybe();
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
				
				if(data.indexOf("#SSL#") == -1 && data.indexOf("#NOSSL#") == -1) {
					log("SSL already configured on " + userDomain);
					sslCertChecked = true;
					console.timeEnd("Check " + username + " SSL Cert");
					if(options.waitForSSL) checkMountsReadyMaybe();
					return;
				}
				
				data = data.replace(/#SSL#/g, ""); // Remove the comment before "listen 443 ssl"
				data = data.replace(/.*#NOSSL#/g, ""); // Remove all lines that have #NOSSL# in it
				
				module_fs.writeFile(nginxProfilePath, data, function(err) {
					if(err) throw err;
					
					console.log("SSL enabled: " + nginxProfilePath);
					
					console.time(username + " nginx reload");
					var exec = module_child_process.exec;
					exec("service nginx reload", EXEC_OPTIONS, function(error, stdout, stderr) {
						console.timeEnd(username + " nginx reload");
						
						if(error) throw(error);
						if(stderr) throw new Error(stderr);
						if(stdout) throw new Error(stdout);
						
						sslCertChecked = true;
						console.timeEnd("Check " + username + " SSL Cert");
						if(options.waitForSSL) checkMountsReadyMaybe();
					});
				});
			});
		}
		
		
	} // checkSslCert
	
} // checkMounts

function mountFollowSymlink(binaryFile, homeDir, mountFollowSymlinkActualCallback) {
	//log("mountFollowSymlink: binaryFile=" + binaryFile + " homeDir=" + homeDir + " ", DEBUG);
	 
	// Check if binaryFile is a symlink, follows the symlinks,
	// mounts the actual binary file, then creates the symlinks
	var folder = UTIL.getDirectoryFromPath(binaryFile);

	recursiveLinks(binaryFile, function(err, links, targetBinary, targetRelative) {
		if(err) return mountFollowSymlinkCallback(err);

		var targetInHomeDir = UTIL.joinPaths(homeDir, targetBinary);
		
		//log("mountFollowSymlink: targetBinary=" + binaryFile + " targetInHomeDir=" + targetInHomeDir + " links=" + JSON.stringify(links) + " ", DEBUG);
		
		module_mount(targetBinary, targetInHomeDir, function(err) {
			if(err) return mountFollowSymlinkCallback(err);
			
			createLinks(links, function(err) {
				if(err) mountFollowSymlinkCallback(err);
				else mountFollowSymlinkCallback(null, targetRelative);
			});
		});
	});
	
	function mountFollowSymlinkCallback(err, target) {
		mountFollowSymlinkActualCallback(err, target);
		mountFollowSymlinkActualCallback = null; // Prevent further callbacks, and throw an error if it tries to call back again
	}
	
	function createLinks(links, callback) {
		if(links.length == 0) return callback(null);
		
		var linksToCreate = links.slice(); // Don't mess with the original array
		
		createLink(linksToCreate.pop());
		
		function createLink(link) {
			
			var pathInHomeDir = UTIL.joinPaths(homeDir, link.path);
			
			module_fs.symlink(link.target, pathInHomeDir, function (err) {
				if(err) {
					if(err.code == "EEXIST") {
						// Make sure it links to the correct target
						module_fs.readlink(pathInHomeDir, function(err, linkStr) {
							if(err) {
								// It's probably not a link!
								module_fs.stat(pathInHomeDir, function(err, stats) {
									if(err) throw err; // We should not fail to stat, because it exist
									
									if(stats.size == 0) {
										// It's emty, so we can delete it
										module_fs.unlink(pathInHomeDir, function(err) {
											if(err) throw err; // Should not result in an error
											
											// Now attempt to create the link again
											// Not recursive to prevent loop
											module_fs.symlink(link.target, pathInHomeDir, function (err) {
												if(err) return callback(err); // We give up (this should not result in an error)
												else makeAnotherLink();
											});
											
										});
									}
									else {
										// We don't know what to do
										return callback(new Error(pathInHomeDir + " is not a link and it's not empty! Unable to link it to " + link.target)); 
									}
								});
							}
							else {
								if(linkStr == link.target) makeAnotherLink();
								else {
									throw new Error("linkStr=" + linkStr + " link.target=" + link.target);
								}
							}
						});
					}
					else return callback(err); 
				}
				else {
					makeAnotherLink();
				}
				
				function makeAnotherLink() {
					if(linksToCreate.length > 0) createLink(linksToCreate.pop());
					else callback(null);
				}
				
			});
		}
	}
	
	function recursiveLinks(binaryFile, callback) {
		// Returns an array of links, and the final binary they all link to
		
		var folder = UTIL.getDirectoryFromPath(binaryFile);
		var links = [];
		
		checkLink(binaryFile);
		
		function checkLink(binaryFile) {
			module_fs.readlink(binaryFile, function(err, linkString) {
				if(!err) {
					// No error means it's a symlink
					
					var targetAbsolutePath = UTIL.resolvePath(folder, linkString);
					
					// note: Target can NOT be an absolute path! Or chroot wont work.
					
					links.push({target: linkString, path: binaryFile});
					
					// Check if it's a symbolic link
					checkLink(targetAbsolutePath, linkString);
				}
				else if(err.code == "EINVAL") {
					// We found the actually a binary!
					
					if(links.length > 0) {
						var targetRelative = links[0].target;
					}
					else {
						var targetRelative = UTIL.getFilenameFromPath(binaryFile);
					}
					
					callback(null, links, binaryFile, targetRelative);
				}
				else callback(err);
			});
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
	
	var responseHeaders = {
		'Content-Type': 'text/plain; charset=utf-8', 
		"Cache-Control": "no-cache, must-revalidate",
		"Pragma": "no-cache",
		"Expires": "Sat, 1 Jan 2005 00:00:00 GMT"
	};
	
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
	else if(firstDir == "inspector") {
		if(INSPECTOR.hasOwnProperty(secondDir)) {
			if(request.url.indexOf("/json")) {
				console.log("Proxying request to inspector " + secondDir + " using http? " + request.protocol);
				INSPECTOR[secondDir].proxy.web(request, response);
			}
			else {
				console.log("Proxying request to inspector " + secondDir + " using websockets (request.protocol=" + request.protocol + " dirs[2]=" + dirs[2] + ")");
				
				INSPECTOR[secondDir].proxy.ws(request, response, { target: 'http://127.0.0.1:' + INSPECTOR[secondDir].port });
				//INSPECTOR[secondDir].proxy.ws(request, response, { target: 'http://127.0.0.1:' + INSPECTOR[secondDir].port + "/" +  });
			}
			
		}
		else {
			response.writeHead(404, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("Inspector not found: " + secondDir);
		}
		return;
	}
	else if(firstDir == "proxy") {
		if(PROXY.hasOwnProperty(secondDir)) {
			log("Proxying request to proxy " + secondDir, INFO);
			//request.url = request.url.replace("/proxy/secondDir", "");
			PROXY[secondDir].proxy.web(request, response);
		}
		else {
			response.writeHead(404, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
			response.end("Proxy not found: " + secondDir);
		}
		return;
	}
	else if(firstDir == "share") {
		/*
			### Upload files to user via web share
			https://developers.google.com/web/updates/2018/12/web-share-target
			https://stackoverflow.com/questions/57917599/how-to-handle-images-offline-in-a-pwa-share-target
			
			The PWA will navigate to /share as specified in manifest.webmanisfest
			
		*/
		var Busboy = require('busboy');
		var sendToUser = "";
		var files = [];
		if (request.method === 'POST') {
			/*
				Figure out what user should get the file
				Probably the user with the same IP !?
				
				What if there are manu users with the same IP!?
				todo: Make the service worker handle the request!
				Then "upload" the file from the service worker cache!?
				https://glitch.com/~web-share-offline
			*/
			
			var conn, ip;
			conns: for(var username in USER_CONNECTIONS) {
				for(var i=0; i<USER_CONNECTIONS[username].connections.length; i++) {
					conn = USER_CONNECTIONS[username].connections[i];
					ip = conn.headers["x-real-ip"] || conn.remoteAddress;
					if(ip == IP) {
						sendToUser = username;
						log("User found: " + sendToUser, INFO);
						break conns;
					}
					//log(UTIL.objInfo(conn), INFO);
				}
			}
			
			var busboy = new Busboy({ headers: request.headers });
			busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
				log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype, DEBUG);
				file.on('data', function(data) {
					log('File [' + fieldname + '] got ' + data.length + ' bytes', DEBUG);
					
				});
				file.on('end', function() {
					log('File [' + fieldname + '] Finished', DEBUG);
				});
				
				// Save file in temp dir, then move it to the user home dir.
				var saveTo = module_path.join(module_os.tmpDir(), module_path.basename(fieldname));
				file.pipe(module_fs.createWriteStream(saveTo));
				files.push(saveTo);
				
			});
			busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
				log('Field [' + fieldname + ']: value: ', val, DEBUG);
				
				if(fieldname == "user") sendToUser = val;
			});
			busboy.on('finish', function() {
				log('Done parsing form!', DEBUG);
				
				var done = function(uploadMessage) {
					response.writeHead(302, { Location: '/?open=/upload/file', 'Content-Type': 'text/plain; charset=utf-8' });
					response.end(uploadMessage);
				}
				
				var uploadedFiles = [];
				
				if(files.length == 0) {
					done("Error: Did not recieve any files!");
				}
				else if(sendToUser) {
					
					var copyFile = function copyFile(fromPath, username, fileName) {
						
						var uploadFolder = HOME_DIR + username + "/upload/";
						var toPath = uploadFolder + fileName;
						
						// First create the upload dir if it doesn't already exist
						log("Checking folder: " + uploadFolder, DEBUG);
						module_fs.stat(uploadFolder, function(err, stats) {
							if(err) {
								if(err.code == "ENOENT") {
									module_fs.mkdir(uploadFolder, function(err) {
										if(err) {
console.error(err);
											filesFailed.push(fileName, " Error: " + err.message);
											filesMovedCount++;
											doneMaybe();
										}
										else folderCreated(uploadFolder);
									});
								}
								else throw err;
							}
							else if(stats.isDirectory()) {
								log("Folder exist: " + uploadFolder, DEBUG);
								folderCreated(uploadFolder);
							}
							else {
								log("Not a directory: " + uploadFolder, DEBUG);
								filesFailed.push(fileName, " Error: Problem with upload folder");
								filesMovedCount++;
								doneMaybe();
							}
						});
						
						function folderCreated(uploadFolder) {
							
							log("Copying file: " + fromPath + " to " + toPath, DEBUG);
							module_fs.copyFile(fromPath, toPath, fileCopied);
						}
						
						function doneMaybe() {
							if(filesMovedCount == files.length) {
								if(files.length == 1) {
									var uploadMessage = "Success: File sent to " + sendToUser;
								}
								else {
									var uploadMessage = "Success: " + files.length + "files sent to " + sendToUser;
								}
								
								if(filesFailed.length > 0) {
									var uploadMessage = "Warning: " + filesFailed.length + " / " + files.length + " failed to upload to " + sendToUser + "!\n" + filesFailed.join("\n");
								}
								
								// Notify the user
								var user_connections = USER_CONNECTIONS[username];
								if(user_connections) {
									
									var data = JSON.stringify({
										uploadedFiles: uploadedFiles
									});
									
									log("Notifying user " + username + " (" + user_connections.connections.length + " connections): data: " + data, DEBUG);
									
									for (var i=0; i<user_connections.connections.length; i++) {
										if(LOGLEVEL >= DEBUG) log(getIp(user_connections.connections[i]) + " <= " + UTIL.shortString(data, 256));
										user_connections.connections[i].write(data);
									}
								}
								else {
									uploadMessage += "Warning: " + username + " is not online!";
									log("User " + username + " not online!", INFO);
								}
								
								done(uploadMessage);
							}
						}
						
						function fileCopied(err) {
							filesMovedCount++;
							if(err) {
								console.error(err);
								filesFailed.push(fileName, " Error: " + err.message);
							}
							else {
								log("Copied file to " + toPath, DEBUG);
								uploadedFiles.push(fileName);
								module_fs.unlink(fromPath, function(err) {
									if(err) console.error(err);
									else log("Deleted " + fromPath, DEBUG);
								});
								
								readEtcPasswd(username, function(err, user) {
									if(err) {
										console.error(err);
										return;
									}
									module_fs.chown(toPath, user.uid, user.gid, function(err) {
										if(err) console.error(err);
										else log("Changed ownership of " + toPath + " to " + username, DEBUG);
									});
								});
								
							}
							
							doneMaybe();
							
						}
					}
					
					// Need to copy the file into user dir. Can't move/rename: EXDEV: cross-device link not permitted
					var filesMovedCount = 0;
					var filesFailed = [];
					
					// Does user exist ?
					var homeDir = HOME_DIR + sendToUser;
					log("Checking folder: " + homeDir, DEBUG);
					module_fs.stat(homeDir, function(err, stats) {
						if(err) {
							log("Folder not found: " + homeDir + " Assuming user doesnt exist.", DEBUG);
							done("Error: User does not exist:" + sendToUser);
						}
						else if(stats.isDirectory()) {
							log("Folder exist: " + homeDir + "", DEBUG);
							
							var fileName;
							for (var i=0; i<files.length; i++) {
								fileName = UTIL.getFilenameFromPath(files[i]);
								copyFile(files[i], sendToUser, fileName);
							}
						}
						else {
							done("Error: Not a folder:" + homeDir);
						}
					});
					
				}
				else {
					done("Error: Found no user to send the file to! Add a user field!");
				}
				
			});
			request.pipe(busboy);
		}
		else if (request.method === 'GET') {
			response.writeHead(400, { Connection: 'close', 'Content-Type': 'text/plain; charset=utf-8' });
			response.end('Expected a HTTP POST!');
		}
		return;
	}
	else if(HTTP_ENDPOINTS.hasOwnProperty(firstDir)) {
		
		localFolder = HTTP_ENDPOINTS[firstDir];
		
		localFolder = UTIL.toSystemPathDelimiters(localFolder);
		
		urlPath = urlPath.replace(firstDir + "/", "");
		
		responseHeaders['Cache-Control'] = 'no-cache';
		
		log("Serving from http-endpoint=" + firstDir + " localFolder=" + localFolder + "", INFO);
		
	}
	else {
		
		//console.log("firstDir=" + firstDir + " not in endpoints: " + JSON.stringify(HTTP_ENDPOINTS));
		
		if(urlPath == "/" || urlPath == "") urlPath = "/index.htm";
		
		localFolder = module_path.resolve("../client/");
		
		//console.log("Serving from the webide client folder: " + localFolder);
		
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
		
		log("Unknown mime type: fileExtension=" + fileExtension, WARN);
		
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
				
				log("HTTP Server: File not found: " + filePath, WARN);
				
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
			
			// Some browsers (like IE11) doesn't use utf8 by default
			if(fileExtension == "js" || fileExtension == "svg" || fileExtension == "htm" || fileExtension == "html" || fileExtension == "css") {
				responseHeaders['Content-Type'] += "; charset=utf-8";
			}
			
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

function createUserWorker(username, uid, gid, homeDir, groups) {
	
	// You can have different group and user. Default is the user/group running the node process
	var spawnOptions = {};
	var workerArgs = ["--loglevel=" + LOGLEVEL, "--user=" + username, "--uid=" + uid, "--gid=" + gid, "--home=" + homeDir, "--chroot=" + (CHROOT), "--virtualroot=" + VIRTUAL_ROOT];
	var workerNode = process.argv[0]; // First argument is the path to the nodejs executable!
	
	// Using spawn instead of fork to be able to use Linux network namespaces
	
	spawnOptions.env = {
		username: username,
		HOME: (!CHROOT || USERNAME) ? homeDir : "/",
		USER: username,
		LOGNAME: username,
		USER_NAME: username
	}
	
	if(groups) {
		// we have to manually serialize objects!
		spawnOptions.env.groups = JSON.stringify(groups);
	}
	
	// For forking when running in the Termux Android app
	if(module_os.platform()=="android") {
		spawnOptions.env["LD_LIBRARY_PATH"] = "/data/data/com.termux/files/usr/lib";
	}
	
	// Need to start the worker as root if network namespaces are used!
	if(!CHROOT && NO_NETNS) {
		log("Spawning with uid=" + uid + " and gid=" + gid + " ...", DEBUG);
		if(uid != undefined) spawnOptions.uid = parseInt(uid);
		if(gid != undefined) spawnOptions.gid = parseInt(gid);
		
		spawnOptions.env.PATH =  process.env.PATH;
	}
	else {
		spawnOptions.env.uid = uid;
		spawnOptions.env.gid = gid;
		
		// Assume unix like system
		if(CHROOT) {
		spawnOptions.env.PATH = "/usr/bin:/usr/local/bin/:/bin:/sbin:/.npm-packages/bin";
		spawnOptions.env["NPM_CONFIG_PREFIX"] = "/.npm-packages";
		}
		else {
			spawnOptions.env.PATH = "/usr/bin:/usr/local/bin/:/bin:/sbin:" + homeDir + "/.npm-packages/bin";
			spawnOptions.env["NPM_CONFIG_PREFIX"] = homeDir + "/.npm-packages";
		}
		
//spawnOptions.env["DOCKER_HOST"] = "unix:///sock/docker"; // note: the unix:// protocol is needed, because, while it usesd the socket to connect, without the protocol part it will try to run commands via an tpc port on localhost...
		
		if(CHROOT && uid) workerNode = "/usr/bin/nodejs_" + username; // Hard link to nodejs binary so each user can have an unique apparmor profile
	}
	
	if(uid == undefined || uid == -1) {
		log("No uid specified!\nUSER WILL RUN AS username=" + CURRENT_USER, WARN);
		
		if(process.getuid) {
			if(process.getuid() == 0 && !CRAZY) {
				throw new Error("It's not recommended to run a user worker process as root (Use argument -crazy if you want to do it anyway)");
			}
		}
	}
	
	var workerScript = module_path.resolve(__dirname, "./user_worker.js");
	
	if(!NO_NETNS && uid && process.platform=="linux") {
		var command = "/sbin/ip";
		//var args = ["netns", "exec", username, "sudo -u " + username, workerNode, workerScript].concat(workerArgs);
		var args = ["netns", "exec", username, workerNode, workerScript].concat(workerArgs);
		var netnsIP = UTIL.int2ip(167772162 + uid); // Starts on 10.0.0.2 then adds the uid to get a unique local IP address
spawnOptions.env.HOST = netnsIP;
		
		spawnOptions.shell = EXEC_OPTIONS.shell;
		
		spawnOptions.stdio = ['pipe', 'pipe', 'pipe', "ipc"]; // ipc needed for sending messages to the worker
		// stdio: inherit sends log message to this process stdout, but that doesn't work when using network namespaces!
		var stdioPipe = true;
	}
	else {
		var command = workerNode;
		var args = [workerScript].concat(workerArgs);
		spawnOptions.stdio = ['inherit', 'inherit', 'inherit', "ipc"]; // ipc needed for sending messages to the worker
	}
	
	log("Spawning user worker process... username=" + username + " uid=" + uid + " gid=" + gid + " chroot=" + (CHROOT) + " groups=" + JSON.stringify(groups), INFO);
	log("Spawning with spawnOptions=" + JSON.stringify(spawnOptions) + "", DEBUG);
	
	//log"(process.env=" + JSON.stringify(process.env) + "", DEBUG)
	
	
	try {
		var worker = module_child_process.spawn(command, args, spawnOptions);
	}
	catch(err) {
		if(err.code == "EPERM") {
			if(uid != undefined) log("Unable to spawn worker with uid=" + uid + " and gid=" + gid + ".\nTry running the server with a privileged (sudo) user.", NOTICE);
			throw new Error("Unable to spawn worker! (" + err.message + ")");
		}
		else {
			console.log("args=" + JSON.stringify(args) + " spawnOptions=" + JSON.stringify(spawnOptions));
			// If you get spawn EACCES it probably means that the hard link or mount to /usr/bin/nodejs_username no longer exist!
			// Easiest solution is to remove and re-add the user.
			if(uid) log("Did you reboot !? Check if mount to /usr/bin/nodejs_" + username + " exist!", NOTICE);
			throw err;
		}
	}
	
	worker.on("close", function workerClose(code, signal) {
		console.log(username + " worker close: code=" + code + " signal=" + signal);
	});
	
	worker.on("disconnect", function workerDisconnect() {
		console.log(username + " worker disconnect: worker.connected=" + worker.connected);
	});
	
	worker.on("error", function workerError(err) {
		console.log(username + " worker error: err.message=" + err.message);
	});
	
	worker.on("exit", function workerExit(code, signal) {
		console.log(username + " worker exit: code=" + code + " signal=" + signal);
	});
	
	if(stdioPipe) {
		
		worker.stdout.on("data", function workerExit(data) {
			log(data.toString());
		});
		
		worker.stderr.on("data", function workerExit(data) {
			log(data.toString());
		});

	}
	
	log(username + " worker pid=" + worker.pid);
	
	
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
	
	var chromiumDebuggerPort = CHROMIUM_DEBUG_PORT;
	
	if(chromiumDebuggerPort instanceof Error) {
		stopVncChannel(displayId);
		return callback(chromiumDebuggerPort);
	}
	
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
					getTcpPort(CHROMIUM_DEBUG_PORT, gotChromiumDebuggerPort);
					
				}
				
			});
		}
	}
	
	function gotChromiumDebuggerPort(err, port) {
		if(err) callback(new Error("Failed to get a tcp port for the chromium debugger: " + err.message));
		else {
			chromiumDebuggerPort = port;
			startChromiumBrowser();
		}
	}
	
	function startChromiumBrowser() {
		
		if(url == undefined) url = "about:blank";
		
		// https://peter.sh/experiments/chromium-command-line-switches/#condition-6
		var chromiumBrowserArgs = [
			//"--chrome", // No idea what --chrome flag does ...
			"--user-data-dir=" + HOME_DIR + username + "/.chromium/", // Chromium will create the folder if it doesn't exist!
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
				if(stdout.indexOf(chromeWindowId) != -1) getTcpPort(VNC_PORT, gotX11vncPort);
				else if(++checkCounter < maxCheck) setTimeout(checkIfChromiumBrowserHasStarted, timeInterval);
				else {
					VNC_CHANNEL[displayId].xvfb.kill();
					callback(new Error("Failed to start chromium-browser in a timely manner. Result from xwininfo: + " + stdout));
				}
			});
		}
	}
	
	function gotX11vncPort(err, port) {
		if(err) callback(new Error("Failed to get a tcp port for x11vnc: " + err.message));
		else {
			startX11vnc(port);
		}
	}
	
	function startX11vnc(x11vncPort) {
		
		if(!x11vncPort) throw new Error("x11vncPort=" + x11vncPort);
		
		// ### x11vnc    
		
		if(x11vncPort instanceof Error) {
			stopVncChannel(displayId);
			return callback(x11vncPort);
		}
		
		
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

function getTcpPort(preferPort, cb) {
	// There are only 65,535 ports ...
	// Don't record ports in use, that way we don't have to implement a "free port" api. Just test ports until we find a free one!
	
	if(typeof preferPort == "function") {
		cb = preferPort;
		preferPort = undefined;
	}
	else if(typeof preferPort != "number" && preferPort != undefined) {
		preferPort = parseInt(preferPort);
		if(isNaN(preferPort)) throw new Error("First argument preferPort=" + preferPort + " needs to be a numeric value, or undefined");
	}
	
	var port = preferPort || 1024;
	
	isPortTaken(port, portTakenMaybe);
	
	function portTakenMaybe(err, taken) {
		if(err) return cb(err);
		
		if(taken) {
			console.log("Port " + port + " is already in use!");
			port++;
			if(port >= 65535) return cb(new Error("Server has used up all TCP ports!"));
			isPortTaken(port, portTakenMaybe);
		}
		else {
			console.log("Port " + port + " seems to be free!");
			cb(null, port);
		}
	}
	
	function isPortTaken(port, fn) {
		console.log("Checking if port " + port + " is in use ...");
		var net = require('net')
		var tester = net.createServer()
		.once('error', function (err) {
			if (err.code != 'EADDRINUSE') return fn(err)
			fn(null, true)
		})
		.once('listening', function() {
			tester.once('close', function() { fn(null, false) })
			.close()
		})
		.listen(port)
	}
}


function getGroupId(groupName, callback) {
	module_fs.readFile("/etc/group", "utf8", function(err, groupData) {
		
		if(err) return callback(err);
		
		//console.log("groupData=" + groupData);
		
		var groups = groupData.split(/\r|\n/);
		
		// format: groupname:x:115:
		
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
	
	exec("umount " + path + " --force --lazy", EXEC_OPTIONS, function(error, stdout, stderr) {
		
		console.log("umount: path=" + path + " error=" + error + " stdout=" + stdout + " stderr=" + stderr);
		
		if(error) {
			if(error.message.indexOf("umount: " + path + ": not mounted") != -1) {
				log("not mounted: path=" + path, WARN);
			}
			else if(error.message.indexOf("umount: " + path + ": mountpoint not found") != -1) {
				log("mountpoint not found: path=" + path, WARN);
			}
			else if(error.message.indexOf("umount: " + path + ": No such file or directory") != -1) {
				log("No such file or directory: path=" + path, WARN);
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
			log("Unable to send e-mail (" + subject + "): " + err.message, WARN);
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
	
	exec(command, EXEC_OPTIONS, function fusermount(error, stdout, stderr) {
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
		cwd: module_path.join(__dirname, "../"), // Run in webide folder where removeuser.js is located
		shell: EXEC_OPTIONS.shell
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

function reportError(errorOrMessage) {
	// A more soft error to prevent the server from restarting
	console.error(errorOrMessage);
	if(errorOrMessage instanceof Error) {
		var msg = errorOrMessage.message;
	}
	else {
		var msg = errorOrMessage;
	}
	
	sendMail("webide@" + HOSTNAME, ADMIN_EMAIL, "Server error: " + msg.split("\n")[0].slice(0, 100), msg); // from, to, subject, text
}

function startDropboxDaemon(username, uid, gid, homeDir, callback) {
	
	if(DROPBOX.hasOwnProperty(username)) {
		var error = new Error("Dropbox daemon already serving " + username)
		error.code = "ALREADY_RUNNING";
		callback(error);
		callback = null;
		return;
	}
	
	if(!module_ps) return callback(new Error("Module ps not loaded."));
	
	var reBrowserUrl = /Please visit (.*) to link this device/;
	var reLinked = /This computer is now linked to Dropbox/;
	var reLastLibLoaded = /linuxffi.gnu\.compiled/;
	var reProgramPath = /setting program path '([^']*)'/;
	var reRunning = /dropbox: running dropbox/;
	
	var programPath = "";
	
	var didStartSanityCheck = false;
	
	var options = {
		uid: uid,
		gid, gid,
		cwd: homeDir
	};
	
	
	var dropboxPath = UTIL.joinPaths(homeDir, "Dropbox/");
	
	options.env = {
		username: username,
		HOME: homeDir,
		USER: username,
		LOGNAME: username,
		USER_NAME: username,
		dropbox_path: dropboxPath,
		TMPDIR: UTIL.joinPaths(homeDir, "tmp/")
	}
	
	var args = [];
	
	
	var daemon = module_path.join(__dirname, "./../dropbox/dropboxd");
	
	// First check if the Dropbox folder exist
	// If it doesn't exist it means it's the first time the user connects to Dropbox, and it will take some time for the data to sync
	var firstTime = true;
	module_fs.stat(dropboxPath, function(err, stats) {
		if(err && err.code == "ENOENT") {
			log(username + " " + dropboxPath + " path missing! Creating it...", DEBUG);
			module_fs.mkdir(dropboxPath, function(err) {
				if(err) {
					var error = new Error("Failed to create Dropbox folder " + dropboxPath + " Error: " + err.message + " code=" + err.code);
					error.code = err.code;
					
					console.error(error);
					
					callback(error);
					callback = null;
					return;
				}
				else {
					log(username + " Dropbox folder created successfully! Now changing the owner of " + dropboxPath + " to " + username + " ...", DEBUG);
					module_fs.chown(dropboxPath, uid, gid, function(err) {
						if(err) {
							var error = new Error("Failed to change ownership of Dropbox folder " + dropboxPath + "  to " + username + " Error: " + err.message + " code=" + err.code);
							error.code = err.code;
							
							console.error(error);
							
							callback(error);
							callback = null;
							return;
						}
						else {
							log(username + " Successfully changed owner of " + dropboxPath + " to " + username + "", DEBUG);
							init();
						}
})
					return;
				}
			});
			
			return;
		}
		else if(err) {
			log(username + " Failed to stat " + dropboxPath, NOTICE);
			console.error(err);
			log("err.code=" + err.code, DEBUG);
			callback(err);
			callback = null;
			
			return;
		}
		else {
			
			log(username + " Dropbox folder already exist: " + dropboxPath, DEBUG);
			
			firstTime = false;
			
			init();
		}
		
	});
	
	function init() {
		
		if(didStartSanityCheck) throw new Error("init have already been called!");
		didStartSanityCheck = true;
		
		log("Starting Dropbox daemon for username=" + username + " daemon=" + daemon);
		
		var dropboxDaemon = module_child_process.spawn(daemon, args, options);
		
		DROPBOX[username] = dropboxDaemon;
		
		setTimeout(function loadTimout() {
			if(callback) {
				var error = new Error("Dropbox failed to load in a timely manner, please contact WebIDE support!");
			callback(error);
			callback = null;
		}
	}, 6000);
	
	dropboxDaemon.on("close", function (code, signal) {
		log(username + " Dropbox deamon close: code=" + code + " signal=" + signal, NOTICE);
		
		delete DROPBOX[username];
		
		if(callback) {
			callback( new Error("Dropbox daemon closed with code=" + code + " and signal=" + signal) );
			callback = null;
		}
		
	});
	
	dropboxDaemon.on("disconnect", function () {
		log(username + " Dropbox daemon disconnect: dropboxDaemon.connected=" + dropboxDaemon.connected, DEBUG);
	});
	
	dropboxDaemon.on("error", function (err) {
		log(username + " Dropbox daemon error: err.message=" + err.message, ERROR);
		console.error(err);
		if(callback) {
			callback(err);
			callback = null;
		}
	});
	
	dropboxDaemon.stdout.on("data", function(data) {
		log(username + "  Dropbox daemon stdout: " + data, INFO);
		
		var str = data.toString();
		
		
		if(str.match(reLinked)) {
			sendToClient(username, "dropbox", {linked: true});
				DROPBOX[username].linked = true;
		}
		
		
		var matchBrowserUrl = str.match(reBrowserUrl);
		
		if(matchBrowserUrl) {
				DROPBOX[username].linked = false;
			log("" + username + " Dropbox daemon needs authorization from Dropbox ...", DEBUG);
			var authUrl = matchBrowserUrl[1];
				if(callback) {
			callback(null, {url: authUrl});
			callback = null;
				}
				else {
					sendToClient(username, "dropbox", {url: authUrl});
				}
			}
		});
		
		dropboxDaemon.stderr.on("data", function (data) {
			log(username + "  Dropbox daemon stderr: " + data, DEBUG);
			
			var str = data.toString();
			
			if(str.match(reLastLibLoaded)) {
				/*
				The last library has loaded and Dropbox is soon fully started...
				If we are not authorized we will get a browser url to stdout
				-- And once authorized we will get a "This computer is now linked" message to stdout
				But if we do not need to authorize we will get nothing!
				
				So wait for a auth request, and if we do not get any, assume everything is OK
			*/
			setTimeout(function waitForBrowserUrl() {
				if(callback) {
					callback(null, {timeout: true});
					callback = null;
				}
				}, (firstTime ? 6000 : 200));
		}
			else if(str.match(reProgramPath)) {
				
				if(programPath) {
					var oldPath = programPath;
				}
				
				var match = str.match(reProgramPath);
				programPath = match[1];
				
				log(username + " Found dropbox program path: " + programPath + " oldPath=" + oldPath, DEBUG);
				
				if(oldPath && oldPath != programPath) log(username + " Found another Dropbox path! programPath=" + programPath + " oldPath=" + oldPath, WARN);
				
			}
else if(str.match(reRunning)) {
				
				log(username + " detected Dropbox running!", DEBUG);
				
				setTimeout(whenDropboxIsReallyRunning, 5000);
				
			}
			
	});
	}
	
	function whenDropboxIsReallyRunning() {
		
		if(!programPath) {
			log(username + " Dropbox program path not yet found!", WARN);
			return;
		}
		
		log(username + " Dropbox running with programPath=" + programPath, DEBUG);
		
		module_ps.lookup({
			command: programPath,
			psargs: "aux" // a=Include those not started by us, x=dont need to have a tty   u=include user  l=long format (l doesnt seem to work together with u)
		}, function(err, resultList ) {
			if (err) {
				throw new Error( err );
			}
			
			var found = false;
			
			resultList.forEach(function( p ){
				if( p ) {
					
					log(username + " Found Dropbox daemon process: " + JSON.stringify(p) + "");
					
					found = true;
					
					if(programPath.indexOf(homeDir) == 0) {

						if(!DROPBOX.hasOwnProperty(username)) {
							log(username + " It seems the Dropbox daemon we started have closed!", DEBUG);
							// note: Dropbox sometimes closed the process we spawned, and sometimes keep it open...
							// Have a kill method even though the original process have closed, 
// because we still want to be able to kill the Dropbox daemon!
							DROPBOX[username] = {};
						}
						else {
							// note: The process that we started might still be running
							var oldKill = DROPBOX[username].kill;
						}
						
						log(username + " Overwriting Dropbox kill method!", NOTICE);
						
						DROPBOX[username].kill = function killDropboxDaemon() {
							
							if(oldKill) {
								try {
									oldKill.call(DROPBOX[username]);
								}
								catch(err) {
									console.error(err);
									log(username + " Failed to kill the process we started but Dropbox decided not to use.", WARN);
								}
							}
							
							module_ps.kill( p.pid, function( err ) {
								if (err) {
									console.error(err);
									log("Failed to kill Dropbox daemon for username=" + username + " p.pid=" + p.pid, WARN);
								}
								else {
									log("Killed Dropbox daemon for username=" + username + " pid=" + p.pid);
								}
							});
						};
						
					}
				}
				else throw new Error("Expected p");
			});
			
			if(!found) {
				log(username + " Did not find Dropbox process us ps !!", WARN);
			}
			
		});
	}
}

function checkDropboxDaemon(username, callback) {
	if(DROPBOX.hasOwnProperty(username)) {
		// Likely alive
		callback(null, {alive: true, dead: false});
	}
	else {
		
		checkForOtherDropboxDaemons(username, function(err, otherDaemons) {
			if(err) throw err;
			
			if(otherDaemons.length > 0) {
				// Migth be alive
				callback(null, {alive: true, dead: true});
				
			}
			else {
				// Definitely dead
				callback(null, {alive: false, dead: true});
			}
			
		});
		
	}
}

function stopDropboxDaemon(username, callback) {
	
	if(!DROPBOX.hasOwnProperty(username)) {
		var error = new Error("No Dropbox deamon registered for " + username);
		error.code = "DEAD";
		if(callback) {
		callback(error);
		callback = null;
		}
		else console.error(error);
		return;
	}
	
	var dropboxDaemon = DROPBOX[username];
	
	if(dropboxDaemon) {
		log(username + " Killing Dropbox daemon", DEBUG);
		try {
			dropboxDaemon.kill();
		}
		catch(err) {
			console.error(err);
			log(username + " Failed to kill Dropbox daemon", WARN);
			if(callback) {
			callback(err);
			callback = null;
			}
			else console.error(err);
			
			return;
		}
		
		delete DROPBOX[username];
		
		checkToMakeSure(true);
	}
	else checkToMakeSure(false);
	
	function checkToMakeSure(killed) {
		/*
			Check to make sure ALL Dropbox daemons are stopped.
			note: If a daemon is still running while deleting the Dropbox folder, all files will be deleted!
		*/
		
		checkForOtherDropboxDaemons(username, function(err, otherDaemons) {
			if(err) throw err;

			if(otherDaemons.length > 0) {
				
				if(killed) {
					var errMsg = "We killed one deamon, but there appears to be more...";
				}
				else {
					var errMsg = "There appears to be more Dropbox deamons that we did not know about...";
				}
				var error = new Error(errMsg);
				
				if(callback) {
					callback(error);
					callback = null;
				}
				else {
					console.error(error);
				}
				
				return;
				
			}
			else {
				if(callback) {
					callback(null);
					callback = null;
				}
				else {
					if(killed) {
						log("Successfully killed the Dropbox deamon for username=" + username);
					}
					else {
						log("Found no Dropbox deamon for username=" + username);
					}
				}
			}
			
		});
		
	}
}

function checkForOtherDropboxDaemons(username, callback) {
	
	var daemons = [];
	
	module_ps.lookup({
		command: ".*dropbox.*",
		psargs: "aux" // a=Include those not started by us, x=dont need to have a tty   u=include user  l=long format (l doesnt seem to work together with u)
	}, function(err, resultList ) {
		if (err) {
			return callback(err);
		}
		
		resultList.forEach(function( p ){
			if( p ) {
				
				log(username + " Found Dropbox daemon process: " + JSON.stringify(p) + "");
				
				daemons.push(p);
			}
			
		});
		
		callback(null, daemons);
		
	});
	
}



function sendToClient(userConnectionName, cmd, obj) {
	if(USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
		
		//var json = {id: 0};
		var json = {};
		json[cmd] = obj;
		
		var str = JSON.stringify(json);
		
		for (var i=0, conn; i<USER_CONNECTIONS[userConnectionName].connections.length; i++) {
			if(LOGLEVEL >= DEBUG) log(getIp(USER_CONNECTIONS[userConnectionName].connections[i]) + " <= " + UTIL.shortString(str, 256));
			USER_CONNECTIONS[userConnectionName].connections[i].write(str);
		}
		return i>0;
	}
	else return false;
}

function vpnCommand(username, homeDir, options, callback) {
/*


todo:  Check for netns /etc/netns/username/ first and send back an NONETNS error if it doesn't exist
*/
	var commands = ["start", "stop", "status"];
	if(commands.indexOf(options.command) == -1) return callback( new Error("options.command=" + options.command + " not a valid VPN command! (" + JSON.stringify(commands) + ")") );
	
	log("vpnAction: username=" + username + " homeDir=" + homeDir + " options=" + JSON.stringify(options), DEBUG);
	
	if(options===true) options = {};
	
	if(typeof options != "object") throw new Error("options=" + options + " (" + (typeof options) + ")");
	
	var supportedTypes = ["wireguard"];
	
	if(options.type == undefined) options.type = supportedTypes[0];
	else if(supportedTypes.indexOf(options.type) == -1) return callback(new Error(options.type + " not in supportedTypes=" + JSON.stringify(supportedTypes)));
	
	var exec = module_child_process.exec;
	var execOptions = {
		shell: EXEC_OPTIONS.shell
	}
	if(options.type == "wireguard") {
		if(options.conf == undefined) return callback(new Error("wireguard requires a conf options with the path to a wg-quick config file!"));
		
		var filePath = UTIL.joinPaths(homeDir, options.conf);
		if(filePath.indexOf(homeDir) != 0 || !module_path.isAbsolute(filePath)) return callback(new Error("options.conf=" + options.conf + " needs to be an absolute path in your home directory!"));
		
		if(options.command == "start") {
			var shellCmd = "ip netns exec " + username + " wg-quick up " + filePath;
		}
		else if(options.command == "stop") {
			var shellCmd = "ip netns exec " + username + " wg-quick down " + filePath;
		}
		else if(options.command == "status") {
			var shellCmd = "ip netns exec " + username + " wg";
		}
		
		log("vpn: " + username + " options.command=" + options.command + " shellCmd=" + shellCmd + " ...");
		exec(shellCmd, execOptions, function wgQuick(error, stdout, stderr) {
			
			log(username + " shellCmd=" + shellCmd + " error=" + (error && error.message) + " stderr=" + stderr + " stdout=" + stdout, DEBUG);
			
			var output = (stderr + "\n" + stdout).trim();
			
			if(error) return callback(error);
			
			
			if(options.command == "start") {
				if(output.indexOf("wg setconf") == -1) return callback(new Error("Unexpected output: " + output));
				
					VPN[username] = {type: options.type, conf: options.conf, homeDir: homeDir};
				}
				else if(options.command == "stop") {
					delete VPN[username];
				}
				else if(options.command == "status") {
					if(stdout.length == 0) var status = "disconnected";
					else if(stdout.indexOf("interface") != -1) {
					var reEndpoint = /endpoint: (.*)/;
					var matchEndpoint = stdout.match(reEndpoint);
					var status = "connected"
					if(matchEndpoint) {
status = status + " to " + matchEndpoint[1];
					}
				}
				else throw new Error("Unexpected output: stdout=" + stdout);
			}
			
			callback(error, status);
			
		});
	}
	else {
		throw new Error("options.type=" + options.type);
	}
	
	
}


function dockerDaemon(username, homeDir, uid, options, callback) {
	"use strict";
	
	if(options == undefined) return error(new Error("No options specified for the docker daemon! options=" + options));
	
	
	log("##############################################################");
	log("    " + username + "      DOCKER         uid=" + uid + "      ");
	log("##############################################################");
	
	var libvirtAddedToGroup = false;
	var abort = false;
	var dockerSshPubKey;
	//var staticIP = UTIL.int2ip(167772162 + uid + 32000); // Max 31k users per server ought to be enough
	//var gateway = UTIL.int2ip(167772162 + uid); // no idea what I'm doing...
	// When the user activates a VPN we also want the Docker VM to use the VPN!
	
	sendToClient(username, "progress", [0,0]);
	sendToClient(username, "progress", [0,20]);
	
	checkLibVirtUser();
	
	function checkLibVirtUser() {
	// ### Make sure the libvirt-qemu user is a member of the user group (to be able to mount the user home dir in the docker VM)
		log(username + " checking if a libvirt-qemu user exist...", DEBUG);
		module_child_process.exec("grep -q libvirt-qemu: /etc/passwd", EXEC_OPTIONS, function(err, stdout, stderr) {
		if(err) return error("libvirt not installed on this server");
		
			progress();
			
			log(username + " checking if a libvirt-qemu user is part of " + username + " group...", DEBUG);
		module_child_process.exec("grep -q " + username + ":.*libvirt-qemu /etc/group", EXEC_OPTIONS, function(err, stdout, stderr) {
				
				if(err) {
					progress();
					log(username + " adding libvirt-qemu to " + username + " group...", INFO);
				module_child_process.exec("usermod -a -G " + username + " libvirt-qemu", EXEC_OPTIONS, function(err, stdout, stderr) {
						if(err) return error(err);
						progress();
						checkZvol();
				});
			}
			else {
					progress(2);
				log("libvirt-qemu already member of group " + username + "", DEBUG);
					checkZvol();
			}
		});
	});
	}
	
	function checkZvol() {
		log(username + " checking if a zvol exist...", DEBUG);
		module_child_process.exec("zfs list", EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			// Is there a zvol we can copy from?
			var reDocker = /\s*(.*)\/docker/;
			var matchDocker = stdout.match(reDocker);
			if(!matchDocker) {
				log("zfs list: stdout=" + stdout + " stderr=" + stderr + " reDocker=" + reDocker, DEBUG);
				return error("Found no zvol to copy from!");
			}
			
			var zpool = matchDocker[1];
			
			if(zpool.indexOf(" ") != -1) throw new Error("zpool=" + zpool + " contains a space!");
			
			// Does user have a docker zvol?
			var reZvol = new RegExp("\s*(.*)\\/docker_" + username);
			var matchZvol = stdout.match(reZvol);
			if(!matchZvol) {
				log(username + " do not have a Docker VM zvol", DEBUG);
				
				if(options.command == "status" || options.command=="stop") return done({stopped: true});
				
				progress(0,2);
				createZvol(zpool);
			}
			else {
				var zpool = matchDocker[1];
				log(username + " has a Docker VM zvol!", DEBUG);
				checkVM(zpool);
			}
		});
	}
	
	function checkVM(zpool) {
		if(zpool == undefined) throw new Error("zpool=" + zpool);
		
		// Check if a VM is configured
		log(username + " checking VM status...", DEBUG);
		module_child_process.exec("virsh list --all", EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			var reVM = new RegExp("docker_" + username + "\\s+(.*)");
			var matchVM = stdout.match(reVM);
			if(!matchVM) {
				// User has no VM configured
				
				if(options.command == "status" || options.command=="stop") return done({stopped: true});
				
				setupVM(zpool);
			}
			else {
				progress(12); // Don't have to setup and start the VM
				
				var vmStatus = matchVM[1];
				
				if(vmStatus == "running") {
					
					if(options.command == "start" || options.command == "status") {
						// We want to know the IP!
						checkIP();
					}
					else if(options.command == "stop") {
						stopVM();
					}
					else throw new Error("Unknown options.command=" + options.command);
				}
				else if(vmStatus == "shut off") {
					
					if(options.command == "start") {
						startVM();
					}
					else if(options.command == "status" || options.command=="stop") {
						return done({stopped: true});
					}
					else throw new Error("Unknown options.command=" + options.command);
				}
				else throw new Error("Unknown vmStatus=" + vmStatus);
			}
		});
	}
	
	function checkSSHKey() {
	// Do the root account has a dockervm ssh key?!?
	module_fs.readFile("/root/.ssh/dockervm.pub", "utf8", function(err, pubkey) {
		if(err && err.code == "ENOENT") return error("Please tell the Admin to create a base docker VM and a ssh key!");
		// sudo ssh-keygen -f /root/.ssh/dockervm
		else if(err) return error(err);
		
		dockerSshPubKey = pubkey;
	});
	}
	
	function ping(ipToPing, pingFail) {
		// Make sure the IP is reachable
		// Retry some times as it takes time for the server to boot!
		
		var maxTry = 10;
		
		if(!ipToPing) throw new Error("ipToPing=" + ipToPing + " IP=" + IP);
		
		if(pingFail == undefined) pingFail = 0;
		
		log(username + " pinging " + ipToPing + " is reachable...", DEBUG);
		module_child_process.exec("ping " + ipToPing + " -w1", function(err, stdout, stderr) {
			log("ping " + ipToPing + ": err=" + (!!err) + " stdout=" + stdout + " stderr=" + stderr + "", DEBUG);
			
			progress();
			
			if(err) {
				log("Do something when ping fails...");
				
				if(++pingFail > maxTry) return error("Failed to ping the Docker deamon VM! pingFail=" + pingFail + " ipToPing=" + ipToPing);
				
				ping(ipToPing, pingFail);
			}
			else {
				log("Do something when ping is successful...");
				
				configure(ipToPing);
				
			}
		});
	}
	
	function startVM() {
		// Start the VM
		var name = "docker_" + username;
		log(username + " starting " + name + " VM ...", DEBUG);
		module_child_process.exec("virsh start " + name, EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			log("Docker VM starting for " + username + " ...");
			
			checkIP();
		});
	}
	
	function stopVM() {
		var name = "docker_" + username;
		log(username + " stopping " + name + " VM ...", DEBUG);
		module_child_process.exec("virsh stop " + name, EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			log(username + " Docker VM is shutting down...");
			
			if(options.command == "stop") {
				return done({stopped: true});
			}
			else throw new Error("Unexpected options.command=" + options.command);
			
		});
	}
	
	function configure(IP) {
		/*
			Things to do when booted: (see check_config_in_vm.sh)
			* Create the mount to user home dir
			* Set a static IP
			
			(.ssh/authorized_keys should already be set in the base image!)
			
		*/
		
		if(IP == undefined) throw new Error("IP=" + IP);
		
		log(username + " running config script via SSH... IP=" + IP, DEBUG);
		module_child_process.exec("echo dockerpw | ssh -tt -i /root/.ssh/dockervm docker@" + IP + " sudo bash check_config_in_vm.sh " + username + "" , EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) {
				
				// We might have been successful anyway!
				//if(stdout.indexOf("userhome already mounted") != -1) return success();
				
				
				log("stdout=" + stdout);
				log("stderr=" + stderr);
				
				console.error(err);
				
				// Don't want to tell users about our week password :P So use a custom error
				return error("Unable to configure Docker daemon VM settings!");
			}
			
			function success() {
				progress();
				
				if(options.command == "start" || options.command == "status") {
					return done({started: true, IP: IP});
				}
				else if(options.command == "stop") {
					throw new Error("Should not configure when shutting down!");
				}
				else throw new Error("Unknown options.command=" + options.command);
			}
		});
	}
	
	function checkIP() {
		log(username + " checking domifaddr...", DEBUG);
		module_child_process.exec("virsh domifaddr docker_" + username, function(err, stdout, stderr) {
			// vnet0      52:54:00:12:be:53    ipv4         192.168.122.96/24
			if(err) return error(err);
			
			progress();
			
			var reIP = /ipv4\s+(.*)\//;
			var matchIP = stdout.match(reIP);
			if(!matchIP) {
				log("domifaddr: stdout=" + stdout + " stderr=" + stderr + " reIP=" + reIP + " username=" + username, DEBUG);
				return error("Unable to find Docker daemon VM IP!");
			}
			
			var IP = matchIP[1];
			
			ping(IP);
		});
	}
	
	function createZvol(zpool) {
		if(zpool == undefined) throw new Error("zpool=" + zpool);
		
		// Do we have a snapshot!?
		log(username + " listing zfs snapshots...", DEBUG);
		module_child_process.exec("zfs list -t snapshot", EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			var reSnapShot = new RegExp(zpool + "\\/docker@([^ ]*)");
			var matchSnapshot = stdout.match(reSnapShot);
			if(!matchSnapshot) {
				return error("Please tell the Admin to create a snap-shot of the Docker VM zvol!");
				// First shut down the base Docker VM!
				// sudo zfs list
				// sudo zfs snapshot pool/docker@somelabel
			}
			var snapshotName = matchSnapshot[1];
			
			if(snapshotName.indexOf(" ") != -1) throw new Error("snapshotName=" + snapshotName + " contains a space! reSnapShot=" + reSnapShot + " matchSnapshot=" + JSON.stringify(matchSnapshot));
			
			// Clone the snapshot
			var fullSnapshotName = zpool + "/docker@" + snapshotName;
			var cloneInto = zpool + "/docker_" + username;
			log(username + " cloning " + fullSnapshotName + " into " + cloneInto + " ...", DEBUG);
			module_child_process.exec("zfs clone -p " + fullSnapshotName + " " + cloneInto, EXEC_OPTIONS, function(err, stdout, stderr) {
				if(err) return error(err);
				else {
					progress();
					log("Docker VM zvol created for " + username);
					checkVM(zpool);
				}
			});
		});
	}
	
	function setupVM(zpool) {
		if(zpool == undefined) throw new Error("zpool=" + zpool);
		// Assuming we already have a zvol!
		
		module_fs.readFile("../dockervm/docker_user.xml", "utf8", function(err, xml) {
			if(err) return error(err);
			
			progress();
			
			xml = xml.replace(/<source dir='.*'\/>/, "<source dir='" + homeDir + "'/>");
			
			xml = xml.replace(/<source dev='.*'\/>/, "<source dev='/dev/zvol/" + zpool + "/docker_" + username + "'/>");
			
			xml = xml.replace(/<name>.*<\/name>/, "<name>docker_" + username + "</name>");
			
			var vmXmlPath = module_path.normalize(__dirname + "/../dockervm/docker_" + username + ".xml");
			log(username + " creating " + vmXmlPath + " ...", DEBUG);
			module_fs.writeFile(vmXmlPath, xml, function(err) {
				if(err) return error(err);
				
				progress();
				
				log(username + " defining " + vmXmlPath + " ...", DEBUG);
				module_child_process.exec("virsh define " + vmXmlPath, EXEC_OPTIONS, function(err, stdout, stderr) {
					if(err) return error(err);
					
					progress();
					
					log(stdout, INFO);
					log(stderr, WARN);
					
					startVM(true);
					
				});
			});
		});
		
	}
	
	function progress(inc, max) {
		if(abort) return;
		if(inc == undefined) inc = 1;
		
		if(max) var obj = [inc, max];
		else var obj = [inc];
		
		sendToClient(username, "progress", obj);
	}
	
	function done(resp) {
		if(abort) return;
		//if(options.command == "status") return;
		
		sendToClient(username, "progress", []);
		
		callback(null, resp);
		callback = null;
	}
	
	function error(errorOrErrMsg, code) {
		if(abort) return;
		
		if(typeof errorOrErrMsg=="string") {
			var err = new Error(errorOrErrMsg);
			if(code) err.code = code;
		}
		else var err = errorOrErrMsg;
		
		callback(err);
		callback = null;
		
		abort = true;
		
		sendToClient(username, "progress", []);
	}


}

main();

