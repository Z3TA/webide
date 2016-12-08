/*
	
	Expose some handy constants and functions to global scope.
	These are the only global variables except editor and File.
	
	Hide File from global scope!? Then it would have to be merged with editor.js
	
	All file paths should handle URL's ex: ftp://hostname:21/folder1/folder2
	Always add a trailing slash after folder paths
*/

"use strict";

var runtime = (function is_nwjs() {
	try{
		return (typeof require('nw.gui') !== "undefined");
	} catch (e){
		return false;
	}
})() ? "nw.js" : "browser";



if(runtime == "browser") {
	//alert("runtime=" + runtime);
	var process = {
		platform: (function findPlatForm() {
			var platform = "win32";
			if(navigator.platform == "Win32") platform = "win32";
			if(navigator.platform.indexOf("Linux") != -1) platform = "linux";
			return platform;
		})(),
		cwd: function getWorkingDirectory() {
			return getDirectoryFromPath(document.location.href);
		},
		nextTick: function(cb) {
			setTimout(cb, 0);
		},
		argv: (function getArguments() {
			var query = window.location.search.substring(1);
			var arr = query.split('&');
			
			arr.unshift(document.location.href);
			
			return arr;
			
		})()
		
	};
}



Error.stackTraceLimit = Infinity;


// Global constants, note that const is block scoped!! (can't if(foo) const bar =1)
const SHIFT = 1;
const CTRL = 2;
const ALT = 4;



// Global functions ...


function wordWrapHtml(html) {
	// Inserts line breaks so that the text is readable in raw source code
	
	
	
	function wordWrapText(text, width) {
		/*
			This function can be polished a lot!
			
			example:
			- Use code language context: Break after + or _
			- When in English/latin context: More likely to break after a punctuation
			- Avoid having lonely words
			
		*/
		
		if(text.match(/<br>/i) != null) {
			// Always break after <br>
			var arr = text.split(/<br>/i);
			text = "";
			if(arr.length > 1) {
				for(var i=0; i<arr.length-1; i++) {
					text += wordWrapText(arr[i], width) + "<br>" + file.lineBreak;
				}
			}
			text += wordWrapText(arr[arr.length-1], width);
			return text;
		}
		
		text = text.replace(new RegExp(file.lineBreak, 'g'), " "); // Replace all line breaks with spaces
		text = text.replace(/\s{2,}/g, ' '); // Remove multiple spaces
		text = text.trim(); // Remove white space at the edges
		
		if(text.length <= width) {
			console.log("text.length=" + text.length + " <= width=" + width);
			return text;
		}
		
		var words = text.split(space);
		var rows = []; // Array of strings
		var rowNr = 0;
		var lineLength = words[0].length + 1;
		var lc = ""; // Last character of last word
		var breakAnyway = false;
		rows.push([]); // First row, each row is a array of strings (the words)
		rows[rowNr].push(words[0]); // Add the first word to the first row
		for(var i=1; i<words.length; i++) { // Start with the second word (so we can check the word before)
			
			if(lineLength > (width*.8)) {
				lc = words[i-1].charAt(words[i-1].length-1);
				if(lc == "." || lc == ":" || lc == "," || lc == ";" || lc == "!" || lc == "?") {
					breakAnyway = true;
				}
				else {
					breakAnyway = false;
				}
			}
			else {
				breakAnyway = false;
			}
			
			lineLength += words[i].length;
			
			if((lineLength > width || breakAnyway) && rows[rowNr].length != 0) {
				
				//if(breakAnyway) rows[rowNr].push("YAYA!");
				
				rowNr = rows.push([]) - 1;
				lineLength = words[i].length;
				breakAnyway = false;
				
			}
			rows[rowNr].push(words[i]);
			lineLength++; // Account for the space
		}
		
		// Join the words with a space between
		for(var i=0; i<rows.length; i++) {
			rows[i] = rows[i].join(space);
		}
		
		// Join the rows with line breaks in between
		text = rows.join(file.lineBreak);
		
		
		
		return text;
	}
	
}



function indexToRowCol(index, file) {
	// Returns the row and col on the grid from index
	
	if(index > file.text.length) return null;
	
	var grid = file.grid;
	var row = 0;
	var col = 0;
	
	for (var i=0; i<grid.length; i++) {
		if(grid[i].startIndex > index) {
			
			row = i-1;
			col = Math.abs(index -= grid[i].startIndex);
			
			return {row: row, col: col};
			
		}
	}
	
	return null;
	
}


function insideParsedObject(index, parsedObj) {
	
	if(!parsedObj) throw new Error("Can not determine if we are inside parsedObj=" + parsedObj + "!");
	
	if(parsedObj.length == 0) return false;
	
	if(index < parsedObj[0].start) return false;
	if(index > parsedObj[parsedObj.length-1].end) return false;
	
	for(var i=0; i<parsedObj.length; i++) {
		if(parsedObj[i].start <=index && parsedObj[i].end >= index) return true;
	}
	
	return false;
}

function matchingAngelBracket(index, file, toMatch) {
	// test: matchingAngelBracket(67, editor.currentFile)
	
	var bracket = toMatch || file.text.charAt(index);
	
	if(bracket != "{" && bracket != "}") throw new Error("Character=" + lbChars(bracket) + " on index=" + index + " is not an angel bracket!");
	
	var char = "";
	var leftCount = 0;
	var rightCount = 0;
	if(bracket == "{") {
		// Go to the right, look for }
		console.log("Looking for } ...");
		leftCount = 1;
		for (var i=index+1; i<file.text.length; i++) {
			char = file.text.charAt(i);
			if(char == "}") {
				if(!insideQuoteOrComment(i)) rightCount++;
				
				if(rightCount == leftCount) return i;
			}
			else if(char == "{") {
				if(!insideQuoteOrComment(i)) leftCount++;
			}
		}
	}
	else {
		// Go to the left, look for {
		console.log("Looking for { ...");
		rightCount= 1;
		for (var i=index-1; i>-1; i--) {
			char = file.text.charAt(i);
			if(char == "{") {
				if(!insideQuoteOrComment(i)) leftCount++;
				
				if(rightCount == leftCount) return i;
			}
			else if(char == "}") {
				if(!insideQuoteOrComment(i)) rightCount++;
			}
		}
	}
	
	return null; // No matching angel bracket found
	
	function insideQuoteOrComment(i) {
		if(insideParsedObject(i, file.parsed.quotes)) return true;
		else if(insideParsedObject(i, file.parsed.comments)) return true;
		else return false;
	}
	
}

