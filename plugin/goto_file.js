
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
	
	window.addEventListener("load", gotoFile_init, false);

	function gotoFile_init() {
		
		footer = document.getElementById("footer");
		gotoDiv = document.getElementById("goto");
		inputGoto = document.getElementById("inputGoto");
		gotoButton = document.getElementById("buttonGoto");
		gotoList = document.getElementById("gotoList");
		
		// Sanity check
		if(!footer) {
			console.error(new Error("Can not find the footer!"));
		}
		
		// Insert text into translation dictionary if they dont exist
		//dictionary.default("gotoline", "Goto line")
		
		// Create the hypertext markup if it doesn't existpppp
		
		//build_gotoInput();
		
		hide_gotoInput();
		
		var charP = 80;
		var charEscape = 27;
		var charEnter = 13;
		var keyUp = 38;
		var keyDown = 40;
		
		global.keyBindings.push({charCode: charP, combo: CTRL, fun: show_gotoInput}); // ctrl + R
		global.keyBindings.push({charCode: charEscape, fun: hide_gotoInput}); // Escape
		global.keyBindings.push({charCode: charEnter, fun: gotoFile}); // Enter
		global.keyBindings.push({charCode: keyUp, fun: moveUp});
		global.keyBindings.push({charCode: keyDown, fun: moveDown});
		
	}
	
	function build_gotoInput() {
			
		gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("id", "gotoDiv");
		gotoDiv.setAttribute("class", "gotoFile");
	
		inputGoto = document.createElement("input");
		inputGoto.setAttribute("type", "text");
		inputGoto.setAttribute("id", "inputGoto");
		inputGoto.setAttribute("class", "inputtext");
		
		var labelGoto = document.createElement("label");
		labelGoto.setAttribute("for", "inputGoto");
		labelGoto.appendChild(document.createTextNode("Goto file/content:")); // Language settings!?

		gotoButton = document.createElement("input");
		gotoButton.setAttribute("type", "button");
		gotoButton.setAttribute("class", "button");
		gotoButton.setAttribute("id", "gotoButton");
		gotoButton.setAttribute("value", "Go!");

		var cancelButton = document.createElement("input");
		cancelButton.setAttribute("type", "button");
		cancelButton.setAttribute("class", "button");
		cancelButton.setAttribute("id", "cancelButton");
		cancelButton.setAttribute("value", "cancel");

		gotoList = document.createElement("ul");
		gotoList.setAttribute("id", "gotoList");
		
		var li = document.createElement("li");
		li.appendChild(document.createTextNode("test 123"));
		
		gotoList.appendChild(li);
		
		
		gotoDiv.appendChild(gotoList);
		gotoDiv.appendChild(labelGoto);
		gotoDiv.appendChild(inputGoto);
		gotoDiv.appendChild(gotoButton);
		gotoDiv.appendChild(cancelButton);
		
		
		footer.appendChild(gotoDiv);
	
		gotoButton.addEventListener("click", gotoFile, false);
		
		cancelButton.addEventListener("click", hide_gotoInput, false);
		
		inputGoto.addEventListener("keyup", typing, false);
		
		gotoInputIsVisible = true;
		
		console.log("built gotoInput!");

	}
	
	function typing() {
		
		// Clear the list
		while(gotoList.firstChild){
			gotoList.removeChild(gotoList.firstChild);
		}
		
		var text = inputGoto.value
		
		if(text.length > 0) search(text);
		
		editor.resizeNeeded();
		
		}
	
	
	function search(searchString) {
		/*
			First check for file names, then content of files
			
			First time, search all dirs, then search files array
		*/
		
		
		var searchPath = editor.workingDirectory;
		var maxResults = 20;
		var matchesFound = 0;
		var searchSubfolders = true;
		var totalFiles = 0;
		var filesSearched = 0;
		var ext = ["html", "htm", "css", "txt", "md", "js", "", "bat", "sh"];
		
		if (firstRun) {
			searchDir(searchPath);
			firstRun = false;
		} 
		else {
			console.log("Searcing files array! length=" + files.length);
			for (var i=0; i<files.length; i++) {
				console.log("look: " + files[i]);
				if(files[i].indexOf(searchString) != -1) {
					appendResult(files[i]);
					if(matchesFound >= maxResults) break; // matchesFound is incremented in appendResult
				}
			}
		}
		
		function searchDir(currentDirPath) {
			var filePath;
			var stat;
			
			console.log("Searching: " + currentDirPath);
			
			var folderItems = fs.readdirSync(currentDirPath);
			
			//folderItems.filter(function(file) { return file.substr(-5) === '.html'; })
			for(var i=0; i<folderItems.length; i++) {
				
				filePath = path.join(currentDirPath, folderItems[i]);
				stat = fs.statSync(filePath);
				
				console.log("What is: " + filePath);
				
				if (stat.isFile()) {
					searchFile(filePath, stat);
				}
				else if (stat.isDirectory() && searchSubfolders) {
					searchDir(filePath);
				}
				
			}
			
		}
		
		function searchFile(filePath) {
			
			var fileExt = editor.getFileExtension(filePath);
			var checkit = fileExt == ""; // Always check files with no extension
			
			console.log("fileExt=" + fileExt);
			
			for(var i=0; i<ext.length; i++) {
				if(ext[i] == fileExt) {
					console.log("checkit!");
					checkit = true; 
					break;
				}
			}
			
			if(!checkit) return;
			
			files.push(filePath);
			
			if(matchesFound < maxResults) {
			if(filePath.indexOf(searchString) != -1) {
				appendResult(filePath);
			}
			
			totalFiles++;
			}
		}
		
		function readFile(filePath) {
			fs.readFile(filePath, 'utf-8', function(err, contents) {
				
				if(err) console.error(err);
				
				console.log("Searching " + filePath);
				
				inspectFile(filePath, contents);
			});
		}
		
		function inspectFile(filePath, contents) {
			
			try {
				if (contents.indexOf(searchString) != -1) {
					
					appendResult(filePath, contents);
					
				}
			}
			catch(e) {
				console.log(e);
				console.log("filePath=" + filePath);
				console.log("contents=" + contents);
			}
			
			if(filesSearched++ == totalFiles) {
				allDone();
			}
			
		}
		
		function allDone() {
			console.log("Done searching " + totalFiles + " files for '" + searchString + "'");
			}
		
		function appendResult(filePath, lineNr) {
			
			if(lineNr == undefined) lineNr = 0;
			
			var html = filePath.replace(searchString, "<b>" + searchString + "</b>");
			
			var li = document.createElement("li");
			li.innerHTML = html;
			li.setAttribute("path", filePath);
			li.setAttribute("lineNr", lineNr);
			
			//gotoList.appendChild(li);
			
			// Insert at the top
			gotoList.insertBefore(li, gotoList.childNodes[0]);
			
			matchesFound++;
			
			if(matchesFound == 1) {
				// Mark it as the selected
				li.setAttribute("class", "selected");
			}
			
			editor.resizeNeeded();
		}
		
	}
	
	
	
	function show_gotoInput(file, combo) {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before showing");

		if(!gotoInputIsVisible) {
			
			console.log("gotoDiv=" + gotoDiv);
			
			if(gotoDiv) console.log("gotoDiv.style.dipslay=" + gotoDiv.style.dipslay);
			
			//if(!gotoDiv) build_gotoInput();
			build_gotoInput(); // Always build!
			
			var footerHeight = parseInt(footer.style.height);
			//var heightNeeded = 45;
			// The div function will take up as much place as it needs!
			
			gotoDiv.style.display="block";
			
			/* We need the footer to be this high
			if(footerHeight < heightNeeded) {
				//footer.style.height = footerHeight + heightNeeded + "px";
				editor.resizeNeeded();
			}
			*/
			
			// Remove focus from the editor
			if(global.currentFile) {
				global.currentFile.gotFocus = false;
			}
			
			
			inputGoto.focus();   // Add focus to the input
			inputGoto.select();  // Select all
			
		
			
			gotoInputIsVisible = true;
			
			editor.resizeNeeded();
			editor.renderNeeded();
			
		}
		
		return false; // Return false to prevent default
	}

	function hide_gotoInput() {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before hiding");
		
		if(gotoInputIsVisible) {
			
			// Hide the search window
			//gotoDiv.style.display="none"; // Need to hide this, or the footer will not scrimp
			
			gotoDiv.parentNode.removeChild(gotoDiv);
			
			//footer.style.height = "0px"; // Hmm, can't be less then one px
			
			// Bring back focus to the current file
			if(global.currentFile) {
				global.currentFile.gotFocus = true;
			}
			
			gotoInputIsVisible = false;
			
			firstRun = true;
			files.length = 0;
			
			editor.resizeNeeded();
			editor.renderNeeded();
		}

	}
	
	function moveUp() {
		
		if(!gotoList) return;
		
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
	
	function moveDown() {
		
		if(!gotoList) return;
		
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
	
	function gotoFile() {
		
		if(gotoInputIsVisible) {
			
			var listItems = gotoList.childNodes;
			var selectedItem;
			
			// Witch list item is selected?
			for (var i=0; i<listItems.length; i++) {
				if(listItems[i].getAttribute("class") == "selected") {
					selectedItem = listItems[i];
					break;
				}
			}
			
			if(selectedItem) {
				
				var path = selectedItem.getAttribute("path");
				var lineNr = selectedItem.getAttribute("lineNr");
				
				console.log("Opening " + path);
				
				editor.openFile(path, undefined, function(file) {
					
					console.log("Going to line " + lineNr);
					editor.renderNeeded();
					
				});
				
			}
			
			
			/*
				
				console.log("Going to line " + line + ".");
				
				file.caret.row = line-1;
				//file.caret.col = 0;
				
				file.fixCaret();
				file.scrollToCaret();
			*/
			
				hide_gotoInput();
			
			return false; // Return false to prevent default (typing a linebreak character)
			
			}
		
	}
	
	
})();