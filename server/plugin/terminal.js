/*
	
	/bin/sh is NOT the same thing as bash. bash is the login shell while sh is used for shell scripts.
	
*/

var TERMINAL_COUNTER = 0;

var TERMINAL = {};

var TERMINALS = {};

TERMINAL.open = function newTerminal(user, json, callback) {
	var pty = require('pty.js');
	var cols = json.cols || 80;
	var rows = json.rows || 30;
	var cwd = json.cwd || process.env.HOME;
	var env = json.env || process.env;
	var exec = json.exec || "/bin/bash";
	var termId = ++TERMINAL_COUNTER;
	
	TERMINALS[termId] = pty.spawn(exec, [], {
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

TERMINAL.write = function terminalWrite(user, json, callback) {
	
	var termId = json.id;
	var data = json.data;
	var term = TERMINALS[termId];
	if(data == undefined) return callback(new Error("data=" + data));
	if(!term) return callback(new Error("Unknown terminal id=" + termId));
	
	term.write(data);
	
	callback(null, {});
}

TERMINAL.resize = function terminalResize(user, json, callback) {
	
	var termId = json.id;
	var cols = json.cols;
	var rows = json.rows;
	var term = TERMINALS[termId];
	if(cols == undefined) return callback(new Error("cols=" + cols));
	if(rows == undefined) return callback(new Error("rows=" + rows));
	if(!term) return callback(new Error("Unknown terminal id=" + termId));
	
	term.resize(cols, rows);
	
	callback(null, {});
}

TERMINAL.close = function terminalClose(user, json, callback) {
	
	var termId = json.id;
	var term = TERMINALS[termId];
	if(!term) return callback(new Error("Unknown terminal id=" + termId));
	
	term.destroy();
	
	delete TERMINALS[termId];
	
	callback(null, {});
}


module.exports = TERMINAL;
