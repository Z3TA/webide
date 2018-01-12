#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	Input: clear text password
	Output: Hashed password
	
	Useful for manually chaning user passwords.
	
	sudo chmod +x hashPw.js
	
*/

var pwHash = require("./server/pwHash.js");
	
	var pw = process.argv[2]
	
	if(!pw) {
	console.warn("Write the password to be hashed");
	process.exit();
	}
	
	//console.log(pw);
	
console.time("Time taken");
	console.log(pwHash(pw));
console.timeEnd("Time taken");
	
