/*
	Mercurial
	
	There are many SCM workflows and we should not asume a special workflow is used,
	so this plugin needs to be "general" and not du stuff on it's own.
	
	
	
	
*/

(function() {
	"use strict";
	
	// Hide behind feature flag
	//if(window.location.href.indexOf("-hg") == -1) return console.log("Append -hg in the url to try out the Mercurial plugin");
	
	
	var repoCommitDialog = EDITOR.createWidget(buildCommitDialog);
	var repoCommitMenuItem;
	var fileSelect;
	var inputrootDir;
	
	var modified = [];
	var added = [];
	var removed = [];
	var missing = [];
	var untracked = [];
	var rootDir = null;
	
	var repoCloneDialog = EDITOR.createWidget(buildCloneDialog);
	var repoCloneMenuItem;
	
	var userValue = "demo";
	var pwValue = "demo";
	
	var annotateMenuItem;
	var showAnnotationsString = "Show commit messages";
	var hideAnnotationsString = "Hide commit messages";
	var annotations = {};
	var doAnnotate = false;
	
	var resolveDialog = EDITOR.createWidget(buildResolveDialog);
	var resolveFileList;
	
	// todo: Reload annotations when the file on disk changes!! (like a reload), update, merge, etc
	
	EDITOR.plugin({
		desc: "Mercurial SCM integration",
		load: loadMercurial,
		unload: unloadMercurial
	});
	
	
	function loadMercurial() {
		
		// todo: Only show commit and annotate if the file belongs to a Mercurial SCM repo
		repoCommitMenuItem = EDITOR.addMenuItem("Commit", showCommitDialog);
		
		annotateMenuItem = EDITOR.addMenuItem(showAnnotationsString, annotateOn);
		
		repoCloneMenuItem = EDITOR.addMenuItem("Clone/add Repo ...", showCloneDialog);
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide Mercurial widgets", charCode: char_Esc, fun: hideMercurialWidgets});
		
		//EDITOR.on("fileOpen", mercurialFileOpen);
		EDITOR.on("commitTool", mercurialCommitTool);
		
	}
	
	function unloadMercurial() {
		
		if(repoCommitMenuItem) EDITOR.removeMenuItem(repoCommitMenuItem);
		
		EDITOR.unbindKey(hideMercurialWidgets);
		
		//EDITOR.removeEvent("fileOpen", mercurialFileOpen);
		
		EDITOR.removeEvent("moveCaret", showAnnotations);
		EDITOR.removeEvent("commitTool", mercurialCommitTool);
		EDITOR.removeEvent("resolveTool", mercurialResolveTool);
		
		EDITOR.removeMenuItem(annotateMenuItem);
		
		EDITOR.removeMenuItem(repoCloneMenuItem);
		
	}
	
	function mercurialCommitTool(directory) {
		// Does the directory has a initated Mercurial repo ?
		CLIENT.cmd("mercurial.hasRepo", {directory: directory}, function hgstatus(err, resp) {
			if(err) throw err;
			
			var rootDir = resp.directory;
			
			if(rootDir == null) console.warn("No Mercurial repo found in directory=" + directory);
			else showCommitDialog(rootDir);
			
		});
	}
	
	function mercurialResolveTool(directory) {
		// Does the directory has a initated Mercurial repo ?
		CLIENT.cmd("mercurial.hasRepo", {directory: directory}, function hgstatus(err, resp) {
			if(err) throw err;
			
			var rootDir = resp.directory;
			
			if(rootDir == null) console.warn("No Mercurial repo found in directory=" + directory);
			else showResolveDialog(resolved, unresolved, rootDir);
			
		});
	}
	
	function mercurialFileOpen(file) {
		/*
			When a file is opened, we want to check if there's an updated version in the remote repository ...
			But it's not a good idea! See below:
			
			(P.S. hg incoming does the same thing as hg pull, but destoys the changes !)
			
			1. Check if the file opened belongs to a Mercurial repository
			2. Check if any of the files opened by the editor and belongs to the repo, are all saved
			3. Check if all files in the repo is commited
			4. Check to make sure there are no unresolved files
			5. Check to make sure there are no multiple heads
			
			6. Make sure a hg pull && hg update will succeeed. 
			This part can be costly for a large repo, so we should not do this every time a file is opened.
			
			We also don't want to pull (and possible screw up) the local work unless the user wants to
		*/
		
	}
	
	
	function mercurialDance(file) {
		
		/*
			
			Pull and Update often to prevent merge conflicts!
			
			Strategy:
			Just asume that a remote repo is used (no need to run hg paths)
			
			1. Check for unresolved files (hg resolve --list)
			If all files are resolved, and not changed (hg status): show commit widget
			Open any unresolved file and show resolve widget
			
			2. Check for multible heads (hg heads --topo)
			
			If there are multible heads, ask the user if he/she wants to merge
			If the merge was successful, continue ...
			If the merge failed, goto 1.
			
			2. Pull updates from repository (hg pull)
			3. Check what changed (hg status --rev tip   hg log foo.txt -r (hg --debug id -i):tip)
			
			Is any of the changed files opened by the editor ?
			
			Is any of the changed files not commited !?
			
			If any of them are not saved, don't interupt the user, do nothing more.
			
			If no file is unsaved, tell the user about the new update. Options: (Update) (Ignore for now)
			
			If the user clicks (Update)
			5. Attemp Update, and Merge if needed. 
			
			Goto 1. Tell the user if there are any Merge conflicts, otherwise reload the (changed) files opened in the editor
			
			If there are merge conflics:
			
			6. Open the unresolved files in the editor (hg resolve --list) and scroll down to the first conflict marker
			Show a merge Widget with a check box for each unresolved file and a button (Mark as resolved) 
			And when putting the cursor on a line, show annotation (activate annotation hg annotate foo.txt -l)
			
			
			
			
			$ hg up
			merging foo.txt
			warning: conflicts while merging foo.txt! (edit, then use 'hg resolve --mark')
			0 files updated, 0 files merged, 0 files removed, 1 files unresolved
			use 'hg resolve' to retry unresolved file merges
			
			It should be safe to run "hg update" if you have uncomitted changes as Mercurial will attempt a merge!
			
			--------------------------------------------------------------------------------------------------------
			
			$ hg up
			abort: not a linear update
			(merge or update --check to force update)
			
			$ hg merge
			merging baz.txt
			warning: conflicts while merging baz.txt! (edit, then use 'hg resolve --mark')
			1 files updated, 0 files merged, 0 files removed, 1 files unresolved
			use 'hg resolve' to retry unresolved file merges or 'hg update -C .' to abandon
			
			$ hg resolve --list
			U baz.txt
			
			$ hg resolve baz.txt --mark
			(no more unresolved files)
			
			
			
		*/
		
		var fileDirectory = UTIL.getDirectoryFromPath(file.path);
		
		checkForUnresolved(fileDirectory);
		
		function checkForUnresolved(fileDirectory) {
			// 1. Check for unresolved files (hg resolve --list)
			CLIENT.cmd("mercurial.resolvelist", {directory: fileDirectory}, function resolveList(err, resp) {
				if(err) throw err;
				
				if(resp.resolved.length == 0 && resp.unresolved.length == 0) {
					checkForMultipleHeads(fileDirectory);
				}
				else if(resp.unresolved.length > 0) {
					showResolveDialog(resp.resolved, resp.unresolved, fileDirectory);
				}
				else {
					// All files are resolved
					showCommitDialog();
				}
				
			});
		}
		
		function checkForMultipleHeads(fileDirectory) {
			CLIENT.cmd("mercurial.heads", {directory: fileDirectory}, function resolveList(err, resp) {
				if(err) throw err;
				
				if(resp.heads.length > 1) {
					
					var merge = "Merge";
					var cancel = "Cancel";
					
					confirmBox("There are multiple heads in Mercurial. Do you want to merge them ?", [merge, cancel], function(answer) {
						
						if(answer == merge) {
							CLIENT.cmd("mercurial.merge", {directory: fileDirectory}, function resolveList(err, resp) {
								if(err) throw err;
								
								if(resp.unresolved == 0) {
									alertBox("Merge successful! " + resp.updated + " files updated, " + resp.merged + " files merged, " + resp.removed + " files removed, " + resp.unresolved + " files unresolved.");
									pullFromRepo(fileDirectory);
								}
								else checkForUnresolved(fileDirectory);
								
							});
						}
					});
				}
			});
		}
		
		function pullFromRepo() {
			console.log("Mercurial: Pulling from remote repository ...");
			
			CLIENT.cmd("mercurial.pull", {directory: fileDirectory}, hgPull);
			
			function hgPull(err, resp) {
				if(err) {
					
					var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
					var authFailed = err.message.match(/abort: authorization failed/);
					
					if(authNeeded) {
						var repoUrl = authNeeded[1];
						showAuthDialog("Need authorization for pulling changes from " + repoUrl + ": ", function authorized(username, password, save) {
							if(username != null) CLIENT.cmd("mercurial.pull", {directory: fileDirectory, user: username, pw: password, save: save}, hgPull);
						}, "Pull");
						return;
					}
					else if(authFailed) {
						alertBox("Authorization filed!\nUnable to Pull from " + repoUrl);
					}
					else throw err;
				}
				else {
					
					var changes = resp.changes;
					var repoUrl = resp.repo;
					var ask = false;
					var notSaved = [];
					
					if(repoUrl == undefined) throw new Error("repoUrl=" + undefined + " resp=" + JSON.stringify(resp, null, 2));
					
					if(changes === null) {
						alertBox("No incoming changes from " + repoUrl);
						//console.log("Mercurial: No incoming changes detected!")
						return; // No incoming changes
					}
					
					console.log("Mercurial: Incoming changes: " + JSON.stringify(changes, null, 2));
					
					for(var i=0; i<changes.length; i++) {
						var files = Object.keys(changes[i].files);
						for(var j=0; j<files.length; j++) {
							
							var filePath = files[j];
							
							if(EDITOR.files.hasOwnProperty(filePath)) {
								// We only care about files opened by the editor
								
								var changedFile = EDITOR.files[filePath];
								
								if(!changedFile.isSaved) notSaved.push(filePath);
								
							}
						}
					}
					
					if(notSaved.length == 0) {
						// If no file is unsaved, tell the user about the new update. Options: (Update) (Ignore for now)
						var update = "Update";
						var ignore = "Ignore for now";
						
						confirmBox("Do you want to update the working directory to the latest revision ?  change your working directory to reflect what you have pulled into your repository. Do you want to update/merge ? ", [update, ignore], function(answer) {
							
						});
						
					}
					
					// If any of them are not saved, don't interupt the user, do nothing more.
					
					if(!ask) {
						console.log("Mercurial: No apparent conflict. Updating!")
						pullAndUpdate(dir, false); // It's safe to update as no files opened by the editor have changed (there can still be merge conflicts though)
					}
				}
			}
			
			
		}
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		// Check if there are ucommited work on the local working copy
		
		
		
		
		function pullFromRepo() {
			console.log("Mercurial: Pulling from remote repository ...");
			
			CLIENT.cmd("mercurial.pull", {directory: rootDir}, hgPull);
			
			function hgPull(err, resp) {
				if(err) {
					
					var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
					var authFailed = err.message.match(/abort: authorization failed/);
					
					if(authNeeded) {
						var repoUrl = authNeeded[1];
						showAuthDialog("Need authorization for pulling changes from " + repoUrl + ": ", function authorized(username, password, save) {
							if(username != null) CLIENT.cmd("mercurial.pull", {directory: rootDir, user: username, pw: password, save: save}, hgPull);
						}, "Pull");
						return;
					}
					else if(authFailed) {
						alertBox("Authorization filed!\nUnable to Pull from " + repoUrl);
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
								User: " + changes[i].user + "\n\n<i>" + changes[i].summary + "</i>";
								
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
											showCommitDialog();
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
			
			CLIENT.cmd("mercurial.pull", {directory: dir}, hgPull);
			
			
			function hgPull(err, resp) {
				if(err) {
					var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
					var authFailed = err.message.match(/abort: authorization failed/);
					
					if(authNeeded) {
						var repoUrl = authNeeded[1];
						showAuthDialog("Need authorization for pulling from " + repoUrl + ": ", function authorized(username, password, save) {
							if(username != null) CLIENT.cmd("mercurial.pull", {directory: dir, user: username, pw: password, save: save}, hgPull);
						}, "Pull");
						return;
					}
					else if(authFailed) {
						alertBox("Authorization filed!\nUnable to Pull changes from the repo!");
					}
					else throw err;
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
				
			}
		}
	}
	
	function buildCommitDialog(widget) {
		
		var div = document.createElement("div");
		div.setAttribute("class", "repoCommit");
		
		var table = document.createElement("table"); // One table to rule them all!
		
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		
		fileSelect = document.createElement("select");
		fileSelect.setAttribute("class", "file list");
		fileSelect.setAttribute("size", "6");
		fileSelect.setAttribute("title", "Select files");
		fileSelect.setAttribute("multiple", "multiple");
		
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
			hideCommitDialog();
		};
		
		td.appendChild(cancelButton);
		
		tr.appendChild(td);
		
		td = document.createElement("td");
		
		// ### Ignore button
		var ignoreButton = document.createElement("button");
		ignoreButton.setAttribute("class", "button");
		ignoreButton.appendChild(document.createTextNode("Ignore ..."));
		ignoreButton.onclick = mercurialIgnore;
		td.appendChild(ignoreButton);
		
		var br = document.createElement("br");
		td.appendChild(br);
		
		// ### Delete button
		var deleteButton = document.createElement("button");
		deleteButton.setAttribute("class", "button");
		deleteButton.appendChild(document.createTextNode("Delete"));
		deleteButton.onclick = mercurialDelete;
		td.appendChild(deleteButton);
		
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		div.appendChild(table);
		
		/*
			inputrootDir = document.createElement("input");
			inputrootDir.setAttribute("type", "hidden");
			div.appendChild(inputrootDir);
		*/
		
		return div;
		
		
		
		function mercurialDelete(buttonClickEvent) {
			
			var removeFiles = [];
			var deleteUntracked = []; // Remove untracked files from disk
			var selectedFiles = fileSelect.options;
			for(var i=0, filePath; i<selectedFiles.length; i++) {
				if(selectedFiles[i].selected) {
					filePath = selectedFiles[i].value;
					if(untracked.indexOf(filePath) != -1) deleteUntracked.push(filePath);
					else removeFiles.push(filePath);
				}
			}
			console.log("deleteUntracked=" + JSON.stringify(deleteUntracked, null, 2));
			console.log("removeFiles=" + JSON.stringify(removeFiles, null, 2));
			
			if(removeFiles.length == 0 && deleteUntracked.length == 0) return alertBox("No files selected!");
				
			if(!buttonClickEvent.ctrlKey) {
				var msg = "Are you sure you want to delete the following files ?\n" + removeFiles.concat(deleteUntracked).join("\n");
				var yes = "Yes, Delete them";
				var no = "No!";
				
				confirmBox(msg, [yes, no], function shouldDelete(answer) {
					if(answer == yes) deleteTheFiles();
						else updateCommitFileSelect(rootDir);
					});
			}
			else deleteTheFiles();
			
		function deleteTheFiles() {
				
				var filesToBeDeleted = removeFiles.length + deleteUntracked.length;
				
				if(removeFiles.length > 0) {
			CLIENT.cmd("mercurial.remove", {directory: rootDir, files: removeFiles}, function removed(err, resp) {
				
				if(err) alertBox(err.message);
				else {
							
							filesToBeDeleted -= removeFiles.length;
							
							if(filesToBeDeleted == 0) updateCommitFileSelect(rootDir);
							
				};
			});
		}
			
				for (var i=0; i<deleteUntracked.length; i++) EDITOR.deleteFile(UTIL.trailingSlash(rootDir) + deleteUntracked[i], fileDeleted);
					
				function fileDeleted(err, path) {
						
							if(err) alertBox(err.message);
							else {
								filesToBeDeleted--;
								
								if(filesToBeDeleted == 0) updateCommitFileSelect(rootDir);
							}
						
			}
		}
		}
		
		function mercurialIgnore(e) {
			var tracked = []; // Check if some of the files are tracked, and ask if we should remove them
			var ignore = [];
			var selectedFiles = fileSelect.options;
			for(var i=0, filePath; i<selectedFiles.length; i++) {
				if(selectedFiles[i].selected) {
					filePath = selectedFiles[i].value;
					ignore.push(filePath);
					if(untracked.indexOf(filePath) == -1) tracked.push(filePath);
				}
			}
			
			if(tracked.length > 0) {
				var yes = "Yes, Forget them";
				var no = "NO!";
				confirmBox("Forget (stop tracking) the following files ?\n" + tracked.join("\n"), [no, yes], function(answer) {
					
					if(answer == no) {
						
						// Remove tracked files from files to be ignored
						while(tracked.length > 0) {
							ignore.splice(ignore.indexOf(tracked[0]), 1);
							tracked.splice(tracked.indexOf(tracked[0]), 1);
						}
						
						return ignoreFiles(false);
					}
					
					CLIENT.cmd("mercurial.forget", {directory: rootDir, files: ignore}, function forgotten(err, resp) {
						
						if(err) alertBox(err.message);
						else {
							
							ignoreFiles(true);
							
						};
						
					});
				})
			}
			else ignoreFiles(false);
			
			function ignoreFiles(filesForgotten) {
				
				if(ignore.length === 0) return alertBox("No file is selected!");
				
				var ignoreFilePath = rootDir + ".hgignore";
				var contentToAdd = "";
				
				for (var i=0; i<ignore.length; i++) {
					contentToAdd += ignore[i] + "\n";
				}
				
				if(contentToAdd == "") throw new Error("contentToAdd=" + contentToAdd + " ignore=" + JSON.stringify(ignore));
				
				// Check if .hgignore exist, or create it
				if(EDITOR.files.hasOwnProperty(ignoreFilePath)) {
					console.log(".hgigonore already open");
					var file = EDITOR.files[ignoreFilePath];
					
					contentToAdd = contentToAdd.replace(/\n/, file.lineBreak);
					if(file.text.charAt(file.text.length-1) != "\n") contentToAdd = file.lineBreak + contentToAdd;
					
					file.write(contentToAdd, true);
					saveFile(file);
				}
				else {
					
					EDITOR.doesFileExist(ignoreFilePath, function fileExist(exists) {
						
						if(exists) {
							console.log(".hgigonore already exists");
							EDITOR.openFile(ignoreFilePath, undefined, function fileOpened(err, file) {
								if(err) return alertBox(err.message);
								
								contentToAdd = contentToAdd.replace(/\n/, file.lineBreak);
								if(file.text.charAt(file.text.length-1) != "\n") contentToAdd = file.lineBreak + contentToAdd;
								
								file.write(contentToAdd, true);
								
								saveFile(file);
							});
						}
						else {
							console.log("Creating .hgigonore file");
							EDITOR.openFile(ignoreFilePath, contentToAdd, function fileOpened(err, file) {
								if(err) return alertBox(err.message);
								
								saveFile(file);
								
							});
							
						}
						
						
					});
				}
				
				function saveFile(file) {
					console.log("Saving .hgignore file ...");
					EDITOR.saveFile(file, ignoreFilePath, function fileSaved(err, filePath) {
						if(err) return alertBox(err.message);
						
						var msg = "";
						
						if(filesForgotten) msg += "The files has been added to .hgignore. Don't forget to commit!";
						
						EDITOR.renderNeeded();
						
						console.log("Updating commitFileSelect ...");
						updateCommitFileSelect(rootDir, function(err) {
							if(err) throw err;
							
							console.log("commitFileSelect updated!");
							
							//if(untracked.indexOf(".hgignore") != -1) msg += " Don't forget to commit the .hgignore file!"
							
							if(msg) alertBox(msg);
							
						});
						
					});
				}
				
			}
			
		}
		
		
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
						
						if(alsoPush) CLIENT.cmd("mercurial.push", {directory: rootDir}, hgPush);
						else {
							alertBox("Successfully commited! (don't forget to push)");
							commitSuccessful(resp.directory);
						}
					};
				});
			}
			
			function hgPush(err, resp) {
				if(err) {
					var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
					var authFailed = err.message.match(/abort: authorization failed/);
					
					if(authNeeded) {
						var repoUrl = authNeeded[1];
						showAuthDialog("Need authorization for Pushing changes to " + repoUrl + ": ", function authorized(username, password, save) {
							if(username != null) CLIENT.cmd("mercurial.push", {directory: rootDir, user: username, pw: password, save: save}, hgPush);
						}, "Push");
						return;
					}
					else if(authFailed) {
							alertBox("Authorization filed!\nUnable to Push to " + repoUrl);
					}
					else alertBox(err.message);
					}
					else {
						alertBox("Successfully commited and pushed to " + resp.remote);
						commitSuccessful(resp.directory);
					}
				}
			
			function commitSuccessful(directory) {
				
				// Keep showing the commit dialog ...
				// It's common to commit one file at a time
				
				textarea.value = "";
				updateCommitFileSelect(directory, function(err) {
					if(err) throw err;
				});
				
			}
		}
		
		function commitAndPush(e) {
			mercurialCommit(e, true);
		}
		
	}
	
	function updateCommitFileSelect(directory, callback) {
		
		while(fileSelect.firstChild) fileSelect.removeChild(fileSelect.firstChild); // Emty file list
		
		if(directory == undefined) {
			if(EDITOR.currentFile) directory = UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			else directory = EDITOR.workingDirectory;
		}
		
		CLIENT.cmd("mercurial.status", {directory: directory}, function hgstatus(err, resp) {
			if(err) {
				if(callback) callback(err);
				else {
					alertBox(err.message);
					hideMercurialWidgets();
				}
			}
			else {
				
				// Update the scope
				modified = resp.modified;
				added = resp.added;
				removed = resp.removed;
				missing = resp.missing;
				untracked = resp.untracked;
				rootDir = resp.rootDir;
				
				if(rootDir.charAt(rootDir.length-1) != "/" && rootDir.charAt(rootDir.length-1) != "\\") throw new Error("rootDir=" + rootDir + " does not end with a path delimter!");
				
				if(callback) callback(null, rootDir);
				
				//inputrootDir.value = rootDir;
				
				if(modified.length == 0 && added.length == 0 && removed.length == 0 && untracked.length == 0) {
					if(!callback) alertBox("No changes detected! (no need to commit)");
					// Ask to push !!?
					hideCommitDialog();
					return;
				}
				
				for(var i=0; i<modified.length; i++) insertFile(modified[i], true);
				for(var i=0; i<added.length; i++) insertFile(added[i], true);
				for(var i=0; i<removed.length; i++) insertFile(removed[i], true);
				for(var i=0; i<untracked.length; i++) insertFile(untracked[i], false);
				
				if(missing.length > 0) alertBox("The following files are missing:\n" + missing.join("\n"), "warning");
				// Ask to untrack them !?
				
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
	
	
	function buildResolveDialog(widget) {
		
		var div = document.createElement("div");
		
		var text = document.createElement("span");
		text.appendChild(document.createTextNode("Check files to marke them as resolved. Click on a file to open it."));
		
		resolveFileList = document.createElement("ul");
		resolveFileList.setAttribute("class", "resolveList");
		var commands = document.createElement("div");
		
		// ### Commands
		var cancel = document.createElement("button");
		cancel.appeendChild(document.createTextNode("Cancel"));
		cancel.onclick = function() {
			widget.hide();
		}
		
		commands.appendChild(cancel);
		
		div.appendChild(resolveFileList);
		div.appendChild(commands);
		
		return div;
		
	}
	
	function buildCloneDialog(widget) {
		
		var testRepo = {
			url: "https://hg.webtigerteam.com/repo/test",
			into: "/repo/test/",
			user: "user",
			pw: "pass"
		}
		
		var defaultRepo = testRepo;
		
		/*
			
			Do not bother (yet) with adding a remote repo to an existing repo, 
			or a folder with existing files (it's complicated)
			
			If there's already files inside the folder, but it's not an initiated repo
			1) Make sure the remote repo is emty
			2) Move the content of the folder to a temporary location
			3) Clone the remote repo
			4) Move the content back into the folder
			
			If there's already an initiated repo:
			1) Make sure the remote repo is emty
			2) Complicated stuff ...
			
			
			if(EDITOR.currentFile) {
			var currentFolderPath = UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			
			console.log("currentFolderPath=" + currentFolderPath);
			console.log("EDITOR.workingDirectory=" + EDITOR.workingDirectory);
			
			if(currentFolderPath != EDITOR.workingDirectory) {
			var folders = currentFolderPath.split(UTIL.getPathDelimiter(currentFolderPath));
			var lastFolder = folders[folders.length-1]; 
			// folder /a/b/c/
			if(lastFolder == "" && folders.length > 1) lastFolder = folders[folders.length-2];
			
			if(lastFolder != "") {
			defaultRepo = {
			url: UTIL.trailingSlash("https://hg.webtigerteam.com/repo/" + lastFolder),
			into: UTIL.trailingSlash(currentFolderPath),
			user: EDITOR.user,
			pw: ""
			}
			}
			
			}
			}
		*/
		
		
		var form = document.createElement("form");
		form.onsubmit = cloneRepo;
		
		/*
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
		*/
		
		// ### Remote repository
		var labelRepo = document.createElement("label");
		labelRepo.setAttribute("for", "repo");
		labelRepo.appendChild(document.createTextNode("Mercurial or Git Repository: "));
		form.appendChild(labelRepo);
		
		var repo = document.createElement("input");
		repo.setAttribute("type", "text");
		repo.setAttribute("id", "repo");
		repo.setAttribute("class", "inputtext url");
		repo.setAttribute("title", "URL to remote repository");
		repo.setAttribute("size", "30");
		repo.setAttribute("value", defaultRepo.url);
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
		localDir.setAttribute("value", defaultRepo.into);
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
		user.setAttribute("value", defaultRepo.user);
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
		pw.setAttribute("value", defaultRepo.pw);
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
		
		var cancel = document.createElement("button");
		cancel.setAttribute("type", "button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel"
		cancel.addEventListener("click", function cancel() {
			hideCloneDialog();
		}, false);
		form.appendChild(cancel);
		
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
					hideCloneDialog();
					
				};
				
			});
			
			return false; // Do not make HTTP get
		}
	}
	
	
	function showCloneDialog() {
		EDITOR.hideMenu();
		return repoCloneDialog.show();
	}
	
	function hideCloneDialog() {
		return repoCloneDialog.hide();
	}
	
	function showResolveDialog(resolved, unresolved, fileDirectory) {
		
		if(fileDirectory == undefined)  throw new Error("fileDirectory=" + fileDirectory);
		if(resolved == undefined) throw new Error("resolved=" + resolved);
		if(unresolved == undefined) throw new Error("unresolved=" + unresolved);
		
		// Update files
		
		while(resolveFileList.firstChild) resolveFileList.removeChild(resolveFileList.firstChild); // Emty list
		
		var files = resolved.concat(unresolved);
		
		// Sort alphabetically
		files.sort(function(a, b){
			if(a.firstname < b.firstname) return -1;
			if(a.firstname > b.firstname) return 1;
			return 0;
		});
		
		for (var i=0; i<files.length; i++) createFileListItem(files[i]);
		
		return resolveDialog.show();
		
		function createFileListItem(file) {
			
			var li = document.createElement("li");
			
			var checkbox = document.createElement("input");
			checkbox.setAttribute("type", "checkbox");
			if(resolved.indexOf(file) != -1) checkbox.setAttribute("checked", "checked");
			
			checkbox.onclick = function fileCheck(e) {
				if(checkbox.checked) {
					CLIENT.cmd("mercurial.resolvemark", {directory: fileDirectory, file: file}, function resolveList(err, resp) {
						if(err) throw err;
						if(resp.allResolved) {
							resolveDialog.hide();
							showCommitDialog();
						}
					});
				}
				else {
					CLIENT.cmd("mercurial.resolveunmark", {directory: fileDirectory, file: file}, function resolveList(err, resp) {
						if(err) throw err;
					});
				}
			}
			
			var a = document.createElement("a");
			a.appendChild(document.createTextNode(file));
			a.onclick = function clickFile(e) {
				EDITOR.openFile(file);
			}
			
			li.appendChild(checkbox);
			li.appendChild(a);
			
			resolveFileList.appendChild(li);
			
		}
	}
	
	function annotateOn() {
		
		if(doAnnotate) return;
		
		doAnnotate = true;
		
		var file = EDITOR.currentFile;
		
		if(!file) return alertBox("Open a file to see annotations");
		
		EDITOR.updateMenuItem(annotateMenuItem, doAnnotate, hideAnnotationsString, annotateOff);
		
		showAnnotations(file, file.caret);
		
		EDITOR.on("moveCaret", showAnnotations);
		
		EDITOR.hideMenu();
	}
	
	
	function showAnnotations(file, caret) {
		
		if(!doAnnotate) return;
		
		if(annotations.hasOwnProperty(file.path)) show(annotations[file.path]);
		else {
			
			var filePath = file.path;
			
			var matchOrig = filePath.match(/(.*)\.orig$/);
			
			console.log("matchOrig=" + matchOrig);
			
			if(matchOrig) filePath = matchOrig[1];
			
			CLIENT.cmd("mercurial.annotate", {file: filePath}, function updateAnnotation(err, resp) {
				
				if(err) {
					alertBox(err.message);
					annotations[file.path] = null;
				}
				else {
					
					console.log("Mercurial: Recieved annotations for file=" + file.path);
					
					annotations[file.path] = resp;
					
					show(resp);
				}
			});
		}
		
		function show(annotation) {
			
			if(annotation === null) return;
			else if(annotation === undefined) throw new Error("annotation=" + annotation);
			
			var changesets = annotation.changesets;
			var lineChangeset = annotation.lineChangeset;
			var lastLine = annotation.lastLine;
			
			
			var footer = document.getElementById("footer");
			
			var annotationWidget = document.getElementById("mercurialAnnotationWidget");
			
			if(!annotationWidget) {
				annotationWidget = document.createElement("div");
				annotationWidget.setAttribute("id", "mercurialAnnotationWidget");
				footer.appendChild(annotationWidget);
			}
			else {
				annotationWidget.style.display="block";
			}
			
			var line = caret.row + 1;
			
			var workingCopy = file.text.indexOf("<<<<<<< working copy");
			var split = file.text.indexOf("=======", workingCopy+21);
			var destination = file.text.indexOf(">>>>>>> destination", split+7);
			
			if(workingCopy != -1) {
				// Get the right annotation on the right line
				// This needs more work! ...
				
				var lineStart = 0;
				var lineSplit = 0;
				var lineEnd = 0;
				
				while(workingCopy != -1 && split != -1 && destination != -1) {
					lineStart = file.rowFromIndex(workingCopy).row + 1;
					lineSplit = file.rowFromIndex(split).row + 1;
					lineEnd = file.rowFromIndex(destination).row + 1;
					
					if(line > lineEnd) line -= (lineSplit-lineStart + 2); // for user edits
					else if(line < lineEnd && line > lineSplit) line -= (lineSplit - lineStart + 1); // conflicting commit
					else if(line >= lineStart && line <= lineSplit) return hide(line); // Users current edits
					else if(line == lineStart || line == lineSplit || line == lineEnd) return hide(line);
					
					console.log("line=" + line);
					
					workingCopy = file.text.indexOf("<<<<<<< working copy", destination+19);
					split = file.text.indexOf("=======", workingCopy + 21);
					destination = file.text.indexOf(">>>>>>> destination", split+7);
				}
			}
			
			console.log("Showing comments on line=" + line + " for file=" + file.path + "");
			
			if(lineChangeset.hasOwnProperty(line)) {
				var changeId = lineChangeset[line];
				if(!changesets.hasOwnProperty(changeId)) throw new Error("changesets does not have id=" + changeId + " changesets=" + JSON.stringify(changesets, null,2));
				var change = changesets[changeId];
				annotationWidget.innerText = change.user + " - " + change.date + " - " + change.summary;
				console.log("changesets=" + JSON.stringify(changesets, null, 2));
				console.log("showing changeset changeId=" + changeId);
				EDITOR.resizeNeeded();
			}
			else {
				console.log("No changeset available for line=" + line);
				hide();
			}
			
			annotation.lastLine = line;
		}
		
		function hide(line) {
			
			console.log("Hiding annotation. line=" + line + " real=" + (caret.row+1));
			
			var annotationWidget = document.getElementById("mercurialAnnotationWidget");
			
			if(annotationWidget) {
				
				annotationWidget.innerText = "";
				annotationWidget.style.display="none";
				
				EDITOR.resizeNeeded();
			}
			
			return true;
		}
		
		return false;
	}
	
	function annotateOff() {
		doAnnotate = false;
		
		EDITOR.updateMenuItem(annotateMenuItem, doAnnotate, showAnnotationsString, annotateOn);
		
		EDITOR.removeEvent("moveCaret", showAnnotations);
		
		EDITOR.hideMenu();
		
		var annotationWidget = document.getElementById("mercurialAnnotationWidget");
		if(annotationWidget) {
			var footer = document.getElementById("footer");
			footer.removeChild(annotationWidget);
			
			EDITOR.resizeNeeded();
			
			return false;
		}
		else return true;
	}
	
	
	function showCommitDialog(directory) {
		
		console.log("heyho");
		console.log(directory);
		
		if(directory instanceof File) directory = UTIL.getDirectoryFromPath(directory.path);
		
		EDITOR.hideMenu();
		repoCommitDialog.show();
		
		// Reset these values
		modified.length = 0;
		rootDir = null;
		untracked.length = 0;
		
		updateCommitFileSelect(directory);
		return false;
	}
	
	function hideCommitDialog() {
		return repoCommitDialog.hide();
	}
	
	function hideMercurialWidgets() {
		// Returning false prevents browser's default action. Only return false if we did something.
		return !!( repoCommitDialog.hide() + hideCloneDialog() + hideAuthDialog() );
	}
	
	function hideAuthDialog() {
		var authDialog = document.getElementById("repositoryAuthorizationDialog");
		if(authDialog) {
			var footer = document.getElementById("footer");
			footer.removeChild(authDialog);
			return false;
		}
		else return true;
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