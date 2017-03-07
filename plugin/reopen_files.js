
// Reset from bricket state:
//window.localStorage.openedFiles = "";

editor.plugin({
	desc: "Open up the files from last session", 
	order: 999, // Load after the parser and other stuff that has fileOpen event listener
	unload: function unloadReopenFilesPlugin() {
		editor.removeEvent("start", reopenFiles);
	},
	load: function loadReopenFilesPlugin() {
		editor.on("start", reopenFiles);
	}
});

function reopenFiles() {
	/*
		1. Open up the files from last time, when opening the editor.
		
		2. Save a backup on each file when it close, and on regular intervals (incase the editor crash)
		Offer to load the backup file if it's gone or empty, or unsaved.
		
		Note: window.localStorage only supports strings!!
		
		
	*/
	
	"use strict";
	
	var fileDelimiter = ";"; // User to separate the file paths in the window.localStorage.openedFiles string
	
	var saveStateInterval = 5000;
	
	var saveStateIntervalTimer;
	
	var allFilesOpenedNeverCalled = true;
	
	var copyOfEditorFiles = [];
	setInterval(insaneBugCatcher, 1000);
	
	
	editor.on("fileOpen", addToOpenedFiles, 1);
	
	editor.on("fileClose", removeFromOpenedFiles, 1);
	
	reopenFilesMain();
	
	function reopenFilesMain() {
		
		if(!window.localStorage) throw new Error("window.localStorage not available!");
		
		//window.localStorage.openedFiles = "";
		
		
		// Reset localstorage
		//for(var item in window.localStorage) {
		//	window.localStorage.removeItem(item);
		//}
		
		if(window.localStorage.getItem("openedFiles") == null) {
			window.localStorage.openedFiles = "";
		}
		
		// This is a fresh reload, so try to recover from old bugs.
		// 1. Remove dublicate entries
		window.localStorage.openedFiles = removeDublicates(window.localStorage.openedFiles);
		
		findBugs();
		
		
		var setCurrent = "";
		var files = window.localStorage.openedFiles.split(fileDelimiter);
		
		console.log("files=" + JSON.stringify(files));
		
		//return;
		
		if(window.localStorage.openedFiles.length > 0) { // window.localStorage.openedFiles is a string with path's separated by fileDelimiter
			console.log("Opening " + files.length + " files ...");
			
			// Note: the file tab plugin will sort the tabs by file.order every time a new file is opened!
			for(var i=0; i<files.length; i++) {
				console.log("gonna open files[" + i + "]=" + files[i]);
				openFile(files[i], fileInListOpened);
			}
			
			
		}
		else {
			allFilesOpened();
		}
		
		// Just in case allFilesOpenedNeverCalled
		/*
			setTimeout(function checkIfallFilesOpenedWasCalled() {
			if(allFilesOpenedNeverCalled) {
			
			findBugs(true); // Compare opened files with window.localStorage.openedFiles
			
			throw new Error("There is a bug in reopen_files.js, because it failed to complete loading last state, or it is taking too long!\nwindow.localStorage.openedFiles=" + window.localStorage.openedFiles + "\nopenedFiles=" + openedFiles);
			}
			}, 5000);
		*/
		
		function fileInListOpened(file, wasCurrent, err) {
			
			if(err) {
				if(err.code === 'ENOENT') {
					// File did not exist, and the user did not want to load the last state. 
					// It has also been removed from localStorage.openedFiles
					compareAndDone();
					return;
				}
				else console.warn(err.message);
				
				// We should aready got a confirm box about this ...
				return;
				
			}
			console.log("we now have it open: file.path=" + file.path);
			
			if(wasCurrent) setCurrent = file.path;
			
			// Is all files we want to open opened!?
			compareAndDone();
			
			function compareAndDone() {
				if(compareStringLists(Object.keys(editor.files).join(fileDelimiter), window.localStorage.openedFiles, fileDelimiter)) {
					allFilesOpened();
				}
				else {
					console.log("openedFiles=" + Object.keys(editor.files).join(fileDelimiter));
					console.log("window.localStorage.openedFiles=" + window.localStorage.openedFiles)
				}
			}
		}
		
		function allFilesOpened() {
			
			allFilesOpenedNeverCalled = false;
			
			console.log("All files from last lession opened!");
			
			findBugs(true); // true == also check if the list match editor.files
			
			console.log("setCurrent=" + setCurrent);
			
			
			if(setCurrent) {
				// Make the file with last state "open" the current file
				
				// Switch to this file
				editor.showFile(editor.files[setCurrent])
				
			}
			
			
			
			// Use editor close event
			editor.on("exit", reopen_files_closeEditor);
			
			
			// Save state on regular intervals in case the editor crashes (or refresh)
			saveStateIntervalTimer = setInterval(reopen_files_closeEditor, saveStateInterval);
			
		}
		
		
		
		
		function openFile(path, callback) {
			
			if(!callback) throw "Internal error: Expected a callback!";
			
			var content;
			var notFound = false;
			var loadLastState = false;
			var file;
			var lastFileState;
			
			// Check if the file size and if it exist
			editor.getFileSizeOnDisk(path, gotFileSize);
			
			function gotFileSize(err, fileSizeOnDisk) {
				
				// Decide if we should open the last saved state, or from the disk (or other protocol) ...
				
				if(err) {
					//if(err.code === 'ENOENT') {
					notFound = true;
					//}
					console.warn(err.message);
				}
				
				lastFileState = loadState(path);
				
				if(lastFileState) {
					
					console.log("loadLastState=" + loadLastState);
					console.log("lastFileState.isSaved=" + lastFileState.isSaved);
					
					if(notFound && lastFileState.text != undefined && lastFileState.text != "") {
						// Only ask if we actually have the last state, otherwise just ignore that it's gone.
						// Don't ask if lastFileState.isSaved === false, because it will be loaded anyway if thats right.
						if(lastFileState.isSaved != false) loadLastState = confirm("File not found! Load last saved state? path=: " + path + " (" + err.message + ")");
					}
					// scenario: File has been emptied because of no disk space (*cough* Linux *cough*)
					else if(fileSizeOnDisk === 0 && lastFileState.text.length > 0) {
						loadLastState = confirm("File on disk is empty! Load last saved state instead? path=: " + path + "");
					}
					
					if(loadLastState) lastFileState.isSaved = false; // Mark file as not saved. Because it was "Not found" or "Emty on disk"
					
					if( loadLastState || lastFileState.isSaved === false ) {
						// Open from temp
						console.warn("Loading last saved state for file path=" + path);
						content = lastFileState.text;
						
					}
					else if(notFound) {
						// The file was not found and the user didn't want to load last state
						// Do not open it! Remove from openedFiles
						window.localStorage.openedFiles = removeFromStringList(window.localStorage.openedFiles, path, fileDelimiter);
						// Should we remove the state!?
						window.localStorage.removeItem("state_" + path);
						callback(path, false, err);
						return; // Don't attempt to open the file
					}
					
				}
				
				console.log("Reopening file path=" + path +" typeof content=" + typeof content);
				editor.openFile(path, content, fileReopened); 
				
				
			}
			
			
			function fileReopened(err, file) {
				
				console.log("Got (Reopening) file from editor path=" + path + "");
				
				if(err) console.log("err.path=" + err.path);
				if(file) console.log("file.path=" + file.path);
				
				var fileWasCurrentfile = false; // Was the file open (in view) last time we closed the editor
				
				var loadFilePart = false;
				
				if(err) {
					
					console.error(err.message);
					console.log(err.stack);
					alertBox("Unable to open file:\n" + path + "\nError: " + err.message);
					
					// Remove from opened files
					window.localStorage.openedFiles = removeFromStringList(window.localStorage.openedFiles, path, fileDelimiter);
					
					callback(file, false, err);
					
					return;
					
				}
				
				// Mark the file as saved, because we just opened it
				//file.isSaved = true;
				//file.savedAs = true;
				//No! We should use last state, from when the editor was closed.
				
				// The file path can change from an relative to absolute path when opening from disk
				if(path != file.path) {
					
					// Replace the path in opened files
					window.localStorage.openedFiles = removeFromStringList(window.localStorage.openedFiles, path, fileDelimiter);
					window.localStorage.openedFiles = addToStringList(window.localStorage.openedFiles, file.path, fileDelimiter);
					
					// Change the state holder item
					let state = window.localStorage["state_" + file.path];
					window.localStorage.removeItem("state_" + path);
					window.localStorage["state_" + file.path] = state;
					
					path = file.path;
					
				}
				
				if(lastFileState) {
					
					console.log("lastFileState.partStartRow=" + lastFileState.partStartRow + "");
					
					if(lastFileState.partStartRow == undefined) lastFileState.partStartRow = 0;
					
					if(lastFileState.partStartRow > 0) loadFilePart = true;
					
				}
				
				if(loadFilePart) {
					
					file.loadFilePart(lastFileState.partStartRow, function setStateAtReopen() {
						
						console.log("setStateAtReopen");
						setLastState();
						callback(file, fileWasCurrentfile);
						
					});
					
				}
				else {
					setLastState();
					callback(file, fileWasCurrentfile);
				}
				
				function setLastState() {
					
					if(lastFileState) { // <-- This is needed because we can't check a property of a undefined variable
						
						if(lastFileState.startColumn != undefined && lastFileState.startRow != undefined) {
							file.scrollTo(lastFileState.startColumn, lastFileState.startRow);
						}
						
						if(lastFileState.order !== undefined) file.order = lastFileState.order;
						if(lastFileState.mode !== undefined) file.mode = lastFileState.mode;
						if(lastFileState.savedAs !== undefined) file.savedAs = lastFileState.savedAs;
						
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
		
		if(!isString(text)) throw new Error("text is not a string!");
		if(!isString(add)) throw new Error("add is not a string!");
		if(!isString(delimiter)) throw new Error("delimiter is not a string!");
		
		var array = text.split(delimiter); // Convert string to array
		
		// Splitting an empty string will result in an array with ONE item (an empty string)
		if(array[0] == "") array.shift(); // Remove the first emty string
		
		array.push(add); // Add string to list
		
		text = array.join(delimiter); // Convert the array back to string (localStorage can only hold strings!)
		
		// Makse sure the added string is in the text
		if(array.indexOf(add) == -1) throw new Error("The added string is not part of the array! add='" + add + "' text='" + text + "'");
		if(text.indexOf(add) == -1) throw new Error("The added string is not part of the text! add='" + add + "' text='" + text + "'");
		
		console.log("Added to string: " + add);
		
		return text;
	}
	
	function addToOpenedFiles(file) {
		
		if(!file.path) throw new Error("Argument need to be a file object!");
		
		if(window.localStorage.openedFiles.split(fileDelimiter).indexOf(file.path) != -1) {
			console.warn("File already in window.localStorage.openedFiles: " + file.path);
		}
		else {
			
			console.log(getStack("Adding file to openedFiles path='" + file.path + "'"));
			
			console.log("List before=" + window.localStorage.openedFiles);	
			window.localStorage.openedFiles = addToStringList(window.localStorage.openedFiles, file.path, fileDelimiter);
			console.log("List after=" + window.localStorage.openedFiles);	
		}
		
		findBugs();
		
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
		
		if(!isString(text)) throw new Error("text is not a string!");
		if(!isString(remove)) throw new Error("remove is not a string!");
		if(!isString(delimiter)) throw new Error("delimiter is not a string!");
		
		var array = text.split(delimiter); // Convert text to array
		
		// Splitting an empty string will result in an array with ONE item (an empty string)
		if(array[0] == "") array.shift(); // Remove the first emty string
		
		var index = array.indexOf(remove); // Get the array index of the string to me removed
		
		if(index == -1) throw  new Error(  "remove='" + remove + "' not in array=" + JSON.stringify(array)  ) ;
		
		array.splice(index, 1); // Remove the string to be removed from the text
		
		// Check to see if the string has been removed from the array to keep sanity
		if(array.indexOf(remove) != -1) throw new Error("The string had more then one instance or was not removed. remove='" + remove + "' text='" + text + "'");
		
		text = array.join(delimiter); // Convert the array back to string (localStorage can only hold strings!)
		
		console.log("Removed from string: " + remove);
		
		return text;
	}
	
	
	
	function removeFromOpenedFiles(file) {
		
		if(!file.path) {
			throw new Error("Argument need to be a file object!");
		}
		
		console.log(getStack("Removing file from openedFiles path='" + file.path + "'"));
		
		console.log("List before=" + window.localStorage.openedFiles);	
		window.localStorage.openedFiles = removeFromStringList(window.localStorage.openedFiles, file.path, fileDelimiter);
		console.log("List after=" + window.localStorage.openedFiles);
		
		
		
		// Remove state
		window.localStorage.removeItem("state_" + file.path);
		
		
		findBugs();
		
		
		console.log("File removed from opened files: path=" + file.path);
		
	}
	
	function reopen_files_closeEditor() {
		// Save file state
		
		if(!window.localStorage) throw new Error("window.localStorage not available!");
		
		if(window.localStorage.getItem("openedFiles") == null) {
			console.warn("No open files!?");
			return true;
		}
		else {
			
			try {
				findBugs(true); // true == also check if the list match editor.files
			}
			catch(err) {
				clearInterval(saveStateIntervalTimer);
				throw err;
			}
			
			
			var openFiles = window.localStorage.openedFiles.split(fileDelimiter);
			
			
			// note: "".split(fileDelimiter).length == 1 !!
			if(window.localStorage.openedFiles != "") {
				console.log("openFiles.length=" + openFiles.length);
				for(var i=0; i<openFiles.length; i++) {
					saveSate(openFiles[i]);
				}
			}
			
			if(editor.currentFile) {
				// Make sure the last viewed file is the last file in the window.localStorage.openedFiles list! So that it opens lasts and will be in view when we reload.
				//This caused the editor to open them in a weird order.
				//Instead, add opened state to file state
			}
			
			return true;
		}
		
		return false; // If something goes wrong, we should return false!
		
	}
	
	function saveSate(path) {
		
		//console.log("Saving state for: " + path);
		
		if(path.length == 0) {
			console.warn("Attempted to save state for a file without path!");
			console.log(new Error("saveState").stack);
			console.log("editor.files=" + Object.keys(editor.files).join(fileDelimiter));
			console.log("window.localStorage.openedFiles=" + window.localStorage.openedFiles);
			
			return;
		}
		
		var state = {};
		
		var file = editor.files[path];
		
		if(!file) {
			// Possible reasons: it was renamed!? It should have been removed first!
			//console.warn("File not in editor.files, was it renamed? open: " + file);
			//return;
			console.warn("File='" + path + "' not open! editor.files=" + JSON.stringify(Object.keys(editor.files)) + "");
			return false;
		}
		
		if(file == editor.currentFile) {
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
		
		
		var sizeLimit = 100000;
		
		if(file.text.length < 100000) {
			// Always save the text, even if it's saved to disk. (it can be deleted, or disk space limit truncated it)
			state.text = file.text;
		}
		else {
			console.warn("Not saving state for file because it has over " + sizeLimit + " characters file.path=" + path);
		}
		
		
		window.localStorage["state_" + path] = JSON.stringify(state);
		
	}
	
	/*
		substr: second argument: Length
		substring: second argument: Index
		
	*/
	
	
	function findBugs(checkMatch) {
		// Checks the openedFiles string for errors:
		
		var text = window.localStorage.openedFiles;
		
		
		var firstChar = text.charAt(0);
		var lastChar = text.charAt(text.length-1);
		
		if(text.indexOf(fileDelimiter + fileDelimiter) > -1) throw new Error("Text contains double commas: " + text);
		if(firstChar == fileDelimiter) throw new Error("First character is a comma: " + text);
		if(lastChar == fileDelimiter) throw new Error("Last character is a comma: " + text);
		if(firstChar == " ") throw new Error("First character is a space: " + text);
		if(lastChar == " ") throw new Error("Last character is a space: " + text);
		
		if(text == undefined) throw new Error("Text is undefined: " + text);
		if(text == 'undefined') throw new Error("Text is 'undefined': " + text);
		
		// Check for duplex
		var array = text.split(fileDelimiter);
		for(var i=0; i<array.length; i++) {
			for(var j=i+1; j<array.length; j++) {
				if(array[i] == array[j]) throw new Error("Element " + i + ": " + array[i] + " and  " + j + ": " + array[j] + " is the same! ");
			}
		}
		
		if(checkMatch && array[0] != "") {
			// Does the list match editor.files!?
			for(var i=0; i<array.length; i++) {
				if(!editor.files.hasOwnProperty(array[i])) throw  new Error("File does not exist in editor.files: path=" + array[i] + "\narray=" + JSON.stringify(array) + "\neditor.files=" + JSON.stringify(Object.keys(editor.files)));
			}
			for(var path in editor.files) {
				if(array.indexOf(path) == -1) throw new Error("File does not exist in openedFiles list: path=" + path + "\narray=" + JSON.stringify(array) + "\neditor.files=" + JSON.stringify(Object.keys(editor.files)));
			}
		}
		
		/*
			// Sanity check
			for(var path in editor.files) {
			if(window.localStorage.openedFiles.indexOf(path) == -1) {
			throw new Error("editor.files path=" + path + " not in window.localStorage.openedFiles=" + window.localStorage.openedFiles);
			}
			}
			var check = window.localStorage.openedFiles.split(fileDelimiter);
			for(var i=0; i<check.length; i++) {
			if(!editor.files.hasOwnProperty(check[i])) {
			throw new Error("window.localStorage.openedFiles path=" + check[i] + " not in editor.files!\nwindow.localStorage.openedFiles=" + window.localStorage.openedFiles);
			}
			}
			
			
			return text;
			
			text = text.trim();
			
			// Remove double commas
			while(text.indexOf(",,") > -1) {
			console.warn("Removing double comma from: " + text);
			text = text.replace(fileDelimiter + fileDelimiter, fileDelimiter);
			}
			
			text = text.trim();
			
			// Remove leading commas
			while(text.charAt(0) == fileDelimiter) {
			console.warn("Removing leading comma from: " + text);
			text = text.substring(1, text.length);
			}
			
			// Remove trailing commas
			while(text.charAt(text.length-1) == fileDelimiter) {
			console.warn("Removing trailing comma from: " + text);
			text = text.substring(1, text.length-1);
			}
			
			
			
			return text;
		*/
	}
	
	
	
	
	
	function getState(path, item) {
		
		var state = window.localStorage.getItem("state_" + path);
		
		if(state === null) {
			return undefined;
		}
		else {
			state = JSON.parse(state);
			
			return state[item];
		}
		
	}
	
	function loadState(path) {
		var state = window.localStorage.getItem("state_" + path);
		
		if(state === null) {
			console.log("No saved state available for " + path);
			return undefined;
		}
		else {
			state = JSON.parse(state);
			return state;
		}
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
		// bug: A file (that was opened, but never closed) was removed from editor.files!!
		
		for(var i=0; i<copyOfEditorFiles.length; i++) {
			if(!editor.files.hasOwnProperty(copyOfEditorFiles[i])) {
				console.log("Removed from editor.files:" + copyOfEditorFiles[i]);
			}
		}
		
		for(var path in editor.files) {
			if(copyOfEditorFiles.indexOf(path) == -1) console.log("Added to editor.files:" + path);
		}
		
		copyOfEditorFiles = Object.keys(editor.files);
	} 	
	
}
