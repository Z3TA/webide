/*
	
	Signup "Micro"-service
	
	Lets people automatically signup to get an editor account by navigating to /signup/ in a web browser.
	
	See etc/jzedit_signup_service.nginx and etc/jzedit_signup.service (systemd)
	
	Provides an API via Websockets (SockJS) with the following Methods:
	usernameAvailable: username
	createAccount: username, password
	
	returns:
	availableError:username:message
	available:name:true||false
	createError:username:message
	created:username
	serviceError:message
	
*/

"use strict";

var DEFAULT = require("./server/default_settings.js");


// Don't allow these usernames
var RESERVED_USERNAMES = ["JavaScript", "JS", "admin", "root", "webtigerteam", "www", "ftp", "mail", "log", "smtp", "user", 
"users", "signup", "dashboard", "webdide", "email"]; 

var getArg = require("./shared/getArg.js");

var UTIL = require("./client/UTIL.js");

// For sending errors via email to an admin
var SMTP_PORT = getArg(["mp", "smtp_port"]) || DEFAULT.smtp_port;
var SMTP_HOST = getArg(["mh", "smtp_host"]) || DEFAULT.smtp_host;
var SMTP_USER = getArg(["mu", "smtp_user"]) || "";
var SMTP_PW = getArg(["mpw", "smtp_pass"]) || "";
var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin", "admin_email", "admin_mail"]) || DEFAULT.admin_email;

var HTTP_PORT = getArg(["p", "port"]) || DEFAULT.signup_http_port; 
if(!UTIL.isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))

var HTTP_IP = getArg(["ip", "ip"]) || DEFAULT.http_ip;

var HOSTNAME = getArg(["host", "host", "hostname"]) || HTTP_IP; // Same as "server_name" in nginx profile or "VirtualHost" on other web servers
var defaultHomeDir = DEFAULT.home_dir;
var HOME_DIR = getArg(["h", "homedir"]) || defaultHomeDir;
var NO_CERT = !!getArg(["nocert", "no_cert"]);

var serviceError = "The signup service has a problem!"; // Message to show if there's an internal error

var NO_PW_HASH = getArg(["nopwhash"]);

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number
// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var http = require("http");
var httpServer = http.createServer(handleHttpRequest);

httpServer.listen(HTTP_PORT, HTTP_IP);

var sockJs = require("sockjs");
var wsServer = sockJs.createServer();
wsServer.on("connection", sockJsConnection);

wsServer.installHandlers(httpServer, {prefix:'/signup'});

var log; // Using small caps because it looks and feels better
(function setLogginModule() { // Self calling function to not clutter script scope
	// Enhanced console.log ...
	var logModule = require("./shared/log.js");
	
	logModule.setLogLevel(LOGLEVEL);
	log = logModule.log;
	
	var logFile = getArg(["lf", "logfile"]) || null; // default: Write to stdout, if specified write to a file
	
	if(logFile) logModule.setLogFile(logFile);
	
})();

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

