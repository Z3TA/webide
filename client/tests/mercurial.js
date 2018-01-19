(function() {
	"use strict";
	
	EDITOR.addTest(function noNeedToCommit(callback) {
		/*
			bug: Server says "no need to commit" even though files have been changed.
		*/
		var rootFolder = "/mercurialCloneRepoUniqueNameNoNeedToCommit/";
		var testFolder = rootFolder + "test/";
		
		// Folder might exist if earlier test failed
		EDITOR.folderExistIn(rootFolder, "test", function(exists) {
			if(exists) {
				CLIENT.cmd("deleteDirectory", {directory: rootFolder, recursive: true}, function(err, json) {
					if(err) throw err
					
					clone();
					
				});
			}
			else {
				clone();
			}
			
		});
		
		function clone() {
			CLIENT.cmd("mercurial.clone", {local: testFolder, remote: "https://hg.webtigerteam.com/repo/test", user: "user", pw: "pass"}, function(err, json) {
				if(err) {
					alertBox(err.code);
					throw err
				}
				
				var fileName = "anewfile.yo.test";
				var filePath = testFolder + fileName
				
				EDITOR.openFile(filePath, "A new file", function (err, file) {
					if(err) throw err;
					
					EDITOR.saveFile(file, filePath, function (err, path) {
						if(err) throw err;
						
						CLIENT.cmd("mercurial.status", {directory: testFolder}, function(err, json) {
							if(err) throw err
							
							if(json.untracked.indexOf(fileName) == -1) {
								throw new Error("Does not contain fileName=" + fileName + " untracked=" + JSON.stringify(json.untracked) + " resp=" + JSON.stringify(json));
							}
							
							CLIENT.cmd("mercurial.add", {directory: testFolder, files: [fileName]}, function(err, commitResp) {
if(err) throw err
							
							CLIENT.cmd("mercurial.commit", {directory: testFolder, files: [fileName], message: "Added new file"}, function(err, commitResp) {
if(err) throw err; // if the bug exist the err will be: "Nothing has changed!"
								
								// Make changes to file
								file.writeLine("some changes");
								
								EDITOR.saveFile(file, filePath, function (err, path) {
if(err) throw err;
								
									CLIENT.cmd("mercurial.commit", {directory: testFolder, files: [fileName], message: "Made some changes to the new file"}, function(err, commitResp) {
									if(err) throw err; // if the bug exist the err will be: "Nothing has changed!"
									
									// Cleanup
									EDITOR.closeFile(filePath);
									CLIENT.cmd("deleteDirectory", {directory: rootFolder, recursive: true}, function(err, json) {
										if(err) throw err
										
										callback(true);
										
									});
									
								});
								});
								});
						});
						});
					});
				});
			});
		}
		
		}, 1);
	
	
	EDITOR.addTest(function mercurialCloneRepo(callback) {
		var testFolder = "/mercurialCloneRepoUniqueName/test/";
		
		CLIENT.cmd("mercurial.clone", {local: testFolder, remote: "https://hg.webtigerteam.com/repo/test", user: "user", pw: "pass"}, function(err, json) {
			if(err) throw err
			else {
				
				CLIENT.cmd("mercurial.status", {directory: testFolder}, function(err, json) {
					if(err) throw err
					else {
						
						if(json.rootDir != testFolder) throw new Error("Wrong rootDir=" + json.rootDir + ". Expected testFolder=" + testFolder + " ! json=" + JSON.stringify(json));
						
						// Cleanup
						CLIENT.cmd("deleteDirectory", {directory: "/mercurialCloneRepoUniqueName/", recursive: true}, function(err, json) {
							if(err) throw err
					else {
						
						callback(true);
						
					}
				});
				
					}
				});
				
			}
		});
		
	});
	
	
		
})();
