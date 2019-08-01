// Gets the latest changeset ID from Merurial and save it as version.txt

var exec = require('child_process').exec;
var child = exec('hg log -l 1', function(error, stdout, stderr) {
	//console.log("stdout: " + stdout);
	//console.log("stderr: " + stderr);
	if (error !== null) {
		console.log("exec error: " + error);
	}
	
	var myString = stdout;
	//changeset:\s*(\d*):
	var myRegexp = /changeset:\s*(\d*):/g;
	
	var match = myRegexp.exec(myString);
	
	
	var output = match[1].toString();
	
	//process.stdout.write(output);
	//console.log(output);
	
	var fs = require("fs");
	var path = "version.txt";
	var encoding = "utf8";
	
	fs.writeFile(path, output, function(err) {
		if(err) throw err;
		});
	
});

