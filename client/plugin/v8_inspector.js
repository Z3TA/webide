
var inspect; // Global for debugging

(function() {
	/*
		
		DEPRECATED! v8 dev tools api abstracted in server/user_worker.js
		
		
		The v8 dev tools API documentation leave much to desire:
		https://chromedevtools.github.io/devtools-protocol/
		
		But we can use tcpdum to see what it sends:
		sudo tcpdump -lnpi lo tcp -s 16000 -w - | strings | grep "id"
		
		Unfortunately commands sent from Chrome dev tools are encrypted, we can only see the answers :/
		But it *might* be possible to figure out the command sent by looking at the answer!?
		
		More info:
		https://nodejs.org/api/debugger.html#debugger_v8_inspector_integration_for_node_js
		
		
		Todo:
		* Live reload a file/script when it's changed
		* Get variables for auto-completion
		
	*/
	
	if(!QUERY_STRING["v8_inspector"]) return;
	
	
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
	
	var watchingFiles = [];
	
	EDITOR.plugin({
		desc: "v8 inspector for Chromium and Nodejs",
		load: function loadInspector() {
			
			EDITOR.on("afterSave", v8_fileSavedMaybe);
			
			metaInterval = setInterval(getMetaData, 2000);
		},
		unload: function unloadInspector() {
			clearInterval(metaInterval);
			if(websocket) websocket.close();
			watchingFiles.length = 0;
			
			EDITOR.removeEvent("afterSave", v8_fileSavedMaybe);
			
		}
	});
	
	function v8_fileSavedMaybe(file) {
		for (var i=0; i<watchingFiles.length; i++) {
			if(file.path == watchingFiles[i].path) return hotLoad(file);
		}
		return true;
	}
	
	function hotload() {
		
		return true;
	}
	
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
		/*
			
			
			
		*/
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
		else if(method=="Runtime.consoleAPICalled") {
			var type = json.params.type;
			var level = 3;
			
			if(type=="warn") level = 2;
			else if(type=="error") level = 1; 
			
			var text = "";
			var strings = [];
			var args = json.params.args;
			for (var i=0; i<args.length; i++) {
				if(args[i].type == "string") strings.push(args[i].value);
			}
			var text = strings.join(" ");
			var loc = findFile(json.params.stackTrace);
			
			if(loc) {
				var col = columnMinusIndention(loc.file, loc.row, loc.col);
				EDITOR.addInfo(loc.row, col, text, loc.file, level);
			}
			
		}
		else if(method=="Console.messagesCleared") {
			//console.log("")
		}
		else {
			console.log("wsMessage: json=" + JSON.stringify(json, null, 2));
			}
	}
	
	function findFile(stackTrace) {
		var callFrames = stackTrace.callFrames;
		
		if(!stackTrace.callFrames) throw new Error( "Expected stackTrace to have a callFrames property: " + JSON.stringify(stackTrace, null, 2) );
		
		for (var i=0; i<callFrames.length; i++) {
			for(var path in EDITOR.files) {
				if( UTIL.isSamePath(path, callFrames[i].url) ) return {
					file: EDITOR.files[path], 
					row: callFrames[i].lineNumber-1, 
					col: callFrames[i].columnNumber
				};
			}
		}
		
		return null;
	}
	
	function columnMinusIndention(file, row, col) {
		var gridRow = file.grid[row];
		var indentation = gridRow.indentationCharacters.length;
		return col - indentation;
	}
	
	function wsOpen() {
		
		console.log('Connected to the v8 inspector!');
		
		send( {"id": ++ID, "method": "Runtime.enable"} );
		
		// Use --inspect-brk
		send( {"id": ++ID, "method": "Runtime.runIfWaitingForDebugger"} );
		
		
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
	
	// Used for debugging using the dev-tools-console
	inspect = function v8_api(method, params) {
		var obj = {
			id: ++ID,
			method: method,
		}
		
		if(params) obj.params = params;
		
		send(obj);
	}
	
})();