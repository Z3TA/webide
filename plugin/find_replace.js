
(function() {
	
	"use strict";
	
		var footer, div, inputFind, inputReplace, inputInDir, findButtonLeft, findButtonRight, replaceButton, regexOption, subfolderOption, findAllButton, 
	replaceAllButton, ignoreCaseOption;
	
		
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
		replaceAllButton = document.getElementById("replaceAllButton");
		ignoreCaseOption  = document.getElementById("ignoreCaseOption");

	}
	
	
	function buildDiv() {
		
		if(!footer) {
			throw new Error("Can not find the footer!");
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
			find(inputFind.value, editor.currentFile, regexOption.checked, false, false, "left", ignoreCaseOption.checked); // str, file, useRegex, keepSelection, dontLoop, direction
		}, false);
		findButtonRight.addEventListener("click", function() {
			find(inputFind.value, editor.currentFile, regexOption.checked, false, false, "right", ignoreCaseOption.checked);
		}, false);
		findAllButton.addEventListener("click", function() {
			findAll(inputFind.value, editor.currentFile, regexOption.checked, ignoreCaseOption.checked);
		}, false);
		replaceButton.addEventListener("click", function() {
			replace(inputReplace.value, inputFind.value, editor.currentFile, regexOption.checked, ignoreCaseOption.checked);
		}, false);
		replaceAllButton.addEventListener("click", function() {
			replaceAll(inputReplace.value, inputFind.value, editor.currentFile, regexOption.checked, ignoreCaseOption.checked);
		}, false);
		
		
		searchVisible = true;

	}
	
	
	function pressEnter() {
		
		// Only search if there is anything in the search field, and the search box has focus
		if(searchVisible) {
			if(inputFind.value.length > 0 && editor.input===false) {
				find(inputFind.value, editor.currentFile, regexOption.checked);
				return false;
			}
		}
		return true;
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
	
	function find(str, file, useRegex, keepSelection, dontLoop, direction, ignoreCase) {
		
		// Selects the text, and moves the caret to it, return first text index of str
		
		var text = file.text;
		var start = file.caret.index; // Will change depending if we search left or right
		var end = 0;
		
		lastSearchStrLength = str.length;
		
		if(useRegex == undefined) useRegex = false;
		if(keepSelection == undefined) keepSelection = false;
		if(dontLoop == undefined) dontLoop = false;
		if(direction == undefined) direction = "right";
		
		
		if(useRegex) {
			
			// ## Search using RegExp
			
			var flags = "g";
			
			if(ignoreCase) flags += "i";
			
			var re = new RegExp(str, flags);
			var result;
			
			if(direction=="left") {
				//console.log("searching left");
				re.lastIndex = 0; // Always start from the beginning

				start = Math.max(0, start - lastSearchStrLength - 1); // Don't search more then this
				
				// Searches left to right, but stops before last match
				while((result = re.exec(text)) != null && re.index < start) {}
				
				if( result==null && !dontLoop) {
					// Try again from the bottom
					start = text.length;
					while((result = re.exec(text)) != null && re.lastIndex < start) {}
				}
				
				if(result == null) {
					console.log("Search did not find anything!");
					return -1;
				}
				
				start = result.index;
				
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
				
			}
			
			lastSearchStrLength = result[0].length;
			
			end = start + result[0].length;
			
		}
		else {
			
			// ## Search using plain text
			
			if(direction=="left") {
				//console.log("searching left");
				let begin = start-1;
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
				
				start = start + lastSearchStrLength;
				
				lastSearchStrLength = str.length;
				
				start = text.indexOf(str, start);
				
				if(start == -1 && !dontLoop) {
					// Try again from the top
					console.log("Trying again from the start");
					start = text.indexOf(str);
				}
			}
			
			end = start + str.length;
			
			
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
			
			file.select(textRange);
			
			editor.renderNeeded();
			

		}

		return start;
		
	}
	
	function findAll(str, file, useRegex, ignoreCase) {
		
		var start = 0;
		
		lastSearchEnd = -1; // Begin from the start
		
		while(start > -1) {
			start = find(str, file, useRegex, true, true, "right", ignoreCase);
			console.log("start=" + start);

		}
		
		editor.renderNeeded();
		
	}
	
	
	function replace(newString, oldString, file, useRegex, dontLoop, ignoreCase) {
		
		console.log("Replacing '" + oldString + "' with '" + newString + "'");
		
		lastSearchEnd = file.caret.index;
		
		lastSearchStrLength = 0;
		
		var keepSelection = false;
		
		if(dontLoop == undefined) dontLoop = true; // We dont want it to loop, or it will be confusing when it starts from the beginning.
		
		// Find the string
		var start = find(oldString, file, useRegex, keepSelection, dontLoop);
		
		if(start > -1) {
			
			var found = file.getSelectedText();
			
			// Delete the selected text
			file.deleteSelection();
			
			if(newString.length > 0) {
				
				if(useRegex) {
					// Support groups: $1 etc
					var re = new RegExp(newString, flags);
					newString = found.replace(re, newString);
}
				
				// Insert the new string
				file.insertText(newString, file.caret);
			}
			
			editor.renderNeeded();
		}
		
		return start;
		
	}
	
	function replaceAll(newString, oldString, file, useRegex, ignoreCase) {
		var start = 0;
		var dontLoop = false;
		
		lastSearchEnd = -1; // Begin from the start
		
		console.log("Replace all " + oldString + " width " + newString);
		
		while(start > -1) {
			start = replace(newString, oldString, file, useRegex, dontLoop, ignoreCase);
			console.log("start=" + start);
		}
		
		editor.renderNeeded();

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
	
	
})();