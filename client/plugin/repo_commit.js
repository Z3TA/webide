
(function() {
	"use strict";
	
	var repoCommitDialog = EDITOR.createWidget(buildRepoCommitDialog);
	var repoCommitMenuItem;
	var fileList;

	EDITOR.plugin({
		desc: "Commit changes in version control",
		load: loadrepoCommit,
		unload: unloadrepoCommit
	});
	
	
	function loadrepoCommit() {
		repoCommitMenuItem = EDITOR.addMenuItem("Commit", function() {
			showrepoCommitDialog();
			EDITOR.hideMenu();
		});
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide the commit widget", charCode: char_Esc, fun: hiderepoCommitDialog});
	}
	
	function unloadrepoCommit() {
		
		if(repoCommitMenuItem) EDITOR.removeMenuItem(repoCommitMenuItem);
		
		EDITOR.unbindKey(hiderepoCommitDialog);
	}
	
	function buildRepoCommitDialog(widget) {
		
		var table = document.createElement("table"); // One table to rule them all!
		
		var tr = document.createElement("tr");
		var td = document.createElement("td");

		fileList = document.createElement("ul");
		fileList.setAttribute("class", "fileList");

		td = document.createElement("td");
		td.appendChild(fileList);
		tr.appendChild(td);


		var comment = document.createElement("textarea");
		comment.setAttribute("cols", "20");
		comment.setAttribute("rows", "5");

		td = document.createElement("td");
		td.appendChild(comment);
		tr.appendChild(td);


		// ### Commit button
		var commitButton = document.createElement("button");
		commitButton.setAttribute("class", "button");
		commitButton.appendChild(document.createTextNode("Commit changes"));
		commitButton.onclick = commit;

		td = document.createElement("td");
		td.appendChild(commitButton);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		return table;
		
		function commit(e) {
			
			var command = "mercurial.commit";
			
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
					
					// Changes commited, push to remote ?

				
				};
			
			});
		

		}
	}
	
	function updateFileList() {

		while(fileList.firstChild) fileList.removeChild(fileList.firstChild); // Emty file list

		var commandOptions = {
			directory: UTIL.getDirectoryFromPath(EDITOR.currentFile.path) || EDITOR.workingDir
		}

		CLIENT.cmd("mercurial.status", commandOptions, function cloned(err, resp) {
			
			if(err) alertBox(err.message);
			else {
				
				var modified = resp.modified;
				var rootDir = resp.rootDir;
				var untracked = resp.untracked;

				for(var i=0; i<modified.length; i++) add(modified[i], true);
				for(var i=0; i<untracked.length; i++) add(untracked[i], false);

				console.log(resp);
			
			};

			function add(filePath, checked) {
				var fullPath = rootDir + filePath;
				var li = document.createElement("li");
				var checkbox = document.createElement("input");
				checkbox.setAttribute("type", "checkbox");
				checkbox.setAttribute("id", "checkbox_" + fullPath);

				li.appendChild(checkbox);
				li.appendChild(document.createTextNode(filePath));

				fileList.appendChild(li);
			}

		
		});


	}
	
	function showrepoCommitDialog() {
		repoCommitDialog.show();
		updateFileList();
		return false;
	}
	
	function hiderepoCommitDialog() {
		return repoCommitDialog.hide();
	}
	
	
})();