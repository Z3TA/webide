(function() {
	
	"use strict";
	
	/*
		
		Goals:
		1. Open up the files from last time. Even if that was on another device.
		
		
		2. Get back to where you where, without losing any data, in case the app or computer crashes
		(save state at regular intervals)
		(Offer to load the backup file if it's gone or empty, or unsaved.)
		
		
		problem: When I swtich computer, it opens files that I had open on that computer before, but had closed on another computer
		
		
		problem: Reopened files get an old state if they where opened on that computer before
		
		
		Problem: Edge case: You go offline, make some changes, then your devices dies.
		Solution: 
		
		
		Problem 2: When logged in to the same account *at the same time* from two or more devices...
		
		
		Reset from bricket state:
		EDITOR.localStorage.removeItem("openedFiles")
		
		Problem: How to do regression tests for this plugin !?
		
		
	*/
	
	if(QUERY_STRING["embed"]) {
		console.warn("reopenFiles: Reopen-files disabled by embed in query string");
		return;
	}
	if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("reopen_files") != -1) {
		console.warn("reopenFiles: Reopen-files disabled by disable containing reopen_files in query string");
		return;
	}
	
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
	
	var oldServerState = {};
	
	var changedstate = {}; // file-path: Boolean
	
	EDITOR.plugin({
		desc: "Open up the files from last session", 
		order: 2000, // Load after the parser and other stuff that has fileOpen event listener
		load: function loadReopenFilesPlugin() {
			
			console.log("reopenFiles: Loading reopenFiles plugin ...");
			
			reopenFilesCalled = false;
			allFilesOpenedAlreadyCalled = false;
			
			
			CLIENT.on("loginSuccess", reopenFiles);
			/*
				problem: storageReady can be called many times, for example if the user re-login (as another user)
				
				We can't (re)open files from disk when running in the browser, unless connected to the server.
				So we need to be connected to the editor server for this plugin to work.
				
				Solution: Close all unsaved files when connected to a different url or user
				
				...
				
				Swithing back to using localStorage
				* Too much spam to server
				* Don't have to depend on the server
				* Saves bandwith
				
				We still need to wait until we are connected to the server though (in order to get the files)
				
				Middle ground:
				Save state locally, but the list of opened files on the server!?
				
			*/
			
		},
		unload: function unloadReopenFilesPlugin() {
			
			CLIENT.removeEvent("loginSuccess", reopenFiles);
			
			clearInterval(insaneBugCatcherInterval);
			
			EDITOR.removeEvent("fileOpen", addToOpenedFiles);
			EDITOR.removeEvent("fileClose", removeFromOpenedFiles);
			EDITOR.removeEvent("fileChange", fileStateChange);
			EDITOR.removeEvent("afterSave", saveStateOfFile);
			EDITOR.removeEvent("moveCaret", fileStateChange);
			EDITOR.removeEvent("exit", saveStateOfOpenFiles);
			EDITOR.removeEvent("afk", stopSavingState);
			EDITOR.removeEvent("btk", continueSavingState);
			
			clearInterval(saveStateIntervalTimer);
			
		}
		
	});
	
	
	
	function reopenFiles() {
		console.log("reopenFiles: Opening files ...");
		
		if(reopenFilesCalled) {
			// Happens when you get disconnected, and storageReady is called.
			console.warn("reopenFiles called twice!");
			return;
		}
		
		reopenFilesCalled = true;
		
		if(!EDITOR.localStorage) throw new Error("EDITOR.localStorage not available!");
		
		console.log("reopenFiles: serverUrl=" + serverUrl + " CLIENT.url=" + CLIENT.url + " serverUser=" + serverUser + " EDITOR.user.name=" + EDITOR.user.name);
		
		if(serverUrl != CLIENT.url || serverUser != EDITOR.user.name) {
			// Logged in as another user
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
			EDITOR.on("fileChange", fileStateChange);
			EDITOR.on("afterSave", saveStateOfFile, 1);
			EDITOR.on("moveCaret", fileStateChange);
			
			EDITOR.on("afk", stopSavingState);
			EDITOR.on("btk", continueSavingState);
		}
		
		firstRun = false;
		
		reopenFilesMain(function allFilesHaveReopened() {
			// Save state when exiting the editor
			EDITOR.on("exit", saveStateOfOpenFiles);
			
			// Save state on regular intervals in case the editor crashes (or refresh)
			console.log("reopenFiles: Started saveStateIntervalTimer");
			saveStateIntervalTimer = setInterval(saveStateOfOpenFiles, saveStateInterval);
			
			// Catch bugs
			insaneBugCatcherInterval = setInterval(insaneBugCatcher, 1000);
			
			console.log("reopenFiles: All files reopened!");
		});
	}
	
	function reopenFilesMain(reopenFilesCallback) {
		
		console.log("reopenFiles: ... reopenFilesMain");
		
		/*
			What might have happaned:
			* User closed the editor
			* User logged in as another user or on another url
			* The editor had a spectacular crash
			
			so try to recover the last session ...
		*/
		
		var setCurrent = "";
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
			if(err) throw err;
			
			if(openedFilesString == null) openedFilesString = "";
			
			/*
				We only want to use the openedFilesString from localStorage as a backup.
				So first get the list of opened files from server storage, 
				then check the list from localStorage to see if any files are missing
				
			*/
			
			EDITOR.once("storageReady", function combineOpenedFilesString() {
				
				var server = [];
				var path = ""
				var i = 0;
				var key = "__openFile" + i
				while(path = EDITOR.storage.getItem(key)) {
					
					server.push(path);
					i++;
					key = "__openFile" + i;
					
				}
				
				console.log("reopenFiles: From Server storage: " + server.join(fileDelimiter));
				
				var local = openedFilesString.split(fileDelimiter);
				if(local[0] == "") local.shift();
				
				console.log("reopenFiles: From Local storage: " + local.join(fileDelimiter));
				
				// Add missing files
				for(var i=0; i<local.length; i++) {
					if(server.indexOf(local[i]) == -1) {
						server.push(local[i]);
						console.warn("reopenFiles: " + local[i] + " was missing from server storage!");
					}
				}
				
				// Convert back to string
				openedFilesString = server.join(fileDelimiter);
				
				console.log("reopenFiles: Combined server and local: " + openedFilesString);
				
				// Just in case
				openedFilesString = removeDublicates(openedFilesString);
				
				// Save this list locally so that the old code doesn't go nutz
				EDITOR.localStorage.setItem("openedFiles", openedFilesString, function(err) {
					if(err) throw err;
					
					findBugs(false, function(err, openedFilesString) {
						if(err) throw err;
						
						var files = openedFilesString.split(fileDelimiter);
						console.log("reopenFiles: files=" + JSON.stringify(files));
						
						if(openedFilesString.length > 0) { // openedFilesString is a string with path's separated by fileDelimiter
							console.log("reopenFiles: Opening " + files.length + " files ...");
							
							// Note: the file tab plugin will sort the tabs by file.order every time a new file is opened!
							for(var i=0; i<files.length; i++) {
								// Problem: The editor might already have the file open, and we are here because of a server reconnect
								if(!EDITOR.files.hasOwnProperty(files[i])) {
									console.log("reopenFiles: gonna open files[" + i + "]=" + files[i]);
									openFile(files[i], fileInListOpened);
								}
							}
						}
						else {
							allFilesOpened();
						}
						
					});
				});
				
				
			});
			
		});
		
		function fileInListOpened(err, file, wasCurrent) {
			
			if(err) {
				if(err.code === 'ENOENT') {
					// File did not exist, and the user did not want to load the last state. 
					// It has also been removed from openedFiles storage
				}
				else {
					console.warn("reopenFiles: " + err.message);
				}
				
				return compareAndDone();
			}
			
			console.log("reopenFiles: We now have it open: file.path=" + file.path);
			
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
						console.log("reopenFiles: editorFiles=" + editorFiles);
						console.log("reopenFiles: openedFilesString=" + openedFilesString);
						console.warn("reopenFiles: editorFiles and openedFilesString does not match!");
					}
				});
			}
		}
		
		function allFilesOpened() {
			
			allFilesOpenedNeverCalled = false;
			
			
			console.log("reopenFiles: All files from last lession opened!");
			
			findBugs(true); // true == also check if the list match EDITOR.files
			
			console.log("reopenFiles: setCurrent=" + setCurrent);
			
			
			if(setCurrent) {
				// Make the file with last state "open" the current file
				
				// Switch to this file
				
				if(!EDITOR.files.hasOwnProperty(setCurrent)) {
					throw new Error("reopenfiles plugin: After all files has been reopened we want to show setCurrent=" + setCurrent + " . But it's not opened! Opened files are: " + JSON.stringify(Object.keys(EDITOR.files)));
				}
				else EDITOR.showFile(EDITOR.files[setCurrent]);
				
			}
			
			reopenFilesCallback();
			
			if(allFilesOpenedAlreadyCalled) throw new Error("allFilesOpenedAlreadyCalled=" + allFilesOpenedAlreadyCalled);
			allFilesOpenedAlreadyCalled = true;
		}
		
		
		
		
		function openFile(path, callback) {
			
			console.log("reopenFiles: openFile: path=" + path);
			
			if(!callback) throw new Error("Internal error: Expected a callback!");
			
			var content;
			var notFound = false;
			var loadLastState = false;
			var file;
			var lastFileState;
			
			// Check the file size and if it exist
			EDITOR.getFileSizeOnDisk(path, gotFileSize);
			
			function gotFileSize(getFileSizeError, fileSizeOnDisk) {
				
				// Decide if we should open the last saved state, or from the disk (or other protocol) ...
				
				console.log("reopenFiles: Got fileSizeOnDisk=" + fileSizeOnDisk + " for path=" + path + "");
				
				if(getFileSizeError) {
					//if(err.code === 'ENOENT') {
					notFound = true;
					//}
					console.warn("reopenFiles: " + getFileSizeError.message);
				}
				
				// Load both the server saved state and the locally saved state, then compare them and resolve...
				var serverState = EDITOR.storage.getItem("state_" + path);
				
				loadState(path, function(err, localState) {
					
					if(err) console.error(err);
					
					if(!serverState && !localState) {
						console.log("reopenFiles: Unable to load neither server nor local state for path=" + path);
						lastFileState = undefined; // Overwrite just in case, so that we don't get state from an earlier file
						return open();
					}
					else if(!stateChanged(serverState, localState)) {
						// Doesn't matter if server and local state is the same
						console.log("reopenFiles: Server and local state is the same for path=" + path);
						return decidedWhichStateToUse(serverState || localState);
					}
					else if(!serverState) {
						// Use local state if no server state exist
						console.log("reopenFiles: No server state exist for path=" + path);
						return decidedWhichStateToUse(localState);
					}
					else if(serverState && !localState) {
						// We have the server state, but not the local state, so use the server state
						console.log("reopenFiles: Unable to load local state, but found server state for path=" + path);
						return decidedWhichStateToUse(serverState);
					}
					else if(UTIL.isEmptyString(localState.text)) {
						// Prefer the server state if the local text string is empty
						console.log("reopenFiles: Using server state because local text string is empty in path=" + path);
						return decidedWhichStateToUse(serverState);
					}
					else if(UTIL.isEmptyString(serverState.text)) {
						// Prefer the local state if the server text string is empty
						console.log("reopenFiles: Using local state because server text string is empty in path=" + path);
						return decidedWhichStateToUse(localState);
					}
					else if(localState.text === serverState.text) {
						// The text is the same, which is most important. Prefer the server state as it's probably the most recent
						console.log("reopenFiles: Server and local state text string is the same for path=" + path);
						return decidedWhichStateToUse(serverState);
					}
					else {
						console.log("reopenFiles: Asking the user what to do because both server and client has stored last state of path=" + path);
						var useLocal = "Use local state";
						var useServer = "Load from server";
						var openBoth = "Open both";
						confirmBox("Which last state to load for + " + path + " ?", [strDoNothing, strLoadLastState], function(answer) {
							
							if(answer == useLocal) return decidedWhichStateToUse(localState);
							else if(answer == useServer) return decidedWhichStateToUse(serverState);
							else {
								decidedWhichStateToUse(serverState);
								EDITOR.openFile(path + ".local", localState.text, {stateProps: getStateProps(localState)});
							}
							
						});
						return;
					}
					
					throw new Error("We should not get here");
					
					
					function decidedWhichStateToUse(state) {
						
						if(!state) throw new Error("state=" + state);
						
						lastFileState = state;
						
						console.log("reopenFiles: loadLastState=" + loadLastState);
						console.log("reopenFiles: lastFileState.isSaved=" + lastFileState.isSaved);
						
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
							}
							else open();
						}
						// scenario: File has been emptied because of no disk space (*cough* Linux *cough*)
						else if(fileSizeOnDisk === 0 && lastFileState.text != undefined && lastFileState.text.length > 0 && lastFileState.isSaved) {
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
					
					
				});
				
				function open() {
					
					console.log("reopenFiles: open file path=" + path);
					
					var stateprops = {};
					
					if(lastFileState) {
						
						if(loadLastState) lastFileState.isSaved = false; // Mark file as not saved. Because it was "Not found" or "Emty on disk"
						
						var stateprops = getStateProps(lastFileState);
						
						if( loadLastState || lastFileState.isSaved === false ) {
							// Open from temp
							console.warn("reopenFiles: Loading last saved state for file path=" + path);
							content = lastFileState.text;
							
							if(typeof content != "string") {
								var contentError = new Error("lastFileState.text=" + lastFileState.text + " lastFileState.path=" + lastFileState.path + ". " + path + " will not be reopened!");
								console.warn("reopenFiles: " + contentError.message);
								console.log("reopenFiles: lastFileState=", lastFileState);
								removeFromOpenedFiles(path, function(err) {
									if(err) throw err;
									callback(contentError, path, false);
								});
								return;
							}
						}
						else if(notFound) {
							console.log("reopenFiles: The file (" + path + ") was not found and the user didn't want to load last state");
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
									console.warn("reopenFiles: The file on disk has changed! hash=" + hash + " lastFileState.hash=" + lastFileState.hash);
									lastFileState.isSaved = false;
									stateprops.isSaved = false;
									content = lastFileState.text;
								}
								
								EDITOR.openFile(path, content, {props: stateprops}, fileReopened); 
								
							});
							
							return;
						}
						
					}
					else {
						// If there is no last state: Assume the file is saved.
						// EDITOR.openFile() already do this
						//file.isSaved = true;
						//file.savedAs = true;
					}
					console.log("reopenFiles: Reopening file path=" + path +" typeof content=" + typeof content);
					
					EDITOR.openFile(path, content, {props: stateprops}, fileReopened); 
				}
				
				
			}
			
			
			function fileReopened(openFileError, file) {
				
				if(file) {
					// Sanity check: In case EDITOR.openFile returns the wrong file
					if(file.path != path) throw new Error("File opened, but with another path: path=" + path + " file.path=" + file.path + " EDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files)) );
				}
				
				console.log("reopenFiles: Got (Reopening) file from editor path=" + path + " file.path=" + (file ? file.path : "file=" + file));
				
				if(openFileError) {
					console.log("reopenFiles: fileReopened openFileError.path=" + openFileError.path);
				}
				
				if(file) {
					console.log("reopenFiles: fileReopened file.path=" + file.path);
				}
				
				var fileWasCurrentfile = false; // Was the file open (in view) last time we closed the editor
				
				if(openFileError) {
					console.error(openFileError.message);
					console.log("reopenFiles: ", openFileError.stack);
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
								updateLastState();
							});
						});
					});
				}
				else updateLastState();
				
				function updateLastState() {
					console.log("reopenFiles: updateLastState path=" + path);
					
					// Set last state
					// Note that some state need to be set when opening the file!
					
					if(lastFileState) { // <-- This is needed because we can't check a property of a undefined variable
						
						if(lastFileState.startColumn != undefined && lastFileState.startRow != undefined) {
							file.scrollTo(lastFileState.startColumn, lastFileState.startRow);
						}
						
						if(lastFileState.currentFile === true) fileWasCurrentfile = true;
						
						if(lastFileState.caret !== undefined) {
							// Set the caret as it was
							console.log("reopenFiles: Placing caret in file.path=" + file.path);
							// There can be errors, for example if the file has been changed by another program
							try {
								//file.caret = file.createCaret(lastFileState.caret.index, lastFileState.caret.row, lastFileState.caret.col);
								// Don't set the caret, move it, so events can fire
								file.moveCaret(undefined, lastFileState.caret.row, lastFileState.caret.col);
								//file.caret = file.createCaret(undefined, lastFileState.caret.row, lastFileState.caret.col);
							}
							catch(e) {
								console.warn("reopenFiles: Unable to set last caret position (" + JSON.stringify(lastFileState.caret) + ") in: " + file.path + "\n" + e.message + "\n" + e.stack);
							}
						}
						
						console.log("reopenFiles: Loaded old state for " + path + " file.startRow=" + file.startRow);
						
					}
					
					
					//console.log("reopenFiles: file.partStartRow=" + file.partStartRow + " content=" + content);
					
					if(file.partStartRow > 0 && content == undefined) {
						/*
							If the file was re-loaded from disk, it started at first line.
							But if it was loaded from state, just leave it as is.
						*/
						file.gotoLine(file.partStartRow+file.caret.row+1, function(err) {
							callback(err, file, fileWasCurrentfile);
						});
					}
					else callback(null, file, fileWasCurrentfile);
				}
				
				
				
			}
		}
	}
	
	function getStateProps(lastFileState) {
		// Some state need to be set when opening the file (not after)
		
		var stateprops = {};
		
		if(lastFileState.order !== undefined) stateprops.order = lastFileState.order;
		if(lastFileState.parse !== undefined) stateprops.parse = lastFileState.parse;
		if(lastFileState.savedAs !== undefined) stateprops.savedAs = lastFileState.savedAs;
		if(lastFileState.hash !== undefined) stateprops.hash = lastFileState.hash;
		
		if(lastFileState.isBig !== undefined) stateprops.isBig = lastFileState.isBig;
		if(lastFileState.totalRows !== undefined) stateprops.totalRows = lastFileState.totalRows;
		if(lastFileState.partStartRow !== undefined) stateprops.partStartRow = lastFileState.partStartRow;
		
		if(lastFileState.isSaved !== undefined && lastFileState.text) {
			stateprops.isSaved = lastFileState.isSaved;
		}
		
		return stateprops;
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
		
		console.log("reopenFiles: Added to string: " + add);
		
		return text;
	}
	
	function addToOpenedFiles(file) {
		// Called when the editor opens a new file
		
		if(!file.path) throw new Error("Argument need to be a file object!");
		
		changedstate[file.path] = false;
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
			if(err) throw err;
			if(openedFilesString == null) openedFilesString = "";
			if(openedFilesString.split(fileDelimiter).indexOf(file.path) != -1) {
				console.warn("reopenFiles: File already in EDITOR.localStorage: " + file.path);
			}
			else {
				console.log(UTIL.getStack("reopenFiles: Adding file to openedFiles path='" + file.path + "'"));
				
				console.log("reopenFiles: List before=" + openedFilesString);
				openedFilesString = addToStringList(openedFilesString, file.path, fileDelimiter)
				console.log("reopenFiles: List after=" + openedFilesString);
				
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
		
		if(!UTIL.isString(text)) throw new Error("text is not a string! typeof text = " + (typeof text) );
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
		
		console.log("reopenFiles: Removed from string: " + remove);
		
		return text;
	}
	
	function fileStateChange(file) {
		changedstate[file.path] = true;
		return true;
	}
	
	function removeFromOpenedFiles(filePath, callback) {
		// Called when the editor close a file
		
		if(typeof filePath == "object" && typeof filePath.path == "string") filePath = filePath.path;
		
		console.log(UTIL.getStack("reopenFiles: Removing file from openedFiles path='" + filePath + "'"));
		
		EDITOR.localStorage.getItem("openedFiles", function gotItemFromLocalStorage(err, openedFilesString) {
			if(err) {
				if(callback) return callback(err);
				else throw err;
			}
			
			if(openedFilesString == undefined) {
				// User might have cleared history
				openedFilesString = "";
				for(var path in EDITOR.files) addToStringList(openedFilesString, path, fileDelimiter);
			}
			
			console.log("reopenFiles: List before=" + openedFilesString);
			openedFilesString = removeFromStringList(openedFilesString, filePath, fileDelimiter);
			console.log("reopenFiles: List after=" + openedFilesString);
			
			
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
						console.log("reopenFiles: File removed from opened files: path=" + filePath);
						if(callback) callback(null);
					});
				});
				
				delete oldServerState[filePath];
				delete changedstate[filePath];
				
				EDITOR.storage.removeItem("state_" + filePath, function(err) {
					//alertBox("done: EDITOR.storage.removeItem: state_" + filePath + " err.message=" + (err && err.message) + " err.code=" + (err & err.code));
					if(err) {
						console.log("err.code=" + err.code);
						console.error(err);
					}
				});
				
			});
		});
	}
	
	function stopSavingState() {
		console.log("reopenFiles: Stopping saveStateIntervalTimer because afk!");
		clearInterval(saveStateIntervalTimer);
		return true;
	}
	
	function continueSavingState() {
		console.log("reopenFiles: Starting saveStateIntervalTimer because back to keyboard!");
		saveStateIntervalTimer = setInterval(saveStateOfOpenFiles, saveStateInterval);
		return true;
	}
	
	function saveStateOfFile(file, callback) {
		saveState(file.path, function stateSaved(err, path, state) {
			if(err) {
				// Don't let the user leave 
				window.onbeforeunload = function() {
					return "There was an error! Are you sure you want to close the editor ?"
				}
				return callback(err, state);
			}
			else return callback(null, state);
		});
	}
	
	function saveStateOfOpenFiles(reason, callback) {
		// Called when the editor closes, and at an time interval
		
		//console.log("reopenFiles: saveStateOfOpenFiles! reason=" + reason);
		if(typeof callback != "function") {
			//console.log("callback=" + callback + " (" + (typeof callback) + ") is not a function!");
			callback = null;
		}
		
		//console.log(UTIL.getStack("saveStateOfOpenFiles"));
		
		if(CLIENT.connected && CLIENT.ping < 2000 && EDITOR.storage.ready()) {
			var list = EDITOR.sortFileList(); // Array sorted by file.order
			var key = "";
			var filePath = "";
			// Only save the positions that has changed to save bandwidth/data
			for(var i=0; i<list.length; i++) {
				key = "__openFile" + i;
				filePath = list[i].path;
				//console.log("reopenFiles: Check slot " + i + " filePath=" + filePath + " storage=" + EDITOR.storage.getItem(key));
				if( EDITOR.storage.getItem(key) != filePath ) {
					EDITOR.storage.setItem(key, filePath, true, function(err) {
						// It's annoying that when we lose connection we get an error for each open file...
// So swallow the error here
						if(err) console.error(err);
					});
				}
			}
			// Mark next key as null so we know how many files to open
			key = "__openFile" + i;
			if( EDITOR.storage.getItem(key) != null ) EDITOR.storage.removeItem(key);
		}
		else {
			console.warn("reopenFiles: Unable to save opened files to server! CLIENT.connected=" + CLIENT.connected + "  EDITOR.storage.ready()=" + EDITOR.storage.ready());
		}
		
		
		if(!EDITOR.localStorage) throw new Error("EDITOR.localStorage not available!");
		
		EDITOR.localStorage.getItem("openedFiles", function(err, openedFilesString) {
			if(openedFilesString == null || openedFilesString == "") {
				console.warn("reopenFiles: No open files!?");
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
					var errors = [];
					
					// note: "".split(fileDelimiter).length == 1 !! (an empty string gives one item in the array)
					if(openedFilesString != "") {
						//console.log("reopenFiles: openFiles.length=" + openFiles.length);
						for(var i=0; i<openFiles.length; i++) {
							//console.log("reopenFiles: Saving state for openFiles[" + i + "]=" + openFiles[i] + " ...");
							if(changedstate[openFiles[i]]) {
								saveState(openFiles[i], stateSaved);
							}
							else stateSaved(null, openFiles[i]);
							
						}
					}
					else if(callback) callback(null);
					
					function stateSaved(err, path) {
						if(err) {
							console.warn("reopenFiles: Problem saving state for path=" + path + ": " + err.message);
							errors.push(err.message);
						}
						if(++statesSaved == openFiles.length) {
							//console.log("reopenFiles: Done saving state!");
							if(!callback) return;
							
							if(errors.length > 0) callback(new Error(errors.join("\n")));
							else callback(null);
						}
					}
				});
			}
		});
	}
	
	function stateChanged(oldState, newState) {
		if(oldState == undefined && newState == undefined) throw new Error("Both old and new state is undefined!");
		else if(oldState == undefined) return true;
		else if(newState == undefined) return true;
		
		for(var prop in oldState) {
			if(newState[prop] != oldState[prop]) return true;
		}
		
		return false;
	}
	
	function saveState(path, callback) {
		if(typeof path != "string") throw new Error("path needs to be a string!")
		if(typeof callback != "function") throw new Error("callback needs to be a function!")
		
		//console.log("reopenFiles: Saving state for: " + path);
		
		changedstate[false] = false;
		
		if(path.length == 0) {
			findBugs(false, function(err, openedFilesString) {
				console.warn("reopenFiles: Attempted to save state for a file without path!");
				console.log(new Error("reopenFiles: saveState").stack);
				console.log("reopenFiles: EDITOR.files=" + Object.keys(EDITOR.files).join(fileDelimiter));
				console.log("reopenFiles: openedFilesString=" + openedFilesString);
				callback(err, path);
			});
			return;
		}
		
		var state = {};
		
		var file = EDITOR.files[path];
		
		if(!file) {
			// Possible reasons: it was renamed!? It should have been removed first!
			//console.warn("reopenFiles: File not in EDITOR.files, was it renamed? open: " + file);
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
		state.startColumn = file.startColumn;
		state.caret = file.caret;
		state.order = file.order;
		state.disableParsing = file.disableParsing;
		state.hash = file.hash;
		
		// For loading big files as streams
		state.isBig = file.isBig;
		state.totalRows = file.totalRows;
		state.partStartRow = file.partStartRow; 
		
		
		var sizeLimit = 2551000; // Max size for localStorage in Chrome is 2,551,000 characters (5 MB)
		
		
		if(file.text.length > sizeLimit) {
			console.warn("reopenFiles: Not saving state for " + file.path + " because it has " + file.text.length + " (over " + (sizeLimit-1) + ") characters");
		}
		else {
			// Always save the text, even if it's saved to disk. (it can be deleted, or disk space limit truncated it)
			state.text = file.text;
		}
		
		// Hash the state so that we do not spam the server !?
		// Send only what actually changed !? Like moved cursor in a large document.
		// Use browsers localStorage instead of server storage !?!?
		
		EDITOR.localStorage.setItem("state_" + path, JSON.stringify(state), function(err) {
			
			if(EDITOR.storage.ready() && CLIENT.connected && CLIENT.ping < 2000) {
				// Also store some of the state on the server
				var serverState = state;
				
				if(serverState.isSaved) delete serverState.text; // The text is the same as the text in the file system
				
				if(stateChanged(oldServerState[path], serverState)) {
					EDITOR.storage.setItem("state_" + path, JSON.stringify(state), function(err) {
// Swallow this error because it's too annoying when you get spammed lots of these if we lose connection to the server'
if(err) console.error(err);
});
					oldServerState[path] = serverState;
				}
			}
			
			callback(err, path, state);
		});
	}
	
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
		console.log("reopenFiles: Loading state for path=" + path + " ...");
		EDITOR.localStorage.getItem("state_" + path, function (err, state) {
			if(err) throw err;
			console.log("reopenFiles: Got state for path=" + path + " :", state);
			if(state === null) {
				console.log("reopenFiles: No saved state available for " + path);
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
						console.warn("reopenFiles: Removed dublicate: " + array[i]);
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
				console.log("reopenFiles: Removed from EDITOR.files:" + copyOfEditorFiles[i]);
			}
		}
		
		for(var path in EDITOR.files) {
			if(copyOfEditorFiles.indexOf(path) == -1) {
				console.log("reopenFiles: Added to EDITOR.files:" + path);
			}
		}
		
		copyOfEditorFiles = Object.keys(EDITOR.files);
	} 	
	
	
	
	// TEST-CODE-START

	EDITOR.addTest(true, function testCloseFileWhileOffline3(callback) {
		/*
			
			bug: If you close a file while the editor is offline,
			the file wont be closed, and later the editor will complain that the file you tried to close is not in the "array"
			
			This bug is very tricky to reproduce, most of the time you can close the file just fine even when offline!
			
			Manual steps to reproduce:
			1. Open a file
			2. Wait 5+ seconds
			3. Stop the server (or CLIENT.connected = false; in console)
			4. Close the file
			
			Sometimes we get the errors, and sometimes not...
			One more file also needs to be open!?
			
			You do not get an error if the file is the last file opened!?
			
			Seems to work when I keep clicking on the file... The bug seem to need a state change in order to trigger.
			
		*/
		EDITOR.openFile("testCloseFileWhileOffline1.txt", 'first file opened\n', function(err, file) {
			var file1 = file.path;
			file.moveCaretRight(); // State update
			
			EDITOR.openFile("testCloseFileWhileOffline2.txt", 'second file opened\n', function(err, file) {
				var file2 = file.path;
				file.moveCaretRight(); // State update
				
				setTimeout(function() { // Bug wont fire without this timeout. Calling saveState here wont trigger the bug
					if(err) throw err;
					file.moveCaretRight(); // State update
					
					CLIENT.connected = false;
					
					file.moveCaretRight(); // State update
					
					try {
						EDITOR.closeFile(file1);
					}
					catch(err) {
						var error = err;
						console.error(err);
						alertBox("testCloseFileWhileOffline: " + err.message);
					}
					
					if(EDITOR.files.hasOwnProperty(file1)) {
						alertBox("testCloseFileWhileOffline: File was not closed: EDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files)) + " error=" + error.message);
						//throw new Error("File was not closed: filePath=" + filePath + " error=" + error.message);
						setTimeout(function() {
							
							EDITOR.closeFile(file1);
							
							CLIENT.connected = true;
							return callback(true);
							
						}, 300);
					}
					else {
						EDITOR.closeFile(file2);
						
						CLIENT.connected = true;
						return callback(true);
					}
					
				}, 5100);
			});
			
			
		});
	});
	
	
	
	
	
	
	
	// TEST-CODE-END
	
	
})();
