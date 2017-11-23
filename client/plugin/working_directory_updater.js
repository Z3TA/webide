/*
	
	Try to figure out a working directory based on the file being in view.
	
*/
(function() {
	
	"use strict";
	
	
EDITOR.plugin({
		desc: "Update working directory when switching files",
		load: function loadWorkingDirectoryUpdater() {
		
			EDITOR.on("fileShow", updateWorkingDirectory);
			
		},
		unload: function unloadWorkingDirectoryUpdater() {
			
			EDITOR.removeEvent("fileShow", updateWorkingDirectory);
		
		}
	});
	
	
	function updateWorkingDirectory(file) {
		
		if(!file) return;
		
		if(!file.savedAs) return;
		
		// See if we can find package.json or index.htm
		
		var folderPath = UTIL.getDirectoryFromPath(file.path);
		var folders = UTIL.getFolders(folderPath);
		
		search(folders.pop()); // Search down recursively 
		
		function search(currentFolder) {
			EDITOR.listFiles(currentFolder, function(err, files) {
				
				if(err) return alertBox(err.message);
				
				//console.log("Checking if working directory: " + currentFolder);
				
				for (var i=0; i<files.length; i++) {
					if(files[i].name == "package.json" || files[i].name.indexOf("index.htm") != -1) {
						
						EDITOR.changeWorkingDir(currentFolder);
						return;
					}
					}
				
				if(folders.length > 0) search(folders.pop());
				
			});
		}
		
	}
	
})();
