(function() {
	"use strict";
	
	
	var footer, div, regexOption, subfolderOption, inputInDir, inputFileFilter, optionCaseSensitive;
	
	var inputFindGotFocus = false;
	
	var divVisible = false; 
	
	// It's a good idea to have a limit for example if we accidently saarch for spaces
	var searchMaxFiles = 100000;
	var maxTotalMatches = 500;
	
	var defaultSearchTerm = "";
	var defaultSearchFilter = "\.js$|\.htm$|\.html$|\.css$";
	var searchReportCounter = 0;
	var linePadSpace = 6;
	var filesMatched = {};
	var lastRowNr = -1;
	
	EDITOR.on("start", function find_in_files_main() {
		
		var keyF = 70;
		var keyEnter = 13;
		var keyEscape = 27;
		
		// Pressing Ctrl + shift + F should hide or show the search window
		EDITOR.bindKey({desc: "Find in files ...", charCode: keyF, combo: SHIFT + CTRL, fun: findInFiles}); // Ctrl + F
		
		EDITOR.bindKey({desc: "Hide the find in files GUI", charCode: keyEscape, fun: hideFindInFilesGui});
		
		
		// Point variables to the document object model
		footer = document.getElementById("footer");
		
		//buildDiv();
		
		EDITOR.on("dblclick", fifdblclick);
		
		CLIENT.on("foundInFile", foundInFile);
		
	});
	
	function foundInFile(json) {
		
		console.log("foundInFile!!");
		console.log(json);
		
		var fileId = json.id;
		
		var filePath = searchReportFileName(fileId);
		var file;
		
		if(EDITOR.files.hasOwnProperty(filePath)) {
			file = EDITOR.files[filePath];
			append(file);
		}
		else {
			console.log("Creating search report file: " + filePath + " fileId=" + fileId);
			EDITOR.openFile(filePath, "", function(err, file) {
				
				console.log("Search report file creted: " + file.path + " fileId=" + fileId);
				
				if(err) throw err;
				
				append(file);
				
			});
		}
		
		function append(reportFile) {
			
			console.log("Appending to search report file: " + reportFile.path + " grid.length=" + reportFile.grid.length + " text.length=" + reportFile.text.length + " fileId=" + fileId + " json.lineNr=" + json.lineNr);
			
			// Make sure the second line of the report file has the regexp meta
			// Even if there's only one row, grid length is 1
			if(reportFile.grid.length <= 1) {
				if(reportFile.text.trim() == "") reportFile.writeLine("Find in File(s) Report");
				reportFile.writeLine("RegExp: " + json.regExp);
			}
			else {
				var secondLineOfReportFile = reportFile.rowText(1);
				if(secondLineOfReportFile.slice(0, 8) != "RegExp: ") reportFile.insertTextRow("RegExp: " + json.regExp, 1);
			}
			
			if(!filesMatched.hasOwnProperty(fileId)) filesMatched[fileId] = [];
			
			var matchFound = (filesMatched[fileId].indexOf(json.file) != -1)
			
			if(!matchFound) {
				reportFile.writeLineBreak();
				reportFile.writeLineBreak();
				reportFile.write(json.file);
				reportFile.writeLineBreak();
				reportFile.write(underline(json.file));
				reportFile.writeLineBreak();
				
				filesMatched[fileId].push(json.file);
				
				if(json.replaceWith) {
					// Do the replace operation on the file if it's open
					if(EDITOR.files.hasOwnProperty(json.file)) {
						EDITOR.files[json.file].reload(EDITOR.files[json.file].text.replace(regExpFromString(json.regExp), json.replaceWith));
					}
					
				}
			}
			
			var rowNr = json.lineNr-1;
			
			console.log("foundInFile!!");
			console.log(json);
			
			// if the row is the same as last row, the line will be ignored (because it would look the same)
			if(rowNr != lastRowNr) {
				// Print all content of that line
				reportFile.write( linePad(json.lineNr) + json.lineText );
				
				if(json.replaceWith) {
					var replacedLineText = json.lineText.replace(regExpFromString(json.regExp), json.replaceWith);
					if(replacedLineText != json.lineText) reportFile.write( " => " + replacedLineText );
				}
				
				reportFile.writeLineBreak();
			}
			
			
			lastRowNr = rowNr;
			
			matchFound = true;
		}
	}
	
	function regExpFromString(regExpString) {
		var flags = regExpString.replace(/.*\/([gimy]*)$/, '$1');
		var pattern = regExpString.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
		
		//var regex = new RegExp(pattern, flags);
		//var regex = new RegExp(regExpString);
		
		var match = regExpString.match(new RegExp('^/(.*?)/([gimy]*)$'));
		
		console.log("regExpFromString match=" + JSON.stringify(match));
		
		return new RegExp(match[1], match[2]);
	}
	
	function isSearchReport(file) {
		
		if(!file) return false;
		
		var text = file.text;
		
		if(file.grid.length < 2) return false;
		
		var secondLineContainsRegExp = (file.rowText(1).slice(0,8) == "RegExp: ");
		var containsLines = (text.search(/Line\s*?\d*:/) != -1);
		var containsPathMd = (text.search(/^-*$/) != -1 != -1);
		
		console.log("secondLineContainsRegExp=" + secondLineContainsRegExp + " containsLines=" + containsLines + " containsPathMd=" + containsPathMd);
		
		if(secondLineContainsRegExp && containsLines && containsPathMd) return true
		else return false;
		
	}
	
	function fifdblclick(mouseX, mouseY, caret, button, target, keyboardCombo) {
		var file = EDITOR.currentFile;
		
		if(isSearchReport(file) && caret) {
			
			// Get the line number
			var clickedRowText = file.rowText(caret.row);
			
			var arr = clickedRowText.match(/Line\s*?(\d*):/);
			
			if(arr == null) {
				console.warn("Doesn't seem to be a line: " + clickedRowText);
				return;
			}
			else if(arr.length != 2) throw new Error("arr.length=" + arr.length + " arr=" + JSON.stringify(arr) + "\nPattern doesn't match. Did you change how the line number is formatted?\nOr did the JavaScript engine update!? (then go write an angry message on the ECMAScript mailing list for changing the spec.)");
			
			var lineNr = arr[1]; // The part captured by the group (parenthesis)
			
			
			//clickedRowText = clickedRowText.substring(clickedRowText.indexOf(":")); // Remove the line part
			
			
			// Get the file path
			var row = caret.row;
			while(row > 0 && file.grid[row][0].char != "-") row--; // Search up for a row that starts with "--------" (below a path)
			var path = file.rowText(row-1);
			
			// Find the search string (to be highlighted when/if the files is opened)
			var firstRowText = file.rowText(0);
			var secondRowText = file.rowText(1);
			
			var matchSearchString = secondRowText.match(/RegExp: (.*)/);
			
			if(!matchSearchString) return console.warn("Could not find the search string that was used!");
			
			var regExpString = matchSearchString[1];
			
			console.log("regExpString=" + regExpString);
			
			
			// Create a regEx to find the word(s) to highlight
			var flags = regExpString.replace(/.*\/([gimy]*)$/, '$1');
			var pattern = regExpString.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
			
			//var regex = new RegExp(pattern, flags);
			//var regex = new RegExp(regExpString);
			
			var match = regExpString.match(new RegExp('^/(.*?)/([gimy]*)$'));
			// sanity check here
			
			console.log("match=" + JSON.stringify(match));
			
			var regex = new RegExp(match[1], match[2]);
			
			console.log("regex=" + regex);
			
			console.log("flags=" + flags);
			console.log("pattern=" + pattern);
			console.log("regex.flags=" + regex.flags);
			console.log("regex.source=" + regex.source);
			
			// Open the file, then go to the line, and highlight the search word
			
			console.log("line=" + lineNr);
			console.log("path=" + path);
			
			EDITOR.openFile(path, undefined, function highlightGoto(err, file) {
				
				console.log("file opened=" + file.path);
				
				// Scroll to and place the caret on the line
				file.gotoLine(lineNr, function afterScrolled() {
					
					console.log("scrolled to the right place!?")
					
					// Find all matches in the whole file (can be many!)
					var result;
					var words = [];
					while ((result = regex.exec(file.text)) !== null) { // Find the word(s)
						if(words.indexOf(result[0]) == -1) words.push(result[0]); 
					}
					
					// Highlight the matched words
					console.log("words=" + words);
					console.log("regex flags=" + regex.flags + " source=" + regex.source);
					for(var i=0; i<words.length; i++) {
						file.highlightText(words[i]);						
					}
					
					
				});
				
				
			});
			
			
		}
		else console.log("File is not a search report!");
		
	}
	
	
	function show_find_in_files() {
		if(!divVisible) {
			var footerHeight = parseInt(footer.style.height);
			var heightNeeded = 120;
			
			//if(!div) buildDiv();
			buildDiv(); // Always build!
			
			
			div.style.display="block";
			//footer.style.display = "table-cell";
			
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
	
	function findInFiles(file) {
		
		console.log("divVisible=" + divVisible);
			if(!divVisible) {
				show_find_in_files();
				var selectedText = file ? file.getSelectedText() : "";
				if(selectedText.length > 0) {
					// Put the selected text into the search box
					inputFind.value = selectedText;
				}
			}
			
			if(!inputFindGotFocus) {
				inputFind.focus(); // undefined is not a function!
			}
			
			EDITOR.input = false; // Remove focus from the file
			
			return false; // Prevent default (browser) action
	}
	
	function pressEnter() {
		// Only search if there is anything in the search field, and the search box has focus
		if(divVisible && inputFindGotFocus) {
			if(inputFind.value.length > 0 && EDITOR.input===false) {
				searchFiles(inputFind.value, regexOption.checked, subfolderOption.checked, inputInDir.value, inputFileFilter.value, optionCaseSensitive.checked);
				return false; // Prevent default
			}
		}
		return true;
	}
	
	function hideFindInFilesGui() {
		
		if(divVisible) {
			hide_find_in_files();
			return false;
		}
		return true;
	}
	
	function hide_find_in_files() {
		// Clear the search box?
		if(divVisible) {
			
			// Hide the search window
			//div.style.display="none"; // Need to hide this, or the footer will not scrimp
			
			div.parentNode.removeChild(div);
			divVisible = false;
			
			//footer.style.height = "0px"; // Hmm, can't be less then one px
			//footer.style.display = "none"; // But we can hide the table cell! nope :/
			
			//footer.style.border = ""
			
			// Bring back focus to the current file
			var file = EDITOR.currentFile;
			if(file) {
				EDITOR.input = true;
			}
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
		}
	}
	
	function buildDiv() {
		if(!footer) {
			throw new Error("Can not find the footer!");
		}
		
		div = document.createElement("div");
		
		div.setAttribute("id", "findInFile");
		div.setAttribute("class", "findInFile");
		
		var searchFolder = EDITOR.currentFile ? UTIL.getDirectoryFromPath(EDITOR.currentFile.path) : EDITOR.workingDirectory;
		var size = searchFolder.length;
		if(size > 40) size = 40;
		if(size < 20) size = 20;
		
		console.log("EDITOR.currentFile.path=" + (EDITOR.currentFile ? EDITOR.currentFile.path : undefined) + " EDITOR.workingDirectory=" + EDITOR.workingDirectory + " size=" + size);
		
		var inputFind = document.createElement("input");
		inputFind.setAttribute("type", "text");
		inputFind.setAttribute("id", "inputFind");
		inputFind.setAttribute("class", "inputtext");
		inputFind.setAttribute("size", size);
		inputFind.value = defaultSearchTerm;
		
		var inputReplace = document.createElement("input");
		inputReplace.setAttribute("type", "text");
		inputReplace.setAttribute("id", "inputReplace");
		inputReplace.setAttribute("class", "inputtext replace");
		inputReplace.setAttribute("size", size);
		
		inputInDir = document.createElement("input");
		inputInDir.setAttribute("type", "text");
		inputInDir.setAttribute("id", "inputInDir");
		inputInDir.setAttribute("class", "inputtext indir");
		inputInDir.value = searchFolder;
		inputInDir.setAttribute("size", size);
		
		inputFileFilter = document.createElement("input");
		inputFileFilter.setAttribute("type", "text");
		inputFileFilter.setAttribute("id", "inputFileFilter");
		inputFileFilter.setAttribute("class", "inputtext inputFileFilter");
		inputFileFilter.value = defaultSearchFilter
		inputFileFilter.setAttribute("size", size);
		
		
		var labelFind = document.createElement("label");
		labelFind.setAttribute("for", "inputFind");
		labelFind.appendChild(document.createTextNode("Find:")); // Language settings!?
		
		var labelReplace = document.createElement("label");
		labelReplace.setAttribute("for", "inputReplace");
		labelReplace.appendChild(document.createTextNode("Replace with:")); // Language settings!?
		
		var labelInDir = document.createElement("label");
		labelInDir.setAttribute("for", "inputInDir");
		labelInDir.appendChild(document.createTextNode("In directory:")); // Language settings!?
		
		var labelFileFilter = document.createElement("label");
		labelFileFilter.setAttribute("for", "inputFileFilter");
		labelFileFilter.appendChild(document.createTextNode("File filter (regex):")); // Language settings!?
		
		var buttonFindInFiles = document.createElement("input");
		buttonFindInFiles.setAttribute("type", "button");
		buttonFindInFiles.setAttribute("class", "button");
		buttonFindInFiles.setAttribute("id", "buttonFindInFiles");
		buttonFindInFiles.setAttribute("value", "Search in files");
		
		var buttonReplaceInFiles = document.createElement("input");
		buttonReplaceInFiles.setAttribute("type", "button");
		buttonReplaceInFiles.setAttribute("class", "button");
		buttonReplaceInFiles.setAttribute("id", "buttonReplaceInFiles");
		buttonReplaceInFiles.setAttribute("value", "Replace in files");
		
		var buttonBrowseFolder = document.createElement("input");
		buttonBrowseFolder.setAttribute("type", "button");
		buttonBrowseFolder.setAttribute("class", "button");
		buttonBrowseFolder.setAttribute("value", "Browse folder");
		
		
		var labelRegexOption = document.createElement("label");
		labelRegexOption.setAttribute("for", "regexOption");
		labelRegexOption.appendChild(document.createTextNode("Use regex")); // Language settings!?
		
		var labelCaseSensitive = document.createElement("label");
		labelCaseSensitive.setAttribute("for", "optionCaseSensitive");
		labelCaseSensitive.appendChild(document.createTextNode("Case-sensitive")); // Language settings!?
		
		
		var labelSubFolderOption = document.createElement("label");
		labelSubFolderOption.setAttribute("for", "subfolderOption");
		labelSubFolderOption.appendChild(document.createTextNode("Search subfolders")); // Language settings!?
		
		regexOption = document.createElement("input");
		regexOption.setAttribute("type", "checkbox");
		regexOption.setAttribute("id", "regexOption");
		regexOption.setAttribute("class", "option regex");
		
		optionCaseSensitive = document.createElement("input");
		optionCaseSensitive.setAttribute("type", "checkbox");
		optionCaseSensitive.setAttribute("id", "optionCaseSensitive");
		optionCaseSensitive.setAttribute("class", "option optionCaseSensitive");
		
		subfolderOption = document.createElement("input");
		subfolderOption.setAttribute("type", "checkbox");
		subfolderOption.setAttribute("id", "subfolderOption");
		subfolderOption.setAttribute("class", "option subfolder");
		
		
		
		
		var table = document.createElement("table"),
		tr = document.createElement("tr"),
		td = document.createElement("td");
		
		table.setAttribute("cellspacing", "5");
		
		// ### Find in files
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelFind);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputFind);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(buttonFindInFiles);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(regexOption);
		td.appendChild(labelRegexOption);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(optionCaseSensitive);
		td.appendChild(labelCaseSensitive);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		
		// ### Replace in files
		tr = document.createElement("tr"),
		
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelReplace);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputReplace);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(buttonReplaceInFiles);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		
		
		// ### In dir
		tr = document.createElement("tr"),
		
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelInDir);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputInDir);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(buttonBrowseFolder);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(subfolderOption);
		td.appendChild(labelSubFolderOption);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		
		// ### File filter
		tr = document.createElement("tr"),
		
		td = document.createElement("td");
		td.appendChild(labelFileFilter);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputFileFilter);
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
		inputFind.addEventListener("keyup", function(keyUpEvent) {
			var keyEnter = 13;
			var keyEscape = 27;
			
			keyUpEvent.preventDefault();
			
			if (keyUpEvent.keyCode == keyEnter) {
				buttonFindInFiles.click();
			}
		}, false);
		buttonFindInFiles.addEventListener("click", function() {
			searchFiles(inputFind.value, regexOption.checked, subfolderOption.checked, inputInDir.value, inputFileFilter.value, optionCaseSensitive.checked);
		}, false);		
		buttonReplaceInFiles.addEventListener("click", function() {
			searchFiles(inputFind.value, regexOption.checked, subfolderOption.checked, inputInDir.value, inputFileFilter.value, optionCaseSensitive.checked, inputReplace.value);
		}, false);
		buttonBrowseFolder.addEventListener("click", function browseFolder() {
			var defaultPath = "";
			
			if(EDITOR.currentFile) defaultPath = UTIL.getDirectoryFromPath(EDITOR.currentFile.path)
			else defaultPath = EDITOR.workingDirectory;
			
			EDITOR.directoryDialog(defaultPath, function selectKey(path) {
				inputInDir.value = path;
			});
			
		}, false);
		
		divVisible = true;
		
		
		
		
	}
	
	function searchReportFileName(searchReportCounter) {
		return "search_report " + (searchReportCounter) + ".tmp"
	}
	
	function searchFiles(searchString, useRegEx, searchSubfolders, searchPath, fileFilter, caseSensitive, replaceWith) {
		
		var reportFile;
		var reportFilePath = searchReportFileName(searchReportCounter);
		
		if(!useRegEx) {
			// Convert to a regexp
			searchString= UTIL.escapeRegExp(searchString);
		}
		
		
		inputInDir.setAttribute("class", "inputtext indir");
		
		
		
		
		// Do not overwrite opened files!
		while(EDITOR.files.hasOwnProperty(reportFilePath)) {
			reportFilePath = searchReportFileName(++searchReportCounter);
		}
		
		// File extension (.tmp) so that it's not formatted by the JS parser
		var content = "";
		EDITOR.openFile(reportFilePath, content, function(err, file) {
			
			if(err) throw err;
			
			reportFile = file;
			
			file.isSaved = false;
			file.savedAs = false;
			file.parse = false;
			
			EDITOR.renderNeeded();
			
			reportFile.insertText("Files in '" + searchPath + "' (" + fileFilter + ") that match '" + searchString + "'" + (caseSensitive ? " (case sensitive) ": "") + ":");
			reportFile.insertLineBreak();
			
			filesMatched[searchReportCounter] = [];
			lastRowNr = -1;
			
			var json = {
				searchString: searchString,
				searchSubfolders: searchSubfolders,
				searchPath: searchPath,
				fileFilter: fileFilter,
				caseSensitive: caseSensitive,
				id: searchReportCounter
			};
			
			if(replaceWith) json.replaceWith = replaceWith;
			
			CLIENT.cmd("findReplaceInFiles", json, function(err, json) {
				if(err) {
					alertBox(err.message);
					reportFile.writeLine(err.message);
					
					//inputInDir.setAttribute("class", "inputtext indir error");
					//return alert("Can't do a search in a path that don't exist");
					
				}
				else {
					reportFile.writeLine(json.msg);
					
					// Highlight the matches
					var matches = json.matches;
					console.log("matches=" + matches);
					for(var i=0; i<matches.length; i++) {
						reportFile.highlightText(matches[i]);
					}
					
					console.log(json);
					
				}
				
				
			});
			
		});
		
		
		
		return false;
		
	}
	
	function linePad(nr) {
		// Add spacing and a colon
		var str = "" + nr + "";
		var length = str.length;
		
		for(var i=length; i<linePadSpace; i++) {
			str = " " + str;
		}
		return "Line " + str + ": ";
	}
	
	function underline(txt) {
		// Make a line as long as the text
		var line = [];
		
		for(var i=0; i<txt.length; i++) {
			line.push("-");
		}
		
		return line.join("");
		
	}
	
	
	function filterFileNames(name) {
		return fileFilterRegExp.test(name);
	}
	
})();