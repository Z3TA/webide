
(function() {
	
	"use strict";
	
	var footer, div, inputFind, inputReplace, inputInDir, findButtonLeft, findButtonRight, replaceButton, regexOption, subfolderOption, findAllButton, replaceAllButton, findInFilesButton, replaceInFilesButton;
	
	var inputFindGotFocus = false;
	var lastSearchEnd = -1; // Depricated !??
	var searchReportCounter = 0;
	var searchVisible = false;
	var lastSearchStrLength = 0;
	
	editor.on("start", find_replace_main, 10);
	
	function find_replace_main() {
		
		console.log("find_replace.js loaded!");
		
		// Bind to ctrl + F
		editor.keyBindings.push({charCode: 70, combo: CTRL, fun: findReplace}); // Ctrl + F
		
		// Pressing enter should do a search if the search window is open
		editor.keyBindings.push({charCode: 13, fun: pressEnter});

		// Pressing escape should clear and hide the search window
		editor.keyBindings.push({charCode: 27, fun: pressEscape});

		
		// Point variables to the document object model
		footer = document.getElementById("footer");
		div = document.getElementById("findReplace");
		inputFind = document.getElementById("inputFind");
		inputReplace = document.getElementById("inputReplace");
		inputInDir = document.getElementById("inputInDir");
		findButtonLeft = document.getElementById("findButtonLeft");
		findButtonRight = document.getElementById("findButtonRight");
		replaceButton = document.getElementById("replaceButton");
		regexOption = document.getElementById("regexOption");
		subfolderOption = document.getElementById("subfolderOption");
		findAllButton = document.getElementById("findAllButton");
		replaceAllButton = document.getElementById("findAllButton");
		

	}
	
	
	function buildDiv() {
		
		if(!footer) {
			console.error(new Error("Can not find the footer!"));
		}
		
		//if(!div) { // This will still return true after it has been removed!!!
			
		
		div = document.createElement("div");
		 
		div.setAttribute("id", "findReplace");
		div.setAttribute("class", "findReplace");
		 
		// Build the input stuff ...
		
		var size = editor.getDir().length;
		
		inputFind = document.createElement("input");
		inputFind.setAttribute("type", "text");
		inputFind.setAttribute("id", "inputFind");
		inputFind.setAttribute("class", "inputtext");
		inputFind.setAttribute("size", size);
		
		inputReplace = document.createElement("input");
		inputReplace.setAttribute("type", "text");
		inputReplace.setAttribute("id", "inputReplace");
		inputReplace.setAttribute("class", "inputtext replace");
		inputReplace.setAttribute("size", size);
		
		inputInDir = document.createElement("input");
		inputInDir.setAttribute("type", "text");
		inputInDir.setAttribute("id", "inputInDir");
		inputInDir.setAttribute("class", "inputtext indir");
		inputInDir.value = editor.getDir();
		inputInDir.setAttribute("size", size);
		
		var labelFind = document.createElement("label");
		labelFind.setAttribute("for", "inputFind");
		labelFind.appendChild(document.createTextNode("Find:")); // Language settings!?
		
		var labelReplace = document.createElement("label");
		labelReplace.setAttribute("for", "inputReplace");
		labelReplace.appendChild(document.createTextNode("Replace with:")); // Language settings!?

		var labelInDir = document.createElement("label");
		labelInDir.setAttribute("for", "inputInDir");
		labelInDir.appendChild(document.createTextNode("In directory:")); // Language settings!?

		
		findButtonLeft = document.createElement("input");
		findButtonLeft.setAttribute("type", "button");
		findButtonLeft.setAttribute("class", "button half");
		findButtonLeft.setAttribute("id", "findButtonLeft");
		findButtonLeft.setAttribute("value", "Left");
		
		findButtonRight = document.createElement("input");
		findButtonRight.setAttribute("type", "button");
		findButtonRight.setAttribute("class", "button half");
		findButtonRight.setAttribute("id", "findButtonRight");
		findButtonRight.setAttribute("value", "Right");

		replaceButton = document.createElement("input");
		replaceButton.setAttribute("type", "button");
		replaceButton.setAttribute("class", "button");
		replaceButton.setAttribute("id", "replaceButton");
		replaceButton.setAttribute("value", "Replace");
		
		findAllButton = document.createElement("input");
		findAllButton.setAttribute("type", "button");
		findAllButton.setAttribute("class", "button");
		findAllButton.setAttribute("id", "findAllButton");
		findAllButton.setAttribute("value", "Find All");

		replaceAllButton = document.createElement("input");
		replaceAllButton.setAttribute("type", "button");
		replaceAllButton.setAttribute("class", "button");
		replaceAllButton.setAttribute("id", "replaceAllButton");
		replaceAllButton.setAttribute("value", "Replace All");

		findInFilesButton = document.createElement("input");
		findInFilesButton.setAttribute("type", "button");
		findInFilesButton.setAttribute("class", "button");
		findInFilesButton.setAttribute("id", "findInFilesButton");
		findInFilesButton.setAttribute("value", "Search in files");

		replaceInFilesButton = document.createElement("input");
		replaceInFilesButton.setAttribute("type", "button");
		replaceInFilesButton.setAttribute("class", "button");
		replaceInFilesButton.setAttribute("id", "replaceInFilesButton");
		replaceInFilesButton.setAttribute("value", "Replace in files");

		
		var regexOptionLabel = document.createElement("label");
		regexOptionLabel.setAttribute("for", "regexOption");
		regexOptionLabel.appendChild(document.createTextNode("Use regex:")); // Language settings!?

		var subfolderOptionLabel = document.createElement("label");
		subfolderOptionLabel.setAttribute("for", "subfolderOption");
		subfolderOptionLabel.appendChild(document.createTextNode("Search subfolders:")); // Language settings!?

		
		regexOption = document.createElement("input");
		regexOption.setAttribute("type", "checkbox");
		regexOption.setAttribute("id", "regexOption");
		regexOption.setAttribute("class", "option regex");

		subfolderOption = document.createElement("input");
		subfolderOption.setAttribute("type", "checkbox");
		subfolderOption.setAttribute("id", "subfolderOption");
		subfolderOption.setAttribute("class", "option subfolder");
		
		var table = document.createElement("table"),
			tr = document.createElement("tr"),
			td = document.createElement("td");
		
		table.setAttribute("cellspacing", "5");
		
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelFind);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputFind);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(findButtonLeft);
		td.appendChild(findButtonRight);
		tr.appendChild(td);
		

		td = document.createElement("td");
		td.appendChild(findAllButton);
		tr.appendChild(td);

		table.appendChild(tr);
		
		
		// Replace ....
		tr = document.createElement("tr"),
		
		
		td = document.createElement("td");
		td.appendChild(labelReplace);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputReplace);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(replaceButton);
		tr.appendChild(td);

		td = document.createElement("td");
		td.appendChild(replaceAllButton);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(regexOption);
		td.appendChild(regexOptionLabel);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		

		// Search in files ...
		tr = document.createElement("tr"),
		
		
		td = document.createElement("td");
		td.appendChild(labelInDir);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputInDir);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(findInFilesButton);
		tr.appendChild(td);

		td = document.createElement("td");
		td.appendChild(replaceInFilesButton);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(subfolderOption);
		td.appendChild(subfolderOptionLabel);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		
		// wow, adding dom elements is really tedious!

		
		div.appendChild(table);
		
		footer.appendChild(div);
		
		
		// Add event listeners
		inputFind.addEventListener("focus", function() {
			inputFindGotFocus = true;
		}, false);
		inputFind.addEventListener("blur", function() {
			inputFindGotFocus = false;
		}, false);
		findButtonLeft.addEventListener("click", function() {
			find(inputFind.value, editor.currentFile, regexOption.checked, false, false, "left"); // str, file, useRegex, keepSelection, dontLoop, direction
		}, false);
		findButtonRight.addEventListener("click", function() {
			find(inputFind.value, editor.currentFile, regexOption.checked, false, false, "right");
		}, false);
		findAllButton.addEventListener("click", function() {
			findAll(inputFind.value, editor.currentFile, regexOption.checked);
		}, false);
		replaceButton.addEventListener("click", function() {
			replace(inputReplace.value, inputFind.value, editor.currentFile, regexOption.checked);
		}, false);
		replaceAllButton.addEventListener("click", function() {
			replaceAll(inputReplace.value, inputFind.value, editor.currentFile, regexOption.checked);
		}, false);
		findInFilesButton.addEventListener("click", function() {
			findInFiles();
		}, false);		
		replaceInFilesButton.addEventListener("click", function() {
			alert("Not yet implemented!");
		}, false);
		
		
		searchVisible = true;

	}
	
	
	
	function findInFiles() {
		
		var searchString = inputFind.value;
		var useRegEx = regexOption.checked;
		var searchSubfolders = subfolderOption.checked;
		var searchPath = inputInDir.value;
		var totalFiles = 0;
		var filesSearched = 0;
		var content = "";
		var reportFile;
		var reportFilePath = "search_report " + (searchReportCounter++) + ".tmp";
		
		// Do not overwrite opened files!
		while(editor.files[reportFilePath]) {
			reportFilePath = "search_report " + (searchReportCounter++) + ".tmp";
		}
		
		// File ending so that it's not formatted by the JS parser
		
		editor.openFile(reportFilePath, content, function(file) {
			
			reportFile = file;
			
			file.isSaved = false;
			file.savedAs = false;
			file.parse = false;
		});
				
		editor.renderNeeded();
		
		reportFile.insertText("Files in '" + searchPath + "' that contains '" + searchString + "'");
		reportFile.insertLineBreak();
		
		searchDir(searchPath);
		
		
		function searchDir(currentDirPath) {
			var filePath;
			var stat;
			
			console.log("Searching: " + currentDirPath);
			
			// Make the box red if the folder doesn't exist
			if(editor.isFolderPath(currentDirPath)) {
				inputInDir.setAttribute("class", "inputtext indir");
			}
			else {
				inputInDir.setAttribute("class", "inputtext indir error");
				console.log("Path does not exist: " + currentDirPath);
			}
			
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
			totalFiles++;
			fs.readFile(filePath, 'utf-8', function(err, contents) { 
			
				if(err) console.error(err);
				
				console.log("Searching " + filePath);
				
				inspectFile(filePath, contents); 
			})
		
		}
		
		function inspectFile(filePath, contents) {
			
			try {
				if (contents.indexOf(searchString) != -1) {
					
					appendReport(filePath, contents);
					
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
		
		function appendReport(filePath, contents) {
			reportFile.insertLineBreak();
			reportFile.insertText(filePath);
			reportFile.insertLineBreak();
			reportFile.insertText(underline(filePath));
			reportFile.insertLineBreak();
			
			var lines = contents.split("\n");
			
			for(var i=0; i<lines.length; i++) {
				if(lines[i].indexOf(searchString) != -1) {
					
					lines[i] = lines[i].replace("\r", "");
					//lines[i] = lines[i].replace("\t", "");
					
					reportFile.insertText(lineFix(i+1) + lines[i]);
					reportFile.insertLineBreak();

				}
			}
			
			function lineFix(nr) {
				// Add spacing and a dot
				var space = 8;
				var str = "" + nr + "";
				var length = str.length;
				
				for(var i=length; i<space; i++) {
					str += " ";
				}
				return str;				
			}
			
			function underline(txt) {
				// Make a line as long as the text
				var line = [];
				
				for(var i=0; i<txt.length; i++) {
					line.push("-");
				}
				
				return line.join("");
				
			}
			
		}
		
		function allDone() {
			reportFile.insertLineBreak();
			reportFile.insertText("Searched a total of " + totalFiles + " files.");

		}
		
	}
	
	
	function pressEnter() {
		
		// Only search if there is anything in the search field, and the search box has focus
		if(searchVisible) {
			if(inputFind.value.length > 0 && editor.input===false) {
				find(inputFind.value, editor.currentFile, regexOption.checked);
			}
		}
	}
	
	
	function hide_search() {
		// Clear the search box?
		if(searchVisible) {
			
			// Hide the search window
			//div.style.display="none"; // Need to hide this, or the footer will not scrimp
			
			div.parentNode.removeChild(div);
			
			//footer.style.height = "0px"; // Hmm, can't be less then one px
			//footer.style.display = "none"; // But we can hide the table cell! nope :/
			
			//footer.style.border = ""
			
			// Bring back focus to the current file
			var file = editor.currentFile;
			if(file) {
				editor.input = true;
			}
			
			searchVisible = false;

			editor.resizeNeeded();
			editor.renderNeeded();
		}

	}
	
	function show_search() {
		if(!searchVisible) {
			var footerHeight = parseInt(footer.style.height);
			var heightNeeded = 120;
			
			//if(!div) buildDiv();
			buildDiv(); // Always build!
			
			searchVisible = true;
			
			div.style.display="block";
			//footer.style.display = "table-cell";
			
			if(footerHeight < heightNeeded) {
				footer.style.height = footerHeight + heightNeeded + "px";
				editor.resizeNeeded();
			}
			
			// Remove focus from the editor when bringing up the search box.
			var file = editor.currentFile;
			if(file) {
				editor.input = false;
			}
			
			console.log("Search visible! editor.input=" + editor.input);
			
			editor.resizeNeeded();
			editor.renderNeeded();
		}		
		
	}
	
	
	function pressEscape() {
		
		hide_search();
	
	}
	
	
	function findReplace(file, combo, character, charCode, keyPushDirection) {
		
		if(file) {
			console.log("searchVisible=" + searchVisible);
			if(searchVisible) {
				// Search right away
				find(inputFind.value, file, regexOption.checked);
				
			}
			else {
				show_search();
				let selectedText = file.getSelectedText();
				if(selectedText.length > 0) {
					// Put the selected text into the search box and make a search
					inputFind.value = selectedText;
					lastSearchEnd = file.selected[file.selected.length-1].index; // Begin search at the selected text
					console.log("lastSearchEnd=" + lastSearchEnd);
					editor.resize(); // Recalculate height so that the highlight dont show outside the screen
					find(inputFind.value, file, regexOption.checked);
				}
			}
			
			if(!inputFindGotFocus) {
				inputFind.focus();
			}
			
			editor.input = false; // Remove focus from the file
			
			return false; // Prevent default (browser) action
		}
		
	}
	
	function find(str, file, useRegex, keepSelection, dontLoop, direction) {
		
		// Selects the text, and moves the caret to it, return first text index of str
		
		var text = file.text;
		var start = file.caret.index + lastSearchStrLength;
		var end = 0;
		
		lastSearchStrLength = str.length;
		
		if(start == undefined) {
			start = file.caret.index;
		}
		
		if(useRegex == undefined) useRegex = false;
		if(keepSelection == undefined) keepSelection = false;
		if(dontLoop == undefined) dontLoop = false;
		if(direction == undefined) direction = "right";
		
		
		if(useRegex) {
			alert("Not yet implemented! (regex search)");
		}
		else {
			
			if(direction=="left") {
				//console.log("searching left");
				let begin = start-str.length-1
				start = text.lastIndexOf(str, begin);
				//console.log("start=" + start + " begin=" + begin);
				
				if( (start == -1 || begin == -1) && !dontLoop) {
					// Try again from the bottom
					start = text.lastIndexOf(str);
				}
				
				//console.log("start=" + start);
			}
			else {
				// Search to the right (default)
				//console.log("searching right");
				start = text.indexOf(str, start);
				
				if(start == -1 && !dontLoop) {
					// Try again from the top
					console.log("Trying again from the start");
					start = text.indexOf(str);
				}
			}
			
			end = start + str.length;
			
			lastSearchEnd = end;
		}
		
		if(start >= 0) {
			if(!keepSelection) {
				file.deselect();
			}
			
			
			
			var textRange = file.createTextRange(start, end);
			
			file.moveCaretToIndex(end, file.caret);
			
			if(!file.caret.eol) {
				textRange.pop();
			}
			
			file.moveCaretToIndex(start, file.caret);
			
			file.scrollToCaret(file.caret);
			
			file.select(textRange);
			
			editor.renderNeeded();
			

		}

		return start;
		
	}
	
	function findAll(str, file, useRegex) {
		
		var start = 0;
		
		lastSearchEnd = -1; // Begin from the start
		
		while(start > -1) {
			start = find(str, file, useRegex, true, true);
			console.log("start=" + start);

		}
		
		editor.renderNeeded();
		
	}
	
	
	function replace(newString, oldString, file, useRegex, dontLoop) {
		
		console.log("Replacing '" + oldString + "' with '" + newString + "'");
		
		lastSearchEnd = file.caret.index;
		
		lastSearchStrLength = 0;
		
		var keepSelection = false;
		
		if(dontLoop == undefined) dontLoop = true; // We dont want it to loop, or it will be confusing when it starts from the beginning.
		
		// Find the string
		var start = find(oldString, file, useRegex, keepSelection, dontLoop);
		
		if(start > -1) {
			// Delete the selected text
			file.deleteSelection();
			
			if(newString.length > 0) {
				// Insert the new string
				file.insertText(newString, file.caret);
			}
			
			editor.renderNeeded();
		}
		
		return start;
		
	}
	
	function replaceAll(newString, oldString, file, useRegex) {
		var start = 0;
		var dontLoop = false;
		
		lastSearchEnd = -1; // Begin from the start
		
		console.log("Replace all " + oldString + " width " + newString);
		
		while(start > -1) {
			start = replace(newString, oldString, file, useRegex, dontLoop);
			console.log("start=" + start);
		}
		
		editor.renderNeeded();

	}
	
	
})();