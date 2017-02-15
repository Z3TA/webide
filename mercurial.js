
var MERCURIAL = {}; // Global namespace for the mercurial wrapper/bindings abstraction

(function() {
	"use strict";

	var exec = require('child_process').exec;
	
	MERCURIAL.status(directory, callback) {
		exec("hg status", { cwd: directory }, function (err, stdout, stderr) {
			if(err) callback(err);
			else if(stderr) callback(stderr);
			else {
				
				var modified = [];
				var untracked = [];
				
				var files;
				
				if(stdout.indexOf("\r\n") != -1) files = stdout.split("\r\n");
				else files = stdout.split("\n");
				
				for(var attr, path, i=0; i<files.length; i++) {
					attr = files[i].substring(0, files[i].indexOf(" "));
					path = files[i].substring(attr.length + 1);
					
					if(attr == "?") untracked.push(path);
					else if(attr == "M") modified.push(path);
					else throw new Error("Unknown status attr=" + attr + " for path=" + path + "\nstdout=" + stdout);
					}
				
				callback(null, {modified: modified, untracked: untracked});
				
			}
		});
	}
	
})();
