
/*
	Open a github repo quickly by appending 2s behind github. eg. github2s.com inspired by github1s.com

	github2s.com should redirect to DOMAIN and append /github/
	ex: https://github2s.com/Z3TA/dbo >  https://webide.se/github/Z3TA/dbo

	which will then redirect to https://webide.se?github=/Z3TA/dbo

	webide-dev.se?github=/Z3TA/dbo/blob/master/dbo.js

	webide-dev.se/github/Z3TA/dbo/blob/master/dbo.js

*/

(function() {
	"use strict";

	EDITOR.plugin({
		order: 3000, // Run after reopen_files.js so that the file opened will get focus
		desc: "Open a github repo quickly by appending 2s behind github",
		load: function loadGithub2s() {
			CLIENT.on("loginSuccess", openGithubRepoMaybe);
		},
		unload: function unloadGithub2s() {
			CLIENT.removeEvent("loginSuccess", openGithubRepoMaybe);
		}
	});

	function openGithubRepoMaybe() {
		var str = QUERY_STRING.github;

		if(!str) return ALLOW_DEFAULT;

		var dirs = str.split("/");

		if(dirs[0] == "") dirs.shift();

		console.log("github2s: dirs=" + JSON.stringify(dirs));

		var repoName = dirs[1];
		var folder = EDITOR.user.homeDir + "repo/" + repoName;

		var matchGithubFile = str.match(/\/(.*)\/(.*)\/blob\/([^/]*)\/(.*)\.git/);
		var matchGithubBranch = str.match(/\/(.*)\/(.*)\/tree\/([^/]*)\.git/);

		console.log("github2s: matchGithubFile=", matchGithubFile);
		console.log("github2s: matchGithubBranch=", matchGithubBranch);

		if(matchGithubFile) {
			var repo = "https://github.com/" + matchGithubFile[1] +  "/" + matchGithubFile[2] +  ".git";
			var _commitId = matchGithubFile[3];
			var _showFile = matchGithubFile[4];
		}
		else if(matchGithubBranch) {
			var repo = "https://github.com/" + matchGithubFile[1] +  "/" + matchGithubFile[2] +  ".git";
			var _commitId = matchGithubFile[3];
		}
		
		// Show the files in file explorer
		EDITOR.fileExplorer(folder);

		if(_commitId) {
			CLIENT.cmd("git.checkout", {directory: folder, rev: _commitId}, function cloned(err, resp) {
				if(err) alertBox("Failed to checkout " + _commitId + ". Error: " + err.message);

				console.log("github2s: git.checkout: _commitId=" + _commitId + " resp=" + JSON.stringify(resp, null, 2));

				if(_showFile) showFile(_showFile);
				else findReadme();
			});
		}
		else if(_showFile) {
			showFile(_showFile);
		}
		else {
			findReadme();
		}


		function showFile(filePathInRepo) {
			console.log("github2s: showFile: " + filePathInRepo);
			EDITOR.openFile( UTIL.joinPaths(folder, filePathInRepo), undefined, undefined, function(err) {
				if(err) {
					console.log("github2s: open file error: " + err.message);
					findReadme();
				}
				else {
					EDITOR.dashboard.hide();
				}
			});
		}

		function findReadme() {
			// Show readme if one exist ...
			console.log("github2s: findReadme!");
			EDITOR.listFiles(folder, function(err, files) {
				if(err) {
					console.error(err);
					return alertBox(err.message);
				}

				for(var i=0; i<files.length; i++) {
					if( files[i].type == "-" && files[i].name.match(/readme/i) ) {
						EDITOR.openFile(files[i].path);
						EDITOR.dashboard.hide();
						return;
					}
				}

				// No readme found

				console.log("github2s: no README file found in files=" + JSON.stringify(files));

			});
		}

	}

})();
