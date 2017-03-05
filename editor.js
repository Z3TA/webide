"use strict";

//var testfile = "test/testfile.txt";

// The editor object lives in global scope, so that it can be accessed everywhere.
var editor = {};

var tempTest = 0;
var benchmarkCharacter = ".";
var benchmarkCharacterCode = 190;
var inputCount = 0;
 

// List of file extensions of supported files. Extensions Not in this list will be loaded in plain text mode.
// important: Add file format that are supported by the parsers here:
editor.supportedFiles = [
	"js",
	"java", 
	"htm", 
	"html", 
	"php", 
	"asp", 
	"vbs",
	"vb",
	"xml", 
	"json", 
	"css", 
	]; 

// Make your custom settings in settings_overload.js !	These settings should not be changed unless you are adding/changing functionality
editor.settings = {
	devMode: true,  // devMode: true will spew out debug info and make sanity checks (that will make the editor run slower, mostly because of all the console.log's)
	enableSpellchecker: false, // The spell-checker use a lot of CPU power!
	enableDocumentPreview: false, // Use the zoom function instead!? (Alt+Z)
	indentAfterTags: [  // Intendent after these XML tags
	"div", 
	"ul", 
	"ol", 
		"li", 
	"head", 
	"script", 
	"style", 
	"table", 
	"tr", 
	"td", 
	"th", 
	"form", 
	"select", 
	"frameset",
		"svg",
		"defs",
		"marker",
		"g"
		],
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
	gridWidth: 8.25, // Needs to be the same as font's character width!
	sub_pixel_antialias: true, // For the main text area (canvas) only. If set to false, you want to start the editor with --disable-lcd-text
	style: {
		fontSize: 15, // Don't forget to change gridHeight and gridWidth after chaning fontSize!
		font: "Consolas, DejaVu Sans Mono, Liberation Mono, monospace",
		highlightMatchFont: "bold 15px Consolas, DejaVu Sans Mono, Liberation Mono, monospace",
		highlightMatchFontColor: "rgb(200, 119, 32)",
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
	scrollStep: 3,
	defaultLineBreakCharacter: (navigator.platform.indexOf("Win") != -1) ? "\r\n" : "\n", // Use Windows standard if on Windows, else use line-feed. \n == LF, \r == CR
	bigFileSize: 400000, //  Bytes, all files larger then this will be opened as streams
	bigFileLoadRows: 2000, // Rows to load into the editor if the file size is over bigFileSize
	autoCompleteKey: 9, // Tab
	renderColumnOptimization: false, // When typing in a big file that is rendered on each key stroke we might miss the vsync train, this will make characters appear before any parsing etc
	clearColumnOptimization: false, // When deleting a character, clears only the character
	insert: false,
	stdInPort: 13379
};

editor.shouldRender = false;   // Internal flag, use editor.renderNeeded() to re-render!
editor.shouldResize = false;   // Internal flag, use editor.resizeNeeded() to re-size!
editor.fileIndex = -1;   // Keep track on opened files (for undo/redo)
editor.files = {};       // List of all opened files with the path as key
editor.mouseX = 0;       // Current mouse position
editor.mouseY = 0;
editor.info = [];        // Talk bubbles. See editor.addInfo()
editor.version = 0;      // Incremented on each commit. Loaded from version.inc when the editor loads
editor.connections = {}  // Store connections to remote servers (FTP, SSH)
editor.remoteProtocols = ["ftp", "ftps", "sftp"]; // Supported remote connections
editor.bootstrap = null; // Will contain JSON data from fethed url in bootstrap.url, fires "bootstrap" event
editor.platform = /^win/.test(process.platform) ? "Windows" : (/^linux/.test(process.platform) ? "Linux" : "Unknown");

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
	keyPressed: [],
	changeWorkingDir: [],
	bootstrap: []
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

editor.fileOpenCallback = undefined;
editor.lastKeyPressed = "";

(function() { // Non global editor code ...
	
	// These variables and functions are private ...
	// We only expose methods that are in the editor object.
	
	var isIe = (navigator.userAgent.toLowerCase().indexOf("msie") != -1 || navigator.userAgent.toLowerCase().indexOf("trident") != -1);
	
	
	var keyBindings = []; // Push objects {char, charCode, combo dir, fun} for key events
	
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
	
	var ftpQueue = []; // todo: Allow parrallel FTP commands (seems connection is dropped if you send a command while waiting for another)
	var ftpBusy = false;
	
	var windowLoaded = false;
	
	/*
		Editor functionality (accessible from global scope) By having this code here, we can use private variables
		
		To make it more fun to write plugins, the editor and File object should take care of the "low level" stuff and heavy lifting. 
		Feel free to add more editor API methods below. Do not extend the editor object elsewhere!!
	*/
	
	editor.workingDirectory = trailingSlash(process.cwd());
	
	if(runtime!="browser") {
		// Check if the working directory is the same as the editor (hmm, why?)
		
		console.log("__dirname=" + __dirname);
		console.log("workingDirectory=" + editor.workingDirectory);
		
		if(__dirname != editor.workingDirectory) console.warn("Working directory is not the current directory __dirname=" + __dirname + " editor.workingDirectory=" + editor.workingDirectory);
	}
	
	var directoryDialogCallback = undefined; 
	var directoryDialogHtmlElement;
	
	
	editor.changeWorkingDir = function(workingDir) {
		
		// Check if the dir exists ?
		
		editor.workingDirectory = trailingSlash(workingDir);;
		
		console.log("Calling changeWorkingDir listeners (" + editor.eventListeners.changeWorkingDir.length + ") workingDir=" + workingDir);
		for(var i=0; i<editor.eventListeners.changeWorkingDir.length; i++) {
			//console.log("function " + getFunctionName(editor.eventListeners.changeWorkingDir[i].fun));
			editor.eventListeners.changeWorkingDir[i].fun(workingDir); // Call function
		}
		
	}
	
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
		
		// Convert path delimters !? 
		
		
		// Just so that we are consistent
		if(text === null) throw new Error("text is null! It should be undefined for the file to open from disk"); // note: null == undefined = true
		
		
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
				
				if(callback) callback(null, file);
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
				path = makePathAbsolute(path);
			}
			console.warn("Text is undefined! Reading file from disk: " + path)
			
			// Check the file size
			editor.getFileSizeOnDisk(path, function gotFileSize(err, fileSizeInBytes) {
				
				if(err) {
					console.warn(err.message);
					fileOpenError(err);
				}
				else {
					
					console.log("fileSizeInBytes=" + fileSizeInBytes);
					
					if(fileSizeInBytes > editor.settings.bigFileSize) {
						//alertBox("Opening big fies is not yet supported!");
						//fileOpenError(new Error("File too big: " + path));
						//return;
						
						console.warn("File larger then " + editor.settings.bigFileSize + " bytes. It will be opened as a stream!");
						let notFromDisk = false;
						let tooBig = true;
						let text = "";
						load(null, path, text, notFromDisk, tooBig);
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
				load(null, path, text, true);
			}
			
		}
		
		function load(err, path, text, notFromDisk, tooBig) {
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
				
				callCallbacks(err, file);
				
				openFileQueue.splice(openFileQueue.indexOf(path), 1); // Take the file off the queue
				
				// Always render (and resize) after opening a file! (where=here, when=now!)
				editor.renderNeeded();
				
			}
		}
		
		function fileOpenError(err) {
			openFileQueue.splice(openFileQueue.indexOf(path), 1); // Take the file off the queue
			
			console.warn(err.message);
			
			callCallbacks(err, file);
			
			console.warn("Error when opening file path=" + path + " message: " + err.message);
			
			return err;
			
		}
		
		function callCallbacks(err, file) {
			if(err) console.warn(err.message);
			
			if(callback) {
				callback(err, file); // after fileOpen even: reasoning: some plugin might want to add fileopen events AFTER they have opened a particular file
			}
			else if(file) {
				console.log("No callback for file.path=" + file.path);
			}
			
			if(fileOpenExtraCallbacks.hasOwnProperty(path)) {
				// Call the other callbacks that are also waiting for the file to be opened
				for(var i=0; i<fileOpenExtraCallbacks[path].length; i++) {
					fileOpenExtraCallbacks[path][i](err, file);
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
					callback(null, parseInt(xhr.getResponseHeader("Content-Length")));
				}
			};
			xhr.send();
		}
		else {
			
			// Check path for protocol
			var url = require("url");
			var parse = url.parse(path);
			
			if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
				
				if(editor.connections.hasOwnProperty(parse.hostname)) {
					
					var c = editor.connections[parse.hostname].client;
					
					console.log("Getting file size from FTP server: " + parse.protocol + parse.hostname + parse.pathname);
					
					// Asume the FTP server has support for RFC 3659 "size"
					c.size(parse.pathname, function gotFtpFileSize(err, size) {
						if(err) {
							console.warn(err.message);
							callback(err);
						}
						else {
							callback(null, size);
						}
					});
				}
				else {
					// Should we give an ENOENT here ?
					callback(new Error("Failed to get file size for: " + path + "\nNo connection open to FTP on " + parse.hostname + " !"));
				}
			}
			else if(parse.protocol == "sftp:") {
				
				if(editor.connections.hasOwnProperty(parse.hostname)) {
					
					var c = editor.connections[parse.hostname].client;
					
					console.log("Getting file size from SFTP server: " + parse.pathname);
					
					c.stat(parse.pathname, function gotSftpFileSize(err, stat) {
						
						if(err) {
							callback(err);
						}
						else {
							callback(null, stat.size);
						}
					});
				}
				else {
					callback(new Error("Failed to get file size for: " + path + "\nNo connection open to SFTP on " + parse.hostname + " !"));
				}
			}
			else {
				
				// It's a normal file path
				
				var fs = require("fs");
				
				fs.stat(path, checkSize);
				
				function checkSize(err, stats) {
					
					if(err) callback(err)
					else callback(null, stats["size"]);
					
				}
				
			}
		}
	}
	
	editor.doesFileExist = function(path, callback) {
		// An easier method then getFileSizeOnDisk to check if a file exist on disk (add support for other protocols later!?)
		// Be aware of racing conditions, it's often better to just open the file and see what happends
		
		editor.getFileSizeOnDisk(path, gotSize);
		
		function gotSize(err, size) {
			
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
			
			delete editor.files[path]; // Remove all references to the file BEFORE switching to another file
			
			
			setTimeout(function checkIfRemoved() { // Check again to make sure it has been removed
				if(editor.files.hasOwnProperty(path)) throw new Error("Closed file is still in the editor! path=" + path);
			}, 100);
			
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
	
	editor.readFile = function(path, callback) {
		/* 
			Returns a readable stream ...
			
			We should probably use streams everywhere! So that opening small and large files use the same method.
			
		*/
	}
	
	
	editor.copyFolder = function(source, destination) {
		/*
			Copies a folder and files in source location to destination.
			Source and destination can be local filesystem, FTP or SFTP (SSH)
		*/
		
		
		
	}
	
	
	
	editor.readFromDisk = function(path, callback, returnBuffer, encoding) {
		// todo: Rename this function, or refactor, because we can also run in the browser!
		
		console.log("Reading file: " + path);
		
		var fileContent = "";
		var stream;
		
		if(!callback) {
			throw new Error("No callback defined!");
		}
		
		if(runtime == "nw.js") {
			var fs = require("fs");
			
			console.log("Reading file from disk: " + path + " returnBuffer=" + returnBuffer + " encoding=" + encoding);
			//console.log(getStack("Read from disk"));
			
			// Check path for protocol
			var url = require("url");
			var parse = url.parse(path);
			
			if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
				
				if(editor.connections.hasOwnProperty(parse.hostname)) {
					
					var c = editor.connections[parse.hostname].client;
					
					console.log("Getting file from FTP server: " + parse.pathname);
					
					c.get(parse.pathname, function getFtpFileStream(err, fileReadStream) {
						
						if(err) throw err;
						
						console.log("Reading file from FTP ...");
						
						console.log(fileReadStream);
						
						stream = fileReadStream;
						
						stream.setEncoding('utf8');
						stream.on('readable', readStream);
						stream.on("end", streamEnded);
						stream.on("error", streamError);
						stream.on("close", streamClose);
						
						// Hmm it seems the FTP module uses "old" streams:
						var StringDecoder = require('string_decoder').StringDecoder;
						var decoder = new StringDecoder('utf8');
						var str;
						stream.on('data', function(data) {
							str = decoder.write(data);
							fileContent += str;
							console.log('loaded part of the file');
						});
						
					});
					
				}
				else {
					alertBox("No connection open to FTP on " + parse.hostname + " !");
				}
			}
			else if(parse.protocol == "sftp:") {
				
				if(editor.connections.hasOwnProperty(parse.hostname)) {
					
					var c = editor.connections[parse.hostname].client;
					
					console.log("Getting file from SFTP server: " + parse.pathname);
					
					var options = {
						encoding: "utf8"
					}
					// Could also use sftp.createReadStream
					c.readFile(parse.pathname, options, function getSftpFile(err, buffer) {
						
						if(err) console.warn(err.message);
						
						callback(err, path, buffer.toString("utf8"));
						
						
					});
					
				}
				else {
					alertBox("No connection open to SFTP on " + parse.hostname + " !");
				}
			}
			
			else {
				
				// Asume local file system
				
				if(path.indexOf("file://") == 0) path = path.substr(7); // Remove file://
				
				if(returnBuffer) {
					// If no encoding is specified in fs.readFile, then the raw buffer is returned.
					
					fs.readFile(path, function(err, buffer) {
						if(err) console.warn(err.message);
						
						callback(err, path, buffer);
						
					});
				}
				else {
					
					if(encoding == undefined) encoding = "utf8";
					fs.readFile(path, encoding, function(err, string) {
						if(err) console.warn(err.message);
						
						callback(err, path, string);
						
					});
				}
			}
		}
		else if(runtime == "browser") {
			getFile(path, function(string, url) {
				callback(null, url, string);
			});
		}
		else {
			throw new Error("Unknown runtime=" + runtime);
		}
		
		// Functions to handle NodeJS ReadableStream's
		function streamClose() {
			console.log("Stream closed! path=" + path);
		}
		
		function streamError(err) {
			console.log("Stream error! path=" + path);
			throw err;
		}
		
		function streamEnded() {
			console.log("Stream ended! path=" + path);
			
			callback(null, path, fileContent);
			
		}
		
		function readStream() {
			// Called each time there is something comming down the stream
			
			var chunk;
			var str = "";
			var StringDecoder = require('string_decoder').StringDecoder;
			var decoder = new StringDecoder('utf8');
			
			//var chunkSize = 512; // How many bytes to recive in each chunk
			
			console.log("Reading stream ... isPaused=" + stream.isPaused());
			
			while (null !== (chunk = stream.read()) && !stream.isPaused() ) {
				
				// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
				str = decoder.write(chunk);
				
				fileContent += str;
				
				console.log("Got chunk! str.length=" + str.length + "");
				
			}
		}
	}
	
	editor.writeStream = function(file) {
		/* 
			Writes the content of a file to a destination FS/FTP/SFTP
			
			1. Creates a read stream with a start postion 
			2. Creates a write stream with a start postion
			3. Reads from readStream until the file buffer is found (content in file.text) while sending to the writeStream
			4. Reads from the file buffer (file.text) while draining the readStream, and sends to the writeStream
			5. When the end of the file buffer has been reached. The rest is read from the readStream into the writeStream
			
		*/
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
		
		if(path == undefined) {
			path = file.path;
		}
		
		var text = file.text; // Save the text, do not count on the garbage collector the be "slow"
		
		if(file.path != path) {
			if(editor.files.hasOwnProperty(path)) {
				var err = new Error("There is already a file open with path=" + path);
				if(callback) callback(err, path);
				else throw err;
			}
			console.warn("File will be saved under another path; old=" + file.path + " new=" + path);
			
			// We must close and reopen the file so that plugins keeping track of open files do not go nuts.
			
			editor.closeFile(file.path, true); // true = do not switch to another file
			
			editor.openFile(path, text, savedAs); // Reopen the file with the new path, makes sure fileSave events in file.save gets called after we have a new path.
			
		}
		else {
			editor.saveToDisk(file.path, file.text, doneSaving);
		}
		
		function savedAs(err, newFile) { // intermediate function via ditor.openFile
			if(err) throw err;
			
			file = newFile;
			
			editor.saveToDisk(file.path, file.text, doneSaving);
		}
		
		function doneSaving(err, path) {
			
			if(!err) {
				if(file.savedAs && path != file.path) throw new Error("Saved the wrong file!\npath=" + path + "\nfile.path=" + file.path); // Sanity check
				
				console.log("Successfully saved " + file.path);
				file.saved(); // Call functions that listen for save events
			}
			else if(callback) callback(err, path);
			else throw err;
			
		}
		
	}
	
	
	editor.saveToDisk = function(path, text, saveToDiskCallback, inputBuffer, encoding) {
		// You probably want to use editor.saveFile instead!
		// This is used internaly by the editor, but exposed so plugins can save files that are not opened.
		
		// Only works with text files !
		
		if(!saveToDiskCallback) throw new Error("saveToDisk called without a callback function!");
		
		if(encoding == undefined) encoding = "utf-8";
		
		// Check path for protocol
		var url = require("url");
		var parse = url.parse(path);
		var hostname = parse.hostname;
		var protocol = parse.protocol;
		var pathname = parse.pathname;
		
		console.log("Saving to disk ... protocol: " + protocol + " hostname=" + hostname + " pathname=" + pathname);
		
		if(protocol == "ftp:" || protocol == "ftps:") {
			
			if(ftpBusy) {
				console.log("FTP is busy. Queuing upload of pathname=" + pathname + " ...");
				ftpQueue.push(function() { uploadFTP(pathname, text); });
			}
			else {
				ftpBusy = true;
				console.log("FTP is ready. Uploading pathname=" + pathname + " ...");
				uploadFTP(pathname, text);
			}
		}
		else if(protocol == "sftp:") {
			
			if(editor.connections.hasOwnProperty(hostname)) {
				
				var c = editor.connections[hostname].client;
				
				var input = inputBuffer ? text : new Buffer(text, encoding);
				var destPath = pathname;
				var options = {encoding: encoding};
				// Could also use sftp.createWriteStream
				console.log("Waiting for SFTP ...");
				c.writeFile(destPath, input, options, function sftpWrite(err) {
					if(err) {
						console.warn("Failed to save to path= " + path + "\n" + err.message);
						saveToDiskCallback(err);
					}
					else {
						console.log("Saved " + destPath + " on SFTP " + hostname);
						saveToDiskCallback(null, path);
					}
					
				});
				
			}
			else {
				saveToDiskCallback(new Error("Failed to save to path=" + path + "\nNo connection to SFTP on " + hostname + ""));
			}
		}
		else {
			
			// Asume local file-system
			
			var fs = require("fs");
			fs.writeFile(path, text, encoding, function(err) {
				console.log("Attempting saving to local file system: " + path + " ...");
				
				if(err) {
					//alertBox("Unable to save file! " + err.message + "\n" + path);
					console.warn("Unable to save " + path + "!");
					saveToDiskCallback(err);
				}
				else {
					console.log("The file was successfully saved: " + path + "");
					saveToDiskCallback(null, path);
				}
			});
		}
		
		
		function uploadFTP(pathname, text) {
			console.log("Uploading to FTP ... pathname=" + pathname);
			
			if(editor.connections.hasOwnProperty(hostname)) {
				
				var ftpClient = editor.connections[hostname].client;
				
				var input = inputBuffer ? text : new Buffer(text, encoding);
				var useCompression = false;
				
				ftpClient.put(input, pathname, useCompression, putFtpDone);
				
			}
			else {
				saveToDiskCallback(new Error("Failed to save to path=" + path + "\nNo connection to FTP on " + hostname + " !"));
				runFtpQueue();
			}
			
			function putFtpDone(err) {
				if(err) {
					console.warn("Failed to save pathname= " + pathname + "\n" + err);
					saveToDiskCallback(err);
					runFtpQueue();
				}
				else {
					
					console.log("Successfully saved pathname=" + pathname + "");

					saveToDiskCallback(null, path);
					
					runFtpQueue();
				}
				
			}
			
		}

	}
	
	editor.copyFile = function(from, to, callback) {
		// Copies a file from one location to another location, can be local file-system or a remote connection
		
		var returnBuffer = true;
		var encoding = "binary";
		var inputBuffer = true;
		
		editor.readFromDisk(from, function(err, path, buffer) {
			
			if(err) {
				console.warn("Copy failed! Unable to read file: " + err.message);
				callback(err, to);
			}
			else {
				editor.saveToDisk(to, buffer, function(err, path) {
					
					if(err) console.warn("Copy failed! Unable to write file path=" + to + ": " + err.message);
					
					callback(err, to);
					
					
				}, inputBuffer, encoding);
			}
			
		}, returnBuffer, encoding)
		
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
		fileOpen.setAttribute("nwworkingdir", trailingSlash(defaultPath));
	}
	
	editor.fileOpenDialog = function(defaultPath, callback) {
		/*
			Brings up the OS file select dialog window.
			File path is then passed to the callback function.
		*/
		
		console.log("Bringing up the file open dialog ...");
		
		editor.fileOpenCallback = callback;
		
		var fileOpen = document.getElementById("fileInput");
		
		//if(defaultPath == undefined) defaultPath = editor.workingDirectory;
		
		if(!defaultPath) defaultPath = getDirectoryFromPath(undefined);
		else {
			
			var lastChar = defaultPath.substr(defaultPath.length-1);
			
			//console.log("lastChar of defaultPath=" + lastChar);
			
			if(! (lastChar == "/" || lastChar == "\\")) {
				console.warn("defaultPath, bacause ending with '" + lastChar + "', doesn't seem to be a directory:" + defaultPath);
			}
			editor.setFileOpenPath(defaultPath);
		}
		
		fileOpen.click(); // Bring up the OS path selector window
	}
	
	editor.directoryDialog = function(defaultPath, callback) {
		
		console.log("Bringing up the directory dialog ...");
		
		directoryDialogCallback = callback;
		
		if(defaultPath) directoryDialogHtmlElement.setAttribute("nwworkingdir", defaultPath);
		
		directoryDialogHtmlElement.click(); // Bring up the OS path selector window
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
			
			console.log("render file=" + editor.currentFile.path);
			
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
			
			var startRow = 0; // Used for only rendering some rows for optimization. This functions renders all row, so startRow = 0
			
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
			
			
			// Find out if the buffer contains zero with characters ( might need optimization )
			if(buffer.length > 0) {
			var startIndex = buffer[0].startIndex;
			var endIndex = buffer[buffer.length-1].startIndex + buffer[buffer.length-1].length;
			var containZeroWidthCharacters = (indexOfZeroWidthCharacter(file.text.substring(startIndex, endIndex)) != -1);
			
			}
			else var containZeroWidthCharacters = false;
			
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
				editor.renderFunctions[i](ctx, buffer, editor.currentFile, startRow, containZeroWidthCharacters); // Call render
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
		// For optimization: Clears a box (screen area) instead of doing a full re-render
		
		var file = editor.currentFile;
		
		var top = Math.floor(editor.settings.topMargin + (row - file.startRow) * editor.settings.gridHeight);
		var left = Math.floor(editor.settings.leftMargin + (col + (file.grid[row].indentation * editor.settings.tabSpace) - file.startColumn) * editor.settings.gridWidth); // -0.5 to clear sub pixels (caret)
		
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
		
		if(!file.grid[row]) throw new Error("row=" + row + " does not exist in file grid! file.grid.length=" + file.grid.length);
		
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
		
		//if(editor.lastKeyPressed=="a") throw new Error("why resize now?");
		
		console.log("Resizing ... e=" + e + " editor.shouldRender=" + editor.shouldRender + "");
		
		console.time("resize");
		
		
		
		
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
		
		// Remove the wrapper styles so they get dynamic
		var wrappers = document.getElementsByClassName("wrap");
		for (var i = 0; i < wrappers.length; i++) {
			wrappers[i].setAttribute("savedScrollTop", wrappers[i].scrollTop); // Save scrolling position
			wrappers[i].setAttribute("savedScrollLeft", wrappers[i].scrollLeft);
			
			wrappers[i].style.height = "auto";
			wrappers[i].style.width = "auto";
			}
		
		
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
		
		shareHeight(leftColumn.childNodes, contentHeight);
		shareHeight(rightColumn.childNodes, contentHeight);
		
		
		
		// Set a static with and height to wrappers so that dynamic changes wont resize the wireframe (wrappes should have css: overflow: auto!important;)
		
		var leftColumnPadding = window.getComputedStyle(document.getElementById("leftColumn")).getPropertyValue("padding");
		//console.log("leftColumnPadding=" + leftColumnPadding);
		var columnPadding = parseInt(leftColumnPadding);
		var leftWrappers = leftColumn.getElementsByClassName("wrap");
		for (var i = 0; i < leftWrappers.length; i++) {
			//if(parseInt(wrapperComputedStyle.width) > leftColumnWidth) 
			// We always need to set with or the canvas will drop down below
			leftWrappers[i].style.width = (leftColumnWidth) + "px"; // - (columnPadding * 2 + 2) + "px";
		}
		var rightWrappers = rightColumn.getElementsByClassName("wrap");
		for (var i = 0; i < rightWrappers.length; i++) {
			rightWrappers[i].style.width = (rightColumnWidth) + "px"; // - (columnPadding * 2 + 2) + "px";
		}
		
		// Restore scrolling of the wrappers
		for (var i = 0; i < wrappers.length; i++) {
			console.log("Restoring scroll " +  wrappers[i].getAttribute("id") + " savedScrollTop=" + wrappers[i].getAttribute("savedScrollTop"));
			wrappers[i].scrollTop = wrappers[i].getAttribute("savedScrollTop");
			wrappers[i].scrollLeft = wrappers[i].getAttribute("savedScrollLeft");
		}
		
		/*
			var wrappers = document.getElementsByClassName("wrap");
			for (var i = 0; i < wrappers.length; i++) {
			//if(parseInt(wrapperComputedStyle.width) > leftColumnWidth)
			// We always need to set with or the canvas will drop down below
			wrappers[i].style.width = (leftColumnWidth) + "px"; // - (columnPadding * 2 + 2) + "px";
			}
		*/
		
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
		
		editor.renderNeeded();
		editor.render(); // Always render (right away to brevent black background blink) after a resize
		
		//editor.renderNeeded(); // Always render after a resize (but nor right away!?
		
		function shareHeight(elements, maxTotalHeight) {
			
			// If there are many elements in leftColumn or rightColumn, they have to share the height
			
			var devidedHeight = Math.floor(maxTotalHeight / elements.length);
			var computedStyle;
			var totalHeight = 0;
			var maxTotalHeight = contentHeight;
			
			for (var i = 0; i < elements.length; i++) {
				computedStyle = window.getComputedStyle(elements[i], null);
				totalHeight += parseInt(computedStyle.height);
			}
			
			var height = 0;
			var newHeight = 0;
			var availableHeight = maxTotalHeight - totalHeight;;
			if(availableHeight < 0) {
				// One or more elements need to shrink
				for (var i = 0; i < elements.length; i++) {
					computedStyle = window.getComputedStyle(elements[i], null);
					height = parseInt(computedStyle.height);
					
					newHeight = Math.min(maxTotalHeight, Math.max(devidedHeight, height + availableHeight));
						if(newHeight > height) continue; // Break the iteration
					
					elements[i].style.height = (newHeight) + "px";
					
						// Compute new total height
						totalHeight = totalHeight - height + newHeight;
						availableHeight = maxTotalHeight - totalHeight;
						
				}
			}
		}
		
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
		
		/*
			Check if the function name is unique (if there's already an event listener for this event with the same function name)
			Having unique function names will make it easier to debug
		*/
		var funName = getFunctionName(options.fun);
		if(funName == "") throw new Error("Please give the event listener function a name! (You can also name lamda function: ex: foo(function lamda() {})")
		for(var i=0; i<editor.eventListeners[eventName].length; i++) {
			if(editor.eventListeners[eventName][i].fun != undefined) {
				if(funName == getFunctionName(editor.eventListeners[eventName][i].fun)) {
					throw new Error("There is already a function named " + funName + " for the " + eventName + " event. Please give your function another name!");
				}
			}
			else {
				console.warn("Undefined callback in event listener:" + JSON.stringify(editor.eventListeners[eventName][i]));
			}
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
		
		if(!menuElement) throw new Error("editor.removeMenuItem was called without argument menuElement=" + menuElement);
		if(!menuElement.tagName) throw new Error("editor.removeMenuItem argument menuElement is not a HTML node!");
		
		var menu = document.getElementById("canvasContextmenu");
		
		var positionIndex = Array.prototype.indexOf.call(menu.children, menuElement);
		
		if(menuElement.parentNode == undefined) throw new Error("menuElement has no parent! menuElement.innerHTML=" + menuElement.innerHTML);
		
		if(menuElement.parentNode == menu) menu.removeChild(menuElement);
		else throw new Error("menuElement not part of menu! menuElement.innerHTML=" + menuElement.innerHTML + "\nmenu.innerHTML=" + menu.innerHTML + "\nmenuElement.parent.innerHTML=" + menuElement.parent.innerHTML);
		
		return positionIndex; // So another node can be inserted at this position
		
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
	
	editor.interact = function(interaction, options) {
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
		
		if(!file) file = editor.currentFile;
		
		if(!file) return true;
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
						
						if(word.length > 0 && addWord.indexOf(word) != 0) throw new Error("Function " + getFunctionName(fun) + " returned '" + addWord + "' witch does not have word=" + word + " in it!") 
						
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
					file.deleteCharacter();
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
				editor.renderNeeded();
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
		
		if(!editor.files.hasOwnProperty(file.path)) throw new Error("Showing a file that is not open! file.path=" + file.path);
		
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
			editor.setFileOpenPath(getDirectoryFromPath(file.path));
		}
		
		editor.input = focus;
		
		
		console.log("Calling fileShow listeners (" + editor.eventListeners.fileShow.length + ") file.path=" + file.path);
		for(var i=0; i<editor.eventListeners.fileShow.length; i++) {
			editor.eventListeners.fileShow[i].fun(file); // Call function
		}
		
		editor.resizeNeeded(); // Update the view
		editor.renderNeeded();
		
		editor.interact("showFile", window.event);
	}
	
	editor.getKeyFor = function(funName) {
		// Returns a string representing the key combination for the keyBidning "fun" name.
		
		if(typeof funName == "function") funName = getFunctionName(funName); // Convert to string
		
		var f, character, combo = "";
		for(var i=0; i<keyBindings.length; i++) {
			f = keyBindings[i]
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
	
	editor.keyBindings = function() {
		// Returns a list of key bindings
		return keyBindings;
		
	}
	
	editor.bindKey = function(b) {
		
		if(isNaN(b.charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		if((typeof b.fun !== "function")) throw new Error("Object argument needs to have a 'fun' method!");
		
		if(!b.desc) getStack("Key binding should have a description!");
		
		// Make sure the function name is unique. It needs to be unique to be able to unbind it. Unique names also makes it easier to debug
		var funName = getFunctionName(b.fun);
		if(funName == "") throw new Error("Key binding function can not be anonymous!")
		for(var i=0; i<keyBindings.length; i++) {
			if(getFunctionName(keyBindings[i].fun) == funName) {
				throw new Error("The function name=" + funName + " is already used by another key binder. Please use an uniqe function name!")
			}
		}
		
		keyBindings.push(b);
		
	}
	
	editor.rebindKey = function(funName, charCode, combo) {
		
		if(isNaN(charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		
		var f, rebound = false;
		for(var i=0; i<keyBindings.length; i++) {
			f = keyBindings[i]
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
		
		if(typeof funName === "function") {
			// Convert it to string
			funName = getFunctionName(funName);
		}
		
		var f;
		for(var i=0; i<keyBindings.length; i++) {
			f = keyBindings[i]
			if(getFunctionName(f.fun) == funName) {
				
				keyBindings.splice(i, 1);
				
				console.log("unbindKey " + funName);
				return true;
				//return editor.unbindKey(funName);
			}
		}
		
		console.warn("Failed to unbindKey funName=" + funName);
		
		return false;
	}
	
	editor.plugin = function(p) {
		/*
			If you have made a plugin. Use editor.plugin(desc, load, unload) instead of editor.on("start") !
			Plugins will load when the editor has started. Right after "eventListeners.start"
		*/
		
		if((typeof p.load !== "function")) throw new Error("The plugin needs to have a load method!");
		
		if((typeof p.unload !== "function")) throw new Error("The plugin should have a unload method!");
		if(!p.desc) throw new Error("The plugin should have a description!");
		
		p.loaded = false;
		
		if(windowLoaded) { // && editor.settings.devMode
			//alertBox("Gonna reload unload and load " + getFunctionName(p.load));
			editor.disablePlugin(p.desc); // Unload plugin before loading it 
			p.load(); // Load the plugin right away if the editor has already started. 
		}
		
		for(var i=0; i<editor.plugins.length; i++) {
			if(editor.plugins[i].desc == p.desc) throw new Error("A plugin with the same description is already loaded: " + p.desc);
		}
		
		editor.plugins.push(p);
		
	}
	
	editor.disablePlugin = function(desc) {
		
		var f;
		for(var i=0; i<editor.plugins.length; i++) {
			f = editor.plugins[i];
			if(f.desc == desc) {
				
				if(f.loaded && !f.unload) throw new Error("The plugin has already been loaded, and it does not have an unload method! So you have to disable this plugin before it's loaded!");
				
				if(f.unload) f.unload();
				
				editor.plugins.splice(i, 1);
				
				console.log("Plugin disabled: " + desc);
				
				return true;
			}
		}
		
		return false;
	}
	
	editor.addTest = function(fun, order) {
		
		var funName = getFunctionName(fun);
		
		if(funName.length == 0) throw new Error("Test function can not be anonymous!");
		
		if(order == undefined) order = 0;
		
		for(var i=0; i<editor.tests.length; i++) {
			if(editor.tests[i].text == funName) {
				if(windowLoaded) {
					console.log("Overloading test function name=" + funName + " !");
					editor.tests.splice(i, 1);
					break;
				}
				else throw new Error("Test function name=" + funName + " already exist!");
			}
			if(order > 0 && editor.tests[i].order > order) throw new Error("Remove order from test '" + editor.tests[i].text + "' if you want " + funName + " to run first!");
		}
		
		editor.tests.push({fun: fun, text: funName, order: order});
		
		// Sort the tests by order
		editor.tests.sort(function sortTests(a, b) {
			return b.order - a.order;
		});
		
	}
	
	editor.connect = function(callback, protocol, serverAddress, user, passw, keyPath, workingDir) {
		
		if(protocol == undefined) throw new Error("No protocol defined!");
		
		if(protocol.indexOf(":") != -1) {
			console.warn("Removing : (colon) from protocol=" + protocol);
			protocol = protocol.replace(/:/g, "");
		}
		
		protocol = protocol.toLowerCase();
		
		console.log("protocol=" + protocol);
		
		if(editor.remoteProtocols.indexOf(protocol) == -1) throw new Error("Protocol=" + protocol + " not supported!"); 
		
		if(protocol == "ftp" || protocol == "ftps") {
			
			if(ftpQueue.length > 0) {
				console.warn("Removing " + ftpQueue.length + " items from the FTP queue");
				ftpQueue.length = 0;
			}
			
			var Client = require('ftp');
			editor.connections[serverAddress] = {client: new Client(), protocol: protocol};
			var ftpClient = editor.connections[serverAddress].client;
			ftpClient.on('ready', function() {
				console.log("Connected to FTP server on " + serverAddress + " !");
				ftpClient.pwd(function(err, dir) {
					if(err) throw err;
					editor.changeWorkingDir(protocol + "://" + serverAddress + dir.replace("\\", "/"));
					
					// Create disconnect function
					editor.connections[serverAddress].close = function disconnectFTP() {
						ftpClient.end();
						delete editor.connections[serverAddress];
						
						console.log("Dissconnected from FTP on " + serverAddress + "");
					};
					
					callback(null, editor.workingDirectory);
				});
				
			});
			
			ftpClient.on('error', function(err) {
				alertBox(err.message);
				callback(err); // Should we callback here ?? Can happend several hours after the connection was initiated!
				
				connectionClosed("ftp", serverAddress);
				
				/*
					if(err.message == "Login incorrect.") {
					alertBox("Problem connecting to FTP on " + serverAddress + "\n" + err.message + "\nProbably wrong username/password!");
					}
					else {
					alertBox("Problem connecting to FTP on " + serverAddress + "\n" + err.message);
					}
					console.error(err);
				*/
			});
			
			ftpClient.on('close', function(hadErr) {
				alertBox("Connection to FTP on " + serverAddress + " closed.");
				
				connectionClosed("ftp", serverAddress);
				
			});
			
			var options = {host: serverAddress, user: user, password: passw};
			
			if(protocol == "ftps") {
				options.secure = true;
				
				// Some times the cert is lost!? So we need to override checkServerIdentity to return undefined instead of throwing an error: Cannot read property 'CN' of undefined
				// https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
				
				options.secureOptions = {
					checkServerIdentity: function(servername, cert) {
						console.log("Checking server identity for servername=" + servername);
						
						if(Object.keys(cert).length == 0) console.warn("No cert attached!");
						else {
							// Do some checking?
							//console.log(JSON.stringify(cert));
						}
						
						return undefined;
						
					}
				}
			}
			console.log("Connecting to " + options.host + " ...");
			ftpClient.connect(options);
		}
		
		// note: SSH (shell) not yet supported. Use SFTP instead!
		else if(protocol == "ssh") {
			
			sshConnect(function sshConnected(err, sshClient, workingDir) {
				if(err) callback(err);
				else {
					
					editor.connections[serverAddress] = {client: sshClient, protocol: protocol};
					
					// Create disconnect function
					editor.connections[serverAddress].close = function disconnectSSH() {
						sshClient.end();
						delete editor.connections[serverAddress];
						
						console.log("Dissconnected from SSH on " + serverAddress + "");
					};
					
					editor.changeWorkingDir(workingDir);
					
					callback(null, editor.workingDirectory);
				}
			});
			
		}
		else if(protocol == "sftp") {
			
			sshConnect(function sshConnected(err, sshClient, workingDir) {
				if(err) callback(err);
				else {
					// Initiate "SFTP mode"
					sshClient.sftp(function(err, sftpClient) {
						if (err) {
							sshClient.end();
							callback(err);
							//alertBox("Unable to run SFTP on " + serverAddress + "\n" + err.message);
							//throw err;
						}
						else {
							editor.connections[serverAddress] = {client: sftpClient, protocol: protocol};
							editor.changeWorkingDir(workingDir);
							
							console.log("Connected to SFTP on " + serverAddress + " . Working directory is: " + editor.workingDirectory);
							
							// Create disconnect function
							editor.connections[serverAddress].close = function disconnectSFTP() {
								sshClient.end();
								delete editor.connections[serverAddress];
								
								console.log("Dissconnected from SFTP on " + serverAddress + "");
							};
							
							callback(null, editor.workingDirectory);
						}
					});
				}
			});
		}
		else {
			throw new Error("Protocol not supported: " + protocol);
		}
		
		
		function sshConnect(cb) {
			// Connects to a SSH server and sets the working directory, returns the "connection" in the callback
			
			var auth = {
				host: serverAddress,
				port: 22,
				username: user,
			}
			
			if(keyPath) {
				// Connect using key
				editor.readFromDisk(keyPath, function readKey(err, path, keyStr) { // Read key
					auth.passphrase = passw;
					auth.privateKey = keyStr;
					try {
						connect();
					}
					catch(err) {
						cb(err);
						//alertBox("Problem connecting to SSH on " + serverAddress + ".\n" + err.message + "\nProbably wrong key passphrase");
					}
				});
			}
			else {
				// Connect using password
				auth.password = passw;
				connect();
			}
			
			function connect() {
				var Client = require('ssh2').Client;
				
				var c = new Client();
				c.on('ready', function() {
					console.log('Client :: ready');
					
					c.exec('pwd', function(err, stream) {
						if (err) throw err;
						var dir = "";
						stream.on('close', function(code, signal) {
							//console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
							
							// Chop off the newline character
							dir = dir.substring(0, dir.length-1);
							
							var workingDir = trailingSlash(protocol + "://" + serverAddress + dir.replace("\\", "/"));
							
							cb(null, c, workingDir);
							
							//c.end();
						}).on('data', function(data) {
							//console.log('STDOUT: ' + data);
							dir += data;
						}).stderr.on('data', function(data) {
							cb(new Error("Error executing pwd on SSH:" +  serverAddress + "\n" + data));
							//alertBox("Error executing pwd on SSH:" +  serverAddress + "\n" + data);
							console.warn('STDERR: ' + data);
						});
					});
					
				}).on('error', function(err) {
					cb(err);
					if(err.message == "All configured authentication methods failed") {
						alertBox("Problem connecting to SSH on " + serverAddress + "\n" + err.message + "\nYou might need a key!");
					}
					else {
						alertBox("Problem connecting to SSH on " + serverAddress + "\n" + err.message);
					}
					connectionClosed("ssh", serverAddress);
					
				}).on('end', function(msg) {
					alertBox("Disconnected from SSH on " + serverAddress + "\nMessage: " + msg);
					
					connectionClosed("ssh", serverAddress);
					
				}).connect(auth);
			}
		}
		}
	
	editor.folderExistIn = function(pathToParentFolder, folderName, folderExistInCallback) {
		console.log("folderExistIn pathToParentFolder=" + pathToParentFolder);
		
		editor.listFiles(pathToParentFolder, function(err, list) {
			
			console.log("list=" + list);
			
			if(err) {
				console.log("folderExistIn pathToParentFolder=" + pathToParentFolder + " err.message=" + err.message);
				folderExistInCallback(false);
			}
			else {
			
			for(var i=0; i<list.length; i++) {
				if(list[i].type == "d" && list[i].name == folderName) {
					folderExistInCallback(list[i].path);
						return;
				}
					else console.log(list[i].type + " " + list[i].name + " != " + folderName);
					}
				// end of for loop reached, no folder found:
				folderExistInCallback(false);
				
			}
			
		});
	}
	
	editor.listFiles = function(pathToFolder, listFilesCallback) {
		// Returns all files in a directory
		
		pathToFolder = trailingSlash(pathToFolder);
		
		if(pathToFolder == undefined) throw new Error("Need to specity a pathToFolder!");
		if(listFilesCallback == undefined) throw new Error("Need to specity a callback!");
		
		/*
			Try to get the file list in the same format regardless of protocol!
			
			type - string - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
			name - string - File or folder name
			path - string - Full path to file/folder
			size - float - The size of the entry in bytes.
			date - Date - The last modified date of the entry.
			
			
		*/
		
		var url = require('url');
		var parse = url.parse(pathToFolder);
		var protocol = parse.protocol;
		var hostname = parse.hostname;
		var pathname = parse.pathname;
		
		if(protocol == "ftp:" || protocol == "ftps:") {
			// ### List files using FTP protocol
			
			if(ftpBusy) {
				console.log("FTP is busy. Queuing file-list of pathname=" + pathname + " ...");
				ftpQueue.push(function() { listFilesFTP(pathname); });
			}
			else {
				ftpBusy = true;
				console.log("FTP is ready. Listing files in pathname=" + pathname + " ...");
				listFilesFTP(pathname);
			}
		}
		else if(protocol == "sftp:") {
			// ### List file using SFTP protocol
			if(editor.connections.hasOwnProperty(hostname)) {
				
				var c = editor.connections[hostname].client;
				
				console.log("Initiating folder read on SFTP " + hostname + ":" + pathname);
				
				// SFTP can list files in any folder. So we do not have to make sure the path is the same as the working directory (like with ftp)
				// hmm, it seems we can only do readdir once on each folder
				var b = c.readdir(pathname, function sftpReadDir(err, folderItems) {
					
					//getStack("XXX");
					
					console.log("Reading folder: " + pathname + " ...");
					
					if(err) {
						listFilesCallback(err);
					}
					else {
						
						//console.log(JSON.stringify(folderItems, null, 2));
						
						var list = [];
						var path = "";
						var type = "";
						
						for(var i=0; i<folderItems.length; i++) {
							path = pathToFolder + folderItems[i].filename; // Asume pathToFolder has a trailing slash
							type = folderItems[i].longname.substr(0, 1);
							
							if(type == "d") path = trailingSlash(path);
							
							//console.log("path=" + path);
							list.push({type: type, name: folderItems[i].filename, path: path, size: parseFloat(folderItems[i].attrs.size), date: new Date(folderItems[i].attrs.mtime*1000)});
						}
						
						listFilesCallback(null, list);
						
					}
					
				});
				
				//console.log("b=" + b);
				
			}
			else {
				listFilesCallback(new Error("Unable to read " + pathname + " on " + hostname + "\nNot connected to SFTP on " + hostname + " !"));
			}
		}
		else {
			// ### List files using "normal" file system
			var fs = require("fs");
			console.log("Reading directory=" + pathToFolder);
			fs.readdir(pathToFolder, function readdir(err, folderItems) {
				if(err) {
					listFilesCallback(err);
				}
				else {
					var filePath;
					var list = [];
					var statCounter = 0;
					if(folderItems.length == 0) {
						// It's an emty folder
						listFilesCallback(null, list);
					}
					else {
						var path = require("path");
						
						for(var i=0; i<folderItems.length; i++) {
							
							// Check item name for encoding problems �
							
							stat(folderItems[i], path.join(pathToFolder, folderItems[i]));
							// We do not know if it's a folder or file yet, folderItems is just an array of strings, we have to wait for stat
						}
					}
				}
				
				function stat(fileName, filePath) {
					console.log("Making stat: " + filePath + "");
					
					fs.stat(filePath, function stat(err, stats) {
						
						var type = "";
						var size;
						var mtime;
						var problem = "";
						
						if(stats) {
							size = stats.size;
							mtime = stats.mtime;
							
							if(stats.isFile()) {
								type = "-";
							}
							else if(stats.isDirectory()) {
								type = "d";
								filePath = trailingSlash(filePath);
							}
						}
						
						if(err) {
							
							/*
								EPERM = operation not permitted
								EBUSY = resource busy or locked
							*/
							
							if(err.code == "EPERM" || err.code == "EBUSY") {
								problem = err.code;
								type = "*"
							}
							else return listFilesCallback(err);
						}
						
						//console.log("stat: " + stats);
						
						
						
						list.push({type: type, name: fileName, path: filePath, size: size, date: mtime, problem: problem});
						
						statCounter++;
						
						console.log("Finished stat: " + filePath + " statCounter=" + statCounter + " folderItems.length=" + folderItems.length);
						
						if(statCounter==folderItems.length) listFilesCallback(null, list);
						
						
					});
				}
				
				
			});
			
			
		}
		
		
		function listFilesFTP(pathname) {
			
			if(editor.connections.hasOwnProperty(hostname)) {
				
				var ftpClient = editor.connections[hostname].client;
				
				if(pathToFolder != editor.workingDirectory) {
					// First change folder
					console.log("Sending cwd '" + pathname + "' to " + protocol + hostname);
					ftpClient.cwd(pathname, function changedDir(err) {
						
						if(err) {
							listFilesCallback(err);
							runFtpQueue();
						}
						else {
							ftpListFiles(ftpClient);
						}
						
					});
				}
				else {
					ftpListFiles(ftpClient);
				}
			}
			else {
				listFilesCallback(new Error("Unable to read " + pathname + " on " + hostname + "\nNot connected to FTP on " + hostname + " !"));
				runFtpQueue();
			}
			
			function ftpListFiles(ftpClient) {
				
				console.log("Listing files in '" + parse.pathname + "' on " + parse.protocol + parse.hostname);
				
				ftpClient.list(function readdirFtp(err, folderItems) {
					if (err) {
						console.warn(err.message);
						listFilesCallback(err);
						runFtpQueue();
					}
					else {
						
						var list = [];
						var path = "";
						var type = "";
						
						//console.log("folderItems=" + JSON.stringify(folderItems, null, 2));
						
						for(var i=0; i<folderItems.length; i++) {
							
							//console.log("name=" + folderItems[i].name);
							
							path = pathToFolder + folderItems[i].name;
							type = folderItems[i].type;
							
							if(type == "d") path = trailingSlash(path);
							
							// todo: parse date ?
							list.push({type: type, name: folderItems[i].name, path: path, size: parseFloat(folderItems[i].size), date: folderItems[i].date});
						}
						
						listFilesCallback(null, list);
						
						runFtpQueue();
						
					}
				});
			}
		}
	}
	

	editor.createPath = function(pathToCreate, createPathCallback) {
		/*
			Traverse the path and try to creates the directories, then check if the full path exists
			
		*/
		
		pathToCreate = trailingSlash(pathToCreate);
		
		var url = require('url');
		var parse = url.parse(pathToCreate);
		var protocol = parse.protocol;
		var delimiter = getPathDelimiter(pathToCreate);
		var lastChar = pathToCreate.substring(pathToCreate.length-1);
		var hostname = parse.hostname;
		var create = getFolders(pathToCreate);
		var errors = [];
		var fullPath = create[create.length-1];
		
		if(protocol) protocol = protocol.replace(/:/g, "").toLowerCase();
		
		console.log("hostname=" + hostname + " pathToCreate=" + pathToCreate + " parse=" + JSON.stringify(parse));
		
		create.shift(); // Don't bother with the root
		
		// Execute mkdir in order !
		if(create.length == 0) {
			console.warn("No path to create! fullPath=" + fullPath);
			createPathCallback(null, fullPath);
		}
		else executeMkdir(create.shift());
		
		function executeMkdir(folder) {
			// This is a recursive function!
			createPathSomewhere(folder, function(err, path) {
				if(err) errors.push(err.message + " path=" + path);
				
				if(create.length > 0) executeMkdir(create.shift());
				else done();
				
			});
		}
		
		function done() {
			// Check if the full path exists
			editor.listFiles(pathToCreate, listFileResult);
			
			function listFileResult(err, list) {
				
				if(err) {
					console.warn("List failed! " + err.message + " pathToCreate=" + pathToCreate);
					var errorMsg = "Failed to create path=" + pathToCreate + "\n" + err.message;
					for(var i=0; i<errors.length; i++) {
						errorMsg += "\n" + errors[i];
					}
					
					createPathCallback(new Error(errorMsg));
				}
				else createPathCallback(null, fullPath)
				
			}
		}
		
		function createPathSomewhere(path, createPathSomewhereCallback) {
			
			// ## mkdir ...
			
			console.log("mkdir " + path);
			
			if(path.indexOf("//") != -1) {
				path = path.replace(/\/\/+/g, "/"); // Remove double slashes
				console.warn("Sanitizing path=" + path + " pathToCreate=" + pathToCreate);
			}
			
			if(protocol == "ftp" || protocol == "ftps") {
				// ### Create a directory using FTP protocol
				
				if(ftpBusy) {
					console.log("FTP is busy. Queuing mkdir of path=" + path + " ...");
					ftpQueue.push(function() { createPathFTP(path); });
				}
				else {
					ftpBusy = true;
					console.log("FTP is ready. Creating path=" + path + " ...");
					createPathFTP(path);
				}
				
				
			}
			else if(parse.protocol == "sftp:") {
				// ### Create a directory using SFTP protocol
				if(editor.connections.hasOwnProperty(parse.hostname)) {
					
					var c = editor.connections[parse.hostname].client;
					
					var b = c.mkdir(path, function (err, folderItems) {
						
						//getStack("XXX");
						
						if(err) createPathSomewhereCallback(err, path);
						else createPathSomewhereCallback(null, path);
						
						
					});
					
					// b = false : If you should wait for the continue event before sending any more traffic.
					
					//console.log("b=" + b);
					
				}
				else {
					createPathCallback(new Error("Unable to create " + path + " on " + hostname + "\nNot connected to SFTP on " + hostname + " !"));
				}
			}
			else {
				// ### Create a directory using "normal" file system
				var fs = require("fs");
				
				fs.mkdir(path, function(err) {
					if(err) createPathSomewhereCallback(err, path);
					else createPathSomewhereCallback(null, path);
				});
			}
			
			
			function createPathFTP(path) {
				
				console.log("Creating FTP path=" + path)
				
				if(editor.connections.hasOwnProperty(hostname)) {
					
					var c = editor.connections[hostname].client;
					
					// ftp mkdir
					c.mkdir(path, function(err) {
						
						console.log("Done creating FTP path=" + path);
						
						if(err) createPathSomewhereCallback(err, path);
						else createPathSomewhereCallback(null, path);
						
						runFtpQueue();
						
					});
					
				}
				else {
					createPathCallback(new Error("Unable to create path=" + path + " on " + hostname + "\nNot connected to FTP on " + hostname + " !"));
					runFtpQueue();
				}
			}
			
		}
	}
	
	editor.mock = function(mock, options) {
		
		// Simulate ... 
		
		if(mock == "keydown") {
			if(!options.charCode) throw new Error("options need to contain charCode");
			if(!options.target) options.target = "fileCanvas";
			
			if(!options.target.className) options.target = {className: options.target}; // Shorter to write
			
			// Also specify options.shiftKey, otions.altKey and options.ctrlKey witch can be true
			
			var retDown = keyIsDown(options);
			keyIsUp(options);
			
			if(retDown === true) {
				// Default action was not prevented
				keyPressed(options);
			}
			
			return retDown;
		}
		else if(mock == "keypress") {
			if(!options.charCode) throw new Error("options need to contain charCode");
			
			keyPressed(options);
			
		}
		else if(mock == "copy") {
			var e = {
				clipboardData:  {
					setData: function setData(format, data) { return true; }
				},
				preventDefault: function preventDefault() { return true; }
			};
			
			return copy(e);
		}
		else if(mock == "paste") {
			var e = {
				clipboardData:  {
					getData: function getData(what) { return options.data; }
				},
				preventDefault: function preventDefault() { return true; }
			};
			paste(e);
		}
		else if(mock == "doubleClick") {
			if(!options.hasOwnProperty("x")) throw new Error("x coordinate required in options!");
			if(!options.hasOwnProperty("y")) throw new Error("y coordinate required in options!");
			if(!options.hasOwnProperty("target")) options.target = "fileCanvas";
			if(!options.hasOwnProperty("button")) options.button = 0; // 0=Left mouse button, 2=Right mouse button, 1=Center?
			
			if(!options.target.className) options.target = {className: options.target}; // Shorter to write
			
			var e = {clientX: options.x, offsetX: options.x, clientY: options.y, offsetY: options.y, target: options.target, button: options.button}
			console.log(e);
			
			mouseDown(e);
			mouseUp(e);
			mouseDown(e);
			mouseUp(e);
		}
	}
	
	editor.isBlanc = function (x, y, width, height) {
		// todo: for debugging. Returns true if the screen area is the same as the background
	}
	
	function runFtpQueue() {
		
		console.log(ftpQueue.length + " items left in the FTP queue");
		
		if(ftpQueue.length > 0) {
			console.log("Executing next item in the ftp queue ...");
			ftpQueue.shift()();
		}
		else ftpBusy = false;
		
	}
	
	function connectionClosed(protocol, serverAddress) {
		
		var connectedFiles = filesOnServer();
		
		if(connectedFiles.length > 0) {
			if(confirm("Close all opened files on " + serverAddress + " ?")) {
				
				connectedFiles.forEach(function(path) {
					editor.closeFile(path);
				});
				
			}
		}
		
		delete editor.connections[serverAddress]; // Remove the connection
		
		
			function filesOnServer() {
				// Returns an array of currently opened files connected to this server
				var list = [];
				for(var path in editor.files) {
					console.log("path=" + path);
					if(protocol == "ftp") { // protocol is always lower case!
						if(path.indexOf("ftp://" + serverAddress) != -1) list.push(path);
					}
					else if(protocol == "ssh") {
						if(path.indexOf("ssh://" + serverAddress) != -1 || path.indexOf("sftp://" + serverAddress) != -1) list.push(path);
					}
				}
				
				return list;
			}
			
		}
	
	function removeFrom(list, fun) {
		// Removes an object from an array of objects
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
			
			console.log("Closing the editor ...");
			
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
		
		// Use event listeners for these so that they also fire when "reloading" the editor
		editor.eventListeners.exit.push({fun: function exitKioskMode() {
				var GUI = require('nw.gui').Window.get();
				GUI.leaveKioskMode();
				return true;
		}});
		
		editor.eventListeners.exit.push({fun: function closeOpenConnections() {
			for(var conn in editor.connections) {
				if(editor.connections[conn].close) editor.connections[conn].close();
				else throw new Error("Connection: conn=" + conn + " did not have a close() method. Connection already closed!?");
			}
			return true;			
		}});
		
	}
	
	// More Event listeners ...
	
	
	//window.addEventListener("drop", fileDrop, false);
	window.ondragover = function(e) { e.preventDefault(); return false };
	window.ondrop = function(e) { e.preventDefault(); return false };
	
	window.addEventListener("dblclick", dblclick);
	
	
	window.addEventListener("load", main, false);
	window.addEventListener("resize", function(e) {
		console.log("EVENT RESIZE!");
		editor.resizeNeeded();
		editor.renderNeeded();
		
		editor.interact("resize", e);
		
	}, false);
	
	
	/*
		Add your own scroll listeners using editor.addEvent("scroll", yourFunction)
		Your function should return false to prevent default action.
	*/
	window.addEventListener("mousewheel",scrollWheel,false);
	window.addEventListener("DOMMouseScroll",scrollWheel,false);
	
	
	/*
		Add your own key listeners via editor.bindKey()
		Your function should return false to prevent default action.
	*/
	window.addEventListener("keydown",keyIsDown,false);  // captures 
	window.addEventListener("keyup",keyIsUp,false);      // keyBindings
	window.addEventListener("keypress",keyPressed,false); // Writes to the document at caret position
	
	
	/*
		Add your own key listeners with editor.on("eventName", callbackFunction);
		Your function should return false to prevent default action.
	*/
	
	
	// Capture mobile events
	window.addEventListener("touchstart", mouseDown, false);
	window.addEventListener("touchend", mouseUp, false);
	window.addEventListener("touchmove", mouseMove, false);
	
	
	//window.addEventListener("touchcancel", mouseUp, false);
	//window.addEventListener("touchleave", mouseUp, false);
	
	window.addEventListener("click", mouseclick, false);
	window.addEventListener("mousedown", mouseDown, false);
	window.addEventListener("mouseup", mouseUp, false);
	
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
		
		getVersion(function(version) {
			
			console.log("Editor version: " + version);
			
			bootstrap();
			
		});
		
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
		
		
		keyBindings.push({charCode: editor.settings.autoCompleteKey, fun: editor.autoComplete, combo: 0});
		
		
		if(editor.settings.devMode && runtime != "browser") {
			// ## Load tests
			console.log("Loading tests ...");
			var walk = require('walk');
			var head = document.getElementsByTagName("head")[0];
			var path = require("path");
			var root = path.join(__dirname, "tests/"); // Path folder test files
			var walker  = walk.walk(root, { followLinks: false });
			
			console.log("root:" + root);
			
			walker.on('file', function(folder, stat, next) {
				
				var filePath = path.join(folder, stat.name);
				var filename = getFilenameFromPath(filePath);
				var ext = getFileExtension(filePath);
				
				if(ext == "js" && filename.substr(0,1) != "_") { // Only load .js files and ignore file-names starting with underscore _
					var fileref=document.createElement('script');
					
					fileref.setAttribute("type","text/javascript");
					fileref.setAttribute("src", filePath);
					head.appendChild(fileref);
					
					console.log("Loading test: " + filePath);
				}
				next();
				
			});

			walker.on('end', function() {
				console.log("All test files loaded");
			});
		
			console.log("Binding 'run tests' to Ctrl + Shift + T");
			var keyT = 84;
			keyBindings.push({charCode: keyT, fun: runTests_5616458984153156, combo: CTRL + SHIFT});
			
		}
		
		
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
		
		// Handle directory dialog
		directoryDialogHtmlElement = document.getElementById("directoryInput");
		directoryDialogHtmlElement.addEventListener('change', function directorySelected(e) {
			
			console.log("Directory selected ...");
			
			if(directoryDialogCallback == undefined) {
				throw new Error("There is no listener for the open directory dialog!");
			}
			
			var file = e.target.files[0];
			if (!file) {
				throw new Error("No file selected from the open-file dialog.");
				return;
			}
			
			var fileName = file.name;
			var filePath = file.path;
			
			console.log("Calling directory-dialog callback: " + getFunctionName(directoryDialogCallback) + " ...");
			directoryDialogCallback(filePath);
			directoryDialogCallback = undefined;
			
			directoryDialogHtmlElement.value = null; // Reset the value so we can select the same directory again!
			
			
		}, false);
		
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
		
		console.log("plugins: ");
		editor.plugins.map(function (p) {console.log(p.order + ": " + p.desc)});
		
		console.log("Loading plugins (length=" + editor.eventListeners.start.length + ")");
		for(var i=0; i<editor.plugins.length; i++) {
			console.log("plugin: " + editor.plugins[i].desc);
			// An error in any of the plugins will make all plugins after it to not load! So we have to use a try catch
			try {
				editor.plugins[i].load(editor); // Call function (and pass global objects!?)
			}
			catch(err) {
				console.error(err.message);
				console.log(err.stack);
				alertBox('Failed to (fully) load plugin:\n<i>"' + editor.plugins[i].desc + '"<(i>\nError: ' + err.message);
			}
		}
		
		if(runtime != "browser") {
			/*
				NOTE: IT IS NOT POSSIBLE TO CAPTURE STDIN FROM NW!
				We will have to use a wrapper and send the data via a socket
				*/
			var net = require("net");
		var env = process.env;
		var stdInFile;
		var strBuffer = "";
		var StringDecoder = require('string_decoder').StringDecoder;
		var decoder = new StringDecoder('utf8');
		var stdInFileName = "stdin";
		
		var client = net.createConnection({port: env.STDIN_PORT || editor.settings.stdInPort}, function() {
			//alertBox("Connected to STDIN ...");
			
			if(!stdInFile) {
			if(editor.files.hasOwnProperty(stdInFileName)) stdInFile = editor.files[stdInFileName];
			else {
			editor.openFile(stdInFileName, "", function stdinFileOpen(err, file) {
					if(err) throw err;
					stdInFile = file;
				});
			}
			}
			
		});
		
		client.on("error", function stdSocketError(err) {
			console.warn(err.message);
		});
		
		client.on("data", stdIn);
		client.on("end", stdEnd);
			
			
			// Command arguments
			var gui = require('nw.gui');
			var commandArguments = gui.App.argv;
			console.log("Command arguments:" + commandArguments);
			//alertBox("Command arguments:" + commandArguments);
			
			
			// Menu test:
			// https://github.com/nwjs/nw.js/wiki/Window-menu
			// It says menubar should work in Linux ...
			// confirmed: Meny at the top DOES NOT WORK in nw.js v0.12.3
			/*
			var menu = new gui.Menu({ type: 'menubar' });
			
			var menuA = new gui.MenuItem({ label: 'Item A' });
			
			var submenu = new gui.Menu();
			submenu.append(new gui.MenuItem({ label: 'Item 1' }));
			submenu.append(new gui.MenuItem({ label: 'Item 2' }));
			submenu.append(new gui.MenuItem({ label: 'Item 3' }));
			
			menuA.submenu = submenu;
			
			menu.append(menuA);
			menu.append(new gui.MenuItem({ label: 'Item B' }));
			menu.append(new gui.MenuItem({ type: 'separator' }));
			menu.append(new gui.MenuItem({ label: 'Item C' }));
			
			gui.Window.get().menu = menu;
			*/
			
		}
		
		
		
		setInterval(resizeAndRender, 16); // So that we always see the latest and greatest
		
		// note to self: Just temorary, dont forget to remove:
		//if(editor.settings.devMode == true) editor.openFile(testfile);
		
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
		
		windowLoaded = true;
		
		function stdIn(data) {
			
			var str = decoder.write(data);
			
			if(stdInFile) {
				if(strBuffer.length > 0) {
					// Collected data from before stdInFile was opened
					strBuffer += str; 
					//stdInFile.write(JSON.stringify(env, null, 2) + "\n");
					stdInFile.write(strBuffer);
					strBuffer = "";
				} else stdInFile.write(str);
				
			}
			else strBuffer += str;
			
			//alertBox("STDIN: data.length=" + data.length + " strBuffer.length=" + strBuffer.length + " str.length=" + str.length + " data: " + data + "");
		}
		
		function stdEnd(endData) {
			
			if(stdInFile) {
				if(strBuffer.length > 0) {
					// Collected data from before stdInFile was opened
					//stdInFile.write(JSON.stringify(env, null, 2) + "\n");
					stdInFile.write(strBuffer);
					strBuffer = "";
				}
				}
			else {
				// Wait for stdInFile ...
				console.log("Waiting for stdInFile ...");
				setTimeout(stdEnd, 100);
			}
			
			alertBox("STDIN: END: " + endData);
		}
		
	}
	
	function runTests_5616458984153156() { // Random numbers to make sure it's unique
		
		/*
			Todo: Start another instance of the editor with the chromium debug console enabled and connect to it. 
			Then run the tests there. And open any bad files here for debugging!?
			
		*/
		
		// Prepare for tests ...
		
		// Close all files
		for(var path in editor.files) {
			if(editor.files[path].saved) editor.closeFile(path)
			else {
				alertBox("Please save or close file before running tests: " + path);
				return;
			}
		}
		
		// Create some test files ...
		/*
		var filesToOpen = 2;
		var filesOpened = 0;
		for(var i=0; i<filesToOpen; i++) {
			editor.openFile("testfile" + i, "This is test file nr " + i + " line 1\r\nThis is test file nr " + i + " line 2\r\nThis is test file nr " + i + " line 3\r\nThis is test file nr " + i + " line 4\r\nThis is test file nr " + i + " line 5", function fileOpened(err, file) {
				if(++filesOpened == filesToOpen) doTheTests();
			});
		}
		*/
		doTheTests();
		
		
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
				alertBox("Testing: " + editor.tests[0].text);
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
				
				editor.openFile("testresults.txt", testResults.join("\n"), function(err, file) {
					//file.parse = false;
					//file.mode = "text";
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
		
		if(editor.fileOpenCallback == undefined) {
			throw new Error("There is no listener for the open file dialog!");
		}
		
		var file = e.target.files[0];
		if (!file) {
			throw new Error("No file selected from the open-file dialog.");
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		var fileContent = undefined;
		
		if(runtime == "browser") {
			
			filePath = fileName; // filePath is undefined in the browser
			
			// Read the file
			var reader = new FileReader();
			
			reader.onload = function(e) {
				fileContent = e.target.result;
				callCallback();
			};
			reader.readAsText(file);
			
		}
		else {
			callCallback();
		}
		
		function callCallback() {
			console.log("Calling file-dialog callback: " + getFunctionName(editor.fileOpenCallback) + " ...");
			editor.fileOpenCallback(filePath, fileContent);
			editor.fileOpenCallback = undefined;
			
			fileOpenHtmlElement.value = null; // Reset the value so we can open the same file again!
		}
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
		
		editor.interact("fileDrop", e);
		
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
		
		editor.interact("copy", e);
		
		return textToPutOnClipboard;
		
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
		
		editor.interact("cut", e);
	}
	
	
	function paste(e) {
		var text = e.clipboardData.getData('text'),
		ret,
		textChanged = false;
		
		console.log("PASTE: " + lbChars(text));
		
		if(editor.input && editor.currentFile) {
			
			e.preventDefault();
			
			console.log("Calling paste listeners (" + editor.eventListeners.paste.length + ") ...");
			for(var i=0, fun; i<editor.eventListeners.paste.length; i++) {
				
				fun = editor.eventListeners.paste[i].fun;
				
				ret = fun(editor.currentFile, e.clipboardData);
				
				if(editor.settings.devMode) console.log("Paste listener: " + getFunctionName(fun) + " returned:\n" + ret);
				
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
		
		editor.interact("paste", e);
		
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
	
	
	function keyPressed(e) {
		e = e || window.event; 
		
		//e.preventDefault();
		
		var charCode = e.charCode || e.keyCode || e.which;
		var character = String.fromCharCode(charCode); 
		var combo = getCombo(e);
		var file = editor.currentFile;
		var preventDefault = false;
		var funReturn = true;
		
		console.log("keyPressed: " + charCode + " = " + character + " (charCode=" + e.charCode + ", keyCode=" + e.keyCode + ", which=" + e.which + ") combo=" + JSON.stringify(combo) + " editor.input=" + (editor.currentFile ? editor.input : "NoFileOpen editor.input=" + editor.input + "") + "");
		
		
		console.log("Calling keyPressed listeners (" + editor.eventListeners.keyPressed.length + ") ...");
		for(var i=0; i<editor.eventListeners.keyPressed.length; i++) {
			funReturn = editor.eventListeners.keyPressed[i].fun(file, character, combo); // Call function
			
			if(funReturn !== true && funReturn !== false) throw new Error("keyPressed event listener: " + getFunctionName(editor.eventListeners.keyPressed[i].fun) + " did not return true or false!");
			
			if(funReturn === false && !preventDefault) {
				preventDefault = true;
				if(file && editor.input) console.log(getFunctionName(editor.eventListeners.keyPressed[i].fun) + " prevented insertion of character=" + character + " into file.path=" + file.path);
			}
		}
		
		
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
		
		
		
		
		editor.lastKeyPressed = character;
				
		
		if(file) {
			if(editor.input && !preventDefault) {
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
					editor.renderCaret(file.caret, 1); // colPlus=1 so that the caret will be rendered right
					
					/*
						Problem: After ca 56-60 inputs, render times goes from 3-4ms to 17-18ms
						And sometimes it will not go down to 3-4ms ever! (stay at 17-18ms)
						
						note: Canvas size didn't have an impact when only writing one character
					
						Benchmark results are all over the place 2-20ms probably because of vsync or refresh syncing not in sync with the benchmark tool (Typometer)
						
						THIS OPTIMIZATION SEEMS TO HAVE VERY LITTLE EFFECT!
						
						
						We don't have to use setTimeout it seems. But sometimes it seems that the canvas wont render in the browser until the main thread is idle ...
					
					*/
					
					//setTimeout(function waitforrender() {
					
					file.putCharacter(character);
					// No render needed!
					
					//}, 22);
					
				}
				else {
					file.putCharacter(character);
					editor.renderNeeded();
				}
				
				
			}
			
		}
		
		editor.interact("keyPressed", e);
		
	}
	""
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
		
		console.log("keyDown: " + charCode + " = " + character + " lastKeyDown=" + lastKeyDown + " combo=" + JSON.stringify(combo) + " targetElementClass=" + targetElementClass);
		
		lastKeyDown = charCode;
		
		
		// Prevent unsupported combo error ? 
		// But what if we want a binding of *just* ALT!?
		// Can't have that or it will mess all native combos. You need to bind to shift|alt|ctrl PLUS something else
		// Shift <> stopped working
		
		if(charCode == charCodeCtrl) return true; // Ctrl
		if(charCode == charCodeAlt) return true; // ALT
		
		if(combo.alt && combo.shift) {
			console.warn("Alt + shift is the default for changing keyboard layout in Windows!");
		}
		
		// Be aware of OS/shell specific key bindings! If there for example is a Gnome shell keybinding for Ctrl+Alt+Arrow (switiching workspace) the editor wont capture it! (the arrow key)
		
		
		// PS. Alt Gr = Ctrl+Alt
		// AltGr is the same as hitting Ctrl+ Alt
		
		// You probably want to use bindKey instead of eventListeners.keyDown!
		console.log("Calling keyDown listeners (" + editor.eventListeners.keyDown.length + ") ...");
		for(var i=0; i<editor.eventListeners.keyDown.length; i++) {
			funReturn = editor.eventListeners.keyDown[i].fun(editor.currentFile, character, combo); // Call function
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("Default action will be prevented!");
			}
		}
		
		// Check key bindings
		for(var i=0, binding; i<keyBindings.length; i++) {
			
			binding = keyBindings[i];
			
			if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || (binding.combo === undefined)) && (binding.dir == "down" || binding.dir === undefined) ) { // down is the default direction
				
				if(binding.charCode == charCodeShift || binding.charCode == charCodeAlt || binding.charCode == charCodeCtrl) {
					throw new Error("Can't have nice things! Causes a bug that will make native shift+ or algGr+ keyboard combos not work");
				}
				else {
					
					//console.log("keyDown: Calling function: " + getFunctionName(binding.fun) + "...");
					
					if(captured) console.warn("Key combo has already been captured by " + getFunctionName(captured) + " : charCode=" + charCode + " character=" + character + " combo=" + JSON.stringify(combo) + " binding.fun=" + getFunctionName(binding.fun));
					
					captured = binding.fun;
					
					if(!editor.currentFile) console.warn("No file open!");
					
					funReturn = binding.fun(editor.currentFile, combo, character, charCode, "down", targetElementClass);
					
					console.log(getFunctionName(binding.fun) + " returned " + funReturn);
					
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
		
		// Throwing the actual error here doesn't give a call stack! meh ... Need to see the console.warning to see the call stack
		//if(gotError) throw gotError; // throw new Error("There was an error when calling keyBindings. Se warnings in console log!");
		// Otimally we would want all key bound functions to run before throwing the error, but it's too annoying to not see the call stack in the error
		
		if(editor.currentFile) {
			editor.currentFile.checkGrid();
			editor.currentFile.checkCaret();
		}
		
		editor.interact("keyDown", {charCode: charCode, target: targetElementClass, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey});
		
		
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
			if(e.preventDefault) e.preventDefault();
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
		
		/*
		
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
					editor.renderNeeded();
				}
				else if(tildeShiftActive) {
					editor.currentFile.putCharacter("^");
					editor.renderNeeded();
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
		
		
		*/
		
		// Check key bindings
		for(var i=0, binding; i<keyBindings.length; i++) {
			
			binding = keyBindings[i];
			
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
		
		
		editor.interact("keyUp", e);
		
		//return false;
		
	}
	
	
	
	function mouseDown(e) {
		
		e = e || windows.event;
		
		var mouse = getMousePosition(e);
		var mouseX = mouse.x;
		var mouseY = mouse.y;
		
		
		var caret,
		button = e.button,
		click,
		target = e.target,
		mouseDirection = "down",
		preventDefault = false,
		keyboardCombo = getCombo(e),
		funReturn;
		
		//objInfo(target);
		
		if(button == undefined) button = 0; // For like touch events
		
		var menu = document.getElementById("canvasContextmenu");
		
		//console.log("mouseDown on target.className=" + target.className);
		
		if(target.className == "fileCanvas" || target.className == "content centerColumn") {
			
			editor.hideMenu();
			
			caret = editor.mousePositionToCaret(mouseX, mouseY);
			
			
			if(editor.currentFile && (button == 0)) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
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
		
		
		editor.interact("mouseDown", e);
		
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
		var mouse = getMousePosition(e);
		var mouseX = mouse.x;
		var mouseY = mouse.y;
		
		var caret,
		button = e.button,
		click,
		target = e.target,
		keyboardCombo = getCombo(e),
		mouseDirection = "up";
		
		if(button == undefined) button = 0; // For like touch events

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
		
		
		editor.interact("mouseUp", e);
		
		return false;
		//return true;
		
	}
	
	function getMousePosition(e) {
		
		// Mouse position is on the current object (Canvas) 
		var mouseX = e.offsetX==undefined?e.layerX:e.offsetX;
		var mouseY = e.offsetY==undefined?e.layerY:e.offsetY;
		
		/*
		if(e.page) console.log("e.page.x=" + e.page.x);
		if(e.changedTouches) console.log("e.changedTouches[" + (e.changedTouches.length-1) + "]=" + e.changedTouches[e.changedTouches.length-1].pageX);
		console.log("e.x=" + e.x);
		console.log("e.offsetX=" + e.offsetX);
		console.log("e.layerX=" + e.layerX);
		*/
		
		if(isNumeric(e.clientX) && isNumeric(e.clientY)) {
			editor.mouseX = parseInt(e.clientX);
			editor.mouseY = parseInt(e.clientY);
		}
		else if(e.changedTouches) {
			
			mouseX = Math.round(e.changedTouches[e.changedTouches.length-1].pageX); // pageX
			mouseY = Math.round(e.changedTouches[e.changedTouches.length-1].pageY);
			
			// Touch events only have pageX with is the whole page. We only want the position on the canvas!
			var rect = canvas.getBoundingClientRect();
			//console.log(rect.top, rect.right, rect.bottom, rect.left);
			
			mouseX = mouseX - rect.left;
			mouseY = mouseY - rect.top;
			
		}
		else {
			mouseX = editor.mouseX;
			mouseY = editor.mouseY;
			console.warn("Unable to find mouse position. Using last know position mouseX=" + mouseX + " mouseY=" + mouseY);
			
		}
		
		//console.log("mouseX=" + mouseX);
		//console.log("mouseY=" + mouseY);
		
		if(mouseX == undefined || mouseY == undefined || isNaN(mouseX) || isNaN(mouseY)) {
			throw new Error("Mouse position is unknown!");
		}
		else {
			return {x: mouseX, y: mouseY};
}
		
}
	
	function mouseMove(e) {
		
		e = e || window.event;
		
		//e.preventDefault();
		
		var mouse = getMousePosition(e);
		var mouseX = mouse.x;
		var mouseY = mouse.y;
		
		var target = e.target;
		
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
		
		editor.interact("mouseMove", e);
		
		//return false;
		
	}
	
	function mouseclick(e) {
		/*
			Check for the editor.shouldRender flag and render if true
			
			For events that are not bound to mouseUp or mouseDown
		*/
		console.log("mouseClick, editor.shouldRender=" + editor.shouldRender + ", editor.shouldResize=" + editor.shouldResize);
		
		editor.interact("mouseClick", e);
		
		return true;
		
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
		
		editor.interact("dblclick", e);
		
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
		
		editor.interact("mouseScroll", e);
		
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
					throw new Error("Error when opening url=" + url + "\nxmlHttp.status=" + xmlHttp.status + "\nxmlHttp.responseText=" + xmlHttp.responseText);
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
		
	function bootstrap() {
		// Make a HTTP get request to the url located in file bootstrap.url to get boostrap info like credentials etc
		
		editor.readFromDisk(__dirname + "/bootstrap.url", function bootstrap(err, path, url) {
			if(err) {
				console.warn("bootstrap.url: " + err.message);
				return;
			}
			
			// Append version to url so that the bootstrap provider knows what version of the editor you are using
			if(url.indexOf("?") != -1) url = url + "&version=" + editor.version;
			else url = url + "?version=" + editor.version;
			
			httpGet(url, function(err, data) {
				if(err) {
					console.warn("bootstrap get: " + err.message);
					return;
				}
				
				try {
					var json = JSON.parse(data);
				}
				catch(err) {
					console.warn("bootstrap parse: Not valid JSON: " + data);
				}
				
				if(json) {
					editor.bootstrap = json;
					editor.fireEvent("bootstrap", json);
				}
				
			});
			
			
		});
	}
	
	function getVersion(callback) {
		
		editor.readFromDisk("version.inc", function(err, path, string) {
			if(err) {
				// Failed to read file 
				
				if(runtime != "browser") {
					
					// Try Mercurial
					var exec = require('child_process').exec;
					var child = exec('hg log -l 1', function(error, stdout, stderr) {
						if(!error) {
							
							var myRegexp = /changeset:\s*(\d*):/g;
							var match = myRegexp.exec(stdout);
							
							if(!match) {
								console.log("Unable to find latest HG commit id! stdout=" + stdout);
								editor.version = -1;
								callback(editor.version);
							}
							else {
								editor.version = match[1];
								callback(editor.version);
							}
						}
						else {
							editor.version = -1;
							callback(editor.version);
						}
					});
					}
				else {
					editor.version = -1;
					callback(editor.version);
				}
			}
			else {
				editor.version = parseInt(string);
				callback(editor.version);
			}
		});
		
	}
	
	
})();
