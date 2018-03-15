(function() {
	"use strict";
	
	var defaultArguments = "";
	
	var runningScripts = [];
	
	var debugStr = "__C_S_L_O_G_O_R('\x02' + __line);";
	
	EDITOR.plugin({
		desc: "Allows running Node.JS scripts",
		load: loadNodeJS,
		unload: unloadNodeJS
	});
	
	function loadNodeJS() {
		var keyF1 = 112;
		var keyF3 = 114;
		EDITOR.bindKey({desc: "Runs the current (nodejs) file", fun: runNodeJsScript, charCode: keyF1, combo: 0});
		EDITOR.bindKey({desc: "Stops the current (nodejs) script", fun: stopNodeJsScript, charCode: keyF3, combo: 0});
		
		EDITOR.on("showMenu", showRunNodejsScriptMenuItem);
		
		CLIENT.on("nodejsMessage", nodejsMessage);
		
	}
	
	function unloadNodeJS() {
		EDITOR.unbindKey(runNodeJsScript);
		EDITOR.unbindKey(stopNodeJsScript);
		
		CLIENT.removeEvent("nodejsMessage", nodejsMessage); 
	}
	
	function showRunNodejsScriptMenuItem() {
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		
		var isStdoutFile = false;
		var filePath = file.path;
		if(filePath.substr(filePath.length-7) == ".stdout") {
			filePath = filePath.substr(0, filePath.length-7);
			isStdoutFile = true;
		}
		
		var scriptIsRunning = (runningScripts.indexOf(filePath) != -1);
		
		if(!isNodejsScript(file) && !scriptIsRunning && !isStdoutFile) return true;
		
		var addSeparator = true;
		
		var scriptMenuItem = EDITOR.addTempMenuItem("Run nodejs script", addSeparator, runNodeJsScript);
		if(scriptIsRunning) EDITOR.updateMenuItem(scriptMenuItem, scriptIsRunning, "Stop nodej script", stopNodeJsScript);
		else EDITOR.updateMenuItem(scriptMenuItem, scriptIsRunning, "Run nodejs script", runNodeJsScript);
		
	}
	
	function isNodejsScript(file) {
		if(!file) return false;
		
		if(UTIL.getFileExtension(file.name) != "js") return false;
		
		var text = file.text;
		
		if(text.indexOf("document.getElementById") != -1) return false;
		if(text.indexOf("window.onload") != -1) return false;
		
		
		return true;
		
	}
	
	function nodejsMessage(msg) {
		console.log("nodejsMessage: " + JSON.stringify(msg));
		
		var filePath = msg.scriptName;
		
		if(msg.cannotFindModule) {
			
			var no = "No! (don't run script)";
			var installAll = "Yes, install all modules!"
			var yes = "Yes!";
			
			
			confirmBox("Install nodejs module <b>" + msg.cannotFindModule + "</b>  ?", [no, installAll, yes], function(answer) {
				if(answer == no) {
					// Do nothing
				}
				else if(answer == yes) {
					CLIENT.cmd("install_nodejs_module", {name: msg.cannotFindModule, filePath: filePath}, function(err, json) {
						if(err) alertBox(err.message);
						else {
							// Attempt to run the script again
							CLIENT.cmd("run_nodejs", {filePath: filePath}, function(err, json) {
								if(err) throw err;
								else {
									console.log("Started script: " + json.filePath);
								}
							});
						}
					});
				}
				else if(answer == installAll) {
					// Run the script again, and install all modules found
					CLIENT.cmd("run_nodejs", {filePath: filePath, installAllModules: true}, function(err, json) {
						if(err) throw err;
						else {
							console.log("Started script: " + json.filePath);
						}
					});
				}
				else throw new Error("Unknown answer=" + answer);
			});
		}
		else if(msg.stdout) {
stdout(msg);
		}
		else if(msg.stderr) {
			// ## stderr
			
			/*
				_http_outgoing.js:333
				throw new Error('`value` required in setHeader("' + name + '", value).');
				^
				
				Error: `value` required in setHeader("Access-Control-Allow-Origin", value).
				at ServerResponse.OutgoingMessage.setHeader (_http_outgoing.js:333:11)
				at Server.httpRequest (/nodejs/jsql/server.js.tmp:69:11)
				at Server.new_handler (/nodejs/jsql/node_modules/sockjs/lib/utils.js:89:20)
				at emitTwo (events.js:87:13)
				at Server.emit (events.js:172:7)
				at HTTPParser.parserOnIncoming [as onIncoming] (_http_server.js:528:12)
				at HTTPParser.parserOnHeadersComplete (_http_common.js:88:23)
				
				
				Prefer opening the file currently in view, then the main file, 
				then file's opened, then any file with a file path ...
				
			*/
			
			var text = msg.stderr;
			
			// First update line number and remove .tmp
			var reFileRun = new RegExp(UTIL.escapeRegExp(filePath) + "\\.tmp:(\\d+)");
			var arr, line=0, actualLine=0;
			console.log("Update line numbers:");
			while(arr = reFileRun.exec(text)) {
				console.log(arr);
				line = arr[1];
					actualLine = parseInt(line) - 20;
				text = text.replace(reFileRun, filePath + ":" + actualLine);
					}
				msg.stderr = text;
			
			// Get the path from the first line of the error message
			var firstLine = text.slice(0, text.indexOf("\n"));
			var reFirstLine = new RegExp("(.*)(\\.tmp)?:(\\d+)");
			var matchFirstLine = firstLine.match(reFirstLine);
			var pathOnFirstLine = matchFirstLine[1];
			if(!matchFirstLine) throw new Error("Unable to find " + reFirstLine + " in error message: " + text);
			console.log("pathOnFirstLine=" + pathOnFirstLine);
			
			
			var stackTrace = text.match(/\((.*):(\d+)\)/g);
			// remove the parentheses and line:column
			for (var i=0; i<stackTrace.length; i++) {
				stackTrace[i] = stackTrace[i].slice(1, stackTrace[i].indexOf(":"));
			}
			console.log("stackTrace=" + JSON.stringify(stackTrace));
			
				//console.log("msg.stderr=" + msg.stderr);
				//console.log("text=" + text);
				
				if(pathOnFirstLine == EDITOR.currentFile.path) {
					// The error is in the file currently in view
					showErrorMessage(EDITOR.currentFile, text);
				}
				else if(pathOnFirstLine == filePath) {
					// The error is in the file being run
				console.log("Opening " + pathOnFirstLine + " because it's the file bing run");
				attemptOpen(pathOnFirstLine, function opened(err, file) {
						// We should not have any problems opening this file ...
						if(err) throw err;
						else showErrorMessage(file, msg.stderr);
					});
				}
				else {
					// The path in the first line is not the file being run nor the current file in view
					
					if(pathOnFirstLine.charAt(0) == "/") { // Asume unix like file path ( not Windows like C:\\\\///Windows\\//// )
						// Attempt to open this file
					console.log("Opening " + pathOnFirstLine + " because it's an actual path (starts with a slash)");
					attemptOpen(pathOnFirstLine, function opened(err, file) {
							if(err) {
								console.error(err);
							alertBox(text);
							}
							else showErrorMessage(file, msg.stderr);
						});
					}
					else {
						// The error is in a native nodejs library ...
						// Traverse the stack to find a file we can actually open
						// Does the file in view or the file being run show up in the stack ? Then open it !
					
					if(EDITOR.currentFile && stackTrace.indexOf(EDITOR.currentFile.path) != -1) {
						showErrorMessage(EDITOR.currentFile, msg.stderr);
						}
					else if(stackTrace.indexOf(filePath) != -1) {
						console.log("Opening " + filePath + " because it's in the stack trace");
						attemptOpen(filePath, function opened(err, file) {
							// We should not have any problems opening this file ...
							if(err) throw err;
							else showErrorMessage(file, msg.stderr);
						});
					}
					else {
						// Attempt to open any file that has a real file path
						var found = false;
					for (var i=0; i<stackTrace.length; i++) {
							if(stackTrace[i].charAt(0) == "/") {
								found = true;
								console.log("Opening " + stackTrace[i] + " because it's in the stack trace and is an actual path (starts with a slash)");
								attemptOpen(stackTrace[i], function opened(err, file) {
									if(err) {
										console.error(err);
										alertBox(text);
									}
									else showErrorMessage(file, msg.stderr);
								});
							}
						}
						if(!found) alertBox(text);
					}
					
					
				}
				
				
			}
			
			// Remove debug strings from error message before showing it in the stdout file
			while(msg.stderr.indexOf(debugStr) != -1) {
				msg.stderr = msg.stderr.replace(debugStr, "");
			}
			
			stdout(msg);
			
			// end if(msg.stderr)
		} 
		else if(msg.exit) {
			runningScripts.splice(runningScripts.indexOf(filePath), 1);
			stdout(msg);
		}
		else if(msg.noMoreBreakPoints) {
			
		}
		
		else if(msg["console.log"]) {
			// ## console.log
			
			stdout(msg);
			
			// Also show it inline
			if(!msg.line) throw new Error("msg.line=" + msg.line);
			var line = parseInt(msg.line);
			if(isNaN(line)) throw new Error("msg.line=" + msg.line + " is not a number!");
			
			if(!EDITOR.files.hasOwnProperty(filePath)) {
				console.warn("The source file is not open: filePath=" + filePath);
				return;
			}
			
			var file = EDITOR.files[filePath];
			
			if(!file) throw new Error("The file is gone: filePath=" + filePath);
			
			var row = line-1;
			//if(file.rowVisible(row)) {
			var rowText = file.rowText(row, false);
			var col = rowText.indexOf("console.log") + 12;
			var txt = msg["console.log"];
			txt = txt.replace("<", "&lt;"); // EDITOR.addInfo takes HTML as input
			txt = txt.replace(">", "&gt;");
			//EDITOR.addInfo(row-1, col, "WTF!?", file);
			
			//EDITOR.showFile(file); // Make sure it's in view
			
			EDITOR.addInfo(row, col, txt, file);
			//}
			
		}
		
		else if(msg.ICP) alertBox("ICP from " + scriptName + ": " + msg.ICP);
		
		else if(msg.error) alertBox(scripName + " error: " + msg.error);
		
		else throw new Error("Unknown message from nodej script: " + JSON.stringify(msg));
		
		
		function attemptOpen(path, callback) {
			if(EDITOR.currentFile && EDITOR.currentFile.path == path) return callback(null, EDITOR.currentFile);
			if(EDITOR.files.hasOwnProperty(path)) {
				var file = EDITOR.files[path];
				EDITOR.showFile(file);
				return callback(null, file);
			}
			else {
				EDITOR.openFile(path, undefined, function open(err, file) {
					if(err) return callback(err);
					else {
						return callback(null, file);
					}
				});
			}
		}
		
	}
	
	
	function showErrorMessage(file, text) {
		
		/*
			/nodejs/err.js:8
			" excepteur sint esse enim occaecat ullamco" + xxx + " fugiat et reprehenderit. " +
			.                                              ^
			ReferenceError: xxx is not defined
			at foo (/nodejs/err.js:8:50)
			at main (/nodejs/err.js:3:2)
			
			
			---
			
			_http_outgoing.js:333
			throw new Error('`value` required in setHeader("' + name + '", value).');
			^
			
			Error: `value` required in setHeader("Access-Control-Allow-Origin", value).
			at ServerResponse.OutgoingMessage.setHeader (_http_outgoing.js:333:11)
			at Server.httpRequest (/nodejs/jsql/server.js:49:11)
			at Server.new_handler (/nodejs/jsql/node_modules/sockjs/lib/utils.js:89:20)
			at emitTwo (events.js:87:13)
			at Server.emit (events.js:172:7)
			at HTTPParser.parserOnIncoming [as onIncoming] (_http_server.js:528:12)
			at HTTPParser.parserOnHeadersComplete (_http_common.js:88:23)
			
			
		*/
		
		// Get the error description
		var reLine = new RegExp("(" + UTIL.escapeRegExp(file.path) + "):(\\d+)");
		var arr = text.split("\n");
		var loc = arr[0];
		var inline = arr[1];
		var point = arr[2];
		var desc = arr[3];
		var inDebugStr = false;
		var matchLine = text.match(reLine);
		var inlineTrim = 0;
		
		if(!desc) desc = arr[4];
		
		console.log("!showErrorMessage arr=", arr);
		
		if(!matchLine) throw new Error("Unable to get line number! text=" + text);
		
		console.log("matchLine=" + JSON.stringify(matchLine, null, 2));
		
		var lineNr = parseInt(matchLine[2]);
		console.log("lineNr=" + lineNr);
		
		// Remove debug console.log's
		if(inline.indexOf(debugStr) != -1) {
			inDebugStr = true;
			inline = inline.replace(debugStr, "");
		}
		
		// Trim inline string
		while(inline.charAt(0).match(/\s/)) {
			inlineTrim++;
			inline = inline.slice(1);
		}
		
		// Figure out where to place the text
		var includeIndentationCharacters;
		var rowText = file.rowText(lineNr-1, includeIndentationCharacters=false);
		var col = rowText.indexOf(inline);
		
		if(col == -1) {
			console.log("Unable to find inline=" + inline + " on rowText=" + rowText);
			/*
				throw new Error('`value` required in setHeader("' + name + '", value).'); on rowText=response.setHeader("Access-Control-Allow-Origin", origin)
				
				
				The "throw error" can be in another file, and we are going to show the error in one of the files in the stack trace ...
				Example: 
				Error: Error: `value` required in setHeader("Access-Control-Allow-Origin", value).
				Line: response.setHeader("Access-Control-Allow-Origin", origin)
				
				Run a diff to see if there's anything in common !?
				
			*/
			var jsdiff = JsDiff;
			var diff = jsdiff.diffChars(rowText, inline);
			diff = diff.concat(jsdiff.diffChars(rowText, desc)); // The error can also be helpful
			diff.sort(function(a, b) {
				if(a.added || a.removed) return 1;
				if(a.count > b.count) return -1;
				if(b.count > a.count) return 1;
				return 0;
			});
			var common = diff[0].value;
			
			console.log("common=" + common + " diff=" + JSON.stringify(diff, null, 2));
			
			if(common.length > 1) col = rowText.indexOf(common);
			else col = 0;
			}
		else {
		if(inDebugStr) col -= 30;
			col = col + point.length - 1; // The marker
			col = col - inlineTrim;
		}
		
		//desc = desc + "\nNostrud ipsum ullamco exercitation ex esse elit enim excepteur\nipsum eu nulla do excepteur dolor esse anim voluptate adipisicing id.";
		
		EDITOR.addInfo(lineNr-1, col, desc, file, 1);
		
	}
	
	function stdout(msg) {
		var stdOutFile = msg.scriptName + ".stdout";
		
		if(EDITOR.files.hasOwnProperty(stdOutFile)) {
			console.log("filePath=" + stdOutFile + " exist in EDITOR.files");
			appendFile(EDITOR.files[stdOutFile], msg);
		}
		else {
			console.log("Open file: filePath=" + stdOutFile + " ...");
			EDITOR.openFile(stdOutFile, "\n\n" + (new Date()) + ": Running " + msg.scriptName + " ...\n\n", function fileOpened(err, file) {
				if(err) throw err;
				file.moveCaretToEndOfFile();
				appendFile(file, msg);
			});
		}
	}
	
	
	function stopNodeJsScript() {
		var filePath = EDITOR.currentFile.path;
		
		EDITOR.hideMenu();
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		var json = {filePath: filePath};
		
		CLIENT.cmd("stop_nodejs", json, function(err, json) {
			if(err) alertBox(err.message);
			else {
				runningScripts.splice(filePath, 1);
				console.log("Stopped script: " + json.filePath);
			}
		});
		
		return false;
	}
	
	function runNodeJsScript() {
		
		var file = EDITOR.currentFile;
		
		EDITOR.hideMenu();
		
		if(!file) return alertBox("No file open!");
		
		var filePath = file.path;
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		var json = {filePath: filePath};
		
		// Check if the file requires arguments
		if(file.text.indexOf("process.argv") != -1) {
			var isPassword = false;
			var dialogDelay = 0;
			promptBox("Use these arguments (process.argv): ", isPassword, defaultArguments, dialogDelay, function(args) {
				if(args==null) return;
				json.args = args;
				defaultArguments = args;
				start(json);
			});
		}
		else start(json);
		
		return false;
		
		function start(json) {
			var stdOutFile = filePath + ".stdout";
			if(EDITOR.files.hasOwnProperty(stdOutFile)) EDITOR.files[stdOutFile].writeLine(" \n \n" + (new Date()) + ": Running " + filePath + " ...");
			
			CLIENT.cmd("run_nodejs", json, function(err, json) {
				if(err) throw err;
				else {
					if(runningScripts.indexOf(filePath) == -1) runningScripts.push(filePath);
					console.log("Started script: " + json.filePath);
				}
			});
		}
		
	}
	
	function appendFile(file, msg) {
		
		console.log("appendFile: " + file.path + " msg=" + msg);
		
		var eof = file.caret.eof;
		
		console.log("caret eof=" + eof + " " + JSON.stringify(file.caret));
		
		if(eof) {
			var method = file.insertText.bind(file);
		}
		else {
			var method = file.writeLine.bind(file);;
		}
		
		if(msg.stderr) method(msg.stderr);
		
		if(msg.stdout) method( (msg.type ? msg.type + ": " : "") + msg.stdout );
		if(msg["console.log"]) method(msg["console.log"] + "\n");
		
		if(msg.exit) method(msg.scriptName + " exited with exit code " + msg.exit.code + " and signal " + msg.exit.signal);
		
		EDITOR.renderNeeded();
	}
	
	
})();