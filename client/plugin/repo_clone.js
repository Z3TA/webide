
(function() {
	"use strict";
	
	var repoCloneDialog = EDITOR.createWidget(buildRepoCloneDialog);
	var repoCloneMenuItem;
	
	var userValue = "demo";
	var pwValue = "demo";
	
	EDITOR.plugin({
		desc: "Clone a repository",
		load: loadRepoClone,
		unload: unloadRepoClone
		});
	
	
	function loadRepoClone() {
		repoCloneMenuItem = EDITOR.addMenuItem("Clone/add Repo ...", function() {
			showRepoCloneDialog();
			EDITOR.hideMenu();
		});
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide the login widget", charCode: char_Esc, fun: hideRepoCloneDialog});
	}
	
	function unloadRepoClone() {
		
		if(repoCloneMenuItem) EDITOR.removeMenuItem(repoCloneMenuItem);
		
		EDITOR.unbindKey(hideRepoCloneDialog);
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
	
	
})();