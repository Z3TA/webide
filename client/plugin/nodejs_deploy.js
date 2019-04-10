(function() {
	"use strict";
	
	EDITOR.plugin({
		desc: "Allows deoploying Node.JS scripts",
		load: function loadNodeJsDeploy() {
			var keyF1 = 112;
			var keyF3 = 114;
			EDITOR.bindKey({desc: "Deoploy the nodejs project the currently open file belongs to", fun: nodejsDeploy, charCode: keyF1, combo: CTRL});
			
			EDITOR.bindKey({desc: "(Re)Start the in-production nodejs project the currently open file belongs to", fun: nodejsProdRestart, charCode: keyF1, combo: SHIFT + CTRL});
			
			EDITOR.bindKey({desc: "Stop the in-production nodejs project the currently open file belongs to", fun: nodejsProdStop, charCode: keyF3, combo: CTRL});
			
			EDITOR.bindKey({desc: "Remove the nodejs project the currently open file belongs to from production", fun: nodejsProdRemove, charCode: keyF3, combo: SHIFT + CTRL});
			
		},
		unload: function unloadNodeJsDeploy() {
			EDITOR.unbindKey(nodejsDeploy);
		},
	});
	
	function nodejsProdStop(currentFile) {
		
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) alertBox(err.message);
			else promptBox("Enter password to stop " + pj.name + " in production:", true, undefined, 0, function(pw) {
			if(pw != null) CLIENT.cmd("nodejs_init_stop", {folder: folder, pw: pw}, function(err, resp) {
				if(err) alertBox(err.message);
					else alertBox(pj.name + " stopped!");
				});
			});
		});
		
		return false;
	}
	
	function nodejsProdRemove(currentFile) {
		
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) alertBox(err.message);
			else promptBox("Enter password to remove " + pj.name + " from production:", true, undefined, 0, function(pw) {
				if(pw != null) CLIENT.cmd("nodejs_init_remove", {folder: folder, pw: pw}, function(err, resp) {
					if(err) alertBox(err.message);
					else alertBox(pj.name + " removed from production!");
				});
			});
		});
		
		return false;
	}
	
	function nodejsProdRestart(currentFile) {
		
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) alertBox(err.message);
			else promptBox("Enter password to restart " + pj.name + " in production:", true, undefined, 0, function(pw) {
				if(pw != null) CLIENT.cmd("nodejs_init_restart", {folder: folder, pw: pw}, function(err, resp) {
					if(err) alertBox(err.message);
					else alertBox(pj.name + " restarted!");
				});
			});
		});
		
		return false;
	}
	
	function getProjFolder(currentFile, callback) {
		var folders = UTIL.getFolders(currentFile.path);
		
		var folder = folders.pop();
		
		readPj(folder);
		
		function readPj(folder) {
			EDITOR.readFromDisk(folder + "package.json", function fileRead(readFileErr, filePath, fileContent) {
				if(readFileErr) {
					if(readFileErr.code == "ENOENT" && folders.length > 0) {
						folder = folders.pop();
						readPj(folder);
					}
					else if(folders.length == 0) {
						callback(new Error("Unable to find package.json"));
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
						return callback("Failed the parse " + filePath + "! " + parseErr.message);
					}
					
					callback(null, folder, json);
					
				}
			});
		}
	}
	
	
	function nodejsDeploy(currentFile, combo, character, charCode, buttonPushDirection, targetElementClass) {
		
		// Figure out what folder (project) the user wants to deploy ...
		
		if(!currentFile) alertBox("No current file open!");
		
		var folders = UTIL.getFolders(currentFile.path);
		
		var folder = folders.pop();
		
		readPj(folder);
		
		return false;
		
		function readPj(folder) {
			if(folder == undefined) throw new Error("folder=" + folder);
			
			console.log("Looking for package.json in folder=" + folder + " ..."); 
		EDITOR.readFromDisk(folder + "package.json", function fileRead(readFileErr, filePath, fileContent) {
				if(folder == undefined) throw new Error("folder=" + folder);
				
				if(readFileErr) {
					if(readFileErr.code == "ENOENT" && folders.length > 0) {
						folder = folders.pop();
					readPj(folder);
					}
					else if(folders.length == 0) {
						var createPj = "Create package.json";
						var cancel = "No, cancel deployment";
						folder = UTIL.getDirectoryFromPath(currentFile.path);
						confirmBox("Unable to find a package.json in " + folder + ". Do you want to create it ?", [createPj, cancel], function(answer) {
							if(answer == createPj) {
							
								var pjTemplate = {
									"name": UTIL.getFolderName(folder),
									"version": "1.0.0",
									"description": "What this micro service does",
									"author": EDITOR.user.name,
									"main": UTIL.getFilenameFromPath(currentFile.path)
								};
								
								EDITOR.openFile(folder + "package.json", JSON.stringify(pjTemplate, null, 2), {savedAs: false, isSaved: false}, function(openFileErr, file) {
									if(openFileErr) alertBox(openFileErr.message);
									else alertBox("Try deploying again when you have saved package.json");
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
						var pj = JSON.parse(fileContent);
					}
					catch(parseErr) {
						return alertBox("Failed the parse " + filePath + "! " + parseErr.message);
					}
					
					if(pj.main == undefined) alertBox(filePath + " needs to have a main (file path entry)!");
					else promptBox("Enter password to deploy " + pj.name + ":", true, undefined, 0, function(pw) {
						
						if(pw != null) CLIENT.cmd("nodejs_init_deploy", {folder: folder, pw: pw}, function(err, resp) {
							if(err) alertBox(err.message);
							else alertBox(pj.name + " deployed to production: " + resp.prodFolder);
							
						});
						
					});
					
				}
			}); 
		}
		
	}
	
	
})();