
(function() {
	"use strict";
	
	var defaultArguments = "";
	
	var runningScripts = [];
	
	var firstRunMsg = "";
	var firstRunMsgDefault = "This program was started from the IDE\n" + 
	"(Which gives you inline console log's and Error message.)\n" + 
	"If there however are problems, try running the script from the Terminal instead.\n";
	
	var winMenuStartScript, winMenuStopScript;
	
	var nodeJsBanner, startStopButton, urlHolder;
	
	EDITOR.plugin({
		desc: "Allows running Node.JS scripts",
		load: loadNodeJS,
		unload: unloadNodeJS
	});
	
	function loadNodeJS() {
		
		var keyF2 = 113;
		var keyF4 = 115;
		EDITOR.bindKey({desc: S("run_nodejs_script"), fun: runNodeJsScript, charCode: keyF2, combo: 0});
		EDITOR.bindKey({desc: S("stop_nodejs_script"), fun: stopNodeJsScript, charCode: keyF4, combo: 0});
		
		winMenuStartScript = EDITOR.windowMenu.add(S("run_nodejs_script"), ["Node.JS", 2], runNodeJsScript);
		winMenuStopScript = EDITOR.windowMenu.add(S("stop_nodejs_script"), ["Node.JS", 2], stopNodeJsScript);
		
		EDITOR.on("showMenu", showRunNodejsScriptMenuItem);
		EDITOR.on("runScript", runNodeJsScriptMaybe);
		EDITOR.on("previewTool", runNodeJsScriptMaybe, 3000); // Run after Static Site generator and web_preview
		
		if(!UTIL.isPrivateIp(window.location.hostname)) EDITOR.on("fileOpen", nodejsScriptFileOpenedMaybe); // Show banner with endpoint
		
		CLIENT.on("nodejsMessage", nodejsMessage);
		CLIENT.on("loginSuccess", updateRunMsg);
		CLIENT.on("nodejsDebug", nodejsDebugMsg);
		CLIENT.on("nodejsUrl", showNodejsBanner);
		
		nodeJsBanner = EDITOR.createWidget(createBanner);
		
	}
	
	function unloadNodeJS() {
		EDITOR.unbindKey(runNodeJsScript);
		EDITOR.unbindKey(stopNodeJsScript);
		
		EDITOR.windowMenu.remove(winMenuStartScript);
		EDITOR.windowMenu.remove(winMenuStopScript);
		
		EDITOR.removeEvent("showMenu", showRunNodejsScriptMenuItem);
		EDITOR.removeEvent("runScript", runNodeJsScriptMaybe);
		EDITOR.removeEvent("previewTool", runNodeJsScriptMaybe);
		EDITOR.removeEvent("fileOpen", nodejsScriptFileOpenedMaybe);
		
		CLIENT.removeEvent("nodejsMessage", nodejsMessage); 
		CLIENT.removeEvent("loginSuccess", updateRunMsg); 
		CLIENT.removeEvent("nodejsDebug", nodejsDebugMsg); 
		CLIENT.removeEvent("nodejsUrl", showNodejsBanner);
		
		nodeJsBanner.unload();
	}
	
	function nodejsScriptFileOpenedMaybe(file) {
		var ext = UTIL.getFileExtension(file.path);
		var reSock = /\/sock\/([^'" ]*)/;
		var match = file.text.match(reSock);
		
		if((ext == "js" || ext == "stdout") && match && EDITOR.user) {
			var name = match[1].trim();
			
			var url = "http://" + name + "." + EDITOR.user.name + "." + document.location.hostname;
			
			//showNodejsBanner({url: url});
			nodeJsBanner.show();
			
			startStopButton.innerText = "Run Node.JS script";
			startStopButton.onclick = function() {
saveAndRun(file);
			}
		}
		else nodeJsBanner.hide();
	}
	
	function saveAndRun(file) {
		if(!(file instanceof File)) file = EDITOR.currentFile;
		
		if(!file) return alertBox("No file open!");
		
		if(file != EDITOR.currentFile) EDITOR.showFile(file);
		
		var ext = UTIL.getFileExtension(file.path);
		
		if(ext == "js" || ext == "stdout") {
			EDITOR.saveFile(file, function(err, path) {
				if(err) return alertBox("Problem saving file: " + err.message);
				else runNodeJsScript();
			});
		}
		else return alertBox("Not a JavaScript file: " + file.path);
	}
	
	function showNodejsBanner(banner) {
		
		nodeJsBanner.show();
		
		var url = banner.url;
		
		console.log("showNodejsBanner: url=" +url);
		
		while(urlHolder.firstChild) urlHolder.removeChild(urlHolder.firstChild);
		var link = createBannerUrl(url);
		urlHolder.appendChild(link);
	}
	
	function createBannerUrl(url) {
		
		var span = document.createElement("span");
		var link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("target", "_blank");
		link.innerText = url;
		
		span.appendChild(document.createTextNode("URL: "));
		span.appendChild(link);
		
		return span;
	}
	
	function createBanner(widget) {
		var wrap = document.createElement("div");
		wrap.classList.add("runBanner");
		
		urlHolder = document.createElement("div");
		urlHolder.classList.add("url");
		
		startStopButton = document.createElement("button");
		startStopButton.classList.add("startStop");
		startStopButton.classList.add("button");
		startStopButton.classList.add("start");
		
		var hideButton = document.createElement("button");
		hideButton.classList.add("button");
		hideButton.innerText = "Hide";
		hideButton.onclick = widget.hide;
		
		wrap.appendChild(urlHolder);
		wrap.appendChild(startStopButton);
		wrap.appendChild(hideButton);
		
		return wrap;
	}
	
	function runNodeJsScriptMaybe(file, combo) {
		var ext = UTIL.getFileExtension(file.path);
		
		if(ext == "js" || ext == "stdout") {
			runNodeJsScript();
			return HANDLED;
		}
		
		return PASS;
	}
	
	function stopNodeJsScriptMaybe(file, combo) {
		var filePath = file.path;
		var ext = UTIL.getFileExtension(filePath);
		
		if(ext == "js" || ext == "stdout") {
			if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
			
			var scriptIsRunning = (runningScripts.indexOf(filePath) != -1);
			
			if(scriptIsRunning) {
				stopNodeJsScript();
				return HANDLED;
			}
		}
		
		return PASS;
	}
	
	function updateRunMsg(login) {
		//alertBox(JSON.stringify(login));
		if(login.user != "admin" && login.platform != "win32") {
			firstRunMsg = firstRunMsgDefault + "Don't forget to use unix pipes instead of port numbers!\n" +
			'Replace for example port 80 with "/sock/socketname" and access it from socketname.' + login.user + "." + location.hostname + "\n" +
			'(If you get a "port in use" or "unable to bind to port" error, try deleting the /sock/socketname file)\n';
			}
	}
	
	function nodejsDebugMsg(json) {
		if(json.console) {
			var type = json.console.type;
			var level = 3;
			
			if(type=="warn") level = 2;
			else if(type=="error") level = 1;
			
			var text = json.console.msg;
			
			text = text.replace("<", "&lt;"); // EDITOR.addInfo takes HTML as input
			text = text.replace(">", "&gt;");
			
			var loc = findFile(json.console.stack);
			
			if(!loc.file) throw new Error(loc.filePath + " no longer open ?");
			
			if(loc) {
				var col = columnMinusIndention(loc.file, loc.row, loc.col);
				EDITOR.addInfo(loc.row, col, text, loc.file, level);
			}
}
		else throw new Error("Unknown nodejsDebugMsg: json=" + JSON.stringify(json));
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
		
		var scriptMenuItem = EDITOR.ctxMenu.addTemp("Run nodejs script", addSeparator, runNodeJsScript);
		if(scriptIsRunning) EDITOR.ctxMenu.update(scriptMenuItem, scriptIsRunning, "Stop nodej script", stopNodeJsScript);
		else EDITOR.ctxMenu.update(scriptMenuItem, scriptIsRunning, "Run nodejs script", runNodeJsScript);
		
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
			
			stdout(msg);
			
			console.log("msg.stderr=" + UTIL.lbChars(msg.stderr));
			
			var ignore = ["Debugger attached.\r\nWaiting for the debugger to disconnect...\r\n"];
			
			if(ignore.indexOf(msg.stderr) == -1) {
				
				var messageShown = (EDITOR.showMessageFromStackTrace({stackTrace: msg.stderr, level: 1}) == SUCCESS);
				
			}
			
			return;
			
			
			// ## stderr
			
			// todo: use EDITOR.showMessageFromStackTrace();
			
			
			/*
				
				Error example:
				
				_http_outgoing.js:333
				throw new Error('`value` required in setHeader("' + name + '", value).');
				^
				
				Error: `value` required in setHeader("Access-Control-Allow-Origin", value).
				at ServerResponse.OutgoingMessage.setHeader (_http_outgoing.js:333:11)
				at Server.httpRequest (/nodejs/jsql/server.js:69:11)
				at Server.new_handler (/nodejs/jsql/node_modules/sockjs/lib/utils.js:89:20)
				at emitTwo (events.js:87:13)
				at Server.emit (events.js:172:7)
				at HTTPParser.parserOnIncoming [as onIncoming] (_http_server.js:528:12)
				at HTTPParser.parserOnHeadersComplete (_http_common.js:88:23)
				
				
				Prefer opening the file currently in view, then the main file, 
				then file's opened, then any file with a file path ...
				
				
				Another example:
				
				TypeError: Cannot read property 'indexOf' of undefined\n
				at /nodejs/minesweeper/server.js:37:34\n
				at Layer.handle [as handle_request] (/nodejs/minesweeper/node_modules/express/lib/router/layer.js:95:5)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:137:13)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at Route.dispatch (/nodejs/minesweeper/node_modules/express/lib/router/route.js:112:3)\n"}
				
			*/
			
			var text = msg.stderr;
			
			text = text.trim(); // throw "foo" errors start with a line break ! :P
			
			msg.stderr = text;
			
			// Get the path from the first line of the error message
			var firstLine = text.slice(0, text.indexOf("\n"));
			console.log("firstLine=" + firstLine);
			var reFirstLine = new RegExp("(.*)(\\.tmp)?(:\\d+(\\d*))");
			var matchFirstLine = firstLine.match(reFirstLine);
			if(!matchFirstLine) {
				console.log("Can't find " + reFirstLine + " in firstLine=" + firstLine + "");
				// Somtimes !? The first line wont hold the location. Then check on the first line of the stack 
				matchFirstLine = text.match(reFirstLine); // matchFirstLine=["    at /some_node_script2.js:1:1","    at /some_node_script2.js:1",null,":1"]
				if(!matchFirstLine) throw new Error("Unable to find " + reFirstLine + " in firstLine=" + firstLine + " or in text=" + text);
			}
			console.log("matchFirstLine=" + JSON.stringify(matchFirstLine));
			var pathOnFirstLine = matchFirstLine[1].trim();
			console.log("pathOnFirstLine=" + pathOnFirstLine);
			if(pathOnFirstLine.indexOf("at ") == 0) pathOnFirstLine = pathOnFirstLine.slice(3);
			pathOnFirstLine = pathOnFirstLine.replace(/:\d+$/, ""); // row
			pathOnFirstLine = pathOnFirstLine.replace(/:\d+$/, ""); // column
			console.log("pathOnFirstLine=" + pathOnFirstLine);
			
			/*
				if you use throw "foo" instead of throw new Error("foo") nodejs wont give a proper call stack!
			*/
			var reStack = /\((.*):(\d+)\)/g;
			var stackTrace = text.match(reStack);
			if(stackTrace == null) console.warn("Unable to find " + reStack + " in text=" + text)
			else {// remove the parentheses and line:column
				for (var i=0; i<stackTrace.length; i++) {
					stackTrace[i] = stackTrace[i].slice(1, stackTrace[i].indexOf(":"));
				}
				console.log("stackTrace=" + JSON.stringify(stackTrace));
			}
			//console.log("msg.stderr=" + msg.stderr);
			//console.log("text=" + text);
			
			console.log("EDITOR.currentFile ? " + !!EDITOR.currentFile);
			if(EDITOR.currentFile) console.log("EDITOR.currentFile.path ? " + EDITOR.currentFile.path );
			console.log("pathOnFirstLine=" + pathOnFirstLine);
			console.log("filePath=" + filePath);
			
			if(EDITOR.currentFile && EDITOR.currentFile.path == pathOnFirstLine) {
				// The error is in the file currently in view
				showErrorMessage(EDITOR.currentFile, text);
			}
			else if(pathOnFirstLine == filePath) {
				// The error is in the file being run
				console.log("Opening " + pathOnFirstLine + " because it's the file bing run");
				attemptOpen(pathOnFirstLine, function opened(attemptOpenErr, file) {
					// We should not have any problems opening this file ...
					if(attemptOpenErr) throw attemptOpenErr;
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
				else if(stackTrace) {
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
						var stdOutFile = msg.scriptName + ".stdout";
						
						// Attempt to open any file that has a real file path
						var found = false;
						for (var i=0; i<stackTrace.length; i++) {
							if(stackTrace[i].charAt(0) == "/") {
								found = true;
								console.log("Opening " + stackTrace[i] + " because it's in the stack trace and is an actual path (starts with a slash)");
								attemptOpen(stackTrace[i], function opened(err, file) {
									if(err) {
										console.error(err);
										console.warn("Couln't open " + stackTrace[i] + " to show error=" + text);
										
										if(EDITOR.files.hasOwnProperty(stdOutFile)) EDITOR.showFile(stdOutFile);
										else alertBox(text);
										
									}
									else showErrorMessage(file, msg.stderr);
								});
							}
						}
						if(!found) {
							if(EDITOR.files.hasOwnProperty(stdOutFile)) EDITOR.showFile(stdOutFile);
							else alertBox(text);
						}
					}
				}
				else console.warn("No stack trace vailable. Unable to find source of error in text=" + text);
			}
			
			stdout(msg);
			
			// end if(msg.stderr)
		}
		else if(msg.close) {
			scriptStopped(filePath);
			stdout(msg);
		}
		else if(msg.noMoreBreakPoints) {
			
		}
		
		else if(msg.ICP) alertBox("ICP from " + msg.scriptName + ": " + msg.ICP);
		
		else if(msg.error) alertBox(msg.scriptName + " error: " + msg.error);
		
		else throw new Error("Unknown message from nodej script: " + JSON.stringify(msg));
		
		
		function attemptOpen(path, callback) {
			if(EDITOR.currentFile && EDITOR.currentFile.path == path) return callback(null, EDITOR.currentFile);
			if(EDITOR.files.hasOwnProperty(path)) {
				var file = EDITOR.files[path];
				EDITOR.showFile(file);
				return callback(null, file);
			}
			else {
				console.log("EDITOR.files=" + Object.keys(EDITOR.files));
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
			
			
			----
			
			/nodejs/errortestmodule.js:1
			(function (exports, require, module, __filename, __dirname) { throw ("mo mo");
			^
			mo mo
			
		*/
		
		// Get the error description
		var reLine = new RegExp("(" + UTIL.escapeRegExp(file.path) + "):(\\d+)");
		var arr = text.split("\n");
		
		console.log("!showErrorMessage arr=", JSON.stringify(arr, null, 2));
		
		var loc = arr[0];
		var inline = arr[1];
		var point = arr[2];
		var desc = arr[3].trim();
		
		if(desc == "^") {
			desc = arr[5].trim();
			point = arr[3];
			inline = arr[2];
		}
		
		console.log("reLine=" + reLine);
		console.log("loc=" + loc);
		console.log("loc.match(reLine)=" + loc.match(reLine));
		console.log("point.trim()=" + point.trim() + "");
		
		if(point.trim().charAt(0) == "^") {
			console.log("Normal error message: loc=" + loc + " inline=" + inline + " point=" + point + " desc=" + desc);

			var inDebugStr = false;
			
			var inlineTrim = 0;
			
			if(desc == "") desc = arr[4].trim();
			
			var matchLine = text.match(reLine);
			if(!matchLine) throw new Error("Unable to get line number! text=" + text);
			
			console.log("reLine=" + reLine);
			console.log("matchLine=" + JSON.stringify(matchLine, null, 2));
			
			var lineNr = parseInt(matchLine[2]);
			console.log("lineNr=" + lineNr);
			
			// Trim inline string
			while(inline.charAt(0).match(/\s/)) {
				inlineTrim++;
				inline = inline.slice(1);
			}
			console.log("inlineTrim=" + inlineTrim);
			console.log("point.length=" + point.length);
			
			
			// Figure out where to place the text
			var includeIndentationCharacters;
			var rowText = file.rowText(lineNr-1, includeIndentationCharacters=false);
			var col = rowText.indexOf(inline);
			
			if(col == -1) {
				console.log("Unable to find inline=" + inline + " on rowText=" + rowText);
				
				var reCol = new RegExp("(" + UTIL.escapeRegExp(file.path) + "):(\\d+):(\\d+)");
				var matchCol = text.match(reCol);
				if(matchCol && matchCol.length == 4) col = parseInt(matchCol[3]);
				
				if(col == -1) {
					/*
					throw new Error('`value` required in setHeader("' + name + '", value).'); on rowText=response.setHeader("Access-Control-Allow-Origin", origin)
					
					
					The "throw error" can be in another file, and we are going to show the error in one of the files in the stack trace ...
					Example: 
					Error: Error: `value` required in setHeader("Access-Control-Allow-Origin", value).
					Line: response.setHeader("Access-Control-Allow-Origin", origin)
					
					Run a diff to see if there's anything in common !?
					
				*/
				var jsdiff = window.JsDiff;
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
			}
			else {
				col = col + point.length - 1; // The marker
				col = col - inlineTrim;
			}
		}
		else {
			console.log("Special error message!");
			
			/*
				
				TypeError: Cannot read property 'indexOf' of undefined\n
				at /nodejs/minesweeper/server.js:37:34\n
				at Layer.handle [as handle_request] (/nodejs/minesweeper/node_modules/express/lib/router/layer.js:95:5)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:137:13)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n
				at Route.dispatch (/nodejs/minesweeper/node_modules/express/lib/router/route.js:112:3)\n"}
			*/
			
			var desc = arr[0].trim();
			var reLine = new RegExp("(" + UTIL.escapeRegExp(file.path) + "):(\\d+):(\\d+)");
			
			var matchLine = text.match(reLine);
			if(!matchLine) throw new Error("Unable to get line number and column! " + reLine + " from text=" + text);
			
			console.log("reLine=" + reLine);
			console.log("matchLine=" + JSON.stringify(matchLine, null, 2));
			
			var lineNr = parseInt(matchLine[2]);
			var col = parseInt(matchLine[3]);
			
		}
		
		//desc = desc + "\nNostrud ipsum ullamco exercitation ex esse elit enim excepteur\nipsum eu nulla do excepteur dolor esse anim voluptate adipisicing id.";
		
		file.scrollToLine(lineNr);
		
		if(EDITOR.currentFile != file) EDITOR.showFile(file);
		
		EDITOR.addInfo(lineNr-1, col, desc, file, 1); // row, col, desc, file, level (1=error, 2=warn, 3=info)
		
	}
	
	function stdout(msg) {
		var stdOutFile = msg.scriptName + ".stdout";
		
		if(EDITOR.files.hasOwnProperty(stdOutFile)) {
			console.log("filePath=" + stdOutFile + " exist in EDITOR.files");
			appendFile(EDITOR.files[stdOutFile], msg);
		}
		else {
			console.log("Open file: filePath=" + stdOutFile + " ...");
			EDITOR.openFile(stdOutFile, 
			firstRunMsg + "\n\n" + (new Date()) + ":\nRunning " + msg.scriptName + " ...\n\n", 
			{
				show: false, 
				props: {noCollaboration: true}
			}, function fileOpened(err, file) {
				if(err) {
					if(err.code == "IN_QUEUE") {
						setTimeout(function waitForFileToOpen() {
							if(EDITOR.files.hasOwnProperty(stdOutFile)) {
								var file = EDITOR.files[stdOutFile];
								file.moveCaretToEndOfFile();
								appendFile(file, msg);
							}
							else {
								throw new Error("The file was in queue to be opened, but never opened! path=" + stdOutFile);
							}
						}, 300);
						return;
					}
					else throw err;
				}
				else {
					file.moveCaretToEndOfFile();
					appendFile(file, msg);
				}
			});
		}
	}
	
	function scriptStarted(filePath) {
		if(runningScripts.indexOf(filePath) == -1) runningScripts.push(filePath);
		
		nodeJsBanner.show();
		
		if(startStopButton) {
startStopButton.classList.remove("start");
			startStopButton.innerText = "Stop";
			startStopButton.onclick = stopNodeJsScript
		}
	}
	
	function scriptStopped(filePath) {
		if(runningScripts.indexOf(filePath) != -1) runningScripts.splice(runningScripts.indexOf(filePath), 1);
		else console.warn("filePath=" + filePath + " not in runningScripts=" + JSON.stringify(runningScripts));
		
		if(startStopButton) {
startStopButton.classList.add("start");
			startStopButton.innerText = "Save & Restart Node.JS script";
			startStopButton.onclick = saveAndRun;
		}
	}
	
	function stopNodeJsScript() {
		if(!EDITOR.currentFile) return ALLOW_DEFAULT;
		
		var filePath = EDITOR.currentFile.path;
		
		console.log("Stop nodejs script: " + filePath);
		
		EDITOR.ctxMenu.hide();
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		var json = {filePath: filePath};
		
		CLIENT.cmd("stop_nodejs", json, function(err, json) {
			
			if(err) {
				console.log("stop_nodejs: err.code=" + err.code);
				if(err.code == "NOT_RUNNING") alertBox("Script was not running: " + filePath);
				else return alertBox(err.message);
			}
			
			scriptStopped(filePath);
			
				console.log("Stopped script: " + json.filePath);
			});
		
		return false;
	}
	
	function runNodeJsScript() {
		var file = EDITOR.currentFile;
		
		EDITOR.ctxMenu.hide();
		
		if(!file) {
alertBox("No file open!");
			return ALLOW_DEFAULT;
		}
		
		var filePath = file.path;
		
		console.log("Run nodejs script: " + filePath);
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		if(filePath == file.path && !file.savedAs) return alertBox("Save the file before running it!");
		
		var json = {filePath: filePath, debug: true};
		
		// Check if the file requires arguments
		if(file.text.indexOf("process.argv") != -1) {
			promptBox("Use these arguments (process.argv): ", {defaultValue: defaultArguments, dialogDelay: 0}, function(args) {
				if(args==null) return;
				json.args = args;
				defaultArguments = args;
				start(json);
			});
		}
		else start(json);
		
		return PREVENT_DEFAULT;
		
		function start(json) {
			var stdOutFile = filePath + ".stdout";
			
			if(EDITOR.files.hasOwnProperty(stdOutFile)) {
				EDITOR.files[stdOutFile].writeLineBreak();
				EDITOR.files[stdOutFile].writeLineBreak();
				EDITOR.files[stdOutFile].writeLine((new Date()) + ":");
				EDITOR.files[stdOutFile].writeLine("Running " + filePath + " ...");
				EDITOR.files[stdOutFile].writeLineBreak();
				EDITOR.files[stdOutFile].writeLineBreak();
			}
			
			CLIENT.cmd("run_nodejs", json, function(err, json) {
				if(err) throw err;
				else {
					
					scriptStarted(filePath);
					
					console.log("Started script: " + json.filePath);
					EDITOR.stat("run_nodejs_script");
					}
			});
		}
		}
	
	function appendFile(file, msg) {
		
		console.log("appendFile: " + file.path + " msg=" + JSON.stringify(msg));
		
		file.noCollaboration = true; // Don't send changes of this file to collaborators (they will get the changes via the server anyway)
		
		var eof = file.caret.eof;
		console.log("caret eof=" + eof + " " + JSON.stringify(file.caret));
		
		if(msg.stderr) write(msg.stderr);
		if(msg.stdout) write( (msg.type ? msg.type + ": " : "") + msg.stdout );
		if(msg["console.log"]) write(msg["console.log"] + "\n");
		
		if(msg.close) write((eof ? "\n" : "") + msg.scriptName + " closed with code " + msg.close.code + " and signal " + msg.close.signal);
		
		EDITOR.renderNeeded();
		
		function write(str) {
			// Lines breaks will ne CRLF on Windows
			str = str.replace(/\r/g, ""); // Remove all CR
			
			if(eof) {
				// Auto scroll down
				//var method = file.insertText.bind(file);
				//if(str.slice(0,1) != "\n") str = "\n" + str;
				file.insertText(str);
			}
			else {
				// Just add the text without scrolling down to it
				//var method = file.writeLine.bind(file);;
				file.writeLine(str);
			}
		}
		
	}
	
	function infoHas(obj) {
		outer: for (var i=0; i<EDITOR.info.length; i++) {
			for(var prop in obj) {
				console.log("info " + 1 + " " + prop + "='" + EDITOR.info[i][prop] + "' = '" + obj[prop] + "'");
				if(EDITOR.info[i][prop] != obj[prop]) continue outer;
			}
			console.log("TRUE!");
			return true;
		}
		console.log("FALSE!");
		return false;
	}
	
	function columnMinusIndention(file, row, col) {
		var gridRow = file.grid[row];
		
		if(!gridRow) throw new Error("gridRow=" + gridRow + " row=" + row);
		
		var indentation = gridRow.indentationCharacters.length;
		
		// The v8 debugger gets the line number wrong because module stuff is inserted at the first line by Node.js
		if(row==0 && col >= 62) col -= 62;
		
		console.log("columnMinusIndention: row=" + row + " col=" + col + " indentation=" + indentation);
		
		var sum = col - indentation;
		
		if(isNaN(sum)) throw new Error("sum=" + sum + " col=" + col + " indentation=" + indentation);
		
		return sum;
	}
	
	function findFile(stackTrace) {
		var callFrames = stackTrace.callFrames;
		
		if(!stackTrace.callFrames) throw new Error( "Expected stackTrace to have a callFrames property: " + JSON.stringify(stackTrace, null, 2) );
		
		for (var i=0; i<callFrames.length; i++) {
			for(var path in EDITOR.files) {
				if( UTIL.isSamePath(path, callFrames[i].url) || UTIL.isSamePath(  UTIL.joinPaths(EDITOR.user.home, path), callFrames[i].url) ) {
return {
						filePath: path,
						file: EDITOR.files[path],
					row: callFrames[i].lineNumber, // Node.js adds one LOC to each script, then the inspector tries to compensate!? but gets it wrong
					col: callFrames[i].columnNumber
				};
			}
else {
					console.log("findFile: Not the same: path=" + path + " callFrames[" + i + "].url=" + callFrames[i].url);
}
		}
}
		
		return null;
	}
	
	
	
	// TEST-CODE-START
	
	EDITOR.addTest(false, function nodeJsInlineConsoleLogTest(callback) {
		
		var data = '\nconsole.log("Hello world!");\n\n';
		var filePath = "/nodeJsInlineConsoleLogTest.js";
		
		EDITOR.saveToDisk(filePath, data, function(err) {
			if(err) throw err;
			
			EDITOR.openFile(filePath, function(err, file) {
				if(err) throw err;
				
				runNodeJsScript();
				
				setTimeout(function() {
					
					var info = EDITOR.info[0];
					
					if(!info) throw new Error("No info bubble visible!");
					
					if(info.row != 1) throw new Error("info=" + JSON.stringify(info))
					
					// Cleanup
					EDITOR.closeFile(file.path);
					EDITOR.closeFile("/nodeJsInlineConsoleLogTest.js.stdout");
					
					if(nodeJsBanner) nodeJsBanner.hide();
					
					EDITOR.deleteFile(file.path);
					
					callback(true);
				}, 1000);
				
			});
			
		})
		
	});
	
	EDITOR.addTest(function testNodeErroMessage1(callback) {
		
		var errMsg = "Error: What a great name!";
		
		var msg = {
			"scriptName":"/some_node_script1.js",
			"stderr": "/some_node_script1.js:" + (1) + "\n\nhi Johan;\n    ^\n\n" + errMsg + "\nat fo (foo.js:333:11)\nat bar (bar.js:69:11)"
		};
		
		EDITOR.openFile("/some_node_script1.js", 'hi Johan;\n', function(err, file) {
			if(err) throw err;
			
			nodejsMessage(msg);
			
			setTimeout(function checkEditorInfo() {
				
				if(!infoHas({file: file, str: errMsg})) throw new Error("Expected EDITOR.info to have errMsg: " + errMsg);
				
				EDITOR.removeAllInfo(file);
				EDITOR.closeFile(file.path + ".stdout");
				EDITOR.closeFile(file.path);
				callback(true);
				
			},100);
			
		});
	});
	
	EDITOR.addTest(function testNodeErroMessage2(callback) {
		
		var errMsg = "ErrorExample: This is the error description";
		
		var msg = {
			"scriptName":"/some_node_script2.js",
			"stderr" : errMsg + "\n    at /some_node_script2.js:" + (1) + ":12\n    at foo (foo.js:95:5)\n    at bar (bar.js:137:13)\n"
		};
		
		// "stderr":"TypeError: Cannot read property \'indexOf\' of undefined\n    at /nodejs/minesweeper/server.js:37:34\n    at Layer.handle [as handle_request] (/nodejs/minesweeper/node_modules/express/lib/router/layer.js:95:5)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:137:13)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n    at next (/nodejs/minesweeper/node_modules/express/lib/router/route.js:131:14)\n    at Route.dispatch (/nodejs/minesweeper/node_modules/express/lib/router/route.js:112:3)\n"
		
		EDITOR.openFile("/some_node_script2.js", 'console.log("hello world!");\n', function(err, file) {
			if(err) throw err;
			
			nodejsMessage(msg);
			
			setTimeout(function checkEditorInfo() {
				if(!infoHas({file: file, str: errMsg, row: 0, col: 12})) throw new Error("Expected EDITOR.info in " + file.path + " to have errMsg: " + errMsg);
				
				EDITOR.removeAllInfo(file);
				EDITOR.closeFile(file.path + ".stdout");
				EDITOR.closeFile(file.path);
				callback(true);
			},100);
			
		});
	});
	
	EDITOR.addTest(function testNodeErroMessage3(callback) {
		
		var errMsg = "Error: My error";
		
		var msg = {
			"scriptName":"/some_node_script3.js",
			"stderr" : "events.js:182\n      throw er; // Unhandled 'error' event\n      ^\n" + errMsg + "\n    at Object._errnoException (util.js:1019:11)\n    at _exceptionWithHostPort (util.js:1041:20)\n    at Server.setupListenHandle [as _listen2] (net.js:1327:19)\n    at listenInCluster (net.js:1385:12)\n    at Server.listen (net.js:1480:5)\n    at Object.<anonymous> (/some_node_script3.js:2:8)\n    at Module._compile (module.js:624:30)\n    at Object.Module._extensions..js (module.js:635:10)\n    at Module.load (module.js:545:32)\n    at tryModuleLoad (module.js:508:12)\n"
		};
		
		EDITOR.openFile("/some_node_script3.js", '\nserver.listen("/sock/_abc", () => console.log("server started"));\n', function(err, file) {
			if(err) throw err;
			
			nodejsMessage(msg);
			
			setTimeout(function checkEditorInfo() {
				if(!infoHas({file: file, str: errMsg, row: 1, col: 8})) throw new Error("Expected EDITOR.info to have errMsg: " + errMsg);
				
				EDITOR.removeAllInfo(file);
				EDITOR.closeFile(file.path + ".stdout");
				EDITOR.closeFile(file.path);
				callback(true);
			},100);
			
		});
	});
	
	// TEST-CODE-END
	
})();