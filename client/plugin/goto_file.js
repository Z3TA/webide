
(function() {
	
	"use strict";
	
	var gotoDiv;
	var footer;
	var gotoInputIsVisible = false;
	var inputGoto;
	var gotoButton;
	var gotoList;
	var selectedChild = 0;
	var firstRun = true;
	var files = [];
	var inputFolder;
	var isSearching = false;
	var searchTimer;
	var dirsToSearch = [];
	var dirsSearched = [];
	var searchRetries = 0;
	var currentDir;
	
	var keyUp = 38;
	var keyDown = 40;
	var charEscape = 27;
	var charEnter = 13;
	
	var workingDir;
	
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
		
		// Insert text into translation dictionary if they dont exist
		//dictionary.default("gotoline", "Goto line")
		
		// Create the hypertext markup if it doesn't existpppp
		
		//build_gotoInput();
		
		hide_gotoFileInput();
		
		var charP = 80;
		var charO = 79;
		
		//EDITOR.bindKey({desc: "Open file by searching for file path", charCode: charP, combo: CTRL, fun: show_gotoFileInput}); // ctrl + P
		EDITOR.bindKey({desc: "Open file by searching for file path", charCode: charO, combo: CTRL, fun: show_gotoFileInput}); // ctrl + O
		
		EDITOR.bindKey({desc: "Hide the goto-line GUI", charCode: charEscape, fun: hide_gotoFileInput});
		
		EDITOR.on("openFileTool", openAnyFileTool);
		
	}
	
	function gotoFile_unload() {
		EDITOR.unbindKey(show_gotoFileInput);
		EDITOR.unbindKey(hide_gotoFileInput);
		
		EDITOR.removeEvent("openFileTool", openAnyFileTool);
	}
	
	function openAnyFileTool(directory) {
		
		if(directory) {
		if(inputFolder) inputFolder.value = directory;
			else EDITOR.changeWorkingDir(directory);
		}
		show_gotoFileInput();
		
		return true; // true means we handled it
		
	}
	
	function build_gotoInput(folderToSearchIn) {
		
		gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("id", "gotoDiv");
		gotoDiv.setAttribute("class", "gotoFile");
		
		inputGoto = document.createElement("input");
		inputGoto.setAttribute("type", "text");
		inputGoto.setAttribute("id", "inputGoto");
		inputGoto.setAttribute("class", "inputtext");
		inputGoto.setAttribute("placeholder", "Filename");
		
		inputFolder = document.createElement("input");
		inputFolder.setAttribute("type", "text");
		inputFolder.setAttribute("id", "inputFolder");
		inputFolder.setAttribute("class", "inputtext");
		inputFolder.setAttribute("value", folderToSearchIn || EDITOR.workingDirectory);
		inputFolder.setAttribute("size", Math.max(EDITOR.workingDirectory.length + 3, 20));
		
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
		
		gotoList = document.createElement("ul");
		gotoList.setAttribute("id", "gotoList");
		gotoList.setAttribute("title", "Use keyboard up/down arrow to select a file from the list");
		
		//var li = document.createElement("li");
		//li.appendChild(document.createTextNode("test 123"));
		//gotoList.appendChild(li);
		
		
		gotoDiv.appendChild(gotoList);
		
		gotoDiv.appendChild(labelGoto);
		gotoDiv.appendChild(inputGoto);
		
		gotoDiv.appendChild(labelFolder);
		gotoDiv.appendChild(inputFolder);
		
		gotoDiv.appendChild(gotoButton);
		gotoDiv.appendChild(cancelButton);
		
		
		footer.appendChild(gotoDiv);
		
		gotoButton.addEventListener("click", gotoFile, false);
		
		cancelButton.addEventListener("click", hide_gotoFileInput, false);
		
		inputGoto.addEventListener("keyup", typing, false);
		
		inputFolder.addEventListener("keyup", chandingDir, false);
		
		gotoInputIsVisible = true;
		
		console.log("built gotoInput!");
		
	}
	
	function typing(keyUpEvent) {
		
		console.log("keyUpEvent.keyCode=" + keyUpEvent.keyCode + " EDITOR.input=" + EDITOR.input);
		
		keyUpEvent.preventDefault();

		if (keyUpEvent.keyCode == charEnter) {
			gotoFile();
			return;
		}
		else if(keyUpEvent.keyCode == charEscape) {
			hide_gotoFileInput();
			return;
		}
		else if(keyUpEvent.keyCode == keyUp) {
			moveUp();
			inputGoto.focus();
			return;
		}
		else if(keyUpEvent.keyCode == keyDown) {
			gotoFile_moveDown();
			inputGoto.focus();
			return;
		}
		
		var text = inputGoto.value
		
		if(text.length > 0) {
			trySearch();
		}
		else {
			EDITOR.resizeNeeded();
		}
		
		function trySearch() {
			// Clear the list
			while(gotoList.firstChild) {
				gotoList.removeChild(gotoList.firstChild);
			}
			EDITOR.resizeNeeded();
			
			if(!isSearching) {
				searchRetries = 0;
				search(text);
			}
		else {
				
				var waitingFor = "";
				
				clearTimeout(searchTimer); // Clear any queued up searches
				
				var numLeft = (dirsToSearch.length - dirsSearched.length);
				
				console.log("Waiting for current search to finish before searching again ... (" + numLeft + " left)");
				
				if(numLeft == 1) {
					// Find out the offender
					for(var i=0; i<dirsToSearch.length; i++) {
						if(dirsSearched.indexOf(dirsToSearch[i]) == -1) {
							console.log(dirsToSearch[i]);
							waitingFor = dirsToSearch[i];
						}
					}
				}
				
				var maxSearchRetries = 15;
				// todo: add spinner animation!
				
				if(++searchRetries > maxSearchRetries) { 
					// Give up and reset the current search. And tell the user
					isSearching = false;
					dirsSearched.length = 0;
					dirsToSearch.length = 0;
					searchRetries = 0;
					firstRun = true;
					
					if(waitingFor) alert("Gave up search in " + waitingFor)
					else alert("Too much latency! Gave up searching. (" + numLeft + " folders left to search)");
				}
				else searchTimer = setTimeout(trySearch, 500);
				
			}
		}
	}
		
	
	function chandingDir() {
		files.length = 0; // Reset file cache
	}
	
	function search(searchString) {
		/*
			First check for file names, then content of files
			
			First time, search all dirs, then search files array
		*/
		var allDoneCalls = 0;
		var searchPath = inputFolder.value; //EDITOR.workingDirectory;
		var maxResults = 20;
		var matchesFound = 0;
		var searchSubfolders = true;
		var totalFiles = 0;
		var filesSearched = 0;
		//var ext = ["html", "htm", "css", "txt", "md", "js", "", "bat", "sh"];
		var recursions = 0;
		var maxRecursion = 10000;
		var ignorePaths = [];
		
		dirsToSearch.length = 0;
		dirsSearched.length = 0;
		
		if (firstRun || files.length == 0) {
			isSearching = true;
			console.log("First run.");
			searchDir(searchPath);
			firstRun = false;
		}
		else {
			console.log("Searching files array! length=" + files.length);
			for (var i=0; i<files.length; i++) {
				searchFile(files[i]);
				if(matchesFound >= maxResults) break; // matchesFound is incremented in appendResult
				}
			if(matchesFound == 0) EDITOR.resizeNeeded();
			allDone();
		}
		
		function searchDir(currentDirPath) {
			
			dirsToSearch.push(currentDirPath);
			
			//console.log("S directory: " + currentDirPath);
			
			if(++recursions > maxRecursion) {
				console.warn("recursions=" + recursions + " maxRecursion=" + maxRecursion);
				dirsSearched.push(currentDirPath);
				console.log("dirsSearched=" + dirsSearched.length + " dirsToSearch=" + dirsToSearch.length + " " + (dirsSearched.length==dirsToSearch.length));
				if(dirsSearched.length == dirsToSearch.length) {
					allDone();
				}
				else {
					ignorePaths.push(currentDirPath);
				}
				alert("Too deep. Ignoring " + currentDirPath);
				return;
			}
			
			// Check if it's in a path we should ignore
			var searchIt = true;
			for(var j=0; j<ignorePaths.length; j++) {
				if(currentDirPath.indexOf(ignorePaths[j]) != -1) {
					console.log("Ignoring path=" + currentDirPath + "\nIt's in: " + ignorePaths[j]);
					searchIt = false;
					break;
				}
			}
			if(searchIt) {
				
				EDITOR.listFiles(currentDirPath, function searchit(err, folderItems) {
					
					//console.log("F directory: " + currentDirPath);
					
					dirsSearched.push(currentDirPath);
					
					if(err) {
						console.warn(UTIL.getStack("Error reading folder: " + currentDirPath + "\n" + err.message));
						alert("Error reading folder: " + currentDirPath + "\n" + err.message);
					}
					else {
						//console.log("folderItems=" + JSON.stringify(folderItems, null, 2));
						
						for(var i=0; i<folderItems.length; i++) {
							if (folderItems[i].type=="-") {
								files.push(folderItems[i].path); // Cache file
								searchFile(folderItems[i].path);
							}
							else if (folderItems[i].type=="d" && searchSubfolders) {
								if(folderItems[i].name != "temp" && folderItems[i].name != "tmp" && folderItems[i].name.substr(0,1) != ".") { // Do not search in dot files or temp/tmp folders
									searchDir(folderItems[i].path);
								}
							}
						}
					}
					
					
					//console.log("dirsSearched=" + dirsSearched.length + " dirsToSearch=" + dirsToSearch.length + " " + (dirsSearched.length==dirsToSearch.length));
					if(dirsSearched.length == dirsToSearch.length) { allDone(); };
					
				});
				
			}
			else {
				dirsSearched.push(currentDirPath);
				
				//console.log("dirsSearched=" + dirsSearched.length + " dirsToSearch=" + dirsToSearch.length + " " + (dirsSearched.length==dirsToSearch.length));
if(dirsSearched.length == dirsToSearch.length) { allDone();};
			}
		}
		
		function searchFile(filePath) {
			
			if(matchesFound < maxResults) {
				var re = new RegExp(searchString, "ig");
				var matchArr = filePath.match(re);
				if(matchArr != null) {
					appendResult(filePath, matchArr);
				}
				
				totalFiles++;
			}
		}
		
		function allDone() {
			isSearching = false;
			console.log("Done searching " + totalFiles + " files for '" + searchString + "'");
			
			if(++allDoneCalls > 1) throw new Error("allDone() called more then once!");
			
			}
		
		function appendResult(filePath, matchArr) {
			
			//if(lineNr == undefined) lineNr = 0;
			
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
		}
		
	}
	
	
	
	function show_gotoFileInput(file, combo) {
		
		if(file) {
			currentDir = UTIL.getDirectoryFromPath(file.path);
		
			var folderToSearchIn = currentDir;
			if(folderToSearchIn.indexOf(EDITOR.workingDirectory) != -1) folderToSearchIn = EDITOR.workingDirectory;
		else {
				var folders = UTIL.getFolders(folderToSearchIn);
			if(folders.length > 0) folders.pop(); // Use parent folder
				folderToSearchIn = folders.pop();
				console.log("folderToSearchIn=" + folderToSearchIn);
		}
		}
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before showing");

		if(!gotoInputIsVisible) {
			
			console.log("gotoDiv=" + gotoDiv);
			
			if(gotoDiv) console.log("gotoDiv.style.dipslay=" + gotoDiv.style.dipslay);
			
			//if(!gotoDiv) build_gotoInput();
			build_gotoInput(folderToSearchIn); // Always build!
			
			var footerHeight = parseInt(footer.style.height);
			//var heightNeeded = 45;
			// The div function will take up as much place as it needs!
			
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
			
			firstRun = true;
			files.length = 0;
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
			
			return false;
		}
		
		return true;
	}
	
	function moveUp() {
		
		console.log("Moving up ...");
		
		if(!gotoList) return true;
		
		var listItems = gotoList.childNodes;
		
		inputGoto.blur();
		
		// Witch list item is selected?
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
		
		if(!gotoList) return true; // Allow default browser action if the gotoList doesn't exist
		
		var listItems = gotoList.childNodes;
		
		inputGoto.blur();
		
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
	
	function gotoFile(e) {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " EDITOR.input=" + EDITOR.input);
		
		if(gotoInputIsVisible && !EDITOR.input) {
			
			var selectedItem;
			
			if(e) {
				selectedItem = e.target;
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
					console.log(selectedItem);
					throw new Error("path=" + path)
				}
				
				console.log("Opening " + path);
				
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
						firstRun = true; // Make it not use cached file's list
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
	
	
})();
