
(function() {
	"use strict";
	
	var repoCommitDialog = EDITOR.createWidget(buildRepoCommitDialog);
	var repoCommitMenuItem;
	var fileSelect;
	var inputrootDir;
	var modified = [];
	var rootDir = null;
	var untracked = [];

	EDITOR.plugin({
		desc: "Commit changes in version control",
		load: loadrepoCommit,
		unload: unloadrepoCommit
	});
	
	
	function loadrepoCommit() {
		repoCommitMenuItem = EDITOR.addMenuItem("Commit", function() {
			showRepoCommitDialog();
			EDITOR.hideMenu();
		});
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide the commit widget", charCode: char_Esc, fun: hideRepoCommitDialog});
	}
	
	function unloadrepoCommit() {
		
		if(repoCommitMenuItem) EDITOR.removeMenuItem(repoCommitMenuItem);
		
		EDITOR.unbindKey(hideRepoCommitDialog);
	}
	
	function buildRepoCommitDialog(widget) {
		
		var div = document.createElement("div");

		var table = document.createElement("table"); // One table to rule them all!
		
		var tr = document.createElement("tr");
		var td = document.createElement("td");

		fileSelect = document.createElement("select");
		fileSelect.setAttribute("class", "file list");
		fileSelect.setAttribute("size", "5");
		fileSelect.setAttribute("title", "Select files");

		td = document.createElement("td");
		td.appendChild(fileSelect);
		tr.appendChild(td);


		var textarea = document.createElement("textarea");
		textarea.setAttribute("cols", "50");
		textarea.setAttribute("rows", "5");
		textarea.setAttribute("placeholder", "Comments ...");

		td = document.createElement("td");
		td.appendChild(textarea);
		tr.appendChild(td);


		td = document.createElement("td");
		// ### Commit button
		var commitButton = document.createElement("button");
		commitButton.setAttribute("class", "button");
		commitButton.appendChild(document.createTextNode("Commit changes"));
		commitButton.onclick = commit;
	
		td.appendChild(commitButton);

		var br = document.createElement("br");
		td.appendChild(br);

		// ### Commit & Push button
		var commitAndPushButton = document.createElement("button");
		commitAndPushButton.setAttribute("class", "button");
		commitAndPushButton.appendChild(document.createTextNode("Commit & Push"));
		commitAndPushButton.onclick = commitAndPush;

		td.appendChild(commitAndPushButton);

		tr.appendChild(td);
		

		table.appendChild(tr);
		
		div.appendChild(table);

		/*
		inputrootDir = document.createElement("input");
		inputrootDir.setAttribute("type", "hidden");
		div.appendChild(inputrootDir);
		*/

		return div;
		

		function commit(e, alsoPush) {

			if(alsoPush == undefined) alsoPush = false;

			var opt = {
				directory: rootDir,
				message: textarea.value,
				files: [],
			}

			var nonTracked = []; // Check if some of the files are untracked, and ask if we should add them
			var selectedFiles = fileSelect.options;
			for(var i=0, filePath; i<selectedFiles.length; i++) {
				filePath = selectedFiles[i].value;
				opt.files.push(filePath);
				if(untracked.indexOf(filePath) != -1) nonTracked.push(filePath);
			}

			if(nonTracked.length > 0) {
				var yes = "Yes, Add them";
				var no = "NO!";
				confirmBox("Add the following files to be tracked by Mercurial ?\n" + nonTracked.join("\n"), [no, yes], function(answer) {

					if(answer == no) return; // Do nothing ... Should we commit !?

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
					
					if(err) alertBox(err.message);
					else {
						
						if(alsoPush) {
							CLIENT.cmd("mercurial.push", {}, function commited(err, resp) {
								
								if(err) alertBox(err.message);
								else {
									
									alertBox("Successfully commited and pushed to " + resp.remote);
									hideRepoCommitDialog();
								
								};
							
							});

						}
						else {
							alertBox("Successfully commited! (don't forget to push)");
							hideRepoCommitDialog();
						}

					};
				
				});
			}
		}

		function commitAndPush(e) {
			commit(e, true);
		}

	}
	
	function updatefileSelect() {

		while(fileSelect.firstChild) fileSelect.removeChild(fileSelect.firstChild); // Emty file list

		var commandOptions = {
			directory: UTIL.getDirectoryFromPath(EDITOR.currentFile.path) || EDITOR.workingDir
		}

		CLIENT.cmd("mercurial.status", commandOptions, function cloned(err, resp) {
			
			if(err) return alertBox(err.message);
			
			modified = resp.modified;
			rootDir = resp.rootDir;
			untracked = resp.untracked;

			//inputrootDir.value = rootDir;

			if(modified.length == 0 && untracked.length == 0) {
				alertBox("No changes detected! (noo need to commit)");
				hideRepoCommitDialog();
			}
			
			for(var i=0; i<modified.length; i++) insertFile(modified[i], true);
			for(var i=0; i<untracked.length; i++) insertFile(untracked[i], false);

			console.log(resp);


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
	
	function showRepoCommitDialog() {
		repoCommitDialog.show();

		// Reset these values
		modified.length = 0;
		rootDir = null;
		untracked.length = 0;

		updatefileSelect();
		return false;
	}
	
	function hideRepoCommitDialog() {
		return repoCommitDialog.hide();
	}
	
	
})();