
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
		
		var div = document.createElement("div");
		
		
		fileList = document.createElement("ul");

		div.appendChild(fileList);


		var comment = document.createElement("textarea");
		comment.setAttribute("col", "20");
		comment.setAttribute("row", "5");

		div.appendChild(comment);


		// ### Commit button
		var commitButton = document.createElement("button");
		commitButton.setAttribute("class", "button");
		commitButton.setAttribute("value", "Commit changes");
		commitButton.onclick = commit;
		div.appendChild(commitButton);
		
		
		return div;
		
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

		var commandOptions = {
			directory: UTIL.getDirectoryFromPath(EDITOR.currentFile.path) || EDITOR.workingDir
		}

		CLIENT.cmd("mercurial.status", commandOptions, function cloned(err, resp) {
			
			if(err) alertBox(err.message);
			else {
				
				console.log(resp);

			
			};
		
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