function trailingSlash(folderPath) {
	// Makes sure the folder has a trailing slash
	console.log("Get training slash for folderPath=" + folderPath);
	var delimiter = getPathDelimiter(folderPath);
	var lastCharacter = folderPath.substr(folderPath.length-1, 1);
	if(lastCharacter != delimiter) {
		folderPath += delimiter;
		console.log("Added trailing slash to path=" + folderPath);
	}
	return folderPath;
}

function getDirectoryFromPath(path) {
	/*
		Returns the directory of a file path
		If no path is specified it uses current file or working directory
		
		todo: replace editor.getDir
	*/
	
	console.log("getDir path=" + path);
	
	if(path == undefined) {
		if(editor.currentFile) path = editor.currentFile.path;
		else return trailingSlash(editor.workingDirectory); // (editor) working dir
	}
	
	if(!path) throw new Error("Unable to get directory from path=" + path);
	
	var lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	
	if(lastSlash == -1) {
		console.warn("Unable to get directory of path=" + path + ". Using editor.workingDirectory=" + editor.workingDirectory);
		return trailingSlash(editor.workingDirectory);
	}
	
	return trailingSlash(path.substring(0, lastSlash));
}

function getFolders(fullPath, includeHostInfo) {
	/* 
		Returns each folder in the path. Can take an url or a local filesystem path
		
		Examples:
		ftp://hostname/folder1/folder2 => ["ftp://hostname/", "ftp://hostname/folder1/", "ftp://hostname/folder1/folder2/"]
		C:\\\\Windows\\system32        => ["C:\\", "C:\\Windows\", "C:\\Windows\system32\"]
		C://Windows/system32           => (throws an error; use C:\ instead)
		/tank/foo/bar                  => ["/", "/tank/", "/tank/foo/", "/tank/foo/bar/"]
		
	*/
	
	fullPath = fullPath.trim(); // Remove white space before and after
	
	var lastChar = fullPath.substr(fullPath.length-1);
	
	if(lastChar != "/" && lastChar != "\\") {
		// Check if the path contains a file, and remove it
		console.log("lastChar=" + lastChar + " fullPath=" + fullPath);
		var delimiter = getPathDelimiter(fullPath);
		var filePart = fullPath.substr(fullPath.lastIndexOf(delimiter));
		
		console.log("filePart=" + filePart);
		
		if(filePart.indexOf(".") != -1) {
			fullPath = fullPath.substr(0, fullPath.lastIndexOf(delimiter)+1); // Remove the file part
		}
		// else: asume the last part is a folder

	}
	
	var protocolIndex = fullPath.indexOf("://");
	
	if(protocolIndex != -1) {
		// It's probably an URL ...
		
		var protocol = fullPath.substr(0, protocolIndex);
		
		console.log("protocol=" + protocol);
		
		if(editor.remoteProtocols.indexOf(protocol) == -1) {
			throw new Error("protocol=" + protocol + " is not a supported protocol! If it's a Windows path, use " + protocol + ":\\ instead!");
		}
		
		// Now it's definitely a URL!
		
		var path = fullPath.substr(protocol.length + 3); // Remote protocol part and the ://
		var hostname = path.substr(0, path.indexOf("/")); // Also include port nr if specified (hostname:port)
		
		if(hostname.length == 0) throw new Error("URL has no hostname! fullPath=" + fullPath);
		
		path = path.substr(hostname.length); // Remove hostname part
		
		if(path.substr(0,1) != "/") throw new Error("Expected a slash after hostname=" + hostname + " fullPath=" + fullPath);
	
		path = path.substr(1); // Remove first slash
		
		if(path.substr(path.length-1) == "/") path = path.substr(0, path.length-1); // Remove ending slash if one exist
	
		var folders = path.split("/");
		
		var urls = [];
		var fullFolder = includeHostInfo ? protocol + "://" + hostname + "/" : "/";
		
		urls.push(fullFolder); // Add root
		
		//console.log("foldersAA=" + JSON.stringify(folders));
			for(var i=0; i<folders.length; i++) {
			if( folders[i] !== "") {
				fullFolder += folders[i] + "/";
				urls.push(fullFolder);
			}
		}
		
		return urls;
		
	}
	else {
		// It's a file-system path
		
		// Windows driveIndex can be both C:\ and C:\\
		var driveIndex = fullPath.indexOf(":\\");
		
		console.log("driveIndex=" + driveIndex);
		
		if(driveIndex != -1) {
			// It's a Windows file-system path
			
			var driveLetter = fullPath.substr(0, driveIndex);
			
			console.log("driveLetter=" + driveLetter);
			
			if(driveLetter.length == 0) throw new Error("Asuming Windows path, missing driveLetter! fullPath=" + fullPath);
			
			var path = fullPath.substr(driveLetter.length + 2); // Remove driveLetter and :\
			
			if(path.substr(0,1) == "\\") {
				var startingBackslash = true;
				path = path.substr(1); // Remove starting backslash if one exist
			}
			
			if(path.substr(path.length-1) == "\\") path = path.substr(0, path.length-1); // Remove ending backslash if one exist
			
			console.log("windows path=" + path);
			
			var folders = path.split("\\");
			
			var paths = [];
			var slashes = startingBackslash ? "\\\\" : "\\";
			var fullFolder = driveLetter + ":" + slashes;
			
			paths.push(fullFolder); // Add root (drive letter)
			
			for(var i=0; i<folders.length; i++) {
				fullFolder += folders[i] + "\\";
				paths.push( fullFolder );
				//(i<folders.length) fullFolder += ;
			}
			
			return paths;
			
		}
		else {
			// Asume unix-like path
			
			var path = fullPath;
			
			if(path.substr(0, 1) == "/") path = path.substr(1); // Remove starting backslash if one exist
			if(path.substr(path.length-1) == "/") path = path.substr(0, path.length-1); // Remove ending backslash if one exist
			
			var folders = path.split("/");
			
			var paths = [];
			var fullFolder = "/";
			
			paths.push("/"); // Add root folder
			
			for(var i=0; i<folders.length; i++) {
				fullFolder += folders[i] + "/";
				paths.push(fullFolder);
			}
			
			return paths;
			
		}
	
	}
	
}


