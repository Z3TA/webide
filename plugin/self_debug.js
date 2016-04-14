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
	
	//if(!alert) var alert = console.log; // If we are running in nodejs
	if(!fs) var fs = require("fs"); // If we are running in nodejs

	var messageLog = []; // Recent log messages.
	var maxLogLength = 50;
	//var baseUrl = "file:///" + __dirname.replace(/\\/g, "/").replace(/\/plugin$/, "/");
	var baseUrl = "file:///" + editor.workingDirectory.replace(/\\/g, "/");
	console.log("baseUrl=" + baseUrl);
	
	var padLength = 42; // How many blank spaces in url padding
	
	var fullPad = ""; for(var i=0; i<padLength; i++) fullPad += " "; // A string with padLength spaces
	
	var newLine = "\n";
	
	var WebSocket = require('ws');
	var client;
	
	var ignoreErrors = false;

	var errorReportCounter = 0; // Used for file names
	var thisSessionErrorCount = 0;
	var maxErrors = 5;
	var alertNoticeToManyErrors = false;
	
	function wsError(err) {
		console.log("Connection Error: " + err.toString());
	}

	function wsClose(code, data) {
		console.log("Connection Closed. code=" + code + " data=" + data);
		client = undefined;
		setTimeout(restart, restartTime);
	}
	
	function wsMessage(data, flags) {
		
		var json = JSON.parse(data);
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
	
	function wsOpen() {
	
		console.log('Connected to the chromium debugger');
		
		// The first thing we want to do is to clear ?
		//send(consoleClearMessages());
		
		send(consoleEnable());
		//send(consoleClearMessages());
		//send(pageNavigate("index.htm"));

	}
	
	function send(json) {
		
		if(!client) throw new Error("Can't send message: No connection!");
		
		//console.log("Sending: " + JSON.stringify(json));
		client.send(JSON.stringify(json));
	}
	
	function restart() {
		getWebSocketDebuggerUrl("localhost", port, function(url) {
			
			console.log("Connecting to url=" + url);
			
			var WebSocket = require('ws');
			client = new WebSocket(url); // , {protocolVersion: 8, origin: 'http://websocket.org'}

			client.on('open', wsOpen);
			client.on('close', wsClose);
			client.on('error', wsError);
			client.on('message', wsMessage);
			
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
		
		if(msg.level=="error") {
			
			//console.log(JSON.stringify(json, null, 2));

			
			//var alertMsg = msg.text + "\n" + msg.url + ", line " + msg.line + stackTrace(msg.stackTrace, msg.line);
			
			var errorReport = "############################## " + myDate() + " ##############################" + newLine
			
			errorReport += messageLog.join(newLine) + newLine; // Last log messages before the error

			errorReport += newLine + newLine + fullPad + parseText(msg.text) + newLine;
			
			errorReport += stackTrace(msg.stackTrace) + newLine + newLine;

			
			log(errorReport);
			
			var alertMsg = parseText(msg.text);
			
			//console.log("alertMsg=" + alertMsg);
			
			
			if(!ignoreErrors) {
				// Ignore errors for a while so we don't have to close a shitload of alert boxes
				ignoreErrors = true;
				setTimeout(function continueCapturingErrors() {
					ignoreErrors = false;
				}, 2000);
				
				alert(alertMsg); // Does alert stop the world!?
			}
			
			var errorReportFilePath = "error_report " + (errorReportCounter++) + ".tmp";
			// Do not overwrite opened files!
			while(editor.files[errorReportFilePath]) {
				errorReportFilePath = "error_report " + (errorReportCounter++) + ".tmp";
			}
			
			if(thisSessionErrorCount > maxErrors) {
				if(!alertNoticeToManyErrors) {
					alertNoticeToManyErrors = true;
					alert("Too many errors detected. You should restart the editor! See error.log and/or the debug console.");
				}
			}
			else {
				
				thisSessionErrorCount++;
				
				editor.openFile(errorReportFilePath, editor.reportTemplate(errorReport), function errorReportOpened(file, err) {
					
					if(err) console.error(err);
					
					file.moveCaretToEnd();
				});
			}

			

			
			// Clear the console so we do not get the same error again if we reconnect
			//send(consoleClearMessages());
			// This clears for others too, so leave the messages
			
		}
		else {
			// Keep a list of the 100 latest message
			messageLog.push(pad(shortenUrl(msg.url) + ":" + msg.line) + parseText(msg.text));
			
			if(messageLog.length > maxLogLength) messageLog.shift();
		}

		function decodeJSON(str) {
			// Decode JSON
			var json = JSON.parse(txt);
			txt = JSON.stringify(json);
		}

		
		function parseText(txt) {
			// Some text is decoded in JSON... and some are not

			// Remove first and lost quote
			txt = txt.replace(/^"/g, ""); 
			txt = txt.replace(/"$/g, "");
			
			
			// Remove padding
			txt = txt.replace(/\s\s+/g, ' ');
			
			// Make proper line breaks
			// 	ex: at Object.editor.renderNeeded (editor.js:702:23)\n    at mouseMove (file:///C:/Users/Z/dev-repositories/js-editor/plugin/mouse_select.js:509:12)\n    at mouseMove (file:///C:/Users/Z/dev-repositories/js-editor/editor.js:2831:5)
			txt = txt.replace(/\\n/g, newLine);
			
			// Unquote quotes
			txt = txt.replace(/\\"/g, '"');


			// Add padding to new lines
			txt = txt.replace(/\n/g, newLine + fullPad); 
			
			// Shorten url's
			var urlRegex = new RegExp(baseUrl, "g"); // All of them!
			txt = txt.replace(urlRegex, ""); 
			
			txt = parseUnicode(txt);
			
			return txt;
			
			
			function parseUnicode(str) {
				var regExp = /\\u([\d\w]{4})/gi;
				str = str.replace(regExp, function (match, grp) {
					return String.fromCharCode(parseInt(grp, 16)); 
				} );
				str = unescape(str);
				return str;
			}
			
			
		}
		
		function stackTrace(stack) {
			
			if(!stack) return fullPad + "No stack available!";
			
			var str = "\n";
			var url = "";
			var functionName = "";
			
			//console.log(JSON.stringify(stack, null, 2));
			
			for(var i=0; i<stack.length; i++) {
				functionName = stack[i].functionName;
				url = shortenUrl(stack[i].url);
				
				if(functionName == "") {
					functionName = "Anonymous function"
					//console.warn("Anonymous function detected: " + (url ? url : stack[i].url) + ", line " + stack[i].lineNumber)
				}
				
				str += fullPad + "@ " + functionName + " (" + url + ":" + stack[i].lineNumber + ")" + newLine;
				
				//str += pad(url + ":" + stack[i].lineNumber) + functionName + "\n";

			}
			
			return str;
		}
		
		function shortenUrl(url) {
			return url.replace(baseUrl, "");
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
		fs.appendFileSync("error.log", txt + newLine);
	}
	
	function pad(str) {
		
		var left = padLength - str.length;
		if (left < 0) return str; // Return early if no padding is needed
		
		var padding = "";
		for(var i=0; i<left; i++) padding += " ";
		return str + padding;
	}
	
	function main() {
		restart();
	}
		
	main(); // Run main function after everything have been declared
	
})();