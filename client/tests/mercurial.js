(function() {
	"use strict";
	
	EDITOR.addTest(true, function noNeedToCommit(callback) {
		/*
			bug: Server says "no need to commit" even though files have been changed.
			
			The original fix for this bug was to enable unix network for the hg binary in apparmor!
		*/
		var rootFolder = UTIL.joinPaths(EDITOR.user.homeDir, "/mercurialCloneRepoUniqueNameNoNeedToCommit/");
		var testFolder = rootFolder + "test/";
		
		// Folder might exist if earlier test failed
		EDITOR.folderExistIn(rootFolder, "test", function(err, exists) {
			if(err) throw err;

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
			CLIENT.cmd("mercurial.clone", {local: testFolder, remote: "https://hg.webtigerteam.com/test", user: "user", pw: "pass"}, 160000, function clonedRepo(err, json) {
				if(err) {
					alertBox(err.message, err.code || "HG_CLONE_ERROR");
					throw err
				}
				
				var fileName = "anewfile.yo.test";
				var filePath = testFolder + fileName
				
				EDITOR.openFile(filePath, "A new file", function openedFile(err, file) {
					if(err) throw err;
					
					EDITOR.saveFile(file, filePath, function savedFile(err, path) {
						if(err) throw err;
						
						CLIENT.cmd("mercurial.status", {directory: testFolder}, function mercurialStatus(err, json) {
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
		var testFolder = UTIL.joinPaths(EDITOR.user.homeDir, "/mercurialCloneRepoUniqueName/test/");
		var testCounter = 0;
		
		testClone();
		
function testClone() {
			if(++testCounter > 2) throw new Error("Clone test retry more then twice!");
			
			CLIENT.cmd("mercurial.clone", {local: testFolder, remote: "https://hg.webtigerteam.com/test", user: "user", pw: "pass"}, 160000, function(err, json) {
				if(err && err.code == "EXIST") {
					// The folder might already exist from and earlier test that failed.
					cleanup(function(err) {
						if(err) throw err;
						testClone();
					});
				}
				else if(err) {
					throw new Error("err.code=" + err.code + " err.message=" + err.message);
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
			CLIENT.cmd("deleteDirectory", {directory: UTIL.joinPaths(EDITOR.user.homeDir, "/mercurialCloneRepoUniqueName/"), recursive: true}, function(err, json) {
				if(err) return cleanupCallback(err);
				else cleanupCallback(null);
				});
		}
		
	});
	
	
	EDITOR.addTest(1, function cloneFromGithubAndPush(callback) {
		/*
			This needs hggit!
			
			User needs a .hgrc folder in his/her home dir, including:
			[extensions]
			hgext.bookmarks =
			hggit =
			
			Cloning from Github has stopped working 3-4 times already so we need an automatic test
			Make sure the test user has a SSH key registered on Github!
			
			Of course it works in dev!
			Is it because we have more then one user/ssh-key per IP !?
			
			Cloning from HTTP gives long Python error in prod (works in dev)
			Cloning via SSH gives "Host key verification failed" (works in dev), (yes, SSH key has been added to Github)
			
			After updating hggit we can no longer clone using HTTP (same error as in prod). Downgrading didn't help
			
			It however seem to work after upgrading to Ubuntu 18 :P
			
		*/
		
		if(EDITOR.user.platform == "win32") {
			/*
				Tried to make hggit work on Windows but got Python errors (urlopen).
				Considering we already spent one week making hggit work on Linux, and it failing randomly. I'm not even gonna try on Windows.
			*/
			return callback(true);
		}
		
		
		var testFolderParent = UTIL.joinPaths(EDITOR.user.homeDir, "/cloneFromGithub/");
		var testCounter = 0;
		var cloneSuccess = 0;
		var cloneTests = 0; 
		
		// Folder might exist if earlier test failed
		CLIENT.cmd("deleteDirectory", {directory: testFolderParent, recursive: true}, function(err, json) {
			if(err && err.code != "ENOENT") throw err
			
			cloneTests++;testClone("https://github.com/Z3TA/test1.git", UTIL.joinPaths(testFolderParent, "http/")); // Using HTTP
			
			cloneTests++;testClone("git@github.com:Z3TA/test1.git", UTIL.joinPaths(testFolderParent, "ssh/")); // Using Git/SSH
			
		});
		
		function testClone(repository, testFolder) {
			
			if(++testCounter > 3) throw new Error("Clone test retry more 3 times!");
			
			console.log("testClone: repository=" + repository + " testFolder=" + testFolder);
			
			CLIENT.cmd("mercurial.clone", {local: testFolder, remote: repository, user: "user", pw: "pass"}, 160000, function(err, json) {
				if(err && err.code == "EXIST") {
					// The folder might already exist from and earlier test that failed.
					cleanup(function(err) {
						if(err) throw err;
						testClone(repository, testFolder);
					});
				}
				else if(err && err.message.indexOf('Warning: Permanently added the ECDSA host key') == -1) {
					throw err;
				}
				else {
					
					testPush(repository, testFolder);
					
				}
			});

		}
		
		function testPush(repository, testFolder) {

			// test push, but only if we used ssh because Github doesn't support basic auth (you can create an auth string though)

			/*

				Warning: the ECDSA host key for 'github.com' differs from the key for the IP address '140.82.121.4'
				Offending key for IP in /home/johan/.ssh/known_hosts:3
				Matching host key in /home/johan/.ssh/known_hosts:12

				Github changes their server keys on regular intervals, giving a "Are you sure you want to continue connecting" in Mercurial

			*/

			var badKey = '|1|Rx99z2FUsjfi2dsGVh/C0bToQX8=|BMa3Z3yX9bqbc0VoUH+oYfilNgA= ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==';
			//vad badHost = '|1|PCbuSY1eTcaYqG7e4S5bK+JAknE=|ErxOeAworSkInkf6/ZEHjDXQzqA= ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg='

			if( repository.indexOf("git@") == 0 ) {

				var randomString = "";
				for (var i=0; i<10; i++) {
					randomString += Math.floor(Math.random() * 10);
				}

				EDITOR.writeLines(UTIL.joinPaths(EDITOR.user.homeDir, ".ssh/","known_hosts"), 3, badKey + "\n", function(err) {
					if(err) throw err;

					EDITOR.saveToDisk(UTIL.joinPaths(testFolderParent, "ssh/", "testfile.txt"), randomString + "\n", function(err) {
						if(err) throw err;

						CLIENT.cmd("mercurial.commitAll", {directory: testFolder, message: "test " + (new Date()).toLocaleDateString('sv-SE')}, function commited(err, resp) {
							if(err) throw err;

							CLIENT.cmd("mercurial.push", {directory: testFolder}, 160000, function(err, json) {
								if(err) throw err;

								pushDone();

							});

						});

					});

				});

			}
			else pushDone();

			function pushDone() {
				if(++cloneSuccess == cloneTests) {
					cleanup(function(err) {
						if(err) throw err;
						callback(true);
					});
				}
			}
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
