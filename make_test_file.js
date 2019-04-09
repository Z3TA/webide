#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Generates a test file with X LOC
	
	Had to look like the old testfile.txt that was made manually :P
	
*/

var LOC = parseInt(process.argv[2]);
var fileName = process.argv[3] || "test.txt";

if(isNaN(LOC)) {
	console.log("Please specify lines of code to generate in first parameter");
	process.exit();
}

var line = "_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ1234567890";
var fs = require("fs");

var file = fs.createWriteStream(fileName);

var letters = 2;
var inc = 1;
var counter = 0;
for (var i=1; i<LOC+1; i++) {
	counter++;
	
	if(letters == line.length) {
		file.write("L" + counter + line.slice(0, letters) + "\n");
		counter++;
		file.write("L" + counter + line.slice(0, letters) + "\n");
		counter++;
		inc = -1;
	}
	else if(letters == 2) {
		inc = 1;
	}
	letters = letters + inc;
	
	if(counter == 1) {
		file.write("L" + counter + "_First_line\n");
	}
	else if(counter == LOC) {
		file.write("L" + counter + "_Last_line!");
		break;
	}
	else {
		file.write("L" + counter + line.slice(0, letters) + "\n");
	}
	
}

file.end();

console.log("File saved as " + fileName);



