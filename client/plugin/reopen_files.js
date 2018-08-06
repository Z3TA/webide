(function() {
	
	"use strict";
		
	/*
		1. Open up the files from last time, when opening the EDITOR.
		
		2. Save a backup on each file when it close, and on regular intervals (incase the editor crash)
		Offer to load the backup file if it's gone or empty, or unsaved.
		
		
		Reset from bricket state:
		EDITOR.localStorage.removeItem("openedFiles")
	
		Problem: How to do regression tests for this plugin !?
		
		
	*/

	if(QUERY_STRING["embed"]) return;
	
	
	var fileDelimiter = ";"; // Used to separate the file paths in the openedFiles string

	var saveStateInterval = 5000;

	var saveStateIntervalTimer;

	var allFilesOpenedNeverCalled = true;

	var copyOfEditorFiles = [];
	var insaneBugCatcherInterval;

	var firstRun = true;
	
	var serverUrl, serverUser;
	
	var reopenFilesCalled = false;
	var allFilesOpenedAlreadyCalled = false;
	
	EDITOR.plugin({
		desc: "Open up the files from last session", 
		order: 2000, // Load after the parser and other stuff that has fileOpen event listener
		load: function loadReopenFilesPlugin() {
			
			reopenFilesCalled = false;
			allFilesOpenedAlreadyCalled = false;
			
			CLIENT.on("loginSuccess", reopenFiles);
			/*
				problem: storageReady can be called many times, for example if the user re-login (as another user)
				
				We can't (re)open files from disk when running in the browser, unless connected to the server.
				So we need to be connected to the editor server for this plugin to work.
				
				Solution: Close all unsaved files when connected to a different url or user
			*/
			
			/*
				Swithing back to using localStorage
				* Too much spam to server
				* Don't have to depend on the server
				* Saves bandwith
				
				We still need to wait until we are connected to the server though (in order to get the files)
			
			*/
			
		},
		unload: function unloadReopenFilesPlugin() {
			
			CLIENT.removeEvent("loginSuccess", reopenFiles);
		
			clearInterval(insaneBugCatcherInterval);
			
			EDITOR.removeEvent("fileOpen", addToOpenedFiles);
			EDITOR.removeEvent("fileClose", removeFromOpenedFiles);
			EDITOR.removeEvent("exit", saveStateOfOpenFiles);
			EDITOR.removeEvent("afk", stopSavingState);
			EDITOR.removeEvent("btk", continueSavingState);
			
			clearInterval(saveStateIntervalTimer);
			
		}
		
	});
	

	
	function reopenFiles() {
console.log("reopenFiles!");
		
		if(reopenFilesCalled) {
			// Happens when you get disconnected, and storageReady is called.
			console.warn("reopenFiles called twice!");
			return;
		}
		
		reopenFilesCalled = true;
		
		if(!EDITOR.localStorage) throw new Error("EDITOR.localStorage not available!");
		
		console.log("reopenFiles: serverUrl=" + serverUrl + " CLIENT.url=" + CLIENT.url + " serverUser=" + serverUser + " EDITOR.user=" + EDITOR.user);
		
		if(serverUrl != CLIENT.url || serverUser != EDITOR.user) {
			
			EDITOR.removeEvent("exit", saveStateOfOpenFiles);
			clearInterval(saveStateIntervalTimer);
			clearInterval(insaneBugCatcherInterval);

			for(var file in EDITOR.files) {
				if(file.isSaved) EDITOR.closeFile(file);
			}
		}
		
		serverUrl = CLIENT.url;
		serverUser = CLIENT.user;
		
		if(firstRun) {
			EDITOR.on("fileOpen", addToOpenedFiles, 1);
			EDITOR.on("fileClose", removeFromOpenedFiles, 1);
			
			EDITOR.on("afk", stopSavingState);
			EDITOR.on("btk", continueSavingState);
		}
		
		firstRun = false;
		
		reopenFilesMain(function allFilesHaveReopened() {
			// Save state when exiting the editor
			EDITOR.on("exit", saveStateOfOpenFiles);
			
			// Save state on regular intervals in case the editor crashes (or refresh)
			console.log("Started saveStateIntervalTimer");
			saveStateIntervalTimer = setInterval(saveStateOfOpenFiles, saveStateInterval);
			
			// Catch bugs
			insaneBugCatcherInterval = setInterval(insaneBugCatcher, 1000);
			
			console.log("reopenFiles: All files reopened!");
			});
		}
	
	function reopenFilesMain(reopenFilesCallback) {
		
		console.log("reopenFiles ... reopenFilesMain");
		
		/*
			What might have happaned:
			* User closed the editor
			* User logged in as another user or on another url
			* The editor had a spectacular crash
			
			so try to recover the last session ...
		*/
		
		var setCurrent = "";
		var files;
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
			if(err) throw err;
			
			if(openedFilesString == null) openedFilesString = "";
			
			openedFilesString = removeDublicates(openedFilesString);
			
			findBugs(false, function(err, openedFilesString) {
				if(err) throw err;
				files = openedFilesString.split(fileDelimiter);
				console.log("files=" + JSON.stringify(files));
				
				if(openedFilesString.length > 0) { // openedFilesString is a string with path's separated by fileDelimiter
					console.log("Opening " + files.length + " files ...");
					
					// Note: the file tab plugin will sort the tabs by file.order every time a new file is opened!
					for(var i=0; i<files.length; i++) {
						// Problem: The editor might already have the file open, and we are here because of a server reconnect
						if(!EDITOR.files.hasOwnProperty(files[i])) {
							console.log("gonna open files[" + i + "]=" + files[i]);
							openFile(files[i], fileInListOpened);
						}
					}
				}
				else {
					allFilesOpened();
				}
			});
			
		});
	
		function fileInListOpened(err, file, wasCurrent) {
			
			if(err) {
				if(err.code === 'ENOENT') {
					// File did not exist, and the user did not want to load the last state. 
					// It has also been removed from openedFiles storage
				}
				else console.warn(err.message);
				
				return compareAndDone();
				}
			
			console.log("we now have it open: file.path=" + file.path);
			
			if(wasCurrent) setCurrent = file.path;
			
			// Is all files we want to open opened!?
			compareAndDone();
			
			function compareAndDone() {
				
				EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
					if(openedFilesString == null) openedFilesString = "";
					var editorFiles = Object.keys(EDITOR.files).join(fileDelimiter);
					
					if(compareStringLists(editorFiles, openedFilesString, fileDelimiter)) {
						allFilesOpened();
					}
					else {
						console.log("editorFiles=" + editorFiles);
						console.log("openedFilesString=" + openedFilesString);
						console.warn("editorFiles and openedFilesString does not match!");
					}
				});
			}
		}
		
		function allFilesOpened() {
			
			allFilesOpenedNeverCalled = false;
			
			
			console.log("All files from last lession opened!");
			
			findBugs(true); // true == also check if the list match EDITOR.files
			
			console.log("setCurrent=" + setCurrent);
			
			
			if(setCurrent) {
				// Make the file with last state "open" the current file
				
				// Switch to this file
				EDITOR.showFile(EDITOR.files[setCurrent])
				
			}

			reopenFilesCallback();
			
			if(allFilesOpenedAlreadyCalled) throw new Error("allFilesOpenedAlreadyCalled=" + allFilesOpenedAlreadyCalled);
			allFilesOpenedAlreadyCalled = true;
		}
		
		
		
		
		function openFile(path, callback) {
			
			if(!callback) throw new Error("Internal error: Expected a callback!");
			
			var content;
			var notFound = false;
			var loadLastState = false;
			var file;
			var lastFileState;
			
			// Check if the file size and if it exist
			EDITOR.getFileSizeOnDisk(path, gotFileSize);
			
			function gotFileSize(getFileSizeError, fileSizeOnDisk) {
				
				// Decide if we should open the last saved state, or from the disk (or other protocol) ...
				
				console.log("Got fileSizeOnDisk=" + fileSizeOnDisk + " for path=" + path + "");
				
				if(getFileSizeError) {
					//if(err.code === 'ENOENT') {
					notFound = true;
					//}
					console.warn(getFileSizeError.message);
				}
				
				loadState(path, function(err, state) {
					lastFileState = state;
					if(err) throw err;
					if(lastFileState) {
						console.log("loadLastState=" + loadLastState);
						console.log("lastFileState.isSaved=" + lastFileState.isSaved);
						
						if(notFound && lastFileState.text != undefined && lastFileState.text != "") {
							// Only ask if we actually have the last state, otherwise just ignore that it's gone.
							// Don't ask if lastFileState.isSaved === false, because it will be loaded anyway if thats right.
							if(lastFileState.isSaved != false) {
								
								var strDoNothing = "Don't open it";
								var strLoadLastState = "Load last saved state";
								
								confirmBox("File not found:\n" + path, [strDoNothing, strLoadLastState], function(answer) {
									
									if(answer == strLoadLastState) loadLastState = true;
									open();
									
								});
								
								//loadLastState = confirm("File not found! Load last saved state?\npath=: " + path + "\n(" + getFileSizeError.message + ")");
							}
							else open();
						}
						// scenario: File has been emptied because of no disk space (*cough* Linux *cough*)
						else if(fileSizeOnDisk === 0 && lastFileState.text.length > 0 && lastFileState.isSaved) {
							// note: It will always load from last state if last state was not saved!
							
							var strItShouldBeEmty = "It should be emty";
							var strLoadLastState = "Load last saved state";
							
							confirmBox("File on disk is empty!\n" + path, [strItShouldBeEmty, strLoadLastState], function(answer) {
								
								if(answer == strLoadLastState) loadLastState = true;
								else if(answer == strItShouldBeEmty) loadLastState = false;
								open();
								
							});
							
							//loadLastState = confirm("File on disk is empty! Load last saved state instead? path=: " + path + "");
						}
						else open();
					}
					else open();
				});
				
				function open() {
					
					console.log("open file path=" + path);
					
					if(lastFileState) {
					
						if(loadLastState) lastFileState.isSaved = false; // Mark file as not saved. Because it was "Not found" or "Emty on disk"
						
						if( loadLastState || lastFileState.isSaved === false ) {
							// Open from temp
							console.warn("Loading last saved state for file path=" + path);
							content = lastFileState.text;
							
							if(typeof content != "string") {
								var contentError = new Error("lastFileState.text=" + lastFileState.text + " lastFileState.path=" + lastFileState.path + ". " + path + " will not be reopened!");
								console.warn(contentError.message);
								console.log(lastFileState);
								removeFromOpenedFiles(path, function(err) {
									if(err) throw err;
									callback(contentError, path, false);
								});
								return;
							}
							}
						else if(notFound) {
							console.log("The file (" + path + ") was not found and the user didn't want to load last state");
							// Do not open it! Remove from openedFiles
							
							removeFromOpenedFiles(path, function(err) {
								if(err) throw err;
								callback(getFileSizeError, path, false);
							});
							
							return; // Don't attempt to open the file
						}
						else if(lastFileState.isSaved && lastFileState.hash && lastFileState.text != undefined && lastFileState.text != "") {
							// Compare hashes to prevent losing data
							
							CLIENT.cmd("hash", {path: path}, function gotHash(err, hash) {
								
								if(hash != lastFileState.hash) {
									console.warn("The file on disk has changed! hash=" + hash + " lastFileState.hash=" + lastFileState.hash);
									lastFileState.isSaved = false;
									content = lastFileState.text;
								}
								
								EDITOR.openFile(path, content, fileReopened); 
								
							});
							
							return;
						}
						
					}
					console.log("Reopening file path=" + path +" typeof content=" + typeof content);
					
					EDITOR.openFile(path, content, fileReopened); 
				}
				
				
			}
			
			
			function fileReopened(openFileError, file) {
				
				if(file) {
				// Sanity check: In case EDITOR.openFile returns the wrong file
				if(file.path != path) throw new Error("File opened, but with another path: path=" + path + " file.path=" + file.path);
				}
				
				console.log("Got (Reopening) file from editor path=" + path + " file.path=" + (file ? file.path : "file=" + file));
				
				if(openFileError) console.log("fileReopened openFileError.path=" + openFileError.path);
				if(file) console.log("fileReopened file.path=" + file.path);
				
				var fileWasCurrentfile = false; // Was the file open (in view) last time we closed the editor
				
				var loadFilePart = false;
				
				if(openFileError) {
					console.error(openFileError.message);
					console.log(openFileError.stack);
					alertBox("Unable to reopen file:\n" + path + "\nError: " + openFileError.message);
					
					// Remove from opened files
					EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
						if(err) throw err;
						openedFilesString = removeFromStringList(openedFilesString, path, fileDelimiter);
						EDITOR.localStorage.setItem("openedFiles", openedFilesString, function(err) {
							if(err) throw err;
							callback(openFileError, file, false);
						});
						
					});
					return;
					}
				
				// Mark the file as saved, because we just opened it
				//file.isSaved = true;
				//file.savedAs = true;
				//No! We should use last state, from when the editor was closed.
				
				// The file path can change from an relative to absolute path when opening from disk
				if(path != file.path) {
					// Replace the path in opened files
					EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
						if(err) throw err;
						openedFilesString = removeFromStringList(openedFilesString, path, fileDelimiter);
						openedFilesString = addToStringList(openedFilesString, file.path, fileDelimiter);
						EDITOR.localStorage.setItem("openedFiles", openedFilesString, function(err) {
							if(err) throw err;
							
							// Change the state holder item
							EDITOR.localStorage.removeItem("state_" + path, function(err) {
								path = file.path;
								updateLastSate();
							});
						});
					});
				}
				else updateLastSate();
				
				function updateLastSate() {
					console.log("updateLastSate path=" + path);
				if(lastFileState) {
					console.log("lastFileState.partStartRow=" + lastFileState.partStartRow + "");
					
					if(lastFileState.partStartRow == undefined) lastFileState.partStartRow = 0;
					
					if(lastFileState.partStartRow > 0) loadFilePart = true;
					}
				
				if(loadFilePart) {
					file.loadFilePart(lastFileState.partStartRow, function setStateAtReopen() {
						
						console.log("setStateAtReopen");
						setLastState();
						callback(null, file, fileWasCurrentfile);
						
					});
					}
				else {
					setLastState();
					callback(null, file, fileWasCurrentfile);
				}
				}
				
				function setLastState() {
					
					if(lastFileState) { // <-- This is needed because we can't check a property of a undefined variable
						
						if(lastFileState.startColumn != undefined && lastFileState.startRow != undefined) {
							file.scrollTo(lastFileState.startColumn, lastFileState.startRow);
						}
						
						if(lastFileState.order !== undefined) file.order = lastFileState.order;
						if(lastFileState.mode !== undefined) file.mode = lastFileState.mode;
						if(lastFileState.savedAs !== undefined) file.savedAs = lastFileState.savedAs;
						if(lastFileState.hash !== undefined) file.hash = lastFileState.hash;
						
						if(lastFileState.isSaved !== undefined && content) {
							file.isSaved = lastFileState.isSaved;
						}
						
						if(lastFileState.currentFile === true) fileWasCurrentfile = true;
						
						if(lastFileState.caret !== undefined) {
							// Set the caret as it was
							console.log("Placing caret in file.path=" + file.path);
							// There can be errors, for example if the file has been changed by another program
							try {
								//file.caret = file.createCaret(lastFileState.caret.index, lastFileState.caret.row, lastFileState.caret.col);
								// Don't set the caret, move it, so events can fire
								file.moveCaret(undefined, lastFileState.caret.row, lastFileState.caret.col);
								//file.caret = file.createCaret(undefined, lastFileState.caret.row, lastFileState.caret.col);
							}
							catch(e) {
								console.warn("Unable to set last caret position (" + JSON.stringify(lastFileState.caret) + ") in: " + file.path + "\n" + e.message + "\n" + e.stack);
							}
						}
						
						console.log("Loaded old state for " + path + " file.startRow=" + file.startRow);
						
					}
					else {
						// If there is no last state: Assume the file is saved.
						file.isSaved = true;
						file.savedAs = true;
					}
					
					
				}				
				
			}
		}
	}
	
	function addToStringList(text, add, delimiter) {
		
		if(!UTIL.isString(text)) throw new Error("text is not a string!");
		if(!UTIL.isString(add)) throw new Error("add is not a string!");
		if(!UTIL.isString(delimiter)) throw new Error("delimiter is not a string!");
		
		var array = text.split(delimiter); // Convert string to array
		
		// Splitting an empty string will result in an array with ONE item (an empty string)
		if(array[0] == "") array.shift(); // Remove the first emty string
		
		array.push(add); // Add string to list
		
		text = array.join(delimiter); // Convert the array back to string (localStorage can only hold strings!!)
		
		// Makse sure the added string is in the text
		if(array.indexOf(add) == -1) throw new Error("The added string is not part of the array! add='" + add + "' text='" + text + "'");
		if(text.indexOf(add) == -1) throw new Error("The added string is not part of the text! add='" + add + "' text='" + text + "'");
		
		console.log("Added to string: " + add);
		
		return text;
	}
	
	function addToOpenedFiles(file) {
		// Called when the editor opens a new file
		
		if(!file.path) throw new Error("Argument need to be a file object!");
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
			if(err) throw err;
			if(openedFilesString == null) openedFilesString = "";
			if(openedFilesString.split(fileDelimiter).indexOf(file.path) != -1) {
				console.warn("File already in EDITOR.localStorage: " + file.path);
			}
			else {
				console.log(UTIL.getStack("Adding file to openedFiles path='" + file.path + "'"));
				
				console.log("List before=" + openedFilesString);
				openedFilesString = addToStringList(openedFilesString, file.path, fileDelimiter)
				console.log("List after=" + openedFilesString);
				
				EDITOR.localStorage.setItem("openedFiles", openedFilesString, function(err) {
					if(err) throw err;
					findBugs();
				});
			}
		});
	}
	
	function compareStringLists(str1, str2, delimiter) {
		// Compare two string lists, return true if they match, or false if they do not 
		
		if(str1.length != str2.length) return false; // Even if they are ordered differently, they still have to be the same size to match
		
		// Convert the strings to arrays
		var arr1 = str1.split(delimiter);
		var arr2 = str2.split(delimiter);
		
		if(arr1.length != arr2.length) return false; // One of the lists have more items
		
		// Splitting an emty string will create an array with One item (an emty string)
		if(arr1[0] == "") arr1.shift();
		if(arr2[0] == "") arr2.shift();
		
		if(arr1.length == 0 && arr2.length == 0) return true; // They are both emty!
		
		// Sort the arrays, as they are both string lists, they will be sorted the same
		arr1.sort();
		arr2.sort();
		
		// Compare each item
		for(var i=0; i<arr1.length; i++) {
			if(arr1[i] != arr2[i]) return false;
		}
		
		return true; // If we got this far, they are identical!
		}
	
	function removeFromStringList(text, remove, delimiter) {
		
		if(!UTIL.isString(text)) throw new Error("text is not a string!");
		if(!UTIL.isString(remove)) throw new Error("remove is not a string!");
		if(!UTIL.isString(delimiter)) throw new Error("delimiter is not a string!");
		
		var array = text.split(delimiter); // Convert text to array
		
		// Splitting an empty string will result in an array with ONE item (an empty string)
		if(array[0] == "") array.shift(); // Remove the first emty string
		
		var index = array.indexOf(remove); // Get the array index of the string to me removed
		
		if(index == -1) throw  new Error(  "remove='" + remove + "' not in array=" + JSON.stringify(array)  ) ;
		
		array.splice(index, 1); // Remove the string to be removed from the text
		
		// Check to see if the string has been removed from the array to keep sanity
		if(array.indexOf(remove) != -1) throw new Error("The string had more then one instance or was not removed. remove='" + remove + "' text='" + text + "'");
		
		text = array.join(delimiter); // Convert the array back to string (localStorage can only hold strings!!)
		
		console.log("Removed from string: " + remove);
		
		return text;
	}
	
	
	
	function removeFromOpenedFiles(filePath, callback) {
		// Called when the editor close a file
		if(filePath instanceof File) filePath = filePath.path;
		
		console.log(UTIL.getStack("Removing file from openedFiles path='" + filePath + "'"));
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
			if(err) {
				if(callback) return callback(err);
				else throw err;
			}
			
			console.log("List before=" + openedFilesString);
			openedFilesString = removeFromStringList(openedFilesString, filePath, fileDelimiter);
			console.log("List after=" + openedFilesString);
			EDITOR.localStorage.setItem("openedFiles", openedFilesString, function(err) {
				if(err) {
					if(callback) return callback(err);
					else throw err;
				}
				
				// Remove state
				EDITOR.localStorage.removeItem("state_" + filePath, function(err) {
					if(err) {
						if(callback) return callback(err);
						else throw err;
					}
					findBugs(false, function(err) {
						if(err) {
							if(callback) return callback(err);
							else throw err;
						}
						console.log("File removed from opened files: path=" + filePath);
						if(callback) callback(null);
					});
				});
			});
		});
	}
	
	function stopSavingState() {
		console.log("Stopping saveStateIntervalTimer because afk!");
		clearInterval(saveStateIntervalTimer);
		return true;
	}
	
	function continueSavingState() {
		console.log("Starting saveStateIntervalTimer because back to keyboard!");
		saveStateIntervalTimer = setInterval(saveStateOfOpenFiles, saveStateInterval);
		return true;
	}
	
	function saveStateOfOpenFiles(callback) {
		// Called when the editor closes, and at an time interval
		//console.log("saveStateOfOpenFiles!");
		//if(typeof callback != "function") throw new Error("Expected callback=" + callback + " to be a callback function!");
		
		if(!EDITOR.localStorage) throw new Error("EDITOR.localStorage not available!");
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
if(openedFilesString == null || openedFilesString == "") {
				console.warn("No open files!?");
				if(callback) callback(null);
				return;
			}
			else {
				findBugs(true, function(err, openedFilesString) { // true == also check if the list match EDITOR.files
					if(err) {
						if(callback) callback(err);
						return;
					}
					
					var openFiles = openedFilesString.split(fileDelimiter);
					var statesSaved = 0;
					
					// note: "".split(fileDelimiter).length == 1 !! (an empty string gives one item in the array)
					if(openedFilesString != "") {
						//console.log("openFiles.length=" + openFiles.length);
						for(var i=0; i<openFiles.length; i++) {
							//console.log("Saving state for openFiles[" + i + "]=" + openFiles[i] + " ...");
							saveSate(openFiles[i], stateSaved);
						}
					}
					else if(callback) callback(null);
					
					function stateSaved(err, path) {
						if(err) console.warn("Problem saving state for path=" + path + ": " + err.message);
						if(++statesSaved == openFiles.length) {
							//console.log("Done saving state!");
							if(callback) callback(null);
						}
					}
				});
			}
		});
	}
	
	function saveSate(path, callback) {
		if(typeof path != "string") throw new Error("path needs to be a string!")
		if(typeof callback != "function") throw new Error("callback needs to be a function!")
		
		//console.log("Saving state for: " + path);
		
		if(path.length == 0) {
			fundBugs(false, function(err, openedFilesString) {
				console.warn("Attempted to save state for a file without path!");
			console.log(new Error("saveState").stack);
			console.log("EDITOR.files=" + Object.keys(EDITOR.files).join(fileDelimiter));
				console.log("openedFilesString=" + openedFilesString);
				callback(err, path);
			});
			return;
		}
		
		var state = {};
		
		var file = EDITOR.files[path];
		
		if(!file) {
			// Possible reasons: it was renamed!? It should have been removed first!
			//console.warn("File not in EDITOR.files, was it renamed? open: " + file);
			//return;
			var err = new Error("File='" + path + "' not open! EDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files)) + "");
			
			return callback(err, path);
		}
		
		if(typeof file.text != "string") {
			var err = new Error("File (file.path=" + file.path + ") text is not a string! file.text=" + file.text)
			return callback(err, path);
		}
		
		if(file == EDITOR.currentFile) {
			state.currentFile = true;
		}
		else {
			state.currentFile = false;
		}
		
		state.isSaved = file.isSaved;
		state.savedAs = file.savedAs;
		state.startRow = file.startRow;
		state.partStartRow = file.partStartRow; // For loading big files as streams
		state.startColumn = file.startColumn;
		state.caret = file.caret;
		state.order = file.order;
		state.mode = file.mode;
		state.hash = file.hash;
		
		var sizeLimit = 2551000; // Max size for localStorage in Chrome is 2,551,000 characters (5 MB)
		
		if(file.text.length < sizeLimit) {
			// Always save the text, even if it's saved to disk. (it can be deleted, or disk space limit truncated it)
			state.text = file.text;
		}
		else {
			console.warn("Not saving state for " + file.path + " because it has " + file.text.length + " (over " + (sizeLimit-1) + ") characters");
		}
		
		// Hash the state so that we do not spam the server !?
		// Send only what actually changed !? Like moved cursor in a large document.
		// Use browsers localStorage instead of server storage !?!?
		
		EDITOR.localStorage.setItem("state_" + path, JSON.stringify(state), function(err) {
			callback(err, path);
		});
	}
	
	/*
		substr: second argument: Length
		substring: second argument: Index
		
	*/
	
	
	function findBugs(checkMatch, callback) {

if(typeof checkMatch == "function") {
		callback = checkMatch;
		checkMatch = false;
}

if(checkMatch == undefined) checkMatch = false;

		if(callback == undefined) callback = function(err) {
			if(err) throw err;
		}
		
	EDITOR.localStorage.getItem("openedFiles", function(err, text) {
		if(err) throw err;
if(text == null) text = "";

// Checks the openedFiles string for errors:
		
		var firstChar = text.charAt(0);
		var lastChar = text.charAt(text.length-1);
		
		if(text.indexOf(fileDelimiter + fileDelimiter) > -1) return callback(new Error("Text contains double commas: " + text));
			if(firstChar == fileDelimiter) return callback(new Error("First character is a comma: " + text));
			if(lastChar == fileDelimiter) return callback(new Error("Last character is a comma: " + text));
			if(firstChar == " ") return callback(new Error("First character is a space: " + text));
			if(lastChar == " ") return callback(new Error("Last character is a space: " + text));
		
			if(text == undefined) return callback(new Error("Text is undefined: " + text));
			if(text == 'undefined') return callback(new Error("Text is 'undefined': " + text));
		
		// Check for duplex
		var array = text.split(fileDelimiter);
		for(var i=0; i<array.length; i++) {
			for(var j=i+1; j<array.length; j++) {
					if(array[i] == array[j]) return callback(new Error("Sanity check failed: Element " + i + ": " + array[i] + " and  " + j + ": " + array[j] + " is the same! "));
			}
		}
		
		if(checkMatch && array[0] != "") {
			// Does the list match EDITOR.files!?
			for(var i=0; i<array.length; i++) {
					if(!EDITOR.files.hasOwnProperty(array[i])) return callback(new Error("File does not exist in EDITOR.files: path=" + array[i] + "\narray=" + JSON.stringify(array) + "\nEDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files))));
			}
			for(var path in EDITOR.files) {
					if(array.indexOf(path) == -1) return callback(new Error("File does not exist in openedFiles list: path=" + path + "\narray=" + JSON.stringify(array) + "\nEDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files))));
			}
		}
		
			callback(null, text);

});
	
}
	
	function loadState(path, callback) {
		if(typeof path != "string") throw new Error("Expected path=" + path + " to be a string!");
		if(typeof callback != "function") throw new Error("Expected callback=" + callback + " to be a function!");
		console.log("Loading state for path=" + path + " ...");
		EDITOR.localStorage.getItem("state_" + path, function (err, state) {
			if(err) throw err;
			console.log("Got state for path=" + path + " :", state);
			if(state === null) {
				console.log("No saved state available for " + path);
				return callback(null, undefined);
			}
			else {
				try {
					state = JSON.parse(state);
				}
				catch(err) {
					return callback(new Error("Unabple to parse state=" + state + ": " + err.message));
				}
				return callback(null, state);
			}
		});
	}
	
	function removeDublicates(str) {
		var array = str.split(fileDelimiter);
		
		if(array[0] == "") {
			if(array.length > 1) throw new Error("First item is emty! str=" + str);
			return str; // The string was empty
		}
		
		checkAndRemove();
		
		return array.join(fileDelimiter);
		
		function checkAndRemove() {
			// Check for duplex
			for(var i=0; i<array.length; i++) {
				for(var j=i+1; j<array.length; j++) {
					if(array[i] == array[j]) {
						console.warn("Removed dublicate: " + array[i]);
						array.splice(i, 1); // Remove the item
						return checkAndRemove(); // Check the array again
					}
				}
			}
		}
		
	}
	
	function insaneBugCatcher() {
		// bug: A file (that was opened, but never closed) was removed from EDITOR.files!!
		
		for(var i=0; i<copyOfEditorFiles.length; i++) {
			if(!EDITOR.files.hasOwnProperty(copyOfEditorFiles[i])) {
				console.log("Removed from EDITOR.files:" + copyOfEditorFiles[i]);
			}
		}
		
		for(var path in EDITOR.files) {
			if(copyOfEditorFiles.indexOf(path) == -1) console.log("Added to EDITOR.files:" + path);
		}
		
		copyOfEditorFiles = Object.keys(EDITOR.files);
	} 	
	
})();
