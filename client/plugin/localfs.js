/*

	Native file system API: https://web.dev/file-system-access/

	todo: Implement directory access so we can create new files, delete files, and list directory content!!

	showDirectoryPicker()

*/
(function() {
	"use strict";

	var protocol = "local";

	var fileHandles = {}; // Temporarly store file handles
	var nativeFileSystemFileHandleDb; // For "permantely" storing file handles (able to read from the same file when browser is reopened) undefined means we have not yet tried to open it
	var nativeFileSystemFileHandleDbWaitList = [];
	var windowMenuOpenLocal;

	EDITOR.plugin({
		desc: "Web Native File System Access",
		load: function loadWebNativeFs() {

			console.log("localfs: loadWebNativeFs!");

			EDITOR.addProtocol(protocol, {list: localListFiles, read: localReadFile, write: localWriteFile, hash: localHashFromDisk, size: localFileSizeOnDisk});

			EDITOR.on("fileOpen", nativeFileOpen, 1);
			EDITOR.on("fileClose", nativeFileClose, 1);
			EDITOR.on("openFileTool", openLocalFileTool);
			EDITOR.on("localFileDialog", localFileDialogTool);

			var charO = 79;
			EDITOR.bindKey({desc: "Open a local file using native file select dialog", charCode: charO, combo: CTRL + SHIFT, fun: openLocalFileKeyboardShortcut});

			windowMenuOpenLocal = EDITOR.windowMenu.add(S("open_local"), [S("File"), 1], openLocalFile, openLocalFileKeyboardShortcut);

		},
		unload: function unloadWebNativeFs() {

			console.log("localfs: unloadWebNativeFs!");

			EDITOR.removeProtocol(protocol);

			nativeFileSystemFileHandleDb = undefined;
			nativeFileSystemFileHandleDbWaitList.length = 0;

			EDITOR.removeEvent("fileOpen", nativeFileOpen, 1);
			EDITOR.removeEvent("fileClose", nativeFileClose, 1);
			EDITOR.removeEvent("openFileTool", openLocalFileTool);
			EDITOR.removeEvent("localFileDialog", localFileDialogTool);

			EDITOR.unbindKey(openLocalFileKeyboardShortcut);

			EDITOR.windowMenu.remove(windowMenuOpenLocal);
		},
		order: 100 // Load early 
	});

	function localFileDialogTool(file, ev) {
		openLocalFileKeyboardShortcut(file);
		return true;
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
			console.log("localfs: Saving fileHandle in indexedDB: path=" + path + " fileHandle=" + fileHandle + " typeof fileHandle = " + (typeof fileHandle));

			openNativeFileSystemFileHandleDb(function(err, db) {
				if(err) return console.error(err);

				var transaction = db.transaction(["fileHandles"], "readwrite");
				var objectStore = transaction.objectStore("fileHandles");
				transaction.oncomplete = function(event) {
					console.log("localfs: nativeFileSystemFileHandle=" + fileHandle + " for path="+ file.path + " saved in indexedDB! ");
				};
				transaction.onerror = function(event) {
					console.error("localfs: Failed to save nativeFileSystemFileHandle for path="+ file.path + " in indexedDB!");
				};
				// Use put in case for some reaso (crash?) it already exist in the indexdb (we want to save the latest handle)
				objectStore.put({path: file.path, handle: fileHandle, size: file.getFileSize()});

			});
		}
		else {
			console.warn("localfs: No fileHandle found for path=" + path + " in Object.keys(fileHandles)=" + Object.keys(fileHandles));
	}
	}

	function getHandle(path, callback) {

		console.warn( "localfs:getHandle: path=" + path + " fileHandles=" + JSON.stringify(Object.keys(fileHandles)) );

		var errorWithProperCallStack = new Error();

		if( fileHandles.hasOwnProperty(path) ) {
			console.warn("localfs:getHandle: Handle exist in fileHandles!");
			var fileHandle = fileHandles[path];
			verifyNativeFileSystemPermission(fileHandle, "readwrite", function(err) {
				if(err) callback(err);
				else callback(null, fileHandle);
			});
			return;
		}

		console.warn("localfs:getHandle: Reading handle from IndexDb...");
		readFileHandleFromIndexDb(path, function(err, fileSize, fileHandle) {
			if(err) {
				errorWithProperCallStack.message = "Unable to find a fileHandle for path=" + path + "\nError: " + err.message + "\n(The file might still exist, but we need to ask the user for it, try EDITOR.openLocalFile)";
				return callback(errorWithProperCallStack);
			}

			verifyNativeFileSystemPermission(fileHandle, "readwrite", function(err) {
				if(err) callback(err);
				else {

					fileHandles[path] = fileHandle;
					console.log("localfs:getHandle: Updated fileHandles=" + JSON.stringify(Object.keys(fileHandles)) );

					callback(null, fileHandle);
			
				}
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

	function localListFiles(pathToFolder, callback) {

		callback(new Error("File list not yet implemented for Local File system!"));

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

		getHandle(path, function(err, fileHandle) {
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

		if(typeof inputBuffer == "function" && saveToDiskCallback == undefined) {
			saveToDiskCallback = inputBuffer;
			inputBuffer = undefined;
		}
		else if(typeof encoding == "function" && saveToDiskCallback == undefined) {
			saveToDiskCallback = encoding;
			encoding = undefined;
		}
		else if(typeof timeout == "function" && saveToDiskCallback == undefined) {
			saveToDiskCallback = timeout;
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

		getHandle(path, function gotHandle(err, fileHandle) {
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
				if(callback) CB(callback, err);
				else alertBox(err.message); // Can't throw inside a promise chain
			});
		});
	}

	function localHashFromDisk(path, callback) {
		console.log("localfs:localHashFromDisk: path=" + path);

		getHandle(path, function(err, fileHandle) {
			if(err && err.code == "PERMISSION_DENIED") return alertBox(err.message);
			else if(err) throw err;

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

		getHandle(path, function(err, fileHandle) {
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


	function verifyNativeFileSystemPermission(fileHandle, mode, callback) {
		
		console.warn("nativefs:verifyNativeFileSystemPermission!");

		if(typeof mode == "function") {
			callback = mode;
			mode = "readwrite";
		}

		if(typeof fileHandle != "object") throw new Error("Does not seem like a fileHandle: fileHandle=" + fileHandle + " typeof fileHandle = " + (typeof fileHandle));

		var options = {mode: mode};

		// Check if permission was already granted
		fileHandle.queryPermission(options).then(function(permission) {
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

		var nativeFileSystemFileHandleDbVersion = 1; // Increment after making changes to the db structure!
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

			var objectStore = db.createObjectStore("fileHandles", { keyPath: "path" });

			objectStore.transaction.oncomplete = function(event) {
				//console.log("localfs: Finished creating indexedDB nativeFileSystemFileHandleDb!");
			};
		};

	}

	function readFileHandleFromIndexDb(path, callback) {

		console.warn("localfs:readFileHandleFromIndexDb: path=" + path);

		if(typeof path != "string") throw new Error("readFileHandleFromIndexDb: First parameter needs to be the file path!");
		if(typeof callback != "function") throw new Error("readFileHandleFromIndexDb: Second parameter needs to be a callback function!");

		openNativeFileSystemFileHandleDb(function(err, db) {
			var transaction = db.transaction(["fileHandles"]);
			var objectStore = transaction.objectStore("fileHandles");
			var request = objectStore.get(path);
			request.onerror = function(err) {
				// Handle errors!
				console.error(err);
				callback(new Error("Error when reading file handle from indexDb: " + err.message));
			};
			request.onsuccess = function() {
				console.log("localfs: Got file handle etc for path=" + path + " request.result=", request.result);
				if(typeof request.result == "undefined") {
					var error = new Error("No result in request when reading file handle for path=" + path + " request=" + JSON.stringify(request));
					error.code = "ENOENT";
					return callback(error);
				}

				var fileSize = request.result.size;
				var fileHandle = request.result.handle;
				callback(null, fileSize, fileHandle);
			};
		});
	}

	function openLocalFile(directory) {

		if(directory instanceof File) directory = UTIL.getDirectoryFromPath(directory.path);

		//console.log("localfs: Telling the editor to open the file dialog window ...");
		localFileDialog(directory, function after_dialog_open_file(err, filePath, content) {
			if(err) throw err;

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

	function openLocalFileTool(options) {
		// Only answer on openFileTool events if we are running locally/"native"
		if(EDITOR.user.homeDir == "/") return false;

		var directory = options.directory;

		openLocalFile(directory);

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


			return true;
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

		return true; // true means we handled it
	}


})();