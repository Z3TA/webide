#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

/*

	note: If you just copy over server.js it will send {"editorVersion": 0} because EDITOR_VERSION is not populated... and clients wont auto-update!
	EDITOR_VERSION is populated when running ./dev-scripts/upgrade.sh or ./dev-scripts/release.sh


Test cloudIDE server locally:
sudo node server/server.js --hostname=webide-dev.se -pp 80

*/

//console.log("server.js process.argv=" + JSON.stringify(process.argv));

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

// Declare modules here as a OPTIMIZATION
var module_fs = require("fs");
var module_chownr = require("chownr");
var module_child_process = require('child_process');
var module_path = require("path");
var module_letsencrypt = require("../shared/letsencrypt.js");
var module_os = require("os");
var module_sockJs = require("sockjs");
var module_http = require("http");
var module_https = require("https");
var module_tls = require("tls");
var module_dns = require("dns");
var module_dgram = require("dgram");
var module_pwHash = require("./pwHash.js");
var module_mimeMap = require("./mimeMap.js");

var module_mount = require("../shared/mount.js");
var module_string_decoder = require('string_decoder');
var module_net = require("net");

var module_fs_extra = require("fs-extra");

var module_readlineSync = require('readline-sync');

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
	var module_psList = require("ps-list");
}
catch(err) {
	log("Unable to load optional module(s): " + err.message);
}

var nodeVersion = parseInt(process.version.match(/v(\d*)\./)[1]);
var testedNodeVersions = [0,4,6,8,10];
if(testedNodeVersions.indexOf(nodeVersion) == -1) log("warn: The editor has only been tested with node.js versions " + JSON.stringify(testedNodeVersions) + " ! You are running version=" + process.version, WARN);

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

var SKIP_NGINX = getArg(["nonginx", "nonginx", "noNginx", "skipnginx", "skipNginx"]);

var IPTABLES = !getArg(["noiptables", "noiptables"]); // on my default, use -noiptables to disable

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

global.home = HOME_DIR;

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

var NO_NETNS = !!(getArg(["nonetns", "nonetns"]) || false);

var VIRTUAL_ROOT = !!(getArg(["virtualroot", "virtualroot"]) || false); // Translate all paths like if the home dir was the root folder

var PIPE_COUNTER = 0; // Remove file sockets

var VNC_CHANNEL = {}; // displayId: {proxy: http-proxy, name: username}

var INVITATIONS = {}; // Users can invite other users, which allows them to login as the same user, without sharing the pw (a new temporary pw is generated)

var PROXY = {}; // id: {proxy: http-proxy, startedBy: username}

var EXEC_OPTIONS = {};

if (require("fs").existsSync("/bin/dash")) {
	EXEC_OPTIONS.shell = "/bin/dash";
}
else if(require("fs").existsSync("/bin/bash")) {
	EXEC_OPTIONS.shell = "/bin/bash";
}
else if(require("fs").existsSync("C:\\WINDOWS\\system32\\cmd.exe")) {
	EXEC_OPTIONS.shell = "C:\\WINDOWS\\system32\\cmd.exe";
}
else {
	(function() {
		var module_path = require("path");
		var module_fs = require("fs");
		var path = process.env.PATH ? process.env.PATH.split(module_path.delimiter) : [];
		for (var i=0; i<path.length; i++) {
			var filePath = {
				dash: module_path.join(path[i], "dash"), // Mac or Linux
				bash: module_path.join(path[i], "bash"), // Linux
				cmd: module_path.join(path[i], "cmd.exe")  // Windows
			}
			//console.log("Checking ", filePath);
			if(module_fs.existsSync(filePath.dash)) {
				EXEC_OPTIONS.shell = filePath.dash;
				break;
			}
			else if(module_fs.existsSync(filePath.bash)) {
				EXEC_OPTIONS.shell = filePath.bash;
				break;
			}
			else if(module_fs.existsSync(filePath.cmd)) {
				EXEC_OPTIONS.shell = filePath.cmd;
				break;
			}
		}

		if(!EXEC_OPTIONS.shell) throw new Error("Unable to determine what shell to run! Can't find dash nor bash in " + path);

	})();
}

log("EXEC_OPTIONS=" + JSON.stringify(EXEC_OPTIONS), DEBUG);



var VPN = {}; // username: {type, conf} (Keep track of VPN tunnels so we can stop a connection if the user disconnects)

var LAST_USERADD = ""; // For debugging

var USER_WORKERS = {}; // username: worker process
var MESSAGE_BUFFER = {}; // username: [messages] - Save messages if no client is connected
var MAX_MESSAGE_BUFFER = 1000;

var USER_CLEANUP_TIMEOUT = [];

(function() {
	// Make sure we are in the server directory
	var workingDirectory = process.cwd();
	var serverDirectory = __dirname;
	log('Working directory: ' + workingDirectory, DEBUG);
	
	if(workingDirectory != serverDirectory) {
		try {
			process.chdir(serverDirectory);
			log('Changed working directory to ' + process.cwd(), DEBUG);
		}
		catch (err) {
			log('Unable to change working directory! chdir: ' + err, WARN);
		}
	}
	
})();

var CURRENT_USER = "ROOT";

var USERNAME = getArg(["user", "user", "username"]);
var PASSWORD = getArg(["pw", "pw", "password"]);

if(process.argv.indexOf("-askforpw") != -1) {
	(function() {
		log("You will login to the editor using USERNAME=" + USERNAME);
		PASSWORD = module_readlineSync.question('Please specify a editor password: ', {
			hideEchoBack: true // The typed text on screen is hidden by `*` (default).
		});
	})();
}

if(USERNAME && !PASSWORD) {
	log("Please specify a --password=****** for USERNAME=" + USERNAME + " ", NOTICE);
	process.exit(1);
}


// Use -nouid to allow users without a uid specified
// Windows can not set uid, so don't bother checking if users have uid specified
var NOUID = getArg(["nouid"]) || (process.platform == "win32"); 




var GS = String.fromCharCode(29);
var APC = String.fromCharCode(159);



var USER_CONNECTIONS = {}; // username: {connections: {id: connection}, ...}

var INTERNAL_USERWORKER_REQ = {}; // id: callback : For sending internal requests to the server worker
var INTERNAL_USERWORKER_REQ_ID = 0;

var HTTP_SERVER;

var USE_HTTPS = !!(getArg(["ssl", "https"]) || false); // Only use for local development! Run a HTTPS proxy in production (nginx) because Node.JS is too slow!

// Use -ip "::" or -ip "0.0.0.0" to make it listen on unspecified addresses.
var HTTP_IP = getArg(["ip", "ip"]) || DEFAULT.http_ip;

// On some systems (Mac) you need elevated privilege (sudo) to listen to ports below 1024
var HTTP_PORT = getArg(["port", "port"]) || DEFAULT.editor_http_port; 
//if(!UTIL.isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))

// For generating URL's
var PUBLIC_PORT = getArg(["pp", "public_port"]) || HTTP_PORT; // Server might run on localhost behind a proxy sunch as nginx
var HOSTNAME = getArg(["host", "host", "hostname"]) || HTTP_IP; // Same as "server_name" in nginx profile or "VirtualHost" on other web servers

/*
	What is the difference between HOSTNAME and DOMAIN !?!?
	HOSTNAME is the name of the computer
	DOMAIN is a public domain name
*/

var DOMAIN = getArg(["domain", "domain"]) || HOSTNAME;

//console.log("DOMAIN=" + DOMAIN);
//console.log("HOSTNAME=" + HOSTNAME);

//process.exit();

var CHROMIUM_DEBUG_PORT = 9222;
var VNC_PORT = 5901;

var EOT = String.fromCharCode(4);
var US = String.fromCharCode(31);

// Enable to host a webide server behind nat
var NAT_PORT = getArg(["nat-port", "nat-port"]);
var NAT_HOST = getArg(["nat-host", "nat-host"]); // Hostname to connecto to or IP to listen on if running as a nat-server
var NAT_TYPE = getArg(["nat-type", "nat-type", "nattype", "natType"]); // "client" or "server"
var NAT_CODE = getArg(["nat-code", "nat-code"]); // A password or codename, must be unique, used to connect to a webide server behind NAT
var NAT_BANNED_CODES = []; // If the code is already in use it will be banned and both old user and new user need to change code
var NAT_SERVER_WEBSOCKET = {}; // id: connection (SockJS connections on the NAT server)
var NAT_CLIENT_WEBSOCKET = {}; // id (same as on server) : Fake SockJS connection

var NAT_CLIENTS = {}; // code : socket
var NAT_WEBSOCKET_COUNTER = 0; // Increment for each NAT:ed SockJS connection

//console.log("NAT_TYPE=" + NAT_TYPE);

if(typeof NAT_TYPE == "string" && NAT_TYPE.indexOf("client") != -1 || NAT_CODE) {
	if(!NAT_PORT) NAT_PORT = DEFAULT.nat_port;
	if(!NAT_HOST) NAT_HOST = DEFAULT.nat_host;
}

if(NAT_PORT && !NAT_HOST) {
	log("You specified -nat-port=" + NAT_PORT + " Please specify -nat-host ! If you computer is nehind NAT use --nat-host=webide.se or if you are starting a nat-server specify the public IP!");
	process.exit();
}

if(typeof NAT_TYPE == "string" && NAT_TYPE.indexOf("server") != -1) {
	if(!NAT_PORT) NAT_PORT = DEFAULT.nat_port;
	
	console.log("HOSTNAME=" + HOSTNAME);

	if(HOSTNAME == "127.0.0.1") {
		log("Hostname cannot be " + HOSTNAME + ". This machine need to be reachable from the Internet in order for NAT-server to work! Specify -host domain or --hostname=domain");
		process.exit();
	}
}

var TLS_KEY_PATH = getArg(["tls_key", "tls_key", "tls_key_path"]) || "/etc/ssl/private/" + DOMAIN + ".key";
var TLS_CERT_PATH = getArg(["tls_cert", "tls_cert", "tls_cert_path"]) || "/etc/ssl/certs/letsencrypt/" + DOMAIN + ".crt";


var INSIDE_DOCKER = getArg(["insidedocker", "insidedocker", "insidecontainer"]);

if(INSIDE_DOCKER) {
	NO_NETNS = true;
	IPTABLES = false;
}

var GITHUB_GITCLONE = {}; // IP: path to files
var GITHUB_CLONING = {}; // repo: true

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

var DOCKER_LOCK =  {}; // username: command (prevent running many commands at the same time)

var FAILED_SSL_REG = {}; // List of failed letsencrypt registrations, in order to not hit quota limits

var stdinChannelBuffer = "";
var editorProcessArguments = "";
var STDOUT_SOCKETS = [];

var REMOTE_FILE_SOCKETS = {}; // username:fileName=socket
var NO_REMOTE_FILES = getArg(["no-remote", "no-remote", "no-remote-files"]) || false;

var mysqlConnection;

//console.log("INSIDE_DOCKER ? " + !!INSIDE_DOCKER);
//console.log("NO_NETNS ? " + !!NO_NETNS);
//console.log("IPTABLES ? " + !!IPTABLES);


// # Polyfills in case you are using an older Node.js version
if (!String.prototype.repeat) {
	String.prototype.repeat = function(count) {
		'use strict';
		if (this == null)
			throw new TypeError('can\'t convert ' + this + ' to object');

		var str = '' + this;
		// To convert string to integer.
		count = +count;
		// Check NaN
		if (count != count)
			count = 0;

		if (count < 0)
			throw new RangeError('repeat count must be non-negative');

		if (count == Infinity)
			throw new RangeError('repeat count must be less than infinity');

		count = Math.floor(count);
		if (str.length == 0 || count == 0)
			return '';

		// Ensuring count is a 31-bit integer allows us to heavily optimize the
		// main part. But anyway, most current (August 2014) browsers can't handle
		// strings 1 << 28 chars or longer, so:
		if (str.length * count >= 1 << 28)
			throw new RangeError('repeat count must not overflow maximum string size');

		var maxCount = str.length * count;
		count = Math.floor(Math.log(count) / Math.log(2));
		while (count) {
			str += str;
			count--;
		}
		str += str.substring(0, maxCount - str.length);
		return str;
	}
}

if(!USERNAME || USERNAME == "test") {
	var loginLog = module_fs.createWriteStream( module_path.join(module_os.homedir(), "webide_logins.log"), {flags:'a'} );
}

function connectToNatServer() {

	if(!NAT_CODE) {
		NAT_CODE = randomString(10);
	}

	var StringDecoder = module_string_decoder.StringDecoder;
	var decoder = new StringDecoder('utf8');
	var strBuffer = "";

	log("Connecting to NAT/reverse server NAT_HOST=" + NAT_HOST + " NAT_PORT=" + NAT_PORT + " ...", DEBUG);

	var connection = module_net.createConnection({host: NAT_HOST, port: NAT_PORT});
	connection.on("error", connectionError);
	connection.on("connect", connectionConnected);
	connection.on("close", connectionClosed);
	connection.on("data", connectionData);

	function connectionError(err) {
		log("NAT CLIENT: Connection error: " + (err && (err.message || err) ), WARN);
		if(err.code == "ECONNREFUSED") log("Unable to connect to " + NAT_HOST + ":" + NAT_PORT + " Is the other server started with --nat-port=" + NAT_PORT + " --nat-type=server !?");

	}

	function connectionConnected() {
		log("NAT CLIENT: Connected to remote server!");

		// When connecting we Must always send our nat code
		log("NAT CLIENT: Sending NAT_CODE=" + NAT_CODE);
		connection.write(NAT_CODE + EOT);
	}

	function connectionClosed(hadError) {
		log("NAT CLIENT: Connection closed. hadError=" + hadError);

		setTimeout(connectToNatServer, 5000); // Try Reconnecting
	}

	function connectionData(data) {
		var str = decoder.write(data);
		strBuffer += str;

		log("NAT CLIENT: Recived " + data.length + " bytes: " + UTIL.shortString(str), DEBUG);

		var eotIndex;

		var str;
		while( (eotIndex = strBuffer.indexOf(EOT)) != -1 ) {
			str = strBuffer.slice(0, eotIndex);
			console.log("str=" + str);
			natMessageFromServer(str);
			strBuffer = strBuffer.slice(eotIndex+1);
		}
	}


	function natMessageFromServer(strBuffer) {
		// format: opcode | connection id | payload , or just opcode | payload

		log("natMessageFromServer: strBuffer=" + strBuffer, DEBUG);

		var sepIndex = strBuffer.indexOf(US);
		var opcode = strBuffer.slice(0, sepIndex);
		strBuffer = strBuffer.slice(sepIndex+1);
		sepIndex = strBuffer.indexOf(US);
		var nat_websocket_id = strBuffer.slice(0, sepIndex);
		var message = strBuffer.slice(sepIndex+1) || nat_websocket_id;

		log("NAT CLIENT: Recieved opcode=*" + opcode + "* nat_websocket_id=*" + nat_websocket_id + "* message=*" + message + "*", DEBUG);

		

		if(opcode == "url") {
			log("This backend/server can be reached from public url: http://" + message + "?nat_code=" + NAT_CODE, NOTICE);
			return;
		}

		else if(opcode == "new_connection") {
			try {
				var options = JSON.parse(message);
			}
			catch(err) {
				throw new Error("Unable to parse message JSON from nat server: message=" + message + " err.message=" + err.message);
			}

			var fakeWebsocket = NAT_CLIENT_WEBSOCKET[nat_websocket_id] = new NatFakeWebsocket(connection, nat_websocket_id, options);
			sockJsConnection(fakeWebsocket);

			return;
		}

		else if(opcode == "codebust") {
			// code already in use!
			throw new Error("codebust: nat code already in use");
			return;
		}


		var fakeWebsocket = NAT_CLIENT_WEBSOCKET[nat_websocket_id];
		if(!fakeWebsocket) {
			throw new Error("No fakeWebsocket created for nat_websocket_id=" + nat_websocket_id);
		}

		if(opcode == "error") {
			log(message, WARN);
			if( fakeWebsocket.onError ) fakeWebsocket.onError(new Error(message));
			return;
		}

		if(!fakeWebsocket.onData) throw new Error("fakeWebsocket has no data event listener!");
		fakeWebsocket.onData(message);

	}
}

