"use strict";

//var testfile = "test/testfile.txt";

// The editor object lives in global scope, so that it can be accessed everywhere.
var editor = {};

var tempTest = 0;
var benchmarkCharacter = ".";
var benchmarkCharacterCode = 190;
var inputCount = 0;

// Make your custom settings in settings_overload.js !	These settings should not be changed unless you are adding/changing functionality
editor.settings = {
	devMode: true,  // devMode: true will spew out debug info and make sanity checks (that will make the editor run slower, mostly because of all the console.log's)
	enableSpellchecker: false, // The spell-checker use a lot of CPU power!
	enableDocumentPreview: false, // Use the zoom function instead!? (Alt+Z)
	indentAfterTags: ["div", "ul", "ol", "head", "script", "style", "table", "tr", "form", "select"], // Intendent after these XML tags
	tabSpace: 4, // How much indentation. Note that the editor does all the indentation for you!
	caret: {
		width: 1,
		color: "rgb(0,0,0)"
	},
	leftMargin: 50,
	rightMargin: 50,
	topMargin: 10,
	bottomMargin: 5,
	gridHeight: 23, // 23, 22
	gridWidth: 8.5, // 8.5, 7.8
	sub_pixel_antialias: true, // For the main text area (canvas) only. If set to false, you want to start the editor with --disable-lcd-text
	style: {
		fontSize: 15, // Don't forget to change gridHeight and gridWidth after chaning fontSize!
		font: "Consolas, DejaVu Sans Mono, Liberation Mono, monospace",
		highlightMatchFont: "bold 15px Consolas, DejaVu Sans Mono, Liberation Mono, monospace",
		highlightMatchFontColor: "rgb(31, 119, 32)",
		highlightMissMatchFontColor: "rgb(255, 159, 0)",
		highlightMatchBackground: "rgb(255, 255, 230)",
		textColor: "rgb(0,0,0)", // Should be in rgb(0,0,0) format because some functions like to convert and make darker/lighter/transparent
		bgColor: "rgb(255,255,255)", // Studies say that black on white is the best for readability. todo: themes
		commentColor: "rgb(8, 134, 29)",
		quoteColor: "rgb(51, 128, 128)",
		xmlTagColor: "rgb(0, 21, 162)",
		selectedTextBg: "rgb(193, 214, 253)",
		currentLineColor: "rgb(255, 255, 230)",
		highlightTextBg: "rgb(155, 255, 155)"          // For text highlighting
	},
	wordDelimiters: "(){}[]/*-+\\,'\" \n",
	canBreakAfter: " \n,{}[];",
	canBreakBefore: "}]\t",
	drawGridBox: false,
	scrollStep: 3,
	defaultLineBreakCharacter: "\n", // Can be many, like CR & LF, \n == LF, \r == CR
	bigFileSize: 400000, // Bytes, all files larger then this will be opened as streams
	bigFileLoadRows: 2000, // Rows to load into the editor if the file size is over bigFileSize
	autoCompleteKey: 9, // Tab
	renderColumnOptimization: false, // When typing in a big file that is rendered on each key stroke we might miss the vsync train, this will make characters appear before any parsing etc
	insert: false
};

editor.shouldRender = false;   // Internal flag, use editor.renderNeeded() to re-render!
editor.shouldResize = false;   // Internal flag, use editor.resizeNeeded() to re-size!
editor.fileIndex = -1;   // Keep track on opened files (for undo/redo)
editor.keyBindings = []; // Push objects {char, charCode, combo dir, fun} for key events, more info in docs.
editor.files = {};       // List of all opened files with the path as key
editor.mouseX = 0;       // Current mouse position
editor.mouseY = 0;
editor.info = [];        // Talk bubbles. See editor.addInfo()
editor.version = 0;      // Incremented on each commit. Loaded from version.inc when the editor loads

	

editor.eventListeners = { // Use editor.on to add listeners to these events:
	fileClose: [], 
	fileOpen: [], 
	fileHide: [],
	fileShow: [],
	fileParse: [],
	fileSave: [],
	fileChange: [], 
	mouseScroll: [], 
	mouseClick: [], 
	dblclick: [],
	mouseMove: [],
	paste: [],  // You get a chance to format the pasted data ...
	beforeResize: [],
	afterResize: [],
	exit: [],
	start: [],
	interaction: [],
	keyDown: [],
	moveCaret: [],
	autoComplete: [],
};

editor.renderFunctions = [];
editor.preRenderFunctions = [];

editor.plugins = [];

editor.view = {
	visibleColumns: 0, 
	visibleRows: 0, 
	canvasWidth: 0,
	canvasHeight: 0,
	startingColumn: 0,
	endingColumn: 0
};

editor.tests = []; // {description, fun}

editor.currentFile = undefined; // A File object

editor.input = false; // Wheter inputs should go to the current file in focus or to some other element like an html input box.