function getPathDelimiter(path) {
	// Returns the delimiter character used for separating directories in a file-path or url
	
	if(!path) throw new Error("Not a valid path=" + path);
	
	var lastChar = path.substring(path.length-1);
	
	if(lastChar == "/" || lastChar == "\\") return lastChar;
	else {
		if(path.indexOf("/") != -1) return "/";
		else if(path.indexOf("\\") != -1) return "\\";
		else throw new Error("Unable to determine file path folder separator/delimiter of path=" + path);
	}
}


function textDiff(originalText, editedText, ignoreTransform) {
	/*
		return {inserted: inserted, removed: removed};
		
		{text: text, row: row}
		
		Problems: 
		* Text might have been both deleted and inserted
		
		Strategy: Find the inserts and removals needed to turn originalText into editedText
		
		Solution: Use a node module :P
	*/
	
	var lb = /\r\n|\n/;
	var lbOriginalText = originalText.indexOf("\r\n") != -1 ? "\r\n" : "\n";
	var lbEditedText = editedText.indexOf("\r\n") != -1 ? "\r\n" : "\n";
	
	var editedRow = editedText.split(lbEditedText);
	var originalRow = originalText.split(lbOriginalText);
	
	/*
	if(ignoreTransform) {
		for(var i=ignoreTransform.inserted.length-1; i>=0; i--) { // Reverse for loop to not mess up array indexes
			editedRow.splice(ignoreTransform.inserted[i].row, 1);
			console.log("Ignoring edited text: row=" + ignoreTransform.inserted[i].row + " text=" + ignoreTransform.inserted[i].text + "");
		}
		for(var i=ignoreTransform.removed.length-1; i>=0; i--) { // Reverse for loop to not mess up array indexes
			originalRow.splice(ignoreTransform.removed[i].row, 1);
			console.log("Ignoring original text: row=" + ignoreTransform.removed[i].row + " text=" + ignoreTransform.removed[i].text + "");
		}
		}
		*/
	
	// Trim white space from all lines
	for (var i=0; i<editedRow.length; i++) {
		editedRow[i] = editedRow[i].trim();
	}
	for (var i=0; i<originalRow.length; i++) {
		originalRow[i] = originalRow[i].trim();
	}
	
	//if(editedRow[editedRow.length-1] != "") throw new Error("Edited text must end with a line break to make it easier to diff! editedText=" + lbChars(editedText));
	//if(originalRow[originalRow.length-1] != "") throw new Error("Original text must end with a line break to make it easier to diff! originalText=" + lbChars(originalText));
	
	// Add an ending line-break if one doesn't exist
	if(editedRow[editedRow.length-1] != "") editedRow.push("");
	if(originalRow[originalRow.length-1] != "") originalRow.push(""); 
	
	editedText = editedRow.join(lbEditedText);
		originalText = originalRow.join(lbOriginalText);
		
		var extraLbAdded = false;
		var lastCharactersOriginalText = originalText.substr(originalText.length - lbOriginalText.length);
		if(lastCharactersOriginalText != lbOriginalText) { 
			// original text doesn't end with a line break!
			// Each line must end with a line break, even the last line.
			console.log("Original text last " + lbOriginalText.length + " chars are not a line break: " + lbChars(lastCharactersOriginalText));
			//originalText += lbOriginalText;
			//extraLbAdded = true;
			
		// Because an extra linebreak was added to the original text, we also need to add one (or two) to the edited text to not mess up the diff
			//if(editedText.substr(editedText.length - lbEditedText.length) != lbEditedText) editedText += lbEditedText + lbEditedText; // Add two line-breaks
			//else editedText += lbEditedText; // or add only one if it already had one
		}
		
		var jsdiff = require('diff');
		var diff = jsdiff.diffTrimmedLines(originalText, editedText); // diffLines or diffChars
		var totalLineBreaks = 0;
		var removed = [];
		var inserted = [];
		var line;
		var lineBreakCount = 0;
		var removedLines = 0; // Removed lines can be replaced with inserts
		var row = 0;
	
		console.log("diff=" + JSON.stringify(diff, null, 2));
		
		for (var i=0; i<diff.length; i++) {
			line = diff[i].value.split(lb);
			
		if(line.length < 2 || line[line.length-1] != "") throw new Error("Line does not end with a new-line character! diff[" + i + "]=" + JSON.stringify(diff[i]) + " line=" + JSON.stringify(line));
			
			lineBreakCount = 0;
		
		for (var j=0; j<line.length-1; j++) { // line always end with a line break
			// removed always comes before added
				if(diff[i].added) {
					// if(line[j].length > 0) 
					console.log("j=" + j + " line.length-1=" + (line.length-1) + " text=" + line[j]);
					
						if(removedLines > 0) {
					// If lines where removed, added lines will replace them
					lineBreakCount -= removedLines;
					removedLines = 0;
					}
				
				row = totalLineBreaks + lineBreakCount;
				
				inserted.push({text: line[j], row: row});
				
				console.log("++++ " + line[j] + " (row=" + row + ")");
				
				if(lineBreakCount < 0) lineBreakCount++; // Keep replacing lines that have been removed
				
			}
			else if(diff[i].removed) {
				
				row = totalLineBreaks + lineBreakCount;
				
				removed.push({text: line[j], row: row});
				
				console.log("---- " + line[j] + "(row=" + row + ")");
				
				removedLines++;
				lineBreakCount++;
				
			}
			else {
				
				row = totalLineBreaks + lineBreakCount;
				
				console.log("" + line[j] + "(row=" + row + ")");
				
				lineBreakCount++;
				removedLines = 0;
				
			}
			console.log("lineBreakCount=" + lineBreakCount);
		}
		
		totalLineBreaks = totalLineBreaks + lineBreakCount;
		console.log("totalLineBreaks=" + totalLineBreaks);
	}
	
	console.log("extraLbAdded=" + extraLbAdded);
	if(extraLbAdded) inserted.pop();
	
	console.log("inserted=" + JSON.stringify(inserted, null, 2));
	console.log("removed=" + JSON.stringify(removed, null, 2));
	
	console.log("originalText=" + debugWhiteSpace(originalText));
	console.log("editedText=" + debugWhiteSpace(editedText));
	
	return {inserted: inserted, removed: removed};
	
}


