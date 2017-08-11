(function() {
	"use strict";
	
	EDITOR.plugin({
		desc: "Allows running Node.JS scripts",
		load: loadNodeJS,
		unload: unloadNodeJS,
	});
	
	function loadNodeJS() {
		var keyF1 = 112;
		
		EDITOR.bindKey({desc: "Runs the current (nodejs) file", fun: runNodeJsScript, charCode: keyF1, combo: 0});
	}
	
	function unloadNodeJS() {
		EDITOR.unbindKey(runNodeJsScript);
	}
	
	
	function runNodeJsScript() {
		var currentFile = EDITOR.currentFile.path;
		
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
					else if(msg.exitCode) {
						if(msg.stdErrArr) {
							for (var i=0; i<stdErrArr.length; i++) {
								file.writeLine(stdErrArr[i]);
							}
						}
						else file.writeLine("Done!");
					}
					EDITOR.renderNeeded();
				}
				
				
			});
			
		});
		
		return false;
		
	}
	
})();