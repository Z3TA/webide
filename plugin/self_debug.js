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
	
	var showAlertMessage = true;
	
	var errorReportCounter = 0; // Used for file names
	var thisSessionErrorCount = 0;
	var maxErrors = 5;
	var alertNoticeToManyErrors = false;
	
	var GUI = require('nw.gui').Window.get();
	
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
			
			// Save all state to temporary files !?
			
			
			
			//console.log(JSON.stringify(json, null, 2));
			
			
			//var alertMsg = msg.text + "\n" + msg.url + ", line " + msg.line + stackTrace(msg.stackTrace, msg.line);
			
			var errorReport = "############################## " + myDate() + " ##############################" + newLine
			
			errorReport += messageLog.join(newLine) + newLine; // Last log messages before the error
			
			errorReport += newLine + newLine + fullPad + parseText(msg.text) + newLine;
			
			errorReport += stackTrace(msg.stackTrace) + newLine + newLine;
			
			
			log(errorReport);
			
			var alertMsg = parseText(msg.text);
			
			//console.log("alertMsg=" + alertMsg);
			
			if(editor.settings.devMode) {
				// If the developer tools are open, we don't need to open a bug report template file
				GUI.showDevTools();
			}
			else {
				
				
				if(thisSessionErrorCount > maxErrors) {
					if(!alertNoticeToManyErrors) {
						alertNoticeToManyErrors = true;
						
						if(confirm("Max error limit reached. Do you want to *hard boot* the editor? The errors has been saved to error.log")) {
							GUI.reload();
						}
						
					}
				}
				else {
					
					// Don't *ask* to generate a bug report
					
					if(showAlertMessage) {
						
						// Prevent spamming of alert boxes
						showAlertMessage = false;
						setTimeout(function continueCapturingErrors() {
							showAlertMessage = true;
						}, 2000);
						
						alert(alertMsg); // Does alert stop the world!?
					}
					
					thisSessionErrorCount++;
					
					var errorReportFilePath = "bug_report.txt"; // The editor will add a counter to double files
					
					editor.openFile(errorReportFilePath, reportTemplate(errorReport), function errorReportOpened(file, err) {
						
						if(err) GUI.showDevTools();
						
						file.moveCaretToEnd(file.caret, function() {
							file.scrollToCaret(file.caret);
						});
					});
				}
				
				
				// Clear the console so we do not get the same error again if we reconnect
				//send(consoleClearMessages());
				// This clears for others too, so leave the messages
				
				// If in production, you better restart the editor
			}
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
	
	function sendBugReport() {
		
		var file = editor.currentFile;
		
		if(file) {
			
			if(confirm("Send this file as bug report?\n" + file.path)) {
				
				var message = file.text;
				
				httpPost("http://webtigerteam.com/mailform.nodejs", { meddelande: message, namn: 'JZEdit' }, function (respStr, err) {
					if(err) {
						alert("Problem sending bug report:  " + err.message);
						throw err;
					}
					else if(respStr.indexOf("Bad Gateway") != -1 || respStr.indexOf("Meddelande mottaget") == -1) {
						alert("Problem with bug reporting server. Try e-mailing the bug report. " + respStr);
						console.log("respStr=" + respStr);
					}
					else {
						alert("Bug report sent!");
					}
					
				});
				
				return false;
			}
		}
		
		return true;
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
	
	function reportTemplate(body, subject) {
		// Create a template used to report bugs
		
		if(!subject) {
			subject = "";
		}
		else {
			subject = ": " + subject;
		}
		
		var message = 'To: "Johan Zetterberg" <zeta@zetafiles.org>\n' +
		'Subject: JZedit bug report' + subject + '\n' +
		'\n' +
		'Date:' + (new Date()) + '\n' +
		'Commit: ' + editor.version + '\n' +
		'Platform: ' + process.platform + '\n' +
		'Arguments: ' + require('nw.gui').App.argv + '\n' +
		'\n' +
		body + '\n' +
		'\n' +
		'How to repeat:\n';
		
		return message;
	}
	
	
	function main() {
		var key_S = 83;
		editor.keyBindings.push({charCode: key_S, fun: sendBugReport, combo: CTRL + SHIFT});
		
		restart();
	}
		
	main(); // Run main function after everything have been declared
	
})();