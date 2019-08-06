/*
	Mercurial
	
	There are many SCM workflows and we should not asume a special workflow is used,
	so this plugin needs to be "general" and not du stuff on it's own.
	
	
	
	
*/

(function() {
	"use strict";
	
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
	
	var annotations = {};
	var doAnnotate = false;
	
	var resolveDialog = EDITOR.createWidget(buildResolveDialog);
	var resolveFileList;
	
	var versionHistoryVisible = false;
	var versionHistoryWidget = EDITOR.createWidget(buildVersionHistoryWidget);
	var historyTableBody;
	var selectedRev; // {id, files}
	var lastActiveHistoryTableRow;
	
	var versionControlWidget = EDITOR.createWidget(buildVersionControlWidget);
	
	var progressBar;
	var progressBarWidget = EDITOR.createWidget(buildProgressBarWidget);
	
	var winMenuMercurial, winMenuMercurial2, winMenuCommit, winMenuDiffRevision, winMenuAnnotations;
	
	var discoveryBarImg;
	
	var testRepo = {
		url: "https://hg.webtigerteam.com/repo/test",
		into: "/repo/test/",
		user: "user",
		pw: "pass"
	}
	
	// todo: Reload annotations when the file on disk changes!! (like a reload), update, merge, etc
	
	EDITOR.plugin({
		desc: "Mercurial SCM integration",
		load: loadMercurial,
		unload: unloadMercurial
	});
	
	
	function loadMercurial() {
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide Mercurial widgets", charCode: char_Esc, fun: hideMercurialWidgets});
		EDITOR.bindKey({desc: "Source control: Commit", fun: showCommitDialog, charCode: "C".charCodeAt(0), combo: ALT});
		EDITOR.bindKey({desc: "Source control: Compare working directory with parent revision", fun: diffWorkingDirectory, charCode: "D".charCodeAt(0), combo: ALT});
		
		winMenuMercurial = EDITOR.windowMenu.add("Source/version control", ["Tools", 2], toggleVersionControlWidget);
		winMenuMercurial2 = EDITOR.windowMenu.add("Show command bar", ["SCM", 1], toggleVersionControlWidget);
		winMenuCommit = EDITOR.windowMenu.add("Commit", ["SCM", 5], showCommitDialog);
		winMenuDiffRevision = EDITOR.windowMenu.add("Diff revision", ["SCM", 6], diffWorkingDirectory);
		winMenuAnnotations = EDITOR.windowMenu.add("Show annotations", ["SCM", 11], toggleAnotations);
		
		//EDITOR.on("fileOpen", mercurialFileOpen);
		EDITOR.on("commitTool", mercurialCommitTool);
		
		EDITOR.on("showMenu", showScmMenuItemsMaybe);
		
		CLIENT.on("mercurialProgress", mercurialProgressStatus);
		// Make the progress bar appear on top:
		progressBarWidget.show();
		progressBarWidget.hide();
		
		repoCloneMenuItem = EDITOR.ctxMenu.add("Clone a repository ...", showCloneDialog, 12);
		
		CLIENT.on("loginSuccess", cloneRepoMaybe);
		
		EDITOR.registerAltKey({char: ",", alt:1, label: "version control", fun: showVersionControlWidget});
		
		discoveryBarImg = document.createElement("img");
		discoveryBarImg.src = "gfx/share.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
		discoveryBarImg.title = "Version control"
		discoveryBarImg.onclick = toggleVersionControlWidget;
		EDITOR.discoveryBar.add(discoveryBarImg, 5);
		
	}
	
	function unloadMercurial() {
		
		EDITOR.unbindKey(hideMercurialWidgets);
		EDITOR.unbindKey(showCommitDialog);
		EDITOR.unbindKey( diffWorkingDirectory);
		
		//EDITOR.removeEvent("fileOpen", mercurialFileOpen);
		
		EDITOR.removeEvent("moveCaret", showAnnotations);
		EDITOR.removeEvent("commitTool", mercurialCommitTool);
		EDITOR.removeEvent("resolveTool", mercurialResolveTool);
		
		EDITOR.removeEvent("showMenu", showScmMenuItemsMaybe);
		
		EDITOR.ctxMenu.remove(repoCloneMenuItem);
		
		CLIENT.removeEvent("mercurialProgress", mercurialProgressStatus);
		
		CLIENT.removeEvent("loginSuccess", cloneRepoMaybe);
		
		EDITOR.unregisterAltKey(showVersionControlWidget);
		
		EDITOR.windowMenu.remove(winMenuMercurial);
		EDITOR.windowMenu.remove(winMenuMercurial2);
		EDITOR.windowMenu.remove(winMenuCommit);
		EDITOR.windowMenu.remove(winMenuDiffRevision);
		EDITOR.windowMenu.remove(winMenuAnnotations);
		
		hideMercurialWidgets();
		
	}
	
	function cloneRepoMaybe() {
		/*
			Is it a good idea to clone the repo automatically ?
			Or should we just show the clone dialog with repo pre-filled !?
			
			Example url: https://webide.se/?repo=https://github.com/Z3TA/vumoviemaker.git
		*/
		var repo = QUERY_STRING.repo || QUERY_STRING.clone;
		if(repo) {
			var folder = "/repo/";
			
			var matchGit = repo.match(/\/([^/]*)\.git$/);
			var matchUrl = repo.match(/\/([^/]*)$/);
			
			if(repo.slice(-1) == "/") folder += UTIL.getFolderName(repo) + "/";
			else if(matchGit) folder += matchGit[1] + "/";
			else if(matchUrl) folder += matchUrl[1] + "/";
			
			testRepo = {
				url: repo,
				into: folder,
				user: "",
				pw: ""
			}
			showCloneDialog();
			// Don't attempt to clone again after reconnection
			QUERY_STRING.repo = null; 
			QUERY_STRING.clone = null; 
		}
	}
	
	function buildProgressBarWidget(widget) {
		progressBar = document.createElement("progress");
		progressBar.setAttribute("class", "progress mercurial");
		progressBar.setAttribute("style", "width: 100%");
		progressBar.setAttribute("value", "0");
		progressBar.setAttribute("max", "1");
		
		return progressBar;
	}
	
	function mercurialProgressStatus(status) {
		console.log("mercurialProgressStatus: " + JSON.stringify(status));
		
		if(!progressBar) progressBarWidget.show();
		
		if(status.max == status.value) {
			progressBarWidget.hide();
			progressBar.max = 1;
			progressBar.value = 0;
		}
		else {
			progressBarWidget.show();
			progressBar.max = status.max;
			progressBar.value = status.value;
		}
	}
	
	function showScmMenuItemsMaybe() {
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		
		if(file.savedAs) {
		var directory = UTIL.getDirectoryFromPath(file.path);
		}
		else {
			var directory = EDITOR.workingDirectory;
		}
		
		CLIENT.cmd("mercurial.status", {directory: directory}, function hgstatus(err, status) {
				if(err) {
				console.log("mercurial.status error: " + err.message);
				// Most likely no local repository found !?
				// Because this is run every time the menu is opened, ignore any error
				//if(err.code != "NO_HG_FOLDER" && err.code != "LOGIN_NEEDED" && err.code != "CONNECTION_CLOSED" && err.code != "ENOENT" && err.code != "ENOSYS") alertBox(err.message);
				return;
			}
			else {
				
				console.log("mercurial.status : " + JSON.stringify(status) + " versionControlWidget.visible=" + versionControlWidget.visible);
				
				// "modified":[],"added":[],"removed":[],"missing":[],"untracked":
				
				if(status.modified.length != 0 || status.added.length != 0 || status.removed.length != 0 || status.missing.length != 0) {
					repoCommitMenuItem = EDITOR.ctxMenu.addTemp("Commit", false, showCommitDialog);
				}
				
				var versionControlString = "Version Control ...";
				var versionControlMenuItem = EDITOR.ctxMenu.addTemp(versionControlString, false, showVersionControlWidget);
				if(versionControlWidget.visible) EDITOR.ctxMenu.update(versionControlMenuItem, true, versionControlString, hideVersionControlWidget);
				else EDITOR.ctxMenu.update(versionControlMenuItem, false, versionControlString, showVersionControlWidget);
				
				
				/*
					
				if(status.modified.length == 0 && status.added.length == 0 && status.removed.length == 0 && status.missing.length == 0) {
					EDITOR.ctxMenu.addTemp("Push", false, function() {
						EDITOR.ctxMenu.hide();
						mercurialPush(status.rootDir);
					});
				}
				
				if(QUERY_STRING.pull) {
					EDITOR.ctxMenu.addTemp("Pull (update+merge)", false, function() {
					EDITOR.ctxMenu.hide();
					mercurialDance(file);
				});
				}
				
				var showAnnotationsString = "Show commit messages";
					var annotateMenuItem = EDITOR.ctxMenu.addTemp(showAnnotationsString, false, annotateOn);
				if(doAnnotate) EDITOR.ctxMenu.update(annotateMenuItem, doAnnotate, showAnnotationsString, annotateOff);
				else EDITOR.ctxMenu.update(annotateMenuItem, doAnnotate, showAnnotationsString, annotateOn);
				
				var showHistoryString = "Version history";
					var historyMenyItem = EDITOR.ctxMenu.addTemp(showHistoryString, true, showVersionHistory);
				if(versionHistoryVisible) EDITOR.ctxMenu.update(historyMenyItem, versionHistoryVisible, showHistoryString, hideVersionHistory);
				else EDITOR.ctxMenu.update(historyMenyItem, versionHistoryVisible, showHistoryString, showVersionHistory);
				*/
				
				}
		});
		}
	
	function mercurialCommitTool(directoryOrFile) {
		
		if(directoryOrFile instanceof File) directoryOrFile = directoryOrFile.path;
		
		if(directoryOrFile == undefined) var directory = UTIL.getDirectoryFromPath(EDITOR.currentFile && EDITOR.currentFile.path);
		else if(!UTIL.isDirectory(directoryOrFile)) var directory = UTIL.getDirectoryFromPath(directoryOrFile);
		else var directory = directoryOrFile;
		
		// Does the directory has a initated Mercurial repo ?
		CLIENT.cmd("mercurial.hasRepo", {directory: directory}, function hgstatus(err, resp) {
			if(err) throw err;
			
			var rootDir = resp.directory;
			
			if(rootDir == null) console.warn("No Mercurial repo found in directory=" + directory);
			else showCommitDialog(rootDir);
			
		});
	}
	
	function mercurialResolveTool(resolved, unresolved, directory) {
		// Does the directory has a initated Mercurial repo ?
		CLIENT.cmd("mercurial.hasRepo", {directory: directory}, function hgstatus(err, resp) {
			if(err) throw err;
			
			var rootDir = resp.directory;
			
			if(rootDir == null) alertBox("No Mercurial repo found in directory=" + directory);
			else if(resolved && unresolved) showResolveDialog(resolved, unresolved, rootDir);
			else checkForUnresolved(rootDir);
			
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
		
		// Check if there are ucommited work on the local working copy
		
	}
	
	function buildCommitDialog(widget) {
		
		var div = document.createElement("div");
		div.setAttribute("class", "repoCommit");
		
		var group = document.createElement("div");
		group.setAttribute("class", "group");
		
		fileSelect = document.createElement("select");
		fileSelect.setAttribute("class", "file list");
		fileSelect.setAttribute("size", "6");
		fileSelect.setAttribute("title", "Select files");
		fileSelect.setAttribute("multiple", "multiple");
		fileSelect.onkeydown = selectFileKeyDown;
		
		group.appendChild(fileSelect);
		div.appendChild(group);
		
		
		var group = document.createElement("div");
		group.setAttribute("class", "group");
		
		var textarea = document.createElement("textarea");
		textarea.setAttribute("cols", "50");
		textarea.setAttribute("rows", "6");
		textarea.setAttribute("placeholder", "Comments ...");
		
		group.appendChild(textarea);
		div.appendChild(group);
		
		
		var group = document.createElement("div");
		group.setAttribute("class", "group buttons");
		
		// ### Commit button
		var commitButton = document.createElement("button");
		commitButton.setAttribute("class", "button");
		commitButton.appendChild(document.createTextNode("Commit changes"));
		commitButton.onclick = mercurialCommit;
		
		group.appendChild(commitButton);
		
		
		// ### Commit & Push button
		var commitAndPushButton = document.createElement("button");
		commitAndPushButton.setAttribute("class", "button");
		commitAndPushButton.appendChild(document.createTextNode("Commit & Push"));
		commitAndPushButton.onclick = commitAndPush;
		
		group.appendChild(commitAndPushButton);
		
		
		// ### Diff button
		var diffButton = document.createElement("button");
		diffButton.setAttribute("class", "button");
		diffButton.appendChild(document.createTextNode("Diff"));
		diffButton.onclick = function diffButtonClick() {
			var files = [];
			var selectedFiles = fileSelect.options;
				for(var i=0, filePath; i<selectedFiles.length; i++) {
					if(selectedFiles[i].selected) {
						filePath = selectedFiles[i].value;
					files.push(filePath);
						}
				}
			mercurialDiff(rootDir, files);
			};
		
		group.appendChild(diffButton);
		
		
		// ### Cancel button
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "button");
		cancelButton.appendChild(document.createTextNode("Cancel commit"));
		cancelButton.onclick = function cancel() {
			hideCommitDialog();
		};
		
		group.appendChild(cancelButton);
		
		
		// ### Ignore button
		var ignoreButton = document.createElement("button");
		ignoreButton.setAttribute("class", "button");
		ignoreButton.appendChild(document.createTextNode("Ignore ..."));
		ignoreButton.onclick = mercurialIgnore;
		
		group.appendChild(ignoreButton);
		
		
		// ### Delete button
		var deleteButton = document.createElement("button");
		deleteButton.setAttribute("class", "button");
		deleteButton.appendChild(document.createTextNode("Delete"));
		deleteButton.onclick = mercurialDelete;
		
		group.appendChild(deleteButton);
		
		
		// ### Revert button
		var revertButton = document.createElement("button");
		revertButton.setAttribute("class", "button");
		revertButton.setAttribute("title", "Restore files to their checkout state");
		revertButton.appendChild(document.createTextNode("Revert"));
		revertButton.onclick = mercurialRevert;
		
		group.appendChild(revertButton);
		
		div.appendChild(group);
		
		
		// ### Refresh button
		var refreshButton = document.createElement("button");
		refreshButton.setAttribute("class", "button");
		refreshButton.appendChild(document.createTextNode("Refresh"));
		refreshButton.onclick = function() {
updateCommitFileSelect();
		};
		group.appendChild(refreshButton);
		
		
		/*
			inputrootDir = document.createElement("input");
			inputrootDir.setAttribute("type", "hidden");
			div.appendChild(inputrootDir);
		*/
		
		return div;
		
		function selectFileKeyDown(keyDownEvent) {
			keyDownEvent = keyDownEvent || window.event;
			var delKey = 46;
			if(keyDownEvent.keyCode == delKey) {
				mercurialDelete(keyDownEvent);
				return false;
			}
			
			return true;
		}
		
		function mercurialRevert(buttonClickEvent) {
			
			var revertFiles = [];
			var selectedFiles = fileSelect.options;
			for(var i=0, filePath; i<selectedFiles.length; i++) {
				if(selectedFiles[i].selected) {
					filePath = selectedFiles[i].value;
					revertFiles.push(filePath);
				}
			}
			console.log("revertFiles=" + JSON.stringify(revertFiles, null, 2));
			
			if(revertFiles.length == 0) return alertBox("No files selected!");
			
			if(!buttonClickEvent.ctrlKey) {
				var msg = "Are you sure you want to Revert the following files to last revision ? All changes will be lost !\n" + revertFiles.join("\n");
				var yes = "Revert";
				var no = "Canel";
				
				confirmBox(msg, [yes, no], function shouldDelete(answer) {
					if(answer == yes) revertTheFiles();
					else updateCommitFileSelect(rootDir);
				});
			}
			else revertTheFiles();
			
			function revertTheFiles() {
				
				CLIENT.cmd("mercurial.revert", {directory: rootDir, files: revertFiles}, function reverted(err, resp) {
						
						if(err) alertBox(err.message);
					
					updateCommitFileSelect(rootDir);
				
					// Reload the files opened in the editor
					var fullPath;
					for (var i=0; i<revertFiles.length; i++) {
						fullPath = rootDir + revertFiles[i];
						for(var path in EDITOR.files) {
							if(path == fullPath) reload(EDITOR.files[path]);
						}
					}
					
					function reload(file) {
						EDITOR.readFromDisk(file.path, function(err, path, text) {
							if(err) throw err;
						else {
							file.reload(text);
							file.saved(); // Because we reloaded from disk
								}
						});
					}
					
				});
				
			}
		}
		
		function mercurialDelete(buttonOrKeyEvent) {
			
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
			
			if(!buttonOrKeyEvent.ctrlKey) {
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
						
						return readyToCommit();
					}
					
					CLIENT.cmd("mercurial.add", {directory: rootDir, files: nonTracked}, function commited(err, resp) {
						
						if(err) alertBox(err.message);
						else {
							
							readyToCommit();
							
						};
						
					});
				})
			}
			else readyToCommit();
			
			
			function readyToCommit(commitAll) {
				
				var selectedFileCount = 0;
				for (var i = 0; i < fileSelect.options.length; i++) {
					if (fileSelect.options[i].selected) {
						selectedFileCount++;
					}
				}
				
				if(commitAll && selectedFileCount < fileSelect.options.length) {
					throw new Error("Not all files selected while commitAll=" + commitAll);
				}
				
				var cmd = "mercurial.commit";
				if(commitAll) cmd = "mercurial.commitAll";
				CLIENT.cmd(cmd, opt, function commited(err, resp) {
					if(err) {
						
						if(err.message.match(/created new head/)) {
							// todo: We need to pull and merge before pushing!
							alertBox("We need to pull and merge before pushing!");
						}
						else if(err.message.match(/cannot partially commit a merge/)) {
							/*
								This can happen if Mercurial expects a commit without files specified.
								
								todo:  'hg resolve -m [FILE]' !?!?
							*/
							
							if(selectedFileCount == fileSelect.options.length && selectedFileCount == opt.files.length && !commitAll) {
								return readyToCommit(true);
							}
							else console.log("selectedFileCount=" + selectedFileCount + " fileSelect.options.length=" + fileSelect.options.length + " opt.files.length=" + opt.files.length + " commitAll=" + commitAll + " ");
							
							alertBox("We need to reslove the merge conflict manually.");
						}
						else if(err.message.match(/unresolved merge conflicts/)) {
							alertBox("Resolve merge conflicts before committing!");
							checkForUnresolved(opt.directory, false);
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
						showAuthDialog("Need authorization for Pushing changes to " + repoUrl + ": ", resp.directory, "Push", function authorized(username, password, save) {
							if(username != null) CLIENT.cmd("mercurial.push", {directory: rootDir, user: username, pw: password, save: save}, hgPush);
						});
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
	
	function mercurialPush(fileDirectory) {
		
		fileDirectory = figureOutDirectoryIfUndefined(fileDirectory);
		
		CLIENT.cmd("mercurial.push", {directory: fileDirectory}, hgPush);
		
		function hgPush(err, resp) {
			if(err) {
				var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
				var authFailed = err.message.match(/abort: authorization failed/);
				
				if(authNeeded) {
					var repoUrl = authNeeded[1];
					showAuthDialog("Need authorization for Pushing changes to " + repoUrl + ": ", fileDirectory, "Push", function authorized(username, password, save) {
						if(username != null) CLIENT.cmd("mercurial.push", {directory: fileDirectory, user: username, pw: password, save: save}, hgPush);
					});
					return;
				}
				else if(authFailed) {
					alertBox("Authorization filed!\nUnable to Push to " + repoUrl);
				}
				else alertBox(err.message);
			}
			else {
				
				var msg = "Successfully pushed to " + resp.remote;
				
				if(resp.changesets == null) msg += "\n(no changes)";
				else msg += "\n(" + resp.changesets + " changesets with " + resp.changes + " changes to " + resp.files + " files)";
				
				alertBox(msg);
				}
		}
		
	}
	
	function updateCommitFileSelect(directory, callback) {
		
		while(fileSelect.firstChild) fileSelect.removeChild(fileSelect.firstChild); // Emty file list
		
		if(directory == undefined) {
			if(EDITOR.currentFile) directory = UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			else directory = EDITOR.workingDirectory;
		}
		
		if(typeof directory != "string") throw new Error("Not a string: directory=" + directory);
		
		CLIENT.cmd("mercurial.status", {directory: directory}, function hgstatus(err, resp) {
			if(err) {
				if(callback) callback(err);
				else {
					alertBox("Unable to get status!\n" + err.message);
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
				
				if(missing.length > 0) alertBox("The following files are missing:\n" + missing.join("\n"), "SCM", "warning");
				// Ask to untrack them !?
				
			}
			
			function insertFile(filePath, selected) {
				var fullPath = rootDir + filePath;
				var option = document.createElement("option");
				
				option.setAttribute("class", "file");
				option.setAttribute("value", filePath);
				if(selected) option.setAttribute("selected", "selected");
				
				option.appendChild(document.createTextNode(filePath));
				option.ondblclick = function openFile() {
					EDITOR.openFile(fullPath);
				};
				
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
		
		var text = document.createElement("p");
		text.appendChild(document.createTextNode("The files below needs to be resolved. Click on the file path to open it. And click on the check-box to mark/unmark a file as resolved/unresolved. "));
		
		resolveFileList = document.createElement("ul");
		resolveFileList.setAttribute("class", "resolveList");
		var commands = document.createElement("div");
		
		// ### Commands
		var cancel = document.createElement("button");
		cancel.setAttribute("class", "button");
		cancel.appendChild(document.createTextNode("Cancel resolve"));
		cancel.onclick = function() {
			widget.hide();
		}
		
		commands.appendChild(cancel);
		
		div.appendChild(text);
		div.appendChild(resolveFileList);
		div.appendChild(commands);
		
		return div;
		
	}
	
	function buildCloneDialog(widget) {
		
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
			user: EDITOR.user.name,
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
		
		var originalLocalDirValue = EDITOR.user ? UTIL.joinPaths(EDITOR.user.home, defaultRepo.into) : defaultRepo.into;
		
		var repo = document.createElement("input");
		repo.setAttribute("type", "text");
		repo.setAttribute("id", "repo");
		repo.setAttribute("class", "inputtext url");
		repo.setAttribute("title", "URL to remote repository");
		repo.setAttribute("size", "40");
		repo.setAttribute("value", defaultRepo.url);
		form.appendChild(repo);
		repo.onchange = function() {
			if(localDir.value == originalLocalDirValue || localDir.value == "") {
				var matchRepoName = repo.value.match(/[/\\]([^/\\.]*)(\.git)?$/);
if(matchRepoName && matchRepoName[1]) {
					if(EDITOR.user) localDir.value = UTIL.joinPaths(EDITOR.user.home, "repo/" + matchRepoName[1] + "/")
					else localDir.value = UTIL.homeDir(EDITOR.workingDirectory) + "repo/" + matchRepoName[1] + "/";
}
			}
		}
		
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
		localDir.setAttribute("value", originalLocalDirValue);
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
		labelPw.appendChild(document.createTextNode("Password: "));
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
		
		// ### SSH key button
		var sshButton = document.createElement("input");
		sshButton.setAttribute("type", "button");
		sshButton.setAttribute("class", "button");
		sshButton.setAttribute("value", "Copy SSH Public key");
		sshButton.setAttribute("title", "Copy public SSH key to clipboard");
		sshButton.addEventListener("click", getSSHPublicKey, false);
		form.appendChild(sshButton);
		
		var cancel = document.createElement("button");
		cancel.setAttribute("type", "button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel clone"
		cancel.addEventListener("click", function cancel() {
			hideCloneDialog();
		}, false);
		form.appendChild(cancel);
		
		return form;
		
		function cloneRepo(e) {
			
			// First make sure the parent folder exist!
			var folderName = UTIL.getFolderName(localDir.value);
			var parentFolder = UTIL.parentFolder(localDir.value);
			
			if(repo.value.indexOf("github.com") != -1 && repo.value.slice(-4) != ".git") {
				var yes = "Yes";
				var no = "No";
				var cancel = "Cancel";
				confirmBox("Did you mean " + repo.value + ".git ?", [yes, no, cancel], function(answer) {
					if(answer == yes) {
						repo.value = repo.value + ".git";
						checkFolders();
					}
					else if(answer == no) checkFolders();
				});
			}
			else checkFolders();
			
			return false; // Do not make a HTTP get
			
			function checkFolders() {
				
				console.log("Cloning to folderName=" + folderName + " in parentFolder=" + parentFolder);
				
				if(parentFolder == "/") doClone(); // No need to check
				else {
					CLIENT.cmd("listFiles", {pathToFolder: parentFolder}, function listFilesResp(err, files) {
						console.log("listFiles in parentFolder=" + parentFolder + " : err=" + err + " files.length=" + (files && files.length) + " files=" + JSON.stringify(files, null, 2));
						if(err) {
							if(err.code == "ENOENT") {
								var yes = "Create it";
								var no = "Abort";
								confirmBox(parentFolder + " does not exist!", [yes, no], function confirmCreate(answer) {
									if(answer == yes) {
										CLIENT.cmd("createPath", {pathToCreate: parentFolder}, function folderCreated(err, json) {
											if(err) return alertBox(err.message);
											else doClone();
										});
									}
									else console.log("clone aborted by user!");
								});
							}
							else return alertBox(err.message);
						}
						else {
							// Chech if the folder already exist
							for(var i=0; i<files.length; i++) {
								if(files[i].name == folderName && files[i].type == "d") {
									console.log("Destination folder exist! Check if it's emty: " + localDir.value);
									CLIENT.cmd("listFiles", {pathToFolder: parentFolder}, function listFilesResp(err, files) {
										console.log("listFiles in folderName=" + folderName + " : err=" + err + " files.length=" + (files && files.length) + " files=" + JSON.stringify(files, null, 2));
										if(err) return alertBox(err.message);
										else if(files.length == 0) doClone(); // It's emty
										else {
											alertBox("Destination folder is not empty!\n" + localDir.value);
										}
									});
									return;
								}
							}
							// Folder does not exist
							doClone();
						}
					});
				}
			}
			
			function doClone() {
				
				var command = "mercurial.clone";
				
				var commandOptions = {
					local: localDir.value,
					remote: repo.value,
					user: user.value,
					pw: pw.value,
					save: savePassword.checked
				}
				
				CLIENT.cmd(command, commandOptions, function cloned(err, resp) {
					if(err) {
var error = err.message;
						
						// For git+ssh to work you need both a username/password and a known public ssh key 
						if( error.match(/permission denied/i) && repo.value.match(/^git@/) ) {
							error += "\n\nTip: Try using HTTPS instead"
						}
						
						alertBox(error);
					}
					else {
						// Show the files in file explorer
						EDITOR.fileExplorer(resp.path);
						
						// Show readme if one exist ...
						EDITOR.listFiles(resp.path, function(err, files) {
							if(err) throw err;
							
							for(var i=0; i<files.length; i++) {
								if( files[i].type == "-" && files[i].name.match(/readme/i) ) {
									EDITOR.openFile(files[i].path);
									return;
								}
}
							// No readme found
							alertBox("Successfully cloned to:\n" + resp.path);
						});
						
						hideCloneDialog();
						};
					});
			}
		}
	}
	
	
	function showCloneDialog() {
		EDITOR.ctxMenu.hide();
		winMenuCommit.hide();
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
		if(!resolveFileList) resolveDialog.show();
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
					CLIENT.cmd("mercurial.resolvemark", {directory: fileDirectory, file: file.replace(fileDirectory, "")}, function resolveList(err, resp) {
						if(err) throw err;
						if(resp.allResolved) {
							resolveDialog.hide();
							showCommitDialog();
						}
					});
				}
				else {
					CLIENT.cmd("mercurial.resolveunmark", {directory: fileDirectory, file: file.replace(fileDirectory, "")}, function resolveList(err, resp) {
						if(err) throw err;
					});
				}
			}
			
			var a = document.createElement("a");
			a.appendChild(document.createTextNode(file));
			a.setAttribute("href", "javascript:void(0)"); // So it will be styled as a link
			a.onclick = function clickFile(e) {
				EDITOR.openFile(file);
			}
			
			
			li.appendChild(checkbox);
			li.appendChild(a);
			
			resolveFileList.appendChild(li);
			
		}
	}
	
	function toggleAnotations() {
		if(doAnnotate) annotateOff();
		else annotateOn();
	}
	
	function annotateOn() {
		
		if(doAnnotate) return;
		
		doAnnotate = true;
		
		winMenuAnnotations.activate();
		
		var file = EDITOR.currentFile;
		
		if(!file) return alertBox("Open a file to see annotations");
		
		showAnnotations(file, file.caret);
		
		EDITOR.on("moveCaret", showAnnotations);
		
		EDITOR.ctxMenu.hide();
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
					alertBox("Unable to show annotations for " + filePath + "\n" + err.message);
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
			var lineChangeset = annotation.lines;
			var lastLine = annotation.lastLine;
			
			
			var footer = document.getElementById("footer");
			
			var annotationWidget = document.getElementById("mercurialAnnotationWidget");
			
			if(!annotationWidget) {
				console.log("Creating annotationWidget!");
				annotationWidget = document.createElement("div");
				annotationWidget.setAttribute("id", "mercurialAnnotationWidget");
				annotationWidget.setAttribute("class", "mercurialAnnotationWidget");
				
				var annotationRev = document.createElement("a");
				annotationRev.setAttribute("class", "annotationRev");
				annotationRev.setAttribute("href", "JavaScript: ;");
				annotationWidget.appendChild(annotationRev);
				
				var annotationText = document.createElement("div");
				annotationText.setAttribute("class", "annotationText");
				annotationWidget.appendChild(annotationText);
				
				footer.appendChild(annotationWidget);
			}
			else {
				console.log("annotationWidget already exist!");
				console.log(annotationWidget);
				annotationWidget.style.display="block";
				console.log(annotationWidget.childNodes);
				
				if(annotationWidget.childNodes.length == 0) throw new Error("annotationWidget.childNodes.length=" + annotationWidget.childNodes.length);
				
				var annotationRev = annotationWidget.childNodes[0];
				var annotationText = annotationWidget.childNodes[1];
				
				console.log(annotationRev.childNodes);
			}
			
			var line = caret.row + 1;
			
			var workingCopy = file.text.indexOf("<<<<<<< working copy");
			var split = file.text.indexOf("=======", workingCopy+21);
			var destination = file.text.indexOf(">>>>>>> destination", split+7);
			
			if(workingCopy != -1) {
				// Get the right annotation on the right line
				// This needs more work! ...
				// todo: Is this really needed? 
				
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
			
			//console.log("Showing comments on line=" + line + " for file=" + file.path + "");
			
			// todo: When the user adds or remove lines, the annotation line mapping will be off! 
			// dilemma: Unless the user has saved, calling hg annotate again will not give the correct lines!
			
			var changeId = lineChangeset[line-1];
			
			if(changeId) {
				var change = changesets[changeId];
				if(!change) {
					for(var id in changesets) console.log(id + " = " + changesets[id]);
					throw new Error("changesets does not have id=" + changeId + " changesets=" + JSON.stringify(changesets, null,2) + 
					" typeof changesets = " + (typeof changesets) + " change=" + change + " Object.keys(changesets)=" + Object.keys(changesets) + 
					" typeof changeId = " + (typeof changeId) + " changesets.hasOwnProperty(" + changeId + ")=" + changesets.hasOwnProperty(changeId) + 
					" changesets.hasOwnProperty('0')=" + changesets.hasOwnProperty('0') + " changesets.hasOwnProperty('1')=" + changesets.hasOwnProperty('1') +
					" lineChangeset=" + JSON.stringify(lineChangeset, null, 2));
				}
				console.log("change=" + change);
				annotationText.innerText = change.user + " - " + change.date + " - " + (change.summary || change.description);
				
				annotationRev.innerText = "rev " + changeId;
				
				annotationRev.onclick = diff; 
				
				console.log("changesets=" + JSON.stringify(changesets, null, 2));
				console.log("showing changeset changeId=" + changeId);
			}
			else {
				console.warn("No annotations for line " + line + " in " + file.path + " changeId=" + changeId + " lineChangeset=" + JSON.stringify(lineChangeset, null, 2));
				annotationText.innerText = "No annotations for line " + line + " in " + file.path;
			}
			
			EDITOR.resizeNeeded();
			
			annotation.lastLine = line;
			
			function diff(ev) {
				if(!changeId) throw new Error("changeId=" + changeId);
				var fileDirectory = figureOutDirectoryIfUndefined(rootDir);
				CLIENT.cmd("mercurial.diff", {directory: fileDirectory, changes: changeId}, function hgDiff(err, resp) {
					
					if(err) return alertBox(err.message);
					
					var text = resp.text;
					var fileName = UTIL.getFileNameWithoutExtension(EDITOR.currentFile.path) + "-rev" + changeId + ".diff";
					EDITOR.openFile(fileName, text, function(err, file) {
						if(err) alertBox(err.message);
					});
				});
			}
		}
		
		function hide(line) {
			
			console.log("Hiding annotation. line=" + line + " real=" + (caret.row+1));
			
			var annotationWidget = document.getElementById("mercurialAnnotationWidget");
			
			if(annotationWidget) {
				annotationWidget.style.display="none";
				
				var annotationText = annotationWidget.childNodes[0];
				annotationText.innerText = "";
				
				EDITOR.resizeNeeded();
			}
			
			return true;
		}
		
		return false;
	}
	
	function annotateOff() {
		doAnnotate = false;
		
		EDITOR.removeEvent("moveCaret", showAnnotations);
		
		EDITOR.ctxMenu.hide();
		
		winMenuAnnotations.deactivate();
		
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
		
		//console.log("heyho");
		//console.log(directory);
		
		if(directory instanceof File) directory = UTIL.getDirectoryFromPath(directory.path);
		
		EDITOR.ctxMenu.hide();
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
		return !!( hideAnnotationWidget() + repoCommitDialog.hide() + hideCloneDialog() + hideAuthDialog() + hideVersionHistory() + versionControlWidget.hide() );
	}
	
	function hideAnnotationWidget() {
		var annotationWidget = document.getElementById("mercurialAnnotationWidget");
		if(annotationWidget) {
			var footer = document.getElementById("footer");
			footer.removeChild(annotationWidget);
			return false;
		}
		else return true;
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
	
	function showAuthDialog(message, rootDir, submitText, callback) {
		
		if(rootDir == undefined) throw new Error("rootDir=" + rootDir);
		
		if(typeof submitText == "function") {
			callback = submitText;
			submitText = undefined;
		}
		
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
		cancelButton.appendChild(document.createTextNode("Cancel auth"));
		
		
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
	
	function showVersionHistory(file) {
		versionHistoryVisible = true;
		EDITOR.ctxMenu.hide();
		
		versionHistoryWidget.show();
		
		var filePath;
		
		if(file) {
			if(!(file instanceof File) && !file.hasOwnproperty("path")) throw new Error("showVersionHistory: First argument (file) should be a file object or have a path property!");
			filePath = file.path;
		}
		
		fillHistoryTable(filePath);
		
		return true;
	}
	
	function hideVersionHistory() {
		
		console.log("Hiding version history!");
		
		versionHistoryVisible = false;
		EDITOR.ctxMenu.hide();
		return versionHistoryWidget.hide();
	}
	
	function buildVersionHistoryWidget(widget) {
		
		historyTableBody = document.createElement("tbody");
		
		var div = document.createElement("div");
		div.setAttribute("class", "versionHistory");
		
		var historyTableHolder = document.createElement("div");
		historyTableHolder.setAttribute("style", "height: " + Math.round(EDITOR.height/2.5) + "px; overflow-y: scroll;");
		historyTableHolder.setAttribute("class", "tableHolder");
		
		var historyTable = document.createElement("table");
		historyTable.setAttribute("class", "versionHistory data");
		historyTable.setAttribute("border", "1");
		historyTable.setAttribute("cellpadding", "3");
		
		
		var thead = document.createElement("thead");
		
		var tr = document.createElement("tr");
		
		var th = document.createElement("th");
		th.innerText = "Rev";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Date";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Time";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Author";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		//th.setAttribute("style", "min-width: 35%");
		th.innerText = "Message";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.setAttribute("colspan", "2");
		th.innerText = "File(s)";
		tr.appendChild(th);
		
		thead.appendChild(tr);
		historyTable.appendChild(thead);
		
		historyTable.appendChild(historyTableBody);
		
		historyTableHolder.appendChild(historyTable);
		
		div.appendChild(historyTableHolder);
		
		/*
			todo: 
			
			var diffRev = document.createElement("button");
			diffRev.setAttribute("class", "button");
			diffRev.innerText = "Diff Rev.";
			diffRev.setAttribute("title", "Compare selected files in selected revision with the last revison for the file below selected revison.");
			diffRev.onclick = revDiffSelectedRev;
			div.appendChild(diffRev);
			
			var diffHead = document.createElement("button");
			diffHead.setAttribute("class", "button");
			diffHead.innerText = "Diff Current";
			diffHead.setAttribute("title", "Compare selected files in selected revison with latest (head)");
			div.appendChild(diffHead);
			
			var openRev = document.createElement("button");
			openRev.setAttribute("class", "button");
			openRev.setAttribute("title", "Open selected file in selected revision");
			openRev.innerText = "Open rev";
			div.appendChild(openRev);
			
			var openCurrent = document.createElement("button");
			openCurrent.setAttribute("class", "button");
			openCurrent.setAttribute("title", "Open the selected file (current version/head)");
			openCurrent.innerText = "Open current";
			div.appendChild(openCurrent);
			
			var revertSelected = document.createElement("button");
			revertSelected.setAttribute("class", "button");
			revertSelected.setAttribute("title", "Revert selected files to selected revision");
			revertSelected.innerText = "Revert selected";
			div.appendChild(revertSelected);
			
			var checkout = document.createElement("button");
			checkout.setAttribute("class", "button");
			checkout.setAttribute("title", "Move all files to selected revision");
			checkout.innerText = "Checkout";
			div.appendChild(checkout);
			
		*/
		
		var butCancel = document.createElement("button");
		butCancel.setAttribute("class", "button");
		butCancel.innerText = "Cancel history";
		butCancel.onclick = hideVersionHistory;
		div.appendChild(butCancel);
		
		var butDiff = document.createElement("button");
		butDiff.setAttribute("class", "half button");
		butDiff.innerText = "See Changes";
		butDiff.setAttribute("title", "Compare all changes in selected revision with the revison before it.");
		butDiff.onclick = function diffClick() {
			
			if(!selectedRev) return alertBox("No revision selected. (click on it)");
			
			var fileDirectory = figureOutDirectoryIfUndefined(rootDir);
			CLIENT.cmd("mercurial.diff", {directory: fileDirectory, changes: selectedRev.rev}, function hgDiff(err, resp) {
				
				if(err) return alertBox(err.message);
				
				var text = resp.text;
				var fileName = "rev" + selectedRev.rev + ".diff";
				EDITOR.openFile(fileName, text, function(err, file) {
					if(err) alertBox(err.message);
				});
			});
		};
		div.appendChild(butDiff);
		
		var butDiffFile = document.createElement("button");
		butDiffFile.setAttribute("class", "half button");
		butDiffFile.innerText = "See Changes to selected file(s)";
		butDiffFile.setAttribute("title", "Compare selected file(s) in selected revision with the revison before it.");
		butDiffFile.onclick = function diffFileClick() {
			if(!selectedRev) return alertBox("No revision selected. (click on it)");
			// rootDir is not included in filePaths
			var fileDirectory = figureOutDirectoryIfUndefined(rootDir);
			var fileSelEl = document.getElementById("rev_" + selectedRev.rev + "_file_sel");
			var filePaths = getSelects(fileSelEl);
			
			CLIENT.cmd("mercurial.diff", {directory: fileDirectory, changes: selectedRev.rev, files: filePaths}, function hgDiff(err, resp) {
				
				if(err) return alertBox(err.message);
				
				var text = resp.text;
				var fileName = "hg.diff";
				if(filePaths.length == 1) fileName = filePaths[0] + "-rev" + selectedRev.rev + ".diff";
				EDITOR.openFile(fileName, text, function(err, file) {
					if(err) alertBox(err.message);
				});
			});
		};
		div.appendChild(butDiffFile);
		
		
		var butCatFile = document.createElement("button");
		butCatFile.setAttribute("class", "button");
		butCatFile.innerText = "See file";
		butCatFile.setAttribute("title", "See the selected file at the selected revision.");
		butCatFile.onclick = function diffFileClick() {
			if(!selectedRev) return alertBox("No revision selected. (click on it)");
			var fileDirectory = figureOutDirectoryIfUndefined(rootDir);
			var fileSelEl = document.getElementById("rev_" + selectedRev.rev + "_file_sel");
			var filePaths = getSelects(fileSelEl);
			console.log("cat file:");
			
			console.log(selectedRev);
			console.log(fileSelEl);
			console.log(filePaths);
			if(filePaths.length != 1) return alertBox("Only one file can be selected!");
			var filePath = filePaths[0];
			CLIENT.cmd("mercurial.cat", {directory: fileDirectory, rev: selectedRev.rev, file: filePath}, function hgDiff(err, resp) {
				
				if(err) return alertBox(err.message);
				
				var text = resp.text;
				
				var ext = UTIL.getFileExtension(filePath);
				var name = UTIL.getFileNameWithoutExtension(filePath);
				var fileName = name + "-rev" + selectedRev.rev;
				if(ext.length > 0) fileName += "." + ext;
				EDITOR.openFile(fileName, text, function(err, file) {
					if(err) alertBox(err.message);
				});
			});
		};
		div.appendChild(butCatFile);
		
		return div;
		
	}
	
	function fillHistoryTable(filePath) {
		
		if(typeof filePath != "string" && filePath != undefined) throw new Error("fillHistoryTable: FIrst argument filePath should be a file path (string)");
		
		while(historyTableBody.firstChild) historyTableBody.removeChild(historyTableBody.firstChild); // Emty table
		
		if(EDITOR.currentFile && EDITOR.currentFile.savedAs) {
			var directory = UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
		}
		else {
			var directory = EDITOR.workingDirectory;
		}
		
		var options = {
			directory: directory
		}
		
		if(filePath) options.file = filePath;
		
		// todo: The log can be very long, have it paged (many pages, only show 100? at a time) Most of the time you are only interested in the latest's
		CLIENT.cmd("mercurial.log", options, function resolveList(err, resp) {
			if(err) throw err;
			
			var changes = resp.revisions;
			
			rootDir = resp.rootDir;
			
			//console.log("mercurial.log changes:");
			//console.log(changes);
			
			// They should already be in order. But just in case:
			changes.sort(function sortChanges(a, b) {
				return a.rev - b.rev; // Lowest rev first
			});
			
			if(filePath == undefined) {
			// sanity: Check for gaps, there should be no gaps
			for (var i=0; i<changes.length; i++) {
				if(changes[i].rev != i) throw new Error("changes[" + i + "].rev=" + changes[i].rev);
			}
			}
			
			var reEmail = /<(.*)>/;
			
			// Show the changes backwards so that latest gets on top
			for (var i=changes.length-1, tr, td, sel, opt, span, d, a, msg, matchEmail, email; i>-1; i--) {
				//if(changes[i] == undefined) throw new Error("changes[" + i + "]=" + changes[i]); // Give early error to ease debug
				
				tr = document.createElement("tr");
				tr.setAttribute("id", "rev" + changes[i].rev);
				
				td = document.createElement("td");
				td.innerText = changes[i].rev;
				tr.appendChild(td);
				
				d = new Date((changes[i].date[0] +  changes[i].date[1]) * 1000);
				
				// date
				td = document.createElement("td");
				//td.innerText = d.getDate() + " " + UTIL.monthName(d.getMonth()) + " " + d.getFullYear().toString().slice(-2); // d.toLocaleDateString();
				//td.innerText = d.toLocaleDateString();
				//td.innerText = UTIL.dayName(d.getDay()) + " " + UTIL.zeroPad(d.getFullYear().toString().slice(-2)) + "-" + UTIL.zeroPad(d.getMonth()+1) + "-" + UTIL.zeroPad(d.getDate());
				td.innerText = UTIL.dayName(d.getDay()) + " " + d.getDate() + " " + UTIL.monthName(d.getMonth()) + " -" + d.getFullYear().toString().slice(-2);
				tr.appendChild(td);
				
				// time
				td = document.createElement("td");
				td.innerText = UTIL.zeroPad(d.getHours()) + ":" + UTIL.zeroPad(d.getMinutes());  // d.toLocaleTimeString();
				tr.appendChild(td);
				
				// Author
				td = document.createElement("td");
				matchEmail = reEmail.exec(changes[i].user);
				if(matchEmail) {
					email = matchEmail[1];
					a = document.createElement("a");
					a.setAttribute("href", "mailto:" + email + "?subject=Rev " + changes[i].rev);
					a.setAttribute("target", "_blank"); // Prevent leaving the page
					a.innerText = changes[i].user.replace("<" + email + ">", "");
					td.appendChild(a);
				}
				else td.innerText = changes[i].user;
				tr.appendChild(td);
				
				// Message
				td = document.createElement("td");
				td.setAttribute("class", "text");
				td.innerText = changes[i].desc;
				tr.appendChild(td);
				
				td = document.createElement("td");
				td.innerText = changes[i].files && changes[i].files.length;
				tr.appendChild(td);
				
				td = document.createElement("td");
				if(changes[i].files) {
					sel = document.createElement("select");
					sel.setAttribute("id", "rev_" + changes[i].rev + "_file_sel");
					for (var j=0; j<changes[i].files.length; j++) {
						opt = document.createElement("option");
						opt.innerText = changes[i].files[j];
						sel.appendChild(opt);
					}
				} else console.warn("No files: " + changes[i]);
				td.appendChild(sel);
				tr.appendChild(td);
				
				tr.onclick = tableRowClick;
				
				historyTableBody.appendChild(tr);
				
			}
			
			//EDITOR.resizeNeeded();
			
			function tableRowClick(e) {
				var tr = e.target;
				while(tr.parentNode && tr.nodeName != "TR") tr = tr.parentNode;
				
				if(tr.nodeName != "TR") throw new Error("Unable to get which table row on the version history you clicked on");
				
				if(lastActiveHistoryTableRow) lastActiveHistoryTableRow.setAttribute("class", "");
				
				console.log("selectedRev:");
				console.log(tr);
				var rev = parseInt(tr.id.slice(3)); // remove rev from rev123
				console.log("rev=" + rev);
				
				
				for (var i=0; i<changes.length; i++) {
					if(changes[i].rev == rev) return selectRev( changes[i] );
				}
				
				throw new Error("Unable to find rev=" + rev + " in changes! tr.id=" + tr.id + " changes=" + JSON.stringify(changes, null, 2));
				
				
				function selectRev(changeSet) {
					selectedRev = changeSet;
					
					console.log(selectedRev);
					
					tr.setAttribute("class", "selected");
					
					lastActiveHistoryTableRow = tr;
				}
				
			};
		});
		
	}
	
	function revDiffSelectedRev() {
		// Show diff of selected rev
		alert(selectedRev.rev);
	}
	
	function mercurialDiff(directory, filePaths) {
		
		//console.log("directory=", directory + " typeof " + (typeof directory));
		//if(typeof directory == "object") directory = undefined; // Mouse event
		
		if(filePaths == undefined) filePaths = EDITOR.currentFile && [EDITOR.currentFile.path];
		if(directory == undefined) directory = EDITOR.workingDirectory;
		
		// filePaths will/can have the root dir removed
		
		if(typeof directory != "string") throw new Error("directory need to be a file path! directory=" + directory + " (not a string)");
		if(!filePaths instanceof Array) throw new Error("filePaths need to be a list (array) of file paths! filePaths=" + filePaths);
		
		CLIENT.cmd("mercurial.diff", {directory: directory, files: filePaths}, function hgDiff(err, resp) {
			
			if(err) return alertBox(err.message);
			
			var text = resp.text;
			var fileName = "hg.diff";
			if(filePaths.length == 1) fileName = filePaths[0] + ".diff";
			console.log("filePaths=" + filePaths);
			EDITOR.openFile(fileName, text, function(err, file) {
				if(err) alertBox(err.message);
			});
		});
		
	}
	
	function diffWorkingDirectory() {
		mercurialDiff(rootDir);
		return false;
	}
	
	function buildVersionControlWidget(widget) {
		
		var div = document.createElement("div");
		
		/*
			
			
			var labRev = document.createElement("button");
			labRev.setAttribute("for", "selRev");
			labRev.appendChild(document.createTextNode("Rev:"));
			
			var selRev = document.createElement("select");
		*/
		
		//var diff = document.createElement("fieldset");
		
		//var diffLegend = document.createElement("legend");
		//diffLegend.appendChild(document.createTextNode(" Diff "));
		//diff.appendChild(diffLegend);
		
		var diffCurrent = document.createElement("button");
		diffCurrent.appendChild(document.createTextNode("Diff"));
		diffCurrent.setAttribute("title", "Compare current working directory with parent revision");
		diffCurrent.setAttribute("class", "button half");
		diffCurrent.onclick = function() {
			mercurialDiff(rootDir, []);
		}
		div.appendChild(diffCurrent);
		
		var diffCurrentKey = document.createElement("span");
		diffCurrentKey.appendChild(document.createTextNode( EDITOR.getKeyFor(diffWorkingDirectory) ));
		diffCurrentKey.setAttribute("class", "key");
		diffCurrent.appendChild(diffCurrentKey);
		
		var diffFile = document.createElement("button");
		diffFile.appendChild(document.createTextNode("Diff file"));
		diffFile.setAttribute("title", "Compare currently open file with parent revision");
		diffFile.setAttribute("class", "button half");
		diffFile.onclick = function() {
			mercurialDiff(rootDir, [EDITOR.currentFile.path]);
		}
		div.appendChild(diffFile);
		
		//form.appendChild(diff);
		//div.appendChild(form);
		//div.appendChild(diff);
		
		var log = document.createElement("button");
		log.appendChild(document.createTextNode("Log"));
		log.setAttribute("title", "Show log/revision history");
		log.setAttribute("class", "button half");
		log.onclick = function() {
			showVersionHistory();
		}
		div.appendChild(log);
		
		var logFile = document.createElement("button");
		logFile.appendChild(document.createTextNode("File history"));
		logFile.setAttribute("title", "Show log/revision history for current file");
		logFile.setAttribute("class", "button");
		logFile.onclick = function() {
			showVersionHistory(EDITOR.currentFile);
		}
		div.appendChild(logFile);
		
		var annotations = document.createElement("button");
		annotations.appendChild(document.createTextNode("Annotations"));
		annotations.setAttribute("title", "Toggle annotations on/off");
		annotations.setAttribute("class", "button");
		annotations.onclick = function() {
			if(doAnnotate) annotateOff();
			else annotateOn();
		}
		div.appendChild(annotations);
		
		var commit = document.createElement("button");
		commit.appendChild(document.createTextNode("Commit"));
		commit.setAttribute("class", "button");
		commit.onclick = function() {
			//widget.hide();
			showCommitDialog();
		}
		div.appendChild(commit);
		
		var commitKey = document.createElement("span");
		commitKey.appendChild(document.createTextNode( EDITOR.getKeyFor(showCommitDialog) ));
		commitKey.setAttribute("class", "key");
		commit.appendChild(commitKey);
		
		var butPush = document.createElement("button");
		butPush.appendChild(document.createTextNode("Push"));
		butPush.setAttribute("title", "Upload local commits to remote repository");
		butPush.setAttribute("class", "button half");
		butPush.onclick = function() {
			mercurialPush(rootDir);
		}
		div.appendChild(butPush);
		
		var butPull = document.createElement("button");
		butPull.appendChild(document.createTextNode("Pull"));
		butPull.setAttribute("title", "Download changes from remote repository");
		butPull.setAttribute("class", "button half");
		butPull.onclick = function() {
			mercurialPullFromRepo(rootDir);
		}
		div.appendChild(butPull);
		
		var butPullAndUpdate = document.createElement("button");
		butPullAndUpdate.appendChild(document.createTextNode("Pull & Update"));
		butPullAndUpdate.setAttribute("title", "Download changes and update working directory to the latest head/revision");
		butPullAndUpdate.setAttribute("class", "button half");
		butPullAndUpdate.onclick = function() {
			mercurialPullAndUpdate(rootDir);
		}
		div.appendChild(butPullAndUpdate);
		
		var butUpdate = document.createElement("button");
		butUpdate.appendChild(document.createTextNode("Update"));
		butUpdate.setAttribute("class", "button half");
		butUpdate.onclick = function() {
			mercurialUpdate();
		}
		div.appendChild(butUpdate);
		
		var butCheckProblems = document.createElement("button");
		butCheckProblems.appendChild(document.createTextNode("Check for problems"));
		butCheckProblems.setAttribute("title", "Checks for unresolved files and multiple heads");
		butCheckProblems.setAttribute("class", "button half");
		butCheckProblems.onclick = function() {
			checkForUnresolved(rootDir, function(err, resp) {
				if(err) return alertBox(err.message);
				
				if(resp.heads && resp.heads.length == 1) {
					var fileDirectory = figureOutDirectoryIfUndefined(rootDir);
					CLIENT.cmd("mercurial.status", {directory: fileDirectory}, function hgstatus(err, status) {
						if(err) {
							alertBox(err.message);
						}
						else {
							
							console.log("mercurial.status : " + JSON.stringify(status));
							
							// "modified":[],"added":[],"removed":[],"missing":[],"untracked":
							
							if(status.modified.length > 0 || status.added.length > 0 || status.removed.length > 0) {
								var msg = "There are ";
								if(status.modified.length > 0) msg += status.modified.length + " modified ";
								if(status.added.length > 0) msg += status.added.length + " added ";
								if(status.removed.length > 0) msg += status.removed.length + " removed ";
								msg += "file(s) that need to be commited !";
								alertBox(msg);
								showCommitDialog();
							}
							
							if(status.missing.length > 0) {
								if(status.missing.length > 10) {
									var msg = "There are " + status.missing.length + " file(s) missing!";
									EDITOR.openFile("missingfiles.txt", "Files missing:\n" + status.missing.join("\n") + "\n");
								}
								else {
									var msg = "The following files are missing:\n" + status.missing.join("\n");
								}
								alertBox(msg);
							}
							
							if(status.untracked.length > 0) {
								if(status.untracked.length > 10) {
									var msg = "There are " + status.untracked.length + " untracked file(s).";
								}
								else {
									var msg = "The following files are not tracked:\n" + status.untracked.join("\n") + "\n";
								}
								msg += "You probably want to ignore them or add them to the repo."
								alertBox(msg);
							}
							
							if(status.missing.length == 0 && status.modified.length == 0 && status.added.length == 0 && 
							status.removed.length == 0 && status.untracked.length == 0) alertBox("Everything seems fine!");
							
							
						}
					});
					
					
				}
			});
		}
		div.appendChild(butCheckProblems);
		
		var butClone = document.createElement("button");
		butClone.appendChild(document.createTextNode("Clone a repo"));
		butClone.setAttribute("class", "button");
		butClone.onclick = function() {
			widget.hide();
			showCloneDialog();
		}
		div.appendChild(butClone);
		
		var cancel = document.createElement("button");
		cancel.appendChild(document.createTextNode("Cancel version control"));
		cancel.setAttribute("class", "button");
		cancel.onclick = function() {
			widget.hide();
		}
		div.appendChild(cancel);
		
		return div;
	}
	
	function toggleVersionControlWidget() {
		winMenuMercurial.hide();
		if(versionControlWidget && versionControlWidget.visible) hideVersionControlWidget();
		else showVersionControlWidget();
	}
	
	function showVersionControlWidget() {
		EDITOR.ctxMenu.hide();
		versionControlWidget.show();
		winMenuMercurial.activate();
		winMenuMercurial2.activate();
				discoveryBarImg.setAttribute("class", "active");
	}
	
	function hideVersionControlWidget() {
		EDITOR.ctxMenu.hide();
		versionControlWidget.hide();
		winMenuMercurial.deactivate();
		winMenuMercurial2.deactivate();
				discoveryBarImg.setAttribute("class", "");
	}
	
	function mercurialPullFromRepo(fileDirectory) {
		// Only pull. Do not update
		console.log("Mercurial: Pulling from remote repository ...");
		
		fileDirectory = figureOutDirectoryIfUndefined(fileDirectory);
		
		checkForUnresolved(fileDirectory, function(err) {
			
			if(err) return alertBox(err.message);
			
			CLIENT.cmd("mercurial.pull", {directory: fileDirectory}, pulledMaybe);
			
			function pulledMaybe(err, resp) {
				if(err) {
					
					var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
					var authFailed = err.message.match(/abort: authorization failed/);
					
					if(authNeeded) {
						var repoUrl = authNeeded[1];
						showAuthDialog("Need authorization for pulling changes from " + repoUrl + ": ", resp.directory, "Pull", function authorized(username, password, save) {
							if(username != null) CLIENT.cmd("mercurial.pull", {directory: fileDirectory, user: username, pw: password, save: save}, pulledMaybe);
						});
						return;
					}
					else if(authFailed) {
						alertBox("Authorization filed!\nUnable to Pull from " + repoUrl);
					}
					else throw err;
				}
				else {
					
					console.log("pull resp: " + JSON.stringify(resp, null, 2));
					
					var updatedFiles = resp.files;
					var repoUrl = resp.repo;
					var notSaved = [];
					var changedFiles = 0;
					
					if(repoUrl == undefined) throw new Error("repoUrl=" + undefined + " resp=" + JSON.stringify(resp, null, 2));
					
					//added 2 changesets with 1 changes to 1 files
					
					if(resp.changesets) {
						var msg = "Finished downloading " + resp.changesets + " changesets with " + resp.changes + 
						" changes to " + resp.fileCount + " files from " + repoUrl;
					}
					else if(resp.fileCount > 0) {
						var msg = updatedFiles.length + " files are ready to be updated (click update)";
					}
					else {
						var msg = "No new changes on " + repoUrl;
					}
					
					alertBox(msg);
				}
			}
		});
	}
	
	function mercurialPullAndUpdate(fileDirectory) {
		console.log("Mercurial: Pulling from remote repository ...");
		
		fileDirectory = figureOutDirectoryIfUndefined(fileDirectory);
		
		checkForUnresolved(fileDirectory, function(err) {
			
			if(err) return alertBox(err.message);
			
			CLIENT.cmd("mercurial.pull", {directory: fileDirectory}, hgPull);
			
			function hgPull(err, resp) {
				if(err) {
					
					var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
					var authFailed = err.message.match(/abort: authorization failed/);
					
					if(authNeeded) {
						var repoUrl = authNeeded[1];
						showAuthDialog("Need authorization for pulling changes from " + repoUrl + ": ", resp.directory, function authorized(username, password, save) {
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
					mercurialUpdate();
				}
			}
		});
	}
	
	
	function mercurialUpdate(fileDirectory, reloadFiles) {
		
		/*
			For files opened in the editor:
			if not saved but will be updated: ask
			if saved but not commited: ask
		*/
		
		console.log("Mercurial: Update");
		
		fileDirectory = figureOutDirectoryIfUndefined(fileDirectory);
		
		var reopenFiles = []; // Files closed during the update, but will be reopened afterwards
		
		checkForUnresolved(fileDirectory, function checkedForUnresolved(err) {
			if(err) throw err;
			
			// Check what revision we are on, and if we need to update
			CLIENT.cmd("mercurial.summary", {directory: fileDirectory}, function hgStatus(err, summary) {
				if(err) throw err;
				
				var currentRevision = parseInt(summary.parent.slice(0, summary.parent.indexOf(":")));
				
				if(isNaN(currentRevision)) throw new Error("summary=" + JSON.stringify(summary));
				
				if(summary.update == "(current)") return alertBox("Nothing to update!");
				
				// Check status of current revision to see if anything needs to be commited before updating
				CLIENT.cmd("mercurial.status", {directory: fileDirectory, rev: "."}, function hgStatus(err, current) {
					if(err) throw err;
					
					// Check status between current (.) revision and latested (tip) revision
					CLIENT.cmd("mercurial.status", {directory: fileDirectory, rev: ".:tip"}, function hgStatus(err, updated) {
						if(err) throw err;
						
						// We only care about the files opened in the editor of which will also be updated
						// either if it's not saved, or not commited
						
						var uncommited = current.modified.concat(current.added);
						var toBeUpdated = updated.modified.concat(updated.added).concat(updated.removed);
						
						checkOpenedFiles();
						
						function checkOpenedFiles() {
							var filePath;
							for(var path in EDITOR.files) {
								filePath = path.replace(rootDir, ""); // So they can be compared
								
								if(!EDITOR.files[path].isSaved && toBeUpdated.indexOf(filePath) != -1) {
									// File opened in the editor that is not saved.
									return askDiscard(EDITOR.files[path], "Discard unsaved changes to " + filePath + " ?");
								}
								else if(uncommited.indexOf(filePath) != -1 && toBeUpdated.indexOf(filePath) != -1) {
									// File opened in the editor has not been commited
									return askCommit(EDITOR.files[path], "Commit changes before updating ?\n" + filePath + "\nUncommited changes will be lost!");
								}
							}
							
							// It's safe to update
							doTheUpdate();
						}
						
						function askDiscard(file, msg) {
							// File is not saved
							var optDiscard = "Discard unsaved changes";
							var optAbort = "Abort the update";
							confirmBox(msg, [optDiscard, optAbort], function(answer) {
								if(answer == optDiscard) {
									reload(file, function(err) {
										if(err) throw err;
										checkOpenedFiles();
									});
								}
								else if(answer != optAbort) throw new Error("Unknown answer=" + answer);
								});
						}
						
function askCommit(file, msg) {
// File has not been commited
var optAbort = "Abort udpate";
var optCommit = "Commit";
var optRevert = "Revert uncommited changes";
var optMerge = "Merge uncommited changes to updated file"; // Default Mercurial behaviour

confirmBox(msg, [optAbort, optCommit, optRevert, optMerge], function(answer) {

if(answer == optCommit) {
								showCommitDialog();
}
								else if(answer == optRevert) {
CLIENT.cmd("mercurial.revert", {directory: fileDirectory, files: [file.path]}, function hgRevert(err, files) {
if(err) throw err;

									reload(file, function(err) {
										if(err) throw err;
										checkOpenedFiles();
									});
									});
								}
							else if(answer == optMerge) {
var doNotSwitchFile = true;
reopenFiles.push(file.path);
								EDITOR.closeFile(file.path, doNotSwitchFile);
checkOpenedFiles();
}
								else if(answer != optAbort) throw new Error("Unknown answer=" + answer);
								});
}
});
			});
		});

		function doTheUpdate() {
		
		CLIENT.cmd("mercurial.update", {directory: fileDirectory}, function hgUpdate(err, resp) {
					if(err) {
					
					if(err.message.indexOf("conflicts while merging") != -1) {
						checkForUnresolved(fileDirectory);
					}
					else throw err;
				}
					else {
						
						console.log("Mercurial: Update resp=" + JSON.stringify(resp));
						
				var files = resp.updated.concat(resp.merged).concat(resp.removed).concat(resp.unresolved);
				
					if(resp.unresolved > 0) alertBox("There are unresolved files ...");
					
					var filesToBeReloaded = 0;
var filesToBeReopened = 0;
				var filesReloaded = [];
				
						console.log("files that has been updated: " + JSON.stringify(files));
						
				for(var i=0; i<files.length; i++) {
						if(EDITOR.files.hasOwnProperty(files[i])) {
							filesToBeReloaded++;
							
							var file = EDITOR.files[files[i]];
							
							reload(file, reloaded);
							
						}
					}

						console.log("files to reopen: " + JSON.stringify(reopenFiles));
						
for (var i=0; i<reopenFiles.length; i++) {
EDITOR.openFile(reopenFiles[i], undefined, reopened);
}

					if(filesToBeReloaded == 0 && filesToBeReopened == 0) done();
					
				}
					
function reloaded(err, path) {
if(err) throw err;
filesReloaded.push(path);
filesToBeReloaded--;
if(filesToBeReloaded == 0 && filesToBeReopened == 0) done();
}

function reopened(err, path) {
if(err) throw err;
filesToBeReopened--;
if(filesToBeReloaded == 0 && filesToBeReopened == 0) done();
}

					function done() {
						
				var msg = resp.updated + " updated, " + resp.merged + " merged, " + resp.removed + " removed and " + resp.unresolved + " files unresolved.";
				
				if(filesReloaded.length > 0) msg += "\nFiles opened in the editor have been reloaded:\n" + filesReloaded.join("\n");
				
				alertBox(msg);
				
					}
					});
		}

function reload(file, callback) {
var filePath = file.path;
				console.log("Reloading " + filePath + " ...");
EDITOR.readFromDisk(filePath, function(err, path, text) {
if(err) throw err;
else {
file.reload(text);

file.saved(); // Because we reloaded from disk

if(callback) callback(null, filePath);
}
});
}
		});
	}
	
	function figureOutDirectoryIfUndefined(fileDirectory) {
		console.log("figureOutDirectoryIfUndefined: fileDirectory=" + fileDirectory + " rootDir=" + rootDir + " EDITOR.currentFile.path=" + EDITOR.currentFile.path + " EDITOR.workingDirectory=" + EDITOR.workingDirectory);
		if(fileDirectory != undefined) return fileDirectory;
		
		if(rootDir) fileDirectory = rootDir;
		else if(EDITOR.currentFile.savedAs) fileDirectory = UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
		else fileDirectory = EDITOR.workingDirectory;
		
		return fileDirectory;
	}
		
	function checkForUnresolved(fileDirectory, showAlert, callback) {
		
		if(typeof showAlert == "function") {
			callback = showAlert;
			showAlert = undefined;
		}
		
		if(showAlert == undefined) showAlert = true;
		
		// Also checks for multiple heads if all files are resolved!
		
		fileDirectory = figureOutDirectoryIfUndefined(fileDirectory);
		
		// 1. Check for unresolved files (hg resolve --list)
		CLIENT.cmd("mercurial.resolvelist", {directory: fileDirectory}, function resolveList(err, resp) {
			if(err) {
				if(callback) return callback(err);
				else throw err;
			}
			
			if(resp.resolved.length == 0 && resp.unresolved.length == 0) {
				checkForMultipleHeads(fileDirectory, callback);
			}
			else if(resp.unresolved.length > 0) {
				if(showAlert) alertBox("There are unresolved files! You have to edit the files manually. Then mark them as resolved.");
				showResolveDialog(resp.resolved, resp.unresolved, fileDirectory);
				//if(callback) callback(null, resp);
			}
			else {
				// All files are resolved
				// We might not need to commit though (for example if we reverted)
				CLIENT.cmd("mercurial.status", {directory: fileDirectory}, function hgstatus(err, status) {
if(err) return alertBox(err.message);

// "modified":[],"added":[],"removed":[],"missing":[],"untracked":

					if(status.modified.length == 0 && status.added.length == 0 && status.removed.length == 0 && status.missing.length == 0) {
						checkForMultipleHeads(fileDirectory, callback);
}
					else {
						if(showAlert) alertBox("All files are resolved. You need to commit!");
						showCommitDialog();
					}
				});
				
				
				//if(callback) callback(null, resp);
			}
		});
	}
	
	function checkForMultipleHeads(fileDirectory, callback) {
		
		fileDirectory = figureOutDirectoryIfUndefined(fileDirectory);
		
		CLIENT.cmd("mercurial.heads", {directory: fileDirectory}, function resolveList(err, resp) {
			if(err) throw err;
			
			if(resp.heads.length == 1) {
				if(callback) callback(null, resp);
				else alertBox("Local repo at " + fileDirectory + " does Not contain multiple heads!");
			}
			else {
				
				var merge = "Merge";
				var cancel = "Cancel";
				
				confirmBox("There are multiple heads:\n" + JSON.stringify(resp.heads, null, 2) + "\n\nDo you want to merge them ?", [merge, cancel], function(answer) {
					
					if(answer == merge) {
						CLIENT.cmd("mercurial.merge", {directory: fileDirectory}, function resolveList(err, resp) {
							if(err) {
								if(callback) return callback(err);
								else throw err;
							}
							
							if(resp.unresolved == 0) {
								alertBox("Merge successful! " + resp.updated + " files updated, " + resp.merged + " files merged, " + resp.removed + " files removed, " + resp.unresolved + " files unresolved.");
								if(callback) callback(null, resp);
							}
							else checkForUnresolved(fileDirectory, callback);
							
						});
					}
				});
			}
		});
	}
	
	function getSSHPublicKey() {
		
		EDITOR.getSSHPublicKey(function(err, pubkey) {
			if(err) return alertBox(err.message);
			EDITOR.putIntoClipboard(pubkey, function(err, manual) {
				if(err) throw err;
				console.log("Public key copied to clipboard!");
				if(!manual) alertBox("Public key copied to clipboard!");
			});
		});
		
		return false;
	}
	
	function getSelects(selEl) {
		// Returns an array of selected values from select element
		if(!selEl) throw new Error("selEl=" + selEl);
		var arr = [];
		var opt = selEl.options;
		for(var i=0, val; i<opt.length; i++) {
			if(opt[i].selected) {
				val = opt[i].value;
				if(arr.indexOf(val) == -1) arr.push(val);
					}
			}
		return arr;
		}
	
})();