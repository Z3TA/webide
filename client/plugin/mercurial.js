(function() {
	"use strict";
	
	var repoCommitDialog = EDITOR.createWidget(buildRepoCommitDialog);
	var repoCommitMenuItem;
	var fileSelect;
	var inputrootDir;
	var modified = [];
	var rootDir = null;
	var untracked = [];
	
	var repoCloneDialog = EDITOR.createWidget(buildRepoCloneDialog);
	var repoCloneMenuItem;
	
	var userValue = "demo";
	var pwValue = "demo";
	
	
	EDITOR.plugin({
		desc: "Mercurial SCM integration",
		load: loadMercurial,
		unload: unloadMercurial
	});
	
	
	function loadMercurial() {
		repoCommitMenuItem = EDITOR.addMenuItem("Commit", function() {
			showRepoCommitDialog();
			EDITOR.hideMenu();
		});
		
		repoCloneMenuItem = EDITOR.addMenuItem("Clone/add Repo ...", function() {
			showRepoCloneDialog();
			EDITOR.hideMenu();
		});
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide the commit widget", charCode: char_Esc, fun: hideRepoCommitDialog});
		EDITOR.bindKey({desc: "Hide the login widget", charCode: char_Esc, fun: hideRepoCloneDialog});
		
		EDITOR.on("fileOpen", mercurialStatus);
		
		
	}
	
	function unloadMercurial() {
		
		if(repoCommitMenuItem) EDITOR.removeMenuItem(repoCommitMenuItem);
		EDITOR.unbindKey(hideRepoCommitDialog);
		
		if(repoCloneMenuItem) EDITOR.removeMenuItem(repoCloneMenuItem);
		EDITOR.unbindKey(hideRepoCloneDialog);
	}
	
	
	function mercurialStatus(file) {
		// Check incoming and pull often to prevent merge conflicts!
		
		var dir = UTIL.getDirectoryFromPath(file.path);
		
		hgStatus(function (err, rootDir, localModified, untracked) {
			
			if(err) return console.warn(err);
			else {
				
				console.log("localModified.length=" + localModified.length);
				
				console.log("Mercurial: Check for incoming changes ...");
				CLIENT.cmd("mercurial.incoming", {directory: rootDir}, hgIncoming);
				
				
			}
		}, dir);
		
		
		function hgIncoming(err, resp) {
			if(err) {
				
				var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
				var authFailed = err.message.match(/abort: authorization failed/);

				if(authNeeded) {
					var repoUrl = authNeeded[1];
					showAuthDialog("Need authorization for checking incoming from " + repoUrl + ": ", function authorized(username, password, save) {
						if(username != null) CLIENT.cmd("mercurial.incoming", {directory: rootDir, user: username, pw: password, save: save}, hgIncoming);
					}, "Check incoming");
					return;
				}
				else if(authFailed) {
					alertBox("Authorization filed!\nUnable to get remote status for file:\n" + file.path);
				}
				else throw err;
			}
			else {
				
				var changes = resp.changes;
				var repoUrl = resp.repo;
				var ask = false;
				var notSaved = [];
				var remoteUpdated = [];
				var untrackedUpdated = [];
				
				if(repoUrl == undefined) throw new Error("repoUrl=" + undefined + " resp=" + JSON.stringify(resp, null, 2));

				if(changes === null) {
					alertBox("No incoming changes from " + repoUrl);
					//console.log("Mercurial: No incoming changes detected!")
					return; // No incoming changes
				}
				
				console.log("Mercurial: Incoming changes: " + JSON.stringify(changes, null, 2));
				
				checkFiles: for(var i=0; i<changes.length; i++) {
					var files = Object.keys(changes[i].files);
					for(var j=0; j<files.length; j++) {
						
						var filePath = files[j];
						
						if(EDITOR.files.hasOwnProperty(filePath)) {
							// We only care about files opened by the editor
							
							var changedFile = EDITOR.files[filePath];
							
							if(!changedFile.isSaved) notSaved.push(filePath);
							
							if(untracked.indexOf(filePath) != -1) untrackedUpdated.push(filePath);
							
							if(localModified.indexOf(filePath) != -1) remoteUpdated.push(filePath);
							
							var msg = "File has been updated:\n"  + changedFile.path + "\n\
							Repo: " + repoUrl + "\n\
							Date: " + changes[i].date + "\n\
							User: " + changes[i].user + "\n\n<i>" + changes[i].summary;
							
							var optUpdate = "Update file";
							var optDoNothing = "Do nothing";
							var optSaveCommit = "Save my changes and Commit";
							var optRevertLocal = "Ignore my changes and Update"
							
							var options;
							
							if(!changedFile.isSaved) options = [optSaveCommit, optRevertLocal, optDoNothing];
							else options = [optDoNothing, optUpdate];
							
							ask = true;
							
							confirmBox(msg, options, function(answer) {
								
								if(answer == optDoNothing) return;
								else if(answer == optRevertLocal || answer == optUpdate) {
									pullAndUpdate(dir, true);
								}
								else if(answer == optSaveCommit) {
									EDITOR.saveFile(changedFile, undefined, function fileSaved(err, filePath) {
										showRepoCommitDialog();
									});
								}
								else throw new Error("Unknown answer=" + answer);
								
							});
						}
					}
				}
				
				if(!ask) {
					console.log("Mercurial: No apparent conflict. Updating!")
					pullAndUpdate(dir, false); // It's safe to update as no files opened by the editor have changed (there can still be merge conflicts though)
				}
			}
		}
		
		
	}
	
	
	function pullAndUpdate(dir, reloadFiles) {
		
		console.log("Mercurial: Pull and Update ...");
		
		CLIENT.cmd("mercurial.pull", {directory: dir}, function hgPull(err, resp) {
			if(err) {
				throw err;
			}
			else {
				
				console.log("Mercurial: Pull resp=" + JSON.stringify(resp));
				
				var files = resp.files;
				
				CLIENT.cmd("mercurial.update", {directory: dir}, function hgUpdate(err, resp) {
					if(err) {
						throw err;
					}
					else {
						
						console.log("Mercurial: Update resp=" + JSON.stringify(resp));
						
						var totalFiles = resp.updated + resp.merged + resp.removed + resp.unresolved;
						
						if(totalFiles != files.length) throw new Error("totalFiles=" + totalFiles + " resp=" + JSON.stringify(resp) + " files=" + JSON.stringify(files));
						
						if(resp.unresolved > 0) alertBox("There are unresolved files ...");
						
						var filesToBeReloaded = 0;
						
						for(var i=0; i<files.length; i++) {
							if(EDITOR.files.hasOwnProperty(files[i])) {
								filesToBeReloaded++;
								
								var file = EDITOR.files[files[i]];
								
								reloadFile(file);
								
							}
						}
						if(filesToBeReloaded === 0) done(false);
						
					}
					
					function reloadFile(file) {
						console.log("Mercurial: Reloading file=" + file.path);
						EDITOR.readFromDisk(file.path, function(err, path, data) {
							if(err) throw err;
							
							file.reload(data);
							
							if(--filesToBeReloaded === 0) done(true);
							
						});
					}
					
					function done(reloadedAnyFiles) {
						if(reloadedAnyFiles) alertBox("Files updated!");
					}
					
				});
				
			}
		});
		
	}
	
	function buildRepoCommitDialog(widget) {
		
		var div = document.createElement("div");
		div.setAttribute("class", "repoCommit");
		
		var table = document.createElement("table"); // One table to rule them all!
		
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		
		fileSelect = document.createElement("select");
		fileSelect.setAttribute("class", "file list");
		fileSelect.setAttribute("size", "6");
		fileSelect.setAttribute("title", "Select files");
		
		td = document.createElement("td");
		td.appendChild(fileSelect);
		tr.appendChild(td);
		
		
		var textarea = document.createElement("textarea");
		textarea.setAttribute("cols", "50");
		textarea.setAttribute("rows", "6");
		textarea.setAttribute("placeholder", "Comments ...");
		
		td = document.createElement("td");
		td.appendChild(textarea);
		tr.appendChild(td);
		
		
		td = document.createElement("td");
		// ### Commit button
		var commitButton = document.createElement("button");
		commitButton.setAttribute("class", "button");
		commitButton.appendChild(document.createTextNode("Commit changes"));
		commitButton.onclick = mercurialCommit;
		
		td.appendChild(commitButton);
		
		var br = document.createElement("br");
		td.appendChild(br);
		
		// ### Commit & Push button
		var commitAndPushButton = document.createElement("button");
		commitAndPushButton.setAttribute("class", "button");
		commitAndPushButton.appendChild(document.createTextNode("Commit & Push"));
		commitAndPushButton.onclick = commitAndPush;
		
		td.appendChild(commitAndPushButton);
		
		var br = document.createElement("br");
		td.appendChild(br);
		
		// ### Cancel button
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "button");
		cancelButton.appendChild(document.createTextNode("Cancel"));
		cancelButton.onclick = function cancel() {
			hideRepoCommitDialog();
		};
		
		td.appendChild(cancelButton);
		
		
		tr.appendChild(td);
		
		
		table.appendChild(tr);
		
		div.appendChild(table);
		
		/*
			inputrootDir = document.createElement("input");
			inputrootDir.setAttribute("type", "hidden");
			div.appendChild(inputrootDir);
		*/
		
		return div;
		
		
		function mercurialCommit(e, alsoPush) {
			
			if(alsoPush == undefined) alsoPush = false;
			
			var opt = {
				directory: rootDir,
				message: textarea.value,
				files: [],
			}
			
			var nonTracked = []; // Check if some of the files are untracked, and ask if we should add them
			var selectedFiles = fileSelect.options;
			for(var i=0, filePath; i<selectedFiles.length; i++) {
				if(selectedFiles[i].selected) {
					filePath = selectedFiles[i].value;
					opt.files.push(filePath);
					if(untracked.indexOf(filePath) != -1) nonTracked.push(filePath);
				}
			}
			
			if(nonTracked.length > 0) {
				var yes = "Yes, Add them";
				var no = "NO!";
				confirmBox("Add the following files to be tracked by Mercurial ?\n" + nonTracked.join("\n"), [no, yes], function(answer) {
					
					if(answer == no) {
						
						// Remove untracked files from files to be commited
						while(nonTracked.length > 0) {
							opt.files.splice(opt.files.indexOf(nonTracked[0]), 1);
							nonTracked.splice(nonTracked.indexOf(nonTracked[0]), 1);
						}
						
						return readyToCommit(false);
					}
					
					CLIENT.cmd("mercurial.add", {directory: rootDir, files: nonTracked}, function commited(err, resp) {
						
						if(err) alertBox(err.message);
						else {
							
							readyToCommit(true);
							
						};
						
					});
				})
			}
			else readyToCommit(false);
			
			
			function readyToCommit(filesWhereAdded) {
				CLIENT.cmd("mercurial.commit", opt, function commited(err, resp) {
					
					if(err) {
						
						if(err.message.match(/created new head/)) {
							// todo: We need to pull and merge before pushing!
							alertBox("We need to pull and merge before pushing!");
						}
						else if(err.message.match(/cannot partially commit a merge/)) {
							// todo:  'hg resolve -m [FILE]' !?!?
							alertBox("We need to reslove the merge conflict manually.");
						}
						else alertBox(err.message);
					}
					else {
						
						if(alsoPush) {
							CLIENT.cmd("mercurial.push", {directory: rootDir}, function commited(err, resp) {
								
								if(err) alertBox(err.message);
								else {
									alertBox("Successfully commited and pushed to " + resp.remote);
									cimmitSuccessful();
								};
							});
						}
						else {
							alertBox("Successfully commited! (don't forget to push)");
							cimmitSuccessful();
						}
					};
				});
			}
			
			function cimmitSuccessful() {
				
				textarea.value = "";
				updateFileSelect(function(err) {
					if(err) throw err;
				});
				
			}
		}
		
		function commitAndPush(e) {
			mercurialCommit(e, true);
		}
		
	}
	
	function updateFileSelect(callback) {
		
		while(fileSelect.firstChild) fileSelect.removeChild(fileSelect.firstChild); // Emty file list
		
		hgStatus(function hg_got_status(err, rootDir, modified, untracked) {
			
			if(err) {
				if(callback) callback(err);
				else alertBox(err.message);
			}
			else {
				
				if(callback) callback(null, rootDir, modified, untracked);
				
				//inputrootDir.value = rootDir;
				
				if(modified.length == 0 && untracked.length == 0) {
					if(!callback) alertBox("No changes detected! (no need to commit)");
					hideRepoCommitDialog();
					return;
				}
				
				for(var i=0; i<modified.length; i++) insertFile(modified[i], true);
				for(var i=0; i<untracked.length; i++) insertFile(untracked[i], false);
			}
			
			function insertFile(filePath, selected) {
				var fullPath = rootDir + filePath;
				var option = document.createElement("option");
				
				option.setAttribute("class", "file");
				option.setAttribute("value", filePath);
				if(selected) option.setAttribute("selected", "selected");
				
				option.appendChild(document.createTextNode(filePath));
				//option.onclick = clickFile;
				
				fileSelect.appendChild(option);
			}
			
			
			/*
				function clickFile(e) {
				
				var filePath = e.target.value;
				var selected = e.target.selected;
				
				if(selected && untracked.indexOf(filePath) == -1) {
				var add = "Track it";
				var del = "Delete it";
				var delNoBackup = "Delete without backup";
				var open = "Open it";
				var cancel = "Cancel";
				
				confirmBox("The file is currently not tracked by (added to) Mercurial:\n" + filePath, [add, del, delNoBackup, open, cancel], function (answer) {
				
				});
				}
				}
				
			*/
			
		});
		
	}
	
	function hgStatus(callback, mercurialRootDir) {
		
		if(!callback) throw new Error("No callback function!");
		
		var commandOptions = {
			directory: mercurialRootDir || UTIL.getDirectoryFromPath(EDITOR.currentFile.path) || EDITOR.workingDir
		}
		
		CLIENT.cmd("mercurial.status", commandOptions, function hgstatus(err, resp) {
			if(err) {
				if(callback) return callback(err);
				else throw err;
			}
			else {
				modified = resp.modified;
				rootDir = UTIL.trailingSlash(resp.rootDir);
				untracked = resp.untracked;
				
				callback(null, rootDir, modified, untracked);
			}
		});
		
	}
	
	function buildRepoCloneDialog(widget) {
		
		var testRepo = {
			url: "https://hg.webtigerteam.com/repo/test",
			user: "user",
			pw: "pass"
		}
		
		var form = document.createElement("form");
		form.onsubmit = cloneRepo;
		
		// ### SCM Type
		var labelSCM = document.createElement("label");
		labelSCM.setAttribute("for", "scm");
		labelSCM.appendChild(document.createTextNode("Type: "));
		form.appendChild(labelSCM);
		
		var scm = document.createElement("select");
		scm.setAttribute("id", "scm");
		scm.setAttribute("class", "select scm");
		scm.setAttribute("title", "Select what type of software version control protocol to use");
		
		var optMercurial = document.createElement("option");
		optMercurial.appendChild(document.createTextNode("Mercurial"));
		
		scm.appendChild(optMercurial);
		form.appendChild(scm);
		
		
		// ### Remote repository
		var labelRepo = document.createElement("label");
		labelRepo.setAttribute("for", "repo");
		labelRepo.appendChild(document.createTextNode("Repository: "));
		form.appendChild(labelRepo);
		
		var repo = document.createElement("input");
		repo.setAttribute("type", "text");
		repo.setAttribute("id", "repo");
		repo.setAttribute("class", "inputtext url");
		repo.setAttribute("title", "URL to remote repository");
		repo.setAttribute("size", "30");
		repo.setAttribute("value", testRepo.url);
		form.appendChild(repo);
		
		// ### Local directory
		var labelLocalDir = document.createElement("label");
		labelLocalDir.setAttribute("for", "localDir");
		labelLocalDir.appendChild(document.createTextNode("Clone into: "));
		form.appendChild(labelLocalDir);
		
		var localDir = document.createElement("input");
		localDir.setAttribute("type", "text");
		localDir.setAttribute("id", "localDir");
		localDir.setAttribute("class", "inputtext dir");
		localDir.setAttribute("title", "Path to repositories");
		localDir.setAttribute("size", "30");
		localDir.setAttribute("value", "/repo/test/");
		form.appendChild(localDir);
		
		// ### user
		var labelUser = document.createElement("label");
		labelUser.setAttribute("for", "repoLoginUser");
		labelUser.appendChild(document.createTextNode("Username: "));
		form.appendChild(labelUser);
		
		var user = document.createElement("input");
		user.setAttribute("type", "text");
		user.setAttribute("id", "repoLoginUser");
		user.setAttribute("class", "inputtext username");
		user.setAttribute("size", "10");
		user.setAttribute("value", testRepo.user);
		form.appendChild(user);
		
		// ### password
		var labelPw = document.createElement("label");
		labelPw.setAttribute("for", "repoLoginPw");
		labelPw.appendChild(document.createTextNode("Username: "));
		form.appendChild(labelPw);
		
		var pw = document.createElement("input");
		pw.setAttribute("type", "password");
		pw.setAttribute("id", "repoLoginPw");
		pw.setAttribute("class", "inputtext password");
		pw.setAttribute("size", "10");
		pw.setAttribute("value", testRepo.pw);
		form.appendChild(pw);
		
		
		// ### Clone button
		var cloneButton = document.createElement("input");
		cloneButton.setAttribute("type", "submit");
		cloneButton.setAttribute("class", "button");
		cloneButton.setAttribute("value", "Clone repository");
		//cloneButton.onclick = cloneRepo;
		form.appendChild(cloneButton);
		
		
		// ### Save password checkbox
		var savePassword = document.createElement("input");
		savePassword.setAttribute("type", "checkbox");
		savePassword.setAttribute("id", "savePassword");
		savePassword.setAttribute("title", "Save user and password under [auth] in hgrc");
		form.appendChild(savePassword);
		
		var labelSavePassword = document.createElement("label");
		labelSavePassword.setAttribute("for", "savePassword");
		labelSavePassword.appendChild(document.createTextNode("Save credentials"));
		form.appendChild(labelSavePassword);
		
		return form;
		
		function cloneRepo(e) {
			
			var command = "mercurial.clone";
			
			var commandOptions = {
				local: localDir.value,
				remote: repo.value,
				user: user.value,
				pw: pw.value,
				save: savePassword.checked
			}
			
			CLIENT.cmd(command, commandOptions, function cloned(err, resp) {
				
				if(err) alertBox(err.message);
				else {
					
					alertBox("Successfully cloned to:\n" + resp.path);
					
				};
				
			});
			
			return false; // Do not make HTTP get
		}
	}
	
	
	function showRepoCloneDialog() {
		return repoCloneDialog.show();
	}
	
	function hideRepoCloneDialog() {
		return repoCloneDialog.hide();
	}
	
	function showRepoCommitDialog() {
		repoCommitDialog.show();
		
		// Reset these values
		modified.length = 0;
		rootDir = null;
		untracked.length = 0;
		
		updateFileSelect();
		return false;
	}
	
	function hideRepoCommitDialog() {
		return repoCommitDialog.hide();
	}
	
	function showAuthDialog(message, callback, submitText) {
		
		if(typeof callback != "function") throw new Error("Need a callback function!");
		 
		
		var footer = document.getElementById("footer");
		
		var auth = document.createElement("form");
		auth.setAttribute("id", "repositoryAuthorizationDialog");
		
		if(document.getElementById("repositoryAuthorizationDialog")) {
			console.warn("repositoryAuthorizationDialog already exist in footer!");
			return;
		}
		
		if(message != undefined) { 
		
			var messageŃode = document.createElement("span");
			messageŃode.appendChild(document.createTextNode(message));
			
			auth.appendChild(messageŃode);

			var br = document.createElement("br");
			auth.appendChild(br);

		}
		
		// ### Username
		var labelUser = document.createElement("label");
		labelUser.appendChild(document.createTextNode("User:"));
		
		var username = document.createElement("input");
		username.setAttribute("type", "text");
		
		labelUser.appendChild(username);
		auth.appendChild(labelUser);
		
		
		// ### Password
		var labelPassword = document.createElement("label");
		labelPassword.appendChild(document.createTextNode("Password:"));
		
		var password = document.createElement("input");
		password.setAttribute("type", "password");
		
		labelPassword.appendChild(password);
		auth.appendChild(labelPassword);
		
		
		// ### Submit button
		if(submitText == undefined) submitText = "Submit";
		var submitButton = document.createElement("button");
		submitButton.setAttribute("type", "submit");
		submitButton.setAttribute("class", "button");
		submitButton.appendChild(document.createTextNode(submitText));
		
		auth.appendChild(submitButton);
		
		// ### Cancel button
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("type", "button");
		cancelButton.setAttribute("class", "button");
		cancelButton.appendChild(document.createTextNode("Cancel"));
		
		
		auth.appendChild(cancelButton);
		
		
		// ### Save in hgrc
		var labelSave = document.createElement("label");
		
		var save = document.createElement("input");
		save.setAttribute("type", "checkbox");
		
		labelSave.appendChild(save);
		
		labelSave.appendChild(document.createTextNode("Save login credentials in "));
		
		var hgrcLink = document.createElement("a");
		hgrcLink.setAttribute("href", "JavaScript: EDITOR.openFile('" + rootDir + ".hg/hgrc');");
		hgrcLink.appendChild(document.createTextNode("hgrc"));
		
		labelSave.appendChild(hgrcLink);
		
		auth.appendChild(labelSave);
		
		
		
		footer.appendChild(auth);
		EDITOR.resizeNeeded();


		cancelButton.onclick = function cancel() {
			callback(null);
			footer.removeChild(auth);
			EDITOR.resizeNeeded();
		}
		
		auth.onsubmit = function authSubmit() {
			
			callback(username.value, password.value, save.checked);
			
			footer.removeChild(auth);
			
			EDITOR.resizeNeeded();
			
			return false; // Don't make a http get
		}
		
		
	}
	
})();