
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
	var matchesFound = 0;
	var keyUp = 38;
	var keyDown = 40;
	var charEscape = 27;
	var charEnter = 13;
	var keyTab = 9;
	var workingDir;
	var progressBar;
	var fileCache = [];
	var defaultMaxResults = 24;
	var maxResults = defaultMaxResults;
	var lastSearchText = "";
	var lastTypedText = "";
	var menuItem;
	var winMenuGotoFile;
	var gotoLine = null;
	var discoveryBarIcon;
	var selectedItem;
	
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
		
		EDITOR.bindKey({desc: S("open_file_by_searching"), charCode: charP, combo: CTRL, fun: show_gotoFileInput}); // ctrl + P
		EDITOR.bindKey({desc: S("open_file_by_searching"), charCode: charO, combo: CTRL, fun: show_gotoFileInput2}); // ctrl + O
		EDITOR.bindKey({desc: S("hide_goto_file_widget"), charCode: charEscape, fun: hide_gotoFileInput});
		
// This doesn't work on Safari. todo: Test when added to home screen!
		if(MAC) EDITOR.bindKey({desc: S("open_file_by_searching"), charCode: charO, combo: META, fun: mac_show_gotoFileInput});
		
		
if(CHROMEBOOK) {
		// On Chromebooks Alt+Search activates caps lock, Shift+Search shows the app menu in full screen.
		EDITOR.bindKey({desc: S("open_file_by_searching"), key: "Meta", combo: CTRL+ALT, fun: openFileViaChromebookSearch});
		}

		//  hmm, can I move these to keyup on the input box? probably not
		EDITOR.bindKey({desc: "Move up on the goto-file list", charCode: keyUp, fun: gotoFile_moveUp});
		EDITOR.bindKey({desc: "Move up on the goto-file list", charCode: keyDown, fun: gotoFile_moveDown});
		EDITOR.bindKey({desc: "Open a local file using native file select dialog", charCode: charO, combo: CTRL + SHIFT, fun: openFile});
		
		EDITOR.registerAltKey({char: "o", alt:2, label: S("open"), fun: show_gotoFileInput});
		
		EDITOR.on("openFileTool", openLocalFileTool);
		EDITOR.on("openFileTool", openAnyFileTool);
		
		CLIENT.on("findFilesStatus", gotoFileProgressStatus);
		CLIENT.on("fileFound", gotoFileFileFound);
		CLIENT.on("pathGlob", gotoFilePathGlob);
		
		menuItem = EDITOR.ctxMenu.add(S("open_search_file"), show_gotoFileInput, 4);
		
		//menu = EDITOR.ctxMenu.add('Open file from <i title="computer/phone/usb">device</i>', openFile);
		
		winMenuGotoFile = EDITOR.windowMenu.add(S("open_search_file"), [S("File"), 12], show_gotoFileInput);
		
		discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/data.svg", 30,  S("open_search_file") + " (" + EDITOR.getKeyFor(show_gotoFileInput2) + ")", "open", gotoFileFromDiscoveryBar);
		
	}
	
	function gotoFile_unload() {
		EDITOR.unbindKey(show_gotoFileInput);
		EDITOR.unbindKey(mac_show_gotoFileInput);
EDITOR.unbindKey(show_gotoFileInput2);
		EDITOR.unbindKey(hide_gotoFileInput);
		EDITOR.unbindKey(gotoFile_moveUp);
		EDITOR.unbindKey(gotoFile_moveDown);
		EDITOR.unbindKey(openFile);
		
		EDITOR.unregisterAltKey(show_gotoFileInput);
		
		EDITOR.removeEvent("openFileTool", openAnyFileTool);
		EDITOR.removeEvent("openFileTool", openLocalFileTool);
		
		CLIENT.removeEvent("findFilesStatus", gotoFileProgressStatus);
		CLIENT.removeEvent("fileFound", gotoFileFileFound);
		CLIENT.removeEvent("pathGlob", gotoFilePathGlob);
		
		 EDITOR.ctxMenu.remove(menuItem);
		
		EDITOR.windowMenu.remove(winMenuGotoFile);
		
		EDITOR.discoveryBar.remove(discoveryBarIcon);
		
		hide_gotoFileInput();
	}
	
	
	function openFile() {
		
		EDITOR.ctxMenu.hide();
		
		console.log("goto_file: Opening file ...");
		
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
				console.log("goto_file: defaultPath=" + defaultPath);
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
		console.log("goto_file: Telling the editor to open the file dialog window ...");
		EDITOR.localFileDialog(directory, function after_dialog_open_file(filePath, content, fileHandle) {
			
			//console.log("goto_file: filePath=" + filePath);
			//console.log("goto_file: content=" + content);
			
			console.log("goto_file: File was selected from file dialog: " + filePath + "\nTelling the editor to open it up for editing ...")
			
			EDITOR.openFile(filePath, content, function after_open_file(err, file) {  // path, content, callback
				
				if(err) throw err;
				
				// Mark the file as saved, because we just opened it
				file.isSaved = true;
				file.savedAs = true;
				file.changed = false;
				
				if(fileHandle) file.nativeFileSystemFileHandle = fileHandle;
				
				EDITOR.renderNeeded();
				EDITOR.render();
				console.log("goto_file: File ready for editing");
				
			});
		});
	}
	
	function openLocalFileTool(options) {
		// Only answer on openFileTool events if we are running locally/"native"
		if(EDITOR.user.homeDir == "/") return false;
		
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
		progressBar.setAttribute("value", "0");
		progressBar.setAttribute("max", "1");
		
		inputGoto = document.createElement("input");
		inputGoto.setAttribute("type", "text");
		inputGoto.setAttribute("id", "inputGoto");
		inputGoto.setAttribute("class", "inputtext");
		inputGoto.setAttribute("placeholder", "file path (regexp)");
		
		inputFolder = document.createElement("input");
		inputFolder.setAttribute("type", "text");
		inputFolder.setAttribute("id", "inputFolder");
		inputFolder.setAttribute("class", "inputtext");
		inputFolder.setAttribute("value", folderToSearchIn || EDITOR.workingDirectory);
		inputFolder.setAttribute("size", Math.max(EDITOR.workingDirectory.length + 3, 20));
		inputFolder.setAttribute("default", folderToSearchIn || EDITOR.workingDirectory);
		inputFolder.setAttribute("placeholder", "folder path");
		
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
		
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "button");
		cancelButton.setAttribute("id", "cancelButton");
		cancelButton.innerText = "Close dialog";
		
		var closeDialogKeyBind = document.createElement("span");
		closeDialogKeyBind.appendChild(document.createTextNode( EDITOR.getKeyFor(hide_gotoFileInput) ));
		closeDialogKeyBind.setAttribute("class", "key inline");
		cancelButton.appendChild(closeDialogKeyBind);
		
		
		var localButton = document.createElement("button");
		localButton.setAttribute("type", "button");
		localButton.setAttribute("class", "button");
		localButton.innerHTML = 'Open file from <i title="computer/phone/usb">device</i>...';
		localButton.onclick = openFile;
		
		gotoList = document.createElement("ul");
		gotoList.setAttribute("id", "gotoList");
		gotoList.classList.add("gotoList");
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
		
		
		var folderPicker = makeFolderPicker(inputFolder, {
			focus: false
			
		});
		gotoDiv.appendChild(folderPicker);
		
		
		footer.appendChild(gotoDiv);
		
		
		gotoButton.addEventListener("click", gotoFile, false);
		
		cancelButton.addEventListener("click", hide_gotoFileInput, false);
		
		inputGoto.addEventListener("keyup", typing, false);
		
		inputGoto.addEventListener('paste', paste, false);
		
		
		inputFolder.addEventListener("input", folderChange);
		inputFolder.addEventListener("change", folderChange);
		
		//inputFolder.addEventListener("keyup", chandingDir, false);
		
		gotoInputIsVisible = true;
		
		console.log("goto_file: built gotoInput!");
		
	}
	
	function folderChange() {
		var directory = inputFolder.value;
		var isDirectory = UTIL.isDirectory(directory);
		console.log("goto_file: folderChange: directory=" + directory + " isDirectory=" + isDirectory);
		
		if(isDirectory) {
			lastSearchText = ""; // Force another search in the new folder
			
			typing();
		}
	}
	
	function paste(pasteEvent) {
		// Pasting into inputGoto
		
		// The paste event only seem to trigger if the input is empty! (not when text is selected!)
		
		if(inputGoto.value) return true; // There's already text, don't mess it up
		
		if (window.clipboardData && window.clipboardData.getData) { // IE
			var text = window.clipboardData.getData('Text');
		} else if (pasteEvent.clipboardData && pasteEvent.clipboardData.getData) {
			var text = pasteEvent.clipboardData.getData('text/plain');
		}
		
		text = text.trim();
		
		console.log("goto_file: paste: text=" + text);
		
		if(text.indexOf("/") != -1 || text.indexOf("\\") != -1) {
			// It's probably a path.
			
			//  We want to move the folder part into inputFolder
			
			var dir = UTIL.getDirectoryFromPath(text);
			var file = UTIL.getFilenameFromPath(text);
			
			inputGoto.value = file;
			inputFolder.value = dir;
			inputFolder.dispatchEvent(new Event('input'));
			
			
			pasteEvent.preventDefault();
			typing();
			return false;
			
		}
		
		return true;
	}
	
	function typing(keyUpEvent) {
		console.log("goto_file: typing...");
		
		var text = inputGoto.value;
		
		if(typeof keyUpEvent == "object") {
			
			var code = UTIL.code(keyUpEvent);
			
			console.log("goto_file: typing: code=" + code + " keyUpEvent.keyCode=" + keyUpEvent.keyCode + " EDITOR.input=" + EDITOR.input + " text=" + text + " lastTypedText=" + lastTypedText + " lastSearchText=" + lastSearchText);
			
			keyUpEvent.preventDefault();
			
			if (code == charEnter) {
				if(text == "..") {
					
					inputFolder.value = UTIL.parentFolder(inputFolder.value);
					inputGoto.value = "";
					inputFolder.dispatchEvent(new Event('input'));
					
				}
				else gotoFile();
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
				console.warn("goto_file: typing same: text=" + text + " lastTypedText=" + lastTypedText + " lastSearchText=" + lastSearchText);
				return;
			}
			lastTypedText = text;
			
			if(isSearching && 1==2) {
				console.log("goto_file: abortFindFiles because: typing() and isSearching=" + isSearching + " (is true)");
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
		
		console.log("goto_file: trySearch: isSearching=" + isSearching + " text=" + text);
		
		if(lastSearchText == text) {
			console.log(UTIL.getStack("trySearch repeated! text=" + text + " lastSearchText=" + lastSearchText + " isSearching=" + isSearching));
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
						console.log("goto_file: abortFindFiles because: Max results found via cache and isSearching=" + isSearching + " (is true)!");
						abortFindFiles();
					}
					break;
				}
			}
			console.log("goto_file: i=" + i + " " + fileCache[i] + " text=" + text + " match=" + match);
		}
		
		maxResults = defaultMaxResults - matchesFound;
		
		console.log("goto_file: Found " + matchesFound + " in cache (" + fileCache.length + "), will try to find " + maxResults + " more from disk");
		
		console.log("goto_file: isSearching=" + isSearching) 
		
		if(!isSearching) {
			search(text, toIgnore);
		}
		else {
			console.log("goto_file: abortFindFiles because: trySearch() isSearching=" + isSearching + " (is true)");
			CLIENT.cmd("abortFindFiles", function findFilesAborted(err, resp) {
				if(err) throw err;
				
				console.log("goto_file: Trying search because resp.foldersBeingSearched=" + resp.foldersBeingSearched);
				
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

if(maxResults <= 0) {
			console.log("goto_file: Not searching because maxResults=" + maxResults);
			return;
		}
		
		var searchPath = inputFolder.value; //EDITOR.workingDirectory;
		isSearching = true;
		console.time("goto_file: findFiles"); // Edit server's cuncurrencty setting to fine tune!
		console.log("goto_file: Search begun! searchString=" + searchString + " searchPath=" + searchPath + " ignore=" + JSON.stringify(ignore));
		lastSearchText = searchString;
		CLIENT.cmd("findFiles", {folder: searchPath, name: searchString, useRegexp: false, maxResults: maxResults, ignore: ignore}, function searchFinish(err, resp) {
			
			if(err) {
if(err.code == "ETIMEDOUT") {
					// Does it matter if we timed out!?
// Yes, we might not retry the search...
// But is that imporant!??
// todo: figure out what to do when search times out!
}
else throw err;
			}
			console.timeEnd("goto_file: findFiles");
			
			console.log("goto_file: Search finish! searchString=" + searchString + " resp=" + JSON.stringify(resp));
			
			if(resp && resp.buzy == true) searchTimer = setTimeout(trySearch, 500);
			else isSearching = false;
			
			progressBar.style.display = "none";
			EDITOR.resizeNeeded();
			
		});
	}
	
	function appendResult(filePath, matchArr) {
		
		//if(lineNr == undefined) lineNr = 0;
		
		if(!gotoList) {
			console.warn("goto_file: gotoList not available!");
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
			selectedItem = li;
		}
		
		li.onclick = gotoFile;
		
		if(typeof selectedItem.scrollIntoView == "function") selectedItem.scrollIntoView();
		
		EDITOR.resizeNeeded();
		EDITOR.resize();
		
	}
	
	
	
	// Can't have event listeners with the same name
	function show_gotoFileInput2(file, combo) {
		return show_gotoFileInput(file, combo);
	}
	
	function openFileViaChromebookSearch(file, combo) {
		return show_gotoFileInput(file, combo);
	}
	
	function gotoFileFromDiscoveryBar(file, combo) {
		console.log("goto_file: gotoFileFromDiscoveryBar: gotoInputIsVisible=" + gotoInputIsVisible);
		if(!gotoInputIsVisible) show_gotoFileInput(file, combo);
		else hide_gotoFileInput();
	}
	
	var ignoreSelection = false;
	
	
	function mac_show_gotoFileInput(file, combo) {
		show_gotoFileInput(file, combo);
		return PREVENT_DEFAULT;
	}
	
	function show_gotoFileInput(file, combo) {
		
		EDITOR.ctxMenu.hide();
		
		winMenuGotoFile.hide();
		
		if(file && file instanceof File) {
			
			if(!ignoreSelection) {
				// You can select a file path, and it will be opened ...
				var selectedText = file.getSelectedText();
			var clipboard = "";
			if(UTIL.isFilePath(selectedText)) {
					return EDITOR.openFile(selectedText, function(err) {
					if(err) {
							console.error(err);
							ignoreSelection = true;
						show_gotoFileInput(file, combo);
						}
					});
			}
			}
			
// Is there a file path/name in the clipboard?

			// Is the caret on a file path or file name ? And a line number ? Eg. in a bug report
			var filePath = ""
			var notaPath = ":[]{}+-%#'\"";
			var c = "";
			for (var i=file.caret.index-1; i>0; i--) {
				c = file.text[i];
				if(notaPath.indexOf(c) != -1) break;
				filePath = c + filePath;
			}
			for(var i=file.caret.index; i<file.text.length; i++) {
				c = file.text[i];
				if(notaPath.indexOf(c) != -1) break;
				filePath = filePath + c;
			}
			console.log("goto_file: Caret on a file/path? filePath=" + filePath);
			
			var reFileNameAndLineMaybe = /[^\\\/]*\.\w{1,4}$/;
			var matchFile = filePath.match(reFileNameAndLineMaybe);
			
			
			if(filePath) {
				// Find line number
				var rowStr = file.rowText(file.caret.row, false);
				var i = rowStr.indexOf(filePath) + filePath.length;
				console.log("goto_file: Line number? " + rowStr[i] + rowStr[i+1] + " ( " + (rowStr[i] == ":") + ", " + UTIL.isNumeric(rowStr[i+1]) + ")");
				if(rowStr[i] == ":" && UTIL.isNumeric(rowStr[i+1])) {
					var nr = "";
					for (++i; i<rowStr.length; i++) {
						if( UTIL.isNumeric(rowStr[i]) ) nr += rowStr[i];
						else break;
					}
					console.log("goto_file: Line number? nr=" + nr);
					gotoLine = parseInt(nr);
					if(isNaN(gotoLine)) gotoLine = null;
				}
			}
			
			
			if(UTIL.isFilePath(filePath)) {
				var folderToSearchIn = UTIL.getDirectoryFromPath(filePath) || EDITOR.workingDirectory;
				var fileToSearchFor = UTIL.getFilenameFromPath(filePath);
}
			else if(matchFile) {
				var folderToSearchIn = EDITOR.workingDirectory;
				var fileToSearchFor = matchFile[0];
			}
			else {
				var folderToSearchIn = UTIL.getDirectoryFromPath(file.path) || EDITOR.workingDirectory;
				
			if(folderToSearchIn.indexOf(EDITOR.workingDirectory) != -1) {
folderToSearchIn = EDITOR.workingDirectory;
				}
				else {
				var folders = UTIL.getFolders(folderToSearchIn);
				if(folders.length > 0) folders.pop(); // Use parent folder
				folderToSearchIn = folders.pop();
					console.log("goto_file: folderToSearchIn=" + folderToSearchIn);
			}
		}
			
		}
		
		
		console.log("goto_file: gotoInputIsVisible=" + gotoInputIsVisible + " before showing");
		
		if(!gotoInputIsVisible) {
			
			console.log("goto_file: gotoDiv=" + gotoDiv);
			
			if(gotoDiv) console.log("goto_file: gotoDiv.style.dipslay=" + gotoDiv.style.dipslay);
			
			//if(!gotoDiv) build_gotoInput();
			build_gotoInput(folderToSearchIn); // Always build!
			
			var footerHeight = parseInt(footer.style.height);
			//var heightNeeded = 45;
			// The div function will take up as much place as it needs!
			
			console.log("goto_file: show_gotoFileInput: footerHeight=" + footerHeight + " EDITOR.view.canvasHeight=" + EDITOR.view.canvasHeight + " defaultMaxResults=" + defaultMaxResults);
			
			defaultMaxResults = Math.min(defaultMaxResults, Math.ceil(EDITOR.view.canvasHeight / 29));
			
			console.log("goto_file: show_gotoFileInput: defaultMaxResults=" + defaultMaxResults);
			if(defaultMaxResults < 5) {
				console.warn("goto_file: show_gotoFileInput: Screen too small! adjusting defaultMaxResults=" + defaultMaxResults + " to 5");
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
		
		if(fileToSearchFor) {
			inputGoto.value = fileToSearchFor;
			typing(); // Trigger search
		}
		
		discoveryBarIcon.classList.add("active");
		
		return false; // Return false to prevent default
	}
	
	function hide_gotoFileInput() {
		
		console.log("goto_file: gotoInputIsVisible=" + gotoInputIsVisible + " before hiding");
		
/*
if(isSearching) {
			console.log("goto_file: abortFindFiles because: hide_gotoFileInput() and isSearching=" + isSearching + " (is true)");
abortFindFiles();
}
*/
		
		// Always abort just in case. There is a very annyoing bug that keeps the search going ...
		abortFindFiles()
		
		ignoreSelection = false;
		
		if(discoveryBarIcon) discoveryBarIcon.classList.remove("active");
		
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
		
		if(EDITOR.input) return true;
		
		console.log("goto_file: Moving up ...");
		
		var listItems = gotoList.childNodes;
		
		//inputGoto.blur(); // why ?
		
		// Which item is selected?
		for (var i=0; i<listItems.length; i++) {
			if(listItems[i].getAttribute("class") == "selected") {
				
				if(i < listItems.length && i > 0) {
					listItems[i].setAttribute("class", "notselected");
					listItems[i-1].setAttribute("class", "selected");
					selectedItem = listItems[i-1];
				}
				break;
			}
		}
		
		if(typeof selectedItem.scrollIntoView == "function") selectedItem.scrollIntoView();
		
		setTimeout(function() { // Can't focus right away or it will be a keyup!
			//inputGoto.focus();
		}, 100); // This can wary!!! *sight* 
		
		return false; // false: prevent default browser action
		
	}
	
	function gotoFile_moveDown() {
		
		if(!gotoInputIsVisible) return true;
		if(!gotoList) return true; // Allow default browser action if the gotoList doesn't exist
		
		if(EDITOR.input) return true;
		
		var listItems = gotoList.childNodes;
		
		//inputGoto.blur();
		
		// Witch list item is selected?
		for (var i=0; i<listItems.length; i++) {
			if(listItems[i].getAttribute("class") == "selected") {
				
				if(i < (listItems.length-1)) { // Not last
					listItems[i].setAttribute("class", "notselected");
					listItems[i+1].setAttribute("class", "selected");
					selectedItem = listItems[i+1];
				}
				
				break;
			}
		}
		
		if(typeof selectedItem.scrollIntoView == "function") selectedItem.scrollIntoView();
		
		//console.log("goto_file: yoyo i=" + i + " listItems.length=" + listItems.length);
		
		if(i == (listItems.length-1)) {
			inputGoto.focus();
		}
		
		return false; // false: prevent default browser action
	}
	
	function gotoFile(clickEventMaybe) {
		
		console.log("goto_file: gotoInputIsVisible=" + gotoInputIsVisible + " EDITOR.input=" + EDITOR.input);
		
		if(isSearching) {
			console.log("goto_file: abortFindFiles because: gotoFile() and isSearching=" + isSearching + " (is true)");
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
					console.warn("goto_file: Not a list item: ", selectedItem);
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
					console.log("goto_file: selectedItem: ", selectedItem);
					
					var attributes = {}; // For debugging
					for (var att, i = 0, atts = selectedItem.attributes, n = atts.length; i < n; i++){
						att = atts[i];
						attributes[att.nodeName] = att.nodeValue
					}
					throw new Error("path=" + path + " selectedItem: tagName=" + selectedItem.tagName + " (" + JSON.stringify(attributes) + ")");
				}
				
				console.log("goto_file: Opening " + path);
				
				console.log("goto_file: abortFindFiles because: We are opening " + path + "...");
				abortFindFiles();
				
				EDITOR.openFile(path, undefined, function(err, file) {
					
					if(err) {
						alert(err.message);
						return;
					}
					
					EDITOR.dashboard.hide();
					
					//console.log("goto_file: Going to line " + lineNr);
					EDITOR.renderNeeded();
					
					var dir = UTIL.getDirectoryFromPath(path);
					
					if(dir.indexOf(EDITOR.workingDirectory) == -1) {
						// Set the working directory to this files's folder
						EDITOR.changeWorkingDir(dir);
					}
					
					if(gotoLine) {
						file.moveCaret(undefined, gotoLine-1);
						file.scrollToCaret();
						gotoLine = null;
					}
					
				});
				
			}
			
			
			/*
				
				console.log("goto_file: Going to line " + line + ".");
				
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
		console.log("goto_file: gotoFileProgressStatus: " + JSON.stringify(status));
		
		if(!progressBar) {
			console.warn("goto_file: Progress bar not loaded!");
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
		console.log("goto_file: File found: " + file.path);
		if(fileCache.indexOf(file.path) == -1) {
			fileCache.push(file.path);
			console.log("goto_file: Added to cache: " + file.path);
		}
		else {
			console.log("goto_file: Already in cache: " + file.path);
		}
		appendResult(file.path, file.match);
		gotoFileProgressStatus(file);
	}
	
	function gotoFilePathGlob(folder) {
		console.log("goto_file: gotoFilePathGlob: folder=" + folder);
		if(inputFolder) {
inputFolder.value = folder;
			inputFolder.dispatchEvent(new Event('input'));
		}
	}
	
	function abortFindFiles() {
		
		if(CLIENT.connected) {
			CLIENT.cmd("abortFindFiles", function findFilesAborted(err, resp) {
				if(err) throw err;
				
				if(typeof resp.foldersBeingSearched != "number") throw new Error("typeof resp.foldersBeingSearched is " + (typeof resp.foldersBeingSearched) + " = " + resp.foldersBeingSearched);
				
				if(resp.foldersBeingSearched == 0) isSearching = false;
				
				console.log("goto_file: Aborted FindFiles: " + JSON.stringify(resp) + " isSearching=" + isSearching);
				
			});
		}
	}
	
})();
