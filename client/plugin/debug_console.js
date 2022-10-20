/*



*/

(function() {
	"use strict";

	var consoleLogOriginal = console.log;
	var consoleWarnOriginal = console.warn;
	var consoleErrorOriginal = console.error;
	var logFile;
	var buffer = "";

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
			var str = "";
			for (var i=0; i<arguments.length; i++) {
				//consoleLogOriginal("captureConsoleLog: arg[" + i + "]=" + parseArg(arguments[i]));
				str += parseArg(arguments[i]);
			}


			var message = timeStamp() + " " + logType + ": " + str + " " + stackTrace();

			consoleLogOriginal("captureConsoleLog: message.length=" + message.length + " " + UTIL.shortString(message));

			if(!FILE_WRITE_RECURSION) {
				logFile.write(buffer + message, true);
				buffer = "";
			}
			else {
				buffer = buffer + message + logFile.lineBreak;
			}

		}
	}

	function parseArg(arg) {
		if(typeof arg == "string") {
			return arg;
		}
		if(typeof arg == "number") {
			return arg.toString();
		}
		else if(typeof arg == "object") {
			if(typeof arg.toString == "function") {
				return arg.toString();
			}
			else {
				var err = false;
				try {
					var str = JSON.stringify(arg, null, 2);
				}
				catch(err) {
					err = true;
				}
				if(err) return arg+""; // Force it to a string
				else return str;
			}
		}
	}

	function timeStamp() {
		var d = new Date();
		var h = UTIL.zeroPad( d.getHours() );
		var m  = UTIL.zeroPad( d.getMinutes() );
		var s = UTIL.zeroPad( d.getSeconds() );

		return h + ":" + m + ":" + s;
	}

	function stackTrace() {
		var err = UTIL.parseErrorMessage( (new Error()).stack );
		var stack = err.stack;
		stack.shift();
		stack.shift();
		if(stack.lenth == 0) return "";

		return "@" + stack[0].fun + " " + stack[0].source + ":" + stack[0].line;
	}


})();