function textDiff2(originalText, editedText, ignoreRows) {
	/*
		Asumes only *one change* has been made
		
		
	*/
	
	console.log("running textDiff");
	
	var lbOriginalText = determineLineBreakCharacters(originalText);
	var lbEditedText = determineLineBreakCharacters(editedText);
	
	if(lbOriginalText != lbEditedText) console.warn("textDiff: Different line-break conventions!");
	
	var originalRow = originalText.split(lbOriginalText);
	var editedRow = editedText.split(lbEditedText);
	
	if(ignoreRows) {
		// Remove the ignoreRows from editedRows
		ignoreRows.sort(function(a, b) {return a - b;}); // Make sure ignoreRows is ordered to prevent bugs with splice
		
		for(var i=ignoreRows.length-1; i>-1; i--) {
			console.log("ignore row=" + ignoreRows[i] + " : " + editedRow[ignoreRows[i]]);
			editedRow.splice(ignoreRows[i], 1);
		}
	}
	
	var removed = [];
	var inserted = [];
	
	var index = editedText.indexOf(originalText);
	
	console.log("index=" + index);
	
	if(editedRow.length > originalRow.length && index != -1) {
		// The edited text contains the original text
		
		// Lines have been added above and/or under the original text
		
		// At what line do it match?
		var startMatchRow = occurrences(editedText.substr(0, index), lbEditedText);
		
		console.log("startMatchRow=" + startMatchRow);
		
		for (var i=0; i<startMatchRow; i++) {
			inserted.push({text: editedRow[i].trim(), row: i});
			console.log("++++ " + editedRow[i]);
		}
		
		// At what line does the match end?
		var endMatchRow = editedRow.length - occurrences(editedText.substr(index + originalText.length), lbEditedText);
		
		console.log("endMatchRow=" + endMatchRow);
		
		if(editor.settings.devMode) {
			// console print the lines between for debug
			for (var i=startMatchRow; i<endMatchRow; i++) {
				console.log(editedRow[i]);
			}
		}
		
		for (var i=endMatchRow; i<editedRow.length; i++) {
			inserted.push({text: editedRow[i].trim(), row: i});
			console.log("++++ " + editedRow[i]);
		}
		
	}
	
	else if(originalRow.length > editedRow.length) {
		// Lines have been removed. Find the removed lines ...
		// Asume the removed lines are after each other (not at random)
		
		
		
		var removedLinesToFind = originalRow.length - editedRow.length;
		var nextStepEdited = editedRow.slice(0); // Copy the edited text for next iteration
		var foundRemovedLines = false;
		
		for (var i=0; i < (originalRow.length - removedLinesToFind + 2); i++) {
			if(originalRow[i] != editedRow[i]) {
				// We have found an edited line or removed line
				// Asume text have only been deleted, not edited
				if(originalRow[i].indexOf(editedRow[i]) <= 0) { // "foobar".indexOf("") == 0
					// Part of the row has been deleted
					removed.push({text: originalRow[i].trim(), row: j});
					inserted.push({text: editedRow[i].trim(), row: j});
					console.log("---- " + originalRow[i]);
					console.log("++++ " + editedRow[i]);
				}
				else if(!foundRemovedLines) {
					// Deleted rows has been found
					for (var j=i; j< (i+removedLinesToFind); j++) {
						removed.push({text: originalRow[j].trim(), row: j});
						console.log("---- " + originalRow[j]);
						nextStepEdited.splice(j, 0, originalRow[j]); // Add original text to next step
					}
					foundRemovedLines = true;
					break;
				}
				else throw new Error("Unexpected row=" + i + " original=" + originalRow[i] + " edited=" + editedRow[i]);
			}
		}
		if(!foundRemovedLines) throw new Error("Did not find the removed lines!");
		
		// Run again to see if there are more diff ?
		
		var diff = textDiff(originalRow.join(lbOriginalText), nextStepEdited.join(lbEditedText));
		
		removed.concat(diff.removed);
		
		removed.sort(function (a, b) {
			return a.row - b.row;
		});
		
	}
	
	else {
		// Find lines that diff.
		
		for(var i=0, j=0; i<originalRow.length && j<editedRow.length; i++) {
			j++;
			// We don't care about white space
			originalRow[i] = originalRow[i].trim();
			editedRow[i] = editedRow[i].trim();
			
			if(originalRow[i] != editedRow[i]) {
				// The edited row doesn't match the original row
				
				if(editedRow.indexOf(originalRow[i]) == -1) { 
					// The original row doesn't exist in the edited text, so it has been removed
					removed.push({text: originalRow[i], row: i});
					console.log("---- " + originalRow[i]);
					
					// Check if the original text contains the edited row
					index = originalRow.indexOf(editedRow[i]);
					if(index == -1) {
						// The edited row doesn't exit in original, so it was inserted
						inserted.push({text: editedRow[i], row: i});
						console.log("++++ " + editedRow[i]);
					}
					else {
						// The edited row exist in the original, so it must have been moved there
						
					}
					
				}
				else {
					// The original row was either moved there or text where added above
					index = originalRow.indexOf(editedRow[i]);
					if(index == -1) {
						// The edited row doesn't exit in original, so it was inserted
						inserted.push({text: editedRow[i], row: i});
						console.log("++++ " + editedRow[i]);
					}
					else {
						// The edited row exist in the original, so it must have been moved there
						
					}
				}
				
			}
			else {
				console.log(originalRow[i]);
			}
			
		}
	}
	
	return {inserted: inserted, removed: removed};
	
}

