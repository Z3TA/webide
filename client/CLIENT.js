/*
	This is the server.js "CLIENT".
	
	Use CLIENT.cmd(cmd, jsonData, callback) to send commands to the server.
	
*/

var CLIENT = {}; // Client object is global


(function() {
	
	"use strict";
	
	console.log("Hello from CLIENT.js");
	
	var eventListeners = {}; // Events are added on demand via CLIENT.on("someEvent"). It can be *anything* so that you can easaily add new server events
	var counter = 0;
	var callbackWaitList = {};
	var cache = {};
	var connection = {readyState: 0};
	
	CLIENT.connected = false;
	
	CLIENT.connect = function(server, callback) {
		
		var loc = UTIL.getLocation(window.location.href);
		var protocol = loc.protocol;
		
		if(!protocol) throw new Error("Unable to get protocol from window.location.href=" + window.location.href);

		console.log("protocol=" + protocol + " loc=" + JSON.stringify(loc, null, 2));

		var defaultURL = loc.protocol + "://" + loc.host + "/jzedit"; // loc.host includes port!
		
		if(protocol.toLowerCase() == "file") {
			defaultURL = "http://localhost:8099/jzedit";
			
			if(runtime == "browser") console.warn("It's recommended to access the editor via a HTTP server!");
		}
		
		console.log("defaultURL=" + defaultURL);
		
		if(server == undefined) server = {url: defaultURL};
		
		var url = server.url || defaultURL; // 'http://' + host + ':' + port + pathName + apiUrl
		
		console.log("Connecting to jzedit server: url=" + url);
		//connection = new SockJS(apiUrl);
		
		var sockJsReservedQuirk = '';
		var sockJsOptions = {debug: true};
		
		connection = new SockJS(url, sockJsReservedQuirk, sockJsOptions); 
		connection.onopen = function serverConnected() {
			console.log("connected to server=" + JSON.stringify(server));
			CLIENT.connected = true;
			CLIENT.url = url;
			
			//CLIENT.cmd("identify", {username: "demo", password: "demo"}, loggedIn);
			//CLIENT.cmd("identify", {username: "admin", password: "admin"}, loggedIn);
			
			console.log("connection.onopen: connection.readyState=" + connection.readyState);
			// readyState when using xhr !? Wait for readyState !?
			
			if(callback) callback(null); // Don't wait for login, just callback and say we successfully connected
			callback = null; // Prevent calling the connect callback when connection is closed after a successful onopen
			
			CLIENT.fireEvent("connectionConnected");
			
			function loggedIn(err, resp) {
				if(err) {
					console.warn(err);
					alertBox(err.message);
				}
				else {
					if(!resp.loginSuccess) throw new Error("Did not get loginSuccess!");
					if(!resp.loginSuccess.cId) throw new Error("Got no client id from server!");
					// CLIENT.connectionId is set further down: CLIENT.on("loginSuccess", )
				}
			}
		}
		
		connection.onmessage = function serverMessage(e) {
			
			var msg = e.data;
			
			console.log("Server: " + UTIL.shortString(msg));
			
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
				
				if(json.resp) {
					var resp = json.resp;
					for(var method in resp) {
						// Call event listeners
						// note: event listeners are also called If json has no id, and no resp ...
						if(eventListeners.hasOwnProperty(method)) {
							CLIENT.fireEvent(method, resp[method]);
						}
						//else console.log("No event listeners for method/event: '" + method + "' data=" + JSON.stringify(resp[method]));
					}
				}
				
				if(json.id) {
					if(callbackWaitList.hasOwnProperty(json.id)) {
						
						var err = null;
						
						if(json.error) {
							err = new Error("Server: " + json.error);
							if(json.errorCode) err.code = json.errorCode;
						}
						
						callbackWaitList[json.id](err, json.resp);
						delete callbackWaitList[json.id];
					}
					
					else throw new Error("Can not find id=" + json.id + " in callbackWaitList=" + callbackWaitList);
					// If the above happends, check to make sure the callback in the server command is only called once!
					
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
						// Might be an event without a listener!
					}

				}
				
			}
		}
		
		connection.onclose = function serverDisconnected() {
			console.log("connection closed");
			CLIENT.connected = false;
			CLIENT.url = null;
			
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
		console.log("Disconnecting from editor server url=" + CLIENT.url);
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
		
		if(eventListeners[ev].indexOf(cb) != -1) throw new Error("Event listener already registered for ev=" + ev + " and cb=" + cb);
		
		eventListeners[ev].push(cb);
		
	}
	
	CLIENT.fireEvent = function fireEvent(ev, data) {
		
		console.log("firing client event '" + ev + "' data=" + data);
		
		if(!eventListeners.hasOwnProperty(ev)) console.warn("No registered event listener for ev=" + ev)
		else {
			// Call all event listeners
			
			if(eventListeners[ev].length == 0) console.warn("No event listeners for event=" + ev);
			
			for(var i=0; i<eventListeners[ev].length; i++) eventListeners[ev][i](data);
			
		}
	}
	
	
	CLIENT.removeEvent = function(eventName, fun) {
		
		if(!eventListeners.hasOwnProperty(eventName)) {
			console.warn("Unknown event: eventName=" + eventName);
			return;
		}
		
		var fname = UTIL.getFunctionName(fun);
		var events = eventListeners[eventName];
		var found = 0;
		
		removeThem(); // Removes them all (recursive)
			
		function removeThem() {
			for(var i=0; i<events.length; i++) {
				if(events[i] == fun) {
					events.splice(i, 1);
					found++;
					removeThem();
					break;
				}
			}
		}
		console.log("Removed " + found + " occurrences of " + fname + " from " + eventName);
	}

	CLIENT.on("loginSuccess", function(json) {
		if(json.cId == undefined) throw new Error("Did not get cId from loginSuccess event!");
		CLIENT.connectionId = json.cId;
	});
	
	
	function connSend(msg, callback) {
		var websockOpen = 1;
		
		if(connection.readyState==websockOpen) {
			if(msg.length > 100) console.log("Sending: " + msg.length + " characters to server ...");
			else console.log("Sending: " + msg + " to server ...");
			
			connection.send(msg);
			if(callback) callback(null);
		}
		else {
			console.log("connection.readyState=" + connection.readyState);
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
