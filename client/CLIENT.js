/*
	This is the server.js "CLIENT".
	
	Use CLIENT.cmd(cmd, jsonData, callback) to send commands to the server.
	
*/

var CLIENT = {}; // Client object is global


(function() {
	
	"use strict";
	
	console.log("CLIENT: Hello from CLIENT.js");
	
	var eventListeners = {}; // Events are added on demand via CLIENT.on("someEvent"). It can be *anything* so that you can easaily add new server events
	var idCounter = 0;
	var callbackWaitList = {};
	var noCallbackList = {};
	var cache = {};
	var connection = {readyState: 0};
	var loggedIn = null;
	var reconnectTimeoutTimeOriginal = 2000;
	var reconnectTimeoutTime = reconnectTimeoutTimeOriginal;
	var reconnectTimeout;
	var lastUsedserver = null;
	var properCallStackError = {};
	
	CLIENT.connected = false;
	
	var checkEditorInterval = setInterval(checkEditor);
	
	CLIENT.connect = function(server, callback) {
		
		var loc = UTIL.getLocation(window.location.href);
		var protocol = loc.protocol;
		
		if(!protocol) throw new Error("Unable to get protocol from window.location.href=" + window.location.href);

		console.log("CLIENT: protocol=" + protocol + " loc=" + JSON.stringify(loc, null, 2));

		var defaultURL = loc.protocol + "://" + loc.host + "/jzedit"; // loc.host includes port!
		
		if(protocol.toLowerCase() == "file") {
			defaultURL = "http://localhost:8099/jzedit";
			
			if(RUNTIME == "browser") console.warn("CLIENT: It's recommended to access the editor via a HTTP server!");
		}
		else if(protocol.toLowerCase() == "chrome-extension") {
			// We are running as *the* chromeos app !?
			defaultURL = "https://webide.se/jzedit";
		}
		
		console.log("CLIENT: defaultURL=" + defaultURL);
		
		if(server == undefined) server = {url: defaultURL};
		
		var url = server.url || defaultURL; // 'http://' + host + ':' + port + pathName + apiUrl
		
		console.log("CLIENT: Connecting to jzedit server: url=" + url);
		//connection = new SockJS(apiUrl);
		
		var sockJsReservedQuirk = '';
		var sockJsOptions = {debug: true};
		
		connection = new SockJS(url, sockJsReservedQuirk, sockJsOptions); 
		connection.onopen = function serverConnected() {
			console.log("CLIENT: connected to server=" + JSON.stringify(server));
			CLIENT.connected = true;
			CLIENT.url = url;
			
			lastUsedserver = server;
			
			console.log("CLIENT: connection.onopen: connection.readyState=" + connection.readyState);
			// readyState when using xhr !? Wait for readyState !?
			
			if(callback) callback(null); // Don't wait for login, just callback and say we successfully connected
			callback = null; // Prevent calling the connect callback when connection is closed after a successful onopen
			
			CLIENT.fireEvent("connectionConnected");
			
			console.log("CLIENT: Setting reconnectTimeoutTime=" + reconnectTimeoutTime + " back to reconnectTimeoutTimeOriginal=" + reconnectTimeoutTimeOriginal + " because connection is open");
			reconnectTimeoutTime = reconnectTimeoutTimeOriginal;
			
		}
		
		connection.onmessage = serverMessage;
		
		
		connection.onclose = function serverDisconnected() {
			console.log("CLIENT: connection closed");
			CLIENT.connected = false;
			CLIENT.url = null;
			
			if(callback) {
				var err = new Error("Connection closed");
				err.code = "CONNECTION_CLOSED";
				callback(err);
			}
			
			CLIENT.fireEvent("connectionLost");
			
			
			// Attempt to reconnect ...
			
			reconnectTimeout = setTimeout(function reconnect() {
				if(CLIENT.connected) return;
				
				console.log("CLIENT: Reconnecting to server=" + JSON.stringify(server) + " reconnectTimeoutTime=" + reconnectTimeoutTime);
				CLIENT.connect(server);
				
			}, reconnectTimeoutTime);
			
			reconnectTimeoutTime += 1000;
			console.log("CLIENT: Increasing reconnectTimeoutTime to " + reconnectTimeoutTime + " because many attempts");
			
		}
		
	}
	
	CLIENT.disconnect = function disconnect() {
		console.log("CLIENT: Disconnecting from editor server url=" + CLIENT.url);
		connection.close();
		CLIENT.connected = false;
	}
	
	CLIENT.cmd = function cmd(req, json, callback) {
		
		// Second argument is either a callback function or a javascript object
		if(typeof json == "function" && callback == undefined) {
			callback = json;
			json = null;
		}
		else if(typeof json != "object") throw new Error("Second argument json (" + (typeof json) + ") must be an object!");
		
		var GS = String.fromCharCode(29);
		
		var id = ++idCounter;
		
		var string = id + GS + req;
		
		// console.warn so we get a stack trace and can find out where the request was made while debugging
		if(req != "log") {
			console.warn("CLIENT: CLIENT.cmd id=" + id + " req=" + req);
		}
		if(json) {
			try {
				string += GS + JSON.stringify(json);
			}
			catch(err) {
				if(req != "log") {
					console.log("CLIENT: ", json);
				}
				throw new Error("Unable to stringify json=" + json);
			}
		}
		
		properCallStackError[id] = new Error("Problem with " + req + " command:");
		
		if(callback) {
callbackWaitList[id] = callback;
		}
		else if(req != "stdout" && req != "log" && req != "echo") { // Known commands that doesn't call back
			// This error will be thrown if the server callbacks with this id
			noCallbackList[id] = new Error(req + " seems to want a callback function!");
			console.warn("CLIENT: No callback defined in req=" + req);
		}
		
		connSend(string, function sendMessageToServer(err) {
			if(err) {
				if(req != "log") {
console.log("CLIENT: connSend error: "+ err);
				}
				
				if(callbackWaitList.hasOwnProperty(id)) {
					callbackWaitList[id](err);
					delete callbackWaitList[id];
				}
			}
		});
	}
	
	
	CLIENT.on = function addEventListener(ev, cb) {
		if(!eventListeners.hasOwnProperty(ev)) {
			console.warn("CLIENT: Creating new event (listener): " + ev);
			eventListeners[ev] = [];
		}
		
		if(eventListeners[ev].indexOf(cb) != -1) throw new Error("Event listener already registered for ev=" + ev + " and cb=" + cb);
		
		console.warn("CLIENT: Adding new cb=" + UTIL.getFunctionName(cb) + " to event=" + ev + " (length=" + eventListeners[ev].length + " loggedIn=" + loggedIn + ")");
		
		eventListeners[ev].push(cb);
		
		if(ev == "loginSuccess" && loggedIn) {
			console.log("CLIENT: Firing cb=" + UTIL.getFunctionName(cb) + " right away because already logged in!");
			cb(loggedIn);
		}
		
		
	}
	
	CLIENT.fireEvent = function fireEvent(ev, data) {
		
		console.log("CLIENT: firing client event '" + ev + "' data=" + data + "");
		
		if(!eventListeners.hasOwnProperty(ev)) {
console.warn("CLIENT: No registered event listener for ev=" + ev)
		}
		else {
			// Call all event listeners
			
			var f = eventListeners[ev].slice(0);
			
			if(eventListeners[ev].length == 0) {
				console.warn("CLIENT: No event listeners for event=" + ev);
			}
			
			console.log("CLIENT: Calling listeners: ", f.map(function(f) {return UTIL.getFunctionName(f)}));
			
			for(var i=0; i<f.length; i++) {
				console.log("CLIENT: firing " + ev + " event listener: " + UTIL.getFunctionName(f[i]))
				f[i](data);
			}
			
		}
	}
	
	
	CLIENT.removeEvent = function(eventName, fun) {
		
		if(!eventListeners.hasOwnProperty(eventName)) {
			console.warn("CLIENT: Unknown event: eventName=" + eventName);
			return;
		}
		
		var fname = UTIL.getFunctionName(fun);
		var events = eventListeners[eventName];
		var found = 0;
		
		removeThem(); // Removes them all (recursive)
			
		function removeThem() {
			for(var i=0; i<events.length; i++) {
				if(events[i] == fun) {
					console.log("CLIENT: Removing fun=" + UTIL.getFunctionName(fun) + " from eventName=" + eventName);
					events.splice(i, 1);
					found++;
					removeThem();
					break;
				}
			}
		}
		console.log("CLIENT: Removed " + found + " occurrences of " + fname + " from " + eventName);
	}

	CLIENT.mock = serverMessage; // When you want to manually fire server messages
	
	CLIENT.on("loginSuccess", function clientSaveConnectionId(json) {
		console.log("CLIENT: loginSuccess: json=" + JSON.stringify(json));
		
		if(json.cId == undefined) throw new Error("Did not get cId from loginSuccess event!");
		CLIENT.connectionId = json.cId;
		loggedIn = json;
	});
	
	CLIENT.on("editorVersion", function updateServiceWorkerCacheMaybe(version) {
		
		var newVersion = parseInt(version);
		var oldVersion = EDITOR.version;
		
		if(isNaN(newVersion)) throw new Error("newVersion=" + newVersion + " version=" + version);
		
		// Always tell the service worker what version the server is on, so it can update the cache if needed
		var serviceWorkerError = true;
		if(typeof navigator == "object" && navigator.serviceWorker &&  navigator.serviceWorker.controller) {
			console.log("CLIENT: editorVersion: Telling the serviceWorker about server version=" + newVersion);
			serviceWorkerError = false;
			try {
				navigator.serviceWorker.controller.postMessage("editorVersion=" + newVersion);
			}
			catch(err) {
				serviceWorkerError = true;
				console.warn("CLIENT: editorVersion: Failed to post message to server worker: " + err.message);
			}
		}
		else {
			console.log("CLIENT: seditorVersion: erviceWorker not supported on BROWSER=" + BROWSER);
		}
		
		if(EDITOR.version == 0 && EDITOR.settings.devMode) {
			console.warn("CLIENT: editorVersion: Ignoring editor version upgrade from " + oldVersion + " to " + newVersion + " because we are in development mode!");
			return;
		}
		else if(newVersion != oldVersion && lastUsedserver && lastUsedserver.url.indexOf(window.location.hostname) == -1) {
			alertBox("Your client is running version " + oldVersion + " while the server is running version " + newVersion + " ! While there might not be any issues, it's recommended to run the same version on both client and server!");
		}
		else if(newVersion > oldVersion) {
			// Wait until serviceWorker has updated the cache ...
			if(serviceWorkerError) {
console.warn("CLIENT: editorVersion: Unable to talk to service worker! No point refreshing.");
			}
			else setTimeout(refresh, 10000); // The wait must be enough to make sure the service worker has refreshed the cache!
		}
		
		function refresh() {
			
			// First check to make sure the chache has actually updated!
			UTIL.httpGet("version.txt", function(err, str) {
				if(err) {
					alertBox(err.message, err.code, "error");
					return;
				}
				
				var version = parseInt(str);
				
				console.log("CLIENT: editorVersion: server=" + newVersion + " version.txt=" + version);
				
				if(version < newVersion && !serviceWorkerError) {
					console.warn("CLIENT: editorVersion: Force refresh the cache!");
					navigator.serviceWorker.controller.postMessage("forceRefresh=" + newVersion);
					setTimeout(refresh, 20000);
				}
				else {
					console.log("CLIENT: editorVersion: We now have the new version=" + version + " in the cache, same as newVersion=" + newVersion);
					var ok = "Reload now!";
					var cancel = "Update another time"
					confirmBox("The editor has been updated from version=" + oldVersion + " to " + newVersion + "\nReload to get the new version.", [cancel, ok], function(answer) {
						if(answer == ok) {
							EDITOR.reload();
						}
					});
				}
			});
		}
	});
	
	function connSend(msg, callback) {
		var websockOpen = 1;
		
		if(connection.readyState==websockOpen) {
			console.log("CLIENT: Sending: " + UTIL.shortString(msg) + " to server ...");
			
			connection.send(msg);
			if(callback) callback(null);
		}
		else {
			console.log("CLIENT: connection.readyState=" + connection.readyState);
			if(callback) {
				var err = new Error("Not connected to jzedit server");
				err.code = "CONNECTION_CLOSED";
				callback(err);
			}
			CLIENT.fireEvent("connectionLost");
			//serverMessage(formatText(currentChannel.name) + GS + formatText(nickName) + GS + formatText(text))
		}
		}
	
	function checkEditor() {
		console.log("CLIENT: Wait for editor to load and then attach events for afk");
		if(typeof EDITOR != "undefined" && typeof EDITOR.on == "function") {
			console.log("CLIENT: Editor loaded. Attaching afk and btk events!");
			clearInterval(checkEditorInterval);
			
			EDITOR.on("afk", function increaseReconnectTime() {
				if(!CLIENT.connected) {
reconnectTimeoutTime += 10000;
					console.log("CLIENT: Increasing reconnectTimeoutTime to " + reconnectTimeoutTime + " because afk and not connected");
				}
				return true;
			});
			
			EDITOR.on("btk", function tryReconnectAndUpdateReconnectTime() {
				console.log("CLIENT: Setting reconnectTimeoutTime=" + reconnectTimeoutTime + " back to reconnectTimeoutTimeOriginal=" + reconnectTimeoutTimeOriginal + " because btk");
				reconnectTimeoutTime = reconnectTimeoutTimeOriginal;
				if(!CLIENT.connected) {
					clearTimeout(reconnectTimeout);
					console.log("CLIENT: Attempting connect after btk");
					CLIENT.connect(lastUsedserver);
				}
				return true;
			});
		}
	}
	
	function serverMessage(sockJsEvent) {
		
		var msg = sockJsEvent.data;
		
		console.log("CLIENT: Server: " + UTIL.shortString(msg));
		//console.log( "CLIENT: Server: " + msg );
		
		CLIENT.connected = true;
		
		if(msg.length == 0) {
			console.warn("CLIENT: Recieved emty messsage from server");
		}
		else {
			try {
				var json = JSON.parse(msg)
			}
			catch(err) {
				throw new Error("Unable to parse server message: " + msg);
				return;
			}
			
			if(json.error) {
				console.warn("CLIENT: Server ERROR: " + json.error + " id=" + json.id + " error: code=" + json.error.code + " errorCode=" + json.error.errorCode);
			}
			
			if(json.resp) {
				var resp = json.resp;
				for(var method in resp) {
					// Call event listeners
					// note: event listeners are also called If json has no id, and no resp ...
					if(eventListeners.hasOwnProperty(method)) {
						CLIENT.fireEvent(method, resp[method]);
					}
					//else console.log("CLIENT: No event listeners for method/event: '" + method + "' data=" + JSON.stringify(resp[method]));
				}
			}
			
			if(json.id) {
				if(callbackWaitList.hasOwnProperty(json.id)) {
					
					console.log("CLIENT: Got server response for id=" + json.id);
					
					var err = null;
					
					if(json.error) {
						var errMsg = "Server: " + json.error;
						err = properCallStackError[json.id] ||  new Error();
						err.message = errMsg;
						// Seems it's not possible to overwrite error.message, but can we overwrite error.stack ?
						if(err.message != errMsg) {
							err = new Error(errMsg);
							err.stack = properCallStackError[json.id].stack;
						}
						if(json.errorCode) err.code = json.errorCode;
					}
					
					callbackWaitList[json.id](err, json.resp);
					delete callbackWaitList[json.id];
					delete properCallStackError[json.id];
				}
				else if( noCallbackList.hasOwnProperty(json.id)) {
					throw noCallbackList[json.id];
				}
				else {
					throw new Error("Can not find id=" + json.id + " in callbackWaitList=" + JSON.stringify(callbackWaitList) + "\n" + JSON.stringify(json, null, 2));
					// If the above happends, check to make sure the callback in the server command is only called once!
				}
			}
			else if(json.msg) {
				console.warn("CLIENT: " + json.msg);
				alertBox(json.msg, json.code || "SERVER_MSG");
			}
			else if(!json.resp) {
				
				for(var method in json) {
					if(eventListeners.hasOwnProperty(method)) {
						CLIENT.fireEvent(method, json[method]);
					}
					else throw new Error("Unexpected server response. (No registered event listener for " + method + ")\n" + JSON.stringify(json, null, 2));
					// Might be an event without a listener!
				}
				
			}
			
		}
	}
	
	
	console.log("CLIENT: End of CLIENT.js");
	
})();
