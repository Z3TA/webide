(function() {
	"use strict";
	
	var consoleLogOriginal = console.log;
	var consoleTimeOriginal = console.time;
	var consoleTimeEndOriginal = console.timeEnd;
	var consoleWarnOriginal = console.warn;
	var consoleErrorOriginal = console.error;
	
	var toggleDevmodeMenuItem, showDevToolsMenuItem;
	var toggleDevmodeMenuItemPosition = 0;
	
	var runTestsMenuItem;
	
	
	/*
		This has some core functionality, but it will most likely be the plugin that manage devMode
		If more devMode manager plugins are added, some functionality needs to be added to EDITOR.js
		ex: EDITOR.enableDevMode() EDITOR.disableDevMode() EDITOR.eventListeners.devMode
		
	*/
	
	EDITOR.plugin({
		desc: "Manage console logs, devTools and toggle devMode",
		order: 10000, // Show far down in the menu
		load:function devModeLoad() {
			
			var keyF5 = 116;
			var keyD = 68;
			var keyE = 69;
			
			// For convenience we can press F5 to reload while developing on the editor itself
			EDITOR.bindKey({desc: "Reload/Update the editor", charCode: keyF5, fun: reloadEditor});
			
			// Switch devMode on or off by hitting Ctrl + Alt + D
			EDITOR.bindKey({desc: "DevMode on/off", charCode: keyD, fun: toggleDevMode, combo: CTRL + ALT});
			
			// Test how the editor handles errors
			EDITOR.bindKey({desc: "Throw a test error", charCode: keyE, fun: testErrorHandler, combo: SHIFT + CTRL + ALT});
			
			if(RUNTIME == "nw.js") showDevToolsMenuItem = EDITOR.addMenuItem("Show dev tools", showDevTools); // Built in Chromium dev tools
			
			if(EDITOR.settings.devMode == false) {
				disableDevMode(true);
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
			if(runTestsMenuItem) EDITOR.removeMenuItem(runTestsMenuItem);
			
			if(showDevToolsMenuItem) EDITOR.removeMenuItem(showDevToolsMenuItem);
			
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
	
	function disableDevMode(noAlert) {
		
		console.log("Disabling dev mode ...");
		
		EDITOR.unbindKey(runOneTest);
		
		if(!toggleDevmodeMenuItem) toggleDevmodeMenuItem = EDITOR.addMenuItem("Editor debugmode", toggleDevMode);
		EDITOR.updateMenuItem(toggleDevmodeMenuItem, false, "Editor debugmode");
		
		if(runTestsMenuItem) EDITOR.removeMenuItem(runTestsMenuItem);
		
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
		
		if(!noAlert) alertBox("devMode OFF!");
		
		if(typeof navigator == "object" && navigator.serviceWorker &&  navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage("devModeOff");
		
	}
	
	function enableDevMode() {
		
		var keyT = 84;
		EDITOR.bindKey({desc: "Run latest test", charCode: keyT, fun: runOneTest, combo: CTRL});
		
		showDevTools();
		
		// todo: How can I show the menu item further down !? So it does not annoy end users
		
		if(!toggleDevmodeMenuItem) toggleDevmodeMenuItem = EDITOR.addMenuItem("Editor debugmode", toggleDevMode);
		EDITOR.updateMenuItem(toggleDevmodeMenuItem, true, "Editor debugmode");
		
		runTestsMenuItem = EDITOR.addMenuItem("Run tests", runTests);
		
		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		
		console.time = consoleTimeOriginal
		console.timeEnd = consoleTimeEndOriginal
		
		if(typeof navigator == "object" && navigator.serviceWorker &&  navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage("devModeOn");
		
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
		if(RUNTIME=="nw.js") {
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
				//EDITOR.closeFile(testfile);
				
				// Call exit listeners before reloading
				EDITOR.fireEvent("exit", [], function afterExitEvent(err, returns) {
					if(err) throw err;
					
					var gotError = false;
					
					for(var fName in returns) {
						console.log(fName + " returned " + returns[fName]);
						if(returns[fName] === false || returns[fName] instanceof Error) {
							gotError = true;
							break;
						}
					}
					
					if(gotError) {
						throw new Error("There was an error in " + name + " (EDITOR.eventListeners.exit) when reloading the editor!\nYou have to reload manually.");
					}
					else {
						
						// Unload all plugins
						for(var i=0; i<EDITOR.plugins.length; i++) {
							console.log("unloading plugin: " + EDITOR.plugins[i].desc);
							EDITOR.plugins[i].unload(); // Call function (and pass global objects!?)
						}
						
						// Close all open windows
						for(var win in EDITOR.openedWindows) {
							try{EDITOR.openWindows[win].close();}
							catch(err) {};
						}
						
						/*
							for(var file in EDITOR.files) {
							delete EDITOR.files[file];
							}
						*/
						
						//document.location = "about:blank";
						//document.location = "file:///" + require("dirname") + "/client/index.htm";
						
						console.log("Reloading! RUNTIME=" + RUNTIME);
						
							window.onbeforeunload = null;
						location.reload();
						
						// Note that each reload will spawn another chrome debugger! And the old will just linger until the main program is closed.
						
					}
				});
			}
		});
		
		return false; // Don't want a browser refresh!
		
	}
	
	function runTests() {
		EDITOR.hideMenu();
		
		EDITOR.runTests(); // Runs all tests
		}
	
	function runOneTest() {
		EDITOR.runTests(true); // Only runs one test (the one with highest prio)
		return false; // Prevent browser default
	}
	
})();
