(function() {
	"use strict";
	
	/*
		Attach to the chromium debug tool's console and watch for errors	

		Note: This is not a "full debugger". An app that debug itself is not a good idea.
		A "full debugger" is on the todo list, but for debugging Other chromium apps, 
		so you would have to use another instance of the editor, to debug the editor with the editor.
		A nodejs debugger is also on the todo-list (chromium and nodejs use different debug protocols)
		
		dependency:
		npm install websocket
		
		problem: Can't connect to the debugger if another websocket is already connected to it!
		solution: Retry until we can!
		
		See http://127.0.0.1:57341/json
		
		
		hmm ? Set a breakpoint at the error and wait until it triggers again, so we have more debug data!?
		
	*/
	
	var port = 57341; // For this plugin to work, the editor needs to be started with --remote-debugging-port=#port nr

	var ID = 0;
	
	var restartTime = 5000; // How many second to wait before restrying to connect to the debugger after a disconnect or failed websock
	
	if(!alert) var alert = console.log; // If we are running in nodejs
	if(!fs) var fs = require("fs"); // If we are running in nodejs

	var messageLog = []; // Recent log messages.
	var maxLogLength = 50;
	var firstUrl = ""; // url of the first console message recieved
	
	var connection;
	
	var WebSocketClient = require('websocket').client;
	
	var client = new WebSocketClient();
		
	client.on("connectFailed", wsConnectFailed);
	client.on("connect", wsConnect);

	function wsConnectFailed(err) {
		console.error(err);
	}

	function wsConnect(conn) {
	
		connection = conn;
	
		console.log('Connected to the chromium debugger');
		
		
		connection.on('error', function(error) {
			console.log("Connection Error: " + error.toString());
		});
		connection.on('close', function() {
			console.log('Connection Closed');
			connection = undefined;
			setTimeout(restart, restartTime);
		});
		connection.on('message', wsMessage);
		

		send(consoleEnable());
		//send(consoleClearMessages());
		//send(pageNavigate("index.htm"));


		function wsMessage(message) {
			if (message.type === 'utf8') {
			
				var json = JSON.parse(message.utf8Data);
				var method = json.method;
			
				if(json.error) {
					throw new Error("json=" + JSON.stringify(json, null, 2));
				}
				else if(method=="Console.messageAdded") {
					captureErrors(json);
				}
				else if(method=="Console.messagesCleared") {
					//console.log("")
				}
				else {
					
					if(json.id) {
						if(json.id == ID) {
							//console.log("Answer: " + JSON.stringify(json.result, null, 2));
						}
					}
					else {
						console.log("UNKNOWN: json=" + JSON.stringify(json, null, 2));
					}
					
				}
			}
			else {
				console.log(message);
				throw new Error("Expected utf8");
			}
		}

	}
	
	function send(json) {
		
		if(!connection) throw new Error("Can't send message: No connection!");
		
		//console.log("Sending: " + JSON.stringify(json));
		connection.sendUTF(JSON.stringify(json));
	}
	
	function restart() {
		getWebSocketDebuggerUrl("localhost", port, function(url) {
			
			console.log("Connecting to url=" + url);
			
			client.connect(url);
		});
	}

	function getWebSocketDebuggerUrl(host, port, callback) {
		// Gets the websocket URL of the debugger
		
		var http = require('http');
		
		http.get("http://" + host + ":" + port + "/json", function(response) {
			// Continuously update stream with data
			var body = '';
			response.on('data', function(d) {
				body += d;
			});
			response.on('end', function() {
				// Data reception is done, do whatever with it!
				var parsed = JSON.parse(body);
				
				// Check for index.htm url
				for(var i=0; i<parsed.length; i++) {
					
					if(parsed[i].url.indexOf("index.htm") > -1) {
						if(parsed[i].webSocketDebuggerUrl) {
							callback(parsed[0].webSocketDebuggerUrl);
							return;
						}
						else {
							console.log("Self debugger failed to start. No webSocketDebuggerUrl available!");
							
							setTimeout(restart, restartTime);
							
						}
					}
					
				}
				
			});
		});
		
	}
	

	function consoleEnable() {
		return {"id": ++ID, "method": "Console.enable"};
	}
	
	function consoleClearMessages() {
		return  {"id": ++ID, "method": "Console.clearMessages"};
	}
	
	function pageNavigate(url) {
		return  {"id": ++ID, "method": "Page.navigate", "params": {"url": url} };
	}

	
	function captureErrors(json) {
					
		// {"method":"Console.messageAdded","params":{"message":{"source":"console-api","level":"log","text":"\"openFiles.length=4\"","timestamp":1458219335.99887,"type":"log","line":361,"column":13,"url":"file:///C:/Users/Z/dev-repositories/js-editor/plugin/reopen_files.js","executionContextId":1,"parameters":[{"type":"string","value":"openFiles.length=4"}],"stackTrace":[{"functionName":"reopen_files_closeEditor","scriptId":"151","url":"file:///C:/Users/Z/dev-repositories/js-editor/plugin/reopen_files.js","lineNumber":361,"columnNumber":13}]}}}

		var msg = json.params.message;
		
		if(!firstUrl) {
			firstUrl =  msg.url;
			console.log("firstUrl=" + firstUrl);
			console.log("__dirname=" + __dirname);
			
		}
		
		if(msg.level=="error") {
			
			//console.log(JSON.stringify(json, null, 2));
			
			var alertMsg = msg.text + "\n" + msg.url + ", line " + msg.line + stackTrace(msg.stackTrace, firstUrl, msg.line);
			
			log("##############################" + myDate() + "##############################\n" + messageLog.join("\n") + "\n" + alertMsg);
			
			alert(alertMsg);
			
			// Clear the console so we do not get the same error again if we reconnect
			//send(consoleClearMessages());
			// This clears for others too, so leave the messages
			
		}
		else {
			// Keep a list of the 100 latest message
			messageLog.push(parseText(msg.text) + ", " + shortenUrl(msg.url, firstUrl) + ":" + msg.line);
			
			if(messageLog.length > maxLogLength) messageLog.shift();
		}
		
		function parseText(txt) {
			txt = txt.replace("\\n", "\n");
			txt = txt.replace('\\"', '"');
			
			
			var baseUrl = firstUrl.substr(0, lastSlash(firstUrl));
			console.log("baseUrl=" + baseUrl);
			txt = txt.replace(baseUrl, "");
			
			return txt;
			
		}
		
		function stackTrace(stack, commonUrl, line) {
			
			if(!stack) return "";
			
			var str = "\n";
			var url = "";
			var functionName = "";
			var sharedUrl = "";
			
			//console.log(JSON.stringify(stack, null, 2));
			
			for(var i=0; i<stack.length; i++) {
				functionName = stack[i].functionName;
				url = shortenUrl(stack[i].url);

				if(!(url == "" && stack[i].lineNumber == line)) { // Dont write if it's the same file and line as parent
				
					if(functionName == "") {
						functionName = "Anonymous function"
						console.warn("Anonymous function detected: " + (url ? url : stack[i].url) + ", line " + stack[i].lineNumber)
					}

					str += functionName + ": " + url + ", line " + stack[i].lineNumber + "\n";
				}
			}
			
			return str;
		}
		
		function shortenUrl(url) {
			//var sharedUrl = sharedStart([commonUrl, url]);
			
			//url = url.replace(sharedUrl, ""); // Remove the shared path from the url
			
			return url.substr(lastSlash(firstUrl), url.length);;
		}
		
		function lastSlash(url) {
			var slash = url.lastIndexOf("/");
			if(slash == -1) slash = url.lastIndexOf("\\");
			return slash;
		}
		
		function sharedStart(array){
			var A= array.concat().sort(), 
			a1= A[0], a2= A[A.length-1], L= a1.length, i= 0;
			while(i<L && a1.charAt(i)=== a2.charAt(i)) i++;
			return a1.substring(0, i);
		}
	}
	

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

	function log(txt) {
		fs.appendFileSync("error.log", txt + "\n");
	}
	
	
	
	function main() {
		restart();
	}
		
	main(); // Run main function after everything have been declared
	
})();