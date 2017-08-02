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

var RESERVED_USERNAMES = ["JavaScript", "JS", "admin", "root", "webtigerteam", "www", "ftp", "mail", "log", "smtp", "user", "users"]; // Don't allow these usernames
	
	var getArg = require("./server/getArg.js");
	
var HOSTNAME = getArg(["host", "host", "hostname"]) || HTTP_IP; // Same as "server_name" in nginx profile or "VirtualHost" on other web servers

	var UTIL = require("./client/UTIL.js");
	
	var HTTP_PORT = getArg(["p", "port"]) || 8100; 
	if(!UTIL.isNumeric(HTTP_PORT)) throw new Error("HTTP_PORT=" + HTTP_PORT + " is not a numeric value! process arguments=" + process.argv.join(" "))
	
	var HTTP_IP = getArg(["ip", "ip"]) || "127.0.0.1";
	
	var ADMIN_EMAIL = getArg(["admin", "admin", "admin_email"]) || "zeta@zetafiles.org";
	
	var serviceError = "The signup service has a problem!"; // Message to show if there's an internal error
	
	var NO_PW_HASH = getArg(["nopwhash"]);
	var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || "/etc/jzedit_users";
	
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
		var logModule = require("./server/log.js");
		
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
		
		log("HTTP request from IP=" + IP + " to request.url=" + request.url);
		
		var responseHeaders = {'Content-Type': 'text/plain; charset=utf-8'};
		
		response.writeHead(404, "Not found", responseHeaders);
		response.end("Nothing to see here");
		
	}
	
	function sockJsConnection(connection) {
		
		var IP = connection.remoteAddress;
		
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
		
		log("Connection on " + connection.protocol + " from " + IP);
		
		connection.on("data", function(message) {
			
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
			else if(command == "createAccount") createAccount(data, function account(err, username) {
			if(err) answer("createError:" + username + ":" + HOSTNAME + ":" + err);
			else answer("created:" + username + ":" + HOSTNAME);
			});
			else answer("serviceError:Unknown command: " + command);
			
			
			function answer(str) {
				log(IP + " <= " + UTIL.shortString(str));
				connection.write(str);
			}
		});
		
		
		function usernameAvailable(username, callback) {
			var fs = require("fs");
			
		if(RESERVED_USERNAMES.indexOf(username) != -1) return callback(null, username, false);
			
			var encoding = "utf8";
			
			fs.readFile(PW_FILE, encoding, function(err, usersPwString) {
				
				if(err) {
					log("Unable to read PW_FILE=" + PW_FILE + "! " + err.message, ERROR);
					callback(serviceError);
					sendAlert(err.message + "\n" + err.stack);
				}
				else {
					console.log("usersPwString:\n" + usersPwString);
					var users = usersPwString.split(/\r|\r\n/);
					for (var i=0, name; i<users.length; i++) {
						name = users[i].substring(0, users[i].indexOf("|"));
						if(name == username) return callback(null, name, false);
					}
					
					// Also check for system users
					fs.readFile("/etc/passwd", encoding, function(err, usersPwString) {
						console.log("usersPwString:\n" + usersPwString);
						var users = usersPwString.split(/\r|\r\n/);
						for (var i=0, name; i<users.length; i++) {
							name = users[i].substring(0, users[i].indexOf(":"));
							if(name == username) return callback(null, name, false);
						}
						
						return callback(null, username, true);
						
					});
					
					
				}
			});
		}
		
		function createAccount(userData, callback) {
			var username = userData.substring(0, userData.indexOf(","));
			var password = userData.substring(userData.indexOf(",") + 1);
			
			var exec = require('child_process').exec;
			var script = 'adduser.js';
			exec(script, function adduser(error, stdout, stderr) {
				if (error) {
					log("Unable to create username=" + username + "! error=" + error, ERROR);
					callback(serviceError);
					sendAlert(error);
				}
				else if(stderr) {
					log("Unable to create username=" + username + "! stderr=" + stderr, ERROR);
					callback(serviceError);
					sendAlert(stderr);
				}
				else if(stdout) {
					var check = stdout.match(/User with username=(.*) and password=(.*) successfully added to (.*)/);
					
					if(check == null) {
						log("Unable to create username=" + username + "! stdout=" + stdout, ERROR);
						callback(serviceError);
						sendAlert(stdout);
					}
					else if(check[2] == username && check[3] == password && check[4] == PW_FILE) {
						log("Account username=" + username + "! successfully created!");
						callback(null, username);
					}
					else {
						log("Problem when creating username=" + username + "! stdout=" + stdout, ERROR);
						callback(serviceError);
						sendAlert(stdout);
					}
				}
				else {
					log("Problem when creating username=" + username + "! Exec script=" + script + " did not return anyting! arguments=" + JSON.stringify(arguments), ERROR);
					callback(serviceError);
					sendAlert(stdout);
				}
				
			});
		}
		
		
	}
	
	function sendAlert(text) {
		
		sendMail("errors@webtigerteam.com", ADMIN_EMAIL, "JZedit cloud editor signup problems", text);
		
	}
	
	function sendMail(from, to, subject, text) {
		
		log("Sending mail from=" + from + " to=" + to + " subject=" + subject + " text=" + text);
		
		var nodemailer = require('nodemailer');
		var smtpTransport = require('nodemailer-smtp-transport');
		
		var mailSettings = {};
		mailSettings.port = 25;
		mailSettings.host = "127.0.0.1"; // Need to allow relay from 127.0.0.1 !
		
		
		var transporter = nodemailer.createTransport(smtpTransport(mailSettings));
		
		transporter.sendMail({
			from: from,
			to: to,
			subject: subject,
			text: text
			
		}, function(error, info){
			if(error) {
				throw new Error(error);
			}
			else {
				log("Mail sent: " + info.response);
			}
		});
		
	}