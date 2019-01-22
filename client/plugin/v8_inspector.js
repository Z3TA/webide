(function() {
/*

		Reverse engineering the protocol is easier then reading the documentation :P
		
		sudo tcpdump -lnpi lo tcp -s 16000 -w - | strings
		
		But the data sent is encrypted ... so we have to rely on the documentation ....
		https://chromedevtools.github.io/devtools-protocol/
		
		More info:
		https://nodejs.org/api/debugger.html#debugger_v8_inspector_integration_for_node_js
		
*/
	
	defaultInspectorHost = "127.0.0.1";
	
	var defaultInspectorPort = 9229;
	// The port can be changed: node --inspect=7000 nameofscript.js
	
	var port = defaultInspectorPort;
	var host = defaultInspectorHost;
	
	var metaInterval;
	
	var currentWebSocketDebuggerUrl = "";
	var websocket;
	var restartTime = 2000;
	
	var ID = 0; // Request id (counter)
	
	EDITOR.plugin({
		desc: "v8 inspector for Chromium and Nodejs",
		load: function loadInspector() {
			metaInterval = setInterval(getMetaData, 2000);
		},
		unload: function unloadInspector() {
			clearInterval(metaInterval);
			if(websocket) websocket.close();
			
		}
	});
	
	
	function getMetaData() {
		// Access to fetch at 'http://127.0.0.1:9229/json' from origin 'http://127.0.0.1:8099' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource
		// We can't use fetch or XMLHttpRequest because of CORS :(
		
		var metaUrl = "http://" + host + ":" + port + "/json";
		
		CLIENT.cmd("httpGet", {url: metaUrl}, function(err, body) {
			console.log("body=" + body);
			
			try {
				var json = JSON.parse(body);
			}
			catch(err) {
				console.log("Failed to parse data (" + err.message + "): " + body);
				return;
}
			
			var arr = json;
			for (var i=0; i<arr.length; i++) {
				if(arr[i].webSocketDebuggerUrl) {
					foundDebuggerUrl(arr[i].webSocketDebuggerUrl);
					break;
				}
				else {
					console.log("No webSocketDebuggerUrl in " + JSON.stringify(arr[i]));
					return;
				}
			}
		});
		}
	
	function foundDebuggerUrl(webSocketDebuggerUrl) {
		if(currentWebSocketDebuggerUrl != webSocketDebuggerUrl) {
			currentWebSocketDebuggerUrl = webSocketDebuggerUrl;
			clearInterval(metaInterval);
			restart();
		}
		else {
			console.log("Already connected to " + webSocketDebuggerUrl + " ? currentWebSocketDebuggerUrl=" + currentWebSocketDebuggerUrl + " websocket=" + websocket);
		}
	}
	
	function restart() {
		// Use native Websocket
		websocket = new WebSocket(currentWebSocketDebuggerUrl);
		
		websocket.onopen = wsOpen;
		websocket.onmessage = wsMessage;
		websocket.onerror = wsError;
		websocket.onclose = wsClose;
	}
	
	function wsError(err) {
		console.log("Connection Error: " + err.toString());
	}
	
	function wsClose(code, data) {
		console.log("Connection Closed. code=" + code + " data=" + data);
		websocket = undefined;
		//setTimeout(restart, restartTime);
	}
	
	function wsMessage(evt) {
		
		var data = evt.data;
		console.log("wsMessage: data=" + data);
		
		try {
			var json = JSON.parse(data);
		}
		catch(err) {
			console.warn("Failed to parse (" + err.message + "): " + data);
			return;
		}
		
		var method = json.method;
		
		if(json.error) {
			alertBox( "Inspector error: \n" + JSON.stringify(json, null, 2) );
		}
		else if(method=="Console.messageAdded") {
			//captureErrors(json);
		}
		else if(method=="Console.messagesCleared") {
			//console.log("")
		}
		else {
			
			if(json.id) {
				if(json.id == ID) {
					console.log("wsMessage: Got answer for *last* request " + json.id + ": " + JSON.stringify(json.result, null, 2));
				}
			}
			else {
				console.log("UNKNOWN: json=" + JSON.stringify(json, null, 2));
			}
			
		}
	}
	
	function wsOpen() {
		
		console.log('Connected to the v8 inspector!');
		
		send( {"id": ++ID, "method": "Log.enable"} );
		
		// The first thing we want to do is to clear ?
		//send(consoleClearMessages());
		
		//send(consoleEnable());
		//send(consoleClearMessages());
		//send(pageNavigate("index.htm"));
		
	}
	
	function send(json) {
		
		if(!websocket) throw new Error("Can't send message: No connection!");
		
		//console.log("Sending: " + JSON.stringify(json));
		websocket.send(JSON.stringify(json));
	}
	
})();