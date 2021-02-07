
"use strict";

var LOGFILE = null;
var LOGLEVEL = 7;
var CONSOLE_LOG_ORIGINAL = console.log;
var CONSOLE_WARN_ORIGINAL = console.warn;

//var _emerg = 0;
//var _alert = 1;
//var _crit = 2;
//var _err = 3;
var _warning = 4;
var _notice = 5;
var _info = 6;
var _debug = 7;

function tidyStack(row) {
	var dir = process.cwd();
	var dir2 = dir.replace(/server$/, "");
	//CONSOLE_LOG_ORIGINAL("dir=" + dir);
	//CONSOLE_LOG_ORIGINAL("dir2=" + dir2);

	var indexDir = row.indexOf(dir);
	var indexDir2 = row.indexOf(dir2);
	//CONSOLE_LOG_ORIGINAL("indexDir=" + indexDir);
	//CONSOLE_LOG_ORIGINAL("indexDir2=" + indexDir2);

	if(indexDir == -1) {
		indexDir = indexDir2;
		dir = dir2;
	}

	if(indexDir != -1) {
		var where = row.substring(indexDir + dir.length);
	}
	else {
		var where = row.replace(dir, "").replace(dir2, "").trim();
	}

	if(where.charAt(0) == "/") where = where.substr(1);
	if(where.charAt(where.length-1) == ")") where = where.slice(0, -1);

	return where;
}


function log(msg, lvl, noTrace) {
	
	if(lvl == undefined) lvl = _info;
	if(lvl > LOGLEVEL) return;
	
	var USE_COLORS = true;

	if(global.LOGFILE) USE_COLORS = false;

	var where = "";
	
	//CONSOLE_LOG_ORIGINAL("msg.length=" + msg.length);
	//CONSOLE_LOG_ORIGINAL("arguments.length=" + arguments.length);


	// If third parameter is a number, show n levels of stack traces
	if(typeof noTrace == "number") {
		try {
			var stack = (new Error().stack).split(/\r\n|\n/);
		}
		catch(err) {
			return CONSOLE_LOG_ORIGINAL(msg);
		}

		//CONSOLE_LOG_ORIGINAL("stack.length=" + stack.length + " " + JSON.stringify(stack, null, 2));

		for(var stackRow = 2; stackRow < stack.length && stackRow < noTrace+2; stackRow++) {
			if(stack[stackRow].indexOf("at Console.console.log") != -1 ||
			stack[stackRow].indexOf("at Console.console.warn") != -1 ||
			stack[stackRow].indexOf("at Console.console.error") != -1 ||
			stack[stackRow].indexOf("at Console.timeEnd") != -1) continue;
			where = where + tidyStack(stack[stackRow]) + " <- ";
		}

		where = where.slice(0,-4);

		where = "(" + where + ")";

	}
	else if(noTrace == undefined) {

		try {
			var stack = (new Error().stack).split(/\r\n|\n/);
		}
		catch(err) {
			return CONSOLE_LOG_ORIGINAL(msg);
		}

		//CONSOLE_LOG_ORIGINAL("log debug stack=" + JSON.stringify(stack.toString().split("    at"), null, 2));

		var row = stack[2];
		if(row.indexOf("at Console.console.log") != -1 || 
		row.indexOf("at Console.console.warn") != -1 ||
		row.indexOf("at Console.console.error") != -1 ||
		row.indexOf("at Console.timeEnd") != -1) row = stack[3];
		//CONSOLE_LOG_ORIGINAL("row=" + row);
			
		where = tidyStack(row);

		where = "(" + where + ")";

		//CONSOLE_LOG_ORIGINAL("indexDir=" + indexDir);
			
	}

	//CONSOLE_LOG_ORIGINAL("where=" + where);

	if(typeof msg != "string") {
		CONSOLE_LOG_ORIGINAL(where + ":");
		CONSOLE_LOG_ORIGINAL(msg);
		if(LOGFILE) throw new Error("Log message is not a string! msg:" + msg);
	}
	else {

		var dateString = myDate() + " ";
		var dateInMsg = (msg.indexOf(dateString.slice(0, 12)) != -1); // 2018-09-12 (08:58:46) 
		//CONSOLE_LOG_ORIGINAL("msg=" + msg);

		if(msg.indexOf("\n") != -1) {
			// Pad each line
			var padding = " ".repeat(dateString.length);
			msg = msg.replace(new RegExp("\\n", "g"), "\n" + padding);
		}

		var colorDim = "\x1b[2m";
		var colorReset = "\x1b[0m"
		var colorBlink = "\x1b[5m";
		var colorUnderscore = "\x1b[4m";

		var msgString = "";

		if(USE_COLORS) {
			if(!dateInMsg) {
				msgString = colorDim + dateString;

				if(lvl <= 6) msgString += colorReset;
			}
			else if(lvl > 6) msgString += colorDim;

			if(lvl == _warning) msgString += colorUnderscore;
			//else if(lvl == _notice) msgString += colorUnderscore;

			msgString += msg;

			if(!dateInMsg) msgString += " " + colorDim + where;

			msgString += colorReset;
		}
		else {
			if(!dateInMsg) msgString = dateString + msg + " " + where;
			else msgString = msg;
		}

		if(LOGFILE) {
			var fs = require('fs');
			var os = require("os");
			fs.appendFileSync(LOGFILE, msgString + os.EOL);
		}
		else {
			if(lvl <= _warning) CONSOLE_WARN_ORIGINAL(msgString);
			else CONSOLE_LOG_ORIGINAL(msgString);
			//else process._rawDebug(msgString);
			/*
				process._rawDebug is faster then console.log
					
			*/
		}
	}

	return where;
	
	function myDate() {
		var d = new Date();
		
		var hour = addZero(d.getHours());
		var minute = addZero(d.getMinutes());
		var second = addZero(d.getSeconds());
		
		var day = addZero(d.getDate());
		var month = addZero(1+d.getMonth());
		var year = d.getFullYear();
		
		return year + "-" + month + "-" + day + " (" + hour + ":" + minute + ":" + second + ")";
		
		function addZero(n) {
			if(n < 10) return "0" + n;
			else return n;
		}
	}
}

function setLogFile(logFile) {
	LOGFILE = logFile;
}

function setLogLevel(logLevel) {
	LOGLEVEL = logLevel;
}

function overrideConsole() {
	// Overload console.log 
	console.log = function() {
		var msg = arguments[0];
		for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
		log(msg, 7);
	}
}

module.exports = {
	log: log,
	setLogFile: setLogFile,
	setLogLevel: setLogLevel,
	overrideConsole: overrideConsole,
	ERROR: 3,
	WARN: 4,
	NOTICE: 5,
	INFO: 6,
	DEBUG: 7
};

