/*
	This is the server.js "CLIENT".
	
	Use CLIENT.cmd(cmd, jsonData, callback) to send commands to the server.
	
*/

var CLIENT = {}; // Client object is global


(function() {
	
	"use strict";
	
	console.log("Hello from CLIENT.js");
	
	var eventListeners = {};
	var counter = 0;
	var callbackWaitList = {};
	var cache = {};
	var connection;
	
	CLIENT.connected = false;
	
	CLIENT.connect = function(callback) {
		
		var apiUrl = "jzedit";
		var port = "8099";
		var host = "192.168.1.69";
		
		console.log("Connecting to jzedit server ...");
		//connection = new SockJS(apiUrl);
		connection = new SockJS('http://' + host + ':' + port + '/' + apiUrl, '', {debug: true});
		connection.onopen = function serverConnected() {
			console.log("connection open");
			CLIENT.connected = true;
			
			CLIENT.cmd("identify", {username: "demo", password: "demo"}, loggedIn);
			
			
			callback(null); // Don't wait for login, just callback and say we successfully connected
			callback = null; // Prevent calling the connect callback when connection is closed after a successful onopen
			
			CLIENT.fireEvent("connectionConnected");
			
			function loggedIn(err, resp) {
				if(err) {
					console.warn(err);
					CLIENT.fireEvent("loginFail");
				}
				else CLIENT.fireEvent("loginSuccessful");
			}
			
		}
		
		connection.onmessage = function serverMessage(e) {
			
			var msg = e.data;
			
			console.log("Server: " + msg);
			
			CLIENT.connected = true;
			
			if(msg.length == 0) console.warn("Recieved emty messsage from server");
			else {
				try {
					var json = JSON.parse(msg)
				}
				catch(err) {
					throw new Error("Unable to parse server message: " + msg);
					return;
				}
				
				
				if(json.resp) {
					for(var method in json.resp) {
						// Call event listeners
						if(eventListeners.hasOwnProperty(method)) {
							CLIENT.fireEvent(method, json.resp[method]);
						}
					}
				}
				
				if(json.id) {
					if(callbackWaitList.hasOwnProperty(json.id)) {
						callbackWaitList[json.id](json.error ? new Error("Server " + json.error) : null, json.resp);
						delete callbackWaitList[json.id];
					}
					else throw new Error("Can not find id=" + json.id + " in callbackWaitList=" + callbackWaitList);
				}
				else if(json.msg) {
					console.warn(json.msg);
					alert(json.msg);
				}
				else {
					throw new Error("Unexpected server response: " + JSON.stringify(json, null, 2));
				}
				
			}
		}
		
		connection.onclose = function serverDisconnected() {
			console.log("connection closed");
			CLIENT.connected = false;
			
			if(callback) {
				var err = new Error("Connection closed");
				err.code = "CONNECTION_CLOSED";
				callback(err);
			}
			
			CLIENT.fireEvent("connectionLost");
			
		}
		
	}
	
	CLIENT.disconnect = function disconnect() {
		connection.close();
		CLIENT.connected = false;
	}
	
	CLIENT.cmd = function cmd(req, json, callback) {
		
		// Second argument is either a callback function or a javascript object
		if(typeof json == "function" && callback == undefined) {
			callback = json;
			json = null;
		}
		else if(typeof json != "object") throw new Error("Second argument json (if specified) must be an object!");
		
		console.log("CLIENT.cmd req=" + req);
		
		var GS = String.fromCharCode(29);
		
		counter++;
		
		var id = counter;
		
		var string = id + GS + req
		
		if(json) string += GS + JSON.stringify(json);
		
		if(callback) callbackWaitList[id] = callback;
		else console.warn("No callback defined in req=" + req);
		
		connSend(string, function sendMessageToServer(err) {
			if(err) {
				console.log("connSend error: "+ err);
				if(callbackWaitList.hasOwnProperty(id)) {
					callbackWaitList[id](err);
					delete callbackWaitList[id];
				}
			}
		});
	}
	
	
	CLIENT.on = function addEventListener(ev, cb) {
		if(!eventListeners.hasOwnProperty(ev)) {
			console.warn("Adding new event to event listeners: " + ev);
			eventListeners[ev] = [];
		}
		
		eventListeners[ev].push(cb);
		
	}
	
	CLIENT.fireEvent = function fireEvent(ev, data) {
		
		if(!eventListeners.hasOwnProperty(ev)) console.warn("No registered event=" + ev)
		else {
			// Call all event listeners
			
			if(eventListeners[ev].length == 0) console.warn("No event listeners for event=" + ev);
			
			for(var i=0; i<eventListeners[ev].length; i++) eventListeners[ev][i](data);
			
		}
	}
	
	
	function connSend(msg, callback) {
		var websockOpen = 1;
		
		if(connection.readyState==websockOpen) {
			console.log("Sending: " + msg);
			connection.send(msg);
			if(callback) callback(null);
		}
		else {
			if(callback) {
				var err = new Error("Not connected to jzedit server");
				err.code = "CONNECTION_CLOSED";
				callback(err);
			}
			CLIENT.fireEvent("connectionLost");
			//serverMessage(formatText(currentChannel.name) + GS + formatText(nickName) + GS + formatText(text))
		}
		
	}
	
	console.log("End of CLIENT.js");
	
})();
