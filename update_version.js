/*
	Version is same as commit id
	
	Note: We can not update the version in the source code, or we would have to make a new commit
	and because of the new commit the version changes and we would have to update again and again and again in finitum
	
*/

var relDir = process.argv[2];

var serviceWorkerUpdated = false;

var exec = require('child_process').exec;
var child = exec('hg log -l 1', function(err, stdout, stderr) {
	var version = "0";
	
	if(!err) {
		
		var myRegexp = /changeset:\s*(\d*):/g;
		var match = myRegexp.exec(stdout);
		
		if(match) {
version = match[1];
			
			var fs = require("fs");
			
			// ### Update service worker
			// This will hopefully make the service worker replace itself and reload cache
			var serviceWorkerPath = relDir + "client/serviceWorker.js";
			fs.readFile(serviceWorkerPath, "utf8", function(err, data) {
				if(err) throw err;
				data = data.replace(/var version = "[^"]*";/, 'var version = "' + version + '";');
				
				fs.writeFile(serviceWorkerPath, data, function(err) {
					if(err) throw err;
					serviceWorkerUpdated = true;
					doneMaybe();
				});
			});
			
			
		}
	}
	});

function doneMaybe() {
	if(serviceWorkerUpdated) {
		process.exit();
	}
}
