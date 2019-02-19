(function() {
	"use strict";
	
	EDITOR.addTest(function noNeedToCommit(callback) {
		/*
			bug: Server says "no need to commit" even though files have been changed.
			
			The original fix for this bug was to enable unix network for the hg binary in apparmor!
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
		
		});
	
	
	EDITOR.addTest(function mercurialCloneRepo(callback) {
		var testFolder = "/mercurialCloneRepoUniqueName/test/";
		var testCounter = 0;
		
		testClone();
		
function testClone() {
			if(++testCounter > 2) throw new Error("Clone test retry more then twice!");
			
			CLIENT.cmd("mercurial.clone", {local: testFolder, remote: "https://hg.webtigerteam.com/repo/test", user: "user", pw: "pass"}, function(err, json) {
				if(err && err.code == "EXIST") {
					// The folder might already exist from and earlier test that failed.
					cleanup(function(err) {
						if(err) throw err;
						testClone();
					});
				}
				else if(err) {
					throw err
				}
				else {
					
					CLIENT.cmd("mercurial.status", {directory: testFolder}, function(err, json) {
						if(err) throw err
						else {
							
							if(json.rootDir != testFolder) throw new Error("Wrong rootDir=" + json.rootDir + ". Expected testFolder=" + testFolder + " ! json=" + JSON.stringify(json));
							
							cleanup(function(err) {
								if(err) throw err;
								callback(true);
							});
							
						}
					});
					
				}
			});
		}
		
		function cleanup(cleanupCallback) {
			CLIENT.cmd("deleteDirectory", {directory: "/mercurialCloneRepoUniqueName/", recursive: true}, function(err, json) {
				if(err) throw err
				else {
					cleanupCallback();
				}
			});
		}
		
	});
	
	
	EDITOR.addTest(1, function cloneFromGithub(callback) {
		/*
			Cloning from Github has stopped working 3-4 times already so we need an automatic test
			Make sure the test user has a SSH key registered on Github!
			
			Of course it works in dev!
			Is it because we have more then one user/ssh-key per IP !?
			
		*/
		var testFolderParent = "/cloneFromGithub/";
		var testCounter = 0;
		var cloneSuccess = 0;
		
		testClone("https://github.com/Z3TA/test1.git", UTIL.joinPaths(testFolderParent, "http/")); // Using HTTP
		testClone("git@github.com:Z3TA/test1.git", UTIL.joinPaths(testFolderParent, "ssh/")); // Using Git/SSH 
		
		function testClone(repository, testFolder) {
			if(++testCounter > 3) throw new Error("Clone test retry more 3 times!");
			
			CLIENT.cmd("mercurial.clone", {local: testFolder, remote: repository, user: "user", pw: "pass"}, function(err, json) {
				if(err && err.code == "EXIST") {
					// The folder might already exist from and earlier test that failed.
					cleanup(function(err) {
						if(err) throw err;
						testClone(repository);
					});
				}
				else if(err) {
					throw err
				}
				else {
					
					if(++cloneSuccess == 2) {
						cleanup(function(err) {
							if(err) throw err;
							callback(true);
						});
					}
					
				}
			});
		}
		
		function cleanup(cleanupCallback) {
			CLIENT.cmd("deleteDirectory", {directory: testFolderParent, recursive: true}, function(err, json) {
				if(err) throw err
				else {
					cleanupCallback();
				}
			});
		}
		
	});
	
		
})();
