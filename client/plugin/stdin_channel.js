
(function() {
	"use strict";

	var stdinFilePath = "stdin";
	var stdinFile;
	var stdinBuffer = "";
	
	EDITOR.plugin({
		desc: "Listen for stdin messages",
		load: function() {
			
			CLIENT.on("stdin", stdinPrint);
			CLIENT.on("arguments", editorArguments);
			
			console.log("stdin channel module loaded!");
			
		},
		unload: function() {
			CLIENT.removeEvent("stdin", stdinPrint);
			CLIENT.removeEvent("arguments", editorArguments);
			
			if(stdinFile) EDITOR.closeFile(stdinFilePath);
			
		},
	});
	
	function editorArguments(str) {
		// Usually a file path
		var filePath = str;
		EDITOR.openFile(filePath, undefined, function fileOpened(err, file) {
			/*
				We want to tell the stdin channel when this file is closed!
			*/
			if(err) {
				alertBox("Failed to open " + filePath + "\n" + err.message);
			}
			
			// Other files might open and take away focus...
			setTimeout(function() {	EDITOR.showFile(file); }, 500);
			setTimeout(function() {	EDITOR.showFile(file); }, 1000);
			setTimeout(function() {	EDITOR.showFile(file); }, 1500);
			setTimeout(function() {	EDITOR.showFile(file); }, 2000);
			
		});
	}
	
	function stdinPrint(str) {
		
		console.log("stdinPrint: str=" + str);
		
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

