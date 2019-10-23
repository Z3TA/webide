/*
	
	/bin/sh is NOT the same thing as bash! 
	bash is the login shell while sh is used for shell scripts.
	
*/

var module_os = require("os");

var ptyMissing = false;
console.log("Requiring node-pty module ...");
try {
	var module_pty = require('node-pty');
}
catch(err) {
	console.warn("Unable to require module node-pty: " + err.message);
	ptyMissing = err.message;
}

var UTIL = require("../../client/UTIL.js");
var module_fs = require("fs");

var TERMINAL_COUNTER = 0;

var TERMINAL = {};

var TERMINALS = {};

if(ptyMissing) {
	TERMINAL.open = ptyModuleNotLoaded;
	TERMINAL.write = ptyModuleNotLoaded;
	TERMINAL.resize = ptyModuleNotLoaded;
	TERMINAL.close = ptyModuleNotLoaded;
}
else {
	TERMINAL.open = newTerminal;
	TERMINAL.write = terminalWrite;
	TERMINAL.resize = terminalResize;
	TERMINAL.close = terminalClose;
}

var defaultEnv = {
	PATH: "/usr/bin:/bin/"
};

function newTerminal(user, json, callback) {
	
	var defaultCwd = process.env.HOME;
	
	var cols = json.cols || 80;
	var rows = json.rows || 30;
	var cwd = json.cwd || defaultCwd;
	var env = json.env || process.env || defaultEnv;
	var defaultShell = module_os.platform() == 'win32' ? 'powershell.exe' : '/bin/bash';
	var exec = json.exec || defaultShell;
	var termId = json.id || ++TERMINAL_COUNTER;
	
	console.log("cwd=" + cwd + " env=" + JSON.stringify(env) + "");
	
	if(cwd != defaultCwd) {
		// Check if the dir exist first
		var folders = UTIL.getFolders(cwd);
		checkDirectory(folders.pop());
	}
	else open(cwd);
	
	function checkDirectory(testFolder) {
		module_fs.stat(testFolder, function(err, stats) {
			if(!err && stats.isDirectory()) open(testFolder);
			else if(folders.length == 0) open(defaultCwd);
			else checkDirectory(folders.pop());
		});
	}
	
	
	function open(cwd) {
		if(termId < TERMINAL_COUNTER) {
			var error = new Error("Terminal id needs to be " + TERMINAL_COUNTER + " or higher");
			error.code = "TERMINAL_ID_COUNTER";
			return callback(error);
		}
		
		if(termId > TERMINAL_COUNTER) TERMINAL_COUNTER = termId;
		
		TERMINALS[termId] = module_pty.spawn(exec, [], {
			name: 'xterm-color',
			cols: cols,
			rows: rows,
			cwd: cwd,
			env: env
		});
		
		TERMINALS[termId].on('data', function(data) {
			user.send({terminal: {id: termId, data: data}});
		});
		
		TERMINALS[termId].on('exit', function(code, signal) {
			user.send({terminal: {
					id: termId, 
					exit: {
						code: code, 
						signal: signal
					}
				}
		});
		delete TERMINALS[termId];
	});
	
	callback(null, {id: termId, exec: TERMINALS[termId].process});
	}
}

function terminalWrite(user, json, callback) {
	
	var termId = json.id;
	var data = json.data;
	var term = TERMINALS[termId];
	if(data == undefined) return callback(new Error("data=" + data));
	if(!term) {
		var error = new Error("Unknown terminal id=" + termId);
		error.code = "UNKNOWN_TERMINAL_ID";
		return callback(error);
	}
	
	term.write(data);
	
	callback(null, {});
}

function terminalResize(user, json, callback) {
	
	var termId = json.id;
	var cols = json.cols;
	var rows = json.rows;
	var term = TERMINALS[termId];
	if(cols == undefined) return callback(new Error("cols=" + cols));
	if(rows == undefined) return callback(new Error("rows=" + rows));
	if(!term) {
		var error = new Error("Unknown terminal id=" + termId);
		error.code = "UNKNOWN_TERMINAL_ID";
		return callback(error);
	}
	term.resize(cols, rows);
	
	callback(null, {});
}

function terminalClose(user, json, callback) {
	
	var termId = json.id;
	var term = TERMINALS[termId];
	if(!term) {
		var error = new Error("Unknown terminal id=" + termId);
		error.code = "UNKNOWN_TERMINAL_ID";
		return callback(error);
	}
	
	term.destroy();
	
	delete TERMINALS[termId];
	
	callback(null, {});
}

function ptyModuleNotLoaded(user, json, callback) {
	var error = new Error("node-pty module is not installed on the server! (" + ptyMissing + ")");
	error.code = "MODULE_MISSING";
	callback(error);
};

module.exports = TERMINAL;
