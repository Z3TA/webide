/*
	This file should load first (after settings.js)!
	
	The reason why we use console.error() instead of throw is that nw.js will continue even if we throw.
	You can also not overwrite the throw functions! Check plugin/devmode.js
	
*/

"use strict";


// Global constants
const SHIFT = 1;
const CTRL = 2;
const ALT = 4;


// sugg: Maybe this global object should be part of the editor object!?

global.render = false;   // Internal flag, use editor.renderNeeded() to re-render!
global.resize = false;   // Internal flag, use editor.resizeNeeded() to re-size!
global.fileIndex = -1;   // Keep track on opened files (for undo/redo)
global.keyBindings = []; // Push objects {char, charCode, combo dir, fun} for key events, more info in docs.
global.files = {};       // List of all opened files with the path as key
global.mouseX = 0;       // Current mouse position
global.mouseY = 0;
global.info = [];        // Talk bubbles. See editor.addInfo()

global.eventListeners = { // Use editor.on to add listeners to these events:
	fileClose: [], 
	fileLoad: [], 
	fileHide: [],
	fileShow: [],
	edit: [], 
	caret: [], // Not currently used!
	scroll: [], 
	mouseClick: [], 
	mouseMove: [],
	paste: [],
	beforeResize: [],
	afterResize: [],
	saved: [],
	exit: [],
	start: [],
	fileParse: [],
	interaction: [],
	keyDown: [],
	moveCaret: [],
	autoComplete: []
};

global.renders = [];
global.preRenders = [];

global.view = {
	visibleColumns: 0, 
	visibleRows: 0, 
	canvasWidth: 0,
	canvasHeight: 0,
	startingColumn: 0,
	endingColumn: 0
};

global.currentFile = undefined // text, grid, etc
	


/*
	The editor object lives in global scope, so that it can be accessed and extended from everywhere.
	Feel free to add more editor methods here though!
	
	To make it more fun to write plugins, the editor and File object should take care of the
	"low level" stuff and heavy lifting. 
	
*/
var editor = {};




/* Added to global scope as a utility function */
function functionName(fun) {
	var ret = fun.toString();
	ret = ret.substr('function '.length);
	ret = ret.substr(0, ret.indexOf('('));
	return ret;
}

