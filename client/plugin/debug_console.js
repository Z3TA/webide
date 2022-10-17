/*



*/

(function() {
	"use strict";

	var consoleLogOriginal = console.log;
	var consoleWarnOriginal = console.warn;
	var consoleErrorOriginal = console.error;
	var logFile;

	EDITOR.plugin({
		desc: "Debug console",
		load: function loadDebugConsole() {

			enableDebugConsole();

		},
		unload: function unloadDebugConsole() {
			
			disableDebugConsole();

			logFile = undefined;

		}
	});

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
			console.warn = captureConsoleLog("wanr");
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

			logFile.write(timeStamp() + logType + ": " + str + stackTrace(), true);
		
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

})();

