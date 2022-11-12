/*
	
	Gnome Desktop Application with native views, like React Native but for Linux/Gnome desktop GUI
	
	todo: Parse messages from gjs and show inline messages! Example:
	(gjs:814): Gjs-WARNING **: 18:47:16.829: JS ERROR: ReferenceError: fff is not defined
	@hello.js:7:1
	
	Script hello.js threw an exception
	
	todo: Add test that checks if gjs is installed!
*/

(function() {
	"use strict";

	var gjsShebang = /#!.*gjs/;
	
	EDITOR.plugin({
		desc: "Gnome desktop app support",
		load: function loadGjs() {
			
			EDITOR.on("previewTool", previewGnomeAppMaybe);
			
		},
		unload: function unloadGjs() {
			EDITOR.removeEvent("previewTool", previewGnomeAppMaybe); 
		}
	});
	
	function previewGnomeAppMaybe(file) {
		// Look for shebang
		
		if( gjsShebang.test(file.text) ) {
			runGkjsApp(file.path);
			return true;
		}
		
		return false;
	}
	
	function runGkjsApp(filePath) {
		
var gjsBin = "/usr/bin/gjs";

		CLIENT.cmd("startProcess", {path: gjsBin, args: [filePath]}, function(err, resp) {
			if(err) return alertBox("Failed to run " + gjsBin + " error: " + err.message);
			
var windowWidth = undefined;
var windowHeight = undefined;

			EDITOR.virtualDisplay.show(windowWidth, windowHeight, function(err) {
				if(err) return alertBox("Unable to open virtual display in order to show the GJS app! Error: " + err.message);
				
			});
			
		});
		
	}
	
})();
