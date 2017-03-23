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
	
	CLIENT.connect = function(server, callback) {
		
		var defaultApi = "jzedit";
		var defaultPort = "8099";
		var defaultHost = "192.168.1.69";
		
		if(server == undefined) server = {api: defaultApi, port: defaultPort, host: defaultHost};
		
		var apiUrl = server.api || defaultApi;
		var port = server.port || defaultPort;
		var host = server.host || defaultHost;
		
		console.log("Connecting to jzedit server ...");
		//connection = new SockJS(apiUrl);
		connection = new SockJS('http://' + host + ':' + port + '/' + apiUrl, '', {debug: true});
		connection.onopen = function serverConnected() {
			console.log("connected to server=" + JSON.stringify(server));
			CLIENT.connected = true;
			
			//CLIENT.cmd("identify", {username: "demo", password: "demo"}, loggedIn);
			//CLIENT.cmd("identify", {username: "admin", password: "admin"}, loggedIn);
			
			if(callback) callback(null); // Don't wait for login, just callback and say we successfully connected
			callback = null; // Prevent calling the connect callback when connection is closed after a successful onopen
			
			CLIENT.fireEvent("connectionConnected");
			
			function loggedIn(err, resp) {
				if(err) {
					console.warn(err);
					CLIENT.fireEvent("loginFail");
					alertBox(err.message);
				}
				else {
					if(!resp.cId) throw new Error("Got no client id from server!");
					CLIENT.connectionId = resp.cId;
					CLIENT.fireEvent("loginSuccess");
				}
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
				
				if(json.error) console.warn("Server ERROR: " + json.error);
				
				if((json.resp || json.event)) {
					var resp = json.resp || json.event;
					for(var method in resp) {
						// Call event listeners
						if(eventListeners.hasOwnProperty(method)) {
							CLIENT.fireEvent(method, resp[method]);
						}
						else console.warn("No event listeners for method/event: '" + method + "' data=" + JSON.stringify(resp[method]));
					}
				}
				
				if(json.id) {
					if(callbackWaitList.hasOwnProperty(json.id)) {
						callbackWaitList[json.id](json.error ? new Error("Server: " + json.error) : null, json.resp);
						delete callbackWaitList[json.id];
					}
					else throw new Error("Can not find id=" + json.id + " in callbackWaitList=" + callbackWaitList);
				}
				else if(json.msg) {
					console.warn(json.msg);
					alertBox(json.msg);
				}
				else if(!json.resp) {
					
					for(var method in json) {
						if(eventListeners.hasOwnProperty(method)) {
							CLIENT.fireEvent(method, json[method]);
						}
						else throw new Error("Unexpected server response (method=" + method + "): " + JSON.stringify(json, null, 2));
					}

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
			
			
			// Attempt to reconnect ...
			
			setTimeout(function reconnect() {
				
				if(CLIENT.connected) return;
				
				console.log("Reconnecting to server=" + JSON.stringify(server));
				CLIENT.connect(server);
				
			}, 2000);
			
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
		
		console.log("firing client event '" + ev + "' data=" + data);
		
		if(!eventListeners.hasOwnProperty(ev)) console.warn("No registered event=" + ev)
		else {
			// Call all event listeners
			
			if(eventListeners[ev].length == 0) console.warn("No event listeners for event=" + ev);
			
			for(var i=0; i<eventListeners[ev].length; i++) eventListeners[ev][i](data);
			
		}
	}
	
	
	CLIENT.removeEvent = function(eventName, fun) {
		/*
			Note to myself: Some events have objects and others just have the function!!
			
		*/
		var fname = UTIL.getFunctionName(fun);
		var events = eventListeners[eventName];
		var found = 0;
		
		removeit(); // Removes them all (recursive)
		
		function removeit() {
			for(var i=0; i<events.length; i++) {
				if(events[i].fun == fun) {
					events.splice(i, 1);
					found++;
					removeit();
					break;
				}
			}
		}
		console.log("Removed " + found + " occurrences of " + fname + " from " + eventName);
	}

	
	function connSend(msg, callback) {
		var websockOpen = 1;
		
		if(connection.readyState==websockOpen) {
			if(msg.length > 100) console.log("Sending: " + msg.length + " characters to server ...");
			else console.log("Sending: " + msg + " to server ...");
			
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
