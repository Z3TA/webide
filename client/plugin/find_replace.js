
(function() {
	
	"use strict";
	
	var findReplaceDiv, inputFind, inputReplace, inputInDir, findButtonLeft, findButtonRight, replaceButton, regexOption, subfolderOption, findAllButton, 
		replaceAllButton, ignoreCaseOption;
	
	var inputFindGotFocus = false;
	var lastSearchEnd = -1; // Deprecated !??
	var searchReportCounter = 0;
	var searchVisible = false;
	var lastSearchStrLength = 0;
	var lastSearchDirection = "right"; // right|left
	var winMenuFindReplace;
	
	EDITOR.plugin({
		desc: "Find and Replace",
		load: loadFindAndReplace,
		unload: unloadFindAndReplace,
	});
	
	function loadFindAndReplace() {
		// Bind to ctrl + F
		
		var char_F = 70;
		var char_Esc = 27;
		
		EDITOR.bindKey({desc: "Find or replace in current file", charCode: char_F, combo: CTRL, fun: findReplace});
		
		EDITOR.bindKey({desc: "Hide the find/replace GUI", charCode: char_Esc, fun: hideFindReplaceGui});
		
		EDITOR.on("moveCaret", resetLastSearchStrLength);
		
		EDITOR.addEvent("voiceCommand", {
			re: /(find|search) (.*)/i,
			grammar: ["find", "search"], 
			fun: findInFile
		});
		
		EDITOR.registerAltKey({char: "f", alt:1, label: "find", fun: findReplace});
		
		winMenuFindReplace = EDITOR.windowMenu.add("Find/replace", ["File", 7], findReplace);
		
		// Point variables to the document object model
		findReplaceDiv = document.getElementById("findReplace");
		inputFind = document.getElementById("inputFind");
		inputReplace = document.getElementById("inputReplace");
		inputInDir = document.getElementById("inputInDir");
		findButtonLeft = document.getElementById("findButtonLeft");
		findButtonRight = document.getElementById("findButtonRight");
		replaceButton = document.getElementById("replaceButton");
		regexOption = document.getElementById("regexOption");
		subfolderOption = document.getElementById("subfolderOption");
		findAllButton = document.getElementById("findAllButton");
		replaceAllButton = document.getElementById("replaceAllButton");
		ignoreCaseOption  = document.getElementById("ignoreCaseOption");
		
	}
	
	function unloadFindAndReplace() {
		
		EDITOR.unbindKey(findReplace);
		EDITOR.unbindKey(hideFindReplaceGui);
		
		EDITOR.removeEvent("moveCaret", resetLastSearchStrLength);
		EDITOR.removeEvent("voiceCommand", findInFile);
		EDITOR.removeEvent("moveCaret", resetLastSearchStrLength);
		
		EDITOR.unregisterAltKey(findReplace);
		
		EDITOR.windowMenu.remove(winMenuFindReplace);
		
		
		// Cleanup
		hide_search();
		
	}
	
	// Unable to hot reload this plugin because the edtior complains about this function already being registered .. WHY!?
	function resetLastSearchStrLength(file, caret) {
		lastSearchStrLength = 0; // Reset this so that we do not start search from the wrong position
		return true;
	}
	
	function findInFile(text, file, match) {
		
		var str = match[2];
		
		find(str, file);
		
		return true;
		}
	
	function buildDiv() {
		
		var footer = document.getElementById("footer");
		if(!footer) {
			throw new Error("Can not find the footer!");
		}
		
		//if(!div) { // This will still return true after it has been removed!!!
		
		
		findReplaceDiv = document.createElement("div");
		
		findReplaceDiv.setAttribute("id", "findReplace");
		findReplaceDiv.setAttribute("class", "findReplace");
		
		// Build the input stuff ...
		
		var size = UTIL.getDirectoryFromPath(undefined).length;
		
		inputFind = document.createElement("input");
		inputFind.setAttribute("type", "text");
		inputFind.setAttribute("id", "inputFind");
		inputFind.setAttribute("class", "inputtext");
		inputFind.setAttribute("size", size);
		//inputFind.setAttribute("value", "X(..)X");
		
		
		inputReplace = document.createElement("input");
		inputReplace.setAttribute("type", "text");
		inputReplace.setAttribute("id", "inputReplace");
		inputReplace.setAttribute("class", "inputtext replace");
		inputReplace.setAttribute("size", size);
		//inputReplace.setAttribute("value", "Y$1Y");
		
		var labelFind = document.createElement("label");
		labelFind.setAttribute("for", "inputFind");
		labelFind.appendChild(document.createTextNode("Find:")); // Language settings!?
		
		var labelReplace = document.createElement("label");
		labelReplace.setAttribute("for", "inputReplace");
		labelReplace.appendChild(document.createTextNode("Replace with:")); // Language settings!?
		
		
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
		
		
		
		var regexOptionLabel = document.createElement("label");
		regexOptionLabel.setAttribute("for", "regexOption");
		regexOptionLabel.appendChild(document.createTextNode("Use regex")); // Language settings!?
		
		regexOption = document.createElement("input");
		regexOption.setAttribute("type", "checkbox");
		regexOption.setAttribute("id", "regexOption");
		regexOption.setAttribute("class", "option regex");
		
		
		var ignoreCaseLabel = document.createElement("label");
		ignoreCaseLabel.setAttribute("for", "ignoreCaseOption");
		ignoreCaseLabel.appendChild(document.createTextNode("Ignore case")); // Language settings!?
		
		ignoreCaseOption = document.createElement("input");
		ignoreCaseOption.setAttribute("type", "checkbox");
		ignoreCaseOption.setAttribute("id", "ignoreCaseOption");
		ignoreCaseOption.setAttribute("class", "option ignoreCase");
		
		
		var table = document.createElement("table"),
			tr = document.createElement("tr"),
			td = document.createElement("td");
		
		//table.setAttribute("cellspacing", "5");
		
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
		
		td = document.createElement("td");
		td.appendChild(ignoreCaseOption);
		td.appendChild(ignoreCaseLabel);
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
		
		
		findReplaceDiv.appendChild(table);
		
		footer.appendChild(findReplaceDiv);
		

		// Add event listeners
		
		inputFind.addEventListener("focus", function() {
			inputFindGotFocus = true;
		}, false);
		
		inputFind.addEventListener("blur", function() {
			inputFindGotFocus = false;
		}, false);
		
		findButtonLeft.addEventListener("click", function() {
			find(inputFind.value, EDITOR.currentFile, regexOption.checked, false, false, "left", ignoreCaseOption.checked); // str, file, useRegex, keepSelection, dontLoop, direction
		}, false);
		
		findButtonRight.addEventListener("click", function() {
			find(inputFind.value, EDITOR.currentFile, regexOption.checked, false, false, "right", ignoreCaseOption.checked);
		}, false);
		
		findAllButton.addEventListener("click", function() {
			findAll(inputFind.value, EDITOR.currentFile, regexOption.checked, ignoreCaseOption.checked);
		}, false);
		
		replaceButton.addEventListener("click", function() {
			replace(inputReplace.value, inputFind.value, EDITOR.currentFile, regexOption.checked, ignoreCaseOption.checked);
		}, false);
		
		replaceAllButton.addEventListener("click", function() {
			replaceAll(inputReplace.value, inputFind.value, EDITOR.currentFile, regexOption.checked, ignoreCaseOption.checked);
		}, false);
		
		inputFind.addEventListener("keyup", function(keyUpEvent) {
			var keyEnter = 13;
			var keyEscape = 27;
			var backSlash = 
			
			keyUpEvent.preventDefault();
			
			if (keyUpEvent.keyCode == keyEnter) {
				findButtonRight.click();
			}
			
			var text = inputFind.value;
			var regexpError = false;
			if(regexOption.checked && text.length > 0) {
				try {
					var reTest = new RegExp(text, "ig");
				}
				catch(err) {
					regexpError = true;
				}
			}
			
			if(regexpError) {
				inputFind.setAttribute("class", "inputtext error");
				return;
			}
			else {
				inputFind.setAttribute("class", "inputtext");
			}
			
			if(!regexpError) {
				// Find while typing
				lastSearchStrLength = 0; // So we keep searching the same word until it no longer match
				find(text, EDITOR.currentFile, regexOption.checked, false, false, "right", ignoreCaseOption.checked);
			}
			
		}, false);
		
		inputReplace.addEventListener("keyup", function(keyUpEvent) {
			var keyEnter = 13;
			var keyEscape = 27;
			
			if (keyUpEvent.keyCode == keyEnter) {
				replaceButton.click();
			}
		}, false);
		
		searchVisible = true;
		
	}
	
	
	function pressEnter() {
		
		// Only search if there is anything in the search field, and the search box has focus
		if(searchVisible) {
			if(inputFind.value.length > 0 && EDITOR.input===false) {
				find(inputFind.value, EDITOR.currentFile, regexOption.checked);
				return false;
			}
		}
		return true;
	}
	
	
	function hide_search() {
		// Clear the search box?
		if(searchVisible) {
			// Hide the search window
			findReplaceDiv.parentNode.removeChild(findReplaceDiv);
			
			
			// Bring back focus to the current file
			var file = EDITOR.currentFile;
			if(file) {
				EDITOR.input = true;
			}
			
			searchVisible = false;
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
		}
		
	}
	
	function show_search() {
		if(!searchVisible) {
			var footer = document.getElementById("footer");
			var footerHeight = parseInt(footer.style.height);
			var heightNeeded = 120;
			
			buildDiv(); // Always build!
			
			searchVisible = true;
			
			findReplaceDiv.style.display="block";
			
			if(footerHeight < heightNeeded) {
				footer.style.height = footerHeight + heightNeeded + "px";
				EDITOR.resizeNeeded();
			}
			
			// Remove focus from the editor when bringing up the search box.
			var file = EDITOR.currentFile;
			if(file) {
				EDITOR.input = false;
			}
			
			console.log("Search visible! EDITOR.input=" + EDITOR.input);
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
		}		
		
	}
	
	
	function hideFindReplaceGui() {
		
		hide_search();
		
		return true;
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
				var selectedText = file.getSelectedText();
				if(selectedText.length > 0) {
					// Put the selected text into the search box and make a search
					inputFind.value = selectedText;
					lastSearchEnd = file.selected[file.selected.length-1].index; // Begin search at the selected text
					console.log("lastSearchEnd=" + lastSearchEnd);
					EDITOR.resize(); // Recalculate height so that the highlight dont show outside the screen
					find(inputFind.value, file, regexOption.checked);
				}
			}
			
			if(!inputFindGotFocus) {
				inputFind.focus();
			}
			
			EDITOR.input = false; // Remove focus from the file
			
		}
		
		return false; // Prevent default (browser) action
		
	}
	
	function find(str, file, useRegex, keepSelection, dontLoop, direction, ignoreCase) {
		
		if(ignoreCase == undefined) ignoreCase = true;
		
		// Selects the text, and moves the caret to it, return first text index of str
		
		file.checkCaret();
		
		var text = file.text;
		var start = file.caret.index; // Will change depending if we search left or right
		var end = 0;
		var searchStrLenght = str.length;
		
		
		if(useRegex == undefined) useRegex = false;
		if(keepSelection == undefined) keepSelection = false;
		if(dontLoop == undefined) dontLoop = false;
		if(direction == undefined) direction = "right";
		
		lastSearchDirection = direction;
		
		console.log("search: useRegex=" + useRegex + " ignoreCase=" + ignoreCase);
		
		if(useRegex) {
			
			// ## Search using RegExp
			
			var flags = "g";
			
			if(ignoreCase) flags += "i";
			
			try {
			var re = new RegExp(str, flags);
			}
			catch(err) {
				if(err) return alertBox(err.message);
			}
			
			var result;
			
			if(direction=="left") {
				//console.log("searching left");
				
				start = Math.max(0, start - lastSearchStrLength); // Don't search more then this
				
				var tempText = text.substring(0, start); // Cut the text at last result so we don't find it again
				
				var index = -1;
				
				// Searches until we have found the last match
				while((result = re.exec(tempText)) != null) {
					index = result.index;
					searchStrLenght = result[0].length;
				}
				
				if( index==-1 && !dontLoop) {
					// Try again, but with the whole string
					tempText = text;
					while((result = re.exec(tempText)) != null) {
						index = result.index;
						searchStrLenght = result[0].length;
					}
				}
				
				if(index == -1) {
					console.log("Search did not find anything!");
					return -1;
				}
				
				start = index;
				
				//console.log("start=" + start);
			}
			else {
				// Search to the right (default)
				//console.log("searching right");
				
				re.lastIndex = start + lastSearchStrLength; // Start search at 
				
				result = re.exec(text);
				
				if(result == null && !dontLoop) {
					// Try again from the top
					console.log("Trying again from the start");
					re.lastIndex = 0;
					result = re.exec(text);
					
				}
				
				if(result == null) {
					console.log("Search did not find anything!");
					return -1;
				}
				
				start = result.index;
				
				searchStrLenght = result[0].length;
			}
			
			end = start + searchStrLenght; // Will select from start to end
			
			EDITOR.stat("find_regexp");
			
		}
		else {
			
			// ## Search using plain text
			
			if(direction=="left") {
				//console.log("searching left");
				var begin = start-1;
				
				if(ignoreCase) start = text.toLowerCase().lastIndexOf(str.toLowerCase(), begin)
				else start = text.lastIndexOf(str, begin);
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
				
				start = start + lastSearchStrLength; // Start search after last match
				
				/*
					problem: If the caret is moved since last search, we'll most likely start from the wrong position!
					solution: reset lastSearchStrLength when the caret is moved, and set it again after the selection
				*/
				
				if(ignoreCase) start = text.toLowerCase().indexOf(str.toLowerCase(), start)
				else start = text.indexOf(str, start);
				
				if(start == -1 && !dontLoop) {
					// Try again from the top
					console.log("Trying again from the start");
					if(ignoreCase) start = text.toLowerCase().indexOf(str.toLowerCase())
					else start = text.indexOf(str);
				}
			}
			
			searchStrLenght = str.length;
			
			console.log("lastSearchStrLength=" + lastSearchStrLength);
			
			end = start + searchStrLenght;
			
			EDITOR.stat("find_plaintext");
		}
		
		lastSearchEnd = end;
		
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
			
			lastSearchStrLength = searchStrLenght;
			
			file.select(textRange);
			
			EDITOR.renderNeeded();
			
			
		}
		
		return start;
		
	}
	
	function findAll(str, file, useRegex, ignoreCase) {
		
		var start = 0;
		var lastStart = -1;
		lastSearchEnd = -1; // Begin from the start
		
		while(start > -1) {
			if(start < lastStart) throw new Error("Find loop detected!");
			lastStart = start;
			start = find(str, file, useRegex, true, true, "right", ignoreCase);
			console.log("start=" + start);
		}
		
		EDITOR.renderNeeded();
		
		// Give focus to editor so you can copy all the selected strings
		EDITOR.input = true;
		
	}
	
	
	function replace(newString, searchString, file, useRegex, dontLoop, ignoreCase) {
		
		console.log("Replacing '" + searchString + "' with '" + newString + "'");
		
		lastSearchEnd = file.caret.index;
		
		lastSearchStrLength = 0; // Set this to zero so next right search begin at the care and not left of it
		
		var keepSelection = false;
		
		if(dontLoop == undefined) dontLoop = true; // We dont want it to loop, or it will be confusing when it starts from the beginning.
		
		//console.log("file.selected.length=" + file.selected.length + "");
		//if(file.selected.length > 0) file.moveCaretLeft(file.caret, lastSearchStrLength); // Find the selected text agan
		//return;
		
		// Find the string
		var start = find(searchString, file, useRegex, keepSelection, dontLoop);
		
		
		if(start > -1) {
			
			var selectedText = file.getSelectedText();
			
			console.log("Replacing at start=" + start);
			
			console.log("selectedText=" + selectedText);
			
			// Delete the selected text
			file.deleteSelection();
			
			if(newString.length > 0) {
				
				if(useRegex) {
					
					var flags = "";
					
					if(ignoreCase) flags += "i";
					
					newString = newString.replace(/\\n/g, "\n"); // Allow inserting new-lines
					
					// Support groups: $1 etc
					var re = new RegExp(searchString, flags);
					newString = selectedText.replace(re, newString);
					
					console.log("Regex replacing '" + selectedText + "' with '" + newString + "'");
					
					EDITOR.stat("replace_regexp");
				}
				else {
					EDITOR.stat("replace_plaintext");
				}
				
				// Insert the new string
				file.insertText(newString, file.caret);
			}
			
			EDITOR.renderNeeded();
		}
		
		return start;
		
	}
	
	function replaceAll(newString, searchString, file, useRegex, ignoreCase) {
		var start = 0;
		var lastStart = -1;
		var dontLoop = true;
		
		lastSearchEnd = -1; // Begin from the start
		
		console.log("Replace all " + searchString + " width " + newString);
		
		while(start > -1) {
			if(start < lastStart) throw new Error("Replace loop detected!");
			lastStart = start;
			start = replace(newString, searchString, file, useRegex, dontLoop, ignoreCase);
			console.log("start=" + start);
		}
		
		EDITOR.renderNeeded();
		
	}
	
	function regexIndexOf(text, regex, startpos) {
		var indexOf = text.substring(startpos || 0).search(regex);
		return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
	}
	
	function regexLastIndexOf(text, regex, startpos) {
		regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
		if(typeof (startpos) == "undefined") {
			startpos = text.length;
		} else if(startpos < 0) {
			startpos = 0;
		}
		var stringToWorkWith = text.substring(0, startpos + 1);
		var lastIndexOf = -1;
		var nextStop = 0;
		var result;
		while((result = regex.exec(stringToWorkWith)) != null) {
			lastIndexOf = result.index;
			regex.lastIndex = ++nextStop;
		}
		return lastIndexOf;
	}
	
	// TEST-CODE-START
	
	// ## Todo: Write tests
	/*
	EDITOR.addTest(function test_searchAndReplace(callback) {
		EDITOR.openFile("searchAndReplace.txt", "abcX1XdefX2XghiX2X", function(err, file) {
			
			
				
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
		
	});
	*/
	
	EDITOR.addTest(testReplaceAll);
	function testReplaceAll(callback) {
		EDITOR.openFile("replaceAll.txt", "fooBar\nfooBar\nfooBar\nfooBar\n", function(err, file) {
			var newString = "fooBarBaz";
			var searchString = "fooBar";
			replaceAll(newString, searchString, file);
			
			if(file.text != "fooBarBaz\nfooBarBaz\nfooBarBaz\nfooBarBaz\n") throw new Error("file.text=" + file.text);
			
			EDITOR.closeFile(file);
			
			callback(true);
			
		});
	}
	
	// TEST-CODE-END
	
})();
