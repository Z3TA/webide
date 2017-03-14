/*

	This file contains useful (utility) functions
	
	All file paths should handle URL's ex: ftp://hostname:21/folder1/folder2
	Always add a trailing slash after folder paths
*/

"use strict";

var UTIL = {

	toSystemPathDelimiters: function toSystemPathDelimiters(path) {
		
		// Makes sure the path uses the right path delimiters ...
		
		var delimiter = UTIL.getPathDelimiter(EDITOR.workingDirectory);
		
		console.log("delimiter=" + delimiter);
		console.log("path=" + path);
				
		path = path.replace(/\//g, delimiter);
		path = path.replace(/\\/g, delimiter);
		
		console.log("path=" + path);
		
		return path;
				
	},

	trailingSlash: function trailingSlash(folderPath) {
		// Makes sure the folder has a trailing slash
		console.log("Get trailing slash for folderPath=" + folderPath);
		var delimiter = UTIL.getPathDelimiter(folderPath);
		var lastCharacter = folderPath.substr(folderPath.length-1, 1);
		if(lastCharacter != delimiter) {
			folderPath += delimiter;
			console.log("Added trailing slash to path=" + folderPath);
		}
		return folderPath;
	},

	getDirectoryFromPath: function getDirectoryFromPath(path) {
		/*
			Returns the directory of a file path
			If no path is specified it uses current file or working directory
			
			todo: replace EDITOR.getDir
		*/
		
		console.log("getDir path=" + path);
		
		if(path == undefined) {
			if(EDITOR.currentFile) path = EDITOR.currentFile.path;
			else return UTIL.trailingSlash(EDITOR.workingDirectory); // (editor) working dir
		}
		
		if(!path) throw new Error("Unable to get directory from path=" + path);
		
		var lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
		
		if(lastSlash == -1) {
			console.warn("Unable to get directory of path=" + path + ". Using EDITOR.workingDirectory=" + EDITOR.workingDirectory);
			return UTIL.trailingSlash(EDITOR.workingDirectory);
		}
		
		return UTIL.trailingSlash(path.substring(0, lastSlash));
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
		
		fullPath = fullPath.trim(); // Remove white space before and after
		
		var lastChar = fullPath.substr(fullPath.length-1);
		
		if(lastChar != "/" && lastChar != "\\") {
			// Check if the path contains a file, and remove it
			console.log("lastChar=" + lastChar + " fullPath=" + fullPath);
			var delimiter = UTIL.getPathDelimiter(fullPath);
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
			
			if(protocol) protocol = protocol.toLowerCase();
			
			console.log("protocol=" + protocol);
			
			if(EDITOR.remoteProtocols.indexOf(protocol) == -1) {
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
	},


	getPathDelimiter: function getPathDelimiter(path) {
		// Returns the delimiter character used for separating directories in a file-path or url
		
		// Use working directory if there's no path
		if(!path && EDITOR.workingDirectory) path = EDITOR.workingDirectory;
		
	
		if(!path) {
			console.warn("Unable to determine path delimiter. Slash / will be used! path=" + path);
			return "/";
		}
		
		var lastChar = path.substring(path.length-1);
		
		if(lastChar == "/" || lastChar == "\\") return lastChar;
		else {
			if(path.indexOf("/") != -1) return "/";
			else if(path.indexOf("\\") != -1) return "\\";
			else throw new Error("Unable to determine file path folder separator/delimiter of path=" + path);
		}
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
			console.log("Original text last " + lbOriginalText.length + " chars are not a line break: " + UTIL.lbChars(lastCharactersOriginalText));
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
		
		if(text.length == 0) {
			console.warn("Can't determine line breaks without any text!");
			return EDITOR.settings.defaultLineBreakCharacter;
		}
		
		var nr = UTIL.occurrences(text, "\n\r", true),
		rn = UTIL.occurrences(text, "\r\n", true)
		
		console.log("Line break? nr=" + nr + " rn=" + rn + "");
		
		if(rn > nr) {
			console.log("Using CRLF");
			return "\r\n";
		}
		else if(nr > rn) {
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
		for(var p in o) {
			console.log(p + "=" + o[p]);
		}
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
		if(path.indexOf("/") > -1) {
			return path.substr(path.lastIndexOf('/')+1);
		}
		else {
			// Assume \ is the folder separator
			return path.substr(path.lastIndexOf('\\')+1);
		}
	},



	isFilePath: function isFilePath(filePath) {
		if(runtime == "browser") {
			if(linuxPathValidation(filePath)) return true
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
		return filePath.substr((~-filePath.lastIndexOf(".") >>> 0) + 2);
	},

	isFolderPath: function isFolderPath(path) {
		var fs = require("fs");
		try {
			var stat = fs.lstatSync(path);
			return stat.isDirectory();
		}
		catch(e) {
			return false;
		}
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


	httpPost: function httpPost(urlStr, form, callback) {
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
			console.log('problem with request: ' + e.message);
			callback(null, e);
		});
		// post the data
		post_req.write(post_data);
		post_req.end();
		
	},

	httpGet: function httpGet(url, callback) {
		var xmlHttp = new XMLHttpRequest();
		var timeoutTimer;
		var timeoutTimeMs = 3000;
		
		//console.log("url=" + url);
		
		xmlHttp.onreadystatechange = function httpReadyStateChange() {
			if(xmlHttp.readyState == 4) {
				clearTimeout(timeoutTimer);
				if(xmlHttp.status == 200) callback(null, xmlHttp.responseText);
				else {
					var err = new Error(xmlHttp.responseText + " xmlHttp.status=" + xmlHttp.status + " xmlHttp.readyState=" + xmlHttp.readyState);
					err.CODE = xmlHttp.status;
					callback(err);
				}
			}
			//else console.log("xmlHttp.readyState=" + xmlHttp.readyState);
		}
		
		xmlHttp.open("GET", url, true); // true for asynchronous
		xmlHttp.send(null);
		
		timeoutTimer = setTimeout(timeout, timeoutTimeMs);
		
		function timeout() {
			var err = new Error("HTTP request timed out. xmlHttp.readyState=" + xmlHttp.readyState);
			xmlHttp.onreadystatechange = null;
			xmlHttp.abort();
			callback(err);
		}
	},


	spacePad: function spacePad(str, padLength) {
		
		if(padLength == undefined) padLength = 42;
		
		var left = padLength - str.length;
		if (left < 0) return str; // Return early if no padding is needed
		
		var padding = "";
		for(var i=0; i<left; i++) padding += " ";
		return str + padding;
	},

	makePathAbsolute: function makePathAbsolute(path) {
		if(path.match(/^.*:\/\//) == null) { // It's already absolute if it starts with a protocol, like ftp://
			var fspath = require("path");
			if(!fspath.isAbsolute(path)) {
				let absolutePath = fspath.resolve(path);
				console.warn("Making path absolute: " + path + " ==> " + absolutePath);
				path = absolutePath; // Make the path absolute
			}
		}
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

	checkBrowser: function checkBrowser() {
		var c = navigator.userAgent.search("Chrome");
		var f = navigator.userAgent.search("Firefox");
		var m8 = navigator.userAgent.search("MSIE 8.0");
		var m9 = navigator.userAgent.search("MSIE 9.0");
		var browser = "Unknown";
		
		if (c > -1) {
			browser = "Chrome";
		} else if (f > -1) {
			browser = "Firefox";
		} else if (m9 > -1) {
			browser ="MSIE 9.0";
		} else if (m8 > -1) {
			browser ="MSIE 8.0";
		}
		return browser;
	}

}

try {
	module.exports = UTIL;
}
catch(err) {
	// We are in a browser
}
