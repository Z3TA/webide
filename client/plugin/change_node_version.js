
(function() {
"use strict";

	var winMenus = {};
	var versions = [];
	var nPath = "/usr/local/n/versions/node/";
	
	EDITOR.plugin({
		desc: "Change Node.js version",
		load: function loadChangeNodeVersion() {
			CLIENT.on("loginSuccess", checkNodeVersions);
			EDITOR.on("changeWorkingDir", checkNvmrc);
		},
		unload: function unloadChangeNodeVersion() {
			CLIENT.removeEvent("loginSuccess", checkNodeVersions);
			
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
		
		EDITOR.readFromDisk( UTIL.joinPaths(dir, ".nvmrc"), function (err, path, rcVersion, hash) {
			if(err) {
if(err.code == "ENOENT") {
					//console.log("change_node_version: No .nvmrc found in dir=" + dir);
					return;
				}
				else throw err;
			}

			rcVersion = rcVersion.trim();
			if(rcVersion.charAt(0) == "v") rcVersion.slice(1);
			
			//console.log("change_node_version: rcVersion=" + rcVersion);
			
if(versions.indexOf(rcVersion) != -1) {
				switchToVersion(rcVersion);
			}
});
	}
	
	function switchToVersion(version) {
		//console.log("change_node_version: switchToVersion: version=" + version);
		
		var target = UTIL.joinPaths(nPath, version, "/bin/node");
		var dest = UTIL.joinPaths(EDITOR.user.homeDir, ".local/bin/node");
		var destDir = UTIL.joinPaths(EDITOR.user.homeDir, ".local/bin/");
		var command = "mkdir -p " + destDir + " && rm -f " + dest + " && ln -s " + target  + " " + dest;
		
		//console.log("change_node_version: command=" + command);
		
		CLIENT.cmd("run", {command: command}, function(err, resp) {
			if(err) throw err;
			
			for(var v in winMenus) winMenus[v].deactivate();
			
			winMenus[version].activate();
			
			//console.log("change_node_version: Changed to version=" + version);
			
			//alertBox("Changed Node.js version to: version=" + version);
		});
	}

	function checkNodeVersions() {
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
				winMenus[version] = EDITOR.windowMenu.add(version, ["Node.js", S("change_version")], UTIL.nameFunction(useVersion, "use_nodejs_v" + version));
				
				function useVersion() {
switchToVersion(version);
}
			});
			
			// Check which version is currently in use
			CLIENT.cmd("run", {command: "$(command -v node) -v"}, function(err, resp) {
				if(err) throw new Error("Unable to get node version! Error: " + err.message + " err.code=" + err.code);
				
				var currentVersion = resp.stdout.trim().slice(1);
				//console.log("change_node_version: currentVersion=" + currentVersion);
				
				if(winMenus[currentVersion]) winMenus[currentVersion].activate();
				
			});
			
		});
	}
	
})();