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
		
		if(!currentFile) alertBox("No current file open!");
		
		var folders = UTIL.getFolders(currentFile.path);
		
		var folder = folders.pop();
		
		readPj(folder);
		
		return false;
		
		function readPj(folder) {
		EDITOR.readFromDisk(folder + "package.json", function fileRead(readFileErr, filePath, fileContent) {
				if(readFileErr) {
					if(readFileErr.code == "ENOENT" && folders.length > 0) {
						folder = folders.pop();
					readPj(folder);
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
									"description": "What this micro service does",
									"author": EDITOR.username,
									"main": UTIL.getFilenameFromPath(currentFile.path)
								};
								
								EDITOR.openFile(folder + "package.json", JSON.stringify(pjTemplate, null, 2), function(openFileErr, file) {
									if(openFileErr) alertBox(openFileErr.message);
									
								});
								
							}
							});
						}
					else {
						throw readFileErr;
					}
				}
				else {
					
					// Found a package.json!
					try {
						var json = JSON.parse(fileContent);
					}
					catch(parseErr) {
						return alertBox("Failed the parse " + filePath + "! " + parseErr.message);
					}
					
					var projectName = json.name;
					
					
					promptBox("Enter password to deploy " + projectName + ":", true, function(pw) {
					
						CLIENT.cmd("deploy_nodejs", {folder: folder, pw: pw}, function(err, resp) {
							if(err) alertBox(err.message);
							else alertBox(resp.name + " deployed to production: " + resp.prodFolder);
							
						});
						
					});
					
					
					
				}
			}); 
		}
		
	}
	
	
})();