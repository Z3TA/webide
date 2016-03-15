(function() {
	/*
		Open up the files from last time, when opening the editor.
		
		Save a backup on each file when it close, and on regular intervals (incase the editor crash)
		Offer to load the backup file if it's gone or empty
		
		Load unsaved files from when the editor last closed.
		
		Note: window.localStorage only supports strings!!
		
		nwjs bug: window.localStorage sometimes not available!
		
	*/
	
	"use strict";
	
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
			window.localStorage.openedFiles = "Z:\\nw\\JZedit\\test\\bar"; // text string!
		}
		
		// Fix old bugs
		window.localStorage.openedFiles = fixCommas(window.localStorage.openedFiles);
		
		
		console.log("window.localStorage.openedFiles:\n" + window.localStorage.openedFiles);
		
		var setCurrent = "";
		var files = window.localStorage.openedFiles.split(",");
		
		console.log("files=" + JSON.stringify(files));
		
		if(window.localStorage.openedFiles.length > 0) { // window.localStorage.openedFiles is a string with path separated by comma
			console.log("Opening " + openFile.length + " files ...");
			
			// Note: the file tab plugin will sort the tabs by file.order every time a new file is opened!
			for(var i=0; i<files.length; i++) {
				
				console.log("gonna open files[" + i + "]=" + files[i]);
				
				openFile(files[i], function(file, lastOpened) {

					console.log("opened file.path=" + file.path);
					
					if(lastOpened) setCurrent = file.path;
					
					// Check if all has been opened
					var files = window.localStorage.openedFiles.split(","); // A file can be removed, so remake the array
					var allOpened = true;
					for(var j=0; j<files.length; j++) {
						if(!editor.files.hasOwnProperty(files[j])) {
							console.log("not yet all opened");
							allOpened = false;
							break;
						} 
					}
					
					if(allOpened) allFilesOpened();

					
				});
			}

			
		}
		

		function allFilesOpened() {
			
			console.log("All files from last lession opened!");
			
			console.log("setCurrent=" + setCurrent);

			
			if(setCurrent) {
				// Now make the file with last state "open" the current file
				
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
			
			// Check protocol!?
			
			var content, notFound = false, loadLastState = false;

			var fileSizeOnDisk = editor.fileSizeOnDisk(path);
			
			if(fileSizeOnDisk.code === 'ENOENT') {
				notFound = true;
			}
			else if(fileSizeOnDisk.code) {
				console.error(fileSizeOnDisk);
			}
			
			
			/*
			try {
				content = fs.readFileSync(path, "utf8");
			} catch (e) {
				if (e.code === 'ENOENT') {
					console.log('File not found:' + path);
					//console.error(e);
					notFound = true;
					content = "";
				} else {
					console.error(e);
				}
			}
			*/
			
			var lastFileState = loadState(path);
			
			if(lastFileState) {
				
				console.log("loadLastState=" + loadLastState);
				console.log("lastFileState.isSaved=" + lastFileState.isSaved);
				
				if(notFound) {
					// Only ask if we actually have the last state, otherwise just ignore that it's gone.
					// Don't ask if lastFileState.isSaved === false, because it will be loaded anyway if thats right.
					if(lastFileState.isSaved != false) loadLastState = confirm("File not found! Load last saved state? path=: " + path);
				}
				// scenario: File has been emptied because of no disk space (*cough* Linux *cough*)
				else if(fileSizeOnDisk === 0 && lastFileState.text.length > 0) {
					if(confirm("File on disk is empty! Load last saved state instead? path=: " + path + "")) {
						loadLastState = true;
					}
					else {
						loadLastState = false;
					}
				}
				
				if(loadLastState) lastFileState.isSaved = false; // Mark file as not saved.
				
				if( loadLastState || lastFileState.isSaved === false ) {
					// Open from temp
					console.warn("Loading last saved state for file path=" + path);
					content = lastFileState.text;
					
					//console.log("content=" + content);
					
				}

			}
			
			
			editor.openFile(path, content, function(file) {
				
				console.log("Opening file:" + path);
				
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
				
			});
		}

		
	}
	
	function addToOpenedFiles(file) {
		
		if(window.localStorage.openedFiles.indexOf(file.path) == -1) {
			window.localStorage.openedFiles += "," + file.path;
		}
		
		window.localStorage.openedFiles = fixCommas(window.localStorage.openedFiles);
		
		
		console.log("window.localStorage.openedFiles:\n" + window.localStorage.openedFiles);
		
	}
	
	function removeFromOpenedFiles(file) {
		
		var filePath = "";
		
		if(typeof file == "string") {
			filePath = file;
		}
		else {
			filePath = file.path;
		}
		
		window.localStorage.openedFiles = removeText(window.localStorage.openedFiles, filePath);
		
		window.localStorage.openedFiles = fixCommas(window.localStorage.openedFiles);
		
		// Remove state
		window.localStorage.removeItem("state_" + filePath);
		
		/*
		console.log("Removing from opened files: " + file.path)
		console.log("AFTER REMOVE");
		console.log("window.localStorage.openedFiles:\n" + window.localStorage.openedFiles);
		
		console.log("Items in localstorage:");
		for(var item in window.localStorage) {
			console.log(item + "=" + window.localStorage[item]);
		}
		*/
		
		// Sanity check
		for(var path in editor.files) {
			if(window.localStorage.openedFiles.indexOf(path) == -1) {
				console.warn("editor.files path=" + path + " not in window.localStorage.openedFiles!");
			}
		}
		var check = window.localStorage.openedFiles.split(",");
		for(var i=0; i<check.length; i++) {
			if(!editor.files.hasOwnProperty(check[i])) {
				console.warn("window.localStorage.openedFiles path=" + check[i] + " not in editor.files!\nwindow.localStorage.openedFiles=" + window.localStorage.openedFiles);
			}
		}
		
	}
	
	function reopen_files_closeEditor() {
		// Save file state
		
		if(!window.localStorage) console.error(new Error("window.localStorage not available!"));
		
		if(window.localStorage.getItem("openedFiles") == null) {
			console.warn("No open files!?");
			return true;
		}
		else {
			var openFiles = window.localStorage.openedFiles.split(",");
			
			// note: "".split(",").length == 1 !!
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
			console.log("editor.files=" + Object.keys(editor.files).join(","));
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
	
	function removeText(text, removeString) {
		var pos = text.indexOf(removeString)-1,
			length = removeString.length,
			index = pos + length +1;
		
		console.log("Removing '" + removeString + "' from:\n'" + text + "'");
		
		text = text.substring(0, pos) + text.substring(index, text.length);
		
		return text;
	}
	
	function fixCommas(text) {
		// Sometimes extra commas sneak in, I dunno why, so let's fix the symptoms :P
		// No. Lets do it property and throw errors if we find something wrong
		
		var firstChar = text.charAt(0);
		var lastChar = text.charAt(text.length-1);
		
		if(text.indexOf(",,") > -1) console.error(new Error("Text contains double commas: " + text));
		if(firstChar == ",") console.error(new Error("First character is a comma: " + text));
		if(lastChar == ",") console.error(new Error("Last character is a comma: " + text));
		if(firstChar == " ") console.error(new Error("First character is a space: " + text));
		if(lastChar == " ") console.error(new Error("Last character is a space: " + text));
		
		return text;
		
		text = text.trim();
		
		// Remove double commas
		while(text.indexOf(",,") > -1) {
			console.warn("Removing double comma from: " + text);
			text = text.replace(",,", ",");
		}
		
		text = text.trim();
		
		// Remove leading commas
		while(text.charAt(0) == ",") {
			console.warn("Removing leading comma from: " + text);
			text = text.substring(1, text.length);
		}
		
		// Remove trailing commas
		while(text.charAt(text.length-1) == ",") {
			console.warn("Removing trailing comma from: " + text);
			text = text.substring(1, text.length-1);
		}
		
		
		
		return text;
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