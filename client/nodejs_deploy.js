(function() {
	"use strict";
	
	EDITOR.plugin({
		desc: "Allows deoploying Node.JS scripts",
		load: function loadNodeJsDeploy() {
			var keyF1 = 112;
			var keyF3 = 114;
			EDITOR.bindKey({desc: "Deoploy the nodejs project this file belongs to", fun: nodejsDeploy, charCode: keyF1, combo: CTRL});
			
		},
		unload: function unloadNodeJsDeploy() {
			EDITOR.unbindKey(nodejsDeploy);
		},
	});
	
	
	function nodejsDeploy(currentFile, combo, character, charCode, buttonPushDirection, targetElementClass) {
		
		// Figure out what folder (project) the user wants to deploy ...
		
		if(!file) alertBox("No current file open!");
		
		var folders = UTIL.getFolders(currentFile.path);
		
		var folder = folders.pop();
		
		function readPj(folder, callback) {
		EDITOR.readFromDisk(folder + "package.json", function fileRead(filePath, fileContent) {
				if(err) {
					if(err.code == "ENOEND" && folders.length > 0) {
						folder = folders.pop();
					readPj(folder, callback);
					}
					else if(folders.length == 0) {
						var createPj = "Create package.json";
						var cancel = "No, cancel deployment";
						confirmBox("Unable to find a package.json in the project root. Do you want to create it ?", [createPj, cancel], function(answer) {
							if(answer == createPj) {
							
								var folder = UTIL.getDirectoryFromPath(currentFile.path);
								
								var pjTemplate = {
									"name": UTIL.getFolderName(folder),
									"version": "1.0.0",
									"description": "What this project does",
									"author": EDITOR.username,
									"main": currentFile.path
								};
								
								EDITOR.openFile(folder + "package.json", JSON.stringify(pjTemplate, null, 2), function(err, file) {
									
								});
								
							}
							});
						}
					else alertBox(err.message);
				}
				else {
					
					// Found a package.json!
					
					CLIENT.cmd("deploy_nodejs", {folder: folder}, function(err, resp) {
						if(err) alertBox(err.message);
						else alertBox(resp.name + " deployed to production: " + resp.prodFolder);
						
					});
					
					
				}
			}); 
		}
		
	}
	
	
})();