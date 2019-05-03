#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var arg = process.argv;
var string = arg[2];
var file = arg[3];
var contentInFile = arg[4];

console.log("string=" + string);
console.log("file=" + file);
console.log("contentInFile=" + contentInFile);

var fs = require("fs");
fs.readFile(file, "utf8", function(err, text) {
	if(err) throw err;
	
	fs.readFile(contentInFile, function(err, content) {
		if(err) throw err;
		text = text.replace(string, function(){return '<script><!--\n' + content + '\n--></script>\n'});
		
		fs.writeFile(file, text, function(err) {
			if(err) throw err;
			
			console.log(file + " updated!");
		}); 
	});
});
