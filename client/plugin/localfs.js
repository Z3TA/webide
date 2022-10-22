/*

	Native file system API: https://web.dev/file-system-access/

	showDirectoryPicker()

*/
(function() {
	"use strict";

	var protocol = "local";

	var fileHandles = {}; // Temporarily store file handles
	var nativeFileSystemFileHandleDb; // For "permantely" storing file handles (able to read from the same file when browser is reopened) undefined means we have not yet tried to open it
	var nativeFileSystemFileHandleDbWaitList = [];
	var windowMenuOpenLocalFile;
	var windowMenuOpenLocalDir
	var directoryHandles = {}; // Temporarily store directory handles

	EDITOR.plugin({
		desc: "Web Native File System Access",
		load: function loadWebNativeFs() {

			console.log("localfs: loadWebNativeFs!");

			EDITOR.addProtocol(protocol, {
				list: localListFiles, 
				read: localReadFile, 
				write: localWriteFile, 
				hash: localHashFromDisk, 
				size: localFileSizeOnDisk,
				move: localMove,
				del: localDelete,
				findFiles: localFindFiles,
				findReplace: localFindReplace
			});

			EDITOR.on("fileOpen", nativeFileOpen, 1);
			EDITOR.on("fileClose", nativeFileClose, 1);
			EDITOR.on("localFileDialog", localFileDialog);
			EDITOR.on("openLocalFile", openLocalFileTool);
			EDITOR.on("openLocalFolder", openLocalFolderTool);

			var charO = 79;
			EDITOR.bindKey({desc: "Open a local file using native file select dialog", charCode: charO, combo: CTRL + SHIFT, fun: openLocalFileKeyboardShortcut});

			windowMenuOpenLocalFile = EDITOR.windowMenu.add(S("open_local_file"), [S("File"), 1], openLocalFile, openLocalFileKeyboardShortcut);
			windowMenuOpenLocalDir = EDITOR.windowMenu.add(S("open_local_dir"), [S("File"), 1], openLocalDir);

		},
		unload: function unloadWebNativeFs() {

			console.log("localfs: unloadWebNativeFs!");

			EDITOR.removeProtocol(protocol);

			nativeFileSystemFileHandleDb = undefined;
			nativeFileSystemFileHandleDbWaitList.length = 0;

			EDITOR.removeEvent("fileOpen", nativeFileOpen);
			EDITOR.removeEvent("fileClose", nativeFileClose);
			EDITOR.removeEvent("localFileDialog", localFileDialog);
			EDITOR.removeEvent("openLocalFile", openLocalFileTool);
			EDITOR.removeEvent("openLocalFolder", openLocalFolderTool);

			EDITOR.unbindKey(openLocalFileKeyboardShortcut);

			EDITOR.windowMenu.remove(windowMenuOpenLocalFile);
			EDITOR.windowMenu.remove(windowMenuOpenLocalDir);


		},
		order: 100 // Load before reopen_files so it can hash files etc
	});

	function openLocalFileTool() {
		openLocalFile();
		return HANDLED;
	}

	function openLocalFolderTool() {
		openLocalDir();
		return HANDLED;
	}

	function openLocalFileKeyboardShortcut(file) {

		EDITOR.ctxMenu.hide();

		//console.log("localfs: Opening file ...");

		var defaultPath = "";
		var file = file || EDITOR.currentFile;

		if(file) {
			// Check if the cursor is on a file path

			var startIndex = file.grid[file.caret.row].startIndex;
			var endIndex = (file.grid.length-1 > file.caret.row ? file.grid[file.caret.row+1].startIndex : file.text.length) - file.lineBreak.length;
			var filePath = file.text.substring(startIndex, endIndex).trim(); //substring: second argument: Index

			if(UTIL.isFilePath(filePath)) {
				// The text on the row is a file path! Open that file.

				EDITOR.openFile(filePath, undefined, function(err, file) {  // path, content, callback

					if(err) {
						alert(err.message);
						return;
					}

					// Mark the file as saved, because we just opened it
					file.isSaved = true;
					file.savedAs = true;
					file.changed = false;

					EDITOR.renderNeeded();

				});

				return false; // Exit function, and prevent default browser action

			}

			// Change default directory to the same as current file

			if(file.path.indexOf(EDITOR.workingDirectory) != -1) defaultPath = EDITOR.workingDirectory;
			else {
				var folders = UTIL.getFolders(file.path);
				if(folders.length > 0) folders.pop(); // Use parent folder
				defaultPath = folders.pop();
				//console.log("localfs: defaultPath=" + defaultPath);
			}

		}
		else {
			// No current file opened. Use working dir!?
			//defaultPath = EDITOR.workingDirectory;
		}

		//alertBox(defaultPath);
		// It doesn't seem we can set default path in Linux !
		file.isSaved = true;
		file.savedAs = true;
		file.changed = false;

		localFileDialog(undefined, function(err, filePath, fileContent, fileHandle) {
			if(err) throw err;

			EDITOR.openFile(filePath, fileContent, {isSaved: true, savedAs: true, changed: false}, function(err) {
				if(err) throw new Error("Failed to add filePath=" + filePath + " to EDITOR.files (open files). Error: " + err.message);
			});
		});

		return false; // Prevent default
	}

	function nativeFileOpen(file) {

		var path = file.path;
		var prot = UTIL.urlProtocol(path);

		if(prot !== protocol) return;

		// The user has "opened" the file. Permanently store the file permission for later
		
		var fileHandle = fileHandles[path];

		if(fileHandle) {
			saveHandleToIndexedDB(path, fileHandle);
		}
		else {
			console.warn( "localfs: No fileHandle found for path=" + path + " in Object.keys(fileHandles)=" + JSON.stringify(Object.keys(fileHandles)) );
		}
	}

	function getFileHandle(path, callback) {

		console.warn( "localfs:getFileHandle: path=" + path + " fileHandles=" + JSON.stringify(Object.keys(fileHandles)) );

		var errorWithProperCallStack = new Error();

		if( fileHandles.hasOwnProperty(path) ) {
			var fileHandle = fileHandles[path];
			console.log("localfs:getFileHandle: Found file handle in fileHandles! fileHandle=", fileHandle);
			verifyNativeFileSystemPermission(fileHandle, "readwrite", function(err) {
				if(err) callback(err);
				else callback(null, fileHandle);
			});
			return;
		}

		console.warn("localfs:getFileHandle: Reading handle from indexedDB...");
		readHandleFromIndexedDB(path, function gotFileHandleFromIndexedDbMaybe(err, fileHandle) {
			if(err) {
				var dirPath = UTIL.getDirectoryFromPath(path);
				
				if(dirPath != (protocol + ":///")) {
					return getDirectoryHandle(dirPath, function gotDirectoryHandleMaybeAfterFileHandleNotFound(err, dirHandle) {
						if(err) {
							var error = new Error("Could not get file handle for " + path + " nor a directory handle for " + dirPath + "\nError: " + err.message + " (error code=" + err.code + ")");
							return callback(error);
						}

						var fileName = UTIL.getFilenameFromPath(path);
						dirHandle.getFileHandle(fileName).then(function getFileHandleFromDirectoryHandleSucceeded(fileHandle) {
							CB(callback, null, fileHandle);
						}).catch(function getFileHandleFromDirectoryHandleFailed(err) {
							var error = new Error("Directory handle for " + dirPath + " could not get file handle for " + path + "\nError: " + err.message + " (error code=" + err.code + ")");
							error.code = "ENOENT"; // We are pretty sure 
							CB(callback, error);
						});
					});
				}

				errorWithProperCallStack.message = "Unable to find a fileHandle for path=" + path + "\nError: " + err.message + "\n(The file might still exist, but we need to ask the user for it, try EDITOR.openLocalFile)";
				return callback(errorWithProperCallStack);
			}

			verifyNativeFileSystemPermission(fileHandle, "readwrite", function(err) {
				if(err) return callback(err);
				
				fileHandles[path] = fileHandle;
				console.log("localfs:getFileHandle: Updated fileHandles=" + JSON.stringify(Object.keys(fileHandles)) );

				callback(null, fileHandle);
			});
		});
	}

	function nativeFileClose(filePath, callback) {

		var fileHandle = fileHandles[filePath];

		if(fileHandle && nativeFileSystemFileHandleDb) {
			var transaction = nativeFileSystemFileHandleDb.transaction(["fileHandles"], "readwrite");
			var objectStore = transaction.objectStore("fileHandles");
			transaction.oncomplete = function(event) {
				//console.log("localfs: nativeFileSystemFileHandle for filePath="+ filePath + " deleted from indexedDB!");
			};
			transaction.onerror = function(event) {
				console.error("localfs: Failed to delete nativeFileSystemFileHandle for filePath="+ filePath + " in indexedDB!");
			};
			objectStore.delete(filePath);
		}
	}

	function localReadFile(path, returnBuffer, encoding, callback) {
		console.log("localfs:localReadFile:path=" + path);

		if(callback == undefined && typeof encoding == "function") {
			callback = encoding;
			encoding = "utf8";
		}

		if(callback == undefined && typeof returnBuffer == "function") {
			callback = returnBuffer;
			returnBuffer = false;
		}

		if(callback == undefined || typeof callback != "function") throw new Error("No callback function! callback=" + callback);

		getFileHandle(path, function(err, fileHandle) {
			if(err) {
				if(!err.code) err.code = "ENOENT";
				return callback(err);
			}

			fileHandle.getFile().then(function readText(localFile) {
				localFile.text().then(function(fileContent) {

					UTIL.hash(fileContent, function(err, hash) {
						if(err) throw err;

						CB(callback, null, path, fileContent, hash);
					});

				});
			}).catch(function(err) {
				CB(callback, err);
			});
		});

		//var fileName = path.replace(protocol + "://", "");
	}

	function localWriteFile(path, text, inputBuffer, encoding, timeout, callback) {

		console.log("localfs:localWriteFile: path=" + path);

		if(typeof inputBuffer == "function" && callback == undefined) {
			callback = inputBuffer;
			inputBuffer = undefined;
		}
		else if(typeof encoding == "function" && callback == undefined) {
			callback = encoding;
			encoding = undefined;
		}
		else if(typeof timeout == "function" && callback == undefined) {
			callback = timeout;
			timeout = undefined;
		}

		if(typeof window.showSaveFilePicker != "function") {
			var download = "Download";
			var cancel = "Cancel";
			return confirmBox("Local files system API not supported in BROWSER=" + BROWSER + " Do you want to download " + path + " ?", [download, cancel], function(answer) {
				if(answer == cancel) return;

				var filename = UTIL.getFilenameFromPath(path);

				var element = document.createElement('a');
				element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
				element.setAttribute('download', filename);

				element.style.display = 'none';
				document.body.appendChild(element);

				element.click();

				document.body.removeChild(element);

			});
		}

		getFileHandle(path, function gotHandle(err, fileHandle) {
			if(err) {

				// the write function is supposed to write to the file, so if we can't get an handle for it, try creating it!
				var folderPath = UTIL.getDirectoryFromPath(path);
				return getDirectoryHandle(folderPath, function(err, dirHandle) {
					if(err) {
						var chooseFile = "Choose file";
						var cancel = "Cancel";
						return confirmBox("Do you want to save " + path + " locally?", [chooseFile, cancel], function(answer) {
							if(answer == cancel) return;
							else if(answer == chooseFile) {

								var fileName = UTIL.getFilenameFromPath(path);
								var fileExtension = "." + UTIL.getFileExtension(path);

								window.showSaveFilePicker({
									suggestedName: fileName,
									types: [{
											description: 'Development',
											accept: {
												'text/plain': [fileExtension],
											},
									}],
								}).then(function(fileHandle) {

									console.log("localfs:localWriteFile: path=" + path + " fileHandle.name=" + fileHandle.name);
									path = protocol + "://" + fileHandle.name; // Update the path with new filname!
									fileHandles[path] = fileHandle;

									console.log("localfs:localWriteFile: Updated fileHandles=" + JSON.stringify(Object.keys(fileHandles)) );

									CB(gotHandle, null, fileHandle);

								}).catch(function(err) {
									console.error(err);
									alertBox("localfs: Error from showSaveFilePicker: " + err.message);
								});

							}
						});
					}

					var options = {
						create: true
					};
					var fileName = UTIL.getFilenameFromPath(path);
					dirHandle.getFileHandle(fileName, options).then(writeToFileHandle).catch(function(err) {
						var error = new Error("Unable to create new file when writing to " + path + " Error: " + err.message);
						if(callback) CB(callback, error);
						else alertBox(error.message);
					});
				});
			}

			writeToFileHandle(fileHandle);

		});

		function writeToFileHandle(fileHandle) {
			console.log("localfs:localWriteFile: path=" + path + " fileHandle.name=" + fileHandle.name + " creating writeable...");
			fileHandle.createWritable().then(function(writer) {
				// Make sure we start with an empty file
				//writer.truncate(0).then(function() {
				// Write the full length of the contents
				//writer.write(0, text).then(function() {
				writer.write(text).then(function() {
					// Close the file and write the contents to disk
					writer.close().then(function() {

						UTIL.hash(text, function(err, hash) {
							if(err) throw err;
							if(callback) CB(callback, null, path, hash);
							else alertBox("Local file saved: " + path);
						});

					});
				});
			}).catch(function(err) {
				var error = new Error("Unable to write to " + path + " via fileHandle.createWritable! Error: " + err.message)
				if(callback) CB( callback, error );
				else alertBox(error.message); // Can't throw inside a promise chain
			});
		}

	}

	function localHashFromDisk(path, callback) {
		console.log("localfs:localHashFromDisk: path=" + path);

		getFileHandle(path, function gotFileHandleMaybe(err, fileHandle) {
			if(err) {
				var error = new Error("Could not hash " + path + " on disk because we could not acquire a file handle. Error: " + err.message);
				error.code = err.code;
				return callback(error);
			}

			//if(err && err.code == "PERMISSION_DENIED") return alertBox(err.message);
			
			fileHandle.getFile().then(function readText(localFile) {
				localFile.text().then(function(fileContent) {

					UTIL.hash(fileContent, function(err, hash) {
						callback(err, hash);
					});

				});
			}).catch(function(err) {
				CB(callback, err);
			});;
		});
	}

	function localFileSizeOnDisk(path, callback) {
		console.log("localfs:localFileSizeOnDisk: path=" + path);

		getFileHandle(path, function(err, fileHandle) {
			if(err) {
				if(!err.code) err.code = "ENOENT";
				return callback(err);
			}

			fileHandle.getFile().then(function readText(localFile) {
				localFile.text().then(function(fileContent) {

					console.log("localfs:localFileSizeOnDisk: Successfully got content for path=" + path + "");

					var size = UTIL.byteSize(fileContent);

					console.log("localfs:localFileSizeOnDisk: size=" + size + " fileContent=" + fileContent);

					CB(callback, null, size);

				});
			}).catch(function(err) {
				console.error(err);
				CB(callback, err); 
			});
		});
	}

	function localMove(oldPath, newPath, callback) {
		/*

			2022-10-21: Only file handles has a move method... arguments (newName), (dirHandle), (dirHandle, newName)
			But the move method doesn't work - we get a "The user aborted a request." message

		*/

		var oldDir = UTIL.getDirectoryFromPath(oldPath);
		var newDir = UTIL.getDirectoryFromPath(newPath);

		var newName = UTIL.getFilenameFromPath(newPath);

		if(oldDir == newDir) {
			// We can use fileHandle.move
			return getFileHandle(oldPath, function(err, fileHandle) {
				if(err) return callback(err);

				fileHandle.move(newName).then(function() {
					CB( callback, null );
				}).catch(function(err) {
					CB( callback, new Error("Problems calling move method on File System Access API fileHandle. Error: " + err.message) );
				});
			});
		}

		callback(new Error("The File System Access API can not move " + oldPath + " to " + newPath));
	}

	function localDelete(path, callback) {
		// Should call back with the path if successful
	
		var isDirectory = UTIL.isDirectory(path);
		if(isDirectory) {
			var dir = UTIL.parentFolder(path);
			var name = UTIL.getFolderName(path);
		}
		else {
			var dir = UTIL.getDirectoryFromPath(path);
			var name = UTIL.getFilenameFromPath(path);
		}

		getDirectoryHandle(dir, function(err, dirHandle) {
			if(err) return callback(err);

			var options = { recursive: true };
			dirHandle.removeEntry(name, options).then(function() {
				console.log("localfs:localDelete: Successfully deleted " + path);

				if(isDirectory) {
					delete directoryHandles[path];
				}
				else {
					delete fileHandles[path];
				}

				removeHandleFromIndexedDB(path);
				
				CB( callback, null );

			}).catch(function(err) {
				CB( new Error("The File System Access API could not delete " + path + " using directory handle for " + dir + " Error: " + err.message) );
			});
		});
	}

	function localFindReplace(json) {
		/*
			["searchPath", "searchString", "fileFilter", "searchSubfolders", "maxFolderDepth", "searchMaxFiles", "maxTotalMatches", "caseSensitive", "id", "showSurroundingLines", "replaceWith", "found", "finish", "progress"];
		*/

		var findReplaceAborted = false;

		var findReplaceInFilesCallback = json.finish || function(err, resp) {
			if(err) console.error(err);
			if(resp) console.log(resp);
		}

		var foundInFileCallback = json.found || function(foundInFile) {
			console.log(foundInFile);
		}

		var progressCallback = json.progress;

		var searchPath = json.searchPath;
		if(searchPath == undefined) return findReplaceInFilesCallback(new Error("localfs:localFindReplace: searchPath=" + searchPath + " is not defined!"));

		var searchString = json.searchString;
		if(searchString == undefined) return findReplaceInFilesCallback(new Error("localfs:localFindReplace: searchString=" + searchString + " is not defined!"));
		if(searchString == "") return findReplaceInFilesCallback(new Error("localfs:localFindReplace: searchString=" + searchString + " can not be empty!"));

		try {
			var testSearchString = new RegExp(fileFilter);
		}
		catch(err) {
			return findReplaceInFilesCallback(new Error("localfs:localFindReplace: Bad RegExp: searchString=" + searchString + ": " + err.message));
		}

		var fileFilter = json.fileFilter;
		if(fileFilter == undefined) return findReplaceInFilesCallback(new Error("localfs:localFindReplace: fileFilter=" + fileFilter + " is not defined!"));

		try {
			var fileFilterRegExp = new RegExp(fileFilter);
		}
		catch(err) {
			return findReplaceInFilesCallback(new Error("localfs:localFindReplace: Bad RegExp: fileFilter=" + fileFilter + ": " + err.message));
		}

		var searchSubfolders = json.searchSubfolders || false;
		var maxFolderDepth = json.maxFolderDepth || 20;
		var searchMaxFiles = json.searchMaxFiles || 100000;
		var maxTotalMatches = json.maxTotalMatches || 500;
		var caseSensitive = json.caseSensitive || false;
		var searchSessionId = json.id || 0;
		var showSurroundingLines = json.showSurroundingLines || 2;
		var replaceWith = json.replaceWith;

		var totalFiles = 0;
		var filesSearched = 0;

		var fileQueue = []; // Files to be searched
		var foldersToRead = 0;
		var totalMatches = 0;
		var totalFilesFound = 0;
		var matches = [];
		var flags = "g"; // Always make a global search!
		var filesBeingSearched = 0;
		var abort = false;
		var done = false;
		var doneStack = undefined;
		var doneReason = undefined;
		var searchSymLinks = true;
		var maxFilesToSearchAtTheSameTime = 20; // Hard drivers are really bad at multi tasking
		var totalFoldersSearched = 0;
		var totalFoldersToSearch = 0;
		var progressInterval = 350;
		var lastProgress = new Date();
		var searchBegin = new Date();
		var totalFilesSearched = 0;

		if(!caseSensitive) flags += "i";

		findReplaceAborted = false;

		searchDir(searchPath, 0);

		function searchDir(folderPath, folderDepth) {

			console.log("localfs:localFindReplace: Searching: " + folderPath);

			if(folderDepth > maxFolderDepth) {
				console.log("localfs:localFindReplace: Max folder depth reached! maxFolderDepth=" + maxFolderDepth + " folderDepth=" + folderDepth + " folderPath=" + folderPath);
				return;
			}

			foldersToRead++;
			folderDepth++;
			totalFoldersToSearch++;

			localListFiles(folderPath, function gotFileList(err, fileList) {

				if(findReplaceAborted) return aborted();

				if(err) return abortError(err);

				/*
					type - string - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
					name - string - File or folder name
					path - string - Full path to file/folder
					size - float - The size of the entry in bytes.
					date - Date - The last modified date of the entry.
				*/
				for (var i=0; i<fileList.length; i++) {
					if(fileList[i].type == "d" && searchSubfolders) {
						searchDir(fileList[i].path, folderDepth);
					}
					else if(fileList[i].type == "-" || (fileList[i].type == "l" && searchSymLinks)) {
						totalFilesFound++;
						if(fileFilterRegExp.test(fileList[i].path)) fileQueue.push(fileList[i].path);
					}
				}

				foldersToRead--;
				totalFoldersSearched++;

				doWeHaveAllFiles();

			});

		}

		function doWeHaveAllFiles() {
			if(foldersToRead == 0) {
				// All folders have now been searched!
				totalFiles = fileQueue.length;
				if(fileQueue.length == 0) {
					doneFinish("Found " + totalFilesFound + " files. But none of them math the file filter!");
				}
				else {
					continueSearchFiles();
				}
			}
		}

		function continueSearchFiles() {

			console.log("localfs:localFindReplace:continueSearchFiles: fileQueue.length=" + fileQueue.length + " filesBeingSearched=" + filesBeingSearched);

			if(done) return console.log("localfs:localFindReplace:continueSearchFiles: Already done! from continueSearchFiles()");
			if(findReplaceAborted) return aborted();

			if(totalFiles >= searchMaxFiles) {
				doneFinish("Aborted the search because we reached searchMaxFiles=" + searchMaxFiles + " limit!");
				return;
			}
			else if(totalMatches >= maxTotalMatches) {
				doneFinish("Aborted the search because we reached maxTotalMatches=" + maxTotalMatches + " limit!");
				return;
			}
			else while(fileQueue.length > 0 && filesBeingSearched < maxFilesToSearchAtTheSameTime) searchNextFileInQueue();

			doneMaybe();

		}

		function doneMaybe() {

			console.log("localfs:localFindReplace:doneMaybe: fileQueue.length=" + fileQueue.length + " filesBeingSearched=" + filesBeingSearched);

			if(findReplaceAborted) return aborted();
			if(done) throw new Error("localfs:localFindReplace: We should not be calling doneMaybe() if done!");

			sendProgress();

			if(fileQueue.length == 0 && filesBeingSearched == 0) doneFinish();
			else {
				//continueSearchFiles(); // RangeError: Maximum call stack size exceeded
				setTimeout(continueSearchFiles, 500); // Give a few milliseconds of rest
			}
		}

		function searchNextFileInQueue() {

			console.log("localfs:localFindReplace:searchNextFileInQueue: fileQueue.length=" + fileQueue.length + " filesBeingSearched=" + filesBeingSearched);

			if(findReplaceAborted) return aborted();
			if(done) throw new Error("localfs:localFindReplace: We should not be calling searchNextFileInQueue() if done==" + done + "!");

			var filePath = fileQueue.pop(); // Last in, first out

			if(filePath == undefined) {
				if(fileQueue.length == 0) doneFinish();
				else throw new Error("localfs:localFindReplace: filePath=" + filePath + " fileQueue.length=" + fileQueue.length);
			}
			else searchFile(filePath);

		}

		function searchFile(filePath) {
			filesBeingSearched++;

			localReadFile(filePath, function readFile(err, filePath, fileContent) {
				if(err) return abortError(err);

				var myRe = new RegExp(searchString, flags); // Create a new RegExp for each file!

				console.log("localfs:localFindReplace:searchFile: Searching file: " + filePath);

				var result;
				var lastIndex = 0;
				var lastLine = 1;
				var rowsAbove = [];
				var rowsBeneath = [];

				while ((result = myRe.exec(fileContent)) !== null) {

					totalMatches++;

					// Figure out what the line number is
					// Select all text up until the first line break after the search match index
					var firstLineBreakAfterResult = fileContent.indexOf("\n", result.index + result[0].length);
					var textAboveInludingResult = fileContent.slice(  result.lastIndex, firstLineBreakAfterResult  );
					if(textAboveInludingResult.charAt(textAboveInludingResult.length-1) == "\r") textAboveInludingResult = textAboveInludingResult.slice(0, -1);
					var resultRows =  result[0].split(/\r\n|\n/);
					var textAboveInludingResultRows = textAboveInludingResult.split(/\r\n|\n/);
					var lineNr = textAboveInludingResultRows.length - resultRows.length + 1;

					lastLine = lineNr;

					var lineText = "";
					// Line text can be many lines!
					for (var i=0; i<resultRows.length; i++) {
						lineText = textAboveInludingResultRows.pop() + "\n" + lineText;
					}
					lineText = lineText.trim();

					if(matches.indexOf(result[0]) == -1) matches.push(result[0]); // Highlight these later

					if(showSurroundingLines) {
						rowsAbove = textAboveInludingResultRows.slice( -showSurroundingLines );
						var index = firstLineBreakAfterResult;
						if(fileContent.charAt(index) == "\r") index++;
						if(fileContent.charAt(index) == "\n") index++;
						rowsBeneath = [];
						for (var i=index; i<fileContent.length; i++) {
							if(fileContent.charAt(i) == "\n") {
								rowsBeneath.push(fileContent.slice(index, i).trim());
								index = i+1;
								if(rowsBeneath.length >= showSurroundingLines) break;
							}
						}

					}

					//console.log("localfs:localFindReplace: textAboveInludingResultRows=" + JSON.stringify(textAboveInludingResultRows));
					//console.log("localfs:localFindReplace: rowsAbove=" + JSON.stringify(rowsAbove));

					console.log("localfs:localFindReplace:searchFile Found " + result[0] + " on index=" + result.index + " lastIndex=" + result.lastIndex + " showSurroundingLines=" + showSurroundingLines + " lineNr=" + lineNr + " in file=" + filePath);

					var foundInFile = {
						id: searchSessionId,
						text: result[0],
						lineText: lineText,
						index: result.index,
						lineNr: lineNr,
						file: filePath,
						rowsAbove: rowsAbove,
						rowsBeneath: rowsBeneath,
						regExp: myRe.toString()
					};

					if(replaceWith) {
						foundInFile.replaceWith = replaceWith;
						// Run replace op on client side, not twice here.
						//foundInFile.replacedWith = result[0].replace(myRe, replaceWith);
					}

					foundInFileCallback(foundInFile);
					
				}

				if(replaceWith) {

					console.log("localfs:localFindReplace: Replacing in file: " + filePath);

					fileContent = fileContent.replace(myRe, replaceWith);

					localWriteFile(filePath, fileContent, function writeFile(err) {
						if(err) return abortError(err);

						filesBeingSearched--;
						totalFilesSearched++;
						doneMaybe();
					});

				}
				else {
					filesBeingSearched--;
					totalFilesSearched++;
					doneMaybe();
				}


			});
		}

		function doneFinish(msg) {
			if(done) throw new Error("localfs:localFindReplace: Already done! doneReason=" + doneReason + " doneStack=" + doneStack + "\n\n\n");

			done = true;
			doneStack = (new Error()).stack;
			doneReason = msg;

			if(msg == undefined) {
				var totalTime = Math.round(((new Date()) - searchBegin) / 10) / 100;
				msg = "Found " + totalMatches + " match(es) in " + totalFiles + "/" + totalFilesFound + " file(s) searched in " + totalTime + "s.\n";
			}

			findReplaceInFilesCallback(null, {msg: msg, matches: matches});
			findReplaceInFilesCallback = null;

		}

		function aborted() {
			console.log("Aborting file search/replace");

			var msg = "Search was canceled! "
			var totalTime = Math.round(((new Date()) - searchBegin) / 10) / 100;
			msg = "Found " + totalMatches + " match(es) in " + totalFiles + "/" + totalFilesFound + " file(s) searched in " + totalTime + "s.\n";

			doneFinish(msg);
		}

		function abortError(err) {
			if(findReplaceInFilesCallback) {
				findReplaceInFilesCallback(err);
				findReplaceInFilesCallback = null;
			}
			done = true;
		}

		function sendProgress() {
			if(typeof progressCallback != "function") return;

			var now = new Date();
			if(now - lastProgress > progressInterval) {
				progressCallback({
						totalFoldersToSearch: totalFoldersToSearch,
						totalFoldersSearched: totalFoldersSearched,
						foldersBeingSearched: foldersToRead,
						fileQueue: fileQueue.length,
						totalFiles: totalFiles,
						totalFilesSearched: totalFilesSearched,
						filesBeingSearched: filesBeingSearched,
						totalMatches: totalMatches,
						maxTotalMatches: maxTotalMatches,
						searchString: searchString,
						folder: searchPath
				});
				lastProgress = now;
			}
		}
	}

	function localFindFiles(options) {
		/*
			["folder", "name", "useRegexp", "maxResults", "ignore", "allowGlob", "found", "finish", "glob", "progress"];
		*/

		console.log("localfs:localFindFiles! options=" + JSON.stringify(options));

		var folders = UTIL.getFolders(options.folder);

		var foldersToSearch = [folders.pop()];
		var results = 0;
		var aborted = false;
		var foldersBeingSearched = 0;
		var filesFound = 0;
		var maxConcurrency = 1;
		var totalFoldersToSearch = 1;
		var totalFoldersSearched = 0;

		if(!options.useRegexp) options.name = UTIL.escapeRegExp(options.name);
		var reName = new RegExp(options.name, "ig");

		search(foldersToSearch.pop());

		return {
			abort: function(abortCallback) {
				aborted = true;
				var json = {foldersBeingSearched: foldersBeingSearched}
				console.log("localfs:localFindFiles:abort! " + JSON.stringify(json));
				abortCallback(null, json);
			}
		}

		function search(pathToFolder) {
			if(typeof pathToFolder != "string") throw new Error("Something went wrong: pathToFolder=" + pathToFolder);

			console.log("localfs:localFindFiles:search! pathToFolder=" + pathToFolder);
			if(aborted) return finish();

			foldersBeingSearched++;
			getDirectoryHandle(pathToFolder, function(err, dirHandle) {
				if(err) return error(err);

				listLocalDir(pathToFolder, dirHandle, function(err, fileList) {
					if(err) return error(err);

					// type, name, path, size, date

					for (var i=0; i<fileList.length; i++) {
						if(fileList[i].type == "d") {
							totalFoldersToSearch++;
							foldersToSearch.push(fileList[i].path);
						}
						else {
							match(fileList[i].name, fileList[i].path);
						}
					}

					foldersBeingSearched--;
					totalFoldersSearched++;
					
					doneMaybe();

				});
			});
		}

		function doneMaybe() {
			console.log("localfs:localFindFiles:doneMaybe? aborted=" + aborted + " foldersBeingSearched=" + foldersBeingSearched + " maxConcurrency=" + maxConcurrency + " foldersToSearch.length=" + foldersToSearch.length);
			if(aborted) return finish();
			if(foldersBeingSearched >= maxConcurrency) return;
			if(foldersBeingSearched == 0 && foldersToSearch.length == 0) {
				if(options.allowGlob == false) return finish();
				if(folders.length == 0) return finish();

				var parentFolder = folders.pop();

				console.log("localfs:localFindFiles:doneMaybe? glob! parentFolder=" + parentFolder);

				if(typeof options.glob == "function") {
					options.glob(parentFolder);
				}

				totalFoldersToSearch++;
				foldersToSearch.push(parentFolder);
			}
			
			if(foldersToSearch.length > 0) search(foldersToSearch.pop());

		}

		function match(name, path) {
			if(aborted) return; // Don't call any callbacks after aborting!

			var matchArr = name.match(reName);
			if(matchArr) {
				console.log("localfs:localFindFiles:match! matchArr=" + JSON.stringify(matchArr));
				options.found({
					path: path,
					match: matchArr,
					totalFoldersToSearch: totalFoldersToSearch,
					totalFoldersSearched: totalFoldersSearched,
					foldersBeingSearched: foldersBeingSearched,
					found: filesFound,
					maxResults: options.maxResults,
				});
				filesFound++;
				if(options.maxResults && filesFound >= options.maxResults) {
					aborted = true;
					foldersBeingSearched = 0;
					finish();
				}
			}
		}
	

		function error(err) {
			finish(err);
			aborted = true;
		}

		function finish(err) {
			if(typeof options.finish == "function") {
				options.finish(err || null, {buzy: foldersBeingSearched > 0});
			}
			options.finish = null; // So that it's not called again
			aborted = true; // Just to make sure
		}

	}


	function verifyNativeFileSystemPermission(fileHandle, mode, callback) {
		
		console.warn("localfs:verifyNativeFileSystemPermission!", fileHandle);

		if(typeof mode == "function") {
			callback = mode;
			mode = "readwrite";
		}

		if(typeof fileHandle != "object") throw new Error("verifyNativeFileSystemPermission: Does not seem like a fileHandle: fileHandle=" + fileHandle + " typeof fileHandle = " + (typeof fileHandle));
		if(typeof fileHandle.queryPermission != "function") {
			console.log(fileHandle);
			throw new Error("verifyNativeFileSystemPermission: File handle does not have a queryPermission function: " + fileHandle);
		}

		var options = {mode: mode};

		// Check if permission was already granted
		fileHandle.queryPermission(options).then(function fileHandlePermissionQueried(permission) {
			console.log("localfs:verifyNativeFileSystemPermission: permission=" + permission);
			if(permission == "granted") {
				CB(callback, null);
			}
			else {
				// Request permission
				requestPermission(callback);
			}
		}, function error(err) {
			console.log("localfs:verifyNativeFileSystemPermission: err.code=" + err.code + " err.message=" + err.message);
			CB(callback, err);
		});

		function requestPermission(callback) {
			console.log("localfs:verifyNativeFileSystemPermission: requestPermission: ...");
			fileHandle.requestPermission(options).then(function(permission) {

				console.log("localfs:verifyNativeFileSystemPermission: permission=" + permission);

				if(permission == "granted") {
					CB(callback, null);
				}
				else {
					var error = new Error("You did not grant permission to " + options.mode + " the file!");
					error.code = "PERMISSION_DENIED";
					CB(callback, error);
				}

			}, function error(err) {
				console.warn("localfs:verifyNativeFileSystemPermission: requestPermission: err.code=" + err.code + " err.message=" + err.message);
				if(err.code == "18") {
					confirmBox("Click the OK button below in order to get a permission prompt for " +
					fileHandle.name, ["OK", "Cancel"], function(answer) {
						if(answer == "OK") {
							requestPermission(callback);
						}
						else {
							var error = new Error("You did not want to be asked for permission for native filesystem handle!");
							CB(callback, error);
						}
					});
				}
				else CB(callback,err);
			});
		}
	}

	function openNativeFileSystemFileHandleDb(callback) {
		if(nativeFileSystemFileHandleDb) return callback(null, nativeFileSystemFileHandleDb);

		if(nativeFileSystemFileHandleDb === 0) {
			// Waiting for it to be opened...
			nativeFileSystemFileHandleDbWaitList.push(callback);
			return;
		}

		nativeFileSystemFileHandleDb = 0; // About to be opened

		nativeFileSystemFileHandleDbWaitList.push(callback);

		var nativeFileSystemFileHandleDbVersion = 2; // Increment after making changes to the db structure!
		var requestToUseDb = indexedDB.open("nativeFileSystemFileHandleDb", nativeFileSystemFileHandleDbVersion);
		requestToUseDb.onerror = function(event) {
			nativeFileSystemFileHandleDb = false; // We have tried opening it but failed
			console.warn("localfs: Failed to open indexedDB for nativeFileSystemFileHandleDb");

			var error = new Error(event.target);
			nativeFileSystemFileHandleDbWaitList.forEach(function(cb) {
				cb(null, error);
			});
			nativeFileSystemFileHandleDbWaitList.length = 0;
		};
		requestToUseDb.onsuccess = function(event) {
			nativeFileSystemFileHandleDb = event.target.result;
			//console.log("localfs: Successfully opened indexedDB for nativeFileSystemFileHandleDb");

			nativeFileSystemFileHandleDbWaitList.forEach(function(cb) {
				cb(null, nativeFileSystemFileHandleDb);
			});
			nativeFileSystemFileHandleDbWaitList.length = 0;
		};

		requestToUseDb.onupgradeneeded = function(event) {
			var db = event.target.result;

			//console.log("localfs: onupgradeneeded triggered for indexedDB nativeFileSystemFileHandleDb");

			var objectStore = db.createObjectStore("handles", { keyPath: "path" }); // Increment nativeFileSystemFileHandleDbVersion if you change these!

			objectStore.transaction.oncomplete = function(event) {
				//console.log("localfs: Finished creating indexedDB nativeFileSystemFileHandleDb!");
			};
		};

	}

	function saveHandleToIndexedDB(path, handle) {
		console.log("localfs: Saving handle in indexedDB: path=" + path + " handle=" + handle + " typeof handle = " + (typeof handle));

		openNativeFileSystemFileHandleDb(function(err, db) {
			if(err) return console.error(err);

			var transaction = db.transaction(["handles"], "readwrite");
			var objectStore = transaction.objectStore("handles");
			transaction.oncomplete = function(event) {
				console.log("localfs: handle=" + handle + " for path="+ path + " saved in indexedDB! ");
			};
			transaction.onerror = function(event) {
				console.error("localfs: Failed to save handle=" + handle + " for path="+ path + " in indexedDB!");
			};
			// Use put in case for some reaso (crash?) it already exist in the indexedDB (we want to save the latest handle)
			objectStore.put({path: path, handle: handle});

		});
	}

	function readHandleFromIndexedDB(path, callback) {

		console.warn("localfs:readHandleFromIndexedDB: path=" + path);

		if(typeof path != "string") throw new Error("readHandleFromIndexedDB: First parameter path=" + path + " needs to be the file path!");
		if(typeof callback != "function") throw new Error("readHandleFromIndexedDB: Second parameter needs to be a callback function!");

		openNativeFileSystemFileHandleDb(function handleDbOpened(err, db) {
			var transaction = db.transaction(["handles"]);
			var objectStore = transaction.objectStore("handles");
			var request = objectStore.get(path);
			request.onerror = function handleDbError(err) {
				// Handle errors!
				console.error(err);
				callback(new Error("Error when reading file handle from IndexedDB: " + err.message));
			};
			request.onsuccess = function handleDbSuccess() {
				if(typeof request.result == "undefined") {
					var error = new Error("No result in request to indexedDB when reading file handle for path=" + path + " request=" + JSON.stringify(request));
					error.code = "ENOENT";
					return callback(error);
				}

				console.log("localfs: Got handle for path=" + path + " request.result=", request.result);

				var handle = request.result.handle;
				callback(null, handle);
			};
		});
	}

	function removeHandleFromIndexedDB(path) {
		openNativeFileSystemFileHandleDb(function(err, db) {
			if(err) return console.error(err);

			var transaction = db.transaction(["handles"], "readwrite");
			var objectStore = transaction.objectStore("handles");
			transaction.oncomplete = function(event) {
				console.log("localfs:removeHandleFromIndexedDB: handle for path="+ path + " removed from indexedDB! ");
			};
			transaction.onerror = function(event) {
				console.error("localfs:removeHandleFromIndexedDB: Failed to remove handle for path="+ path + " in indexedDB!");
			};
			
			objectStore.delete(path);
		});
	}

	function openLocalDir() {
		localDirDialog(function(err, dirHandle) {
			if(err) return alertBox("Could not open local directory! Error: " + err.message);

			var dirPath = protocol + "://" + dirHandle.name + "/";
			directoryHandles[dirPath] = dirHandle;
			saveHandleToIndexedDB(dirPath, dirHandle);

			EDITOR.fileExplorer(dirPath);
			EDITOR.changeWorkingDir(dirPath);
			EDITOR.openFileTool({directory: dirPath});

		});
	}

	function listLocalDir(pathToFolder, dirHandle, callback) {
		/*
			Returns all files in a directory as an array. Each item is an object with these properties:

			type - string - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
			name - string - File or folder name
			path - string - Full path to file/folder
			size - float - The size of the entry in bytes.
			date - Date - The last modified date of the entry.
		*/

		console.log("listLocalDir!");

		console.log("listLocalDir: dirHandle=", dirHandle);

		if(typeof dirHandle != "object" || typeof dirHandle.values != "function") {
			return callback( new Error("Expected first parameter in listLocalDir to be a directory handle! dirHandle=" + dirHandle + " typeof " + (typeof dirHandle)) );
		}
		
		var dirIterator = dirHandle.values();
		var dirEntry;
		var list = [];
		var counter = 0;

		console.log("listLocalDir: dirIterator=", dirIterator);

		var promise = dirIterator.next();

		console.log("listLocalDir: promise=", promise);

		iterateNext(promise);

		function iterateNext(promise) {
			counter++;
			promise.then(function (dirIteratorItem) {
				counter--;

				var item = {};

				console.log("listLocalDir:iterateNext: dirIteratorItem=", dirIteratorItem);

				//console.log("listLocalDir:iterateNext: dirIteratorItem.value=", dirIteratorItem.value);
				//console.log("listLocalDir:iterateNext: dirIteratorItem.value.kind=", dirIteratorItem.value.kind);

				var value = dirIteratorItem.value;

				if(dirIteratorItem.done && value == undefined) return doneMaybe();

				var kind = value.kind;
				var name = value.name;

				item.name = name;

				if(kind == "directory") {
					item.type = "d";
					item.path = UTIL.joinPaths(pathToFolder, name + "/");
				}
				else if(kind == "file") {
					item.type = "-";
					counter++;
					value.getFile().then(function(fileObject) { // note: A file object, not a file handle!
						counter--;
						console.log("listLocalDir:iterateNext: fileObject=", fileObject);

						item.size = fileObject.size;

						item.date = new Date(fileObject.lastModified);
						item.path = UTIL.joinPaths(pathToFolder, fileObject.name);

						doneMaybe();

					}).catch(function(err) {
						CB( callback, new Error("Problem when listing local folder content for " + pathToFolder + "\nCOuld not get file infor for " + name + ". Error: " + err.message) );
					});
				}
				else throw new Error("Unknown kind=" + kind + " for " + name + " when listing local directory content in " + pathToFolder);

				list.push(item);

				if(!dirIteratorItem.done) iterateNext(dirIterator.next());

				doneMaybe();

			}).catch(function(err) {
				CB( callback, new Error("Problems iterating items in " + pathToFolder + "\nError: " + err.message) );
			});
		}
		
		function doneMaybe() {
			if(counter === 0) {
				CB(callback, null, list);
				callback = null;
			}
		}

		function error(err) {
			console.warn(err.message);
			if(callback) CB( callback, new Error("Unable to list local directory " + pathToFolder + "\nError: " + err.message) );
			callback = null;
		}
	}

	function localDirDialog(callback) {

		if(typeof window.showDirectoryPicker != "function") return callback(new Error("showDirectoryPicker nort supported in your browser=" + BROWSER));

		window.showDirectoryPicker().then(function(dirHandle) {
			CB(callback, null, dirHandle);
		}).catch(function error(err) {
			CB(callback, err);
		});
	}

	function localListFiles(pathToFolder, callback) {
		getDirectoryHandle(pathToFolder, function(err, directoryHandle) {
			if(err) return callback(err);
			listLocalDir(pathToFolder, directoryHandle, callback);
		});
	}

	function getDirectoryHandle(pathToFolder, callback) {
		console.warn( "localfs:getDirectoryHandle: pathToFolder=" + pathToFolder + " directoryHandles=" + JSON.stringify(Object.keys(directoryHandles)) );

		if(typeof pathToFolder != "string") throw new Error("getDirectoryHandle: First parameter pathToFolder=" + pathToFolder + " needs to be a path to a folder!");

		var errorWithProperCallStack = new Error();

		if( directoryHandles.hasOwnProperty(pathToFolder) ) {
			console.log("localfs:getDirectoryHandle: Handle for pathToFolder=" + pathToFolder + " exist in directoryHandles!");
			var dirHandle = directoryHandles[pathToFolder];

			//return callback(null, dirHandle);

			verifyNativeFileSystemPermission(dirHandle, "readwrite", function verifiedDirHandlePermission(err) {
				if(err) callback(err);
				else callback(null, dirHandle);
			});
			return;
		}
		
		console.warn("localfs:getDirectoryHandle: Reading handle from IndexedDB...");
		readHandleFromIndexedDB(pathToFolder, function handleReadFromIndexedDB(err, dirHandle) {
			if(err) {
				var folders = UTIL.getFolders(pathToFolder);
				if(folders.length > 1) {
					// Ask the parent folder if we can get a directory handle from it
					var parentFolder = folders[folders.length-2];
					// note: Recursion!
					return getDirectoryHandle(parentFolder, function gotDirHandleFromParentDirMaybe(err, parentDirHandle) {
						if(err) return callback( new Error("Could not get a directory handle for " + pathToFolder + " nor from the parent folders. Error: " + err.message) )
						
						var folderName = UTIL.getFolderName(pathToFolder);
						parentDirHandle.getDirectoryHandle(folderName).then(function getDirHandleFromParentDirSuccess(dirHandle) {
							CB(callback, null, dirHandle);
						}).catch(function(err) {
							CB(callback, new Error("parentFolder=" + parentFolder + " could not give us a directory handle! Error: " + err.message));
						});
					});
				}

				errorWithProperCallStack.message = "Unable to find a directory handle for pathToFolder=" + pathToFolder + "\nError: " + err.message + "";
				return callback(errorWithProperCallStack);
			}

			verifyNativeFileSystemPermission(dirHandle, "readwrite", function(err) {
				if(err) callback(err);
				else {

					directoryHandles[pathToFolder] = dirHandle;
					console.log("localfs:getDirectoryHandle: Updated directoryHandles=" + JSON.stringify(Object.keys(directoryHandles)) );

					callback(null, dirHandle);

				}
			});
		});
	}

	function openLocalFile(directory) {

		if(directory instanceof File) directory = UTIL.getDirectoryFromPath(directory.path);

		//console.log("localfs: Telling the editor to open the file dialog window ...");
		localFileDialog(directory, function after_dialog_open_file(err, filePath, content) {
			if(err) return alertBox("Could not open local file! Error: " + err.message);

			//console.log("localfs: filePath=" + filePath);
			//console.log("localfs: content=" + content);

			//console.log("localfs: File was selected from file dialog: " + filePath + "\nTelling the editor to open it up for editing ...")

			var openFileOptions = {
				//show: true // Why show the file ? It means we can't tab away for it for 5 seconds! Users might find that annoying!
				isSaved: true,
				savedAs: true,
				changed: false
			};

			EDITOR.openFile(filePath, content, openFileOptions, function after_open_file(err, file) {  // path, content, callback

				if(err) throw err;
				
				EDITOR.dashboard.hide();

				EDITOR.renderNeeded();

				//console.log("localfs: File ready for editing");

			});
		});
	}

	function localFileDialog(defaultPath, callback) {
		/*
			Brings up the OS file select dialog window.
			File path is then passed to the callback function.
		*/

		if(typeof defaultPath == "function" && callback == undefined) {
			callback = defaultPath;
			defaultPath = undefined;
		}
		else if(typeof defaultPath != "undefined" && typeof defaultPath != "string") throw new Error("defaultPath=" + defaultPath + " should be undefined or a string (path to a folder): " + defaultPath); 

		if(typeof callback != "function") throw new Error("localfs:localFileDialog: Second (or first) parameter must be a callback function!");

		console.log("localfs:localFileDialog: Bringing up the file open dialog ...");

		if(typeof window.showOpenFilePicker == "function") {
			console.log("localfs:localFileDialog: Using native file system API!");

			window.showOpenFilePicker().then(function(fileHandle) {

				// todo: Handle many files
				fileHandle = fileHandle[0];

				console.log("localfs:localFileDialog: fileHandle=", fileHandle);

				console.log("localfs:localFileDialog: typeof fileHandle.getFile=" + (typeof fileHandle.getFile) + "");

				fileHandle.getFile().then(function readText(localFile) {

					console.log("localfs:localFileDialog: localFile=", localFile);

					localFile.text().then(function(fileContent) {
						var filePath = protocol + "://" + fileHandle.name;

						fileHandles[filePath] = fileHandle;

						CB(callback, null, filePath, fileContent, fileHandle);
					});
				});
			}).catch(function(err) {
				var error = new Error("Something went wrong when using the native file system API to open a file: " + err.message);
				CB(callback, err);
			});


			return HANDLED;
		}
		//else console.warn("localfs: Local file system API not supported in " + BROWSER);


		EDITOR.fileOpenCallback = callback;

		var fileOpen = document.getElementById("fileInput");

		//if(defaultPath == undefined) defaultPath = EDITOR.workingDirectory;

		console.log("localfs:localFileDialog: defaultPath=" + defaultPath);

		if(defaultPath == undefined) defaultPath = UTIL.getDirectoryFromPath(undefined);
		else {

			var lastChar = defaultPath.substr(defaultPath.length-1);

			//console.log("localfs: lastChar of defaultPath=" + lastChar);

			if(! (lastChar == "/" || lastChar == "\\")) {
				console.warn("localfs: defaultPath, bacause ending with '" + lastChar + "', doesn't seem to be a directory:" + defaultPath);
			}
			EDITOR.setFileOpenPath(defaultPath);
		}

		fileOpen.click(); // Bring up the OS path selector window

		return HANDLED;
	}


})();