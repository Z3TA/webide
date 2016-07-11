(function() {
	"use strict";
	
	/*
		Reason we ditched the old self_debugger (that Attached itself to the chromium debug tool's console)
		is that ONLY ONE socket can connect to the chromium debug tool's console.
		
		This plugin will record all editor inputs and save state. 
		When an error is detected. An automatic test case will be created
		
	*/
	
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