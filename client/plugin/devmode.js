(function() {
	"use strict";
	
	var consoleLogOriginal = console.log;
	var consoleTimeOriginal = console.time;
	var consoleTimeEndOriginal = console.timeEnd;
	var consoleWarnOriginal = console.warn;
	var consoleErrorOriginal = console.error;
	var devModeManuallOffOnce = false;
	
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
			
			if(RUNTIME == "nw.js") showDevToolsMenuItem = EDITOR.ctxMenu.add("Show dev tools", showDevTools, 21); // Built in Chromium dev tools
			
			console.log("QUERY_STRING.debug=" + QUERY_STRING.debug);
			
			if(QUERY_STRING.dev == "false") {
				disableDevMode(true);
			}
			else if(QUERY_STRING.debug && EDITOR.settings.devMode == true) {
				enableDevMode();
				enableDebugMode();
			}
			else if(QUERY_STRING.debug) {
				enableDevMode();
			}
			else if(EDITOR.settings.devMode == false) {
				disableDevMode(true);
			}
			else if(EDITOR.settings.devMode == true) {
				enableDevMode();
			}
			else throw new Error("hmm: QUERY_STRING.debug=" + QUERY_STRING.debug + " EDITOR.settings.devMode=" + EDITOR.settings.devMode);
			
			/*
				setInterval(function() {
				throw new Error("test error msg");
				}, 5000);
			*/
			
		},
		unload: function unloadDevMode() {
			
			EDITOR.ctxMenu.remove(toggleDevmodeMenuItem);
			if(runTestsMenuItem) EDITOR.ctxMenu.remove(runTestsMenuItem);
			
			if(showDevToolsMenuItem) EDITOR.ctxMenu.remove(showDevToolsMenuItem);
			
			EDITOR.unbindKey(reloadEditor);
			EDITOR.unbindKey(toggleDevMode);
			EDITOR.unbindKey(testErrorHandler);
			
			EDITOR.unbindKey(runOneTest);
			
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
		
		devModeManuallOffOnce = true;
		
		EDITOR.unbindKey(runOneTest);
		
		if(!toggleDevmodeMenuItem) toggleDevmodeMenuItem = EDITOR.ctxMenu.add("Editor debugmode", toggleDevMode, 20);
		EDITOR.ctxMenu.update(toggleDevmodeMenuItem, false, "Editor debugmode");
		
		if(runTestsMenuItem) EDITOR.ctxMenu.remove(runTestsMenuItem);
		
		// Disable console.log
		//console.log = console.time = console.timeEnd = console.warn = function() {} // Eaten by the void
		console.log = function() {}; // Perf mode
		
		if(!QUERY_STRING.warn) {
			console.warn = function() {};
		}
		
		// These are also an overhead
		if(!QUERY_STRING.time) {
console.time = console.timeEnd = function() {};
		}
		// Use for example ?dev=false&time=true to turn off console.logs but show console.time
		
		if(RUNTIME == "nw.js") require('nw.gui').Window.get().closeDevTools();
		
		/*
			The console.error(new Error("custom error")) way of *handling* errors has been depricated in favor for the self_debug.js plugin.
			The self_debug plugin will however not catch errors if the Chrome dev tools are open!
			Only use the Chrome dev tools when you are actually debugging! Turn devMode OFF when you are not debugging (watching the console)
		*/
		
		if(typeof navigator == "object" && navigator.serviceWorker &&  navigator.serviceWorker.controller) {
			try {
				navigator.serviceWorker.controller.postMessage("devModeOff");
			}
			catch(err) {
				console.warn("Failed to post message to server worker: " + err.message);
			}
		}
		
		if(!noAlert) alertBox("devMode OFF!");
	}
	
	function enableDevMode() {
		
		var keyT = 84;
		EDITOR.bindKey({desc: "Run latest test", charCode: keyT, fun: runOneTest, combo: CTRL});
		
		showDevTools();
		
		// todo: How can I show the menu item further down !? So it does not annoy end users
		
		if(!toggleDevmodeMenuItem) toggleDevmodeMenuItem = EDITOR.ctxMenu.add("Editor debugmode", toggleDevMode, 18);
		EDITOR.ctxMenu.update(toggleDevmodeMenuItem, true, "Editor debugmode");
		
		runTestsMenuItem = EDITOR.ctxMenu.add("Run tests", runTests, 19);
		
		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		
		console.time = consoleTimeOriginal
		console.timeEnd = consoleTimeEndOriginal
		
		if(typeof navigator == "object" && navigator.serviceWorker &&  navigator.serviceWorker.controller) {
			// Firefox on Macbook pro might give "Service Worker state is redudant"
			try {
				navigator.serviceWorker.controller.postMessage("devModeOn");
			}
			catch(err) {
				console.log("Problem sending message to service worker: " + err.message);
			}
		}
		
		if(EDITOR.settings.devMode == false || devModeManuallOffOnce) alertBox("Editor devMode active! EDITOR.version=" + EDITOR.version);
	}
	
	function enableDebugMode() {
		/*
			Send all clinet console.log's to the server.
			Useful for when testing the editor in a browser that doesn't have developer tools
		*/ 
		
		console.log = console.warn = log;
		
		//CLIENT.cmd("log", {data: "Debug mode enabled"});
		
		function log() {
			// Avoid recursion
			console.log = consoleLogOriginal;
			console.warn = consoleWarnOriginal;
			
			// Get the parameters
			var str = "";
			for (var i=0; i<arguments.length; i++) {
				if(arguments[i] && typeof arguments[i].toString == "function") str += arguments[i].toString() + "\n";
				else str += arguments[i] + "\n";
			}
			
			CLIENT.cmd("log", {data: str});
			
			console.log = console.warn = log;
		}
		
		function nothing() {};
		
	}
	
	function disableDebugMode() {
		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		CLIENT.cmd("log", {data: "Debug mode disabled"});
	}
	
	function toggleDevMode() {
		
		EDITOR.settings.devMode = EDITOR.settings.devMode ? false : true;
		console.warn("Toggling devMode = " + EDITOR.settings.devMode);
		
		if(EDITOR.settings.devMode) {
			enableDevMode();
			console.log("devMode enabled");
		}
		else {
			disableDebugMode();
			disableDevMode();
			console.log("devMode disabled");
		}
		EDITOR.ctxMenu.hide();
		
		return false;
		
	}
	
	function showDevTools() {
		if(RUNTIME=="nw.js") {
			require('nw.gui').Window.get().showDevTools();
		}
		EDITOR.ctxMenu.hide();
		
	}
	
	function reloadEditor() {
		
		// All keyBindings that reload or exit the editor should have a confirmation box, or we will not get test results!
		
		var yes = "Yes, reload!";
		var no = "No, dont reload";
		confirmBox("Do you want to reload the editor ?", [yes, no], function (answer) {
			if(answer == yes) {
				//EDITOR.closeFile(testfile);
				
				EDITOR.reload();
				
			}
		});
		
		return false; // Don't want a browser refresh!
		
	}
	
	function runTests() {
		EDITOR.ctxMenu.hide();
		
		EDITOR.runTests(); // Runs all tests
		}
	
	function runOneTest() {
		EDITOR.runTests(true); // Only runs one test (the one with highest prio)
		return false; // Prevent browser default
	}
	
})();
