(function() {
	"use strict";
	
	/*
		Reason we ditched the old self_debugger (that Attached itself to the chromium debug tool's console)
		is that ONLY ONE socket can connect to the chromium debug tool's console.
		
		This plugin will record all editor inputs and save state. 
		When an error is detected. An automatic test case will be created
		
	*/
	
	var files = {};
	var fileState = {};
	
	editor.on("fileOpen", selfDebugFileOpen);
	editor.on("fileClose", selfDebugFileClose);
	editor.on("interaction", selfDebugInteraction);
	//editor.on("fileChange", selfDebugFileChange);
	
	
	function selfDebugFileOpen(file) {
		files[file] = {text: file.text, caret: {index: file.caret.index, row: file.caret.row, col: file.caret.col}, actions: []}; // Save state
	}
	
	function selfDebugFileClose(file) {
		// Delete state
		delete files[file];
		delete fileState[file];
	}
	
	function selfDebugFileChange(file, change) {
		if(!fileState[file]) fileState[file] = [];
		
		fileState[file].push(file.text)
	}
	
	
	function selfDebugInteraction(interaction, options) {
		var file = editor.currentFile;
		
		if(file) {
			
			if(files[file]) {
				
				
				
				if(interaction == "keyDown") files[file].actions.push({interaction: interaction, options: options, fileState: fileState[file]});
			}
			
}
	}
	
	window.onerror = function(message, source, lineno, colno, error) {
		
		var yes = "Yes, Close the editor";
		var no = "No, keep running";
		var createTestRestart = "Create a test case and restart";
		var createTestKeepRunning = "Create a test case and keep running";
		confirmBox("" + source + ":<b>" + lineno + "</b><br>" + message + "<br><br>Close/restart the editor ?", [yes, no, createTestRestart, createTestKeepRunning], function (answer) {
			
			if(answer == createTestRestart || answer == createTestKeepRunning) {
				
				// Create a test case for automated testing
				
				
				if(answer == createTestRestart) answer = yes;
				
}
			
			if(answer == yes) {
				process.exit(1); // Exit code=1 should make the batch/bash script restart the editor
			}
			else {
				
				if(editor.devMode) {
					var gui = require('nw.gui').Window.get();
					gui.showDevTools();
				}
}
			
		});
		
	}
	
	
})();