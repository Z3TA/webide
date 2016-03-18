(function() {
	"use strict";
	
	var consoleLogOriginal = console.log;
	var consoleTimeOriginal = console.time;
	var consoleTimeEndOriginal = console.timeEnd;
	var consoleWarnOriginal = console.warn;
	
	
	editor.on("start", init);
	
	function init() {
		
		// For convenience we can press F5 to reload while developing on the app itself
		editor.keyBindings.push({charCode: 116, fun: reloadEditor});
		
		// Switch devMode on or off by hitting Ctrl + Alt + D
		editor.keyBindings.push({charCode: 68, fun: toggleDevMode, combo: CTRL + ALT});
		
		editor.keyBindings.push({charCode: 69, fun: testErrorHandler, combo: SHIFT + CTRL + ALT});
		
		editor.addMenuItem("Toggle dev-mode", toggleDevMode); // Add items to the canvas context meny
		
		
		if(editor.settings.devMode == false) {
			disableDevMode();
			
		}
		else if(editor.settings.devMode == true) {
	
			enableDevMode();
	
		
		}
		
		/*
		setInterval(function() {
			throw new Error("test error msg");
		}, 5000);
		*/
		
	}
	
	function testErrorHandler() {
		throw new Error("This is a test error");
	}
	
	function disableDevMode() {
		// Disable console.log
		console.log = console.time = console.timeEnd = console.warn = function() {
			// Eaten by the void
		}
		
		// Notify and report errors
		console.error = function(err) {
			// Save all state to temporary files
			
			// Notify the user about the error
			if(confirm(err + " ... Send error report?")) {
				
				// Send input history to be able to repeat the bug!??
				
			}
			
			// It's really not safe to continue from here
			console.warn(err.stack);
			throw err;
			//process.exit();
			
		}
	}
	
	function enableDevMode() {
		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		
		console.time = consoleTimeOriginal
		console.timeEnd = consoleTimeEndOriginal
		
		console.error = function(err) {
			
			alert(err);
			console.log(err.stack);
			throw err;
			
			// It's really not safe to continue from here!
			
			
		}
		
	}
	
	function toggleDevMode() {
		
		editor.settings.devMode = editor.settings.devMode ? false : true;
		console.warn("devMode = " + editor.settings.devMode);
		
		if(editor.settings.devMode) {
			enableDevMode();
			console.warn("dev tools!?");
			// Show dev tools:
			require('nw.gui').Window.get().showDevTools();
			console.warn("devMode enabled!");
		}
		else {
			disableDevMode();
			console.warn("devMode disabled!");
		}
		editor.hideMenu();
	}
	
		function reloadEditor() {
			
			var func, name, ret = true;
			
			//editor.closeFile(testfile);
			
			// Call exit listeners before reloading
			for(var i=0, f; i<editor.eventListeners.exit.length; i++) {
			
			func = editor.eventListeners.exit[i].fun;
			name = functionName(func);
				
			if(typeof func != "function") {
					
					console.warn(typeof f + " name=" + name + " json=" + JSON.stringify(f));
					//console.warn(objInfo(f));
					
					console.error( new Error("Index=" + i + " of editor.eventListeners.exit has no valid function!"));
					
				}
				else {
				ret = func();
				}
				
				
				console.log(name + " returned " + ret);
				
				if(ret !== true) break; // Not true means there's an error
			}
			
			if(ret !== true) {
				console.error(error("There was an error in " + name + " (editor.eventListeners.exit) when reloading the editor!\nYou have to reload manually."));
			}
			else {
			//document.location = document.location.href;
			location.reload();
			}
			
		};
		
		
		
})();