function textDiffCol(originalText, editedText) {
	// Returns the column for when original and edited texts depart
	
	originalText = originalText.trim();
	editedText = editedText.trim();
	
	for (var i=0; i<originalText.length; i++) {
		if(originalText[i] != editedText[i]) {
			return i;
		}
	}
	
	return -1;
}

function Dialog(msg, icon) {
	
	if(msg == undefined) throw new Error("Dialog without a message!");
	
	msg = msg.toString(); // Convert numbers etc to string so we can use the replace method
	
	//console.log("Dialog msg=" + msg);
	
	msg = msg.replace(/\n/g, "<br>");
	
	var body = document.getElementById("body");
	
	if(!body) {
		console.warn("Dialog created before html body is available");
		return;
		}
	
	var message = document.createElement("div");
	message.setAttribute("class", "message");
	message.innerHTML = msg; // Support HTML
	
	var img;
	
	if(icon == "warning" ) {
		img = document.createElement("img");
		img.setAttribute("src", "gfx/warning.svg");
	}
	else if(icon == "error") {
		img = document.createElement("img");
		img.setAttribute("src", "gfx/error.svg");
	}
	else if(icon) {
		throw new Error("Dialog icon not supported: " + icon);
	}
	
	
	this.div = document.createElement("div");
	
	var div = this.div;
	
	div.setAttribute("class", "dialog");
	div.setAttribute("style", "position: absolute; top: 50px; left: 50px");
	
	div.addEventListener("click", focusDefault, false);
	
	div.appendChild(message);
	
	body.appendChild(div);
	
	if(img) {
		//alert(icon);
		// If an icon is used adjust it's size
		var messageHeight = parseInt(message.offsetHeight);
		console.log("messageHeight=" + messageHeight);
		img.setAttribute("height", Math.round(messageHeight / 2));
		
		if(message.childNodes.length == 1) {
			img.style.verticalAlign = "middle";
			img.style.float = "none";
			img.style.display = "inline-block";
		}
		else {
			img.style.float = "left";
		}
		
		message.insertBefore(img, message.firstChild);
	}
	
	
	
	
	
	// Get the computed size of the box
	var divHeight = parseInt(div.offsetHeight);
	var divWidth = parseInt(div.offsetWidth);
	
	// Place it in the middle of the screen
	var windowHeight = parseInt(window.innerHeight);
	var windowWidth = parseInt(window.innerWidth);
	
	var sligtlyUp = 32; // Space for buttons and stuff
	
	div.style.top = Math.round(windowHeight / 2 - divHeight/2 - sligtlyUp) + "px";
	div.style.left = Math.round(windowWidth / 2 - divWidth/2) + "px";
	
	
	
	
	// Give the focus to the box
	editor.input = false;
	
	setTimeout(focusDefault, 100); // Give the program time to add buttons etc to the dialog
	
	function focusDefault() {
		// Give focus to the element with attribute focus:true
		
		var childElement = div.childNodes;
		for (var i=0; i<childElement.length; i++) {
			if(childElement[i].getAttribute("focus") == "true") {
				childElement[i].focus();
				break;
			}
		}
		
		editor.input = false;
	}
}
Dialog.prototype.close = function() {
	this.div.parentElement.removeChild(this.div);
	
	// The editor watches for clicks outside the "editor" area (canvas), so wait until that is done before giving back input
	setTimeout(function() {
		editor.input = true;
	}, 500); // Not too fast, make sure the user has released the space bar
}

function alertBox(msg, icon) {
	var dialog = new Dialog(msg, icon);
	
	var button = document.createElement("button");
	button.setAttribute("class", "alert");
	button.setAttribute("focus", "true");
	button.appendChild(document.createTextNode("OK"));
	
	button.addEventListener("click", function() {dialog.close()}, false);
	
	dialog.div.appendChild(button);
	
	return dialog;
}


//window.alert = alertBox; // Override the native alert box

/*
	Example reason why you want to use custom confirm box:
	* Native confirm box registers a keyPress if it was called on a keydown event
*/
function confirmBox(msg, options, callback) {
	
	var dialog = new Dialog(msg);
	
	for (var i=0; i<options.length; i++) {
		makeButton(i);
	}
	
	return dialog;
	
	function makeButton(i) {
		var txt = options[i];
		var button = document.createElement("button");
		button.setAttribute("class", "confirm");
		
		// The last button will be the default (get focus)
		if(i == (options.length -1)) button.setAttribute("focus", "true");
		
		button.appendChild(document.createTextNode(txt));
		
		button.addEventListener("click", function() {callback(txt); dialog.close();}, false);
		
		dialog.div.appendChild(button); 
	}
	
}

