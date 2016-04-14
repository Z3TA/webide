//#!/usr/bin/env node

var fs = require("fs");
var path = "version.inc";
var encoding = "utf8";

fs.readFile(path, encoding, function(err, string) {
	if(err) throw(err);
	
	var version = parseInt(string);
	
	version = version + 1;
	
	fs.writeFile(path, version, function(err) {
		
		if(err) throw err;
		
		console.log("0"); // Success!
		
	});
	
});
