(function() {
	
	EDITOR.plugin({
		desc: "Insert file into document when dropped",
		load: function loadInsertDroppedFile() {
			
			EDITOR.on("fileDrop", insertDroppedFile);
			
		},
		unload: function unloadInsertDroppedFile() {
			
			EDITOR.removeEvent("fileDrop", insertDroppedFile);

		}
	});
	
	
	function insertDroppedFile(dataFile) {
		// When a file is dropped into the editor
		
		var currentFile = EDITOR.currentFile;
		
		if(!currentFile) return false; // No file is open so the image is probably not supposed to be inserted to a file
		
		var currentFileExt = UTIL.getFileExtension(currentFile.path);
		
		
		var filePath = dataFile.path || dataFile.name;
		var fileType = dataFile.type;
		var isImage = (fileType.indexOf("image") != -1);
		
		if(currentFileExt.match(/css/i) && isImage) {
			var insertCSS = true;
		}
		else if(currentFileExt.match(/html?/i)) {
			var insertHTML = true;
		}
		else {
			return false;
		}
		
		var defaultPath;
		var rootFolder = EDITOR.workingDirectory;
		if(filePath.match(/\/\\/)) defaultPath = filePath;
		else defaultPath = UTIL.joinPaths(rootFolder, filePath);
		
		if(isImage) var whereToSaveMessage = "Where to save the image ?"
		else var whereToSaveMessage = "Where to save the file ?";
		
		askWhereToSave();
		
		return true;
		
		function askWhereToSave() {
			promptBox(whereToSaveMessage, {defaultValue: defaultPath}, function(filePath) {
				if(filePath) {
					console.log("Saving file: " + filePath);
					saveFile(filePath, function fileSaved(err, path) {
						if(err) return alertBox(err.message);
						
						console.log("Saved file: " + path);
						
						var currentFileName = UTIL.getFilenameFromPath(currentFile.path);
						
						if(currentFileName.match(/^(header|footer).html?/)) {
							// In the static site generator plugin, header and footer files need to have absolute media paths 
							var fileSrc = path.replace(rootFolder, "/"); 
						}
						else {
							// File paths needs to be relative!
							var relativePath = UTIL.getRelativeRootDots(currentFile.path, rootFolder);
							var fileSrc = relativePath + path.replace(rootFolder, "");
						}
						
						if(isImage) {
							// todo: Some sort of crop and resize tool
							
							// Try to get the image dimensions
							try {
								var img = new Image();
								img.src = window.URL.createObjectURL( dataFile );
								img.onload = function() {
									var width = img.naturalWidth;
									var height = img.naturalHeight;
									imageLoaded(width, height);
}
							}
							catch(err) {
								console.error(err);
								imageLoaded();
							}
							
						}
						else {
							var fileName = UTIL.getFilenameFromPath(filePath);
							currentFile.insertText('<a href="' + fileSrc + '">' + fileName + '</a>');
						}
						
						function imageLoaded(width, height) {
							if(insertCSS) {
								currentFile.insertText("url('" + fileSrc + "')");
							}
							else {
								if(width && height) {
									currentFile.insertText('<img src="' + fileSrc + '" width="' + width + '" height="' + height + '" />');
								}
								else currentFile.insertText('<img src="' + fileSrc + '" />');
							}
						}
						
					});
				}
			});
		}
		
		function saveFile(filePath, callback) {
			
			var folders = UTIL.getFolders(filePath);
			
			if(folders.length > 1) {
				EDITOR.folderExistIn(folders[folders.length-2], UTIL.getFolderName(folders[folders.length-1]), function (path) {
					if(path === false) {
						console.log("Path doesn't exist!");
						var createPath = "Create the path";
						var saveElsewhere = "Save the file elsewhere";
						var dontSave = "Don't save the file";
						confirmBox("The folder does not exist: " + folders[folders.length-1] + "\n" +
						"Do you want to create the path ?", [createPath, saveElsewhere, dontSave], function(answer) {
							if(answer == createPath) {
								EDITOR.createPath(folders[folders.length-1], function(err) {
									if(err) throw err;
									else readFile();
								});
							}
							else if(answer == saveElsewhere) {
								askWhereToSave();
							}
							else if(answer == dontSave) {
								// Do nothing
							}
							else throw new Error("Unexpected answer=" + answer);
							
						});
						
					}
					else {
						console.log("Path exist!");
						readFile();
					}
				});
			}
			else readFile(); // It will be saved in the root dir
			
			function readFile() {
				var reader = new FileReader();
				reader.onload = function (event) {
					var data = event.target.result;
					
					// Specifying encoding:base64 will magically convert to binary!
					// We do have to remove the data:image/png metadata though!
					data = data.replace("data:" + fileType + ";base64,", "");
					EDITOR.saveToDisk(filePath, data, false, "base64", callback);
				};
				reader.readAsDataURL(dataFile); // For binary files (will be base64 encoded)
			}
		}
		
		
	}


})();