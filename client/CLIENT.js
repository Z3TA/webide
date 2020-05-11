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
	var gotResponseForTimedOutRequest = {};
	var cache = {};
	var connection = {readyState: 0};
	var loggedIn = null;
	var reconnectTimeoutTimeOriginal = 2000;
	var reconnectTimeoutTime = reconnectTimeoutTimeOriginal;
	var reconnectTimeout;
	var lastUsedserver = null;
	var properCallStackError = {};
	var sendingPings = false;
	var pingCounter = 0;
	var nextPingTimer;
	var pingTimeout;
	var requestThatDontCallBack = ["stdout", "log", "echo", "ping", "quit"];
	var GS = String.fromCharCode(29);
	var WEBSOCK_OPEN = 1;
	
	var timer = (function() {
		if(typeof window.performance == "object" && typeof window.performance.now == "function") return function() {
			return window.performance.now();
		}
		else return function() {
			return (new Date()).getTime();
		}
	})();
	
	CLIENT.connected = false;
	CLIENT.ping = -1;
	CLIENT.pingInterval = 15000; // How long time to wait until sendng next ping
	CLIENT.pingTimeout = 10000;
	CLIENT.cmdTimeout = CLIENT.pingTimeout * 6;
	CLIENT.inFlight = 0;
	
	var checkEditorInterval = setInterval(checkEditor);
	
	CLIENT.connect = function(server, callback) {
		
		var loc = UTIL.getLocation(window.location.href);
		var protocol = loc.protocol;
		
		if(!protocol) throw new Error("Unable to get protocol from window.location.href=" + window.location.href);

		console.log("CLIENT: Connecting... protocol=" + protocol + " loc=" + JSON.stringify(loc, null, 2));

		var defaultURL = loc.protocol + "://" + loc.host + "/webide"; // loc.host includes port!
		
		if(protocol.toLowerCase() == "file") {
			defaultURL = "http://localhost:8099/webide";
			
			if(RUNTIME == "browser") console.warn("CLIENT: It's recommended to access the editor via a HTTP server!");
		}
		else if(protocol.toLowerCase() == "chrome-extension") {
			// We are running as *the* chromeos app !?
			defaultURL = "https://webide.se/webide";
		}
		
		console.log("CLIENT: defaultURL=" + defaultURL);
		
		if(server == undefined) server = {url: defaultURL};
		
		var url = server.url || defaultURL; // 'http://' + host + ':' + port + pathName + apiUrl
		
		console.log("CLIENT: Connecting to webide server: url=" + url);
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
			
			startPing();
			
		}
		
		connection.onmessage = serverMessage;
		
		
		connection.onclose = function serverDisconnected() {
			console.log("CLIENT: connection closed");
			CLIENT.connected = false;
			CLIENT.url = null;
			
			stopPing();
			
			if(callback) {
				var err = new Error("Connection closed");
				err.code = "CONNECTION_CLOSED";
				callback(err);
				callback = null;
			}
			
			CLIENT.fireEvent("connectionLost");
			
			
			// Attempt to reconnect ...
			reconnectTimeout = setTimeout(function reconnect() {
				console.log("CLIENT: reconnect: Reconnecting to server=" + JSON.stringify(server) + " reconnectTimeoutTime=" + reconnectTimeoutTime);
				
				if(CLIENT.connected) {
					console.log("CLIENT: reconnect: Already connected! CLIENT.connected=" + CLIENT.connected);
					return;
				}
				
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
		stopPing();
	}
	
	CLIENT.cmd = function cmd(req, json, timeout, callback) {
		// Sends a request to the server.
		
		if(req != "log") {
			console.warn("CLIENT: CLIENT.cmd id=" + id + " req=" + req); // So we get a stack trace and can find out where the request was made while debugging
		}
		
		if(typeof timeout == "function" && callback == undefined) {
			callback = timeout;
			timeout = CLIENT.cmdTimeout;
		}
		else if(timeout == undefined) {
			timeout = CLIENT.cmdTimeout;
		}
		else if(typeof timeout != "number") {
			throw new Error("timeout=" + timeout + " need to be a number (milliseconds)!");
		}
		
		if(typeof json == "function" && callback == undefined) {
			callback = json;
			json = null;
}
		else if(typeof json != "object") {
throw new Error("Second argument json (" + (typeof json) + ") must be an object!");
		}
		
		if(!CLIENT.connected) {
			var error = new Error("Not connected to a webide server! Unable to send cmd: req=" + req);
			error.code = "ENETDOWN";
		}
		else if(CLIENT.ping == Infinity) {
			var error = new Error("We might have lost the connection. Or the server is busy! Unable to send cmd: req=" + req);
			error.code = "ENETUNREACH";
		}
		else if(connection.readyState!=WEBSOCK_OPEN) {
			console.log("CLIENT: connection.readyState=" + connection.readyState);
			
			var error = new Error("Not connected to webide server! Unable to send cmd: req=" + req);
			error.code = "CONNECTION_CLOSED";
			
			CLIENT.fireEvent("connectionLost"); // Why is this here ?
			
		}
		
		if(error) {
			if(callback) callback(error);
			else alertBox(error.message, error.code, "warning");
			
			return;
		}
		
		var id = ++idCounter;
		
		
		
		var string = id + GS + req;
		
		if(json) {
			try {
				string = string + GS + JSON.stringify(json);
			}
			catch(err) {
				if(req != "log") {
					console.log("CLIENT: ", json);
				}
				throw new Error("Unable to stringify json=" + json);
			}
		}
		
		if(requestThatDontCallBack.indexOf(req) == -1) {
			properCallStackError[id] = new Error("An error occured in " + req + "!"); // (Your browser " + BROWSER + " is unable to show the actual error message)
			// The error message will show if you click "bugreport!" (it's in the stack trace!?)
		}
		
		if(callback) {
			callbackWaitList[id] = callback;
		}
		else if(requestThatDontCallBack.indexOf(req) == -1) {
			// The following error will be thrown if the server call back with this id
			noCallbackList[id] = new Error(req + " seems to want a callback function!");
			console.warn("CLIENT: No callback defined for req=" + req);
		}
		
		console.log("CLIENT: Sending: " + UTIL.shortString(string) + " to server ...");
		
		connection.send(string);
		
		/*
			
			problem: It takes SockJS forever until it gives up on a connection and fires a connection.oncluse event.
			Meanwhile the user might do stuff that generates requests to the server.
			And because SockJS optimistically think we are still connected, those requests are sent to the void.
			Resulting in an unresponsive user interface, eg. you click on buttons, but nothing happens.
			
			solution: Ping the server at regular intervals to see if it's responsive.
			And refuse to send more request if the server don't respond to pings.
			Also set a timer that calls back with a timeout error, so that the user at least get an error message
			
		*/
		if(requestThatDontCallBack.indexOf(req) == -1) {
			setTimeout(commandTimeout, timeout || CLIENT.cmdTimeout);
			CLIENT.inFlight++;
		}
		
		function commandTimeout() {
			/*
				We should follow up request's to make sure they return a response.
				It's very annoying when you do something, and the editor doesn't respond
				because there is a problem with the connection to the server...
			*/
			
			CLIENT.inFlight--;
			
			if(!properCallStackError.hasOwnProperty(id) && !callbackWaitList.hasOwnProperty(id)) return; // We have received the response!
			else if(!properCallStackError.hasOwnProperty(id)) throw new Error("Request id=" + id + " req=" + req + " timed out, but there is no properCallStackError! timeout=" + timeout);
			
			if(!CLIENT.connected) {
				// Connection died before we got an error from the server
				var error = UTIL.updateError(properCallStackError[id], "ENETDOWN", "Disconnected from server after sending " + req + " command!/nData sent: " + UTIL.shortString(string));
				// The message probably reached the server...
				// The server will buffer the response for a while in case we reconnect!!?
			}
			else if(CLIENT.ping == Infinity) {
				// We have lost connection with the server
				// But the socket still think it's connected!
				var error = UTIL.updateError(properCallStackError[id], "ENETUNREACH", "Unable to contact the server after sending " + req + " command! The server might be busy or the connection has been lost.");
			}
			else {
				// We still have contact to the server
				// The request is probably just taking a long time...
				var error = UTIL.updateError(properCallStackError[id], "ETIMEDOUT", " " + req + " command timeod out! Request: " + UTIL.shortString(string));
			}
			
			gotResponseForTimedOutRequest[id] = new Error("Request id=" + id + " req=" + req + " has already timed out! Consider increasing the timeout=" + timeout + (CLIENT.cmdTimeout==timeout?" (default)":"") + "");
			gotResponseForTimedOutRequest[id].time = new Date();
			gotResponseForTimedOutRequest[id].code = "ETIMEDOUT";
			
			// note: If the message did get through, we might get the answer after re-connecting!
			// we do not however want the answer to result in a double callback!
			
			delete callbackWaitList[id];
			delete properCallStackError[id];
			delete noCallbackList[id];
			
			if(callback) callback(error);
			else throw error;
			
		}
		}
		
	CLIENT.on = function addEventListener(ev, cb) {
		
		/*
			todo: Have a list of available events, in order to throw an error if an event is misspelled
			
		*/
		
		if(!eventListeners.hasOwnProperty(ev)) {
			console.log("CLIENT: Creating new event (listener): " + ev);
			eventListeners[ev] = [];
		}
		
		if(eventListeners[ev].indexOf(cb) != -1) throw new Error("Event listener already registered for ev=" + ev + " and cb=" + cb);
		
		console.log("CLIENT: Adding new cb=" + UTIL.getFunctionName(cb) + " to event=" + ev + " (length=" + eventListeners[ev].length + " loggedIn=" + loggedIn + ")");
		
		eventListeners[ev].push(cb);
		
		if(ev == "loginSuccess" && loggedIn) {
			console.log("CLIENT: Firing cb=" + UTIL.getFunctionName(cb) + " right away because already logged in!");
			cb(loggedIn);
		}
		
		
	}
	
	CLIENT.fireEvent = function fireEvent(ev, data) {
		
		//console.log("CLIENT: firing client event '" + ev + "' data=" + data + "");
		
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
				stopPing();
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
				else {
					startPing();
				}
				return true;
			});
		}
	}
	
	function serverMessage(sockJsEvent) {
		
		var msg = sockJsEvent.data;
		
		//console.log("CLIENT: Server: " + UTIL.shortString(msg));
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
			
			if(json.code && json.code == "WORKER_CLOSE") CLIENT.fireEvent("workerClose");
			
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
					CLIENT.inFlight--;
					
					//console.log("CLIENT: Got server response for id=" + json.id);
					
					var err = null;
					var generalError;
					
					if(json.error) {
						var errMsg = "Server: " + json.error;
						console.error(errMsg + " code=" + json.errorCode);
						err = properCallStackError[json.id] || new Error(errMsg);
						err = UTIL.updateError(err, json.errorCode, errMsg);
					}
					
					// note: If the callback below throws, the timeout error would also throw! (because callbackWaitList[json.id] still exist)
					// But the problem with try/catch is that they catch all kind of errors, like undefined variables... resulting in the wrong call site in the error message
					//try {
					callbackWaitList[json.id](err, json.resp);
					//}
					//catch(errorInCallback) {
						//generalError = errorInCallback;
					//}
					
				}
				else if( noCallbackList.hasOwnProperty(json.id)) {
					generalError = noCallbackList[json.id];
				}
				else if(gotResponseForTimedOutRequest.hasOwnProperty(json.id)) {
					generalError = gotResponseForTimedOutRequest[json.id];
					generalError.message = generalError.message += " Request took " + Math.round(((new Date()) - generalError.time)/1000) + " seconds. Response: " + UTIL.shortString(JSON.stringify(json, null, 2));
				
				}
				else {
					generalError = new Error("Can not find id=" + json.id + " in callbackWaitList=" + JSON.stringify(callbackWaitList) + "\n" + JSON.stringify(json, null, 2));
					// If the above happends, check to make sure the callback in the server command is only called once!
				}
				
				delete properCallStackError[json.id];
				delete noCallbackList[json.id];
				delete gotResponseForTimedOutRequest[json.id];
				delete callbackWaitList[json.id];
				
				if(generalError) throw generalError;
				
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
					else if(EDITOR.settings.devMode) {
console.error(new Error("Unexpected server response. (No registered event listener for " + method + ")\n" + JSON.stringify(json, null, 2)));
					// Might be an event without a listener!
					}
				}
				
			}
			
		}
	}
	
	function startPing() {
		console.log("CLIENT: ping! start sendingPings=" + sendingPings);
		
		if(sendingPings) {
			console.warn("CLIENT: ping! Already sending pings!");
			return;
		}
		
		sendingPings = true;
		
		// Wait some time before sending first ping or we would get a very high ping (because the server is busy?)
		// No! Make the ping request right away so that the user doesn't think we are lagging...
		//nextPingTimer = setTimeout(sendPing, 2000);
		sendPing();
	}
	
	function stopPing() {
		console.log("CLIENT: ping! stop sendingPings=" + sendingPings);
		sendingPings = false;
		clearTimeout(nextPingTimer);
		clearTimeout(pingTimeout);
		CLIENT.ping = -1;
	}
	
	function sendPing() {
		var start = timer();
		//console.log("CLIENT: ping! send: sendingPings=" + sendingPings + " start=" + start);
		CLIENT.cmd("ping", {data: ++pingCounter}, function(pingErr, resp) {
			
			clearTimeout(pingTimeout);
			
			if(pingErr) {
				console.log("CLIENT: ping! pingErr.code=" + pingErr.code);
				CLIENT.ping = Infinity;
				
				// Don't stop the ping due to pingErr, because we don't know when to start the ping again
				
			}
			else {
				var end = timer();
				var ping = Math.round(end-start);
				//var ping = Math.round((end-start)*10) / 10;
				if(CLIENT.ping != ping) CLIENT.fireEvent("pingChange", {oldPing: CLIENT.ping, newPing: ping});
				CLIENT.ping = ping;
				
				//console.log("CLIENT: ping! Response: resp=" + resp + " ping=" + CLIENT.ping);
				
				if(resp != pingCounter) var error = new Error("resp=" + JSON.stringify(resp) + " pingCounter=" + pingCounter + "");
				
				// Don't throw before we have set the next timeout!
			}
			
			
			nextPingTimer = setTimeout(sendPing, CLIENT.pingInterval);
			
			if(error) throw error;
			
		});
		var pingTimeout = setTimeout(function() {
			CLIENT.ping = Infinity;
			CLIENT.fireEvent("pingTimeout");
		}, CLIENT.pingTimeout);
	}
	
	console.log("CLIENT: End of CLIENT.js");
	
})();
