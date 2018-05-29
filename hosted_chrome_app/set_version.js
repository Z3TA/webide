/*
	Version is same as commit id
	
*/

var hosted_chrome_app_manifest_updated = false;

var exec = require('child_process').exec;
var child = exec('hg log -l 1', function(err, stdout, stderr) {
	var version = "0";
	
	if(!err) {
		
		var myRegexp = /changeset:\s*(\d*):/g;
		var match = myRegexp.exec(stdout);
		
		if(match) {
version = match[1];
			
			var fs = require("fs");
			// ### Update hosted chrome app manifest
			var hosted_chrome_app_manifest_path = "manifest.json";
			fs.readFile(hosted_chrome_app_manifest_path, "utf8", function(err, data) {
				if(err) throw err;
				var manifest = data.replace(/"version": ".*"/, '"version": "' + version + '"');
				
				fs.writeFile(hosted_chrome_app_manifest_path, manifest, function(err) {
					if(err) throw err;
					
					hosted_chrome_app_manifest_updated = true;
					doneMaybe();
				});
			});
			
		}
	}
	});

function doneMaybe() {
	if(hosted_chrome_app_manifest_updated) {
		process.exit();
	}
}
