(function() {
	"use strict";
	
	var consoleLogOriginal = console.log;
	var consoleTimeOriginal = console.time;
	var consoleTimeEndOriginal = console.timeEnd;
	var consoleWarnOriginal = console.warn;
	var consoleErrorOriginal = console.error;
	
	var toggleDevmodeMenuItem, showDevToolsMenuItem;
	var toggleDevmodeMenuItemPosition = 0;
	
	/*
		This has some core functionality, but it will most likely be the plugin that manage devMode
		If more devMode manager plugins are added, some functionality needs to be added to EDITOR.js
		ex: EDITOR.enableDevMode() EDITOR.disableDevMode() EDITOR.eventListeners.devMode
		
	*/
	
	EDITOR.plugin({
		desc: "Manages console logs, devTools and toggle devMode",
		order: 10,
		load:function devModeLoad() {
			
			var keyF5 = 116;
			var keyD = 68;
			var keyE = 69;
			
			// For convenience we can press F5 to reload while developing on the editor itself
			EDITOR.bindKey({desc: "Reload/Update the editor", charCode: keyF5, fun: reloadEditor});
			
			// Switch devMode on or off by hitting Ctrl + Alt + D
			EDITOR.bindKey({desc: "Toggle devMode on/off", charCode: keyD, fun: toggleDevMode, combo: CTRL + ALT});
			
			// Test how the editor handles errors
			EDITOR.bindKey({desc: "Throw a test error", charCode: keyE, fun: testErrorHandler, combo: SHIFT + CTRL + ALT});
			
			showDevToolsMenuItem = EDITOR.addMenuItem("Show dev tools", showDevTools); // Built in Chromium dev tools
			
			
			if(EDITOR.settings.devMode == false) {
				disableDevMode();
			}
			else if(EDITOR.settings.devMode == true) {
				enableDevMode();
			}
			
			/*
				setInterval(function() {
				throw new Error("test error msg");
				}, 5000);
			*/
			
		},
		unload: function unloadDevMode() {
			
			EDITOR.removeMenuItem(toggleDevmodeMenuItem);
			EDITOR.removeMenuItem(showDevToolsMenuItem);
			
			EDITOR.unbindKey(reloadEditor);
			EDITOR.unbindKey(toggleDevMode);
			EDITOR.unbindKey(testErrorHandler);
			
			console.log = consoleLogOriginal;
			console.time = consoleTimeOriginal;
			console.timeEnd = consoleTimeEndOriginal;
			console.warn = consoleWarnOriginal;
			console.error = consoleErrorOriginal;
			
		}
	});
	
	
	function testErrorHandler() {
		setTimeout(function throwError() {
			
			throw new Error("Test error");
			
		}, 1000);
		
		return false;
	}
	
	function disableDevMode() {
		
		if(toggleDevmodeMenuItem) toggleDevmodeMenuItemPosition = EDITOR.removeMenuItem(toggleDevmodeMenuItem);
		toggleDevmodeMenuItem = EDITOR.addMenuItem("Toggle dev-mode ON", toggleDevMode, toggleDevmodeMenuItemPosition); // Add items to the canvas context meny
		
		// Disable console.log
		//console.log = console.time = console.timeEnd = console.warn = function() {} // Eaten by the void
		console.log = console.warn = function() {}; // Perf mode
		
		// These are also an overhead
		console.time = console.timeEnd = function() {};
		
		try {
			require('nw.gui').Window.get().closeDevTools();
		}
		catch(e) {}; // We are in the browser
		
		/*
			The console.error(new Error("custom error")) way of *handling* errors has been depricated in favor for the self_debug.js plugin.
			The self_debug plugin will however not catch errors if the Chrome dev tools are open!
			Only use the Chrome dev tools when you are actually debugging! Turn devMode OFF when you are not debugging (watching the console)
		*/
		
		alertBox("devMode OFF!");
		
	}
	
	function enableDevMode() {
		
		showDevTools();
		
		if(toggleDevmodeMenuItem) {
			toggleDevmodeMenuItemPosition = EDITOR.removeMenuItem(toggleDevmodeMenuItem);
		}
		toggleDevmodeMenuItem = EDITOR.addMenuItem("Toggle dev-mode OFF", toggleDevMode, toggleDevmodeMenuItemPosition); // Add items to the canvas context menu
		
		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		
		console.time = consoleTimeOriginal
		console.timeEnd = consoleTimeEndOriginal
		
		//alertBox("devMode now active!");
		
	}
	
	function toggleDevMode() {
		
		EDITOR.settings.devMode = EDITOR.settings.devMode ? false : true;
		console.warn("Toggling devMode = " + EDITOR.settings.devMode);
		
		if(EDITOR.settings.devMode) {
			enableDevMode();
			console.log("devMode enabled");
		}
		else {
			disableDevMode();
			console.log("devMode disabled");
		}
		EDITOR.hideMenu();
		
		return false;
		
	}
	
	function showDevTools() {
		if(runtime=="nw.js") {
			require('nw.gui').Window.get().showDevTools();
		}
		EDITOR.hideMenu();
		
	}
	
	function reloadEditor() {
		
		// All keyBindings that reload or exit the editor should have a confirmation box, or we will not get test results!
		
		var yes = "Yes, reload!";
		var no = "No, dont reload";
		confirmBox("Do you want to reload the editor ?", [yes, no], function (answer) {
			
			if(answer == yes) {
				var func, name, ret = true;
				
				//EDITOR.closeFile(testfile);
				
				// Call exit listeners before reloading
				for(var i=0, f; i<EDITOR.eventListeners.exit.length; i++) {
					
					func = EDITOR.eventListeners.exit[i].fun;
					name = UTIL.getFunctionName(func);
					
					if(typeof func != "function") {
						
						console.warn(typeof f + " name=" + name + " json=" + JSON.stringify(f));
						//console.warn(UTIL.objInfo(f));
						
						throw  new Error("Index=" + i + " of EDITOR.eventListeners.exit has no valid function!");
						
					}
					else {
						ret = func();
					}
					
					
					console.log(name + " returned " + ret);
					
					if(ret !== true) break; // Not true means there's an error
				}
				
				if(ret !== true) {
					throw new Error("There was an error in " + name + " (EDITOR.eventListeners.exit) when reloading the editor!\nYou have to reload manually.");
				}
				else {
					
					// Unload all plugins
					for(var i=0; i<EDITOR.plugins.length; i++) {
						console.log("unloading plugin: " + EDITOR.plugins[i].desc);
						EDITOR.plugins[i].unload(); // Call function (and pass global objects!?)
					}
					
					/*
						for(var file in EDITOR.files) {
						delete EDITOR.files[file];
						}
					*/
					
					//document.location = "about:blank";
					//document.location = "file:///" + require("dirname") + "/index.htm";
					location.reload();
					
					// Note that each reload will spawn another chrome debugger! And the old will just linger until the main program is closed.
					
				}
			}
		});
		
		return false; // Don't want a browser refresh!
		
	};
	
	
	
})();
