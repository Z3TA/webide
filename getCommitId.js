
// Prints out the latest commit id from Mercuril log

var exec = require('child_process').exec;
var child = exec('hg log -l 1', function(err, stdout, stderr) {
	
	var version = "0";
	
	if(!err) {
		
		var myRegexp = /changeset:\s*(\d*):/g;
		var match = myRegexp.exec(stdout);
		
		if(match) version = match[1];
			}
	
	process.stdout.write(version);
});

