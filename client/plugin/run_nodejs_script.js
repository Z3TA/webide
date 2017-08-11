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
	}
	
	function unloadNodeJS() {
		EDITOR.unbindKey(runNodeJsScript);
		EDITOR.unbindKey(stopNodeJsScript);
	}
	
	function stopNodeJsScript() {
		var filePath = EDITOR.currentFile.path;
		
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
		
		EDITOR.openFile(filePath + ".stdout", filePath + " stdout:\n", function fileOpened(err, file) {
			
			if(err) throw err;
			
			var json = {filePath: filePath};
			
			CLIENT.cmd("run_nodejs", json, function(err, json) {
				if(err) throw err;
				else {
					
					console.log("Started script: " + json.filePath);
					
					
					// create file.stdout !?
					
				}
			});
			
			CLIENT.on("nodejsWorkerMessage", function nodejsWorkerMessage(msg) {
				
				console.log("nodejsWorkerMessage: " + JSON.stringify(msg));
				
				if(msg.scriptName == filePath) {
					if(msg.log) file.writeLine(msg.log);
					else if(msg.warn) file.writeLine("WARNING: " + msg.log);
					else if(msg.finished) {
						if(msg.stdErrArr) {
							for (var i=0; i<msg.stdErrArr.length; i++) {
								file.writeLine(msg.stdErrArr[i]);
							}
						}
						else file.writeLine("Done!");
						CLIENT. // Don't append any more to the stdout file
					}
					EDITOR.renderNeeded();
				}
				
				
			});
			
		});
		
		return false;
		
	}
	
})();