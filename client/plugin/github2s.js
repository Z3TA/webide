
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

	var githubLogin;
	
	EDITOR.plugin({
		order: 3000, // Run after reopen_files.js so that the file opened will get focus
		desc: "Open a github repo quickly by appending 2s behind github",
		load: function loadGithub2s() {
			CLIENT.on("loginSuccess", openGithubRepoMaybe);

		},
		unload: function unloadGithub2s() {
			CLIENT.removeEvent("loginSuccess", openGithubRepoMaybe);

			if(githubLogin) githubLogin.unload();

		}
	});


	function openGithubRepoMaybe() {
		console.log("github2s: openGithubRepoMaybe!");

		var str = QUERY_STRING.github;

		if(!str) return ALLOW_DEFAULT;

		CLIENT.removeEvent("loginSuccess", openGithubRepoMaybe); // Don't re-run aftert logout/re-login (disconnect)

		/*

			Check if the repo is public
			If it's not public it means the clone failed...

		*/
		
		var dirs = str.split("/");

		if(dirs[0] == "") dirs.shift();

		console.log("github2s: dirs=" + JSON.stringify(dirs));

		var githubUrl = "https://github.com/" + str;

		var repoName = dirs[1];
		var userRepoContentFolder = EDITOR.user.homeDir + "repo/" + repoName;

		var matchGithubFile = str.match(/(.*)\/(.*)\/blob\/([^/]*)\/(.*)/);
		var matchGithubBranch = str.match(/(.*)\/(.*)\/tree\/([^/]*)/);
		var matchGithubWiki = str.match(/(.*)\/(.*)\/wiki\/(.*)/);

		console.log("github2s: matchGithubFile=", matchGithubFile);
		console.log("github2s: matchGithubBranch=", matchGithubBranch);

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
			var repo = "https://github.com/" + matchGithubWiki[1] + "/" + matchGithubWiki[2] + ".wiki.git";
			var _showFile = matchGithubWiki[3];
		}
		
		if(repo == undefined) {
			var repo = "https://github.com/" + dirs[0] + "/" + dirs[1] + ".git";
		}
		
		console.log("github2s: matchGithubWiki=" + matchGithubWiki + " _showFile=" + _showFile);

		var userRepoDir = UTIL.joinPaths(EDITOR.user.homeDir, "repo/");

		var cloneTimeout = 3600 * 1000; // one hour

		// note: userRepoContentFolder might exist, and the repo is private (it was cloned somtime before)
		EDITOR.folderExist(userRepoContentFolder, function(err, path) {
			if(err) throw err;

			if(path) return gotRepoHopefully();

			// user might have configured ssh key, so try cloning, and only ask for credentials if cloning fails
			var sshRepo = "git@github.com:" + dirs.join("/") + ".git";

			console.log("github2s: Attempting to clone sshRepo=" + sshRepo + " ...");

			EDITOR.createPath(userRepoDir, function(err) {
				if(err) throw err;

				CLIENT.cmd("git.clone", {repo: sshRepo, directory: userRepoDir}, cloneTimeout, function(err) {
					if(err) {
						if(err.message.indexOf("Permission denied") != -1) {

							githubLogin = EDITOR.createWidget(buildGithubLogin);
							githubLogin.show();

						}
						else alertBox("Cloning failed! Error: " + err.message);

						return;
					}

					gotRepoHopefully();
				});
			});
		});

		function gotRepoHopefully() {
			if(_commitId && _commitId != "HEAD") {
				CLIENT.cmd("git.checkout", {directory: userRepoContentFolder, rev: _commitId}, function cloned(err, resp) {
					if(err) alertBox("Failed to checkout " + _commitId + ". Error: " + err.message);

					//console.log("github2s: git.checkout: _commitId=" + _commitId + " resp=" + JSON.stringify(resp, null, 2));

					if(_showFile) showFile(_showFile);
					else findReadme();

					EDITOR.fileExplorer(userRepoContentFolder);

				});
			}
			else {
				EDITOR.fileExplorer(userRepoContentFolder);

				if(_showFile) {
					showFile(_showFile);
				}
				else {
					findReadme();
				}

			}
		}

		function showFile(filePathInRepo) {
			//console.log("github2s: showFile: " + filePathInRepo);

			var fileExt = UTIL.getFileExtension(filePathInRepo);
			if(fileExt == "") filePathInRepo = filePathInRepo + ".md"; // Assume it's a markdown file if file extension is missing

			EDITOR.openFile( UTIL.joinPaths(userRepoContentFolder, filePathInRepo), undefined, {show: true}, function(err) {
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
			if(retry == undefined) retry = 0;
			var maxRetry = 10;

			// Show readme if one exist ...
			//console.log("github2s: findReadme! userRepoContentFolder=" + userRepoContentFolder + " retry=" + retry);
			EDITOR.listFiles(userRepoContentFolder, function(err, files) {
				if(err) {
					if(err.code == "ENOENT") {
						// It might take a while to clone...
						if(retry < maxRetry) return setTimeout(function() {
							findReadme(++retry);
						}, 1000);
					}

					EDITOR.sendFeedback("Unable to read userRepoContentFolder=" + userRepoContentFolder + " after retry=" + retry, "github2s", true);

					console.error(err);
					return alertBox(err.message);
				}

				if(retry > 0) {
					// The userRepoContentFolder is not listed because the file explorer opened before the folder existed... so re-open the file explorer
					EDITOR.fileExplorer(userRepoContentFolder);
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

		function buildGithubLogin(widget) {
			var wrap = document.createElement("div");

			var text = document.createElement("p");
			var repoLink = document.createElement("a");
			repoLink.setAttribute("href", githubUrl);
			repoLink.appendChild( document.createTextNode(repo) )

			text.appendChild( document.createTextNode("Authorization needed to access private repository: ") );
			text.appendChild( repoLink );
			
			var login = document.createElement("input");
			login.setAttribute("type", "text");
			login.setAttribute("id", "githubUsername");

			var loginLabel = document.createElement("label")
			loginLabel.setAttribute("for", "githubUsername");
			loginLabel.appendChild( document.createTextNode("Github username:") );
			loginLabel.appendChild(login);

			var pw = document.createElement("input")
			pw.setAttribute("type", "password");
			pw.setAttribute("id", "githubPw");

			var pwLabel = document.createElement("label");
			pwLabel.setAttribute("for", "githubPw");
			pwLabel.appendChild( document.createTextNode("Password or access token:") );
			pwLabel.appendChild(pw);

			var cloneButton = document.createElement("button");
			cloneButton.classList.add("button");
			cloneButton.appendChild( document.createTextNode("Clone repo") );
			cloneButton.setAttribute("title", "Clone " + repo);
			cloneButton.onclick = function cloneButtonClick() {

				cloneButton.disabled = true;

				var cloneOptions = {
					repo: repo,
					username: login.value,
					password: pw.value,
					directory: userRepoDir
				};

				CLIENT.cmd("git.clone", cloneOptions, cloneTimeout, function(err) {
					if(err) {
						alertBox("Cloning failed! Error: " + err.message);
						cloneButton.disabled = false;

						return;
					}

					widget.hide();
					gotRepoHopefully();
				});
			};

			var copyPubKey = document.createElement("button");
			copyPubKey.appendChild( document.createTextNode("Copy public ssh key") );
			copyPubKey.classList.add("button");
			copyPubKey.onclick = function() {
				EDITOR.readFromDisk(UTIL.joinPaths(EDITOR.user.homeDir, ".ssh", "id_rsa.pub"), function(err, path, pubKey) {
					if(err) throw err;
					EDITOR.putIntoClipboard(pubKey, 'Public SSH key to add to <a href="https://github.com/settings/keys">settings/keys</a>');
				});
			}

			var cancel = document.createElement("button")
			cancel.classList.add("button");
			cancel.appendChild( document.createTextNode("cancel") );
			cancel.onclick = function() {
				widget.hide();
			}

			wrap.appendChild(text);
			wrap.appendChild(loginLabel);
			wrap.appendChild(pwLabel);
			wrap.appendChild(cloneButton);
			wrap.appendChild(copyPubKey);
			wrap.appendChild(cancel);

			return wrap;
		}

	}

})();