function NatFakeWebsocket(__connectionToNatServer, __nat_websocket_id, options) {
	var fakeWebsocket = this;

	fakeWebsocket.__connectionToNatServer = __connectionToNatServer;
	fakeWebsocket.__nat_websocket_id = __nat_websocket_id;

	for(var prop in options) {
		fakeWebsocket[prop] = options[prop];
	}


}
NatFakeWebsocket.prototype.write = function(message) {
	var fakeWebsocket = this;

	var str = fakeWebsocket.__nat_websocket_id + US + message + EOT;

	log("NAT CLIENT: Sending: str=" + str, DEBUG)

	fakeWebsocket.__connectionToNatServer.write(str);
}
NatFakeWebsocket.prototype.on = function(evName, evHandler) {
	var fakeWebsocket = this;

	var evPropName = "on" + evName[0].toUpperCase() + evName.slice(1);
	fakeWebsocket[evPropName] = evHandler;
}


function startNatServer() {

	log("NAT SERVER: Starting NAT server...");

	var StringDecoder = module_string_decoder.StringDecoder;
	var decoder = new StringDecoder('utf8');

	var server = module_net.createServer({keepAlive: true});

	server.on("listening", function serverListening() {
		log("NAT SERVER: Listening on port " + NAT_PORT);
	});

	// We recive connections from editor servers behind NAT
	server.on("connection", function connection(socket) {
		
		log("NAT SERVER: Incomming connection from " + socket.remoteAddress);

		//socket.setKeepalive(true, 5000);
		// todo: Implement manual keep-alive

		var code;
		var strBuffer = "";

		socket.on("data", function socketData(data) {

			var str = decoder.write(data);
			strBuffer += str;

			log("NAT SERVER: Recived " + data.length + " bytes: " + UTIL.shortString(str), DEBUG);

			var eotIndex;

			while( (eotIndex = strBuffer.indexOf(EOT)) != -1 ) {
				if(!code) {
					// The very first message is the code
					code = strBuffer.slice(0, eotIndex);
					log("NAT SERVER: Recived code=" + code + " from " + socket.remoteAddress + " ");

					if(NAT_CLIENTS.hasOwnProperty(code)) {
						log("NAT SERVER: code=" + code + " already in use by " + NAT_CLIENTS[code].remoteAddress, WARN);
						
						// note: It might be the same client re-connecting!
						/// if the old session is disconnected we will get an error below:
						NAT_CLIENTS[code].write("codebust" + US + code + EOT);
						NAT_CLIENTS[code].close();

						socket.write("codebust" + US + code + EOT);
						socket.close();
						return;
					}

					NAT_CLIENTS[code] = socket;

					var publicUrl = makeUrl();
					NAT_CLIENTS[code].write("url" + US + publicUrl + EOT);

					strBuffer = strBuffer.slice(eotIndex+1);
					continue;
				}

				natMessageFromClient(code, strBuffer.slice(0, eotIndex));
				strBuffer = strBuffer.slice(eotIndex+1);
			}
		});

		socket.on("end", function socketEnd(endData) {
			log("NAT SERVER: Nat socketEnd: endData.length=" + (endData && endData.length) );
		});

		socket.on("close", function sockClose(hadError) {
			log("NAT SERVER: Nat socket closed. hadError=" + hadError + " code=" + code);
			if(code) delete NAT_CLIENTS[code];
		});

		// Must listen for errors or node -v 8 on Windows will throw on any socket error!
		socket.on("error", function sockError(err) {
			log("NAT SERVER: Nat socket error: " + err.message + " code=" + err.code);

			if(err.message.match(/This socket is closed/)) {
				if(code) delete NAT_CLIENTS[code];
			}

		});

	});

	server.on("error", function stdSocketError(err) {
		log("NAT SERVER: error: " + err.message, WARN);
	});

	server.listen(NAT_PORT, NAT_HOST);
}

function natMessageFromClient(nat_client_secret, strBuffer) {
	// format: sockjs connection id | payload

	var sepIndex = strBuffer.indexOf(US);
	var nat_websocket_id = strBuffer.slice(0, sepIndex);
	var message = strBuffer.slice(sepIndex+1);

	log("NAT SERVER: From nat_client_secret=" + nat_client_secret + " nat_websocket_id=" + nat_websocket_id + " message=" + message, DEBUG);

	if(!NAT_SERVER_WEBSOCKET.hasOwnProperty(nat_websocket_id)) {
		var opcode = "error";
		var message = "No Websocket connection with nat_websocket_id=" + nat_websocket_id;
		
		NAT_CLIENTS[nat_client_secret].write(opcode + US + nat_websocket_id + US + message + EOT);

		return;
	}

	log(getIp(NAT_CLIENTS[nat_client_secret]) + " <= " + UTIL.shortString(message, 256));
	NAT_SERVER_WEBSOCKET[nat_websocket_id].write(message);
}

