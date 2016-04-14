(function() {
	"use strict";
	
	var consoleLogOriginal = console.log;
	var consoleTimeOriginal = console.time;
	var consoleTimeEndOriginal = console.timeEnd;
	var consoleWarnOriginal = console.warn;
	
	var toggleDevmodeMenuItem;
	var toggleDevmodeMenuItemPosition = 0;
	
	editor.on("start", init);
	
	function init() {
		
		var keyF5 = 116;
		var keyD = 68;
		var keyE = 69;
		
		// For convenience we can press F5 to reload while developing on the app itself
		editor.keyBindings.push({charCode: keyF5, fun: reloadEditor});
		
		// Switch devMode on or off by hitting Ctrl + Alt + D
		editor.keyBindings.push({charCode: keyD, fun: toggleDevMode, combo: CTRL + ALT});
		
		// Test how the editor handles errors
		editor.keyBindings.push({charCode: keyE, fun: testErrorHandler, combo: SHIFT + CTRL + ALT});
		
		
		editor.addMenuItem("Show dev tools", showDevTools);
		
		
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
		setTimeout(function throwError() {
			throw new Error("This is a test error");
		}, 2000);
		
		return false;
	}
	
	function disableDevMode() {
		
		toggleDevmodeMenuItemPosition = editor.removeMenuItem(toggleDevmodeMenuItem);
		toggleDevmodeMenuItem = editor.addMenuItem("Toggle dev-mode ON", toggleDevMode, toggleDevmodeMenuItemPosition); // Add items to the canvas context meny
		
		// Disable console.log
		console.log = console.time = console.timeEnd = console.warn = function() {} // Eaten by the void
		
		require('nw.gui').Window.get().closeDevTools();
		
		// Notify and report errors ..
		// 
		console.error = function(err) {
			// Save all state to temporary files
			
			// Notify the user about the error
			
			console.warn(err.stack);
			
			if(confirm(err + " ... Send error report?")) {
				
				// Send input history to be able to repeat the bug!??
				editor.openFile("bug_report.txt", err.message + "\n" + err.stack + "\nHow to repeat:\n", function(file) {
					file.moveCaretToEnd();
				});
				
			}
			else {
				
				throw err;
}
			
			// It's really not safe to continue from here
			
			//process.exit();
			
		}
	}
	
	function enableDevMode() {
		
		toggleDevmodeMenuItemPosition = editor.removeMenuItem(toggleDevmodeMenuItem);
		toggleDevmodeMenuItem = editor.addMenuItem("Toggle dev-mode OFF", toggleDevMode, toggleDevmodeMenuItemPosition); // Add items to the canvas context menu
		
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
			showDevTools()
			console.warn("devMode enabled!");
		}
		else {
			disableDevMode();
			console.warn("devMode disabled!");
		}
		editor.hideMenu();
		
		return false;
		
	}
	
	function showDevTools() {
		require('nw.gui').Window.get().showDevTools();
		editor.hideMenu();
	}
	
		function reloadEditor() {
			
			if(confirm("Do you want to reload the editor ?")) { // All keyBindings that reload or exit the editor should have a confirmation box, or we will not get test results!

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
			}
			
			return false; // Don't want a browser refresh!
			
		};
		
		
		
})();