function handleHttpRequest(request, response){
	
	var IP = request.headers["x-real-ip"] || request.connection.remoteAddress;
	var origin = request.headers["origin"];
	
	log("HTTP " + request.method + " request from IP=" + IP + " origin=" + origin + " to request.url=" + request.url);
	
	var responseHeaders = {'Content-Type': 'text/plain; charset=utf-8'};
	
	// Handle CORS
	if(!origin) origin = "*";
	responseHeaders["Access-Control-Allow-Origin"] = origin;
	response.setHeader("Access-Control-Allow-Credentials", "true")
	
	
	if(request.method === "GET") {
		if (request.url === "/favicon.ico") {
			response.writeHead(404, "Not found", responseHeaders);
			response.end("Sorry, there's no favicon!");
		} 
		else {
			response.writeHead(404, "Not found", responseHeaders);
			response.end('This is the signup service for ' + HOSTNAME + ' editor.\nYou need to connect using SockJS. Or navigate to https://' + HOSTNAME + '/signup/signup.html\n');
}
	}
	else if(request.method === "POST") {
		if (request.url === "/createAccount") {
			var requestBody = '';
			request.on('data', function(data) {
				requestBody += data;
				if(requestBody.length > 1e7) {
					response.writeHead(413, 'Request Entity Too Large', responseHeaders);
					response.end('Request Entity Too Large');
				}
			});
			request.on('end', function() {
var qs = require('querystring');
				var formData = qs.parse(requestBody);
				var data = formData.user + "," + formData.pw; 
				usernameAvailable(data, function available(err, name, isAvailable) {
					if(err) {
						response.writeHead(500, 'Error', responseHeaders);
						response.end(err.message);
					}
					else if(!isAvailable) {
						response.writeHead(404, 'Error', responseHeaders);
						response.end("Username is not available: " + name);
					}
					else createAccount(data, function account(err, username) {
						if(err) {
answer("createError:" + username + ":" + HOSTNAME + ":" + err);
							response.writeHead(500, 'Error', responseHeaders);
							response.end(err.message);
						}
						else {
							response.writeHead(200, 'OK', responseHeaders);
							response.end("User " + username + " successfully created!");
							sendMail("jzedit_signup_service@" + HOSTNAME, ADMIN_EMAIL, username + " signed up to " + HOSTNAME, username + " signed up from " + IP + " using HTTP POST");
						}
					});
				});
				});
		}
		else {
			response.writeHead(404, 'Resource Not Found', responseHeaders);
			response.end('Can not handle HTTP POST requests to ' + request.url);
		}
	}
	else {
		response.writeHead(405, 'Method Not Supported', {'Content-Type': 'text/html'});
		return response.end('<!doctype html><html><head><title>405</title></head><body>405: Method Not Supported</body></html>');
	}
}


