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
		
	}
	
	function unloadMercurial() {
		
		if(repoCommitMenuItem) EDITOR.removeMenuItem(repoCommitMenuItem);
		EDITOR.unbindKey(hideRepoCommitDialog);
		
		if(repoCloneMenuItem) EDITOR.removeMenuItem(repoCloneMenuItem);
		EDITOR.unbindKey(hideRepoCloneDialog);
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
			commit(e, true);
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
	
	function hgStatus(callback) {
		
		if(!callback) throw new Error("No callback function!");
		
		var commandOptions = {
			directory: UTIL.getDirectoryFromPath(EDITOR.currentFile.path) || EDITOR.workingDir
		}

		CLIENT.cmd("mercurial.status", commandOptions, function hgstatus(err, resp) {
			if(err) {
				if(callback) return callback(err);
				else throw err;
			}
			else {
				modified = resp.modified;
				rootDir = resp.rootDir;
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
	
	
})();