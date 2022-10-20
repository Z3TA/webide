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

		EDITOR.addPreRender(colorDebug);
	}

	function disableDebugConsole() {

		console.log = consoleLogOriginal;
		console.warn = consoleWarnOriginal;
		console.error = consoleErrorOriginal;

		EDITOR.removePreRender(colorDebug);
	}

	function captureConsoleLog(logType) {
		return function() {
			var str = "";
			for (var i=0; i<arguments.length; i++) {
				//consoleLogOriginal("captureConsoleLog: arg[" + i + "]=" + parseArg(arguments[i]));
				str += parseArg(arguments[i]);
			}


			var message = timeStamp() + " " + logType + " " + stackTrace() + "\n" + str + "";

			//consoleLogOriginal("captureConsoleLog: message.length=" + message.length + " " + UTIL.shortString(message));

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

		var src = stack[0].source.replace(document.location.origin, "");

		return "@" + stack[0].fun + " " + src + ":" + stack[0].line;
	}


	var reFirstLine = /^(\d+:\d+:\d+) (log|warn|error) (.*):(\d+)$/;
	function colorDebug(buffer, file, bufferStartRow, maxColumns) {
		
		//consoleLogOriginal("colorDebug! bufferStartRow=" + bufferStartRow + " buffer.length=" + buffer.length);

		var gray = UTIL.makeColorTransparent(EDITOR.settings.style.textColor, 50)

		var text = "", match = null, time = "", logType = "", src="", lineNr = "", bufferRow = 0;
		for(var row=bufferStartRow; row<(bufferStartRow+buffer.length); row++) {
			
			text = file.rowText(row);
			match = text.match(reFirstLine);

			//consoleLogOriginal("colorDebug: text: " + match);
			//consoleLogOriginal("colorDebug: match: " + match);

			if(!match) continue;

			time = match[1];
			logType = match[2];
			src = match[3];
			lineNr = match[4];

			bufferRow = row-bufferStartRow;

			color(buffer[bufferRow], 0, time.length, gray);
			
			if(logType == "log") color(buffer[bufferRow], time.length+1, logType.length, gray);
			if(logType == "warn") color(buffer[bufferRow], time.length+1, logType.length, EDITOR.settings.style.colorYellow);
			if(logType == "error") color(buffer[bufferRow], time.length+1, logType.length, EDITOR.settings.style.colorRed);

			color(buffer[bufferRow], time.length+1 + logType.length+1, src.length, gray);

			color(buffer[bufferRow], text.length-lineNr.length-1, 1, gray); // The colon before lineNr

			color(buffer[bufferRow], text.length-lineNr.length, lineNr.length, gray);

		}

		return buffer;
	}

	function color(gridRow, start, len, color) {
		for(var i=start; i<start+len; i++) {
			//consoleLogOriginal("gridRow.length=" + gridRow.length + " start=" + start + " len=" + len + " gridRow[" + i + "]=" + gridRow[i]);
			gridRow[i].color = color;
		}
	}

})();

