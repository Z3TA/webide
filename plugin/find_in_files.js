(function() {
	"use strict";
	
	var footer, div, regexOption, subfolderOption, inputInDir;
	
	var inputFindGotFocus = false;
	
	var divVisible = false; 
	
	var searchMaxResults = 10000;
	
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

		buildDiv();
		
		
	});
	
	
	function findInFiles() {
		
	}
	
	function pressEnter() {
		
	}
	
	function pressEscape() {
		
	}
	
	function buildDiv() {
		if(!footer) {
			console.error(new Error("Can not find the footer!"));
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
		inputFind.value = "Connection on websocket from 107.192.233.200";
		
		var inputReplace = document.createElement("input");
		inputReplace.setAttribute("type", "text");
		inputReplace.setAttribute("id", "inputReplace");
		inputReplace.setAttribute("class", "inputtext replace");
		inputReplace.setAttribute("size", size);

		inputInDir = document.createElement("input");
		inputInDir.setAttribute("type", "text");
		inputInDir.setAttribute("id", "inputInDir");
		inputInDir.setAttribute("class", "inputtext indir");
		//inputInDir.value = editor.getDir();
		inputInDir.value = "C:\\Users\\Z\\dev-repositories\\js-editor\\test\\";
		
		inputInDir.setAttribute("size", size);

		var inputFileFilter = document.createElement("input");
		inputFileFilter.setAttribute("type", "text");
		inputFileFilter.setAttribute("id", "inputFileFilter");
		inputFileFilter.setAttribute("class", "inputtext inputFileFilter");
		//inputFileFilter.value = ".js$|.htm$/i"
		inputFileFilter.value = "20k"
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

		var regexOption = document.createElement("input");
		regexOption.setAttribute("type", "checkbox");
		regexOption.setAttribute("id", "regexOption");
		regexOption.setAttribute("class", "option regex");

		var optionCaseSensitive = document.createElement("input");
		optionCaseSensitive.setAttribute("type", "checkbox");
		optionCaseSensitive.setAttribute("id", "optionCaseSensitive");
		optionCaseSensitive.setAttribute("class", "option optionCaseSensitive");
		
		var subfolderOption = document.createElement("input");
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
			searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
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
		});
				
		editor.renderNeeded();
		
		reportFile.insertText("Files in '" + searchPath + "' (" + fileFilter + ") that match '" + searchString + "'");
		reportFile.insertLineBreak();
		
		searchDir(searchPath);
		
		
		function searchDir(currentDirPath) {
			
			console.log("Searching: " + currentDirPath);
			
			foldersToRead++;
			
			fs.readdir(currentDirPath, function dirRead(err, folderItems) {
				if(err) console.error(err);
				
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
						
						if(err) console.error(err);
						
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
			
			// Search all files as streams
			
			
			var lineBreakCharacters = "";
			var totalLineBreaks = 0;
			var lineIndex = []; // Character index: lineIndex[0] = Index of first line break, lineIndex[1] = Index of second line break, etc
			var charCounter = 0; 
			var matchFound = false;
			
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
				console.error(err);
			}
			
			function streamEnded() {
				console.log("Stream ended! filePath=" + filePath);
				fileQueue.shift(); // Remove first element in the array, the file we just searched.
				
				totalFiles++;
				
				if(fileQueue.length > 0 && totalMatches < searchMaxResults) {
					searchFile(fileQueue[0]); // Search next file in queue
				}
				else {
					
					reportFile.insertLineBreak();
					reportFile.insertText("Searched a total of " + totalFiles + " files and found a total of " + totalMatches + " matches.");
					
					// Highlight the matches
					for(var i=0; i<matches.length; i++) {
						reportFile.highlightText(matches[i]);						
					}
					
					//alert("Search complete!");
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
				
				while (null !== (chunk = stream.read()) && !stream.isPaused() ) {

					// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
					str = decoder.write(chunk);
					
					if(!lineBreakCharacters) lineBreakCharacters = determineLineBreakCharacters(str);
					

				
					// Map each line to a character index
					for(var i=0; i<str.length; i++) {
						char = str.charAt(i);
						if(char == lineBreakCharacters[0]) {
							lineIndex.push(charCounter + i);
						}
					}
					console.log("Current total lines=" + lineIndex.length);
					
					// Search the chunk
					myRe = new RegExp(searchString, flags); // Create a new RegExp for each chunk!
					
					while ((result = myRe.exec(str)) !== null) {
						
						console.log("Found " + result[0]);
						
						totalMatches++;
						
						matches.push(result[0]); // Highlight these later
						
						// Figure out what the line number is
						// opt tip: binarysort could be used here
						//console.log("result.index=" + result.index + " charCounter=" + charCounter);
						
						rowNr = -1;

						for(var i=charCounter; i<lineIndex.length; i++) {
							//console.log(i + ": " + lineIndex[i] + " >= " + result.index + " ?")
							if(lineIndex[i] >= result.index) {
								
								rowNr = i;
								break;
							}
						}
						
						if(rowNr == -1) {
							rowNr = lineIndex.length; // Last line
						}
						
						console.log("rowNr=" + rowNr);
						
						if(!matchFound) {
							reportFile.insertLineBreak();
							reportFile.insertLineBreak();
							reportFile.insertText(filePath);
							reportFile.insertLineBreak();
							reportFile.insertText(underline(filePath));
							reportFile.insertLineBreak();
						}
						
						//if(rowNr != lastRowNr) {
							// Print all content of that line
							if(rowNr == 0) {
								lineText = str.substring(0, lineIndex[0-charCounter]).trim(); // First line
							}
							else {
								lineText = str.substring(lineIndex[rowNr-charCounter-1], lineIndex[rowNr-charCounter]).trim();
							}
							
							reportFile.insertText( linePad(rowNr+1) + lineText );
							reportFile.insertLineBreak();
						//}
						
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