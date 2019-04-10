
(function() {
	
	"use strict";
	
	var gotoDiv;
	var footer;
	var gotoInputIsVisible = false;
	var inputGoto;
	var gotoButton;
	var gotoList;
	var selectedChild = 0;
	var inputFolder;
	var isSearching = false;
	var searchTimer;
	var currentDir;
	var matchesFound = 0;
	var keyUp = 38;
	var keyDown = 40;
	var charEscape = 27;
	var charEnter = 13;
	var keyTab = 9;
	var workingDir;
	var progressBar;
	var fileCache = [];
	var defaultMaxResults = 20;
	var maxResults = defaultMaxResults;
	var lastSearchText = "";
	var lastTypedText = "";
	var menuItem;
	var folderPicker;
	
	EDITOR.plugin({
		desc: "Open any file ...",
		load: gotoFile_load,
		unload: gotoFile_unload
	});
	
	function gotoFile_load() {
		
		footer = document.getElementById("footer");
		gotoDiv = document.getElementById("goto");
		inputGoto = document.getElementById("inputGoto");
		gotoButton = document.getElementById("buttonGoto");
		gotoList = document.getElementById("gotoList");
		inputFolder = document.getElementById("inputFolder");
		
		// Sanity check
		if(!footer) {
			throw new Error("Can not find the footer!");
		}
		
		// Create the hypertext markup if it doesn't existpppp
		
		//build_gotoInput();
		
		hide_gotoFileInput();
		
		var charP = 80;
		var charO = 79;
		
		EDITOR.bindKey({desc: "Open file by searching for file path", charCode: charP, combo: CTRL, fun: show_gotoFileInput}); // ctrl + P
		EDITOR.bindKey({desc: "Open file by searching for file path", charCode: charO, combo: CTRL, fun: show_gotoFileInput2}); // ctrl + O
		EDITOR.bindKey({desc: "Hide the goto-line GUI", charCode: charEscape, fun: hide_gotoFileInput});
		EDITOR.bindKey({desc: "Move up on the goto-file list", charCode: keyUp, fun: gotoFile_moveUp});
		EDITOR.bindKey({desc: "Move up on the goto-file list", charCode: keyDown, fun: gotoFile_moveDown});
		EDITOR.bindKey({desc: "Open a local file using native file select dialog", charCode: charO, combo: CTRL + SHIFT, fun: openFile});
		
		EDITOR.registerAltKey({char: "o", alt:2, label: "open file", fun: show_gotoFileInput});
		
		EDITOR.on("openFileTool", openLocalFileTool);
		EDITOR.on("openFileTool", openAnyFileTool);
		
		CLIENT.on("findFilesStatus", gotoFileProgressStatus);
		CLIENT.on("fileFound", gotoFileFileFound);
		CLIENT.on("pathGlob", gotoFilePathGlob);
		
		menuItem = EDITOR.addMenuItem('Open/search file', show_gotoFileInput, 4);
		
		//menu = EDITOR.addMenuItem('Open file from <i title="computer/phone/usb">device</i>', openFile);
		
	}
	
	function gotoFile_unload() {
		EDITOR.unbindKey(show_gotoFileInput);
		EDITOR.unbindKey(show_gotoFileInput2);
		EDITOR.unbindKey(hide_gotoFileInput);
		EDITOR.unbindKey(gotoFile_moveUp);
		EDITOR.unbindKey(gotoFile_moveDown);
		EDITOR.unbindKey(openFile);
		
		EDITOR.unregisterAltKey(show_gotoFileInput);
		
		EDITOR.removeEvent("openFileTool", openAnyFileTool);
		
		CLIENT.removeEvent("findFilesStatus", gotoFileProgressStatus);
		CLIENT.removeEvent("fileFound", gotoFileFileFound);
		CLIENT.removeEvent("pathGlob", gotoFilePathGlob);
		
		 
		
		EDITOR.removeMenuItem(menuItem);
		
		hide_gotoFileInput();
	}
	
	
	function openFile() {
		
		EDITOR.hideMenu();
		
		console.log("Opening file ...");
		
		var defaultPath = "";
		var file = EDITOR.currentFile;
		
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
					//EDITOR.render(); // It will be black!? if we render right away!
					
				});
				
				return false; // Exit function, and prevent default browser action
				
			}
			
			// Change default directory to the same as current file
			
			if(file.path.indexOf(EDITOR.workingDirectory) != -1) defaultPath = EDITOR.workingDirectory;
			else {
				var folders = UTIL.getFolders(file.path);
				if(folders.length > 0) folders.pop(); // Use parent folder
				defaultPath = folders.pop();
				console.log("defaultPath=" + defaultPath);
			}
			
		}
		else {
			// No current file opened. Use working dir!?
			//defaultPath = EDITOR.workingDirectory;
		}
		
		//alertBox(defaultPath);
		// It doesn't seem we can set default path in Linux !
		
		openLocalFile(defaultPath);
		
		return false; // Prevent default
	}
	
	function openLocalFile(directory) {
		console.log("Telling the editor to open the file dialog window ...");
		EDITOR.localFileDialog(directory, function after_dialog_open_file(filePath, content) {
			
			//console.log("filePath=" + filePath);
			//console.log("content=" + content);
			
			console.log("File was selected from file dialog: " + filePath + "\nTelling the editor to open it up for editing ...")
			
			EDITOR.openFile(filePath, content, function after_open_file(err, file) {  // path, content, callback
				
				if(err) throw err;
				
				// Mark the file as saved, because we just opened it
				file.isSaved = true;
				file.savedAs = true;
				file.changed = false;
				
				EDITOR.renderNeeded();
				EDITOR.render();
				console.log("File ready for editing");
				
			});
		});
	}
	
	function openLocalFileTool(options) {
		// Only answer on openFileTool events if we are running locally/"native"
		if(EDITOR.user.home == "/") return false;
		
		var directory = options.directory;
		
		openLocalFile(directory);
		
	}
	
	function openAnyFileTool(options, filePath) {
		
		var directory = options.directory;
		
		if(directory) {
			if(inputFolder) inputFolder.value = directory;
			else EDITOR.changeWorkingDir(directory);
		}
		
		show_gotoFileInput();
		
		if(filePath) {
			if(inputGoto) inputGoto.value = filePath;
			trySearch();
			inputGoto.focus();
		}
		
		return true; // true means we handled it
		
	}
	
	function build_gotoInput(folderToSearchIn) {
		
		gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("id", "gotoDiv");
		gotoDiv.setAttribute("class", "gotoFile");
		
		progressBar = document.createElement("progress");
		progressBar.setAttribute("class", "progress findFiles");
		progressBar.setAttribute("style", "display: none; width: 100%");
		progressBar.setAttribute("value", "0");
		progressBar.setAttribute("max", "1");
		
		inputGoto = document.createElement("input");
		inputGoto.setAttribute("type", "text");
		inputGoto.setAttribute("id", "inputGoto");
		inputGoto.setAttribute("class", "inputtext");
		inputGoto.setAttribute("placeholder", "Filename (regexp)");
		
		inputFolder = document.createElement("input");
		inputFolder.setAttribute("type", "text");
		inputFolder.setAttribute("id", "inputFolder");
		inputFolder.setAttribute("class", "inputtext");
		inputFolder.setAttribute("value", folderToSearchIn || EDITOR.workingDirectory);
		inputFolder.setAttribute("size", Math.max(EDITOR.workingDirectory.length + 3, 20));
		inputFolder.setAttribute("default", folderToSearchIn || EDITOR.workingDirectory);
		
		
		var labelGoto = document.createElement("label");
		labelGoto.setAttribute("for", "inputGoto");
		labelGoto.appendChild(document.createTextNode("File (search):")); // Language settings!?
		
		var labelFolder = document.createElement("label");
		labelFolder.setAttribute("for", "inputFolder");
		labelFolder.appendChild(document.createTextNode(" in directory:")); // Language settings!?
		
		gotoButton = document.createElement("input");
		gotoButton.setAttribute("type", "button");
		gotoButton.setAttribute("class", "button");
		gotoButton.setAttribute("id", "gotoButton");
		gotoButton.setAttribute("value", "Open");
		gotoButton.setAttribute("title", "Press Enter to Open selected file");
		
		var cancelButton = document.createElement("input");
		cancelButton.setAttribute("type", "button");
		cancelButton.setAttribute("class", "button");
		cancelButton.setAttribute("id", "cancelButton");
		cancelButton.setAttribute("value", "Cancel");
		
		var localButton = document.createElement("button");
		localButton.setAttribute("type", "button");
		localButton.setAttribute("class", "button");
		localButton.innerHTML = 'Open file from <i title="computer/phone/usb">device</i>...';
		localButton.onclick = openFile;
		
		gotoList = document.createElement("ul");
		gotoList.setAttribute("id", "gotoList");
		gotoList.setAttribute("title", "Use keyboard up/down arrow to select a file from the list");
		
		//var li = document.createElement("li");
		//li.appendChild(document.createTextNode("test 123"));
		//gotoList.appendChild(li);
		
		gotoDiv.appendChild(gotoList);
		
		gotoDiv.appendChild(progressBar);
		
		gotoDiv.appendChild(labelGoto);
		gotoDiv.appendChild(inputGoto);
		
		gotoDiv.appendChild(labelFolder);
		gotoDiv.appendChild(inputFolder);
		
		gotoDiv.appendChild(gotoButton);
		gotoDiv.appendChild(localButton);
		gotoDiv.appendChild(cancelButton);
		
		
		
		folderPicker = document.createElement("div");
		folderPicker.setAttribute("class", "folderPicker");
		gotoDiv.appendChild(folderPicker);
		
		footer.appendChild(gotoDiv);
		
		gotoButton.addEventListener("click", gotoFile, false);
		
		cancelButton.addEventListener("click", hide_gotoFileInput, false);
		
		inputGoto.addEventListener("keyup", typing, false);
		inputGoto.addEventListener("keydown", keydown, false);
		inputGoto.addEventListener('paste', paste, false);
		
		//inputFolder.addEventListener("keyup", chandingDir, false);
		
		gotoInputIsVisible = true;
		
		console.log("built gotoInput!");
		
	}
	
	function keydown(keyDownEvent) {
		while(folderPicker.firstChild) folderPicker.removeChild(folderPicker.firstChild); // Clear options
		
		var code = UTIL.code(keyDownEvent);
		
		if(code == keyTab) {
			var text = inputGoto.value;
			if(text.length == 0) return ALLOW_DEFAULT;
			
			EDITOR.autoCompletePath({path: text, onlyDirectories: true}, function(err, path, options) {
				console.log("autoCompletePath text=" + text + " path=" + path + " err=" + err + " options=" + JSON.stringify(options));
				if(err && err.code != "ENOENT") return alertBox(err.message);
				else if(!err && path != inputGoto.value) {
					inputGoto.value = path;
				typing();
				}
				console.log("autoCompletePath path=" + text + " options.length=" + (options && options.length) + " options=" + JSON.stringify(options));
				if(options && options.length > 1) {
					options.forEach(addFolderOption);
					EDITOR.resizeNeeded();
				}
			});
			keyDownEvent.preventDefault();
			return PREVENT_DEFAULT;
		}
		else return ALLOW_DEFAULT;
	}
	
	function addFolderOption(path) {
		var button = document.createElement("button");
		var name = UTIL.getFolderName(path);
		button.innerText = name;
		button.onclick = function clickButton() {
			inputGoto.value = path;
			inputGoto.focus();
			typing();
		}
		folderPicker.appendChild(button);
	}
	
	function paste(pasteEvent) {
		// Pasting into inputGoto
		
		if(inputGoto.value) return true; // There's already text, don't mess it up
		
		if (window.clipboardData && window.clipboardData.getData) { // IE
			var text = window.clipboardData.getData('Text');
		} else if (pasteEvent.clipboardData && pasteEvent.clipboardData.getData) {
			var text = pasteEvent.clipboardData.getData('text/plain');
		}
		
		text = text.trim();
		
		if(text.indexOf("/") != -1 || text.indexOf("\\") != -1) {
			// It's probably a path.
			
			//  We want to move the folder part into inputFolder
			
			var dir = UTIL.getDirectoryFromPath(text);
			var file = UTIL.getFilenameFromPath(text);
			
			inputGoto.value = file;
			inputFolder.value = dir;
			
			pasteEvent.preventDefault();
			typing();
			return false;
			
		}
		
		return true;
	}
	
	function typing(keyUpEvent) {
		
		var text = inputGoto.value;
		
		if(typeof keyUpEvent == "object") {
			
			var code = UTIL.code(keyUpEvent);
			
			console.log("typing: code=" + code + " keyUpEvent.keyCode=" + keyUpEvent.keyCode + " EDITOR.input=" + EDITOR.input + " text=" + text + " lastTypedText=" + lastTypedText + " lastSearchText=" + lastSearchText);
			
			keyUpEvent.preventDefault();
			
			if (code == charEnter) {
				gotoFile();
			return;
		}
			else if(code == charEscape) {
			hide_gotoFileInput();
			return;
		}
			else if(code == keyUp) {
			//gotoFile_moveUp();
			inputGoto.focus();
			return;
		}
			else if(code == keyDown) {
			//gotoFile_moveDown();
			inputGoto.focus();
			return;
		}
		}
		
		try {
			var reName = new RegExp(text, "ig");
		}
		catch(err) {
			var regexpError = true;
		}
		
		if(regexpError) {
			inputGoto.setAttribute("class", "inputtext error");
			return;
		}
		else {
			inputGoto.setAttribute("class", "inputtext");
		}
		
		if(text.length > 0) {
			// If using shift and other combo key, this will be called twice without the text changing
			if(text == lastTypedText && lastTypedText == lastSearchText) {
				console.warn("typing same: text=" + text + " lastTypedText=" + lastTypedText + " lastSearchText=" + lastSearchText);
				return;
			}
			lastTypedText = text;
			if(isSearching) {
				console.log("abortFindFiles because: typing() and isSearching=" + isSearching + " (is true)");
				abortFindFiles();
				inputFolder.value = inputFolder.getAttribute("default");
			}
			
			trySearch();
		}
		else {
			EDITOR.resizeNeeded();
		}
		
	}
	
	function trySearch() {
		
		var text = inputGoto.value;
		
		console.log("trySearch: isSearching=" + isSearching + " text=" + text);
		
		if(lastSearchText == text) {
			UTIL.getStack("trySearch repeated! text=" + text + " lastSearchText=" + lastSearchText + " isSearching=" + isSearching);
			//return;
		}
		
		clearTimeout(searchTimer); // Clear any queued up searches
		
		// Clear the list
		matchesFound = 0;
		while(gotoList.firstChild) {
			gotoList.removeChild(gotoList.firstChild);
		}
		EDITOR.resizeNeeded();
		
		
		
		// Search the cache first
		var searchPath = inputFolder.value;
		var toIgnore = [];
		var reName = new RegExp(text, "ig");
		for (var i=0, match; i<fileCache.length; i++) {
			match = fileCache[i].match(reName);
			if(match && fileCache[i].indexOf(searchPath) == 0) {
				appendResult(fileCache[i], match);
				toIgnore.push(fileCache[i]);
				if(matchesFound >= defaultMaxResults) {
					if(isSearching) {
						console.log("abortFindFiles because: Max results found via cache and isSearching=" + isSearching + " (is true)!");
						abortFindFiles();
					}
					return;
				}
			}
			console.log("i=" + i + " " + fileCache[i] + " text=" + text + " match=" + match);
		}
		
		maxResults = defaultMaxResults - matchesFound;
		
		console.log("Found " + matchesFound + " in cache (" + fileCache.length + "), will try to find " + maxResults + " more from disk");
		
		console.log("isSearching=" + isSearching) 
		
		if(!isSearching) {
			search(text, toIgnore);
		}
		else {
			console.log("abortFindFiles because: trySearch() isSearching=" + isSearching + " (is true)");
			CLIENT.cmd("abortFindFiles", function findFilesAborted(err, resp) {
				if(err) throw err;
				
				console.log("Trying search because resp.foldersBeingSearched=" + resp.foldersBeingSearched);
				
				if(typeof resp.foldersBeingSearched != "number") throw new Error("typeof resp.foldersBeingSearched is " + (typeof resp.foldersBeingSearched) + " = " + resp.foldersBeingSearched);
				
				if(resp.foldersBeingSearched == 0) {
					isSearching = false;
					trySearch();
				}
				else searchTimer = setTimeout(trySearch, 500);
				
			});
		}
	}
	
	function search(searchString, ignore) {
		var searchPath = inputFolder.value; //EDITOR.workingDirectory;
		isSearching = true;
		console.time("findFiles"); // Edit server's cuncurrencty setting to fine tune!
		console.log("Search begun! searchString=" + searchString + " searchPath=" + searchPath + " ignore=" + ignore);
		lastSearchText = searchString;
		CLIENT.cmd("findFiles", {folder: searchPath, name: searchString, useRegexp: false, maxResults: maxResults, ignore: ignore}, function searchFinish(err, resp) {
			
			if(err) throw err;
			
			console.timeEnd("findFiles");
			
			console.log("Search finish! searchString=" + searchString + " resp=" + JSON.stringify(resp));
			
			if(resp.buzy == true) searchTimer = setTimeout(trySearch, 500);
			else isSearching = false;
			
			progressBar.style.display = "none";
			EDITOR.resizeNeeded();
			
		});
	}
	
	function appendResult(filePath, matchArr) {
		
		//if(lineNr == undefined) lineNr = 0;
		
		if(!gotoList) {
console.warn("gotoList not available!");
		return;
		}
		
		var html = filePath;
		for (var i=0; i<matchArr.length; i++) {
			html = html.replace(matchArr[i], "<b>" + matchArr[i] + "</b>");
		}
		
		var li = document.createElement("li");
		li.innerHTML = html;
		li.setAttribute("path", filePath);
		//li.setAttribute("lineNr", lineNr);
		
		//gotoList.appendChild(li);
		
		// Insert at the top
		gotoList.insertBefore(li, gotoList.childNodes[0]);
		
		matchesFound++;
		
		if(matchesFound == 1) {
			// Mark it as the selected
			li.setAttribute("class", "selected");
		}
		
		li.onclick = gotoFile;
		
		EDITOR.resizeNeeded();
		EDITOR.resize();
		
	}
	
	
	
	// Can't have event listeners with the same name
	function show_gotoFileInput2(file, combo) {
		return show_gotoFileInput(file, combo);
	}
	
	function show_gotoFileInput(file, combo) {
		
		EDITOR.hideMenu();
		
		
		
		if(file) {
			currentDir = UTIL.getDirectoryFromPath(file.path);
			
			var selectedText = file.getSelectedText();
			
			var folderToSearchIn = currentDir;
			if(folderToSearchIn.indexOf(EDITOR.workingDirectory) != -1) folderToSearchIn = EDITOR.workingDirectory;
			else {
				var folders = UTIL.getFolders(folderToSearchIn);
				if(folders.length > 0) folders.pop(); // Use parent folder
				folderToSearchIn = folders.pop();
				console.log("folderToSearchIn=" + folderToSearchIn);
			}
		}
		
		var clipboard = 
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before showing");
		
		if(!gotoInputIsVisible) {
			
			console.log("gotoDiv=" + gotoDiv);
			
			if(gotoDiv) console.log("gotoDiv.style.dipslay=" + gotoDiv.style.dipslay);
			
			//if(!gotoDiv) build_gotoInput();
			build_gotoInput(folderToSearchIn); // Always build!
			
			var footerHeight = parseInt(footer.style.height);
			//var heightNeeded = 45;
			// The div function will take up as much place as it needs!
			
			console.log("show_gotoFileInput: footerHeight=" + footerHeight + " EDITOR.view.canvasHeight=" + EDITOR.view.canvasHeight + " defaultMaxResults=" + defaultMaxResults);
			
			defaultMaxResults = Math.min(defaultMaxResults, Math.ceil(EDITOR.view.canvasHeight / 29));
			
			console.log("show_gotoFileInput: defaultMaxResults=" + defaultMaxResults);
			if(defaultMaxResults < 5) {
				console.warn("show_gotoFileInput: Screen too small! adjusting defaultMaxResults=" + defaultMaxResults + " to 5");
				defaultMaxResults = 5;
			}
			
			gotoDiv.style.display="block";
			
			/* We need the footer to be this high
				if(footerHeight < heightNeeded) {
				//footer.style.height = footerHeight + heightNeeded + "px";
				EDITOR.resizeNeeded();
				}
			*/
			
			EDITOR.input = false;
			
			
			inputGoto.focus();   // Add focus to the input
			inputGoto.select();  // Select all
			
			
			
			gotoInputIsVisible = true;
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
			
		}
		
		return false; // Return false to prevent default
	}
	
	function hide_gotoFileInput() {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before hiding");
		
		if(isSearching) {
			console.log("abortFindFiles because: hide_gotoFileInput() and isSearching=" + isSearching + " (is true)");
			abortFindFiles();
		}
		
		if(gotoInputIsVisible) {
			
			// Hide the search window
			//gotoDiv.style.display="none"; // Need to hide this, or the footer will not scrimp
			
			gotoDiv.parentNode.removeChild(gotoDiv);
			
			//footer.style.height = "0px"; // Hmm, can't be less then one px
			
			// Bring back focus to the current file
			if(EDITOR.currentFile) {
				EDITOR.input = true;
			}
			
			gotoInputIsVisible = false;
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
			
			return false;
		}
		
		return true;
	}
	
	function gotoFile_moveUp() {
		
		if(!gotoInputIsVisible) return true;
		if(!gotoList) return true;
		
		console.log("Moving up ...");
		
		var listItems = gotoList.childNodes;
		
		//inputGoto.blur(); // why ?
		
		// Which item is selected?
		for (var i=0; i<listItems.length; i++) {
			if(listItems[i].getAttribute("class") == "selected") {
				
				if(i < listItems.length && i > 0) {
					listItems[i].setAttribute("class", "notselected");
					listItems[i-1].setAttribute("class", "selected");
				}
				break;
			}
		}
		
		setTimeout(function() { // Can't focus right away or it will be a keyup!
			//inputGoto.focus();
		}, 100); // This can wary!!! *sight* 
		
		return false; // false: prevent default browser action
		
	}
	
	function gotoFile_moveDown() {
		
		if(!gotoInputIsVisible) return true;
		if(!gotoList) return true; // Allow default browser action if the gotoList doesn't exist
		
		var listItems = gotoList.childNodes;
		
		//inputGoto.blur();
		
		// Witch list item is selected?
		for (var i=0; i<listItems.length; i++) {
			if(listItems[i].getAttribute("class") == "selected") {
				
				if(i < (listItems.length-1)) { // Not last
					listItems[i].setAttribute("class", "notselected");
					listItems[i+1].setAttribute("class", "selected");
				}
				
				break;
			}
		}
		
		//console.log("yoyo i=" + i + " listItems.length=" + listItems.length);
		
		if(i == (listItems.length-1)) {
			inputGoto.focus();
		}
		
		return false; // false: prevent default browser action
	}
	
	function gotoFile(clickEventMaybe) {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " EDITOR.input=" + EDITOR.input);
		
		if(isSearching) {
			console.log("abortFindFiles because: gotoFile() and isSearching=" + isSearching + " (is true)");
			abortFindFiles();
		}
		
		if(gotoInputIsVisible && !EDITOR.input) {
			
			var selectedItem;
			
			if(clickEventMaybe) {
				
				selectedItem = clickEventMaybe.target;
				// Target might be the <b> element depending on how the browser implement event bubbling
				while(selectedItem.parentElement) {
					if(selectedItem.tagName == "LI") break;
					else selectedItem = selectedItem.parentElement;
				}
				
				if(selectedItem.tagName != "LI") {
					console.warn("Not a list item: ", selectedItem);
					selectedItem = undefined;
				}
			}
			
			if(!selectedItem) {
				var listItems = gotoList.childNodes;
				
				// Witch list item is selected?
				
				for (var i=0; i<listItems.length; i++) {
					if(listItems[i].getAttribute("class") == "selected") {
						selectedItem = listItems[i];
						break;
					}
				}
			}
			
			if(selectedItem) {
				
				var path = selectedItem.getAttribute("path");
				var lineNr = selectedItem.getAttribute("lineNr");
				
				if(!path) {
					console.log("selectedItem:");
					console.log(selectedItem);
					var attributes = {}; // For debugging
					for (var att, i = 0, atts = selectedItem.attributes, n = atts.length; i < n; i++){
						att = atts[i];
						attributes[att.nodeName] = att.nodeValue
					}
					throw new Error("path=" + path + " selectedItem: tagName=" + selectedItem.tagName + " (" + JSON.stringify(attributes) + ")");
				}
				
				console.log("Opening " + path);
				
				console.log("abortFindFiles because: We are opening " + path + "...");
				abortFindFiles();
				
				EDITOR.openFile(path, undefined, function(err, file) {
					
					if(err) {
						alert(err.message);
						return;
					}
					
					//console.log("Going to line " + lineNr);
					EDITOR.renderNeeded();
					
					var dir = UTIL.getDirectoryFromPath(path);
					
					if(dir.indexOf(EDITOR.workingDirectory) == -1) {
						// Set the working directory to this files's folder
						EDITOR.changeWorkingDir(dir);
					}
					
					
				});
				
			}
			
			
			/*
				
				console.log("Going to line " + line + ".");
				
				file.caret.row = line-1;
				//file.caret.col = 0;
				
				file.fixCaret();
				file.scrollToCaret();
			*/
			
			hide_gotoFileInput();
			
			return false; // Return false to prevent default (typing a linebreak character)
			
		}
		return true;
	}
	
	
	function gotoFileProgressStatus(status) {
		console.log("gotoFileProgressStatus: " + JSON.stringify(status));
		
		if(!progressBar) {
console.warn("Progress bar not loaded!");
		return;
		}
		
		// Whatever gives the highest percentage
		if(status.totalFoldersSearched / status.totalFoldersToSearch > status.found / status.maxResults) {
			progressBar.max = status.totalFoldersToSearch;
			progressBar.value =status.totalFoldersSearched;
		}
		else {
			progressBar.max = status.maxResults;
			progressBar.value = status.found;
		}
		
		if(progressBar.max == progressBar.value) {
			progressBar.style.display = "none";
			EDITOR.resizeNeeded();
			progressBar.max = 1;
			progressBar.value = 0;
		}
		else {
			var oldStyleDisplay = progressBar.style.display;
			progressBar.style.display = "block";
			if(oldStyleDisplay != "block") EDITOR.resizeNeeded();
		}
	}
	
	function gotoFileFileFound(file) {
		console.log("File found: " + file.path);
		if(fileCache.indexOf(file.path) == -1) {
			fileCache.push(file.path);
			console.log("Added to cache: " + file.path);
		}
		else {
			console.log("fileCache:" + JSON.stringify(fileCache, null, 2));
			console.warn("We should not find files already in cache as they should have been ignored! path=" + file.path);
			// todo: fix this bug! Had to make it a warn as it was too common
		}
		appendResult(file.path, file.match);
		gotoFileProgressStatus(file);
	}
	
	function gotoFilePathGlob(folder) {
		console.log("gotoFilePathGlob: folder=" + folder);
		if(inputFolder) inputFolder.value = folder;
	}
	
	function abortFindFiles() {
		CLIENT.cmd("abortFindFiles", function findFilesAborted(err, resp) {
			if(err) throw err;
			
			if(typeof resp.foldersBeingSearched != "number") throw new Error("typeof resp.foldersBeingSearched is " + (typeof resp.foldersBeingSearched) + " = " + resp.foldersBeingSearched);
			
			if(resp.foldersBeingSearched == 0) isSearching = false;
			
			console.log("Aborted FindFiles: " + JSON.stringify(resp) + " isSearching=" + isSearching);
			
		});
	}
	
})();
