
(function() {
	"use strict";

	var stdinFilePath = "stdin";
	var stdinFile;
	var stdinBuffer = "";
	
	EDITOR.plugin({
		desc: "Listen for stdin messages",
		load: function() {
			
			CLIENT.on("stdin", stdinPrint);
			
		},
		unload: function() {
			CLIENT.removeEvent("stdin", stdinPrint);
			
			if(stdinFile) EDITOR.closeFile(stdinFilePath);
			
		}
	});
	
	function stdinPrint(str) {
		if(stdinFile) {
			stdinFile.write(str);
			return;
		}
		
		if(EDITOR.openFileQueue.indexOf(stdinFilePath) == -1) {
			EDITOR.openFile(stdinFilePath, "", stdinFileOpened);
		}
		
		stdinBuffer += str;
		
	}
	
	function stdinFileOpened(err, file) {
		if(err) throw err;
		stdinFile = file;
		if(stdinBuffer) stdinFile.write(stdinBuffer);
		stdinBuffer = "";
	}
	
	
})();

