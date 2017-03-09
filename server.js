#!/usr/bin/env node

var UTIL = require("./UTIL.js");

var GS = String.fromCharCode(29);
var APC = String.fromCharCode(159);

var API = require("./server_api.js");

function main() {

	var port = 8099;

	var sockJs = require("sockjs");
	var wsServer = sockJs.createServer();
	wsServer.on("connection", connection);

	var http = require("http");
	var httpServer = http.createServer();
	httpServer.listen(port);
		wsServer.installHandlers(httpServer, {prefix:'/jzedit'});

	process.on("exit", function () {
	log("Program exit\n\n");
	});

	process.on("SIGINT", function sigInt() {
	log("Received SIGINT");

	httpServer.close();
		
		process.exit();

});

}


function connection(connection) {
	
	var user = null;
	var IP = connection.remoteAddress;
	var protocol = connection.protocol;
	var agent = connection.headers["user-agent"];
	var commandQueue = [];
	
	console.log("connection.remoteAddress=" + connection.remoteAddress);
	
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
		
		log(IP + " => " + message);
		
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
			
			if(!user) {
				
				console.log("json=" + JSON.stringify(json));
				
				if(command != "identify") commandQueue.push(message); // The user is trying to send a command before authorized
				else identify(json, IP, function(err, usr) {
					if(err) {
						log(err);
						send({error: err.message});
						//connection.close();
					}
					else {
						user = usr;
						
						user.connected(connection);
						
						user.IP = IP;
						
						send({resp: {user: user.name}})
						
						for(var i=0; i<commandQueue.length; i++) {
							handle(commandQueue[i]);
						}
						commandQueue.length = 0;
					}
				});
				
			}
			else {
				
				if( !API.hasOwnProperty(command) ) return send({error: "Unknown command=" + command + ": " + message});
				
				var funToRun = API[command];
				
				funToRun(user, json, function(err, answer) {
					if(err) {
						log(err + err.stack);
						
						send({error: "API error (" + err.message + "): " + message});
					}
					else {
						send({resp: answer});
					}
				});
				
			}
			
			function send(answer) {
				
				answer.id = id;
				
				var str = JSON.stringify(answer);
				log(IP + " <= " + str);
				connection.write(str);
			}
		}
		
		
		
	});
	connection.on("close", function() {
		
		log("Closed " + protocol + " from " + IP);
		
	});
	
}


function identify(json, IP, callback) {
	
	// Do not put this into the API because it would be weird handling user id
	
	if(json.hasOwnProperty("username") && json.hasOwnProperty("password")) {
		var fs = require("fs");
		
		fs.readFile("users.htpassw", "utf8", function(err, data) {
			if(err) throw err;
			
			// todo: use proper htpassw formatting
			
			// todo: use system users ? fork prosess and run under that user !?
			
			var row = data.split(/\r|\r\n/);
			
			var user;
			
			for(var i=0, test; i<row.length; i++) {
				test = row[i].split(":");
				if(test[0] == json.username && test[1] == json.password) userOK(i, test[0]);
				// Check all to prevent timing attack
			}
			
			if(user) callback(null, user);
			else callback(new Error("Wrong username=" + json.username + " or password"));
			
			function userOK(index, name) {
				user = new User(index, name);
				
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


function User(id, name) {
	var user = this;
	
	user.id = id;
	user.name = name;
	user.connections = {};
	user.workingDirectory = UTIL.trailingSlash(process.cwd());
	user.connection = null;
	
}

User.prototype.connected = function connected(connection) {
	var user = this;

	user.connection = connection;
}

User.prototype.disconnected = function disconnected() {
	var user = this;

	user.connection = null;
}

User.prototype.send = function send(msg) {
	var user = this;

	if(!user.connection) {
		console.warn("Unable to send msg. User name=" + user.name + " is not connected!");
		return;
	}
	
	var str = JSON.stringify(msg);
	log(user.IP + " <= " + str);
	connection.write(str);
	
}

User.prototype.changeWorkingDir = function changeWorkingDir(path) {
	var user = this;
	
	user.workingDirectory = path;
}

User.prototype.connectionClosed = function connectionClosed(protocol, serverAddress) {
	var user = this;
	
	// Notify the client about closed connection
	
	
	delete user.connections[serverAddress]; // Remove the connection
	
}


main();
