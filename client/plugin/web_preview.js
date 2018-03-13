
(function() {
	
	/*
		
		Currently assuming we are only previewing one website at a time!
		
	*/
	
	"use strict";
	
	var menuItem;
	var inPreview;
	var previewWin;
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
			
			if(previewWin) previewWin.close();
			
		}
	});
	
	function maybeShowPreviewInMenu() {
		
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!file.path.match(/html?$/i)) return true;
		
		menuItem = EDITOR.addTempMenuItem("Web Preview", webPreview);
		
		if(inPreview) EDITOR.updateMenuItem(menuItem, true);
		
	}
	
	function webPreview() {
		
		var file = EDITOR.currentFile;
		if(!file) return true;
		
		if(inPreview && theWindow) {
			// Attempt to close it
			theWindow.close();
			EDITOR.updateMenuItem(menuItem, false);
			return;
		}
		
		EDITOR.hideMenu();
		
		inPreview = file;
		
		theWindow = EDITOR.createWindow();
		
		theWindow.onerror = function() {
			alert("theWindow.onerror:", err);
		};
		
		theWindow.addEventListener("load", function() {
			//alertBox("It loaded!");
			console.log("preview window loaded!");
		}, false);
			
		theWindow.addEventListener("error", function(err) {
			alertBox("Window error!", err);
			
		}, false);
		
			folder = UTIL.getDirectoryFromPath(inPreview.path);
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
				var url = urlPath + UTIL.getFilenameFromPath(inPreview.path);
				
				
				var onlyPreview = true;
				var bodyTag = undefined;
				previewWin = new WysiwygEditor({
					sourceFile: inPreview, 
					bodyTagSource: bodyTag, 
					onlyPreview: onlyPreview, 
				newWindow: theWindow, 
					url: url, 
					whenLoaded: whenLoaded,
				onErrorEvent: captureError
				});
				
			previewWin.onClose = function() {
					CLIENT.cmd("stop_serve", {folder: folder}, function httpServerStopped(err, json) {
						if(err) throw err;
						inPreview = undefined;
						previewWin = undefined;
					});
				}
				
			});
		}
	
	
	function whenLoaded(file, win) {
		
		// Override the console log of the preview window and display the messages as info
		consoleLogOriginal = theWindow.window.console.log;
		theWindow.window.console.log = captureConsoleLog;
		theWindow.window.console.warn = captureConsoleLog;
		theWindow.window.console.error = function(err) {
			alertBox("theWindow.window.console.error:", err);
		};
		
	}
	
	function captureError(errorEvent) {
		
		var message = errorEvent.message;
		var source = errorEvent.filename;
		var lineno = errorEvent.lineno;
		var colno = errorEvent.colno;
		var error = errorEvent.error;
		
		//alertBox(message + " line=" + lineno);
		
		if(!lineno) {
			return console.warn("No linenno!");
		}
		
		console.log("Web preview error: source=" + source + " lineno=" + lineno + " message=" + message + " urlPath=" + urlPath + " folder=" + folder);
		
		var filePath = folder + source.replace(urlPath, "");
		var file = EDITOR.files[filePath];
		
		if(!file) {
			var sourceLink = '<a href="JavaScript: EDITOR.openFile(\'' + filePath + '\', undefined, function(err, file) {\
			if(err) alertBox(err.message); else file.gotoLine(' + lineno + ');\
			EDITOR.renderNeeded();})">' + source + "</a>";
			var lineString = ":<b>" + lineno + "</b><br>";
			alertBox(sourceLink + lineString + message);
		}
		else {
			
			var row = lineno-1;
			if(file.grid.length <= row) throw new Error("row=" + row + " outside the file.grid.length=" + file.grid.length + " for file.path=" + file.path + " source=" + source);
			var col = colno ? colno - file.grid[row].indentationCharacters : 0;
			if(EDITOR.currentFile != file && !switchedDebugSourceFile) {
					EDITOR.showFile(file);
					switchedDebugSourceFile = true;
				}
			else console.log("(EDITOR.currentFile == file)=" + (EDITOR.currentFile == file) + " switchedDebugSourceFile=" + switchedDebugSourceFile);
				
			if(EDITOR.currentFile == file) file.scrollToLine(lineno);
			
				EDITOR.addInfo(row, col, message, file, 1);
				
				
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
		
		console.log("Captured console.log: " + msg);
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
		
		//console.log("inPreview=" + !!inPreview + " previewWin=" + !!previewWin);
		
		if(!inPreview || !previewWin) return true;
		
		var fileName = UTIL.getFilenameFromPath(fileSaved.path);
		
		var reStyle = new RegExp('<link.*href=.*' + fileName, "i");
		var reScript = new RegExp('<script.*src=".*' + fileName, "i");
		
		//console.log("style?" + !!inPreview.text.match(reStyle) + " script?" + !!inPreview.text.match(reScript));
		
		if(!inPreview.text.match(reStyle) && !inPreview.text.match(reScript) && fileSaved != inPreview) return true;
		
		theWindow.window.addEventListener("load", function() {
			alertBox("MOhaha loaded!");
		});
		/*
			Doesn't seem to be any way to add a load event ...
			if whenLoaded is fired too early, the window will get overwritten
			if it's fired too late we won't capture any errors or console.log's during the loading of the page!
		*/
		
		var interval = setInterval(function() {
			if(theWindow.window.console.log != captureConsoleLog) {
				// When console.log no longer point to captureConsoleLog it means the window has reloaded!
				console.log("web preview window reloaded!");
				clearInterval(interval);
				clearTimeout(timeout);
				whenLoaded();
			}
			else console.log("web preview window not yet reloaded!");
			
		}, 1);
		
		var timeout = setTimeout(function() {
			clearInterval(interval);
			if(theWindow.window.console.log != captureConsoleLog) throw new Error("Failed to attach error and console.log integration");
		}, 150);
		
		var noContenEditable = false;
		previewWin.reload(noContenEditable);
		
		switchedDebugSourceFile = false;
		
		//setTimeout(whenLoaded, 0);
		//whenLoaded();
	}
	
	function webPreviewAutocomplete(file, word, wordLength, gotOptions) {
		console.log("webPreviewAutocomplete: word=" + word + " previewWin?" + (!!previewWin) + " wordLength=" + wordLength);
		// Auto complete global variables
		if(!previewWin) return;
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
			previewWin = null;
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
