"use strict";

//var testfile = "test/testfile.txt";

// The EDITOR object lives in global scope, so that it can be accessed everywhere.
var EDITOR = {};


var tempTest = 0;
var benchmarkCharacter = ".";
var benchmarkCharacterCode = 190;
var inputCount = 0;
var menuVisibleOnce = false;
var menuIsFullScreen = false;

// Don't show the firendly message on how to show the menu if the menu is disabled
if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("menu") != -1) menuVisibleOnce = true;

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
	devMode: true,  // devMode: true will spew out debug info and make sanity checks (that will make the editor run slower, mostly because of all the console.log's) Set devMode to false when measuring performance!!!
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
	scrollZone: 80, // Scrollbar zone, right and bottom. When touching down in the zone we should scroll
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
		removedTextColor: "#3a7f3a",
		addedTextColor: "#ff4a4a",
		selectedTextBg: "rgb(193, 214, 253)",
		currentLineColor: "rgb(255, 255, 230)",
		highlightTextBg: "rgb(155, 255, 155)"          // For text highlighting
	},
	scrollSpeedMultiplier: 1/17,
	defaultLineBreakCharacter: (navigator.platform.indexOf("Win") != -1) ? "\r\n" : "\n", // Use Windows standard if on Windows, else use line-feed. \n == LF, \r == CR
	bigFileSize: 400*1024, // (Bytes), all files larger then this will be opened as streams
	bigFileLoadRows: 3000, // Rows to load into the editor if the file size is over bigFileSize
	autoCompleteKey: 9, // Tab
	renderColumnOptimization: false, // When typing in a big file that is rendered on each key stroke we might miss the vsync train, this will make characters appear before any parsing etc
	clearColumnOptimization: false, // When deleting a character, clears only the character
	insert: false,
	stdInPort: 13379,
	useCliboardcatcher: false // Some browsers (IE) can only capture clipboard events if a text element is focused
};

EDITOR.runningTests = false;   // Able to ignore some stuff like alerts while tests are running
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
EDITOR.platform = /^Win/.test(window.navigator.platform) ? "Windows" : (/^linux/.test(window.navigator.platform) ? "Linux" : "Unknown");
// http://stackoverflow.com/questions/9514179/how-to-find-the-operating-system-version-using-javascript

EDITOR.installDirectory = "/";

EDITOR.collaborationMode = false;


