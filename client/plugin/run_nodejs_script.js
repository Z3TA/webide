(function() {
	"use strict";
	
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
				if(answer == "no") {
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
		
		if(msg.stdout) {
			
			var stdOutFile = filePath + ".stdout";
			
			if(EDITOR.files.hasOwnProperty(stdOutFile)) {
				console.log("filePath=" + stdOutFile + " exist in EDITOR.files");
			appendFile(EDITOR.files[stdOutFile], msg);
		}
		else {
			console.log("Open file: filePath=" + stdOutFile + " ...");
			EDITOR.openFile(stdOutFile, "\n\n" + (new Date()) + ": Running " + filePath + " ...", function fileOpened(err, file) {
					if(err) throw err;
					appendFile(file, msg);
				});
			}
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
		
		var filePath = EDITOR.currentFile.path;
		
		if(filePath.substr(filePath.length-7) == ".stdout") filePath = filePath.substr(0, filePath.length-7);
		
		var json = {filePath: filePath};
		
		var stdOutFile = filePath + ".stdout";
		if(EDITOR.files.hasOwnProperty(stdOutFile)) EDITOR.files[stdOutFile].writeLine(" \n \n" + (new Date()) + ": Running " + filePath + " ...");
		
		CLIENT.cmd("run_nodejs", json, function(err, json) {
			if(err) throw err;
			else {
				console.log("Started script: " + json.filePath);
			}
		});
		
		return false;
		
	}
	
	function appendFile(file, msg) {
		
		console.log("appendFile: " + file.path + " msg=" + msg);
		
		if(msg.stdout) file.writeLine(msg.stdout);
		else if(msg.stderr) file.writeLine(msg.stderr);
		else if(msg.exit) file.writeLine(msg.scriptName + " exited with exit code " + msg.exit.code + " and signal " + msg.exit.signal);
			
		EDITOR.renderNeeded();
	}
	
	
})();