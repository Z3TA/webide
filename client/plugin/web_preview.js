
(function() {
	
	/*
		
		Currently assuming we are only previewing one website at a time!
		
	*/
	
	"use strict";
	
	var menuItem;
	var inPreviewFile;
	var theWindow;
	var urlPath;
	var folder;
	var consoleLogOriginal;
	var switchedDebugSourceFile = false; // Prevent switching file more then once when showing errors in the source file
	
	EDITOR.plugin({
		desc: "Preview HTML files",
		load: function loadWebPreview() {
			//menuItem = EDITOR.addMenuItem("Preview HTML", webPreview);
			EDITOR.on("showMenu", maybeShowPreviewInMenu);
			EDITOR.on("fileSave", refreshMaybe);
			var order = 1;
			EDITOR.on("autoComplete", webPreviewAutocomplete, order);
			
		},
		unload: function unloadWebPreview() {
			//EDITOR.removeMenuItem(menuItem);
			EDITOR.removeEvent("showMenu", maybeShowPreviewInMenu);
			EDITOR.removeEvent("fileSave", refreshMaybe);
			
			if(theWindow) theWindow.close();
			
		}
	});
	
	function maybeShowPreviewInMenu() {
		
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!file.path.match(/html?$/i)) return true;
		
		menuItem = EDITOR.addTempMenuItem("Web Preview", webPreview);
		
		if(inPreviewFile) EDITOR.updateMenuItem(menuItem, true);
		
	}
	
	function webPreview() {
		
		var file = EDITOR.currentFile;
		if(!file) return console.warn("Unable to run preview: No file open!");
		
		if(inPreviewFile || theWindow) {
			console.log("Attempt to close preview window ....");
			theWindow.close();
			EDITOR.updateMenuItem(menuItem, false);
			inPreviewFile = null;
			theWindow = null;
			return;
		}
		
		EDITOR.hideMenu();
		
		openPreviewWindow(file);
		
	}
	
	function openPreviewWindow(file) {
		if(theWindow) theWindow.close(); // Close the old window
		
		inPreviewFile = file;
		
		//if(!theWindow) return alertBox("Failed to open a new window!");
		
		folder = UTIL.getDirectoryFromPath(inPreviewFile.path);
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
			
			if(err) throw err;
			
			console.log("Serve URL=" + json.url);
			
			urlPath = json.url;
			
			// HTTP serve gives the URL without protocol !?
			var reHttp = /^http(s?):/i;
			if(!urlPath.match(reHttp)) {
				if(window.location.protocol.match(reHttp)) {
					urlPath = window.location.protocol + "//" + urlPath;
				}
				else urlPath = "http://" + urlPath;
			}
			var url = urlPath + UTIL.getFilenameFromPath(inPreviewFile.path);
			
			EDITOR.createWindow({url: url}, windowCreated);
			
			function windowCreated(err, newWindow) {
				
				if(err) return alertBox(err.message);
				
				theWindow = newWindow;
				
				theWindow.addEventListener("error", captureError);
				
				// Override the console log of the preview window and display the messages as info
				consoleLogOriginal = theWindow.window.console.log;
				theWindow.window.console.log = captureConsoleLog;
				theWindow.window.console.warn = captureConsoleLog;
				theWindow.window.console.error = function(err) {
					alertBox("theWindow.window.console.error:" + err);
				};
				
				theWindow.addEventListener("load", function(loadEvent) {
					console.log("preview window loaded!");
				}, false);
				
				console.log(new Date().getTime());
				console.log("Error and console.log capture functions attached!");
				
				
				/*
					var onlyPreview = true;
					var bodyTag = undefined;
					wEditor = new WysiwygEditor({
					sourceFile: inPreviewFile,
					bodyTagSource: bodyTag,
					onlyPreview: onlyPreview,
					newWindow: theWindow,
					url: url,
					whenLoaded: whenLoaded,
					onErrorEvent: captureError
					});
					
					wEditor.onClose = function() {
					CLIENT.cmd("stop_serve", {folder: folder}, function httpServerStopped(err, json) {
					if(err) throw err;
					inPreviewFile = undefined;
					wEditor = undefined;
					});
					}
				*/
			}
		});
	}
	
	function captureError(errorEvent) {
		
		var message = errorEvent.message;
		var source = errorEvent.filename;
		var lineno = errorEvent.lineno;
		var colno = errorEvent.colno;
		var error = errorEvent.error;
		
		console.log("Captured error: message=" + message + " line=" + lineno);
		
		if(!lineno) {
			return console.warn("No linenno!");
		}
		
		console.log(errorEvent);
		
		console.log("Web preview error: source=" + source + " lineno=" + lineno + " message=" + message + 
		" urlPath=" + urlPath + " folder=" + folder + " stack=" + errorEvent.stack);
		
		
		var filePath = folder + source.replace(urlPath, "");
		var file = EDITOR.files[filePath];
		
		if(file) {
			var row = lineno-1;
			if(file.grid.length <= row) throw new Error("row=" + row + " outside the file.grid.length=" + file.grid.length + " for file.path=" + file.path + " source=" + source);
			var col = colno ? colno - file.grid[row].indentationCharacters : 0;
			if(EDITOR.currentFile != file && !switchedDebugSourceFile) {
				EDITOR.showFile(file);
				switchedDebugSourceFile = true;
			}
			else console.log("(EDITOR.currentFile == file)=" + (EDITOR.currentFile == file) + " switchedDebugSourceFile=" + switchedDebugSourceFile);
			
			if(EDITOR.currentFile == file) file.scrollToLine(lineno);
			else EDITOR.showFile(file);
			
			EDITOR.addInfo(row, col, message, file, 1);
		}
		else { // The file is not opened
			var sourceLink = 'Detected error in: <a href="JavaScript: EDITOR.openFile(\'' + filePath + '\', undefined, function(err, file) {\
			if(err) alertBox(err.message); else file.gotoLine(' + lineno + ');\
			EDITOR.renderNeeded();})">' + filePath + ":" + lineno + "</a>";
			alertBox(sourceLink + "\n\n" + message + "");
			}
		}
	
	function captureConsoleLog() {
		// Console log takes many arguments and concatenates them
		var msg = "";
		for (var i=0; i<arguments.length; i++) {
			if(typeof arguments[i] == "string") msg = msg + " " + arguments[i];
			else if(typeof arguments[i] == "object") {
				var stringifyError = false;
				try {
					var jsonStr = JSON.stringify(arguments[i]);
				}
				catch(err) {
					stringifyError = true;
				}
				if(stringifyError) {
					msg = msg + " " + arguments[i].toString();
				}
				else msg = msg + " " + jsonStr;
			}
			else {
				msg = msg + " " + arguments[i].toString();
			}
		}
		if(msg.length > 1) msg = msg.slice(1, msg.length); // Remove the first space
		
		//consoleLogOriginal(msg);
		consoleLogOriginal.apply(undefined, arguments);
		
		console.log("Captured console.log (" + arguments.length + " argument(s)): " + msg);
		// Figure out what script made the log
		/*
			Error
			at console.theWindow.window.console.log (http://192.168.0.3:8080/plugin/web_preview.js:67:17)
			at HTMLHeadingElement.h.onclick (http://192.168.0.3:8080/wpmym3uyoq/welcome.html:13:13)
			
			
		*/
		var stack = (new Error("")).stack;
		var arrStack = stack.split("\n");
		var stackLineWithFile;
		for (var i=0, index = 0; i<arrStack.length; i++) {
			// at console.captureConsoleLog
			// 
			index = arrStack[i].trim().indexOf("at console.captureConsoleLog"); // Chrome
			if(index == -1) index = arrStack[i].indexOf("captureConsoleLog@"); // Firefox
			
				console.log("index=" + index);
				if(index != -1) {
					stackLineWithFile = arrStack[i+1];
					break;
				}
			}
		
		if(stackLineWithFile) {
			
			var reFile = new RegExp("\\(?" + urlPath + "(.*):(\\d*):(\\d*)\\)?");
			console.log(reFile);
			console.log(stackLineWithFile);
			var matchFile = stackLineWithFile.match(reFile);
			if(!matchFile) throw new Error("Could not get file info from stackLineWithFile=" + stackLineWithFile);
			console.log(matchFile);
			var filePath = folder + matchFile[1];
			var row = parseInt(matchFile[2])-1;
			var col = parseInt(matchFile[3]);
			console.log("filePath=" + filePath);
			
			
			if(!EDITOR.files.hasOwnProperty(filePath)) return console.log("File not opened in the editor: " + filePath);
			
			var file = EDITOR.files[filePath];
				//if(file != EDITOR.currentFile) return console.log("File is not in view: " + filePath);
				
			//if(!(row >= file.startRow && row <= (file.startRow+EDITOR.view.visibleRows))) return console.log("The row is not in veiw: row=" + row + " file.startRow=" + file.startRow + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
			
			col = col - file.grid[row].indentationCharacters.length;
						if(col < 0) { // Sanity check
							throw new Error("col=" + col + " file.grid[" + row + "].indentationCharacters=" + UTIL.lbChars(file.grid[row].indentationCharacters) +
							" (" + file.grid[row].indentationCharacters.length + ")");
						}
						var rowText = file.rowText(row);
						var matchText = rowText.match(/console.log ?\( ?(['"`]?)(.*)\1\)/);
						if(!matchText) throw new Error("Unabled to find console.log on line=" + (row+1) + " in " + file.path + " matchText=" + matchText + " rowText=" + rowText + "");
						var quote = matchText[1];
						var logText = matchText[2];
						
						/*
							// Trying to do something fancy like displaying the values ontop of the variables
							
							var jsdiff = JsDiff ? JsDiff : require('diff');
							var diff = jsdiff.diffChars(logText, msg);
							console.log(diff);
							var tot = 0;
							var removedLength = 0;
							var addedLength = 0;
							for (var i=0; i<.diff.length; i++) {
							if(diff[i].added) addedLength += diff[i].count;
							else if(diff[i].removed) removedLength++;
							else {
							
							}
							}
						*/
						
						EDITOR.addInfo(row, col, msg, file);
						
		}
		else throw new Error("Did not find the file location in stack=" + stack);
		
		
	}
	
	function refreshMaybe(fileSaved) {
		
		//console.log("inPreviewFile=" + !!inPreviewFile + " theWindow=" + !!theWindow);
		
		if(!inPreviewFile || !theWindow) return true;
		
		var fileName = UTIL.getFilenameFromPath(fileSaved.path);
		
		var reStyle = new RegExp('<link.*href=.*' + fileName, "i");
		var reScript = new RegExp('<script.*src=".*' + fileName, "i");
		
		//console.log("style?" + !!inPreviewFile.text.match(reStyle) + " script?" + !!inPreviewFile.text.match(reScript));
		
		if(!inPreviewFile.text.match(reStyle) && !inPreviewFile.text.match(reScript) && fileSaved != inPreviewFile) return true;
		
		if(!theWindow || !theWindow.window) {
console.warn("Unable to access theWindow.window=" + theWindow.window);
			// Likely cause: The window has been closed
			theWindow = null;
			inPreviewFile = null;
			return true;
		}
		
		openPreviewWindow(inPreviewFile); // Close and re-open
		
		switchedDebugSourceFile = false;
		
	}
	
	function webPreviewAutocomplete(file, word, wordLength, gotOptions) {
		console.log("webPreviewAutocomplete: word=" + word + " theWindow?" + (!!theWindow) + " wordLength=" + wordLength);
		// Auto complete global variables
		if(!theWindow) return;
		if(wordLength == 0) return;
		
		// todo: Check if file has anything to do with the web page in preview (eg a script)
		
		var options = [];
		
		console.log("dingdong");
		
		var words = word.split(".");
		var obj = theWindow.window;
		var before = "";
		for (var i=0; i<words.length-1; i++) {
			before += words[i] + ".";
			console.log("before=" + before);
			obj = obj[words[i]];
			if(!obj) {
				console.log("Object does not exist: " + before);
				return;
			}
		}
		
		console.log(obj);
		
		if(obj == null) {
			console.warn("Unable to get window object. Has the window been closed!?");
			theWindow = null;
			return;
		}
		
		var names = [];
		
		var beforeNoDot = before.slice(0,-1);
		
		if(typeof Object.getOwnPropertyNames != "undefined") {
			console.log("Object.getOwnPropertyNames(" + beforeNoDot + ")");
			addNamesFromArray(Object.getOwnPropertyNames(obj));
		} else console.warn("Object.getOwnPropertyNames not supported by your browser!");
		
		if(typeof Object.keys == "undefined") console.warn("Object.keys not supported by your browser!");
		else if(typeof obj.__proto__ == "undefined") console.warn("obj.__proto__ not supported by your browser!");
		else {
			console.log("Object.keys(" + beforeNoDot + ".__proto__)");
			addNamesFromArray(Object.keys(obj.__proto__));
		}
		
		if(typeof Object.getPrototypeOf != "undefined") {
			console.log("Object.getPrototypeOf(" + beforeNoDot + "))");
			addNamesFromObject(Object.getPrototypeOf(obj));
			
			if(typeof obj.__proto__ == "undefined") console.warn("obj.__proto__ not supported by your browser!");
			else {
				console.log("Object.getPrototypeOf(" + beforeNoDot + ".__proto__)");
				addNamesFromObject(Object.getPrototypeOf(obj.__proto__));
			}
		} else console.warn("Object.getPrototypeOf not supported by your browser!");
		
		
		var nameLength = wordLength - before.length;
		var lookFor = word.slice(before.length);
		for(var i=0; i<names.length; i++) {
			console.log(names[i].slice(0,nameLength) + "=" + lookFor + " ? name=" + names[i]);
			if(names[i].slice(0,nameLength) == lookFor) {
				if(typeof obj[names[i]] == "function") options.push([before + names[i] + "()", 1, args(obj[names[i]])]);
				else options.push(before + names[i]);
			}
		}
		
		console.log("Found " + options.length + " results: " + JSON.stringify(options));
		
		return options;
		
		function addNamesFromArray(arr) {
			var dup = 0;
			for (var i=0; i<arr.length; i++) {
				if(names.indexOf(arr[i]) == -1) names.push(arr[i]);
				else dup++;
			}
			console.log("Added " + (arr.length-dup) + " of " + arr.length + " properties");
		}
		
		function addNamesFromObject(obj) {
			var dup = 0;
			var tot = 0;
			for (var name in obj) {
				tot++;
				if(names.indexOf(name) == -1) names.push(name);
				else dup++;
			}
			console.log("Added " + (tot-dup) + " of " + tot + " properties");
		}
		
		
		function args(func) {
			return (func + '')
			.replace(/[/][/].*$/mg,'') // strip single-line comments
			.replace(/\s+/g, '') // strip white space
			.replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
			.split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
			.replace(/=[^,]+/g, '') // strip any ES6 defaults
			.split(',').filter(Boolean); // split & filter [""]
		}
		
	}
	
})();
