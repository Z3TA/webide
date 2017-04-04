"use strict";

//var testfile = "test/testfile.txt";

// The EDITOR object lives in global scope, so that it can be accessed everywhere.
var EDITOR = {};

var tempTest = 0;
var benchmarkCharacter = ".";
var benchmarkCharacterCode = 190;
var inputCount = 0;


// List of file extensions of supported files. Extensions Not in this list will be loaded in plain text mode.
// important: Add file format that are supported by the parsers here:
EDITOR.supportedFiles = [
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
EDITOR.settings = {
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

EDITOR.shouldRender = false;   // Internal flag, use EDITOR.renderNeeded() to re-render!
EDITOR.shouldResize = false;   // Internal flag, use EDITOR.resizeNeeded() to re-size!
EDITOR.fileIndex = -1;   // Keep track on opened files (for undo/redo)
EDITOR.files = {};       // List of all opened files with the path as key
EDITOR.mouseX = 0;       // Current mouse position
EDITOR.mouseY = 0;
EDITOR.info = [];        // Talk bubbles. See EDITOR.addInfo()
EDITOR.version = 0;      // Incremented on each commit. Loaded from version.inc when the editor loads
EDITOR.connections = {}  // Store connections to remote servers (FTP, SSH)
EDITOR.remoteProtocols = ["ftp", "ftps", "sftp"]; // Supported remote connections
EDITOR.bootstrap = null; // Will contain JSON data from fethed url in bootstrap.url, fires "bootstrap" event
EDITOR.platform = /^Win/.test(window.navigator) ? "Windows" : (/^linux/.test(window.navigator) ? "Linux" : "Unknown");
// http://stackoverflow.com/questions/9514179/how-to-find-the-operating-system-version-using-javascript


EDITOR.collaborationMode = true;


EDITOR.eventListeners = { // Use EDITOR.on to add listeners to these events:
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
	bootstrap: [],
	storageReady: [] // When server storage is ready to be used
};

EDITOR.renderFunctions = [];
EDITOR.preRenderFunctions = [];

EDITOR.plugins = [];

EDITOR.view = {
	visibleColumns: 0, 
	visibleRows: 0, 
	canvasWidth: 0,
	canvasHeight: 0,
	startingColumn: 0,
	endingColumn: 0
};

EDITOR.tests = []; // {description, fun}

EDITOR.currentFile = undefined; // A File object

EDITOR.input = false; // Wheter inputs should go to the current file in focus or to some other element like an html input box.

EDITOR.fileOpenCallback = undefined;
EDITOR.lastKeyPressed = "";

(function() { // Non global editor code ...
	
	// These variables and functions are private ...
	// We only expose methods that are in the EDITOR object.
	
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
	
	var windowLoaded = false;
	
	var directoryDialogCallback = undefined;
	var directoryDialogHtmlElement;
	
	var widgetElementIdCounter = 0;
	
	/*
		EDITOR functionality (accessible from global scope) By having this code here, we can use private variables
		
		To make it more fun to write plugins, the EDITOR and File object should take care of the "low level" stuff and heavy lifting. 
		Feel free to add more EDITOR methods below. Do not extend the EDITOR object elsewhere!!
	*/
	
	
	
	// # Working Directory
	var workingDirectory; // Private variable
	if(!Object.defineProperty) console.warn("Object.defineProperty not available!");
	else {
		Object.defineProperty(EDITOR, 'workingDirectory', {
			get: function() { return workingDirectory; },
			set: function(newValue) { throw new Error("Use EDITOR.changeWorkingDir(newDir) to change working directory!"); },
			enumerable: true
		});
	}
	
	setWorkingDirectory(UTIL.trailingSlash(process.cwd()));
	
	if(runtime!="browser") {
		// Check if the working directory is the same as the editor (hmm, why?)
		
		console.log("__dirname=" + __dirname);
		console.log("workingDirectory=" + EDITOR.workingDirectory);
		
		if(__dirname != EDITOR.workingDirectory) console.warn("Working directory is not the current directory __dirname=" + __dirname + " EDITOR.workingDirectory=" + EDITOR.workingDirectory);
	}
	
	function setWorkingDirectory(workingDir) {
		
		// Private function to internally change working directory and calling event listeners that listen for workingDirectory changes.
		
		workingDirectory = UTIL.trailingSlash(workingDir);
		
		console.log("Calling changeWorkingDir listeners (" + EDITOR.eventListeners.changeWorkingDir.length + ") workingDirectory=" + workingDirectory);
		for(var i=0; i<EDITOR.eventListeners.changeWorkingDir.length; i++) {
			//console.log("function " + UTIL.getFunctionName(EDITOR.eventListeners.changeWorkingDir[i].fun));
			EDITOR.eventListeners.changeWorkingDir[i].fun(workingDirectory); // Call function
		}
		
		return workingDirectory;
	}
	
	
	// # Server Storage (to replace localStorage)
	var _serverStorage = null; // Will be populated once the data is recived from the server
	
	EDITOR.storage = {
		setItem: function(id, val, callback) {
			CLIENT.cmd("storageSet", {item: id, value: String(val)}, function(err, json) {
				if(callback) callback(err, json);
				if(err) throw err;
			});
			return _serverStorage[id] = String(val); 
		},
		getItem: function(id, trap) {
			if(!this.ready()) throw new Error('Storage is not yet ready. Use EDITOR.on("storageReady", yourFunction)'); 
			
			if(trap !== undefined) throw new Error("getItem only takes one argument, did you mean to use setItem ?"); // Error check
			
			if(!_serverStorage.hasOwnProperty(id)) {
				console.warn("Can not find id=" + id + " in EDITOR.storage!");
				return null;
			}
			else return _serverStorage[id];

		},
		
		removeItem: function(id, callback) {
			CLIENT.cmd("storageRemove", {item: id}, function(err, json) {
				if(callback) callback(err, json);
				if(err) throw err;
			});
			
			return delete _serverStorage[id];
		},
		clear: function() {
			throw new Error("Use EDITOR.storage.removeItem() instead!");
			//CLIENT.cmd("storageClear", function(err) {if(err) throw err;});
			return _serverStorage = {}; 
		},
		ready: function() {
			if(_serverStorage === null) return false;
			else if(_serverStorage instanceof Object) return true;
			else {
				//console.log("instanceof " + (instanceof _serverStorage));
				throw new Error("_serverStorage=" + _serverStorage + " typeof " + (typeof _serverStorage));

			}
		}
	};	
	
	
	EDITOR.changeWorkingDir = function(workingDir) {
		
		// Update internally (on client)
		var workingDirectory = setWorkingDirectory(workingDir);
		
		var json = {path: workingDirectory};
		
		// Update the server
		// The server will check if the directory exists
		CLIENT.cmd("setWorkingDirectory", json, function(err, json) {
			if(err) throw err;
			});
		
	}
	
	EDITOR.sortFileList = function() {
		
		// Sorts EDITOR.files by file.order and returns an array of the files
		
		var fileList = [];
		
		for(var path in EDITOR.files) {
			fileList.push(EDITOR.files[path]);
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
	
	
	EDITOR.openFile = function(path, text, callback) {
		/*
			Note: The caller of this function needs to handle file state, 
			such as file.isSaved, file.savedAs and file.changed
			Unless text==undefined, then it will be opened from disk and asumed saved.
			
			problem: The same file might be opened many times while we are waiting for it's data
			solution1: (did not work due to plugins using the EDITOR.files list to build stuff) Add temporary emty object to EDITOR.files while opening the file.
			solution2: A list of files that are beaing opened
		*/
		
		var file = null;
		
		
		console.log("Opening file: " + path + " typeof text=" + typeof text);
		
		// Convert path delimters !? 
		
		
		// Just so that we are consistent
		if(text === null) throw new Error("text is null! It should be undefined for the file to open from disk"); // note: null == undefined = true
		
		
		if(typeof text === "function") throw new Error("The callback should be in the third argument. Second argument is for file content");
		
		
		// Check if the file is already opened
		if(EDITOR.files.hasOwnProperty(path)) {
			console.warn("File already opened: " + path);
			
			/*
				What to do!?
				
				a) Reload file from disk ... ? If it's not saved, ask
				b) Add a incrementor to the name
				c) Switch to it
				
				If text is undefined, switch to the file already opened, else add a number incrementor to the path.
			*/
			
			if(text == undefined) {
				
				var file = EDITOR.files[path];
				
				if(!EDITOR.currentFile) return fileOpenError(new Error("Internal error: No current file!")); // For sanity
				
				if(EDITOR.currentFile != file) {
					// Switch to it ...
					
					if(text != undefined && text != file.text) throw new Error("File already opened. But the text argument is not the same as the text in the file! path=" + file.path);
					
					EDITOR.showFile(file);
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
				while(EDITOR.files.hasOwnProperty(path)) {
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
		
		if(!UTIL.isString(path)) return fileOpenError(new Error("path is not a string: " + path));
		
		openFileQueue.push(path); // Add the file to the queue AFTER checking if it's in the queue
		
		if(text == undefined) {
			
			if(runtime!="browser") {
				path = UTIL.makePathAbsolute(path);
			}
			console.warn("Text is undefined! Reading file from disk: " + path)
			
			// Check the file size
			EDITOR.getFileSizeOnDisk(path, function gotFileSize(err, fileSizeInBytes) {
				
				if(err) {
					fileOpenError(err);
				}
				else {
					
					console.log("fileSizeInBytes=" + fileSizeInBytes);
					
					if(fileSizeInBytes > EDITOR.settings.bigFileSize) {
						//alertBox("Opening big fies is not yet supported!");
						//fileOpenError(new Error("File too big: " + path));
						//return;
						
						console.warn("File larger then " + EDITOR.settings.bigFileSize + " bytes. It will be opened as a stream!");
						let notFromDisk = false;
						let tooBig = true;
						let text = "";
						load(null, path, text, notFromDisk, tooBig);
					}
					else {
						EDITOR.readFromDisk(path, load);
					}
				}
			});
			
		}
		else {
			
			//console.log("text is NOT undefined! But is it a string?");
			if(!UTIL.isString(text)) {
				console.log("text=" + text);
				return fileOpenError(new Error("text is not a string!"));
				
			}
			else {
				load(null, path, text, true);
			}
			
		}
		
		function load(err, path, text, notFromDisk, tooBig) {
			
			if(err) return callCallbacks(err);
			
			console.log("Loading file to editor: " + path);
			
			if(EDITOR.files.hasOwnProperty(path)) throw new Error("File is already opened:\n" + path);
			
			// Do not add file to EDITOR.files until its fully loaded! And fileOpen events can be run sync
			var newFile = new File(text, path, ++EDITOR.fileIndex, tooBig, fileLoaded);
			
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
				
				EDITOR.files[path] = newFile;
				
				file = EDITOR.files[path];
				
				if(!EDITOR.files.hasOwnProperty(path)) throw new Error("File didn't enter EDITOR.files"); // For sanity
				
				for(var p in EDITOR.files) { // Make sure we are not insane
					if(!EDITOR.files[p].path) fileOpenError(new Error("Internal error: File without path=" + p));
				}
				
				console.log("Calling fileOpen listeners (" + EDITOR.eventListeners.fileOpen.length + ") path=" + path);
				for(var i=0; i<EDITOR.eventListeners.fileOpen.length; i++) {
					//console.log("function " + UTIL.getFunctionName(EDITOR.eventListeners.fileOpen[i].fun));
					EDITOR.eventListeners.fileOpen[i].fun(file); // Call function
				}
				
				// Switch to this file
				EDITOR.showFile(file);
				EDITOR.view.endingColumn = EDITOR.view.visibleColumns; // Because file.startColumn = 0;
				
				callCallbacks(err, file);
				
				openFileQueue.splice(openFileQueue.indexOf(path), 1); // Take the file off the queue
				
				// Always render (and resize) after opening a file! (where=here, when=now!)
				EDITOR.renderNeeded();
				
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
	
	
	EDITOR.getFileSizeOnDisk = function(path, callback) {
		// Check the file size
		
		if(!callback) throw new Error("Callback not defined!");
		
		if(!CLIENT.connected) {
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
			
			var json = {path: path};
			
			CLIENT.cmd("getFileSizeOnDisk", json, function gotFileSizeFromServer(err, json) {
				if(err) callback(err);
				else callback(null, json.size);
			});
			
		}
	}
	
	EDITOR.doesFileExist = function(path, callback) {
		// An easier method then getFileSizeOnDisk to check if a file exist on disk (add support for other protocols later!?)
		// Be aware of racing conditions, it's often better to just open the file and see what happends
		
		EDITOR.getFileSizeOnDisk(path, gotSize);
		
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
	
	EDITOR.lastChangedFile = function(excludeFileList) {
		// Returns the file that was last changed
		
		var files = Object.keys(EDITOR.files);
		
		if(files.length == 0) return undefined;
		
		files.sort(function(a, b) {
			return EDITOR.files[a].lastChanged < EDITOR.files[b].lastChanged;
		});
		
		var index = 0;
		var file = EDITOR.files[files[index]];
		
		if(excludeFileList) {
			// Make sure the files in thist list doesn't get selected
			index++;
			while(file != undefined && excludeFileList.indexOf(file) != -1) {
				if(index == files.length) file = undefined
				else file = EDITOR.files[files[index]];
				index++;
			}
		}
		
		return file;
		
	}
	
	EDITOR.closeFile = function(path, doNotSwitchFile) {
		
		if(!EDITOR.files.hasOwnProperty(path)) {
			throw new Error("Can't close file that is not open: " + path);
		}
		else {
			
			console.log("Closing file: path=" + path);
			
			var file = EDITOR.files[path];
			
			// Call listeners (before we switch to another file, and before we delete the file content)
			console.log("Calling fileClose listeners (" + EDITOR.eventListeners.fileClose.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.fileClose.length; i++) {
				EDITOR.eventListeners.fileClose[i].fun(file); // Call function
			}
			
			
			// Make sure lastFile is not the file being closed
			if(EDITOR.lastFile == file) {
				console.warn("lastFile is the file being closed!");
				EDITOR.lastFile = EDITOR.lastChangedFile([file]);
				console.log("Changed lastfile to: " + EDITOR.lastFile.path);
			}
			// Make sure lastFile is not currentFile
			if(EDITOR.lastFile == EDITOR.currentFile && EDITOR.lastFile != undefined) {
				console.warn("lastFile is the currentFile:" + EDITOR.currentFile.path);
				EDITOR.lastFile = EDITOR.lastChangedFile([EDITOR.currentFile, file]);
			}
			
			// Sanity check
			if(EDITOR.lastFile) {
				if(!EDITOR.files.hasOwnProperty(EDITOR.lastFile.path)) {
					throw new Error("EDITOR.lastFile does not exist in EDITOR.files! path=" + EDITOR.lastFile.path + "\nWhen closing file.path=" + file.path);
					return;
				}
			}
			
			var switchTo; // Have to check this before removing the file reference
			if(EDITOR.currentFile == file) {
				
				EDITOR.currentFile = undefined; // Closed, kinda
				
				if(!doNotSwitchFile) { // double negative => true
					
					// The file we are closing is the current file, and we are "allowed" to swith 
					if(EDITOR.lastFile) switchTo = EDITOR.lastFile;
				}
			}
			
			delete EDITOR.files[path]; // Remove all references to the file BEFORE switching to another file
			
			
			setTimeout(function checkIfRemoved() { // Check again to make sure it has been removed
				if(EDITOR.files.hasOwnProperty(path)) throw new Error("Closed file is still in the editor! path=" + path);
			}, 100);
			
			if(switchTo) {
				EDITOR.showFile(switchTo);
				console.log("Showing '" + switchTo.path + "' because '" + path + "' was closing.");
			}
			
			// Sanity check again. Make shure we didn't switch to the file being closed
			if(EDITOR.currentFile) {
				if(EDITOR.currentFile.path == path) {
					throw new Error("The file being closed somehow ended up as EDITOR.currentFile .!? path=" + path);
				}
			}
		}
	}
	
	
	EDITOR.readFile = function(path, callback) {
		/* 
			Returns a readable stream ...
			
			We should probably use streams everywhere! So that opening small and large files use the same method.
			
		*/
	}
	
	
	EDITOR.copyFolder = function(source, destination) {
		/*
			Copies a folder and files in source location to destination.
			Source and destination can be local filesystem, FTP or SFTP (SSH)
		*/
		
		
		
	}
	
	
	
	EDITOR.readFromDisk = function readFromDisk(path, callback, returnBuffer, encoding) {
		
		console.log("Reading file: " + path);
		
		var json = {path: path, returnBuffer: returnBuffer, encoding: encoding};
		
		CLIENT.cmd("readFromDisk", json, function readFromDiskServerResponse(err, json) {
			if(err) callback(err);
			else callback(null, json.path, json.data);
		});
		
	}
	
	EDITOR.writeStream = function(file) {
		/* 
			Writes the content of a file to a destination FS/FTP/SFTP
			
			1. Creates a read stream with a start postion 
			2. Creates a write stream with a start postion
			3. Reads from readStream until the file buffer is found (content in file.text) while sending to the writeStream
			4. Reads from the file buffer (file.text) while draining the readStream, and sends to the writeStream
			5. When the end of the file buffer has been reached. The rest is read from the readStream into the writeStream
			
		*/
	}
	
	
	EDITOR.saveFile = function(file, path, callback) {
		/*
			This is the only save function.
			It can handle "save-as". 
		*/
		
		if(file == undefined) file = EDITOR.currentFile;
		
		if(!file) {
			throw new Error("No file open when save was called");
		}
		
		if(path == undefined) {
			path = file.path;
		}
		
		var text = file.text; // Save the text, do not count on the garbage collector the be "slow"
		
		if(file.path != path) {
			if(EDITOR.files.hasOwnProperty(path)) {
				var err = new Error("There is already a file open with path=" + path);
				if(callback) callback(err, path);
				else throw err;
			}
			console.warn("File will be saved under another path; old=" + file.path + " new=" + path);
			
			// We must close and reopen the file so that plugins keeping track of open files do not go nuts.
			
			EDITOR.closeFile(file.path, true); // true = do not switch to another file
			
			EDITOR.openFile(path, text, savedAs); // Reopen the file with the new path, makes sure fileSave events in file.save gets called after we have a new path.
			
		}
		else {
			EDITOR.saveToDisk(file.path, file.text, doneSaving);
		}
		
		function savedAs(err, newFile) { // intermediate function via ditor.openFile
			if(err) throw err;
			
			file = newFile;
			
			EDITOR.saveToDisk(file.path, file.text, doneSaving);
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
	
	
	EDITOR.saveToDisk = function(path, text, saveToDiskCallback, inputBuffer, encoding) {
		// You probably want to use EDITOR.saveFile instead!
		// This is used internaly by the editor, but exposed so plugins can save files that are not opened.
		
		// Only works with text files !
		
		if(!saveToDiskCallback) throw new Error("saveToDisk called without a callback function!");
		
		var json = {path: path, text: text, inputBuffer: inputBuffer, encoding: encoding};
		
		CLIENT.cmd("saveToDisk", json, function(err, json) {
			if(err) saveToDiskCallback(err);
			else saveToDiskCallback(null, json.path);
		});
		
	}
	
	EDITOR.copyFile = function(from, to, callback) {
		// Copies a file from one location to another location, can be local file-system or a remote connection
		
		CLIENT.cmd("copyFile", {from: from, to: to}, function(err, json) {
			if(err) callback(err);
			else callback(null, json.to);
		});

	}
	
	EDITOR.fileSaveDialog = function(defaultPath, callback) {
		/*
			Brings up the OS save file dialog window and calls the callback with the path.
		*/
		EDITOR.filesaveAsCallback = callback;
		
		var fileSaveAs = document.getElementById("fileSaveAs");
		
		if(defaultPath) EDITOR.setFileSavePath(defaultPath);
		
		fileSaveAs.click(); // Bring up the OS path selector window
	}
	
	EDITOR.setFileSavePath = function(defaultPath) {
		var fileSaveAs = document.getElementById("fileSaveAs");
		fileSaveAs.setAttribute("nwsaveas", defaultPath);
	}
	
	EDITOR.setFileOpenPath = function(defaultPath) {
		// path needs to be a directory
		var fileOpen = document.getElementById("fileInput");
		fileOpen.setAttribute("nwworkingdir", UTIL.trailingSlash(defaultPath));
	}
	
	EDITOR.fileOpenDialog = function(defaultPath, callback) {
		/*
			Brings up the OS file select dialog window.
			File path is then passed to the callback function.
		*/
		
		console.log("Bringing up the file open dialog ...");
		
		EDITOR.fileOpenCallback = callback;
		
		var fileOpen = document.getElementById("fileInput");
		
		//if(defaultPath == undefined) defaultPath = EDITOR.workingDirectory;
		
		if(!defaultPath) defaultPath = UTIL.getDirectoryFromPath(undefined);
		else {
			
			var lastChar = defaultPath.substr(defaultPath.length-1);
			
			//console.log("lastChar of defaultPath=" + lastChar);
			
			if(! (lastChar == "/" || lastChar == "\\")) {
				console.warn("defaultPath, bacause ending with '" + lastChar + "', doesn't seem to be a directory:" + defaultPath);
			}
			EDITOR.setFileOpenPath(defaultPath);
		}
		
		fileOpen.click(); // Bring up the OS path selector window
	}
	
	EDITOR.directoryDialog = function(defaultPath, callback) {
		
		console.log("Bringing up the directory dialog ...");
		
		directoryDialogCallback = callback;
		
		if(defaultPath) directoryDialogHtmlElement.setAttribute("nwworkingdir", defaultPath);
		
		directoryDialogHtmlElement.click(); // Bring up the OS path selector window
	}
	
	EDITOR.renderNeeded = function() {
		// Tell the editor that it needs to render
		
		if(EDITOR.settings.devMode && EDITOR.shouldRender == false) {
			// For debugging, so we know why a render was needed
			console.log(UTIL.getStack("renderNeeded"));
		}
		EDITOR.shouldRender = true;
	}
	
	EDITOR.resizeNeeded = function() {
		// Tell the editor that it needs to resize
		if(EDITOR.settings.devMode && EDITOR.shouldResize == false) {
			// For debugging, so we know why a resize was needed
			console.log(UTIL.getStack("resizeNeeded"));
		}
		EDITOR.shouldResize = true;
	}
	
	EDITOR.render = function() {
		
		if(!EDITOR.shouldRender) {
			console.warn("Not rendering because it's not needed!");
			return;
		}
		if(EDITOR.shouldResize) {
			console.warn("Resizing before rendering!");
			EDITOR.resize();
		}
		
		// Fix blurryness for screens with high pixel ratio
		var pixelRatio = window.devicePixelRatio || 1; // "Retina" displays gives 2
		if(pixelRatio !== 1) {
			ctx.restore();
			ctx.save();
			ctx.scale(pixelRatio,pixelRatio);
		}
		
		EDITOR.shouldRender = false; // Flag (change to true whenever we need to render)
		
		//console.log("rendering ... EDITOR.shouldResize=" + EDITOR.shouldResize + "");
		
		if(EDITOR.currentFile) {
			
			console.log("render file=" + EDITOR.currentFile.path);
			
			if(!EDITOR.currentFile.render) {
				console.warn("File render flag set to '" + EDITOR.currentFile.render + "'");
				
				// Just paint the background
				ctx.fillStyle = EDITOR.settings.style.bgColor;
				
				//ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				return;
			}
			
			console.time("render");
			
			var file = EDITOR.currentFile,
			buffer = [],
			grid = EDITOR.currentFile.grid;
			
			
			
			
			var funName = "";
			
			var startRow = 0; // Used for only rendering some rows for optimization. This functions renders all row, so startRow = 0
			
			// The reason why we clone the rows and not just push the pointer, is so that the coloring functions don't have to reset all the colors!
			
			// Create the buffer
			//console.time("createBuffer");
			var bufferStartRow = Math.max(0, file.startRow);
			var bufferEndRow = Math.min(grid.length, file.startRow+EDITOR.view.visibleRows);
			for(var row = bufferStartRow; row < bufferEndRow; row++) {
				buffer.push(file.cloneRow(row)); // Clone the row
			}
			//console.timeEnd("createBuffer");
			
			if(buffer.length == 0) {
				console.warn("buffer is zero! file.startRow=" + file.startRow + " grid.length=" + grid.length + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
			}
			
			// Load on the fly functionality on the buffer
			
			// Actually measuring the time is a lot of overhead! Only uncomment if you are debugging performance issues.
			//console.time("preRenders");
			for(var i=0; i<EDITOR.preRenderFunctions.length; i++) {
				//funName = UTIL.getFunctionName(EDITOR.preRenderFunctions[i]);
				//console.time("prerender: " + funName);
				buffer = EDITOR.preRenderFunctions[i](buffer, file); // Call render
				//console.timeEnd("prerender: " + funName);
			}
			//console.timeEnd("preRenders");
			
			
			// Find out if the buffer contains zero with characters ( might need optimization )
			if(buffer.length > 0) {
				var startIndex = buffer[0].startIndex;
				var endIndex = buffer[buffer.length-1].startIndex + buffer[buffer.length-1].length;
				var containZeroWidthCharacters = (UTIL.indexOfZeroWidthCharacter(file.text.substring(startIndex, endIndex)) != -1);
				
			}
			else var containZeroWidthCharacters = false;
			
			//ctx.imageSmoothingEnabled = true;
			
			//ctx.translate(0,0);
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			
			//ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			//console.time("renders");
			for(var i=0; i<EDITOR.renderFunctions.length; i++) {
				//funName = UTIL.getFunctionName(EDITOR.renderFunctions[i]);
				//console.time("render: " + funName);
				EDITOR.renderFunctions[i](ctx, buffer, EDITOR.currentFile, startRow, containZeroWidthCharacters); // Call render
				//console.timeEnd("render: " + funName);
			}
			//console.timeEnd("renders");
			
			
			EDITOR.renderCaret(file.caret);
			
			
			console.timeEnd("render");
			
		}
		else {
			// Show some useful info for new users
			
			var keyCombo = EDITOR.getKeyFor("openFile");
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			ctx.fillStyle = EDITOR.settings.style.textColor;
			
			ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			ctx.textBaseline = "top";
			
			var friendlyString = keyCombo +" to open a file";
			// Place the string in the center
			var textMeasure = ctx.measureText(friendlyString);
			var left = EDITOR.view.canvasWidth / 2 - textMeasure.width / 2;
			var top =  EDITOR.view.canvasHeight / 2 - 20;
			
			ctx.beginPath(); // Reset all the paths!
			
			ctx.fillText(friendlyString, left, top);
			
			console.log("No file open");
		}
		
		//console.log("rendering finish");
	}
	
	EDITOR.renderRow = function(gridRow) {
		
		console.log("rendering ROW ... EDITOR.shouldResize=" + EDITOR.shouldResize + "");
		
		if(EDITOR.currentFile) {
			
			var file = EDITOR.currentFile;
			
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
			
			for(var i=0; i<EDITOR.preRenderFunctions.length; i++) {
				buffer = EDITOR.preRenderFunctions[i](buffer, file);
			}
			
			//console.log(JSON.stringify(buffer, null, 4));
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			
			var top = EDITOR.settings.topMargin + screenRow * EDITOR.settings.gridHeight;
			
			// Clear only that row
			ctx.fillRect(0, top, canvas.width, EDITOR.settings.gridHeight);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			for(var i=0; i<EDITOR.renderFunctions.length; i++) {
				EDITOR.renderFunctions[i](ctx, buffer, file, screenRow); // Call render
			}
			
			console.timeEnd("renderRow");
			
		}
		else {
			console.log("No file open");
		}
		
	}
	
	
	EDITOR.renderColumn = function(row, col, character, textColor) {
		// For optimization: Prints a character on the screen.
		
		if(textColor == undefined) textColor = EDITOR.settings.style.textColor;
		
		var file = EDITOR.currentFile;
		
		var top = EDITOR.settings.topMargin + (row - file.startRow) * EDITOR.settings.gridHeight;
		var left = EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth;
		
		ctx.fillStyle = textColor;
		
		//ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillText(character, left, top);
		
	}
	
	EDITOR.clearColumn = function(row, col) {
		// For optimization: Clears a box (screen area) instead of doing a full re-render
		
		var file = EDITOR.currentFile;
		
		var top = Math.floor(EDITOR.settings.topMargin + (row - file.startRow) * EDITOR.settings.gridHeight);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth); // -0.5 to clear sub pixels (caret)
		
		if(row == file.caret.row) {
			ctx.fillStyle = EDITOR.settings.style.currentLineColor;
		}
		else {
			ctx.fillStyle = EDITOR.settings.style.bgColor;
		}
		
		//ctx.fillStyle = "rgba(255,0,0, 0.5)";
		ctx.fillRect(left, top, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
		
	}
	
	EDITOR.renderCaret = function(caret, colPlus) {
		
		if(colPlus == undefined) colPlus = 0;
		
		var row = caret.row;
		var col = caret.col + colPlus;
		
		var file = EDITOR.currentFile;
		
		if(!file.grid[row]) throw new Error("row=" + row + " does not exist in file grid! file.grid.length=" + file.grid.length);
		
		// Math.floor to prevent sub pixels
		var top = Math.floor(EDITOR.settings.topMargin + (row - file.startRow) * EDITOR.settings.gridHeight);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth);
		
		ctx.fillStyle = EDITOR.settings.caret.color;
		
		ctx.fillRect(left, top, EDITOR.settings.caret.width, EDITOR.settings.gridHeight);
		
		// Show the "direction" of the caret
		ctx.fillRect(left, top+EDITOR.settings.gridHeight - EDITOR.settings.caret.width, 4, EDITOR.settings.caret.width);
		
	}
	
	
	EDITOR.resize = function(e) {
		/*
			
			Why does the resize clear the canvas's !???
			
		*/
		
		if(!EDITOR.shouldResize) return; // Don't resize if it's not needed.
		EDITOR.shouldResize = false; // Prevent this function from running again
		
		//if(EDITOR.lastKeyPressed=="a") throw new Error("why resize now?");
		
		console.log("Resizing ... e=" + e + " EDITOR.shouldRender=" + EDITOR.shouldRender + "");
		
		console.time("resize");
		
		var pixelRatio = window.devicePixelRatio || 1; // "Retina" displays gives 2
		
		
		// Resize listeners (before)
		console.log("Calling beforeResize listeners (" + EDITOR.eventListeners.beforeResize.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.beforeResize.length; i++) {
			EDITOR.eventListeners.beforeResize[i].fun(EDITOR.currentFile);
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
		var file = EDITOR.currentFile;
		
		
		
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
		
		EDITOR.height = windowHeight;
		EDITOR.with = windowWidth;
		
		
		//UTIL.objInfo(centerColumn);
		
		
		//EDITOR.view.canvasWidth = windowWidth - leftRightColumnWidth;
		EDITOR.view.canvasWidth = contentWidth;
		EDITOR.view.canvasHeight = contentHeight;
		/*
			EDITOR.view.canvasWidth = (windowWidth - leftRightColumnWidth);
			EDITOR.view.canvasHeight = (windowHeight - headerFooterHeight);
			
			
			content.style.width = EDITOR.view.canvasWidth + "px";
			content.style.height = EDITOR.view.canvasHeight + "px";
		*/
		
		console.log("canvasWidth=" + EDITOR.view.canvasWidth);
		console.log("canvasHeight=" + EDITOR.view.canvasHeight);
		
		
		leftColumn.style.height = EDITOR.view.canvasHeight + "px";
		rightColumn.style.height = EDITOR.view.canvasHeight + "px";
		
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
		EDITOR.view.visibleColumns = Math.ceil((EDITOR.view.canvasWidth - EDITOR.settings.leftMargin - EDITOR.settings.rightMargin) / EDITOR.settings.gridWidth);
		
		//console.log("(resize1) EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
		//console.log("(resize1) EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);
		
		// ceil (overflow)
		EDITOR.view.visibleRows = Math.ceil((EDITOR.view.canvasHeight - EDITOR.settings.topMargin - EDITOR.settings.bottomMargin) / EDITOR.settings.gridHeight);
		
		//console.log("visibleRows=" + EDITOR.view.visibleRows);
		//console.log("topMargin=" + EDITOR.settings.topMargin);
		//console.log("bottomMargin=" + EDITOR.settings.bottomMargin);
		
		
		canvas.style.width = EDITOR.view.canvasWidth + "px";
		canvas.style.height = EDITOR.view.canvasHeight + "px";
		
		canvas.width  = EDITOR.view.canvasWidth * pixelRatio;
		canvas.height = EDITOR.view.canvasHeight * pixelRatio;
		
		if(EDITOR.currentFile) {
			// Fix horizontal column after resizing
			if(EDITOR.view.endingColumn < EDITOR.view.visibleColumns) {
				EDITOR.currentFile.startColumn = 0;
				EDITOR.view.endingColumn = EDITOR.view.visibleColumns;
			}
			else {
				EDITOR.view.endingColumn = EDITOR.currentFile.startColumn + EDITOR.view.visibleColumns;
			}
			
		}
		else {
			console.warn("No current file! EDITOR.currentFile=" + EDITOR.currentFile);
			EDITOR.view.endingColumn = EDITOR.view.visibleColumns;
			
		}
		
		//console.log("(resize2) EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
		//console.log("(resize2) EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);
		
		// Resize listeners (after)
		console.log("Calling afterResize listeners (" + EDITOR.eventListeners.afterResize.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.afterResize.length; i++) {
			EDITOR.eventListeners.afterResize[i].fun(EDITOR.currentFile);
		}
		
		// Show the canvas nodes again
		//setTimeout(showCanvasNodes, 1000);
		
		//showCanvasNodes();
		
		// Show the file canvas again and set focus
		
		console.timeEnd("resize");
		
		EDITOR.renderNeeded();
		EDITOR.render(); // Always render (right away to brevent black background blink) after a resize
		
		//EDITOR.renderNeeded(); // Always render after a resize (but nor right away!?
		
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
			EDITOR.renderNeeded();
		}
		
	}
	
	EDITOR.on = function(eventName, callback, order) {
		/*
			lowest order nr will execute first!
		*/
		
		if(typeof callback !== "function") throw new Error("The second argument needs to be a function! Did you mean EDITOR.addEvent ?");
		
		return EDITOR.addEvent(eventName, {fun: callback, order: order});
	}
	
	EDITOR.addEvent = function(eventName, options) {
		
		if(!(eventName in EDITOR.eventListeners)) {
			throw "eventName=" + eventName + " does not exist in EDITOR.eventListeners!";
		}
		
		if(arguments.length > 2) {
			console.warn("Pass additional arguments in the options (second argument)! Or use EDITOR.on instead!");
		}
		
		if(!options.hasOwnProperty("fun")) {
			console.warn(new Error("The second argument should be an object containing the property fun. You might want to use EDITOR.on instead.").stack);
			
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
		var funName = UTIL.getFunctionName(options.fun);
		if(funName == "") throw new Error("Please give the event listener function a name! (You can also name lamda function: ex: foo(function lamda() {})")
		for(var i=0; i<EDITOR.eventListeners[eventName].length; i++) {
			if(EDITOR.eventListeners[eventName][i].fun != undefined) {
				if(funName == UTIL.getFunctionName(EDITOR.eventListeners[eventName][i].fun)) {
					throw new Error("There is already a function named " + funName + " for the " + eventName + " event. Please give your function another name!");
				}
			}
			else {
				console.warn("Undefined callback in event listener:" + JSON.stringify(EDITOR.eventListeners[eventName][i]));
			}
		}
		
		var index = EDITOR.eventListeners[eventName].push(options);
		
		// Sort the events so they fire in order (lowest order nr will execute first)
		EDITOR.eventListeners[eventName].sort(function(a, b) {
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
	
	EDITOR.removeEvent = function(eventName, fun) {
		/*
			Note to myself: Some events have objects and others just have the function!!
			
		*/
		
		if(!EDITOR.eventListeners.hasOwnProperty(eventName)) throw new Error("Unknown editor event: " + eventName);
		
		var fname = UTIL.getFunctionName(fun);
		var events = EDITOR.eventListeners[eventName];
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
	
	
	EDITOR.addMenuItem = function(htmlText, callback, position) {
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
		
		// Don't forget to call EDITOR.hideMenu() after the item has been clicked!
		
		return menuElement;
	}
	
	EDITOR.removeMenuItem = function(menuElement) {
		
		if(!menuElement) throw new Error("EDITOR.removeMenuItem was called without argument menuElement=" + menuElement);
		if(!menuElement.tagName) throw new Error("EDITOR.removeMenuItem argument menuElement is not a HTML node!");
		
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
	
	EDITOR.addTempMenuItem = function(htmlText, callback) {
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
	
	
	EDITOR.hideMenu = function() {
		// Hide the menu
		var menu = document.getElementById("canvasContextmenu");
		
		menu.style.visibility = "hidden"; // Always hide the menu on mouse down
		
		// Clear temorary menu items
		var tempItems = document.getElementById("canvasContextmenuTemp");
		while(tempItems.firstChild){
			tempItems.removeChild(tempItems.firstChild);
		}
		
		if(EDITOR.currentFile) EDITOR.input = true; // Give focus back for text entry
		
	}
	
	EDITOR.showMenu = function(posX, posY) {
		var menu = document.getElementById("canvasContextmenu");
		var notUpOnMenu = 6; // displace the menu so that the mouse-up event doesn't fire on it
		var menuDownABit = 10;
		
		if(posX === EDITOR.mouseX || posX === undefined) posX = EDITOR.mouseX + notUpOnMenu;
		
		if(posY === undefined) posY = EDITOR.mouseY + menuDownABit;
		
		// Make sure it fits on the screen!!
		/*
			setTimeout(function() { // Wait for div content to load
			
			}, 100); 
		*/
		var offsetHeight = parseInt(menu.offsetHeight);
		var offsetWidth = parseInt(menu.offsetWidth);
		
		if((posY+offsetHeight) > EDITOR.height) posY = EDITOR.height - offsetHeight;
		if((posX+offsetWidth) > EDITOR.with) posX = EDITOR.with - offsetWidth;
		
		if(posX <= EDITOR.mouseX) {
			// Place the menu on the left side
			posX = EDITOR.mouseX - offsetWidth - notUpOnMenu;
		}
		
		menu.style.visibility = "visible";
		menu.style.top = posY + "px";
		menu.style.left = posX + "px";
	}
	
	EDITOR.addInfo = function(row, col, txt) {
		// Will display a talk bubble (plugin/render_info.js)
		var info = EDITOR.info;
		
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
			EDITOR.onNextInteraction(function() {
				EDITOR.removeAllInfo(row, col);
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
			
			EDITOR.renderNeeded();
			EDITOR.render();
			
		}
		
		
		
		function makeImage(item) {
			
			//console.log("item=" + item);
			
			htmlToImage(item, function(img) {
				imgArray.push(img);
				
				//console.log("imagesToMake=" + imagesToMake);
				//console.log("imagesMade=" + imagesMade);
				
				//EDITOR.currentFile.canvas.getContext("2d").drawImage(imgArray[0], 0, 0);		
				
				
				if(++imagesMade == imagesToMake) {
					allImagesMade();
				}
			});
			
			
		}
		
	}
	
	EDITOR.removeAllInfo = function(row, col, txt) {
		// Find the item in the array, then splice it ...
		var info = EDITOR.info;
		
		for(var i=0; i<info.length; i++) {
			if(info[i].row == row && info[i].col == col) {
				
				// Remove info
				info.splice(i,1);
				
				// Call removeAllInfo again, just to make sure ALL is removed
				EDITOR.removeAllInfo(row, col);
				return; // Splice can be buggy if many rows are removed in a for-loop
				
			}
		}
	}
	
	EDITOR.onNextInteraction = function(func) {
		executeOnNextInteraction.push(func);
	}
	
	EDITOR.interact = function(interaction, options) {
		// This function will be called on every interaction
		
		nextInteractionFunctions();
		
		if(EDITOR.eventListeners.interaction.length > 0) {
			console.log("Calling interaction listeners (" + EDITOR.eventListeners.interaction.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.interaction.length; i++) {
				EDITOR.eventListeners.interaction[i].fun(EDITOR.currentFile); // Call function
			}
		}
		
		resizeAndRender();
		
		function nextInteractionFunctions() {
			for(var i=0, ret; i<executeOnNextInteraction.length; i++) {
				ret = executeOnNextInteraction[i](interaction);
				if(ret !== false) { // Keep running this function at every interaction until it doesn't return false
					executeOnNextInteraction.splice(i, 1);
					nextInteractionFunctions(); // Run again because of splice messing with the indexes
				}
			}
		}
		
	}
	
	EDITOR.fireEvent = function(eventName) {
		
		//throw new Error("todo: shift/splice arguments before sending them to listener");
		
		var eventListeners;
		var func;
		
		if(eventName in EDITOR.eventListeners) {
			
			eventListeners = EDITOR.eventListeners[eventName];
			
			console.log("Calling " + eventName + " listeners (" + EDITOR.eventListeners[eventName].length + ") ...");
			for(var i=0; i<eventListeners.length; i++) {
				func = eventListeners[i].fun;
				
				if(func == undefined) throw new Error("Undefined function in " + eventName + " listener!");
				
				//fun.apply(this, Array.prototype.shift.call(arguments)); // Remove eventName from arguments
				
				func.apply(this, Array.prototype.slice.call(arguments, 1));
				
			}
			
			// EDITOR.eventListeners[eventName] // ?????
		}
		else {
			throw new Error("Uknown event listener:" + eventName);
		}
		
	}
	
	EDITOR.addRender = function(fun) {
		return EDITOR.renderFunctions.push(fun) - 1;
	}
	EDITOR.removeRender = function(fun) {
		return removeFrom(EDITOR.renderFunctions, fun)
	}
	
	EDITOR.addPreRender = function(renderFunction) {
		return EDITOR.preRenderFunctions.push(fun) - 1;
	}
	EDITOR.removePreRender = function(renderFunction) {
		return removeFrom(EDITOR.preRenderFunctions, fun);
	}
	
	EDITOR.mousePositionToCaret = function (mouseX, mouseY) {
		/*
			Returns a caret on the file.grid
			
			We need to know row indentation to know what column!
			
			We also need to take into account how much is scrolled
			
			FILE CARET IS BOUND TO THE GRID!
			caret.index is always the index in file.text (it doesn't correspond to the position in a big file)
			
		*/
		if(EDITOR.currentFile) {
			
			var file = EDITOR.currentFile,
			grid = file.grid,
			clickFeel = EDITOR.settings.gridWidth / 2;
			
			var mouseRow = Math.floor((mouseY - EDITOR.settings.topMargin) / EDITOR.settings.gridHeight) + file.startRow;
			
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
				
				var mouseCol = Math.floor((mouseX - EDITOR.settings.leftMargin - (gridRow.indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth + clickFeel) / EDITOR.settings.gridWidth);
				
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
	
	EDITOR.autoComplete = function(file, combo, character, charCode, keyPushDirection) {
		/*
			An abstraction that lets you have many auto-complete functions. 
			Register using: EDITOR.on("autoComplete", function)
			
			The function should return an array with possible auto-complete options,
			or optionally, an array of arrays where the second index is how many characters
			the mouse should be moved left, after inserting the text.
			
			Ex: [word1, word2, word3] or [[wordl, n], [word2, n]]
			
		*/
		
		if(!file) file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!EDITOR.input) return true;
		
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
		
		console.log("Calling autoComplete listeners (" + EDITOR.eventListeners.autoComplete.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.autoComplete.length; i++) {
			
			fun = EDITOR.eventListeners.autoComplete[i].fun;
			ret = fun(file, word, wordLength, options.length);
			
			console.log("function " + UTIL.getFunctionName(fun) + " returned: " + JSON.stringify(ret));
			
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
						
						if(word.length > 0 && addWord.indexOf(word) != 0) throw new Error("Function " + UTIL.getFunctionName(fun) + " returned '" + addWord + "' witch does not have word=" + word + " in it!") 
						
						if(options.indexOf(addWord) == -1) {
							options.push(addWord);
							mcl.push(addMcl);
						}
					}
				}
				else {
					throw new Error(UTIL.getFunctionName(fun) + " did not return an array");
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
				EDITOR.addInfo(file.caret.row, file.caret.col, options[i].replace(new RegExp(file.lineBreak,"g"), " "));
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
					
					ex: User writes EDITOR.curr| but there is not EDITOR.curr.. BUT there's a currentFile
					
					
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
				EDITOR.renderNeeded();
			*/
			
			//console.log("wordLength=" + wordLength);
			//console.log("word.length=" + word.length);
			//console.log("insert=" + insert);
			
			file.insertText(insert);
			
			//console.log("moveCaret="+ moveCaret);
			
			if(moveCaret) file.moveCaretLeft(file.caret, moveCaret);
			
			// If not linebreak was inserted, render only row!? (check file.insertText and file.moveCaretLeft)
			
			EDITOR.renderNeeded();
			
		}
		
	}
	
	EDITOR.exit = function() {
		/* Close the editor
			
			Or just hide it?
			And listen to an event that will bring it back!?
			
		*/
		window.close();
		
	}
	
	EDITOR.showFile = function(file, focus) {
		
		console.log("Showing " + file.path + " (EDITOR.focus=" + EDITOR.input + " focus=" + focus + "");
		
		if(file == EDITOR.currentFile) {
			console.warn("File already in view: " + file.path);
			return false;
		}
		
		if(!EDITOR.files.hasOwnProperty(file.path)) throw new Error("Showing a file that is not open! file.path=" + file.path);
		
		if(EDITOR.currentFile) {
			// Hide current file
			
			console.log("Calling fileHide listeners (" + EDITOR.eventListeners.fileHide.length + ") EDITOR.currentFile.path=" + EDITOR.currentFile.path);
			for(var i=0; i<EDITOR.eventListeners.fileHide.length; i++) {
				EDITOR.eventListeners.fileHide[i].fun(EDITOR.currentFile); // Call function
			}
			
			if(EDITOR.currentFile) EDITOR.lastFile = EDITOR.currentFile
			else EDITOR.lastFile = EDITOR.lastChangedFile([file]);
			
		}
		
		EDITOR.currentFile = file;
		
		if(EDITOR.currentFile == EDITOR.lastFile) {
			EDITOR.lastFile = EDITOR.lastChangedFile([EDITOR.currentFile]);
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
			EDITOR.setFileSavePath(file.path);
			EDITOR.setFileOpenPath(UTIL.getDirectoryFromPath(file.path));
		}
		
		EDITOR.input = focus;
		
		
		console.log("Calling fileShow listeners (" + EDITOR.eventListeners.fileShow.length + ") file.path=" + file.path);
		for(var i=0; i<EDITOR.eventListeners.fileShow.length; i++) {
			EDITOR.eventListeners.fileShow[i].fun(file); // Call function
		}
		
		EDITOR.resizeNeeded(); // Update the view
		EDITOR.renderNeeded();
		
		EDITOR.interact("showFile", window.event);
	}
	
	EDITOR.getKeyFor = function(funName) {
		// Returns a string representing the key combination for the keyBidning "fun" name.
		
		if(typeof funName == "function") funName = UTIL.getFunctionName(funName); // Convert to string
		
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
		
		
		var f, character, combo = "";
		for(var i=0; i<keyBindings.length; i++) {
			f = keyBindings[i]
			if(UTIL.getFunctionName(f.fun) == funName) {
				
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
	
	EDITOR.keyBindings = function() {
		// Returns a list of key bindings
		return keyBindings;
		
	}
	
	EDITOR.bindKey = function(b) {
		
		if(isNaN(b.charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		if((typeof b.fun !== "function")) throw new Error("Object argument needs to have a 'fun' method!");
		
		if(!b.desc) UTIL.getStack("Key binding should have a description!");
		
		// Make sure the function name is unique. It needs to be unique to be able to unbind it. Unique names also makes it easier to debug
		var funName = UTIL.getFunctionName(b.fun);
		if(funName == "") throw new Error("Key binding function can not be anonymous!")
		for(var i=0; i<keyBindings.length; i++) {
			if(UTIL.getFunctionName(keyBindings[i].fun) == funName) {
				throw new Error("The function name=" + funName + " is already used by another key binder. Please use an uniqe function name!")
			}
		}
		
		keyBindings.push(b);
		
	}
	
	EDITOR.rebindKey = function(funName, charCode, combo) {
		
		if(isNaN(charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		
		var f, rebound = false;
		for(var i=0; i<keyBindings.length; i++) {
			f = keyBindings[i]
			if(UTIL.getFunctionName(f.fun) == funName) {
				
				if(rebound) console.warn("Double rebound of " + funName);
				
				f.charCode = charCode;
				f.combo = combo;
				rebound = true;
				console.log("Rebound " + funName + " to " + EDITOR.getKeyFor(funName) );
			}
		}
	}
	
	EDITOR.unbindKey = function(funName) {
		
		if(typeof funName === "function") {
			// Convert it to string
			funName = UTIL.getFunctionName(funName);
		}
		
		var f;
		for(var i=0; i<keyBindings.length; i++) {
			f = keyBindings[i]
			if(UTIL.getFunctionName(f.fun) == funName) {
				
				keyBindings.splice(i, 1);
				
				console.log("unbindKey " + funName);
				return true;
				//return EDITOR.unbindKey(funName);
			}
		}
		
		console.warn("Failed to unbindKey funName=" + funName);
		
		return false;
	}
	
	EDITOR.plugin = function(p) {
		/*
			If you have made a plugin. Use EDITOR.plugin(desc, load, unload) instead of EDITOR.on("start") !
			Plugins will load when the editor has started. Right after "eventListeners.start"
		*/
		
		if((typeof p.load !== "function")) throw new Error("The plugin needs to have a load method!");
		
		if((typeof p.unload !== "function")) throw new Error("The plugin should have a unload method!");
		if(!p.desc) throw new Error("The plugin should have a description!");
		
		p.loaded = false;
		
		if(windowLoaded) { // && EDITOR.settings.devMode
			//alertBox("Gonna reload unload and load " + UTIL.getFunctionName(p.load));
			EDITOR.disablePlugin(p.desc); // Unload plugin before loading it 
			p.load(); // Load the plugin right away if the editor has already started. 
		}
		
		for(var i=0; i<EDITOR.plugins.length; i++) {
			if(EDITOR.plugins[i].desc == p.desc) throw new Error("A plugin with the same description is already loaded: " + p.desc);
		}
		
		EDITOR.plugins.push(p);
		
	}
	
	EDITOR.disablePlugin = function(desc) {
		
		var f;
		for(var i=0; i<EDITOR.plugins.length; i++) {
			f = EDITOR.plugins[i];
			if(f.desc == desc) {
				
				if(f.loaded && !f.unload) throw new Error("The plugin has already been loaded, and it does not have an unload method! So you have to disable this plugin before it's loaded!");
				
				if(f.unload) f.unload();
				
				EDITOR.plugins.splice(i, 1);
				
				console.log("Plugin disabled: " + desc);
				
				return true;
			}
		}
		
		return false;
	}
	
	EDITOR.addTest = function(fun, order) {
		
		var funName = UTIL.getFunctionName(fun);
		
		if(funName.length == 0) throw new Error("Test function can not be anonymous!");
		
		if(order == undefined) order = 0;
		
		for(var i=0; i<EDITOR.tests.length; i++) {
			if(EDITOR.tests[i].text == funName) {
				if(windowLoaded) {
					console.log("Overloading test function name=" + funName + " !");
					EDITOR.tests.splice(i, 1);
					break;
				}
				else throw new Error("Test function name=" + funName + " already exist!");
			}
			if(order > 0 && EDITOR.tests[i].order > order) throw new Error("Remove order from test '" + EDITOR.tests[i].text + "' if you want " + funName + " to run first!");
		}
		
		EDITOR.tests.push({fun: fun, text: funName, order: order});
		
		// Sort the tests by order
		EDITOR.tests.sort(function sortTests(a, b) {
			return b.order - a.order;
		});
		
	}
	
	EDITOR.connect = function(callback, protocol, serverAddress, user, passw, keyPath, workingDir) {
		
		if(protocol == undefined) throw new Error("No protocol defined!");
		
		var json = {protocol: protocol, serverAddress: serverAddress, user: user, passw: passw, keyPath: keyPath, workingDir: workingDir};
		
		CLIENT.cmd("connect", json, function(err, json) {
			if(err) callback(err);
			else {
				
				setWorkingDirectory(json.workingDirectory);
				
				EDITOR.connections[serverAddress] = {protocol: protocol};
				callback(null, json.workingDirectory);
				
			}
		});
		
	}
	
	EDITOR.disconnect = function(protocol, serverAddress, callback) {
		
		if(protocol == undefined) throw new Error("Expected protocol! protocol=" + protocol);
		if(serverAddress == undefined) throw new Error("Expected serverAddress! serverAddress=" + serverAddress);
		
		var json = {protocol: protocol, serverAddress: serverAddress};
		
		CLIENT.cmd("disconnect", json, function(err, json) {
			if(err) {
				if(callback) callback(err);
				else throw err;
			}
			else {
				
				setWorkingDirectory(json.workingDirectory);
				
				delete EDITOR.connections[serverAddress];
				if(callback) callback(null);
			}
		});
		
	}
	
	EDITOR.folderExistIn = function(pathToParentFolder, folderName, folderExistInCallback) {
		console.log("folderExistIn pathToParentFolder=" + pathToParentFolder);
		
		EDITOR.listFiles(pathToParentFolder, function(err, list) {
			
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
	
	EDITOR.listFiles = function(pathToFolder, listFilesCallback) {
		// Returns all files in a directory
		
		pathToFolder = UTIL.trailingSlash(pathToFolder);
		
		if(pathToFolder == undefined) throw new Error("Need to specity a pathToFolder!");
		if(listFilesCallback == undefined) throw new Error("Need to specity a callback!");
		
		var json = {pathToFolder: pathToFolder};
		
		CLIENT.cmd("listFiles", json, function(err, json) {
			if(err) listFilesCallback(err);
			else listFilesCallback(null, json.list);
		});
		
	}
	
	
	EDITOR.createPath = function(pathToCreate, createPathCallback) {
		/*
			Traverse the path and try to creates the directories, then check if the full path exists
			
		*/
		
		var json = {pathToCreate: pathToCreate};
		CLIENT.cmd("createPath", json, function(err, json) {
			if(err) createPathCallback(err);
			else createPathCallback(null, json.path);
		});
		
	}
	
	EDITOR.mock = function(mock, options) {
		
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
	
	EDITOR.isBlanc = function (x, y, width, height) {
		// todo: for debugging. Returns true if the screen area is the same as the background
	}
	
	EDITOR.createWidget = function(buildFunction, parentNode, id) {
		
		// Some boilderplate/abstraction for creating HTML form widget, 
		
		var widget = {mainElement: null};
		
		// When this function is created, DOM does not exist!
		
		widget.build = function buildWidget() {
			
			// But when this function is called, the DOM will exist!
			
			var build;
			
			if(buildFunction == undefined) build = document.createElement("div");
			else build = buildFunction(widget); // Example use: return widget.create(...);
			
			if(! (build instanceof HTMLElement)) throw new Error("Widget build function must return a HTML element!");
			
			if(build.parentNode) throw new Error("Widget build function should not append itself to another element!");
			
			widget.mainElement = build;
			
			if(parentNode == undefined) parentNode = document.getElementById("footer");
		
			if(!parentNode) throw new Error("parentNode=" + parentNode);
			
			parentNode.appendChild(widget.mainElement);
			
		}
		
		widget.show = function showWidget() {
			
			console.log("Showing widget ...");
			
			EDITOR.input = false; // Steal focus from the file
			
			if(!widget.mainElement) widget.build(); // Build the GUI if it's not already built
			
			widget.mainElement.style.display = "block";
			
			EDITOR.resizeNeeded();
			
			return false;
		}
		
		widget.hide = function showWidget() {
			
			console.log("Hiding widget ...");
			
			if(EDITOR.currentFile) EDITOR.input = true; // Bring back focus to the current file
			
			// Only need to hide if the object is created!
			if(widget.mainElement) {
				widget.mainElement.style.display = "none";
				EDITOR.resizeNeeded();
			}
			
			return false;
		}
		
		widget.unload = function unloadWidget() {
			
			if(widget.mainElement) {
				widget.hide();
				parentNode.removeChild(widget.mainElement);
			}
			
			return widget.mainElement;
	}
		
		widget.create = function(grid) {
			// Add input elements in a grid, witch is a multi dimentional array or rows and columns
			
			// each item can have {type=(input,button), class=(half), label=(text on button or input label)
			
			var mainElement = document.createElement("div");
			
			var table = document.createElement("table");
			
			var tr, td, item, element;
			for(var row=0; row<grid.length; row++) {
				tr = document.createElement("tr");
				for(var col=0; col<grid[row].length; col++) {
					
					element = makeItem(grid[row][col]);
					
					if(Array.isArray(element)) {
						// Element contain many things, for example a label and a input field
						for(var el=0; el<element.length; el++) {
							td = document.createElement("td");
							
							if(element[el].nodeName == "LABEL") td.setAttribute("align", "right");
							
								td.appendChild(element[el]);
								tr.appendChild(td);
							}
					}
					else {
						td = document.createElement("td");
						td.appendChild(element);
						tr.appendChild(td);
						}
					}
				table.appendChild(tr);
			}
			
			return mainElement;
			
			function makeItem(item) {
				var element;
				
				if(item.type == undefined) item.type = "input";
				
				if(item.type == "input" || item.type == "text") {
					if(item.label == undefined) throw new Error("text input's must have a label!");
					element = [];
					
					var id = "widgetIdXYZ-0" + (++widgetElementIdCounter); // Must be unique
					
					var label = document.createElement("input");
					label.setAttribute("for", id); // Must be the id for click auto focus to work
					label.appendChild(document.createTextNode(item.label));
					element.push(label);
					
					var classy = item.class ? item.class + " inputtext" : "inputtext";
					
					var input = document.createElement("input");
					input.setAttribute("type", "text");
					input.setAttribute("id", id);
					input.setAttribute("class", classy);
					if(item.title) input.setAttribute("title", item.title);
					if(item.size) input.setAttribute("size", item.size);
					if(item.value) input.setAttribute("value", item.value);
					element.push(input);
						
					}
				else if(item.type == "button") {
					if(item.label == undefined) throw new Error("Button must have a label!");
					element = document.createElement("input");
					// Icon support ?
					
					var classy = item.class ? item.class + " button" : "button";
					
					element.setAttribute("type", "button");
					element.setAttribute("class", classy);
					element.setAttribute("value", item.label);
					if(item.title) element.setAttribute("title", item.title);
					
				}
				
				
				return element;
			}
			
			
		}
		
		
		return widget;
	}
	
	CLIENT.on("connectionClosed", function connectionClosed(protocol, serverAddress) {
		
		var connectedFiles = filesOnServer();
		
		if(connectedFiles.length > 0) {
			if(confirm("Close all opened files on " + serverAddress + " ?")) {
				
				connectedFiles.forEach(function(path) {
					EDITOR.closeFile(path);
				});
				
			}
		}
		
		delete EDITOR.connections[serverAddress]; // Remove the connection
		
		
		function filesOnServer() {
			// Returns an array of currently opened files connected to this server
			var list = [];
			for(var path in EDITOR.files) {
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
		
	});
	
	function removeFrom(list, fun) {
		// Removes an object from an array of objects
		for(var i=0; i<list.length; i++) {
			
			//console.log(UTIL.getFunctionName(fun) + " = " + UTIL.getFunctionName(list[i]) + " ? " + (list[i] == fun));
			
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
			
			//EDITOR.hide(); // Pretend to be closed already
			
			var ret = true;
			var name = "";
			
			console.log("Closing the editor ...");
			
			if(!EDITOR.storage.ready()) {
				console.warn("EDITOR.storage not ready!");
			}
			
			console.log("Calling exit listeners (" + EDITOR.eventListeners.exit.length + ")");
			for(var i=0, f; i<EDITOR.eventListeners.exit.length; i++) {
				
				f = EDITOR.eventListeners.exit[i].fun;
				name = UTIL.getFunctionName(f);
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
			
			CLIENT.disconnect();
			
		});
		
		// Use event listeners for these so that they also fire when "reloading" the editor
		EDITOR.eventListeners.exit.push({fun: function exitKioskMode() {
				var GUI = require('nw.gui').Window.get();
				GUI.leaveKioskMode();
				return true;
		}});
		
		EDITOR.eventListeners.exit.push({fun: function closeOpenConnections() {
				
				for(var serverAddress in EDITOR.connections) CLIENT.cmd("disconnect", {serverAddress: serverAddress});
				
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
		EDITOR.resizeNeeded();
		EDITOR.renderNeeded();
		
		EDITOR.interact("resize", e);
		
	}, false);
	
	
	/*
		Add your own scroll listeners using EDITOR.addEvent("scroll", yourFunction)
		Your function should return false to prevent default action.
	*/
	window.addEventListener("mousewheel",scrollWheel,false);
	window.addEventListener("DOMMouseScroll",scrollWheel,false);
	
	
	/*
		Add your own key listeners via EDITOR.bindKey()
		Your function should return false to prevent default action.
	*/
	window.addEventListener("keydown",keyIsDown,false);  // captures 
	window.addEventListener("keyup",keyIsUp,false);      // keyBindings
	window.addEventListener("keypress",keyPressed,false); // Writes to the document at caret position
	
	
	/*
		Add your own key listeners with EDITOR.on("eventName", callbackFunction);
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
		
		console.log("Starting the editor ...");
		
		CLIENT.on("mirror", function clientMirror(json) {
			
			var clientConnectionId = json.cId;
			
			if(clientConnectionId == undefined) throw new Error("Did not get clientConnectionId from mirror event!");
			if(CLIENT.connectionId == undefined) throw new Error("We do not have CLIENT.connectionId!");
			
			console.log("MIRROR: clientConnectionId=" + clientConnectionId + " CLIENT.connectionId=" + CLIENT.connectionId + " json=" + JSON.stringify(json, null, 2));
			
			if(clientConnectionId == CLIENT.connectionId) {
				console.log("Ignoring mirror event from ourself: " + json.object + "." + json.method);
				return;
			}
			
			if(json.object == "FILE") {
				if(!EDITOR.files.hasOwnProperty(json.path)) {
					throw new Error("Receved mirror event for file that is not opened! path=" + json.path);
				}
				else {
					var thisArg = EDITOR.files[json.path];
					var argsArray = json.args;
					console.log("Calling File." + json.method + "(" + argsArray.join(", ") + ")");
					EDITOR.files[json.path][json.method].apply(thisArg, argsArray);
					
				}
			}
			
			
			
		});
		
		
		EDITOR.on("moveCaret", function mirrorCaretMovement(file, caret) {
			
			if(caret == file.caret && EDITOR.collaborationMode) {
				CLIENT.cmd("mirror", {
					object: "FILE", 
					path: file.path, 
					method: "moveCaret", 
					args: [file.caret.index, file.caret.row, file.caret.col],
				});
			}
			
			return true;
			
		});
		
		
		getVersion(function(version) {
			
			console.log("Editor version: " + version);
			
			bootstrap();
			
		});
		
		canvas = document.getElementById("canvas");
		
		if(EDITOR.settings.sub_pixel_antialias == false) {
			ctx = canvas.getContext("2d");
			//console.warn("No sub_pixel_antialias! EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias);
		}
		else {
			ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias (LCD-text). 
		}
		
		EDITOR.canvasContext = ctx;
		
		EDITOR.resizeNeeded(); // We must call the resize function at least once at editor startup.
		
		
		keyBindings.push({charCode: EDITOR.settings.autoCompleteKey, fun: EDITOR.autoComplete, combo: 0});
		
		
		if(EDITOR.settings.devMode && runtime != "browser") {
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
				var filename = UTIL.getFilenameFromPath(filePath);
				var ext = UTIL.getFileExtension(filePath);
				
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
		
		window.onbeforeunload = confirmExit;
		
		
		
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
			
			console.log("Calling directory-dialog callback: " + UTIL.getFunctionName(directoryDialogCallback) + " ...");
			directoryDialogCallback(filePath);
			directoryDialogCallback = undefined;
			
			directoryDialogHtmlElement.value = null; // Reset the value so we can select the same directory again!
			
			
		}, false);
		
		
		var body = document.getElementById('body');
		body.ondrop = fileDrop;
		
		
		//console.log("main function loaded");
		
		/*		
		// Sort and load the start events
		// note: PLUGINS SHOULD NEVER DEPEND ON ANOTHER PLUGIN!
		// The order of things should not matter!
		// Some event listeners has high or low prio though ...
		// Ex: some plugins only want to parse the file if no other parser have yet parsed it
		// or some autocomplete functions only want to run if no other autocompletion has been found.
		*/
		
		EDITOR.eventListeners.start.sort(function(a, b) {
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
		
		//for(var i=0; i<EDITOR.eventListeners.start.length; i++) {
		//console.log("startlistener:" + UTIL.getFunctionName(EDITOR.eventListeners.start[i].fun) + " (order=" + EDITOR.eventListeners.start[i].order + ")");
		//}
		
		console.log("Calling start listeners (" + EDITOR.eventListeners.start.length + ")");
		for(var i=0; i<EDITOR.eventListeners.start.length; i++) {
			EDITOR.eventListeners.start[i].fun(); // Call function
		}
		
		
		
		
		// Sort and load plugins
		EDITOR.plugins.sort(function(a, b) {
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
		EDITOR.plugins.map(function (p) {console.log(p.order + ": " + p.desc)});
		
		console.log("Loading plugins (length=" + EDITOR.eventListeners.start.length + ")");
		for(var i=0; i<EDITOR.plugins.length; i++) {
			console.log("plugin: " + EDITOR.plugins[i].desc);
			// An error in any of the plugins will make all plugins after it to not load! So we have to use a try catch
			try {
				EDITOR.plugins[i].load(EDITOR); // Call function (and pass global objects!?)
			}
			catch(err) {
				console.error(err.message);
				console.log(err.stack);
				alertBox('Failed to (fully) load plugin:\n<i>"' + EDITOR.plugins[i].desc + '"</i>\nError: ' + err.message);
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
			
			var httpClient = net.createConnection({port: env.STDIN_PORT || EDITOR.settings.stdInPort}, function() {
				//alertBox("Connected to STDIN ...");
				
				if(!stdInFile) {
					if(EDITOR.files.hasOwnProperty(stdInFileName)) stdInFile = EDITOR.files[stdInFileName];
					else {
						EDITOR.openFile(stdInFileName, "", function stdinFileOpen(err, file) {
							if(err) throw err;
							stdInFile = file;
						});
					}
				}
				
			});
			
			httpClient.on("error", function stdSocketError(err) {
				console.warn(err.message);
			});
			
			httpClient.on("data", stdIn);
			httpClient.on("end", stdEnd);
			
			
			// Command arguments
			var gui = require('nw.gui');
			var commandArguments = gui.App.argv;
			console.log("Command arguments:" + commandArguments);
			//alertBox("Command arguments:" + commandArguments);
			
			if(commandArguments.indexOf("--disable-lcd-text") != -1) {
				EDITOR.settings.sub_pixel_antialias = false;
			}
			
			
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
		//if(EDITOR.settings.devMode == true) EDITOR.openFile(testfile);
		
		/*
			// Problem: There seems to be a magic reizie or the runtime need time to calculate stuff
			//setTimeout(display, 500);
			//display();
			
			
			// Prevent the void from ruling the earth the first 500ms
			EDITOR.resizeNeeded();
			EDITOR.resize();
			EDITOR.renderNeeded();
			EDITOR.render();
			
			
			function display() {
			
			EDITOR.resizeNeeded();
			EDITOR.resize(); // Will also force a render
			
			
			}
		*/
		
		windowLoaded = true;

		CLIENT.on("loginSuccess", function loggedInToServer(login) {
			
			EDITOR.user = login.user;
			
			// Use servers working directory
			CLIENT.cmd("workingDirectory", null, function(err, json) {
				if(err) throw err;
				else setWorkingDirectory(json.path);
			});
			
			// ### Populate EDITOR.storage (_serverStorage)
			CLIENT.cmd("storageGetAll", function gotStorageFromServer(err, json) {
				if(err) throw err;

				if(!json.storage) throw new Error("Expected to retrive storage data from server ... json=" + JSON.stringify(json, null, 2));
				
				if(typeof json.storage !== "object") throw new Error("typeof json.storage: " + typeof json.storage);
				
				_serverStorage = json.storage;
				
				// Many plugins depend on the storage being available ...
				// They need to be refactored to start on EDITOR.on("storageReady" ... !!

				
				for(var i=0, fun; i<EDITOR.eventListeners.storageReady.length; i++) {
					fun = EDITOR.eventListeners.storageReady[i].fun;
					fun(_serverStorage);
				}
				
			});
		});

		CLIENT.connect(undefined, function connectedToServer(err) {
			console.log("Got connect callback! err=" + err);
			if(err) {
				if(err.code != "CONNECTION_CLOSED") throw new Error(err.message);
				alertBox("Unable to connected to server!\nThe editor will have limited functionality.");
			}

		});

		CLIENT.on("connectionLost", function() {
			
			EDITOR.user = null;
			
		});
		
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
		for(var path in EDITOR.files) {
			if(EDITOR.files[path].saved) EDITOR.closeFile(path)
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
			EDITOR.openFile("testfile" + i, "This is test file nr " + i + " line 1\r\nThis is test file nr " + i + " line 2\r\nThis is test file nr " + i + " line 3\r\nThis is test file nr " + i + " line 4\r\nThis is test file nr " + i + " line 5", function fileOpened(err, file) {
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
			var testsToRun = testFirstTest ? 1 : EDITOR.tests.length;
			
			if(testsToRun == 1) {
				alertBox("Testing: " + EDITOR.tests[0].text);
			}
			
			for(var i=0; i<testsToRun; i++) {
				started++;// This counter here to prevent any sync test to finish all tests
				asyncInitTest(EDITOR.tests[i]);
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
				
				EDITOR.openFile("testresults.txt", testResults.join("\n"), function(err, file) {
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
		
		if(EDITOR.fileOpenCallback == undefined) {
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
			console.log("Calling file-dialog callback: " + UTIL.getFunctionName(EDITOR.fileOpenCallback) + " ...");
			EDITOR.fileOpenCallback(filePath, fileContent);
			EDITOR.fileOpenCallback = undefined;
			
			fileOpenHtmlElement.value = null; // Reset the value so we can open the same file again!
		}
	}
	
	
	function chooseSaveAsPath(e) {
		var file = e.target.files[0];
		
		if(EDITOR.filesaveAsCallback == undefined) {
			throw new Error("There is no listener for the save file dialog!");
		}
		
		if (!file) {
			console.warn("No file selected!");
			EDITOR.filesaveAsCallback(undefined);
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		
		EDITOR.filesaveAsCallback(filePath);
		
		EDITOR.filesaveAsCallback = undefined; // Prevent old callback from firing again
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
			
			EDITOR.openFile(filePath, content);
			
		};
		console.log(file);
		reader.readAsDataURL(file);
		
		/*
			for (var i = 0; i < e.dataTransfer.files.length; ++i) {
			console.log(e.dataTransfer.files[i].path + "\n" + e.dataTransfer.files[i].data);
			UTIL.objInfo(e.dataTransfer.files[i]);
			}
		*/
		
		EDITOR.interact("fileDrop", e);
		
		return false;
	};
	
	
	
	
	
	function copy(e) {
		
		if(EDITOR.input) {
			var textToPutOnClipboard = "";
			
			if(EDITOR.currentFile) {
				textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
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
		
		EDITOR.interact("copy", e);
		
		return textToPutOnClipboard;
		
	}
	
	function cut(e) {
		
		if(EDITOR.input) {
			
			var textToPutOnClipboard = "";
			
			if(EDITOR.currentFile) {
				textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
				
				// Delete the selected text
				EDITOR.currentFile.deleteSelection();
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
		
		EDITOR.interact("cut", e);
	}
	
	
	function paste(e) {
		var text = e.clipboardData.getData('text'),
		ret,
		textChanged = false;
		
		console.log("PASTE: " + UTIL.lbChars(text));
		
		if(EDITOR.input && EDITOR.currentFile) {
			
			e.preventDefault();
			
			console.log("Calling paste listeners (" + EDITOR.eventListeners.paste.length + ") ...");
			for(var i=0, fun; i<EDITOR.eventListeners.paste.length; i++) {
				
				fun = EDITOR.eventListeners.paste[i].fun;
				
				ret = fun(EDITOR.currentFile, e.clipboardData);
				
				if(EDITOR.settings.devMode) console.log("Paste listener: " + UTIL.getFunctionName(fun) + " returned:\n" + ret);
				
				if(typeof ret == "string") {
					if(textChanged) {
						throw new Error("Another listener has already changed the pasted text!");
					}
					text = ret;
					textChanged = true;
				}
			}
			
			// Insert text at caret position
			if(EDITOR.currentFile) {
				var file = EDITOR.currentFile;
				
				// If there is a text selection. Delete the selection first!
				file.deleteSelection();
				
				file.insertText(text);
			}
		}
		
		// else: Do the default action (enable pasting outside the canvas)
		
		EDITOR.interact("paste", e);
		
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
		var file = EDITOR.currentFile;
		var preventDefault = false;
		var funReturn = true;
		
		console.log("keyPressed: " + charCode + " = " + character + " (charCode=" + e.charCode + ", keyCode=" + e.keyCode + ", which=" + e.which + ") combo=" + JSON.stringify(combo) + " EDITOR.input=" + (EDITOR.currentFile ? EDITOR.input : "NoFileOpen EDITOR.input=" + EDITOR.input + "") + "");
		
		
		console.log("Calling keyPressed listeners (" + EDITOR.eventListeners.keyPressed.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.keyPressed.length; i++) {
			funReturn = EDITOR.eventListeners.keyPressed[i].fun(file, character, combo); // Call function
			
			if(funReturn !== true && funReturn !== false) throw new Error("keyPressed event listener: " + UTIL.getFunctionName(EDITOR.eventListeners.keyPressed[i].fun) + " did not return true or false!");
			
			if(funReturn === false && !preventDefault) {
				preventDefault = true;
				if(file && EDITOR.input) console.log(UTIL.getFunctionName(EDITOR.eventListeners.keyPressed[i].fun) + " prevented insertion of character=" + character + " into file.path=" + file.path);
			}
		}
		
		
		/*
			if(character == benchmarkCharacter) {
			
			//process.nextTick(function() {
			// Test optimization
			var top = EDITOR.settings.topMargin + (EDITOR.currentFile.caret.row - EDITOR.currentFile.startRow) * EDITOR.settings.gridHeight;
			var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + tempTest + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			//var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
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
		
		
		
		
		EDITOR.lastKeyPressed = character;
		
		
		if(file) {
			if(EDITOR.input && !preventDefault) {
				// Put character at current caret position:
				
				if(EDITOR.settings.renderColumnOptimization && file.caret.eol) { //  && character == benchmarkCharacter    && inputCount++ > 5 (if setTimeout is used, The benchmarking tool need 4 "test" inputs before benchmarking)
					// Makes characters appear on the screen faster ...
					
					/*
						var top = EDITOR.settings.topMargin + (EDITOR.currentFile.caret.row - EDITOR.currentFile.startRow) * EDITOR.settings.gridHeight;
						//var left = EDITOR.settings.leftMargin + (tempTest + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
						var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
						ctx.fillStyle = "rgb(0,0,0)";
						ctx.fillText(character, left, top);
						tempTest++;
					*/
					
					// Always use the default color. It's impossible to guess what color to use without parsing! Set renderColumnOptimization to false if this is too annoying
					
					// What will happen if we clear the canvas before? No impact on performace!
					EDITOR.clearColumn(file.caret.row, file.caret.col);
					
					// There's a higher "chance" to get faster responses if this function is inlined
					EDITOR.renderColumn(file.caret.row, file.caret.col, character);
					
					// Repaint the caret
					EDITOR.renderCaret(file.caret, 1); // colPlus=1 so that the caret will be rendered right
					
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
					EDITOR.renderNeeded();
				}
				
				
			}
			
		}
		
		EDITOR.interact("keyPressed", e);
		
	}
	
	function resizeAndRender() {
		
		if(EDITOR.shouldResize) EDITOR.resize();
		if(EDITOR.shouldRender) EDITOR.render();
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
			
			var top = EDITOR.settings.topMargin + (EDITOR.currentFile.caret.row - EDITOR.currentFile.startRow) * EDITOR.settings.gridHeight;
			//var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + tempTest + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			var left = EDITOR.settings.leftMargin + (tempTest + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			//ctx.fillStyle = "rgba(255,0,0, 0.5)";
			ctx.fillRect(left, top, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
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
		console.log("Calling keyDown listeners (" + EDITOR.eventListeners.keyDown.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.keyDown.length; i++) {
			funReturn = EDITOR.eventListeners.keyDown[i].fun(EDITOR.currentFile, character, combo); // Call function
			
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
					
					//console.log("keyDown: Calling function: " + UTIL.getFunctionName(binding.fun) + "...");
					
					if(captured) console.warn("Key combo has already been captured by " + UTIL.getFunctionName(captured) + " : charCode=" + charCode + " character=" + character + " combo=" + JSON.stringify(combo) + " binding.fun=" + UTIL.getFunctionName(binding.fun));
					
					captured = binding.fun;
					
					if(!EDITOR.currentFile) console.warn("No file open!");
					
					funReturn = binding.fun(EDITOR.currentFile, combo, character, charCode, "down", targetElementClass);
					
					console.log(UTIL.getFunctionName(binding.fun) + " returned " + funReturn);
					
					if(funReturn === false) { // If one of the functions returns false, the default action will be prevented!
						preventDefault = true;
						console.log("Default action will be prevented!");
					}
					else if(funReturn !== true) {
						throw new Error("You must make an active choise wheter to allow (return true) or prevent (return false) default (chromium) browser action,\
						like typing in input boxes, tabbing between elements, etc. function called: " + UTIL.getFunctionName(binding.fun));
					}
				}
			}
			else {
				//console.log("NOT calling function:" + UTIL.getFunctionName(binding.fun) + " " + JSON.stringify(binding));
			}
		}
		
		// Throwing the actual error here doesn't give a call stack! meh ... Need to see the console.warning to see the call stack
		//if(gotError) throw gotError; // throw new Error("There was an error when calling keyBindings. Se warnings in console log!");
		// Otimally we would want all key bound functions to run before throwing the error, but it's too annoying to not see the call stack in the error
		
		if(EDITOR.currentFile) {
			EDITOR.currentFile.checkGrid();
			EDITOR.currentFile.checkCaret();
		}
		
		EDITOR.interact("keyDown", {charCode: charCode, target: targetElementClass, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey});
		
		
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
			//alert("Preventing default browser action!");
			console.log("Preventing default browser action!");
			
			try {e.stopPropagation();} catch(err) {console.warn(err.message);}
			try {window.event.cancelBubble = true;} catch(err) {console.warn(err.message);}
			
			try {e.preventDefault();} catch(err) {console.warn(err.message);}
			try {event.preventDefault();} catch(err) {console.warn(err.message);}
			
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
			
			if(EDITOR.currentFile) {
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
			EDITOR.currentFile.putCharacter("~");
			EDITOR.renderNeeded();
			}
			else if(tildeShiftActive) {
			EDITOR.currentFile.putCharacter("^");
			EDITOR.renderNeeded();
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
				
				//console.log("keyUp: Calling function: " + UTIL.getFunctionName(binding.fun) + "...");
				
				funReturn = binding.fun(EDITOR.currentFile, combo, character, charCode, "up");
				
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
		
		
		EDITOR.interact("keyUp", e);
		
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
		
		//UTIL.objInfo(target);
		
		if(button == undefined) button = 0; // For like touch events
		
		var menu = document.getElementById("canvasContextmenu");
		
		//console.log("mouseDown on target.className=" + target.className);
		
		if(target.className == "fileCanvas" || target.className == "content centerColumn") {
			
			EDITOR.hideMenu();
			
			caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
			
			
			if(EDITOR.currentFile && (button == 0)) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				// Give focus
				EDITOR.input = true;
				
				// Remove focus from everything else
				try{ document.activeElement.blur(); } catch(err) {console.log("Unable to blur: " + err.message);};
				canvas.focus();
				
				// Delete selection outside of the canvas
				window.getSelection().removeAllRanges();
				
				/*
					Try to steal focus from any textboxes like find/replace.
					
					Meh, why doesn't this work!!!?
					
					
					document.body.focus(); // EDITOR.currentFile.canvas
					
					document.getElementById("leftColumn").focus();
					
					console.log("REFOCUS!");
				*/
			}
			else {
				
				// No current file or not the left button.
				
				EDITOR.input = false;
				
				EDITOR.showMenu();
				
			}
			
		}
		else{
			
			EDITOR.input = false;

		}
		
		console.log("Mouse down: caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		
		
		console.log("Calling mouseClick (down) listeners (" + EDITOR.eventListeners.mouseClick.length + ") ...");
		for(var i=0, binding; i<EDITOR.eventListeners.mouseClick.length; i++) {
			
			click = EDITOR.eventListeners.mouseClick[i];
			
			if((click.dir == "down" || click.dir == undefined) && 
			(click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo === undefined) &&
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				//console.log("Calling " + UTIL.getFunctionName(click.fun) + " ...");
				
				// Note that caret is a temporary position caret (not the current file.caret)!
				
				funReturn = click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo); // Call it
				
				if(funReturn === false) {
					preventDefault = true;
				}
				
				
			}
		}
		
		
		EDITOR.interact("mouseDown", e);
		
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
			caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
		}
		
		console.log("Calling mouseClick (up) listeners (" + EDITOR.eventListeners.mouseClick.length + ") ...");
		for(var i=0, binding; i<EDITOR.eventListeners.mouseClick.length; i++) {
			click = EDITOR.eventListeners.mouseClick[i];
			
			// Make sure to define click.dir (to prevent double action)!
			if((click.dir == "up" || click.dir == undefined) && 
			(click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo == undefined) && 
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				console.log("Calling " + UTIL.getFunctionName(click.fun) + " ...");
				
				click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo); // Call it
			}
		}
		
		
		//console.log("mouseUp, EDITOR.shouldRender=" + EDITOR.shouldRender);
		
		
		EDITOR.interact("mouseUp", e);
		
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
		
		if(UTIL.isNumeric(e.clientX) && UTIL.isNumeric(e.clientY)) {
			EDITOR.mouseX = parseInt(e.clientX);
			EDITOR.mouseY = parseInt(e.clientY);
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
			mouseX = EDITOR.mouseX;
			mouseY = EDITOR.mouseY;
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
		
		if(EDITOR.eventListeners.mouseMove.length > 0) {
			//console.log("Calling mouseMove listeners (" + EDITOR.eventListeners.mouseMove.length + ") ...");
			for(var i=0, fun; i<EDITOR.eventListeners.mouseMove.length; i++) {
				fun = EDITOR.eventListeners.mouseMove[i].fun;
				
				//console.log(UTIL.getFunctionName(fun));
				
				fun(mouseX, mouseY, target); // Call it
				
			}
		}
		
		//console.log("EDITOR.input=" + EDITOR.input);
		
		EDITOR.interact("mouseMove", e);
		
		//return false;
		
	}
	
	function mouseclick(e) {
		/*
			Check for the EDITOR.shouldRender flag and render if true
			
			For events that are not bound to mouseUp or mouseDown
		*/
		console.log("mouseClick, EDITOR.shouldRender=" + EDITOR.shouldRender + ", EDITOR.shouldResize=" + EDITOR.shouldResize + " EDITOR.input=" + EDITOR.input);
		
		EDITOR.interact("mouseClick", e);
		
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
			
			caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
			
			if(EDITOR.currentFile && button == 0) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				
				// Remove focus from everything else
				document.activeElement.blur();
				
				// Give focus
				EDITOR.input = true;
				canvas.focus();
				
				// Delete selection outside of the canvas
				window.getSelection().removeAllRanges();
				
			}
			
		}
		else{
			if(EDITOR.currentFile) {
				// Remove focus
				EDITOR.input = false;
			}
		}
		
		console.log("dblclick: caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		
		
		console.log("Calling dblclick listeners (" + EDITOR.eventListeners.dblclick.length + ") ...");
		for(var i=0, binding; i<EDITOR.eventListeners.dblclick.length; i++) {
			
			click = EDITOR.eventListeners.dblclick[i];
			
			if((click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo === undefined) &&
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				//console.log("Calling " + UTIL.getFunctionName(click.fun) + " ...");
				
				// Note that caret is a temporary position caret (not the current file.caret)!
				
				funReturn = click.fun(mouseX, mouseY, caret, button, target, keyboardCombo); // Call it
				
				if(funReturn === false) {
					preventDefault = true;
				}
				
				
			}
		}
		
		EDITOR.interact("dblclick", e);
		
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
			console.log("Calling mouseScroll listeners (" + EDITOR.eventListeners.mouseScroll.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.mouseScroll.length; i++) {
				EDITOR.eventListeners.mouseScroll[i].fun(dir, steps, combo);
			}
		}
		
		EDITOR.interact("mouseScroll", e);
		
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
					
					callback(null, xmlHttp.responseText, url);
					
				}
				else {
					callback(new Error("Error when opening url=" + url + "\nxmlHttp.status=" + xmlHttp.status + "\nxmlHttp.responseText=" + xmlHttp.responseText));
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
		var width = EDITOR.settings.gridWidth * html.length;
		var height = EDITOR.settings.gridHeight;
		
		//  width="' + width + '" height="' + height + '"
		
		//console.log("width=" + width);
		
		var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
		'<foreignObject width="100%" height="100%">' +
		'<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:' + EDITOR.settings.style.fontSize + 'px; font-family: ' + EDITOR.settings.style.font + ';">' +
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
		
		EDITOR.readFromDisk(__dirname + "/bootstrap.url", function bootstrap(err, path, url) {
			if(err) {
				console.warn("bootstrap.url: " + err.message);
				return;
			}
			
			// Append version to url so that the bootstrap provider knows what version of the editor you are using
			if(url.indexOf("?") != -1) url = url + "&version=" + EDITOR.version;
			else url = url + "?version=" + EDITOR.version;
			
			UTIL.httpGet(url, function(err, data) {
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
					EDITOR.bootstrap = json;
					EDITOR.fireEvent("bootstrap", json);
				}
				
			});
			
			
		});
	}
	
	function getVersion(callback) {
		
		EDITOR.readFromDisk("version.inc", function(err, path, string) {
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
								EDITOR.version = -1;
								callback(EDITOR.version);
							}
							else {
								EDITOR.version = match[1];
								callback(EDITOR.version);
							}
						}
						else {
							EDITOR.version = -1;
							callback(EDITOR.version);
						}
					});
				}
				else {
					EDITOR.version = -1;
					callback(EDITOR.version);
				}
			}
			else {
				EDITOR.version = parseInt(string);
				callback(EDITOR.version);
			}
		});
		
	}
	
	
	function fullScreen() {
		alertBox("Attempting to go into full-screen ...")
		if (
		document.fullscreenEnabled || 
		document.webkitFullscreenEnabled || 
		document.mozFullScreenEnabled ||
		document.msFullscreenEnabled
		) {
			var body = document.getElementById("body");
			if (body.requestFullscreen) {
				body.requestFullscreen();
			} else if (body.webkitrequestFullscreen) {
				body.webkitrequestFullscreen();
			} else if (body.mozrequestFullscreen) {
				body.mozrequestFullscreen();
			} else if (body.msrequestFullscreen) {
				body.msrequestFullscreen();
			}
		}
		else {
			alertBox("Full screen not supported in this browser");
		}
	}
	
	function confirmExit() {
		return "Are you sure you want to close the editor ?";
	}
	
	
	
})();
