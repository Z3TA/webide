"use strict";

//var testfile = "test/testfile.txt";

// The EDITOR object lives in global scope, so that it can be accessed everywhere.
var EDITOR = {};

EDITOR.version = 0; // Populated by release.sh, DO NOT ALTER!
console.log("EDITOR.version=" + EDITOR.version);
if(!EDITOR.version) console.warn("EDITOR.version=" + EDITOR.version + " not populated!");

EDITOR.sessionId = Math.random().toString(36).substring(7); // A hopefully unique ID for this session 

EDITOR.touchScreen = false;

var tempTest = 0;
var benchmarkCharacter = ".";
var benchmarkCharacterCode = 190;
var inputCount = 0;
var ctxMenuVisibleOnce = false;
var menuIsFullScreen = false;
var usePseudoClipboard = undefined;
var lastBufferStartRow = -1; // 
var pixelRatio = window.devicePixelRatio || 1; // "Retina" displays gives 2

// List of file extensions supported by the parser(s). Extensions Not in this list will be loaded in plain text mode.
// Note: The file parsers should fill this list!
EDITOR.parseFileExtensionAsCode = [
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

// These file extensions will be treated as plain text
EDITOR.plainTextFileExtensions = [
	"txt"
]

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
	showLineNumbers: true, // Can be used to toggle line-numbers on/off
	leftMargin: 50,
	rightMargin: 50,
	topMargin: 10,
	bottomMargin: 5,
	gridHeight: 23, // 23, 22
	gridWidth: 9, // Needs to be the same as font's character width!
	sub_pixel_antialias: false, // For the main text area (canvas) only.
	lowLatencyCanvas: false,
	verticalScrollZone: 80, // Will be recalculated on resize to match grid with
	horizontalScrollZone: 80, // Scrollbar zone, bottom. When touching down in the zone we should scroll
	style: {
		// These are the default/fallback styles. Over-ride them in settings_overload.js !
		fontSize: 15, // Don't forget to change gridHeight and gridWidth after chaning fontSize!
		font: "Courier New, Courier, monospace", 
		highlightMatchFont: "bold 15px Courier New, Courier, monospace",
		highlightMatchFontColor: "rgb(200, 119, 32)",
		highlightMissMatchFontColor: "rgb(255, 159, 0)",
		highlightMatchBackground: "rgb(255, 255, 230)",
		textColor: "rgb(0,0,0)", // Should be in rgb(0,0,0) format because some functions like to convert and make darker/lighter/transparent
		bgColor: "rgb(255,255,255)", // Studies say that black on white is the best for readability. todo: themes
		altColors: ["pink", "green", "orange", "magenta", "cyan", "blue", "levander", "brown", "purple", "mint", "red", "olive", "teal"], // Colors that look good on the background, and are different
		commentColor: "rgb(8, 134, 29)",
		quoteColor: "rgb(51, 128, 128)",
		xmlTagColor: "rgb(0, 21, 162)",
		removedTextColor: "#3a7f3a",
		addedTextColor: "#ff4a4a",
		selectedTextBg: "rgb(193, 214, 253)",
		currentLineColor: "rgb(255, 255, 230)",
		highlightTextBg: "rgb(155, 255, 155)"    // For text highlighting
	},
	scrollSpeedMultiplier: 1/17,
	defaultLineBreakCharacter: (navigator.platform.indexOf("Win") != -1) ? "\r\n" : "\n", // Use Windows standard if on Windows, else use line-feed. \n == LF, \r == CR
	bigFileSize: 1024*1024, // (Bytes), all files larger then this will be opened as streams. 1048576 = ca 30k LOC
	bigFileLoadRows: 4000, // Rows to load into the editor if the file size is over bigFileSize
	autoCompleteKey: 9, // Tab
	insert: false,
	useCliboardcatcher: false, // Some browsers (IE) can only capture clipboard events if a text element is focused
	caretAnimation: true
};

EDITOR.runningTests = false;   // Able to ignore some stuff like alerts while tests are running
EDITOR.shouldRender = false;   // Internal flag, use EDITOR.renderNeeded() to re-render!
EDITOR.shouldResize = false;   // Internal flag, use EDITOR.resizeNeeded() to re-size!
EDITOR.fileIndex = -1;   // Keep track on opened files (for undo/redo)
EDITOR.files = {};       // List of all opened files with the path as key
EDITOR.mouseX = 0;       // Current mouse position
EDITOR.mouseY = 0;
EDITOR.info = [];        // Talk bubbles. See EDITOR.addInfo()
EDITOR.connections = {}  // Store connections to remote servers (FTP, SSH)
EDITOR.remoteProtocols = ["ftp", "ftps", "sftp"]; // Supported remote connections
EDITOR.bootstrap = null; // Will contain JSON data from fethed url in bootstrap.url, fires "bootstrap" event
EDITOR.platform = /^Win/.test(window.navigator.platform) ? "Windows" : (/^linux/.test(window.navigator.platform) ? "Linux" : "Unknown");
// http://stackoverflow.com/questions/9514179/how-to-find-the-operating-system-version-using-javascript

EDITOR.installDirectory = "/";
EDITOR.pseudoClipboard = "";
EDITOR.registeredAltKeys = []; // Alt keys for the virtual keyboard(s)
EDITOR.isScrolling = false; // Render optimization for scrolling

EDITOR.eventListeners = { // Use EDITOR.on to add listeners to these events:
	afk: [], // Away from keyboard
	btk: [], // Back to keyboard
	error: [],
	fileClose: [], 
	fileOpen: [],
	fileHide: [],
	fileShow: [],
	fileParse: [],
	move: [], // When a file or folder is moved/renamed
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
		previewTool: [],
	pathPickerTool: [], // Tools that allow picking a path should listen for this event (and return true if it thinks it can handle the job). See EDITOR.pathPickerTool
	select: [], // Selecting text
	sanitize: [], // For example foramtting and santizing text pasted or dropped into the editor
	parse: [], // Language parsers should listen to this event and parse any string on request and return a parse-object {}
	registerAltKey: [], // Virtual keyboards can choose to update alternate keys so you can for example save file via Alt + S etc. Kinda like key-bindings but for virtual keyboards
	unregisterAltKey: [],
	hideVirtualKeyboard: [], // Virtual keyboards need to listen to this and hide itself when their name is called
	showVirtualKeyboard: []
};

EDITOR.renderFunctions = [];
EDITOR.preRenderFunctions = [];

EDITOR.animationFunctions = [];

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

EDITOR.lastTimeCharacterInserted = new Date();
EDITOR.lastTimeInteraction = new Date();

EDITOR.modes = ["default", "*"]; // You can bind keys for use in different modes. * means all modes
EDITOR.mode = "default"; // What you often find in GUI based editors/IDE's'

