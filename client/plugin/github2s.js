
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

		/*

			Check if the repo is public
			If it's not public it means the clone failed...

		*/
		
		var dirs = str.split("/");

		if(dirs[0] == "") dirs.shift();

		//console.log("github2s: dirs=" + JSON.stringify(dirs));

		var repoName = dirs[1];
		var folder = EDITOR.user.homeDir + "repo/" + repoName;

		var matchGithubFile = str.match(/(.*)\/(.*)\/blob\/([^/]*)\/(.*)/);
		var matchGithubBranch = str.match(/(.*)\/(.*)\/tree\/([^/]*)/);
		var matchGithubWiki = str.match(/(.*)\/(.*)\/wiki\/(.*)/);

		//console.log("github2s: matchGithubFile=", matchGithubFile);
		//console.log("github2s: matchGithubBranch=", matchGithubBranch);

		if(matchGithubFile) {
			var repo = "https://github.com/" + matchGithubFile[1] +  "/" + matchGithubFile[2] +  ".git";
			var _commitId = matchGithubFile[3];
			var _showFile = matchGithubFile[4];
		}
		else if(matchGithubBranch) {
			var repo = "https://github.com/" + matchGithubBranch[1] +  "/" + matchGithubBranch[2] +  ".git";
			var _commitId = matchGithubBranch[3];
		}
		else if(matchGithubWiki) {
			var _showFile = matchGithubWiki[3];
		}
		
		//console.log("github2s: matchGithubWiki=" + matchGithubWiki + " _showFile=" + _showFile);

		

		var abort = false;

		CLIENT.cmd("httpGet", {url: "https://github.com/" + str, method:"HEAD"}, function(err, resp) {
			if(err) throw err;

			var statusCode = resp.status;

			if(statusCode == 404) {
				// The repo is either private or it doesn't exist

				abort = true;




			}
			else if(statusCode == 200) {

				if(_commitId && _commitId != "HEAD") {
					CLIENT.cmd("git.checkout", {directory: folder, rev: _commitId}, function cloned(err, resp) {
						if(abort) return;
						if(err) alertBox("Failed to checkout " + _commitId + ". Error: " + err.message);

						//console.log("github2s: git.checkout: _commitId=" + _commitId + " resp=" + JSON.stringify(resp, null, 2));

						if(_showFile) showFile(_showFile);
						else findReadme();
					
						EDITOR.fileExplorer(folder);

					});
				}
				else {
					EDITOR.fileExplorer(folder);
				}

			}
		});

		if(_commitId && _commitId != "HEAD") {
			// Waiting to see if the repo is public...
		}
		else if(_showFile) {
			showFile(_showFile);
		}
		else {
			findReadme();
		}


		function showFile(filePathInRepo) {
			//console.log("github2s: showFile: " + filePathInRepo);

			var fileExt = UTIL.getFileExtension(filePathInRepo);
			if(fileExt == "") filePathInRepo = filePathInRepo + ".md"; // Assume it's a markdown file if file extension is missing

			EDITOR.openFile( UTIL.joinPaths(folder, filePathInRepo), undefined, {show: true}, function(err) {
				if(abort) return;
				if(err) {
					//console.log("github2s: open file error: " + err.message);
					findReadme();
				}
				else {
					EDITOR.dashboard.hide();
				}
			});
		}

		function findReadme(retry) {
			if(abort) return;

			if(retry == undefined) retry = 0;
			var maxRetry = 10;

			// Show readme if one exist ...
			//console.log("github2s: findReadme! folder=" + folder + " retry=" + retry);
			EDITOR.listFiles(folder, function(err, files) {
				if(abort) return;

				if(err) {

					if(err.code == "ENOENT") {
						// It might take a while to clone...
						if(retry < maxRetry) return setTimeout(function() {
							if(abort) return;
							findReadme(++retry);
						}, 1000);
					}

					EDITOR.sendFeedback("Unable to read folder=" + folder + " after retry=" + retry, "github2s", true);

					console.error(err);
					return alertBox(err.message);
				}

				if(retry > 0) {
					// The folder is not listed because the file explored opened before it existed... so re-open the file explorer
					EDITOR.fileExplorer(folder);
				}

				for(var i=0; i<files.length; i++) {
					if( files[i].type == "-" && files[i].name.match(/readme/i) ) {
						EDITOR.openFile(files[i].path);
						EDITOR.dashboard.hide();
						return;
					}
				}

				// No readme found

				//console.log("github2s: no README file found in files=" + JSON.stringify(files));

			});
		}

	}

})();