EDITOR.eventListeners = { // Use EDITOR.on to add listeners to these events:
	fileClose: [], 
	fileOpen: [], 
	fileHide: [],
	fileShow: [],
	fileParse: [],
	beforeSave: [],
	afterSave: [],
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
		storageReady: [], // When server storage is ready to be used
		commitTool: [],
		resolveTool: [],
		mergeTool: [],
		fileDrop: [],
		openFileTool: [],
		showMenu: [],
		voiceCommand: [],
		fileExplorer: [], // Plugins can register themselves as a file explorer (and return true if it thinks it's the right tool for the current state)
		previewTool: []
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
EDITOR.openFileQueue = []; // Files listed here are waiting for data (it's an internal variable, but exposed so plugins can check if there's any files in it)

(function() { // Non global editor code ...
	
	// These variables and functions are private ...
	// We only expose methods that are in the EDITOR object.
	
	var browser = UTIL.checkBrowser();
	
	if(browser.indexOf("MSIE") == 0) EDITOR.settings.useCliboardcatcher = true;
	//if(browser.indexOf("Firefox") == 0) EDITOR.settings.useCliboardcatcher = true;
	
	//if(browser != "Chrome") alertBox("The editor might be slow in your browser (" + browser + ").\nThe editor runs best in Chrome/Chromium/Opera", "warning");
	
	var keyBindings = []; // Push objects {char, charCode, combo dir, fun} for key events
	
	var executeOnNextInteraction = [];
	
	var lastKeyDown = 0;
	var tildeActive = false;
	var tildeShiftActive = false;
	var tildeAltActive = false;
	
	var canvas, ctx; 
	
	var fileOpenHtmlElement;
	
	var fileOpenExtraCallbacks = {};
	
	var testFirstTest = true;
	
	var windowLoaded = false;
	
	var directoryDialogCallback = undefined;
	var directoryDialogHtmlElement;
	
	var widgetElementIdCounter = 0;
	
	var calledStartListeners = false;
	
	var giveBackFocusAfterClipboardEvent = false;
	
	var dashboardVisible = false;
	
	// For keeping track of native copy, paste, cut functionality in Firefox
	// To prevent Firefox from calling keyUp events before copy/paste/cut event
	var nativeCopy = false;
	var nativePaste = false;
	var nativeCut = false;
	
	// Speech Recognition
	var speechRecognitionGrammar = [];
	var speechRecognitionListeners = [];
	if(typeof SpeechRecognition == "undefined") {
		if(typeof webkitSpeechRecognition == "undefined") {
			console.warn("Speech Recognition not supported!");
		}
		else var SpeechRecognition = webkitSpeechRecognition;
	}
	if(SpeechRecognition) {
		var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
		var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
		var speechRecognitionList = new SpeechGrammarList();
		var recognition = new SpeechRecognition();
		//recognition.continuous = false;
		recognition.lang = 'en-US';
		recognition.interimResults = false;
		recognition.maxAlternatives = 1;
		recognition.onresult = speechRecognitionResult;
		recognition.onspeechend = function speechRecognitionEnd() {
			recognition.stop();
		}
		recognition.onerror = function speechRecognitionError(ev) {
			console.warn("Speech recognition error: " + ev.error);
		}
		recognition.onnomatch = function speechRecognitionNomatch(ev) {
			console.log(ev);
			console.warn("Speech recognition found no matching commands!");
		}
	}
	
	
	/*
		EDITOR functionality (accessible from global scope) By having this code here, we can use private variables
		
		To make it more fun to write plugins, the EDITOR and File object should take care of the "low level" stuff and heavy lifting. 
		Feel free to add more EDITOR methods below. Do not extend the EDITOR object elsewhere!!
	*/
	
	
	EDITOR.touchDown = false; // Is the user still holding down/touching ?
	EDITOR.scrollingEnabled = false;
	EDITOR.hasKeyboard = false; // true if keyup is detected
	
	var lastMouseDownEventType = "";
	
	// # Working Directory
	var workingDirectory; // Private variable
	var _editorInput = true;
	if(!Object.defineProperty) {
		console.warn("Object.defineProperty not available!");
		
		//EDITOR.renderNeeded = renderNeeded; 
		
	}
	else {
		Object.defineProperty(EDITOR, 'workingDirectory', {
			get: function getWorkingDirectory() { return workingDirectory; },
			set: function setWorkingDirectory(newValue) { throw new Error("Use EDITOR.changeWorkingDir(newDir) to change working directory!"); },
			enumerable: true
		});
		
		// For debugging input focus
		Object.defineProperty(EDITOR, 'input', {
			get: function getEditorInputFocus() { return _editorInput; },
			set: function setEditorInputFocus(newValue) {
				console.warn("Set EDITOR.input to " + newValue);
				console.log(UTIL.getStack("Set EDITOR.input to " + newValue));
				if(newValue) _editorInput = true;
				else _editorInput = false;
			},
			enumerable: true
		});
		
		/*
			Object.defineProperty(EDITOR, 'renderNeeded', {
			get: function() {return renderNeeded;} ,
			set: function () { throw new Error("EDITOR.renderNeeded() is a function! Do not overwrite it!"); },
			enumerable: false
			});
		*/
	}
	
	setWorkingDirectory(UTIL.trailingSlash(process.cwd()));
	
	if(RUNTIME!="browser") {
		// Check if the working directory is the same as the editor (hmm, why?)
		
		console.log("__dirname=" + __dirname);
		console.log("workingDirectory=" + EDITOR.workingDirectory);
		
		if(__dirname != EDITOR.workingDirectory) console.warn("Working directory is not the current directory __dirname=" + __dirname + " EDITOR.workingDirectory=" + EDITOR.workingDirectory);
	}
	
	EDITOR.renderNeeded = function renderNeeded() {
		// Tell the editor that it needs to render
		
		if(EDITOR.settings.devMode && EDITOR.shouldRender == false) {
			// For debugging, so we know why a render was needed
			console.log(UTIL.getStack("renderNeeded"));
		}
		EDITOR.shouldRender = true;
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
		setItem: function storageSetItem(id, val, callback) {
			var stack = UTIL.getStack("EDITOR.storage.setItem");
			CLIENT.cmd("storageSet", {item: id, value: String(val)}, function(err, json) {
				if(callback) callback(err, json);
				else if(err) {
					console.log(stack);
					console.warn(err.message);
				}
			});
			return _serverStorage[id] = String(val); 
		},
		getItem: function storageGetItem(id, trap) {
			if(!this.ready()) throw new Error('Storage is not yet ready. Use EDITOR.on("storageReady", yourFunction)'); 
			
			if(trap !== undefined) throw new Error("getItem only takes one argument, did you mean to use setItem ?"); // Error check
			
			if(!_serverStorage.hasOwnProperty(id)) {
				console.warn("Can not find id=" + id + " in EDITOR.storage!");
				return null;
			}
			else return _serverStorage[id];
			
		},
		
		removeItem: function storageRemoveItem(id, callback) {
			
			// Save the stack in case we get an error
			var stack = UTIL.getStack("EDITOR.storage.removeItem");
			
			CLIENT.cmd("storageRemove", {item: id}, function(err, json) {
				if(callback) callback(err, json);
				if(err) {
					console.log(stack);
					throw err;
				}
			});
			
			return delete _serverStorage[id];
		},
		clear: function storageClear() {
			throw new Error("Use EDITOR.storage.removeItem() instead!");
			//CLIENT.cmd("storageClear", function(err) {if(err) throw err;});
			return _serverStorage = {}; 
		},
		ready: function storageReady() {
			if(_serverStorage === null) return false;
			else if(_serverStorage instanceof Object) return true;
			else {
				//console.log("instanceof " + (instanceof _serverStorage));
				throw new Error("_serverStorage=" + _serverStorage + " typeof " + (typeof _serverStorage));
				
			}
		}
	};	
	
	/*
		
		This big difference between EDITOR.localStorage and EDITOR.storage is that EDITOR.localStorage works offline!
		
		EDITOR.localStorage and EDITOR.storage has the same interface to make it easy to switch beteen them.
		
	*/
	
	// Because of Chrome app's doesn't have window.localStorage, and chrome.storage.local doesn't look the same
	var chromeStorage = (typeof chrome == "object") && chrome.storage && chrome.storage.local;
	if(!window.localStorage && chromeStorage) {
		EDITOR.localStorage = {
			setItem: function localStorageSetItem(itemsObject, callback, callbackMaybe) {
				if(typeof itemsObject == "string") {
					var key = itemsObject;
					var value = callback;
					callback = callbackMaybe;
					if(typeof value != "string") throw new Error("value needs to be a string!");
					var itemsObject = {};
					itemsObject[key] = value;
					console.log("chrome.storage.sync.set " + key + "=" + value);
				}
				else if(typeof itemsObject != "object") throw new Error("Use: key, value. or a itemsObject ! itemsObject=" + itemsObject);
				
				for(var name in itemsObject) {
					if(typeof itemsObject[name] != "string") throw new Error("Each item needs to be serialized to a string! " + name + "=" + itemsObject[name]);
				}
				
				var stack = UTIL.getStack("EDITOR.localStorage.setItem");
				
				chrome.storage.sync.set(itemsObject, function chromeStorageSet() {
					var err = checkForChromeAppError(stack);
					if(!err) var json = {saved: key};
					
					if(callback) callback(err, json);
					else if(err) throw err;
					console.log("chrome.storage.sync.set " + key + " done!");
				});
			},
			getItem: function localStorageGetItem(key, callback) {
				if(typeof callback != "function") throw new Error("getItem is async and needs a callback function!");
				var stack = UTIL.getStack("EDITOR.localStorage.getItem");
				chrome.storage.sync.get(key, function chromeStorageGet(itemsObject) {
					var err = checkForChromeAppError(stack);
					if(!err) {
						if(typeof key == "string") {
var value = itemsObject[key];
						}
						else {
							var value = itemsObject;
						}
					}
					// if key doesn't exist the value will be undefined!
					callback(err, value);
				});
			},
			removeItem: function localStorageRemoveItem(key, callback) {
				var stack = UTIL.getStack("EDITOR.localStorage.removeItem");
				chrome.storage.sync.remove(key, function chromeStorageRemove() {
					var err = checkForChromeAppError(stack);
					if(!err) {
						var json = {removed: key};
					}
					
					if(callback) callback(err, json);
					else if(err) throw err;
				});
			},
			clear: function storageClear(callback) {
				console.warn("Clearing ALL data from chrome.storage!");
				var stack = UTIL.getStack("EDITOR.localStorage.clear");
				chrome.storage.sync.clear(function chromeStorageClear() {
					var err = checkForChromeAppError(stack);
					
					if(callback) callback(err);
					else if(err) throw err;
				});
			}
		};
	}
	else if(window.localStorage) {
		// Use window.localStorage but with the same interface as chrome.storage
		EDITOR.localStorage = {
			setItem: function localStorageSetItem(key, value, callback) {
				window.localStorage.setItem(key, value);
				var json = {saved: key};
				if(callback) callback(null, json);
			},
			getItem: function localStorageGetItem(key, callback) {
				if(typeof callback != "function") throw new Error("getItem is async and needs a callback function!");
				var value = window.localStorage.getItem(key);
				callback(null, value);
			},
			removeItem: function localStorageRemoveItem(key, callback) {
				window.localStorage.removeItem(key);
				var json = {removed: key};
				if(callback) callback(null, json);
			},
			clear: function storageClear(callback) {
				console.warn("Clearing ALL data from window.localStorage!");
				window.localStorage.clear();
				if(callback) callback(null);
			}
		};
	}
	else {
		EDITOR.localStorage = null;
		console.warn("window.localStorage and  chrome.storage.local not available!");
	}
	
	function checkForChromeAppError(stack) {
		var err = null;
		if(typeof chrome == "object" && chrome.runtime && chrome.runtime.lastError) {
			err = chrome.runtime.lastError;
			if(err) {
				if(stack) console.log(stack);
				console.warn(err.message);
			}
		}
		return err;
	}
	
	EDITOR.changeWorkingDir = function(workingDir) {
		
		console.log("Changing working directory to: " + workingDir);
		
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
			else if(a.order > b.order) {
				return 1;
			}
			else {
				return 0;
			}
		}
	}
	
	
	EDITOR.openFile = function(path, text, state, callback) {
		/*
			Note: The caller of this function needs to handle file state, 
			such as file.isSaved, file.savedAs and file.changed (pass it as an object into the state parameter)
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
		
		// State parameter is optional
		if(typeof state === "function" && !callback) {
			callback = state;
			state = undefined;
		}
		
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
				
				if(!EDITOR.currentFile) { // For sanity
					return fileOpenError(new Error("There are files opened, but EDITOR.currentFile=" + EDITOR.currentFile + " EDITOR.files=" + Object.keys(EDITOR.files)));
				}
				
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
		
		if(EDITOR.openFileQueue.indexOf(path) != -1) {
			
			console.log("File in EDITOR.openFileQueue! path=" + path);
			
			/*
				If two things are waiting for a particular file to open, call both things once it has opened.
				But if text content is set, it is (most likely) not the same file!!!
				issue: reopen_files will open the file with content set! Why ?
				
				Could also add a counter to it's name, like when the file is already opened!?
			*/
			if(text != undefined) {
				var err = new Error("File with path=" + path + " is already in the queue to be opened (from disk). So it's unsafe to overwrite the file content!");
				err.code = "IN_QUEUE";
				if(callback) return callback(err);
				else throw err;
				//return console.warn(err.message);
			}
			
			// Add callback to the waiting list to be called once the file has been loaded
			if(callback) {
				if(!fileOpenExtraCallbacks.hasOwnProperty(path)) fileOpenExtraCallbacks[path] = [];
				
				if(fileOpenExtraCallbacks[path].indexOf(callback) != -1) {
throw new Error("Callback=" + UTIL.getFunctionName(callback) + " is already in fileOpenExtraCallbacks for path=" + path);
				}
				
				console.log("Pushing callback=" + UTIL.getFunctionName(callback) + " to fileOpenExtraCallbacks for path=" + path);
				
				fileOpenExtraCallbacks[path].push(callback);
				return; // Don't do anything else
			}
			else alertBox("Please wait ... Opening file: " + path);
			/*
				var err = new Error("File is already in the queue to be opened, please wait!");			
				err.code = "INQUEUE";
				return fileOpenError(err);
			*/
		}
		
		if(!UTIL.isString(path)) return fileOpenError(new Error("path is not a string: " + path));
		
		EDITOR.openFileQueue.push(path); // Add the file to the queue AFTER checking if it's in the queue
		console.log("File path=" + path + " added to EDITOR.openFileQueue=" + JSON.stringify(EDITOR.openFileQueue));
		
		if(text == undefined) {
			
			if(RUNTIME!="browser") {
				var absolutePath = UTIL.makePathAbsolute(path);
				if(absolutePath != path) {
					removeFromQueue(path);
					path = absolutePath;
					EDITOR.openFileQueue.push(path);
				}
			}
			
			console.warn("Text is undefined! Reading file from disk: " + path)
			
			// Check the file size
			console.log("Getting file size on disk. path=" + path);
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
						
						//if(RUNTIME == "browser") return fileOpenError(new Error("Opening large files not yet supported in the browser!"));
						
						console.warn("File larger then " + EDITOR.settings.bigFileSize + " bytes. It will be opened as a stream!");
						var notFromDisk = false;
						var tooBig = true;
						var text = "";
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
			
			if(!newFile.path) fileOpenError(new Error("The file has no path!")); // For sanity
			
			if(!notFromDisk) {
				// Because we opened it from disk:
				newFile.isSaved = true;
				newFile.savedAs = true;
				newFile.changed = false;
			}
			
			if(state) {
				if(state.isSaved != undefined) newFile.isSaved = state.isSaved;
				if(state.savedAs != undefined) newFile.savedAs = state.savedAs;
				if(state.changed != undefined) newFile.changed = state.changed;
			}
			
			function fileLoaded(fileLoadError) {
				
				if(fileLoadError) return fileOpenError(fileLoadError);
				
				// Dilemma1: Should file open even listeners be called before or after the callback!??
				// answer: call callbacks first so that they can change the state of file.saved before calling file open listeners
				// problem: The callback might change the file, triggering file.change() then plugins will go nuts because they have not seen the file (being opened) yet!
				// sultion: The file open event listeners need to be called before the file open callback(s)! 
				// problem2: The callback might close the file!
				// solution: callCallbacks should be called *after* file open events. Allow file state in EDITOR.openFile parameters.
				
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
				
				if(!state || state.show !== false) {
					// Switch to this file
					EDITOR.showFile(file);
					EDITOR.view.endingColumn = EDITOR.view.visibleColumns; // Because file.startColumn = 0;
				}
				
				if(err || fileLoadError) throw new Error("err=" + err + " fileLoadError=" + fileLoadError);
				
				removeFromQueue(path);
				
				EDITOR.dashboard.hide(); // Hide dashboard when opening a file
				
				// Always render (and resize) after opening a file! (where=here, when=now!)
				EDITOR.renderNeeded();
				
				// At last, call the function(s) to be run after the file has been opened
				callCallbacks(null, file);
				
			}
		}
		
		function fileOpenError(err) {
			removeFromQueue(path);
			
			console.warn(err.message);
			
			callCallbacks(err, file);
			
			console.warn("Error when opening file path=" + path + " message: " + err.message);
			
			return err;
		}
		
		function callCallbacks(err, file) {
			if(callback) {
				callback(err, file); // after fileOpen even: reasoning: some plugin might want to add fileopen events AFTER they have opened a particular file
			}
			else if(err) {
				alertBox(err.message);
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
		
		function removeFromQueue(path) {
			if(EDITOR.openFileQueue.indexOf(path) == -1) throw new Error("File path=" + path + " not in EDITOR.openFileQueue=" + JSON.stringify(EDITOR.openFileQueue));
			EDITOR.openFileQueue.splice(EDITOR.openFileQueue.indexOf(path), 1); // Take the file off the queue
			if(EDITOR.openFileQueue.indexOf(path) != -1) throw new Error("File path=" + path + " still in EDITOR.openFileQueue=" + JSON.stringify(EDITOR.openFileQueue));
			console.log("Removed from EDITOR.openFileQueue! path=" + path);
		}
		
	}
	
	EDITOR.whenFileOpens = function whenFileOpens(path, callback) {
		// Call back when the file with the specified path have been opened
		if(path in EDITOR.files) callback(null, EDITOR.files[path]);
		if(fileOpenExtraCallbacks.hasOwnProperty(path)) fileOpenExtraCallbacks[path].push(callback);
		else fileOpenExtraCallbacks[path] = [callback];
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
			try {
				xhr.send();
			}
			catch(err) {
				callback(err);
			}
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
		// An easier method then getFileSizeOnDisk to check if a file exist on disk.
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
		
		if(typeof path != "string" && path && path instanceof File) {
			path = path.path; // file.path
		}
		
		if(!EDITOR.files.hasOwnProperty(path)) {
			throw new Error("Can't close file that is not open: " + path + " Opened files are: " + JSON.stringify(Object.keys(EDITOR.files)).slice(1,-1));
		}
		else {
			
			console.log("Closing file: path=" + path);
			
			var file = EDITOR.files[path];
			
			// Call listeners (before we switch to another file, and before we delete the file content)
			console.log("Calling fileClose listeners (" + EDITOR.eventListeners.fileClose.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.fileClose.length; i++) {
				EDITOR.eventListeners.fileClose[i].fun(file); // Call function
			}
			
			EDITOR.removeAllInfo(file);
			
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
				if(EDITOR.files.hasOwnProperty(path)) throw new Error("Closed file is still in the editor! path=" + path + 
				"\nIt was closed 100ms ago. If you are running tests, use different file names for each test!");
			}, 30);
			
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
	
	
	
	EDITOR.readFromDisk = function readFromDisk(path, returnBuffer, encoding, callback) {
		
		if(callback == undefined && typeof encoding == "function") {
			callback = encoding;
			encoding = "utf8";
		}
		if(callback == undefined && typeof returnBuffer == "function") {
			callback = returnBuffer;
			returnBuffer = false;
		}
		
		if(callback == undefined || typeof callback != "function") throw new Error("No callback function! callback=" + callback);
		
		console.log("Reading file: " + path);
		
		var json = {path: path, returnBuffer: returnBuffer, encoding: encoding};
		
		CLIENT.cmd("readFromDisk", json, function readFromDiskServerResponse(err, json) {
			if(err) callback(err);
			else callback(null, json.path, json.data);
		});
		
	}
	
	EDITOR.countLines = function countLines(filePath, callback) {
		// You probably want to use EDITOR.readLines instead! (EDITOR.readLines gives totalLines as well as lines)
		
		console.log("Counting lines in: filePath=" + filePath + "");
		
		var json = {path: filePath};
		
		CLIENT.cmd("countLines", json, function readLines(err, json) {
			if(err) callback(err);
			else callback(null, json.totalLines);
		});
	}
	
	EDITOR.readLines = function readLines(filePath, options, callback) {
		// Reads lines options.start to options.end of file, calls back with the lines as an array
		
		console.log("Reading lines from: filePath=" + filePath + " options=" + JSON.stringify(options));
		
		var json = {path: filePath, start: options.start, end: options.end};
		
		CLIENT.cmd("readLines", json, function readLines(err, json) {
			if(err) callback(err);
			else callback(null, json.lines, json.end, json.totalLines);
		});
	}
	
	EDITOR.writeLines = function writeLines(filePath, start, lines, callback) {
		// Writes lines to file starting at line start
		
		if(typeof start != "number") throw new Error('Parameter "start" needs to be a number!');
		if( Object.prototype.toString.call( lines ) != '[object Array]' ) throw new Error('Parameter "lines" needs to be an array!');
		
		console.log("Writing lines to: filePath=" + filePath + " start=" + start);
		
		var json = {path: filePath, start: start, lines: lines};
		
		CLIENT.cmd("writeLines", json, function readLines(err, json) {
			if(err) callback(err);
			else callback(null);
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
		
		EDITOR.callEventListeners("beforeSave", file, function beforeSaveListenersCalled(errors) {
			if(errors.length > 0) {
				var errorMessages = [];
				for (var i=0; i<errors.length; i++) {
					console.error(errors[i]);
					errorMessages.push(errors[i].message);
				}
				alertBox(errors.length + " tool(s) failed. Which might effect formatting etc of the file on disk!\n" + errorMessages.join("\n"), "warning");
			}
			beginSaving();
		});
		
		function beginSaving() {
		if(file.path != path) {
			if(EDITOR.files.hasOwnProperty(path)) {
				var err = new Error("There is already a file open with path=" + path);
				if(callback) callback(err, path);
				else throw err;
			}
			console.warn("File will be saved under another path; old=" + file.path + " new=" + path);
			
			// Check if the file exist on disk so we don't accidently overwrite it!
			EDITOR.doesFileExist(path, function fileExist(exist) {
				if(exist) {
					var overwrite = "Overwrite";
					var cancel = "Cancel";
					confirmBox("File already exist: " + path + "\nDo you want to overwrite it ?", [overwrite, cancel], function(answer) {
						if(answer == overwrite) reOpen(file.path, path);
						else {
							var err = new Error("You aborted the save (as) to prevent overwriting existing file");
							err.code = "ABORT";
							callback(err);
						}
					});
				}
				else reOpen(file.path, path);
			});
		}
		else {
			EDITOR.saveToDisk(file.path, file.text, doneSaving);
		}
		}
		
		function reOpen(oldPath, newPath) {
			// We must close and reopen the file so that plugins keeping track of open files do not go nuts.
			
			EDITOR.closeFile(oldPath, true); // true = do not switch to another file
			
			// Reopen the file with the new path, makes sure fileSave events in file.save gets called after we have a new path.
			EDITOR.openFile(newPath, text, function savedAs(err, newFile) {
				if(err) throw err;
				
				file = newFile;
				
				EDITOR.saveToDisk(file.path, file.text, doneSaving);
			}); 
		}
		
		function doneSaving(err, path) {
			if(err) {
if(callback) return callback(err, path);
				else throw err;
			}
			
			if(file.savedAs && path != file.path) throw new Error("Saved the wrong file!\npath=" + path + "\nfile.path=" + file.path); // Sanity check
				
				console.log("Successfully saved " + file.path);
				
			// Change state to saved, and call afterSave listeners
			file.saved(function(err) {
				
				// Call back without an error even though some of the afterSave events failed.
				// Callers of EDITOR.saveFile is mostly most concerned about if the file successfully saved or not
				if(callback) callback(null, path);
				
			}); 
		}
	}
	
	
	EDITOR.saveToDisk = function(path, text, saveToDiskCallback, inputBuffer, encoding) {
		// You probably want to use EDITOR.saveFile instead!
		// This is used internaly by the editor, but exposed so plugins can save files that are not opened.
		
		// Only works with text files !
		
		if(!saveToDiskCallback) console.warn("saveToDisk called without a callback function!");
		
		var json = {path: path, text: text, inputBuffer: inputBuffer, encoding: encoding};
		
		CLIENT.cmd("saveToDisk", json, function(err, json) {
			if(err) {
				if(saveToDiskCallback) saveToDiskCallback(err);
				else throw err;
			}
			else {
				if(saveToDiskCallback) saveToDiskCallback(null, json.path);
				else console.log("File saved to disk: " + json.path);
			}
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
	
	EDITOR.localFileDialog = function(defaultPath, callback) {
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
			//ctx.scale(1,1);
		}
		
		EDITOR.shouldRender = false; // Flag (change to true whenever we need to render)
		
		//console.log("rendering ... EDITOR.shouldResize=" + EDITOR.shouldResize + "");
		
		if(EDITOR.currentFile && menuVisibleOnce) {
			
			console.log("render file=" + EDITOR.currentFile.path);
			
			console.time("render");
			
			if(!EDITOR.currentFile.render) {
				console.warn("File render flag set to '" + EDITOR.currentFile.render + "'");
				
				// Just paint the background
				ctx.fillStyle = EDITOR.settings.style.bgColor;
				
				//ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				return;
			}
			
			
			
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
			// Show some useful info for new users ...
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			ctx.fillStyle = EDITOR.settings.style.textColor;
			
			ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			ctx.textBaseline = "top";
			
			/*
				
				var keyCombo, friendlyString;
				
				if(EDITOR.user) {
				keyCombo = EDITOR.getKeyFor("show_gotoFileInput");
				friendlyString = "Press " + keyCombo +" to search/open a file";
				}
				else {
				keyCombo = EDITOR.getKeyFor("openFile");
				friendlyString = "Press " + keyCombo +" to open a file";
				}
			*/
			
			var friendlyString = "Right click or long-touch to show the menu!"
			
			if(friendlyString) {
				// Place the string in the center
				var textMeasure = ctx.measureText(friendlyString);
				var left = EDITOR.view.canvasWidth / 2 - textMeasure.width / 2;
				var top =  EDITOR.view.canvasHeight / 2 - 20;
				
				ctx.beginPath(); // Reset all the paths!
				ctx.fillText(friendlyString, left, top);
			}
			
			// Render clouds !?
			
			//console.log("No file open");
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
	
	
	EDITOR.resize = function(resizeEvent) {
		/*
			
			Why does the resize clear the canvas's !???
			
		*/
		
		if(!EDITOR.shouldResize) return; // Don't resize if it's not needed.
		EDITOR.shouldResize = false; // Prevent this function from running again
		
		//if(EDITOR.lastKeyPressed=="a") throw new Error("why resize now?");
		
		console.log("Resizing ... resizeEvent=" + resizeEvent + " EDITOR.shouldRender=" + EDITOR.shouldRender + "");
		
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
		
		
		// Position the virtual keyboard
		var vkcs = window.getComputedStyle(virtualKeyboardElement, null);
		var vkWidth = parseInt(vkcs.width);
		var vkHeight = parseInt(vkcs.height);
		
		console.log("vkHeight=" + vkHeight + " windowHeight=" + windowHeight + " vkWidth=" + vkWidth + " windowWidth=" + windowWidth);
		
		// Place virtual keyboard inside the canvas, so that it doesn't cover widgets
		virtualKeyboardElement.style.top = (headerHeight + contentHeight - vkHeight) + "px"; 
		virtualKeyboardElement.style.left = (windowWidth - rightColumnWidth - vkWidth) + "px";
		
		//virtualKeyboardElement.style.bottom = (footerHeight + vkHeight) + "px"; 
		//virtualKeyboardElement.style.right = (rightColumnWidth + vkWidth) + "px";
		
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
		EDITOR.width = windowWidth;
		
		
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
		
		// The canvas seem to be reset when resizing!
		//EDITOR.canvas.mozOpaque = true; // Doesn't seem to improve performance in Firefox
		EDITOR.canvasContext.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		EDITOR.canvasContext.textBaseline = "top";
		
		
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
			throw new Error("eventName=" + eventName + " does not exist in EDITOR.eventListeners!");
		}
		
		if(arguments.length > 2) {
			throw new Error("Expected 2 arguments. Not " + arguments.length + ". Pass additional arguments in the options (second argument)! Or use EDITOR.on instead!");
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
		
		if(options.order == undefined) options.order = 1000;
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
		
		console.log("Adding function " + UTIL.getFunctionName(options.fun) + " to event " + eventName);
		
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
		
		if(eventName == "start" && calledStartListeners) {
			console.warn("Editor's start event has already been fired! " + funName + " will run right away!");
			options.fun(); 
		}
		
		
		if(eventName == "voiceCommand" && options.grammar && recognition) {
			if(Object.prototype.toString.call( options.grammar ) != '[object Array]') {
				throw new Error("options.grammar neeeds to be an array!");
			}
			for (var i=0; i<options.grammar.length; i++) {
				if(speechRecognitionGrammar.indexOf(options.grammar[i]) == -1) speechRecognitionGrammar.push(options.grammar[i]);
			}
			
			var speechRecognitionList = new SpeechGrammarList();
			var grammar = "#JSGF V1.0; grammar JZedit;";
			grammar += "<number>=1|2|3|4|5|6|7|8|9|0;";
			grammar += "<numbers>=<number>|<number><number>|<number><number><number>|<number><number><number><number>;"
			grammar += "public <phrase> = " + speechRecognitionGrammar.join(' | ') + ' ;';
			speechRecognitionList.addFromString(grammar, 1);
			recognition.grammars = speechRecognitionList;
		}
		
		if(eventName == "voiceCommand" && !recognition) {
			console.warn("Speech Recognition not supported in your browser!");
		}
		
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
	
	EDITOR.updateMenuItem = function(menuElement, active, htmlText, callback) {
		
		if(menuElement == undefined) throw new Error("menuElement=" + menuElement + " !");
		
		var li = menuElement;
		
		var child = li.childNodes;
		var bullet = child[0];
		var text = child[1];
		var keyComboEl = child[2];
		
		if(active) bullet.setAttribute("class", "bullet active");
		else bullet.setAttribute("class", "bullet inactive");
		
		if(htmlText) {
			text.innerHTML = htmlText;
		}
		
		if(callback) {
			var keyCombo = EDITOR.getKeyFor(callback);
			if(keyCombo) keyComboEl.innerText = keyCombo;
			else keyComboEl.innerText = "";
			
			li.onclick = function(clickEvent) {
				// Give the same function parameters as key bound events
				var file = EDITOR.currentFile;
				var combo = getCombo(clickEvent);
				var character = null;
				var charCode = 0;
				var direction = "down";
				callback(file, combo, character, charCode, direction);
			}
		}
		
	}
	
	EDITOR.addMenuItem = function(htmlText, callback, position) {
		var menu = document.getElementById("canvasContextmenu");
		
		var li = document.createElement("li");
		
		var bullet = document.createElement("span");
		bullet.setAttribute("class", "bullet inactive");
		
		li.appendChild(bullet);
		
		var menuText = document.createElement("span");
		menuText.setAttribute("class", "text");
		menuText.innerHTML = htmlText;
		
		li.appendChild(menuText);
		
		var keyCombo = EDITOR.getKeyFor(callback);
		var keyComboEl = document.createElement("span");
		keyComboEl.setAttribute("class", "key");
		if(keyCombo) keyComboEl.innerText = keyCombo;
		li.appendChild(keyComboEl);
		
		console.warn("Adding menu item: " + htmlText + " keyCombo=" + keyCombo);
		
		if(callback) li.onclick = function(clickEvent) {
			// Give the same function parameters as key bound events
			var file = EDITOR.currentFile;
			var combo = getCombo(clickEvent);
			var character = null;
			var charCode = 0;
			var direction = "down";
			callback(file, combo, character, charCode, direction, clickEvent);
		}
		
		if(position) {
			if(position < 0) position = 0
			else if(position >= menu.children.length) position = menu.children.length-1;
			menu.insertBefore(li, menu.children[position]);
		}
		else {
			menu.appendChild(li);
		}
		
		// Don't forget to call EDITOR.hideMenu() after the item has been clicked!
		
		return li;
	}
	
	EDITOR.removeMenuItem = function(menuElement) {
		
		if(!menuElement) throw new Error("EDITOR.removeMenuItem was called with no function parameters! menuElement=" + menuElement);
		if(!menuElement.tagName) throw new Error("EDITOR.removeMenuItem argument menuElement is not a HTML node!");
		
		var menu = document.getElementById("canvasContextmenu");
		
		var positionIndex = Array.prototype.indexOf.call(menu.children, menuElement);
		
		if(menuElement.parentNode == undefined) return console.warn("menuElement has no parent! menuElement.innerHTML=" + menuElement.innerHTML);
		
		if(menuElement.parentNode == menu) menu.removeChild(menuElement);
		else throw new Error("menuElement not part of menu! menuElement.innerHTML=" + menuElement.innerHTML + "\nmenu.innerHTML=" + menu.innerHTML + "\nmenuElement.parent.innerHTML=" + menuElement.parent.innerHTML);
		
		return positionIndex; // So another node can be inserted at this position
		
		function getItemPosition(child) {
			var i = 0;
			while( (child = child.previousSibling) != null ) i++;
			return i;
		}
		
	}
	
	EDITOR.addTempMenuItem = function(htmlText, addSeparator, callback) {
		/*
			These items are removed when the menu is hidden
		*/
		
		if(typeof addSeparator == "function" && callback == undefined) {
			callback = addSeparator;
			addSeparator = true;
		}
		
		if(addSeparator == undefined) addSeparator = true;
		
		
		//var menu = document.getElementById("canvasContextmenu");
		var tempItems = document.getElementById("canvasContextmenuTemp");
		
		var li = document.createElement("li");
		
		var bullet = document.createElement("span");
		bullet.setAttribute("class", "bullet inactive");
		
		li.appendChild(bullet);
		
		var menuText = document.createElement("span");
		menuText.setAttribute("class", "text");
		menuText.innerHTML = htmlText;
		
		li.appendChild(menuText);
		
		var keyCombo = EDITOR.getKeyFor(callback);
		var keyComboEl = document.createElement("span");
		keyComboEl.setAttribute("class", "key");
		if(keyCombo) keyComboEl.innerText = keyCombo;
		li.appendChild(keyComboEl);
		
		var separator =  document.createElement("li");
		separator.setAttribute("class", "sep");
		
		if(callback) li.onclick = function(clickEvent) {
			// Give the same function parameters as key bound events
			var file = EDITOR.currentFile;
			var combo = getCombo(clickEvent);
			var character = null;
			var charCode = 0;
			var direction = "down";
			callback(file, combo, character, charCode, direction, clickEvent);
		}
		
		tempItems.appendChild(li);
		
		// Add many: accept array?
		
		if(addSeparator) tempItems.appendChild(separator);
		
		//tempItems.insertBefore(menuElement, tempItems.firstChild);
		
		if(!menuIsFullScreen) {
			// Resize the menu
			var menu = document.getElementById("canvasContextmenu");
			var offsetHeight = parseInt(menu.offsetHeight); // height of the element including vertical padding and borders
			var offsetWidth = parseInt(menu.offsetWidth);
			var itemHeight = parseInt(li.offsetHeight);
			var posY = parseInt(menu.style.top);
			
			console.log("itemHeight=" + itemHeight);
			
			if(posY > (EDITOR.height - offsetHeight)) {
				posY = EDITOR.height - offsetHeight;
				menu.style.top = posY + "px";
			}
		}
		
		return li;
		
	}
	
	
	EDITOR.hideMenu = function() {
		
		console.log(UTIL.getStack("Hide menu"));
		
		var menu = document.getElementById("canvasContextmenu");
		
		if(menu.style.visibility == "hidden") {
			console.warn("Menu already hidden. No need to hide it!");
			return;
		}
		
		recoverFromFullScreenMenu(menu);
		
		// We can't use .display="none" or it will not be possible to measure the size of the menu!
		menu.style.visibility = "hidden";
		//.style.display="none";
		//menu.style.height = "1px";
		
		// Move it elsewhere so we don't see the ghost border in Android browser
		menu.style.top = -1000 + "px";
		menu.style.left = -1000 + "px";
		
		// Clear temorary menu items
		var tempItems = document.getElementById("canvasContextmenuTemp");
		while(tempItems.firstChild){
			tempItems.removeChild(tempItems.firstChild);
		}
		
		if(EDITOR.currentFile) EDITOR.input = true; // Give focus back for text entry
		
	}
	
	EDITOR.showMenu = function(posX, posY, clickEvent) {
		
		if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("menu") != -1) return new Error("Menu is disabled by query string!");;
		
		if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
		if(typeof clickEvent != "undefined" && typeof clickEvent.preventDefault == "function") clickEvent.preventDefault();
		
		clearSelection();
		if(menuVisibleOnce == false) EDITOR.renderNeeded();
		menuVisibleOnce = true;
		var menu = document.getElementById("canvasContextmenu");
		var notUpOnMenu = 6; // displace the menu so that the mouse-up event doesn't fire on it
		var menuDownABit = 10;
		
		//recoverFromFullScreenMenu(menu);
		
		var touchX = EDITOR.mouseX;
		var touchY = EDITOR.mouseY;
		
		if(posX === touchX || posX === undefined) posX = touchX + notUpOnMenu;
		
		if(posY === undefined) posY = touchY + menuDownABit;
		
		for(var i=0, f; i<EDITOR.eventListeners.showMenu.length; i++) {
			EDITOR.eventListeners.showMenu[i].fun(EDITOR.currentFile, posX, posY, clickEvent);
		}
		
		
		// Make sure it fits on the screen!!
		/*
			setTimeout(function() { // Wait for div content to load
			
			}, 100); 
		*/
		var offsetHeight = parseInt(menu.offsetHeight); // height of the element including vertical padding and borders
		var offsetWidth = parseInt(menu.offsetWidth);
		
		//alert("offsetHeight=" + offsetHeight + " offsetWidth=" + offsetWidth);
		
		console.log("menu: offsetHeight=" + offsetHeight + " offsetWidth=" + offsetWidth);
		
		/*
			When long touching the menu comes up underneath and a menu click is triggered!
			So bring in the menu outside of the touch, and then correct the position
		*/
		
		var orgX = posX;
		var orgY = posY;
		
		
		if((posY+offsetHeight) > EDITOR.height) posY = EDITOR.height - offsetHeight;
		if((posX+offsetWidth) > EDITOR.width) posX = EDITOR.width - offsetWidth;
		
		if(posX <= EDITOR.mouseX) {
			// Place the menu on the left side
			posX = EDITOR.mouseX - offsetWidth - notUpOnMenu;
		}
		
		if(posX < 0) posX = 0;
		if(posY < 0) posY = 0;
		
		var belowTouch = !((touchX < posX || touchX > posX + offsetWidth) && (touchY < posY || touchY > posY + offsetHeight));
		
		if(EDITOR.touchDown && belowTouch) {
			
			console.log("EDITOR.touchDown=" + EDITOR.touchDown + " belowTouch=" + belowTouch + " touchX=" + touchX + " posX=" + posX + 
			" offsetWidth=" + offsetWidth + " touchY=" + touchY + " posY=" + posY + " offsetHeight=" + offsetHeight + 
			" orgX=" + orgX + " orgY=" + orgY + " EDITOR.width=" + EDITOR.width + " EDITOR.height=" + EDITOR.height + 
			" menu.style.width=" + menu.style.width + " menu.style.height=" + menu.style.height);
			
			menu.style.top = orgY + "px";
			menu.style.left = orgX + "px";
			
			var interval = setInterval(waitForTouchUp, 50);
			var timeout = setTimeout(giveUp, 1500);
		}
		else {
			menu.style.top = posY + "px";
			menu.style.left = posX + "px";
		}
		
		menu.style.visibility = "visible";
		//menu.style.display="block";
		
		//menu.style.height = "100%";
		
		function waitForTouchUp() {
			if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
			if(typeof clickEvent != "undefined" && typeof clickEvent.preventDefault == "function") clickEvent.preventDefault();
			clearSelection();
			
			var offsetHeight = parseInt(menu.offsetHeight);
			if((posY+offsetHeight) > EDITOR.height) posY = EDITOR.height - offsetHeight;
			
			if(!EDITOR.touchDown) {
				console.log("There where no touch down!");
				giveUp();
				
				if(offsetHeight > EDITOR.height || offsetWidth*2 > EDITOR.width) {
					// Hide everything besides the menu
					fullScreenMenu(menu);
				}
				else {
					menu.style.top = posY + "px";
					menu.style.left = posX + "px";
				}
			}
			else {
				console.log("There was a touch down!");
				//menu.style.top = posY + "px";
				//menu.style.left = posX + "px";
			}
		}
		
		function giveUp() {
			clearInterval(interval);
			clearTimeout(timeout);
		}
		
	}
	
	EDITOR.addInfo = function(row, col, textString, file, lvl) {
		// Will display a talk bubble (plugin/render_info.js)
		
		if(file == undefined) file = EDITOR.currentFile;
		if(! file instanceof File) throw new Error("Third argument file is supposed to be a File object");
		if(lvl == undefined) lvl = 3; // 1=Err 2=Warn 3=Info
		
		console.log("EDITOR.addInfo! row=" + row + " col=" + col + " textString=" + textString + " file.path=" + file.path);
		
		console.time("addInfo");
		
		var info = EDITOR.info;
		
		if(info.length > 100) {
			console.warn("Too many info messages! Resetting!");
			info.length = 0;
		}
		
		if(!file) throw new Error("No file!");
		if(file.grid.length <= row) throw new Error("file only has " + file.grid.length + " rows!" +
		" Unable to place info message on row=" + row);
		
		// Convert the text to an array, one line per row
		var txt = textString.split("\n");
		
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
			
			// Remove all text at next editor interaction ?
			// nope: They will be removed when moving the cursor
			/*
				EDITOR.onNextInteraction(function(ev) {
				console.log("editor interaction ev=", ev);
				if(ev == "mouseMove") return;
				console.warn("Clearing info! row=" + row + " col=" + col + " txt=" + JSON.stringify(txt));
				EDITOR.removeAllInfo(file, row, col);
				});
			*/
			
			// Check if there's already info on that positioin
			for(var i=0; i<info.length; i++) {
				if(info[i].row == row && info[i].col == col) {
					
					if(info[i].str == textString) info[i].count++;
					else {
						// Add text ...
						// Adding too many info boxes can freeze the computer because we'll run out of memory!
						if(info[i].text.length > 100) return console.warn("Too many info messages added to row=" + row + " and col=" + col);
						
						for(var j=0; j<imgArray.length; j++) {
							info[i].text.push(imgArray[j]);
						}
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
					text: imgArray,
					file: file,
					lvl: lvl,
					str: textString,
					count: 1
				});
			}
			
			console.timeEnd("addInfo");
			
			console.log("Info added on row=" + row + " col=" + col + " textString=" + textString + " file.path=" + file.path);
			// todo: only re-render if the info is in view
			EDITOR.renderNeeded();
			EDITOR.render();
			
		}
		
		function makeImage(item) {
			console.log("makeImage item=" + item);
			htmlToImage(item, function(img) {
				imgArray.push(img);
				
				console.log("imagesToMake=" + imagesToMake);
				console.log("imagesMade=" + imagesMade);
				
				if(++imagesMade == imagesToMake) {
					allImagesMade();
				}
			});
		}
		
	}
	
	EDITOR.removeAllInfo = function(file, row, col) {
		// Find the item in the array, then splice it ...
		
		console.log(UTIL.getStack("EDITOR.removeAllInfo!"));
		
		if(!(file instanceof File)) throw new Error("Firs argument file=" + file + " needs to be a file object!");
		
		var info = EDITOR.info;
		
		for(var i=0; i<info.length; i++) {
			if(info[i].file == file && (info[i].row == row || row == undefined) && (info[i].col == col || col == undefined)) {
				
				console.warn("Removing info from row=" + row + " col=" + col);
				
				// Remove info
				info.splice(i,1);
				
				// Call removeAllInfo again, just to make sure ALL is removed
				EDITOR.removeAllInfo(file, row, col);
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
		
		// Calling render here (efter each key event) seems to be the fastest (faster then requestAnimationFrame)
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
		console.log("Adding render: " + UTIL.getFunctionName(fun));
		if(EDITOR.renderFunctions.indexOf(fun) != -1) throw new Error("The function is already registered as a renderer: " + UTIL.getFunctionName(fun));
		return EDITOR.renderFunctions.push(fun) - 1;
	}
	EDITOR.removeRender = function(fun) {
		console.log("Removing render: " + UTIL.getFunctionName(fun));
		return removeFrom(EDITOR.renderFunctions, fun)
	}
	
	EDITOR.addPreRender = function(renderFunction) {
		// pre-renders modifies the buffer and returns the buffer, for example adding colors
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
			
			The function should return an array with possible auto-complete options, or optionally, an array of arrays 
			where the second index is how many characters the caret should be moved left - after inserting the text.
			
			Ex: [word1, word2, word3] or [[wordl, n], [word2, n]]
			
		*/
		
		if(!file) file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!EDITOR.input) return true;
		
		var wordDelimiters = " {}+-/<>\r\n!";
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
		
		var ret, fun, addWord, addMcl, functionArguments;
		
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
							functionArguments = ret[j][2];
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
			for(var i=0, opt; i<options.length; i++) {
				opt =  options[i];
				opt = opt.replace(new RegExp(file.lineBreak,"g"), " ");
				opt = opt.replace(/</g, "&lt;"); // Because EDITOR.addInfo takes HTML
				opt = opt.replace(/>/g, "&gt;");
				EDITOR.addInfo(file.caret.row, file.caret.col, opt);
			}
			
		}
		else if(options.length == 1) {
			completeWord(word, options[0], mcl[0]);
			if(functionArguments && functionArguments.length > 0) EDITOR.addInfo( file.caret.row, file.caret.col, functionArguments.join(",") );
			
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
		
		if(!(file instanceof File)) {
			file = EDITOR.files[file];
		}
		
		if(!file) throw new Error("file=" + file + " need to be a File object or a path to an open file");
		
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
		if(RUNTIME=="nw.js") {
			var gui = require('nw.gui');
			var win = gui.Window.get();
			win.title = file.path;
		}
		else if(RUNTIME=="browser") {
			window.title = file.path;
			document.title = file.path;
			window.status = file.path;
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
		
		//console.log("getKeyFor: funName=" + funName);
		
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
			//console.log(UTIL.getFunctionName(f.fun) + " == " + funName + " ?");
			if(UTIL.getFunctionName(f.fun) == funName) {
				
				//console.log(funName + " !!");
				
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
				
				//console.log("getKeyFor: funName=" + funName + " combo=" + combo + " character=" + character);
				
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
		
		var disable = [];
		
		// Make sure the function name is unique. It needs to be unique to be able to unbind it. Unique names also makes it easier to debug
		var funName = UTIL.getFunctionName(b.fun);
		if(funName == "") throw new Error("Key binding function can not be anonymous!")
		for(var i=0; i<keyBindings.length; i++) {
			if(UTIL.getFunctionName(keyBindings[i].fun) == funName) {
				throw new Error("The function name=" + funName + " is already used by another key binder. Please use an uniqe function name!")
			}
			if(keyBindings[i].charCode == b.charCode && keyBindings[i].combo == b.combo) {
				if(b.disableOthers) disable.push(keyBindings[i]);
				else {
					// It's OK to bind the same key combo do many things, eg Esc key, but we should give a warning:
					UTIL.getStack("There's already a key binding (" + UTIL.getFunctionName(keyBindings[i].fun) + ") for charCode=" + b.charCode + " and combo=" + b.combo + " !");
				}
			}
		}
		
		for (var i=0; i<disable.length; i++) {
			keyBindings.splice( keyBindings.indexOf(disable[i], 1) );
		}
		
		keyBindings.push(b);
		
		return disable; // Allows key bindings that disable others to enable the other 
		
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
	
	var pluginSortOrder = 1000;
	EDITOR.plugin = function(p) {
		/*
			If you have made a plugin. Use EDITOR.plugin(desc, load, unload) instead of EDITOR.on("start") !
			Plugins will load when the editor has started. Right after "eventListeners.start"
		*/
		
		if((typeof p.load !== "function")) throw new Error("The plugin needs to have a load method!");
		
		if((typeof p.unload !== "function")) throw new Error("The plugin should have a unload method!");
		if(!p.desc) throw new Error("The plugin should have a description!");
		
		if(typeof p.order != "number") p.order = ++pluginSortOrder; // Will be sorted ASC
		
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
		
		var defaultTestOrder = 1000;
		if(order == undefined) order = defaultTestOrder;
		
		for(var i=0; i<EDITOR.tests.length; i++) {
			if(EDITOR.tests[i].text == funName) {
				if(windowLoaded) {
					console.log("Overloading test function name=" + funName + " !");
					EDITOR.tests.splice(i, 1);
					break;
				}
				else throw new Error("Test function name=" + funName + " already exist!");
			}
			// It's a bit annoying if you have set a test to load first, but forgot to remove the order from some other test ...
			// This will show which function that also has been ordered to run first
			if(order == 1 && order < defaultTestOrder && EDITOR.tests[i].order <= order) {
				throw new Error("order=" + order + " defaultTestOrder=" + defaultTestOrder + " EDITOR.tests[" + i + "].order=" + EDITOR.tests[i].order + 
				"  Remove order from test '" + EDITOR.tests[i].text + "' if you want " + funName + " to run first!\n" + UTIL.getStack("test"));
			}
		}
		
		EDITOR.tests.push({fun: fun, text: funName, order: order});
		
		// Sort the tests by order
		EDITOR.tests.sort(function sortTests(a, b) {
			return a.order - b.order;
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
				
				if(err.code != "ENOENT") alertBox("Unable to check if folder=" + folderName + " exist in pathToParentFolder=" + pathToParentFolder + "\n" + err.message);
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
		/*
			Returns all files in a directory as an array. Each item is an object with these properties:
			
			type - string - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
			name - string - File or folder name
			path - string - Full path to file/folder
			size - float - The size of the entry in bytes.
			date - Date - The last modified date of the entry.
		*/
		
		if(pathToFolder == undefined) throw new Error("pathToFolder=" + pathToFolder);
		
		pathToFolder = UTIL.trailingSlash(pathToFolder);
		
		if(pathToFolder == undefined) throw new Error("Need to specity a pathToFolder!");
		if(listFilesCallback == undefined) throw new Error("Need to specity a callback!");
		
		var json = {pathToFolder: pathToFolder};
		
		CLIENT.cmd("listFiles", json, function listFilesResp(err, fileList) {
			if(err) listFilesCallback(err);
			else listFilesCallback(null, fileList);
		});
		
	}
	
	
	EDITOR.createPath = function(directoryPathToCreate, createPathCallback) {
		/*
			Traverse the path and try to creates the directories, then check if the full path exists
			
		*/
		
		console.log("createPath: " + directoryPathToCreate);
		
		var lastCharOfPath = directoryPathToCreate.substr(directoryPathToCreate.length-1);
		if(lastCharOfPath != "/" && lastCharOfPath != "\\") throw new Error("Last character is not a file path delimiter: " + directoryPathToCreate);
		
		var json = {pathToCreate: directoryPathToCreate};
		CLIENT.cmd("createPath", json, function(err, json) {
			if(err) {
				if(createPathCallback) createPathCallback(err);
				else throw err;
			}
			else {
				if(createPathCallback) createPathCallback(null, json.path);
				else console.log("Path created: " + json.path);
			}
		});
		
	}
	
	EDITOR.mock = function(mock, options) {
		
		// Simulate ... 
		
		if(mock == "keydown") {
			if(!options.charCode) throw new Error("options need to contain charCode");
			if(!options.target) options.target = "fileCanvas";
			
			if(!options.target.className) options.target = {className: options.target}; // Shorter to write
			
			// Also specify options.shiftKey, otions.altKey and options.ctrlKey witch can be true
			
			options.type ="mock-keydown";
			
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
			var copyEvent = {
				clipboardData:  {
					setData: function setData(format, data) { return true; }
				},
				preventDefault: function preventDefault() { return true; }
			};
			
			return copy(copyEvent);
		}
		else if(mock == "paste") {
			var pasteEvent = {
				clipboardData:  {
					getData: function getData(what) { return options.data; }
				},
				preventDefault: function preventDefault() { return true; }
			};
			paste(pasteEvent);
		}
		else if(mock == "doubleClick") {
			if(!options.hasOwnProperty("x")) throw new Error("x coordinate required in options!");
			if(!options.hasOwnProperty("y")) throw new Error("y coordinate required in options!");
			if(!options.hasOwnProperty("target")) options.target = "fileCanvas";
			if(!options.hasOwnProperty("button")) options.button = 0; // 0=Left mouse button, 2=Right mouse button, 1=Center?
			
			if(!options.target.className) options.target = {className: options.target}; // Shorter to write
			
			var doubleClickEvent = {clientX: options.x, 
				offsetX: options.x, 
				clientY: options.y, 
				offsetY: options.y, 
				target: options.target, 
				button: options.button,
				preventDefault: function() {console.log("Mocked doubleClick event prevent default.")}
				
			}
			console.log(doubleClickEvent);
			
			mouseDown(doubleClickEvent);
			mouseUp(doubleClickEvent);
			mouseDown(doubleClickEvent);
			mouseUp(doubleClickEvent);
		}
	}
	
	EDITOR.isBlanc = function (x, y, width, height) {
		// todo: for debugging. Returns true if the screen area is the same as the background
	}
	
	EDITOR.createWidget = function(buildFunction, parentNode, id) {
		
		// Some boilderplate/abstraction for creating HTML form widget, 
		
		var widget = {mainElement: null, visible: false};
		
		// When this function is created, DOM does not exist!
		
		widget.build = function buildWidget() {
			
			// But when this function is called, the DOM *will* exist!
			
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
		
		widget.show = function showWidget(options) {
			
			if(options == undefined) options = {};
			
			console.log("Showing widget ...");
			
			if(options.stealFocus !== false) {
				EDITOR.input = false; // Steal focus from the file
			}
			
			if(!widget.mainElement) widget.build(); // Build the GUI if it's not already built
			
			widget.mainElement.style.display = "block";
			
			//if(options.stealFocus === false) widget.blur();
			
			EDITOR.resizeNeeded();
			
			widget.visible = true;
			
			var browser = UTIL.checkBrowser();
			if(browser == "Firefox") {
				// Firefox waits some time before moving the elements if they don't fit ...
				setTimeout(function firefoxLag() {
					EDITOR.resizeNeeded();
				}, 500);
			}
			
			return false;
		}
		
		widget.hide = function showWidget() {
			
			console.log("Hiding widget ...");
			
			var wasHidden = true;
			
			if(EDITOR.currentFile) EDITOR.input = true; // Bring back focus to the current file
			
			// Only need to hide if the object is created!
			if(widget.mainElement) {
				
				if(!widget.mainElement.style.display != "none") wasHidden = false;
				
				widget.mainElement.style.display = "none";
				EDITOR.resizeNeeded();
			}
			
			widget.visible = false;
			
			return wasHidden;
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
	
	/*
		// Test if there's a popup stopper:
	setTimeout(function() {
		EDITOR.createWindow();
	}, 2000);
	*/
	
	EDITOR.openWindows = [];
	EDITOR.createWindow = function(options, callback) {
		// A callback is needed because we might have to show a button for the user to click to open the new window (if the browser has a popup stopper)
		
		if(typeof options != "object") throw new Error("options need to be an object (with at least a url property) !");
		if(typeof callback != "function") throw new Error("EDITOR.createWindow needs a callback function as second parameter! callback=" + callback + " (" + (typeof callback) + ")");
		
		var url = options.url;
		var width = options.width;
		var height = options.height;
		var top = options.top;
		var left = options.left;
		var waitUntilLoaded = options.waitUntilLoaded || false;
		
		if(!url) throw new Error("Provide an url option argument to EDITOR.createWindow to avoid using window.location redirects! " +
		"We can not capture events on window.location redirect's until it has loaded, so you might miss some early events, like errors.");
		/*
			If it's blocked by the browser's built in popup stopper we'll show a button telling the user to click it to open the window
			
			Tip: You can set url to about:blank and then close/reopen the window when you know what url to load. 
			Some browsers (Chrome) will allow the popup if another window is closed prior.
			*/ 
		
		console.warn("Creating new window url=" + url);
		
		// Decide window width, height and placement ...
		// Some browsers (which?) will not allow us to change these via script after the window have has been created (so we must set them here).
		var windowPadding = 0;
		var unityLeftThingy = 10;
		var previeWidth = width || Math.round(screen.width / 3.5) - windowPadding * 2;
		var previewHeight = height || screen.height - windowPadding * 2;
		var posX = left || screen.width - previeWidth - windowPadding;
		var posY = top || windowPadding;
		
		// Self resize so that the created Window will be visible even if the main window is focused
		window.resizeTo(screen.width - previeWidth - windowPadding * 2 - unityLeftThingy, screen.height);
		// You can't resize a window or tab that wasn’t created by window.open.
		// You can't resize a window or tab when it’s in a window with more than one tab.
		
		//if(url == undefined) url = window.location.href.replace(/\/.*/, "/dummy.htm");
		if(url == undefined) url = "about:blank";
		
		var theWindow = open(url);
			
		if(theWindow != null) testWindow(theWindow);
		else {
			// If something goes wrong, for example if the window is stopped by a popup stopper, theWindow will be null
			
			var failText = "The new window was most likely blocked by a popup blocker. " +
			"Click OK to retry opening it. (enable popups from " + document.domain + " to get rid of this message)"
			
			var errorText = "Could not open the window. Please disable the popup stopper!"
			
			/*
				// native confirm dialog did not enable the window!
				var tryAgain = confirm(failText);
			if(tryAgain) theWindow = open(url);
			*/
			
			var ok = "OK";
			confirmBox(failText, [ok], function(answer) {
			if(answer == ok) {
					theWindow = open(url);
					// Kinda annoying if the user clicks "allow window" after clicking OK. Not much we can do about that !?
					if(!theWindow) return callback(new Error(errorText));
					else return testWindow(theWindow);
				}
				else callback(new Error(errorText));
				});
		}
		
		function testWindow(theWindow) {
			
			// Due to CORS we might get errors accessing properties on the new window
			try {
				var test = theWindow.document.domain;
				}
				catch(err) {
				return callback(new Error("Unable to access " + url + " \n" + err.message));
				}
			
			/*
				Problem: It's impossible to tell if the window has finished loading. eg. if we attach a load event listener to it, it might never fire!
				Chrome always gives document.readyState=complete even if it has not finished loading.
				Firefox gives document.readyState=uninitialized
				We can however check for theWindow.location.href that will be about:blank until the window has loaded!
				(window.location.href will be populated at DOMContentLoaded)
				
			*/
			console.log("theWindow.location.href = " + theWindow.location.href);
			console.log("New window: " + (new Date()).getTime() + " document.readyState=" + theWindow.document.readyState + " theWindow.location.href=" + theWindow.location.href);
			console.log("theWindow.document.documentElement.innerHTML=" + theWindow.document.documentElement.innerHTML);
			
			if(theWindow.location.href == "about:blank") theWindow.loaded = false; 
else theWindow.loaded = true;
			
			// window.location wont be populated until DOMContentLoaded! So it's impossible to check if the URL is blank or not! Thus:
			if(url == "about:blank") theWindow.isBlankUrl = true;
			
			theWindow.addEventListener("load", function() {
				console.log("New window: " +  UTIL.timeStamp() + " load event!");
				console.log("theWindow.location.href = " + theWindow.location.href);
				/*
					document.readyState === "complete" does not mean everything has loaded!
					So because it's impossible to tell if the window has loaded or not,
					we will give the window object a new property: loaded (true or undefined)
					
					What if the window was loaded until we got here (theWindow.addEventListener("load") ? Nightmare!
					
				*/
if(theWindow.loaded === true) throw new Error("It seems the window has already loaded!!"); // Sanity check
				theWindow.loaded = true; 
				if(waitUntilLoaded) callback(null, theWindow);
			}, false);
			theWindow.addEventListener("DOMContentLoaded", function() {
				console.log("New window: " + UTIL.timeStamp() + " DOMContentLoaded event! theWindow.document.readyState changed to: " + theWindow.document.readyState); 
				console.log("theWindow.location.href = " + theWindow.location.href);
			}, false);
			
				console.log("theWindow.document.domain=" + theWindow.document.domain);
				console.log("document.domain=" + document.domain);
				
				if(!url) {
				theWindow.document.open();
				theWindow.document.write("<!DOCTYPE html><head></head><body><p>Loading ...</p></body>");
				theWindow.document.close();
				}
				
				EDITOR.openWindows.push(theWindow); // So that they can be convinently closed on reload
				
			if(!waitUntilLoaded) return callback(null, theWindow);
			}
		
		function open(url) {
			if(!url) url = "about:blank";
			var windowId = "previewWindow" + (EDITOR.openWindows.length + 1);
			
			return window.open(url, windowId, "height=" + previewHeight + ",width=" + previeWidth + ",top=" + posY + ",left=" + posX + ",location=no");
			}
		
	}
	
	// Tools for handling repositories (Mercurial, Git, etc)
	EDITOR.commitTool = function commitTool(directory) {
		console.log("Calling commitTool listeners (" + EDITOR.eventListeners.commitTool.length + ")");
		for(var i=0, f; i<EDITOR.eventListeners.commitTool.length; i++) {
			EDITOR.eventListeners.commitTool[i].fun(directory);
		}
	}
	
	EDITOR.resolveTool = function resolveTool(resolved, unresolved, directory) {
		console.log("Calling resolveTool listeners (" + EDITOR.eventListeners.resolveTool.length + ")");
		for(var i=0, f; i<EDITOR.eventListeners.resolveTool.length; i++) {
			EDITOR.eventListeners.resolveTool[i].fun(resolved, unresolved, directory);
		}
	}
	
	EDITOR.mergeTool = function mergeTool(directory) {
		console.log("Calling mergeTool listeners (" + EDITOR.eventListeners.mergeTool.length + ")");
		for(var i=0, f; i<EDITOR.eventListeners.mergeTool.length; i++) {
			EDITOR.eventListeners.mergeTool[i].fun(directory);
		}
	}
	
	EDITOR.runTests = function runTests() {
		
		if(EDITOR.workingDirectory != "/" && EDITOR.workingDirectory != "/wwwpub/") return alertBox("Make sure you are running under chroot and with a dummy user before running tests!\
		(Working directory (" + EDITOR.workingDirectory + ") needs to be / (root))");
		
		EDITOR.changeWorkingDir("/");
		
		runTests_5616458984153156();
		return true;
	}
	
	EDITOR.deleteFile = function(filePath, callback) {
		
		console.log("Deleting filePath=" + filePath);
		
		var json = {filePath: filePath};
		
		CLIENT.cmd("deleteFile", json, function(err, json) {
			if(err) {
				if(callback) callback(err);
				else throw err;
			}
			else {
				if(callback) callback(err, json.filePath);
			}
		});
	}
	
	
	EDITOR.dashboard = {
		addWidget: function(el) {
			
			if(typeof el == "function") throw new Error("Parameter el in EDITOR.addDashboardWidget is a function. Expected a HTML DOM Node!");
			
			var dashboard = document.getElementById("dashboard");
			console.log(dashboard);
			try {
				var child = dashboard.appendChild(el);
			}
			catch(err) {
				console.log("addDashboardWidget: el:");
				console.log(el);
				throw err;
			}
			
			return child;
		},
		removeWidget: function(el) {
			var dashboard = document.getElementById("dashboard");
			
			try {
				var removedNode = dashboard.removeChild(el);
			}
			catch(err) {
				console.log("removeDashboardWidget: el:");
				console.log(el);
				throw err;
			}
			return removedNode;
		},
		hide: function hideDashboard() {
			var dashboard = document.getElementById("dashboard");
			dashboard.style.display = "none";
			EDITOR.dashboard.isVisible = false;
			return true;
		},
		show: function showDashboard() {
			var dashboard = document.getElementById("dashboard");
			dashboard.style.display = "block";
			EDITOR.dashboard.isVisible = true;
			return true;
		},
		isVisible: false
	}
	
	EDITOR.openFileTool = function fileOpenTool(directory) {
		console.log("Calling openFileTool listeners (" + EDITOR.eventListeners.openFileTool.length + ")");
		
		var ret = false;
		
		for(var i=0, f; i<EDITOR.eventListeners.openFileTool.length; i++) {
			ret = EDITOR.eventListeners.openFileTool[i].fun(directory);
			if(ret === true) break; // Only open one tool
		}
		
		return ret;
	}
	
	EDITOR.previewTool = function previewTool(file, ev) {
		
		if(file == undefined && EDITOR.currentFile) file = EDITOR.currentFile;
		
		if(! file instanceof File) throw new Error("First argument file need to be a File object!");
		
		// Must pass the (click) event so plugins can know if shift,ctrl etc was pressed
		console.log("ev.constructor.name=" + ev.constructor.name);
		if(typeof ev != "object") throw new Error("Second argument ev needs to be an event object!");
		
		
		console.log("Calling previewTool listeners (" + EDITOR.eventListeners.previewTool.length + ")");
		
		var ret = false;
		
		var combo = getCombo(ev);
		
		for(var i=0, f; i<EDITOR.eventListeners.previewTool.length; i++) {
			ret = EDITOR.eventListeners.previewTool[i].fun(file, combo);
			if(ret === true) break; // Only open one tool
		}
		
		return ret;
	}
	
	EDITOR.fileExplorer = function fileExplorerTool(directory) {
		console.log("Calling fileExplorer listeners (" + EDITOR.eventListeners.fileExplorer.length + ")");
		
		var ret = false;
		
		for(var i=0, f; i<EDITOR.eventListeners.fileExplorer.length; i++) {
			ret = EDITOR.eventListeners.fileExplorer[i].fun(directory);
			if(ret === true) break; // Only open one tool
		}
		
		return ret;
	}
	
	EDITOR.renameFile = function renameFile(oldPath, newPath, callback) {
		// Same as moving a file
		
		console.log("Renaming oldPath=" + oldPath + " to newPath=" + newPath);
		
		if(callback == undefined) throw new Error("Expected third function parameter to be a callback!");
		
		if(oldPath == newPath) return callback(new Error("Old path is the same as the newPath=" + newPath));
		
		if(EDITOR.files.hasOwnProperty(newPath)) return callback(new Error("There is already a file open with path=" + newPath));
		
		
		
		//if(!file.saved || !file.savedAs) return callback(new Error("Save the file before renaming it!"));
		
		CLIENT.cmd("rename", {oldPath: oldPath, newPath: newPath}, function(err, json) {
			if(err) return callback(err);
			
			if(EDITOR.files.hasOwnProperty(oldPath)) {
				// File is opened in the editor!
				// We must close and reopen the file so that plugins keeping track of open files do not go nuts.
				
				var file = EDITOR.files[oldPath];
				
				// Save the text, do not count on the garbage collector the be "slow"
				var text = file.text; 
				var state = {
					isSaved: file.isSaved,
					changed: file.changed,
					savedAs: file.savedAs
				}
				
				var doNotSwitchFile = true;
				EDITOR.closeFile(file.path, doNotSwitchFile);
				EDITOR.openFile(newPath, text, state, function(openFileErr, newFile) {
					
					if(openFileErr) throw openFileErr;
					
					callback(null, newFile.path);
					
				});
			}
			else callback(null, newPath);
			
		});
		
	}
	
	EDITOR.callEventListeners = function callEventListeners(ev, file, allListenersCalled) {
		/*
			Generic function for calling event listeners.
			Each event listener gets file and callback as parameters
			And must return true(ish) or call the callback function, or the event-listener is considered failed
			
			allListenersCalled will be called with an array of errors as the first parameter
		*/
		
		var waitingFor = [];
		var eventFunsCalled = 0;
		var errors = [];
		var alreadyTooLate = false;
		var eventListeners = EDITOR.eventListeners[ev];
		var uniqueFunctionNames = [];
		var returnedOrCalledBack = [];
		
		for(var i=0; i<eventListeners.length; i++) {
			callListener(eventListeners[i].fun);
		}
		
		if(waitingFor.length > 0) {
			var maxWait = 5;
			var waitCounter = 0;
			var checkInterval = setInterval(checkIfReturnedOrCalledCallback, 1000);
		}
		
		function callListener(fun) {
			var fName = UTIL.getFunctionName(fun);
			
			if(!fName) throw new Error("A " + ev + " event listener function has no name!");
			if(uniqueFunctionNames.indexOf(fName) != -1) throw new Error("There is already a " + ev + " event listener function named " + fName + ". Event function names need to be unique!");
			uniqueFunctionNames.push(fName);
			
			waitingFor.push(fName);
			console.log("Calling " + ev + " eventListener: " + fName);
			var ret = fun(file, evCallback);
			eventFunsCalled++;
			console.log(ev + " event listener " + fName + " returned " + ret + " (" + (typeof ret) + ")");
			if(ret) evCallback(null);// The function did not return void, asume it's done!
			
			function evCallback(err) {
				console.log("Got " + ev + " event callback from " + fName + " err=" + err);
				if(returnedOrCalledBack.indexOf(fName) != -1) throw new Error(fName + " has already returned or called back!");
				returnedOrCalledBack.push(fName);
				
				if(err) errors.push(err);
				var index = waitingFor.indexOf(fName);
				if(index == -1) throw new Error(fName + " not in " + JSON.stringify(waitingFor) + " it might already have returned or called back!" +
				" Make sure " + fName + " either return something true:ish or calls the callback. Not both!");
				
				waitingFor.splice(index, 1);
				if(waitingFor.length == 0 && returnedOrCalledBack.length == eventListeners.length && !alreadyTooLate) {
					if(checkInterval) clearInterval(checkInterval);
					allListenersCalled(errors);
				}
				return;
			}
		}
		
		function checkIfReturnedOrCalledCallback() {
			console.warn("The following listeners has not yet returned or called back: " + JSON.stringify(waitingFor));
			
			if(++waitCounter >= maxWait) {
				clearInterval(checkInterval);
				errors.push(new Error("The following event listeners failed to return something trueish or call back in a timely fashion: " + JSON.stringify(waitingFor)));
				alreadyTooLate = true;
				allListenersCalled(errors);
			}
			
		}
		
	}
	
	
	
	// # Virtual keyboard
	var virtualKeyboardElement;
	var virtualKeyboard = {};
	EDITOR.virtualKeyboard = {
		addKey: function addVirtualKeyboardKey(newElement, row, position, group) {
			console.log("Adding virtual keyboard key: row=" + row + " position=" + position + " group=" + group);
			if(group == undefined) group = "main";
			if(row == undefined) row = 0;
			if(!virtualKeyboard.hasOwnProperty(group)) throw new Error("The virtual keyboard has no group called " + group);
			
			if(!virtualKeyboard[group].rows[row]) {
				for (var i=virtualKeyboard[group].rows.length-1; i<row; i++) {
					virtualKeyboard[group].rows[row] = document.createElement("nobr");
					virtualKeyboard[group].rows[row].setAttribute("class", "virtualKeyboardRow");
					virtualKeyboard[group].el.appendChild(virtualKeyboard[group].rows[row]);
				}
			}
			
			var parentElement = virtualKeyboard[group].rows[row];
			
			if(position == undefined) {
				virtualKeyboard[group].rows[row].appendChild(newElement);
			}
			else {
				
				if(position > parentElement.children.length) {
					throw new Error("Virtual keyboard row " + row + " only has " + 
					parentElement.children.length + " keys. So we can not insert on position " + position + " ");
				}
				
				parentElement.insertBefore(newElement, parentElement.children[position]);
				
				//virtualKeyboard[group].rows[row].appendChild(newElement);
			}
		},
		removeKey: function removeVirtualKeyboardKey(el, row, group) {
			virtualKeyboard[group].rows[row].removeChild(el);
		},
		hide: function hideVirutalKeyboard() {
			virtualKeyboardElement.style.display = "none";
			if(this.isVisible) EDITOR.resizeNeeded();
			else console.warn("Virtual keyboard already hidden!");
			this.isVisible = false;
		},
		show: function showVirutalKeyboard() {
			virtualKeyboardElement.style.display = "block";
			this.isVisible = true;
			EDITOR.resizeNeeded();
		},
		isVisible: true
		
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
	
	if(RUNTIME == "nw.js") {
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
	
	/*
		window.addEventListener("drop", fileDrop, false);
		window.ondrop = function(dropEvent) { dropEvent.preventDefault(); console.log("window.ondrop"); return false };
		window.ondragdrop = function(dragDropEvent) { dragDropEvent.preventDefault(); console.log("window.ondragdrop"); return false };
		window.ondragleave = function(dragLeaveEvent) { dragLeaveEvent.preventDefault(); console.log("window.ondragleave"); return false };
		window.ondragover = function(dragOver) { dragOver.preventDefault(); console.log("window.ondragover"); return false };
	*/
	
	window.addEventListener("dblclick", dblclick);
	
	
	window.addEventListener("load", main, false);
	window.addEventListener("resize", function(resizeEvent) {
		console.log("EVENT RESIZE!");
		EDITOR.resizeNeeded();
		EDITOR.renderNeeded();
		
		EDITOR.interact("resize", resizeEvent);
		
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
	window.addEventListener("contextmenu", function(contextMenuEvent) {
		contextMenuEvent = contextMenuEvent || window.event;
		contextMenuEvent.preventDefault();
		return false;
	}, false);
	
	
	// Modern browsers. Note: 3rd argument is required for Firefox <= 6
	if (window.addEventListener) {
		window.addEventListener('paste', paste, false);
	}
	// IE <= 8
	else {
		window.attachEvent('onpaste', paste);
	}
	
	window.onpaste = function() {alert("paste window");};
	
	window.addEventListener('copy', copy);
	//window.addEventListener('paste', paste);
	window.addEventListener('cut', cut);
	
	window.addEventListener("message", onMessage, false);
	
	
	// Fix annoying scrolling on Mobile
	window.addEventListener("scroll", preventMotion, false);
	//window.addEventListener("touchmove", function(e) {console.log(e);}, false);
	
	
	
	function preventMotion(event) {
		if(EDITOR.scrollingEnabled) return true;
		//return true;
		event.preventDefault();
		event.stopPropagation();
		window.scrollTo(0, 0);
		console.log("Prevented scroll!");
	}
	
	// End: Annoying scrolling fix
	
	
	function main() {
		
		console.log("Starting the editor ...");
		
		//alert("window.innerHeight=" + window.innerHeight + " window.innerWidth=" + window.innerWidth + " screen.width=" + screen.width + " screen.height=" + screen.height);
		
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
			
			// Clear info messages in this file
			EDITOR.removeAllInfo(file);
			
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
		
		virtualKeyboardElement = document.getElementById("virtualKeyboard");
		var virtualKeyboardGroups = document.getElementById("virtualKeyboardGroups");
		virtualKeyboard.main = {
			el: document.createElement("td"),
			rows: []
		}
		virtualKeyboard.main.el.setAttribute("class", "virtualKeyboardGroup");
		virtualKeyboardGroups.appendChild(virtualKeyboard.main.el);
		
		virtualKeyboard.misc = {
			el: document.createElement("td"),
			rows: []
		}
		virtualKeyboard.misc.el.setAttribute("class", "virtualKeyboardGroup");
		virtualKeyboardGroups.appendChild(virtualKeyboard.misc.el);
		
		EDITOR.virtualKeyboard.hide();
		
		
		
		canvas.onpaste = function() {alert("paste canvas");};
		
		// In order to get the drop event to fire you need to cancel the ondragenter and ondragover events!
		// Also make sure there are no drop or dragover events on window, document or parent elements!
		
		/*
			canvas.addEventListener("drop", function(e) {
			e.preventDefault();
			console.log(e.target.className + " drop");
			
			console.log(e.dataTransfer.files[0]);
			console.log(e.dataTransfer.files[0].name);
			console.log(e.dataTransfer.files[0].size + " bytes");
			
			return false;
			}, false);
			
			canvas.addEventListener("dragdrop", function(e) {
			e.preventDefault();
			console.log(e.target.className + " dragdrop");
			return false;
			}, false);
			
			canvas.addEventListener("dragenter", function(e) {
			e.preventDefault();
			console.log(e.target.className + " dragenter");
			e.dataTransfer.dropEffect = 'copy';  // required to enable drop on DIV
			console.log(e);
			
			return false;
			}, false);
			
			canvas.addEventListener("dragleave", function(e) {
			e.preventDefault();
			console.log(e.target.className + " dragleave");
			
			return false;
			}, false);
			
			
			
			document.addEventListener("dragstart", function(event) {
			
			console.log(e.target.className + " dragstart");
			
			// The dataTransfer.setData() method sets the data type and the value of the dragged data
			event.dataTransfer.setData("Text", event.target.id);
			
			// Output some text when starting to drag the p element
			document.getElementById("demo").innerHTML = "Started to drag the p element.";
			
			// Change the opacity of the draggable element
			event.target.style.opacity = "0.4";
			});
		*/
		
		canvas.addEventListener("dragover", function(dragOverEvent) {
			dragOverEvent.preventDefault();
			console.log(dragOverEvent.target.className + " dragover");
			
			//dragOverEvent.dataTransfer.dropEffect = 'copy';  // required to enable drop on DIV
			return false;
		}, false);
		
		canvas.ondrop = fileDrop;
		
		if(EDITOR.settings.sub_pixel_antialias == false) {
			ctx = canvas.getContext("2d");
			//console.warn("No sub_pixel_antialias! EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias);
		}
		else {
			ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias (LCD-text). 
		}
		
		// Set the font only once for performance
		ctx.font=EDITOR.settings.fontSize + "px " + EDITOR.settings.font;
		ctx.textBaseline = "top";
		
		EDITOR.canvas = canvas;
		EDITOR.canvasContext = ctx;
		
		EDITOR.resizeNeeded(); // We must call the resize function at least once at editor startup.
		
		
		keyBindings.push({charCode: EDITOR.settings.autoCompleteKey, fun: EDITOR.autoComplete, combo: 0});
		
		var isChromeApp = window.chrome && chrome.runtime && chrome.runtime.id;
		
		if(!isChromeApp) window.onbeforeunload = confirmExit;
		
		
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
		directoryDialogHtmlElement.addEventListener('change', function directorySelected(changeEvent) {
			
			console.log("Directory selected ...");
			
			if(directoryDialogCallback == undefined) {
				throw new Error("There is no listener for the open directory dialog!");
			}
			
			var file = changeEvent.target.files[0];
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
		
		
		
		// Attatch CLIENT listeners before plugins and start events load
		CLIENT.on("loginSuccess", function loggedInToServer(login) {
			
			EDITOR.user = login.user;
			
			EDITOR.installDirectory = login.installDirectory || "/";
			//alertBox(JSON.stringify(login));
			
			console.log("Logged in as user: " + EDITOR.user);
			
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
				// Treat EDITOR.storage as window.localStorage! Eg. It's all strings so you jave to JSON.parse !
				
				for(var i=0, fun; i<EDITOR.eventListeners.storageReady.length; i++) {
					fun = EDITOR.eventListeners.storageReady[i].fun;
					fun(_serverStorage);
				}
				
			});
			
		});
		
		CLIENT.on("connectionLost", function() {
			
			EDITOR.user = null;
			
		});
		
		
		
		
		
		
		
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
		calledStartListeners = true;
		
		
		
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
		
		//console.log("plugins: ");
		//EDITOR.plugins.map(function (p) {console.log(p.order + ": " + p.desc)});
		
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
		
		
		// Add the virtual keyboard menu item after the plugins so it will be placed low in the menu
		var virtualKeyboardMenuItem = EDITOR.addMenuItem("Virtual Keyboard", toggleVirtualKeyboard); // Add items to the canvas context menu
		
		function toggleVirtualKeyboard() {
			EDITOR.hideMenu();
			
			if(EDITOR.virtualKeyboard.isVisible) {
				EDITOR.virtualKeyboard.hide();
				EDITOR.updateMenuItem(virtualKeyboardMenuItem, false);
			}
			else {
				EDITOR.virtualKeyboard.show();
				EDITOR.updateMenuItem(virtualKeyboardMenuItem, true);
			}
			
		}
		
		
		if(RUNTIME != "browser") {
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
		
		EDITOR.runningTests = true;
		
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
				
				EDITOR.runningTests = false;
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
	
	function speechRecognitionResult(speechRecognitionEvent) {
		/*
			You need to be on localhost or httpS or you will get access error
			
			JSpeech Grammar Format:https://www.w3.org/TR/jsgf/
			
			
		*/
		
		// The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
		// The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
		// It has a getter so it can be accessed like an array
		// The [last] returns the SpeechRecognitionResult at the last position.
		// Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
		// These also have getters so they can be accessed like arrays.
		// The [0] returns the SpeechRecognitionAlternative at position 0.
		// We then return the transcript property of the SpeechRecognitionAlternative object
		
		if(speechRecognitionEvent == undefined) speechRecognitionEvent = event;
		
		var last = speechRecognitionEvent.results.length - 1;
		var speechResult = speechRecognitionEvent.results[last][0].transcript;
		//var speechResult = speechRecognitionEvent.results[0][0].transcript;
		
		console.log ("speechResult=" + speechResult);
		
		var file = EDITOR.currentFile;
		
		console.log("Calling voiceCommand listeners (" + EDITOR.eventListeners.voiceCommand.length + ")");
		for(var i=0, fun, re, match, captured; i<EDITOR.eventListeners.voiceCommand.length; i++) {
			fun = EDITOR.eventListeners.voiceCommand[i].fun;
			re = EDITOR.eventListeners.voiceCommand[i].re;
			if(re) {
				match = speechResult.match(re);
				if(match) {
					captured = fun(speechResult, file, match);
					if(captured != true && captured != false) throw new Error(UTIL.getFunctionName(fun) 
					+ ' did not return true or false (' + captured + ') to indicate if it "captured" the voice command.');
					if(captured === true) {
						break;
					}
				}
			}
			else fun(speechResult, file);
		}
		
		if(captured) EDITOR.hideMenu();
		
		
		if(!captured && EDITOR.lastElementWithFocus && (
		( EDITOR.lastElementWithFocus.nodeName == "INPUT" &&
		(EDITOR.lastElementWithFocus.type == "text" || EDITOR.lastElementWithFocus.type == "password")
		) || EDITOR.lastElementWithFocus.nodeName == "TEXTAREA")) {
			
			insertAtCaret(EDITOR.lastElementWithFocus, speechResult);
			
			//EDITOR.lastElementWithFocus.focus();
		}
		else if(file) EDITOR.addInfo(file.caret.row, file.caret.col, speechResult);
		
		
		console.log(speechRecognitionEvent);
	}
	
	function insertAtCaret(txtarea, text) {
		// https://stackoverflow.com/questions/1064089/inserting-a-text-where-cursor-is-using-javascript-jquery
		//var txtarea = document.getElementById(areaId);
		var scrollPos = txtarea.scrollTop;
		var caretPos = txtarea.selectionStart;
		
		var front = (txtarea.value).substring(0, caretPos);
		var back = (txtarea.value).substring(txtarea.selectionEnd, txtarea.value.length);
		txtarea.value = front + text + back;
		caretPos = caretPos + text.length;
		txtarea.selectionStart = caretPos;
		txtarea.selectionEnd = caretPos;
		txtarea.focus();
		txtarea.scrollTop = scrollPos;
	}
	
	function readSingleFile(fileOpenDialogEvent) {
		
		console.log("Reading single file ...");
		
		if(EDITOR.fileOpenCallback == undefined) {
			throw new Error("There is no listener for the open file dialog!");
		}
		
		var file = fileOpenDialogEvent.target.files[0];
		if (!file) {
			throw new Error("No file selected from the open-file dialog.");
			return;
		}
		
		var fileName = file.name;
		var filePath = file.path;
		var fileContent = undefined;
		
		if(RUNTIME == "browser") {
			
			filePath = fileName; // filePath is undefined in the browser
			
			// Read the file
			var reader = new FileReader();
			
			reader.onload = function(readerOnloadEvent) {
				fileContent = readerOnloadEvent.target.result;
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
	
	
	function chooseSaveAsPath(saveAsDialogEvent) {
		var file = saveAsDialogEvent.target.files[0];
		
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
	
	
	function fileDrop(fileDropEvent) {
		fileDropEvent.preventDefault();
		
		console.log("fileDrop");
		
		console.log(fileDropEvent);
		
		var text = fileDropEvent.dataTransfer.getData('Text');
		
		if(text) {
			// Drop the text into the current file
			if(EDITOR.currentFile) {
				
				// Get row and col
				var mouseX = fileDropEvent.offsetX;
				var mouseY = fileDropEvent.offsetY;
				var caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
				
				EDITOR.currentFile.insertText(text, caret);
				
			}
			else {
				// Create a new file with the dropped text
			}
			return;
		}
		
		if(fileDropEvent.dataTransfer.files.length == 0) return alertBox("The dropped object doesn't seem to be a file!");
		
		var file = fileDropEvent.dataTransfer.files[0];
		var filePath = file.path || file.name;
		
		var fileType = file.type;
		
		// The default action is to open the file in the editor.
		// But if the editor don't support the file, ask plugins what to do with it ...
		var handled = false;
		if(notSupported(fileType)) {
			
			console.log("Calling fileDrop listeners (" + EDITOR.eventListeners.fileDrop.length + ")");
			for(var i=0, h=false; i<EDITOR.eventListeners.fileDrop.length; i++) {
				h = EDITOR.eventListeners.fileDrop[i].fun(file);
				if(h) handled = true;
			}
			
			if(!handled) promptBox("Do you want to save the dropped " + fileType + " file ?", false, filePath, function(path) {
				if(path) saveFileFunction(path, function(err, path) {
					if(err) alertBox(err.message);
					else alertBox("The file has been saved: " + path);
				});
			});
			
		}
		else readFile();
		
		EDITOR.interact("fileDrop", fileDropEvent);
		
		return false;
		
		
		function saveFileFunction(filePath, callback) {
			var reader = new FileReader();
			reader.onload = function (readerEvent) {
				var data = readerEvent.target.result;
				
				// Specifying encoding:base64 will magically convert to binary! 
				// We do have to remove the data:image/png metadata though!
				data = data.replace("data:" + fileType + ";base64,", "");
				EDITOR.saveToDisk(filePath, data, callback, false, "base64");
			};
			reader.readAsDataURL(file); // For binary files (will be base64 encoded)
			
		}
		
		function notSupported(fileType) {
			
			return fileType && // Some files will have fileType=="" (most of them we want to open)
			fileType.indexOf("text") == -1 && 
			fileType.indexOf("javascript") == -1 && 
			fileType.indexOf("xml") == -1 && 
			fileType.indexOf("json") == -1;
			
		}
		
		
		function readFile() {
			
			var reader = new FileReader();
			
			reader.onload = function (readerEvent) {
				
				var content = readerEvent.target.result;
				
				
				console.log("Drop op: " + readerEvent.target);
				
				EDITOR.openFile(filePath, content);
				
			};
			console.log(file);
			//reader.readAsDataURL(file); // For binary files (will be base64 encoded)
			reader.readAsText(file);
			
			/*
				for (var i = 0; i < e.dataTransfer.files.length; ++i) {
				console.log(e.dataTransfer.files[i].path + "\n" + e.dataTransfer.files[i].data);
				UTIL.objInfo(e.dataTransfer.files[i]);
				}
			*/
		}
		
	};
	
	
	
	function onMessage(windowMessageEvent) {
		// For (example) recieving message from a page that has the editor embeded
		console.log("Window message from: origin=" + windowMessageEvent.origin);
		
		var msg = windowMessageEvent.data;
		
		if(msg.openFile) EDITOR.openFile(msg.openFile.name, msg.openFile.content, function fileOpened(err, file) {
			if(err) throw err;
			
			EDITOR.on("fileChange", function fileChanged(fileThatChanged, change, text, index, row, col) {
				if(fileThatChanged == file) parent.postMessage({
					fileUpdate: {
						name: msg.openFile.name,
						content: file.text
					}
				}, "*");
			});
			
		});
		else if(msg.disablePlugin) EDITOR.disablePlugin(msg.disablePlugin)
		else throw new Error("Unable to handle message: " + msg);
		
	}
	
	function copy(copyEvent) {
		
		console.log("copyEvent EDITOR.input=" + EDITOR.input + 
		" EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + 
		" giveBackFocusAfterClipboardEvent=" + giveBackFocusAfterClipboardEvent +
		" EDITOR.input=" + EDITOR.input);
		
		if(EDITOR.settings.useCliboardcatcher && giveBackFocusAfterClipboardEvent) {
			// Give focus back to the editor/canvas
			EDITOR.input = true;
			canvas.focus();
			giveBackFocusAfterClipboardEvent = false;
		}
		
		if(EDITOR.input) {
			
			var textToPutOnClipboard = "";
			
			if(EDITOR.currentFile) {
				textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
			}
			
			if(textToPutOnClipboard == "") console.warn("Nothing copied to clipboard!");
			
			if (browser.indexOf("MSIE") == 0) {
				window.clipboardData.setData('Text', textToPutOnClipboard);    
			} else {
				copyEvent.clipboardData.setData('text/plain', textToPutOnClipboard);
			}
			copyEvent.preventDefault();
			
		}
		// else: Do the default action (enable copying outside the canvas)
		
		//console.log("textToPutOnClipboard=" + textToPutOnClipboard);
		
		EDITOR.interact("copy", copyEvent);
		
		return textToPutOnClipboard;
		
	}
	
	function cut(cutEvent) {
		
		console.log("cutEvent EDITOR.input=" + EDITOR.input + " EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + " giveBackFocusAfterClipboardEvent=" + giveBackFocusAfterClipboardEvent);
		
		if(EDITOR.settings.useCliboardcatcher && giveBackFocusAfterClipboardEvent) {
			// Give focus back to the editor/canvas
			EDITOR.input = true;
			canvas.focus();
			giveBackFocusAfterClipboardEvent = false;
		}
		
		if(EDITOR.input) {
			
			var textToPutOnClipboard = "";
			
			if(EDITOR.currentFile) {
				textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
				
				// Delete the selected text
				EDITOR.currentFile.deleteSelection();
			}
			
			if(textToPutOnClipboard == "") console.warn("Nothing copied to clipboard!");
			
			if (browser.indexOf("MSIE") == 0) {
				window.clipboardData.setData('Text', textToPutOnClipboard);    
			} else {
				cutEvent.clipboardData.setData('text/plain', textToPutOnClipboard);
			}
			cutEvent.preventDefault();
		}
		
		// else: Do the default action (enable cutting outside the canvas)
		
		EDITOR.interact("cut", cutEvent);
	}
	
	
	function paste(pasteEvent) {
		
		console.log("pasteEvent EDITOR.input=" + EDITOR.input + 
		" EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + 
		" giveBackFocusAfterClipboardEvent=" + giveBackFocusAfterClipboardEvent);
		
		//var text = pasteEvent.clipboardData.getData('text');
		var ret;
		var textChanged = false;
		
		if (window.clipboardData && window.clipboardData.getData) { // IE
			var text = window.clipboardData.getData('Text');
		} else if (pasteEvent.clipboardData && pasteEvent.clipboardData.getData) {
			var text = pasteEvent.clipboardData.getData('text/plain');
		}
		else {
			alertBox("Unable to get platform/OS clipboard data!");
		}
		
		if(EDITOR.settings.useCliboardcatcher && giveBackFocusAfterClipboardEvent) {
			// Give focus back to the editor/canvas
			EDITOR.input = true;
			canvas.focus();
			giveBackFocusAfterClipboardEvent = false;
		}
		
		console.log("PASTE: " + UTIL.lbChars(text));
		
		if(EDITOR.input && EDITOR.currentFile) {
			
			pasteEvent.preventDefault();
			
			console.log("Calling paste listeners (" + EDITOR.eventListeners.paste.length + ") ...");
			for(var i=0, fun; i<EDITOR.eventListeners.paste.length; i++) {
				
				fun = EDITOR.eventListeners.paste[i].fun;
				
				ret = fun(EDITOR.currentFile, text, pasteEvent);
				
				if(EDITOR.settings.devMode) console.log("Paste listener: " + UTIL.getFunctionName(fun) + " returned: (" + (typeof ret) + ") \n" + ret);
				
				if(typeof ret == "string") {
					if(textChanged) {
						throw new Error("Another listener has already changed the pasted text!");
					}
					text = ret;
					textChanged = true;
				}
				else if(ret === false) {
					return; // So plugins can cancel the default behaviour (inserting the text)
				}
			}
			
			// Insert text at caret position
			if(EDITOR.currentFile) {
				var file = EDITOR.currentFile;
				
				// If there is a text selection. Delete the selection first!
				file.deleteSelection();
				
				file.insertText(text);
				
				//file.fixCaret();
			}
		}
		
		// else: Do the default action (enable pasting outside the canvas)
		
		EDITOR.interact("paste", pasteEvent);
		
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
	
	
	function keyPressed(keyPressEvent) {
		keyPressEvent = keyPressEvent || window.event; 
		
		//keyPressEvent.preventDefault();
		
		// Firefox and Safari go here before calling copy/paste/cut events
		if(nativeCopy || nativePaste || nativeCut) {
			nativeCopy = false;
			nativePaste = false;
			nativeCut = false;
			return;
		}
		
		var charCode = keyPressEvent.charCode || keyPressEvent.keyCode || keyPressEvent.which;
		var character = String.fromCharCode(charCode); 
		var combo = getCombo(keyPressEvent);
		var file = EDITOR.currentFile;
		var preventDefault = false;
		var funReturn = true;
		
		console.log("keyPressed: " + charCode + " = " + character + " (charCode=" + keyPressEvent.charCode + ", keyCode=" + keyPressEvent.keyCode + ", which=" + keyPressEvent.which + ") combo=" + JSON.stringify(combo) + " EDITOR.input=" + (EDITOR.currentFile ? EDITOR.input : "NoFileOpen EDITOR.input=" + EDITOR.input + "") + "");
		
		
		console.log("Calling keyPressed listeners (" + EDITOR.eventListeners.keyPressed.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.keyPressed.length; i++) {
			funReturn = EDITOR.eventListeners.keyPressed[i].fun(file, character, combo); // Call function
			
			if(funReturn !== true && funReturn !== false) {
				throw new Error("keyPressed event listener: " + UTIL.getFunctionName(EDITOR.eventListeners.keyPressed[i].fun) + 
				" did not return true or false!");
			}
			
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
		
		EDITOR.interact("keyPressed", keyPressEvent);
		
		if(typeof keyPressEvent.preventDefault == "function") {
		// Prevent Firefox's quick search (/ slash)
		if(EDITOR.input && charCode == 47) keyPressEvent.preventDefault();
		
		// Prevent Firefox's quick find (' single quote)
		if(EDITOR.input && charCode == 39) keyPressEvent.preventDefault();
		
		// Prevent scrolling down when hitting space in Firefox
		if(EDITOR.input && charCode == 32) keyPressEvent.preventDefault();
		}
	}
	
	function resizeAndRender() {
		
		// Only do the resize or render if it's actually needed
		
		if(EDITOR.shouldResize) EDITOR.resize();
		
		//if(EDITOR.shouldRender) window.requestAnimationFrame(EDITOR.render);
		if(EDITOR.shouldRender) EDITOR.render();
		
		//window.requestAnimationFrame(resizeAndRender); // Keep calling this function
		
		// Using requestAnimationFrame feels slightly slower then rendering on each interaction!
	}
	
	
	function keyIsDown(keyDownEvent) {
		/*
			
			note: Windows OS (or Chromium?) has some weird keyboard commands, like Ctrl + I to insert a tab!
			
		*/
		keyDownEvent = keyDownEvent || window.event;
		
		//keyDownEvent.preventDefault();
		
		var charCode = keyDownEvent.charCode || keyDownEvent.keyCode;
		var character = String.fromCharCode(charCode);
		var combo = getCombo(keyDownEvent);
		var preventDefault = false;
		var funReturn;
		var captured = false;
		var charCodeShift = 16;
		var charCodeCtrl = 17;
		var charCodeAlt = 18;
		var gotError;
		var targetElementClass = keyDownEvent.target.className;
		
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
		
		
		
		// Mac command key ?
		if(charCode == charCodeCtrl) {
			console.log("recognition start! (keyDown Ctrl)");
			if(recognition) {
				try {
					recognition.start();
				}
				catch(err) {
					console.warn(err.message);
				}
			}
		}
		else console.log("recognition: Not ctrl! charCode=" + charCode);
		
		
		
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
			funReturn = EDITOR.eventListeners.keyDown[i].fun(EDITOR.currentFile, character, combo, keyDownEvent); // Call function
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("Default action will be prevented!");
			}
		}
		
		if(!preventDefault) {
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
		}
		
		// Throwing the actual error here doesn't give a call stack! meh ... Need to see the console.warning to see the call stack
		//if(gotError) throw gotError; // throw new Error("There was an error when calling keyBindings. Se warnings in console log!");
		// Otimally we would want all key bound functions to run before throwing the error, but it's too annoying to not see the call stack in the error
		
		if(EDITOR.currentFile) {
			EDITOR.currentFile.checkGrid();
			EDITOR.currentFile.checkCaret();
		}
		
		EDITOR.interact("keyDown", {charCode: charCode, target: targetElementClass, shiftKey: keyDownEvent.shiftKey, altKey: keyDownEvent.altKey, ctrlKey: keyDownEvent.ctrlKey});
		
		var leftWindowKey = 91; // Command key on Mac
		var rightWindowKey = 92;
		
		var windowKey = lastKeyDown == leftWindowKey || lastKeyDown == rightWindowKey;
		
		if((combo.sum > 0 || windowKey) && !captured) {
			// The user hit a combo, with shift, alt, ctrl + something, but it was not captured. 
			
			var browser = UTIL.checkBrowser();
			
			// Enable native commands
			if( (combo.ctrl || windowKey)  && character == "C") {
				console.log("Native command: copy !?");
				
				if(browser == "Firefox" || browser == "Safari") nativeCopy = true;
				
				if(EDITOR.settings.useCliboardcatcher && EDITOR.input) {
					giveBackFocusAfterClipboardEvent = true;
					
					var clipboardcatcher = document.getElementById("clipboardcatcher");
					clipboardcatcher.focus();
					
					var textToPutOnClipboard = "";
					
					if(EDITOR.currentFile) {
						textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
					}
					
					clipboardcatcher.value = textToPutOnClipboard;
					clipboardcatcher.select();
					
					//preventDefault = true;
				}
			}
			else if( (combo.ctrl || windowKey) && character == "V") {
				console.log("Native command: paste !? EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + " EDITOR.input=" + EDITOR.input);
				
				if(browser == "Firefox" || browser == "Safari") nativePaste = true;
				
				if(EDITOR.settings.useCliboardcatcher && EDITOR.input) {
					giveBackFocusAfterClipboardEvent = true;
					
					// Problem: If alertBox button was clicked, it takes 500ms to get focus back to canvas. 
					// But if we paste before that, input will be false.
					
					var clipboardcatcher = document.getElementById("clipboardcatcher");
					clipboardcatcher.focus();
					
					//preventDefault = true;
				}
			}
			else if( (combo.ctrl || windowKey) && character == "X") {
				console.log("Native command: cut !?");
				
				if(browser == "Firefox" || browser == "Safari") nativeCut = true;
				
				if(EDITOR.settings.useCliboardcatcher && EDITOR.input) {
					giveBackFocusAfterClipboardEvent = true;
					
					var clipboardcatcher = document.getElementById("clipboardcatcher");
					clipboardcatcher.focus();
					
					var textToPutOnClipboard = "";
					
					if(EDITOR.currentFile) {
						textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
						
						// Delete the selected text
						//EDITOR.currentFile.deleteSelection();
					}
					
					clipboardcatcher.value = textToPutOnClipboard;
					clipboardcatcher.select();
					
					//preventDefault = true;
					
				}
			}
			else if(combo.shift) {} // shift is usually safe (big and small letters yo!)
			else if(combo.ctrl && combo.alt) {} // This is Alt gr (used to insert {[]} etc)
			else if(combo.alt) {} // Wait for ALT+key combo!
			else if(charCode == 17 || combo.ctrl) {console.log("Ctrl ...");} // Wait for Ctrl+key combo!
			else if(windowKey) {console.log("Window/Cmd key ...");preventDefault = true;} // Do we want to capture Window/Cmd combos !?
			//else if(combo.shift) {} // Wait for Shift+key combo!
			//&&//&&//
			else {
				throw Error("Unsupported! combo: " + JSON.stringify(combo) + " character=" + character + " charCode=" + charCode);
				
				preventDefault = true;
			}
			
		}
		
		lastKeyDown = charCode;
		
		
		if(preventDefault) {
			//alert("Preventing default browser action!");
			console.log("Preventing default browser action!");
			
			if(typeof keyDownEvent.stopPropagation == "function") keyDownEvent.stopPropagation();
			if(window.event && typeof window.event.cancelBubble != "undefined") window.event.cancelBubble = true;
			if(typeof keyDownEvent.preventDefault == "function") keyDownEvent.preventDefault();
			if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
			
			return false;
		}
		else {
			console.log("Executing default browser/OS action ...");
			// 
			return true;
		}
		
		
	}
	
	function getCombo(eventObject) {
		
		var combo = {shift: false, alt: false, ctrl: false, sum: 0};
		if(eventObject.shiftKey) {
			combo.shift = true;
			combo.sum += SHIFT;
		}
		if(eventObject.altKey) {
			combo.alt = true;
			combo.sum  += ALT;
		}
		if(eventObject.ctrlKey) {
			combo.ctrl = true;
			combo.sum  += CTRL;
		}
		return combo;
	}
	
	function keyIsUp(keyUpEvent) {
		
		keyUpEvent = keyUpEvent || window.event; 
		
		//keyUpEvent.preventDefault();
		
		if(keyUpEvent.type=="keyup") EDITOR.hasKeyboard = true;
		
		var charCode = keyUpEvent.charCode || keyUpEvent.keyCode;
		var character = String.fromCharCode(charCode);
		var combo = getCombo(keyUpEvent);
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
				
				console.log("keyUp: Calling function: " + UTIL.getFunctionName(binding.fun) + "...");
				
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
		
		var charCodeCtrl = 17;
		if(charCode == charCodeCtrl) {
			console.log("recognition stop! (keyUp Ctrl)");
			if(recognition) {
				recognition.stop();
			}
		}
		else console.log("recognition: Not ctrl! charCode=" + charCode);
		
		EDITOR.interact("keyUp", keyUpEvent);
		
		//return false;
		
	}
	
	
	
	function mouseDown(mouseDownEvent) {
		
		mouseDownEvent = mouseDownEvent || windows.event;
		
		EDITOR.lastElementWithFocus = document.activeElement;
		EDITOR.touchDown = true;
		
		window.focus(); // Enable capturing key events if we are in an iframe
		
		var mouse = getMousePosition(mouseDownEvent);
		var mouseX = mouse.x;
		var mouseY = mouse.y;
		
		var caret;
		var button = mouseDownEvent.button;
		var click;
		var target = mouseDownEvent.target;
		var mouseDirection = "down";
		var preventDefault = false;
		var keyboardCombo = getCombo(mouseDownEvent);
		var funReturn;
		
		//UTIL.objInfo(target);
		var leftMouseButton = 0;
		var rightMouseButton = 2;
		var maybeCenterMouseButton = 1;
		
		if(button == undefined) button = leftMouseButton; // For like touch events
		
		var menu = document.getElementById("canvasContextmenu");
		
		//console.log("mouseDown on target.className=" + target.className);
		
		if(target.className == "fileCanvas" || target.className == "content centerColumn") {
			
			// Some browsers send a mousedown event after a touchstart event. Don't hide the second time (a plugin might show the menu on mousedown)
			if(! (lastMouseDownEventType == "touchstart" && mouseDownEvent.type == "mousedown") ) EDITOR.hideMenu();
			
			caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
			
			
			if(EDITOR.currentFile && (button == leftMouseButton)) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				// Give focus
				EDITOR.input = true;
				
				// Remove focus from everything else
				if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
				else console.log("Unable to blur active element!:");
				
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
			else if(button !== leftMouseButton) {
				
				// No current file. Or not the left button.
				
				EDITOR.input = false;
				
				EDITOR.showMenu(mouseX, mouseY, mouseDownEvent);
				
			}
			
		}
		else{
			
			EDITOR.input = false;
			
		}
		
		if(target.className == "fileCanvas" || target.className == "keyboardButton" ||
		target.className == "virtualKeyboardRow" || target.className == "virtualKeyboardGroup") {
			// Prevent whatever nasty thing the browser wants to do
			// like zooming out etc.
			mouseDownEvent.preventDefault();
		}
		
		console.log("Mouse down: caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		console.log(mouseDownEvent);
		
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
				
				funReturn = click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent); // Call it
				
				if(funReturn === false) {
					preventDefault = true;
				}
				
				
			}
		}
		
		if(mouseDownEvent.type == "touchstart" && recognition) {
			try {
				recognition.start();
			}
			catch(err) {
				console.warn(err.message);
			}
		}
		
		
		lastMouseDownEventType = mouseDownEvent.type;
		
		EDITOR.interact("mouseDown", mouseDownEvent);
		
		if(preventDefault) {
			e.preventDefault(); // To prevent the annoying menus
			return false;
		}
		
		//return true;
		
	}
	
	
	function mouseUp(mouseUpEvent) {
		mouseUpEvent = mouseUpEvent || window.event;
		
		EDITOR.touchDown = false;
		
		// Mouse position is on the current object (Canvas)
		var mouse = getMousePosition(mouseUpEvent);
		var mouseX = mouse.x;
		var mouseY = mouse.y;
		
		var caret;
		var button = mouseUpEvent.button;
		var click;
		var target = mouseUpEvent.target;
		var keyboardCombo = getCombo(mouseUpEvent);
		var mouseDirection = "up";
		
		if(button == undefined) button = 0; // For like touch events
		
		console.log("Mouse up on class " + target.className + "!");
		console.log(mouseUpEvent);
		
		if(target.className == "fileCanvas") {
			
			// Only get a caret if the click is on the canvas 
			caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
			
		}
		
		if(target.className == "fileCanvas" || target.className == "keyboardButton" || 
		target.className == "virtualKeyboardRow" || target.className == "virtualKeyboardGroup") {
			// Prevent whatever nasty thing the browser wants to do
			// like zooming out etc.
			mouseUpEvent.preventDefault();
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
				
				click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseUpEvent); // Call it
			}
		}
		
		
		//console.log("mouseUp, EDITOR.shouldRender=" + EDITOR.shouldRender);
		
		if(mouseUpEvent.type == "touchstart" && recognition) {
			recognition.stop();
		}
		
		EDITOR.interact("mouseUp", mouseUpEvent);
		
		return false;
		//return true;
		
	}
	
	function getMousePosition(mouseEvent) {
		
		// Mouse position is on the current object (Canvas) 
		var mouseX = mouseEvent.offsetX==undefined?mouseEvent.layerX:mouseEvent.offsetX;
		var mouseY = mouseEvent.offsetY==undefined?mouseEvent.layerY:mouseEvent.offsetY;
		
		/*
			if(e.page) console.log("mouseEvent.page.x=" + mouseEvent.page.x);
			if(mouseEvent.changedTouches) console.log("mouseEvent.changedTouches[" + (mouseEvent.changedTouches.length-1) + "]=" + mouseEvent.changedTouches[e.changedTouches.length-1].pageX);
			console.log("mouseEvent.x=" + e.x);
			console.log("mouseEvent.offsetX=" + e.offsetX);
			console.log("mouseEvent.layerX=" + e.layerX);
		*/
		
		if(UTIL.isNumeric(mouseEvent.clientX) && UTIL.isNumeric(mouseEvent.clientY)) {
			EDITOR.mouseX = parseInt(mouseEvent.clientX);
			EDITOR.mouseY = parseInt(mouseEvent.clientY);
		}
		else if(mouseEvent.changedTouches) {
			
			mouseX = Math.round(mouseEvent.changedTouches[mouseEvent.changedTouches.length-1].pageX); // pageX
			mouseY = Math.round(mouseEvent.changedTouches[mouseEvent.changedTouches.length-1].pageY);
			
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
	
	function mouseMove(mouseMoveEvent) {
		
		mouseMoveEvent = mouseMoveEvent || window.event;
		
		//console.log(mouseMoveEvent);
		
		//mouseMoveEvent.preventDefault();
		
		var mouse = getMousePosition(mouseMoveEvent);
		var mouseX = mouse.x;
		var mouseY = mouse.y;
		
		var target = mouseMoveEvent.target;
		
		//console.log("mouseY=" + mouseY);
		
		if(EDITOR.eventListeners.mouseMove.length > 0) {
			//console.log("Calling mouseMove listeners (" + EDITOR.eventListeners.mouseMove.length + ") ...");
			for(var i=0, fun; i<EDITOR.eventListeners.mouseMove.length; i++) {
				fun = EDITOR.eventListeners.mouseMove[i].fun;
				
				//console.log(UTIL.getFunctionName(fun));
				
				fun(mouseX, mouseY, target, mouseMoveEvent); // Call it
				
			}
		}
		
		//console.log("EDITOR.input=" + EDITOR.input);
		
		EDITOR.interact("mouseMove", mouseMoveEvent);
		
		//return false;
		
	}
	
	function mouseclick(mouseClickEvent) {
		/*
			Check for the EDITOR.shouldRender flag and render if true
			
			For events that are not bound to mouseUp or mouseDown
		*/
		console.log("mouseClick, EDITOR.shouldRender=" + EDITOR.shouldRender + ", EDITOR.shouldResize=" + EDITOR.shouldResize + " EDITOR.input=" + EDITOR.input);
		
		EDITOR.interact("mouseClick", mouseClickEvent);
		
		return true;
		
	}
	
	
	function dblclick(dblClickEvent) {
		
		dblClickEvent = dblClickEvent || windows.event;
		
		// Mouse position is on the current object (Canvas) 
		var mouseX = dblClickEvent.offsetX==undefined?dblClickEvent.layerX:dblClickEvent.offsetX;
		var mouseY = dblClickEvent.offsetY==undefined?dblClickEvent.layerY:dblClickEvent.offsetY;
		var caret;
		var button = dblClickEvent.button;
		var click;
		var target = dblClickEvent.target;
		var preventDefault = false;
		var keyboardCombo = getCombo(dblClickEvent);
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
		
		EDITOR.interact("dblclick", dblClickEvent);
		
		if(preventDefault) {
			dblClickEvent.preventDefault(); // To prevent the annoying menus
			return false;
		}
		
	}
	
	
	
	
	function scrollWheel(scrollWheelEvent) {
		
		scrollWheelEvent = scrollWheelEvent || window.event;
		
		console.log("scroll ... scrollWheelEvent.ctrlKey=" + scrollWheelEvent.ctrlKey);
		
		
		
		//console.log("wheelDelta=" + scrollWheelEvent.wheelDelta + " wheelDeltaY=" + scrollWheelEvent.wheelDeltaY + " deltaY=" + scrollWheelEvent.deltaY + " detail=" + scrollWheelEvent.detail );
		
		var delta = scrollWheelEvent.wheelDelta || -scrollWheelEvent.detail,
		target = scrollWheelEvent.target,
		tagName = target.tagName,
		combo = getCombo(scrollWheelEvent),
		dir = delta > 0 ? -1 : 1,
		steps = Math.abs(delta);
		
		
		console.log("Scrolling on " + tagName);
		
		if(tagName == "CANVAS") {
			console.log("Calling mouseScroll listeners (" + EDITOR.eventListeners.mouseScroll.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.mouseScroll.length; i++) {
				EDITOR.eventListeners.mouseScroll[i].fun(dir, steps, combo, scrollWheelEvent);
			}
		}
		
		EDITOR.interact("mouseScroll", scrollWheelEvent);
		
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
		
		var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">';
		//data += '<image x="0" y="0" width="30" height="30" xlink:href="/gfx/error.svg" />';
		data += '<foreignObject width="100%" height="100%">';
		// Font must be web safe font! Seems to ignore our style.css ...
		data += '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; font-family: Arial;">';
		data += html;
		data += '</div>';
		data += '</foreignObject>';
		data += '</svg>';
		
		console.log("Creating SVG image: data=" + data);
		
		var img = new Image();
		
		
		img.onload = function () {
			console.log("SVG image created!");
			callback(img);
			if(url) DOMURL.revokeObjectURL(url);
			}
		
		var browser = UTIL.checkBrowser();
		
		var DOMURL = window.URL || window.webkitURL || window;
		if( DOMURL.createObjectUR ) {
			var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
			var url = DOMURL.createObjectURL(svg);
			img.src = url;
		}
		else {
			data = "data:image/svg+xml," + data;
			img.src = data;
		}
		
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
				
				if(RUNTIME != "browser") {
					
					// Try Mercurial
					var exec = require('child_process').exec;
					var child = exec('hg log -l 1', function(error, stdout, stderr) {
						if(!error) {
							
							var myRegexp = /changeset:\s*(\d*):/g;
							var match = myRegexp.exec(stdout);
							
							if(!match) {
								console.warn("Unable to find latest HG commit id! stdout=" + stdout);
								callback(EDITOR.version);
							}
							else {
								EDITOR.version = parseInt(match[1]);
								callback(EDITOR.version);
							}
						}
						else {
							console.warn("Failed to run hg log in order to get editor version.");
							callback(EDITOR.version);
						}
					});
				}
				else {
					console.warn("Failed to read version.inc");
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
	
	function clearSelection() {
		if ( document.selection ) {
			document.selection.empty();
		} else if ( window.getSelection ) {
			window.getSelection().removeAllRanges();
		}
	}
	
	function fullScreenMenu(menu) {
		// The menu will cover the whole screen
		
		var wireframe = document.getElementById("wireframe");
		//EDITOR.virtualKeyboard.hide();
		wireframe.style.display = "none";
		menu.style.position="relative";
		menu.style.top = "0px";
		menu.style.left = "0px";
		menu.style.border="0px solid";
		//menu.style.width="100%";
		menu.style.maxWidth="100%";
		menu.style.height="100%";
		menu.style.overflow="auto";
		EDITOR.scrollingEnabled = true;
		
		menuIsFullScreen = true;
		
		EDITOR.addTempMenuItem("Hide menu", function() {
			EDITOR.hideMenu();
		});
		
	}
	
	function recoverFromFullScreenMenu(menu) {
		// Reset everything from fullScreenMenu()
		
		var wireframe = document.getElementById("wireframe");
		wireframe.style.display = "block";
		menu.style.position="";
		menu.style.border="";
		//menu.style.width="";
		menu.style.maxWidth="";
		menu.style.height="";
		menu.style.overflow="";
		EDITOR.scrollingEnabled = false;
		menuIsFullScreen = false;
		EDITOR.resizeNeeded();
		
		
	}
	
})();
