(function() {
	
	var footer, div, regexOption, subfolderOption;
	
	var divVisible = false; 
	
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

		inputFileFilter = document.createElement("input");
		inputFileFilter.setAttribute("type", "text");
		inputFileFilter.setAttribute("id", "inputFileFilter");
		inputFileFilter.setAttribute("class", "inputtext inputFileFilter");
		inputFileFilter.value = ".*\\.js|.*\\.htm\\i"
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

		buttonFindInFiles = document.createElement("input");
		buttonFindInFiles.setAttribute("type", "button");
		buttonFindInFiles.setAttribute("class", "button");
		buttonFindInFiles.setAttribute("id", "buttonFindInFiles");
		buttonFindInFiles.setAttribute("value", "Search in files");

		buttonReplaceInFiles = document.createElement("input");
		buttonReplaceInFiles.setAttribute("type", "button");
		buttonReplaceInFiles.setAttribute("class", "button");
		buttonReplaceInFiles.setAttribute("id", "buttonReplaceInFiles");
		buttonReplaceInFiles.setAttribute("value", "Replace in files");

		var labelRegexOption = document.createElement("label");
		labelRegexOption.setAttribute("for", "regexOption");
		labelRegexOption.appendChild(document.createTextNode("Use regex:")); // Language settings!?

		var labelSubFolderOption = document.createElement("label");
		labelSubFolderOption.setAttribute("for", "subfolderOption");
		labelSubFolderOption.appendChild(document.createTextNode("Search subfolders:")); // Language settings!?

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
		
		// ### Find 
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
			
		table.appendChild(tr);
		
		
		// ### Replace
		tr = document.createElement("tr"),
		
		td = document.createElement("td");
		td.appendChild(labelReplace);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputReplace);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(buttonReplaceInFiles);
		tr.appendChild(td);

		td = document.createElement("td");
		td.appendChild(regexOption);
		td.appendChild(labelRegexOption);
		tr.appendChild(td);
		
		table.appendChild(tr);
		
		

		// ### In dir
		tr = document.createElement("tr"),
		
		td = document.createElement("td");
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
			searchFiles();
		}, false);		
		buttonReplaceInFiles.addEventListener("click", function() {
			alert("Not yet implemented!");
		}, false);
		
		
		divVisible = true;
		
		
		
		
	}
	
	function searchFiles() {
		
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
	
})();