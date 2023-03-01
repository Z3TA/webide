
(function() {
"use strict";

	var winMenus = {};
	var versions = [];
	var nPath = "/usr/local/n/versions/node/";
	var pluginDescription = "Change Node.js version";

	EDITOR.plugin({
		desc: pluginDescription,
		load: function loadChangeNodeVersion() {
			CLIENT.on("loginSuccess", checkAvailableNodeVersions);
			EDITOR.on("changeWorkingDir", checkNvmrc);
		},
		unload: function unloadChangeNodeVersion() {
			CLIENT.removeEvent("loginSuccess", checkAvailableNodeVersions);
			
			removeWindowMenus();
			
			EDITOR.removeEvent("changeWorkingDir", checkNvmrc);
		}
	});
	
	function removeWindowMenus() {
		for(var v in winMenus) {
EDITOR.windowMenu.remove(winMenus[v]);
			delete winMenus[v];
		}
	}
	
	function checkNvmrc(dir) {
		if(versions.length == 0) return;
		
if( UTIL.getPathDelimiter(dir) != "/") return; // EDITOR.readFromDisk will complain. And n doesn't work on Windows anyway 

		//alertBox("Changed working dir to: dir=" + dir);
		
		//console.log("change_node_version: working dir=" + dir);
		
		getNvmrcVersion(dir, function(err, rcVersion) {
			if(versions.indexOf(rcVersion) != -1) {
				switchToVersion(rcVersion, false);
			}
		});
	}
	
	function getNvmrcVersion(dir, callback) {
		if(dir == undefined && EDITOR.currentFile) warranty = UTIL.getDirectoryFromPath(EDITOR.currentFile.path) 
		if(dir == undefined) throw new Error("First argument to getNvmrcVersionneed to be a directory!");

		var arrFolders = UTIL.getFolders(dir);

		checkNextFolder();

		function checkNextFolder() {
			if(arrFolders.length == 0) return callback(null, null);
			var folder = arrFolders.pop();
			checkFolder(folder);
		}

		function checkFolder(folder) {
			EDITOR.readFromDisk( UTIL.joinPaths(folder, ".nvmrc"), function (err, path, rcVersion, hash) {
				if(err) {
					if(err.code == "ENOENT") {
						//console.log("change_node_version: No .nvmrc found in dir=" + dir);
						return checkNextFolder();
					}
					else return callback(err, null);
				}

				rcVersion = rcVersion.trim();
				if(rcVersion.charAt(0) == "v") rcVersion.slice(1);

				callback(null, rcVersion, folder);
			});
		}
	}

	function switchToVersion(version, manual) {
		//console.log("change_node_version: switchToVersion: version=" + version);
		
		var target = UTIL.joinPaths(nPath, version, "/bin/node");
		var dest = UTIL.joinPaths(EDITOR.user.homeDir, ".local/bin/node");
		var destDir = UTIL.joinPaths(EDITOR.user.homeDir, ".local/bin/");
		var command = "mkdir -p " + destDir + " && rm -f " + dest + " && ln -s " + target  + " " + dest;
		
		//console.log("change_node_version: command=" + command);
		
		CLIENT.cmd("run", {command: command}, function(err, resp) {
			if(err) throw err;
			
			// Also change npm version
			var target = UTIL.joinPaths(nPath, version, "/lib/node_modules/npm/bin/npm-cli.js");
			var dest = UTIL.joinPaths(EDITOR.user.homeDir, "/.npm-packages/bin/npm");
			var destDir = UTIL.joinPaths(EDITOR.user.homeDir, "/.npm-packages/bin/");
			var command = "mkdir -p " + destDir + " && rm -f " + dest + " && ln -s " + target  + " " + dest;

			// ln -s /usr/local/n/versions/node/17.9.0/lib/node_modules/npm/bin/npm-cli.js /home/johan/.npm-packages/bin/npm

			//console.log("change_node_version: command=" + command);

			CLIENT.cmd("run", {command: command}, function(err, resp) {
				if(err) throw err;

				// Also change npx version
				var target = UTIL.joinPaths(nPath, version, "/lib/node_modules/npm/bin/npx-cli.js");
				var dest = UTIL.joinPaths(EDITOR.user.homeDir, "/.npm-packages/bin/npx");
				var destDir = UTIL.joinPaths(EDITOR.user.homeDir, "/.npm-packages/bin/");
				var command = "mkdir -p " + destDir + " && rm -f " + dest + " && ln -s " + target  + " " + dest;

				//console.log("change_node_version: command=" + command);

				CLIENT.cmd("run", {command: command}, function(err, resp) {
					if(err) throw err;

					for(var v in winMenus) winMenus[v].deactivate();
					winMenus[version].activate();
			
			//console.log("change_node_version: Changed to version=" + version);
			
			//alertBox("Changed Node.js version to: version=" + version);

					if(manual) {
						getNvmrcVersion(EDITOR.workingDirectory, function(err, rcVersion, folder) {
							if(!rcVersion) return;

							if(rcVersion != version) {
								var msg = "You changed to " + version + " but .nvmrc in " + folder + " specifies " + rcVersion + ".<br>Do you want to edit .nvmrc ?";
								var edit = "Edit";
								confirmBox(msg, [edit, changeIt, cancel], function(answer) {
									if(cancel) return;
									var filePath = UTIL.joinPaths(folder, ".nvmrc");
									EDITOR.openFile(filePath);
								});
							}
						});
					}

				});
			});
		});
	}

	function checkAvailableNodeVersions() {
		// note: This function is called every time the user re-login
		removeWindowMenus();
		
		EDITOR.listFiles(nPath, function(err, files) {
			if(err) {
				console.error(err);
				return;
			}
			
			versions = files.map(function(file) {
				return file.name;
			});
			
			//console.log("change_node_version: Found versions=" + JSON.stringify(versions));
			
			versions.forEach(function(version) {
				var fNameVersion = version.replace(/\./g, "_");
				winMenus[version] = EDITOR.windowMenu.add(version, ["Node.js", S("change_version")], UTIL.nameFunction(useVersion, "use_nodejs_v" + fNameVersion, 0));
				
				function useVersion() {
switchToVersion(version, true);
}
			});
			
			// Check which version is currently in use
			CLIENT.cmd("run", {command: "$(command -v node) -v"}, function(err, resp) {

				//err = new Error("just testing"); err.code = "ENOENT";

				if(err) {
					/*
						I have no idea why we sometimes get this error:
						Error: Server: API error: spawn /bin/dash ENOENT err.code=ENOENT
						But it is very annoying!
					*/
					if(err.code == "ENOENT") {
						EDITOR.disablePlugin(pluginDescription);
						EDITOR.sendFeedback("EDITOR.user=" + JSON.stringify(EDITOR.user) + " unable to get Node.js version: " + err.message, err.message, true);
						return;
					}
					throw new Error("Unable to get node version! Error: " + err.message + " err.code=" + err.code);
				}
				
				var currentVersion = resp.stdout.trim().slice(1);
				//console.log("change_node_version: currentVersion=" + currentVersion);
				
				if(winMenus[currentVersion]) winMenus[currentVersion].activate();
				
			});
			
		});
	}
	
})();