(function() {
	"use strict";
	
	EDITOR.addTest(function mercurialCloneRepo(callback) {
		var testFolder = "/mercurialCloneRepoUniqueName/";
		
		CLIENT.cmd("mercurial.clone", {local: testFolder, remote: "https://hg.webtigerteam.com/repo/test", user: "user", pw: "pass"}, function(err, json) {
			if(err) throw err
			else {
				
				CLIENT.cmd("mercurial.status", {directory: testFolder}, function(err, json) {
					if(err) throw err
					else {
				
						if(json.rootDir != testFolder) throw new Error("Wrong rootDir=" + json.rootDir + ". Expected testFolder=" + testFolder + " ! json=" + JSON.stringify(json));
						
				// Cleanup
				CLIENT.cmd("deleteDirectory", {directory: testFolder, recursive: true}, function(err, json) {
					if(err) throw err
					else {
						
						callback(true);
						
					}
				});
				
					}
				});
				
			}
		});
		
	}, 1);
	
	
		
})();
