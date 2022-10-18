/*



*/

(function() {
	"use strict";

	var consoleLogOriginal = console.log;
	var consoleWarnOriginal = console.warn;
	var consoleErrorOriginal = console.error;
	var logFile;

	var debugConsoleMenu;

	EDITOR.plugin({
		desc: "Debug console",
		load: function loadDebugConsole() {

			debugConsoleMenu = EDITOR.windowMenu.add("Capture console logs", [S("Editor"), "Debug", 20], toggleDebugConsole);

		},
		unload: function unloadDebugConsole() {
			
			EDITOR.windowMenu.remove(debugConsoleMenu);

			disableDebugConsole();

			logFile = undefined;

		}
	});

	function toggleDebugConsole() {
		debugConsoleMenu.toggle();

		if(debugConsoleMenu.activated) {
			enableDebugConsole();
		}
		else {
			disableDebugConsole();
		}
	}

	function enableDebugConsole() {
	
		var state = {
			props: {
				disableParsing: true,
				fullAutoIndentation: false
			}
		}

		EDITOR.openFile("console", "", state, function(err, file) {

			logFile = file;

			console.log = captureConsoleLog("log");
			console.warn = captureConsoleLog("warn");
			console.error = captureConsoleLog("error");

		});

	}

	function disableDebugConsole() {

		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		console.error = consoleErrorOriginal;
	}

	function captureConsoleLog(logType) {
		return function() {
			var str;
			for (var i=0; i<arguments.length; i++) {
				addArg(arguments[i]);
			}


			var message = timeStamp() + " " + logType + ": " + str + " " + stackTrace();

			consoleLogOriginal(message);

			logFile.write(message, true);
		
			function addArg(arg) {

				if(typeof arg == "string") {
					str += arg;
				}
				if(typeof arg == "number") {
					str += arg.toString();
				}
				else if(typeof arg == "object") {
					if(typeof arg.toString == "function") {
						str += arg.toString();
					}
					else {
						try {
							str += JSON.stringify(arg, null, 2);
						}
						catch(err) {
							// Force it to a string
							str += (arg+"");
						}
					}
				}
			}
		}
	}

	function timeStamp() {
		var d = new Date();
		var h = d.getHours();
		var m  = d.getMinutes();
		var s = d.getSeconds();

		return h + ":" + m + ":" + s;
	}

	function stackTrace() {
		var err = UTIL.parseErrorMessage( (new Error()).stack );
		var stack = err.stack;
		stack.shift();

		if(stack.lenth == 0) return "";

		return stack[0].source + ":" + stack[0].line + " @" + stack[0].fun;
	}


})();

