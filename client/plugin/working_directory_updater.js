/*
	
	Try to figure out a working directory based on the file being in view.
	
*/
(function() {
	
	"use strict";
	
	
EDITOR.plugin({
		desc: "Update working directory when switching files",
		load: function loadWorkingDirectoryUpdater() {
		
			EDITOR.on("fileShow", updateWorkingDirectory);
			EDITOR.on("fileSave", updateWorkingDirectory);
			
			
		},
		unload: function unloadWorkingDirectoryUpdater() {
			
			EDITOR.removeEvent("fileShow", updateWorkingDirectory);
			EDITOR.removeEvent("fileSave", updateWorkingDirectory);
		
		}
	});
	
	
	function updateWorkingDirectory(file) {
		
		if(!file) return;
		
		if(!file.savedAs) return;
		
		// See if we can find package.json or index.htm
		
		var folderPath = UTIL.getDirectoryFromPath(file.path);
		var folders = UTIL.getFolders(folderPath, true);
		
		search(folders.pop()); // Search down recursively 
		
		function search(currentFolder) {
			EDITOR.listFiles(currentFolder, function listedFiles(err, files) {
				
				if(err) throw err;
				
				console.log("Checking if working directory: " + currentFolder);
				
				for (var i=0; i<files.length; i++) {
					if(files[i].name == "package.json" || files[i].name.indexOf("index.htm") != -1) {
						
						if(EDITOR.workingDirectory != currentFolder) EDITOR.changeWorkingDir(currentFolder);
						return;
					}
					}
				
				if(folders.length > 0) search(folders.pop());
				else doSomething();
				
			});
		}
		
		function doSomething() {
			
			var file = EDITOR.currentFile;
			
			if(!file) return true;
			
			var currentFolder = UTIL.getDirectoryFromPath(file.path);
			
			if(currentFolder.indexOf(EDITOR.workingDirectory) == -1) {
				// The file switched to or saved is not part of the current woring directory, so change working directory!
				EDITOR.changeWorkingDir(currentFolder);
			}
			
		}
		
	}
	
})();