(function() { // Non global editor code ...
	
	// These variables and functions are private ...
	// We only expose methods that are in the EDITOR object.
	
	if(BROWSER.indexOf("MSIE") == 0) EDITOR.settings.useCliboardcatcher = true;
	//if(BROWSER.indexOf("Firefox") == 0) EDITOR.settings.useCliboardcatcher = true;
	
	//if(BROWSER != "Chrome") alertBox("The editor might be slow in your BROWSER (" + BROWSER + ").\nThe editor runs best in Chrome/Chromium/Opera", "PERF", "warning");
	
	var keyBindings = []; // Push objects {char, charCode, combo dir, fun} for key events
	
	var executeOnNextInteraction = [];
	
	var afk = false; // Not away from keyboard
	var afkTimeout = 300000; // How long time since last interaction to fire afk event (5 minutes)
	var mainLoopInterval;
	
	var lastKeyDown = 0;
	var tildeActive = false;
	var tildeShiftActive = false;
	var tildeAltActive = false;
	
	var renderCaretTimer;
	
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
	
	var keyboardCatcherLastInserted = "";
	
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
	
	// Keep track of how many times the editor has been started, so we can know if it's the first time the editor runs
	EDITOR.startedCounter = parseInt(UTIL.getCookie("startedCounter")); 
	if(isNaN(EDITOR.startedCounter)) EDITOR.startedCounter = 0;
	UTIL.setCookie("startedCounter", ++EDITOR.startedCounter, 999);
	
	// Don't show the firendly message on how to show the context menu if the menu is disabled
	if(QUERY_STRING["disable"] && (QUERY_STRING["disable"].indexOf("ctxMenu") != -1 || QUERY_STRING["disable"].indexOf("trmb") != -1) || EDITOR.startedCounter > 20) ctxMenuVisibleOnce = true;
	
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
		
		todo: EDITOR.localStorage and EDITOR.storage (should) have the same interface to make it easy to switch between them.
		
		I started making a Packaged chrome app, but it was too much work to get everything to work,
		for example, Packaged chrome apps doesn't support localStorage, 
		instead it have it's own "chrome.storage" that works differently from localStorage.
		
		chrome.storage is async while localStorage is sync. So I had to refactor everything that used localStorage.
		Now when I've decided to use Hosted Chrome app instead, localStorage works like in the browser.
		But I choose to keep the sync version, because "storage" probably needs to be async if we choose to support more platforms in the future.
		
	*/
	
	// You can sometimes get a "Access is denied" error when trying to access window.localStorage for example if the page is running in an iframe
	
	try {
		var localStorageAvailable = !!window.localStorage;
	}
	catch (err) {
		var localStorageAvailable = false;
	}
	
	if(localStorageAvailable) {
		// Use window.localStorage but with the same interface as chrome.storage
		EDITOR.localStorage = {
			setItem: function localStorageSetItem(key, value, callback) {
				if(typeof key == "object") {
					var itemsObject = key;
					if(typeof value == "function" && callback == undefined) {
callback = value; 
					}
				}
				else if(typeof key == "string") {
					if(typeof value != "string") throw new Error("value=" + value + " needs to be a string when key:" + key + " is a key string");
					var itemsObject = {};
					itemsObject[key] = value;
				}
				
				for(var name in itemsObject) {
					if(typeof itemsObject[name] != "string") throw new Error("name=" + name + " in ", itemsObject, " should be a string!");
					window.localStorage.setItem(name, itemsObject[name]);
				}
				
				if(callback) callback(null);
			},
			getItem: function localStorageGetItem(key, callback) {
				if(typeof callback != "function") throw new Error("getItem is async and needs a callback function!");
				if(Array.isArray(key)) {
					var itemsArray = key;
					var itemsObject = {};
					for (var i=0; i<itemsArray.length; i++) {
						itemsObject[itemsArray[i]] =  window.localStorage.getItem(itemsArray[i]);
					}
					var value = itemsObject;
				}
				else if(typeof key == "string") {
					var value = window.localStorage.getItem(key);
				}
				else throw new Error("Epected first argument/parameter to be a string or array, not " + (typeof key) + " " + key);
				
				if(value === undefined) throw new Error("value=" + value); // Sanity check
				
				callback(null, value);
			},
			removeItem: function localStorageRemoveItem(key, callback) {
				if(Array.isArray(key)) {
					var itemsArray = key;
					for (var i=0; i<itemsArray.length; i++) {
						window.localStorage.removeItem(itemsArray[i]);
					}
				}
				else if(typeof key == "string") {
					window.localStorage.removeItem(key);
				}
				else throw new Error("Epected first argument/parameter to be a string or array, not " + (typeof key) + " " + key);
				
				if(callback) callback(null);
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
		console.warn("window.localStorage not available!");
	}
	
	EDITOR.addMode = function addMode(modeName, inheritKeyBindingsFrom) {
		if(EDITOR.modes.indexOf(modeName) != -1) throw new Error(modeName + " mode is already registered!");
		EDITOR.modes.push(modeName);
		
		if(inheritKeyBindingsFrom) {
			for(var i=0, b; i<keyBindings.length; i++) {
				if(keyBindings[i].mode == inheritKeyBindingsFrom) {
b = {};
for(var prop in keyBindings[i]) {
b[prop] = keyBindings[i][prop];
}
b.mode = modeName;
EDITOR.bindKey(b);
}
			}
}
}
	
	EDITOR.setMode = function setMode(name) {
		if(EDITOR.modes.indexOf(name) == -1) throw new Error(name + " mode is not registered as a mode/modal! Available modes are: " + JSON.stringify(EDITOR.modes));
		EDITOR.mode = name;
		console.warn("Set EDITOR.mode=" + EDITOR.mode);
	}
	
	
	var Audio = window.AudioContext || window.webkitAudioContext;
	if(Audio) var audioCtx = new Audio;
	else console.warn("Audio API not supported on " + BROWSER);
	
	EDITOR.beep = function beep(volume, frequency, type, duration) {
		// Makes a beep sound
		
		if(!audioCtx) {
			console.warn("Audio API not supported on " + BROWSER);
			return;
		}
		
		if(volume == undefined) volume = 0.15;
		if(frequency == undefined) frequency = 100;
		if(type == undefined) type = "square";
		if(duration == undefined) duration = 120;
		
		var oscillator = audioCtx.createOscillator();
		var gainNode = audioCtx.createGain();
		oscillator.connect(gainNode);
		gainNode.connect(audioCtx.destination);
		
		
		gainNode.gain.value = volume;
		oscillator.frequency.value = frequency;
		oscillator.type = type;
		
		oscillator.start();
		oscillator.stop(audioCtx.currentTime + duration/1000)
	}
	
	EDITOR.putIntoClipboard = function putIntoClipboard(text, callback) {
		
		EDITOR.pseudoClipboard = text;
		
		if (!navigator.clipboard) {
			fallbackCopyTextToClipboard(text);
			return;
		}
		navigator.clipboard.writeText(text).then(function() {
			console.log('Async: Copying to clipboard was successful!');
			if(callback) callback(null, false);
		}, function(err) {
			console.error('Async: Could not copy text: ', err);
			fallbackCopyTextToClipboard(text);
		});
		
		function fallbackCopyTextToClipboard(text) {
			var textArea = document.createElement("textarea");
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			
			try {
				var successful = document.execCommand('copy');
				var msg = successful ? 'successful' : 'unsuccessful';
				console.log('Fallback: Copying text command was ' + msg);
			} catch (err) {
				console.error('Fallback: Oops, unable to copy', err);
			}
			document.body.removeChild(textArea);
			
			if(successful) {
				if(callback) callback(null, false);
			}
			else {
				
				if(usePseudoClipboard === true) {
					return pseudo();
				}
				else if(usePseudoClipboard === false) {
					return prm();
				}
				else if(usePseudoClipboard === undefined) {
					var usePseudo = "Use pseudo clipboard";
					var alwaysAsk = "Ask me every time";
					var manualCopy = "Manually copy";
					confirmBox("Your browser wont allow putting data into the clipboard. Use a pseudo clipboard within the editor ?", [usePseudo, alwaysAsk, manualCopy], function(answer) {
						if(answer == usePseudo) {
							usePseudoClipboard = true;
							return pseudo();
						}
						else if(answer == manualCopy) {
usePseudoClipboard = false;
							return prm();
						}
						else if(answer == alwaysAsk) {
							return prm();
						}
						else {
							console.warn("answer=" + answer);
							return prm();
						}
					});
				}
				else throw new Error("usePseudoClipboard=" + usePseudoClipboard);
				
			}
		}
		
		function prm() {
			// prompt can not handle multiple lines
			//window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
			
			promptBox("Copy to clipboard: Ctrl+C, Enter", text, 0, function() {
				if(callback) callback(null, true);
			});
			
			return false;
		}
		
		function pseudo() {
			EDITOR.pseudoClipboard = text;
			if(callback) callback(null, false);
			return false;
		}
		
	}
	
	EDITOR.getClipboardContent = function getClipboardContent(callback) {
		
		/*
			You need to be on HTTPS or 127.0.0.1 to get access to navigator.clipboard !?
			
			When calling navigator.clipboard.readText() in Chrome there is a confirm box.
			If the user says "No" we won't be able to access the clipboard until the user manually clears all settings.
			
		*/
		
		if(typeof callback != "function") throw new Error("First argument needs to be a callback function!");
		
		if(navigator.clipboard) {
			console.log("getClipboardContent: Trying navigator.clipboard ...");
			navigator.clipboard.readText().then(function(data) {
				console.log("getClipboardContent: navigator.clipboard.readText succeeded!");
				readSuccess(data);
			}).catch(function(err, something) {
				console.log("getClipboardContent: navigator.clipboard.readText failed!");
				readFail(err || something);
			});
		}
		else if(window.clipboardData) {
			console.log("getClipboardContent: Trying  window.clipboardData.getData ...");
			try {
				var data = window.clipboardData.getData('Text')
			}
			catch(err) {
				var error = err;
			}
			if(error) {
				console.log("getClipboardContent: window.clipboardData.getData failed!");
				readFail(error);
			}
			else {
				console.log("getClipboardContent: window.clipboardData.getData succeeded!");
				readSuccess(data);
			}
		}
		else {
			console.log("getClipboardContent: Using prompt! navigator.clipboard=" + navigator.clipboard + " window.clipboardData=" + window.clipboardData);
			
			/*
				Should we use the pseudo clipboard or always prompt !?
				//if(usePseudoClipboard === true && EDITOR.pseudoClipboard)
				It would be more annoying if you couln't copy in stuff, then showing the prompt every time !?
				
				//var data = prompt("Paste the clipboard content here:", EDITOR.pseudoClipboard);
				prompt will only get the first row. We need a textarea so you can paste many rows!
			*/
			
			promptBox("Paste the clipboard content here:", EDITOR.pseudoClipboard, 0, function(data) {
				if(typeof data == "string" && data.length > 0) readSuccess(data);
				else readFail(new Error("Unable to access clipboard data! navigator.clipboard and window.clipboardData not available!"));
			});
			
		}
		
		function readSuccess(text) {
			console.log("getClipboardContent: readSuccess: text=" + text);
			callback(null, text);
		}
		
		function readFail(err) {
			
			// The Promise catch from navigator.clipboard.readText doesn't seem to give a proper error message ...
			if(!(err instanceof Error)) {
				if(typeof err == "undefined") err = new Error("Accessing the clipboard is Not supported by your browser!"+ 
				" You might have to clear all browsning data and answer Yes when prompted to allow accessing the clipboard.");
				else if(typeof err == "object") err = new Error(err.message || JSON.stringify(err));
				else err = new Error(JSON.stringify(err));
			}
			
			console.log("getClipboardContent: readFail: err.message=" + err.message);
			if(EDITOR.pseudoClipboard) {
				console.log("getClipboardContent: Using pseudoClipboard! data=" + EDITOR.pseudoClipboard);
				return callback(null, EDITOR.pseudoClipboard);
			}
			else {
				console.log("getClipboardContent: Nothing in pseudoClipboard! All attempts to read clipboard failed!");
				callback(err);
			}
		}
		
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
	
	var showFile; // Don't open switch to any other file when opening a file
	
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
		
		if(path == undefined) path = "new file";
		
		console.log("Opening file: " + path + " typeof text=" + typeof text);
		
		// Convert path delimters !? 
		
		
		// Just so that we are consistent
		if(text === null) throw new Error("text is null! It should be undefined for the file to open from disk"); // note: null == undefined = true
		
		
		if(typeof text === "function" && callback == undefined) {
			callback = text;
			text = undefined;
			// throw new Error("The callback should be in the third argument. Second argument is for file content");
		}

		// State parameter is optional
		if(typeof state === "function" && !callback) {
			callback = state;
			state = undefined;
		}
		
		if(state && state.show) {
			showFile = path;
			setTimeout(function() {
				showFile = undefined;
			}, 5000);
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
				
				if(EDITOR.currentFile != file && (showFile == undefined || showFile == path)) {
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
		
		if(!UTIL.isString(path)) return fileOpenError(new Error("EDITOR.openFile: Error: First argument is not a string: path=" + path));
		
		EDITOR.openFileQueue.push(path); // Add the file to the queue AFTER checking if it's in the queue
		console.log("File path=" + path + " added to EDITOR.openFileQueue=" + JSON.stringify(EDITOR.openFileQueue));
		
		if(text == undefined) {
			
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
						load(null, path, text, notFromDisk, null, tooBig);
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
				return fileOpenError(new Error("EDITOR.openFile: Error: Second argument is not a string: text=" + text));
				
			}
			else {
				load(null, path, text, null, true);
			}
			}
		
		function load(err, path, text, hash, notFromDisk, tooBig) {
			
			if(err) return callCallbacks(err);
			
			console.log("Loading file to editor: " + path);
			
			if(EDITOR.files.hasOwnProperty(path)) throw new Error("File is already opened:\n" + path);
			
			// Do not add file to EDITOR.files until its fully loaded! And fileOpen events can be run sync
			
			var newFile = new File(text, path, ++EDITOR.fileIndex, tooBig, fileLoaded);
			
			if(hash) newFile.hash = hash;
			
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
			
			// Able to set file properties when opening the file, before openFile listers fire!?
			if(state && state.props) {
				for(var prop in state.props) {
					newFile[prop] = state.props[prop];
				}
			}
			
			function fileLoaded(fileLoadError) {
				
				if(fileLoadError) return fileOpenError(fileLoadError);
				
				/*
					
					Dilemma1: Should file open even listeners be called before or after the callback!??
					answer: call callbacks first so that they can change the state of file.saved before calling file open listeners
					
					Dilemma 2: Should fileOpen events fire before or after fileShow events?
					answer: Does it matter? I forgot why ...
					
					problem1: The callback might change the file, triggering file.change() then plugins will go nuts because they have not seen the file (being opened) yet!
					sultion: The file open event listeners need to be called before the file open callback(s)!
					
					problem1.5: The callback might close the file!
					solution: Same solution as problem 1. callCallbacks should be called *after* file open events. Allow file state in EDITOR.openFile parameters.
					
					problem 2: You want to set properties to the file, that should be available when open-file-listeners are called
					solution: Use state and state.props in parameters to populate state and properties
					
				*/
				
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
				
				console.log("state?" + !!state + " state.show=" + (state && state.show) + " showFile=" + showFile + " path=" + path);
				if( (!state || state.show !== false) && (showFile == undefined || showFile == path) ) {
					// Switch to this file
					EDITOR.showFile(file);
					EDITOR.view.endingColumn = EDITOR.view.visibleColumns; // Because file.startColumn = 0;
				}
				else if(showFile != undefined) {
					console.warn("Not switching to " + path + " because showFile is set to " + showFile);
				}
				
				if(err || fileLoadError) throw new Error("err=" + err + " fileLoadError=" + fileLoadError);
				
				removeFromQueue(path);
				
				EDITOR.dashboard.hide(); // Hide dashboard when opening a file
				
				// Always render (and resize) after opening a file! (where=here, when=now!)
				EDITOR.renderNeeded();
				
				if(tooBig) alertBox(UTIL.getFilenameFromPath(path) + ' has been opened in "stream mode"!\nSome editor operations/plugins might not work.', "BIG_FILE");
				
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
				alertBox("Error when opening " + path + "\n" + err.message);
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
		
		console.log("EDITOR.getFileSizeOnDisk: path=" + path);
		
		if(!callback) throw new Error("Callback not defined!");
		
		var protocol = UTIL.urlProtocol(path);
		
		if(protocol == "http" || protocol == "https") {
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
		}
		else {
			var json = {path: path};
			CLIENT.cmd("getFileSizeOnDisk", json, function gotFileSizeFromServer(err, json) {
				if(err) return callback(err);
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
				if(err.code === 'ENOENT' || err.code == "550" || err.message.indexOf("No such file") != -1) {
					callback(false);
				}
				else {
					throw new Error("Unexpected error when checking if file exist (using EDITOR.getFileSizeOnDisk): err.code=" + err.code + " err.message=" + err.message);
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
			
			// Make sure lastFileShowed is not the file being closed
			if(EDITOR.lastFileShowed == file) {
				console.warn("lastFileShowed is the file being closed!");
				EDITOR.lastFileShowed = EDITOR.lastChangedFile([file]);
				console.log("Changed lastFileShowed to: " + EDITOR.lastFileShowed.path);
			}
			
			// Make sure lastFile is not currentFile
			if(EDITOR.lastFileShowed == EDITOR.currentFile && EDITOR.lastFileShowed != undefined) {
				console.warn("lastFile is the currentFile:" + EDITOR.currentFile.path);
				EDITOR.lastFileShowed = EDITOR.lastChangedFile([EDITOR.currentFile, file]);
			}
			
			// Sanity check
			if(EDITOR.lastFileShowed) {
				if(!EDITOR.files.hasOwnProperty(EDITOR.lastFileShowed.path)) {
					throw new Error("EDITOR.lastFileShowed does not exist in EDITOR.files! path=" + EDITOR.lastFileShowed.path + "\nWhen closing file.path=" + file.path);
					return;
				}
			}
			
			var switchTo; // Have to check this before removing the file reference
			if(EDITOR.currentFile == file) {
				EDITOR.currentFile = undefined; // Closed, kinda
				
				if(!doNotSwitchFile) { // double negative => true
					// The file we are closing is the current file, and we are "allowed" to swith 
					if(EDITOR.lastFileShowed) switchTo = EDITOR.lastFileShowed;
					else {
						// No other file has been shown before
						for (var filePath in EDITOR.files) {
							if(filePath != path) {
								switchTo = EDITOR.files[filePath];
								break;
							}
						}
					}
				}
			}
			
			delete EDITOR.files[path]; // Remove all references to the file BEFORE switching to another file
			
			setTimeout(function checkIfRemoved() { // Check again to make sure it has been removed
				if(EDITOR.files.hasOwnProperty(path)) throw new Error("Closed file is still in the editor! path=" + path + 
				"\nIt was closed 100ms ago. If you are running tests, use different file names for each test!");
			}, 30);
			
			if(switchTo) {
				console.log("Showing '" + switchTo.path + "' because '" + path + "' was closing.");
				EDITOR.showFile(switchTo, true, true);
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
		throw new Error("EDITOR.readFile is Not implemented!");
		/* 
			Returns a readable stream ...
			
			We should probably use streams everywhere! So that opening small and large files use the same method.
		*/
	}
	
	EDITOR.copyFolder = function(source, destination) {
		throw new Error("EDITOR.copyFolder is Not implemented!");
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
		
		//var protocol = UTIL.urlProtocol(path);
		
		var json = {path: path, returnBuffer: returnBuffer, encoding: encoding};
		
		CLIENT.cmd("readFromDisk", json, function readFromDiskServerResponse(err, json) {
			if(err) callback(err);
			else callback(null, json.path, json.data, json.hash);
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
		
		console.log("EDITOR.saveFile: path=" + path + " file.path=" + file.path + " file.hash=" + file.hash + " file.isSaved=" + file.isSaved + " file.savedAs=" + file.savedAs + " file.changed=" + file.changed)
		
		if(file == undefined) file = EDITOR.currentFile;
		
		if(!file) {
			throw new Error("No file open when save was called");
		}
		
		if(typeof path == "function" && callback == undefined) {
			callback = path;
			path = file.path;
		}
		
		if(path == undefined) {
			path = file.path;
		}
		
		if(file.isBig) {
			// Save the current buffer inside the original file
			CLIENT.cmd("writeLines", {start: file.partStartRow+1, end: file.partStartRow+EDITOR.settings.bigFileLoadRows+1, overwrite: true, path: path, content: file.text}, function linesWritten(err) {
				doneSaving(err, path);
			});
			return;
		}
		
		
		var trimmedPath = path.trim();
		if(path != trimmedPath) {
			console.warn("Path trimmed: " + UTIL.lbChars(path) + " => " + trimmedPath);
			path = trimmedPath;
		}
		
		var text = file.text; // Save the text, do not count on the garbage collector the be "slow"
		
		EDITOR.callEventListeners("beforeSave", file, function beforeSaveListenersCalled(errors, returns) {
			if(errors.length > 0) {
				var errorMessages = [];
				for (var i=0; i<errors.length; i++) {
					console.error(errors[i]);
					errorMessages.push(errors[i].message);
				}
				alertBox(errors.length + " tool(s) failed. Which might effect formatting etc of the file on disk!\n" + errorMessages.join("\n"), "FILE", "warning");
			}
			/*
				if(!file.savedAs && path == file.path) {
				EDITOR.pathPickerTool(path, function(err, newPath) {
					if(err) return callback(err);
					path = newPath;
					beginSaving();
				});
			}
			else 
			*/
			
			for(var fName in returns) {
				if( returns[fName] === PREVENT_DEFAULT ) {
					console.warn(fName + " prevented file from being saved!");
					if(callback) callback( new Error(fName + " prevented file from being saved!") );
					return;
				}
				else if ( returns[fName] !== ALLOW_DEFAULT ) {
					var error = new Error(fName + " returned " + returns[fName] + ". Expected ALLOW_DEFAULT=" + ALLOW_DEFAULT + " or PREVENT_DEFAULT=" + PREVENT_DEFAULT + " !");
					console.warn(error.message);
				}
			}
			
			beginSaving();
		});
		
		function beginSaving() {
			console.log("beginSaving: file.path=" + file.path + " path=" + path + " file.hash=" + file.hash + " file.isSaved=" + file.isSaved + " file.savedAs=" + file.savedAs + " file.changed=" + file.changed);
			if(file.path != path || !file.savedAs) {
				if(EDITOR.files.hasOwnProperty(path) && EDITOR.files[path] != file) {
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
							if(answer == overwrite) {
if(path != file.path) reOpen(file.path, path);
								else EDITOR.saveToDisk(file.path, file.text, doneSaving);
							}
							else {
								var err = new Error("User canceled the save (as) to prevent overwriting existing file");
								err.code = "CANCEL";
								callback(err);
							}
						});
					}
					else if(path != file.path) reOpen(file.path, path);
					else EDITOR.saveToDisk(file.path, file.text, doneSaving);
				});
			}
			else if(file.hash)  {
				// Check the hash before saving to prevent over-writing something
				CLIENT.cmd("hash", {path: file.path}, function(err, hash) {
					if(err) {
						if(err.code == "ENOENT") console.warn("File did not exist on disk: " + file.path);
						else {
							console.log("err.code=" + err.code);
							throw err;
						}
					}
					else if(file.hash != hash) {
						console.log("file.hash=" + file.hash + " hash=" + hash);
						alertBox("FAILED TO SAVE FILE.\nFile changed on disk!\nSave as another name to prevent losing data.", "FILE", "warning");
						return;
					}
					
					EDITOR.saveToDisk(file.path, file.text, doneSaving);
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
		
		function doneSaving(err, path, hash) {
			if(err) {
				if(callback) return callback(err, path);
				else throw err;
			}
			
			if(file.savedAs && path != file.path) throw new Error("Saved the wrong file!\npath=" + path + "\nfile.path=" + file.path); // Sanity check
			else if(path != file.path) {
				console.warn("File path updated: old=" + file.path + " new=" + path);
				file.path = path;
			}
			
			if(hash) file.hash = hash;
			
			console.log("Successfully saved " + file.path);
			
			// Change state to saved, and call afterSave listeners
			file.saved(function(err) {
				
				// Call back without an error even though some of the afterSave events failed.
				// Callers of EDITOR.saveFile is mostly most concerned about if the file successfully saved or not
				if(callback) callback(null, path);
				
			}); 
		}
	}
	
	
	EDITOR.saveToDisk = function(path, text, inputBuffer, encoding, saveToDiskCallback) {
		// You probably want to use EDITOR.saveFile instead!
		// This is used internaly by the editor, but exposed so plugins can save files that are not opened.
		
		// Only works with text files !
		
		if(typeof path != "string") throw new Error("path=" + path + " is not a string!");
		if(typeof text != "string") throw new Error("text=" + text + " is not a string!");
		
		if(typeof inputBuffer == "function" && saveToDiskCallback == undefined) {
			saveToDiskCallback = inputBuffer;
			inputBuffer = undefined;
		}
		else if(typeof encoding == "function" && saveToDiskCallback == undefined) {
			saveToDiskCallback = encoding;
			encoding = undefined;
		}
		
		if(inputBuffer != undefined && typeof inputBuffer != "boolean") throw new Error("Third argument inputBuffer need to be true,false or undefined!");
		if(inputBuffer != undefined && typeof encoding != "string") throw new Error("Fourth argument encoding need to be a string or undefined!");
		
		if(!saveToDiskCallback) console.warn("saveToDisk called without a callback function!");
		
		var trimmedPath = path.trim();
		if(path != trimmedPath) {
			console.warn("Path trimmed: " + UTIL.lbChars(path) + " => " + trimmedPath);
			path = trimmedPath;
		}
		
		var protocol = UTIL.urlProtocol(path);
		
			var json = {path: path, text: text, inputBuffer: inputBuffer, encoding: encoding};
			CLIENT.cmd("saveToDisk", json, function saveToDiskCmd(err, json) {
				if(err) {
				if(saveToDiskCallback) saveToDiskCallback(err);
				else throw err;
			}
			else {
				if(saveToDiskCallback) saveToDiskCallback(null, json.path, json.hash);
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
	
	EDITOR.sanitizeText = function sanitizeText(file, text) {
		// For example when pasting or dragging text to the editor
		
		if(typeof file == "string" && text == undefined) {
text = file;
			file = EDITOR.currentFile;
		}
		
		if(! file instanceof File) throw new Error("file should be a File object: filke=" + file);
		
		if(file == undefined) throw new Error("How can file be " + file + " ???");
		
		if(text == undefined) throw new Error("text=" + text);
		
		console.log("Calling sanitize listeners (" + EDITOR.eventListeners.sanitize.length + ") ...");
		for(var i=0, fun; i<EDITOR.eventListeners.sanitize.length; i++) {
			fun = EDITOR.eventListeners.sanitize[i].fun;
			text = fun(file, text);
			if(typeof text != "string") throw new Error("sanitize listener: " + UTIL.getFunctionName(fun) + " returned: (" + (typeof text) + ") \n" + text);
		}
		
		return text;
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
	
	EDITOR.render = function render(file, fileStartRow, fileEndRow, screenStartRow, canvas, ctx, renderOverride, background) {
		
		console.warn("EDITOR.render! renderOverride=" + renderOverride + " EDITOR.shouldRender=" + EDITOR.shouldRender + " Editor canvas ? " + (canvas == undefined || canvas == EDITOR.canvas));
		
		if(file == undefined) file = EDITOR.currentFile;
		
		if(canvas == undefined) {
			canvas = EDITOR.canvas;
			if(canvas == undefined) return; // Wait until canvas is set !?
			ctx = EDITOR.canvasContext;
		}
		else if(ctx == undefined) {
			if(EDITOR.settings.sub_pixel_antialias == false) {
				ctx = canvas.getContext("2d", {lowLatency: EDITOR.settings.lowLatencyCanvas, antialias: false});
			}
			else {
				ctx = canvas.getContext("2d", {alpha: false, lowLatency: EDITOR.settings.lowLatencyCanvas, antialias: true}); // {alpha: false} allows sub pixel anti-alias (LCD-text).
			}
		}
		
		if(!EDITOR.shouldRender && (canvas == EDITOR.canvas && !renderOverride)) {
			console.warn("Not rendering because it's not needed!");
			return;
		}
		
		if(EDITOR.shouldResize) {
			console.warn("Resizing before rendering!");
			EDITOR.resize();
			return; // resize always re-renders!
		}
		
		if(ctx == undefined || canvas == undefined) {
			console.warn("Not rendering because ctx or canvas is not yet available!");
			EDITOR.shouldRender = false;
			return; // If render runs too early (Uncaught TypeError: Cannot set property 'fillStyle' of undefined, or can ot get canvas.width of undefined)
		}
		
		if(canvas.width <= 0 || canvas.height <= 0) {
			EDITOR.shouldRender = false;
			console.warn("Not rendering because the canvas is too small! canvas.width=" + canvas.width + " canvas.height=" + canvas.height + " ");
			return;
		}
		
		if(screenStartRow == undefined) screenStartRow = 0; 
		// Used for only rendering some rows for optimization. 
		// Default is to render all rows, so screenStartRow = 0
		
		
		// Fix blurryness for screens with high pixel ratio
		if(pixelRatio !== 1) {
			ctx.restore();
			ctx.save();
			ctx.scale(pixelRatio,pixelRatio);
			//ctx.scale(1,1);
		}
		
		/*
			I tried over-riding the pixel ratio to 1 in order to get better performace on mobile,
			but it had no effect of rending performance, while making the text blurry!
		*/
		
		if(canvas == EDITOR.canvas) EDITOR.shouldRender = false; // Flag (change to true whenever we need to render)
		
		//console.warn("rendering ...");
		
		if(EDITOR.currentFile && ctxMenuVisibleOnce) {
			
			//console.log("render file=" + EDITOR.currentFile.path);
			
			console.time("render");
			
			if(!EDITOR.currentFile.render) {
				console.warn("File render flag set to '" + EDITOR.currentFile.render + "'");
				
				// Just paint the background
				ctx.fillStyle = EDITOR.settings.style.bgColor;
				
				//ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				return;
			}
			
			var file = EDITOR.currentFile;
			var buffer = [];
			var grid = EDITOR.currentFile.grid;
			var funName = "";
			
			// The reason why we clone the rows and not just push the pointer, is so that the coloring functions don't have to reset all the colors!
			
			// Create the buffer
			//console.time("createBuffer");
			
			// For the render functions, the first row is always at the top!
			
			if(fileStartRow == undefined) fileStartRow = file.startRow;
			if(fileEndRow == undefined) fileEndRow = fileStartRow + EDITOR.view.visibleRows;
			
			var bufferStartRow = Math.max(0, fileStartRow);;
			var bufferEndRow = Math.min(grid.length-1, fileEndRow);
			var maxColumns = Math.max(EDITOR.view.endingColumn, EDITOR.view.visibleColumns *2); // Optimization: Cut off what we can not see
			if(maxColumns < 20) maxColumns = 20;
			for(var row = bufferStartRow; row <= bufferEndRow; row++) {
				buffer.push(file.cloneRow(row, maxColumns)); // Clone the row
			}
			//console.timeEnd("createBuffer");
			
			
			
			if(buffer.length == 0) {
				console.warn("buffer is zero! bufferStartRow=" + bufferStartRow + " bufferEndRow=" + bufferEndRow + " fileStartRow=" + fileStartRow + 
				" file.startRow=" + file.startRow + " grid.length=" + grid.length + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
			}
			
			// Load on the fly functionality on the buffer
			
			// Actually measuring the time is a lot of overhead! Only uncomment if you are debugging performance issues.
			//console.time("preRenders");
			for(var i=0; i<EDITOR.preRenderFunctions.length; i++) {
				//funName = UTIL.getFunctionName(EDITOR.preRenderFunctions[i]);
				//console.time("prerender: " + funName);
				buffer = EDITOR.preRenderFunctions[i](buffer, file, bufferStartRow); // Call render
				//console.timeEnd("prerender: " + funName);
			}
			//console.timeEnd("preRenders");
			// preRenderFunctions could be optimized using web workers!
			
			// Find out if the buffer contains zero with characters ( might need optimization )
			if(buffer.length > 0) {
				var startIndex = buffer[0].startIndex;
				var endIndex = buffer[buffer.length-1].startIndex + buffer[buffer.length-1].length;
				var containZeroWidthCharacters = (UTIL.indexOfZeroWidthCharacter(file.text.substring(startIndex, endIndex)) != -1);
				}
			else var containZeroWidthCharacters = false;
			
			//ctx.imageSmoothingEnabled = true;
			
			//ctx.translate(0,0);
			
			if(background == undefined) background = EDITOR.settings.style.bgColor;
			
			ctx.fillStyle = background;
			//ctx.fillStyle = "orange";
			// Clear the screen
			//ctx.clearRect(0, 0, EDITOR.view.canvasWidth, EDITOR.view.canvasHeight);
			var fillX = 0;
			var fillY = screenStartRow==0 ? 0: screenStartRow * EDITOR.settings.gridHeight + EDITOR.settings.topMargin;
			var fillWidth = EDITOR.view.canvasWidth;
			var fillHeight = (fileEndRow-fileStartRow+1) * EDITOR.settings.gridHeight + (screenStartRow==0 ? EDITOR.settings.topMargin : 0);
			console.log("fillX=" + fillX + " fillY=" + fillY + " fillWidth=" + fillWidth + " fillHeight=" + fillHeight);
			ctx.fillRect(fillX, fillY, fillWidth, fillHeight);
			
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			// Render functions need to be ordered, so we can't optimize them with web workers
			//console.time("renders");
			for(var i=0; i<EDITOR.renderFunctions.length; i++) {
				//funName = UTIL.getFunctionName(EDITOR.renderFunctions[i]);
				//console.time("render: " + funName);
				EDITOR.renderFunctions[i](ctx, buffer, EDITOR.currentFile, screenStartRow, containZeroWidthCharacters, bufferStartRow, bufferEndRow); // Call render
				//console.timeEnd("render: " + funName);
			}
			//console.timeEnd("renders");
			
			if(file.caret.row >= bufferStartRow && file.caret.row <= bufferEndRow) {
				EDITOR.renderCaret(file.caret, 0, EDITOR.settings.caret.color, screenStartRow, bufferStartRow, bufferEndRow);
			}
			
			if (ctx.commit) ctx.commit();
			
			lastBufferStartRow = bufferStartRow;
			
			console.timeEnd("render");
			
		}
		else {
			// Show some useful info for new users ...
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			ctx.fillStyle = EDITOR.settings.style.textColor;
			
			ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			ctx.textBaseline = "middle";
			
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
			
			var friendlyString = [
				"Right click or long-touch to show the menu!",
				"(or click the menu button in top-right corner)",
				"Upload files and folders by draging them here"
			];
			
			if(friendlyString.length > 0) {
				// Place the string(s) in the center
				var maxLength = 0;
				var longestString = "";
				for (var i=0; i<friendlyString.length; i++) {
					if(friendlyString[i].length > maxLength) {
						longestString = friendlyString[i];
						maxLength = friendlyString[i].length;
					}
				}
				
				var textMeasure = ctx.measureText(longestString);
				var left = EDITOR.view.canvasWidth / 2 - textMeasure.width / 2;
				var top =  EDITOR.view.canvasHeight / 2 - 20*friendlyString.length;
				
				ctx.beginPath(); // Reset all the paths!
				for (var i=0; i<friendlyString.length; i++) {
					ctx.fillText(friendlyString[i], left, top + 20 * i);
				}
				
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
			
			var screenStartRow = Math.max(0, gridRow - file.startRow);
			
			console.time("renderRow");
			
			var buffer = [];
			
			// Create the buffer
			buffer.push(file.cloneRow(gridRow, 100)); // Clone the row
			
			
			// Load on the fly functionality on the buffer
			// No prerender when rendering rows!?
			
			for(var i=0; i<EDITOR.preRenderFunctions.length; i++) {
				buffer = EDITOR.preRenderFunctions[i](buffer, file);
			}
			
			// Find out if the buffer contains zero with characters ( might need optimization )
			if(buffer.length > 0) {
				var startIndex = buffer[0].startIndex;
				var endIndex = buffer[buffer.length-1].startIndex + buffer[buffer.length-1].length;
				var containZeroWidthCharacters = (UTIL.indexOfZeroWidthCharacter(file.text.substring(startIndex, endIndex)) != -1);
			}
			else var containZeroWidthCharacters = false;
			
			//console.log(JSON.stringify(buffer, null, 4));
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			
			var top = EDITOR.settings.topMargin + screenStartRow * EDITOR.settings.gridHeight;
			
			// Clear only that row
			ctx.fillRect(0, top, canvas.width, EDITOR.settings.gridHeight);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			console.log("Rendering gridRow=" + gridRow);
			
			for(var i=0; i<EDITOR.renderFunctions.length; i++) {
				EDITOR.renderFunctions[i](ctx, buffer, file, screenStartRow, containZeroWidthCharacters, gridRow, gridRow); // Call render
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
		
		var middle = EDITOR.settings.topMargin + (row - file.startRow) * EDITOR.settings.gridHeight + Math.floor(EDITOR.settings.gridHeight/2);
		var left = EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth;
		
		ctx.fillStyle = textColor;
		
		//ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillText(character, left, middle);
		
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
	
	EDITOR.renderCaret = function(caret, colPlus, fillStyle, screenStartRow, bufferStartRow) {
		var file = EDITOR.currentFile;
		if(file == undefined) return;
		
		if(colPlus == undefined) colPlus = 0;
		if(fillStyle == undefined) fillStyle = EDITOR.settings.caret.color;
		if(screenStartRow == undefined) screenStartRow = 0;
		if(bufferStartRow == undefined) bufferStartRow = file.startRow;
		
		var row = caret.row;
		var col = caret.col + colPlus;
		
		if(!file.grid[row]) throw new Error("row=" + row + " does not exist in file grid! file.grid.length=" + file.grid.length + " file.path=" + file.path + " caret=" + JSON.stringify(caret) + " file.caret==caret?" + (file.caret==caret));
		
		// Math.floor to prevent sub pixels
		var top = Math.floor(EDITOR.settings.topMargin + (row - bufferStartRow + screenStartRow) * EDITOR.settings.gridHeight);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth);
		
		ctx.fillStyle = fillStyle;
		
		ctx.fillRect(left, top, EDITOR.settings.caret.width, EDITOR.settings.gridHeight);
		
		// Show the "direction" of the caret
		ctx.fillRect(left, top+EDITOR.settings.gridHeight - EDITOR.settings.caret.width, 4, EDITOR.settings.caret.width);
		
	}
	
	EDITOR.renderNeeded = function renderNeeded() {
		// Tell the editor that it needs to render
		
		console.warn("Render needed!");
		
		if(EDITOR.settings.devMode && EDITOR.shouldRender == false) {
			// For debugging, so we know why a render was needed
			console.log(UTIL.getStack("renderNeeded"));
		}
		EDITOR.shouldRender = true;
		
		if(EDITOR.animationFunctions.length > 0 && !isAnimating && window.requestAnimationFrame) {
			window.requestAnimationFrame(animate);
		}
	}
	
	EDITOR.resize = function(resizeOverride) {
		/*
			
			Note: Chaning the width/height of the canvas will clear it!
			
		*/
		
		if(!EDITOR.shouldResize && !resizeOverride) {
console.warn("Not resizing because EDITOR.shouldResize=" + EDITOR.shouldResize); // Don't resize if it's not needed.
		return;
		}
		
		EDITOR.shouldResize = false; // Prevent this function from running again
		
		//if(EDITOR.lastKeyPressed=="a") throw new Error("why resize now?");
		
		
		
		console.time("resize");
		
		pixelRatio = window.devicePixelRatio || 1; // "Retina" displays gives 2
		
		var windowHeight = parseInt(window.innerHeight);
		var windowWidth = parseInt(window.innerWidth);
		
		// Resize listeners (before)
		console.log("Calling beforeResize listeners (" + EDITOR.eventListeners.beforeResize.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.beforeResize.length; i++) {
			EDITOR.eventListeners.beforeResize[i].fun(EDITOR.currentFile, windowWidth, windowHeight);
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
		var virtualKeyboard = document.getElementById("virtualKeyboard2");
		if(!footer) {
console.warn("Not resizing because no footer!"); // Page has not yet fully loaded
		return;
		}
		
		var headerHeight = parseInt(header.offsetHeight);
		var footerHeight = parseInt(footer.offsetHeight);
		var virtualKeyboardHeight = parseInt(virtualKeyboard.offsetHeight);
		var headerFooterHeight = headerHeight + footerHeight + virtualKeyboardHeight;
		var leftColumnWidth = parseInt(leftColumn.offsetWidth);
		var rightColumnWidth = parseInt(rightColumn.offsetWidth);
		var leftRightColumnWidth = leftColumnWidth + rightColumnWidth;
		var contentWidth = windowWidth - leftRightColumnWidth;
		var contentHeight = windowHeight - headerFooterHeight;
		var columnsHeight = contentHeight;
		
		
		if(QUERY_STRING["debug"]) {
			console.log("windowWidth=" + windowWidth);
			console.log("windowHeight=" + windowHeight);
			console.log("leftColumnWidth=" + leftColumnWidth);
			console.log("rightColumnWidth=" + rightColumnWidth);
			console.log("leftRightColumnWidth=" + leftRightColumnWidth);
			console.log("headerHeight=" + headerHeight);
			console.log("footerHeight=" + footerHeight);
			console.log("headerFooterHeight=" + headerFooterHeight);
			console.log("contentWidth=" + contentWidth + " (offsetWidth=" + content.offsetWidth + " innerWidth=" + content.innerWidth + " )");
			console.log("contentHeight=" + contentHeight + " (offsetHeight=" + content.offsetHeight + " innerHeight=" + content.innerHeight + " )");
			console.log("columnsHeight=" + columnsHeight + " (offsetHeight=" + columns.offsetHeight + " innerHeight=" + columns.innerHeight + " )");
			
			console.log("offsetWidth=" + content.offsetWidth);
			console.log("innerWidth=" + content.innerWidth);
			console.log("outherWidth=" + content.outherWidth);
		}
		
		EDITOR.height = windowHeight;
		EDITOR.width = windowWidth;
		
		
		//UTIL.objInfo(centerColumn);
		
		if(contentHeight < 0) {
			/*
				The header and footer is too high to fit on the page!
				The footer is probably the biggest offender, try to limit it's height ...
			*/ 
			
			console.log("resize: contentHeight=" + contentHeight);
			
			var someMargin = 15;
			var footerHeightLimit = footerHeight + contentHeight - someMargin;
			
			footer.style.maxHeight = footerHeightLimit + "px";
			
			//shareHeight(footer.childNodes, footerHeightLimit);
			contentHeight = 0;
			
			setTimeout(function resetFooterMaxHeight() {
				footer.style.maxHeight = "";
			}, 1000);
		}
		
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
		
		
		
		// Set a static with and height to wrappers so that dynamic changes wont resize the wireframe 
		// (wrappes should have css: overflow: auto!important;)
		
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
		
		
		//if(pixelRatio >= 1) {
		var canvasWidth = EDITOR.view.canvasWidth * pixelRatio;
		var canvasHeight = EDITOR.view.canvasHeight * pixelRatio;
		//}
		//else {
		//var canvasWidth = EDITOR.view.canvasWidth / pixelRatio;
		//var canvasHeight = EDITOR.view.canvasHeight / pixelRatio;
		//}
		
		console.log("pixelRatio=" + pixelRatio + " canvasWidth=" + canvasWidth + " canvasHeight=" + canvasHeight);
		
		if( canvas && (canvas.width != canvasWidth || canvas.height != canvasHeight || resizeOverride) ) {
			
			canvas.style.width = EDITOR.view.canvasWidth + "px";
			canvas.style.height = EDITOR.view.canvasHeight + "px";
			
			canvas.width  = canvasWidth;
			canvas.height = canvasHeight;
			
			// The canvas is reset when resizing!
			// Font is only set *once* (when resizing) because it's very expensive
			//EDITOR.canvas.mozOpaque = true; // Doesn't seem to improve performance in Firefox
			EDITOR.canvasContext.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			EDITOR.canvasContext.textBaseline = "middle";
			
			// Squeeze the margin on really small screens
			if(EDITOR.view.canvasWidth < 500 && EDITOR.currentFile) {
				var maxLine = Math.max(10, EDITOR.currentFile.grid.length+1);
				var lineLetters = (" " + maxLine).trim().length;
				EDITOR.settings.leftMargin = Math.floor(EDITOR.settings.gridWidth * lineLetters + EDITOR.settings.gridWidth + 5);
			}
			
			// Calculate the scroll zone
			// To make sure the line do not cross letters, so the line can be cleared for the vertical scroll optimization
			EDITOR.settings.verticalScrollZone = EDITOR.settings.gridWidth*3 + EDITOR.settings.rightMargin; // Scrollbar zone, right
			EDITOR.settings.horizontalScrollZone = EDITOR.settings.gridHeight*2 + EDITOR.settings.topMargin; // Scrollbar zone, bottom. When touching down in the zone we should scroll
			
			console.log("Set canvas: canvas.width=" + canvas.width + " canvas.height=" + canvas.height + " canvas.style.width=" + canvas.style.width + " canvas.style.height=" + canvas.style.height);
		
			// Need to re-render after resizing the canvas!
			console.log("re-render after resizing the canvas!");
			EDITOR.shouldRender = true;
			
		}
		else if(canvas) {
			console.log("Not resetting canvas dimensions. It's already at canvas.width=" + canvas.width + " canvas.height=" + canvas.height);
		}
		
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
			EDITOR.eventListeners.afterResize[i].fun(EDITOR.currentFile, windowWidth, windowHeight);
		}
		
		// Show the canvas nodes again
		//setTimeout(showCanvasNodes, 1000);
		
		//showCanvasNodes();
		
		// Show the file canvas again and set focus
		
		
		
		console.timeEnd("resize");
		
		
		if(EDITOR.shouldRender) resizeAndRender(true);
		
		
		function shareHeight(elements, maxTotalHeight) {
			
			// If there are many elements in leftColumn or rightColumn, they have to share the height
			
			console.log("resize: shareHeight: maxTotalHeight=" + maxTotalHeight + " elements: ", elements);
			
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
		
		/*
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
		*/
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
			var errorMsg = "eventName=" + eventName + " does not exist in EDITOR.eventListeners!";
			if(eventName == "fileSave") errorMsg += " Did you mean afterSave ?";
			throw new Error(errorMsg);
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
		
		//console.log("Adding function " + UTIL.getFunctionName(options.fun) + " to event " + eventName);
		
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
		
		if(eventName == "registerAltKey" && EDITOR.registeredAltKeys.length > 0) {
			for (var i=0; i<EDITOR.registeredAltKeys.length; i++) {
				options.fun(EDITOR.registeredAltKeys[i]);
			}
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
	
	// Add feature icons for discovery
	EDITOR.discoveryBar = {
		add: function addDiscoveryItem() {
			
		},
		remove: function removeDiscoveryItem() {
			
		},
		update: function updateDiscoveryItem() {
			
		},
		show: function showDiscoveryBar() {
		},
		hide: function hideDiscoveryBar() {
		},
		isVisible: true
	}
	
	
	function DropdownMenu(options) {
		if(typeof options == "undefined") options = {};
		
		var menu = this;
		
		menu.items = {};
		
		menu.orientation = options.orientation || "vertical";
		
		if(options.parentMenu === undefined) throw new Error("No parentMeny specified in options=" + JSON.stringify(options));
		menu.parentMenu = options.parentMenu;
		
		menu.pullout = options.pullout || (menu.parentMenu && menu.parentMenu.parentMenu ? "right" : "bottom");
		
		menu.active = false; // If the mouse is on the menu
		menu.activated = false; // true if the menu have been engaged
		
		console.warn("new DropdownMenu: menu.orientation=" + menu.orientation);
		
		if(menu.orientation == "vertical") {
			// Each item is a table-row
			menu.domElement = document.createElement("table");
			menu.domElement.setAttribute("border", "2");
			menu.itemWrapper = menu.domElement;
		}
		else if(menu.orientation == "horizontal") {
			// Each item is it's own table
			menu.domElement = document.createElement("table");
			menu.itemWrapper = document.createElement("tr");
			menu.domElement.appendChild(menu.itemWrapper);
		}
		else throw new Error("Unknown orientation=" + menu.orientation);
		
		
		
		menu.domElement.setAttribute("class", "menu pullout" + menu.pullout);
		
		var hideTimer;
		menu.domElement.addEventListener("mouseout", hideMaybe);
		
		menu.domElement.addEventListener("mouseover", stillActive);
		
		var windowMenu = document.getElementById("windowMenu");
		windowMenu.appendChild(menu.domElement); // All menus goes into the windowMenu div (no nested lists!)
		
		function stillActive(mouseEvent) {
			if(!mouseEvent) mouseEvent = event;
			var element = mouseEvent.toElement || mouseEvent.relatedTarget;
			
			console.log("DropdownMenu:stillActive: ul=", menu.domElement, " movedto=", element);
			menu.active = true;
		}
		
		function hideMaybe(mouseEvent) {
			if(!mouseEvent) mouseEvent = event;
			
			/*
				Problem 1: We can't have nested lists or the CSS would be too complicated
				Problem 2: mouseout triggers when mouse enters a child element!
				Solution: Mark the menu as active when mouseover! (as mouseover will re-trigger when entering child elements)
				
				
			*/
			
			var element = mouseEvent.toElement || mouseEvent.relatedTarget;
			console.log("DropdownMenu:hideMaybe: ul=", menu.domElement, " movedto=", element);
			
			menu.active = false;
			
			
			// A timer to check if it's still not active (could have moved onto a child element which makes it active again)
			clearTimeout(hideTimer);
			hideTimer = setTimeout(function() {
				
				if(menu.active) return;
				
				// Don't hide if any of the sub menus are active!
				var oneChildActive = false;
				var oneParentActive = false;
				
				check(menu.items);
				
				var parent = menu;
				while(parent.parentMenu) {
					if(parent.active) {
						oneParentActive = true;
						break;
					}
					parent = parent.parentMenu;
				}
				
				if(!oneChildActive) menu.hide(true, !oneParentActive);
				
				function check(items) {
					
					var subMenu;
					for(var item in items) {
						subMenu = items[item].subMenu;
						
						if(subMenu) {
							if(subMenu.active) {
								oneChildActive = true;
								console.log("DropdownMenu:hideMaybe:check: item=" + item + " subMenu.active=" + subMenu.active);
								return;
							}
							check(subMenu.items);
						}
					}
				}
				
			}, 300);
		}
		
	}
	DropdownMenu.prototype.addItem = function addItem(label, key, whenClicked) {
		if(typeof key == "function" && whenClicked == undefined) {
			whenClicked = key;
			key = undefined;
		}
		
		var menu = this;
		
		if(menu.items.hasOwnProperty(label)) throw new Error("Menu already have an item with label=" + label);
		
		var item = menu.items[label] = new DropdownMenuItem({label: label, whenClicked: whenClicked, parentMenu: menu, key: key, orientation: menu.orientation});
		
		if(menu.orientation == "vertical") {
			// Each item is a table-row
			menu.itemWrapper.appendChild(item.domElement);
		}
		else if(menu.orientation == "horizontal") {
			// Each item is it's own table
			// Create imentiereate cell
			var cell = document.createElement("td");
			cell.appendChild(item.domElement);
			menu.itemWrapper.appendChild(cell);
		}
		else throw new Error("Unknown orientation=" + menu.orientation);
		
		
		
		console.log("DropdownMenu:addItem: label=" + label + " menu.orientation=" + menu.orientation);
		
		return item;
	}
	DropdownMenu.prototype.show = function show(parentItemRect) {
		var menu = this;
		
		if(parentItemRect == undefined) throw new Error("Must specify a BoundingClientRect (of the parent element) as first argument!")
		
		
		menu.domElement.style.display = ""; // Reset to default
		
		
		console.log("parentItemRect=" + JSON.stringify(parentItemRect));
		
		var borderWidth = 1;
		var menuTop = 0;
		var menuLeft = 0;
		var menuWidth = parentItemRect.width;
		
		
		if(menu.pullout == "bottom") {
			menuTop = parentItemRect.top + parentItemRect.height;
			menuLeft = parentItemRect.left - borderWidth;
		}
		else if(menu.pullout == "right") {
			menuTop = parentItemRect.top;
			menuLeft = parentItemRect.left + parentItemRect.width;
		}
		else throw new Error("Unknown value for menu.pullout=" + menu.pullout);
		
		
		// Does it fit on the right side ?
		var menuRect = menu.domElement.getBoundingClientRect();
		console.log("menuRect=" + JSON.stringify(menuRect));
		var windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		
		if(windowWidth) {
			if( (menuLeft + menuWidth) > windowWidth) {
				console.log("Pullout " + menu.pullout + " menu doesn't fit on the right side! windowWidth=" + windowWidth + " menuLeft=" + menuLeft + " menuWidth=" + menuWidth);
				
				if( (parentItemRect.left - menuWidth) >= 0) {
					// It fits on the left side. Place it on left side
					menuLeft = parentItemRect.left - menuWidth - borderWidth*2;
				}
				else {
					console.warn("Pullout " + menu.pullout + " menu doesn't fit on the left side either! parentItemRect.left=" + parentItemRect.left + " menuWidth=" + menuWidth + " (" + (parentItemRect.left - menuWidth) + ") ");
				}
			}
		}
		
		menu.domElement.style.position="absolute";
		menu.domElement.style.minWidth = menuWidth + "px";
		menu.domElement.style.top = menuTop + "px";
		menu.domElement.style.left = menuLeft + "px";
		
		
	}
	DropdownMenu.prototype.hide = function hide(hideChildren, hideParents) {
		var menu = this;
		
		if(hideParents) {
			if(menu.parentMenu) menu.parentMenu.hide(false, hideParents);
		}
		
		if(hideChildren) {
			var subMenu;
			for(var item in menu.items) {
				subMenu = menu.items[item].subMenu;
				
				if(subMenu) {
					subMenu.hide(true, hideParents);
				}
			}
		}
		
		if(menu.parentMenu === null) {
			menu.activated = false;
			return; // Never hide the stem
		}
		
		console.warn("DropdownMenu:hide: menu.parentMenu?" + (!!menu.parentMenu) + " menu.activated=" + menu.activated);
		
		menu.domElement.style.display = "none";
		//menu.domElement.setAttribute("class", "hidden");
	}
	DropdownMenu.prototype.hideSiblings = function hide(stay) {
		var menu = this;
		
		for(var item in menu.items) {
			if(menu.items[item].subMenu && menu.items[item].subMenu != stay) menu.items[item].subMenu.hide(true, false);
		}
		
	}
	
	
	function DropdownMenuItem(options) {
		
		if(typeof options != "object") throw new Error("Expected an object: options=" + options);
		
		var item = this;
		
		if(options.parentMenu === undefined) throw new Error("No parentMenu specified in options=" + JSON.stringify(options));
		item.parentMenu = options.parentMenu;
		
		var label = options.label;
		if(!label) throw new Error("No label specified in options=" + JSON.stringify(options));
		
		var whenClicked = options.whenClicked;
		
		if(options.orientation == "vertical") {
			// Each item is a table row
			item.domElement = document.createElement("tr");
			item.wrapper = item.domElement;
		}
		else if(options.orientation == "horizontal") {
			// Each item is it's own table
			item.domElement = document.createElement("table");
			item.wrapper = document.createElement("tr");
			item.domElement.appendChild(item.wrapper);
		}
		else throw new Error("Unknown orientation=" + options.orientation);
		
		item.domElement.setAttribute("class", "item");
		
		item.text = document.createElement("td");
		item.text.setAttribute("class", "label");
		item.text.innerText = label;
		item.wrapper.appendChild(item.text);
		
		if(options.key) {
			var key = document.createElement("td");
			key.setAttribute("class", "key");
			key.innerText = options.key;
			item.wrapper.appendChild(key);
		}
		
		item.domElement.onclick = whenClicked;
		
		item.subMenu = null;
	}
	DropdownMenuItem.prototype.addSubmenu = function addSubmenu() {
		var item = this;
		
		var pulloutIcon = document.createElement("td");
		if(item.parentMenu && item.parentMenu.parentMenu) {
			var pullout = "right";
			pulloutIcon.innerText = "►";
		}
		else {
			var pullout = "bottom";
			pulloutIcon.innerText = "▼";
		}
		pulloutIcon.setAttribute("class", "pulloutIcon " + pullout);
		item.wrapper.appendChild(pulloutIcon);
		
		if(!item.parentMenu) throw new Error("item.parentMenu=" + item.parentMenu);
		
		var stemParent = item.parentMenu;
		while(stemParent.parentMenu) {
			stemParent = stemParent.parentMenu;
		}
		
		item.subMenu = new DropdownMenu({parentMenu: item.parentMenu, orientation: "vertical", pullout: pullout});
		item.domElement.setAttribute("class", "hasSubmenu");
		
		if(!item.domElement.onclick) {
			item.domElement.onclick = showSubmenu;
			item.domElement.addEventListener("mouseover", showSubmenuMaybe);
			item.domElement.setAttribute("class", "hasSubmenu needClick");
		}
		else {
			item.domElement.addEventListener("mouseover", showSubmenu);
		}
		
		item.subMenu.hide(false);
		
		console.log("DropdownMenuItem:addSubmenu: pullout=" + pullout + " item.parentMenu=" + item.parentMenu + " item.parentMenu.parentMenu=" + (item.parentMenu && item.parentMenu.parentMenu));
		
		return item.subMenu;
		
		
		function showSubmenu() {
			var rect = item.domElement.getBoundingClientRect();
			
			if(stemParent) stemParent.activated = true;
			
			item.subMenu.show(rect);
		}
		
		function showSubmenuMaybe() {
			if(stemParent && stemParent.activated) {
				
				item.parentMenu.hideSiblings(item.subMenu);
				showSubmenu();
			}
			
		}
		
	}
	
	
	var dropdownMenuRoot;
	EDITOR.windowMenu = {
		add: function addWindowMenuItem(label, where, whenClicked) {
			
			if(!dropdownMenuRoot) {
				var windowMenu = document.getElementById("windowMenu");
				if(!windowMenu) {
					// Wait for HTML to load
					setTimeout(function() {
						addWindowMenuItem(label, where, whenClicked);
					}, 300);
					return;
				}
				
				dropdownMenuRoot = new DropdownMenu({orientation: "horizontal", parentMenu: null});
			}
			
			if(!Array.isArray(where)) throw new Error("Where to put the mnu item? Second argument (where) needs to be an array!");
			
			var menu = dropdownMenuRoot;
			var item;
			for(var i=0; i<where.length; i++) {
				item = menu.items[ where[i] ];
				
				if(!item) {
					item = menu.addItem(where[i]);
				}
				
				menu = item.subMenu;
				if(!menu) {
					menu = item.addSubmenu();
				}
			}
			
			var key = "Ctrl+Alt+Shift+M";
			
			item = menu.addItem(label, key, whenClicked);
			return item;
			
		},
		remove: function removeWindowMenuItem() {
		},
		update: function updateWindowMenuItem(item) {
		},
		show: function showWindowMenu() {
		},
		hide: function hideWindowMenu() {
			var windowMenu = document.getElementById("windowMenu");
			windowMenu.style.display="none";
			
			var windowMenuHeight = document.getElementById("windowMenuHeight");
			windowMenuHeight.style.display="none";
		},
		isVisible: true
	}
	
	// TEST-CODE-START
	
	EDITOR.windowMenu.add("Submenu A1 a", ["Menugroup A"]);
	EDITOR.windowMenu.add("Submenu A2 ab", ["Menugroup A"]);
	EDITOR.windowMenu.add("Submenu A3 abc", ["Menugroup A"], function() {alertBox("menu click");});
	EDITOR.windowMenu.add("Submenu A3-1", ["Menugroup A", "Submenu A3"]);
	EDITOR.windowMenu.add("Submenu A3-2", ["Menugroup A", "Submenu A3"]);
	
	EDITOR.windowMenu.add("Submenu B1", ["Menugroup B"]);
	EDITOR.windowMenu.add("Submenu B2", ["Menugroup B"]);
	EDITOR.windowMenu.add("Submenu B3", ["Menugroup B"], function() {alertBox("menu click");});
	EDITOR.windowMenu.add("Submenu B3-1", ["Menugroup B", "Submenu B3"]);
	EDITOR.windowMenu.add("Submenu B3-2", ["Menugroup B", "Submenu B3"]);
	
	EDITOR.windowMenu.add("Submenu C1", ["Menugroup C"]);
	EDITOR.windowMenu.add("Submenu C2", ["Menugroup C"]);
	EDITOR.windowMenu.add("Submenu C3", ["Menugroup C"], function() {alertBox("menu click");});
	EDITOR.windowMenu.add("Submenu C3-1", ["Menugroup C", "Submenu C3"]);
	EDITOR.windowMenu.add("Submenu C3-2", ["Menugroup C", "Submenu C3"]);
	
	// TEST-CODE-END
	
	
	EDITOR.ctxMenu = {
		add: function addCtxMenuItem(htmlText, position, callback) {
			if(typeof position == "function" && typeof callback == "number") {
				var posTemp = callback;
				callback = position;
				position = posTemp;
			}
			else if(typeof position == "function" && callback == undefined) {
				callback = position;
				position = undefined;
			}
			
			if(typeof htmlText != "string") throw new Error("EDITOR.ctxMenu.add: First argument htmlText need to be a (HTML) string!");
			
			
			var menu = document.getElementById("canvasContextmenu");
			
			var li = document.createElement("li");
			li.setAttribute("class", "item");
			
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
				li.setAttribute("position", position);
				//menu.insertBefore(li, menu.children[position]);
			}
			else {
				li.setAttribute("position", "10");
				//menu.insertBefore(li, menu.children[position]);
			}
			
			menu.appendChild(li);
			
			// Re-order the menu items
			var items = Array.prototype.slice.call( menu.getElementsByTagName("LI"), 0 );
			items.sort(function(a,b) {
				var pA = parseInt(a.getAttribute("position"));
				var pB = parseInt(b.getAttribute("position"));
				
				if(pA > pB) return 1;
				else if(pB > pA) return -1;
				else return 0;
				
			});
			items.forEach(function (li) {
				menu.appendChild(li);
			});
			
			// Don't forget to call EDITOR.ctxMenu.hide() after the item has been clicked!
			
			return li;
		},
		remove: function removeCtxMenuItem(menuElement) {
			
			if(!menuElement) throw new Error("EDITOR.ctxMenu.remove was called with no function parameters! menuElement=" + menuElement);
			if(!menuElement.tagName) throw new Error("EDITOR.ctxMenu.remove argument menuElement is not a HTML node!");
			
			var menu = document.getElementById("canvasContextmenu");
			
			var positionIndex = Array.prototype.indexOf.call(menu.children, menuElement);
			
			if(menuElement.parentNode == undefined) {
				console.warn("menuElement has no parent! menuElement.innerHTML=" + menuElement.innerHTML);
				return;
			}
			
			if(menuElement.parentNode == menu) menu.removeChild(menuElement);
			else throw new Error("menuElement not part of menu! menuElement.innerHTML=" + menuElement.innerHTML + "\nmenu.innerHTML=" + menu.innerHTML + "\nmenuElement.parent.innerHTML=" + menuElement.parent.innerHTML);
			
			return positionIndex; // So another node can be inserted at this position
			
			function getItemPosition(child) {
				var i = 0;
				while( (child = child.previousSibling) != null ) i++;
				return i;
			}
			
		},
		update: function updateCtxMenuItem(menuElement, active, htmlText, callback) {
			
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
			
		},
		addTemp: function addTempCtxMenuItem(htmlText, addSeparator, callback) {
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
			li.setAttribute("class", "item");
			
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
			
		},
		hide: function hideCtxMenu() {
			
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
			
		},
		show: function showCtxMenu(posX, posY, clickEvent) {
			
			if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("ctxMenu") != -1) return new Error("Menu is disabled by query string!");;
			
			if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
			if(typeof clickEvent != "undefined" && typeof clickEvent.preventDefault == "function") clickEvent.preventDefault();
			
			clearSelection();
			if(ctxMenuVisibleOnce == false) EDITOR.renderNeeded();
			ctxMenuVisibleOnce = true;
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
				
				fullScreenMenuMaybe();
			}
			
			menu.style.visibility = "visible";
			//menu.style.display="block";
			
			//menu.style.height = "100%";
			
			function waitForTouchUp() {
				if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
				if(typeof clickEvent != "undefined" && typeof clickEvent.preventDefault == "function") clickEvent.preventDefault();
				clearSelection();
				
				//var offsetHeight = parseInt(menu.offsetHeight);
				//if((posY+offsetHeight) > EDITOR.height) posY = EDITOR.height - offsetHeight;
				
				if(!EDITOR.touchDown) {
					console.log("There where no touch down!");
					giveUp();
					fullScreenMenuMaybe();
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
			
			function fullScreenMenuMaybe() {
				var offsetHeight = parseInt(menu.offsetHeight);
				console.log("fullScreenMenuMaybe: offsetHeight=" + offsetHeight + " EDITOR.height=" + EDITOR.height + " EDITOR.width=" + EDITOR.width);
				if(offsetHeight > EDITOR.height || offsetWidth*1.1 > EDITOR.width || EDITOR.width < 500) {
					// Hide everything besides the menu
					fullScreenMenu(menu);
				}
				else {
					menu.style.top = posY + "px";
					menu.style.left = posX + "px";
				}
			}
			
		}
	}
	
	
	EDITOR.addInfo = function(row, col, textString, file, lvl) {
		// Will display a talk bubble (plugin/render_info.js)
		
		row = parseInt(row);
		col = parseInt(col);
		
		if(file == undefined) file = EDITOR.currentFile;
		if(! file instanceof File) throw new Error("Third argument file is supposed to be a File object");
		if(lvl == undefined) lvl = 3; // 1=Err 2=Warn 3=Info
		
		console.log("EDITOR.addInfo: row=" + row + " col=" + col + " textString=" + textString + " file.path=" + file.path);
		
		if(textString == undefined) throw new Error("EDITOR.addInfo: Third argument textString=" + textString + " can not be undefined! arguments=" + JSON.stringify(arguments));
		
		console.time("addInfo");
		
		if(isNaN(col)) col = 0;
		
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
						if(info[i].text.length > 100) {
console.warn("Too many info messages added to row=" + row + " and col=" + col);
						return;
						}
						
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
			resizeAndRender();
			
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
	
	EDITOR.error = function editorError(error) {
		/*
			Some functions will throw errors in other windows, and not be captured by window.onerror (this window)
			Use this function to make sure the editor registers the error.
			
			Note: We don't want to use this function everywhere instead of throw. Because this function will not work for early errors.
		*/
		
		var message = error.message || error;
		var source = error.fileName;
		var lineno = error.lineNumber;
		var colno = error.columnNumber;
		
		UTIL.objInfo(error);
		
		if(!source && !lineno) {
			// Try to get source and lineno from the stack trace
			
			if(typeof error == "string") {
				var errorStack = UTIL.getStack(error);
			}
			else if(error.stack) {
				var errorStack = error.stack;
			}
			else {
				console.warn("error=" + error + " (" + typeof error + ")");
				throw error;
			}
			
			var stackTrace = UTIL.parseStackTrace(errorStack);
			
			var firstLine = stackTrace && stackTrace[0];
			if(firstLine) {
				source = firstLine.source;
				lineno = firstLine.lineno;
				colno = firstLine.colno;
			}
			else console.warn("Unable to get error info from errorStack=" + errorStack);
		}
		
		console.log("EDITOR.error: message=" + message + " source=" + source + " lineno=" + lineno + " colno=" + colno);
		
		if(EDITOR.eventListeners.error.length > 0) {
			console.log("Calling error listeners (" + EDITOR.eventListeners.error.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.error.length; i++) {
				EDITOR.eventListeners.error[i].fun(message, source, lineno, colno, error); // Call function
			}
		}
		
		return FAIL;
	}
	
	EDITOR.removeAllInfo = function(file, row, col) {
		// Find the item in the array, then splice it ...
		
		//console.log(UTIL.getStack("EDITOR.removeAllInfo!"));
		
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
		
		if(afk) {
			afk = false;
EDITOR.fireEvent("btk");
			console.log("Setting mainLoopInterval because btk!");
			mainLoopInterval = setInterval(resizeAndRender, 16); // Start main loop
		}
		
		EDITOR.lastTimeInteraction = new Date();
		
		if(EDITOR.eventListeners.interaction.length > 0) {
			console.log("Calling interaction listeners (" + EDITOR.eventListeners.interaction.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.interaction.length; i++) {
				EDITOR.eventListeners.interaction[i].fun(EDITOR.currentFile, interaction, options); // Call function
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
	
	EDITOR.fireEvent = function(eventName, args, callback) {
		
		if(args == undefined) args = [];
		if(!Array.isArray(args)) throw new Error("args need to be an Array!");
		
		console.log("Firing event: " + eventName);
		
		if(!EDITOR.eventListeners.hasOwnProperty(eventName)) {
			var err = new Error("Uknown event listener:" + eventName);
			if(callback) return callback(err);
			else throw err; 
		}
		
		var waitingForEventListenerCallbacks = 0;
			var eventListeners = EDITOR.eventListeners[eventName];
		var returns = {};
		var waitingForFunction = [];
		
			//console.log("Calling " + eventName + " listeners (" + EDITOR.eventListeners[eventName].length + ") ...");
		for(var i=0; i<eventListeners.length; i++) runFunc(eventListeners[i].fun);
		
		if(waitingForEventListenerCallbacks == 0) allDone();
		else if(waitingForEventListenerCallbacks < 0) throw new Error("waitingForEventListenerCallbacks=" + waitingForEventListenerCallbacks);
		else {
			var waitInterval = setInterval(wait, 1000);
			var maxWaitTimes = 10;
			var waitCounter = 0;
		}
		
		function wait() {
			console.log("waitingForEventListenerCallbacks=" + waitingForEventListenerCallbacks + " Still waiting for " + JSON.stringify(waitingForFunction));
			if(++waitCounter >= maxWaitTimes) {
				clearTimeout(waitInterval);
				throw new Error("The following " + waitingForEventListenerCallbacks + " " + eventName + " event listeners never returned or called back: " + JSON.stringify(waitingForFunction));
			}
		}
		
		function runFunc(func) {
			
			var fName = UTIL.getFunctionName(func);
				if(func == undefined) throw new Error("Undefined function in " + eventName + " listener!");
				
				//fun.apply(this, Array.prototype.shift.call(arguments)); // Remove eventName from arguments
				
			// Add callback function
			var fargs = args.concat(function(err, ret) {
				console.log("Callback called from fName=" + fName + " waitingForEventListenerCallbacks=" + waitingForEventListenerCallbacks);
				returns[fName] = ret;
				waitingForFunction.splice(waitingForFunction.indexOf(fName), 1);
				if(--waitingForEventListenerCallbacks == 0) {
					allDone();
				}
			});
			
			//console.log("Calling " + eventName + " listener fName=" + fName);
			
			try {
				var ret = func.apply(this, fargs);
			}
			catch(err) {
				console.warn("Error in fName=" + fName + " err.message=" + err.message);
				returns[fName] = err;
				if(!callback) throw err;
				return;
			}
			
			if(ret === undefined) {
				// Asume it's an async function, wait for it to call the callback function.
				waitingForEventListenerCallbacks++;
				//console.log("fName=" + fName + " returned undefined. Asuming it's an async function. waitingForEventListenerCallbacks=" + waitingForEventListenerCallbacks);
				waitingForFunction.push(fName);
			}
			else {
				//console.log("fName=" + fName + " returned ret=" + ret + " waitingForEventListenerCallbacks=" + waitingForEventListenerCallbacks);
				returns[fName] = ret;
			}
		}
		
		function allDone() {
			if(callback) {
				callback(null, returns);
				callback = null;
			}
			
			if(waitingForEventListenerCallbacks < 0) {
				throw new Error("waitingForEventListenerCallbacks=" + waitingForEventListenerCallbacks +
				" one or more " + eventName + " event listeners both returned something And called the callback function!");
			}
		}
	}
	
	EDITOR.addAnimation = function(fun) {
		if(typeof fun != "function") throw new Error("The animation to be added needs to be a function!");
		//console.log("Adding animation: " + UTIL.getFunctionName(fun));
		if(EDITOR.animationFunctions.indexOf(fun) != -1) console.warn("Animation " + UTIL.getFunctionName(fun) + " is already running!");
		if(!isAnimating && window.requestAnimationFrame) window.requestAnimationFrame(animate);
		return EDITOR.animationFunctions.push(fun) - 1;
	}
	EDITOR.removeAnimation = function(fun) {
		if(typeof fun != "function") throw new Error("The animation to be removed needs to be a function!");
		//console.log("Removing animation: " + UTIL.getFunctionName(fun));
		return removeFrom(EDITOR.animationFunctions, fun);
	}
	
	var renderOrder = {};
	EDITOR.addRender = function(fun, order) {
		
		var fName = UTIL.getFunctionName(fun);
		
		if(renderOrder.hasOwnProperty(fName)) {
			throw new Error("There is already a render function with the name " + fName + ". Render function names need to be unique!");
		}
		if(order == undefined) throw new Error("Render order (second argument) need to be defined for " + fName + " Use number 1-1999 for backgrounds and 2000+ for foreground");
		
		for(var fn in renderOrder) {
			if(renderOrder[fn] == order) throw new Error(fName + " has the same order=" + order + " as " + fn + ". Increase the order to make it run after " + fn + " or decrease the order to make it run before.");
		}

		renderOrder[fName] = order;
		
		//console.log("Adding render: " + UTIL.getFunctionName(fun));
		if(EDITOR.renderFunctions.indexOf(fun) != -1) throw new Error("The function is already registered as a renderer: " + fName);
		
		EDITOR.renderFunctions.push(fun);
		
		EDITOR.renderFunctions.sort(sortByRenderOrder);
		
		// Do not return index as it's not safe to remove the function based on index
		
		function sortByRenderOrder(fA, fB) {
			var fNameA = UTIL.getFunctionName(fA);
			var fNameB = UTIL.getFunctionName(fB);
			var a = renderOrder[fNameA];
			var b = renderOrder[fNameB];
			
			if(a > b) return 1;
			else if(b > 1) return -1;
			else return 0;
		}
		
	}
	
	EDITOR.removeRender = function(fun) {
		console.log("Removing render: " + UTIL.getFunctionName(fun));
		
		delete renderOrder[ UTIL.getFunctionName(fun) ];
		
		removeFrom(EDITOR.renderFunctions, fun);
	}
	
	EDITOR.addPreRender = function(fun) {
		// pre-renders modifies the buffer and returns the buffer, for example adding colors
		return EDITOR.preRenderFunctions.push(fun) - 1;
	}
	EDITOR.removePreRender = function(fun) {
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
	
	EDITOR.autoComplete = function autoComplete(file, combo, character, charCode, keyPushDirection) {
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
		
		var wordDelimitersLeft = " {}+-/<>\r\n\t!;()[]=,";
		var wordDelimitersRight =" {}+-/<>\r\n\t!;()[]=.,";
		var char = "";
		var left1 = file.text.charAt(file.caret.index-1);
		var left2 = file.text.charAt(file.caret.index-2);
var word = "";
		var options = []; // Word options
		var mcl = []; // Move caret left
		
		/*
			We want to include whole of document.getElementById("foobar").innerH
			but only bar in foo(bar)
			And also foo(x in foo(x
			
		*/
		
		var leftParentheses = 0;
		var rightParentheses = 0;
		var dotInWord = false;
		for(var i=file.caret.index-1; i>-1; i--) {
			char = left1;
			left1 = left2;
			left2 = file.text.charAt(i-2);
			
			//if(char == "") continue; // "abc".indexOf("") = 0
			
			console.log("char=" + char);
			
			if(char == "(") {
				leftParentheses++;
				if(leftParentheses > rightParentheses) {
					// We are moving left, and have found an unmatched parenthesis
					break;
				}
			}
			else if(char == ")") rightParentheses++;
			else if(wordDelimitersLeft.indexOf(char) > -1) break; // Exit loop
			
			// don't include if(
			else if(char == "(" && left2 == "i" && left1 == "f") {
				console.log("break because of if(");
				break;
			}
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = char + word;
			console.log("word=" + word);
		}
		// Also go right just in case we are inside a word
		
		for(var i=file.caret.index; i<file.text.length; i++) {
			char = file.text.charAt(i);
			
			console.log("char=" + char);
			
			if(wordDelimitersRight.indexOf(char) > -1) break; // Exit loop
			
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
						
						if(word.length > 0 && addWord.indexOf(word) != 0) {
							console.warn("Function " + UTIL.getFunctionName(fun) + " returned '" + addWord + "' witch does not have word=" + word + " in it!");
						}
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
	
	function sharedStart(array) {
		if(!Array.isArray(array)) throw new Error("array=" + array + " needs to be an Array typeof array=" + typeof array);
		if(array.length == 0) throw new Error("Array is empty: array=" + JSON.stringify(array));
		// Return the text that all words in an array share
		var A= array.concat().sort(), // Create new array with the words sorted
		a1= A[0],
		a2= A[A.length-1],
		L= a1.length,
		i= 0;
		
		while(i<L && a1.charAt(i) === a2.charAt(i)) i++;
		
		return a1.substring(0, i);
	}
	
	EDITOR.autoCompletePath = function autoCompletePath(options, callback) {
		// Returns an array of possible autocomplete values
		
		console.log("EDITOR.autoCompletePath: options=" + JSON.stringify(options));
		
		if(typeof options == "function" && callback == undefined) {
			callback = options;
			options = undefined;
		}
		
		if(typeof options == "string") {
			options = {path: options};
		}
		
		if(options.path) {
			var name = UTIL.getFilenameFromPath(options.path);
			var folder = UTIL.getDirectoryFromPath(options.path);
		}
		else {
			throw new Error("No path specified in options=" + JSON.stringify(options));
		}
		
		console.log("autoCompletePath: path=" + options.path);
		
		EDITOR.listFiles(folder, function fileList(err, files) {
			
			if(err) return callback(err);
			
			if(name) files = files.filter(nameFilter);
			if(options.onlyDirectories) files = files.filter(onlyDirectories);
			
			var filesNames = files.map(fileName);
			var filePaths = files.map(filePath);
			
			if(files.length == 0) {
				var error = new Error("No path matches found for options=" + JSON.stringify(options));
				error.code ="ENOENT";
				return callback(error);
			}
			
			console.log("filesNames=" + filesNames);
			
			var path = folder + sharedStart(filesNames);
			
			console.log("EDITOR.autoCompletePath: " + options.path + " => " + path);
			
			callback(err, path, filePaths);
		});
		
		function filePath(file) {
			return file.path;
		}
		
		function fileName(file) {
			if(file.type=="d") return UTIL.trailingSlash(file.name);
			return file.name;
		}
		
		function nameFilter(file) {
			return file.name.slice(0, name.length) == name;
		}
		
		function onlyDirectories(file) {
			return file.type == "d";
		}
		
		function fullPath(file) {
			return folder + file.name;
		}
		
	}
	
	EDITOR.exit = function() {
		/* Close the editor
			
			Or just hide it?
			And listen to an event that will bring it back!?
			
		*/
		window.close();
		
	}
	
	EDITOR.showFileReset = function showFileReset() {
		// Useful in tests where file open show state is set, to allow showing other files
		showFile = undefined;
	}
	
	EDITOR.showFile = function(file, focus, overrideShowFile) {
		
		if(!(file instanceof File)) {
			file = EDITOR.files[file];
		}
		
		if(!file) throw new Error("file=" + file + " need to be a File object or a path to an open file");
		
		if(!overrideShowFile && showFile != undefined && showFile != file.path) {
console.warn("Not showing: file.path=" + file.path + " because showFile=" + showFile);
		return;
		}
		
		console.log("Showing file: " + file.path + " (EDITOR.focus=" + EDITOR.input + " focus=" + focus + "");
		
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
			
			if(EDITOR.currentFile) EDITOR.lastFileShowed = EDITOR.currentFile
			else EDITOR.lastFileShowed = EDITOR.lastChangedFile([file]);
			
		}
		
		EDITOR.currentFile = file;
		
		if(EDITOR.currentFile == EDITOR.lastFileShowed) {
			EDITOR.lastFileShowed = EDITOR.lastChangedFile([EDITOR.currentFile]);
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
		
		if(b.charCode != undefined && isNaN(b.charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		if((typeof b.fun !== "function")) throw new Error("Object argument needs to have a 'fun' method!");
		
		if(!b.desc) UTIL.getStack("Key binding should have a description!");
		
		if(b.mode == undefined) {
//console.warn('No mode defined for "' + b.desc + '" asuming default mode');
			b.mode = "default";
		}
		else if(EDITOR.modes.indexOf(b.mode) == -1) {
			throw new Error(b.mode + " is not a registered mode/modal.\n" + 
			"Register using EDITOR.addMode() or make sure the plugin loads after the plugin that registers the mode using the order property in plugin options.");
		}
		
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
					// It's OK to bind the same key combo to do many things, eg Esc key, but we should give a warning:
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
		// Rebind the charCode and combo for the function with funName
		
		if(isNaN(charCode)) throw new Error("charCode=" + charCode + " needs to be a number!");
		
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
			EDITOR.disablePlugin(p.desc, true); // Unload plugin before loading it 
			p.load(); // Load the plugin right away if the editor has already started. 
		}
		
		for(var i=0; i<EDITOR.plugins.length; i++) {
			if(EDITOR.plugins[i].desc == p.desc) throw new Error("A plugin with the same description is already loaded: " + p.desc);
		}
		
		EDITOR.plugins.push(p);
		}
	
	EDITOR.disablePlugin = function(desc, remove) {
		var plugin;
		for(var i=0; i<EDITOR.plugins.length; i++) {
			plugin = EDITOR.plugins[i];
			if(plugin.desc == desc) {
				
				if(plugin.loaded && !plugin.unload) {
throw new Error("The plugin has already been loaded, and it does not have an unload method! So you have to disable this plugin before it's loaded!");
				}
				
				if(plugin.unload) plugin.unload();
				else console.warn("Plugin has no unload method: " + desc);
				
				if(remove) EDITOR.plugins.splice(i, 1);
				
				console.log("Plugin disabled" + (remove ? " and removed": "") + ": " + desc);
				
				return true;
			}
		}
		
		return false;
	}
	
	EDITOR.enablePlugin = function(desc) {
		var plugin;
		for(var i=0; i<EDITOR.plugins.length; i++) {
			plugin = EDITOR.plugins[i];
			if(plugin.desc == desc) {
				
				if(!plugin.load) throw new Error("The plugin has no load method!");
				
				plugin.load();
				
				console.log("Plugin re-enabled: " + desc);
				
				return true;
			}
		}
		
		return false;
	}
	
	EDITOR.addTest = function(order, parallel, fun) {
		
		var defaultTestOrder = 1000;
		var defaultParallel = true;
		
		//console.log("addTest: (" + (typeof order) + ", " + (typeof parallel) + ", " + (typeof fun) + ") fun==undefined?" + (fun==undefined));
		
		if(typeof order == "function" && parallel == undefined && fun == undefined) {
			fun = order;
			order = defaultTestOrder;
			parallel = defaultParallel;
		}
		else if(typeof order == "boolean" && typeof parallel == "function" && fun == undefined) {
			fun = parallel;
			parallel = order;
			order = defaultTestOrder;
		}
		else if(typeof order == "number" && typeof parallel == "function" && fun == undefined) {
			fun = parallel;
			parallel = false;
		}
		else if(typeof order == "function") {
			// I'ts OK to omit order and parallel, but not flip them
			throw new Error("EDITOR.addTest arguments should be in this order: order:number, parallel:boolen, fun:function");
		}
		
		if(order == undefined) order = defaultTestOrder;
		if(parallel == undefined) parallel = defaultParallel;
		
		if(fun == undefined) throw new Error("fun not specified! fun=" + fun + " order=" + order + " parallel=" + parallel);
		
		var funName = UTIL.getFunctionName(fun);
		
		if(funName.length == 0) throw new Error("Test function can not be anonymous!");
		
		console.log("Adding test " + funName + " with order=" + order + " and parallel=" + parallel);
		
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
		
		EDITOR.tests.push({fun: fun, text: funName, order: order, parallel: parallel});
		
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
	
	EDITOR.checkPath = function checkPath(fullPath, dontMsg, callback) {
		// Check if path exists
		// And ask's to create the path if it doesn't exist
		
		console.log("EDITOR.checkPath: fullPath=" + fullPath);
		
		if(typeof dontMsg == "function") {
			callback = dontMsg;
			dontMsg = undefined;
		}
		
		if(typeof callback != "function") throw new Error("callback=" + callback + " should be a function!");
		
		if(dontMsg == undefined) dontMsg = "Cancel";
		
		var includeHostInfo = true;
		var folderDelimiter = UTIL.getPathDelimiter(fullPath);
		
		if(fullPath.indexOf(folderDelimiter) == -1) fullPath = folderDelimiter + fullPath;
		
		var folderPath = fullPath.slice(0, fullPath.lastIndexOf(folderDelimiter)) + folderDelimiter;
		var folderPaths = UTIL.getFolders(folderPath, includeHostInfo);
		
		console.log("folderPaths=" + JSON.stringify(folderPaths));
		
		if(folderPaths.length > 1) {
			var pathToParentFolder = folderPaths[folderPaths.length-2];
			var pathToCreate = folderPaths[folderPaths.length-1];
			var folderName = UTIL.getFolderName(pathToCreate);
			EDITOR.folderExistIn(pathToParentFolder, folderName, function folderExistInCallback(folderPath) {
				if(folderPath === false) {
					
					var create = "Create the path";
					var another = "Choose another path";
					var msg = "The path does not exist:\n" + pathToCreate;
					confirmBox(msg, [create, another, dontMsg], function (answer) {
						if(answer == create) {
							EDITOR.createPath(pathToCreate, function createPathCallback(err, path) {
								if(err) {
									var error = new Error("Unable to create the path: " + pathToCreate + "\n" + err.message);
									return callback(error);
								}
								else return callback(null, fullPath);
							});
						}
						else if(answer == dontMsg) {
							var error = new Error(msg + ": " + dontMsg);
							error.code = "CANCEL";
							return callback(error);
						}
						else if(answer == another) {
							EDITOR.pathPickerTool({defaultPath: fullPath}, function changedPath(err, newPath) {
								console.log("EDITOR.checkPath: EDITOR.pathPickerTool: err=" + (err && err.message) + " newPath=" + newPath); 
								if(err) {
									return callback(err);
								}
								else {
									// Check the path again
									return EDITOR.checkPath(newPath, dontMsg, callback);
								}
							});
						}
						else throw new Error("Unknown answer=" + answer);
					});
					
				}
				else {
					// The parent path exist
					return callback(null, fullPath);
				}
			});
		}
		else {
			// it's in the root
			return callback(null, fullPath);
		}
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
		
		var protocol = UTIL.urlProtocol(pathToFolder);
		
		console.log("EDITOR.listFiles: pathToFolder=" + pathToFolder + " protocol=" + protocol);
		
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
	
	EDITOR.mock = function mockSomeUserInput(mock, options) {
		
		// Simulate ... 
		
		console.log("EDITOR.mock: mock=" + mock + " options=" + JSON.stringify(options));
		
		if(mock == "keydown") {
			if(typeof options == "string") {
				var letter = options;
				if(letter.length != 1) throw new Error("keydown can only have one letter or a option object!");
				options = {charCode: letter.charCodeAt(0)};
			}
			
			if(options.char && !options.charCode) {
				options.charCode = options.char.charCodeAt(0);
			}
			
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
		else if(mock == "cut") {
			var cutEvent = {
				clipboardData:  {
					setData: function setData(format, data) { return true; }
				},
				preventDefault: function preventDefault() { return true; }
			};
			
			return cut(cutEvent);
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
				preventDefault: function() {console.log("Mocked doubleClick event prevent default.")},
				stopPropagation: function() {console.log("Mocked doubleClick event stop propagation.")}
				}
			console.log(doubleClickEvent);
			
			mouseDown(doubleClickEvent);
			mouseUp(doubleClickEvent);
			mouseDown(doubleClickEvent);
			mouseUp(doubleClickEvent);
		}
		else if(mock == "typing") {
			var text = options;
			for (var i=0; i<text.length; i++) {
				EDITOR.mock("keypress", { charCode: text.charCodeAt(i), shiftKey: (text.charAt(i).toUpperCase() ==  text.charAt(i)) });
			}
		}
		else {
			throw new Error("Unknown mock=" + mock);
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
			
			console.log("Building widget " + UTIL.getFunctionName(buildFunction));
			
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
			
			if(!parentNode.contains(widget.mainElement)) {
				parentNode.appendChild(widget.mainElement);
			}
			
			//widget.mainElement.style.display = "block";
			
			//if(options.stealFocus === false) widget.blur();
			
			EDITOR.resizeNeeded();
			
			widget.visible = true;
			
			if(BROWSER == "Firefox") {
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
				
				if(parentNode.contains(widget.mainElement)) {
					wasHidden = false;
					if( parentNode.contains(widget.mainElement) ) parentNode.removeChild(widget.mainElement);
				}
				
				/*
					if(widget.mainElement.style.display != "none") wasHidden = false;
					widget.mainElement.style.display = "none";
				*/
				
				EDITOR.resizeNeeded();
			}
			
			widget.visible = false;
			
			return wasHidden;
		}
		
		widget.unload = function unloadWidget() {
			
			if(widget.mainElement) {
				widget.hide();
				if( parentNode.contains(widget.mainElement) ) parentNode.removeChild(widget.mainElement);
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
		
		// options object needs to be specified, because we need at least an url option
		if(typeof options == "string") {
			var options = {url: options};
		}
		
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
		//window.resizeTo(screen.width - previeWidth - windowPadding * 2 - unityLeftThingy, screen.height);
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
			
			
			/*
				Due to CORS we might get errors accessing properties on the new window
				
				Then there's Same-origin security policy (Not to be confused with CORS!)
				Origin is considered different if at least one of the following parts of the address isn't maintained:
				<protocol>://<hostname>:<port>/path/to/page.html
				
			*/
			
			try {
				var test = theWindow.document.domain;
			}
			catch(err) {
				
				var origin = UTIL.getLocation(document.location.href);
				var other = UTIL.getLocation(url);
				var diff = [];
				
				if(origin.protocol != other.protocol) diff.push("protocol: " + origin.protocol + " vs " + other.protocol);
				if(origin.host != other.host) diff.push("host: " + origin.host + " vs " + other.host);
				if(origin.port != other.port) diff.push("port: " + origin.port + " vs " + other.port);
				
				return callback(new Error( "Unable to access " + url + " \n" + err.message + " diff=" + JSON.stringify(diff) ));
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
			
			EDITOR.openWindows.push(theWindow); // So that they can be conveniently closed on reload
			
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
		if(typeof resolved == "string" && unresolved == undefined && directory == undefined) {
			directory = resolved;
			resolved = undefined;
			unresolved = undefined;
		}
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
	
	EDITOR.runTests = function runTests(onlyOne, allInSync) {
		
		if(EDITOR.workingDirectory != "/" && EDITOR.workingDirectory != "/wwwpub/" && !onlyOne) {
 return alertBox("Make sure you are running under chroot and with a dummy user before running tests!\
		(Working directory (" + EDITOR.workingDirectory + ") needs to be / (root))");
		}
		
		if(!onlyOne) EDITOR.changeWorkingDir("/");
		
		runTests_5616458984153156(onlyOne, allInSync);
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
	
	EDITOR.openFileTool = function fileOpenTool(options, filePath) {
		console.log("Calling openFileTool listeners (" + EDITOR.eventListeners.openFileTool.length + ")");
		
		var ret = false;
		
		for(var i=0, f; i<EDITOR.eventListeners.openFileTool.length; i++) {
			ret = EDITOR.eventListeners.openFileTool[i].fun(options, filePath);
			if(ret === true) break; // Only open one tool
		}
		
		return ret;
	}
	
	EDITOR.pathPickerTool = function pathPicker(options, callback) {
		// Show a tool for picking a file path, which will callback with the chosen path
		
		console.log("EDITOR.pathPickerTool: options=" + JSON.stringify(options));
		
		if(typeof options == "function") {
			callback = options;
			options = undefined;
		}
		
		if(callback == undefined) throw new Error("callback=" + callback + " needs to be a callback function!");
		
		if(typeof options == "string") options = {defaultPath: options};
		
		console.log("Calling pathPickerTool listeners (" + EDITOR.eventListeners.pathPickerTool.length + ") ");
		
		var ret = false;
		
		for(var i=0, f; i<EDITOR.eventListeners.pathPickerTool.length; i++) {
			ret = EDITOR.eventListeners.pathPickerTool[i].fun(options, gotPath);
			if(ret === true) return true; // Only open one tool, hope it will call back!
		}
		
		// If no path picker wanted to handle it: Use the stone-age path picker
		var defaultPath = options && options.defaultPath;
		var instruction = (options && options.instruction) || "Choose a file path:";
		promptBox(instruction, false, defaultPath, function(path) {
			if(!path) {
				var error = new Error("Aborted when picking path");
				error.code = "CANCEL";
				return gotPath(error);
			}
			else return gotPath(null, path);
		});
		
		return true; // True as in "we found a path picker"
	
		function gotPath(err, path) {
			if(err) return callback(err);
			
			console.log("EDITOR.pathPickerTool: err=" + (err && err.message) + " path=" + path); 
			
			// EDITOR.checkPath will call EDITOR.pathPickerTool
			// So it's safest to not call it from here to prevent and endless loop
			// You can instead call EDITOR.checkPath directly to get a path
			
			return callback(null, path);
		}
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
		console.log("Calling fileExplorer listeners (" + EDITOR.eventListeners.fileExplorer.length + ") to explore directory=" + directory);
		
		var ret = false;
		
		for(var i=0, f; i<EDITOR.eventListeners.fileExplorer.length; i++) {
			ret = EDITOR.eventListeners.fileExplorer[i].fun(directory);
			if(ret === true) break; // Only open one tool
		}
		
		return ret;
	}
	
	EDITOR.move = function renameFile(oldPath, newPath, callback) {
		// Also used for renaming files and folders!
		
		console.log("Moving oldPath=" + oldPath + " to newPath=" + newPath);
		
		if(callback == undefined) throw new Error("Expected third function parameter to be a callback!");
		
		if(oldPath == newPath) return callback(new Error("Old path is the same as the newPath=" + newPath));
		
		if(EDITOR.files.hasOwnProperty(newPath)) return callback(new Error("There is already a file open with path=" + newPath));
		
		//if(!file.saved || !file.savedAs) return callback(new Error("Save the file before renaming it!"));
		
		CLIENT.cmd("move", {oldPath: oldPath, newPath: newPath}, function(err, json) {
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
					
					EDITOR.fireEvent("move", [oldPath, newPath]);
					
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
		var returns = [];
		var alreadyTooLate = false;
		var eventListeners = EDITOR.eventListeners[ev];
		var uniqueFunctionNames = [];
		var returnedOrCalledBack = [];
		var stackTrace = {};
		
		for(var i=0; i<eventListeners.length; i++) {
			callListener(eventListeners[i].fun);
		}
		
		if(waitingFor.length > 0) {
			var maxWait = 15;
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
			if(ret || ret === false || ret === null) evCallback(null, ret);// The function did not return void, asume it's done!
			
			
			
			function evCallback(err, ret) {
				console.log("Got " + ev + " event callback from " + fName + " err=" + err);
				if(returnedOrCalledBack.indexOf(fName) != -1) throw new Error(fName + " has already returned or called back! stackTrace[" + fName + "]=" + stackTrace[fName] + "\n\n");
				returnedOrCalledBack.push(fName);
				
				stackTrace[fName] = UTIL.getStack("callback");
				
				if(err) errors.push(err);
				returns[fName] = ret;
				
				var index = waitingFor.indexOf(fName);
				if(index == -1) throw new Error(fName + " not in " + JSON.stringify(waitingFor) + " it might already have returned or called back!" +
				" Make sure " + fName + " either return something true:ish or calls the callback. Not both!");
				
				waitingFor.splice(index, 1);
				if(waitingFor.length == 0 && returnedOrCalledBack.length == eventListeners.length && !alreadyTooLate) {
					if(checkInterval) clearInterval(checkInterval);
					allListenersCalled(errors, returns);
				}
				return;
			}
		}
		
		function checkIfReturnedOrCalledCallback() {
			console.warn("The following listeners has not yet returned or called back: " + JSON.stringify(waitingFor));
			
			if(++waitCounter >= maxWait) {
				clearInterval(checkInterval);
				errors.push(  new Error( "The following event listeners failed to return something trueish or call back in a timely fashion: " + JSON.stringify(waitingFor) + 
				"And these functions did succeed: " + JSON.stringify(returnedOrCalledBack) )  );
				alreadyTooLate = true;
				allListenersCalled(errors);
			}
			
		}
		
	}
	
	EDITOR.loadScript = function loadScript(src, dontAsk, callback) {
		
		if(typeof dontAsk == "function" && callback == undefined) {
			callback = dontAsk;
			dontAsk = undefined;
		}
		
		if(dontAsk == undefined) dontAsk = false;
		
		var host = window.location.hostname;
		var protocol = window.location.protocol;
		
		var loc = UTIL.getLocation(src);
		
		if(host == loc.host) dontAsk = true;
		
		if(src.slice(0,1) == "/" || src.slice(0, 3) == "../") dontAsk = true;
		
		if(!dontAsk) {
			var yes = "Yes, I trust " + loc.host;
			var no = "No";
			confirmBox("Do you trust " + loc.host + " to load the following script:\n" + src, [yes, no], function(answer) {
				if(answer == yes) load();
				else callback(new Error("User declined loading the script!"));
			});
		}
		else load();
		
		function load() {
			var script = document.createElement('script');
			script.onload = function () {
				callback(null);
				callback = null;
			};
			script.onerror  = function (err) {
				callback(err || new Error("Unable to load " + src));
				callback = null;
			};
			
			script.src = src;
			
			document.head.appendChild(script);
		}
	}
	
	EDITOR.reload = function reload() {
		console.warn("Reloading the editor ...");
		// Call exit listeners before reloading
		EDITOR.fireEvent("exit", [], function afterExitEvent(err, returns) {
			if(err) throw err;
			
			var gotError = false;
			
			for(var fName in returns) {
				console.log(fName + " returned " + returns[fName]);
				if(returns[fName] === false || returns[fName] instanceof Error) {
					gotError = true;
					break;
				}
			}
			
			if(gotError) {
				throw new Error("There was an error in " + fName + " (EDITOR.eventListeners.exit) when reloading the editor!\nYou have to reload manually.");
			}
			else {
				
				// Unload all plugins
				for(var i=0; i<EDITOR.plugins.length; i++) {
					console.log("unloading plugin: " + EDITOR.plugins[i].desc);
					EDITOR.plugins[i].unload(); // Call function (and pass global objects!?)
				}
				
				// Close all open windows
				for(var win in EDITOR.openedWindows) {
					try{EDITOR.openWindows[win].close();}
					catch(err) {};
				}
				
				/*
					for(var file in EDITOR.files) {
					delete EDITOR.files[file];
					}
				*/
				
				//document.location = "about:blank";
				//document.location = "file:///" + require("dirname") + "/client/index.htm";
				
				console.log("Reloading! RUNTIME=" + RUNTIME);
				
				window.onbeforeunload = null;
				location.reload();
				
				// Note that each reload will spawn another chrome debugger! And the old will just linger until the main program is closed.
				
			}
		});
	}
	
	var waitingForFileToBeParsed = {};
	EDITOR.parse = function parse(fileOrString, lang, path, callback) {
		/*
			Useful for when you want to parse a file, but not open it. Returns:
			{functions, quotes, comments, globalVariables, blockMatch, xmlTags}
		*/
		
		if(!(fileOrString instanceof File) && typeof fileOrString != "string") throw new Error("First parameter needs to be a File object or a string!");
		
		if(callback == undefined && typeof lang == "function") {
			callback = lang;
			lang = undefined;
		}
		else if(callback == undefined && typeof path == "function") {
			callback = path;
			path = undefined;
		}
		
		if(path == undefined && (fileOrString instanceof File)) path = fileOrString.path;
		
		if(path == undefined) path = UTIL.hash(fileOrString);
		
		// Prevent race conditions
		var wait = waitingForFileToBeParsed.hasOwnProperty(path); 
		
		if(!waitingForFileToBeParsed.hasOwnProperty(path)) waitingForFileToBeParsed[path] = [];

		waitingForFileToBeParsed[path].push(callback);
		
		if(typeof callback != "function" && callback != undefined) throw new Error("Parameter callback needs to be a callback function!");
		
		for(var i=0, ret=false; i<EDITOR.eventListeners.parse.length; i++) {
			if(callback) ret = EDITOR.eventListeners.parse[i].fun(fileOrString, lang, path, parseDone); // async
			else ret = EDITOR.eventListeners.parse[i].fun(fileOrString, lang, path); // sync
			if(ret) return ret; // Only let one parser parse it
		}
		
		function parseDone(err, parseResult) {
			for (var i=0; i<waitingForFileToBeParsed[path].length; i++) {
				waitingForFileToBeParsed[path][i](err, parseResult);
			}
			delete waitingForFileToBeParsed[path];
		}
	}
	
	EDITOR.registerAltKey = function registerAltKey(options) {
		// Alternate keys for virtual keyboard
		
		if(typeof options != "object") throw new Error("First argument need to be an option object!");
		if(typeof options.char != "string") throw new Error("The option object need to have a char string!");
		if(typeof options.fun != "function") throw new Error("The option object need to have a fun function! options keys: " + Object.keys(options));
		if(typeof options.label != "string") throw new Error("The option object need to have a label string!");
		if(typeof options.alt != "number" && typeof options.alt != "undefined") throw new Error("The alt option need to be a number!");
		
		if(options.alt == undefined) options.alt = 1; // One button can have many alternatives
		
		var key;
		for (var i=0; i<EDITOR.registeredAltKeys.length; i++) {
			key = EDITOR.registeredAltKeys[i];
			if(key.char==options.char && key.alt == options.alt) throw new Error(UTIL.getFunctionName(key.fun) + " is already registered for char=" + options.char + " on alt=" + options.alt);
		}
		
		EDITOR.registeredAltKeys.push(options);
		
		var reg = false;
		var regSuccess = false;
		for (var j=0; j<EDITOR.eventListeners.registerAltKey.length; j++) {
			reg = EDITOR.eventListeners.registerAltKey[j].fun(options);
			if(reg==true) regSuccess = true;
		}
		// Note: The keybard plugin might not yet have loaded!
		//if(!regSuccess) throw new Error(UTIL.getFunctionName(options.fun) + " did not register for char=" + options.char + " on alt=" + options.alt + " on any of the keyboards!");
		
	}
	
	EDITOR.unregisterAltKey = function unregisterAltKey(fun) {
		if(typeof fun != "function") throw new Error("The first argument needs to be a function!");
		
		var key;
		for (var i=0; i<EDITOR.registeredAltKeys.length; i++) {
			key = EDITOR.registeredAltKeys[i];
			if(key.fun == fun) {
				EDITOR.registeredAltKeys.splice(i, 1);
				notifyListeners();
				return;
			}
		}
		
		console.warn("Did not find " + UTIL.getFunctionName(fun) + " in registeredAltKeys!");
		
		function notifyListeners() {
			for (var j=0; j<EDITOR.eventListeners.unregisterAltKey.length; j++) {
				EDITOR.eventListeners.unregisterAltKey[j].fun(fun);
			}
		}
	}
	
	EDITOR.hideVirtualKeyboard = function hideVirtualKeyboard(keyboards) {
		if(keyboards == undefined) keyboards = []; // An empty array hides all keyboards
		var returns = [];
		for (var j=0, ret; j<EDITOR.eventListeners.hideVirtualKeyboard.length; j++) {
			ret = EDITOR.eventListeners.hideVirtualKeyboard[j].fun(keyboards);
			// Should return an array of virtual keyboards hidden, or false
			if(!Array.isArray(ret)) throw new Error("ret=" + ret + " expected an array of keyboard names!");
			returns.concat(ret);
		}
		return returns;
	}
	
	EDITOR.showVirtualKeyboard = function showVirtualKeyboard(keyboards) {
		if(keyboards == undefined) keyboards = []; // An empty array hides all keyboards
		console.log("showVirtualKeyboard: keyboards=" + JSON.stringify(keyboards));
		var returns = [];
		for (var j=0, ret; j<EDITOR.eventListeners.hideVirtualKeyboard.length; j++) {
			ret = EDITOR.eventListeners.showVirtualKeyboard[j].fun(keyboards);
			// Should return an array of virtual keyboards that was turned on.
			if(!Array.isArray(ret)) throw new Error("ret=" + ret + " expected a list of keyboard names! (list can be empty)");
			returns.concat(ret);
		}
		return returns;
	}
	
	EDITOR.showMessageFromStackTrace = function showMessageFromStackTrace(options) {
		// Finds a currently opened file from the stack trace, and shows the message on the line from the stack trace
		
		console.log("EDITOR.showMessageFromStackTrace: options=" + JSON.stringify(options));
		
		if(options.message) {
			var message = options.message;
		}
		else if(options.error) {
			var message = options.error.message;
		}
		else if(options.errorEvent) {
			if(!options.errorEvent.error) {
				console.log("showMessageFromStackTrace: options.errorEvent: ", options.errorEvent);
				return FAIL;
			}
			var message = options.errorEvent.error.message;
		}
		
		if(options.stackTrace) {
			var errorStack = options.stackTrace;
		}
		else if(options.error) {
			var errorStack = options.error.stack;
		}
		else if(options.errorEvent) {
			var errorStack = options.errorEvent.error.stack;
			
			if(!errorStack) {
				console.log("showMessageFromStackTrace: options.errorEvent: " + JSON.stringify(options.errorEvent, null, 2));
				//Firefox browser wont give access to the error event, because it's in another window !?
				
				console.log("showMessageFromStackTrace: options.errorEvent.filename=" + options.errorEvent.filename);
				// It seems we can still extract some data out of it! ...
				
				errorStack = options.errorEvent.filename + ":" + options.errorEvent.lineno + ":" + options.errorEvent.colno
			}
			
		}
		else {
			var errorStack = UTIL.getStack(message);
		}
		
		if(!errorStack) {
EDITOR.error(new Error("Specify either a stackTrace, error or errorEvent in options!"));
			return FAIL;
		}
		
		var stackLines = UTIL.parseStackTrace(errorStack);
		
		if(!stackLines) {
			console.warn("showMessageFromStackTrace: Failed to parse errorStack: " + errorStack);
			//alertBox(message || errorStack, "ERROR_PARSING", "error");
			return FAIL;
		}
		
		if(stackLines && !message && stackLines.message) message = stackLines.message;
		
		if(!message) {
			EDITOR.error(  new Error( "Unable to find message from options=" + JSON.stringify(options, null, 2) )  );
			return FAIL;
		}
		
		if(options.url) {
			var urlPath = UTIL.getDirectoryFromPath(options.url);
		}
		
		if(options.path) {
			var folder = UTIL.getDirectoryFromPath(options.path);
		}
		
		if(options.level) {
			var level = options.level;
		}
		else {
			var level = 3; // 1=Err 2=Warn 3=Info
		}
		
		var sourcePath = "";
		stackLoop: for (var i=0; i<stackLines.length; i++) {
			for(var filePath in EDITOR.files) {
				
				if(urlPath && folder) sourcePath = stackLines[i].source.replace(urlPath, folder);
				else if(urlPath) sourcePath = stackLines[i].source.replace(urlPath, "");
				else sourcePath = UTIL.getPathFromUrl(stackLines[i].source);
				
				if(sourcePath.charAt(0) == "/") sourcePath = sourcePath.slice(1);
				
				console.log("showMessageFromStackTrace: sourcePath=" + sourcePath + " in filePath=" + filePath + " ?");
				if(filePath.indexOf(sourcePath) != -1) {
					var fileExt = UTIL.getFileExtension(filePath);
					if(fileExt == "stdout") {
						console.log("showMessageFromStackTrace: sourcePath in filePath: Yes, but it's a " + fileExt + " file!");
						continue;
					}
					
					console.log("showMessageFromStackTrace: sourcePath in filePath: yes!");
					var file = EDITOR.files[filePath];
					var lineno = stackLines[i].lineno;
					var colno = stackLines[i].colno;
					break stackLoop;
				}
				else console.log("showMessageFromStackTrace: sourcePath in filePath: nope");
			}
		}
		
		if(file && lineno) {
			var row = lineno - 1;
			var gridRow = file.grid[row];
			if(!gridRow) { // Sanity check
				EDITOR.error(new Error("Error found on row=" + row + " but the file only has file.grid.length=" + file.grid.length));
				return FAIL;
			}
			var indentationCharacters = file.grid[row].indentationCharacters.length;
			var col = colno - indentationCharacters;
			
			if(level == 1) file.scrollToLine(lineno); // Only scroll there if it's an error
			
			EDITOR.addInfo(row, col, message, file, level);
			
			if(EDITOR.currentFile != file) EDITOR.showFile(file);
			
			return SUCCESS;
			
		}
		else console.warn("showMessageFromStackTrace: Unable to locate an open file from stackLines=" + JSON.stringify(stackLines, null, 2));
		
		return FAIL;
	}
	
	EDITOR.getSSHPublicKey = function getSSHPublicKey(callback) {
		var pubKeyPath = ".ssh/id_rsa.pub";
		
		var homeDir = (EDITOR.user && EDITOR.user.home) || UTIL.homeDir(EDITOR.workingDirectory);
		if(homeDir) pubKeyPath = UTIL.trailingSlash(homeDir) + pubKeyPath;
		
		EDITOR.readFromDisk(pubKeyPath, gotPubKeyMaybe);
		
		function gotPubKeyMaybe(err, path, pubkey, hash) {
			if(err) {
				var yes = "Yes";
				var no = "No";
				confirmBox("Unable to find public key in " + pubKeyPath + " Do you want to generate a new SSH key ?", [yes, no], function(answer) {
					if(answer == yes) {
						CLIENT.cmd("run", {command: 'ssh-keygen -f /.ssh/id_rsa -N ""'}, function(err, channels) {
							if(err) return callback(err);
							console.log("ssh-keygen: channels=" + JSON.stringify(channels, null, 2));
							EDITOR.readFromDisk(pubKeyPath, gotPubKeyMaybe);
						});
					}
					else {
						callback(err);
					}
				});
			}
			else {
				callback(null, pubkey);
			}
		}
	}
	
	
	var fullScreenWidgetParent;
	var oldFullScreenWidget;
	EDITOR.fullScreenWidget = function fullScreen(widgetElement) {
		
		if(oldFullScreenWidget) {
			// There can only be one element in full screen mode
			if(oldFullScreenWidget == widgetElement) {
console.warn("Element already in full screen: ", widgetElement);
			return;
			}
			
			EDITOR.exitFullScreenWidget(oldFullScreenWidget, fullScreenWidgetParent);
		}
		
		fullScreenWidgetParent = widgetElement.parentElement;
		
		var body = document.getElementById('body');
		
		if(fullScreenWidgetParent != body) {
			// Move the widget from it's current position in the DOM,
			// And place it directly under the body element
			fullScreenWidgetParent.removeChild(widgetElement);
			body.appendChild(widgetElement);
		}
		
		// Hide everything besides the widget
		var wireframe = document.getElementById("wireframe");
		wireframe.style.display = "none";
		
		// Give the widget free roam over the entire screen
		widgetElement.style.position="relative";
		widgetElement.style.top = "0px";
		widgetElement.style.left = "0px";
		widgetElement.style.border="0px solid red";
		widgetElement.style.width="100%";
		widgetElement.style.maxWidth="100%";
		widgetElement.style.height="100%";
		widgetElement.style.maxHeight="100%"; // This is that magically allows scrolling on the wrapper
		
		
		// Enable scrolling on the editor window
		EDITOR.scrollingEnabled = true;
	
		oldFullScreenWidget = widgetElement;
	}
	
	EDITOR.exitFullScreenWidget = function exitFullScreen(widgetElement, oldParent) {
		
		if(widgetElement != oldFullScreenWidget) {
console.warn("Widget was not the last widget to be put in full screen! oldFullScreenWidget=", oldFullScreenWidget, " widgetElement=", widgetElement);
		return;
		}
		
		var wireframe = document.getElementById("wireframe");
		wireframe.style.display = "block";
		
		widgetElement.style.position="";
		widgetElement.style.top = "";
		widgetElement.style.left = "";
		widgetElement.style.border="";
		widgetElement.style.width="";
		widgetElement.style.maxWidth="";
		widgetElement.style.height="";
		widgetElement.style.maxHeight="";
		
		
		EDITOR.scrollingEnabled = false;
		
		if(!oldParent) oldParent = fullScreenWidgetParent;
		// Move the widget back to where it was
		var body = document.getElementById('body');
		body.removeChild(widgetElement);
		oldParent.appendChild(widgetElement);
		
		oldFullScreenWidget = null;
		fullScreenWidgetParent = null;
		
		EDITOR.resizeNeeded();
	}
	
	EDITOR.openDialogs = []; // dialog-code: [Dialog, Dialog, ...]
	
	EDITOR.closeAllDialogs = function closeAllDialogs(dialogCode, retryCount) {
		
		if(!dialogCode) throw new Error("No dialogCode given to closeAllDialogs! Use MISC to close all unspecified dialog, or close dialog specificly! Closing the wrong dialog(s) can be very confusing.");
		
		var closedCount = 0;
		
		console.log("EDITOR.closeAllDialogs: " + EDITOR.openDialogs.length + " open dialogs... dialogCode=" + dialogCode);
		for (var i=0; i<EDITOR.openDialogs.length; i++) {
			
			if(dialogCode && dialogCode != EDITOR.openDialogs[i].code) {
				console.log("EDITOR.closeAllDialogs: Not closing (code=" + EDITOR.openDialogs[i].code + " is not dialogCode=" + dialogCode + "): " + EDITOR.openDialogs[i].div.innerText);
				continue;
			}
			console.log("EDITOR.closeAllDialogs: Closing dialog: " + EDITOR.openDialogs[i].div.innerText);
			closedCount++;
			EDITOR.openDialogs[i].close();

			if(i == EDITOR.openDialogs.length) break;
			else i--; // Check all dialogs (don't skip one if one is closed)
		}
		
		if(closedCount == 0) {
			var codes = EDITOR.openDialogs.map(function(dialog) { return dialog.code + ":" + UTIL.shortString(dialog.div.innerText, 50) });
			throw new Error( "No dialogs where closed! dialogCode=" + dialogCode + " EDITOR.openDialogs.length=" + EDITOR.openDialogs.length + " codes=" + JSON.stringify(codes) );
		}
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
			if(list[i] == fun) {
				console.log("removeFrom: list length before: " + list.length);
				list.splice(i, 1);
				console.log("removeFrom: list length after: " + list.length);
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
			
			EDITOR.fireEvent("exit", [], function(err, returns) {
				if(err) throw err;
				
				var gotError = false;
				
				for(var fName in returns) {
					console.log(fName + " returned " + returns[fName]);
					if(returns[fName] === false || returns[fName] instanceof Error) {
						gotError = true;
						break;
					}
				}
				
				if(gotError) {
					this.show();
					throw new Error("Something went wrong when closing the editor!");
				}
				else {
					win.close(true);
				}
				
			});
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
		console.warn("EVENT RESIZE!");
		EDITOR.resizeNeeded();
		EDITOR.renderNeeded();
		
		EDITOR.interact("resize", resizeEvent);
		
	}, false);
	
	/*
		
		The third argumentin addEventListener is a Boolean value 
		that specifies whether the event should be executed in the capturing or in the bubbling phase.
		true = capturing phase: start with the top (window)
		false = bubbling phase: start with the inner-most element 
		
	*/
	
	
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
		
		var target = contextMenuEvent.target;
		var tag = target.tagName;
		
		if(tag=="INPUT" || tag=="TEXTAREA") return true; // Allow context menu on text input
		
		contextMenuEvent.preventDefault();
		console.log("contextmenu prevented! tag=" + tag);
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
		
		window.name = "editor"; // For focus access
		
		//alert("window.innerHeight=" + window.innerHeight + " window.innerWidth=" + window.innerWidth + " screen.width=" + screen.width + " screen.height=" + screen.height);
		
		EDITOR.on("moveCaret", function clearInfoBubblesWhenCaretIsMoved(file, caret) {
			// Clear info messages in this file
			EDITOR.removeAllInfo(file);
			
			return true;
			});
		
		bootstrap();
		
		canvas = document.getElementById("canvas");
		canvas.style.display="block";
		
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
			ctx = canvas.getContext("2d", {lowLatency:  EDITOR.settings.lowLatencyCanvas, antialias: false});
			//console.warn("No sub_pixel_antialias! EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias);
		}
		else {
			ctx = canvas.getContext("2d", {lowLatency:  EDITOR.settings.lowLatencyCanvas, alpha: false, antialias: true}); // {alpha: false} allows sub pixel anti-alias (LCD-text). 
		}
		
		ctx.imageSmoothingEnabled = false; // Do not "smooth" the image, keep it sharp!
		
		
		// Set the font only once for performance
		ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		ctx.textBaseline = "middle";
		
		EDITOR.canvas = canvas;
		EDITOR.canvasContext = ctx;
		
		EDITOR.resizeNeeded(); // We must call the resize function at least once at editor startup.
		
		EDITOR.bindKey({desc: "Autocomplete", charCode: EDITOR.settings.autoCompleteKey, fun: EDITOR.autoComplete, combo: 0});
		//keyBindings.push({charCode: EDITOR.settings.autoCompleteKey, fun: EDITOR.autoComplete, combo: 0});
		
		window.onbeforeunload = confirmExit;
		
		if(!EDITOR.lastElementWithFocus) EDITOR.lastElementWithFocus = canvas;
		
		
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
		
		// Allow native keyboard on mobiles
		var keyboardCatcher = document.getElementById("keyboardCatcher");
		if(keyboardCatcher) {
			// Some android devices can't listen for keypressed, so we have to use keydown or keyup'
			keyboardCatcher.addEventListener("keyup",keyboardCatcherKey,false);  // captures
			moveCursorToEnd(keyboardCatcher);
		}
		
		
		var body = document.getElementById('body');
		
		// Attatch CLIENT listeners before plugins and start events load
		CLIENT.on("loginSuccess", function loggedInToServer(login) {
			EDITOR.user = {
name: login.user,
				home: login.homeDir
			};
			
			if(!login.installDirectory) console.warn("Did not get install directory! login=" + JSON.stringify(login));
			
			EDITOR.installDirectory = login.installDirectory || "/";
			//alertBox(JSON.stringify(login));
			
			console.log("Logged in as user: " + EDITOR.user.name);
			
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
		
		
		var progressValue = 0;
		var progressMax = 1;
		CLIENT.on("progress", function(increment) {
			var progress = document.getElementById("progress");
			
			if(!Array.isArray(increment)) {
				console.warn("Not an array: progress: " + JSON.stringify(increment));
			};
			
			if(progressValue == 0 && increment.length > 0) {
				// First progress event, show the progress bar
				progress.style.display="block";
				EDITOR.resizeNeeded();
			}
			
			if(increment[0]) progressValue += increment[0];
			if(increment[1]) progressMax += increment[1];
			
			if(increment[0] == 0 && increment[1] == 0) {
				// Reset
				progressValue = 0;
				progressMax = 1;
			}
			
			if(increment.length == 0) {
				// Finish
				progress.style.display="none";
				EDITOR.resizeNeeded();
				progressValue = 0;
				progressMax = 1;
			}
			
			progress.max = progressMax;
			progress.value = progressValue;
			
			console.log("progress: value=" + progressValue + " max=" + progressMax);
			
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
			
			if(EDITOR.settings.devMode) {
				EDITOR.plugins[i].load(EDITOR);
			}
			else {
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
		}
		
		
		console.log("Setting mainLoopInterval because first load!");
		mainLoopInterval = setInterval(resizeAndRender, 16); // So that we always see the latest and greatest
		
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
		
	}
	
	function moveCursorToEnd(el) {
		if (typeof el.selectionStart == "number") {
			el.selectionStart = el.selectionEnd = el.value.length;
		} else if (typeof el.createTextRange != "undefined") {
			el.focus();
			var range = el.createTextRange();
			range.collapse(false);
			range.select();
		}
	}
	
	EDITOR.animationFrame = 0;
	var isAnimating = false;
	function animate() {
		
		runAnimations(++EDITOR.animationFrame);
		
		// The animation loop will go on until there are no more animation functions. Then it has to be restarted by EDITOR.renderNeeded()
		if(EDITOR.animationFunctions.length > 0) {
			isAnimating = true;
			window.requestAnimationFrame(animate);
		}
		else isAnimating = false;
	}
	
	function runAnimations(animationFrame) {
		for (var i=0; i<EDITOR.animationFunctions.length; i++) EDITOR.animationFunctions[i](EDITOR.canvasContext, animationFrame);
	}
	
	function runTests_5616458984153156(onlyOne, allInSync) { // Random numbers to make sure it's unique
		
		var maxParallel = 5; // Running too many tests at once will cause timeout issues
		var abortOnError = false;
		
		if(onlyOne) testFirstTest = true;
		
		/*
			Todo: Start another instance of the editor with the chromium debug console enabled and connect to it. 
			Then run the tests there. And open any bad files here for debugging!?
			
		*/
		
		// Prepare for tests ...
		
		// Sort the tests by parallel and order
		EDITOR.tests.sort(function sortTests(a, b) {
			if(a.parallel && !b.parallel) return 1; // Tests with parallel==false should be first!
			else if(b.parallel && !a.parallel) return -1;
			else if(a.parallel == b.parallel) {
				if(a.order > b.order) return 1;
				if(b.order > a.order) return -1;
				else return 0;
			}
		});
		
		if(!onlyOne) {
		// Close all files
		for(var path in EDITOR.files) {
			if(EDITOR.files[path].saved) EDITOR.closeFile(path)
			else {
				alertBox("Please save or close file before running tests: " + path);
				return;
			}
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
			//var testsToRun = 5;
			var waitingForSync = false;
			var currentRunningTest;
			var currentlyInParallel = 0;
			var stillRunning = []; 
			var aborted = false;
			var firstTestOrder = 10000;
			var firstTest;

			if(testsToRun == 1) {
				for (var i=0; i<EDITOR.tests.length; i++) {
					if(EDITOR.tests[i].order < firstTestOrder) {
						firstTestOrder = EDITOR.tests[i].order;
						firstTest = EDITOR.tests[i];
					}
				}
				if(firstTest) {
					alertBox("Testing: " + firstTest.text, "TESTS");
					started = 1;
					asyncInitTest(firstTest);
					return;
				}
				throw new Error("testInfo: Could not find a test with id=1");
			}
			else {
				console.log("testInfo: Running " + testsToRun + " tests ...");
				
				//console.log(EDITOR.tests);
				
				testLoop();
			}
			
			function testLoop() {
				if(waitingForSync) {
console.log("testInfo: Waiting for " + currentRunningTest + " ...");
				return;
				}
				
				if(finished == testsToRun) return allTestsDone();
				
				if(aborted) {
console.log("testLoop: Tests aborted!");
				return;
				}
				
				console.log("testInfo: testLoop: testsToRun=" + testsToRun + " finished=" + finished + " started=" + started + " maxParallel=" + maxParallel + "  ");
				
				for(var i=started; i<testsToRun && (started-finished)<maxParallel; i++) {
					started++;// This counter here to prevent any sync test to finish all tests
					
					if(EDITOR.tests[i].parallel && !allInSync) {
asyncInitTest(EDITOR.tests[i]);
					}
					else {
						waitingForSync = true;
						runTest(EDITOR.tests[i]);
						break;
					}
				}
				
				if( (testsToRun / finished) < 1.1 ) {
					// 90% of tests are done, show those that are still not finished
					
					console.log("testInfo: Not finished: " + stillRunning.join(", "));
					
				}
			}
			
			function asyncInitTest(test) {
				setTimeout(function runTestAsync() { // Make all tests async
					runTest(test);
				}, 0);
			}
			
			function runTest(test) {
				if(aborted) {
console.log("runTest: Tests aborted!");
				return;
				}
				
				currentRunningTest = test.text;
				
				console.log("testInfo: Running test:" + test.text + " test.parallel=" + test.parallel + " waitingForSync=" + waitingForSync + " started=" + started + " testsToRun=" + testsToRun + " finished=" + finished + " currentlyInParallel=" + currentlyInParallel);
				
				if(!test.parallel && currentlyInParallel > 0) {
					throw new Error("No other test is allowed to be running while a non-parallel test is about to run! waitingForSync=" + waitingForSync + " currentlyInParallel=" + currentlyInParallel + " test.text=" + test.text);
				}
				
				currentlyInParallel++;
				
				stillRunning.push(test.text);
				
				try{
					test.fun(testResult);
				}
				catch(err) {
					finished++;
					currentlyInParallel--;
					testFail(test.text, err.message + "\n" + err.stack);
				}
				
				testLoop();
				
				
				function testResult(result) {
					currentlyInParallel--;
					
					console.log("testInfo: Testresult: " + test.text + " result:" + (result ? "SUCCESS" : "FAIL!"));
					
					if(testsCompleted.indexOf(test.text) != -1) {
						throw new Error("Test called callback more then once, or there's two tests with the same name: " + test.text);
						return;
					}
					
					testsCompleted.push(test.text);
					
					finished++;
					
					stillRunning.splice(stillRunning.indexOf(test.text), 1);
					
					console.log("testInfo: finished=" + finished + " started=" + started + " testsToRun=" + testsToRun + " currentlyInParallel=" + currentlyInParallel + " waitingForSync=" + waitingForSync);
					
					if(result !== true) testFail(test.text, result);
					
					if(waitingForSync) {
						console.log("testInfo: " + currentRunningTest + " completed. Continuing test loop ...");
waitingForSync = false;
					}
					
					if(finished == testsToRun) allTestsDone();
					
					testLoop();
					
				}
			}
			
			function allTestsDone() {
				
				if(allDone) {
console.warn("testInfo: allDone() already called!");
				return;
				}
				
				console.warn("testInfo: All tests done!");
				
				EDITOR.runningTests = false;
				allDone = true;
				
				if(fails === 0) {
					//EDITOR.closeAllDialogs();
testResults.push("All " + finished + " tests passed!")
				}
				else testResults.push(fails + " of " + finished + " test failed:");
				
				EDITOR.openFile("testresults.txt", testResults.join("\n"), function(err, file) {
					//file.parse = false;
					//file.mode = "text";
				});
				
				testFirstTest = false; // Run only the first test the first time, and all tests after that.
			}
			
			function testFail(description, result) {
				if(abortOnError) aborted = true;
				
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

				alertBox("Tests aborted due to failing test: " + description + ": " + (result.message ? result.message : result));
				
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
		
		if(captured) EDITOR.ctxMenu.hide();
		
		
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
	
	function fadeInCaretAnimation() {
		var c = UTIL.parseColor(EDITOR.settings.caret.color);
		var transparentColor = "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.005)";
		if(EDITOR.currentFile) {
			EDITOR.renderCaret(EDITOR.currentFile.caret, 0, transparentColor);
		}
	}
	
	function fileDrop(fileDropEvent) {
		fileDropEvent.preventDefault();
		
		console.log("fileDrop: fileDropEvent:");
		console.log(fileDropEvent);
		
		ctxMenuVisibleOnce = true; // Show the dropped content
		
		var text = fileDropEvent.dataTransfer.getData('Text');
		
		if(text) {
			console.log("fileDrop: Dragged text.length=" + text.length + " to the editor.");
			
			if(text.length < 512) {
				var url = UTIL.getLocation(text);
				if(url.protocol == "smb" && url.host && url.pathname) {
					/*
						User tried to drag a file from a samba share into the editor ...
						smb://z-mainframe/www/z%C3%A4ta.com/index.htm
						/run/user/1000/gvfs/smb-share:server=z-mainframe,share=www/zäta.com
						
						currect: 
						/run/user/1000/gvfs/smb-share:server=z-mainframe,share=www/zäta.com
						/run/user/1000/gvfs/smb-share:server=z-mainframe,share=www/zäta.com/sv/blog/byta_disk_zfs.htm 
						
						
						
					*/
					var path = "/run/user/1000/gvfs/smb-share:server=" + url.host + ",share=" + decodeURI(url.pathname.slice(1));
					path = path.trim(); // Remove CRLF
					EDITOR.openFile(path);
					return;
				}
			}
			
			if(EDITOR.currentFile) {
				// Drop the text into the current file
				
				// Get row and col
				var mouseX = fileDropEvent.offsetX;
				var mouseY = fileDropEvent.offsetY;
				var caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
				
				text = EDITOR.sanitizeText(EDITOR.currentFile, text);
				
				EDITOR.currentFile.insertText(text, caret);
				
			}
			else {
				// Create a new file with the dropped text
				EDITOR.openFile(undefined, text); 
				
			}
			return;
		}
		
		if(fileDropEvent.dataTransfer.files.length == 0) {
return alertBox("The dropped object doesn't seem to be a file!");
		}
		
		console.log("fileDrop: fileDropEvent.dataTransfer:");
		console.log( fileDropEvent.dataTransfer );
		
		var items = fileDropEvent.dataTransfer.items;
		var files = fileDropEvent.dataTransfer.files;
		
		console.log("items.length=" + items.length + " files.length=" + files.length);
		
		var filesToSave = 0;
		var filesSaved = 0;
		var lastPath; // The last path if many files where saved
		var uploadErrors = []; // List of errors during the upload
		var fileToOpen; // Open this file (if specified) when all files have been uploaded
		var foldersToRead = 0;
		var foldersRead = 0;
		var done = false;
		
		if(items && items.length > 1) {
			console.log("fileDrop: Dropped " + items.length + " items ...");
			var progressBar = document.createElement("progress");
			progressBar.max = items.length;
			progressBar.value = 0;
			var footer = document.getElementById("footer");
			footer.appendChild(progressBar);
			EDITOR.resizeNeeded(); // To show the progress bar
			
			for (var i=0; i<items.length; i++) {
				// webkitGetAsEntry is where the magic happens
				var item = items[i].webkitGetAsEntry();
				if (item) {
					traverseFileTree(item);
				}
			}
			return;
		}
		else {
			// ### Handle single file
			console.log("fileDrop: Dropped Single file !?");
			
			// todo: What if you drop a single folder ?
			
		var file = fileDropEvent.dataTransfer.files[0];
		var filePath = file.path || file.name;
		
			if(filePath.indexOf("/") == -1 && filePath.indexOf("\\") == -1) filePath = "/upload/" + filePath;
			
		var fileType = file.type;
		
		// The default action is to open the file in the editor.
		// But if the editor don't support the file, ask plugins what to do with it ...
		var handled = false;
			if(!supported(fileType)) {
			
				console.log("fileDrop: File is not supported. Calling fileDrop listeners (" + EDITOR.eventListeners.fileDrop.length + ")");
			for(var i=0, h=false; i<EDITOR.eventListeners.fileDrop.length; i++) {
				h = EDITOR.eventListeners.fileDrop[i].fun(file);
				if(h) handled = true;
			}
			
			if(!handled) {
promptBox("Where do you want to save the dropped " + fileType + " file ?", false, filePath, function(path) {
				if(path) {
					EDITOR.checkPath(path, function(err, path) {
						if(err && err.code != "CANCEL") return alertBox(err.message);
						else if(!err) saveFile(file, path, false, function(err, path) {
							if(err) alertBox(err.message);
							else alertBox("The file has been saved: " + path);
						});
					});
				}
			});
				}
			}
			else {
				console.log("fileDrop: File is supported! fileType=" + fileType);
				readFile();
			}
			EDITOR.interact("fileDrop", fileDropEvent);
		}
		
		return false;
		
		
		function traverseFileTree(item, path) {
			console.log("fileDrop: traverseFileTree: item=" + item + " path=" + path);
			path = path || "/upload/";
			if (item.isFile) {
				// Get file
				filesToSave++;
				
				item.file(function(file) {
					var filePath = path + file.name;
					console.log("fileDrop:item.file: filePath=", filePath);
					if(filePath.match(/(readme)|(main)|(index)/i) && !fileToOpen) fileToOpen = filePath;
					saveFile(file, path + file.name, true, fileSaved);
				});
			} else if (item.isDirectory) {
				// Get folder contents
				var dirReader = item.createReader();
				foldersToRead++;
				dirReader.readEntries(function(entries) {
					foldersRead++;
					progressBar.value = filesSaved+foldersRead;
					for (var i=0; i<entries.length; i++) {
						traverseFileTree(entries[i], path + item.name + "/");
					}
					console.log("fileDrop: dirReader.readEntries: filesToSave=" + filesToSave + " filesSaved=" + filesSaved + " foldersRead=" + foldersRead + " foldersToRead=" + foldersToRead);
					if(filesToSave == filesSaved && foldersRead == foldersToRead) uploadComplete();
				});
			}
			progressBar.max = Math.max(progressBar.max, filesToSave+foldersToRead);
			
			function fileSaved(err, path) {
				if(err) {
					console.error(err);
					uploadErrors.push(err);
				}
				filesSaved++;
				progressBar.value = filesSaved+foldersRead;
				if(path) lastPath = path;
				console.log("fileDrop:fileSaved: path=" + path + " filesToSave=" + filesToSave + " filesSaved=" + filesSaved + " foldersRead=" + foldersRead + " foldersToRead=" + foldersToRead);
				if(filesToSave == filesSaved && foldersRead == foldersToRead) uploadComplete();
			}
			
			function uploadComplete() {
				console.log("fileDrop:uploadComplete: filesToSave=" + filesToSave + " filesSaved=" + filesSaved + " items.length=" + items.length);
				
				if(done) {
console.warn("fileDrop:uploadComplete: Already done!"); // Might happen on rare ocations, actually should never happen! But it did, once (unable to repeat)
				return;
				}
				
				done = true;
				
				if(lastPath == undefined) {
					var failMsg = "Upload failed!";
					for (var i=0; i<uploadErrors.length; i++) failMsg += "\n" + uploadErrors[i];
					return alertBox(failMsg);
				}
				var folder = UTIL.getDirectoryFromPath(lastPath);
				var folders = UTIL.getFolders(folder);
				var baseFolder = folders.length > 0 ? folders[folders.length-1] : "/upload/";
				
				console.log("baseFolder=" + baseFolder + " folders=" + JSON.stringify(folders));
				
				footer.removeChild(progressBar);
				
				if(filesSaved > 1) EDITOR.fileExplorer(baseFolder);
				else if(filesSaved == 1 && lastPath) fileToOpen = lastPath;
				
				if(fileToOpen) {
					var fileExtension = UTIL.getFileExtension(fileToOpen);
					console.log("fileDrop: fileToOpen=" + fileToOpen + " fileExtension=" + fileExtension);
					// Open right away if it's a supported file
					if(EDITOR.parseFileExtensionAsCode.indexOf(fileExtension) != -1 || EDITOR.plainTextFileExtensions.indexOf(fileExtension) != -1) {
						EDITOR.openFile(fileToOpen);
					}
					else {
						var yes = "Yes";
						var no = "No";
						confirmBox("Do you want to open " + fileToOpen + " ?", [yes, no], function(answer) {
							if(answer == yes) EDITOR.openFile(fileToOpen);
						});
					}
				}
				
				EDITOR.resizeNeeded(); // To get rid of progress bar
				
			}
		}
		
		function saveFile(file, filePath, createPath, callback) {
			
			if(typeof createPath == "function" && callback == undefined) {
				callback = createPath;
				createPath = false;
			}
			
			/*
				if(typeof filePath == "function" && callback == undefined) {
				callback = filePath;
				filePath = file.path;
				createPath = false;
				}
			*/
			
			if(typeof filePath != "string") throw new Error("filePath=" + filePath + " (" + typeof filePath + ") needs to be a string!");
			if(typeof createPath != "boolean") throw new Error("createPath=" + createPath + " (" + typeof createPath + ") needs to be a boolean!");
			
			var reader = new FileReader();
			reader.onload = function (readerEvent) {
				var data = readerEvent.target.result;
				
				console.log("data:");
				console.log(data);
				
				// Specifying encoding:base64 will magically convert to binary! 
				// We do have to remove the data:image/png metadata though!
				data = data.replace("data:" + file.type + ";base64,", "");
				// Some browsers (Firefox) does not populate file.type
				data = data.replace("data:application/octet-stream;base64,", "");
				
				if(createPath) {
					var folder = UTIL.getDirectoryFromPath(filePath);
					EDITOR.createPath(folder, function(err) {
						if(err) {
							if(callback) return callback(err);
							else throw(err);
						}
						saveToDisk();
					});
				}
				else saveToDisk();
				
				function saveToDisk() {
					EDITOR.saveToDisk(filePath, data, false, "base64", callback);
				}
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
		
		function supported(fileType) {
			// Return true if the file is supported by the editor. Or false if it's not supported.
			// Example: fileType=text/plain
			if(fileType == "") return true;
			if(fileType.indexOf("text") == 0) return true;
			if( fileType.match(/application\/(javascript|ecmascript|xml|json|text)/) ) return true;
			
			console.log("Not supported: fileType=" + fileType);
			return false;
		}
		
		function readFile() {
			
			var reader = new FileReader();
			
			reader.onload = function (readerEvent) {
				console.log("fileDrop: reader.onload: readerEvent.target=" + readerEvent.target);
				var content = readerEvent.target.result;
				
				// Check for weird characters
				var weird = 0;
				var total = Math.min(content.length, 100);
				for (var i=0, charCode=0; i<total; i++) {
					charCode = content.charCodeAt(i);
					console.log("content " + i + " = " + charCode);
					if(charCode < 30 || charCode > 56000) weird++;
				}
				
				if(weird/total > 0.1) {
					var createPath = true;
					saveFile(file, filePath, createPath, function(err, filePath) {
						if(err) return alertBox(err.message);
						
						alertBox("Weird characters found, so the file was saved: " + filePath);
					});
				}
				else if(content.length > EDITOR.settings.bigFileSize) {
					var tmpPath = UTIL.joinPaths([EDITOR.workingDirectory, filePath]);
					console.log("fileDrop: Saving file to disk before opening because content.length=" + content.length + " > " + EDITOR.settings.bigFileSize + " : " + tmpPath);
					
					EDITOR.saveToDisk(tmpPath, content, function fileSavedMaybe(err) {
						if(err) throw err;
						
						EDITOR.openFile(tmpPath);
					});
				}
				else EDITOR.openFile(filePath, content);
				
			};
			console.log("fileDrop: readFile: file:");
			console.log(file);
			
			//reader.readAsDataURL(file); // For binary files (will be base64 encoded)
			var readText = reader.readAsText(file);
			console.log("fileDrop: readText=" + readText); // Does it give a success indication (so I know if I should use readAsText or readAsDataURL)
			
			/*
				for (var i = 0; i < e.dataTransfer.files.length; ++i) {
				console.log(e.dataTransfer.files[i].path + "\n" + e.dataTransfer.files[i].data);
				UTIL.objInfo(e.dataTransfer.files[i]);
				}
			*/
		}
		
	}
	
	
	
	function onMessage(windowMessageEvent) {
		// For (example) recieving message from a page that has the editor embeded
		var origin = windowMessageEvent.origin
		var msg = windowMessageEvent.data;
		
		console.log("Window message from: origin=" + origin);
		
		if(msg.openFile) EDITOR.openFile(msg.openFile.name, msg.openFile.content, function fileOpened(err, file) {
			if(err) throw err;
			
			EDITOR.on("fileChange", function fileChanged(fileThatChanged, change, text, index, row, col) {
				if(fileThatChanged == file) window.parent.postMessage({
					fileUpdate: {
						name: msg.openFile.name,
						content: file.text
					}
				}, origin ? origin : "*");
			});
			
		});
		else if(msg.disablePlugin) EDITOR.disablePlugin(msg.disablePlugin, true)
		else {
			console.warn("jzedit does not recognise msg=" + msg);
			//throw new Error("Unable to handle message: " + msg);
		}
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
			
			if (BROWSER.indexOf("MSIE") == 0) {
				window.clipboardData.setData('Text', textToPutOnClipboard);    
			} else {
				copyEvent.clipboardData.setData('text/plain', textToPutOnClipboard);
			}
			copyEvent.preventDefault();
			
		}
		// else: Do the default action (enable copying outside the canvas)
		
		//console.log("textToPutOnClipboard=" + textToPutOnClipboard);
		
		EDITOR.interact("copy", copyEvent);
		
		EDITOR.pseudoClipboard = textToPutOnClipboard;
		
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
			
			if (BROWSER.indexOf("MSIE") == 0) {
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
		
		var file = EDITOR.currentFile;
		
		if(text && text.length > EDITOR.settings.bigFileSize) {
			var yes = "Save the file";
			var no = "Never mind";
			
			confirmBox("The current buffer limit is " + EDITOR.settings.bigFileSize + " characters. " + 
			"Do you want to save the file after pasting the data ?", [yes, no], function(answer) {
				if(answer == yes) {
					
					if(file.isBig) {
						// First save the current buffer
						EDITOR.saveFile(file, function fileSaved(err, path) {
							if(err) return alertBox("Failed to save " + path + ":\n" + err.message, "PASTE", "error");
							// Then save the pasted data
							CLIENT.cmd("writeLines", {start: file.partStartRow+file.caret.row+1, path: file.path, content: text}, function linesWritten(err) {
								if(err) return alertBox("Failed to save pasted data! " + err.message);
								// Then reload the file buffer
								var lineNr = file.partStartRow+file.caret.row+1;
								var startRow = file.partStartRow;
								file.loadFilePart(startRow, function(err) {
									if(err) return alertBox("Failed to load startRow=" + startRow + " ! " + err.message);
									file.gotoLine(lineNr, function(err) {
										if(err) return alertBox("Failed to go to lineNr=" + lineNr + " ! " + err.message);
										
									});
								});
							});
						});
					}
					else {
						// Normal file
						if(!file.savedAs) {
							EDITOR.checkPath(file.path, function(err, path) {
								if(err) return alertBox("Unable to save " + file.path + ".\nIt does not have a proper path!", "PASTE", "error");
								else saveToDisk(path);
							});
						}
						else saveToDisk(file.path)
					}
				}
				
				function saveToDisk(filePath) {
					console.log("Saving file content with the pasted data as " + filePath + " ...");
					var combinedText = file.text.slice(0, file.caret.index) + text + file.text.slice(file.caret.index);
					EDITOR.saveToDisk(filePath, combinedText, function saveToDiskComplete(err, path, hash) {
						if(err) return alertBox("Unable to save the file! " + err.message, "FILE", "error");
						
						EDITOR.closeFile(file.path, true);
						EDITOR.openFile(filePath, undefined, undefined, function(err, file) {
							if(err) return alertBox("The file was saved, but opening it gave the following error: " + err.message, "FILE", "warning");
						});
						
					});
				}
				
			});
			
			return;
		}
		
		if(EDITOR.settings.useCliboardcatcher && giveBackFocusAfterClipboardEvent) {
			// Give focus back to the editor/canvas
			EDITOR.input = true;
			canvas.focus();
			giveBackFocusAfterClipboardEvent = false;
		}
		
		//console.log("PASTE: " + UTIL.lbChars(text));
		
		if(EDITOR.input && EDITOR.currentFile) {
			
			pasteEvent.preventDefault();
			
			console.log("Calling paste listeners on paste event (" + EDITOR.eventListeners.paste.length + ") ...");
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
				
				text = EDITOR.sanitizeText(file, text);
				
				// If there is a text selection. Delete the selection first!
				file.deleteSelection();
				
				file.insertText(text);
				
				//file.fixCaret();
			}
		}
		else {
			console.log("paste: EDITOR.input=" + EDITOR.input + " EDITOR.currentFile=" + EDITOR.currentFile);
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
		
		var charCode = keyPressEvent.charCode || keyPressEvent.keyCode || keyPressEvent.which;
		var character = String.fromCharCode(charCode);
		var combo = getCombo(keyPressEvent);
		var file = EDITOR.currentFile;
		var preventDefault = false;
		var funReturn = true;
		
		console.log("keyPressed: charCode=" + charCode + " character=" + character + " (key=" + keyPressEvent.key + " code=" + keyPressEvent.code + " charCode=" + keyPressEvent.charCode + ", keyCode=" + keyPressEvent.keyCode + ", which=" + keyPressEvent.which + ") combo=" + JSON.stringify(combo) + " EDITOR.input=" + (EDITOR.currentFile ? EDITOR.input : "NoFileOpen EDITOR.input=" + EDITOR.input + "") + "");
		
		// Don't execute keypress for the browser that support it, if keyboardCatcher is focused.
		if(keyPressEvent.target && keyPressEvent.target.className == "keyboardCatcher") return false;
		
		// Firefox and Safari go here before calling copy/paste/cut events
		// Without this copy/paste will not work in Safari! Why !? 
		if(nativeCopy || nativePaste || nativeCut) {
			console.warn("keyPressed: Abort because nativeCopy=" + nativeCopy + " nativePaste=" + nativePaste + " nativeCut=" + nativeCut);
			nativeCopy = false;
			nativePaste = false;
			nativeCut = false;
			return;
		}
		
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
			var middle = EDITOR.settings.topMargin + (EDITOR.currentFile.caret.row - EDITOR.currentFile.startRow) * EDITOR.settings.gridHeight + Math.floor(EDITOR.settings.gridHeight/2);
			var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + tempTest + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			//var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			ctx.fillStyle = "rgb(0,0,0)";
			ctx.fillText(benchmarkCharacter, left, middle);
			tempTest++;
			return;
			//ctx.fillText(character, 0, Math.floor(EDITOR.settings.gridHeight/2));
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
		/*
			Different modes need to preventDefault (have a keyPressed event listener that returns false)
			in order to prevent characters from being inserted to the document. 
		*/
		
		if(file && EDITOR.input && !preventDefault) {
			// Put character at current caret position:
			
				file.putCharacter(character);
			
			// Optimization: Render only the row, instead of the whole screen (20x perf increase on Opera Mobile)
				//EDITOR.renderNeeded();
			EDITOR.renderRow();
			if(EDITOR.touchScreen || !EDITOR.settings.caretAnimation) EDITOR.renderCaret(file.caret);
			
			// Experiment: Hide the caret while typing !?
			
			if(!EDITOR.touchScreen && EDITOR.settings.caretAnimation) { // Hiding caret is annoying when typing using the virtual keyboard
				
				// First remove any old ones so they do not stop before the caret is fully filled
			clearTimeout(renderCaretTimer);
			EDITOR.removeAnimation(fadeInCaretAnimation);
			
			/*
				console.log("since lastTimeCharacterInserted=" + (new Date() - EDITOR.lastTimeCharacterInserted) +
				" since insert vs action=" + (EDITOR.lastTimeCharacterInserted - EDITOR.lastTimeInteraction) +
				" lastTimeCharacterInserted=" + EDITOR.lastTimeCharacterInserted.getTime() + " lastTimeInteraction=" + EDITOR.lastTimeInteraction.getTime());
			*/
			
			if(new Date() - EDITOR.lastTimeCharacterInserted > 1000 || EDITOR.lastTimeCharacterInserted - EDITOR.lastTimeInteraction < -20 || EDITOR.lastTimeCharacterInserted - EDITOR.lastTimeInteraction > 3000) {
				//console.log("Rendering caret");
				EDITOR.renderCaret(file.caret);
				document.getElementById('canvas').style.cursor = 'text';
			}
			else {
				//console.log("Fading caret");
				EDITOR.addAnimation(fadeInCaretAnimation);
				
				var caret = UTIL.canvasLocation(file.caret);
				var mouse = {x: EDITOR.canvasMouseX, y: EDITOR.canvasMouseY};
				var distanceX = caret.x - mouse.x;
				var distanceY = caret.y - mouse.y;
				//console.log("distanceX=" + distanceX + " Math.abs(distanceY)=" + Math.abs(distanceY) + " EDITOR.settings.gridHeight=" + EDITOR.settings.gridHeight);
				var mouseCursorAhead = distanceX < 0 && Math.abs(distanceY) < EDITOR.settings.gridHeight*2;
				var distanceToMouseCursor = Math.sqrt(Math.pow (distanceX, 2) + Math.pow (distanceY, 2));
				
				//UTIL.drawCircle(ctx, caret.x, caret.y, "blue");
				//UTIL.drawCircle(ctx, mouse.x, mouse.y, "green");
				
				if(mouseCursorAhead || distanceToMouseCursor < EDITOR.settings.gridHeight*3) {
					document.getElementById('canvas').style.cursor = 'none'; // Hide mouse pointer while typing
				}
				
				renderCaretTimer = setTimeout(function() {
					EDITOR.removeAnimation(fadeInCaretAnimation);
					if(file==EDITOR.currenctFile) EDITOR.renderCaret(file.caret);
					document.getElementById('canvas').style.cursor = 'text';
				}, 3000);
			}
			}
		}
		
		EDITOR.interact("keyPressed", keyPressEvent);
		
		// Prevent Firefox's quick search (/ slash)
		if(EDITOR.input && charCode == 47) preventDefault = true;
		
		// Prevent Firefox's quick find (' single quote)
		if(EDITOR.input && charCode == 39) preventDefault = true;
		
		// Prevent scrolling down when hitting space in Firefox
		if(EDITOR.input && charCode == 32) preventDefault = true;
		
		if(preventDefault) {
			console.log("keyPressed: Preventing default browser action!");
			if(typeof keyPressEvent.preventDefault == "function") keyPressEvent.preventDefault();
			return false;
		}
		else return true;
	}
	
	function resizeAndRender(afterResize) {
		
		//console.log("resizeAndRender: EDITOR.shouldResize=" + EDITOR.shouldResize + " EDITOR.shouldRender=" + EDITOR.shouldRender + " EDITOR.isScrolling=" + EDITOR.isScrolling);
		
		// Only do the resize or render if it's actually needed
		if(EDITOR.shouldResize) return EDITOR.resize(); // EDITOR.resize() will call resizeAndRender()
		
		//if(EDITOR.shouldRender) window.requestAnimationFrame(EDITOR.render);
		if(EDITOR.shouldRender) {
			
			if(EDITOR.isScrolling) console.time("Scrolling optimization");
			
			var file = EDITOR.currentFile;
			var fileStartRow = file ? file.startRow : 0;
			var fileEndRow = fileStartRow + EDITOR.view.visibleRows; // Don't use Math.max or the bottom will not be cleared!
			var screenStartRow = 0;
			var lastFileStartRow = lastBufferStartRow;
			var tmpLastBufferStartRow = 0;
			
			/*
				
				Optimization for when scrolling (on mobile)
				Copying from one canvas to another seem to be too slow for it to be worth it !?
				The EDITOR.render() function has a lot of over-head, we should try to avoid it!
				
				Scrolling optimization: 1.5 - 1.7 ms including render 1 - 1.4ms
				Full render: 1.8 - 2.5 ms
				
				The render optimizations does feel a little snappier on a slow mobile

				I also tried using a cache canvas but it was too complicated and didn't feel much faster.

				This function sometimes give DOMException INDEX_SIZE_ERR on opera mobile! Why?
				
			*/
			
			// The canvas is reset after a resize, so we need to make a full render!
			
			if(EDITOR.isScrolling && file && !afterResize && 1 == 1) {
				
				// Only render what is not already rendered.
				
				tmpLastBufferStartRow = fileStartRow;
				
				var rowDiff = lastFileStartRow - fileStartRow;
				var scrollDirection = rowDiff > 0 ? 1 : -1;
				
				if(rowDiff == 0) {
					EDITOR.shouldRender = false;
					return;
				}
				
				if(scrollDirection == 1) {
					// Move image down
					var dy = Math.abs(rowDiff) * EDITOR.settings.gridHeight + EDITOR.settings.topMargin;
					var sy = EDITOR.settings.topMargin;
					var sHeight = EDITOR.view.canvasHeight - dy;
					
					// Render above
					fileEndRow = fileStartRow + Math.abs(rowDiff)-1;
					}
				else {
					// Move image up
					var dy = EDITOR.settings.topMargin;
					var sy =  Math.abs(rowDiff) * EDITOR.settings.gridHeight + EDITOR.settings.topMargin;;
					var sHeight = EDITOR.view.canvasHeight - sy;
					
					// The last line can be cut in half, so don't use the last line!
					
					// Render the missing rows
					screenStartRow = EDITOR.view.visibleRows - Math.abs(rowDiff) - 1;
					fileStartRow = fileEndRow - Math.abs(rowDiff) - 1;
					}
				
				var dx = 0;
				var sx = 0;
				var sWidth = EDITOR.view.canvasWidth;
				var dWidth = sWidth;
				var dHeight = sHeight;
				
				console.log("sx=" + sx + " sy=" + sy + " sWidth=" + sWidth + " sHeight=" + sHeight);
				
				try {
				ctx.drawImage(canvas, sx*pixelRatio, sy*pixelRatio, sWidth*pixelRatio, sHeight*pixelRatio, dx, dy, dWidth, dHeight);
				}
				catch(err) {
					var error = new Error(err.message + " sx=" + sx + " sy=" + sy + " sWidth=" + sWidth + " sHeight=" + sHeight + " pixelRatio=" + pixelRatio + " dx=" + dx + " dy=" + dy + " dWidth=" + dWidth + " dHeight=" + dHeight);
					throw error;
				}
				
				//EDITOR.shouldRender = false;
				//return;
			}
			
			if(EDITOR.shouldRender) {
				console.log("resizeAndRender: render! EDITOR.isScrolling=" + EDITOR.isScrolling + " fileStartRow=" + fileStartRow + " fileEndRow=" + fileEndRow + " rowDiff=" + rowDiff + " screenStartRow=" + screenStartRow);
				
			EDITOR.render(file, fileStartRow, fileEndRow, screenStartRow, canvas, ctx);
				}
			
			if(tmpLastBufferStartRow) lastBufferStartRow = tmpLastBufferStartRow;
			
			if(EDITOR.isScrolling) console.timeEnd("Scrolling optimization");
		}
		
		
		//window.requestAnimationFrame(resizeAndRender); // Keep calling this function
		
		// Using requestAnimationFrame feels slightly slower then rendering on each interaction!
		
		if((new Date() - EDITOR.lastTimeInteraction) > afkTimeout) {
			afk = true;
			EDITOR.fireEvent("afk");
			// Try do do as little as possible to save power
			clearInterval(mainLoopInterval);
		}
	
	}
	
	function keyboardCatcherKey(keyEvent) {
		keyEvent = keyEvent || window.event;
		
		var charCode = keyEvent.charCode; // Deprected, non-standard.  Unicode value of the character key that was pressed
		var keyCode = keyEvent.keyCode; //  Deprecated. A system and implementation dependent numerical code identifying the unmodified value of the pressed key
		var key = keyEvent.key; // value of the key pressed by the user, taking into consideration the state of modifier keys such as Shift as well as the keyboard locale and layout. 
		var code = keyEvent.code; // physical positions on the input device
		var which = keyEvent.which; //  Deprecated. numeric keyCode of the key pressed, or the character code
		
		var shiftKey = keyEvent.shiftKey; // if the shift key was pressed 
		
		var keyboardCatcher = document.getElementById("keyboardCatcher");
		var inputValue = keyboardCatcher.value;
		
		console.log("keyboardCatcherKey: inputValue=" + inputValue + " key=" + key + " charCode=" + charCode + " keyCode=" + keyCode + " code=" + code + " which=" + which + " shiftKey=" + shiftKey);
		
		/*
			Android don't want to give us key (key=Unidentified). And it wont give us keyPress events ...
			So we have to check what was entered into the input box
		*/
		
		if(inputValue.length > 1) {
			inputValue = inputValue.slice(1); // Remove the "padding"
			
			if(inputValue.length == 1) {
				// Mock a keypress
				var keyPress = {
charCode: inputValue.charCodeAt(0),
keyCode: keyCode,
which: which,
shiftKey: keyEvent.shiftKey,
					ctrlKey: keyEvent.ctrlKey,
					metaKey: keyEvent.metaKey,
					altKey: keyEvent.altKey
}
keyPressed(keyPress);
			}
			else {
				
				// When pressing space, some keyboards inserts the last words+space
				/*
					if(inputValue == (keyboardCatcherLastInserted + " ")) {
					inputValue = " ";
					}
					else {
					console.log("inputValue=*" + inputValue + "* keyboardCatcherLastInserted=*" + keyboardCatcherLastInserted + "*");
					}
				*/
				
				// Insert the text
				var file = EDITOR.currentFile;
				if(file) {
					file.insertText(inputValue);
				}
			}
			
			keyboardCatcher.value = "x";
			// Add padding so that the keyboard not insist on big letters
			
			// This will prevent the last word being appended again when pressing space
			keyboardCatcher.blur();
			keyboardCatcher.focus();
			moveCursorToEnd(keyboardCatcher);
			
			//setTimeout(function() {keyboardCatcher.value = "";}, 1500);
			
			keyboardCatcherLastInserted = inputValue;
			
		}
		
		return true;
	}
	
	
	function keyIsDown(keyDownEvent) {
		/*
			
			note: Windows OS (or Chromium?) has some weird keyboard commands, like Ctrl + I to insert a tab!
			
		*/
		keyDownEvent = keyDownEvent || window.event;
		
		//keyDownEvent.preventDefault();
		
		var charCode = keyDownEvent.charCode || keyDownEvent.keyCode || null;
		var character = String.fromCharCode(charCode);
		var combo = getCombo(keyDownEvent);
		var key = keyDownEvent.key || null; // Null so that it will not be the same as undefined
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
		
		console.log("keyDown: key=" + keyDownEvent.key + " charCode=" + charCode + " keyCode=" + keyDownEvent.keyCode + " which=" + keyDownEvent.which + " character=" + character + " lastKeyDown=" + lastKeyDown + " combo=" + JSON.stringify(combo) + " targetElementClass=" + targetElementClass + " EDITOR.mode=" + EDITOR.mode + " EDITOR.input=" + EDITOR.input);
		
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
		//else console.log("recognition: Not ctrl! charCode=" + charCode);
		
		
		
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
		//console.log("Calling keyDown listeners (" + EDITOR.eventListeners.keyDown.length + ") ...");
		for(var i=0; i<EDITOR.eventListeners.keyDown.length; i++) {
			funReturn = EDITOR.eventListeners.keyDown[i].fun(EDITOR.currentFile, character, combo, keyDownEvent); // Call function
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("keyIsDown: Default browser action prevented by keyDown listener " + UTIL.getFunctionName(EDITOR.eventListeners.keyDown[i].fun) + "!");
			}
		}
		
		if(!preventDefault) {
			// Check key bindings
			var capturedBy = [];
			console.log("combo.sum=" + combo.sum + " EDITOR.mode=" + EDITOR.mode);
			for(var i=0, binding; i<keyBindings.length; i++) {
				
				binding = keyBindings[i];
				
				/*
					console.log( UTIL.getFunctionName(binding.fun) + ": " + JSON.stringify(binding) + 
					" char=" + (binding.char == character || binding.charCode == charCode) +
					" combo=" + (binding.combo == combo.sum || binding.combo === undefined) + 
					" dir=" + (binding.dir == "down" || binding.dir === undefined) + 
					" mode=" + (binding.mode == EDITOR.mode || binding.mode == "*") );
				*/
				
				if( (binding.char === character || binding.charCode === charCode || binding.key === key) && // === so that undefined doesn't match null
				(binding.combo == combo.sum || binding.combo === undefined) && 
				(binding.dir == "down" || binding.dir === undefined) && // down is the default direction
				(binding.mode == EDITOR.mode || binding.mode == "*") ) {
					
					if(binding.charCode == charCodeShift || binding.charCode == charCodeAlt || binding.charCode == charCodeCtrl) {
						throw new Error("Can't have nice things! Causes a bug that will make native shift+ or algGr+ keyboard combos not work");
					}
					else {
						
						console.log("keyDown: Calling function: " + UTIL.getFunctionName(binding.fun) + "...");
						
						if(captured) {
							console.warn("Key combo has already been captured by " + capturedBy.map(UTIL.getFunctionName).join(",") + " : " +
							" charCode=" + charCode + 
							" character=" + character + 
							" key=" + key + 
							" combo=" + JSON.stringify(combo) + 
							" binding.char=" + binding.char + 
							" binding.charCode=" + binding.charCode + 
							" binding.combo=" + binding.combo + 
							" binding.dir=" + binding.dir + 
							" binding.mode=" + binding.mode + 
							" binding.fun=" + UTIL.getFunctionName(binding.fun)
							);
						}
						
						captured = true;
						capturedBy.push(binding.fun);
						
						if(!EDITOR.currentFile) console.warn("No file open!");
						
						funReturn = binding.fun(EDITOR.currentFile, combo, character, charCode, "down", targetElementClass);
						
						//console.log(UTIL.getFunctionName(binding.fun) + " returned " + funReturn);
						
						if(funReturn === false) { // If one of the functions returns false, the default action will be prevented!
							preventDefault = true;
							console.log("keyIsDown: Default browser action prevented by key binding=" + UTIL.getFunctionName(binding.fun) + "!");
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
		var metaCmdKey = keyDownEvent.metaKey; // The key labeled cmd on a Mac keyboard
		
		console.log("keyIsDown: combo.sum=" + combo.sum + " windowKey=" + windowKey + " metaCmdKey=" + metaCmdKey + " BROWSER=" + BROWSER + " MAC=" + MAC);
		
		if((combo.sum > 0 || metaCmdKey) && !captured) {
			// The user hit a combo, with shift, alt, ctrl + something, but it was not captured.
			
			if( (combo.ctrl || metaCmdKey) && character == "C") {
				console.log("Native command: copy !? MAC=" + MAC);
				
				if(MAC) nativeCopy = true;
				
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
			else if( (combo.ctrl || metaCmdKey) && character == "V") {
				console.log("Native command: paste !? MAC=" + MAC + " EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + " EDITOR.input=" + EDITOR.input);
				
				if(MAC) nativePaste = true;
				
				if(EDITOR.settings.useCliboardcatcher && EDITOR.input) {
					giveBackFocusAfterClipboardEvent = true;
					
					// Problem: If alertBox button was clicked, it takes 500ms to get focus back to canvas. 
					// But if we paste before that, input will be false.
					
					var clipboardcatcher = document.getElementById("clipboardcatcher");
					clipboardcatcher.focus();
					
					//preventDefault = true;
				}
			}
			else if( (combo.ctrl || metaCmdKey) && character == "X") {
				console.log("Native command: cut !?");
				
				if(MAC) nativeCut = true;
				
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
			else if(windowKey) {console.log("Window key ...");preventDefault = true;} // Do we want to capture Window combos !?
			else if(metaCmdKey) {console.log("meta/cmd key ...");preventDefault = true;} // Do we want to capture Meta/Cmd combos !?
			//else if(combo.shift) {} // Wait for Shift+key combo!
			//&&//&&//
			else {
				throw Error("Unsupported! combo: " + JSON.stringify(combo) + " character=" + character + " charCode=" + charCode);
				
				preventDefault = true;
			}
			
		}
		
		lastKeyDown = charCode;
		
		// In case the user has no mouse, pressing Enter should hide the "Right click to show the menu" message
		if(!ctxMenuVisibleOnce && charCode == 13) {
			ctxMenuVisibleOnce = true;
			
			// Can not give editor input or prevent default as that would prevent form submit by pressing Enter.
			//EDITOR.input = true;
			//preventDefault = true;
			EDITOR.renderNeeded();
		}
		
		if(preventDefault) {
			//alert("Preventing default browser action!");
			console.log("keyIsDown: Preventing default browser action!");
			
			if(typeof keyDownEvent.stopPropagation == "function") keyDownEvent.stopPropagation();
			if(window.event && typeof window.event.cancelBubble != "undefined") window.event.cancelBubble = true;
			if(typeof keyDownEvent.preventDefault == "function") keyDownEvent.preventDefault();
			if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
			
			return false;
		}
		else {
			//console.log("Executing default browser/OS action ...");
			
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
		var preventDefault = false;
		
		console.log("keyUp: key=" + keyUpEvent.key + " charCode=" + charCode + " character=" + character + " combo=" + JSON.stringify(combo));
		
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
			
			if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || binding.combo === undefined) && (binding.dir == "up") && (binding.mode == EDITOR.mode || binding.mode == "*") ) { // down is the default direction
				
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
		//else console.log("recognition: Not ctrl! charCode=" + charCode);
		
		EDITOR.interact("keyUp", keyUpEvent);
		
		if(preventDefault) {
			console.log("keyIsUp: Preventing default browser action! key=" + keyUpEvent.key + "");
			if(typeof keyUpEvent.preventDefault == "function") keyUpEvent.preventDefault();
			return false;
		}
		else {
			console.log("keyIsUp: Default browser action allowed ... key=" + keyUpEvent.key + "");
			return true;
		}
	}
	
	function isInputElement(el) {
		return el &&   (( el.nodeName == "INPUT" &&  (el.type == "text" || el.type == "password") ) || el.nodeName == "TEXTAREA");
	}
	
	function mouseDown(mouseDownEvent) {
		
		mouseDownEvent = mouseDownEvent || window.event;
		
		EDITOR.lastElementWithFocus = document.activeElement || mouseDownEvent.target;
		// EDITOR.lastElementWithFocus = The last element that had focus, eg, NOT the element that was just clicked!!
		
		if(mouseDownEvent.type == "touchstart") EDITOR.touchScreen = true;
		
		EDITOR.touchDown = true;
		
		//if(dropdownMenuRoot && !dropdownMenuRoot.active) dropdownMenuRoot.hide(true);
		
		//console.log("Changed EDITOR.lastElementWithFocus to id=" + EDITOR.lastElementWithFocus.id + " class=" + EDITOR.lastElementWithFocus.class);
		
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
			if(! (lastMouseDownEventType == "touchstart" && mouseDownEvent.type == "mousedown") ) EDITOR.ctxMenu.hide();
			
			caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
			
			
			if(EDITOR.currentFile && (button == leftMouseButton)) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
				// Give focus
				EDITOR.input = true;
				
				// Remove focus from everything else
				if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
				else console.log("mouseDown: Unable to blur active element!:");
				
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
				
				EDITOR.ctxMenu.show(mouseX, mouseY, mouseDownEvent);
				
			}
			
		}
		else{
			
			console.log("mouseDown: Removing focus/input because the click was registered outside the canvas!");
			EDITOR.input = false;
			
		}
		
		if(target.className == "fileCanvas") {
			// Prevent whatever nasty thing the browser wants to do
			// like zooming out etc.
			mouseDownEvent.preventDefault();
		}
		
		console.log("mouseDown:  caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
		console.log(mouseDownEvent);
		
		console.log("mouseDown: Calling mouseClick (down) listeners (" + EDITOR.eventListeners.mouseClick.length + ") ...");
		for(var i=0, binding; i<EDITOR.eventListeners.mouseClick.length; i++) {
			
			click = EDITOR.eventListeners.mouseClick[i];
			
			if((click.dir == "down" || click.dir == undefined) && 
			(click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo === undefined) &&
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				// Note that caret is a temporary position caret (not the current file.caret)!
				
				funReturn = click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent); // Call it
				
				console.log("mouseDown: mouseClick event " + UTIL.getFunctionName(click.fun) + " for mouseDown returned " + funReturn);
				
				if(funReturn === false) {
					preventDefault = true;
					console.log("mouseDown: " + UTIL.getFunctionName(click.fun) + " prevented other mouseClick actions!");
					break;
				}
				else if(funReturn !== true) {
					throw new Error(UTIL.getFunctionName(click.fun) + " did not return true or false!");
				}
				
			}
		}
		
		if(mouseDownEvent.type == "touchstart" && recognition) {
			// Dont start recording right away, because Android makes a very annoying sound when the recordning starts.
			setTimeout(function stillDownMaybe() {
				if(!EDITOR.touchDown) return;
				try {
				recognition.start();
			}
			catch(err) {
					console.warn("mouseDown: speach recognition error: " + err.message);
			}
			}, 400);
		}
		
		lastMouseDownEventType = mouseDownEvent.type;
		
		var el = EDITOR.lastElementWithFocus || mouseDownEvent.target;
		// selectionStart etc seem to get lost when the element lose focus, so save it!
		// mouse up event sometime doesn't fire, so save selectionStart on both down and up event
		if(el.scrollTop != undefined) el.setAttribute("sTop", el.scrollTop);
		if(el.selectionStart != undefined) el.setAttribute("selStart", el.selectionStart);
		if(el.selectionEnd != undefined) el.setAttribute("selEnd", el.selectionEnd);
		
		EDITOR.interact("mouseDown", mouseDownEvent);
		
		if(preventDefault) {
			console.log("mouseDown:Preventing default!");
			mouseDownEvent.preventDefault(); // To prevent the annoying menus
			mouseDownEvent.stopPropagation();
			return false;
		}
		
		//return true;
		
	}
	
	
	function mouseUp(mouseUpEvent) {
		console.time("mouseUp");
		
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
		
		if(target.className == "fileCanvas") {
			// Prevent whatever nasty thing the browser wants to do
			// like zooming out etc.
			mouseUpEvent.preventDefault();
		}
		
		console.log("Calling mouseClick (up) listeners (" + EDITOR.eventListeners.mouseClick.length + ") ...");
		console.time("mouseClick listeners");
		var funReturn = true;
		var preventDefault = false;
		
		for(var i=0, binding; i<EDITOR.eventListeners.mouseClick.length; i++) {
			click = EDITOR.eventListeners.mouseClick[i];
			
			// Make sure to define click.dir (to prevent double action)!
			if((click.dir == "up" || click.dir == undefined) && 
			(click.button == button || click.button == undefined) && 
			(click.targetClass == target.className || click.targetClass == undefined) && 
			(click.combo == keyboardCombo.sum || click.combo == undefined) && 
			(click.targetTag == target.tagName || click.targetTag == undefined)
			) {
				
				var fName = UTIL.getFunctionName(click.fun)
				console.time(fName);
				funReturn = click.fun(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseUpEvent); // Call it
				console.timeEnd(fName);
				
				console.log("mouseClick event " + UTIL.getFunctionName(click.fun) + " for mouseUp returned " + funReturn);
				
				if(funReturn === false) {
					preventDefault = true;
					console.log("" + UTIL.getFunctionName(click.fun) + " prevented other mouseClick actions!");
					break;
				}
				else if(funReturn !== true) {
					throw new Error(UTIL.getFunctionName(click.fun) + " did not return true or false!");
				}
				
			}
		}
		console.timeEnd("mouseClick listeners");
		console.timeEnd("mouseUp");
		
		//console.log("mouseUp, EDITOR.shouldRender=" + EDITOR.shouldRender);
		
		if(mouseUpEvent.type == "touchstart" && recognition) {
			recognition.stop();
		}
		
		var el = EDITOR.lastElementWithFocus || mouseUpEvent.target;
		// selectionStart etc seem to get lost when the element lose focus, so save it!
		if(el.scrollTop != undefined) el.setAttribute("sTop", el.scrollTop);
		if(el.selectionStart != undefined) el.setAttribute("selStart", el.selectionStart);
		if(el.selectionEnd != undefined) el.setAttribute("selEnd", el.selectionEnd);
		
		EDITOR.interact("mouseUp", mouseUpEvent);
		
		if(preventDefault) {
			console.log("mouseUp: Preventing default!");
			if(typeof mouseUpEvent.preventDefault == "function") mouseUpEvent.preventDefault();
			if(typeof mouseUpEvent.stopPropagation == "function") mouseUpEvent.stopPropagation();
			return false;
		}
		}
	
	function getMousePosition(mouseEvent) {
		
		// Mouse position is on the current element (most likely Canvas) 
		
		// We might get an error if running in an iframe: Error: Permission denied to access property "offsetX"
		try {
			var mouseX = mouseEvent.offsetX==undefined?mouseEvent.layerX:mouseEvent.offsetX;
		var mouseY = mouseEvent.offsetY==undefined?mouseEvent.layerY:mouseEvent.offsetY;
		}
		catch(err) {
			console.warn(err.message);
		}
		
		//console.log("mouseX=" + mouseX + " offsetX=" + mouseEvent.offsetX + " layerX=" + mouseEvent.layerX + " clientX=" + mouseEvent.clientX + " screenX=" + mouseEvent.screenX + " pageX=" + mouseEvent.pageX + " x=" + mouseEvent.x);
		
		if(mouseX != undefined && mouseY != undefined && mouseEvent.target && mouseEvent.target == canvas) {
			EDITOR.canvasMouseX = mouseX;
			EDITOR.canvasMouseY = mouseY;
		}
		
		/*
			if(e.page) console.log("mouseEvent.page.x=" + mouseEvent.page.x);
			if(mouseEvent.changedTouches) console.log("mouseEvent.changedTouches[" + (mouseEvent.changedTouches.length-1) + "]=" + mouseEvent.changedTouches[e.changedTouches.length-1].pageX);
			console.log("mouseEvent.x=" + e.x);
			console.log("mouseEvent.offsetX=" + e.offsetX);
			console.log("mouseEvent.layerX=" + e.layerX);
		*/
		
		if(UTIL.isNumeric(mouseEvent.clientX) && UTIL.isNumeric(mouseEvent.clientY)) {
			// clientX and clientY is always on the window/veiwport!
			EDITOR.mouseX = parseInt(mouseEvent.clientX);
			EDITOR.mouseY = parseInt(mouseEvent.clientY);
		}
		
		var badLocation = mouseX == undefined || mouseY == undefined || mouseX <= 0 || mouseY <= 0;
		
		if(mouseEvent.changedTouches && badLocation) {
			
			mouseX = Math.round(mouseEvent.changedTouches[mouseEvent.changedTouches.length-1].pageX); // pageX
			mouseY = Math.round(mouseEvent.changedTouches[mouseEvent.changedTouches.length-1].pageY);
			
			// The editor doesn't allow scrolling, so pageX is thus the same as clientX !
			
			// Touch events only have pageX which is the whole page. We only want the position on the canvas !?
			if(mouseEvent.target == canvas) {
				var rect = canvas.getBoundingClientRect();
				//console.log(rect.top, rect.right, rect.bottom, rect.left);
				mouseX = mouseX - rect.left;
				mouseY = mouseY - rect.top;
				
				EDITOR.canvasMouseX = mouseX;
				EDITOR.canvasMouseY = mouseY;
				
			}
			else {
				EDITOR.mouseX = mouseX;
				EDITOR.mouseY = mouseY;
			}
			
		}
		
		if(mouseX == undefined && mouseY == undefined) {
			if(mouseEvent.target == canvas) {
				mouseX = EDITOR.canvasMouseX;
				mouseY = EDITOR.canvasMouseY;
			}
			else {
				mouseX = EDITOR.mouseX;
				mouseY = EDITOR.mouseY;
			}
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
		
		var mouse = getMousePosition(mouseMoveEvent); // Sets EDITOR.mouseX&Y and EDITOR.canvasMouseX&Y
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
		
		// Canvas not available on IE before mouse move
		if(typeof EDITOR.canvas != "undefined" && typeof EDITOR.canvas.style != "undefined") {
			EDITOR.canvas.style.cursor = 'text';
		}
		
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
		
		dblClickEvent = dblClickEvent || window.event;
		
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
		
		var delta = scrollWheelEvent.wheelDelta || -scrollWheelEvent.detail;
		var target = scrollWheelEvent.target;
		var tagName = target.tagName;
		var combo = getCombo(scrollWheelEvent);
		var dir = delta > 0 ? -1 : 1;
		var steps = Math.abs(delta);
		
		console.log("Scrolling on " + tagName);
		
		if(tagName == "CANVAS") {
			console.log("Calling mouseScroll listeners (" + EDITOR.eventListeners.mouseScroll.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.mouseScroll.length; i++) {
				EDITOR.eventListeners.mouseScroll[i].fun(dir, steps, combo, scrollWheelEvent);
			}
		}
		
		EDITOR.interact("mouseScroll", scrollWheelEvent);
		
		return true;
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
		
		var domurl = window.URL || window.webkitURL || window;
		
		img.onload = function () {
			console.log("SVG image created!");
			callback(img);
			if(url) domurl.revokeObjectURL(url);
		}
		
		if( domurl.createObjectUR ) {
			var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
			var url = domurl.createObjectURL(svg);
			img.src = url;
		}
		else {
			data = "data:image/svg+xml," + data;
			img.src = data;
		}
		
	}
	
	function bootstrap() {
		// Make a HTTP get request to the url located in file bootstrap.url to get boostrap info like credentials etc
		console.log("Editor version: " + EDITOR.version);
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
					EDITOR.fireEvent("bootstrap", [json]);
				}
				
			});
			
			
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
		for(var path in EDITOR.files) {
			if(!EDITOR.files[path].isSaved) return "Are you sure you want to close the editor ?";
		}
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
		
		EDITOR.ctxMenu.addTemp("Hide menu", function() {
			EDITOR.ctxMenu.hide();
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
