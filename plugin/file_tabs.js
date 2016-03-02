(function() {
	/*
	
	Reopen file (tabs) opened from last session 
	
	Note: window.localStorage only supports strings!!
	
	nwjs bug: window.localStorage sometimes not available!
	
	This file was merged with reopen_files.js
	
	OBS: Reloading in dev mode wont save the state!
	
	*/
	
	"use strict";
	
	var saveStateInterval = 5000;
	var loadOrder = 50000; // Plugins depending on fileLoad must be loaded before this plugin, so we set it high!
	
	var lastViewedFileHistory = [],
		lastFile,
		currentFile,
		fileList = [];
	
	
	editor.on("start", file_tabs, loadOrder);

	
	function file_tabs() {

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
			files.forEach(openFile);
			
			lastViewedFileHistory = window.localStorage.openedFiles.split(",");
		}
		
		if(setCurrent) {
			// Now make the file with last state "open" the current file
			if(global.currentFile) {
				global.currentFile.hide();
			}
			
			// Switch to this file
			var file = global.files[setCurrent];
			global.currentFile = file;
			file.show();
			//file.load(); // It has already loaded, right!? So we do not have to fire load events again!!??
		}
		
		
		buildTabs();
		
		// After we have opened the files, set listener for file load and close ...
		editor.on("fileLoad", addToOpenedFiles, 1);
		editor.on("fileLoad", loadFile_tabs, 2);
		
		editor.on("fileClose", removeFromOpenedFiles, 1);
		editor.on("fileClose", closeFile_tabs, 2);
		
		// Use editor close event
		editor.on("exit", reopen_files_closeEditor);
		
		// Save state on regular intervals in case the editor crashes (or refresh)
		setInterval(reopen_files_closeEditor, saveStateInterval);
		
		editor.on("edit", tabFileChange);
		editor.on("saved", tabFileSave);

		global.keyBindings.push({charCode: 9, combo: CTRL, fun: switchTab}); // Ctrl + tab

		global.keyBindings.push({charCode: 37, combo: CTRL + ALT, fun: orderLeft}); // Ctrl + alt + left
		global.keyBindings.push({charCode: 39, combo: CTRL + ALT, fun: orderRight}); // Ctrl + alt + right
		// toto: implement tab drag and drop to change order
		
		editor.resizeNeeded(); // Resize at least once after the editor has loaded, or we wont have data for screen with etc.
		
		function openFile(path) {
			
			// Check protocol!?
			
			// Open in sync to get them in the same order
			var content, notFound = false, loadLastState = false;
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
			
			var lastFileState = loadState(path);
			
			if(lastFileState) {
				
				console.log("loadLastState=" + loadLastState);
				console.log("lastFileState.isSaved=" + lastFileState.isSaved);
				
				if(notFound) {
					// Only ask if we actually have the last state, otherwise just ignore that it's gone.
					if(confirm("File not found! Load last saved state? path=: " + path)) {
						loadLastState = true;
					}
					else {
						loadLastState = false;
					}
				} 
				// scenario: File has been emptied because of no disk space (*couch* Linux *couch*)
				else if(content.length === 0 && lastFileState.text.length > 0) {
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

			if(!isString(content)) {
				console.warn("Unable to load content from " + path + " (it's not a string!)");
				removeFromOpenedFiles(path);
			}
			else {
				
				editor.openFile(path, content, function(file) {
					
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
						
						if(lastFileState.isSaved !== undefined) {
							file.isSaved = lastFileState.isSaved;
						}

						if(lastFileState.open === true) setCurrent = path;
						
						console.log("Loaded old state for " + path + " file.startRow=" + file.startRow);
						
					}
					else {
						// If there is no last state: Assume the file is saved.
						file.isSaved = true;
						file.savedAs = true;
						
					}
					
				});
			}
					
		}
		
		
		
		
		
	}
	
	function orderLeft() {
		
		console.log("Orderleft");
		
		/*
		for(var i=0; i<fileList.length; i++) {
			if(fileList[i] == global.currentFile) {
				break;
			}
			
			console.log("incrementing " + fileList[i].name);

			fileList[i].order++;
		}
		*/
		
		global.currentFile.order-=1.5;

		buildTabs(); // sorts again
	}
	
	function orderRight() {
		console.log("Orderright");

		/*
		var found = false;

		for(var i=0; i<fileList.length; i++) {
			if(fileList[i] == global.currentFile) {
				found = true;
			}
			else if(found) {
				console.log("decrementing " + fileList[i].name);
				fileList[i].order--;
			}
		}
		*/
		
		global.currentFile.order+=1.5;

		buildTabs(); // sorts again
	}
	
	
	function sortFileList() {
		fileList.length = 0;
		for(var path in global.files) {
			fileList.push(global.files[path]);
		}
		fileList.sort(sortOrder);
		
		var order = 0;
		
		// debug
		for(var i=0; i<fileList.length; i++) {
			console.log(fileList[i].order + " = " + fileList[i].path);
		}
		
		// Reorder it
		var order = 0;
		for(var i=0; i<fileList.length; i++) {
			fileList[i].order = order++;
		}
		
		global.fileOrder = order++;
		
		function sortOrder(a, b) {
			if(a.order < b.order) {
				return -1;
			}
			else if(b.order < a.order) {
				return 1;
			}
			else {
				return 0;
			}
		}
	}
	
	function switchTab() {
		// Open last tab, if it's not closed
		
		if(lastFile) {
			return switchToFile(lastFile);
		}
		else {
			for(var i=0; i< lastViewedFileHistory.length; i++) {
				if(lastViewedFileHistory[i] != currentFile) {
					return switchToFile(lastViewedFileHistory[i]);
				}
			}
			
		}
		
		console.warn("No file to switch to!");
		
	}
	
	function tabFileChange(file, change, text, index, row, col) {
		
		var el = document.getElementById("tabFileItem_" + file.path);
		
		showUnsavedStatus(el);
		
	}
	
	function showUnsavedStatus(el) {
		// What will happen when the file is unsaved:
		el.style.fontWeight = "bold";
	}
	
	function tabFileSave(file) {
		var el = document.getElementById("tabFileItem_" + file.path);
		
		// What will happen when the file is saved:
		el.style.fontWeight = "normal";
		
		
		var closeFileButton = document.getElementById("close_" + file.path);
		
		closeFileButton.setAttribute("class", "closeFileTab");

	}
	
	
	function loadFile_tabs(file) {
		lastViewedFileHistory.push(file.path);
		

		buildTabs();
		
		// Switch to the file we just loaded
		switchToFile(file.path);
	}
	
	function closeFile_tabs(file) {
		
		console.log("closing " + file.path);
		
		while(lastViewedFileHistory.indexOf(file.path) > -1) {
		lastViewedFileHistory.splice(lastViewedFileHistory.indexOf(file.path),1);
		}
		
		lastViewedFileHistory.forEach(function(obj) {
			console.log("lastViewedFileHistory:" + obj)
		});
		
		if(lastViewedFileHistory.length > 0) {
			// Go to last viewed file
			switchToFile(lastViewedFileHistory[lastViewedFileHistory.length-1]);
		}
		
		buildTabs();
		
		editor.renderNeeded();
		editor.resizeNeeded();
		

		
		
	}
	
	
	function switchToFile(path) {
		
		if(currentFile == path) {
			console.warn("Tab to " + path + " already in view!");
			return;
		}
		
		if(global.files[path] == undefined) {
			console.warn("There is no file open with path=" + path);
			return;
		}
		
		lastFile = currentFile;
		currentFile = path;
			
		console.log("Swithing to " + path);
			
		if(global.currentFile) {
			console.log("Hiding " + global.currentFile.path)
			global.currentFile.hide();
		}
		
		global.currentFile = global.files[path];
		
		global.currentFile.show();
		
		buildTabs();
		
		editor.resizeNeeded();
		editor.renderNeeded();

		console.log("Switched file to: " + path);

		
	}
	

	function buildTabs() {
		
		console.log("Building tabs ...");
		
		var tabList = document.getElementById("tabList");
		
		if(tabList !== null) {
			// Empty the list
			while(tabList.firstChild ) {
			  tabList.removeChild( tabList.firstChild );
			}
		}
		
		
		
		sortFileList(); // Make sure the file's are in order
		
		// Create tabs
		for(var i=0; i<fileList.length; i++) {
			console.log(i + "=" + fileList[i].path);
			openTab(fileList[i].path);
		}

	}
	
	
	function openTab(path) {
		
		console.log("openTab: " + path);
		
		var header = document.getElementById("header");
		var tabList = document.getElementById("tabList");
		var folderSeparator = path.indexOf("\\") > -1 ? "\\" : "/";
		var folders = path.split(folderSeparator);
		var folderName = "";
		var fileName = path.substring(path.lastIndexOf(folderSeparator)+1, path.lenght);
		var folderList;
		var single = ""; // Single file in tabgroup
		var tabFolderItem;
		var active = global.currentFile ? (global.currentFile.path==path) : false;
		
	
		console.log("path=" + path + " active=" + active);

		if(active) {
			currentFile = path;
		}
		
		if(!tabList) createTabList();
		
		//if(fileName == "file2.txt") active = true;
		
		var tabFileItem = document.createElement("li");
		
		tabFileItem.setAttribute("class", "tabFileItem");
		tabFileItem.setAttribute("title", path);
		tabFileItem.setAttribute("id", "tabFileItem_" + path);
		

		if(global.files[path].isSaved == false) {
			showUnsavedStatus(tabFileItem)
		}
		
		
		tabFileItem.appendChild(document.createTextNode(fileName));
		tabFileItem.addEventListener("click", clickTab, true);

		var closeFileButton = document.createElement("button");
		closeFileButton.setAttribute("class", "closeFileTab");
		closeFileButton.setAttribute("title", "Close "+ fileName);
		closeFileButton.setAttribute("id", "close_" + path);
		closeFileButton.innerHTML = "&times;"; // x
		closeFileButton.addEventListener("click", closeTab, true); // Stop propagation so that we do not switch to this file.
		// The click goes through anyway for some weird reason ...
		
		tabFileItem.appendChild(closeFileButton);
		
		
		
		if(folders.length > 1) {
			folderName = folders[folders.length-2];
		}
		else {
			folderName = fileName;
		}
			
		folderList = document.getElementById("tab_folder_list_" + folderName);
		tabFolderItem = document.getElementById("tab_folder_" + folderName);
		
		if(!folderList) {
			createFolder(folderName);
			single = " single";
		}
		else {
			single = "";
		}
		
		folderList.appendChild(tabFileItem);
		
		if(active) {
			
			// Make last active tab inactive!??
			
			folderList.setAttribute("class", "folderFileList active");
			
			tabFileItem.setAttribute("class", "tabFileItem active");
			
			tabFolderItem.setAttribute("class", "tabFolderItem active" + single);
			
			console.log("tabFolderItem.class=" + tabFolderItem.getAttribute("class"));
			
		}
		else {
			tabFolderItem.setAttribute("class", "tabFolderItem" + single);
			tabFileItem.setAttribute("class", "tabFileItem");

		}
		
		/*
			If one childtab is active, the parent (tabFileItem) should also be active!
		*/
		var childNodes = folderList.childNodes;

        for(var i=0; i<childNodes.length; i++) {
            if(childNodes[i].getAttribute("class").indexOf("active") > -1) {
				tabFolderItem.setAttribute("class", "tabFolderItem active" + single);
			}
        }
		
		
		
		function createFolder(folderName) {
			tabFolderItem = document.createElement("li");
			tabFolderItem.setAttribute("class", "tabFolderItem");
			tabFolderItem.setAttribute("id", "tab_folder_" + folderName);
			
			folderList = document.createElement("ul");
			folderList.setAttribute("class", "folderFileList");
			folderList.setAttribute("id", "tab_folder_list_" + folderName);
			
			tabFolderItem.appendChild(document.createTextNode(folderName));
			tabFolderItem.appendChild(folderList);
			
			tabList.appendChild(tabFolderItem);
			
		}
		
		function closeTab(e) {
			var closeFileButton = e.target;

			console.log("saved?" + global.files[path].isSaved);
			console.log("e.ctrlKey?" + e.ctrlKey);
			console.log("closeFileButton=" + closeFileButton);
			console.log("closeFileButton.class=" + closeFileButton.getAttribute("class"));
			
			
			if(!global.files[path].isSaved && !e.ctrlKey) {
				
				closeFileButton.setAttribute("title", "Ctrl click to close "+ fileName + " without saving");
				
				//closeFileButton.setAttribute("class", "blink closeFileTab ");
				closeFileButton.setAttribute("class", "closeFileTab blink");

				alert("File not saved.\nCtrl click to close without saving.");
				console.log("closeFileButton.class=" + closeFileButton.getAttribute("class"));

				closeFileButton.blur();
				
			}
			else {
				editor.closeFile(path);
			}
			
			return false;
			
		}
		
		function clickTab() {
			switchToFile(path);
		}
		
		function createTabList() {
			tabList = document.createElement("ul");
			tabList.setAttribute("id", "tabList");
			tabList.setAttribute("class", "tabList");

			tabList.setAttribute("class", "noselect"); // Disable text selecting
			
			
			header.appendChild(tabList);
			
			
		}
		
	}
	
	function changeOrder() {
		// Files are loaded in the order witch they are opened.
		
		
		
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
			
			if(global.currentFile) {
				// Make sure the last viewed file is the last file in the window.localStorage.openedFiles list! So that it opens lasts and will be in view when we reload.
				//reopenToFiles(global.currentFile);
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
			console.log("global.files=" + Object.keys(global.files).join(","));
			console.log("window.localStorage.openedFiles=" + window.localStorage.openedFiles);
			
			return;
		}
		
		var state = {};
		
		var file = global.files[path];
		
		if(!file) {
			// Possible reasons: it was renamed!? It should have been removed first!
			//console.warn("File not in global.files, was it renamed? open: " + file);
			//return;
			console.warn("File='" + path + "' not open! global.files=" + JSON.stringify(Object.keys(global.files)) + "");
			return false;
		}
		
		if(file == global.currentFile) {
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
		
		//if(!state.isSaved) {
			// Size limit!??
		// Always save the text, even if it's saved to disk. (it can be deleted, or disk space limit truncated it)
		state.text = file.text;
		//}
		
		window.localStorage["state_" + path] = JSON.stringify(state);
		
	}
	
	
	function reopenToFiles(file) {
		removeFromOpenedFiles(file);
		addToOpenedFiles(file);
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
		
		console.log("Removing from opened files: " + file.path)
		console.log("AFTER REMOVE");
		console.log("window.localStorage.openedFiles:\n" + window.localStorage.openedFiles);
		
		console.log("Items in localstorage:");
		for(var item in window.localStorage) {
			console.log(item + "=" + window.localStorage[item]);
		}
		
		// Sanity check
		for(var path in global.files) {
			if(window.localStorage.openedFiles.indexOf(path) == -1) {
				console.warn("global.files path=" + path + " not in window.localStorage.openedFiles!");
			}
		}
		var check = window.localStorage.openedFiles.split(",");
		for(var i=0; i<check.length; i++) {
			if(!global.files.hasOwnProperty(check[i])) {
				console.warn("window.localStorage.openedFiles path=" + check[i] + " not in global.files!\nwindow.localStorage.openedFiles=" + window.localStorage.openedFiles);
			}
		}
		
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