(function() { // Non global editor code ...
	
	// These variables and functions are private ...
	// We only expose methods that are in the editor object.
	
	var isIe = (navigator.userAgent.toLowerCase().indexOf("msie") != -1 || navigator.userAgent.toLowerCase().indexOf("trident") != -1);
	
	
	var executeOnNextInteraction = [];
	
	var lastKeyDown = 0;
	var tildeActive = false;
	var tildeShiftActive = false;
	var tildeAltActive = false;
	
	
	var openFileQueue = []; // Files listed here are waiting for data
	
	var canvas, ctx; 
	
	var fileOpenHtmlElement;
	
	var fileOpenExtraCallbacks = {};
	
	var testFirstTest = true;
	
	/*
		Editor functionality (accessible from global scope) By having this code here, we can use private variables
		
		To make it more fun to write plugins, the editor and File object should take care of the "low level" stuff and heavy lifting. 
		Feel free to add more editor API methods below. Do not extend the editor object elsewhere!!
	*/
	
	
	editor.workingDirectory = process.cwd();
	
	
	editor.sortFileList = function() {
		
		// Sorts editor.files by file.order and returns an array of the files
		
		var fileList = [];
		
		for(var path in editor.files) {
			fileList.push(editor.files[path]);
		}
		fileList.sort(sortOrder);
		
		var order = 0;
		
		// debug
		//for(var i=0; i<fileList.length; i++) {
		//	console.log(fileList[i].order + " = " + fileList[i].path);
		//}
		
		// Reorder it
		var order = 0;
		for(var i=0; i<fileList.length; i++) {
			fileList[i].order = order++;
		}
		
		return fileList;
		
		function sortOrder(a, b) {
			if(a.order < b.order) {
				return -1;
			}
			else if(b.order < a.order) {
				return 1;
			}
			else {
				return 0;
			}
		}
	}
	
	
	editor.openFile = function(path, text, callback) {
		/*
			Note: The caller of this function needs to handle file state, 
			such as file.isSaved, file.savedAs and file.changed
			Unless text==undefined, then it will be opened from disk and asumed saved.
			
			problem: The same file might be opened many times while we are waiting for it's data
			solution1: (did not work due to plugins using the editor.files list to build stuff) Add temporary emty object to editor.files while opening the file.
			solution2: A list of files that are beaing opened
		*/
		
		var file = null;
		
		
		console.log("Opening file: " + path + " typeof text=" + typeof text);
		
		if(typeof text === "function") throw new Error("The callback should be in the third argument. Second argument is for file content");
		
		
		// Check if the file is already opened
		if(editor.files.hasOwnProperty(path)) {
			console.warn("File already opened: " + path);
			
			/*
				What to do!?
				
				a) Reload file from disk ... ? If it's not saved, ask
				b) Add a incrementor to the name
				c) Switch to it
				
				If text is undefined, switch to the file already opened, else add a number incrementor to the path.
			*/
			
			if(text == undefined) {
				
				var file = editor.files[path];
				
				if(!editor.currentFile) return fileOpenError(new Error("Internal error: No current file!")); // For sanity
				
				if(editor.currentFile != file) {
					// Switch to it ...
					
					if(text != undefined && text != file.text) throw new Error("File already opened. But the text argument is not the same as the text in the file! path=" + file.path);
					
					editor.showFile(file);
				}
				
				if(callback) callback(file);
				return;
			}
			else {
				
				var nr = 0;
				var pathPart1 = path.substring(0, path.lastIndexOf("."));
				var pathPart2 = path.substring(path.lastIndexOf("."), path.length);
				
				if(pathPart1=="") {
					// path has no dot
					pathPart1 = pathPart2;
					pathPart2 = "";
				}
				while(editor.files.hasOwnProperty(path)) {
					path = pathPart1 + " (" + ++nr + ")" + pathPart2;
				}
			}
		}
		
		if(openFileQueue.indexOf(path) != -1) {
			
			// Add callback to the waiting list to be called once the file has been loaded
			if(callback) {
				if(!fileOpenExtraCallbacks.hasOwnProperty(path)) fileOpenExtraCallbacks[path] = [];
				fileOpenExtraCallbacks[path].push(callback);
			}
			/*
				var err = new Error("File is already in the queue to be opened, please wait!");			
				err.code = "INQUEUE";
				return fileOpenError(err);
			*/
		}
		
		if(!isString(path)) return fileOpenError(new Error("path is not a string: " + path));
		
		openFileQueue.push(path); // Add the file to the queue AFTER checking if it's in the queue
		
		if(text == undefined) {
			
			if(runtime!="browser") {
				var fspath = require("path");
				if(!fspath.isAbsolute(path)) {
					let absolutePath = fspath.resolve(path);
					console.warn("Making path absolute: " + path + " ==> " + absolutePath);
					path = absolutePath; // Make the path absolute
				}
			}
			console.warn("Text is undefined! Reading file from disk: " + path)
			
			// Check the file size
			editor.getFileSizeOnDisk(path, function gotFileSize(fileSizeInBytes, err) {
				
				if(err) {
					
					if(err.code == "ENOENT") alert("File not found: " + path);
					
					fileOpenError(err);
				}
				else {
					
					console.log("fileSizeInBytes=" + fileSizeInBytes);
					
					if(fileSizeInBytes > editor.settings.bigFileSize) {
						console.warn("File larger then " + editor.settings.bigFileSize + " bytes. It will be opened as a stream!");
						let notFromDisk = false;
						let tooBig = true;
						let text = "";
						load(path, text, notFromDisk, tooBig);
					}
					else {
						editor.readFromDisk(path, load);
					}
				}
			});
			
		}
		else {
			
			//console.log("text is NOT undefined! But is it a string?");
			if(!isString(text)) {
				console.log("text=" + text);
				return fileOpenError(new Error("text is not a string!"));
				
			}
			else {
				load(path, text, true);
			}
			
		}
		
		function load(path, text, notFromDisk, tooBig) {
			console.log("Loading file to editor: " + path);
			
			if(editor.files.hasOwnProperty(path)) throw new Error("File is already opened!");
			
			// Do not add file to editor.files until its fully loaded! And fileOpen events can be run sync
			var newFile = new File(text, path, ++editor.fileIndex, tooBig, fileLoaded);
			
			if(!newFile.path) fileOpenError(new Error("Internal error: The file has no path!")); // For sanity
			
			if(!notFromDisk) {
				// Because we opened it from disk:
				newFile.isSaved = true;
				newFile.savedAs = true;
				newFile.changed = false;
			}
			
			function fileLoaded() {
				
				// Dilemma: Should file open even listeners be called before or after the callback!??
				
				// Dilemma 2: Should fileOpen events fire before or after fileShow events?
				
				editor.files[path] = newFile;
				
				file = editor.files[path];
				
				if(!editor.files.hasOwnProperty(path)) throw new Error("File didn't enter editor.files"); // For sanity
				
				for(var p in editor.files) { // Make sure we are not insane
					if(!editor.files[p].path) fileOpenError(new Error("Internal error: File without path=" + p));
				}
				
				console.log("Calling fileOpen listeners (" + editor.eventListeners.fileOpen.length + ") path=" + path);
				for(var i=0; i<editor.eventListeners.fileOpen.length; i++) {
					//console.log("function " + getFunctionName(editor.eventListeners.fileOpen[i].fun));
					editor.eventListeners.fileOpen[i].fun(file); // Call function
				}
				
				// Switch to this file
				editor.showFile(file);
				editor.view.endingColumn = editor.view.visibleColumns; // Because file.startColumn = 0;
				
				callCallbacks(file);
				
				openFileQueue.splice(openFileQueue.indexOf(path), 1); // Take the file off the queue
				
				// Always render (and resize) after opening a file! (where=here, when=now!)
				editor.renderNeeded();
				
			}
			
		}
		
		function fileOpenError(err) {
			openFileQueue.splice(openFileQueue.indexOf(path), 1); // Take the file off the queue
			
			console.warn(err.message);
			
			callCallbacks(file, err);
			
			console.warn("Error when opening file path=" + path + " message: " + err.message);
			
			return err;
			
		}
		
		function callCallbacks(file, err) {
			if(err) console.warn(err.message);
			
			if(callback) {
				callback(file, err); // after fileOpen even: reasoning: some plugin might want to add fileopen events AFTER they have opened a particular file
			}
			else if(file) {
				console.log("No callback for file.path=" + file.path);
			}
			
			if(fileOpenExtraCallbacks.hasOwnProperty(path)) {
				// Call the other callbacks that are also waiting for the file to be opened
				for(var i=0; i<fileOpenExtraCallbacks[path].length; i++) {
					fileOpenExtraCallbacks[path][i](file, err);
				}
				// Then remove them
				delete fileOpenExtraCallbacks[path]
			}
		}
		
	}
	
	
	editor.getFileSizeOnDisk = function(path, callback) {
		// Check the file size
		
		if(!callback) throw new Error("Callback not defined!");
		
		if(runtime=="browser") {
			var xhr = new XMLHttpRequest();
			xhr.open("HEAD", path, true); // Notice "HEAD" instead of "GET", to get only the header
			xhr.onreadystatechange = function() {
				if (this.readyState == this.DONE) {
					callback(parseInt(xhr.getResponseHeader("Content-Length")));
				}
			};
			xhr.send();
		}
		else {
			var fs = require("fs");
			
			fs.stat(path, checkSize);
			
			function checkSize(err, stats) {
				
				if(err) callback(-1, err)
				else callback(stats["size"]);
				
			}
		}
	}
	
	editor.doesFileExist = function(path, callback) {
		// An easier method then getFileSizeOnDisk to check if a file exist on disk (add support for other protocols later!?)
		// Be aware of racing conditions, it's often better to just open the file and see what happends
		
		editor.getFileSizeOnDisk(path, gotSize);
		
		function gotSize(size, err) {
			
			if(err) {
				if(err.code === 'ENOENT') {
					callback(false);
				}
				else {
					console.warn("Unexpected error when checking if file exist:")
					throw err;
				}
			}
			else {
				callback(true);
			}
		}
	}
	
	editor.lastChangedFile = function(excludeFileList) {
		// Returns the file that was last changed
		
		var files = Object.keys(editor.files);
		
		if(files.length == 0) return undefined;
		
		files.sort(function(a, b) {
			return editor.files[a].lastChanged < editor.files[b].lastChanged;
		});
		
		var index = 0;
		var file = editor.files[files[index]];
		
		if(excludeFileList) {
			// Make sure the files in thist list doesn't get selected
			index++;
			while(file != undefined && excludeFileList.indexOf(file) != -1) {
				if(index == files.length) file = undefined
				else file = editor.files[files[index]];
				index++;
			}
		}
		
		return file;
		
	}
	
	editor.closeFile = function(path, doNotSwitchFile) {
		
		if(!editor.files.hasOwnProperty(path)) {
			throw new Error("Can't close file that is not open: " + path);
		}
		else {
			
			console.log("Closing file: path=" + path);
			
			var file = editor.files[path];
			
			// Call listeners (before we switch to another file, and before we delete the file content)
			console.log("Calling fileClose listeners (" + editor.eventListeners.fileClose.length + ") ...");
			for(var i=0; i<editor.eventListeners.fileClose.length; i++) {
				editor.eventListeners.fileClose[i].fun(file); // Call function
			}
			
			// Make sure lastFile is not the file being closed
			if(editor.lastFile == file) {
				console.warn("lastFile is the file being closed!");
				editor.lastFile = editor.lastChangedFile([file]);
				console.log("Changed lastfile to: " + editor.lastFile.path);
			}
			// Make sure lastFile is not currentFile
			if(editor.lastFile == editor.currentFile && editor.lastFile != undefined) {
				console.warn("lastFile is the currentFile:" + editor.currentFile.path);
				editor.lastFile = editor.lastChangedFile([editor.currentFile, file]);
			}
			
			// Sanity check
			if(editor.lastFile) {
				if(!editor.files.hasOwnProperty(editor.lastFile.path)) {
					throw new Error("editor.lastFile does not exist in editor.files! path=" + editor.lastFile.path + "\nWhen closing file.path=" + file.path);
					return;
				}
			}
			
			var switchTo; // Have to check this before removing the file reference
			if(editor.currentFile == file) {
				
				editor.currentFile = undefined; // Closed, kinda
				
				if(!doNotSwitchFile) { // double negative => true
					
					// The file we are closing is the current file, and we are "allowed" to swith 
					if(editor.lastFile) switchTo = editor.lastFile;
				}
			}
			
			delete editor.files[file.path]; // Remove all references to the file BEFORE switching to another file
			
			if(switchTo) {
				editor.showFile(switchTo);
				console.log("Showing '" + switchTo.path + "' because '" + path + "' was closing.");
			}
			
			// Sanity check again. Make shure we didn't switch to the file being closed
			if(editor.currentFile) {
				if(editor.currentFile.path == path) {
					throw new Error("The file being closed somehow ended up as editor.currentFile .!? path=" + path);
				}
			}
		}
	}
	
	
	editor.readFileSync = function(path) {
		var fs = require("fs");
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
		// todo: Rename this function, or refactor, because we can also run in the browser!
		
		if(runtime == "nw.js") {
			var fs = require("fs");
			
			console.log("Reading file from disk: " + path);
			console.log(getStack("Read from disk"));
			
			if(!callback) {
				throw new Error("No callback defined!");
			}
			
			if(returnBuffer) {
				// If no encoding is specified in fs.readFile, then the raw buffer is returned.
				
				fs.readFile(path, function(err, buffer) {
					if (err) throw err;
					
					callback(path, buffer);
					
				});
			}
			else {
				
				if(encoding == undefined) encoding = "utf8";
				fs.readFile(path, encoding, function(err, string) {
					if (err) throw err;
					
					callback(path, string);
					
				});
			}
			
		}
		else if(runtime == "browser") {
			getFile(path, function(string, url) {
				callback(url, string);
			});
		}
		
	}
	
	
	editor.saveFile = function(file, path, callback) {
		/*
			This is the only save function.
			It can handle "save-as". 
		*/
		
		if(file == undefined) file = editor.currentFile;
		
		if(!file) {
			throw new Error("No file open when save was called");
		}
		
		
		// Do not specify path for saving in old path!
		
		if(editor.files.hasOwnProperty(path)) throw new Error("There is already a file open with path=" + path);
		
		if(path == undefined) {
			path = file.path;
		}
		
		var text = file.text; // Save the text, do not count on the garbage collector the be "slow"
		
		if(file.path != path) {
			
			console.warn("File will be saved under another path; old=" + file.path + " new=" + path);
			
			// We must close and reopen the file so that plugins keeping track of open files do not go nuts.
			
			editor.closeFile(file.path, true); // true = do not switch to another file
			
			editor.openFile(path, text, saveToDisk); // Reopen the file with the new path, makes sure fileSave events in file.save gets called after we have a new path.
			
		}
		else {
			saveToDisk(file);
		}
		
		function saveToDisk(file) {
			var fs = require("fs");
			fs.writeFile(path, file.text, function(err) {
				console.log("Attempting saving to disk: " + path + " ...");
				
				if(err) {
					alert("Unable to save file! " + err.message + "\n" + path);
					console.warn("Unable to save " + path + "!");
					throw err;
				}
				else {
					console.log("The file was successfully saved: " + path + "");
					
					file.saved(); // Call functions that listen for save events
					
					if(callback) callback();
				}
				
			});
		}
	}
	
	
	editor.fileSaveDialog = function(defaultPath, callback) {
		/*
			Brings up the OS save file dialog window and calls the callback with the path.
		*/
		editor.filesaveAsCallback = callback;
		
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
			File path is then passed to the callback function.
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
	
	editor.renderNeeded = function() {
		// Tell the editor that it needs to render
		
		if(editor.settings.devMode && editor.shouldRender == false) {
			// For debugging, so we know why a render was needed
			console.log(getStack("renderNeeded"));
		}
		editor.shouldRender = true;
	}
	
	editor.resizeNeeded = function() {
		// Tell the editor that it needs to resize
		if(editor.settings.devMode && editor.shouldResize == false) {
			// For debugging, so we know why a resize was needed
			console.log(getStack("resizeNeeded"));
		}
		editor.shouldResize = true;
	}
	
	editor.render = function() {
		
		if(!editor.shouldRender) {
			console.warn("Not rendering because it's not needed!");
			return;
		}
		if(editor.shouldResize) {
			console.warn("Resizing before rendering!");
			editor.resize();
		}
		
		
		
		editor.shouldRender = false; // Flag (change to true whenever we need to render)
		
		//console.log("rendering ... editor.shouldResize=" + editor.shouldResize + "");
		
		if(editor.currentFile) {
			
			if(!editor.currentFile.render) {
				console.warn("File render flag set to '" + editor.currentFile.render + "'");
				
				// Just paint the background
				ctx.fillStyle = editor.settings.style.bgColor;
				
				//ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				return;
			}
			
			console.time("render");
			
			var file = editor.currentFile,
			buffer = [],
			grid = editor.currentFile.grid;
			
			
			var funName = "";
			
			
			// The reason why we clone the rows and not just push the pointer, is so that the coloring functions don't have to reset all the colors!
			
			// Create the buffer
			//console.time("createBuffer");
			var bufferStartRow = Math.max(0, file.startRow);
			var bufferEndRow = Math.min(grid.length, file.startRow+editor.view.visibleRows);
			for(var row = bufferStartRow; row < bufferEndRow; row++) {
				buffer.push(file.cloneRow(row)); // Clone the row
			}
			//console.timeEnd("createBuffer");
			
			if(buffer.length == 0) {
				console.warn("buffer is zero! file.startRow=" + file.startRow + " grid.length=" + grid.length + " editor.view.visibleRows=" + editor.view.visibleRows);
			}
			
			// Load on the fly functionality on the buffer
			
			// Actually measuring the time is a lot of overhead! Only uncomment if you are debugging performance issues.
			//console.time("preRenders");
			for(var i=0; i<editor.preRenderFunctions.length; i++) {
				//funName = getFunctionName(editor.preRenderFunctions[i]);
				//console.time("prerender: " + funName);
				buffer = editor.preRenderFunctions[i](buffer, file); // Call render
				//console.timeEnd("prerender: " + funName);
			}
			//console.timeEnd("preRenders");
			
			
			//ctx.imageSmoothingEnabled = true;
			
			//ctx.translate(0,0);
			
			ctx.fillStyle = editor.settings.style.bgColor;
			
			//ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			//console.time("renders");
			for(var i=0; i<editor.renderFunctions.length; i++) {
				//funName = getFunctionName(editor.renderFunctions[i]);
				//console.time("render: " + funName);
				editor.renderFunctions[i](ctx, buffer, editor.currentFile); // Call render
				//console.timeEnd("render: " + funName);
			}
			//console.timeEnd("renders");
			
			
			editor.renderCaret(file.caret);
			
			
			console.timeEnd("render");
			
		}
		else {
			// Show some useful info for new users
			
			var keyCombo = editor.getKeyFor("openFile");
			
			ctx.fillStyle = editor.settings.style.bgColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			ctx.fillStyle = editor.settings.style.textColor;
			
			ctx.font=editor.settings.style.fontSize + "px " + editor.settings.style.font;
			ctx.textBaseline = "top";
			
			var friendlyString = keyCombo +" to open a file";
			// Place the string in the center
			var textMeasure = ctx.measureText(friendlyString);
			var left = editor.view.canvasWidth / 2 - textMeasure.width / 2;
			var top =  editor.view.canvasHeight / 2 - 20;
			
			ctx.beginPath(); // Reset all the paths!
			
			ctx.fillText(friendlyString, left, top);
			
			console.log("No file open");
		}
		
		//console.log("rendering finish");
	}
	
	editor.renderRow = function(gridRow) {
		
		console.log("rendering ROW ... editor.shouldResize=" + editor.shouldResize + "");
		
		if(editor.currentFile) {
			
			var file = editor.currentFile;
			
			if(gridRow == undefined) gridRow = file.caret.row;
			if(file.grid.length <= gridRow) throw new Error("gridRow=" + gridRow + " over file.grid.length=" + file.grid.length + " ");
			
			if(!file.rowVisible(gridRow)) {
				console.warn("Row=" + gridRow + " not in view!");
				return;
			}
			
			var screenRow = Math.max(0, gridRow - file.startRow);
			
			console.time("renderRow");
			
			var buffer = [];
			
			// Create the buffer
			buffer.push(file.cloneRow(gridRow)); // Clone the row
			
			
			// Load on the fly functionality on the buffer
			// No prerender when rendering rows!?
			
			for(var i=0; i<editor.preRenderFunctions.length; i++) {
				buffer = editor.preRenderFunctions[i](buffer, file);
			}
			
			//console.log(JSON.stringify(buffer, null, 4));
			
			ctx.fillStyle = editor.settings.style.bgColor;
			
			var top = editor.settings.topMargin + screenRow * editor.settings.gridHeight;
			
			// Clear only that row
			ctx.fillRect(0, top, canvas.width, editor.settings.gridHeight);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			for(var i=0; i<editor.renderFunctions.length; i++) {
				editor.renderFunctions[i](ctx, buffer, file, screenRow); // Call render
			}
			
			console.timeEnd("renderRow");
			
		}
		else {
			console.log("No file open");
		}
		
	}
	
	
	editor.renderColumn = function(row, col, character, textColor) {
		// For optimization: Prints a character on the screen.
		
		if(textColor == undefined) textColor = editor.settings.style.textColor;
		
		var file = editor.currentFile;
		
		var top = editor.settings.topMargin + (row - file.startRow) * editor.settings.gridHeight;
		var left = editor.settings.leftMargin + (col + (file.grid[row].indentation * editor.settings.tabSpace) - file.startColumn) * editor.settings.gridWidth;
		
		ctx.fillStyle = textColor;
		
		//ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillText(character, left, top);
		
	}
	
	editor.clearColumn = function(row, col) {
		// For optimization: Clears a box (screen area)
		
		var file = editor.currentFile;
		
		var top = editor.settings.topMargin + (row - file.startRow) * editor.settings.gridHeight;
		var left = editor.settings.leftMargin + (col + (file.grid[row].indentation * editor.settings.tabSpace) - file.startColumn) * editor.settings.gridWidth - 0.5; // -0.5 to clear sub pixels (caret)
		
		if(row == file.caret.row) {
			ctx.fillStyle = editor.settings.style.currentLineColor;
		}
		else {
			ctx.fillStyle = editor.settings.style.bgColor;
		}
		
		//ctx.fillStyle = "rgba(255,0,0, 0.5)";
		ctx.fillRect(left, top, editor.settings.gridWidth, editor.settings.gridHeight);
		
	}
	
	editor.renderCaret = function(caret, colPlus) {
		
		if(colPlus == undefined) colPlus = 0;
		
		var row = caret.row;
		var col = caret.col + colPlus;
		
		var file = editor.currentFile;
		
		// Math.floor to prevent sub pixels
		var top = Math.floor(editor.settings.topMargin + (row - file.startRow) * editor.settings.gridHeight);
		var left = Math.floor(editor.settings.leftMargin + (col + (file.grid[row].indentation * editor.settings.tabSpace) - file.startColumn) * editor.settings.gridWidth);
		
		ctx.fillStyle = editor.settings.caret.color;
		
		ctx.fillRect(left, top, editor.settings.caret.width, editor.settings.gridHeight);
		
		// Show the "direction" of the caret
		ctx.fillRect(left, top+editor.settings.gridHeight - editor.settings.caret.width, 4, editor.settings.caret.width);
		
	}
	
	
	editor.resize = function(e) {
		/*
			
			Why does the resize clear the canvas's !???
			
		*/
		
		if(!editor.shouldResize) return; // Don't resize if it's not needed.
		editor.shouldResize = false; // Prevent this function from running again
		
		//if(global.lastKeyPressed=="a") throw new Error("why resize now?");
		
		console.log("Resizing ... e=" + e + " editor.shouldRender=" + editor.shouldRender + "");
		
		console.time("resize");
		
		// Remove the wrapper styles so they get dynamic
		var wrappers = document.getElementsByClassName("wrap");
		for (var i = 0; i < wrappers.length; i++) {
			wrappers[i].style.height = "auto";
			wrappers[i].style.width = "auto";
		}
		
		
		// Resize listeners (before)
		console.log("Calling beforeResize listeners (" + editor.eventListeners.beforeResize.length + ") ...");
		for(var i=0; i<editor.eventListeners.beforeResize.length; i++) {
			editor.eventListeners.beforeResize[i].fun(editor.currentFile);
		}
		
		/* The canvas elements mess up the layout, so we need to hide them before calculating their new widths
			var canvasNodes = document.getElementsByTagName("CANVAS");
			for(var i=0; i<canvasNodes.length; i++) {
			canvasNodes[i].style.display = "none";
			}
		*/
		
		
		
		
		
		
		// Save focus for the current file and give back focus after ther resize
		var file = editor.currentFile;
		
		
		
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
		
		editor.height = windowHeight;
		editor.with = windowWidth;
		
		
		//objInfo(centerColumn);
		
		
		//editor.view.canvasWidth = windowWidth - leftRightColumnWidth;
		editor.view.canvasWidth = contentWidth;
		editor.view.canvasHeight = contentHeight;
		/*
			editor.view.canvasWidth = (windowWidth - leftRightColumnWidth);
			editor.view.canvasHeight = (windowHeight - headerFooterHeight);
			
			
			content.style.width = editor.view.canvasWidth + "px";
			content.style.height = editor.view.canvasHeight + "px";
		*/
		
		console.log("canvasWidth=" + editor.view.canvasWidth);
		console.log("canvasHeight=" + editor.view.canvasHeight);
		
		
		leftColumn.style.height = editor.view.canvasHeight + "px";
		rightColumn.style.height = editor.view.canvasHeight + "px";
		
		
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
		editor.view.visibleColumns = Math.ceil((editor.view.canvasWidth - editor.settings.leftMargin - editor.settings.rightMargin) / editor.settings.gridWidth);
		
		//console.log("(resize1) editor.view.visibleColumns=" + editor.view.visibleColumns);
		//console.log("(resize1) editor.view.endingColumn=" + editor.view.endingColumn);
		
		// ceil (overflow)
		editor.view.visibleRows = Math.ceil((editor.view.canvasHeight - editor.settings.topMargin - editor.settings.bottomMargin) / editor.settings.gridHeight);
		
		//console.log("visibleRows=" + editor.view.visibleRows);
		//console.log("topMargin=" + editor.settings.topMargin);
		//console.log("bottomMargin=" + editor.settings.bottomMargin);
		
		
		canvas.style.width = editor.view.canvasWidth + "px";
		canvas.style.height = editor.view.canvasHeight + "px";
		
		canvas.width  = editor.view.canvasWidth;
		canvas.height = editor.view.canvasHeight;
		
		if(editor.currentFile) {
			// Fix horizontal column after resizing
			if(editor.view.endingColumn < editor.view.visibleColumns) {
				editor.currentFile.startColumn = 0;
				editor.view.endingColumn = editor.view.visibleColumns;
			}
			else {
				editor.view.endingColumn = editor.currentFile.startColumn + editor.view.visibleColumns;
			}
			
		}
		else {
			console.warn("No current file! editor.currentFile=" + editor.currentFile);
			editor.view.endingColumn = editor.view.visibleColumns;
			
		}
		
		//console.log("(resize2) editor.view.visibleColumns=" + editor.view.visibleColumns);
		//console.log("(resize2) editor.view.endingColumn=" + editor.view.endingColumn);
		
		// Resize listeners (after)
		console.log("Calling afterResize listeners (" + editor.eventListeners.afterResize.length + ") ...");
		for(var i=0; i<editor.eventListeners.afterResize.length; i++) {
			editor.eventListeners.afterResize[i].fun(editor.currentFile);
		}
		
		// Show the canvas nodes again
		//setTimeout(showCanvasNodes, 1000);
		
		//showCanvasNodes();
		
		// Show the file canvas again and set focus
		
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
		
		editor.renderNeeded();
		editor.render(); // Always render (right away to brevent black background blink) after a resize
		
		//editor.renderNeeded(); // Always render after a resize (but nor right away!?
		
	}
	
	editor.on = function(eventName, callback, order) {
		/*
			lowest order nr will execute first!
		*/
		
		if(typeof callback !== "function") throw new Error("The second argument needs to be a function! Did you mean editor.addEvent ?");
		
		return editor.addEvent(eventName, {fun: callback, order: order});
	}
	
	editor.addEvent = function(eventName, options) {
		
		if(!(eventName in editor.eventListeners)) {
			throw "eventName=" + eventName + " does not exist in editor.eventListeners!";
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
				throw new Error("A function, or an object with the property fun, need to be passed in the second argument! options=" + options);
			}
		}
		
		if(options.order == undefined) options.order = 1;
		if(typeof options.fun != "function") {
			throw new Error("There needs to be a function!");
		}
		
		var index = editor.eventListeners[eventName].push(options);
		
		// Sort the events so they fire in order (lowest order nr will execute first)
		editor.eventListeners[eventName].sort(function(a, b) {
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
		var fname = getFunctionName(fun);
		var events = editor.eventListeners[eventName];
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
	
	
	editor.addMenuItem = function(htmlText, callback, position) {
		var menu = document.getElementById("canvasContextmenu");
		
		var menuElement = document.createElement("li");
		menuElement.innerHTML = htmlText;
		
		if(callback) menuElement.onclick = callback;
		
		if(position) {
			if(position < 0) position = 0
			else if(position >= menu.children.length) position = menu.children.length-1;
			menu.insertBefore(menuElement, menu.children[position]);
		}
		else {
			menu.appendChild(menuElement);
		}
		
		// Don't forget to call editor.hideMenu() after the item has been clicked!
		
		return menuElement;
	}
	
	editor.removeMenuItem = function(menuElement) {
		
		if(!menuElement) return;
		if(!menuElement.tagName) return; // It's node a Node
		
		var menu = document.getElementById("canvasContextmenu");
		
		var positionIndex = Array.prototype.indexOf.call(menu.children, menuElement);
		
		menu.removeChild(menuElement);
		
		return positionIndex; // So we can insert another node at this position
		
		function getItemPosition(child) {
			var i = 0;
			while( (child = child.previousSibling) != null ) i++;
			return i;
		}
		
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
		
		if(editor.currentFile) editor.input = true; // Give focus back for text entry
		
	}
	
	editor.showMenu = function(posX, posY) {
		var menu = document.getElementById("canvasContextmenu");
		var notUpOnMenu = 6; // displace the menu so that the mouse-up event doesn't fire on it
		var menuDownABit = 10;
		
		if(posX === editor.mouseX || posX === undefined) posX = editor.mouseX + notUpOnMenu;
		
		if(posY === undefined) posY = editor.mouseY + menuDownABit;
		
		// Make sure it fits on the screen!!
		/*
			setTimeout(function() { // Wait for div content to load
			
			}, 100); 
		*/
		var offsetHeight = parseInt(menu.offsetHeight);
		var offsetWidth = parseInt(menu.offsetWidth);
		
		if((posY+offsetHeight) > editor.height) posY = editor.height - offsetHeight;
		if((posX+offsetWidth) > editor.with) posX = editor.with - offsetWidth;
		
		if(posX <= editor.mouseX) {
			// Place the menu on the left side
			posX = editor.mouseX - offsetWidth - notUpOnMenu;
		}
		
		menu.style.visibility = "visible";
		menu.style.top = posY + "px";
		menu.style.left = posX + "px";
	}
	
	editor.addInfo = function(row, col, txt) {
		// Will display a talk bubble (plugin/render_info.js)
		var info = editor.info;
		
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
				
				//editor.currentFile.canvas.getContext("2d").drawImage(imgArray[0], 0, 0);		
				
				
				if(++imagesMade == imagesToMake) {
					allImagesMade();
				}
			});
			
			
		}
		
	}
	
	editor.removeAllInfo = function(row, col, txt) {
		// Find the item in the array, then splice it ...
		var info = editor.info;
		
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
		
		if(editor.eventListeners.interaction.length > 0) {
			console.log("Calling interaction listeners (" + editor.eventListeners.interaction.length + ") ...");
			for(var i=0; i<editor.eventListeners.interaction.length; i++) {
				editor.eventListeners.interaction[i].fun(editor.currentFile); // Call function
			}
		}
		
		resizeAndRender();
		
	}
	
	editor.fireEvent = function(eventName) {
		
		//throw new Error("todo: shift/splice arguments before sending them to listener");
		
		var eventListeners;
		var func;
		
		if(eventName in editor.eventListeners) {
			
			eventListeners = editor.eventListeners[eventName];
			
			console.log("Calling " + eventName + " listeners (" + editor.eventListeners[eventName].length + ") ...");
			for(var i=0; i<eventListeners.length; i++) {
				func = eventListeners[i].fun;
				
				if(func == undefined) throw new Error("Undefined function in " + eventName + " listener!");
				
				//fun.apply(this, Array.prototype.shift.call(arguments)); // Remove eventName from arguments
				
				func.apply(this, Array.prototype.slice.call(arguments, 1));
				
			}
			
			// editor.eventListeners[eventName] // ?????
		}
		else {
			throw new Error("Uknown event listener:" + eventName);
		}
		
	}
	
	editor.addRender = function(fun) {
		return editor.renderFunctions.push(fun) - 1;
	}
	editor.removeRender = function(fun) {
		return removeFrom(editor.renderFunctions, fun)
	}
	
	editor.addPreRender = function(renderFunction) {
		return editor.preRenderFunctions.push(fun) - 1;
	}
	editor.removePreRender = function(renderFunction) {
		return removeFrom(editor.preRenderFunctions, fun);
	}
	
	editor.mousePositionToCaret = function (mouseX, mouseY) {
		/*
			Returns a caret on the file.grid
			
			We need to know row indentation to know what column!
			
			We also need to take into account how much is scrolled
			
			FILE CARET IS BOUND TO THE GRID!
			caret.index is always the index in file.text (it doesn't correspond to the position in a big file)
			
		*/
		if(editor.currentFile) {
			
			var file = editor.currentFile,
			grid = file.grid,
			clickFeel = editor.settings.gridWidth / 2;
			
			var mouseRow = Math.floor((mouseY - editor.settings.topMargin) / editor.settings.gridHeight) + file.startRow;
			
			//console.log("mouseRow=" + mouseRow);
			
			if(mouseRow >= grid.length) {
				console.warn("Mouse position, mouseRow=" + mouseRow + " >= grid.length=" + grid.length + ". file.partStartRow=" + file.partStartRow + " file.totalRows=" + file.totalRows);
				
				// For example when clicking under the text when scrolled down so only half the screen contains text
				return file.createCaret(undefined, grid.length-1, 0);
				
			}
			else if(mouseRow < 0) {
				console.warn("Mouse position above the grid!");
				return file.createCaret(0, 0, 0);
			}
			else {
				var gridRow = grid[mouseRow];
				
				//console.log("Mouse on row " + gridRow.lineNumber);
				
				//console.log("indentation=" + gridRow.indentation);
				
				var mouseCol = Math.floor((mouseX - editor.settings.leftMargin - (gridRow.indentation * editor.settings.tabSpace - file.startColumn) * editor.settings.gridWidth + clickFeel) / editor.settings.gridWidth);
				
				//console.log("mouseCol=" + mouseCol);
				
				if(mouseCol > gridRow.length) { // End of line
					mouseCol = gridRow.length;
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
		
		if(!editor.input) return true;
		
		var wordDelimiters = " ()[]{}+-/<>\r\n!";
		var char = "";
		var word = "";
		var options = []; // Word options
		var mcl = []; // Move caret left
		
		// Go left to get the word
		for(var i=file.caret.index-1; i>-1; i--) {
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
		
		console.log("Calling autoComplete listeners (" + editor.eventListeners.autoComplete.length + ") ...");
		for(var i=0; i<editor.eventListeners.autoComplete.length; i++) {
			
			fun = editor.eventListeners.autoComplete[i].fun;
			ret = fun(file, word, wordLength, options.length);
			
			console.log("function " + getFunctionName(fun) + " returned: " + JSON.stringify(ret));
			
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
					throw new Error(getFunctionName(fun) + " did not return an array");
				}
			}
		}
		
		if(options.length != mcl.length) {
			throw new Error("Something went wrong! options=" + JSON.stringify(options) + "\nmcl=" +  JSON.stringify(mcl) + " ");
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
				
				/*
					Removing the whole word is very annoying if that's Not what the user intended!
					Can me make a smart decision somehow!?
					
					ex: User writes editor.curr| but there is not editor.curr.. BUT there's a currentFile
					
					
				*/
				console.warn("Deleting word=" + word + " to autocomple wholeWord=" + wholeWord);
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
	
	editor.exit = function() {
		/* Close the editor
			
			Or just hide it?
			And listen to an event that will bring it back!?
			
		*/
		window.close();
		
	}
	
	editor.showFile = function(file, focus) {
		
		console.log("Showing " + file.path + " (editor.focus=" + editor.input + " focus=" + focus + "");
		
		if(file == editor.currentFile) {
			console.warn("File already in view: " + file.path);
			return false;
		}
		
		if(!editor.files.hasOwnProperty(file.path)) throw new Error("Showing a file that is not open!");
		
		if(editor.currentFile) {
			// Hide current file
			
			console.log("Calling fileHide listeners (" + editor.eventListeners.fileHide.length + ") editor.currentFile.path=" + editor.currentFile.path);
			for(var i=0; i<editor.eventListeners.fileHide.length; i++) {
				editor.eventListeners.fileHide[i].fun(editor.currentFile); // Call function
			}
			
			if(editor.currentFile) editor.lastFile = editor.currentFile
			else editor.lastFile = editor.lastChangedFile([file]);
			
		}
		
		editor.currentFile = file;
		
		if(editor.currentFile == editor.lastFile) {
			editor.lastFile = editor.lastChangedFile([editor.currentFile]);
		}
		
		if(focus == undefined) focus = true;
		
		// Set window title
		if(runtime=="nw.js") {
			var gui = require('nw.gui');
			var win = gui.Window.get();
			win.title = file.path;
		}
		else if(runtime=="browser") {
			window.title = file.path;
		}
		
		// Save as dir should start in the same dir as the last saved-as viewed file, (not last opened)
		if(file.savedAs) {
			editor.setFileSavePath(file.path);
			editor.setFileOpenPath(editor.getDir(file.path));
		}
		
		editor.input = focus;
		
		console.log("Calling fileShow listeners (" + editor.eventListeners.fileShow.length + ") file.path=" + file.path);
		for(var i=0; i<editor.eventListeners.fileShow.length; i++) {
			editor.eventListeners.fileShow[i].fun(file); // Call function
		}
		
		editor.renderNeeded();
		
		
	}
	
	editor.getDir = function (path) {
		/*
			Returns the directory of a file path
		*/
		
		if(path == undefined) {
			if(editor.currentFile) {
				path = editor.currentFile.path;
			}
			else {
				console.warn("No file open!");
				return process.cwd(); // Return (editor) working dir
			}
			
		}
		
		return path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
	}
	
	editor.getKeyFor = function(funName) {
		// Returns a string representing the key combination for the keyBidning "fun" name.
		
		if(typeof funName == "function") funName = getFunctionName(funName); // Convert to string
		
		var f, character, combo = "";
		for(var i=0; i<editor.keyBindings.length; i++) {
			f = editor.keyBindings[i]
			if(getFunctionName(f.fun) == funName) {
				
				if(f.charCode) {
					character = getKeyboardMapping[f.charCode];
				}
				else {
					character = f.char;
				}
				
				switch(f.combo) {
					case 1: combo = "SHIFT"; break;
					case 2: combo = "CTRL"; break;
					case 3: combo = "SHIFT + CTRL"; break;
					case 4: combo = "ALT"; break;
					case 5: combo = "SHIFT + ALT"; break;
					case 6: combo = "CTRL + ALT"; break;
					case 7: combo = "SHIFT + CTRL + ALT"; break;
				}
				
				if(combo) return combo + " + " + character;
				else return character;
				
				break;
			}
		}
		
		return null;
		
	}
	
	editor.bindKey = function(b) {
		
		if(isNaN(b.charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		if((typeof b.fun !== "function")) throw new Error("Object argument needs to have a 'fun' method!");
		
		if(!b.desc) getStack("Key binding should have a description!");
		
		editor.keyBindings.push(b);
		
	}
	
	editor.rebindKey = function(funName, charCode, combo) {
		
		if(isNaN(charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		
		var f, rebound = false;
		for(var i=0; i<editor.keyBindings.length; i++) {
			f = editor.keyBindings[i]
			if(getFunctionName(f.fun) == funName) {
				
				if(rebound) console.warn("Double rebound of " + funName);
				
				f.charCode = charCode;
				f.combo = combo;
				rebound = true;
				console.log("Rebound " + funName + " to " + editor.getKeyFor(funName) );
			}
		}
	}
	
	editor.unbindKey = function(funName) {
		var f;
		for(var i=0; i<editor.keyBindings.length; i++) {
			f = editor.keyBindings[i]
			if(getFunctionName(f.fun) == funName) {
				
				editor.keyBindings.splice(i, 1);
				
				console.log("Ubound " + funName);
				
				return editor.unbindKey(funName);
			}
		}
		
		return null;
	}
	
	editor.plugin = function(p) {
		
		if((typeof p.load !== "function")) throw new Error("The plugin needs to have a load method!");
		
		if((typeof p.unload !== "function")) getStack("The plugin should have a unload method!");
		if(!p.desc) getStack("The plugin should have a description!");
		
		p.loaded = false;
		
		editor.plugins.push(p);
		
	}
	
	editor.disablePlugin = function(loadFunName) {
		
		var f;
		for(var i=0; i<editor.plugins.length; i++) {
			f = editor.plugins[i]
			if(getFunctionName(f.load) == loadFunName) {
				
				if(f.loaded && !f.unload) throw new Error("The plugin has already been loaded, and it does not have an unload method! So you have to disable this plugin before it's loaded!");
				
				if(f.unload) f.unload();
				
				editor.plugins.splice(i, 1);
				
				console.log("Plugin " + loadFunName + " disabled");
				
				return editor.disablePlugin(loadFunName);
			}
		}
		
		return null;
	}
	
	editor.addTest = function(fun, order) {
		
		var funName = getFunctionName(fun)
		
		if(funName.length == 0) throw new Error("Test function can not be anonymous!");
		
		if(order == undefined) order = 0;
		
		for(var i=0; i<editor.tests.length; i++) {
			if(editor.tests[i].text == funName) throw new Error("The test function name=" + funName + " is already used!");
			if(order > 0 && editor.tests[i].order > order) throw new Error("Remove order from test '" + editor.tests[i].text + "' if you want " + funName + " to run first!");
		}
		
		editor.tests.push({fun: fun, text: funName, order: order});
		
		// Sort the tests by order
		editor.tests.sort(function sortTests(a, b) {
			return b.order - a.order;
		});
		
	}
	
	function removeFrom(list, fun) {
		for(var i=0; i<list.length; i++) {
			
			//console.log(getFunctionName(fun) + " = " + getFunctionName(list[i]) + " ? " + (list[i] == fun));
			
			if(list[i] == fun) {
				list.splice(i, 1);
				removeFrom(list, fun); // Remove dublicates
				return true;
			}
		}
		return false; // Function not found in list
	}
	
	if(runtime == "nw.js") {
		// Handle window close
		// Load native UI library
		var gui = require('nw.gui'); //or global.window.nwDispatcher.requireNwGui() (see https://github.com/rogerwang/node-webkit/issues/707)
		
		// Get the current window
		var win = gui.Window.get();
		win.on('close', function() {
			//var editor = this;
			
			//editor.hide(); // Pretend to be closed already
			
			var ret = true;
			var name = "";
			var GUI = require('nw.gui').Window.get();
			
			console.log("Closing the editor ...");
			
			GUI.leaveKioskMode();
			
			if(!window.localStorage) {
				console.warn("window.localStorage=" + window.localStorage);
			}
			
			console.log("Calling exit listeners (" + editor.eventListeners.exit.length + ")");
			for(var i=0, f; i<editor.eventListeners.exit.length; i++) {
				
				f = editor.eventListeners.exit[i].fun;
				name = getFunctionName(f);
				ret = f();
				
				console.log(name + " returned " + ret);
				
				if(ret !== true) break;
			}
			
			if(ret == true) {
				this.close(true);
			}
			else {
				this.show();
				throw new Error("Something went wrong when closing the editor!");
			}
			
		});
	}
	
	// Move Event listeners ...
	
	
	//window.addEventListener("drop", fileDrop, false);
	window.ondragover = function(e) { e.preventDefault(); return false };
	window.ondrop = function(e) { e.preventDefault(); return false };
	
	window.addEventListener("dblclick", dblclick);
		
	
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
		Add your own key listeners by pushing to editor.keyBindings
		Your function should return false to prevent default action.
	*/
	window.addEventListener("keydown",keyIsDown,false);  // captures 
	window.addEventListener("keyup",keyIsUp,false);      // keyBindings
	window.addEventListener("keypress",keyPressed,false); // Writes to the document at caret position
	
	
	
	/*
		Add your own key listeners by pushing to editor.eventListeners.mouseClick
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
	
	//window.addEventListener("message", onMessage, false);
	
	function main() {
		
		//var fs = require("fs");
		
		console.log("Starting the editor ...");
		
		// Get the commit ID
		try {
			editor.readFromDisk("version.inc", function(string) {
				editor.version = parseInt(string);
			});
		}
		catch(e) {
			editor.version = "Dev";
		}
		
		canvas = document.getElementById("canvas");
		
		if(editor.settings.sub_pixel_antialias == false) {
			ctx = canvas.getContext("2d");
			//console.warn("No sub_pixel_antialias! editor.settings.sub_pixel_antialias=" + editor.settings.sub_pixel_antialias);
		}
		else {
			ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias (LCD-text). 
		}
		
		editor.canvasContext = ctx;
		
		editor.resizeNeeded(); // We must call the resize function at least once at editor startup.
		
		
		editor.keyBindings.push({charCode: editor.settings.autoCompleteKey, fun: editor.autoComplete, combo: 0});
		
		var keyT = 84;
		editor.keyBindings.push({charCode: keyT, fun: runTests_5616458984153156, combo: CTRL + SHIFT});
		
		// Handle file save dialog
		var fileSaveAs = document.getElementById("fileSaveAs");
		if(fileSaveAs) {
			fileSaveAs.addEventListener('change', chooseSaveAsPath, false);
		}
		else {
			console.warn("No fileSaveAs dialog!");
		}
		
		// Handle file open dialog
		fileOpenHtmlElement = document.getElementById("fileInput");
		fileOpenHtmlElement.addEventListener('change', readSingleFile, false);
		
		// cleanup
		/*
			var content = document.getElementById("content");
			while (content.firstChild) {
			content.removeChild(content.firstChild);
			}
		*/
		
		
		
		
		//getFile("http://joha.nz/editor/editor.js", openFile);
		//getFile("http://joha.nz/editor/test.js", openFile);
		//getFile("http://joha.nz/editor/index.htm", openFile);
		//getFile("http://joha.nz/editor/40k.log", openFile);
		
		//window.focus(); // Does nothing!
		
		var body = document.getElementById('body');
		body.ondrop = fileDrop;
		
		
		//console.log("main function loaded");
		
		// Sort the start events (some modules depeonds on others, and want to start after or before them)
		editor.eventListeners.start.sort(function(a, b) {
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
		
		//for(var i=0; i<editor.eventListeners.start.length; i++) {
		//console.log("startlistener:" + getFunctionName(editor.eventListeners.start[i].fun) + " (order=" + editor.eventListeners.start[i].order + ")");
		//}
		
		
		
		console.log("Calling start listeners (" + editor.eventListeners.start.length + ")");
		for(var i=0; i<editor.eventListeners.start.length; i++) {
			editor.eventListeners.start[i].fun(); // Call function
		}

		
		// Sort and load plugins
		editor.plugins.sort(function(a, b) {
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
		console.log("Loading plugin (" + editor.eventListeners.start.length + ")");
		for(var i=0; i<editor.plugins.length; i++) {
			editor.plugins[i].load(editor); // Call function (and pass global objects!?)
		}
		
		
		
		
		setInterval(resizeAndRender, 16); // So that we always see the latest and greatest
		
		// note to self: Just temorary, dont forget to remove:
		//if(editor.devMode == true) editor.openFile(testfile);
		
		/*
		// Problem: There seems to be a magic reizie or the runtime need time to calculate stuff
		//setTimeout(display, 500);
		//display();
		
		
		// Prevent the void from ruling the earth the first 500ms
		editor.resizeNeeded();
		editor.resize();
		editor.renderNeeded();
		editor.render();
		
		
		function display() {

			editor.resizeNeeded();
			editor.resize(); // Will also force a render

			
		}
		*/
		
	}
	
	function runTests_5616458984153156() { // Random numbers to make sure it's unique
		
		// Prepare for tests ...
		
		// Close all files
		for(var path in editor.files) {
			if(editor.files[path].saved) editor.closeFile(path)
			else {
				alert("Please save or close file before running tests: " + path);
				return;
			}
		}
		
		// Create some test files ...
		var filesToOpen = 2;
		var filesOpened = 0;
		for(var i=0; i<filesToOpen; i++) {
			editor.openFile("testfile" + i, "This is test file nr " + i + " line 1\r\nThis is test file nr " + i + " line 2\r\nThis is test file nr " + i + " line 3\r\nThis is test file nr " + i + " line 4\r\nThis is test file nr " + i + " line 5", function fileOpened() {
				if(++filesOpened == filesToOpen) doTheTests();
			});
		}
		
					
		function doTheTests() {
			var fails = 0;
			var result;
			var testResults = [];
			var finished = 0;
			var started = 0;
			var testsCompleted = []; // Prevent same test to make several callbacks
			var allDone = false; // Prevent calling allTestsDone twice
			var testsToRun = testFirstTest ? 1 : editor.tests.length;

if(testsToRun == 1) {
alert("Testing: " + editor.tests[0].text);
}

			for(var i=0; i<testsToRun; i++) {
				started++;// This counter here to prevent any sync test to finish all tests
				asyncInitTest(editor.tests[i]);
			}
			
			function asyncInitTest(test) {
				setTimeout(function() { // Make all tests async
					runTest(test);
				}, 0);
			}
			
			function runTest(test) {
				
				//console.log("Running test:" + test.text);
				
				try{
					test.fun(testResult);
				}
				catch(err) {
					finished++;
					testFail(test.text, err.message + "\n" + err.stack);
				}
				
				if(finished == started && !allDone) allTestsDone();
				
				
				
				function testResult(result) {
					
					console.log("Test: " + test.text + " result:" + result);
					
					if(testsCompleted.indexOf(test.text) != -1) {
						throw new Error("Test called callback more then once, or there's two tests with the same name: " + test.text);
						return;
					}
					
					testsCompleted.push(test.text);
					
					finished++;
					
					console.log("finished=" + finished + " started=" + started + "")
					
					if(result !== true) testFail(test.text, result);
				
					if(finished == started) allTestsDone();
				}
			}
			
			function allTestsDone() {
				
				allDone = true;
				
				if(fails === 0) testResults.push("All " + finished + " tests passed!")
				else testResults.push(fails + " of " + finished + " test failed:");
				
				editor.openFile("testresults", testResults.join("\n"), function(file) {
					file.parse = false;
				});
				
				testFirstTest = false; // Run only the first test the first time, and all tests after that.
			}
			
			function testFail(description, result) {
				fails++;
				testResults.push("");
				testResults.push(description);
				if(result.message) {
					// It returned an error
					//console.log(result.message);
					testResults.push(result.stack);
				}
				else {
					testResults.push(result);
				}
				
			}
		}
		
		return false;

	}
	
	function mainLoop() {
		resizeAndRender();
		
		//requestanimframe
		
		// animation renders
	}
	
	
	function readSingleFile(e) {
		
		console.log("Reading single file ...");
		
		if(global.fileOpenCallback == undefined) {
			throw new Error("There is no listener for the open file dialog!");
		}
		
		var file = e.target.files[0];
		if (!file) {
			throw new Error("No file selected from the open-file dialog.");
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		
		console.log("Calling file-dialog callback: " + getFunctionName(global.fileOpenCallback) + " ...");
		global.fileOpenCallback(filePath);
		global.fileOpenCallback = undefined;
		
		fileOpenHtmlElement.value = null; // Reset the value so we can open the same file again!
		
		
		/*
		
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
		*/
	}
	
	
	function chooseSaveAsPath(e) {
		var file = e.target.files[0];
		
		if(editor.filesaveAsCallback == undefined) {
			throw new Error("There is no listener for the save file dialog!");
		}
		
		if (!file) {
			console.warn("No file selected!");
			editor.filesaveAsCallback(undefined);
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		
		editor.filesaveAsCallback(filePath);
		
		editor.filesaveAsCallback = undefined; // Prevent old callback from firing again
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
		
		if(editor.input) {
			var textToPutOnClipboard = "";
			
			if(editor.currentFile) {
				textToPutOnClipboard = editor.currentFile.getSelectedText();
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
		
		if(editor.input) {
			
			var textToPutOnClipboard = "";
			
			if(editor.currentFile) {
				textToPutOnClipboard = editor.currentFile.getSelectedText();
				
				// Delete the selected text
				editor.currentFile.deleteSelection();
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
		
		if(editor.input) {
			
			e.preventDefault();
			
			console.log("Calling parse listeners (" + editor.eventListeners.paste.length + ") ...");
			for(var i=0, fun; i<editor.eventListeners.paste.length; i++) {
				
				fun = editor.eventListeners.paste[i].fun;
				
				ret = fun(editor.currentFile, e.clipboardData);
				
				//console.log("Paste listener: " + getFunctionName(fun) + " returned:\n" + ret);
				
				if(typeof ret == "string") {
					if(textChanged) {
						throw new Error("Another listener has already changed the pasted text!");
					}
					text = ret;
					textChanged = true;
				}
			}
			
			// Insert text at caret position
			if(editor.currentFile) {
				var file = editor.currentFile;
				
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
		if(character == benchmarkCharacter) {
			
			//process.nextTick(function() {
				// Test optimization
				var top = editor.settings.topMargin + (editor.currentFile.caret.row - editor.currentFile.startRow) * editor.settings.gridHeight;
				var left = editor.settings.leftMargin + (editor.currentFile.caret.col + tempTest + (editor.currentFile.grid[editor.currentFile.caret.row].indentation * editor.settings.tabSpace) - editor.currentFile.startColumn) * editor.settings.gridWidth;
				//var left = editor.settings.leftMargin + (editor.currentFile.caret.col + (editor.currentFile.grid[editor.currentFile.caret.row].indentation * editor.settings.tabSpace) - editor.currentFile.startColumn) * editor.settings.gridWidth;
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.fillText(benchmarkCharacter, left, top);
				tempTest++;
				return;
				//ctx.fillText(character, 0, 0);
				// Conclusion: you can't even see the character, because the render is so fast! It did nothing!
			//});

		}
		*/
		
		
		/*
			var charCode;
			
			if(window.event){ // IE					
			charCode = e.keyCode;
			}
			else if(e.which){ // Netscape/Firefox/Opera					
			charCode = e.which;
		 }
		*/
		
		console.log("keyPress: " + charCode + " = " + character + " (charCode=" + e.charCode + ", keyCode=" + e.keyCode + ", which=" + e.which + ") editor.input=" + (editor.currentFile ? editor.input : "NoFileOpen editor.input=" + editor.input + "") + "");
		
		global.lastKeyPressed = character;
		
		var file = editor.currentFile
		
		if(file) {
			if(editor.input) {
				// Put character at current caret position:
				
				if(editor.settings.renderColumnOptimization && file.caret.eol) { //  && character == benchmarkCharacter    && inputCount++ > 5 (if setTimeout is used, The benchmarking tool need 4 "test" inputs before benchmarking)
					// Makes characters appear on the screen faster ...
				
					/*
					var top = editor.settings.topMargin + (editor.currentFile.caret.row - editor.currentFile.startRow) * editor.settings.gridHeight;
					//var left = editor.settings.leftMargin + (tempTest + (editor.currentFile.grid[editor.currentFile.caret.row].indentation * editor.settings.tabSpace) - editor.currentFile.startColumn) * editor.settings.gridWidth;
					var left = editor.settings.leftMargin + (editor.currentFile.caret.col + (editor.currentFile.grid[editor.currentFile.caret.row].indentation * editor.settings.tabSpace) - editor.currentFile.startColumn) * editor.settings.gridWidth;
					ctx.fillStyle = "rgb(0,0,0)";
					ctx.fillText(character, left, top);
					tempTest++;
					*/

					// Always use the default color. It's impossible to guess what color to use without parsing! Set renderColumnOptimization to false if this is too annoying
					
					// What will happen if we clear the canvas before? No impact on performace!
					editor.clearColumn(file.caret.row, file.caret.col);
					
					// There's a higher "chance" to get faster responses if this function is inlined
					editor.renderColumn(file.caret.row, file.caret.col, character);
					
					// Repaint the caret
					editor.renderCaret(file.caret, 1); // 1 so that the caret will be rendered right 
					
					/*
						Problem: After ca 56-60 inputs, render times goes from 3-4ms to 17-18ms
						And sometimes it will not go down to 3-4ms ever! (stay at 17-18ms)
						
						note: Canvas size didn't have an impact when only writing one character
					*/
					
					// We don't have to use setTimeout it seems. But sometimes it seems that the canvas wont render in the browser until the main thread is idle ...
					//setTimeout(function waitforrender() {
						
						file.putCharacter(character, undefined, true);
						
					//}, 22);
					
				}
				else {
					file.putCharacter(character);
				}

				
			}
			
		}
		
		editor.interact("keyPressed");
		
	}
	
	function resizeAndRender() {
		
		if(editor.shouldResize) editor.resize();
		if(editor.shouldRender) editor.render();
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
		var gotError;
		var targetElementClass = e.target.className;
		
		/*
		var backspaceCharCode = 8;
		if(charCode == backspaceCharCode) {
			tempTest--;

			var top = editor.settings.topMargin + (editor.currentFile.caret.row - editor.currentFile.startRow) * editor.settings.gridHeight;
			//var left = editor.settings.leftMargin + (editor.currentFile.caret.col + tempTest + (editor.currentFile.grid[editor.currentFile.caret.row].indentation * editor.settings.tabSpace) - editor.currentFile.startColumn) * editor.settings.gridWidth;
			var left = editor.settings.leftMargin + (tempTest + (editor.currentFile.grid[editor.currentFile.caret.row].indentation * editor.settings.tabSpace) - editor.currentFile.startColumn) * editor.settings.gridWidth;
			ctx.fillStyle = editor.settings.style.bgColor;
			//ctx.fillStyle = "rgba(255,0,0, 0.5)";
			ctx.fillRect(left, top, editor.settings.gridWidth, editor.settings.gridHeight);
			return;
			
		}
		*/
		
		console.log("keyDown: " + charCode + " = " + character + " lastKeyDown=" + lastKeyDown + " combo=" + JSON.stringify(combo));
		
		lastKeyDown = charCode;
		
		
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
		// AltGr is the same as hitting Ctrl+ Alt
		
		// You probably want to push to editor.keyBindings instead of using eventListeners.keyDown!
		console.log("Calling keyDown listeners (" + editor.eventListeners.keyDown.length + ") ...");
		for(var i=0; i<editor.eventListeners.keyDown.length; i++) {
			funReturn = editor.eventListeners.keyDown[i].fun(editor.currentFile, character, combo); // Call function
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("Default action will be prevented!");
			}
		}
		
		// Check key bindings
		for(var i=0, binding; i<editor.keyBindings.length; i++) {
			
			binding = editor.keyBindings[i];
			
			if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || (binding.combo === undefined)) && (binding.dir == "down" || binding.dir === undefined) ) { // down is the default direction
				
				if(binding.charCode == charCodeShift || binding.charCode == charCodeAlt || binding.charCode == charCodeCtrl) {
					throw new Error("Can't have nice things! Causes a bug that will make native shift+ or algGr+ keyboard combos not work");
				}
				else {
					
					//console.log("keyDown: Calling function: " + getFunctionName(binding.fun) + "...");
					
					if(captured) console.warn("Key combo has already been captured by " + getFunctionName(captured) + " : charCode=" + charCode + " character=" + character + " combo=" + JSON.stringify(combo) + " binding.fun=" + getFunctionName(binding.fun));
					
					captured = binding.fun;
					
					if(!editor.currentFile) console.warn("No file open!");
					
					try {
						funReturn = binding.fun(editor.currentFile, combo, character, charCode, "down", targetElementClass);
					} 
					catch(err) {
						gotError = err;
						console.warn("Error when running key bound function:" + err.stack);
					}
					
					if(funReturn === false) { // If one of the functions returns false, the default action will be prevented!
						preventDefault = true;
						console.log("Default action will be prevented!");
					}
					else if(funReturn !== true) {
						throw new Error("You must make an active choise wheter to allow (return true) or prevent (return false) default (chromium) browser action, like typing in input boxes, tabbing between elements, etc. function called: " + getFunctionName(binding.fun));
					}
				}
			}
			else {
				//console.log("NOT calling function:" + getFunctionName(binding.fun) + " " + JSON.stringify(binding));
			}
		}
		
		if(gotError) throw new Error("Got an error while running keyBindings! See console warnings.");
		
		
		if(editor.currentFile) {
			editor.currentFile.checkGrid();
			editor.currentFile.checkCaret();
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
				throw Error("Unsupported! combo: " + JSON.stringify(combo) + " character=" + character + " charCode=" + charCode);
				
				preventDefault = true;
			}
			
		}
		
		if(preventDefault) {
			console.log("Preventing default browser action!");
			e.preventDefault();
			return false;
		}
		else {
			console.log("Executing default browser/OS action ...");
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
		var funReturn;
		
		console.log("keyUp: " + charCode + " = " + character + " combo=" + JSON.stringify(combo));
		
		if(editor.currentFile) {
			// Handle the special tidle key: Puts a ~ ^ or " over a character
			// Is it only the swedish keyboard layout that does this!?
			// OMG! This might become very messy
			var spaceKey = 32;
			if(charCode == spaceKey) {
				//console.log("tildeActive=" + tildeActive);
				//console.log("tildeAltActive=" + tildeAltActive);
				//console.log("tildeShiftActive=" + tildeShiftActive);
				
				if(tildeActive) {
					// Put two dots over the letter
					
				}
				else if(tildeAltActive) {
					editor.currentFile.putCharacter("~");
				}
				else if(tildeShiftActive) {
					editor.currentFile.putCharacter("^");
				}
			}
		}
		
		
		// Handle the tilde key: Puts a ~ ^ or " over a character
		var altGr = 225;
		var shiftKey = 16;
		var tildeKey = 221;
		
		if(charCode == tildeKey) {
			if(lastKeyDown == shiftKey) {
				tildeShiftActive = true;
			}
			else if(lastKeyDown == altGr) {
				tildeAltActive = true;
			}
			else {
				tildeActive = true;
			}
		}
		else if(charCode != shiftKey) { // Prevent shift up to setting tildeShiftActive = false.
			tildeActive = false;
			tildeShiftActive = false;
			tildeAltActive = false;
		}
		//console.log("a tildeActive=" + tildeActive);
		//console.log("a tildeAltActive=" + tildeAltActive);
		//console.log("a tildeShiftActive=" + tildeShiftActive);
		
		// Check key bindings
		for(var i=0, binding; i<editor.keyBindings.length; i++) {
			
			binding = editor.keyBindings[i];
			
			if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || binding.combo === undefined) && (binding.dir == "up") ) { // down is the default direction
				
				//console.log("keyUp: Calling function: " + getFunctionName(binding.fun) + "...");
				
				funReturn = binding.fun(editor.currentFile, combo, character, charCode, "up");
				
				// There is no browser actions bound to keyUp events (only keydown). So we don't have to care about preventing default
					
				if(funReturn === false) {
					preventDefault = true;
					console.log("Default action will be prevented!");
				}
				else if(funReturn !== true) {
					throw new Error("To prevent bugs, keybound functions always need to return either true or false!\nAlthough it doesn't matter on keyup events. Returning false on keydown event will prevent default action.");
				}
				
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
			
			
			if(editor.currentFile && button == 0) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				// Give focus
				editor.input = true;
				
				// Remove focus from everything else
				document.activeElement.blur();
				canvas.focus();
				
				// Delete selection outside of the canvas
				window.getSelection().removeAllRanges();
				
				/*
					Try to steal focus from any textboxes like find/replace.
					
					Meh, why doesn't this work!!!?
					
					
					document.body.focus(); // editor.currentFile.canvas
					
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
			if(editor.currentFile) {
				// Remove focus
				editor.input = false;
				
				//editor.currentFile = undefined;
			}
		}
		
		console.log("Mouse down: caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		
		
		console.log("Calling mouseClick (down) listeners (" + editor.eventListeners.mouseClick.length + ") ...");
		for(var i=0, binding; i<editor.eventListeners.mouseClick.length; i++) {
			
			click = editor.eventListeners.mouseClick[i];
			
			if((click.dir == "down" || click.dir == undefined) && 
			(click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo === undefined) &&
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				//console.log("Calling " + getFunctionName(click.fun) + " ...");
				
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
			caret,
			button = e.button,
			click,
			target = e.target,
			keyboardCombo = getCombo(e),
			mouseDirection = "up";
		
		
		console.log("Mouse up on class " + target.className + "!");
		
		if(target.className == "fileCanvas") {
			
			// Only get a caret if the click is on the canvas 
			caret = editor.mousePositionToCaret(mouseX, mouseY);
		}
		
		console.log("Calling mouseClick (up) listeners (" + editor.eventListeners.mouseClick.length + ") ...");
		for(var i=0, binding; i<editor.eventListeners.mouseClick.length; i++) {
			click = editor.eventListeners.mouseClick[i];
			
			// Make sure to define click.dir (to prevent double action)!
			if((click.dir == "up" || click.dir == undefined) && 
			(click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo == undefined) && 
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				console.log("Calling " + getFunctionName(click.fun) + " ...");
				
				click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo); // Call it
			}
		}
		
		
		//console.log("mouseUp, editor.shouldRender=" + editor.shouldRender);
		
		
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
		editor.mouseX = parseInt(e.clientX);
		editor.mouseY = parseInt(e.clientY);
		
		//console.log("mouseY=" + mouseY);
		
		if(editor.eventListeners.mouseMove.length > 0) {
			//console.log("Calling mouseMove listeners (" + editor.eventListeners.mouseMove.length + ") ...");
			for(var i=0, fun; i<editor.eventListeners.mouseMove.length; i++) {
				fun = editor.eventListeners.mouseMove[i].fun;
				
				//console.log(getFunctionName(fun));
				
				fun(mouseX, mouseY, target); // Call it
				
			}
		}
		
		//console.log("editor.input=" + editor.input);
		
		editor.interact("mouseMove");
		
		//return false;
		
	}
	
	function mouseclick(e) {
		/*
			Check for the editor.shouldRender flag and render if true
			
			For events that are not bound to mouseUp or mouseDown
		*/
		console.log("mouseClick, editor.shouldRender=" + editor.shouldRender + ", editor.shouldResize=" + editor.shouldResize);
		
		editor.interact("mouseClick");
		
	}
	
	
	function dblclick(e) {
		
		e = e || windows.event;
		
		// Mouse position is on the current object (Canvas) 
		var mouseX = e.offsetX==undefined?e.layerX:e.offsetX;
		var mouseY = e.offsetY==undefined?e.layerY:e.offsetY;
		var caret;
		var button = e.button;
		var click;
		var target = e.target;
		var preventDefault = false;
		var keyboardCombo = getCombo(e);
		var funReturn;
		
		if(target.className == "fileCanvas" || target.className == "content centerColumn") {
			
			caret = editor.mousePositionToCaret(mouseX, mouseY);
			
			if(editor.currentFile && button == 0) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				
				// Remove focus from everything else
				document.activeElement.blur();
				
				// Give focus
				editor.input = true;
				canvas.focus();
				
				// Delete selection outside of the canvas
				window.getSelection().removeAllRanges();

			}
			
		}
		else{
			if(editor.currentFile) {
				// Remove focus
				editor.input = false;
			}
		}
		
		console.log("dblclick: caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		
		
		console.log("Calling dblclick listeners (" + editor.eventListeners.dblclick.length + ") ...");
		for(var i=0, binding; i<editor.eventListeners.dblclick.length; i++) {
			
			click = editor.eventListeners.dblclick[i];
			
			if((click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo === undefined) &&
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				//console.log("Calling " + getFunctionName(click.fun) + " ...");
				
				// Note that caret is a temporary position caret (not the current file.caret)!
				
				funReturn = click.fun(mouseX, mouseY, caret, button, target, keyboardCombo); // Call it
				
				if(funReturn === false) {
					preventDefault = true;
				}
				
				
			}
		}
		
		editor.interact("dblclick");
		
		if(preventDefault) {
			e.preventDefault(); // To prevent the annoying menus
			return false;
		}

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
			console.log("Calling mouseScroll listeners (" + editor.eventListeners.mouseScroll.length + ") ...");
			for(var i=0; i<editor.eventListeners.mouseScroll.length; i++) {
				editor.eventListeners.mouseScroll[i].fun(dir, steps, combo);
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
	

	function htmlToImage(html, callback) {
		
		if(!callback) throw new Error("No callback function in htmlToImage");
		
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
		var width = editor.settings.gridWidth * html.length;
		var height = editor.settings.gridHeight;
		
		//  width="' + width + '" height="' + height + '"
		
		//console.log("width=" + width);
		
		var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
		'<foreignObject width="100%" height="100%">' +
		'<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:' + editor.settings.style.fontSize + 'px; font-family: ' + editor.settings.style.font + ';">' +
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