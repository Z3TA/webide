/*
	
	This file contains useful (utility) functions
	
	All file paths should handle URL's ex: ftp://hostname:21/folder1/folder2
	Always add a trailing slash after folder paths
*/

"use strict";

if(typeof EDITOR == "undefined") {
	var EDITOR = {
		workingDirectory: "/",
		remoteProtocols: ["ftp", "ftps", "sftp"],
		settings: {
			defaultLineBreakCharacter: "\n"
		}
	};
}

var UTIL = {
	toSystemPathDelimiters: function toSystemPathDelimiters(path) {
		
		// Makes sure the path uses the right path delimiters ...
		//console.log("toSystemPathDelimiters: path=" + path);
		
		if(path.indexOf("://") != -1) {
			var delimiter = "/";
		}
		else {
		try {
			var pathModule = require("path");
			var delimiter = pathModule.sep;
		}
		catch(err) {
			// Probably running in a browser
			var delimiter = UTIL.getPathDelimiter(EDITOR.workingDirectory);
		}
		}
		
		//console.log("delimiter=" + delimiter);
		//console.log("path=" + path);
				
		path = path.replace(/\/+/g, delimiter);
		path = path.replace(/(:\\)?\\+/g, "$1" + delimiter);
		
		//console.log("path=" + path);
		
		return path;
		
	},
	
	trailingSlash: function trailingSlash(folderPath) {
		// Makes sure the folder has a trailing slash
		//console.log("Get trailing slash for folderPath=" + folderPath);
		
		if(folderPath == undefined) {
			console.warn("folderPath=" + folderPath);
			return folderPath;
		}
		
		if(typeof folderPath != "string") throw new Error("folderPath=" + folderPath + " (" + typeof folderPath + ") needs to be a string!");
		
		var delimiter = UTIL.getPathDelimiter(folderPath);
		var lastCharacter = folderPath.substr(folderPath.length-1, 1);
		if(lastCharacter != delimiter) {
			folderPath += delimiter;
			//console.log("Added trailing slash to path=" + folderPath);
		}
		else {
			// Prevent double traling flashes
			while(folderPath.slice(-2) == delimiter+delimiter) folderPath = folderPath.slice(0,-1);
		}
		
		return folderPath;
	},
	
	getDirectoryFromPath: function getDirectoryFromPath(path) {
		/*
			Returns the directory of a file path
			If no path is specified it uses current file or working directory
			
			todo: replace EDITOR.getDir
		*/
		
		//console.log("getDir path=" + path);
		
		if(path == undefined) {
			if(EDITOR.currentFile) path = EDITOR.currentFile.path;
			else return UTIL.trailingSlash(EDITOR.workingDirectory); // (editor) working dir
		}
		
		if(typeof path != "string") throw new Error("Unable to get directory from path=" + path);
		
		var lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
		
		if(lastSlash == -1) {
			console.warn("Unable to get directory of path=" + path + ". Using EDITOR.workingDirectory=" + EDITOR.workingDirectory);
			return UTIL.trailingSlash(EDITOR.workingDirectory);
		}
		
		return UTIL.trailingSlash(path.substring(0, lastSlash));
	},
	
	getFolderName: function getFolderName(path) {
		/*
			Returns the name of the last folder in a folder path
			/foo/bar returns bar,
			/foo/bar/baz returns bar
			foo/bar returns foo
		*/
		
		var delimiter = UTIL.getPathDelimiter(path);
		
		if(path.charAt(path.length) != delimiter) {
			console.warn("The last character is not a delimiter=" + delimiter + " path=" + path);
			path = path.substring(0, path.lastIndexOf(delimiter));
		}
		
		console.log("path=" + path);
		
		var arr = path.split(delimiter);
		
		if(arr.length == 0) return ""
		else if(arr.length == 1) {
			return arr[0];
		}
		else return arr[arr.length-1];
	},
	
	parentFolder: function parentFolder(path) {
		// Returns a file's or folder's parent folder
		
		var folders = UTIL.getFolders(path);
		
		if(folders.length > 1) return folders[folders.length-2];
		else return folders[0];
		
	},
	
	isLocalPath: function isLocalPath(path) {
		if(path.charAt(0) == "/") return true; // Unix
		else if(path.indexOf("\\") > 0) return true; // Windows !?
		else return false;
	},
	
	root: function rootPath(path) {
		if(path == undefined && typeof EDITOR == "object") path = EDITOR.workingDirectory;
		
		var folders = UTIL.getFolders(path);
		
		return folders[0];
	},
	
	getFolders: function getFolders(fullPath, includeHostInfo) {
		/* 
			Returns each folder in the path. Can take an url or a local filesystem path
			
			Examples:
			ftp://hostname/folder1/folder2 => ["ftp://hostname/", "ftp://hostname/folder1/", "ftp://hostname/folder1/folder2/"]
			C:\\\\Windows\\system32        => ["C:\\", "C:\\Windows\", "C:\\Windows\system32\"]
			C://Windows/system32           => (throws an error; use C:\ instead)
			/tank/foo/bar                  => ["/", "/tank/", "/tank/foo/", "/tank/foo/bar/"]
			
		*/
		
		if(typeof fullPath != "string") throw new Error("fullPath=" + fullPath + " (" + typeof fullPath + ") needs to be a string!\n" + JSON.stringify(fullPath));
		
		if(includeHostInfo == undefined) includeHostInfo = true;
		
		fullPath = fullPath.trim(); // Remove white space before and after
		
		//console.log("getFolders: fullPath=" + fullPath);
		
		if(fullPath == "/") return ["/"];
		
		var lastChar = fullPath.substr(fullPath.length-1);
		
		if(lastChar != "/" && lastChar != "\\") {
			//console.warn("getFolders: Path does not end with a slash! lastChar=" + lastChar + " fullPath=" + fullPath);
			// Check if the path contains a file, and remove it
			//console.log("lastChar=" + lastChar + " fullPath=" + fullPath);
			var delimiter = UTIL.getPathDelimiter(fullPath);
			var filePart = fullPath.substr(fullPath.lastIndexOf(delimiter));
			
			//console.log("filePart=" + filePart + " delimiter=" + delimiter);
			
			if(filePart.indexOf(".") != -1) {
				fullPath = fullPath.substr(0, fullPath.lastIndexOf(delimiter)+1); // Remove the file part
				console.log("fullPath=" + fullPath +" (after removing file part)");
				if(fullPath == "/") return ["/"];
			}
			//else console.warn("Assuming " + filePart + " is a directory!");
			
		}
		
		var protocolIndex = fullPath.indexOf("://");
		
		if(protocolIndex != -1) {
			// It's probably an URL ...
			
			var protocol = fullPath.substr(0, protocolIndex);
			
			if(protocol) protocol = protocol.toLowerCase();
			
			console.log("protocol=" + protocol);
			
			if(EDITOR.remoteProtocols.indexOf(protocol) == -1) {
				console.warn("protocol=" + protocol + " is not a supported protocol! If it's a Windows path, use " + protocol + ":\\ instead!"); // eg C:\\
			}
			
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
			
			//console.log("driveIndex=" + driveIndex);
			
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
					if(folders[i] != "") {
					fullFolder += folders[i] + "\\";
					paths.push( fullFolder );
					}
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
					if(folders[i] != "") {
					fullFolder += folders[i] + "/";
					paths.push(fullFolder);
					}
				}
				
				return paths;
				
			}
		}
	},
	
	
	getPathDelimiter: function getPathDelimiter(path) {
		// Returns the delimiter character used for separating directories in a file-path or url
		
		// Use working directory if there's no path
		if(!path && EDITOR.workingDirectory) path = EDITOR.workingDirectory;
		
		
		if(!path) {
			console.warn("Unable to determine path delimiter from path=" + path + ". Slash / will be used!");
			return "/";
		}
		
		if(typeof path != "string") throw new Error("path=" + path + " (" + typeof path + ") needs to be a string!");
		
		var lastChar = path.substring(path.length-1);
		
		if(lastChar == "/" || lastChar == "\\") return lastChar;
		else {
			if(path.indexOf("/") != -1) return "/";
			else if(path.indexOf("\\") != -1) return "\\";
			else {
				//console.warn("Unable to determine file path folder separator/delimiter of path=" + path);
				return UTIL.toSystemPathDelimiters("/");
			}
		}
	},
	
	escapeHtml: function escapeHtml(html) {
		
		html = html.replace(/</g, "&lt;");
		html = html.replace(/>/g, "&gt;");
		
		return html;
	},	
	
	textDiff: function textDiff(originalText, editedText) {
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
		
		console.log("editedRow.length=" + editedRow.length);
		console.log("originalRow.length=" + originalRow.length);
		
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
		
		//if(editedRow[editedRow.length-1] != "") throw new Error("Edited text must end with a line break to make it easier to diff! editedText=" + UTIL.lbChars(editedText));
		//if(originalRow[originalRow.length-1] != "") throw new Error("Original text must end with a line break to make it easier to diff! originalText=" + UTIL.lbChars(originalText));
		
		// Add an ending line-break if one doesn't exist. Why ? To make diff easier, so that each line ends with a line break (including the last line)
		var extraLbAddedToEdited = false;
		var extraLbAddedToOriginal = false;
		if(editedRow[editedRow.length-1] != "") {
editedRow.push("");
			extraLbAddedToEdited = true;
		}
		if(originalRow[originalRow.length-1] != "") {
originalRow.push("");
			extraLbAddedToOriginal = true;
		}
		editedText = editedRow.join(lbEditedText);
		originalText = originalRow.join(lbOriginalText);
		
		var extraLbAdded = false;
		var lastCharactersOriginalText = originalText.substr(originalText.length - lbOriginalText.length);
		if(lastCharactersOriginalText != lbOriginalText) { 
			// original text doesn't end with a line break!
			// Each line must end with a line break, even the last line.
			console.log("Original text last " + lbOriginalText.length + " chars are not a line break: " + UTIL.lbChars(lastCharactersOriginalText));
			//originalText += lbOriginalText;
			//extraLbAdded = true;
			
			// Because an extra linebreak was added to the original text, we also need to add one (or two) to the edited text to not mess up the diff
			//if(editedText.substr(editedText.length - lbEditedText.length) != lbEditedText) editedText += lbEditedText + lbEditedText; // Add two line-breaks
			//else editedText += lbEditedText; // or add only one if it already had one
		}
		
		var jsdiff = JsDiff ? JsDiff : require('diff');
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
			
			if(line.length < 2 || line[line.length-1] != "") {
				console.log("diff[" + i + "]=" + JSON.stringify(diff[i]) + "");
				console.log("line=" + JSON.stringify(line));
				throw new Error("Line does not end with a new-line character! See console.log's");
			}
			
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
		
		if(extraLbAddedToEdited && !extraLbAddedToOriginal) {
			if(line[line.length-1] != "") throw new Error("Expected last line line[" + (line.length-1) + "]=" + line[line.length-1] + " to be emty");
			console.log("The last row was removed! line.length=" + line.length + " totalLineBreaks=" + totalLineBreaks + " lineBreakCount=" + lineBreakCount + "");
			removed.push({text: "", row: totalLineBreaks});
			}
		
		console.log("inserted=" + JSON.stringify(inserted, null, 2));
		console.log("removed=" + JSON.stringify(removed, null, 2));
		
		console.log("originalText=" + UTIL.debugWhiteSpace(originalText));
		console.log("editedText=" + UTIL.debugWhiteSpace(editedText));
		
		return {inserted: inserted, removed: removed};
		
	},


	textDiffCol: function textDiffCol(originalText, editedText) {
		// Returns the column for when original and edited texts depart
		
		originalText = originalText.trim();
		editedText = editedText.trim();
		
		for (var i=0; i<originalText.length; i++) {
			if(originalText[i] != editedText[i]) {
				return i;
			}
		}
		
		return -1;
	},



	lbChars: function lbChars(txt) {
		// Shows white space. Useful for debugging
		txt = txt.replace(/\r/g, "CR");
		txt = txt.replace(/\n/g, "LF");
		txt = txt.replace(/\t/g, "TAB");
		txt = txt.replace(/ /g, "SPACE");
		txt = txt.replace(/\f/g, "FORMFEED");
		txt = txt.replace(/\v/g, "VTAB");
		txt = txt.replace(/\s/g, "OTHERWHITESPACE");
		return txt;
	},

	isNumeric: function isNumeric(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	},




	debugWhiteSpace: function debugWhiteSpace(str) {
		return str.replace(/\r/g, "R").replace(/\n/g, "N\n").replace(/ /g, "S").replace(/\t/g, "T");
	},


	getFunctionName: function getFunctionName(fun) {
		if(!fun) {
console.warn("fun=" + fun);
			return fun;
		}
		if(fun.name) return fun.name;
		
		var ret = fun.toString();
		ret = ret.substr('function '.length);
		ret = ret.substr(0, ret.indexOf('('));
		return ret;
	},

	determineLineBreakCharacters: function determineLineBreakCharacters(text) {
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
		
		//console.log("determineLineBreakCharacters text=" + text);
		
		if(text.length == 0) {
			console.warn("Can't determine line breaks without any text!");
			if(typeof EDITOR != "undefined") return EDITOR.settings.defaultLineBreakCharacter;
			else return "\n";
		}
		
		var nr = UTIL.occurrences(text, "\n\r", true),
		rn = UTIL.occurrences(text, "\r\n", true)
		
		console.log("Line break? nr=" + nr + " rn=" + rn + "");
		
		if(rn > nr) {
			console.log("Using CRLF");
			return "\r\n";
		}
		else if(nr > rn && nr > 1) {
			console.warn("Using LFCR");
			return "\n\r";
		}
		else if(text.indexOf("\n") > -1) {
			console.log("Using LF (text has LF but no CRLF or LFCR)");
			return "\n";
		}
		else {
			// Text has no line breaks. Use the default: (cr lf in windows)
			console.warn("Text has no line breaks!");
			if(navigator.platform.indexOf("Win") > -1) {
				console.log("Using CRLF (Because it's Windows)");
				return "\r\n";
			}
			else {
				console.log("Using LF (Because it's Not Windows)");
				return "\n";
			}
		}
	},

	drawCircle: function drawCircle(ctx, centerX, centerY, radius, color) {
		// Useful for debugging scren locations
		var defaultRadius = 16;
		if(radius == undefined) radius = defaultRadius;
		if(typeof radius == "string" && color == undefined) {
			color = radius;
			radius = defaultRadius;
		}
		if(color == undefined) color = "rgba(255,0,0,0.1)";
		
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.stroke();
	},
	
	occurrences: function occurrences(string, subString, allowOverlapping) {
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
	},

	objInfo: function objInfo(o) {
		/*
			Use for debug, to see properties in an object. 
			Useful for events like click etc.
		*/
		console.log("######################## OBJ INFO #########################");
		
		if(console.dir) return console.dir(o);
		
		var val;
		for(var p in o) {
			try {
				// Try to convert to string, prevent: TypeError: Cannot convert object to primitive value
				if(o[p] == undefined) continue;
				else if(typeof o[p] == "function") val = "function: " + UTIL.getFunctionName(o[p]);
				else val = o[p].toString ? o[p].toString() : o[p] + "";
			}
			catch(err) {
				val = "???"
				console.log(err.message);
			}
			console.log(p + "=" + val);
		}
	},

	parseStackTrace: function parseStackTrace(stackTrace) {
		/*
			
			creating caret: at File.createCaret (http://127.0.0.1:8080/File.js:434:20)
			at new File (http://127.0.0.1:8080/File.js:90:21)
			at load (http://127.0.0.1:8080/EDITOR.js:798:18)
			at Object.EDITOR.openFile (http://127.0.0.1:8080/EDITOR.js:783:5)
			
		*/
		
		console.log("parseStackTrace: stackTrace=" + stackTrace);
		
		var reStack = /at ([^ ]*) ?\(?(.*):(\d*):(\d*)/g; // Chromium
		var stackLength = 0;
		var lines = [];
		var fName="";
		var source="";
		var lineno=0;
		var colno=0;
		var obj = {};
		var match;
		

		if(stackTrace.match(reStack)) {
			console.log("Using reStack=" + reStack);
		}
		else {
			/*
				Firefox variant B:
				hi 1539955769156: oleLog@http://127.0.0.1:8080/WysiwygEditor.js:2085:24
			*/
			var reStack = /([^ ]*)@(.*):(\d*):(\d*)/g; // Firefox
		}
		
		if(stackTrace.match(reStack)) {
			console.log("Using reStack=" + reStack);
		}
		else {
			/*
				Firefox variant C:
				@http://127.0.0.1:8080/rs9snkpfpe/inlineErrorMessages.htm:4:7
			*/
			var reStack = /@?(.*):(\d*):(\d*)/g; // Firefox
		}
		
		while ((match = reStack.exec(stackTrace)) !== null && stackLength < 100) {
			stackLength++;
			
			if(match.length == 5) {
			fName = match[1];
			source = match[2];
			lineno = match[3];
			colno = match[4];
			}
			else if(match.length == 4) {
				fName ="";
				source = match[1];
				lineno = match[2];
				colno = match[3];
			}
			
			if(fName && !source) {
source = fName;
				fName = "";
			}
			
			obj = {};
			if(fName) obj.fName = fName;
			if(source) obj.source = source;
			if(lineno) obj.lineno = lineno;
			if(colno) obj.colno = colno;
			
			lines.push(obj);
			
		}
		
		if(lines.length == 0) {
			throw new Error(reStack + " does not match stackTrace=" + stackTrace);
		}
		
		return lines;
	},
	
	isString: function isString(text) {
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
		
	},


	escapeRegExp: function escapeRegExp(str) {
		return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	},

	getFilenameFromPath: function getFilenameFromPath(path) {
		// Returns the file name, including the file extension part
		if(typeof path != "string") throw new Error("Not a string: path=" + path);
		if(path.indexOf("/") > -1) {
			return path.substr(path.lastIndexOf('/')+1);
		}
		else {
			// Assume \ is the folder separator
			return path.substr(path.lastIndexOf('\\')+1);
		}
	},



	isFilePath: function isFilePath(filePath) {
		if(RUNTIME == "browser") {
			if(linuxPathValidation(filePath)) return true
			else return false;
		}
		else {
			var fs = require("fs");
			try {
				var stat = fs.lstatSync(filePath);
				return stat.isFile();
			}
			catch(err) {
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
		
		function windowsPathValidation(contwinpath)	{
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
	},

	getFileExtension: function getFileExtension(filePath) {
		// Returns the file extension, not including the dot. eg foo.bar => bar
		var lastDot = filePath.lastIndexOf(".");
		if(lastDot == -1) return "";
		
		return filePath.slice(lastDot+1);
	},

	getFileNameWithoutExtension: function getFileNameWithoutExtension(filePath) {
		// Returns the file name, but WITHOUT the extension part: /foo/bar.baz => bar
		if(typeof filePath != "string") throw new Error("Not a string: filePath=" + filePath);
		var fileName = UTIL.getFilenameFromPath(filePath);
		var fileExtension = UTIL.getFileExtension(fileName);
		
		if(fileExtension.length == 0) return fileName;
		
		return fileName.slice(0, fileName.length - fileExtension.length - 1);
		
	},
	
	getPathFromUrl: function getPathFromUrl(url) {
		
		var filePath;
		
		//console.log("url=" + url);
		
		if(url.charAt(0) == "/") {
			filePath = url;
			}
else {
			var protocolIndex = url.indexOf("://");
			var protocol = "";
			
			if(protocolIndex != -1) {
				protocol = url.substr(0, protocolIndex);
				url = url.substr(url.indexOf("://")+3);
			}
			
			console.log("protocol=" + protocol);
			console.log("url=" + url);
			
			if(protocol) {
				while(url.indexOf("/") == 0) url = url.substr(1); // Remove all starting slashes from ex: file:///C:\users\...
			}
			
			console.log("url=" + url);
			
			if(protocol.toLowerCase() != "file" && (url.indexOf("/") != -1)) {
				filePath = url.substr(url.indexOf("/"));
			}
			else filePath = url;
		}
		
		filePath = decodeURIComponent(filePath); // decode åäö etc
		
		//console.log("filePath=" + filePath);
		
		if(filePath.indexOf("?") != -1) filePath = filePath.substring(0, filePath.indexOf("?"));
		if(filePath.indexOf("#") != -1) filePath = filePath.substring(0, filePath.indexOf("#"));
		
		return filePath;
	},
	
	isDirectory: function isDirectory(path) {
		// It's a directory if the path ends with a slash
		var lastChar = path.slice(path.length-1);
		return (lastChar == "/" || lastChar == "\\");
	},
	
	getStack: function getStack(msg) {
		// Used in debugging, to get a stack trace of function being called
		// ex: console.log(UTIL.getStack("foo"));
		
		if(msg == undefined) msg = "";
		
		var str = new Error(msg).stack;
		
		if(str == undefined) str = "Unable to get call stack!"
		else {
		
		// Remove first at (this function)
		str = str.substr(str.indexOf("\n")+5, str.length);
		str = str.substr(str.indexOf("\n")+5, str.length);
		}
		
		return msg + ": " + str;
	},


	httpPost: function httpPost(url, form, callback) {
		
		var xmlHttp = new XMLHttpRequest();
		var timeoutTimer;
		var timeoutTimeMs = 3000;
		
		var formData = "";
		
		for(var name in form) {
			formData += name + "=" + encodeURIComponent(form[name]) + "&";
		}
		if(formData.length == 0) throw new Error("Form contains no data!");
		formData = formData.substring(0, formData.length); // Remove last &
		
		//console.log("url=" + url);
		
		xmlHttp.onreadystatechange = function httpReadyStateChange() {
			if(xmlHttp.readyState == 4) {
				clearTimeout(timeoutTimer);
				if(xmlHttp.status == 200) callback(null, xmlHttp.responseText);
				else {
					var err = new Error(xmlHttp.responseText);
					err.readyState = xmlHttp.readyState;
					err.code = xmlHttp.status;
					callback(err);
				}
			}
			//else console.log("xmlHttp.readyState=" + xmlHttp.readyState);
		}
		
		xmlHttp.open("POST", url, true); // true for asynchronous
		xmlHttp.send(formData);
		
		timeoutTimer = setTimeout(timeout, timeoutTimeMs);
		
		function timeout() {
			var err = new Error("HTTP POST request timed out!");
			err.readyState = xmlHttp.readyState;
			xmlHttp.onreadystatechange = null;
			xmlHttp.abort();
			callback(err);
		}
		
	},

	httpGet: function httpGet(url, callback) {
		var xmlHttp = new XMLHttpRequest();
		var timeoutTimer;
		var timeoutTimeMs = 3000;
		
		console.log("HTTP GET url=" + url);
		
		xmlHttp.onreadystatechange = function httpReadyStateChange() {
			if(xmlHttp.readyState == 4) {
				clearTimeout(timeoutTimer);
				if(xmlHttp.status == 200) callback(null, xmlHttp.responseText);
				else {
					
					var headers = "Not available";
					if(typeof XMLHttpRequest.getAllResponseHeaders == "function") {
						headers = XMLHttpRequest.getAllResponseHeaders();
					}
					
					var err = new Error(xmlHttp.responseText);
					err.status = xmlHttp.status;
					err.readyState = xmlHttp.readyState;
					err.headers = headers;
					err.url = url;
					err.code = xmlHttp.status;
					console.error(err);
					callback(err);
				}
			}
			//else console.log("xmlHttp.readyState=" + xmlHttp.readyState);
		}
		
		xmlHttp.open("GET", url, true); // true for asynchronous
		
		try {
		xmlHttp.send(null);
		}
		// catch errors like "Mixed Content"
		// Actually we are not able to catch that error. It seems Chrome just prints it to console.error and continues with the request !??
		// xhr usually follows redirects, but not if there's this silent "Mixed Content" error!
		catch(xmlHttpErr) { 
			xmlHttp.onreadystatechange = null;
			xmlHttp.abort();
			callback(xmlHttpErr);
		}
		
		timeoutTimer = setTimeout(timeout, timeoutTimeMs);
		
		function timeout() {
			var err = new Error("HTTP request timed out. xmlHttp.readyState=" + xmlHttp.readyState);
			xmlHttp.onreadystatechange = null;
			xmlHttp.abort();
			callback(err);
		}
	},

	canvasLocation: function screenLocation(row, col) {
		// Returns the screen location of the center of the box located at row,col
		
		if(typeof row == "object" && row.row != undefined && row.col != undefined) {
			col = row.col;
			row = row.row;
		}
		if(typeof row != "number") throw new Error("row=" + row + " (" + (typeof row) + ") needs to be a number!");
		if(typeof col != "number") throw new Error("col=" + col + " (" + (typeof col) + ") needs to be a number!");
		
		var file = EDITOR.currentFile;
		
		if(!file) throw new Error("No current file open!");
		
		var indentationWidth = file.grid[row].indentation * EDITOR.settings.tabSpace;
		var top = EDITOR.settings.topMargin + (row-file.startRow) * EDITOR.settings.gridHeight;
		var left = EDITOR.settings.leftMargin + (Math.max(0, indentationWidth - file.startColumn) + col) * EDITOR.settings.gridWidth;
		
		return {x: left + EDITOR.settings.gridWidth / 2, y: top + EDITOR.settings.gridHeight /2};
	},
	
	spacePad: function spacePad(str, padLength) {
		
		if(padLength == undefined) padLength = 42;
		
		var left = padLength - str.length;
		if (left < 0) return str; // Return early if no padding is needed
		
		var padding = "";
		for(var i=0; i<left; i++) padding += " ";
		return str + padding;
	},
	
	zeroPad: function zeroPad(str, padLength) {
		
		if(typeof str != "string") str = str.toString();
		
		if(padLength == undefined) padLength = Math.max(2, str.length);
		
		var left = padLength - str.length;
		if (left <= 0) return str; // Return early if no padding is needed
		
		var padding = "";
		for(var i=0; i<left; i++) padding += "0";
		return padding + str;
	},

	monthName: function monthName(dayOfMonth) {
		
		return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dayOfMonth];
		
		},
	
	dayName: function monthName(dayOfWeek) {
		
		return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek];
		
	},
	
	makePathAbsolute: function makePathAbsolute(path) {
		if(RUNTIME != "nw.js") throw new Error("makePathAbsolute only available in nw.js!");
		if(path.match(/^.*:\/\//) == null) { // It's already absolute if it starts with a protocol, like ftp://
			var fspath = require("path");
			if(!fspath.isAbsolute(path)) {
				var absolutePath = fspath.resolve(path);
				console.warn("Making path absolute: " + path + " ==> " + absolutePath);
				path = absolutePath; // Make the path absolute
			}
		}
		return path;
	},

	resolvePath: function resolveRelativePath(base, path) {
		/*
			Takes a relative path and returns a absolute path
			
			/foo/ + ../bar = /bar
		*/
		
		console.log("resolvePath: base=" + base + " path=" + path);
		
		if(base.indexOf("://") != -1) {
			console.log("Probably an url: base=" + base);
			var loc = UTIL.getLocation(base);
			var url = base.slice(0, base.lastIndexOf(loc.pathname));
			base = loc.pathname;
			console.log("new base=" + base + "");
			if(url.indexOf("://") == -1) { // Sanity check
				console.warn("url lost it's protocol!");
				throw new Error("url=" + url + " (no protocol!) loc.pathname=" + loc.pathname);
			}
		}
		
		var delimiter = UTIL.getPathDelimiter(base);
		
		if(url) {
			// Remove all ending delimiters from url so we can add one later and prevent double
while(url.slice(-1) == delimiter) url = url.slice(0,-1);
		}
		
		// Remode dublicate delimiters
		while(base.indexOf(delimiter+delimiter) != -1) base = base.replace(delimiter+delimiter, delimiter);
		while(path.indexOf(delimiter+delimiter) != -1) path = path.replace(delimiter+delimiter, delimiter);
		
		// Base should always start with a delimiter!
		if(base.slice(0,1) != delimiter) base = delimiter + base;
		
		// Base should always end with a delimiter!
		if(base.slice(-1) != delimiter) base = base + delimiter;
		
		console.log("base=" + base);
		
		var folders = base.split(delimiter);
		
		// Remove emty folders
		var noEmtyFolders = [];
		for (var i=0; i<folders.length; i++) {
			if(folders[i] != "") noEmtyFolders.push(folders[i]);
		}
		folders = noEmtyFolders;
		
		console.log("folders=" + folders);
		
		if(path.charAt(0) == delimiter) {
			// ex: /foo/bar
			// resolve to root!
			console.log("path=" + path + " is absolute!");
			if(url) return url + path;
			else return path;
		}
		else if(path.charAt(0) != ".") {
			// ex: foo/bar
			console.log("path=" + path + " is relative-absolute!");
			if(url) return url + delimiter + UTIL.trailingSlash(base) + path;
			else return base + path;
		}
		else if(path.charAt(0) == "." && path.charAt(1) == delimiter) {
			// ex: ./foo
			console.log("path=" + path + " is relative DOT absolute!");
			path = path.slice(2); // Remove starting ./
			if(url) return url + base + path;
			else return base + path;
		}
		
		while(path.slice(0,3) == ".." + delimiter) {
			var popped = folders.pop();
			console.log("popped " + popped);
			path = path.slice(3);
		}
		
		base = folders.join(delimiter);
		if(base.length > 1) {
			console.log("concatenating base");
			var absolutePath = delimiter + base + delimiter + path;
		}
		else {
			console.log("base is emty");
			var absolutePath = delimiter + path;
		}
		
		console.log("absolutePath=" + absolutePath);
		
		if(url) return url + absolutePath
		else return absolutePath;
		
	},
	
	joinPaths: function joinPaths(paths) {
		/*
			
			Ex: ["foo", "bar/baz/"] => "/foo/bar/baz/"
			
		*/
		
		if(Object.prototype.toString.call( paths ) != '[object Array]') throw new Error("Argument needs to be an array: paths=" + paths);
		
		var pathDelimiter = UTIL.getPathDelimiter(paths[0]);
		
		for (var i=0; i<paths.length-1; i++) {
			if(!paths[i]) throw new Error("Item " + i + "=" + paths[i] + " is emty or undefined!");
			paths[i] = UTIL.trailingSlash(paths[i]);
			//if(paths[i].indexOf("\\") != -1) throw new Error("Backslash in " + paths[i] + " paths=" + JSON.stringify(paths));
		}
		
		//console.log("paths=", paths);
		//console.log("pathDelimiter=" + pathDelimiter);
		
		var path = paths.join(pathDelimiter);
		
		if(pathDelimiter == "/" && path.indexOf("\\") == -1) {
			// Want to be sure path does not contain and backslash
			// or node would turn /C:/ into C:\C:\
			path = "/" + path;
			path = path.replace(/\\/g, "/");
		}
		else if(pathDelimiter == "\\") {
			path = path.replace(/\//g, "\\");
		}
		
		while(path.indexOf(pathDelimiter + pathDelimiter) != -1) path = path.replace(pathDelimiter + pathDelimiter, pathDelimiter);
		
		return path;
	},
	
	reIndexOf: function reIndexOf(reIn, str, startIndex) {
		var re = new RegExp(reIn.source, 'g' + (reIn.ignoreCase ? 'i' : '') + (reIn.multiLine ? 'm' : ''));
		re.lastIndex = startIndex || 0;
		var res = re.exec(str);
		if(!res) return -1;
		return re.lastIndex - res[0].length;
	},

	reLastIndexOf: function reLastIndexOf(regex, str, startpos) {
		
		regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
		if(typeof (startpos) == "undefined") {
			startpos = str.length;
		} else if(startpos < 0) {
			startpos = 0;
		}
		var stringToWorkWith = str.substring(0, startpos + 1);
		var lastIndexOf = -1;
		var nextStop = 0;
		var result;
		while((result = regex.exec(stringToWorkWith)) != null) {
			lastIndexOf = result.index;
			regex.lastIndex = lastIndexOf+1;
		}
		return lastIndexOf;
	},

	assert: function assert(x, y) {
		if(x !== y) {
			if(y === undefined && (x === true || x === false)) throw new Error("assert takes two arguments and throws an error if they are not equal. Example: assert(42, 42)");
			throw new Error("Expected x = '" + x + "' = y = '" + y + "'");
		}
	},

	regexpAssert: function regexpAssert(re, strings, subIndex, expectedResult) {
		var match;
		for (var i=0; i<strings.length; i++) {
			match = strings[i].match(re);
			if(match == null) throw new Error("No match for '" + strings[i]);
			if(match[subIndex] != expectedResult) throw new Error("Did not find " + expectedResult + " in " + JSON.stringify(match) + " for string: " + strings[i]);
		}
	},
	
	indexOfZeroWidthCharacter: function indexOfZeroWidthCharacter(str) {
		var zeroWidth = [
			"\u200E", // LEFT-TO-RIGHT MARK 
			"\u200F", // RIGHT-TO-LEFT MARK
			"\u200B", // zero width space
			"\u200C", // zero width non-joiner Unicode code point (https://en.wikipedia.org/wiki/Zero-width_non-joiner)
			"\u200D", // zero width joiner Unicode code point
			"\uFEFF"  // zero width no-break space Unicode code point 
		];
		
		for(var i=0; i<zeroWidth.length; i++) {
			if(str.indexOf(zeroWidth[i]) != -1) return str.indexOf(zeroWidth[i]);
		}
		
		return -1;
	},

	loadCSS: function loadCSS(url) {
		var head  = document.getElementsByTagName('head')[0];
		var link  = document.createElement('link');
		//link.id   = cssId;
		link.rel  = 'stylesheet';
		link.type = 'text/css';
		link.href = url;
		link.media = 'all';
		head.appendChild(link);
	},

	checkBrowser: function checkBrowser(userAgent) {
		var browser = "Unknown browser";
		
		if(!userAgent && typeof navigator != "object") return browser;
		
		if(userAgent == undefined) userAgent = navigator.userAgent;
		
		var c = userAgent.search("Chrome");
		var f = userAgent.search("Firefox");
		var m8 = userAgent.search("MSIE 8.0");
		var m9 = userAgent.search("MSIE 9.0");
		
		var isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
		var isIe = (userAgent.toLowerCase().indexOf("msie") != -1 || userAgent.toLowerCase().indexOf("trident") != -1);
		
		if(isSafari) browser = "Safari";
		else if (c > -1) browser = "Chrome";
		else if (f > -1) browser = "Firefox";
		else if (m9 > -1) browser ="MSIE 9.0";
		else if (m8 > -1) browser ="MSIE 8.0";
		else if(isIe) browser = "MSIE";
		
		return browser;
	},
	
	removeFileColonSlashSlash: function(path) {
		path = path.replace("file://", "");
		if(path.match(/^\/.*:[\/\\]/)) {
			// It's a Windows path, remove all starting slashes
			while(path.charAt(0) == "/") path = path.substr(1);
		}
		
		return path;
		
	},
	
	parseColor: function parseColor(input) {
		// https://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
		var m = input.match(/^#([0-9a-f]{3})$/i);
		if(m) {
			// in three-character format, each value is multiplied by 0x11 to give an
			// even scale from 0x00 to 0xff
			return [
				parseInt(m[1].charAt(0),16)*0x11,
				parseInt(m[1].charAt(1),16)*0x11,
				parseInt(m[1].charAt(2),16)*0x11
			];
		}
		m = input.match(/^#([0-9a-f]{6})$/i);
		if(m) {
			return [
				parseInt(m[1].substr(0,2),16),
				parseInt(m[1].substr(2,2),16),
				parseInt(m[1].substr(4,2),16)
			];
		}
		m = input.match(/^rgb?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if(m) {
			return [
				parseInt(m[1]),
				parseInt(m[2]),
				parseInt(m[3]),
			];
		}
		m = input.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if(m) {
			return [
				parseInt(m[1]),
				parseInt(m[2]),
				parseInt(m[3]),
				parseInt(m[4])
			];
		}
		else throw new Error("Failed to get color from input=" + input + "");
	},
	
	urlProtocol: function urlProtocol(url) {
		var protocolIndex = url.indexOf("://");
		
		if(protocolIndex != -1) return url.slice(0, protocolIndex).toLowerCase();
	
		else return ""; // Probably a local file path (should we return "file" ?)
		
	},
	
	urlHost: function urlHost(url) {
		/*
			googledrive://foo/ => foo
			http://google.com => google.com
			/some/file => ""
		*/
		
		var protocolIndex = url.indexOf("://");
		if(protocolIndex == -1) {
			console.warn("url=" + url + " is not formatted as a URL!");
			return "";
		}
		
		var host = url.slice(protocolIndex+3);
		var slashIndex = host.indexOf("/");
		if(slashIndex == -1) return host;
		
		host = host.slice(0,slashIndex);
		return host;
	},
	
	getLocation: function getLocation(url) {
		
		if(url == undefined) throw new Error("url=" + url);
		
		// From: https://github.com/PxyUp/uri-parse-lib
		
		// todo: Handle file:///C:/Users/Z/somefile.txt
		
		console.log("getLocation url=" + url);
		
        var badCharater = [":", "@", "://"];

		var urlObject = {
            host: "",
            port: "",
            query: {},
            pathname: "",
            protocol: "",
            user: "",
            password: "",
            href: url,
            hash: ""
        };
		
		var protoArray = ["file", "http", "https", "ftp", "ssh", "sftp", "ftps", "chrome-extension", "smb"];
		
        function firstSplit (str, splitter) {
            var array;
            if (str.indexOf(splitter) !== -1) {
                array = [str.substring(0, str.indexOf(splitter)), str.substring(str.indexOf(splitter) + splitter.length)];
                return array;
            }
            return ["", str];
        }
			
        function lastSplit(str, splitter) {
            var array;
            if (str.lastIndexOf(splitter) !== -1) {
                array = [str.substring(str.lastIndexOf(splitter) + splitter.length), str.substring(0, str.lastIndexOf(splitter))];
                return array;
            }
            return ["", str];
        }
			
        function checkerBadCharater(str) {
            for (var index = 0; index < badCharater.length; index++) {
                if (str.indexOf(badCharater[index]) != -1) {
                    return false;
                }
            }
            return true;
        }
			
        function parsing(uri, splitter, flag) {
            if (flag == null) {
                flag = false;
            }
            switch (splitter) {
                case "#":
                    if ((uri.lastIndexOf("#" + lastSplit(uri, splitter)[0]) == uri.length - lastSplit(uri, splitter)[0].length - splitter.length) && (checkerBadCharater(lastSplit(uri, splitter)[0]) == true)) {
                        urlObject.hash = lastSplit(uri, splitter)[0];
                        parsing(lastSplit(uri, splitter)[1], "@");
                    } else {
                        urlObject.hash = null;
                        parsing(uri, "@");
                    }
                    break;
                case "?":
                    urlObject.query = {};
                    lastSplit(uri, splitter)[0].split("&").forEach(function (elem) {
                        var element;
                        element = elem.split("=");
                        if (element[0] !== "") {
                            urlObject.query[element[0]] = element[1];
                        }
                    });
                    parsing(lastSplit(uri, splitter)[1], "/");
                    break;
                case "/":
                    if (firstSplit(uri, splitter)[0] === "") {
                        parsing(firstSplit(uri, splitter)[1], ":", true);
                        urlObject.pathname = "/" + firstSplit(uri, splitter)[0];
                    } else {
                        parsing(firstSplit(uri, splitter)[0], ":", true);
                        urlObject.pathname = "/" + firstSplit(uri, splitter)[1];
                    }
                    break;
                case "://":
                    if (protoArray.indexOf(firstSplit(uri, splitter)[0].toLowerCase()) !== -1) {
                        urlObject.protocol = firstSplit(uri, splitter)[0];
                    } else {
                        urlObject.protocol = null;
                    }
                    parsing(firstSplit(uri, splitter)[1], "#");
                    break;
                case "@":
                    if (lastSplit(uri, splitter)[0] !== "") {
                        parsing(lastSplit(uri, splitter)[1], ":");
                        parsing(lastSplit(uri, splitter)[0], "?");
                    } else {
                        parsing(lastSplit(uri, splitter)[1], "?");
                    }
                    break;
                case ":":
                    if (flag) {
                        if (firstSplit(uri, splitter)[0] === "") {
                            urlObject.host = firstSplit(uri, splitter)[1];
                        } else {
                            urlObject.host = firstSplit(uri, splitter)[0];
                            urlObject.port = firstSplit(uri, splitter)[1];
                        }
                    } else {
                        if (firstSplit(uri, splitter)[0] === "") {
                            urlObject.user = firstSplit(uri, splitter)[1];
                        } else {
                            urlObject.user = firstSplit(uri, splitter)[0];
                            urlObject.password = firstSplit(uri, splitter)[1];
                        }
                    }
                    break;
            }
        };
        parsing(url, "://");
        urlObject.origin = (urlObject.protocol !== "" ? urlObject.protocol + "://" : "") + urlObject.host + (urlObject.port !== "" ? ":" + urlObject.port : "");
		
		if(urlObject.port && urlObject.host) urlObject.host += ":" + urlObject.port; // host should include the port, to be the same as the browser's window.location.host
		
		
		return urlObject;


		/* Can not find user:name@ auth
		var match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
		return match && {
			protocol: match[1],
			host: match[2],
			hostname: match[3],
			port: match[4],
			pathname: match[5],
			search: match[6],
			hash: match[7]
		}
		*/
	},

	byteLength: function byteLength(str) {
		// returns the byte length of an utf8 string (1 byte is 8 bit)
		var s = str.length;
		for (var i=str.length-1; i>=0; i--) {
			var code = str.charCodeAt(i);
			if (code > 0x7f && code <= 0x7ff) s++;
			else if (code > 0x7ff && code <= 0xffff) s+=2;
			if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
		}
		return s;
	},
	
	shortString: function shortString(stringOrObject, limit) {
		// Returns a string with max limit characters. Useful for debugging
		if(limit == undefined) limit = 512;
		
		var str = (typeof stringOrObject == "object") ? JSON.stringify(stringOrObject) : stringOrObject;
		
		if(str.length > limit) str = str.substr(0,limit) + " ... (" + str.length + " characters)";
		
		return str;
	},
	timeStampCounter: 0,
	timeStamp: function timeStamp() {
		// For measuring the order of things
		return (new Date()).getTime() + "-" + (++this.timeStampCounter);
	},
	
	setCookie: function setCookie(name,value,days) {
		var expires = "";
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days*24*60*60*1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = name + "=" + (value || "")  + expires + "; path=/";
	},
	getCookie: function getCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	},
	
	urlFriendly: function urlFriendly(str) {
		
		str = str.toLowerCase()
		
		str = str.replace(/å|ä|ã|â/g, "a");
		str = str.replace(/ö|ô|ø/g, "o");
		str = str.replace(/œ/g, "ae");
		
		str = str.replace(/[^a-z0-9]/g,'');
		
		return str;
	},
	
	makeColorTransparent: function makeTransparent(colorString, transpLvl) {
		// Take a rgb color and make it transparent rgba
		var useTranspLvl;
		
		if(transpLvl < 10) {
			useTranspLvl = "0" + transpLvl;
		}
		else {
			useTranspLvl = transpLvl;
		}
		
		if(colorString.substr(0, 4) == "rgb(") {
			return "rgba(" + colorString.substring(4, colorString.indexOf(")")) + ", 0." + useTranspLvl + ")";
		}
		else {
			console.warn("Unknown color: " + colorString);
			return "rgba(255,0,0, 0.5)";
		}
	},
	
	hash: function hash(str) {
		// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
		var hash = 0;
		if (str.length == 0) {
			return hash;
		}
		for (var i = 0; i < str.length; i++) {
			var char = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}
	
}

// Try catch threw an exception in Opera Mobile using Dragonly debugger
if(typeof module != "undefined") {
	if(module.hasOwnProperty("exports")) module.exports = UTIL;
}

