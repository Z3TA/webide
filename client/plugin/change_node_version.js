
(function() {
"use strict";

var markdownParser = "plugin/markdown_preview/showdown.js";
var markdownParserLoaded = false;
var fileChangeListenerLoaded = false;

var filesInPreview = {};

EDITOR.plugin({
desc: "Change Node.js version",
load: function loadChangeNodeVersion() {
			CLIENT.on("loginSuccess", checkNodeVersions);

},
unload: function unloadChangeNodeVersion() {
			CLIENT.removeEvent("loginSuccess", checkNodeVersions);
			
}
});

	function checkNodeVersions() {
		
		var nPath = "/usr/local/n/versions/node/";
		
		EDITOR.listFiles(nPath, function(err, files) {
			if(err) {
				console.error(err);
				return;
			}
			
			var versions = files.map(function(file) {
				return file.name;
			});
			
			var winMenus = {};
			
			versions.forEach(function(version) {
				winMenus[version] = EDITOR.windowMenu.add(version, ["Node.js", S("change_version")], UTIL.nameFunction(useVersion, "use_nodejs_v" + version));
				
				function useVersion() {
					
					var target = UTIL.joinPaths(nPath, version, "/bin/node");
					var dest = UTIL.joinPaths(EDITOR.user.homeDir, ".local/bin/node");
					var destDir = UTIL.joinPaths(EDITOR.user.homeDir, ".local/bin/");
					var command = "mkdir -p " + destDir + " && rm -f " + dest + " && ln -s " + target  + " " + dest;
					
					console.log("change_node_version: command=" + command);
					
					CLIENT.cmd("run", {command: command}, function(err, resp) {
						if(err) throw err;
						
						for(var v in winMenus) winMenus[v].deactivate();
						
						winMenus[version].activate();
					});
					
				}
			});
			
			// Check which version is currently in use
			CLIENT.cmd("run", {command: "node -v"}, function(err, resp) {
				if(err) throw err;
				
				var currentVersion = resp.stdout.trim().slice(1);
				console.log("change_node_version: currentVersion=" + currentVersion);
				
				if(winMenus[currentVersion]) winMenus[currentVersion].activate();
				
			});
			
		});
	}
	
})();