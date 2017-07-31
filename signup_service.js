/*
	
	Lets people signup to get an editor account. 
	
	See jzedit_signup_service.nginx and jzedit_signup.service (systemd)
	
	Provides an API via Websockets (SockJS) with the following Methods:
	usernameAvailable: username
	createAccount: username, password
	
*/

"use strict";

var ADMIN_EMAIL = getArg(["email", "email", "admin_email"]) || "zeta@zetafiles.org"; 

var serviceError = "The signup service has a problem!"; // Message to show if there's an internal error

var getArg = require("../server/getArg.js");

var NO_PW_HASH = getArg(["nopwhash"]);
var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || "/etc/jzedit_users";

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number
// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var httpServer = http.createServer(handleHttpRequest);

httpServer.listen(HTTP_PORT, HTTP_IP);

var sockJs = require("sockjs");
var wsServer = sockJs.createServer();
wsServer.on("connection", sockJsConnection);

wsServer.installHandlers(httpServer, {prefix:'/signup'});

var log; // Using small caps because it looks and feels better
(function setLogginModule() { // Self calling function to not clutter script scope
	// Enhanced console.log ...
	var logModule = require("./log.js");
	
	logModule.setLogLevel(LOGLEVEL);
	log = logModule.log;
	
	var logFile = getArg(["lf", "logfile"]) || null; // default: Write to stdout, if specified write to a file
	
	if(logFile) logModule.setLogFile(logFile);
	
})();

function handleHttpRequest(request, response){
	
	var IP = request.headers["x-real-ip"] || request.connection.remoteAddress;
	
	log("HTTP request from IP=" + IP + " to request.url=" + request.url);
	
	var responseHeaders = {'Content-Type': 'text/plain; charset=utf-8'};
	
	response.writeHead(404, "Not found", responseHeaders);
	response.end("Nothing to see here");
	
});

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
		
		var command = message.substring(message.indexOf(":"));
		var data = message.substring(message.indexOf(":")+1);
		
		if(!command) answer("Unknown command in message: " + message);
		else if(!data) answer("No data in message: " + message);
		else if(command == "usernameAvailable") usernameAvailable(data);
		else if(command == "createAccount") createAccount(data);
		else answer("Unknown command: " + command);
		
	});
	
	function answer(str) {
		log(IP + " <= " + UTIL.shortString(str));
		connection.write(str);
	}
	
	function usernameAvailable(username) {
		var fs = require("fs");
		
		var encoding = "utf8";
		fs.readFile(PW_FILE, encoding, function(err, userPassw) {
			if(err) {
				log("Unable to read PW_FILE=" + PW_FILE + "! " + err.message, ERROR);
				answer(serviceError);
				sendAlert(err.message + "\n" + err.stack);
			}
			else {
				... i am here yo!
			}
		});
	}
	
	function createAccount(userData) {
		var username = userData.substring(0, userData.indexOf(","));
		var password = userData.substring(userData.indexOf(",") + 1);
		
		
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
		if(error){
			throw new Error(error);
		}
		else{
			log("Mail sent: " + info.response);
		}
	});
	
}