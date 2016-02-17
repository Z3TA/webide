(function() {
	"use strict";
	
	var consoleLogOriginal = console.log;
	
	editor.on("start", init);
	
	function init() {
		
		// For convenience we can press F5 to reload while developing on the app itself
		global.keyBindings.push({charCode: 116, fun: reloadEditor});
		
		// Switch devMode on or off by hitting Ctrl + Alt + D
		global.keyBindings.push({charCode: 68, fun: toggleDevMode, combo: CTRL + ALT});
		
		
		editor.addMenuItem("Toggle dev-mode", toggleDevMode); // Add items to the canvas context meny
		
		
		if(global.settings.devMode == false) {
			disableDevMode();
			
		}
		else if(global.settings.devMode == true) {
	
			enableDevMode();
	
		
		}
	}
	
	function disableDevMode() {
		// Disable console.log
		console.log = function() {
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
		
		console.error = function(err) {
			
			alert(err);
			console.log(err.stack);
			throw err;
			
			// It's really not safe to continue from here!
			
			
		}
		
	}
	
	function toggleDevMode() {
		
		global.settings.devMode = global.settings.devMode ? false : true;
		console.warn("devMode = " + global.settings.devMode);
		
		if(global.settings.devMode) {
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
			
			
			// Call exit listeners before reloading
			for(var i=0, f; i<global.eventListeners.exit.length; i++) {
			
			func = global.eventListeners.exit[i].fun;
			name = functionName(func);
				
			if(typeof func != "function") {
					
					console.warn(typeof f + " name=" + name + " json=" + JSON.stringify(f));
					//console.warn(objInfo(f));
					
					console.error( new Error("Index=" + i + " of global.eventListeners.exit has no valid function!"));
					
				}
				else {
				ret = func();
				}
				
				
				console.log(name + " returned " + ret);
				
				if(ret !== true) break; // Not true means there's an error
			}
			
			if(ret !== true) {
				console.error(error("There was an error in " + name + " (global.eventListeners.exit) when reloading the editor!\nYou have to reload manually."));
			}
			else {
				document.location = document.location.href;
			}
			
		};
		
		
		
})();