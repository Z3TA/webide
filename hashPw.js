#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	Input: clear text password
	Output: Hashed password
	
	Useful for manually changing user passwords.
	
	sudo chmod +x hashPw.js
	
	Remove ending line break in .jzeditpw file: 
	truncate -s -1 /home/user/.jzeditpw
	
*/

var pwHash = require("./server/pwHash.js");
	
	var pw = process.argv[2]
	
if(pw) hash(pw);
else getPassword(hash);


function getPassword(callback) {
	
	var BACKSPACE = String.fromCharCode(127);
	
	var prompt = "Password: ";
	
	process.stdout.write(prompt);
	
	var stdin = process.stdin;
	stdin.resume();
	stdin.setRawMode(true);
	stdin.resume();
	stdin.setEncoding('utf8');
	
	var password = '';
	stdin.on('data', function (ch) {
		ch = ch.toString('utf8');
		
		switch (ch) {
			case "\n":
			case "\r":
			case "\u0004":
			// They've finished typing their password
			process.stdout.write('\n');
			stdin.setRawMode(false);
			stdin.pause();
			callback(password);
			break;
			case "\u0003":
			// Ctrl-C
			process.exit();
			break;
			case BACKSPACE:
			password = password.slice(0, password.length - 1);
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write(prompt);
			process.stdout.write(password.split('').map(function () {
				return '*';
			}).join(''));
			break;
			default:
			// More passsword characters
			process.stdout.write('*');
			password += ch;
			break;
		}
	});
}

function hash(pw) {
	//console.log("hasing: " + pw);
	
console.time("Time taken");
	var hash = pwHash(pw);
console.timeEnd("Time taken");
	
	console.log("Hash: " + hash);
	console.log("echo -n " + hash + " > $HOME/.jzeditpw");
}