function promptBox(msg, isPassword, callback) {
	var dialog = new Dialog(msg);
	
	var input = document.createElement("input");
	
	if(isPassword) input.setAttribute("type", "password")
	else input.setAttribute("type", "text");
	
	input.setAttribute("class", "input prompt");
	input.setAttribute("focus", "true");
	
	var ok = document.createElement("button");
	ok.setAttribute("class", "prompt");
	ok.setAttribute("type", "submit");
	ok.appendChild(document.createTextNode("OK"));
	
	ok.addEventListener("click", function() {callback(input.value); dialog.close()}, false);
	
	
	var cancel = document.createElement("button");
	cancel.setAttribute("class", "prompt");
	cancel.appendChild(document.createTextNode("Cancel")); // Language?
	
	cancel.addEventListener("click", function() {callback(null); dialog.close()}, false);
	
	
	input.addEventListener("keyup", function(event) {
		event.preventDefault();
		var enterKey = 13;
		var escapeKey = 27;
		// Clicking enter in the input area should "submit"
		if (event.keyCode == enterKey) ok.click()
		// Clicking escape should be same as cancel
		else if(event.keyCode == escapeKey) cancel.click();
	});
	
	
	dialog.div.appendChild(input);
	dialog.div.appendChild(cancel);
	dialog.div.appendChild(ok);
	
	return dialog;
}



function lbChars(txt) {
	// Shows white space. Useful for debugging
	txt = txt.replace(/\r/g, "CR");
	txt = txt.replace(/\n/g, "LF");
	txt = txt.replace(/\t/g, "TAB");
	txt = txt.replace(/ /g, "SPACE");
	txt = txt.replace(/\f/g, "FORMFEED");
	txt = txt.replace(/\v/g, "VTAB");
	txt = txt.replace(/\s/g, "OTHERWHITESPACE");
	return txt;
}

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function getFile(url, callback) {
	
	console.log("Opening url:" + url);
	
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = processRequest;
	xmlHttp.open( "GET", url, true );
	xmlHttp.send( null );
	
	function processRequest() {
		if (xmlHttp.readyState == 4) {
			
			console.log("xmlHttp.status=" + xmlHttp.status);
			
			if(xmlHttp.status == 200) {
				
				console.log("File loaded.");
				
				callback(xmlHttp.responseText, url);
				
			}
			else {
				console.err("Error when opening" + url + "\n" + xmlHttp.responseText);
			}
			
		}
	}
}


function debugWhiteSpace(str) {
	return str.replace(/\r/g, "R").replace(/\n/g, "N\n").replace(/ /g, "S").replace(/\t/g, "T");
}


function getFunctionName(fun) {
	var ret = fun.toString();
	ret = ret.substr('function '.length);
	ret = ret.substr(0, ret.indexOf('('));
	return ret;
}

function determineLineBreakCharacters(text) {
	/*
		What line break character is used !??
		
		Line Feed & New Line (10) = \n
		Carriage Return (13) = \r
		
		Default in windows: cr lf = \r\n
		
		Example:
		rnrnrn
		
		rn = 3 (wins)
		nr = 2
		
	*/
	
	console.log("Determining what line break characters to use ...");
	
	if(text.length == 0) {
		console.warn("Can't determine line breaks without any text!");
		return editor.settings.defaultLineBreakCharacter;
	}
	
	var nr = occurrences(text, "\n\r", true),
	rn = occurrences(text, "\r\n", true)
	
	console.log("Line break? nr=" + nr + " rn=" + rn + "");
	
	if(rn > nr) {
		return "\r\n";
	}
	else if(nr > rn) {
		return "\n\r";
	}
	else if(text.indexOf("\n") > -1) {
		return "\n";
	}
	else {
		// Text has no line breaks. Use the default: (cr lf in windows)
		if(navigator.platform.indexOf("Win") > -1) {
			return "\r\n";
		}
		else {
			return "\n";
		}
	}
}

function occurrences(string, subString, allowOverlapping) {
	/** Function count the occurrences of substring in a string;
	 * @param {String} string   Required. The string;
	 * @param {String} subString    Required. The string to search for;
	 * @param {Boolean} allowOverlapping    Optional. Default: false;
	*/
	string+=""; subString+="";
	if(subString.length<=0) return string.length+1;
	
	var n=0, pos=0;
	var step=(allowOverlapping)?(1):(subString.length);
	
	while(true){
		pos=string.indexOf(subString,pos);
		if(pos>=0){
			//console.log(n + " " + pos + " " + subString);
			n++; 
			pos+=step; 
		} 
		else break;
	}
	return(n);
}

function objInfo(o) {
	/*
		Use for debug, to see properties in an object. 
		Useful for events like click etc.
	*/
	console.log("######################## OBJ INFO #########################");
	for(var p in o) {
		console.log(p + "=" + o[p]);
	}
}

function isString(text) {
	// When a string is created with new String, it will be typeof object!
	
	var objectString = "[object String]";
	var string = "string";
	var typeOf = typeof text;
	var instanceofString = (text instanceof String);
	var objectToString = Object.prototype.toString.call(text);
	
	
	if(typeOf != string && !instanceofString && objectToString != objectString) {
		console.log("typeOf=" + typeOf);
		console.log("objectToString=" + objectToString);
	}
	return typeOf == string || instanceofString || objectToString == objectString;
	
}