function occurrences(string, subString, allowOverlapping){
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


function functionName(fun) {
	var ret = fun.toString();
	ret = ret.substr('function '.length);
	ret = ret.substr(0, ret.indexOf('('));
	return ret;
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
	var typeOf = typeof content;
	var instanceofString = (content instanceof String);
	var objectToString = Object.prototype.toString.call(text);
	
	
	if(typeOf != string && !instanceofString && objectToString != objectString) {
		console.log("typeOf=" + typeOf);
		console.log("objectToString=" + objectToString);
	}
	return typeOf == string || instanceofString || objectToString == objectString;

}



// Non global editor code ...
(function() {
	
	// These variables are private ...
	
	var isIe = (navigator.userAgent.toLowerCase().indexOf("msie") != -1 || navigator.userAgent.toLowerCase().indexOf("trident") != -1);

	
	// Load native UI library
	var gui = require('nw.gui'); //or global.window.nwDispatcher.requireNwGui() (see https://github.com/rogerwang/node-webkit/issues/707)

	// Get the current window
	var win = gui.Window.get();
	
	var executeOnNextInteraction = [];
	
	
	// Editor functionality (accessible from global scope) By having this code here, we can use private variables

	editor.workingDirectory = process.cwd();

	editor.getFilenameFromPath = function(path) {
		if(path.indexOf("/") > -1) {
			return path.substr(path.lastIndexOf('/')+1);
		}
		else {
			// Assume \ is the folder separator
			return path.substr(path.lastIndexOf('\\')+1);
		}
	}


	editor.openFile = function(path, text, callback) {
		/*
			Note: The caller of this function needs to handle file state, 
			such as file.isSaved, file.savedAs and file.changed
			Unless text==undefined, then it will be opened from disk and asumed saved.
			
		*/
		
		console.log("Opening file: " + path);
		
		// Check if the file is already oepned
		if(global.files.hasOwnProperty(path)) {
				console.warn("File already opened: " + path);
				if(global.currentFile) {
				if(global.currentFile.path != path) {
					// Switch to it:
						global.currentFile.hide();
					global.currentFile = global.files[path];
					global.currentFile.show();
						}
			}
			return;
					}
				
		if(!isString(path)) console.error(new Error("path is not a string: " + path));
		
		if(text == undefined) {
			console.warn("Text is undefined! Reading file from disk: " + path)
			editor.readFromDisk(path, load);
		}
		else {
		
			if(!isString(text)) {
				console.log("text=" + text);
				console.error(new Error("text is not a string!"));
			}
			else {
				load(path, text);
			}
			
		}
		
		function load(path, text) {
			console.log("Loading file to editor: " + path);
			global.files[path] = new File(text, path, global.fileIndex++);
			
			var file = global.files[path];
			
			// Because we opened it from disk:
			file.isSaved = true;
			file.savedAs = true;
			file.changed = false;
			
			if(global.currentFile) {
				global.currentFile.hide();
			}
			
			// Switch to this file
			global.currentFile = file; 
			
			/* We might want to change some state before file open events get fired, 
			so call the callback before file.open()
			
			used by: file.open to set saved to true
			*/	
			if(callback) callback(file);

			file.open(); // in turn calls file.load() witch fire file-load events
			
			// Always resize and render after opening a file! (where, when????)
		}
		
	}

	editor.closeFile = function(path) {
		
		if(!global.files.hasOwnProperty(path)) {
			throw new Error("Can't close file that is not open: " + path);
		}
		else {
			
			var file = global.files[path];
			
			if(global.currentFile == file) global.currentFile = null;
			
			delete global.files[file.path];
			
			// Call listeners
			for(var i=0; i<global.eventListeners.fileClose.length; i++) {
				global.eventListeners.fileClose[i].fun(file); // Call function
			}
						
			file.close();
			
			editor.renderNeeded();
			//editor.resizeNeeded();
		}
	}
	

	editor.readFileSync = function(path) {
		
		console.log("Reading file syncroniously from disk: " + path);
		
		try {
			var content = fs.readFileSync(path, {encoding: "utf8"});
		}
		catch(err) {
			console.warn("Failed to load " + path + "!\n" + err);
			return undefined;
		}
		
		return content;
	}


	editor.readFromDisk = function(path, callback, returnBuffer, encoding) {
		
		console.log("Reading file from disk: " + path);
		console.log(new Error("Read file from disk").stack);
		
		if(!callback) {
			console.error(new Error("No callback defined!"));
		}
		
		if(returnBuffer) {
			// If no encoding is specified in fs.readFile, then the raw buffer is returned.
			
			fs.readFile(path, function(err, buffer) {
				if (err) console.error(err);
				
				callback(path, buffer);
					
			});
		}
		else {
			if(encoding == undefined) encoding = "utf8";
			fs.readFile(path, encoding, function(err, string) {
				if (err) console.error(err);
				
				callback(path, string);
					
			});
		}
		

	}

	editor.save = function(file, path, callback) {
		/*
			This is the only save function.
			It can handle "save-as". 
		*/
		
		if(file == undefined) file = global.currentFile;
		
		if(!file) {
			console.error(new Error("No file open when save was called"));
		}
		
		if(path == undefined) {
			path = file.path;
		}

		
		if(file.path != path) {
			 // File saved under another path!
			
			// Close file BEFORE setting new path
			//file.close(); // This will close the file
			editor.closeFile(file.path);
			
			// Delete old key
			//delete global.files[file.path];
			
			// Add the new path as key in global.files
			global.files[path] = file;

			// Set the new path
			file.path = path;
			
			file.open();
			
			if(file == global.currentFile) {
				// Set window title to current file path
				var gui = require('nw.gui');
				var win = gui.Window.get();
				win.title = file.path;
				
				editor.renderNeeded();
				editor.render();
			}
			else {
				console.warn("Saved file is NOT the current file!");
			}
		}
		
		fs.writeFile(path, file.text, function(err) {
			console.log("Attempting saving to disk: " + path + " ...");
			
			if(err) {
				console.error(new Error("Unable to save " + path + "\n" + err));
			}
			else {
				console.log("The file was successfully saved: " + path + "");
					
				file.saved(); // Call functions that listen for save events
				
				if(callback) callback();
			}
			
		});
	}

	editor.fileSaveDialog = function(defaultPath, callback) {
		/*
			Brings up the OS save file dialog window and calls the callback with the path.
		*/
		global.fileSaveAsCallback = callback;
		
		var fileSaveAs = document.getElementById("fileSaveAs");
		
		if(defaultPath) editor.setFileSavePath(defaultPath);
					
		fileSaveAs.click(); // Bring up the OS path selector window
	}
	
	editor.setFileSavePath = function(defaultPath) {
		var fileSaveAs = document.getElementById("fileSaveAs");
		fileSaveAs.setAttribute("nwsaveas", defaultPath);
	}
	
	editor.setFileOpenPath = function(defaultPath) {
		// path needs to be a directory
		var fileOpen = document.getElementById("fileInput");
		fileOpen.setAttribute("nwworkingdir", defaultPath);
	}
	
	editor.fileOpenDialog = function(defaultPath, callback) {
		/*
			Brings up the OS file select dialog window.
			If a file is selected, it's opened (readSingleFile).
			File path and file content is then passed to the callback function.
		*/
		
		console.log("Bringing up the file open dialog ...");
		
		global.fileOpenCallback = callback;
		
		var fileOpen = document.getElementById("fileInput");
		
		//if(defaultPath == undefined) defaultPath = editor.workingDirectory;
		
		if(defaultPath) {
			
			var lastChar = defaultPath.substr(defaultPath.length-1);
			
			//console.log("lastChar of defaultPath=" + lastChar);
			
			if(! (lastChar == "/" || lastChar == "\\")) {
				console.warn("defaultPath, bacause ending with '" + lastChar + "', doesn't seem to be a directory:" + defaultPath);
			}
			editor.setFileOpenPath(defaultPath);
			
			// If we want to choose a while directory,  fileOpen.setAttribute webkitdirectory
		}
		

		fileOpen.click(); // Bring up the OS path selector window
	}

	editor.getDir = function(path) {
		/* 
			Returns the directory of a file path
		*/
		
		if(path == undefined) {
			if(global.currentFile) {
				path = global.currentFile.path;
			}
			else {
				console.warn("No file open!");
				return process.cwd(); // Return (editor) working dir
			}
			
		}
		
		return path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))); 
	}
	
	editor.isFilePath = function(filePath) {
		try {
			var stat = fs.lstatSync(filePath);
			return stat.isFile();
		}
		catch(e) {
			return false;
		}
	}
	
	editor.isFolderPath = function(path) {
		try {
			var stat = fs.lstatSync(path);
			return stat.isDirectory();
		}
		catch(e) {
			return false;
		}
	}
	
	editor.getFileExtension = function(filePath) {
		return filePath.substr((~-filePath.lastIndexOf(".") >>> 0) + 2);
	}
	
	
	editor.renderNeeded = function() {
		// Tell the editor that it needs to render
		if(global.settings.devMode && global.render == false) {
			// For debugging, so we know why a render was needed
			console.log(new Error("Render").stack);
		}
		global.render = true;
	}
	
	editor.resizeNeeded = function() {
		// Tell the editor that it needs to resize
		if(global.settings.devMode && global.resize == false) {
			// For debugging, so we know why a resize was needed
			console.log(new Error("Resize").stack);
		}
		global.resize = true;
	}
	
	editor.render = function() {
		
		if(!global.render) {
			console.warn("Not rendering because it's not needed!");
			return;
		}
		if(global.resize) {
			console.warn("Resizing before rendering!");
			editor.resize();
		}
		
		
		
		global.render = false; // Flag (change to true whenever we need to render)
				
		console.log("rendering ... global.resize=" + global.resize + "");
		
		if(global.currentFile) {
			
			console.time("render");
			
			var file = global.currentFile,
				buffer = [],
				grid = global.currentFile.grid;
			
			// Create the buffer
			for(var row = Math.max(0, file.startRow); row < Math.min(grid.length, file.startRow+global.view.visibleRows); row++) {
				buffer.push(file.cloneRow(row)); // Clone the row
			}
			
			if(buffer.length == 0) {
				console.warn("buffer is zero! file.startRow=" + file.startRow + " grid.length=" + grid.length + " global.view.visibleRows=" + global.view.visibleRows);
			}
			
			// Load on the fly functionality on the buffer
			for(var i=0; i<global.preRenders.length; i++) {
				buffer = global.preRenders[i](buffer, file); // Call render
			}
			
			//console.log(JSON.stringify(buffer, null, 4));
			
			var canvas = global.currentFile.canvas;
			
			var ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias (LCD-text). 
			
			//ctx.imageSmoothingEnabled = true;
			
			//ctx.translate(0,0);
			
			ctx.fillStyle = global.settings.style.bgColor;
			
			//ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			/*
			ctx.fillStyle = "#FF0000";
			ctx.fillRect(0,0,150,75);
			ctx.lineWidth = 1;
			*/
			
			for(var i=0; i<global.renders.length; i++) {
				global.renders[i](ctx, buffer, global.currentFile); // Call render
			}
			
			console.timeEnd("render");
			
		}
		else {
			console.log("No file open");
		}
		
		//console.log("rendering finish");
	}
	
	editor.renderRow = function(gridRow) {
		
		console.log("rendering ROW ... global.resize=" + global.resize + "");
		
		if(global.currentFile) {
			
			var file = global.currentFile;
			
			if(gridRow == undefined) gridRow = file.caret.row;
			if(file.grid.length <= gridRow) console.error(new Error("gridRow=" + gridRow + " over file.grid.length=" + file.grid.length + " "));
			
			// Is the row visible?
			var startRow = file.startRow;
			var endRow = Math.min(file.grid.length, file.startRow+global.view.visibleRows);
			
			if(gridRow < startRow || gridRow > endRow) {
				console.warn("Row=" + gridRow + " not in view!");
				return;
				}
			
			var screenRow = Math.max(0, gridRow - startRow);
			
			console.time("renderRow");
			
				var buffer = [];
				
			// Create the buffer
			buffer.push(file.cloneRow(gridRow)); // Clone the row
			
			
			// Load on the fly functionality on the buffer
			for(var i=0; i<global.preRenders.length; i++) {
				buffer = global.preRenders[i](buffer, file);
			}
			
			//console.log(JSON.stringify(buffer, null, 4));
			
			var canvas = file.canvas;
			var ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias
			
			
			ctx.fillStyle = global.settings.style.bgColor;
			
			var top = global.settings.topMargin + screenRow * global.settings.gridHeight;
			
			// Clear only that row
			ctx.fillRect(0, top, canvas.width, global.settings.gridHeight);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			for(var i=0; i<global.renders.length; i++) {
				global.renders[i](ctx, buffer, file, screenRow); // Call render
			}
			
			console.timeEnd("renderRow");
			
		}
		else {
			console.log("No file open");
		}
		
	}
	
	
	

	editor.resize = function(e) {
		/*
			
			Why does the resize clear the canvas's !???
		
		*/
		
		if(!global.resize) return; // Don't resize if it's not needed.
		global.resize = false; // Prevent this function from running again
		
		//if(global.lastKeyPressed=="a") console.error(new Error("why resize now?"));
		
		console.log("Resizing ... e=" + e + " global.render=" + global.render + "");
		
		console.time("resize");
		
		// Remove the wrapper styles so they get dynamic
		var wrappers = document.getElementsByClassName("wrap");
		for (var i = 0; i < wrappers.length; i++) {
			wrappers[i].style.height = "auto";
			wrappers[i].style.width = "auto";
		}
		
		
		// Resize listeners (before)
		for(var i=0; i<global.eventListeners.beforeResize.length; i++) {
			global.eventListeners.beforeResize[i].fun(global.currentFile);
		}
		
		/* The canvas elements mess up the layout, so we need to hide them before calculating their new widths
		var canvasNodes = document.getElementsByTagName("CANVAS");
		for(var i=0; i<canvasNodes.length; i++) {
			canvasNodes[i].style.display = "none";
		}
		*/

		


		
		
		// Save focus for the current file and give back focus after ther resize
		var file = global.currentFile;
		var fileGotFocus = false;
		
		
		if(file) {
			fileGotFocus = file.gotFocus;
			//global.currentFile.hide(); // So that events will fire
		}
		
		//console.log("Resizing stuff ...")
		
		
		var header = document.getElementById("header");
		var footer = document.getElementById("footer");
		var leftColumn = document.getElementById("leftColumn");
		var rightColumn = document.getElementById("rightColumn");
		var content = document.getElementById("content"); // Center column
		var columns = document.getElementById("columns");
		
		var contentComputedStyle = window.getComputedStyle(content, null); // Center column
		var columnsComputedStyle = window.getComputedStyle(columns, null);
		var headerHeight = parseInt(header.offsetHeight);
		var footerHeight = parseInt(footer.offsetHeight);
		var headerFooterHeight = headerHeight + footerHeight;
		var leftColumnWidth = parseInt(leftColumn.offsetWidth);
		var rightColumnWidth = parseInt(rightColumn.offsetWidth);
		var leftRightColumnWidth = leftColumnWidth + rightColumnWidth;
		var windowHeight = parseInt(window.innerHeight);
		var windowWidth = parseInt(window.innerWidth);
		var contentWidth = windowWidth - leftRightColumnWidth;
		//var contentHeight = parseInt(contentComputedStyle.height);
		var contentHeight = windowHeight - headerFooterHeight;
		var columnsHeight = contentHeight;
		

/*
		console.log("windowWidth=" + windowWidth);
		console.log("windowHeight=" + windowHeight);
		console.log("leftColumnWidth=" + leftColumnWidth);
		console.log("rightColumnWidth=" + rightColumnWidth);
		console.log("leftRightColumnWidth=" + leftRightColumnWidth);
		console.log("headerHeight=" + headerHeight);
		console.log("footerHeight=" + footerHeight);
		console.log("headerFooterHeight=" + headerFooterHeight);
		console.log("contentWidth=" + contentWidth + " (offsetWidth=" + content.offsetWidth + " innerWidth=" + content.innerWidth + " computedWidth=" + contentComputedStyle.width + ")");
		console.log("contentHeight=" + contentHeight + " (offsetHeight=" + content.offsetHeight + " innerHeight=" + content.innerHeight + " computedHeight=" + contentComputedStyle.height + ")");
		console.log("columnsHeight=" + columnsHeight + " (offsetHeight=" + columns.offsetHeight + " innerHeight=" + columns.innerHeight + " cunputedHeight=" + columnsComputedStyle.height + ")");
		
		console.log("offsetWidth=" + content.offsetWidth)
		console.log("innerWidth=" + content.innerWidth)
		console.log("outherWidth=" + content.outherWidth)
		console.log("width=" + contentComputedStyle.width);
		console.log("webkitLogicalWidth=" + contentComputedStyle.webkitLogicalWidth);
*/
		
		global.windowHeight = windowHeight;
		global.windowWidth = windowWidth;
		
		
		//objInfo(centerColumn);

		
		//global.view.canvasWidth = windowWidth - leftRightColumnWidth;
		global.view.canvasWidth = contentWidth;
		global.view.canvasHeight = contentHeight;
		/*
		global.view.canvasWidth = (windowWidth - leftRightColumnWidth);
		global.view.canvasHeight = (windowHeight - headerFooterHeight);
		
		
		content.style.width = global.view.canvasWidth + "px";
		content.style.height = global.view.canvasHeight + "px";
		*/
		
		console.log("canvasWidth=" + global.view.canvasWidth);
		console.log("canvasHeight=" + global.view.canvasHeight);
		
		
		leftColumn.style.height = global.view.canvasHeight + "px";
		rightColumn.style.height = global.view.canvasHeight + "px";


		// Set a static with and height to wrappers so that dynamic changes wont resize the wireframe (wrappes should have css: overflow: auto!important;)
		var wrappers = document.getElementsByClassName("wrap");
		var leftColumnPadding = window.getComputedStyle(document.getElementById("leftColumn")).getPropertyValue("padding");
		//console.log("leftColumnPadding=" + leftColumnPadding);
		var columnPadding = parseInt(leftColumnPadding);
		for (var i = 0; i < wrappers.length; i++) {
			wrappers[i].style.height = (contentHeight) + "px"; // - (columnPadding * 2 + 2) + "px";
			wrappers[i].style.width = (leftColumnWidth) + "px"; // - (columnPadding * 2 + 2) + "px";
		}
		//console.log("columnPadding=" + columnPadding);

		
		// Calculate column width and row height
		global.view.visibleColumns = Math.ceil((global.view.canvasWidth - global.settings.leftMargin - global.settings.rightMargin) / global.settings.gridWidth);
		
		//console.log("(resize1) global.view.visibleColumns=" + global.view.visibleColumns);
		//console.log("(resize1) global.view.endingColumn=" + global.view.endingColumn);

		// ceil (overflow)
		global.view.visibleRows = Math.ceil((global.view.canvasHeight - global.settings.topMargin - global.settings.bottomMargin) / global.settings.gridHeight);
		
		//console.log("visibleRows=" + global.view.visibleRows);
		//console.log("topMargin=" + global.settings.topMargin);
		//console.log("bottomMargin=" + global.settings.bottomMargin);
		
		
		if(global.currentFile) {
			
			global.currentFile.canvas.style.width = global.view.canvasWidth + "px";
			global.currentFile.canvas.style.height = global.view.canvasHeight + "px";

			global.currentFile.canvas.width  = global.view.canvasWidth;
			global.currentFile.canvas.height = global.view.canvasHeight;
			
			// Fix horizontal column after resizing
			if(global.view.endingColumn < global.view.visibleColumns) {
				global.currentFile.startColumn = 0;
				global.view.endingColumn = global.view.visibleColumns;
			}
			else {
				global.view.endingColumn = global.currentFile.startColumn + global.view.visibleColumns;
			}

		}
		else {
			console.warn("No current file! global.currentFile=" + global.currentFile);
			global.view.endingColumn = global.view.visibleColumns;

		}

		//console.log("(resize2) global.view.visibleColumns=" + global.view.visibleColumns);
		//console.log("(resize2) global.view.endingColumn=" + global.view.endingColumn);

		// Resize listeners (after)
		for(var i=0; i<global.eventListeners.afterResize.length; i++) {
			global.eventListeners.afterResize[i].fun(global.currentFile);
		}
		
		// Show the canvas nodes again
		//setTimeout(showCanvasNodes, 1000);
		
		//showCanvasNodes();
		
		// Show the file canvas again and set focus
		//if(file) file.show(fileGotFocus);
		
		console.timeEnd("resize");
		
		function showCanvasNodes() {
			for(var i=0; i<canvasNodes.length; i++) {
				// Do not show hidden fileCanvas's
				if(canvasNodes[i].getAttribute("class") != "fileCanvas") { 
					//console.log("canvasNodes[" + i + "].getAttribute('class')=" + canvasNodes[i].getAttribute("class"));
					canvasNodes[i].style.display = "block";
				}
			}
			editor.renderNeeded();
		}
		
		editor.renderNeeded(); // Always render after a resize (bot nor right away!?
		
	}

	editor.on = function(eventName, callback, order) {
		/*
			lowest order nr will execute first!
		*/
		
		if(typeof callback !== "function") console.error(new Error("The second argument needs to be a function! Did you mean editor.addEvent ?"));
		
		return editor.addEvent(eventName, {fun: callback, order: order});
	}

	editor.addEvent = function(eventName, options) {
		
		if(!(eventName in global.eventListeners)) {
			console.error("eventName=" + eventName + " does not exist in global.eventListeners!");
		}
		
		if(arguments.length > 2) {
			console.warn("Pass additional arguments in the options (second argument)! Or use editor.on instead!");
		}
		
		if(!options.hasOwnProperty("fun")) {
			console.warn(new Error("The second argument should be an object containing the property fun. You might want to use editor.on instead.").stack);

			if(typeof options === "function") {
				options = {fun: options};
			}
			else {
				console.error(new Error("A function, or an object with the property fun, need to be passed in the second argument! options=" + options));
			}
		}
		
		if(options.order == undefined) options.order = 1;
		if(typeof options.fun != "function") {
			console.error(new Error("There needs to be a function!"));
		}
			
		var index = global.eventListeners[eventName].push(options);
		
		// Sort the events so they fire in order (lowest order nr will execute first)
		global.eventListeners[eventName].sort(function(a, b) {
			if(a.order < b.order) {
				return -1;
			}
			else if(a.order > b.order) {
				return 1;
			}
			else {
				return 0;
			}
		});
		

	}

	editor.removeEvent = function(eventName, fun) {
		/*
			Make sure you use an unique function name.
			
			Note to myself: Some events have objects and others just have the function!!
			
		*/
		var fname = functionName(fun);
		var events = global.eventListeners[eventName];
		var found = 0;
		
		removeit(); // Removes them all (recursive)
		
		function removeit() {
			for(var i=0; i<events.length; i++) {
				if(events[i].fun == fun) {
					events.splice(i, 1);
					found++;
					removeit();
					break;
				}
			}
		}
		console.log("Removed " + found + " occurrences of " + fname + " from " + eventName);
	}


	editor.addMenuItem = function(htmlText, callback) {
		var menu = document.getElementById("canvasContextmenu");

		var menuElement = document.createElement("li");
		menuElement.innerHTML = htmlText;
		
		if(callback) menuElement.onclick = callback;

		menu.appendChild(menuElement);
		
		// Don't forget to call editor.hideMenu() after the item has been clicked!
		
		return menuElement;
	}

	editor.addTempMenuItem = function(htmlText, callback) {
		/*
			These items are removed when the menu is hidden
		*/
		
		//var menu = document.getElementById("canvasContextmenu");
		var tempItems = document.getElementById("canvasContextmenuTemp");

		var menuElement = document.createElement("li");
		menuElement.innerHTML = htmlText;
		
		var separator =  document.createElement("li");
		separator.setAttribute("class", "sep");
		
		if(callback) menuElement.onclick = callback;
		
		tempItems.appendChild(menuElement);
		
		// Add many: accept array?
		
		tempItems.appendChild(separator);
		
		//tempItems.insertBefore(menuElement, tempItems.firstChild);
	}


	editor.hideMenu = function() {
		// Hide the menu
		var menu = document.getElementById("canvasContextmenu");
		
		menu.style.visibility = "hidden"; // Always hide the menu on mouse down
		
		// Clear temorary menu items
		var tempItems = document.getElementById("canvasContextmenuTemp");
		while(tempItems.firstChild){
			tempItems.removeChild(tempItems.firstChild);
		}
		
		if(global.currentFile) global.currentFile.gotFocus = true; // Give focus back for text entry
		
	}

	editor.showMenu = function(posX, posY) {
		var menu = document.getElementById("canvasContextmenu");
		var notUpOnMenu = 6; // displace the menu so that the mouse-up event doesn't fire on it
		var menuDownABit = 10;
		
		if(posX === global.mouseX || posX === undefined) posX = global.mouseX + notUpOnMenu;

		if(posY === undefined) posY = global.mouseY + menuDownABit;
		
		// Make sure it fits on the screen!!
		/*
		setTimeout(function() { // Wait for div content to load
			
		}, 100); 
		*/
		var offsetHeight = parseInt(menu.offsetHeight);
		var offsetWidth = parseInt(menu.offsetWidth);
		
		if((posY+offsetHeight) > global.windowHeight) posY = global.windowHeight - offsetHeight;
		if((posX+offsetWidth) > global.windowWidth) posX = global.windowWidth - offsetWidth;
		
		if(posX <= global.mouseX) {
			// Place the menu on the left side
			posX = global.mouseX - offsetWidth - notUpOnMenu;
		}
		
		menu.style.visibility = "visible";
		menu.style.top = posY + "px";
		menu.style.left = posX + "px";
	}

	editor.addInfo = function(row, col, txt) {
		// Will display a talk bubble (plugin/render_info.js)
		var info = global.info;
		
		console.time("addInfo");
		
		// Convert the text to an array, one line per row
		txt = txt.split("\n");
		
		var imagesToMake = txt.length;
		var imagesMade = 0;
		var imgArray = [];
		
		// Convert each text row to an image
		for(var i=0; i<txt.length; i++) {
			makeImage(txt[i]);
		}
		
		/*
			Problem: Because info is pushed after each other, and is async, not all messages
			might be shown
		
		
		*/
		
		function allImagesMade() {
			// Tell the editor to render
			
			var found = false;
			
			//console.log("imgArray=" + imgArray.length);
			
			// Remove all text at next editor interaction
			editor.onNextInteraction(function() {
				editor.removeAllInfo(row, col);
			});
			
			// Check if there's already info on that positioin
			for(var i=0; i<info.length; i++) {
				if(info[i].row == row && info[i].col == col) {
					
					// Add text
					for(var j=0; j<imgArray.length; j++) {
						info[i].text.push(imgArray[j]);
					}
					
					found = true;
					break;
				}
			}
			
			if(!found) {
				// No info found on that position. Add it!
				info.push({
					row: row,
					col: col,
					text: imgArray
				});
			}
			
			console.timeEnd("addInfo");
			
			editor.renderNeeded();
			editor.render();

		}
		

		
		function makeImage(item) {
			
			//console.log("item=" + item);
			
			htmlToImage(item, function(img) {
				imgArray.push(img);
				
				//console.log("imagesToMake=" + imagesToMake);
				//console.log("imagesMade=" + imagesMade);
				
				//global.currentFile.canvas.getContext("2d").drawImage(imgArray[0], 0, 0);		

				
				if(++imagesMade == imagesToMake) {
					allImagesMade();
				}
			});
			

		}
		
	}

	editor.removeAllInfo = function(row, col, txt) {
		// Find the item in the array, then splice it ...
		var info = global.info;
		
		for(var i=0; i<info.length; i++) {
			if(info[i].row == row && info[i].col == col) {
				
				// Remove info
				info.splice(i,1);
				
				// Call removeAllInfo again, just to make sure ALL is removed
				editor.removeAllInfo(row, col);
				return; // Splice can be buggy if many rows are removed in a for-loop

			}
		}
	}

	editor.onNextInteraction = function(func) {
		executeOnNextInteraction.push(func);
	}

	editor.interact = function(interaction) {
		// This function will be called on every interaction
		
		var func;
		
		while(executeOnNextInteraction.length > 0) {
			func = executeOnNextInteraction.shift();
			
			func(interaction); // Execute
		}
		
		for(var i=0; i<global.eventListeners.interaction.length; i++) {
			global.eventListeners.interaction[i].fun(global.currentFile); // Call function
		}
		
		resizeAndRender();
		
	}
	
	editor.fireEvent = function(eventName) {

		var eventListeners;
		var callback;
			
		if(eventName in global.eventListeners) {
				
			eventListeners = global.eventListeners[eventName];
			
			for(var i=0; i<eventListeners.length; i++) {
				callback = eventListeners[i].fun;
				callback.apply(this, arguments);
			}
			
			global.eventListeners[eventName]
		}
		else {
			console.error(new Error("Uknown event listener:" + eventName));
		}
		
	}
	
	editor.addRender = function(fun) {
		return global.renders.push(fun) - 1;
	}
	editor.removeRender = function(fun) {
		return removeFrom(global.renders, fun)
	}
	
	editor.addPreRender = function(renderFunction) {
		return global.preRenders.push(fun) - 1;
	}
	editor.removePreRender = function(renderFunction) {
		return removeFrom(global.preRenders, fun);
	}
	
	editor.mousePositionToCaret = function (mouseX, mouseY) {
		/*
			Returns a caret on the file.grid
			
			We need to know row indentation to know what column!
			
			We also need to take into account how much is scrolled
			
		*/
		if(global.currentFile) {
			
			var file = global.currentFile,
				grid = file.grid,
				clickFeel = global.settings.gridWidth / 2;
			
			var mouseRow = Math.floor((mouseY - global.settings.topMargin) / global.settings.gridHeight) + file.startRow;
			
			//console.log("mouseRow=" + mouseRow);
			
			if(mouseRow >= grid.length) {
				//console.warn("Mouse position under the grid!");
				return file.createCaret(file.text.length);
			}
			else if(mouseRow < 0) {
				//console.warn("Mouse position above the grid!");
				return file.createCaret(0, 0, 0);
			}
			else {
				var row = grid[mouseRow];
				
				//console.log("Mouse on row " + row.lineNumber);
				
				//console.log("indentation=" + row.indentation);
				
				var mouseCol = Math.floor((mouseX - global.settings.leftMargin - (row.indentation * global.settings.tabSpace - file.startColumn) * global.settings.gridWidth + clickFeel) / global.settings.gridWidth);
			
				//console.log("mouseCol=" + mouseCol);

				
				if(mouseCol > row.length) { // End of line
					mouseCol = row.length;
				}
				else if(mouseCol < 0) { // Start of line
					mouseCol = 0;
				}

				return file.createCaret(undefined, mouseRow, mouseCol);

				
			}
			
		}
		else {
			console.warn("No file open!");
		}
		
	}
	
	editor.autoComplete = function(file, combo, character, charCode, keyPushDirection) {
		/*
			An abstraction that lets you have many auto-complete functions. 
			Register using: editor.on("autoComplete", function)
			
			The function should return an array with possible auto-complete options,
			or optionally, an array of arrays where the second index is how many characters
			the mouse should be moved left, after inserting the text.
			
			Ex: [word1, word2, word3] or [[wordl, n], [word2, n]]
			
		*/
		
		var wordDelimiters = " ()[]{}+-/<>\r\n";
		var char = "";
		var word = "";
		var options = []; // Word options
		var mcl = []; // Move caret left
		
		// Go left to get the word
		for(var i=file.caret.index-1; i>0; i--) {
			char = file.text.charAt(i);
			
			console.log("char=" + char);
			
			if(wordDelimiters.indexOf(char) > -1) break; // Exit loop
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = char + word;
		}
		// Also go right just in case we are inside a word
		
		for(var i=file.caret.index; i<file.text.length; i++) {
			char = file.text.charAt(i);
			
			console.log("char=" + char);
			
			if(wordDelimiters.indexOf(char) > -1) break; // Exit loop
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = word + char;
		}
		
		word = word.trim();
		var wordLength = word.length;
		console.log("Autocomplete: *" + word + "* (" + wordLength + " chars)");
		
		var ret, fun, addWord, addMcl;
		for(var i=0; i<global.eventListeners.autoComplete.length; i++) {
			
			fun = global.eventListeners.autoComplete[i].fun;
			ret = fun(file, word, wordLength, options.length);
			
			console.log("function " + functionName(fun) + " returned: " + JSON.stringify(ret));
			
			if(ret) {
			if(Array.isArray(ret)) {
				for(var j=0; j<ret.length; j++) {
						if(Array.isArray(ret[j])) {
							addWord = ret[j][0];
							addMcl = ret[j][1];
						}
						else {
							addWord = ret[j];
							addMcl = 0;
						}
						
						console.log("addWord=" + addWord + " addMcl=" + addMcl);
						
						if(options.indexOf(addWord) == -1) {
							options.push(addWord);
							mcl.push(addMcl);
						}
				}
			}
			else {
				console.error(new Error(functionName(fun) + " did not return an array"));
				}
			}
			 }
		
		if(options.length != mcl.length) {
			console.error(new Error("Something went wrong! options=" + JSON.stringify(options) + "\nmcl=" +  JSON.stringify(mcl) + " "));
			return false;
		}
		
		console.log("options:" + JSON.stringify(options, null, 2));
		
		if(options.length > 1) {
			
			// Type up until the common character  fooBar vs fooBaz, type fooBa|
			var shared = sharedStart(options);
			
			console.log("sharedStart=" + shared + " word=" + word);
			
			// hmm!?
			/*
			if(shared.length > 0) {
				if(word.indexOf(".") != -1) {
					var arr = word.split(".");
					
					completeWord(arr[arr.length-1], shared, 0);
				}
				else {
					completeWord(word, shared, 0);
				}
			*/
			
			completeWord(word, shared, 0);
			
						
			// Show info
			for(var i=0; i<options.length; i++) {
				editor.addInfo(file.caret.row, file.caret.col, options[i].replace(new RegExp(file.lineBreak,"g"), " "));
			}
			
		}
		else if(options.length == 1) {
			completeWord(word, options[0], mcl[0]);
		}
		
		return false; // disable default action
		
		function sharedStart(array) {
			// Return the text that all words in an array share
			var A= array.concat().sort(), // Create new array with the words sorted
				a1= A[0],
				a2= A[A.length-1],
				L= a1.length,
				i= 0;
			
			while(i<L && a1.charAt(i) === a2.charAt(i)) i++;
			
			return a1.substring(0, i);
		}
		
		function completeWord(word, wholeWord, moveCaret) {
			
			if(wholeWord.substring(0, word.length) != word) {
				// Delete the word, then insert the text
				for(var i=0; i<word.length; i++) {
				file.moveCaretLeft();
					file.deleteCharacter(undefined, undefined, false); // false = Do not renderRow
				}
				var insert = wholeWord;
			}
			else {
				var insert = wholeWord.substring(word.length); // Start at length, continue to end
			}
			
			console.log("Completing word=" + word + " wholeWord=" + wholeWord + " moveCaret=" + moveCaret + " insert=" + insert + "");
			
			
			/* Use insertText for non-single letters ...
				for(var i=wordLength; i<word.length; i++) {
				file.putCharacter(word.charAt(i));
				}
			*/
			
			//console.log("wordLength=" + wordLength);
			//console.log("word.length=" + word.length);
			//console.log("insert=" + insert);
			
			file.insertText(insert);
			
			//console.log("moveCaret="+ moveCaret);
			
			if(moveCaret) file.moveCaretLeft(file.caret, moveCaret);
			
			// If not linebreak was inserted, render only row!? (check file.insertText and file.moveCaretLeft)
			
			editor.renderNeeded();
			
		}
		
	}
	
	
	
	
	function removeFrom(list, fun) {
		for(var i=0; i<list.length; i++) {
			
			//console.log(functionName(fun) + " = " + functionName(list[i]) + " ? " + (list[i] == fun));
			
			if(list[i] == fun) {
				list.splice(i, 1);
				removeFrom(list, fun); // Remove dublicates
				return true;
			}
		}
		return false; // Function not found in list
	}
	
	
	// Handle window close
	win.on('close', function() {
		var editor = this;
		
		//editor.hide(); // Pretend to be closed already
		
		var ret = true;
		var name = "";
		
		console.log("Closing the editor ...");
		
		if(!window.localStorage) {
			console.warn("window.localStorage=" + window.localStorage);
		}
		
		for(var i=0, f; i<global.eventListeners.exit.length; i++) {
			
			f = global.eventListeners.exit[i].fun;
			name = functionName(f);
			ret = f();
			
			console.log(name + " returned " + ret);
			
			if(ret !== true) break;
		}
		

		if(ret == true) {
			editor.close(true);
		}
		else {
			editor.show();
			console.error(new Error("Something went wrong when closing the editor!"));
		}
		
	});


	// Move Event listeners ...

	
	//window.addEventListener("drop", fileDrop, false);
	window.ondragover = function(e) { e.preventDefault(); return false };
	window.ondrop = function(e) { e.preventDefault(); return false };





	
	window.addEventListener("load", main, false);
	window.addEventListener("resize", function() {
		console.log("EVENT RESIZE!");
		editor.resizeNeeded();
		editor.renderNeeded();
	}, false);
	
	
	/*
		Add your own scroll listeners using editor.addEvent("scroll", yourFunction)
		Your function should return false to prevent default action.
	*/
	window.addEventListener("mousewheel",scrollWheel,false);
	window.addEventListener("DOMMouseScroll",scrollWheel,false);
	
	
	/*
		Add your own key listeners by pushing to global.keyBindings
		Your function should return false to prevent default action.
	*/
	window.addEventListener("keydown",keyIsDown,false);  // captures 
	window.addEventListener("keyup",keyIsUp,false);      // keyBindings
	window.addEventListener("keypress",keyPressed,false); // Writes to the document at caret position


	
	/*
		Add your own key listeners by pushing to global.eventListeners.mouseClick
		Your function should return false to prevent default action.
	*/
	window.addEventListener("click", mouseclick, false);
	window.addEventListener("mousedown", mouseDown, false);
	window.addEventListener("mouseup", mouseUp, false);
	// Capture mobile events
	window.addEventListener("touchstart", mouseDown, false);
	window.addEventListener("touchend", mouseUp, false);
	window.addEventListener("touchcancel", mouseUp, false);
	window.addEventListener("touchleave", mouseUp, false);

	
	window.addEventListener("mousemove", mouseMove, false);

	
	// Disable annoying menus
	window.addEventListener("contextmenu", function(e) {
		e = e || window.event;
		e.preventDefault();
		return false;
	}, false);


	window.addEventListener('copy', copy);
	window.addEventListener('paste', paste);
	window.addEventListener('cut', cut);
	
	

	
	function main() {

		console.log("Starting the editor ...");
		
		editor.resizeNeeded(); // We must call the resize function at least once at editor startup.
		
		global.keyBindings.push({charCode: global.settings.autoCompleteKey, fun: editor.autoComplete, combo: 0});
		
		// Handle file save dialog
		var fileSaveAs = document.getElementById("fileSaveAs");
		if(fileSaveAs) {
			fileSaveAs.addEventListener('change', chooseSaveAsPath, false);
		}
		else {
			console.warn("No fileSaveAs dialog!");
		}
		
		// Handle file open dialog
		var fileOpen = document.getElementById("fileInput");
		fileOpen.addEventListener('change', readSingleFile, false);
		
		// cleanup
		var content = document.getElementById("content");
		while (content.firstChild) {
			content.removeChild(content.firstChild);
		}
		
		//getFile("http://joha.nz/editor/editor.js", openFile);
		//getFile("http://joha.nz/editor/test.js", openFile);
		//getFile("http://joha.nz/editor/index.htm", openFile);
		//getFile("http://joha.nz/editor/40k.log", openFile);
		
		//window.focus(); // Does nothing!
		
		var body = document.getElementById('body');
		body.ondrop = fileDrop;
		
		
		//console.log("main function loaded");
		
		// Sort the start events (some modules depeonds on others, and want to start after or before them)
		global.eventListeners.start.sort(function(a, b) {
			if(a.order < b.order) {
				return -1;
			}
			else if(a.order > b.order) {
				return 1;
			}
			else {
				return 0;
			}
		});
		for(var i=0; i<global.eventListeners.start.length; i++) {
			//console.log("startlistener:" + functionName(global.eventListeners.start[i].fun) + " (order=" + global.eventListeners.start[i].order + ")");
		}
		
		
		setInterval(resizeAndRender, 16); // So that we always see the latest and greatest
		
		
		//setTimeout(display, 500); // Why do I need to do this?
		display();

		
		function display() {
			editor.resize();
			
			// Call start listeners
			for(var i=0; i<global.eventListeners.start.length; i++) {
				global.eventListeners.start[i].fun(); // Call function
			}
			
			editor.renderNeeded();
			editor.render();
			
		}
		
	}
	
	
	function readSingleFile(e) {
		
		console.log("Reading single file ...");

		if(global.fileOpenCallback == undefined) {
			console.error(new Error("There is no listener for the open file dialog!"));
		}
		
		var file = e.target.files[0];
		if (!file) {
			console.error(new Error("No file selected from the open-file dialog."));
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		var reader = new FileReader();
		
		reader.onload = function(e) {
			var data = e.target.result;
			global.fileOpenCallback(filePath, data);
			
			console.log("File loaded.");
			
			editor.renderNeeded();
			
			global.fileOpenCallback = undefined;
			
			// Reset the value so that we can open the same file again
			var fileOpen = document.getElementById("fileInput");
			fileOpen.value = "";
			
		};
		reader.readAsText(file);

	}
	
	
	function chooseSaveAsPath(e) {
		var file = e.target.files[0];
		
		if(global.fileSaveAsCallback == undefined) {
			console.error(new Error("There is no listener for the save file dialog!"));
		}
		
		if (!file) {
			console.warn("No file selected!");
			global.fileSaveAsCallback(undefined);
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		
		global.fileSaveAsCallback(filePath);
		
		global.fileSaveAsCallback = undefined; // Prevent old callback from firing again
	}
	
	
	function fileDrop(e) {
		e.preventDefault();

		console.log("DROP!");
		
		var file = e.dataTransfer.files[0];
		var reader = new FileReader();
		
		reader.onload = function (event) {
			
			var content = event.target.result;
			var filePath = file.path;
			
			console.log("Drop op: " + event.target);
			
			editor.openFile(filePath, content);
			
		};
		console.log(file);
		reader.readAsDataURL(file);
		
		/*
		for (var i = 0; i < e.dataTransfer.files.length; ++i) {
			console.log(e.dataTransfer.files[i].path + "\n" + e.dataTransfer.files[i].data);
			objInfo(e.dataTransfer.files[i]);
		}
		*/
		
		editor.interact("fileDrop");
		
		return false;
	};
	
	
	
	
	
	function copy(e) {
		
		if(global.currentFile.gotFocus) {
			var textToPutOnClipboard = "";
			
			if(global.currentFile) {
				textToPutOnClipboard = global.currentFile.getSelectedText();
			}
			
			if(textToPutOnClipboard == "") console.warn("Nothing copied to clipboard!");
			
			
			if (isIe) {
				window.clipboardData.setData('Text', textToPutOnClipboard);    
			} else {
				e.clipboardData.setData('text/plain', textToPutOnClipboard);
			}
			e.preventDefault();
		
		}
		
		// else: Do the default action (enable copying outside the canvas)
		
		editor.interact("copy");
		
	}
	
	function cut(e) {
		
		if(global.currentFile.gotFocus) {
		
			var textToPutOnClipboard = "";
			
			if(global.currentFile) {
				textToPutOnClipboard = global.currentFile.getSelectedText();
				
				// Delete the selected text
				global.currentFile.deleteSelection();
			}
			
			if(textToPutOnClipboard == "") console.warn("Nothing copied to clipboard!");
			
			if (isIe) {
				window.clipboardData.setData('Text', textToPutOnClipboard);    
			} else {
				e.clipboardData.setData('text/plain', textToPutOnClipboard);
			}
			e.preventDefault();
		}

		// else: Do the default action (enable cutting outside the canvas)

		editor.interact("cut");
	}
	
	
	function paste(e) {
		var text = e.clipboardData.getData('text'),
		ret,
		textChanged = false;
		
		console.log("PASTE!" + text);
		
		if(global.currentFile.gotFocus) {
		
			e.preventDefault();
		
			// Call events listening on paste
			for(var i=0, fun; i<global.eventListeners.paste.length; i++) {
				
				fun = global.eventListeners.paste[i].fun;
				
				ret = fun(global.currentFile, e.clipboardData);
				
				//console.log("Paste listener: " + functionName(fun) + " returned:\n" + ret);
				
				if(typeof ret == "string") {
					if(textChanged) {
						console.error(new Error("Another listener has already changed the pasted text!"));
					}
					text = ret;
					textChanged = true;
				}
			}
			
			// Insert text at caret position
			if(global.currentFile) {
				var file = global.currentFile;
				
				// If there is a text selection. Delete the selection first!
				file.deleteSelection();
				
				file.insertText(text);
			}
		}
		
		// else: Do the default action (enable pasting outside the canvas)
		
		editor.interact("paste");
		
	}
	


	
	/*
	function updateCaretGridPosition(caret, file) {
		var gridPosition = file.getGridPositionFromIndex(caret.index);
		
		caret.row = gridPosition.row;
		caret.col = gridPosition.col;
		
		console.log("caret: " + JSON.stringify(caret));
		
		if(caret.index == file.text.length) {
			console.log("caret at EOF");
		}
		else {
			console.log("caret at char=" + file.grid[caret.row][caret.col].char + " charCode=" + file.grid[caret.row][caret.col].char.charCodeAt(0) + "");
		}
		
	}
	*/
	

	function keyPressed(e){
		e = e || window.event; 
		
		//e.preventDefault();
		
		var charCode = e.charCode || e.keyCode || e.which;
		var character = String.fromCharCode(charCode); 
		
		/*
		var charCode;
		
		if(window.event){ // IE					
			charCode = e.keyCode;
		}
		else if(e.which){ // Netscape/Firefox/Opera					
			charCode = e.which;
		 }
		*/
		
		console.log("keyPress: " + charCode + " = " + character + " (charCode=" + e.charCode + ", keyCode=" + e.keyCode + ", which=" + e.which + ") global.currentFile.gotFocus=" + (global.currentFile ? global.currentFile.gotFocus : "NoFileOpen") + "");
		
		global.lastKeyPressed = character;
		
		if(global.currentFile) {
			if(global.currentFile.gotFocus) {
				// Put character at current caret position:
							
				global.currentFile.putCharacter(character);

			}

		}
		
		editor.interact("keyPressed");
		
	}
	
	function resizeAndRender() {
		if(global.resize) editor.resize();
		if(global.render) editor.render();
	}
	
	
	function keyIsDown(e) {
		/*
			
			note: Windows OS (or Chromium?) has some weird keyboard commands, like Ctrl + I to insert a tab!
			
		*/
		e = e || window.event; 
		
		var charCode = e.charCode || e.keyCode;
		var character = String.fromCharCode(charCode);
		var combo = getCombo(e);
		var preventDefault = false;
		var funReturn;
		var captured = false;
		var charCodeShift = 16;
		var charCodeCtrl = 17;
		var charCodeAlt = 18;
		console.log("keyDown: " + charCode + " = " + character + " combo=" + JSON.stringify(combo));
		
		// Prevent unsupported combo error ? 
		// But what if we want a binding of *just* ALT!?
		// Can't have that or it will mess all native combos. You need to bind to shift|alt|ctrl PLUS something else
		// Shift <> stopped working
		
		if(charCode == charCodeCtrl) return; // Ctrl
		if(charCode == charCodeAlt) return; // ALT
		
		if(combo.alt && combo.shift) {
			console.warn("Alt + shift is the default for changing keyboard layout in Windows!");
		}
		
		
		// PS. Alt Gr = Ctrl+Alt
		
		// You probably want to push to global.keyBindings instead of using eventListeners.keyDown!
		for(var i=0; i<global.eventListeners.keyDown.length; i++) {
			funReturn = global.eventListeners.keyDown[i].fun(global.currentFile, character, combo); // Call function
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("Default action will be prevented!");
			}
		}
		
		// Check key bindings
		for(var i=0, binding; i<global.keyBindings.length; i++) {
			
			binding = global.keyBindings[i];
			
			/*
				I probably had a good reason to edit this so that undefined combos didnt capture combos
				Lets change back and see if I discover why ...
				Note to self: comments! comments damnit!
			
			*/
			
			//if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || (binding.combo === undefined && combo===0)) && (binding.dir == "down" || binding.dir === undefined) ) { // down is the default direction
			if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || (binding.combo === undefined)) && (binding.dir == "down" || binding.dir === undefined) ) { // down is the default direction
				
				if(binding.charCode == charCodeShift || binding.charCode == charCodeAlt || binding.charCode == charCodeCtrl) {
					console.error(new Error("Can't have nice things! Causes a bug that will make native shit+ or algGr+ keyboard combos not work"));
				}
				else {
				
				//console.log("keyDown: Calling function: " + functionName(binding.fun) + "...");
					
					if(captured) console.warn("Key combo has already been captured: charCode=" + charCode + " character=" + character + " combo=" + JSON.stringify(combo));
					
				captured = true;
				
				funReturn = binding.fun(global.currentFile, combo, character, charCode, "down");
				
				if(funReturn === false) {
					preventDefault = true;
					console.log("Default action will be prevented!");
				}
				}
			}
			else {
				//console.log("NOT calling function:" + functionName(binding.fun) + " " + JSON.stringify(binding));
			}
		}
		
		

		
		if(global.currentFile) {
			global.currentFile.checkGrid();
			global.currentFile.checkCaret();
		}

		editor.interact("keyDown");

		
		if(combo.sum > 0 && !captured) {
			// The user hit a combo, with shift, alt, ctrl + something, but it was not captured. 
			
			// Enable native commands
			if(combo.ctrl && character == "C") {console.log("copy");}
			else if(combo.ctrl && character == "V") {console.log("paste");}
			else if(combo.ctrl && character == "X") {console.log("cut");}
			else if(combo.shift) {} // shift is usually safe (big and small letters yo!)
			else if(combo.ctrl && combo.alt) {} // This is Alt gr (used to insert {[]} etc)
			else if(combo.alt) {} // Wait for ALT+key combo!
			else if(charCode == 17 || combo.ctrl) {console.log("Ctrl ...");} // Wait for Ctrl+key combo!
			//else if(combo.shift) {} // Wait for Shift+key combo!
			//&&//&&//
			else {
				console.error(Error("Unsupported! combo: " + JSON.stringify(combo) + " character=" + character + " charCode=" + charCode));
				
				preventDefault = true;
			}
			
		}
		
		if(preventDefault) {
			console.log("I am preventing default browser action!");
			e.preventDefault();
			return false;
		}
		else {
			return true;
		}
		
		
	}

	function getCombo(e) {
		
		var combo = {shift: false, alt: false, ctrl: false, sum: 0};
		if(e.shiftKey) {
			combo.shift = true;
			combo.sum += SHIFT;
		}
		if(e.altKey) {
			combo.alt = true;
			combo.sum  += ALT;
		}
		if(e.ctrlKey) {
			combo.ctrl = true;
			combo.sum  += CTRL;
		}
		return combo;
	}
	
	function keyIsUp(e) {

		e = e || window.event; 
		
		//e.preventDefault();
		
		var charCode = e.charCode || e.keyCode;
		var character = String.fromCharCode(charCode);
		var combo = getCombo(e);

		
		console.log("keyUp: " + charCode + " = " + character + " combo=" + JSON.stringify(combo));
		
		// Check key bindings
		for(var i=0, binding; i<global.keyBindings.length; i++) {
			
			binding = global.keyBindings[i];
			
			if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || binding.combo === undefined) && (binding.dir == "up") ) { // down is the default direction
				
				//console.log("keyUp: Calling function: " + functionName(binding.fun) + "...");

				binding.fun(global.currentFile, combo, character, charCode, "up");
			}
			
		}
		
		
		editor.interact("keyUp");
		
		//return false;

	}

	
	
	function mouseDown(e) {
		
		e = e || windows.event;
		
		// Mouse position is on the current object (Canvas) 
		var mouseX = e.offsetX==undefined?e.layerX:e.offsetX,
			mouseY = e.offsetY==undefined?e.layerY:e.offsetY,
			caret,
			button = e.button,
			click,
			target = e.target,
			mouseDirection = "down",
			preventDefault = false,
			keyboardCombo = getCombo(e),
			funReturn;
		
		//objInfo(target);
		
	
		var menu = document.getElementById("canvasContextmenu");
		
		//console.log("mouseDown on target.className=" + target.className);
		
		if(target.className == "fileCanvas" || target.className == "content centerColumn") {

			editor.hideMenu();

			caret = editor.mousePositionToCaret(mouseX, mouseY);
			

			if(global.currentFile && button == 0) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				// Give focus
				global.currentFile.gotFocus = true;
				
				// Remove focus from everything else
				document.activeElement.blur();
				global.currentFile.canvas.focus();
			
				// Delete selection outside of the canvas
				window.getSelection().removeAllRanges();
				
				/*
					Try to steal focus from any textboxes like find/replace.
					
					Meh, why doesn't this work!!!?
				
				
				document.body.focus(); // global.currentFile.canvas
				
				document.getElementById("leftColumn").focus();
				
				console.log("REFOCUS!");
				*/
			}
			else {
				
				// No current file or not the left button.
				
				editor.showMenu();
				
			}
			
		}
		else{
			if(global.currentFile) {
				// Remove focus
				global.currentFile.gotFocus = false;
				
				//global.currentFile = undefined;
			}
		}
		
		console.log("Mouse down: caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		

		
		for(var i=0, binding; i<global.eventListeners.mouseClick.length; i++) {
			
			click = global.eventListeners.mouseClick[i];
			
			if((click.dir == "down" || click.dir == undefined) && 
				(click.button == button || click.button == undefined) && 
				(click.targetClass == target.className || click.targetClass == undefined) && 
				(click.combo == keyboardCombo.sum || click.combo === undefined) &&
				(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				//console.log("Calling " + functionName(click.fun) + " ...");
				
				// Note that caret is a temporary position caret (not the current file.caret)!
				
				funReturn = click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo); // Call it
				
				if(funReturn === false) {
					preventDefault = true;
				}
				
				
			}
		}
		
		
		editor.interact("mouseDown");
		
		if(preventDefault) {
			e.preventDefault(); // To prevent the annoying menus
			return false;
		}
		
		//return true;

	}

	
	function mouseUp(e) {
		e = e || window.event;

		//e.preventDefault(); // Commented this because I couln't click on selected text inside html input 
		
		// Mouse position is on the current object (Canvas) 
		var mouseX = e.offsetX==undefined?e.layerX:e.offsetX,
			mouseY = e.offsetY==undefined?e.layerY:e.offsetY,
			caret = editor.mousePositionToCaret(mouseX, mouseY),
			button = e.button,
			click,
			target = e.target,
			keyboardCombo = getCombo(e),
			mouseDirection = "up";
		

		console.log("Mouse up on class " + target.className + "!");
		
		for(var i=0, binding; i<global.eventListeners.mouseClick.length; i++) {
			click = global.eventListeners.mouseClick[i];
			
			// Make sure to define click.dir (to prevent double action)!
			if((click.dir == "up" || click.dir == undefined) && 
				(click.button == button || click.button == undefined) && 
				(click.targetClass == target.className || click.targetClass == undefined) && 
				(click.combo == keyboardCombo.sum || click.combo == undefined) && 
				(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
			
				console.log("Calling " + functionName(click.fun) + " ...");

				click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo); // Call it
			}
		}

		
		//console.log("mouseUp, global.render=" + global.render);

		
		editor.interact("mouseUp");
		
		return false;
		//return true;

	}
	
	function mouseMove(e) {
			
		e = e || window.event;

		//e.preventDefault();
 		// Mouse position is on the current object (Canvas) 
		var mouseX = e.offsetX==undefined?e.layerX:e.offsetX;
		var mouseY = e.offsetY==undefined?e.layerY:e.offsetY;

		var target = e.target;
		
		// Mouse position is on the whole page
		global.mouseX = parseInt(e.clientX);
		global.mouseY = parseInt(e.clientY);
		
		//console.log("mouseY=" + mouseY);
		
		for(var i=0, fun; i<global.eventListeners.mouseMove.length; i++) {
			fun = global.eventListeners.mouseMove[i].fun;
			
			//console.log(functionName(fun));
			
			fun(mouseX, mouseY, target); // Call it

		}

		//console.log("global.currentFile.gotFocus=" + global.currentFile.gotFocus);
		
		editor.interact("mouseMove");
		
		//return false;
		
	}
	
	function mouseclick(e) {
		/*
			Check for the global.render flag and render if true
			
			For events that are not bound to mouseUp or mouseDown
		*/
		console.log("mouseClick, global.render=" + global.render + ", global.resize=" + global.resize);
		
		editor.interact("mouseClick");

	}

	
	
	
	
	function scrollWheel(e) {

		e = e || window.event;
		
		console.log("scroll ... e.ctrlKey=" + e.ctrlKey);
		
		
		
		//console.log("wheelDelta=" + e.wheelDelta + " wheelDeltaY=" + e.wheelDeltaY + " deltaY=" + e.deltaY + " detail=" + e.detail );

		var delta = e.wheelDelta || -e.detail,
			target = e.target,
			tagName = target.tagName,
			combo = getCombo(e),
			dir = delta > 0 ? -1 : 1,
			steps = Math.abs(delta);
		
		
		console.log("Scrolling on " + tagName);
		
		if(tagName == "CANVAS") {
			for(var i=0; i<global.eventListeners.scroll.length; i++) {
				global.eventListeners.scroll[i].fun(dir, steps, combo);
			}
		}
		
		editor.interact("mouseScroll");
		
	}
	
	
	function getFile(url, callback) {

		console.log("Opening url:" + url);
		
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = processRequest;
		xmlHttp.open( "GET", url, true );
		xmlHttp.send( null );
		
		function processRequest() {
			if (xmlHttp.readyState == 4) {
				
				//console.log("xmlHttp.status=" + xmlHttp.status);
				
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







	function openFile(text, path) {
		/*
		
			No split screen support (for now ... just resize and bring up another instance instead)
		
			We should however support having many files open!
			
			File focus problem:
			
			When we are not on the "document", lets say we're on a widget, like the search window. 
			Then we do not want keystrokes to propagate to the "document"! Like arrow keys and delete
			We however want all plug-ins that listen on key strokes to work! Like Esc key to hide the search window!
			>And we also want the search widget to know in what file to search (what the currently active file is)
			
			Possible solutions:
			
			Only listen to key strokes if the "document" has focus
				* Esc key wont work
				
			
			The solution:
				Have the arrow, enter, etc plug-ins check file.gotFocus before doing their thing.
			
				
			
		*/
		
		
		console.log("Opening file " + path);
		
		var header = document.getElementById("header");
		
		global.files[path] = new File(text, path, global.fileIndex++);
		
		if(global.currentFile) {
			global.currentFile.hide();
		}

		
		global.currentFile = global.files[path];
		
		
		global.files[path].open();
		
		//global.files[path].canvas.focus();
		
		editor.renderNeeded();

	}
	
	
	function unloadFile(filename) {
		
		global.files[name].close();
		
		delete global.files[name];
		
	}

	function htmlToImage(html, callback) {
		
		if(!callback) console.error(new Error("No callback function in htmlToImage"));
		
		html = html + " "; // Last word wont show unless there's a space at the end! WTF!?
		
		/*
		var data = '<svg xmlns="http://www.w3.org/2000/svg">' +
				   '<foreignObject width="100%" height="100%">' +
				   '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">' +
					 '<em>I</em> like ' + 
					 '<span style="color:white; text-shadow:0 0 2px blue;">' +
					 'cheese</span>' +
				   '</div>' +
				   '</foreignObject>' +
				   '</svg>';

		*/
		
		// The svg seems to need a width and height beforehand, or it will use a default width of 100px
		var width = global.settings.gridWidth * html.length;
		var height = global.settings.gridHeight;
		
		//  width="' + width + '" height="' + height + '"
		
		//console.log("width=" + width);
		
		var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
		             '<foreignObject width="100%" height="100%">' +
		               '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:' + global.settings.style.fontSize + 'px; font-family: ' + global.settings.style.font + ';">' +
		                 html +
		               '</div>' +
		             '</foreignObject>' +
		           '</svg>';
			
		
		var DOMURL = window.URL || window.webkitURL || window;

		var img = new Image();
		var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
		var url = DOMURL.createObjectURL(svg);

		img.onload = function () {
			callback(img);
			DOMURL.revokeObjectURL(url);
			//console.log("Image yo!");

		}

		img.src = url;
	}





})();