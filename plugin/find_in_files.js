(function() {
	"use strict";
	
	var footer, div, regexOption, subfolderOption, inputInDir, inputFileFilter, optionCaseSensitive;
	
	var inputFindGotFocus = false;
	
	var divVisible = false; 
	
	// It's a good idea to have a limit for example if we accidently saarch for spaces
	var searchMaxFiles = 100000;
	var maxTotalMatches = 500;
	
	var defaultSearchTerm = "";
	var defaultSearchFolder = editor.workingDirectory;
	var defaultSearchFilter = "\.js$|\.htm$|\.html$|\.css$";
	
	editor.on("start", function find_in_files_main() {
		
		var keyF = 70;
		var keyEnter = 13;
		var keyEscape = 27;
		
		// Pressing Ctrl + shift + F should hide or show the search window
		editor.keyBindings.push({charCode: keyF, combo: SHIFT + CTRL, fun: findInFiles}); // Ctrl + F

		// Pressing enter should do a search if the search window is open
		editor.keyBindings.push({charCode: keyEnter, fun: pressEnter});

		// Pressing escape should clear and hide the search window
		editor.keyBindings.push({charCode: keyEscape, fun: pressEscape});
		
		
		
		// Point variables to the document object model
		footer = document.getElementById("footer");

		//buildDiv();
		
		editor.on("dblclick", fifdblclick);
		
		
	});
	
	function isSearchReport(file) {
		
		if(!file) return false;
		
		var text = file.text;
		
		var containsFilesIn = (text.search(/Files in .* that match:/) != -1);
		var containsLines = (text.search(/Line\s*?\d*:/) != -1);
		var containsPathMd = (text.search(/^-*$/) != -1 != -1);
		
		console.log("containsFilesIn=" + containsFilesIn + " containsLines=" + containsLines + " containsPathMd=" + containsPathMd);
		
		if(containsFilesIn && containsLines && containsPathMd) return true
		else return false;
		
	}
	
	function fifdblclick(mouseX, mouseY, caret, button, target, keyboardCombo) {
		var file = editor.currentFile;
		
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
			
			// Find the search string
			var firstRowText = file.rowText(0);
			var searchFor = "that match: "; // This string could change depending on localization/language
			var searchString = firstRowText.substring(firstRowText.indexOf(searchFor) + searchFor.length);
			
			console.log("searchString=" + searchString);

			
			// Create a regEx to find the word(s) to highlight
			var flags = searchString.replace(/.*\/([gimy]*)$/, '$1');
			var pattern = searchString.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
			//var regex = new RegExp(pattern, flags);
			//var regex = new RegExp(searchString);
			
			var match = searchString.match(new RegExp('^(.*?)/([gimy]*)$'));
			// sanity check here
			var regex = new RegExp(match[1], match[2]);
			
			console.log("flags=" + flags);
			console.log("pattern=" + pattern);
			console.log("regex.flags=" + regex.flags);
			console.log("regex.source=" + regex.source);
			
			// Open the file, then go to the line, and highlight the search word
			
			console.log("line=" + lineNr);
			console.log("path=" + path);
			
			editor.openFile(path, undefined, function highlightGoto(file) {
				
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
	
	function findInFiles(file) {
		if(file) {
			console.log("divVisible=" + divVisible);
			if(!divVisible) {
				show_find_in_files();
				var selectedText = file.getSelectedText();
				if(selectedText.length > 0) {
					// Put the selected text into the search box
					inputFind.value = selectedText;
				}
			}
			
			if(!inputFindGotFocus) {
				inputFind.focus();
			}
			
			editor.input = false; // Remove focus from the file
			
			return false; // Prevent default (browser) action
		}
	}
	
	function pressEnter() {
		// Only search if there is anything in the search field, and the search box has focus
		if(divVisible && inputFindGotFocus) {
			if(inputFind.value.length > 0 && editor.input===false) {
				searchFiles(inputFind.value, regexOption.checked, subfolderOption.checked, inputInDir.value, inputFileFilter.value, optionCaseSensitive.checked);
				return false; // Prevent default
			}
		}
		return true;
	}
	
	function pressEscape() {
		
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
			var file = editor.currentFile;
			if(file) {
				editor.input = true;
			}

			editor.resizeNeeded();
			editor.renderNeeded();
		}
	}
	
	function buildDiv() {
		if(!footer) {
			throw new Error("Can not find the footer!");
		}
		
		div = document.createElement("div");
		 
		div.setAttribute("id", "findInFile");
		div.setAttribute("class", "findInFile");
		
		
		var size = editor.getDir().length;
		
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
		inputInDir.value = editor.getDir(); // The directory of the current file being open
		if(inputInDir.value=="") inputInDir.value = defaultSearchFolder;
		
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
		buttonFindInFiles.addEventListener("click", function() {
			searchFiles(inputFind.value, regexOption.checked, subfolderOption.checked, inputInDir.value, inputFileFilter.value, optionCaseSensitive.checked);
		}, false);		
		buttonReplaceInFiles.addEventListener("click", function() {
			alert("Not yet implemented!");
		}, false);
		
		
		divVisible = true;
		
		
		
		
	}
	
	function searchFiles(searchString, useRegEx, searchSubfolders, searchPath, fileFilter, caseSensitive) {
		
		var searchReportCounter = 0;
		var totalFiles = 0;
		var filesSearched = 0;
		var content = "";
		var reportFile;
		var reportFilePath = "search_report " + (searchReportCounter++) + ".tmp";
		var fileFilterRegExp;
		var fileQueue = []; // Files to be searched
		var foldersToRead = 0;
		var totalMatches = 0;
		var totalFilesFound = 0;
		var statsToDo = 0;
		var matches = [];
		var flags = "g"; // Always make a global search!
		
		if(editor.isFolderPath(searchPath)) {
			inputInDir.setAttribute("class", "inputtext indir");
		}
		else {
			// Make the box red if the folder doesn't exist
			inputInDir.setAttribute("class", "inputtext indir error");
			return alert("Can't do a search in a path that don't exist");
		}
		
		if(fileFilter.length > 0) {
			fileFilterRegExp = new RegExp(fileFilter);
		}
		
		
		if(!useRegEx) {
			// Convert to a regexp
			searchString = escapeRegExp(searchString);
			
		}

		if(!caseSensitive) flags += "i";
	
		
		// Do not overwrite opened files!
		while(editor.files.hasOwnProperty(reportFilePath)) {
			reportFilePath = "search_report " + (searchReportCounter++) + ".tmp";
		}
		
		// File extension (.tmp) so that it's not formatted by the JS parser
		
		editor.openFile(reportFilePath, content, function(file) {
			
			reportFile = file;
			
			file.isSaved = false;
			file.savedAs = false;
			file.parse = false;
			
			editor.renderNeeded();
			
			reportFile.insertText("Files in '" + searchPath + "' (" + fileFilter + ") that match: " + searchString + "/" + flags);
			//reportFile.insertLineBreak();
			
			searchDir(searchPath);
			
		});

		function searchDir(currentDirPath) {
			
			console.log("Searching: " + currentDirPath);
			
			foldersToRead++;
			
			fs.readdir(currentDirPath, function dirRead(err, folderItems) {
				if(err) throw err;
				
				var filePath;
				for(var i=0; i<folderItems.length; i++) {
					
					filePath = path.join(currentDirPath, folderItems[i]);
					
					doStat(filePath);

				}
				
				foldersToRead--;
				
				doWeHaveAllFiles();
				
				function doStat(filePath) {
					statsToDo++;
					fs.stat(filePath, function fileStat(err, stat) {
						
						var filterMatch = true;
						
						if(err) throw err;
						
						console.log("What is: " + filePath);
						
						
						if (stat.isFile()) {
							
							totalFilesFound++;
							
							if(fileFilterRegExp) {
								filterMatch = fileFilterRegExp.test(filePath);
							}
							
							if(filterMatch) fileQueue.push(filePath);
							
						} 
						else if (stat.isDirectory() && searchSubfolders) {
							searchDir(filePath);
						}
						
						statsToDo--;
						
						doWeHaveAllFiles();
						
						
					});					
				}
				
			});
			
		}
		
		function doWeHaveAllFiles() {
			if(statsToDo === 0 && foldersToRead == 0) {
				// Begin searching the fileQueue
				
				if(fileQueue.length == 0) {
					alert("Found " + totalFilesFound + " files. But none of them math the file filter!");
				}
				else {
					searchFile(fileQueue[0]); // Start with first file, then do the next one when this one is done
				}
				
			}
		}
		

		function searchFile(filePath) {
			
			// Search all files as streams ...
			
			var lineBreakCharacters;
			var lineIndex = []; // Character index: lineIndex[0] = Index of first line break, lineIndex[1] = Index of second line break, etc
			var charCounter = 0; 
			var matchFound = false;
			var totalRows = 0; // So we can calculate the line number
			
			console.log("Opening as stream: " + filePath);
			
			var stream = fs.createReadStream(filePath);
			stream.setEncoding('utf8');
			stream.on('readable', readStream);
			stream.on("end", streamEnded);
			stream.on("error", streamError);
			stream.on("close", streamClose);

			function streamClose() {
				console.log("Stream closed! filePath=" + filePath);
			}
			
			function streamError(err) {
				console.log("Stream error! filePath=" + filePath);
				throw err;
			}
			
			function streamEnded() {
				console.log("Stream ended! filePath=" + filePath);
				
				// Should this be in streamClose instead !?
				
				fileQueue.shift(); // Remove first element in the array, the file we just searched.
				
				totalFiles++;
				
				if(fileQueue.length > 0 && totalFiles < searchMaxFiles && totalMatches < maxTotalMatches) {
					searchFile(fileQueue[0]); // Search next file in queue
				}
				else {
					
					reportFile.insertLineBreak();
					
					if(totalFilesFound == totalFiles) {
						reportFile.insertText("Found " + totalMatches + " match(es) in " + totalFiles + " file(s).");
					}
					else {
						reportFile.insertText("Found " + totalMatches + " match(es) in " + totalFiles + " of " + totalFilesFound + " files.");
					}
					
					
					// Highlight the matches
					console.log("matches=" + matches);
					for(var i=0; i<matches.length; i++) {
						reportFile.highlightText(matches[i]);						
					}

					if(totalFiles >= searchMaxFiles) alert("Aborted the search because we reached searchMaxFiles=" + searchMaxFiles + " limit!");
					if(totalMatches >= maxTotalMatches) alert("Aborted the search because we reached maxTotalMatches=" + maxTotalMatches + " limit!");
					
				}
			}
			
			function readStream() {
				// Called each time there is someting comming down the stream
				
				var chunk;
				var lineBreaks = 0;
				var str = "";
				var decoder = new StringDecoder('utf8');
				var result;
				var index = -1;
				var char = "";
				var rowNr = -1;
				var lastRowNr = -1;
				var myRe;
				var lineText = "";
				
				//var chunkSize = 512; // How many bytes to recive in each chunk
				
				//console.log("Reading stream ... isPaused=" + stream.isPaused());
				
				while (null !== (chunk = stream.read()) && !stream.isPaused() && totalMatches < maxTotalMatches ) {

					// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
					str = decoder.write(chunk);
					
					if(!lineBreakCharacters) lineBreakCharacters = determineLineBreakCharacters(str);
				
					// Map each line to a character index
					totalRows += lineIndex.length;
					lineIndex.length = 0; // Reset
					for(var i=0; i<str.length; i++) {
						char = str.charAt(i);
						if(char == lineBreakCharacters[0]) {
							lineIndex.push(i); // Index is for this cunk
						}
					}
					console.log("Current total lines=" + lineIndex.length);
					
					// Search the chunk
					myRe = new RegExp(searchString, flags); // Create a new RegExp for each chunk!
					
					while ((result = myRe.exec(str)) !== null) {
						
						console.log("Found " + result[0]);
						
						totalMatches++;
						
						if(matches.indexOf(result[0]) == -1) matches.push(result[0]); // Highlight these later
						
						// Figure out what the line number is
						// opt tip: binarysort could be used here
						
						index = result.index;
						
						console.log("index=" + index + " result.index=" + result.index + " charCounter=" + charCounter);
						
						rowNr = -1;

						for(var row=lastRowNr; row<lineIndex.length; row++) {
							//console.log(row + ": " + lineIndex[row] + " >= " + index + " ?")
							if(lineIndex[row] >= index) {
								
								rowNr = row;
								break;
							}
						}
						
						if(rowNr == -1) {
							console.log("Last line!");
							rowNr = lineIndex.length; // Last line
						}
						
						console.log("rowNr=" + rowNr + " lastRowNr=" + lastRowNr + " lineIndex.length=" + lineIndex.length);
						
						if(!matchFound) {
							reportFile.insertLineBreak();
							reportFile.insertLineBreak();
							reportFile.insertText(filePath);
							reportFile.insertLineBreak();
							reportFile.insertText(underline(filePath));
							reportFile.insertLineBreak();
						}
						
						if(rowNr != lastRowNr) {
							// Print all content of that line
							if(rowNr == 0) {
								lineText = str.substring(0, lineIndex[0]).trim(); // First line
							}
							else {
								lineText = str.substring(lineIndex[rowNr-1] , lineIndex[rowNr]).trim();
							}
							
							reportFile.insertText( linePad(rowNr+totalRows+1) + lineText );
							reportFile.insertLineBreak();
						}
						
						lastRowNr = rowNr;
						
						matchFound = true;
						
					}
					

					charCounter += str.length;
					
					console.log("Got chunk! str.length=" + str.length + "");

					
				}
			}
			
	
		}
		

		function linePad(nr) {
			// Add spacing and a colon
			var space = 6;
			var str = "" + nr + "";
			var length = str.length;
			
			for(var i=length; i<space; i++) {
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
		
		
	}
	
})();