function escapeRegExp(str) {
	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function getFilenameFromPath(path) {
	if(path.indexOf("/") > -1) {
		return path.substr(path.lastIndexOf('/')+1);
	}
	else {
		// Assume \ is the folder separator
		return path.substr(path.lastIndexOf('\\')+1);
	}
}

/*
	function getDirectoryFromPath(path) {
	var backSlashIndex = path.lastIndexOf("\\");
	var slashIndex = path.lastIndexOf("/")
	
	if(backSlashIndex > slashIndex) {
	path = path.substring(0,backSlashIndex+1);
	}
	else {
	path = path.substring(0,slashIndex+1);
	}
	return path;
	}
*/

function isFilePath(filePath) {
	if(runtime == "browser") {
	if(linuxPathValidation(filePath) || linuxPathValidation(filePath)) return true
	else return false;
	}
	else {
	var fs = require("fs");
	try {
	var stat = fs.lstatSync(filePath);
	return stat.isFile();
	}
	catch(e) {
	return false;
	}
	}
	
	function linuxPathValidation(contPathLinux) {
	for(var k=0;k<contPathLinux.length;k++){
	if(contPathLinux.charAt(k).match(/^[\\]$/) ){
	return false;
	}
	}
	if(contPathLinux.charAt(0) != "/")
	{
	return false;
	}
	if(contPathLinux.charAt(0) == "/" && contPathLinux.charAt(1) == "/")
	{
	return false;
	}
	return true;
	}
	
	function windowsPathValidation(contwinpath)
	{
	if((contwinpath.charAt(0) != "\\" || contwinpath.charAt(1) != "\\") || (contwinpath.charAt(0) != "/" || contwinpath.charAt(1) != "/"))
	{
	if(!contwinpath.charAt(0).match(/^[a-zA-Z]/))
	{
	return false;
	}
	if(!contwinpath.charAt(1).match(/^[:]/) || !contwinpath.charAt(2).match(/^[\/\\]/))
	{
	return false;
	}
	
	}
	}
	
	function UrlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status!=404;
	}
	}
	
	function getFileExtension(filePath) {
	return filePath.substr((~-filePath.lastIndexOf(".") >>> 0) + 2);
	}
	
	function isFolderPath(path) {
	var fs = require("fs");
	try {
	var stat = fs.lstatSync(path);
	return stat.isDirectory();
	}
	catch(e) {
	return false;
	}
	}
	
	function getStack(msg) {
	// Used in debugging, to get a stack trace of function being called
	// ex: console.log(getStack("foo"));
	
	if(msg == undefined) msg = "";
	
	var str = new Error(msg).stack;
	
	// Remove first at (this function)
	str = str.substr(str.indexOf("\n")+5, str.length);
	str = str.substr(str.indexOf("\n")+5, str.length);
	
	return msg + ": " + str;
	}
	
	
	function httpPost(urlStr, form, callback) {
	var querystring = require('querystring');
	var http = require('http');
	var url = require("url");
	
	var urlObj = url.parse(urlStr);
	
	// Build the post string from an object
	var post_data = querystring.stringify(form);
	
	// An object of options to indicate where to post to
	var post_options = {
	host: urlObj.hostname,
	port: urlObj.port ? urlObj.port : '80',
	path: urlObj.path, // path comtains querystring (search)
	method: 'POST',
	headers: {
	'Content-Type': 'application/x-www-form-urlencoded',
	'Content-Length': Buffer.byteLength(post_data)
	}
	};
	
	// Set up the request
	var dataStr = "";
	var post_req = http.request(post_options, function(res) {
	res.setEncoding('utf8');
	res.on('data', function (chunk) {
	dataStr += chunk;
	console.log('Response: ' + chunk);
	});
	res.on('end', function () {
	callback(dataStr, null);
	});
	});
	post_req.on('error', function(e) {
	console.log(`problem with request: ${e.message}`);
	callback(null, e);
	});
	// post the data
	post_req.write(post_data);
	post_req.end();
	
	
	}
	
	
	function spacePad(str, padLength) {
	
	if(padLength == undefined) padLength = 42;
	
	var left = padLength - str.length;
	if (left < 0) return str; // Return early if no padding is needed
	
	var padding = "";
	for(var i=0; i<left; i++) padding += " ";
	return str + padding;
	}
	
	function makePathAbsolute(path) {
	if(path.match(/^.*:\/\//) == null) { // It's already absolute if it starts with a protocol, like ftp://
	var fspath = require("path");
	if(!fspath.isAbsolute(path)) {
	let absolutePath = fspath.resolve(path);
	console.warn("Making path absolute: " + path + " ==> " + absolutePath);
	path = absolutePath; // Make the path absolute
	}
	}
	return path;
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	// names of known key codes (0-255)
	var getKeyboardMapping = [
	"", // [0]
	"", // [1]
	"", // [2]
	"CANCEL", // [3]
	"", // [4]
	"", // [5]
	"HELP", // [6]
	"", // [7]
	"BACK_SPACE", // [8]
	"TAB", // [9]
	"", // [10]
	"", // [11]
	"CLEAR", // [12]
	"ENTER", // [13]
	"ENTER_SPECIAL", // [14]
	"", // [15]
	"SHIFT", // [16]
	"CONTROL", // [17]
	"ALT", // [18]
	"PAUSE", // [19]
	"CAPS_LOCK", // [20]
	"KANA", // [21]
	"EISU", // [22]
	"JUNJA", // [23]
	"FINAL", // [24]
	"HANJA", // [25]
	"", // [26]
	"ESCAPE", // [27]
	"CONVERT", // [28]
	"NONCONVERT", // [29]
	"ACCEPT", // [30]
	"MODECHANGE", // [31]
	"SPACE", // [32]
	"PAGE_UP", // [33]
	"PAGE_DOWN", // [34]
	"END", // [35]
	"HOME", // [36]
	"LEFT", // [37]
	"UP", // [38]
	"RIGHT", // [39]
	"DOWN", // [40]
	"SELECT", // [41]
	"PRINT", // [42]
	"EXECUTE", // [43]
	"PRINTSCREEN", // [44]
	"INSERT", // [45]
	"DELETE", // [46]
	"", // [47]
	"0", // [48]
	"1", // [49]
	"2", // [50]
	"3", // [51]
	"4", // [52]
	"5", // [53]
	"6", // [54]
	"7", // [55]
	"8", // [56]
	"9", // [57]
	"COLON", // [58]
	"SEMICOLON", // [59]
	"LESS_THAN", // [60]
	"EQUALS", // [61]
	"GREATER_THAN", // [62]
	"QUESTION_MARK", // [63]
	"AT", // [64]
	"A", // [65]
	"B", // [66]
	"C", // [67]
	"D", // [68]
	"E", // [69]
	"F", // [70]
	"G", // [71]
	"H", // [72]
	"I", // [73]
	"J", // [74]
	"K", // [75]
	"L", // [76]
	"M", // [77]
	"N", // [78]
	"O", // [79]
	"P", // [80]
	"Q", // [81]
	"R", // [82]
	"S", // [83]
	"T", // [84]
	"U", // [85]
	"V", // [86]
	"W", // [87]
	"X", // [88]
	"Y", // [89]
	"Z", // [90]
	"OS_KEY", // [91] Windows Key (Windows) or Command Key (Mac)
	"", // [92]
	"CONTEXT_MENU", // [93]
	"", // [94]
	"SLEEP", // [95]
	"NUMPAD0", // [96]
	"NUMPAD1", // [97]
	"NUMPAD2", // [98]
	"NUMPAD3", // [99]
	"NUMPAD4", // [100]
	"NUMPAD5", // [101]
	"NUMPAD6", // [102]
	"NUMPAD7", // [103]
	"NUMPAD8", // [104]
	"NUMPAD9", // [105]
	"MULTIPLY", // [106]
	"ADD", // [107]
	"SEPARATOR", // [108]
	"SUBTRACT", // [109]
	"DECIMAL", // [110]
	"DIVIDE", // [111]
	"F1", // [112]
	"F2", // [113]
	"F3", // [114]
	"F4", // [115]
	"F5", // [116]
	"F6", // [117]
	"F7", // [118]
	"F8", // [119]
	"F9", // [120]
	"F10", // [121]
	"F11", // [122]
	"F12", // [123]
	"F13", // [124]
	"F14", // [125]
	"F15", // [126]
	"F16", // [127]
	"F17", // [128]
	"F18", // [129]
	"F19", // [130]
	"F20", // [131]
	"F21", // [132]
	"F22", // [133]
	"F23", // [134]
	"F24", // [135]
	"", // [136]
	"", // [137]
	"", // [138]
	"", // [139]
	"", // [140]
	"", // [141]
	"", // [142]
	"", // [143]
	"NUM_LOCK", // [144]
	"SCROLL_LOCK", // [145]
	"WIN_OEM_FJ_JISHO", // [146]
	"WIN_OEM_FJ_MASSHOU", // [147]
	"WIN_OEM_FJ_TOUROKU", // [148]
	"WIN_OEM_FJ_LOYA", // [149]
	"WIN_OEM_FJ_ROYA", // [150]
	"", // [151]
	"", // [152]
	"", // [153]
	"", // [154]
	"", // [155]
	"", // [156]
	"", // [157]
	"", // [158]
	"", // [159]
	"CIRCUMFLEX", // [160]
	"EXCLAMATION", // [161]
	"DOUBLE_QUOTE", // [162]
	"HASH", // [163]
	"DOLLAR", // [164]
	"PERCENT", // [165]
	"AMPERSAND", // [166]
	"UNDERSCORE", // [167]
	"OPEN_PAREN", // [168]
	"CLOSE_PAREN", // [169]
	"ASTERISK", // [170]
	"PLUS", // [171]
	"PIPE", // [172]
	"HYPHEN_MINUS", // [173]
	"OPEN_CURLY_BRACKET", // [174]
	"CLOSE_CURLY_BRACKET", // [175]
	"TILDE", // [176]
	"", // [177]
	"", // [178]
	"", // [179]
	"", // [180]
	"VOLUME_MUTE", // [181]
	"VOLUME_DOWN", // [182]
	"VOLUME_UP", // [183]
	"", // [184]
	"", // [185]
	"SEMICOLON", // [186]
	"EQUALS", // [187]
	"COMMA", // [188]
	"MINUS", // [189]
	"PERIOD", // [190]
	"SLASH", // [191]
	"BACK_QUOTE", // [192]
	"", // [193]
	"", // [194]
	"", // [195]
	"", // [196]
	"", // [197]
	"", // [198]
	"", // [199]
	"", // [200]
	"", // [201]
	"", // [202]
	"", // [203]
	"", // [204]
	"", // [205]
	"", // [206]
	"", // [207]
	"", // [208]
	"", // [209]
	"", // [210]
	"", // [211]
	"", // [212]
	"", // [213]
	"", // [214]
	"", // [215]
	"", // [216]
	"", // [217]
	"", // [218]
	"OPEN_BRACKET", // [219]
	"BACK_SLASH", // [220]
	"CLOSE_BRACKET", // [221]
	"QUOTE", // [222]
	"", // [223]
	"META", // [224]
	"ALTGR", // [225]
	"", // [226]
	"WIN_ICO_HELP", // [227]
	"WIN_ICO_00", // [228]
	"", // [229]
	"WIN_ICO_CLEAR", // [230]
	"", // [231]
	"", // [232]
	"WIN_OEM_RESET", // [233]
	"WIN_OEM_JUMP", // [234]
	"WIN_OEM_PA1", // [235]
	"WIN_OEM_PA2", // [236]
	"WIN_OEM_PA3", // [237]
	"WIN_OEM_WSCTRL", // [238]
	"WIN_OEM_CUSEL", // [239]
	"WIN_OEM_ATTN", // [240]
	"WIN_OEM_FINISH", // [241]
	"WIN_OEM_COPY", // [242]
	"WIN_OEM_AUTO", // [243]
	"WIN_OEM_ENLW", // [244]
	"WIN_OEM_BACKTAB", // [245]
	"ATTN", // [246]
	"CRSEL", // [247]
	"EXSEL", // [248]
	"EREOF", // [249]
	"PLAY", // [250]
	"ZOOM", // [251]
	"", // [252]
	"PA1", // [253]
	"WIN_OEM_CLEAR", // [254]
	"" // [255]
	];
	
	
	
	// Simuleate key-strokes
	
	
	