function sockJsConnection(connection) {
	
	var IP = connection.remoteAddress;
	
	if(IP == undefined || IP == "127.0.0.1") {
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
	
	log("Connection on " + connection.protocol + " from " + IP);
	
	connection.on("data", function sockJsData(message) {
		
		log(IP + " => " + UTIL.shortString(message));
		
		// message: command:data
		
		var command = message.substring(0, message.indexOf(":"));
		var data = message.substring(message.indexOf(":")+1);
		
		if(!command) answer("Unknown command in message: " + message);
		else if(!data) answer("No data in message: " + message);
		else if(command == "usernameAvailable") usernameAvailable(data, function available(err, name, isAvailable) {
			if(err) answer("availableError:" + name + ":" + err);
			else answer("available:" + name + ":" + isAvailable);
		});
		else if(command == "createAccount") usernameAvailable(data, function available(err, name, isAvailable) {
			if(err) answer("availableError:" + name + ":" + err);
			else if(!isAvailable) answer("available:" + name + ":" + isAvailable);
			else createAccount(data, function account(err, username) {
				if(err) answer("createError:" + username + ":" + HOSTNAME + ":" + err);
				else {
					answer("created:" + username + ":" + HOSTNAME);
					sendMail("jzedit_signup_service@" + HOSTNAME, ADMIN_EMAIL, username + " signed up to " + HOSTNAME, username + " signed up from " + IP + " using sockJS connection");
				}
			});
		});
		else answer("serviceError:Unknown command: " + command);
		
		
		function answer(str) {
			log(IP + " <= " + UTIL.shortString(str));
			connection.write(str);
		}
	});
	}

function usernameAvailable(username, callback) {
	var fs = require("fs");
	
	username = username.split(",")[0];
	
	if(RESERVED_USERNAMES.indexOf(username) != -1) return callback(null, username, false);
	
	var encoding = "utf8";
	var notAvailable = false;
	
	fs.readdir(HOME_DIR, function(err, homeDirs) {
		
		if(err) {
			log("Unable to read home dirs HOME_DIR=" + HOME_DIR + "! " + err.message, ERROR);
			callback(serviceError);
			sendAlert(err.message + "\n" + err.stack);
		}
		else {
			//console.log("usersPwString:\n" + usersPwString);
			
			for (var i=0, name; i<homeDirs.length; i++) {
				name = homeDirs[i];
				//log("name=" + name + " == " + username + " ?", 7);
				if(name == username) return callback(null, name, notAvailable);
			}
			
			// Also check for system users
			fs.readFile("/etc/passwd", encoding, function(err, usersPwString) {
				//console.log("usersPwString:\n" + usersPwString);
				var users = usersPwString.split(/\n|\r\n/);
				for (var i=0, name; i<users.length; i++) {
					name = users[i].substring(0, users[i].indexOf(":"));
					//log("name=" + name + " == " + username + " ?", 7);
					if(name == username) return callback(null, name, notAvailable);
				}
				
				return callback(null, username, true);
				
			});
		}
	});
}

function createAccount(userData, callback) {
	console.time("createAccount");
	var username = userData.substring(0, userData.indexOf(","));
	var password = userData.substring(userData.indexOf(",") + 1);
	
	if(username.match(/[^a-zA-Z0-9]/)) return callback("Username can only contain letters a-z, A-Z, 0-9");
	if(username.match(/^guest.*/i)) return callback("Username can not start with guest!");
	
	var exec = require('child_process').exec;
	
	// Pass the arguments as JSON in case some hacker use -pwfile /etc/something in their password
	var commandArg = {
		username: username,
		password: password,
		noPwHash: !!NO_PW_HASH, // bang bang (!!) converts the value to a boolean
		noCert: NO_CERT
	};
	
	// Enclose argument with '' to send it "as is" (bash/sh will remove ")
	var command = "./adduser.js '" + JSON.stringify(commandArg) + "'";
	console.log("command=" + command);
	var options = {
		cwd: __dirname
	}
	exec(command, options, function adduser(error, stdout, stderr) {
		if (error) {
			log("Unable to create username=" + username + "! error=" + error, ERROR);
			callback(serviceError, username);
			sendAlert(error);
		}
		else if(stderr) {
			log(stderr, DEBUG);
			log("Unable to create username=" + username + "! stderr=" + stderr, ERROR);
			callback(serviceError, username);
			sendAlert(stderr);
		}
		else if(stdout) {
			log("stdout=" + stdout, DEBUG);
			var checkre = /User with username=(.*) and password=(.*) successfully added/g;
			var check = checkre.exec(stdout);
			// User with username=demo4 and password=demo4 successfully added!
			var reG1User = check[1];
			var reG2Pw = check[2];
			
			if(check == null) {
				log("Unable to create username=" + username + "! checkre=" + checkre + " failed! check=" + check + " stdout=" + stdout, ERROR);
				callback(serviceError, username);
				sendAlert("check=" + check + " failed on stdout=" + stdout);
			}
			else if(reG1User == username && reG2Pw == password) {
				log("Account username=" + username + "! successfully created!");
				callback(null, username);
			}
			else {
				log("Problem when creating username=" + username + " with password=" + password +
				" reG1User=" + reG1User + " reG2Pw=" + reG2Pw + " " +
				" check=" + JSON.stringify(check, null, 2) + " stdout=" + stdout, ERROR);
				
				callback(serviceError, username);
				sendAlert("Problem when creating username=" + username + " with password=" + password +
				" check=" + JSON.stringify(check, null, 2) + " stdout=" + stdout);
				
			}
			
			console.timeEnd("createAccount");
		}
		else {
			log("Problem when creating username=" + username + "! Exec command=" + command + " did not return anyting!", ERROR);
			callback(serviceError, username);
			sendAlert(stdout);
		}
		
	});
}

function sendAlert(text) {
	
	sendMail("jzedit_signup_service@" + HOSTNAME, ADMIN_EMAIL, "JZedit cloud editor signup problems", text);
	
}

function sendMail(from, to, subject, text) {
	
	log( "Sending mail from=" + from + " to=" + to + " subject=" + subject + " text.length=" + text.length + "" );
	
	var nodemailer = require('nodemailer');
	var smtpTransport = require('nodemailer-smtp-transport');
	
	var mailSettings = {
		port: SMTP_PORT,
		host: SMTP_HOST
	};
	
	if(SMTP_USER) mailSettings.auth = {user: SMTP_USER, pass: SMTP_PW};
	
	var transporter = nodemailer.createTransport(smtpTransport(mailSettings));
	
	transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: text
		
	}, function(err, info){
		if(err) {
			if(err.message.match(/Hostname\/IP doesn't match certificate's altnames: "IP: (192\.168\.0\.1)|(127\.0\.0\.1) is not in the cert's list/)) {
				console.warn(err.message);
			}
			else throw new Error(err);
		}
		else {
			log("Mail sent: " + info.response);
		}
	});
	
}