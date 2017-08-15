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
		
		
		CLIENT.on("nodejsWorkerMessage", nodejsWorkerMessage);
		
	}
	
	function unloadNodeJS() {
		EDITOR.unbindKey(runNodeJsScript);
		EDITOR.unbindKey(stopNodeJsScript);
		
		CLIENT.removeEvent("nodejsWorkerMessage", nodejsWorkerMessage); 
	}
	
	function nodejsWorkerMessage(msg) {
		console.log("nodejsWorkerMessage: " + JSON.stringify(msg));
		
		var filePath = msg.scriptName;
			
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
		
		if(msg.log) file.writeLine(msg.log);
		else if(msg.warn) file.writeLine("WARNING: " + msg.log);
		else if(msg.error) file.writeLine(msg.error);
		else if(msg.finished) {
			if(msg.stdErrArr.length > 0) {
				for (var i=0; i<msg.stdErrArr.length; i++) {
					file.writeLine(msg.stdErrArr[i]);
				}
			}
			else file.writeLine(msg.scriptName + " exited with exit code " + msg.exitCode);
			}
		EDITOR.renderNeeded();
	}
	
	
})();