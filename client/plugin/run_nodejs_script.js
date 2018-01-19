(function() {
	"use strict";
	
	var defaultArguments = "";
	
	EDITOR.plugin({
		desc: "Allows running Node.JS scripts",
		load: loadNodeJS,
		unload: unloadNodeJS,
	});
	
	function loadNodeJS() {
		var keyF1 = 112;
		var keyF3 = 114;
		EDITOR.bindKey({desc: "Runs the current (nodejs) file", fun: runNodeJsScript, charCode: keyF1, combo: 0});
		EDITOR.bindKey({desc: "Stops the current (nodejs) script", fun: stopNodeJsScript, charCode: keyF3, combo: 0});
		
		
		CLIENT.on("nodejsMessage", nodejsMessage);
		
	}
	
	function unloadNodeJS() {
		EDITOR.unbindKey(runNodeJsScript);
		EDITOR.unbindKey(stopNodeJsScript);
		
		CLIENT.removeEvent("nodejsMessage", nodejsMessage); 
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
		else if(msg.stdout) stdout(msg);
		else if(msg.stderr) stdout(msg);
		else if(msg.exit) stdout(msg);
		
		else if(msg.noMoreBreakPoints) {
			
		}
		
		else if(msg["console.log"]) {
			stdout(msg);
			
			// Also show it inline if it's visible
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
			var col = rowText.indexOf("console.log");
			var txt = msg["console.log"];
			txt = txt.replace("<", "&lt;"); // EDITOR.addInfo takes HTML as input
			txt = txt.replace(">", "&gt;");
			//EDITOR.addInfo(row-1, col, "WTF!?");
			
			EDITOR.showFile(file); // Make sure it's in view
			
			EDITOR.addInfo(row, col, txt);
			//}
			
			}
			
		else if(msg.ICP) alertBox("ICP from " + scriptName + ": " + msg.ICP);
			
			else if(msg.error) alertBox(scripName + " error: " + msg.error);
			
			else throw new Error("Unknown message from nodej script: " + JSON.stringify(msg));
			
		}
	
	function stdout(msg) {
		var stdOutFile = msg.scriptName + ".stdout";
		
		if(EDITOR.files.hasOwnProperty(stdOutFile)) {
			console.log("filePath=" + stdOutFile + " exist in EDITOR.files");
			appendFile(EDITOR.files[stdOutFile], msg);
		}
		else {
			console.log("Open file: filePath=" + stdOutFile + " ...");
			EDITOR.openFile(stdOutFile, "\n\n" + (new Date()) + ": Running " + msg.scriptName + " ...", function fileOpened(err, file) {
				if(err) throw err;
				appendFile(file, msg);
			});
		}
	}
	
	
	function stopNodeJsScript() {
		var filePath = EDITOR.currentFile.path;
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		var json = {filePath: filePath};
		
		CLIENT.cmd("stop_nodejs", json, function(err, json) {
			if(err) alertBox(err.message);
			else {
				console.log("Stopped script: " + json.filePath);
				}
		});
		
		return false;
	}
	
	function runNodeJsScript() {
		
		var file = EDITOR.currentFile;
		
		if(!file) return alertBox("No file open!");
		
		var filePath = file.path;
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		var json = {filePath: filePath};
		
		// Check if the file requires arguments
		if(file.text.indexOf("process.argv")) {
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
					console.log("Started script: " + json.filePath);
				}
			});
		}
		
	}
	
	function appendFile(file, msg) {
		
		console.log("appendFile: " + file.path + " msg=" + msg);
		
		if(msg.stdout) file.writeLine( (msg.type ? msg.type + ": " : "") + msg.stdout );
		else if(msg.stderr) file.writeLine(msg.stderr);
		else if(msg.exit) file.writeLine(msg.scriptName + " exited with exit code " + msg.exit.code + " and signal " + msg.exit.signal);
			
		EDITOR.renderNeeded();
	}
	
	
})();