process.on("SIGINT", function sigInt() {
	log("Received SIGINT");
	
	HTTP_SERVER.close();
	
	for(var displayId in VNC_CHANNEL) stopVncChannel(displayId);
	
	if(mysqlConnection && !mysqlConnection._fatalError) {
		// It seems mysqlConnection.end never calls back if there is a problem ...
		//log("mysqlConnection=" + UTIL.objInfo(mysqlConnection), DEBUG);
		
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

process.on('warning', (warning) => {
	console.log(warning.stack);
});

var mysqlReconnectTimer;
function mysqlConnect() {
	
	log("Connecting to mySQL database ...", DEBUG);
	
	var mysqlConnectionOptions = {port: MYSQL_PORT, database: "mysql", user: "root", authSwitchHandler: true};
	// note: without authSwitchHandler auth_socket will fail! (auth_socket = unix_socket in MariaDB)
	
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
		clearTimeout(mysqlReconnectTimer); // Prevent hot loop
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
			mysqlReconnectTimer = setTimeout(mysqlConnect, 10000);    
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
			db.query("CREATE USER ?@'localhost' IDENTIFIED WITH unix_socket", [username], function(err, rows, fields) {
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
			
			log("readEtcPasswd: Did not find username=" + username + " in /etc/passwd", INFO);
			
			error = new Error("Unable to find username=" + username + " in /etc/passwd ! A server admin need to add the user to the system.");
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
	
	log("Recycling guest accounts ... GUEST_COUNTER=" + GUEST_COUNTER);

	if(GUEST_COUNTER === 0) {
		log("All guest accounts recycled!");
		return callback(null);
	}

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
							module_fs.writeFile(__dirname + "/GUEST_COUNTER", (--GUEST_COUNTER).toString(), function(err) {
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
	var info = module_os.userInfo ? module_os.userInfo() : {username: "ROOT", uid: process.getuid()};
	var env = process.env;
	
	CURRENT_USER = env.SUDO_USER ||	env.LOGNAME || env.USER || env.LNAME ||	env.USERNAME || info.username;
	
	log("Server running as user=" + CURRENT_USER, DEBUG);
	
	if(!USERNAME) mysqlConnect();
	
	if(info.uid < 0) {
		log("Warning: Your system do not support setuid!\nAll users will have the same security privaleges as the current user (" + CURRENT_USER + ") ! ", 4);
	}
	
	log("NAT_TYPE=" + NAT_TYPE + " NAT_HOST=" + NAT_HOST + " NAT_PORT=" + NAT_PORT, DEBUG);
	if(NAT_PORT && NAT_HOST && (!NAT_TYPE || NAT_TYPE.indexOf("server") == -1)) connectToNatServer();
	else log("Not connecting to NAT/reverse server! NAT_PORT=" + NAT_PORT + " NAT_HOST=" + NAT_HOST + " NAT_TYPE=" + NAT_TYPE, DEBUG);

	if(!NO_NETNS && !USERNAME && process.platform=="linux") {
		// Make sure we have a bridge setup for Linux network namespaces
		module_child_process.exec("ip addr | grep -q netnsbridge", EXEC_OPTIONS, function(error, stdout, stderr) {
			if(error) {
				/*
					Use a submask of 16 (255.255.0.0) instead of 24 (255.255.255.0) because
					we will give each user their uid (decimal) as IP
					ip= 167772162 + uid (so that a uid of 0 would get ip=10.0.0.2)
					
					Note: If you get DNS issues in the netns it's probably because the ip in /etc/resolv.conf is unreachable!
					
				*/
				module_child_process.exec("ip link add name netnsbridge type bridge && ip link set netnsbridge up && ip addr add 10.0.0.1/16 brd + dev netnsbridge", EXEC_OPTIONS, function(error, stdout, stderr) {
					if(error) throw error;
					if(stdout) log("netnsbridge: stdout=" + stdout, NOTICE);
					if(stderr) log("netnsbridge: stderr=" + stderr, WARN);
					
				});
			}
		});
		
		// Some other process might reset iptables, so also check if the nat:ing is enabled for user netns
		if(IPTABLES) {
			module_child_process.exec("iptables -S -t nat | grep -qe '-A POSTROUTING -s 10.0.0.0/16 -j MASQUERADE'", EXEC_OPTIONS, function(error, stdout, stderr) {
				if(error) {
					log("nat POSTROUTING does Not exist for user netns. Adding it...", DEBUG);
					module_child_process.exec("iptables -t nat -A POSTROUTING -s 10.0.0.0/16 -j MASQUERADE", EXEC_OPTIONS, function(error, stdout, stderr) {
						if(error) throw error;
						log("nat POSTROUTING added for user netns", INFO);
					});
				}
				else {
					log("nat POSTROUTING exist for user netns", DEBUG);
				}
			});
		}
		else {
			log("IPTABLES=" + IPTABLES);
		}
	}
	else {
		log("NO_NETNS=" + NO_NETNS + " USERNAME=" + USERNAME + " process.platform=" + process.platform, DEBUG);
	}
	
	if(info.uid == 0 && process.platform=="linux" && (!CRAZY && !INSIDE_DOCKER)) {
		// Hide processes from other users
		module_child_process.exec("mount -o remount,rw,hidepid=2 /proc", EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) console.error( err );
			if(stderr) log(stderr, NOTICE);
			if(stdout) log(stdout, INFO);
		});
	}
	
	if(info.uid == 0 && !USERNAME && 1==2) {
		// ## forkstat
		// Detect when users start an app
		
		
		var forkstat = module_child_process.spawn("forkstat", ["-e", "exec", "-x", "-l", "-d", "-s"]);
		
		/*
			
			-x = show user id
			-l = Line buffered mode
			-d = strip off the directory path from the process name
			-s = show short process name information (no script args)
		*/
		
		forkstat.on("close", function (code, signal) {
			log("forkstat close: code=" + code + " signal=" + signal, NOTICE);
		});
		
		forkstat.on("disconnect", function () {
			log("forkstat disconnect: chromiumBrowser.connected=" + chromiumBrowser.connected, DEBUG);
		});
		
		forkstat.on("error", function (err) {
			log("forkstat error: err.message=" + err.message, ERROR);
			console.error(err);
		});
		
		forkstat.stdout.on("data", function(data) {
			//log("forkstat stdout: " + data, DEBUG);
			
			
			// Time     Event   PID    UID TTY    Info   Duration Process
			// 13:22:46 exec  20807   1001 pts/11                 mate-calc
			// 15:48:19 exec  19817                               <unknown>
			
			var re = /exec\s+(\d+)\s+(\d+)?.*\s+([^ ]*)$/;
			var str = data.toString();
			var arr = str.split("\n");
			
			arr.forEach(function(str) {
				
				if(str.indexOf("Time ") == 0) return;
				if(str == "") return;
				
				var match = str.match(re);
				if(!match) throw new Error("forkstat: Unable to match str=" + str + " with re=" + re);
				
				var pid = match[1];
				var uid = parseInt(match[2]);
				
				if(!CRAZY && uid == 0) return;
				
				var p = match[3];
				
				// We only care for GUI apps
				if(p=="sh" || p=="dbus-daemon" || p=="dconf-service" || p=="dbus-launch" || p=="at-spi2-registryd" || p=="at-spi-bus-launcher" ) return;
				
				
				log(str, DEBUG);
				log("pid=" + pid + " uid=" + uid + " p=" + p + " ");
				
				// What display port do our user have ?
				for(var name in USER_CONNECTIONS) {
					//log("uid=" + uid + " (" + typeof uid + ") vs " + USER_CONNECTIONS[name].uid + " (" + typeof USER_CONNECTIONS[name].uid + ") ", DEBUG);
					if(uid == USER_CONNECTIONS[name].uid) {
						// It takes some time for the app to show up in xwininfo!
						setTimeout(function() {
							xwininfo(USER_CONNECTIONS[name].uid, p, name);
						}, 300);
						
						return;
					}
				}
				log("Found no online user with uid=" + uid, DEBUG);
			});
			
		});
		
		forkstat.stderr.on("data", function (data) {
			log("forkstat stderr: " + data, DEBUG);
		});
		
	}
	
	function xwininfo(displayId, processName, username) {
		// check our x11 server
		
		if(VNC_CHANNEL.hasOwnProperty(displayId)) {
			if(VNC_CHANNEL[displayId].info && VNC_CHANNEL[displayId].info.app == processName) {
				log(processName + " already got a VNC channel on displayId=" + displayId + " info=" + JSON.stringify(VNC_CHANNEL[displayId].info), DEBUG);
				sendToClient(username, "vnc", VNC_CHANNEL[displayId].info)
				return;
			}
		}
		
		module_child_process.exec("xwininfo -display :" + displayId + " -root -children", function(error, stdout, stderr) {
			if(error) return console.error(error);
			if(stderr) log("xwininfo: stderr=" + stderr, NOTICE);
			log("xwininfo: (look for " + processName + ") displayId=" + displayId + " stdout=" + stdout, DEBUG);
			/*
				
				xwininfo: Window id: 0x298 (the root window) (has no name)
				
				Root window id: 0x298 (the root window) (has no name)
				Parent window id: 0x0 (none)
				4 children:
				0x200003 "Calculator": ("mate-calc" "Mate-calc")  312x225+0+0  +0+0
				0x200001 "mate-calc": ("mate-calc" "Mate-calc")  10x10+10+10  +10+10
				0x400001 (has no name): ()  10x10+1+1  +1+1
				0x1600003 (has no name): ()  3x3+0+0  +0+0
				
				
			*/
			
			var reWindowId = /window id: (.*) /;
			var matchWindowId = stdout.match(reWindowId);
			if(!matchWindowId) throw new Error("Unable to find reWindowId=" + reWindowId + " in stdout=" + stdout);
			var windowId = matchWindowId[1];
			
			var reWindow = new RegExp('/^\\s*([^ ]*).*"' + processName + '"[^\\d]*(\\d+)x(\\d+)');
			log("reWindow=" + reWindow + "", DEBUG);
			
			var arr = stdout.split("\n");
			var res = [];
			
			arr.forEach(function(str) {
				
				log("str=" + str, DEBUG);
				
				var matchWindow = str.match(reWindow);
				if(!matchWindow) {
					log("Did not find reWindow=" + reWindow + " in str=" + str, DEBUG);
					return;
				}
				
				var id = matchWindow[1]
				var x = parseInt(matchWindow[2]);
				var y = parseInt(matchWindow[3]);
				
				log(" Found match: x=" + x + " y=" + y + " matchWindow=" + JSON.stringify(matchWindow) + "");
				
				if(isNaN(x) || isNaN(x)) {
					log("x=" + x + " or y=" + y + " is NaN! matchWindow=" + JSON.stringify(matchWindow), DEBUG);
					return;
				}
				
				res.push({id: id, x: x, y: y});
				
			});

			log("res=" + JSON.stringify(res), DEBUG);
			
			if(res.length == 0) {
				log("Did not find reWindow=" + reWindow + " ", DEBUG);
				return;
			}
			
			res.sort(function (a, b) {
				if(a.x * a.y > b.x * b.y) return -1;
				if(a.x * a.y < b.x * b.y) return 1;
				else return 0;
			});
			
			log("sorted res=" + JSON.stringify(res));
			
			// Need special version of X11vnc in order for unix sockets to work!
			//var x11vncPort = HOME_DIR + username + "/sock/vnc_" + processName;
			
			sendToClient(username, "desktopWindow", {app: processName, res: res[0]});
			return;
			
			getTcpPort(VNC_PORT, function(err, x11vncPort) {
				if(err) throw err;
				
				/*
					problem: If we only pick the window, we wont see things like menus... (menus counts as own windows)
				*/
				
				var resp = startX11vnc(username, displayId, res[0].id, x11vncPort);
				
				resp.res = res[0];
				resp.app = processName;
				
				// Tell user the vnc password and port
				sendToClient(username, "vnc", resp)
				
			})
			
			
		});
		
	}
	
	if(info.uid == 0 && process.platform=="linux") {
		// Hardening for when running as a cloud IDE
		// note: People testing the editor might run it in a container or VPS, that's why we don't exit if this script fails
		module_child_process.exec("bash linux_harderning_after_reboot.sh", function(error, stdout, stderr) {
			if(error) console.error( new Error("Hardening failed: (" + error.code + ") " + error.message) );
			if(stdout) log(stdout, DEBUG);
			if(stderr) log(stderr, NOTICE);
		});
	}
	
	if(!USERNAME && module_psList) {
		/*
			Some users install crypto miners on the free shared backend...

			sudo apt install cgroup-tools

		*/

		var highCpuUsage = {}; // pid: counter 

		setTimeout(checkCpuUsage, 10000);
	}

	function checkCpuUsage() {
		module_psList().then(processList).catch(error);

		function error(err) {
			console.error(err);
			return;
		}

		function processList(p) {

			var p = p.sort(function(a, b) {
				if(a.cpu > b.cpu) return -1;
				else return 1;
			});

			var checkInterval = 10000; // milliseconds
			var maxEntires = 30*60 / checkInterval * 1000; // Items in cpuHistory before reporting

			var pArr, cpuWarn = [];
			for(var pid in highCpuUsage) {
				pArr = p.filter(function(obj) {
					return obj.pid == pid;
				});

				if(pArr.length == 0) {
					delete highCpuUsage[pid];
					continue;
				}
				if( highCpuUsage[pid].cpuHistory.length > maxEntires ) {
					cpuWarn.push(highCpuUsage[pid]);
				}
			}

			for(var i=0; i<p.length; i++) {

				if(p[i].cpu > 10) {
					
					if(! highCpuUsage.hasOwnProperty(p[i].pid) ) highCpuUsage[p[i].pid] = Object.assign({cpuHistory: [p[i].cpu]}, p[i]); 
					else highCpuUsage[p[i].pid].cpuHistory.push( p[i].cpu );

					log("checkCpuUsage: " + p[i].name + " (uid=" + p[i].uid + ") uses " + p[i].cpu + " CPU", DEBUG);

				}
				else break;
			}

			// todo: use cgroups to limit CPU !?

			if(cpuWarn.length > 0) {
				var msg = "High CPU: " + (cpuWarn.length == 1 ? cpuWarn[0].cmd : ("(" + cpuWarn.length + ")")) + "\nThe following processes use a lot of CPU: " + JSON.stringify(cpuWarn, null, 2);

				reportError(msg);
			
				log(msg, WARN);

				cpuWarn.forEach(function(p) {
					p.cpuHistory.length = 0;
				}); 
			}
			
			setTimeout(checkCpuUsage, checkInterval);
		}
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
		
		if(!USERNAME && ALLOW_GUESTS) {
			
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
		
		log("Starting Editor Backend/server ...", DEBUG);
		
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
		
		if(HTTP_IP == "127.0.0.1" && (typeof process.getuid == "undefined" || process.getuid() != 0)) openStdinChannel();
		else log("Not opening stdin channel! HTTP_IP=" + " USERNAME=" + USERNAME + " process.getuid()=" + process.getuid(), DEBUG);

		log("Editor backend/server running on URL/address: http://" + makeUrl() + "");
		
		
		if(HTTP_IP != "127.0.0.1" && !NO_BROADCAST) {
			broadcast(HTTP_IP);
		}
		
		if(!NO_REMOTE_FILES) openRemoteFileServer();
		
		if(typeof NAT_TYPE == "string" && NAT_TYPE.indexOf("server") != -1) startNatServer();

	}
}

function startX11vnc(username, displayId, windowId, x11vncPort) {
	
	if(!x11vncPort) throw new Error("x11vncPort=" + x11vncPort);
	
	// ### x11vnc
	
	if(!UTIL.isNumeric(x11vncPort)) {
		var modifiedLibvncserver = true;
		var vncUnixSocket = x11vncPort;
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
		windowId,
		"-forever"
	];
	
	if(modifiedLibvncserver) {
		x11vncArgs.push("unixsock");
		x11vncArgs.push(vncUnixSocket);
	}
	
	// debug: xwininfo -display :5 -root -children
	// debug: x11vnc -rfbport 5901 -display :5 -id 0x400001 -forever
	
	log("Starting x11vnc with args=" + JSON.stringify(x11vncArgs));
	var x11vnc = module_child_process.spawn("x11vnc", x11vncArgs);
	
	var channelId = displayId;
	var vncChannel = VNC_CHANNEL[displayId]
	
	vncChannel.x11vnc = x11vnc;
	
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
		vncPassword: vncPassword
	}
	vncChannel.info = resp;
	
	
	var proxyOptions = {
		ws: true
	}
	
	if(modifiedLibvncserver) {
		resp.socket = vncUnixSocket;
		
		proxyOptions.target = {
			socketPath: vncUnixSocket
		};
	}
	else {
		//resp.vncHost = HOSTNAME;
		resp.vncPort = x11vncPort;
		proxyOptions.target = 'ws://127.0.0.1:' + x11vncPort;
	}
	
	proxyOptions.ws = true
	
	// The proxy was unable to proxy the request. It however worked with Nginx!
	//vncChannel.proxy = new module_httpProxy.createProxyServer(proxyOptions);
	
	return resp;
}

function openStdinChannel() {

	log("Opening local stdin channel on port " + STDIN_PORT + " ...", DEBUG);

	var env = process.env;
	var StringDecoder = module_string_decoder.StringDecoder;
	var decoder = new StringDecoder('utf8');
	var stdInFileName = "stdin";
	var client_connections;
	var gotArguments = false; // The data will always start with process arguments and then a line-break
	
	var stdinServer = module_net.createServer({keepAlive: true});
	
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
	
	function sendOrBuffer(str) {
		if(USER_CONNECTIONS.hasOwnProperty(USERNAME)) {
			console.log("Sending data to editor client user " + USERNAME + " (str.length=" + str.length + ")");
			sendToAll(USERNAME, {stdin: str});
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
					if(USER_CONNECTIONS.hasOwnProperty(USERNAME)) {
						console.log("Sending editor arguments to client user " + USERNAME + " (str.length=" + str.length + ")");
						sendToAll(USERNAME, {arguments: args});
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

	module_fs.readFile(TLS_KEY_PATH, function(err, tlsKey) {
		if(err) {
			log("Unable to read TLS_KEY_PATH=" + TLS_KEY_PATH + ". Remote file server will operate in clear text TCP/IP!", WARN);
			return startRemoteFileServer("tcp");
		}

		module_fs.readFile(TLS_CERT_PATH, function(err, tlsCert) {
			if(err) {
				throw new Error("Unable to read TLS_CERT_PATH=" + TLS_CERT_PATH + "");
			}

			startRemoteFileServer("tls", tlsKey, tlsCert)
		});
	});

	function startRemoteFileServer(serverType, tlsKey, tlsCert) {

		if(serverType == "tls") {

			var options = {
				key: tlsKey,
				cert: tlsCert,

				// This is necessary only if using client certificate authentication.
				//requestCert: true,

				// This is necessary only if the client uses a self-signed certificate.
				//ca: [ fs.readFileSync('client-cert.pem') ],

				keepAlive: true,
				servername: DOMAIN,
				SNICallback: function(servername, callback) {
					log("Remote file: SNICallback: servername=" + servername);
					if(servername == DOMAIN) return callback(null);
					else return callback(null, false);
					
				}
			};

			var remoteFileServer = module_tls.createServer(options);

			remoteFileServer.on("secureConnection", remoteFileConnection);
		}
		else {
			var remoteFileServer = module_net.createServer({keepAlive: true});

			remoteFileServer.on("connection", remoteFileConnection);

		}

		remoteFileServer.on("listening", function stdinServerListening() {
			log("Remote file server (" + serverType + ") listening on port " + REMOTE_FILE_PORT, DEBUG);
		});

		
		remoteFileServer.on("error", stdSocketError);

		remoteFileServer.listen(REMOTE_FILE_PORT, "0.0.0.0");
		// Listen on all IP's so that we can get files from anywhere ...


		// Also listen on a unix socket so that the remote socket can be reached from within user netns ?
		// No, we can reach it via 10.0.0.1 from within the user netns!
		// note: Need to allow access to REMOTE_FILE_PORT in iptables/firewall!

	}

	
	
	function remoteFileConnection(socket) {
		
		var decoder = new StringDecoder('utf8');
		var username; // username for this socket
		var filePath; // Remote file path for this socket
		var strBuffer = "";
		var content = "";
		var client_connections; // Client connections for this file transfer session
		var fileContentReceived = false;
		var remoteHost = socket.remoteAddress;
		var pipeId = false;

		//var pingInterval = setInterval(ping, 5000);

		log("Remote file: server connection from " + remoteHost);
		
		module_dns.reverse(remoteHost, function(err, domains) {
			if(err) return log("Remote file: Unable to find DNS name for ip=" + remoteHost);
			console.log("Remote file: ip=" + remoteHost + " have domains: " + JSON.stringify(domains));
			if(domains.length > 0) remoteHost = domains[0];
		});
		
		socket.on("data", remoteFileSocketData);
		socket.on("end", remoteFileSocketEnd);
		socket.on("close", remoteFileSocketClose);
		
		// Must listen for errors or node -v 8 on Windows will throw on any socket error!
		socket.on("error", remoteFileSocketError);
		
		//function ping() {}

		function remoteFileSocketData(data) {

			log("Remote file: data=" + data.toString(), DEBUG);
			log("Remote file: socket received " + data.length + " bytes of data ...");
			
			strBuffer += decoder.write(data);
			
			var newLinePos = strBuffer.indexOf("\n");

			if(newLinePos == -1) return; // Have not yet received the full serial JSON

			// There can be many JSON message in one chunk!

			var arrMessages = strBuffer.split("\n");

			strBuffer = arrMessages.pop();

			arrMessages.forEach(parseJson);
		}
		
		function parseJson(strBuffer) {
			try {
				var json = JSON.parse(strBuffer);
			}
			catch(err) {
				log("Remote file: Failed to parse (" + err.message + ") JSON strBuffer=" + strBuffer + "", WARN);
				var error = {error: "Could not parse JSON! " + err.message};
				log("Remote file: Error: " + error.error);
				socket.write(JSON.stringify(error) + "\n");
				return;
			}

			if(username == undefined && json.username == undefined) {
				var error = {error: "Must have username in first message!"};
				log("Remote file: Error: " + error.error);
				socket.write(JSON.stringify(error) + "\n");
				return;
			}

			if(filePath == undefined && json.filePath == undefined) {
				var error = {error: "Must have filePath in first message!"};
				log("Remote file: Error: " + error.error);
				socket.write(JSON.stringify(error) + "\n");
				return;
			}

			if(username == undefined && filePath == undefined) {
				// First message!
				username = json.username;
				filePath = json.filePath;

				client_connections = findClients(username);
				if(!client_connections) {
					var error = {error: "Found no active client to send the data! Try another username."};
					log("Remote file: Error: " + error.error);
					socket.write(JSON.stringify(error) + "\n");
					return;
				}

				if(!REMOTE_FILE_SOCKETS.hasOwnProperty(username)) REMOTE_FILE_SOCKETS[username] = {};

				if(REMOTE_FILE_SOCKETS[username].hasOwnProperty(filePath)) {
					log("Remote file: An old socket exist for filePath=" + filePath + ". Closing the old socket!", WARN);
					REMOTE_FILE_SOCKETS[username][filePath].close();
				}

				if(json.stream) {
					pipeId = ++PIPE_COUNTER;
					filePath = "pipe" + pipeId;
					log("Remote file: Sending stream to clients...");
					sendToAll(username, {remotePipe: {host: remoteHost, start: true, id: pipeId}});
				}

				REMOTE_FILE_SOCKETS[username][filePath] = socket;
				log("Remote file: Added socket to username=" + username + " filePath=" + filePath);
			}

			if(json.stream) {
				// We are receiving a stdin stream
				// todo: Needs testing! (not fully implemented)
				sendToStdin();
			}
			else if(json.fileData) {
				// We are receiving file conent

				console.log("Remote file: Recieved content (" + json.fileData.data.length + " bytes) for " + filePath);

				var msg = {remoteFile: {fileName: filePath, content: json.fileData, host: remoteHost}};
				sendToAll(username, msg);
				fileContentReceived = true;

				// We want to keep the connection open, so we can send back the content when it's saved!
			}
			else if(json.ping) {
				log("Remote file: Recieved ping", DEBUG);
				var pong = {pong: json.ping};
				socket.write(JSON.stringify(pong) + "\n");
			}
		}

		function sendToStdin() {
			var msg = {remotePipe: {host: remoteHost, content: strBuffer, id: pipeId}};
			
			console.log("Remote file: Sending data to editor clients... (strBuffer.length=" + strBuffer.length + ")");
			sendToAll(username, msg);
			strBuffer = ""; // Clear the buffer
		}
		
		function remoteFileSocketEnd(endData) {
			if(endData && endData.length > 0) {
				strBuffer += decoder.write(endData);
				if(pipeId) sendToStdin();
			}
			console.log("Remote file: remoteFileSocketEnd: endData.length=" + (endData && endData.length) );
		}
		
		function remoteFileSocketError(err) {
			console.log("Remote file: socket server error: " + err.message);
		}
		
		function remoteFileSocketClose(hadError) {
			console.log("Remote file: socket closed. hadError=" + hadError);
			if(username && REMOTE_FILE_SOCKETS.hasOwnProperty(username) && REMOTE_FILE_SOCKETS[username].hasOwnProperty(filePath)) delete REMOTE_FILE_SOCKETS[username][filePath];
			
			if(pipeId) {
				sendToAll(username, {remotePipe: {host: remoteHost, end: true, id: pipeId}});
			}

			//clearInterval(pingInterval);
		}
		
		function findClients(name) {
			var clients = USER_CONNECTIONS[name];
			var users = Object.keys(USER_CONNECTIONS);
			
			if(!clients && name == "root" && USER_CONNECTIONS.hasOwnProperty("admin")) {
				clients = USER_CONNECTIONS["admin"];
				username = "admin";
			}
			
			if(!clients && name == CURRENT_USER && users.length == 1) {
				console.log("Remote file: Assuming " + users[0] + " == " + CURRENT_USER);
				clients = USER_CONNECTIONS[ users[0] ];
				username = users[0];
			}
			
			return clients;
		}
		
	}
	
	function stdSocketError(err) {
		log("Remote file: server error: " + err.message, WARN);
	}
	
	function sendOrBuffer(str) {
		client_connections = USER_CONNECTIONS[USERNAME];
		
		if(client_connections) {
			console.log("Remote file: Sending data to editor client user " + USERNAME + " (str.length=" + str.length + ")");
			sendToAll(client_connections, {stdin: str});
		}
		else {
			console.log("Remote file: Editor client user " + USERNAME + " not connected! str.length=" + str.length);
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
		module_fs.writeFile(__dirname + "/GUEST_COUNTER", GUEST_COUNTER.toString(), function guestCounterSaved(err) {
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
		var message = Buffer.from(serverAdvertiseMessage);
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
	if(connection == undefined) throw new Error("connection=" + connection);
	var IP = connection.remoteAddress;
	if(connection.headers && connection.headers["x-real-ip"]) IP = connection.headers["x-real-ip"];
	return IP;
}

function sendToAll(username, obj) {
	
	if(typeof username != "string") throw new Error("username=" + username + " should be a string!");
	if(!USER_CONNECTIONS.hasOwnProperty(username)) {
		log("username=" + username + " does not exist in USER_CONNECTIONS=" + Object.keys(USER_CONNECTIONS), WARN);
		return;
	}
	
	var uc = USER_CONNECTIONS[username].connections;
	
	var data = JSON.stringify(obj);
	for (var connectionId in uc) {
		log(getIp(uc[connectionId]) + "(" + connectionId + ") <= " + UTIL.shortString(data, 256));
		uc[connectionId].write(data);
	}
}

function sockJsConnection(connection) {
	
	var userConnectionName = null; // Populated once the user has successfully logged in
	var userConnectionId = -1;
	var IP = getIp(connection);
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	var userBrowser = UTIL.checkBrowser(agent);
	var clientSessionId = "";
	var checkingUser = false;
	var connectionAuthorized = false;
	
	var nat_client_secret;
	var nat_websocket_id;


	var userAlias = userBrowser + "(" + IP + ")";
	
	// ipv6 can give ::ffff:127.0.0.1 or 127.0.0.1-xxxx
	// PS: SockJS filters connection headers! The version we use lets x-real-ip through though.
	
	log("Connection on " + protocol + " from " + IP);
	
	connection.on("data", sockJsMessage);
	
	connection.on("close", sockJsClose);
	
	var data = '{"editorVersion": ' + EDITOR_VERSION + '}';
	if(LOGLEVEL >= DEBUG) log(IP + " <= " + UTIL.shortString(data, 256));
	connection.write(data);
	
	function sockJsMessage(message) {
		log(UTIL.shortString(IP + " => " + message));

		//log("nat_client_secret=" + nat_client_secret + " connectionAuthorized=" + connectionAuthorized + " ");

		if(nat_client_secret) {
			if(!NAT_CLIENTS.hasOwnProperty(nat_client_secret)) {
				connection.write('{"msg":"Unknown NAT code=' + nat_client_secret  + '"}');
				return;
			}
			else {
				// Send the message to the NAT client
				if(!NAT_CLIENTS.hasOwnProperty(nat_client_secret)) {
					log("No NAT client with id=" + nat_client_secret, WARN);
					
					connection.write('{msg: "Cannot send message to NAT:ed server! Unknown NAT code=' + nat_client_secret + '"}');
					return;
				}

				var opcode = ""
				NAT_CLIENTS[nat_client_secret].write(opcode + US + nat_websocket_id + US + message + EOT);

				return;
			}
		}
		else if(!connectionAuthorized) {
			// Check if it's a NAT request
			if(message.indexOf(GS) != -1) {
				var arr = message.split(GS);
				var req_id = arr[0];
				
				function send(resp) {
					resp.id = req_id;
					var str = JSON.stringify(resp);

					log(getIp(connection) + " <= " + UTIL.shortString(str, 256));
					connection.write(str);
				}

				if(arr[1] == "NAT") {
					try {
						var json = JSON.parse(arr[2]);
					}
					catch(err) {
						log("Unable to parse request: " + message, WARN);
						send({error: "Unable to parse request: " + message});
						return;
					}
					
					if(!NAT_CLIENTS.hasOwnProperty(json.code)) {
						log("Unknown NAT code=" + json.code, WARN);
						send({error: "Unknown NAT code=" + json.code + ""});
						return;
					}

					nat_client_secret = json.code;

					nat_websocket_id = ++NAT_WEBSOCKET_COUNTER;
					NAT_SERVER_WEBSOCKET[nat_websocket_id] = connection;

					var opcode = "new_connection";
					var options = UTIL.copyProps(connection, {});

					NAT_CLIENTS[nat_client_secret].write(opcode + US + nat_websocket_id + US + JSON.stringify(options) + EOT);

					log("New NAT Websocket for nat_client_secret=" + nat_client_secret + "");

					// User wont login until a NAT response returns
					send({resp: "ok"});

					return;
				}
				else {
					//log("Not a NAT command: " + message, DEBUG);
				}
			}
			else {
				log("Message did not contain GS! message=" + message, WARN);
			}
		}


		handleUserMessage(message);
	}
	
	function sockJsClose() {
		
		// Thankfully users are not disconnected "right away", sockJs has some tolerence for unstable networks
		// So if we get a sockJsClose the users has been disconnected for a while...
		
		log("Closed client connection (protocol=" + protocol + ") from " + IP);
		
		// Keep stuff (user worker,etc) running for some time so that the user can reconnect and continue terminal emulator session etc...
		
		if(!USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
			log("userConnectionName=" + userConnectionName + " not in USER_CONNECTIONS=" + JSON.stringify( Object.keys(USER_CONNECTIONS) ) + "", WARN);
			return;
		}
		
		USER_CONNECTIONS[userConnectionName].connectedClientIds.splice( USER_CONNECTIONS[userConnectionName].connectedClientIds.indexOf(userConnectionId), 1 );
		USER_CONNECTIONS[userConnectionName].sessionId.splice(USER_CONNECTIONS[userConnectionName].sessionId.indexOf(clientSessionId), 1);
		
		delete USER_CONNECTIONS[userConnectionName].connections[userConnectionId];
		delete USER_CONNECTIONS[userConnectionName].connectionCLientAliases[userConnectionId];
		
		if(UTIL.isEmpty(USER_CONNECTIONS[userConnectionName].connections)) {
			delete USER_CONNECTIONS[userConnectionName];
			
			MESSAGE_BUFFER[userConnectionName] = [];
			
			clearTimeout(USER_CLEANUP_TIMEOUT[userConnectionName]);
			// Wait one hour and if the user has not logged back in; stop the user worker and do some cleanup
			USER_CLEANUP_TIMEOUT[userConnectionName] = setTimeout(userCleanup, 60*60*1000); // 60*60*1000
			
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
			
			sendToAll(userConnectionName, disconnectMsg);
			
		}
	}

	function userCleanup() {
		
		log("userCleanup: userConnectionName=" + userConnectionName + " USER_CONNECTIONS=" + Object.keys(USER_CONNECTIONS) + " ", DEBUG);
		
		if(!USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
			// No other clients logged is as this user
			
			if(USER_WORKERS.hasOwnProperty(userConnectionName)) {
				USER_WORKERS[userConnectionName].send({teardown: true}); // Will make Worker exiting by itself (no need for kill signal)
			}
			else {
				log("userConnectionName=" + userConnectionName + " had no worker process!");
			}
			
			if(DROPBOX.hasOwnProperty(userConnectionName)) {
				if(!DROPBOX[userConnectionName].linked) stopDropboxDaemon(userConnectionName);
				// else: Keep it running so that it will be synced once the user logs back in
			}
			
			if(VPN.hasOwnProperty(userConnectionName)) vpnCommand(userConnectionName, VPN[userConnectionName].homeDir, VPN[userConnectionName], function() {
				log("Stopped VPN connection for " + userConnectionName + "");
			});
			
			for(var displayId in VNC_CHANNEL) {
				if(VNC_CHANNEL[displayId].startedBy == userConnectionName) stopVncChannel(displayId);
			}
			
			for(var name in PROXY) {
				if(PROXY[name].startedBy == userConnectionName) {
					if(PROXY[name].proxy) PROXY[name].proxy.close();
					delete PROXY[name];
				}
			}
			
			
			gcsfCleanup(userConnectionName);
			
		}
		
		
		
		/*
			if(IP == "127.0.0.1" && HTTP_PORT == "8099") {
			console.log("We are running locally. Close down the server when client exit.");
			process.exit(0);
			}
		*/
		
		
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
		
		//log("handleUserMessage: id=" + id + " command=" + command + " userConnectionName=" + userConnectionName, DEBUG);
		
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
		
		log( (userConnectionName ? userConnectionName : IP) + " command=" + command + " connectionAuthorized=" + connectionAuthorized, DEBUG);
		
		if(!connectionAuthorized) {
			
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
									else {
										if( createdUser.password == "guest") throw new Error("Created guest user password=" + createdUser.password);
										loginAsGuest(createdUser.username, createdUser.password, false);
									}
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

							if(guestPw == "guest") throw new Error("Randomly generated password=" + guestPw);

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
						
						if(guestPassword == "guest") throw new Error("Attempted to send guestPassword=" + guestPassword + " to client!");

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
						
						clearTimeout(USER_CLEANUP_TIMEOUT[userConnectionName]);

						if(USERNAME) {
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
							log("checkedMounts! username=" + username, DEBUG);
							if(err) idFail("Problem creating mounts: " + err.message);
							else acceptUser();
						}
						
						function acceptUser() {
							log("acceptUser! username=" + username, DEBUG);
							
							if(loginLog) {
								loginLog.write(new Date().toISOString() + "\t" + username + "\t" + IP + "\n");
							}

							clientSessionId = json.sessionId;
							
							if(!USER_CONNECTIONS.hasOwnProperty(userConnectionName)) {
								log("userConnectionName=" + userConnectionName + " exist in USER_CONNECTIONS!", DEBUG);
								
								userConnectionId = 1;
								
								USER_CONNECTIONS[userConnectionName] = {
									connections: {1: connection},
									connectionCounter: 1, // Start with 1 so it's true:ish. Keep incrementing so we get a unique id
									echoCounter: 1, // Start with 1 so it's true:ish
									connectedClientIds: [userConnectionId],
									connectionCLientAliases: {1: userAlias},
									sessionId: [clientSessionId],
									uid: uid,
									lastUserWorkerCrash: new Date()
								}
								
								if(MESSAGE_BUFFER.hasOwnProperty(userConnectionName)) {
									
									if(MESSAGE_BUFFER[userConnectionName].skipped) {
										MESSAGE_BUFFER[userConnectionName].push({msg: "MAX_MESSAGE_BUFFER=" + MAX_MESSAGE_BUFFER + " reached. " + MESSAGE_BUFFER[userConnectionName].skipped + " messages where skipped."});
									}
									
									MESSAGE_BUFFER[userConnectionName].forEach(function(msg) {
										var str = JSON.stringify(msg);
										log(IP + " <= " + UTIL.shortString(str, 256));
										connection.write(str);
									});
									MESSAGE_BUFFER[userConnectionName].length = 0;
									delete MESSAGE_BUFFER[userConnectionName];
								}
							}
							else {
								log("userConnectionName=" + userConnectionName + " not in USER_CONNECTIONS!", DEBUG);
								
								userConnectionId = ++USER_CONNECTIONS[userConnectionName].connectionCounter;
								
								USER_CONNECTIONS[userConnectionName].connections[userConnectionId] = connection;
								USER_CONNECTIONS[userConnectionName].connectedClientIds.push(userConnectionId);
								USER_CONNECTIONS[userConnectionName].connectionCLientAliases[userConnectionId] = userAlias;
								USER_CONNECTIONS[userConnectionName].sessionId.push(clientSessionId);
							}
							
							if(gid == undefined) gid = uid;
							
							
							if(!USER_WORKERS.hasOwnProperty(userConnectionName)) {
								log("Creating worker process for userConnectionName=" + userConnectionName + "...", DEBUG);
								createUserWorker(userConnectionName, uid, gid, homeDir, groups, (VIRTUAL_ROOT && rootPath));
							
								// Tell the worker process which user
								var userWorkerInfo = {
									name: userConnectionName, 
									rootPath: (VIRTUAL_ROOT && rootPath), 
									homeDir: homeDir, 
									id: uid, 
									ip: HTTP_IP,
									version: EDITOR_VERSION
								};
								
								// Only give tld when running as a cloud editor!
								if(!USERNAME) userWorkerInfo.tld = DOMAIN || HOSTNAME;
								// if a username is provided in server.js arguments, then we are running as a local desktop editor
								
								log("User userConnectionName=" + userConnectionName + " sending identify to worker process", DEBUG);
								USER_WORKERS[userConnectionName].send({identify: userWorkerInfo});
								
							}
							else {
								log("Worker process for userConnectionName=" + userConnectionName + " already exist!", DEBUG);
							}
							
							
							/*
								setTimeout(function() {
								user.send({resp: {
								test: {foo: 1, bar: 2}
								}});
								
								}, 3000);
							*/
							
							//console.log("userConnectionId=" + userConnectionId);
							
							
							
							// Respond to the client that the login was successful
							var userClientInfo = {
								user: userConnectionName,
								alias: userAlias,
								sessionId: json.sessionId,
								ip: IP,
								cId: userConnectionId,
								connectedClientIds: USER_CONNECTIONS[userConnectionName].connectedClientIds,
								editorVersion: EDITOR_VERSION,
								platform: process.platform,
								homeDir: (VIRTUAL_ROOT) ? "/" : homeDir,
								tld: !USERNAME && DOMAIN
							};
							
							userClientInfo.installDirectory = __dirname.replace(/server$/, "");
							
							if(uid && process.platform=="linux") {
								var netnsIP = UTIL.int2ip(167772162 + uid); // Starts on 10.0.0.2 then adds the uid to get a unique local IP address
								userClientInfo.netnsIP = netnsIP;
							}
							
							log("User userConnectionName=" + userConnectionName + " sending loginSuccess to client!", DEBUG);
							send({resp: {loginSuccess: userClientInfo}});
							

							var waitUntilClonedCounter = 0;
							var waitUntilClonedTimeout = 200;
							var waitUntilClonedMaxWait = 5 * 1000 / waitUntilClonedTimeout;

							function waitUntilCloned() {
								waitUntilClonedCounter++;
								var repoBranch = GITHUB_GITCLONE[IP].repoBranch;
								if(GITHUB_CLONING[repoBranch]) {
									console.log("github2s: Still being cloned... repoBranch=" + repoBranch);

									if( waitUntilClonedCounter >= waitUntilClonedMaxWait ) {
										console.log("github2s: Max wait time reached! repoBranch=" + repoBranch + " waitUntilClonedCounter=" + waitUntilClonedCounter + " waitUntilClonedMaxWait=" + waitUntilClonedMaxWait);
										return;
									}

									return setTimeout(waitUntilCloned, waitUntilClonedTimeout);
								}
								
								var tmpDir = GITHUB_GITCLONE[IP].dir;
								var repoName = UTIL.getFolderName(tmpDir);
								var repoDir = UTIL.joinPaths(homeDir, "repo");

								console.log("github2s: Creating repoDir=" + repoDir);
								module_fs.mkdir(repoDir, function(err) {
									console.log("github2s: mkdir repoDir=" + repoDir + " err.message=" + (err && err.message));

									if(!err) {
										// We did not get a EEXIST so it's was the first time the fir was created!
										module_chownr(repoDir, uid, gid, function(err) {
											if(err) throw err;
										});
									}

									repoDir = UTIL.joinPaths(repoDir, repoName);

									console.log("github2s: Copying tmpDir=" + tmpDir + " to repoDir=" + repoDir);
									module_fs_extra.copy(tmpDir, repoDir, function (err) {
										if (err) throw err

										module_chownr(repoDir, uid, gid, function(err) {
											if(err) throw err;

											console.log("github2s: Copied files from tmpDir=" + tmpDir + " to repoDir=" + repoDir);

											delete GITHUB_GITCLONE[IP];

										});
									});
								});

							}

							if( GITHUB_GITCLONE.hasOwnProperty(IP) ) {
								waitUntilCloned();
							}
							else {
								console.log("github2s: No folder to move! IP=" + IP + " GITHUB_GITCLONE=" + JSON.stringify(GITHUB_GITCLONE));
							}

							
							// Tell all clients that a new client has connected
							var clientJoin = {
								ip: IP,
								cId: userConnectionId,
								connectedClientIds: USER_CONNECTIONS[userConnectionName].connectedClientIds,
								alias: userAlias,
								connectionCLientAliases: USER_CONNECTIONS[userConnectionName].connectionCLientAliases
							};
							
							for (var connectionId in USER_CONNECTIONS[userConnectionName].connections) {
								send({clientJoin: clientJoin, id: 0}, USER_CONNECTIONS[userConnectionName].connections[connectionId]);
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
								module_fs.writeFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "lastLogin"]), unixTimeStamp().toString(), function createLastLoginFile(err) {
									if(err && err.code == "ENOENT") {
										// .webide/storage/ probably doesn't exist in the home dir!
										module_fs.mkdir( UTIL.joinPaths([homeDir, ".webide/", "storage/"]), {recursive: true}, function(err) {
											if(err && err.code != "EEXIST") throw err;
											
											module_fs.chown( UTIL.joinPaths([homeDir, ".webide/", "storage/"]), uid, gid, function(err) {
												if(err) throw err;

												// Try again
												module_fs.writeFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "lastLogin"]), unixTimeStamp().toString(), function(err) {
													if(err) throw err;

													lastLoginFileUpdated();
												});
											});
										});
										
										return;
									}
									else if(err) throw err;
									else lastLoginFileUpdated();
								
									function lastLoginFileUpdated() {
										// Update loginCounter
										module_fs.readFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "loginCounter"]), "utf8", function readLoginCounter(err, data) {
											if(err) {
												if(err.code != "ENOENT") throw err;
												var loginCounter = 0;
											}
											else {
												data = data.replace(/'/g, ""); // nr.toString() pads with ' single quotes
												var loginCounter = parseInt(data);
												if(isNaN(loginCounter)) loginCounter = 0;
											}
											
											loginCounter++;
											
											send({loginCounter: loginCounter, id: 0});
											
											//var data = JSON.stringify();
											//connection.write(data);
											
											module_fs.writeFile(UTIL.joinPaths([homeDir, ".webide/", "storage/", "loginCounter"]), loginCounter.toString(), function readLoginCounter(err) {
												if(err) throw err;
												
												
												console.timeEnd("Login " + IP);
												console.log(IP + " logged in as " + username + " loginCounter=" + loginCounter + " ");
												
												checkingUser = false;
												
												
											});

										});
										
										
									}
								
								});
							}
							
							connectionAuthorized = true;
							
							return true;
							
						}
					}
					
				})(json.username, json.password);
				
				
			}
		}
		else {
			// # User has authorized
			
			if(!USER_WORKERS.hasOwnProperty(userConnectionName)) throw new Error(userConnectionName + " has no worker process!");
			
			if(command == "echo") {
				// Send the data to all other connected client, except the client that sent the echo msg
				json.echoCounter = ++USER_CONNECTIONS[userConnectionName].echoCounter;
				
				if(json.echoCounter != json.order) log( "Out of sync: echo: echoCounter=" + json.echoCounter + " json=" + UTIL.shortString(JSON.stringify(json)) , NOTICE);
				
				json.cId = userConnectionId;
				json.alias = userAlias;
				
				sendToAll(userConnectionName, {echo: json});
				
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
			else if(command == "logout") {
				//userCleanup();
				// dont clean up right away in case we are in colaboration mode or want to relogin

				connection.close();
				
				userConnectionName = null;
				commandQueue.length = 0;
				connectionAuthorized = false;

			}
			else {
				
				USER_WORKERS[userConnectionName].send({commands: {command: command, json: json, id: userConnectionId + "|" + id}});
			}
		}
		
		function send(answer, conn) {

			if(conn == undefined) conn = connection;

			//log("answer.id=" + answer.id, DEBUG);

			if(answer.id == undefined && id) {
				//log("Setting answer.id to id=" + id + " because answer.id=" + answer.id + "==undefined && id=" + id + " answer=" + JSON.stringify(answer, null, 2), DEBUG);
				answer.id = id;
			}

			if(answer.id == id) id = null; // Do not reuse the same id
			else if(answer.id === 0) delete answer["id"]; // Use id=0 to avoid taking another id
			/*
				else if(typeof answer.id == "string") {
				var arr = answer.id.split("|");
				if(userConnectionId == arr[0]) {
				answer.id = parseInt(arr[1]);
				}
				else {
				log("Ignoring message from user worker heading to connectionId=" + arr[0], DEBUG);
				return;
				}
				}
			*/


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
	
	log("checkMounts: username=" + username, DEBUG);
	
	// Make sure everything is mounted etc ...
	
	
	//console.log("Checking mounts for username=" + username + " ...");
	console.time("check " + username + " mounts");
	
	
	var nginxProfileOK = false;
	var checkMountsReady = false; // Prevent double callback
	var sslCertChecked = false;
	var checkMountsAbort = false;
	var mysqlCheck = false;
	var createdNetworkNamespaces = (process.platform != "linux");
	var filesToWrite = 0;
	var filesWritten = 0;
	var kvmAccessGranted = false;
	var wwwpubCreated = false;
	var sockDirCreated = false;
	var logDirCreated = false;
	var prodDirCreated = false;
	var npmDirCreated = false;
	
	
	var intervalGetGroupId = setInterval(function() { log(username + " waiting for getGroupId...", DEBUG); }, 1000);
	getGroupId("www-data", function(err, wwwgid) {
		clearInterval(intervalGetGroupId);
		if(err) throw err;
		
		// Nginx will serve files from the wwwpub folder
		var intervalCreateIfNotExist = setInterval(function() { log(username + " waiting for createIfNotExist...", DEBUG); }, 1000);
		createIfNotExist(HOME_DIR + username + "/wwwpub/", uid, wwwgid, "2755", function(err, createdTheFolder) {
			clearInterval(intervalCreateIfNotExist);
			if(err) throw err;
			
			if(createdTheFolder) {
				var intervalFsWriteFile = setInterval(function() { log(username + " waiting for fs.writeFile...", DEBUG); }, 1000);
				module_fs.writeFile(HOME_DIR + username + "/wwwpub/index.htm", '<!doctype html>\n<meta charset="utf-8">\n\n<body>\n\n<p>Edit me!</p>\n\n</body>\n', ENCODING, function(err) {
						clearInterval(intervalFsWriteFile);
						if(err) throw err;
						wwwpubCreated = true;
					});
				}
				else wwwpubCreated = true;
			});
		
			// Create a directory for unix sockets
			// note: Each process needs to set umask to give write permission to the group!
			createIfNotExist(HOME_DIR + username + "/sock/", uid, wwwgid, "2755", function(err) {
				if(err) throw err;
				else sockDirCreated = true;
			});
		
		});
	
		// Create a directory where nginx can save logs
		createIfNotExist(HOME_DIR + username + "/log/", uid, gid, "2755", function(err) {
			if(err) throw err;
			else logDirCreated = true;
		});
	
		// Create a directory for putting "in production" files
		createIfNotExist(HOME_DIR + username + "/.prod/", uid, gid, "0770", function(err) {
			if(err) throw err;
			else prodDirCreated = true;
		});
	
		// Create a directory where npm can install packages globally
		createIfNotExist(HOME_DIR + username + "/.npm-packages/", uid, gid, "0775", function(err) {
			if(err) throw err;
			else npmDirCreated = true;
		});
	
		function createIfNotExist(folder, uid, gid, mode, callback) {
			// Don't bother checking if it exist, just try to create it
			var createdTheFolder = false;
		
			module_fs.mkdir(folder, function(err) {
			
				if(err && err.code != "EEXIST") return callback(err);
			
				if(!err) createdTheFolder = true;
			
				// Don't bother checking. Always chown
				module_fs.chown(folder, uid, gid, function(err) {
					if(err) return callback(err);
					// (Don't forget about the group-id bit so that all new files created will belong to the group)
					module_fs.chmod(folder, mode, function(err) {
						if(err) return callback(err);
						else return callback(null, createdTheFolder);
					});
				});
			});
		}
	
	
		if(INSIDE_DOCKER) {
			kvmAccessGranted = true;
		}
		else {
			// Make it possible to run Android emulator
			module_child_process.exec("setfacl -m u:" + username + ":rwx /dev/kvm", EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) throw err;
			log("Giving " + username + " access to /dev/kvm");
			if(stderr) log(username + " (/dev/kvm): setfacl stderr=" + stderr, NOTICE);
			if(stdout) log(username + " (/dev/kvm): setfacl stdout=" + stdout, INFO);
				kvmAccessGranted = true;
			});
		}
	
		if(!createdNetworkNamespaces) {
		
			var IP = UTIL.int2ip(167772162 + uid);
		
		
			var createNetnsFile = function createNetnsFile(etcFile, content) {
				filesToWrite++;
			
				var stats = 0;
				var writes = 0;
				var netnsPath = UTIL.joinPaths("/etc/netns/", username, etcFile);
			
				stats++;module_fs.stat("/etc/" + etcFile + "", function(err) {stats--;
					if(err && err.code == "ENOENT") {
						// ip netns exec wont unshare bind if the file don't exist in /etc/
						
						stats++;module_fs.stat(netnsPath, function(err) {stats--;
							if(err && err.code == "ENOENT") return doneMaybe();
							else if(err) throw err;
							
							// Make sure there is no file in /etc/netns/ or mount will throw errors!
							writes++;module_fs.unlink(netnsPath, function (err) {writes--;
								if (err) throw err;
								doneMaybe();
							});
							
						});
						
						return doneMaybe();
					}
					else if(err) throw err;
					
					writes++;module_fs.writeFile(netnsPath, content, function (err) {writes--;
						if (err) throw err;
						log("Created " + netnsPath, INFO);
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
						return checkMountsReadyMaybe();
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
						return checkMountsReadyMaybe();
					}
					
					createNetnsFile(etcFile, line);
				});
			}
			
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
				
				// Create /etc/netns/guest3/ if it doesn't already exist
				module_fs.mkdir("/etc/netns/" + username, function(err) {
					if(err && err.code != "EEXIST") throw err;
				
				
					// When user launches for example a node.js web server listening on "localhost"
					// We want it to listen on the user IP in order to be accessible from https://####.user.TLD
					createNetnsFile("hosts", IP + "\tlocalhost");
				
					// Override host's resolvers
					createNetnsFile("resolv.conf", "nameserver 8.8.8.8\nnameserver 8.8.4.4");
					// note: systemd will probably re-bind resolv.conf in regular intervals with the system resolvers!
				
					// Make it harder to see other users on the system by faking...
					createNetnsFile("passwd", username + ":x:" + uid + ":" + gid + "::" + HOME_DIR + username + ":/bin/bash");
					createNetnsFile("group", username + ":x:" + gid + ":");
				
					copyEntryFrom("subuid");
					copyEntryFrom("subgid");
				
					createNetnsFile("mtab", ""); // Contains mountpoints and thus other users
				
				
				
				
					createdNetworkNamespaces = true;
					checkMountsReadyMaybe();
				
				});
			
			
			});
			
			
			
		}
		
		
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
					mysqlConnection.query("CREATE USER ?@'localhost' IDENTIFIED WITH unix_socket", [username], function(err, rows, fields) {
						if(err) throw err;
						
						mySqlDone();
					});
				}
				else mySqlDone();
			});
			
			function mySqlDone() {
				mysqlCheck = true;
				checkMountsReadyMaybe();
			}
		});


		if(SKIP_NGINX) {
			nginxProfileOK = true;
			sslCertChecked = true;
		}
		else {
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
						
							// Also need to update update.js if more variables are added!

							nginxProfile = nginxProfile.replace(/%USERNAME%/g, url_user);
							nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, homeDir);
							nginxProfile = nginxProfile.replace(/%NETNSIP%/g, UTIL.int2ip(167772162 + uid));
							nginxProfile = nginxProfile.replace(/%DOCKERIP%/g, UTIL.int2ip(167903234 + uid));
							// dots need to be escaped!? Not in cert paths or nginx will not reload! Only in regular expressions!
							nginxProfile = nginxProfile.replace(/%DOM_ESC_DOTS%/g, DOMAIN.replace(/\./g, "\\.") );
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
										if(stderr) error = new Error(stderr);
										if(stdout) error = new Error(stdout);
										if(error) {
											// Get the actual error
											module_child_process.exec("nginx -T", EXEC_OPTIONS, function(err, stdout, stderr) {
												log(stdout, NOTICE);
												log(stderr, NOTICE);
												reportError(stdout + "\n" + stderr);
												log("Disabling Nginx profile due to errors: " + nginxProfileEnabledPath);
												module_fs.unlink(nginxProfileEnabledPath, function(err) {
													if(err) throw err;
												});
											});
										}
									
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
		}
	
	
	
		function checkMountsReadyMaybe() {
			if(checkMountsAbort) return;
		
			if(prodDirCreated && npmDirCreated && logDirCreated && sockDirCreated && wwwpubCreated && kvmAccessGranted && createdNetworkNamespaces && nginxProfileOK && (sslCertChecked || !options.waitForSSL) && mysqlCheck && filesToWrite==filesWritten) {
			
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
			
				if(!createdNetworkNamespaces) log(username + " waiting for network namespace to be created...", DEBUG);
				if(!nginxProfileOK) log(username + " waiting for Nginx profiles to be created...", DEBUG);
				if((!sslCertChecked && options.waitForSSL)) log(username + " waiting for SSL certificates to be created...", DEBUG);
				if(!mysqlCheck) log(username + " waiting for mySQL socket to be created ...", DEBUG);
				if(filesToWrite!=filesWritten) log(username + " waiting for filesToWrite=" + filesToWrite + " filesWritten=" + filesWritten + "  ", DEBUG);
				if(!kvmAccessGranted) log(username + " waiting for access to /dev/kvm ...", DEBUG);
				if(!wwwpubCreated)  log(username + " wwwpub folder not yet checked/created...", DEBUG);
				if(!sockDirCreated)  log(username + " sock folder not yet checked/created...", DEBUG);
				if(!logDirCreated)  log(username + " log folder not yet checked/created...", DEBUG);
				if(!prodDirCreated)  log(username + ".prod folder not yet checked/created...", DEBUG);
				if(!npmDirCreated)  log(username + ".npm-packages folder not yet checked/created...", DEBUG);
			
			}
		}
	
	
		function checkMountsError(err) {
			if(checkMountsAbort) return;
			checkMountsAbort = true;
		
			checkMountsCallback(err);
		
		}
	
		function checkSslCert() {
			// Check ssl certificate

			if(INSIDE_DOCKER) {
				sslCertChecked = true;
				if(options.waitForSSL) checkMountsReadyMaybe();
				return;
			}

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
							setTimeout(function() {
								enableSSL(userDomain);
							}, 500); // It will take some time for the certificate to be installed!? no, it was another bug, but keep the timeout for now...
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
						
							var err = error || stdout || stderr;
							if(err) reportError(err);
						
							/*
								if(error) throw(error);
								if(stderr) throw new Error(stderr);
								if(stdout) throw new Error(stdout);
							*/
						
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
		log(msg, 4, 3);
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
			if(folder.indexOf(HOME_DIR + username) !== 0) return callback( new Error("Can not create an http-endpoint outside HOME_DIR=" + HOME_DIR + username) );
		}
	
		for(var endPoint in HTTP_ENDPOINTS) {
			if(HTTP_ENDPOINTS[endPoint].dir == folder) {
				return callback(null, makeUrl(endPoint));
			}
		}
		
		var endPoint = randomString(10).toLowerCase(); // JavaScript is case sensitive while the www is not
		
		HTTP_ENDPOINTS[endPoint] = {
			dir: folder,
			req: function(path, response) {
				var id = ++INTERNAL_USERWORKER_REQ_ID;
				INTERNAL_USERWORKER_REQ[id] = function(err, answer) {
					var responseHeaders = {};
					responseHeaders["Cache-Control"] = 'no-cache';

					if(err) {
						response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
						response.end(err.message);
					}
					else {

						var fileExtension = UTIL.getFileExtension(path);

						var buffer = Buffer.from(answer.data);

						responseHeaders["Content-Type"] = module_mimeMap[fileExtension];
						responseHeaders["Content-Length"] = buffer.length;

						// Some browsers (like IE11) doesn't use utf8 by default
						if(fileExtension == "js" || fileExtension == "svg" || fileExtension == "htm" || fileExtension == "html" || fileExtension == "css") {
							responseHeaders["Content-Type"] += "; charset=utf-8";
						}

						response.writeHead(200, responseHeaders);

						response.end(buffer);

					}

					delete INTERNAL_USERWORKER_REQ[id];

				}

				var userPath = UTIL.joinPaths(this.dir, path);

				var command = "readFromDisk";
				var json = {path: userPath, returnBuffer: true};
				USER_WORKERS[username].send({commands: {command: command, json: json, id: id}, internal: true});

			}
		};
		
		log("Created HTTP endPoint=" + endPoint + " to folder=" + folder);
		
		callback(null, makeUrl(endPoint));
	}

	function removeHttpEndpoint(username, folder, callback) {
	
		log("Removing HTTP endpoint to folder=" + folder + " ...");
	
		if(HOME_DIR && !USERNAME) {
			if(folder.indexOf(HOME_DIR + username) !== 0) throw new Error("Can not remove an http-endpoint outside HOME_DIR=" + HOME_DIR + username);
		}
	
		var endpointDeleted = false;
		for(var endPoint in HTTP_ENDPOINTS) {
			if(HTTP_ENDPOINTS[endPoint].dir == folder) {
				delete HTTP_ENDPOINTS[endPoint];
				endpointDeleted = true;
			}
		}
	
		if(endpointDeleted) callback(null, folder);
		else callback(new Error("Endpoint to folder=" + folder + " not found!"));
	
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
	
		/*
		
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
		*/
		if(firstDir == "oembed") {
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
		else if(firstDir == "github") {
			/*
				Service to clone a github repo...
			*/

			if(secondDir == "robots.txt" || secondDir == "favicon.ico") {
				response.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
				response.end("These aren't the droids you're looking for");
				return;
			}

			dirs.shift(); // removes first slash
			dirs.shift(); // removes "github"
			
			console.log("github2s: dirs.length=" + dirs.length + " dirs=" + JSON.stringify(dirs));

			if(dirs.length > 1) {
				cloneGitRepo(dirs, IP);
			}

			response.writeHead(302, {
				'Location': '/?github=' + encodeURIComponent(dirs.join("/")),
				'Content-Type': 'text/html; charset=utf-8'
			});
			response.end( 'Go to <a href="https://' + DOMAIN + '/?github=' + encodeURIComponent(dirs.join("/")) + '">editor</a>' );
			
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
			var notifyUser = true;
			//var convertBase64ToBinary = false;
			var files = [];
			if (request.method === 'POST') {
				/*
					Figure out what user should get the file
					Probably the user with the same IP !?
				
					What if there are many users with the same IP!?
					todo: Make the service worker handle the request!
					Then "upload" the file from the service worker cache!?
					https://glitch.com/~web-share-offline
				*/
			
				log("File upload: request.headers=" + JSON.stringify(request.headers), DEBUG);
			
				var cookie = request.headers.cookie;
				var cookieMatchUser = cookie.match(/user=([^;]*)?/);
				if(cookieMatchUser) {
					sendToUser = cookieMatchUser[1];
					log("File upload: Found sendToUser=" + sendToUser + " in cookies!", INFO);
				}
			
				if(!sendToUser) {
					log("File upload: USER_CONNECTIONS=" + JSON.stringify(Object.keys(USER_CONNECTIONS)));
				
					var conn, ip;
					conns: for(var username in USER_CONNECTIONS) {
						log("File upload: Checking connections for username=" + username, DEBUG);
						for(var connectionId in USER_CONNECTIONS[username].connections) {
							conn = USER_CONNECTIONS[username].connections[connectionId];
							ip = getIp(conn);
							if(ip == IP) {
								sendToUser = username;
								log("File upload: User found: " + sendToUser, INFO);
								break conns;
							}
							else {
								log("File upload: Not a match: User " + username  + " ip=" + ip + ". Uploader IP=" + IP, DEBUG);
							}
						
							//log(UTIL.objInfo(conn), INFO);
						}
					}
				}
			
				var busboy = new Busboy({ headers: request.headers });
				busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
					log('File upload: File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype, DEBUG);
					file.on('data', function(data) {
						log('File upload: File [' + fieldname + '] got ' + data.length + ' bytes', DEBUG);
					
					});
					file.on('end', function() {
						log('File upload: File [' + fieldname + '] Finished', DEBUG);
					});
				
					// Save file in temp dir, then move it to the user home dir.
					var saveTo = module_path.join(module_os.tmpdir(), module_path.basename(filename || fieldname));
					log("File upload: piping to write stream: saveTo=" + saveTo);
					file.pipe(module_fs.createWriteStream(saveTo));
					files.push(saveTo);
				
				});
				busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
					log('File upload: Field [' + fieldname + ']: value: ' + val, DEBUG);
				
					if(fieldname == "user") sendToUser = val;
					else if(fieldname == "open" && val=="false") notifyUser = false;
					//else if(fieldname == "base64" && val=="true") convertBase64ToBinary = true;
				
				});
				busboy.on('finish', function() {
					log('File upload: Done parsing form!', DEBUG);
				
					var done = function(uploadMessage) {
						log("File upload: done! uploadMessage=" + uploadMessage, DEBUG);
						response.writeHead(302, { Location: '/?open=/upload/file', 'Content-Type': 'text/plain; charset=utf-8' });
						response.end(uploadMessage);
					}
				
					var uploadedFiles = [];
				
					if(files.length == 0) {
						done("Error: Did not recieve any files!");
					}
					else if(sendToUser) {
						log("File upload: sendToUser=" + sendToUser, DEBUG);
					
						var copyFile = function copyFile(fromPath, username, fileName) {
						
							var uploadFolder = HOME_DIR + username + "/upload/";
							var toPath = uploadFolder + fileName;
						
							// First create the upload dir if it doesn't already exist
							log("File upload: Checking folder: " + uploadFolder, DEBUG);
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
									log("File upload: Folder exist: " + uploadFolder, DEBUG);
									folderCreated(uploadFolder);
								}
								else {
									log("File upload: Not a directory: " + uploadFolder, DEBUG);
									filesFailed.push(fileName, " Error: Problem with upload folder");
									filesMovedCount++;
									doneMaybe();
								}
							});
						
							function folderCreated(uploadFolder) {
							
								log("File upload: Copying file: " + fromPath + " to " + toPath, DEBUG);
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
								
									if(notifyUser) {
										// Chrome PWA will close, then re-open the app when sharing files to it, so wait until it has reopened before notifying the user
										setTimeout(function() {
											if(USER_CONNECTIONS.hasOwnProperty(username)) {
												log("File upload: Notifying user " + username + " (" + USER_CONNECTIONS[username].connectedClientIds.length + " connections) ... ", DEBUG);
												sendToAll(username, {uploadedFiles: uploadedFiles});
											}
											else {
												uploadMessage += "Warning: " + username + " is not online!";
												log("File upload: User " + username + " not online!", INFO);
											}
										}, 4000);
									
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
									log("File upload: Copied file to " + toPath, DEBUG);
									uploadedFiles.push(fileName);
									module_fs.unlink(fromPath, function(err) {
										if(err) console.error(err);
										else log("File upload: Deleted " + fromPath, DEBUG);
									});
								
									readEtcPasswd(username, function(err, user) {
										if(err) {
											console.error(err);
											return;
										}
										module_fs.chown(toPath, user.uid, user.gid, function(err) {
											if(err) console.error(err);
											else log("File upload: Changed ownership of " + toPath + " to " + username, DEBUG);
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
						log("File upload: Checking folder: " + homeDir, DEBUG);
						module_fs.stat(homeDir, function(err, stats) {
							if(err) {
								log("File upload: Folder not found: " + homeDir + " Assuming user doesnt exist.", DEBUG);
								done("Error: User does not exist:" + sendToUser);
							}
							else if(stats.isDirectory()) {
								log("File upload: Folder exist: " + homeDir + "", DEBUG);
							
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
		
			if(!HTTP_ENDPOINTS.hasOwnProperty(firstDir)) {
				response.writeHead(400, { Connection: 'close', 'Content-Type': 'text/plain; charset=utf-8' });
				response.end('Unable to find endpoint: ' + firstDir);
				return;
			}

			urlPath = urlPath.replace(firstDir + "/", "");
		
			log("Serving from http-endpoint=" + firstDir + " localFolder=" + localFolder + "", INFO);

			return HTTP_ENDPOINTS[firstDir].req(urlPath, response);

		}
		else {
		
			//console.log("firstDir=" + firstDir + " not in endpoints: " + JSON.stringify(HTTP_ENDPOINTS));
		
			localFolder = module_path.resolve("../client/");
		
			//console.log("Serving from the webide client folder: " + localFolder);
		
			/*
				response.writeHead(400, "Error", {'Content-Type': 'text/plain; charset=utf-8'});
				response.end("Unknown endpoint: '" + firstDir + "' of " + urlPath);
				return;
			*/
		
		}
	
		if(urlPath == "/" || urlPath == "") urlPath = "/index.htm";

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

	function isSHA1hash(str) {
		if(str.length != 40) return false;

		var reHex = /[a-f][0-9]+/;

		if( str.match(reHex) == null) return false;

		return true;
	}

	function cloneGitRepo(dirs, IP) {

		/*
			git clone --single-branch --branch <branchname> <remote-repo>

			Examples: 
			https://github.com/Z3TA/dbo/blob/gh-pages/design1/style.css
			https://github.com/Z3TA/dbo/blob/1c4135ccc10131343117a465385c67a1a5a00d50/dbo.js
			https://github.com/Z3TA/dbo
			https://github.com/Z3TA/dbo/tree/gh-pages
			https://github.com/redhat-developer/vscode-java/wiki/JDK-Requirements

		*/
		var branch = ""; // default no branch

		if(dirs[2] == "blob") {
			var githubUser = dirs[0];
			var githubRepoName = dirs[1];
			var branch =  dirs[3];
		}
		else if(dirs[2] == "tree") {
			var githubUser = dirs[0];
			var githubRepoName = dirs[1];
			var branch =  dirs[3];
		}
		else if(dirs[2] == "compare") {
			var githubUser = dirs[0];
			var githubRepoName = dirs[1];
		}
		else if(dirs[2] == "wiki") {
			var githubUser = dirs[0];
			var githubRepoName = dirs[1];
			var repo = "https://github.com/" + githubUser + "/" + githubRepoName + ".wiki.git";
		}
		else if(dirs.length == 2 || (dirs.length == 3 && dirs[2] == "")) { // Sometimes it ends with a slash. eg. foo/bar/ => [ 'foo', 'bar', '' ]
			var githubUser = dirs[0];
			var githubRepoName = dirs[1];
		}
		else {
			reportError("Unknown github url format: " + dirs.join("/") + " dirs.length=" + dirs.length);
			return;
		}

		if(branch == "HEAD") branch = "";

		if(repo == undefined) {
			var repo = "https://github.com/" + githubUser + "/" + githubRepoName + ".git";
		}

		var repoBranch = repo + "/" + branch

		if( GITHUB_CLONING.hasOwnProperty(repoBranch) ) {
			// The repo is currently being cloned...
			return githubRepoName;
		}

		GITHUB_CLONING[repoBranch] = true;

		var tmpDir = "/tmp/" + githubUser;
		var tempDirRepo = tmpDir + "/" + githubRepoName;
		var uid = 65534; // nobody
		var gid = 65534;

		GITHUB_GITCLONE[IP] = {dir: tempDirRepo, repoBranch: repoBranch};

		log("github2s: Cloning git(hub) repo=" + repo);


		module_fs.mkdir(tmpDir, {mode: 0o777}, function(err) {
			if(err && err.code != "EEXIST") throw err;

			log("github2s: Created tmpDir=" + tmpDir);

			module_fs.chown(tmpDir, uid, gid, function(err) {
				if(err) throw err;

				log("github2s: chowned uid=" + uid + " gid=" + gid + " tmpDir=" + tmpDir);

				var execOptions = {
					shell: EXEC_OPTIONS.shell,
					cwd: tmpDir,
					uid: uid,
					gid: gid
				};

				var gitArg = ["clone"];

				if(branch && !isSHA1hash(branch)) {
					gitArg = gitArg.concat( ["--single-branch", "--branch", branch] );
				}

				// hopefully make cloning faster
				gitArg = gitArg.concat( ["--depth", "1"] );

				gitArg = gitArg.concat([repo, tempDirRepo]);

				log("github2s: cloning gitArg=" + JSON.stringify(gitArg) );

				module_child_process.execFile("git", gitArg, execOptions, function gitclone(err, stdout, stderr) {
					log("github2s: git err=" + err + " err.code=" + (err && err.code) + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(gitArg));

					if(stderr) {

						stderr = stderr.replace("Cloning into '" + tempDirRepo + "'...", "").trim();
						stderr = stderr.replace("warning: unable to access '/root/.config/git/attributes': Permission denied", "").trim();

						if(stderr.indexOf("already exists") != -1) {
							log("github2s: Pulling new commits ...");
							var gitArg = ["pull"];
							execOptions.cwd = tempDirRepo;
							return module_child_process.execFile("git", gitArg, execOptions, function gitclone(err, stdout, stderr) {
								log("github2s: git err=" + err + " err.code=" + (err && err.code) + " stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(gitArg));

								delete GITHUB_CLONING[repoBranch];

							});
						}
						else if(stderr.indexOf("Already up to date") != -1) {
							log("github2s: " + stderr);
						}
						else if(stderr.indexOf("Checking out files:") != -1) {
							log("github2s: " + stderr);
						}
						else if(stderr) {

							log("github2s: Unknown error: " + stderr);
							console.error(err);
							reportError( "Unknown git error: stderr=" + stderr + " gitArg=" + JSON.stringify(gitArg) + " dirs=" + JSON.stringify(dirs) );
						}
					}

					delete GITHUB_CLONING[repoBranch];
				});
			});
		});

		return githubRepoName;
	}

	// Currently not used function might come in handy later...
	function isLocalIp(address) {
		var ranges = [
			// 10.0.0.0 - 10.255.255.255
			/^(::f{4}:)?10\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
			// 127.0.0.0 - 127.255.255.255
			/^(::f{4}:)?127\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
			// 169.254.1.0 - 169.254.254.255
			/^(::f{4}:)?169\.254\.([1-9]|1?\d\d|2[0-4]\d|25[0-4])\.\d{1,3}/,
			// 172.16.0.0 - 172.31.255.255
			/^(::f{4}:)?(172\.1[6-9]|172\.2\d|172\.3[0-1])\.\d{1,3}\.\d{1,3}/,
			// 192.168.0.0 - 192.168.255.255
			/^(::f{4}:)?192\.168\.\d{1,3}\.\d{1,3}/,
			// fc00::/7
			/^f[c-d][0-9a-f]{2}(::1$|:[0-9a-f]{1,4}){1,7}/,
			// fe80::/10
			/^fe[89ab][0-9a-f](::1$|:[0-9a-f]{1,4}){1,7}/
		]

		return ( address === '::' || address === '::1' || ranges.some(function (it) { return it.test(address) }) );
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
	
		if( DOMAIN || HOSTNAME ) url += (DOMAIN || HOSTNAME);
		else url += ip;
	
		if(PUBLIC_PORT.charAt(0) == "/") {
			// Port is a unix socket!
			// Assume default port
		}
		else if(PUBLIC_PORT != 80) url += ":" + PUBLIC_PORT;
	
		url += "/";
	
		if(endPoint) url += endPoint + "/";
	
		//log("makeUrl: url=" + url + " endPoint=" + endPoint + " PUBLIC_PORT=" + PUBLIC_PORT + " USERNAME=" + USERNAME + " DOMAIN=" + DOMAIN + " HOSTNAME=" + HOSTNAME + " ip=" + ip);

		return url;
	}

	function randomString(letters) {
	
		if(letters == undefined) letters = 5;
	
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	
		for( var i=0; i < letters; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));
	
		return text;
	}

	function createUserWorker(username, uid, gid, homeDir, groups, rootPath) {
	
		// You can have different group and user. Default is the user/group running the node process
		var spawnOptions = {};
		var workerArgs = [
			"--loglevel=" + LOGLEVEL, 
			"--user=" + username, 
			"--uid=" + uid, 
			"--gid=" + gid, 
			"--home=" + homeDir, 
			"--virtualroot=" + VIRTUAL_ROOT,
			"--crazy=" + CRAZY
		];
		var workerNode = process.argv[0]; // First argument is the path to the nodejs executable!
	
		log("Spawn user_worker.js with workerNode=" + workerNode);

		// Using spawn instead of fork to be able to use Linux network namespaces
	
		spawnOptions.env = {
			username: username,
			HOME: homeDir,
			USER: username,
			LOGNAME: username,
			USER_NAME: username,
			//JAVA_OPTS: '-XX:+IgnoreUnrecognizedVMOptions --add-modules' // Makes it possible to run tools in ~/Android/Sdk/tools/bin
			JAVA_HOME: HOME_DIR + username + "/Android/android-studio/jre/",
			ANDROID_HOME:  HOME_DIR + username + "/Android/Sdk",
			EDITOR: "webide", // Assume bin/webider is copied to /usr/local/bin/
			VISUAL: "webide"
		}
	
		// The paths will be checked in order (so put local first)
		spawnOptions.env.PATH = "" + homeDir + ".npm-packages/bin:" + homeDir + ".local/bin:" + process.env.PATH;
		spawnOptions.env["NPM_CONFIG_PREFIX"] = homeDir + ".npm-packages";
		spawnOptions.env.NPM_PACKAGES = homeDir + ".npm-packages";

		if(groups) {
			// we have to manually serialize objects!
			spawnOptions.env.groups = JSON.stringify(groups);
		}
	
		// For forking when running in the Termux Android app
		if(module_os.platform()=="android") {
			spawnOptions.env["LD_LIBRARY_PATH"] = "/data/data/com.termux/files/usr/lib";
		}
	
		if(DOMAIN) spawnOptions.env.tld = DOMAIN;

		// Need to start the worker as root if network namespaces are used!
		if(NO_NETNS) {
			log("Spawning with uid=" + uid + " and gid=" + gid + " ...", DEBUG);
			if(uid != undefined) spawnOptions.uid = parseInt(uid);
			if(gid != undefined) spawnOptions.gid = parseInt(gid);
		
			spawnOptions.env.NO_NETNS="true"; // For debugging PATH variables

			// Q: Why are we overwriting path variable !?
			// A: Because SCM did not work in Windows!
			//spawnOptions.env.PATH =  process.env.PATH;
		}
		else {
			// Spawning as root
			spawnOptions.env.uid = uid;
			spawnOptions.env.gid = gid;
		
			// Assume unix like system
		
			spawnOptions.env.PORT = homeDir + "sock/test"; // Some Node.JS scripts read port from PORT by default. Make it use a unix socket instead of tcp port!
			spawnOptions.env.DOCKER_HOST = "tcp://" + UTIL.int2ip(167903234+uid) + ":2376";
		
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
			spawnOptions.env.DISPLAY = netnsIP + ":" + uid; // Users must first create their display using display.start
			spawnOptions.env.TLD = DOMAIN;
			spawnOptions.shell = EXEC_OPTIONS.shell;
		
			spawnOptions.stdio = ['pipe', 'pipe', 'pipe', "ipc"]; // ipc needed for sending messages to the worker
			// stdio: inherit sends log message to this process stdout, but that doesn't work when using network namespaces!
			var stdioPipe = true;
		}
		else {
			log("NO_NETNS=" + NO_NETNS + " uid=" + uid + " process.platform=" + process.platform);

			var command = workerNode;
			var args = [workerScript].concat(workerArgs);
			spawnOptions.stdio = ['inherit', 'inherit', 'inherit', "ipc"]; // ipc needed for sending messages to the worker
		}
	
		log("Spawning user worker process... username=" + username + " uid=" + uid + " gid=" + gid + " groups=" + JSON.stringify(groups), INFO);
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
			
				throw err;
			}
		}
	
		worker.on("message", messageFromWorker);
		worker.on("close", workerCloseHandler);
	
		worker.on("disconnect", function workerDisconnect() {
			console.log(username + " worker disconnect: worker.connected=" + worker.connected);
			setTimeout(function() {
				log("3 seconds after user worker (" + username + ") disconnect: worker.connected=" + worker.connected + " worker.exitCode=" + worker.exitCode + " (null means it's still running) worker.killed=" + worker.killed + " (if the worker have recieved a kill signal)    ");
			
			}, 3000);
		
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
			
				reportError(username + " worker process stderr: " + data);
			
			});

		}
	
		log(username + " worker pid=" + worker.pid);
	
		USER_WORKERS[username] = worker;
	
	
	
		function workerCloseHandler(code, signal) {
			log(username + " worker close: code=" + code + " signal=" + signal, INFO);
		
			if(!USER_CONNECTIONS.hasOwnProperty(username)) {
				delete USER_WORKERS[username];
				log("Not restarting worker process for " + username + " because there are no clients connected!", INFO);
				return;
			}
		
			var msg = "Your worker process closed with code=" + code + " and signal=" + signal;
		
			if(code !== 0) {
			
				log("Recreating user worker process for " + username);
				var recreateUserProcessSleepTime = 0;
				var timeSinceLastCrash = new Date() - USER_CONNECTIONS[username].lastUserWorkerCrash;
				console.log("timeSinceLastCrash=" + timeSinceLastCrash);
				if( timeSinceLastCrash > (10000 + recreateUserProcessSleepTime*2) ) recreateUserProcessSleepTime = 0;
				else recreateUserProcessSleepTime = 2000 + recreateUserProcessSleepTime * 2;
			
				USER_CONNECTIONS[username].lastUserWorkerCrash = new Date();
			
				msg += " Which means it crashed. And you should probably file a bug report!\n\n(worker process is being restarted in " + recreateUserProcessSleepTime/1000 + " seconds ...)";
			
				console.log("Waiting " + recreateUserProcessSleepTime/1000 + " seconds before restarting worker process for user " + username);
				setTimeout(function restartWorkerProcess() {
				
					// note: User connections share the same worker!
					var userWorkerInfo = {name: username, rootPath: rootPath, homeDir: homeDir, id: uid};
				
					createUserWorker(username, uid, gid, homeDir, groups, rootPath);
				
					USER_WORKERS[username].send({identify: userWorkerInfo});
				
				}, recreateUserProcessSleepTime);
			}
		
			sendToAll(username, {msg: msg, code: "WORKER_CLOSE"});
		
		}
	
		function messageFromWorker(workerMessage, handle) {
			//console.log("Worker message from " + username + ": " + UTIL.shortString(workerMessage) + " handle=" + handle);
		
			if(workerMessage.internal) {
				var cb = INTERNAL_USERWORKER_REQ[workerMessage.id];
				if(cb == undefined) throw new Error("Internal answer from user worker had no callback! workerMessage=" + JSON.stringify(workerMessage));
				cb(workerMessage.error ? {message: workerMessage.error, code: workerMessage.errorCode} : null, workerMessage.resp);
			}
			else if(workerMessage.resp) {
			
				//log("workerMessage.id=" + workerMessage.id, DEBUG);
			
				if(typeof workerMessage.id == "string") {
					var arr = workerMessage.id.split("|");
					var userConnectionId = parseInt(arr[0]);
					workerMessage.id = parseInt(arr[1]);
				}
				else throw new Error("Bad workerMessage.id=" + workerMessage.id + " typeof " + (typeof workerMessage.id));
			
				// Sanity check
				if( workerMessage.hasOwnProperty("echo") && workerMessage.hasOwnProperty("id") ) throw new Error("echo with id=" + workerMessage.id + ": " + JSON.stringify(workerMessage.echo, null, 2));
			
				if(!workerMessage.id && workerMessage.hasOwnProperty("resp")) throw new Error("No id in workerMessage with resp! workerMessage=" + JSON.stringify(workerMessage));
				if(!workerMessage.id && workerMessage.hasOwnProperty("error")) throw new Error("No id in workerMessage with error! workerMessage=" + JSON.stringify(workerMessage));
				// Possible cause: callback being called twice or a "resp" that should be an "event" instead.
			
				var str = JSON.stringify(workerMessage);
			
				if(!USER_CONNECTIONS.hasOwnProperty(username)) {
					log("No clients for " + username + " connected. Unable to deliver resp=" + UTIL.shortString(str), WARN);
					return;
					// Should we buffer it !? If the client restarted it will not recognize the request id
				}
			
				var conn = USER_CONNECTIONS[username].connections[userConnectionId];
				if(conn == undefined) {
					log("Unknown connection: userConnectionId=" + userConnectionId + " connections keys: " + Object.keys(USER_CONNECTIONS[username].connections) + " resp=" + UTIL.shortString(str), WARN);
					return;
				}
			
				log(getIp(conn) + "(" + userConnectionId + ") <= " + (workerMessage.id ? workerMessage.id : "") + UTIL.shortString(str, 256));
			
				conn.write(str);
			
			}
			else if(workerMessage.message) {
				log("Message from " + username + " worker: " + UTIL.shortString(JSON.stringify(workerMessage.message)), DEBUG);
				if(USER_CONNECTIONS.hasOwnProperty(username)) {
					sendToAll(username, workerMessage.message);
				}
				else {
					if(MESSAGE_BUFFER[username].length == MAX_MESSAGE_BUFFER) {
						MESSAGE_BUFFER[username].skipped = 0;
					}
				
					if(MESSAGE_BUFFER[username].length > MAX_MESSAGE_BUFFER) {
						MESSAGE_BUFFER[username].skipped++;
						log("MAX_MESSAGE_BUFFER=" + MAX_MESSAGE_BUFFER + " reached for " + username + ". Skipping message.", DEBUG)
					}
					else {
						log("Buffering message", DEBUG);
						MESSAGE_BUFFER[username].push(workerMessage.message);
					}
				}
			}
			else if(workerMessage.request) {
				// For special functionality ...
			
				var id = workerMessage.id;
				var req = workerMessage.request;
			
				if(id == undefined) throw new Error("Got worker request without a id! id=" + id);
			
				if(req.createHttpEndpoint) {
				
					var folder = req.createHttpEndpoint.folder;
				
					console.log("createHttpEndpoint: req.createHttpEndpoint.folder=" + req.createHttpEndpoint.folder + " folder=" + folder);
				
					createHttpEndpoint(username, folder, function(err, url) {
						if(err) workerResp(err);
						else workerResp(null, {url: url});
					});
				}
				else if(req.removeHttpEndpoint) {
				
					var folder = req.removeHttpEndpoint.folder;
				
					removeHttpEndpoint(username, folder, function(err, folder) {
						//if(err) throw err;
						workerResp(err, {folder: folder});
					});
				}
				else if(req.debugInBrowserVnc) {
					var url = req.debugInBrowserVnc.url;
					startChromiumBrowserInVnc(username, uid, gid, url, function(err, resp) {
						workerResp(err, resp);
					});
				}
				else if(req.googleDrive) {
					console.log("req.googleDrive=" + JSON.stringify(req.googleDrive));
					if(req.googleDrive.code) {
						if(!GCSF[username]) return workerResp(new Error("No active GCSF sessions for " + username));
						GCSF[username].enterCode(req.googleDrive.code, function(err, resp) {
							workerResp(err, resp);
						});
					}
					else if(req.googleDrive.umount) {
						// Both gcsfUmount and gcsfLogout will call gcsfCleanup() which closes any GCSF login or mount session
						gcsfUmount(username, function(umountError) {
							gcsfLogout(username, function(logoutErr) {
								var errMsg = "";
								if(umountError) errMsg += "Failed to umount!"; // Don't give too much info (might be sensitive)
								if(logoutErr) errMsg += "Failed to logout: " + logoutErr.message;
							
								workerResp(errMsg || null);
							});
						});
					}
					else if(req.googleDrive.cancelLogin) {
						if(!GCSF[username]) return workerResp(new Error("No active GCSF sessions for " + username));
					
						gcsfCleanup(username);
					
						return workerResp(null);
					
					}
					else {
						gcsfLogin(username, 0, function(err, resp) {
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

						var json = {filePath: fileName, fileData: {type: "jsstring", data: req.remoteFile.content} };
						socket.write(JSON.stringify(json) + "\n");
					}
					if(req.remoteFile.close) {
							// File closed
							socket.write(JSON.stringify({closeFile: fileName}) + "\n");
						}
						workerResp(null, true);
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
					startDropboxDaemon(username, uid, gid, homeDir, function(err, resp) {
						workerResp(err, resp);
					});
				}
				else if(req.checkDropboxDaemon) {
					checkDropboxDaemon(username, function(err, resp) {
						workerResp(err, resp);
					});
				}
				else if(req.stopDropboxDaemon) {
					stopDropboxDaemon(username, function(err, resp) {
						workerResp(err, resp);
					});
				}
				else if(req.vpn) {
					vpnCommand(username, homeDir, req.vpn, workerResp);
				}
				else if(req.dockerDaemon) {
					dockerDaemon(username, homeDir, uid, gid, req.dockerDaemon, workerResp);
				}
			
			
				else throw new Error("Unknown request from worker: " + JSON.stringify(req, null, 2));
			}
			else throw new Error("Bad message from worker: workerMessage=" + JSON.stringify(workerMessage, null, 2));
		
		
			function workerResp(err, resp) {
				if(id == undefined) throw new Error("id=" + id);
				var obj = {id: id, parentResponse: resp};
				if(err) obj.err = err.message ? {message: err.message, code: err.code, stack: err.stack} : err;
				worker.send(obj);
			}
		
		}
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
			gid: gid,
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
					else if(USER_CONNECTIONS.hasOwnProperty(username)) {
						sendToClient(username, "dropbox", {url: authUrl});
					}
					else {
						// No client is connected. Kill the Dropbox daemon
						stopDropboxDaemon(username);
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
				if(err) return callback(err);

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
	
		if(!module_ps) return callback(new Error("module_ps not loaded!"));

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
			var json = {};
			json[cmd] = obj;
		
			sendToAll(userConnectionName, json);
		}
	}

	function vpnCommand(username, homeDir, options, callback) {
		/*


			todo:  Check for netns /etc/netns/username/ first and send back an NONETNS error if it doesn't exist
		*/
		var commands = ["start", "stop", "status"];
		if(commands.indexOf(options.command) == -1) return callback( new Error("options.command=" + options.command + " not a valid VPN command! (" + JSON.stringify(commands) + ")") );
	
		log("vpnAction: username=" + username + " homeDir=" + homeDir + " options=" + JSON.stringify(options), DEBUG);
	
		if(INSIDE_DOCKER) {
			var error = new Error("VPN not available. Check server flags! Disabled by -insidedocker");
			error.code = "ENOSUPPORT";
			return callback(error);
		}

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


	function dockerDaemon(username, homeDir, uid, gid, options, callback) {
		"use strict";
	
		/*
		
			todo:
			* Shut down Docker VM when user leaves!
			* Fix issues with parcel live-reload
			* *  It doesn't seem to detect changes
			* * Make the port reachable! ex: d###.user.webide.se should proxy to the docker VM, and the terminal should detect that we are using docker in order to add the d infront of the port!?
			* * Or users might have to use socat to expose his/her docker deamon VM to https://####.user.webide.se eg. socat TCP-LISTEN:6565,fork,reuseaddr TCP:192.168.121.138:6565
			* * Or automatically detect open ports on the VM and run socat in the user netns. eg. sudo ip netns exec ltest1 socat TCP-LISTEN:6565,fork,reuseaddr TCP:172.17.0.2:6565
			* Make the docker VM use the user VPN 
			* Make VM IP address permanent: 
			* * virsh net-update default add-last ip-dhcp-host '<host mac="52:54:00:6f:78:f3" ip="192.168.122.222"/>' --live --config --parent-index 0
			* Block docker VM from accessing other user's netns!?
			* Use latest snapshot from the Docker base VM when creating the zvol!
		
			If you need to debug, you can ssh into the docker VM:
			sudo ssh -i /root/.ssh/dockervm docker@192.168.122.96
		
		
		
		*/
	
		if(options == undefined) return error(new Error("No options specified for the docker daemon! options=" + options));
	
		if(INSIDE_DOCKER) {
			var error = new Error("Docker inside docker currently not supported! (disabled by -insidedocker server flag)");
			error.code = "ENOSUPPORT";
			return callback(error);
		}

		if(DOCKER_LOCK.hasOwnProperty(username)) {
			return callback(new Error("Waiting for last command=" + DOCKER_LOCK[username]));
		}
	
		DOCKER_LOCK[username] = options.command;
	
		log("##############################################################");
		log(" DOCKER  " + username + "  " + options.command + "  uid=" + uid + "      ");
		log("##############################################################");
	
		var libvirtAddedToGroup = false;
		var abort = false;
		var dockerSshPubKey;
		var staticIP = UTIL.int2ip(167903234+uid); // 10.2.X.Y
		//var gateway = UTIL.int2ip(167772162 + uid); // no idea what I'm doing...
		// When the user activates a VPN we also want the Docker VM to use the VPN!
	
		sendToClient(username, "progress", [0,0]);
		sendToClient(username, "progress", [0,45]);
	
		// The user running libvirt need to have access to the user home dir in order to mount it
		// We however need to run libvirt as root in order to write to the mounted home dir!
		//checkLibVirtUser();
		checkZvol();
	
		function checkLibVirtUser() {
			// ### Make sure the libvirt-qemu user is a member of the user group (to be able to mount the user home dir in the docker VM)
			log(username + ":docker: checking if a libvirt-qemu user exist...", DEBUG);
			module_child_process.exec("grep -q libvirt-qemu: /etc/passwd", EXEC_OPTIONS, function(err, stdout, stderr) {
				if(err) return error("libvirt not installed on this server");
		
				progress();
			
				log(username + ":docker: checking if a libvirt-qemu user is part of " + username + " group...", DEBUG);
				module_child_process.exec("grep -q " + username + ":.*libvirt-qemu /etc/group", EXEC_OPTIONS, function(err, stdout, stderr) {
				
					if(err) {
						progress();
						log(username + ":docker: adding libvirt-qemu to " + username + " group...", INFO);
						module_child_process.exec("usermod -a -G " + username + " libvirt-qemu", EXEC_OPTIONS, function(err, stdout, stderr) {
							if(err) return error(err);
							progress();
							checkZvol();
						});
					}
					else {
						progress(2);
						log(username + ":docker: libvirt-qemu already member of group " + username + "", DEBUG);
						checkZvol();
					}
				});
			});
		}
	
		function checkZvol() {
			log(username + ":docker: checking if a zvol exist...", DEBUG);
			module_child_process.exec("zfs list", EXEC_OPTIONS, function(err, stdout, stderr) {
				if(err) return error(err);
			
				progress();
			
				// Is there a zvol we can copy from?
				var reDocker = /\s*(.*)\/docker/;
				var matchDocker = stdout.match(reDocker);
				if(!matchDocker) {
					log(username + ":docker: zfs list: stdout=" + stdout + " stderr=" + stderr + " reDocker=" + reDocker, DEBUG);
					var err = new Error("Found no zvol to copy from!");
					err.code = "MISSING_BASE_ZVOL";
					return error(err);
				}
			
				var zpool = matchDocker[1];
			
				if(zpool.indexOf(" ") != -1) throw new Error("zpool=" + zpool + " contains a space!");
			
				// Does user have a docker zvol?
			var reZvol = new RegExp("\\s*(.*)\\/docker_" + username + "\\s");
			var matchZvol = stdout.match(reZvol);
				if(!matchZvol) {
					log(username + ":docker: do not have a Docker VM zvol", DEBUG);
				
					if(options.command == "status" || options.command=="stop") return done({stopped: true, created: false});
				
					progress(0,2);
					createZvol(zpool);
				}
				else {
					var zpool = matchDocker[1];
				log(username + ":docker: Found Docker VM zvol: " + matchDocker[0], DEBUG);
					checkVM(zpool);
				}
			});
		}
	
		function checkVM(zpool) {
			if(zpool == undefined) throw new Error("zpool=" + zpool);
		
			// Check if a VM is configured
			log(username + ":docker: checking VM status...", DEBUG);
			module_child_process.exec("virsh list --all", EXEC_OPTIONS, function(err, stdout, stderr) {
				if(err) return error(err);
			
				progress();
			
				var reVM = new RegExp("docker_" + username + "\\s+(.*)");
				var matchVM = stdout.match(reVM);
				if(!matchVM) {
					log(username + ":docker: has no VM configured!", DEBUG);
				
					if(options.command == "status" || options.command=="stop") return done({stopped: true, created: false});
				
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
							return done({stopped: true, created: true});
						}
						else throw new Error("Unknown options.command=" + options.command);
					}
					else {
						/*
							Other states can be:
							paused: The VM has just been defined, and start command has just been issued!?
							dying: ?
							crashed: ?
						
						*/
					
						var err = new Error("Unknown vmStatus=" + vmStatus + " (username=" + username + ")");
						reportError(err);
						return error(err);
					}
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
	
		function ping(ipToPing, pingFail, restarted) {
		// Make sure the IP is reachable
		// Retry some times as it takes time for the server to boot!
		
		var maxTry = 20;
		
		if(!ipToPing) throw new Error("ipToPing=" + ipToPing + " IP=" + IP);
		
		if(pingFail == undefined) pingFail = 0;
		
		log(username + ":docker: pinging " + ipToPing + " ... pingFail=" + pingFail, DEBUG);
		module_child_process.exec("ping " + ipToPing + " -w1", function(err, stdout, stderr) {
			log(username + ":docker: ping " + ipToPing + ": err=" + (!!err) + " stdout=" + stdout + " stderr=" + stderr + "", DEBUG);
			
			progress();
			
			if(err) {
				pingFail++;
				
				log(username + ":docker: Docker VM ping fail! pingFail=" + pingFail, DEBUG);
				
				if(pingFail > maxTry) {
					if(restarted == undefined) {
						// The VM might need a restart
						log(username + ":docker: Attempting to restart Docker VM", DEBUG);
						return module_child_process.exec("virsh destroy docker_" + username + " && virsh start docker_" + username + "", function(err, stdout, stderr) {
							if(err) return error(err);
							progress(0,maxTry);
							log(username + ":docker: Docker VM restarted. Resuming ping...", DEBUG);
							return ping(ipToPing, 0, true);
						});
					}
					return error("Failed to ping the Docker deamon VM! pingFail=" + pingFail + " ipToPing=" + ipToPing);
				}

				ping(ipToPing, pingFail, restarted);
			}
			else {
				log(username + ":docker: Docker VM ping success! attempts=" + pingFail, DEBUG);
				
				progress(maxTry-pingFail);

				waitForSsh(ipToPing);
			}
		});
	}
	
	function startVM() {
		// Start the VM
		var name = "docker_" + username;
		log(username + ":docker: starting " + name + " VM ...", DEBUG);
		module_child_process.exec("virsh start " + name, EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			log(username + ":docker: Docker VM starting for " + username + " ...");
			
			checkIP();
		});
	}
	
	function stopVM() {
		var name = "docker_" + username;
		log(username + ":docker: stopping " + name + " VM ...", DEBUG);
		
		module_child_process.exec("virsh shutdown " + name + " --mode acpi", EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			
			progress();
			
			log(username + ":docker: Docker VM is shutting down...");
			
			if(options.command == "stop") {
				return done({stopped: true});
			}
			else throw new Error("Unexpected options.command=" + options.command);
			
		});
	}
	
	function checkIptables(IP) {
		var userIP =  UTIL.int2ip(167772162 + uid);
		
		// Needed so that the user can access the VM from the user netns
		// sudo iptables -I FORWARD 1 -s 10.0.3.235 -d 192.168.122.96 -j ACCEPT
		// sudo iptables -D FORWARD 1
		
		log(username + ":docker: checkign iptables...", DEBUG);
		module_child_process.exec("iptables -S FORWARD", function(err, stdout, stderr) {
			if(err) return error(err);
			progress();
			/*
				if libvirt daemons are restarted, the iptable rules will re re-added and we have to re-add aswell
				
				-A FORWARD -o virbr0 -j REJECT --reject-with icmp-port-unreachable
				
			*/
			
			var reUser = new RegExp(userIP + ".*" + IP);
			var reBlock = /-o virbr0 -j REJECT/;
			
			var matchUser = stdout.match(reUser);
			var matchBlock = stdout.match(reBlock);
			
			log(username + ":docker: iptables: matchUser=" + JSON.stringify(matchUser) + " matchBlock=" + JSON.stringify(matchBlock) + " reUser=" + reUser + " reBlock=" + reBlock + " matchBlock.index=" + (matchBlock && matchBlock.index) + " matchUser.index=" + (matchUser && matchUser.index) + " ", DEBUG);
			
			if(!matchUser || (matchBlock && matchBlock.index < matchUser.index)) {
				log(username + ":docker: updating iptables...", DEBUG);
				module_child_process.exec("iptables -I FORWARD 1 -s " + userIP + "/32 -d " + IP + "/32 -j ACCEPT", function(err, stdout, stderr) {
					progress();
					if(err) return error(err);
					
					ping(IP);
				});
			}
			else {
				// Rule exist!
				ping(IP);
			}
		});
	}
	
	function waitForSsh(IP, tries) {
		if(tries == undefined) tries = 0;

		module_child_process.exec('bash -c "echo > /dev/tcp/' + IP + '/22"', function(err) {
			if(++tries > 10) return error("Could not connect ot SSH server on IP=" + IP);
			else if(err) {
				log(username + ":docker: Waiting for SSH server on " + IP + " ...");
				setTimeout(function() {
					waitForSsh(IP, tries);
				}, 1000);
			}

			else configure(IP);

			progress();
		});
	}

	function configure(IP, dockerUser) {
		/*
			Things to do when booted: (see check_config_in_vm.sh)
			* Create the mount to user home dir
			* Set a static IP
			
			(.ssh/authorized_keys should already be set in the base image!)
			
		*/
		
		if(IP == undefined) throw new Error("IP=" + IP);
		if(dockerUser == undefined) {
			dockerUser = "docker";
			var homeDir = "/home/docker/";
		}
		else if(dockerUser == "root") {
			var homeDir = "/root/"
		}

		log(username + ":docker: copying config script to Docker daemon VM on " + IP, DEBUG);
			module_child_process.exec("scp -i /root/.ssh/dockervm -o ConnectTimeout=30 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR ../dockervm/check_config_in_vm.sh " + dockerUser + "@" + IP + ":" + homeDir, EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) {
				if(err.message.indexOf("Permission denied (publickey)") != -1 && dockerUser != "root") {
					return configure(IP, "root")
				}
				return error(err);
			}
			progress(10);
			
			log(username + ":docker: running config script via SSH on " + IP, DEBUG);
				module_child_process.exec("echo dockerpw | ssh -tt -i /root/.ssh/dockervm -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR " + dockerUser + "@" + IP + " sudo bash " + homeDir + "check_config_in_vm.sh " + username + " " + uid + " " + gid , EXEC_OPTIONS, function(err, stdout, stderr) {
				if(err) {
					
					// We might have been successful anyway!
					if(stdout.indexOf("SUCCESS!") != -1) return success();
					if(stdout.indexOf("userhome already mounted") != -1) return success();
					
					log(username + ":docker: config stdout=" + stdout);
					log(username + ":docker: config stderr=" + stderr);
					
					console.error(err);
					
					// Don't want to tell users about our week password :P So use a custom error
					return error("Unable to configure Docker daemon VM settings!");
				}
				else success();
				
				function success() {
					progress();
					
					if(options.command == "start" || options.command == "status") {
						return done({started: true, IP: IP, created: true});
					}
					else if(options.command == "stop") {
						throw new Error("Should not configure when shutting down!");
					}
					else throw new Error("Unknown options.command=" + options.command);
				}
			});
		});
		
		
	}
	
	function checkIP(attempts) {
		
		checkIptables(staticIP);
		return;
		
		// it might take some time for the libvirt dhcp to configure itself...
		if(attempts==undefined) attempts = 1;
		
		log(username + ":docker: checking domifaddr... attempts=" + attempts, DEBUG);
		module_child_process.exec("virsh domifaddr docker_" + username, function(err, stdout, stderr) {
			// vnet0      52:54:00:12:be:53    ipv4         192.168.122.96/24
			if(err) return error(err);
			
			log(username + ":docker: domifaddr: stdout=" + stdout + " stderr=" + stderr, DEBUG);
			
			progress();
			
			var reIP = /ipv4\s+(.*)\//;
			var matchIP = stdout.match(reIP);
			if(!matchIP) {
				log(username + ":docker: domifaddr: stdout=" + stdout + " stderr=" + stderr + " reIP=" + reIP + " username=" + username, DEBUG);
				
				if(attempts < 5) return checkIP(++attempts);
				
				return error("Unable to find Docker daemon VM IP! attempts=" + attempts);
			}
			
			var IP = matchIP[1];
			
			checkIptables(IP);
		});
	}
	
	function createZvol(zpool) {
		if(zpool == undefined) throw new Error("zpool=" + zpool);
		
		// Do we have a snapshot!?
		log(username + ":docker: listing zfs snapshots...", DEBUG);
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
			log(username + ":docker: cloning " + fullSnapshotName + " into " + cloneInto + " ...", DEBUG);
			module_child_process.exec("zfs clone -p " + fullSnapshotName + " " + cloneInto, EXEC_OPTIONS, function(err, stdout, stderr) {
				if(err) return error(err);
				else {
					progress();
					log(username + ":docker: VM zvol created");
					checkVM(zpool);
				}
			});
		});
	}
	
	function setupVM(zpool) {
		log(username + ":docker: setting up VM...");
		if(zpool == undefined) throw new Error("zpool=" + zpool);
		// Assuming we already have a zvol!
		
		function generateMAC() {
			for(var i=0,arr=[];i<6;i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			
			//log(JSON.stringify(arr));
			
			// Last octet should end with a binary 0 to make it unicast (or 1 for multicast). Eg the number should be even
			// Some documentation say "least-significant bit of the first octet ..."
			//log("arr[5]=" + arr[5] + " " + (arr[5]).toString(2));
			//arr[5] = parseInt(arr[5].toString(2).slice(0,2)+"0",2);
			arr[5] = roundEven(arr[5]);
			arr[0] = roundEven(arr[0]);
			//log("arr[5]=" + arr[5] + " " + (arr[5]).toString(2));
			
			// Second last octet should end with a binary 1 to indicate it's locally administered (or 0 for globally unique)
			//log("arr[4]=" + arr[4] + " " + (arr[4]).toString(2));
			//arr[4] = parseInt(arr[4].toString(2).slice(0,2)+"1",2);
			arr[4] = roundOdd(arr[4]);
			//log("arr[4]=" + arr[4] + " " + (arr[4]).toString(2));
			
			for(var i=0;i<6;i++) {
				arr[i] = arr[i].toString(16);
				if(arr[i].length<2) arr[i] = "0" + arr[i]; // Zero pad
				arr[i] = arr[i].toUpperCase();
			}
			
			return arr.join(":");
			
			function roundEven(n) {
				return 2 * Math.round(n / 2);
			}
			function roundOdd(n) {
				return  2* Math.floor(n/2) + 1;
			}
		}
		
		var MAC = generateMAC();
		log(username + ":docker: generated MAC=" + MAC);
		
		log(username + ":docker: checking ip-dhcp config...");
		module_child_process.exec('virsh net-dumpxml default', EXEC_OPTIONS, function(err, stdout, stderr) {
			if(err) return error(err);
			else {
				// <host mac='52:54:00:52:ba:dc' name='docker_ltest1' ip='10.2.3.235'/>
				
				var reIP = new RegExp("<host mac='(.*)'.* ip='" + staticIP + "'\\/>");
				var matchIP = stdout.match(reIP);
				if(!matchIP) {
					log(username + ":docker: reIP=" + reIP + " did not find a match in stdout=" + stdout, DEBUG);
					return addIP();
				}
				else {
					log(username + ":docker: found that a dhcp-host record already exist: " + matchIP[0], INFO);
					// Should we reuse the MAC!?
						return removeIP(matchIP[0]);
					}
				}
			});
		
			function addIP() {
				log(username + ':docker: adding ip-dhcp-host MAC=' + MAC + ' IP=' + staticIP + ' ...', DEBUG);
				module_child_process.exec('virsh net-update default add-last ip-dhcp-host \'<host mac="' + MAC + '" ip="' + staticIP + '"/>\' --live --config --parent-index 0', EXEC_OPTIONS, function(err, stdout, stderr) {
					if(err) {
						if(err.message.match(/network is not running/)) {
							log("Starting default libvirt network...");
							module_child_process.exec('virsh net-start default', EXEC_OPTIONS, function(err, stdout, stderr) {
								if(err) return error(err);
								addIP(); // Retry after starting network
							});
						}
						else return error(err);
					}
					else {
						progress();
						log(username + ":docker: Added staticIP=" + staticIP + " for MAC=" + MAC + "", INFO);
						defineVM();
					}
				});
			}
		
			function removeIP(dhcpHostStr) {
				// virsh net-dumpxml uses single quotes: <host mac='52:54:00:52:ba:dc' name='docker_ltest1' ip='10.2.3.235'/>
				log(username + ':docker: deleting ip-dhcp-host "' + dhcpHostStr + '" ...', DEBUG);
				module_child_process.exec('virsh net-update default delete ip-dhcp-host "' + dhcpHostStr + '" --live --config --parent-index 0', EXEC_OPTIONS, function(err, stdout, stderr) {
					if(err) return error(err);
					else {
						progress();
						log(username + ":docker: Removed " + dhcpHostStr, INFO);
						addIP();
					}
				});
			}
		
			function defineVM() {
				log(username + ":docker: reading docker_user.xml ...", DEBUG);
				var cpuModel = getCpuModel();

				module_fs.readFile("../dockervm/docker_user_" + cpuModel + ".xml", "utf8", function(err, xml) {
					if(err) return error(err);
				
					progress();
				
					xml = xml.replace(/<source dir='.*'\/>/, "<source dir='" + homeDir + "'/>");
				
					xml = xml.replace(/<source dev='.*'\/>/, "<source dev='/dev/zvol/" + zpool + "/docker_" + username + "'/>");
				
					xml = xml.replace(/<name>.*<\/name>/, "<name>docker_" + username + "</name>");
				
					xml = xml.replace(/<mac address='.*'\/>/, "<mac address='" + MAC + "'/>");
				
					var vmXmlPath = module_path.normalize(__dirname + "/../dockervm/docker_" + username + ".xml");
					log(username + ":docker: creating " + vmXmlPath + " ...", DEBUG);
					module_fs.writeFile(vmXmlPath, xml, function(err) {
						if(err) return error(err);
					
						progress();
					
						log(username + ":docker: defining " + vmXmlPath + " ...", DEBUG);
						module_child_process.exec("virsh define " + vmXmlPath, EXEC_OPTIONS, function(err, stdout, stderr) {
							if(err) return error(err);
						
							progress();
						
							log(username + ":docker: define stdout=" + stdout, INFO);
							log(username + ":docker: define stderr=" + stderr, WARN);
						
							startVM(true);
						
						});
					});
				});
			}
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
		
			delete DOCKER_LOCK[username];
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
		
			delete DOCKER_LOCK[username];
		}


	}

	function getCpuModel() {

		var model = module_os.cpus()[0].model;
		if( model.match(/^Intel/) ) return "intel";
		else if( model.match(/^AMD/) ) return "amd";
		else throw new Error("Unable to determine which or unsupported CPU model=" + model);

	}

	main();


