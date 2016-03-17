(function() {
	/*
		1. Open up the files from last time, when opening the editor.
		
		2. Save a backup on each file when it close, and on regular intervals (incase the editor crash)
		Offer to load the backup file if it's gone or empty, or unsaved.
		
		Note: window.localStorage only supports strings!!

		
	*/
	
	"use strict";

	var fileDelimiter = ";"; // User to separate the file paths in the window.localStorage.openedFiles string
	
	var saveStateInterval = 5000;

	var loadOrder = 999; // Load after the parser and other stuff that has fileOpen event listener
	
	editor.on("start", reopenFilesMain, loadOrder)
	
	function reopenFilesMain() {
		
		if(!window.localStorage) console.error(new Error("window.localStorage not available!"));
				
		//window.localStorage.openedFiles = "";

		
		// Reset localstorage
		//for(var item in window.localStorage) {
		//	window.localStorage.removeItem(item);
		//}
		
		if(window.localStorage.getItem("openedFiles") == null) {
			window.localStorage.openedFiles = "";
		}
		
		findBugs();
		
		
		var setCurrent = "";
		var files = window.localStorage.openedFiles.split(fileDelimiter);
		
		console.log("files=" + JSON.stringify(files));
		
		//return;
		
		var openedFiles = "";
		
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
		
		
		function fileInListOpened(file, lastOpened, err) {
		
			if(err) {
				if(err.code == "INQUEUE") {
					// Some other plugin is already on it's way opening it ...
					console.warn("Double open file.path=" + file.path);
					return;
				}
				else throw err;
			}
			console.log("we now have it open: file.path=" + file.path);
			
			if(lastOpened) setCurrent = file.path;
			
			// Is all files we want to open opened!?
			openedFiles = addToStringList(openedFiles, file.path, fileDelimiter);
			if(compareStringLists(openedFiles, window.localStorage.openedFiles, fileDelimiter)) {
				allFilesOpened();
			}
			else {
				console.log("openedFiles=" + openedFiles);
				console.log("window.localStorage.openedFiles=" + window.localStorage.openedFiles)
			}
		}

		function allFilesOpened() {
			
			console.log("All files from last lession opened!");
			
			console.log("setCurrent=" + setCurrent);

			
			if(setCurrent) {
				// Make the file with last state "open" the current file
				
				// Switch to this file
				editor.showFile(editor.files[setCurrent])
				
			}
			
			// After we have opened the files, set listener for file load and close ...
			editor.on("fileOpen", addToOpenedFiles, 1)
			
			editor.on("fileClose", removeFromOpenedFiles, 1);
			
			// Use editor close event
			editor.on("exit", reopen_files_closeEditor);
			
			
			// Save state on regular intervals in case the editor crashes (or refresh)
			setInterval(reopen_files_closeEditor, saveStateInterval);
			
		}
		
		

		
		function openFile(path, callback) {
			
			var content;
			var notFound = false;
			var loadLastState = false;
			var file;
			var lastFileState;
			
			// Check if the file size and if it exist
			editor.getFileSizeOnDisk(path, gotFileSize);

			function gotFileSize(fileSizeOnDisk, err) {
				
				// Decide if we should open the last saved state, or from the disk (or other protocol) ...
				

				
				if(err) {
					if(err.code === 'ENOENT') {
						notFound = true;
					}
					else {
						console.error(err);
					}
				}

				lastFileState = loadState(path);
				
				if(lastFileState) {
					
					console.log("loadLastState=" + loadLastState);
					console.log("lastFileState.isSaved=" + lastFileState.isSaved);
					
					if(notFound && lastFileState.text.length > 0) {
						// Only ask if we actually have the last state, otherwise just ignore that it's gone.
						// Don't ask if lastFileState.isSaved === false, because it will be loaded anyway if thats right.
						if(lastFileState.isSaved != false) loadLastState = confirm("File not found! Load last saved state? path=: " + path);
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

				}
				
				console.log("Reopening file path=" + path);
				editor.openFile(path, content, fileReopened); 
				
				
			}
			
			
			function fileReopened(file, err) {

				console.log("Got (Reopening) file from editor path=" + path);

				if(err) {
					callback(file, false, err);
				}
				else {

					// Mark the file as saved, because we just opened it
					//file.isSaved = true;
					//file.savedAs = true;
					//No! We should use last state, from when the editor was closed.
					
					if(lastFileState) {
						
						file.scroll(lastFileState.startColumn, lastFileState.startRow); // Set startRow if it's saved
						
						if(lastFileState.order !== undefined) file.order = lastFileState.order;
						if(lastFileState.caret !== undefined) {
							// Place the caret
							try {
								file.caret = file.createCaret(lastFileState.caret.index, lastFileState.caret.row, lastFileState.caret.col);
							}
							catch(e) {
								console.warn("Unable to set last caret position (" + JSON.stringify(lastFileState.caret) + ") in: " + file.path);
							}
						}
						if(lastFileState.savedAs !== undefined) file.savedAs = lastFileState.savedAs;
						
						if(lastFileState.isSaved !== undefined && content) {
							file.isSaved = lastFileState.isSaved;
						}
						
						console.log("Loaded old state for " + path + " file.startRow=" + file.startRow);
						
					}
					else {
						// If there is no last state: Assume the file is saved.
						file.isSaved = true;
						file.savedAs = true;
					}
					
					if(callback) callback(file, lastFileState.open === true);
				}
			}
		}
	}
	
	function addToStringList(text, add, delimiter) {
		
		if(!isString(text)) console.error(new Error("text is not a string!"));
		if(!isString(add)) console.error(new Error("add is not a string!"));
		if(!isString(delimiter)) console.error(new Error("delimiter is not a string!"));
		
		var array = text.split(delimiter); // Convert string to array
		
		// Splitting an empty string will result in an array with ONE item (an empty string)
		if(array[0] == "") array.shift(); // Remove the first emty string
		
		array.push(add); // Add string to list
		
		text = array.join(delimiter); // Convert the array back to string (localStorage can only hold strings!)
		
		// Makse sure the added string is in the text
		if(text.indexOf(add) == -1) console.error(new Error("The added string is not part of the text! add='" + add + "' text='" + text + "'"));
		
		return text;
	}
	
	function addToOpenedFiles(file) {
		
		if(!file.path) console.error(new Error("Argument need to be a file object!"));
		
		window.localStorage.openedFiles = addToStringList(window.localStorage.openedFiles, file.path, fileDelimiter);
		
		findBugs();
		
		console.log("File added to opened files: path=" + file.path);
		
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
		
		if(!isString(text)) console.error(new Error("text is not a string!"));
		if(!isString(remove)) console.error(new Error("remove is not a string!"));
		if(!isString(delimiter)) console.error(new Error("delimiter is not a string!"));
		
		var array = text.split(delimiter); // Convert text to array

		// Splitting an empty string will result in an array with ONE item (an empty string)
		if(array[0] == "") array.shift(); // Remove the first emty string
		
		var index = array.indexOf(remove); // Get the array index of the string to me removed
		
		if(index == -1) console.error( new Error(  "remove='" + remove + "' not in array=" + JSON.stringify(array)  ) );
		
		array.splice(index); // Remove the string to be removed from the text
		
		text = array.join(delimiter); // Convert the array back to string (localStorage can only hold strings!)
		
		// Check to see if the string has been removed
		if(text.indexOf(remove) != -1) console.error(new Error("The string had more then one instance or was not removed. remove='" + file.path + "' text='" + openedFiles + "'"));
		
		return text;
	}
	

	
	function removeFromOpenedFiles(file) {
		
		if(!file.path) console.error(new Error("Argument need to be a file object!"));

		window.localStorage.openedFiles = removeFromStringList(window.localStorage.openedFiles, file.path, fileDelimiter);
		
		
		
		
		// Remove state
		window.localStorage.removeItem("state_" + filePath);
		
		
		findBugs();

		
		console.log("File removed from opened files: path=" + file.path);
		
	}
	
	function reopen_files_closeEditor() {
		// Save file state
		
		if(!window.localStorage) console.error(new Error("window.localStorage not available!"));
		
		if(window.localStorage.getItem("openedFiles") == null) {
			console.warn("No open files!?");
			return true;
		}
		else {
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
			state.open = true;
		}
		else {
			state.open = false;
		}
		
		state.isSaved = file.isSaved;
		state.savedAs = file.savedAs;
		state.startRow = file.startRow;
		state.startColumn = file.startColumn;
		state.caret = file.caret;
		state.order = file.order;
		
		
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
	
	
	function findBugs() {
		// Checks the openedFiles string for errors:
		
		var text = window.localStorage.openedFiles;

		
		var firstChar = text.charAt(0);
		var lastChar = text.charAt(text.length-1);
		
		if(text.indexOf(fileDelimiter + fileDelimiter) > -1) console.error(new Error("Text contains double commas: " + text));
		if(firstChar == fileDelimiter) console.error(new Error("First character is a comma: " + text));
		if(lastChar == fileDelimiter) console.error(new Error("Last character is a comma: " + text));
		if(firstChar == " ") console.error(new Error("First character is a space: " + text));
		if(lastChar == " ") console.error(new Error("Last character is a space: " + text));
		
		if(text == undefined) console.error(new Error("Text is undefined: " + text));
		if(text == 'undefined') console.error(new Error("Text is 'undefined': " + text));
		
		// Check for duplex
		var array = text.split(fileDelimiter);
		for(var i=0; i<array.length; i++) {
			for(var j=i+1; j<array.length; j++) {
				if(array[i] == array[j]) console.error(new Error("Element " + i + ": " + array[i] + " and  " + j + ": " + array[j] + " is the same! "));
			}
		}
		
		
		/*
		// Sanity check
		for(var path in editor.files) {
			if(window.localStorage.openedFiles.indexOf(path) == -1) {
				console.error(new Error("editor.files path=" + path + " not in window.localStorage.openedFiles=" + window.localStorage.openedFiles));
			}
		}
		var check = window.localStorage.openedFiles.split(fileDelimiter);
		for(var i=0; i<check.length; i++) {
			if(!editor.files.hasOwnProperty(check[i])) {
				console.error(new Error("window.localStorage.openedFiles path=" + check[i] + " not in editor.files!\nwindow.localStorage.openedFiles=" + window.localStorage.openedFiles));
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
	
	
	
	
})();