(function() {
	
	EDITOR.plugin({
		desc: "Insert file into document when dropped",
		load: function loadInsertDroppedFile() {
			
			EDITOR.on("fileDrop", insertDroppedFile);
			EDITOR.on("filesDropped", insertDroppedFiles);

		},
		unload: function unloadInsertDroppedFile() {
			
			EDITOR.removeEvent("fileDrop", insertDroppedFile);
			EDITOR.removeEvent("filesDropped", insertDroppedFiles);
		}
	});
	
	function insertDroppedFiles(files, caret) {

		console.log("insert_dropped_file: insertDroppedFiles: files=", files);

		var currentFile = EDITOR.currentFile;

		if(!currentFile) return PASS;

		var currentFileExt = UTIL.getFileExtension(currentFile.path);
		if(!currentFileExt.match(/html?/i)) return PASS;

		// Side effect: Move caret to where the files where dropped
		currentFile.moveCaretToIndex(caret.index);

		var handled = false;
		for (var i=0; i<files.length; i++) {
			console.log("insert_dropped_file: insertDroppedFiles forEach files[" + i + "]=", files[i]);
			if(files[i].type.indexOf("image") != -1) {
				handled = true;
				break;
			}
		}

		if(!handled) return PASS;
		
		var fileNames = files.map(function(file) {
			return UTIL.getFilenameFromPath(file.path);
		});

		var currentFileDir = UTIL.getDirectoryFromPath(currentFile.path);
		var firstFileDir = UTIL.getDirectoryFromPath(files[0].path);

		if(currentFileDir != firstFileDir) {
			EDITOR.pathPickerTool({
				defaultPath: currentFileDir,
				directory: true,
				instruction: "Move the dropped files (" + fileNames.join(",") + ") to the following location? " 
			}, function(err, newDir) {
				if(err) {
					if(err.code == "CANCEL") return insertImages();
					else throw err;
				}

				var filesMoved = 0;
				files.forEach(function(file, i) {
					EDITOR.move(file.path, UTIL.joinPaths(newDir, fileNames[i]), function fileMoved(err, newPath) {
						if(err) throw err;
						filesMoved++;

						if(file.type.indexOf("image") != -1) {
							insertImage(newPath, currentFile);
						}

					});
				});

			});
		}
		else insertImages();

		
		function insertImages() {
			for (var i=0; i<files.length; i++) {
				console.log("insert_dropped_file: insertDroppedFiles forEach files[" + i + "]=", files[i]);
				if(files[i].type.indexOf("image") != -1) {
					insertImage(files[i].path, currentFile);
				}
			}
		}

		return HANDLED;
	}

	function insertImage(path, currentFile) {
		console.log("insert_dropped_file: insertImage: path=" + path);
		currentFile.insertText('<img src="' + relativeOrAbsolutePath(path) + '" />');
		currentFile.insertLineBreak();
	}

	function relativeOrAbsolutePath(path) {

		var currentFile = EDITOR.currentFile;
		var currentFileName = UTIL.getFilenameFromPath(currentFile.path);
		var currentFileFolder = UTIL.getDirectoryFromPath(currentFile.path);
		var rootFolder = EDITOR.workingDirectory;

		if(currentFileName.match(/^(header|footer).html?/)) {
			// In the static site generator plugin, header and footer files need to have absolute media paths
			return path.replace(rootFolder, "/");
		}
		else if(currentFileFolder != UTIL.getDirectoryFromPath(path) ) {
			// File paths needs to be relative!
			var relativePath = UTIL.getRelativeRootDots(currentFile.path, rootFolder);
			return relativePath + path.replace(rootFolder, "");
		}
		else {
			return UTIL.getFilenameFromPath(path);
		}
	}

	function insertDroppedFile(dataFile) {
		// When a file is dropped into the editor
		
		var currentFile = EDITOR.currentFile;
		
		if(!currentFile) return false; // No file is open so the image is probably not supposed to be inserted to a file
		
		var currentFileExt = UTIL.getFileExtension(currentFile.path);
		
		var caret = EDITOR.mousePositionToCaret();
		
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
		var currentFileFolder = UTIL.getDirectoryFromPath(currentFile.path);
		
		if(filePath.match(/\/\\/)) defaultPath = filePath;
		else defaultPath = UTIL.joinPaths(currentFileFolder, filePath);
		
		console.log("insert_dropped_file: currentFileFolder=" + currentFileFolder + " filePath=" + filePath + " defaultPath=" + defaultPath);

		if(isImage) var whereToSaveMessage = "Where to save the image ?"
		else var whereToSaveMessage = "Where to save the file ?";
		
		askWhereToSave();
		
		return true;
		
		function askWhereToSave() {
			promptBox(whereToSaveMessage, {defaultValue: defaultPath}, function(filePath) {
				if(filePath) {
					console.log("insert_dropped_file: Saving file: filePath=" + filePath);
					saveFile(filePath, function fileSaved(err, path) {
						if(err) return alertBox(err.message);
						
						console.log("insert_dropped_file: Saved file: " + path);
						
						var fileSrc = relativeOrAbsolutePath(path);

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

							console.log("insert_dropped_file: imageLoaded: width=" + width + " height=" + height);

							currentFile.moveCaretToIndex(caret.index);

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
			
			console.log("insert_dropped_file: saveFile: filePath=" + filePath + " folders=" + JSON.stringify(folders));

			if(folders.length > 1) {
				EDITOR.folderExistIn(folders[folders.length-2], UTIL.getFolderName(folders[folders.length-1]), function (err, path) {
if(err) return alertBox(err.message);

					if(path === false) {
						//console.log("Path doesn't exist!");
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
						console.log("insert_dropped_file: Path exist!");
						readFile();
					}
				});
			}
			else readFile(); // It will be saved in the root dir
			
			function readFile() {

				console.log("insert_dropped_file: Reading file..");

				var reader = new FileReader();
				reader.onload = function (event) {
					var data = event.target.result;
					
					// Specifying encoding:base64 will magically convert to binary!
					// We do have to remove the data:image/png metadata though!
					data = data.replace("data:" + fileType + ";base64,", "");


					console.log("insert_dropped_file: Saving file... filePath=" + filePath);
					EDITOR.saveToDisk(filePath, data, false, "base64", callback);
				};
				reader.readAsDataURL(dataFile); // For binary files (will be base64 encoded)
			}
		}
		
		
	}


})();