"use strict";

//var testfile = "test/testfile.txt";

// The EDITOR object lives in global scope, so that it can be accessed everywhere.
var EDITOR = {};

EDITOR.version = 0; // Populated by release.sh, DO NOT ALTER!
EDITOR.dist = "repo"; // Populated by release.sh, DO NOT ALTER!

console.log("EDITOR.version=" + EDITOR.version);
if(!EDITOR.version) console.warn("EDITOR.version=" + EDITOR.version + " not populated!");

EDITOR.sessionId = Math.random().toString(36).substring(7); // A hopefully unique ID for this session 

EDITOR.touchScreen = false;

var tempTest = 0;
var benchmarkCharacter = ".";
var benchmarkCharacterCode = 190;
var inputCount = 0;
var ctxMenuVisibleOnce = false;
var CONTEXT_MENU_IS_FULL_SCREEN = false;
var usePseudoClipboard = undefined;
var lastBufferStartRow = -1; // 
var PIXEL_RATIO = window.devicePixelRatio || 1; // "Retina" displays gives 2

// List of file extensions supported by the parser(s).
// Parsers will fill this list!
EDITOR.parseFileExtensionAsCode = [];

// File extensions that are supported natievely by the editor without parser plugins
EDITOR.plainTextFileExtensions = [
	"txt"
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
		"g",
		"figure",
		"header",
		"nav",
		"article",
		"aside",
		"figure",
		"footer",
		"section",
		"details",
		"menu",
		"picture",
		"figcaption",
		"dl"
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
	sub_pixel_antialias: ((window.devicePixelRatio == 1 || window.devicePixelRatio == undefined) ? true : false), // For the main text area (canvas) only.
	lowLatencyCanvas: false,
	verticalScrollZone: 80, // Will be recalculated on resize to match grid with
	horizontalScrollZone: 80, // Scrollbar zone, bottom. When touching down in the zone we should scroll
	leftVerticalScrollZone: 16, // Scrolling in the edge of the left screen (line numbers)
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
		altColors: ["rgb(255, 192, 203)", "rgb(0, 128, 0)", "rgb(255, 165, 0)", "rgb(255, 0, 255)", "rgb(0, 255, 255)", "rgb(0, 0, 255)", "rgb(230, 230, 250)", "rgb(165, 42, 42)", "rgb(128, 0, 128)", "rgb(152, 255, 152)", "rgb(255, 0, 0)", "rgb(128, 128, 0)", "rgb(0, 128, 128)"], // Colors that look good on the (white) background, and are different
		commentColor: "rgb(0, 119, 14)", // Please check on a LCD without IPS before changing these!
		quoteColor: "rgb(0, 91, 91)",
		xmlTagColor: "rgb(0, 21, 162)",
		removedTextColor: "rgb(255, 74, 74)",
		addedTextColor: "rgb(58, 127, 58)",
		selectedTextBg: "rgb(193, 214, 253)",
		currentLineColor: "rgb(255, 255, 230)",
		highlightTextBg: "rgb(155, 255, 155)",    // For text highlighting

// Colors for the terminal emulator
		colorBlack: "rgb(0, 0, 0)",
		colorRed: "rgb(255, 0, 0)",
		colorGreen: "rgb(0, 128, 0)",
		colorYellow: "rgb(255, 255, 0)",
		colorBlue: "rgb(0, 0, 255)",
		colorMagenta: "rgb(255, 0, 255)",
		colorCyan: "rgb(0, 255, 255)",
		colorWhite: "rgb(255, 255, 255)"

	},
	scrollSpeedMultiplier: 1/17,
	defaultLineBreakCharacter: (navigator.platform.indexOf("Win") != -1) ? "\r\n" : "\n", // Use Windows standard if on Windows, else use line-feed. \n == LF, \r == CR
	bigFileSize: 1024*1024, // (Bytes), all files larger then this will be opened as streams. 1048576 = ca 30k LOC
	bigFileLoadRows: 4000, // Rows to load into the editor if the file size is over bigFileSize
	autoCompleteKey: 9, // Tab
	insert: false,
	useCliboardcatcher: false, // Some browsers (IE) can only capture clipboard events if a text element is focused
	caretAnimation: true,
	jsx: false, // Needs to be set to true in order for JSX tests to pass!
	publicUrl: "https://webide.se/" // When document.location.hostname is a private IP, use this address for public URL's
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

// When iterating over the event listeners, first copy the array in case one of the event listeners remove itself from the list! var f = EDITOR.eventListeners[ev]
EDITOR.eventListeners = { // Use EDITOR.on to add listeners to these events:
	afk: [], // Away from keyboard
	btk: [], // Back to keyboard
	copy: [],
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
	ctxMenu: [],
		voiceCommand: [],
		fileExplorer: [], // Plugins can register themselves as a file explorer (and return true if it thinks it's the right tool for the current state)
		previewTool: [],
	pathPickerTool: [], // Tools that allow picking a path should listen for this event (and return true if it thinks it can handle the job). See EDITOR.pathPickerTool
	select: [], // Selecting text. note: The select event will be spammed when the user is selecting using the mouse as it will keep deselecting and selecting while moving the mouse
	// Don't implement deselect and deselectAll events because deselect and select will be spammed while the user select using the mouse
	sanitize: [], // For example foramtting and santizing text pasted or dropped into the editor
	parse: [], // Language parsers should listen to this event and parse any string on request and return a parse-object {}
	registerAltKey: [], // Virtual keyboards can choose to update alternate keys so you can for example save file via Alt + S etc. Kinda like key-bindings but for virtual keyboards
	unregisterAltKey: [],
	hideVirtualKeyboard: [], // Virtual keyboards need to listen to this and hide itself when their name is called
	showVirtualKeyboard: [],
	runScript: [], // Plugins can register as program runners
	stopScript: [],
	showDashboard: [], // Useful for example starting and stopping timers, refresh content etc
	hideDashboard: [],
	share: [], // Share a file with other apps on the platform
	soundAssist: [], // Get notified when soundAssist is turned on/off
	wrapText: [], // Call EDITOR.wrapText() to format code, because there might be many code formatters/wrappers and we only want to run one of them
	findInFiles: [], // Starts a find-in-files tool when calling EDITOR.findInFiles()
	virtualDisplay: [] // Listen for state changes of the virtual display (open, close, start, stop)
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
	endingColumn: 0 // Will always be EDITOR.currentFile.startColumn + EDITOR.view.visibleColumns
};
// starting column is file specific

EDITOR.tests = []; // {description, fun}

EDITOR.currentFile = undefined; // A File object

EDITOR.input = false; // Wheter inputs should go to the current file in focus or to some other element like an html input box.

EDITOR.fileOpenCallback = undefined;
EDITOR.lastKeyPressed = "";
EDITOR.lastKeyDown = "";
EDITOR.openFileQueue = []; // Files listed here are waiting for data (it's an internal variable, but exposed so plugins can check if there's any files in it)

EDITOR.lastTimeCharacterInserted = new Date();
EDITOR.lastTimeInteraction = new Date();

EDITOR.modes = ["default", "*"]; // You can bind keys for use in different modes. * means all modes
EDITOR.mode = "default"; // What you often find in GUI based editors/IDE's'

EDITOR.soundAssist = false; // If set to true, widgets should make sounds (EDITOR.say) to aid the user
EDITOR.speechRate = 1; // // 0.1 to 10

EDITOR.env = {}; // Plugins can set custom env values that will be passed to terminal

(function() { // Non global editor code ...
	"use strict";
	
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
	
	var pressCtrlCount = 0; // When pressed 5 times, soundAssist will be activated!
	
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
	
	var cursorHidden = false;
	
	var discoveryBar = document.createElement("div");
	discoveryBar.setAttribute("id", "discoveryBar");
	discoveryBar.setAttribute("aria-label", "Discovery bar");
	discoveryBar.setAttribute("place", "vertical");
	
	var showDisoveryBarWindowMenuItem, showDisoveryBarCaptions;
	
	var enableVoiceCommands, voiceCommandsEnabled = false;
	
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
	
	var recognition = undefined;
	
var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	EDITOR.saveBandwith = (connection && connection.saveData) ? true : false;

	function funMap(f){return f.fun}
	
	/*
		EDITOR functionality (accessible from global scope) By having this code here, we can use private variables
		
		To make it more fun to write plugins, the EDITOR and File object should take care of the "low level" stuff and heavy lifting. 
		Feel free to add more EDITOR methods below. Do not extend the EDITOR object elsewhere!!
	*/
	
	EDITOR.touchDown = false; // Is the user still holding down/touching ?
	EDITOR.scrollingEnabled = false;
	EDITOR.hasKeyboard = false; // true if keyup is detected
	
	// Keep track of how many times the editor has been started, so we can know if it's the first time the editor runs
	// Note: This only keeps track on how many times the eidtor has started on the client.
	// Use CLIENT.on("loginCounter", fun) to get how many times the user has logged in to the server!
	EDITOR.startedCounter = parseInt(UTIL.getCookie("startedCounter"));
	if(isNaN(EDITOR.startedCounter)) EDITOR.startedCounter = 0;
	UTIL.setCookie("startedCounter", ++EDITOR.startedCounter, 999);
	
	// Don't show the firendly message on how to show the context menu if the menu is disabled
	if(QUERY_STRING["disable"] && (QUERY_STRING["disable"].indexOf("ctxMenu") != -1 || QUERY_STRING["disable"].indexOf("trmb") != -1) || EDITOR.startedCounter > 20) {
ctxMenuVisibleOnce = true;
	}
	
	var lastMouseDownEventType = "";
	
	// # Working Directory
	var workingDirectory; // Private variable
	var _editorInput = true;
	var _soundAssist = false;
	
	if(!Object.defineProperty) {
		// Object.defineProperty (ES5) should work in most browsers!
		alert("Object.defineProperty not available in your browser (" + BROWSER + ") some editor functionality might not work!");
	}
	else {
		Object.defineProperty(EDITOR, 'workingDirectory', {
			get: function getWorkingDirectory() { return workingDirectory; },
			set: function setWorkingDirectory(newValue) { throw new Error("Use EDITOR.changeWorkingDir(newDir) to change working directory!"); },
			enumerable: true
		});
		
		Object.defineProperty(EDITOR, 'soundAssist', {
			get: function() { return _soundAssist; },
			set: function(newValue) {
				if(typeof newValue != "boolean") throw new Error("EDITOR.soundAssist can only be true or false!");
				_soundAssist = newValue;
				EDITOR.fireEvent("soundAssist", [_soundAssist]);
			},
			enumerable: true
		});
		
		// For debugging input focus
		Object.defineProperty(EDITOR, 'input', {
			get: function getEditorInputFocus() { return _editorInput; },
			set: function setEditorInputFocus(newValue) {
				console.warn("Set EDITOR.input to " + newValue);
				console.log(UTIL.getStack("Set EDITOR.input to " + newValue));
				if(newValue) {
_editorInput = true;
					EDITOR.canvas.focus(); // Need to have focus if user are using a screen reader
				}
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
		
		var f = EDITOR.eventListeners.changeWorkingDir.map(funMap);
		console.log("Calling changeWorkingDir listeners (" + f.length + ") workingDirectory=" + workingDirectory);
		for(var i=0; i<f.length; i++) {
			//console.log("function " + UTIL.getFunctionName(f[i]));
			f[i](workingDirectory); // Call function
		}
		
		return workingDirectory;
	}
	
	
	// # Server Storage (to replace localStorage)
	var _serverStorage = null; // Will be populated once the data is received from the server
	var serverStorageWaitingItems = {};
	EDITOR.storage = {
		setItem: function storageSetItem(id, val, wait, callback) {
			if(EDITOR.settings.devMode) {
			var stack = UTIL.getStack("EDITOR.storage.setItem");
			}
			
			if(typeof wait == "function" && callback == undefined) {
				callback = wait;
				wait = true;
			}
			else if(wait == undefined) {
				wait = true;
			}
			else if(typeof wait != "boolean") {
				throw new Error("wait=" + wait + " needs to be a Boolean!");
			}
			
			// Wait one second before storing the value, in case it gets deleted right away, or we get another change
			if(serverStorageWaitingItems.hasOwnProperty(id)) clearTimeout(serverStorageWaitingItems[id]);
			
			var string = String(val)
			
			var retryCount = 3;
			
			if(wait) serverStorageWaitingItems[id] = setTimeout(update, 2000);
			else update();
			
			
			return string;
			
			function update() {
				if(wait && !CLIENT.connected && --retryCount>0) {
					console.warn("Disconnected when trying to save id=" + id + " retrying...");
					serverStorageWaitingItems[id] = setTimeout(update, 2000);
					return;
				} 
				
				CLIENT.cmd("storageSet", {item: id, value: string}, function(err, json) {
				if(callback) callback(err, json);
				else if(err) {
						//console.error(err);
					console.log(stack);
						throw new Error("Unable to save id=" + id + " value=" + string + " to server storage! Error: " + err.message + " code=" + err.code);
				}
					
					if(!err) {
						_serverStorage[id] = string;
					}
				});
				
				delete serverStorageWaitingItems[id];
			}
			
		},
		getItem: function storageGetItem(id, trap) {
			if(!this.ready()) throw new Error('Storage is not yet ready. Use EDITOR.on("storageReady", yourFunction)'); 
			
			if(trap !== undefined) throw new Error("getItem only takes one argument, did you mean to use setItem ?"); // Error check
			
			if(!_serverStorage.hasOwnProperty(id)) {
				//console.warn("Can not find id=" + id + " in EDITOR.storage!");
				return null;
			}
			else return _serverStorage[id];
			
		},
		
		removeItem: function storageRemoveItem(id, callback) {
			
			if(callback !== undefined && typeof callback != "function") throw new Error("Second argument to EDITOR.storage.removeItem should be a callback function (optional)");
			
if(EDITOR.settings.devMode) {
			// Save the stack in case we get an error
			var stack = UTIL.getStack("EDITOR.storage.removeItem");
			}
			
if(serverStorageWaitingItems.hasOwnProperty(id)) {
				// No need to save it if it's going to get deleted!
clearTimeout(serverStorageWaitingItems[id]);
				delete serverStorageWaitingItems[id];
			}
			
			if(_serverStorage.hasOwnProperty(id)) {
				CLIENT.cmd("storageRemove", {item: id}, function(err, json) {
					if(callback) {
callback(err, json);
					callback = null;
return;
}
					
if(err && err.code != "ENOENT") {
						console.log(stack);
						console.log("storageRemove err.code=" + err.code)
					throw err;
				}
			});
			}
			else {
				console.warn("Server storage had no item with id=" + id);
			}
			
			delete _serverStorage[id];
			// delete always return true, even if the key did not exist
			
			// return void
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
		
		The big difference between EDITOR.localStorage and EDITOR.storage is that EDITOR.localStorage works offline!
		
		First I made EDITOR.storage work like window.localStorage, then I started making a Packaged chrome app, 
		but chrome.storage is async, so I had to refactor everything that used localStorage.
		Now when I've decided to use Hosted Chrome app instead, 
		I haven't bothered to refactor back to sync window.localStorage.
		
		So now EDITOR.localStorage is async while EDITOR.storage is sync.
		But we should mainly use EDITOR.storage in order to not depend on which client/device is used,
		eg. you should be able to jump from one device to another and the working state should be the same!
		
		todo: refactor: Always use EDITOR.storage, but sync data with localStorage and fallback to localStorage if offline!
		when user comes back from being offline, data should be synced with the server,
		hash the data and save lastServerHash, then compare when overloading data to make sure no data is lost,
		if the data on the server has changed while the user was offline and the user changed the data,
		ask the user what value they want to use.
		
	*/
	
	// You can sometimes get a "Access is denied" error when trying to access window.localStorage for example if the page is running in an iframe
	
	try {
		var localStorageAvailable = !!window.localStorage;
	}
	catch (err) {
		var localStorageAvailable = false;
	}
	
	if(localStorageAvailable) {
		// Use window.localStorage but with the same interface as chrome.storage (web app API for ChromeOS)
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
	
	EDITOR.loadSettings = function loadSettings(settings, defaults, callback) {
		console.log("settings: load: settings=" + settings + " ...");

		if(callback == undefined && typeof defaults == "function") {
			callback = defaults;
			defaults = null;
		}

		if(EDITOR.storage.ready()) loadSettingOnceStorageReady();
		else EDITOR.once("storageReady", loadSettingOnceStorageReady);
		
		function loadSettingOnceStorageReady() {
			
			var value = EDITOR.storage.getItem(settings);

			// note: value is either null or a string!! eg. it can be "null" and "undefined" or null
			// also note: We can not JSON.parse("undefined") (string "undefined")
			
			if(value=="undefined") {
				console.warn("settings: load: settings=" + settings + " value=" + value + " (something probably went wrong when saving the settings)");
			}
			
			console.log("settings: load: settings=" + settings + " value=" + value + " defaults=" + defaults + "   " + value + "==null?" + (value==null) + " " + defaults + "=== undefined?" + (defaults === undefined) + "  ");

			if((value === null || value=="undefined") && defaults !== undefined) {
				callback(defaults);
			}
			else if((value === null || value=="undefined") && defaults === undefined) { // Cant parse "undefined"!
				var error = new Error("Could not find " + settings + " in EDITOR.storage!");
				error.code == "ENOENT";
				throw error;
}
			else if(value !== null) {
				try {
					var obj = JSON.parse(value);
				}
				catch(err) {
					var error = new Error("Failed to parse value=" + value + " Error: " + err.message);
					throw error;
				}
				console.log("settings: load: settings=" + settings + " obj=", obj);
				callback(obj);
			}
			else throw new Error("Unsuspected: value=" + value + " defaults=" + defaults);
			
		}
	}
	
	EDITOR.saveSettings = function saveSettings(settings, value) {
		console.log("settings: save: settings=" + settings + " value=" + value);
		
		if(value === undefined) throw new Error("Can not save settings=" + settings + " because value=" + value);
		if(value == "undefined") throw new Error("Can not save settings=" + settings + " because value=" + value + " cannot be parsed");
		
		var str = JSON.stringify(value);
		
		if(str == undefined || str == "undefined" || typeof str != "string") throw new Error("Error when stringifying value=" + value + " str=" + str);
		
		console.log("settings: save: settings=" + settings + " str=" + str + " ...");
		
if(EDITOR.storage.ready()) saveSettingOnceStorageReady();
else EDITOR.once("storageReady", saveSettingOnceStorageReady);

		function saveSettingOnceStorageReady() {
			console.log("settings: save: settings=" + settings + " str=" + str + " !");
			EDITOR.storage.setItem(settings, str);
		}
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
	

	EDITOR.parsers = [];
	EDITOR.addParser = function addParser(parserController) {
		for(var i=0; i<EDITOR.parsers; i++) {
			if(EDITOR.parsers[i] == parserController) throw new Error("Parser already registered: ", parserController);
		}

		if(!parserController.hasOwnProperty("canParse")) throw new Error("Parser does not have a canParse method! ", parserController);

		if(!parserController.fileExtensions) throw new Error("Parser do not support any file extensions! ", parserController);
		else {
			for(var i=0; i<parserController.fileExtensions.length; i++) {
				if( EDITOR.parseFileExtensionAsCode.indexOf(  parserController.fileExtensions[i]  ) != -1 ) {
					console.warn( parserController.fileExtensions[i] + " is already supported by a parser!");
				}
				EDITOR.parseFileExtensionAsCode.push(parserController.fileExtensions[i]);
			}
		}

		EDITOR.parsers.push(parserController);
	
		if(parserController.onParse) {
			if(typeof parserController.onParse != "function") throw new Error("onParse needs to be a function!" + (typeof parserController.onParse));
			EDITOR.eventListeners.parse.push(parserController.onParse);
		}
	}

	EDITOR.removeParser = function removeParser(parserController) {
		removeFrom(EDITOR.parsers, parserController);
		if(parserController.onParse) {
			removeFrom(EDITOR.eventListeners.parse, parserController.onParse);
		}

		for(var i=0; i<parserController.fileExtensions.length; i++) {

			// If there are dublicates we only want to remove one of them
			EDITOR.parseFileExtensionAsCode.splice( EDITOR.parseFileExtensionAsCode.indexOf(parserController.fileExtensions[i]) );

			/*
				if( EDITOR.parseFileExtensionAsCode.indexOf(  parserController.fileExtensions[i]  ) == -1 ) {
				console.warn( parserController.fileExtensions[i] + " was only supported by this parser!");
				}
			*/

		}

	}
	
	EDITOR.putIntoClipboard = function putIntoClipboard(text, description, callback) {
		
		if(typeof description == "function" && callback == undefined) {
			callback = description;
			description = undefined;
		}
		
		if(RUNTIME == "nw.js") {
			
			// Load native UI library
			var gui = require('nw.gui');
			
			// Get the system clipboard
			var clipboard = gui.Clipboard.get();
			
			// Read from clipboard
			//var text = clipboard.get('text');
			//console.log(text);
			
			// Or write something
			clipboard.set(text, 'text');
			
			// And clear it!
			//clipboard.clear();
			
			return done(null, true, false);
		}
		
		EDITOR.pseudoClipboard = text;
		console.log("EDITOR.putIntoClipboard: Put " + text.length + " characters into EDITOR.pseudoClipboard");
		
		if (!navigator.clipboard) {
			return fallbackCopyTextToClipboard(text);
		}
		navigator.clipboard.writeText(text).then(function() {
			console.log('Async: Copying to clipboard was successful!');
			done(null, true, false);
		}, function(err) {
			console.error('Async: Could not copy text: ', err);
			return fallbackCopyTextToClipboard(text);
		});
		
		function done(error, copiedIntoPlatformClipboard, manuallyCopied) {
			var f = EDITOR.eventListeners.copy.map(funMap);
			console.log("Calling copy listeners (" + f.length + ") workingDirectory=" + workingDirectory);
			for(var i=0; i<f.length; i++) {
				//console.log("function " + UTIL.getFunctionName(f[i]));
				f[i](text, copiedIntoPlatformClipboard, manuallyCopied); // Call function
			}
			
			if(callback) {
				callback(error, copiedIntoPlatformClipboard, manuallyCopied);
				callback = null;
			}
		}
		
		function fallbackCopyTextToClipboard(text) {
			var textArea = document.createElement("textarea");
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			
			/*
				note: This will trigger a (outside canvas) copy event!!
			*/
			try {
				var successful = document.execCommand('copy');
				var msg = successful ? 'successful' : 'unsuccessful';
				console.log('Fallback: Copying text command was ' + msg);
			}
			catch (err) {
				console.error('Fallback: Oops, unable to copy', err);
			}
			document.body.removeChild(textArea);
			
			if(successful) {
				done(null, true, false);
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
					confirmBox("The editor failed to put text into the cliboard. The clipboard API is either not allowed in your browser " + BROWSER + ", or you have not allowed it. Do you want to use a pseudo clipboard that only works inside the editor ?", [usePseudo, alwaysAsk, manualCopy], function(answer) {
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
			//window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
			
			promptBox( (description ? description.trim() + " " : "") + "Copy to clipboard: Ctrl+C", {defaultValue: text, dialogDelay: 0, selectAll: true}, function() {
				done(null, true, true);
			});
			
			return false;
		}
		
		function pseudo() {
			EDITOR.pseudoClipboard = text;
			console.log("EDITOR.putIntoClipboard:pseudo: Put " + text.length + " characters into EDITOR.pseudoClipboard");
			done(null, false, false);
			return false;
		}
		
	}
	
	EDITOR.getClipboardContent = function getClipboardContent(options, callback) {
		
		/*
			You need to be on HTTPS or 127.0.0.1 to get access to navigator.clipboard !?
			
			When calling navigator.clipboard.readText() in Chrome there is a confirm box.
			If the user says "No" we won't be able to access the clipboard until the user manually clears all settings.
			
		*/
		
		if(typeof options == "function" && callback == undefined) {
			callback = options;
			options = {};
		}
		
		if(typeof callback != "function") throw new Error("No callback function found in arguments to EDITOR.getClipboardContent!");
		
		if(navigator.clipboard && typeof navigator.clipboard.readText == "function") {
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
		else if(!options.silent) {
			console.log("getClipboardContent: Using prompt! navigator.clipboard=" + navigator.clipboard + " window.clipboardData=" + window.clipboardData);
			
			/*
				Should we use the pseudo clipboard or always prompt !?
				//if(usePseudoClipboard === true && EDITOR.pseudoClipboard)
				It would be more annoying if you couln't copy in stuff, then showing the prompt every time !?
				
				//var data = prompt("Paste the clipboard content here:", EDITOR.pseudoClipboard);
				prompt will only get the first row. We need a textarea so you can paste many rows!
			*/
			
			promptBox("Paste the clipboard content here:", {defaultValue: EDITOR.pseudoClipboard, dialogDelay: 0}, function(data) {
				if(typeof data == "string" && data.length > 0) readSuccess(data);
				else {

					var error = new Error("Unable to access clipboard data! navigator.clipboard and window.clipboardData not available!");
					error.code = "CANCEL";
					
					readFail(error);
				}
			});
			
		}
		else {
			return callback(new Error("Could not read from clipboard! options=" + JSON.stringify(options)));
		}
		
		function readSuccess(text) {
			console.log("getClipboardContent: readSuccess: text=" + text);
			callback(null, text, false);
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
			if(EDITOR.pseudoClipboard.length > 0 && err.code != "CANCEL") {
				console.log("getClipboardContent: Using pseudoClipboard! data=" + EDITOR.pseudoClipboard);
				return callback(null, EDITOR.pseudoClipboard, true);
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
		
// Have the bug trap error created here in order to get a proper call stack for stached callbaks
		var trapErrorMsg = "Bug trap: File properties need to be set using state.props (third argument to EDITOR.openFile)! Or they wouldn't be available for fileOpen listeners!";

		var file = null;
		
		if(path == undefined) path = "new file";
		
		console.log("Opening file: " + path + " typeof text=" + typeof text);
		
		var pathToBeOpened = path;
		
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
				
				// note: If the server crashes, we will still get a callback! (a timeout error)
				
			}
			else alertBox("Please wait ... Opening file: " + path);
			
			
			return; // Wait for the file to be opened!
		}
		else {
			EDITOR.openFileQueue.push(path);
			console.log("File path=" + path + " added to EDITOR.openFileQueue=" + JSON.stringify(EDITOR.openFileQueue));
		}
		
		if(!UTIL.isString(path)) return fileOpenError(new Error("EDITOR.openFile: Error: First argument is not a string: path=" + path));
		
		if(state && state.image) var isImage = true;
		else var isImage = false;
		
		if(text == undefined) {
			
			console.warn("Text is undefined! Reading file from disk: " + path)
			
			var fileExtension = UTIL.getFileExtension(path);
			var imageFileExt = ["jpg", "jpge", "gif", "bmp", "tiff", "png"];
			if(imageFileExt.indexOf(fileExtension) != -1) {
				var isImage = true;
				console.log("It's a image (" + fileExtension + "): " + path);
				
				EDITOR.readFromDisk(path, false, "base64", load);
				
			}
			else {
				// Check the file size
				console.log("Getting file size on disk. path=" + path);
				EDITOR.getFileSizeOnDisk(path, function gotFileSize(err, fileSizeInBytes) {
					
					if(err) {
						// Some FTP servers have issues getting the file size, 
						// and we don't want the file to fail open just because of that!
						console.warn("Unable to get file size from disk: " + err.message);
						EDITOR.readFromDisk(path, load);
						
						//fileOpenError(err);
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
			
			if(err) return fileOpenError(err);
			
			console.log("Loading file (isImage=" + isImage + ") to editor: " + path);
			
			if(!notFromDisk && path != pathToBeOpened) throw new Error("path=" + path + " not pathToBeOpened=" + pathToBeOpened + " notFromDisk=" + notFromDisk + " tooBig=" + tooBig);
			
			if(EDITOR.files.hasOwnProperty(path)) throw new Error("File is already opened:\n" + path + " same: text?" + (EDITOR.files[path].text==text) + " hash?" + (EDITOR.files[path].hash==hash) + " callback=" + UTIL.getFunctionName(callback) + " How can it already be open!?");
			
			// Do not add file to EDITOR.files until its fully loaded! And fileOpen events can be run sync
			
			if(isImage) {
				var newFile = new ImageFile(text, path, ++EDITOR.fileIndex, fileLoaded);
			}
			else {
				var newFile = new File(text, path, ++EDITOR.fileIndex, tooBig, state && state.props, fileLoaded);
			}
			
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
			
			// Able to set file properties when opening the file, before openFile listers fire...
			// fileOpen listeners need to be called before the callback because the callback might change the file content - triggering file.change events
			// and other plugins listening to fileOpen and fileChange events might get confused when they see a file change event before a file open event.
			if(state && state.props) {
				for(var prop in state.props) {
					newFile[prop] = state.props[prop];
				}
			}
			
			function fileLoaded(fileLoadError) {
				
				if(fileLoadError) return fileOpenError(fileLoadError);
				
				/*
					
					Dilemma1: Should file open even listeners be called before or after the callback!?
					wrong answer: call callbacks first so that they can change the state of file.saved before calling file open listeners
					
					Dilemma 2: Should fileOpen events fire before or after fileShow events?
					answer: Does it matter? I forgot why ...
					
					problem1: The callback might change the file, triggering file.change() 
					then plugins will go nuts because they have not seen the file (being opened) yet!
					solution: The file open event listeners need to be called before the file open callback(s)!
					
					problem1.5: The callback might close the file!
					solution: Same solution as problem 1. callCallbacks should be called *after* file open events. Allow file state in EDITOR.openFile parameters.
					
					problem 2: You might want to set properties to the file, that should be available when open-file-listeners are called
					solution: Use state and state.props in parameters to populate state and properties
					
					problem 3: We keep forgetting about problem 2 and set file.disableParsing etc after the file has been opened, 
					resulting in files being parsed because by default file.disableParsing is set to true
					solution: Add traps that will throw an error if some parameters are modified in the callback
					
				*/
				
if(EDITOR.files.hasOwnProperty(path)) throw new Error("path=" + path + " already exist in EDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files)));

				EDITOR.files[path] = newFile;
				file = EDITOR.files[path];
				
				if(!EDITOR.files.hasOwnProperty(path)) throw new Error("File didn't enter EDITOR.files"); // For sanity
				
				for(var p in EDITOR.files) { // Make sure we are not insane
					if(!EDITOR.files[p].path) fileOpenError(new Error("Internal error: File without path=" + p));
				}
				
				var f = EDITOR.eventListeners.fileOpen.map(funMap);
				console.log("Calling fileOpen listeners (" + f.length + ") path=" + path);
				for(var i=0; i<f.length; i++) {
					//console.log("function " + UTIL.getFunctionName(f[i]));
					f[i](file); // Call function
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
				
				// Always render (and resize) after opening a file! (where=here, when=now!)
				EDITOR.renderNeeded();
				
				if(tooBig) alertBox(UTIL.getFilenameFromPath(path) + ' has been opened in "stream mode"!\nSome editor operations/plugins might not work.', "BIG_FILE");
				
				// Add bug traps
				// We only have to do this for properties that fileOpen listeners might be particular interested in
				// example: js_parser listens to fileOpen, but reopen_files used to set file.disableParsing state in the EDITOR.openFile callback, 
				// resulting in js_parser parsing files that should not be parsed
				
				
				var disableParsing = file.disableParsing;
				if(disableParsing !== undefined) Object.defineProperty(file, "disableParsing", {get: function get() { return disableParsing; }, set: function trap() { throw new Error(trapErrorMsg) }});

				
				// At last, call the function(s) to be run after the file has been opened
				callCallbacks(null, file);
				
				// Remove bug traps
				if(disableParsing !== undefined) {
					delete file.disableParsing;
					file.disableParsing = disableParsing;
}
				
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
				alertBox("EDITOR.openFile: Error when opening " + path + "\n" + err.message);
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
			if(EDITOR.openFileQueue.indexOf(path) == -1) {
				// The second request to open the file doesn't add the file path to openFileQueue,
				// so wehen the first request removes the path, and the second request comes here, it will be removed already!
				// eg. no need to throw an error
				return;
			}
			
			var removed = EDITOR.openFileQueue.splice(EDITOR.openFileQueue.indexOf(path), 1); // Take the file off the queue
			
			if(EDITOR.openFileQueue.indexOf(path) != -1) throw new Error("File path=" + path + " still in EDITOR.openFileQueue=" + JSON.stringify(EDITOR.openFileQueue) + " removed=" + removed);
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
				if(err.code === 'ENOENT' || err.code == "NOT_ABSOLUTE" || err.code == "550" || err.message.indexOf("No such file") != -1) {
					callback(null, false);
				}
				else {
					callback(new Error("Unexpected error when checking if file exist (using EDITOR.getFileSizeOnDisk): err.code=" + err.code + " err.message=" + err.message));
				}
			}
			else {
				callback(null, true);
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
	
	var closeFileHistory = []; // Trying to figure out why sometimes the user close files that are not open...
// todo: Remove closeFileHistory after fixing the bug!
	EDITOR.closeFile = function(path, doNotSwitchFile) {
		
		if(typeof path != "string" && path && path instanceof File) {
			path = path.path; // file.path
		}
		
		if(!EDITOR.files.hasOwnProperty(path)) {
			throw new Error("Can't close file that is not open: " + path + " Opened files are: " + JSON.stringify(Object.keys(EDITOR.files)).slice(1,-1) + " closeFileHistory=" + JSON.stringify(closeFileHistory));
		}
		else {
			
			console.log("Closing file: path=" + path);
			
			var file = EDITOR.files[path];
			
			// Call listeners (before we switch to another file, and before we delete the file content)
			var f = EDITOR.eventListeners.fileClose.map(funMap);
			console.log("Calling fileClose listeners (" + f.length + ") ...");
			for(var i=0; i<f.length; i++) {
				f[i](file); // Call function
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
					
					if(!switchTo || switchTo == file) {
						// No other file has been shown before
						for (var filePath in EDITOR.files) {
							if(EDITOR.files[filePath] != file && filePath != path) {
								switchTo = EDITOR.files[filePath];
								break;
							}
						}
					}
				}
			}
			
			delete EDITOR.files[path]; // Remove all references to the file BEFORE switching to another file
			
			closeFileHistory.push(path);
			
			setTimeout(function checkIfRemoved() { // Check again to make sure it has been removed
				if(EDITOR.files.hasOwnProperty(path)) throw new Error("Closed file is still in the editor! path=" + path + 
				"\nIt was closed 100ms ago. If you are running tests, use different file names for each test!");
			}, 100);
			
			if(switchTo) {
				console.log("Showing '" + switchTo.path + "' because '" + path + "' was closing.");
				if(switchTo == file) throw new Error("Trying to switch to the file being closed!");
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
			if(err) {
				var error = new Error("Unable to read path=" + path + " Error: " + err.message + "");
				error.code = err.code;
				callback(error);
			}
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
		
		var isBuffer = false;
		
		var isImage, encoding, text; // Will be populated after beforeSave functions have run
		
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
var error = new Error(fName + " prevented file from being saved!")
error.code = fName;
					if(callback) callback(error);
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
			
			if(file instanceof ImageFile) {
				text = file.canvas.toDataURL("image/png");
				if(text.indexOf("base64,") == -1) throw new Error("text does not contain base64, !! text=" + text);
				
				console.log("EDITOR.saveFile: Image data starts with: " + text.slice(0, 100) + " and ends with " + text.slice(-100));
				
				var quoted = (text.slice(0,1) == text.slice(-1) == '"'); // Some images doesn't get a quote around them!
				
				if(quoted) text = text.slice(text.indexOf("base64,") + 7, -1);
				else text = text.slice(text.indexOf("base64,") + 7);
				
				console.log("EDITOR.saveFile: Image data starts with: " + text.slice(0, 100) + " and ends with " + text.slice(-100));
				
				encoding = "base64";
				isImage = true;
			}
			else {
				text = file.text;
				encoding = "utf-8";
				isImage = false;
			}
			
			if(file.nativeFileSystemFileHandle) {
				
				file.nativeFileSystemFileHandle.createWriter().then(function(writer) {
					// Make sure we start with an empty file
					writer.truncate(0).then(function() {
						// Write the full length of the contents
						writer.write(0, text).then(function() {
							// Close the file and write the contents to disk
							writer.close().then(function() {
								
								if(typeof window.crypto == "object") {
									crypto.subtle.digest('SHA-256', text).then(function(hash) {
										doneSaving(null, path, hash);
									}, function(err) {
										console.error(new Error("Failed to hash the text using crypty API after saving the file using native file system API"));
										doneSaving(null, path, null);
									});;
								}
								else doneSaving(null, path, null);
								
							});
						});
					});
				}).catch(function(err) {
					if(callback) callback(err);
					else alertBox(err.message); // Can't throw inside a promise chain
				});
				
				return;
			}
			
			if(file.path != path || !file.savedAs) {
				if(EDITOR.files.hasOwnProperty(path) && EDITOR.files[path] != file) {
					var err = new Error("There is already a file open with path=" + path);
					if(callback) return callback(err, path);
					else throw err;
				}
				console.warn("File will be saved under another path; old=" + file.path + " new=" + path);
				
				// Check if the file exist on disk so we don't accidently overwrite it!
				EDITOR.doesFileExist(path, function fileExist(err, exist) {
					if(err) throw err;

if(exist) {
						var overwrite = "Overwrite";
						var cancel = "Cancel";
						var open = "Open existing file"
						confirmBox("File already exist: " + path + "\nDo you want to overwrite it ?", [open, overwrite, cancel], function(answer) {
							if(answer == open) {
								EDITOR.openFile(path);
							}
							else if(answer == overwrite) {
								if(path != file.path) reOpen(file.path, path);
								else EDITOR.saveToDisk(path, text, isBuffer, encoding, doneSaving);
								return;
							}
							
								var err = new Error("User canceled the save (as) to prevent overwriting existing file");
								err.code = "CANCEL";
								if(callback) callback(err);
								else throw err;
								return;
							
						});
					}
					else if(path != file.path) reOpen(file.path, path);
					else EDITOR.saveToDisk(path, text, isBuffer, encoding, doneSaving);
				});
			}
			else if(file.hash)  {
				// Check the hash before saving to prevent over-writing something
				CLIENT.cmd("hash", {path: file.path}, function(err, hash) {
					if(err) {
						if(err.code == "ENOENT") {
							console.warn("File did not exist on disk: " + file.path);
						}
else if(err.code == "ENETDOWN") {
							if(callback) return callback(err);
							else throw err;
						}
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
					
					EDITOR.saveToDisk(path, text, isBuffer, encoding, doneSaving);
				});
			}
			else {
				EDITOR.saveToDisk(path, text, isBuffer, encoding, doneSaving);
			}
		}
		
		function reOpen(oldPath, newPath) {
			// We must close and reopen the file so that plugins keeping track of open files do not go nuts.
			
			EDITOR.closeFile(oldPath, true); // true = do not switch to another file
			
			// Reopen the file with the new path, makes sure fileSave events in file.save gets called after we have a new path.
			EDITOR.openFile(newPath, text, {image: isImage}, function savedAs(err, newFile) {
				if(err) throw err;
				
				file = newFile;
				
				EDITOR.saveToDisk(path, text, isBuffer, encoding, doneSaving);
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
			file.saved(function updatedSavedState(err) {
				
				// Call back without an error even though some of the afterSave events failed.
				// Callers of EDITOR.saveFile is mostly most concerned about if the file successfully saved or not
				if(callback) return callback(null, path);
				
			}); 
		}
	}
	
	
	EDITOR.saveToDisk = function(path, text, inputBuffer, encoding, saveToDiskCallback) {
		// You probably want to use EDITOR.saveFile instead!
		// This is used internaly by the editor, but exposed so plugins can save files that are not opened.
		
		// Only works with text files !
		
		if(path instanceof File) {
			throw new Error("Did you mean to use EDITOR.saveFile ? EDITOR.saveToDisk is a lower level method for saving data to disk.");
		}
		
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
		
		// SockJS can not handle large messages! Server disconnects if you send 50MB in one message
		var lengthLimit = 5592408; // Ca 40 MB
		if(text.length > lengthLimit) return uploadBigFile(path, text, inputBuffer, encoding, saveToDiskCallback);
		// Posting to /share also seem to work when running as a desktop editor (not a cloud IDE) !
		
		console.log("EDITOR.uploadSpeed=" + EDITOR.uploadSpeed + " text.length=" + text.length);
		if(EDITOR.uploadSpeed && text.length / EDITOR.uploadSpeed > 1024) {
			var estimatedUploadTime = Math.floor(text.length / EDITOR.uploadSpeed);
			var progress = document.getElementById("progress");
			var progressValue = 0;
			progress.value = progressValue;
			progress.max = estimatedUploadTime;
			var intervalTime = 250;
			progress.style.display="block";
			EDITOR.resizeNeeded();
			var progressInterval = setInterval(function () {
				console.log("UploadProgress: progress.value=" + progress.value + " progress.max=" + progress.max + " intervalTime=" + intervalTime + " estimatedUploadTime=" + estimatedUploadTime + " text.length=" + text.length + " EDITOR.uploadSpeed=" + EDITOR.uploadSpeed + " saveTimeout=" + saveTimeout);
				progressValue += intervalTime;
				progress.value = progressValue;
			}, intervalTime);
		}
		
		var json = {path: path, text: text, inputBuffer: inputBuffer, encoding: encoding};
		var startTimer = (new Date()).getTime();
		var saveTimeout = (estimatedUploadTime ? estimatedUploadTime : 10000) + 5000;
		CLIENT.cmd("saveToDisk", json, saveTimeout, function saveToDiskCmd(err, json) {
			
			if(progress) {
				clearInterval(progressInterval);
				progress.style.display="none";
				EDITOR.resizeNeeded();
			}
			
			if(err) {
				if(saveToDiskCallback) saveToDiskCallback(err);
				else throw err;
			}
			else {
				if(text.length > 1024*1024 || EDITOR.uploadSpeed == undefined) {
					var endTimer = (new Date()).getTime();
					var totalTime = endTimer - startTimer;
					var uploadSpeed = text.length / totalTime;
					if(uploadSpeed > 1) EDITOR.uploadSpeed = Math.floor(uploadSpeed);
				}
				
				if(saveToDiskCallback) saveToDiskCallback(null, json.path, json.hash);
				else {
console.log("File saved to disk: " + json.path);
				}
			}
		});
	}
	
	function uploadBigFile(path, text, inputBuffer, encoding, callback) {
		
		console.log("uploadBigFile: path=" + path + " text.length=" + text.length + " inputBuffer=" + inputBuffer + " encoding=" + encoding + " ")
		
		if(typeof FormData == "undefined") return error(new Error("Large file upload not supported because FormData object does not exist in your browser=" + BROWSER + " Please contact support and tell them your browser version!"));
		
		var formData = new FormData();
		var blob = new Blob([text], { type: encoding || 'plain/text' });
		var fileName = UTIL.getFilenameFromPath(path);
		formData.append(fileName, blob, fileName);
		if(EDITOR.user) formData.append('user', EDITOR.user.name);
		formData.append("open", "false"); // Because we are reusing the web share utility, we don't want the file to be opened after uploaded
		
		var uploadPath = UTIL.joinPaths(EDITOR.user.homeDir, "upload/", fileName);
		
		var x = new XMLHttpRequest();
		if(x.upload) {
			var progress = document.getElementById("progress");
			progress.value = 0;
			progress.max = 1;
			progress.style.display="block";
			EDITOR.resizeNeeded();
			x.upload.addEventListener("progress", function(progressEvent) {
				console.log("uploadBigFile: progress: progressEvent=", progressEvent);
				progress.value = progressEvent.loaded;
				progress.max = progressEvent.total;
				
			});
		}
		x.onreadystatechange = function () {
			console.log("uploadBigFile: readyState=" + x.readyState);
			if(x.readyState == 4) {
				console.log("uploadBigFile: status=" + x.status);
				if(x.status == 200) {
					console.log("uploadBigFile: Upload success!");
					CLIENT.cmd("move", {oldPath: uploadPath, newPath: path}, function(err, hash) {
						if(err) return error(new Error("Unable to move file after uploading! Error: " + err.message), err.code)
						CLIENT.cmd("hash", {path: path}, function(err, hash) {
							if(err) return error(new Error("Unable to hash file after uploading! Error: " + err.message), err.code)
							
							callback(null, path, hash);
						});
					});
					if(progress) {
						progress.style.display="none";
						EDITOR.resizeNeeded();
					}
				}
				else {
					console.log("uploadBigFile: Upload failed!");
					//console.log(x);
					error(new Error("Upload failed! path=" + path + " x.status=" + x.status + " text=" + UTIL.shortString(text) ));
				}
			}
		};
		
		x.open('POST', '/share');
		x.send(formData);
		
		function error(error, code) {
			if(code) error.code = code;
			if(callback) {
callback(error);
				callback = null;
			}
			else {
				throw error;
			}
		}
	}
	
	
	EDITOR.copyFile = function(from, to, callback) {
		// Copies a file from one location to another location, can be local file-system or a remote connection
		
		if(from instanceof File) from = from.path;
		
		CLIENT.cmd("copyFile", {from: from, to: to}, function afterFileCopied(err, json) {
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
		
		var f = EDITOR.eventListeners.sanitize.map(funMap);
		console.log("Calling sanitize listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			text = f[i](file, text);
			if(typeof text != "string") throw new Error("sanitize listener: " + UTIL.getFunctionName(f[i]) + " returned: (" + (typeof text) + ") \n" + text);
		}
		
		return text;
	}
	
	EDITOR.localFileDialog = function(defaultPath, callback) {
		/*
			Brings up the OS file select dialog window.
			File path is then passed to the callback function.
		*/
		
		console.log("Bringing up the file open dialog ...");
		
		if(typeof window.chooseFileSystemEntries == "function") {
			console.log("Using native file system API!");
			
			window.chooseFileSystemEntries().then(function(fileHandle) {
				fileHandle.getFile().then(function readText(localFile) {
					localFile.text().then(function(fileContent) {
						var filePath = "/local/file";
						callback(filePath, fileContent, fileHandle);
					});
				});
			}).catch(function(err) {
				var error = new Error("Something went wrong when using the native file system API to open a file: " + err.message);
				callback(err);
			});
			
			
			return;
		}
		
		
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
		
		//console.warn(UTIL.getStack("EDITOR.resizeNeeded!"));
		
		if(EDITOR.settings.devMode && EDITOR.shouldResize == false) {
			// For debugging, so we know why a resize was needed
			console.log(UTIL.getStack("resizeNeeded"));
		}
		EDITOR.shouldResize = true;
	}
	
	EDITOR.initCanvas = function init(canvas) {
		canvas.style.display="block";
		
		//canvas.onpaste = function() {};
		// canvas.onpaste only trigger in Firefox when you tab away, then tab back to Firefox and paste
		
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
		
		return canvas;
	}
	
	EDITOR.getCanvasContext = function getContext(canvas) {
		
		/*
			It seems it's not possible to change the context settings if we have already got the context ...
			So we need to re-create the canvas element to update the context settings.
			
			This functions is still usable for DRY-ness though.
			
		*/
		
		if(!EDITOR.canvas) throw new Error("EDITOR.canvas not yet set!");
		
		if(canvas == undefined) canvas = EDITOR.canvas;
		
		var ctxSettings = {
			lowLatency: EDITOR.settings.lowLatencyCanvas, 
			//desynchronized: true, // This will laterally reverse the canvas in Opera on Android :P
			willReadFrequently: false
		}
		
		if(EDITOR.settings.sub_pixel_antialias == false) {
			ctxSettings.antialias = false;
			ctxSettings.alpha = true;
			//console.warn("No sub_pixel_antialias! EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias);
		}
		else {
			ctxSettings.antialias = true;
			ctxSettings.alpha = false; // {alpha: false} allows sub pixel anti-alias (LCD-text).
		}
		
		console.log("EDITOR.getCanvasContext: EDITOR.canvas?" + (canvas == EDITOR.canvas) + " EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias + " ctxSettings=" + JSON.stringify(ctxSettings));
		
		var ctx = canvas.getContext("2d", ctxSettings);
		
		if( canvas == EDITOR.canvas ) {
EDITOR.canvasContext = ctx;
			console.warn("EDITOR.getCanvasContext: ctx set as EDITOR.canvasContext!");
		}
		
		if(typeof ctx.getContextAttributes == "function") {
			console.log( "EDITOR.getCanvasContext: getContextAttributes=" + JSON.stringify(ctx.getContextAttributes()) );
		}
		
		//canvasContextReset(ctx);
		
		return ctx;
	}
	
	function canvasContextReset(ctx) {
		
		// note: The editor is resized as least once when the page loads, which calls this function
		
		if(ctx == undefined) ctx = EDITOR.canvasContext;
		
		// Do not "smooth" the image, keep it sharp!
		ctx.imageSmoothingEnabled = false;
		ctx.webkitImageSmoothingEnabled = false;
		
		
		// Set the font only once for performance
		ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		ctx.textBaseline = "middle";
		
		// Just in case the matrix is inverted (Opera on Android)
		//ctx.scale(1,1);
		//ctx.translate(0, 500);
		
		ctx.save();
		
		console.log("DebugCtx: canvasContextReset()  windowLoaded=" + windowLoaded + " Set ctx.imageSmoothingEnabled=" + ctx.imageSmoothingEnabled + " EDITOR.canvasContext.imageSmoothingEnabled=" + EDITOR.canvasContext.imageSmoothingEnabled + " ctx.font=" + ctx.font);
		
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
			
			console.warn("EDITOR.render: Getting new canvas 2d context!");
			
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
		
		if(EDITOR.canvas.width <= 0 || EDITOR.canvas.height <= 0) {
			EDITOR.shouldRender = false;
			console.warn("Not rendering because the canvas is too small! EDITOR.canvas.width=" + EDITOR.canvas.width + " EDITOR.canvas.height=" + EDITOR.canvas.height + " ");
			return;
		}
		
		console.log("DebugCtx: EDITOR.render()  windowLoaded=" + windowLoaded + " ctx.imageSmoothingEnabled=" + ctx.imageSmoothingEnabled + " Using EDITOR.canvasContext?" + (ctx == EDITOR.canvasContext) + " ctx.font=" + ctx.font);
		
		
		if(screenStartRow == undefined) screenStartRow = 0; 
		// Used for only rendering some rows for optimization. 
		// Default is to render all rows, so screenStartRow = 0
		
		// Fix blurryness for screens with high pixel ratio
		if(PIXEL_RATIO !== 1) {
			//alertBox("PIXEL_RATIO=" + PIXEL_RATIO);
			ctx.restore();
			ctx.save();
			ctx.scale(PIXEL_RATIO,PIXEL_RATIO);
			//ctx.scale(1,1);
		}
		
		/*
			I tried over-riding the pixel ratio to 1 in order to get better performace on mobile,
			but it had no effect of rending performance, while making the text blurry!
		*/
		
		if(canvas == EDITOR.canvas) EDITOR.shouldRender = false; // Flag (change to true whenever we need to render)
		
		//console.warn("rendering ...");
		
		// if(EDITOR.currentFile && ctxMenuVisibleOnce) {
		if(EDITOR.currentFile) {
			
			var file = EDITOR.currentFile;
			
			//console.log("render file=" + file.path);
			
			if(file.canvas) {
				
				ctx.clearRect(0, 0, EDITOR.view.canvasWidth, EDITOR.view.canvasHeight);
				ctx.drawImage(file.canvas, file.sx, file.sy, file.sWidth, file.sHeight, file.dx, file.dy, file.dWidth, file.dHeight);
				
				return;
			}
			
			
			
			if(!file.render) {
				console.warn("File render flag set to '" + file.render + "'");
				
				// Just paint the background
				ctx.fillStyle = EDITOR.settings.style.bgColor;
				
				//ctx.clearRect(0, 0, EDITOR.canvas.width, EDITOR.canvas.height);
				ctx.fillRect(0, 0, EDITOR.canvas.width, EDITOR.canvas.height);
				
				return;
			}
			
			console.time("render");
			
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
			var charsInRightMargin = Math.ceil(EDITOR.settings.rightMargin / EDITOR.settings.gridWidth);
			/*
				Optimization: Cut off what we can not see
				note: Surrogate pairs are two characters and with modifier they are four characters, 
				so if a line contain only surrogates with modifier they will be 4 times as many utf-16 characters
			*/
			
			var maxColumns = Math.max(EDITOR.view.endingColumn + charsInRightMargin, EDITOR.view.visibleColumns *4);
			//console.log("render: maxColumns=" + maxColumns + " EDITOR.view.endingColumn=" + EDITOR.view.endingColumn + " EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
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
				buffer = EDITOR.preRenderFunctions[i](buffer, file, bufferStartRow, maxColumns); // Call render
				//console.timeEnd("prerender: " + funName);
			}
			//console.timeEnd("preRenders");
			// preRenderFunctions could be optimized using web workers!
			
			// Find out if the buffer contains characters with special width ( might need optimization )
			/*
				if(buffer.length > 0) {
				var startIndex = buffer[0].startIndex;
				var endIndex = buffer[buffer.length-1].startIndex + buffer[buffer.length-1].length;
				var textString = file.text.substring(startIndex, endIndex);
				var containSpecialWidthCharacters = false;
				for(var i=0; i<textString.length-1; i++) {
				if( UTIL.isSurrogateStart(textString[i]) ) {
				containSpecialWidthCharacters = true;
				break;
				}
				}
				containSpecialWidthCharacters = ( containSpecialWidthCharacters || UTIL.indexOfZeroWidthCharacter(textString) != -1 || textString.indexOf("\t")!= -1 );
				}
				else
				
			*/
			var containSpecialWidthCharacters = true;
			
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
				EDITOR.renderFunctions[i](ctx, buffer, EDITOR.currentFile, screenStartRow, containSpecialWidthCharacters, bufferStartRow, bufferEndRow, maxColumns); // Call render
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
			// No file open ...
			
			
			setTimeout(function showDashboardMaybe() {
				if(!EDITOR.currentFile && !EDITOR.dashboard.stayHidden && EDITOR.user && !(QUERY_STRING["embed"] || (QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("dashboard") != -1))) {
					EDITOR.dashboard.show();
					EDITOR.shouldRender = false;
				}
			}, 1000);
			
			
			// Show some useful info for new users ...
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			ctx.fillRect(0, 0, EDITOR.canvas.width, EDITOR.canvas.height);
			
			ctx.fillStyle = EDITOR.settings.style.textColor;
			
			//canvasContextReset(ctx);
			
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
				"Right-click (or long press)",
				" to show context menu.",
				"",
				"Upload files and folders",
				" by draging them here."
				//"font=" + EDITOR.settings.style.font + " size=" + EDITOR.settings.style.fontSize
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
				// Note: Always round numbers when writing text to the canvas or the text might be broken/blurry!
				var left = Math.round(EDITOR.view.canvasWidth / 2 - textMeasure.width / 2);
				var top =  Math.round(EDITOR.view.canvasHeight / 2 - 20*friendlyString.length);
				
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
	
	EDITOR.renderRow = function(row) {
		
		console.log("rendering ROW ... EDITOR.shouldResize=" + EDITOR.shouldResize + "");
		
		if(EDITOR.currentFile) {
			
			var file = EDITOR.currentFile;
			
			if(row == undefined) row = file.caret.row;
			if(file.grid.length <= row) throw new Error("row=" + row + " over file.grid.length=" + file.grid.length + " ");
			
			if(!file.rowVisible(row)) {
				console.warn("Row=" + row + " not in view!");
				return;
			}
			
			var screenStartRow = Math.max(0, row - file.startRow);
			
			console.time("renderRow");
			
			var buffer = [];
			
			// Create the buffer
			var maxColumns = Math.max(EDITOR.view.endingColumn, EDITOR.view.visibleColumns *2); // Optimization: Cut off what we can not see file.grid[row].length
			buffer.push(file.cloneRow(row, maxColumns)); // Clone the row
			
			
			// Load on the fly functionality on the buffer
			// No prerender when rendering rows!?
			
			for(var i=0; i<EDITOR.preRenderFunctions.length; i++) {
				buffer = EDITOR.preRenderFunctions[i](buffer, file, row, maxColumns);
			}
			
			/*
				
				if(buffer.length > 0) {
				var startIndex = buffer[0].startIndex;
				var endIndex = buffer[buffer.length-1].startIndex + buffer[buffer.length-1].length;
				var textString = file.text.substring(startIndex, endIndex);
				var containSpecialWidthCharacters = (UTIL.indexOfZeroWidthCharacter(textString) != -1 || UTIL.containsEmoji(textString));
				}
				else var containSpecialWidthCharacters = false;
			*/
			var containSpecialWidthCharacters = true;
			
			//console.log(JSON.stringify(buffer, null, 4));
			
			var ctx = EDITOR.canvasContext;
			
			ctx.fillStyle = EDITOR.settings.style.bgColor;
			
			var top = EDITOR.settings.topMargin + screenStartRow * EDITOR.settings.gridHeight;
			
			// Clear only that row
			ctx.fillRect(0, top, EDITOR.canvas.width, EDITOR.settings.gridHeight);
			
			/*
				ctx.fillStyle = "#FF0000";
				ctx.fillRect(0,0,150,75);
				ctx.lineWidth = 1;
			*/
			
			console.log("Rendering row=" + row);
			
			for(var i=0; i<EDITOR.renderFunctions.length; i++) {
				EDITOR.renderFunctions[i](ctx, buffer, file, screenStartRow, containSpecialWidthCharacters, row, row); // Call render
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
		
		var ctx = EDITOR.canvasContext;
		
		ctx.fillStyle = textColor;
		
		//ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillText(character, left, middle);
		
	}
	
	EDITOR.clearColumn = function(row, col) {
		// For optimization: Clears a box (screen area) instead of doing a full re-render
		
		var file = EDITOR.currentFile;
		
		var top = Math.floor(EDITOR.settings.topMargin + (row - file.startRow) * EDITOR.settings.gridHeight);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth); // -0.5 to clear sub pixels (caret)
		
		var ctx = EDITOR.canvasContext;
		
		if(row == file.caret.row) {
			ctx.fillStyle = EDITOR.settings.style.currentLineColor;
		}
		else {
			ctx.fillStyle = EDITOR.settings.style.bgColor;
		}
		
		//ctx.fillStyle = "rgba(255,0,0, 0.5)";
		ctx.fillRect(left, top, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
		
	}
	
	EDITOR.gridWalker = function gridWalker(gridRow, endCol, startCol) {
		/*
			The walker will also walk on the endCol
			Accept gridrow so that we can use the function with a buffer (which don't have to know abut the file.grid)
			
			You probably don't want to use startCol! Need to start from the beginning to get the correct width!
		
todo: Rewrite so that the garbage collector wont kill us!
ca 20ms to render, ca 13ms to render without creating new objects

*/
		
		if(typeof gridRow != "object") throw new Error("First argument gridRow=" + gridRow + "(" + (typeof gridRow) + ") needs to be a file.grid row!");
		
		var state = {
			done: false,
			extraSpace: 0,
			tabIndention: 0,
			next: walk,
			col: startCol || 0,
			char: "", // Can be many code points
			charWidth: 0,
			charCodePoints: 0,
			totalWidth: 0 //Total width of the row so far
			
		}
		// Total width of the row so far can be calculated from col + extraSpace
		// state includes the column/character we are standing on!
		
		if(endCol == undefined) endCol = gridRow.length-1;
		if(endCol >= gridRow.length) endCol = gridRow.length-1;
		
		if(gridRow.length == 0) {
			console.log("gridWalker: gridRow.length=" + gridRow.length + " Nothing to walk on!");
			state.done = true;
			return state;
		}
		
		if(endCol < 0) {
			console.warn("gridWalker: endCol=" + endCol + " before beginning! gridRow.length=" + gridRow.length + "  ");
			return state;
		}
		
		return state;
		
		function walk() {
			if(state.done) {
				console.log("gridWalker: Already done! state.col=" + state.col + " endCol=" + endCol + " We are done!");
				return state;
			}
			
			//console.log("gridWalker: state.col=" + state.col + " last-char-length=" + state.char.length + " gridRow.length=" + gridRow.length);
			
			//state.col += state.char.length;
			state.col += state.charCodePoints;

			state.extraSpace += (state.charWidth-1);
			
			state.extraSpace -= (state.charCodePoints-1);
			
			
			if(state.col > endCol) {
				//console.log("gridWalker: Hmm, the walk ended! state.col=" + state.col + " endCol=" + endCol + " last-char=" + state.char + " We are done!");
				state.done = true;
				return state;
			}
			
			var col = state.col;
			
			state.charCodePoints = 1;
			state.char = gridRow[col].char;
			
			if(state.char == "\t") {
				if(state.col == state.tabIndention) {
					// Tabs at the beginning will indentate. While 
					var charWidth = EDITOR.settings.tabSpace;
					state.tabIndention++;
					//console.log("gridWalker: col=" + col + " Indentation Tab with=" + charWidth + " tabIndention=" + state.tabIndention + " ");
				}
				else {
					// tabs in the middle will arrange text into columns
				var charWidth = (  8 - (col-state.tabIndention+state.extraSpace) % 8  );
					//console.log("gridWalker: col=" + col + " Culumn Tab with=" + charWidth + " tabIndention=" + state.tabIndention + " ");
				}
				
			}
			else {
				
				if( UTIL.isSurrogateStart(state.char) ) {
					combineSurrogate(col);
				}
				
				// Need to check if next character is a zero width joiner, then combine
				if( gridRow[col+state.charCodePoints] ) checkForZeroWidthJoiner(col+state.charCodePoints);
				
				// We also need to check if next character is a variation selector, and combine it
				if( gridRow[col+state.charCodePoints] && UTIL.isVariationSelector(gridRow[col+state.charCodePoints].char) ) {
					//console.log("gridWalker: col=" + col + " Combining variation selector ");
					state.char += gridRow[col+state.charCodePoints].char;
					state.charCodePoints++;
				}
				
				var charWidth = EDITOR.glyphWidth(state.char);
			}
			
			state.charWidth = charWidth;
			state.totalWidth += charWidth;
			
			if(state.col+state.char.length > (endCol)) {
				//console.log("gridWalker: This was the last iteration! state.col=" + state.col + " state.char.length=" + state.char.length + " endCol=" + endCol + "");
				state.done = true;
			}
			
			//console.log("gridWalker: state=" + JSON.stringify(state));
			
			//console.log("gridWalker: state.char: " + state.char.split('').map(char => char.codePointAt(0).toString(16)  ));
			
			return state;
		}
		
		function combineSurrogate(col) {
			//console.log("gridWalker:combineSurrogate: col=" + col + " surrogate start");
			if( gridRow[col+2] && gridRow[col+3] && UTIL.isSurrogateModifierStart(gridRow[col+2].char) ) {
				//console.log("gridWalker: col=" + col + " surrogate=" + (gridRow[col].char + gridRow[col+1].char) + " modifier=" + (gridRow[col+2].char + gridRow[col+3].char) + " ");
				state.charCodePoints+=3;
				state.char += gridRow[col+1].char;
				state.char += gridRow[col+2].char;
				state.char += gridRow[col+3].char;
			}
			else if( gridRow[col+1] ) {
				//console.log("gridWalker:combineSurrogate: col=" + col + " surrogate=" + (gridRow[col].char + gridRow[col+1].char) + " no modifier");
				state.charCodePoints++;
				state.char += gridRow[col+1].char;
			}
		}
		
		function checkForZeroWidthJoiner(col) {
			// Recursive (there can be many combinations)
			
			if( gridRow[col].char === "\u200D" ) {
				//console.log("gridWalker: checkForZeroWidthJoiner: Found one at col=" + col);
				state.char += "\u200D";
				state.charCodePoints++;
				
				var nextChar = gridRow[col+1] && gridRow[col+1].char;
				//console.log("gridWalker: checkForZeroWidthJoiner: nextChar=" + nextChar + " (" + (nextChar.codePointAt(0).toString(16)) + ")");
				if(nextChar === undefined) return;
				
				// Add next character
				state.charCodePoints++;
				state.char += nextChar;
				
				if( UTIL.isSurrogateStart(nextChar) ) {
					combineSurrogate(col+1);
				}
				
				//console.log("gridWalker: checkForZeroWidthJoiner: Next col=" + (state.col+state.charCodePoints) + " char=" + (gridRow[state.col+state.charCodePoints] && gridRow[state.col+state.charCodePoints].char) + " (" + (gridRow[state.col+state.charCodePoints] && gridRow[state.col+state.charCodePoints].char.codePointAt(0).toString(16)) + ")  ");
				
				if( gridRow[state.col+state.charCodePoints] ) checkForZeroWidthJoiner(state.col+state.charCodePoints);
				
			}
		}
		
	}
	
	EDITOR.renderCaret = function(caret, colPlus, fillStyle, screenStartRow, bufferStartRow) {
		
		//console.log("renderCaret: caret=" + JSON.stringify(caret) + " colPlus=" + colPlus);
		
		var file = EDITOR.currentFile;
		if(file == undefined) return;
		if(!(file instanceof File)) return;
		
		if(colPlus == undefined) colPlus = 0;
		if(fillStyle == undefined) fillStyle = EDITOR.settings.caret.color;
		if(screenStartRow == undefined) screenStartRow = 0;
		if(bufferStartRow == undefined) bufferStartRow = file.startRow;
		
		var row = caret.row;
		var col = caret.col + colPlus;
		
		//console.log("renderCaret: col=" + col + " (" + typeof col + ") caret.col=" + caret.col + " (" + typeof caret.col + ") colPlus=" + colPlus + " (" + typeof colPlus + ")");
		
		if(!file.grid[row]) throw new Error("row=" + row + " does not exist in file grid! file.grid.length=" + file.grid.length + " file.path=" + file.path + " caret=" + JSON.stringify(caret) + " file.caret==caret?" + (file.caret==caret));
		
		
		var walker = EDITOR.gridWalker(file.grid[row], col);
		while(!walker.done) walker.next();
		var colAdjustment = walker.extraSpace;
		
		if(walker.col < col) {
			// Caret at EOL!?
			colAdjustment -= walker.charCodePoints;
			colAdjustment += walker.charWidth;
		}
		
		//console.log("renderCaret: col=" + col + " walker=" + JSON.stringify(walker));
		
		// Math.floor to prevent sub pixels
		var top = Math.floor(EDITOR.settings.topMargin + (row - bufferStartRow + screenStartRow) * EDITOR.settings.gridHeight);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + colAdjustment + ((file.grid[row].indentation) * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth);
		
		var ctx = EDITOR.canvasContext;
		
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
		
		//console.warn(UTIL.getStack("EDITOR.resize!"));
		
		EDITOR.shouldResize = false; // Prevent this function from running again
		
		//if(EDITOR.lastKeyPressed=="a") throw new Error("why resize now?");
		
		if(oldFullScreenWidget) {
			// There is a widget covering the whole screen!
			console.warn("Not resizing because oldFullScreenWidget=", oldFullScreenWidget);
			return;
		}
		
		PIXEL_RATIO = window.devicePixelRatio || 1; // "Retina" displays gives 2
		
		var windowHeight = parseInt(window.innerHeight);
		var windowWidth = parseInt(window.innerWidth);
		
		// There is an annoying bug in Ubuntu that *sometimes* when the window is de-maximized
		// The window is resized to 1x1 px and moved to the top left corner.
		if(windowHeight < 100 && windowWidth < 100) {
			window.resizeTo(100, 100);
			return;
		}
		
		console.time("resize");
		
		// Resize listeners (before)
		var f = EDITOR.eventListeners.beforeResize.map(funMap);
		console.log("Calling beforeResize listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			f[i](EDITOR.currentFile, windowWidth, windowHeight);
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
		var rightColumnHeight = parseInt(rightColumn.offsetHeight);
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
		
		
		// Set a static with and height to wrappers so that dynamic changes wont resize the wireframe 
		// (wrappers should have css: overflow: auto!important;)
		// To make 
		
		var leftColumnPadding = window.getComputedStyle(document.getElementById("leftColumn")).getPropertyValue("padding");
		//console.log("leftColumnPadding=" + leftColumnPadding);
		var columnPadding = parseInt(leftColumnPadding);
		var leftWrappers = leftColumn.getElementsByClassName("wrap");
		for (var i = 0; i < leftWrappers.length; i++) {
			//if(parseInt(wrapperComputedStyle.width) > leftColumnWidth) 
			// We always need to set with or the canvas will drop down below
			
			leftWrappers[i].style.width = leftWrappers[i].offsetWidth + "px";
			leftWrappers[i].style.height = contentHeight + "px";
			//leftWrappers[i].style.width = (leftColumnWidth) + "px"; // - (columnPadding * 2 + 2) + "px";
		}
		var rightWrappers = rightColumn.getElementsByClassName("wrap");
		for (var i = 0; i < rightWrappers.length; i++) {
			rightWrappers[i].style.width = rightWrappers[i].offsetWidth + "px";
			rightWrappers[i].style.height = rightColumnHeight + "px";
			//rightWrappers[i].style.width = (rightColumnWidth) + "px"; // - (columnPadding * 2 + 2) + "px";
		}
		
		// Restore scrolling of the wrappers
		for (var i = 0; i < wrappers.length; i++) {
			console.log("Restoring scroll " +  wrappers[i].getAttribute("id") + " savedScrollTop=" + wrappers[i].getAttribute("savedScrollTop"));
			wrappers[i].scrollTop = wrappers[i].getAttribute("savedScrollTop");
			wrappers[i].scrollLeft = wrappers[i].getAttribute("savedScrollLeft");
		}
		
		shareHeight(leftColumn.childNodes, contentHeight);
		shareHeight(rightColumn.childNodes, contentHeight);
		
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
		
		
		//if(PIXEL_RATIO >= 1) {
		var canvasWidth = EDITOR.view.canvasWidth * PIXEL_RATIO;
		var canvasHeight = EDITOR.view.canvasHeight * PIXEL_RATIO;
		//}
		//else {
		//var canvasWidth = EDITOR.view.canvasWidth / PIXEL_RATIO;
		//var canvasHeight = EDITOR.view.canvasHeight / PIXEL_RATIO;
		//}
		
		console.log("PIXEL_RATIO=" + PIXEL_RATIO + " canvasWidth=" + canvasWidth + " canvasHeight=" + canvasHeight);
		
		if( EDITOR.canvas && (EDITOR.canvas.width != canvasWidth || EDITOR.canvas.height != canvasHeight || resizeOverride) ) {
			
			console.log("DebugCtx: Before canvas resize: windowLoaded=" + windowLoaded + " EDITOR.canvasContext.imageSmoothingEnabled=" + EDITOR.canvasContext.imageSmoothingEnabled);
			
			EDITOR.canvas.style.width = EDITOR.view.canvasWidth + "px";
			EDITOR.canvas.style.height = EDITOR.view.canvasHeight + "px";
			
			EDITOR.canvas.width  = canvasWidth;
			EDITOR.canvas.height = canvasHeight;
			
			console.log("DebugCtx: After canvas resize: EDITOR.canvasContext.imageSmoothingEnabled=" + EDITOR.canvasContext.imageSmoothingEnabled);
			
			// The canvas is reset when resizing!
			canvasContextReset();
			
			
			// Calculate the scroll zone
			// To make sure the line do not cross letters, so the line can be cleared for the vertical scroll optimization
			EDITOR.settings.verticalScrollZone = EDITOR.settings.gridWidth*3 + EDITOR.settings.rightMargin; // Scrollbar zone, right
			EDITOR.settings.horizontalScrollZone = EDITOR.settings.gridHeight*2 + EDITOR.settings.topMargin; // Scrollbar zone, bottom. When touching down in the zone we should scroll
			
			console.log("Set canvas: EDITOR.canvas.width=" + EDITOR.canvas.width + " EDITOR.canvas.height=" + EDITOR.canvas.height + " EDITOR.canvas.style.width=" + EDITOR.canvas.style.width + " EDITOR.canvas.style.height=" + EDITOR.canvas.style.height);
			
			var dashboard = document.getElementById("dashboard");
			dashboard.style.width = EDITOR.view.canvasWidth + "px";
			dashboard.style.height = EDITOR.view.canvasHeight + "px";
			
			
			// Need to re-render after resizing the canvas!
			console.log("re-render after resizing the canvas!");
			EDITOR.shouldRender = true;
			
		}
		else if(EDITOR.canvas) {
			console.log("Not resetting canvas dimensions. It's already at EDITOR.canvas.width=" + EDITOR.canvas.width + " EDITOR.canvas.height=" + EDITOR.canvas.height);
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
		var f = EDITOR.eventListeners.afterResize.map(funMap);
		console.log("Calling afterResize listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			f[i](EDITOR.currentFile, windowWidth, windowHeight);
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
if(elements[i].style.display != "none") {
				computedStyle = window.getComputedStyle(elements[i], null);
				totalHeight += parseInt(computedStyle.height);
			}
}
			
			var height = 0;
			var newHeight = 0;
			var availableHeight = maxTotalHeight - totalHeight;;
			if(availableHeight < 0) {
				// One or more elements need to shrink
				for (var i = 0; i < elements.length; i++) {
					
					if(elements[i].getAttribute("place") == "vertical") {
						elements[i].style.height = maxTotalHeight + "px";
						continue;
					}
					
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
	
	EDITOR.on = function(eventName, order, callback) {
		/*
			lowest order nr will execute first!
		*/
		
		if(typeof order == "function") {
			callback = order;
			order = undefined;
		}
		else if( typeof callback == "number" && typeof order == "function") {
			var _order = callback;
			callback = order;
			order = _order;
		}

		if(typeof callback != "function") {
throw new Error("Second or third argument to EDITOR.on: callback=" + callback + " (" + (typeof callback) + ") needs to be a function! Did you mean EDITOR.addEvent ?");
		}
		
		var options = {fun: callback};
		
		if(typeof order == "number") options.order = order;
		else if(typeof order == "object") {
			for(var name in order) {
				options[name] = order[name];
			}
		}
		else if(order != undefined) throw new Error("Unable to determine what parameter order=" + order + " in third argument to EDITOR.on means!");
		
		return EDITOR.addEvent(eventName, options);
	}
	
	
	var runOnceCounter = 0;
	EDITOR.once = function runonce(eventName, fun) {
		// Runs the function one time when the event fires, then removes the event listener
		
		var fName = "_runonce" + (++runOnceCounter) + UTIL.getFunctionName(fun);
		
		var cb = function() {
			fun.apply(null, arguments);
			removeEvent();
		}
		
		var fEv = UTIL.nameFunction(cb, fName, 15);
		
		EDITOR.on(eventName, fEv);
		
		function removeEvent() {
			EDITOR.removeEvent(eventName, fEv);
		}
		
	}
	
	
	EDITOR.addEvent = function(eventName, options) {
		
		if(!(eventName in EDITOR.eventListeners)) {
			var errorMsg = "eventName=" + eventName + " does not exist in EDITOR.eventListeners! (event name is case sensetive)";
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
		else if(eventName == "storageReady" && _serverStorage != null) {
			console.warn("Editor's storageReady event has already been fired! " + funName + " will run right away!");
			options.fun(_serverStorage);
		}
		
		
		if(eventName == "voiceCommand" && options.grammar && recognition) {
			if(Object.prototype.toString.call( options.grammar ) != '[object Array]') {
				throw new Error("options.grammar neeeds to be an array!");
			}
			for (var i=0; i<options.grammar.length; i++) {
				if(speechRecognitionGrammar.indexOf(options.grammar[i]) == -1) speechRecognitionGrammar.push(options.grammar[i]);
			}
			
			var speechRecognitionList = new SpeechGrammarList();
			var grammar = "#JSGF V1.0; grammar WebIDE;";
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
		
		if(typeof eventName == "function") throw new Error("First argument to EDITOR.removeEvent should be the event name! eventName=" + eventName);
		if(typeof fun != "function") throw new Error("Second argument to EDITOR.removeEvent should be the event callback function! fun=" + fun);
		
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
	
	EDITOR.hasEvent = function(eventName, fun) {
		if(!EDITOR.eventListeners.hasOwnProperty(eventName)) throw new Error("Unknown editor event: " + eventName);
		
		var events = EDITOR.eventListeners[eventName];
		for(var i=0; i<events.length; i++) {
			if(events[i].fun == fun) {
				return true;
			}
		}
		
		return false;
	}
	
	
	var discoveryBarTabIndex = 600; // See tabindex.txt
	EDITOR.discoveryBar = {
		addIcon: function addDiscoveryIcon(imageSrc, position, title, captionText, whenclicked, whenConextMenuActivated) {
			// Adds a standard item with an icon
			
			// Why was this not at the top before? Why was the icons added anyway!?
			if(QUERY_STRING["embed"] || (QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("discoveryBar") != -1)) {
				var disabledErrorMessage = "Discovery bar is disabled by query string!";

				console.warn(disabledErrorMessage);

				return {
					disabled: true,
					activate: function() {
						console.error(disabledErrorMessage);
					},
					deactivate: function() {
						console.error(disabledErrorMessage);
					},
					isActive: function() {
						console.error(disabledErrorMessage);
					},
					classList: {
						add: function() {
							console.error(disabledErrorMessage);
						},
						remove: function() {
							console.error(disabledErrorMessage);
						}
					}

				};
			}

			var item = document.createElement("div");
			item.onclick = function clickIcon(clickEvent) {
				var file = EDITOR.currentFile;
				var combo = getCombo(clickEvent);
				
				whenclicked(file, combo, clickEvent);
				return false;
			};
			item.title = title;
			
			if(whenConextMenuActivated) {
				item.oncontextmenu = whenConextMenuActivated;
			}
			
			var image = document.createElement("img");
			image.src = imageSrc;
			item.appendChild(image);
			
			var caption = document.createElement("figcaption");
			caption.classList.add("discoveryBarCaption");
			var span = document.createElement("span");
			span.innerText = captionText;
			caption.appendChild(span);
			
			if(!EDITOR.discoveryBar.captions) caption.classList.add("hidden");
			item.appendChild(caption);
			
			
			return EDITOR.discoveryBar.add(item, position);
			
		},
		add: function addDiscoveryItem(element, position) {
			// Adds an item
			
			// Should we have icon captions? It will look ugly, and make the CSS complicated, and the text wont fit.
			// But it's impossible to know what the icons do. User testing showed that the user had no idea how to create a new file, nor how to save it!


			// Why was this not at the top before? Why was the icons added anyway!?
			if(QUERY_STRING["embed"] || (QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("discoveryBar") != -1)) {
				var disabledErrorMessage = "Discovery bar is disabled by query string!";

				console.warn(disabledErrorMessage);

				return {
					disabled: true,
					activate: function() {
						console.error(disabledErrorMessage);
					},
					deactivate: function() {
						console.error(disabledErrorMessage);
					},
					isActive: function() {
						console.error(disabledErrorMessage);
					}

				};

			}

			if(position == undefined) throw new Error("Second argument: position need to be defined!");
			
			var wrap = document.createElement("div");
			wrap.setAttribute("class", "discoveryItem");
			wrap.setAttribute("position", position);
			
			if(QUERY_STRING["menuOrder"]) wrap.innerText = position;
			
			wrap.appendChild(element);
			
			discoveryBar.appendChild(wrap);
			
			// Re-order
			var items = Array.prototype.slice.call( discoveryBar.children, 0 ); // Make psuedu-array into a real array
			items.sort(function(a,b) {
				var pA = parseInt(a.getAttribute("position"));
				var pB = parseInt(b.getAttribute("position"));
				
				if(pA > pB) return 1;
				else if(pB > pA) return -1;
				else return 0;
			});
			items.forEach(function (el) {
				discoveryBar.appendChild(el);
				//el.setAttribute("tabindex", ++discoveryBarTabIndex);
			});
			
			
			//EDITOR.discoveryBar.show();
			
			// Work like the windowMenu api
element.activate = function() {EDITOR.discoveryBar.activate(element)};
			element.deactivate = function() {EDITOR.discoveryBar.deactivate(element)};
			element.isActive = function() {EDITOR.discoveryBar.isActive(element)};
			
			return element;
		},
		remove: function removeDiscoveryItem(element) {
			// Removes an item
			if(element == undefined) {
				console.warn("Cannot remove undefined item from the discovery bar!");
				return;
			}
			else if(typeof element == "object" && element.disabled===true) {
				return;
			}
			
			var wrap = element.parentNode;
			
			if(typeof wrap != "object") throw new Error("Unable to remove discovery bar item: element=" + JSON.stringify(element) + " wrap=" + wrap + " is not an object!");
			
			discoveryBar.removeChild(wrap);
		},
		activate: function activateDiscoveryBarItem(element) {
			// Actiaves an item
			element.classList.add("active");
		},
		deactivate: function deactivateDiscoveryBarItem(element) {
			element.classList.remove("active");
		},
		isActive: function isDiscoveryBarItemActive(element) {
			return element.classList.contains("active");
		},
		show: function showDiscoveryBar() {
			// Shows the whole discovery bar
			if(!EDITOR.discoveryBar.enabled) {
				throw new Error("Discovery bar not enabled!");
				return;
			}
			
			if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("discoveryBar") != -1) {
				var error = new Error("discovery bar disabled via query string!")
				console.error(error);
				alertBox(error.message);
				return;
			}
			
			console.log("discoveryBar:show: showDisoveryBarWindowMenuItem=", showDisoveryBarWindowMenuItem);
			
			if(!discoveryBar.parentElement) {
				var editorWidth = window.innerWidth || parseInt(EDITOR.canvas.width);
				var editorHeight = window.innerHeight || parseInt(EDITOR.canvas.height);
				if(editorWidth > editorHeight) {
					/*
						Right or left side ?
						
						If we place it on the right side we need to run discoveryBar.parentElement.appendChild(discoveryBar)
						in order to make it the last item - every time something is added to the right column.
						
						But if we place it on the left side, additional widgets will be placed right of it =)
						
					*/
					
					discoveryBar.setAttribute("class", "discoveryBar wrap");
					
					var parent = document.getElementById("leftColumn"); // rightColumn, leftColumn
					
					// Make sure the discovery bar is placed on the most left
					if(parent.firstChild) parent.insertBefore(discoveryBar, parent.firstChild);
					else parent.appendChild(discoveryBar);
					
				}
				else {
					// At the top
					var parent = document.getElementById("header");
					var tabList = document.getElementById("tabList");
					
					discoveryBar.setAttribute("class", "discoveryBar");
					
					if(tabList) setHeight();
					else setTimeout(setHeight, 1000);
					
					// Make sure it's above file tabs
					var fileTabs = document.getElementById("tabList");
					if(fileTabs) parent.insertBefore(discoveryBar, fileTabs);
					else parent.appendChild(discoveryBar);
				}
				
				
				EDITOR.resizeNeeded();
			}
			
			discoveryBar.style.display = "inline-block";
			
			if(showDisoveryBarWindowMenuItem) showDisoveryBarWindowMenuItem.activate();
			else {
				console.log("discoveryBar: No showDisoveryBarWindowMenuItem? ", showDisoveryBarWindowMenuItem);
				setTimeout(function() {
					if(showDisoveryBarWindowMenuItem) showDisoveryBarWindowMenuItem.activate();
				}, 1000);
				
			}
			
			EDITOR.discoveryBar.isVisible = true;
			if(EDITOR.storage.ready() && EDITOR.storage.getItem("showDiscoveryBar") != "true") EDITOR.storage.setItem("showDiscoveryBar", "true");
			EDITOR.resizeNeeded();
			
			function setHeight() {
				var tabList = document.getElementById("tabList");
				if(tabList) {
					var tabListHeight = tabList.clientHeight || tabList.offsetHeight;
					discoveryBar.style.height = tabListHeight + "px";
					
					EDITOR.resizeNeeded();
				}
				console.log("discoveryBar: editorWidth=" + editorWidth + " editorHeight=" + editorHeight + " tabListHeight=" + tabListHeight + " ");
			}
			
		},
		hide: function hideDiscoveryBar() {
			// Hides the whole discovery bar
			console.log("discoveryBar:hide: showDisoveryBarWindowMenuItem=", showDisoveryBarWindowMenuItem);
			discoveryBar.style.display = "none";
			if(showDisoveryBarWindowMenuItem) showDisoveryBarWindowMenuItem.deactivate();
			EDITOR.discoveryBar.isVisible = false;
			if(EDITOR.storage.ready() && EDITOR.storage.getItem("showDiscoveryBar") != "false") EDITOR.storage.setItem("showDiscoveryBar", "false");
			EDITOR.resizeNeeded();
		},
		toggle: function toggleDiscoveryBar() {
			// Hides or shows the whole discovery bar
			console.log("discoveryBar:toggle: discoveryBar.style.display=" + discoveryBar.style.display);
			if(discoveryBar.style.display == "none") {
				EDITOR.discoveryBar.show();
			}
			else {
				EDITOR.discoveryBar.hide();
			}
		},
		toggleCaptions: function toggleDiscoveryBarCaptions(wantedState) {
			
			if(wantedState=="true") wantedState = true;
			else if(wantedState=="false") wantedState = false;
			
			if(wantedState === true && EDITOR.discoveryBar.captions) return;
			if(wantedState === false && !EDITOR.discoveryBar.captions) return;
			
			var elList = document.getElementsByClassName("discoveryBarCaption");
			if(EDITOR.discoveryBar.captions) {
				
				for(var i=0; i<elList.length; i++) {
					elList[i].classList.add("hidden");
				}
				
				EDITOR.discoveryBar.captions = false;
				if(showDisoveryBarCaptions) showDisoveryBarCaptions.deactivate();
				if(EDITOR.storage.ready() && EDITOR.storage.getItem("showDiscoveryBarCaptions") != "false") EDITOR.storage.setItem("showDiscoveryBarCaptions", "false");
			}
			else {
				
				for(var i=0; i<elList.length; i++) {
					elList[i].classList.remove("hidden");
				}
				
				EDITOR.discoveryBar.captions = true;
				if(showDisoveryBarCaptions) showDisoveryBarCaptions.activate();
				if(EDITOR.storage.ready() && EDITOR.storage.getItem("showDiscoveryBarCaptions") != "true") EDITOR.storage.setItem("showDiscoveryBarCaptions", "true");
				
			}
			
			
		},
		disable: function disableDiscoveryBar() {
			// Disables the entire discovery bar
			EDITOR.discoveryBar.hide();
			EDITOR.discoveryBar.enabled = false;
		},
		isVisible: true,
		enabled: true,
		captions: true
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
		menu.visible = false; // If the menu is visible
		
		console.warn("new DropdownMenu: menu.orientation=" + menu.orientation);
		
		menu.domElement = document.createElement("table");
		menu.domElement.setAttribute("border", "0");
		menu.domElement.setAttribute("cellspacing", "0");
		menu.domElement.setAttribute("cellpadding", "0");
		menu.domElement.setAttribute("role", "menu");
		
		if(menu.orientation == "vertical") {
			// Each item is a table-row
			menu.itemWrapper = menu.domElement;
		}
		else if(menu.orientation == "horizontal") {
			// Each item is it's own table
			menu.itemWrapper = document.createElement("tr");
			menu.domElement.appendChild(menu.itemWrapper);
		}
		else throw new Error("Unknown orientation=" + menu.orientation);
		
		
		menu.domElement.setAttribute("class", "menu " + menu.orientation + " pullout" + menu.pullout + (menu.parentMenu ? " branch" : " root"));
		
		var hideTimer;
		menu.domElement.addEventListener("mouseout", hideMaybe);
		
		menu.domElement.addEventListener("mouseover", stillActive);
		
		
		var windowMenu = document.getElementById("windowMenu");
		windowMenu.appendChild(menu.domElement); // All menus goes into the windowMenu div (no nested lists!)
		
		function stillActive(mouseEvent) {
			if(!mouseEvent) mouseEvent = event;
			var element = mouseEvent.toElement || mouseEvent.relatedTarget;
			
			console.log("DropdownMenu:stillActive: domElement=", menu.domElement, " movedto=", element);
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
			//console.log("DropdownMenu:hideMaybe: ul=", menu.domElement, " movedto=", element);
			
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
	DropdownMenu.prototype.addItem = function addItem(label, key, whenClicked, order, separator) {
		if(typeof key == "function" && whenClicked == undefined) {
			whenClicked = key;
			key = undefined;
		}
		
		var menu = this;
		
		if(menu.items.hasOwnProperty(label)) throw new Error("Menu already have an item with label=" + label);
		
		var item = menu.items[label] = new DropdownMenuItem({
			label: label, 
			whenClicked: whenClicked, 
			parentMenu: menu, 
			key: key, 
			orientation: menu.orientation, 
			order: order, 
			separator: separator
		});
		
		if(menu.orientation == "vertical") {
			// Each item is a table-row
			menu.itemWrapper.appendChild(item.domElement);
			item.domNode = item.domElement;
		}
		else if(menu.orientation == "horizontal") {
			// Each item is it's own table
			// Create cell to put the table in
			var cell = document.createElement("td");
			cell.appendChild(item.domElement);
			
			menu.itemWrapper.appendChild(cell);
			item.domNode = cell;
		}
		else throw new Error("Unknown orientation=" + menu.orientation);
		
		
		// Re-order items
		var order = [];
		for(var l in menu.items) {
			order.push(menu.items[l]);
		}
		order.sort(function(a, b) {
			if(a.order < b.order) return -1;
			else if(a.order > b.order) return 1;
			else return 0;
		});
		var lastOrder = -1;
		for(var i=0; i<order.length; i++) {
			if(order[i].order == lastOrder) {
				console.warn("Item " + order[i].lable + " has same order=" + order[i].order + " as " + order[i-1]);
			}
			menu.itemWrapper.appendChild(order[i].domNode);
			
			// Convenient for going to the next/previous menu item
			order[i].nextSibling = order[i+1];
			order[i].previousSibling = order[i-1];
		}
		
		menu.firstItem = order[0];
		menu.lastItem = order[order.length-1];
		
		console.log("DropdownMenu:addItem: label=" + label + " menu.orientation=" + menu.orientation);
		
		return item;
	}
	DropdownMenu.prototype.removeItem = function removeItem(item) {
		var menu = this;
		
		for(var label in menu.items) {
			if(menu.items[label] == item) {
				
				menu.itemWrapper.removeChild(item.domNode);
				delete menu.items[label];
				
				return SUCCESS;
			}
		}
		return FAIL;
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
		menuWidth = Math.max(menuWidth, menuRect.width);
		var windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		if(windowWidth) {
			console.log("menuLeft=" + menuLeft + " menuWidth=" + menuWidth + " windowWidth=" + windowWidth + " menuRect=" + JSON.stringify(menuRect));
			if( (menuLeft + menuWidth) > windowWidth) {
				console.log("Pullout " + menu.pullout + " menu doesn't fit on the right side! windowWidth=" + windowWidth + " menuLeft=" + menuLeft + " menuWidth=" + menuWidth);
				
				if( (parentItemRect.left - menuWidth) >= 0) {
					// It fits on the left side. Place it on left side
					//menuLeft = parentItemRect.left - menuWidth - borderWidth*2;
					menuLeft = windowWidth - menuWidth + 1;
				}
				else {
					console.warn("Pullout " + menu.pullout + " menu doesn't fit on the left side either! parentItemRect.left=" + parentItemRect.left + " menuWidth=" + menuWidth + " (" + (parentItemRect.left - menuWidth) + ") ");
					// Place it below parent
					menuLeft = windowWidth - menuWidth + 1;
					menuTop = parentItemRect.bottom;
				}
			}
		}
		
		menu.domElement.style.position="absolute";
		menu.domElement.style.minWidth = menuWidth + "px";
		menu.domElement.style.top = menuTop + "px";
		menu.domElement.style.left = menuLeft + "px";
		
		menu.visible = true;
		
		// Safari wont give focus to the element when clicking on it, so do it manually
		var item = menu.parentMenuItem;
		//var item = menu.firstItem;
		var label = item.domElement.getElementsByTagName("a")[0];
		label.focus();
		
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
				
				if(menu.items[item].domElement.hasAttribute("aria-expanded")) menu.items[item].domElement.setAttribute("aria-expanded", "false");
				
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
		
		if(menu.domElement.hasAttribute("aria-expanded")) menu.domElement.setAttribute("aria-expanded", "false");
		
		menu.domElement.style.display = "none";
		menu.domElement.blur(); // Reset hover effect on touch screens
		
		//menu.domElement.setAttribute("class", "hidden");
		
		menu.visible = false;
		
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
		
		item.whenClicked = options.whenClicked;
		
		item.order = options.order || 100;
		
		if(options.orientation == "vertical") {
			// Each item is a table row
			item.domElement = document.createElement("tr");
			item.wrapper = item.domElement;
		}
		else if(options.orientation == "horizontal") {
			// Each item is it's own table
			item.domElement = document.createElement("table");
			item.domElement.setAttribute("border", "0");
			item.domElement.setAttribute("cellspacing", "0");
			item.domElement.setAttribute("cellpadding", "0");
			
			item.wrapper = document.createElement("tr");
			item.domElement.appendChild(item.wrapper);
		}
		else throw new Error("Unknown orientation=" + options.orientation);
		
		item.separator = options.separator ? " separator" + options.separator : ""; // top or bottom
		
		item.domElement.setAttribute("class", "item" + item.separator);
		item.domElement.setAttribute("id", "dropdownMenu_" + label);
		item.domElement.setAttribute("role", "menuitem");
		
		
		item.activated = false;
		
		item.bullet = document.createElement("td");
		item.bullet.setAttribute("class", "bullet");
		item.wrapper.appendChild(item.bullet);
		
		var textHolder = document.createElement("td");
		
		item.text = document.createElement("a"); 
		item.text.href = "#"; // Need to be a link so it can be reached by screen reader
		
		item.text.setAttribute("class", "label");
		
		item.text.innerText = label;
		//item.text.innerText = item.order + " " + label;

		item.text.onfocus = function() {
			item.domElement.classList.add("hovering");
		}
		item.text.onblur = function() {
			item.domElement.classList.remove("hovering");
		}
		
		
		textHolder.appendChild(item.text);
		
		item.wrapper.appendChild(textHolder);
		
		if(QUERY_STRING["menuOrder"]) item.text.innerText = item.order + ": " + label;
		
		item.key = document.createElement("td");
		if(options.key) {
			item.key.innerText = options.key;
			item.key.setAttribute("class", "key");
		}
		else {
			item.key.setAttribute("class", "key empty");
		}
		item.wrapper.appendChild(item.key);
		
		item.pulloutIcon = document.createElement("td");
		item.pulloutIcon.setAttribute("class", "pulloutIcon");
		item.wrapper.appendChild(item.pulloutIcon);
		
		item.domElement.onclick = item.whenClicked;
		
		item.domElement.onmouseover = function() {
			//console.log("Mouse over: label=" + label);
			item.domElement.classList.add("hovering");
		}
		item.domElement.onmouseout = function() {
			//console.log("Mouse out: label=" + label);
			item.domElement.classList.remove("hovering");
		}
		
		item.subMenu = null;
		
		item.domElement.addEventListener("keydown", windowMenuItemKeyDown);
		function windowMenuItemKeyDown(keydownEvent) {
			if(!keydownEvent && event) keydownEvent = event;
			
			// Prevent appending the hashtag #
			//keydownEvent.preventDefault();
			//keydownEvent.stopPropagation();
			
			var keySpace= 32;
			var keyEnter = 13;
			var keyRightArrow = 39;
			var keyLeftArrow = 37;
			var keyDownArrow = 40;
			var keyUpArrow = 38;
			var keyHome = 36;
			var keyEnd = 35;
			var keyEsc = 27;
			
			var code = keydownEvent.keyCode || keydownEvent.charCode || keydownEvent.which;
			var key = keydownEvent.key;
			
			var target = keydownEvent.target;
			
			console.log("windowMenuItemKeyDown: key=" + keydownEvent.key + " keyCode=" + keydownEvent.keyCode + " target=", target + " (" + target.innerText + ")");
			
			// ref: https://www.w3.org/TR/wai-aria-practices/examples/menubar/menubar-1/menubar-1.html
			
			// ### pressing space or Enter on window menu
			if(key == "Space" || code == keySpace || key == "Enter" || code == keyEnter) {
				if(item.subMenu) openSubMenu();
				else {
					// Problem: Pressing Enter also presses enter on any item that becomes visible
					// Solution: Delay the action. And also prevent default!
					keydownEvent.preventDefault();
					keydownEvent.stopPropagation();
					setTimeout(function() {
						//item.domElement.click(); // Click is default when pressing enter
						item.whenClicked(keydownEvent);
					}, 150); // Need to be slower then the button release!? no. Just slow enough... 150ms is not slow enough
				}
				return false;
			}
			// ### pressing Escape key on window menu
			else if(key == "Escape" || code == keyEsc) {
				// Hide all menus and go into go into a edit mode
				item.parentMenu.hide(true, true);
				EDITOR.input = true;
			}
			// ### pressing Home key on window menu
			else if(key == "Home" || code == keyHome) {
				// Go to the first item in the menu
				var cell = item.parentMenu.domElement.firstChild;
				var label = cell.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: EDITOR.input=" + EDITOR.input + " Focusing label=", label, " on cell=", cell);
				label.focus();
			}
			// ### pressing End key on window menu
			else if(key == "End" || code == keyEnd) {
				// Go to the last item in the menu
				var cell = item.parentMenu.domElement.lastChild;
				var label = cell.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: EDITOR.input=" + EDITOR.input + " Focusing label=", label, " on cell=", cell);
				label.focus();
			}
			else if(key == "UpArrow" || code == keyUpArrow) {
				
				// Move focus to previous item
				var cell = item.domElement.previousSibling;
				if(!cell) cell = item.parentMenu.domElement.lastChild;
				var label = cell.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: Focusing label=", label, " on cell=", cell);
				label.focus();
				
			}
			// ### pressing down on window menu
			else if(key == "DownArrow" || code == keyDownArrow) {
				
				// If it has a submenu that will pull out under it, pressing down should pull it out
				if(item.subMenu && !item.parentMenu.parentMenu) {
					return openSubMenu(false);
				}
				
				// Move focus to next item
				var cell = item.domElement.nextSibling;
				if(!cell) cell = item.parentMenu.domElement.firstChild;
				var label = cell.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: Focusing label=", label, " on cell=", cell);
				label.focus();
			}
			// ### pressing right on window menu
			else if(key == "RightArrow" || code == keyRightArrow) {
				
				// If it has a submenu that will pull out to the right/side, pressing right should pull it out
				if(item.subMenu && item.parentMenu.parentMenu) {
					return openSubMenu(false);
				}
				
				// If we are in a menu that pulls out/down, we should go the the next menu
				if(item.parentMenu && item.parentMenu.parentMenu && !item.parentMenu.parentMenu.parentMenu) {
					var parentMenuItem = item.parentMenu.parentMenuItem;
					console.log("windowMenuItemKeyDown: parentMenuItem=", parentMenuItem);
					
					var menu = item.parentMenu.parentMenu;
					console.log("windowMenuItemKeyDown: menu=", menu);
					
					menu.hideSiblings(); // Hide all submenus
					
					var nextItem = parentMenuItem.nextSibling;
					if(!nextItem) nextItem = menu.firstItem;
					console.log("windowMenuItemKeyDown: nextItem=", nextItem);
					
					nextItem.domElement.click(); // Show next submenu
					
					var subMenu = nextItem.subMenu;
					console.log("windowMenuItemKeyDown: subMenu=", subMenu);
					
					if(subMenu) {
						var firstItem = subMenu.firstItem;
					console.log("windowMenuItemKeyDown: firstItem=", firstItem);
					var label = firstItem.domElement.getElementsByTagName("a")[0];
					}
					else {
						var label = nextItem.domElement.getElementsByTagName("a")[0];
						// Prevent click on the label
						keydownEvent.preventDefault(); 
					}
					
					console.log("windowMenuItemKeyDown: label=", label);
					label.focus();
					
					return false;
				}
				
				// Move focus to next item
				var nextItem = item.nextSibling;
				if(!nextItem) nextItem = item.parentMenu.firstItem;
				var label = nextItem.domElement.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: Focusing label=", label, " on nextItem=", nextItem);
				label.focus();
			}
			// ### pressing left on window menu
			else if(key == "LeftArrow" || code == keyLeftArrow) {
				
				// If we are in a submenu that was pulled out to the right, pressing left arrow should go back to parent menu
				if(item.parentMenu && item.parentMenu.parentMenu && item.parentMenu.parentMenu && item.parentMenu.parentMenu.parentMenu) {
					console.log("windowMenuItemKeyDown: Going back to left menu");
					item.parentMenu.hide(); // Hide this menu
					
					var leftMenu =  item.parentMenu.parentMenu;
					
					// We need a bounding rect to the parent opener so it knows where to show up
					var rect = leftMenu.parentMenuItem.domElement.getBoundingClientRect();
					leftMenu.show(rect); // Show parent/left menu
					
					// Focus on the item that opened this menu
					var parentMenuItem = item.parentMenu.parentMenuItem;
					var label = parentMenuItem.domElement.getElementsByTagName("a")[0];
					console.log("windowMenuItemKeyDown: label=", label);
					label.focus();
					
					return;
				}
				
				// If we are in a menu that pulls out/down, we should go the the left/last menu
				if(item.parentMenu && item.parentMenu.parentMenu && !item.parentMenu.parentMenu.parentMenu) {
					var parentMenuItem = item.parentMenu.parentMenuItem;
					console.log("windowMenuItemKeyDown: parentMenuItem=", parentMenuItem);
					
					var menu = item.parentMenu.parentMenu;
					console.log("windowMenuItemKeyDown: menu=", menu);
					
					menu.hideSiblings(); // Hide all submenus
					
					var lastItem = parentMenuItem.previousSibling;
					if(!lastItem) lastItem = menu.lastItem;
					console.log("windowMenuItemKeyDown: lastItem=", lastItem);
					
					lastItem.domElement.click(); // Show submenu
					
					var subMenu = lastItem.subMenu;
					console.log("windowMenuItemKeyDown: subMenu=", subMenu);
					
					var firstItem = subMenu.firstItem;
					console.log("windowMenuItemKeyDown: firstItem=", firstItem);
					
					var label = firstItem.domElement.getElementsByTagName("a")[0];
					console.log("windowMenuItemKeyDown: label=", label);
					label.focus();
					
					return;
				}
				
				// Move focus to last item
				var lastItem = item.previousSibling;
				if(!lastItem) lastItem = item.parentMenu.lastItem;
				var label = lastItem.domElement.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: Focusing label=", label, " on lastItem=", lastItem);
				label.focus();
			}
			// ### Pressing any key on the Window menu
			else {
				// Any other character searches the menu
				
				console.log("windowMenuItemKeyDown: item.subMenu?" + (item.subMenu) + " visible=" + (item.subMenu && item.subMenu.visible) + " active=" + (item.subMenu && item.subMenu.active) + " activated=" + (item.subMenu && item.subMenu.activated) + ""); 
				
				// If a submenu is opened, we want to do the search on that
				if(item.subMenu && (item.subMenu.visible || item.subMenu.active || item.subMenu.activated)) {
					var labels = item.subMenu.domElement.getElementsByTagName("a");
				}
				else {
					var labels = item.parentMenu.domElement.getElementsByTagName("a");
				}
				
				var character = String.fromCharCode(code).toLowerCase(); // keydownEvent.key ?
				
				for(var i=0, str, firstLetter; i<labels.length; i++) {
					str = labels[i].innerText.toLowerCase();
					firstLetter = str.charAt(0);
					console.log("windowMenuItemKeyDown: str=" + str + " firstLetter=" + firstLetter + " character=" + character + " (" + (firstLetter==character) + ")");
					if(firstLetter == character && labels[i] != target) {
						console.log("windowMenuItemKeyDown: Focusing label=", labels[i], "");
						labels[i].focus();
						return false;
					}
				}
				
				console.log("windowMenuItemKeyDown: Did not find character=" + character + " in labels=", labels);
				
			}
			
			
			function openSubMenu(focusLast) {
				console.log("windowMenuItemKeyDown: Opening sub menu");
				
				item.domElement.click(); // Opens the submenu
				
				item.parentMenu.hideSiblings(item.subMenu); // Hide all other submenus in this menu
				
				if(focusLast) {
					var cell = item.subMenu.domElement.lastChild;
				}
				else {
					var cell = item.subMenu.domElement.firstChild;
				}

				var label = cell.getElementsByTagName("a")[0];
				console.log("windowMenuItemKeyDown: Focusing label=", label, " (" + label.innerText + ") on cell=", cell);
				label.focus();
				
				// Prevent click on first item
				keydownEvent.preventDefault();
				
				return false;
			}
			
			
		}
		
		
	}
	DropdownMenuItem.prototype.activate = function activate() {
		this.bullet.setAttribute("class", "bullet active");
		this.activated = true;
	}
	DropdownMenuItem.prototype.deactivate = function deactivate() {
		this.bullet.setAttribute("class", "bullet inactive");
		this.activated = false;
	}
	DropdownMenuItem.prototype.setLabel = function setLabel(label) {
		this.text.innerText = label;
	}
	DropdownMenuItem.prototype.hide = function setLabel() {
		var item = this;
		
		if(item.domElement.hasAttribute("aria-expanded")) item.domElement.setAttribute("aria-expanded", "false");
		item.parentMenu.hide(true, true);
		
	}
	DropdownMenuItem.prototype.toggle = function setLabel() {
		if(this.activated) this.deactivate();
		else this.activate();
		
		return this.activated;
	}
	DropdownMenuItem.prototype.addSubmenu = function addSubmenu() {
		var item = this;
		
		if(item.parentMenu && item.parentMenu.parentMenu) {
			var pullout = "right";
			item.pulloutIcon.innerText = "►";
		}
		else {
			var pullout = "bottom";
			item.pulloutIcon.innerText = "▼"; // todo: These arrows doesn't work in old browsers. Dunno how to detect and replace !?'
		}
		item.pulloutIcon.setAttribute("class", "pulloutIcon " + pullout);
		
		if(!item.parentMenu) throw new Error("item.parentMenu=" + item.parentMenu);
		
		var stemParent = item.parentMenu;
		while(stemParent.parentMenu) {
			stemParent = stemParent.parentMenu;
		}
		
		item.subMenu = new DropdownMenu({parentMenu: item.parentMenu, orientation: "vertical", pullout: pullout});
		item.subMenu.parentMenuItem = item;
		
		item.domElement.setAttribute("class", "item hasSubmenu" + item.separator);
		item.domElement.setAttribute("aria-haspopup", "true");
		item.domElement.setAttribute("aria-expanded", "false");
		
		if(!item.domElement.onclick) {
			item.domElement.onclick = showSubmenu;
			item.domElement.addEventListener("mouseover", showSubmenuMaybe);
			item.domElement.setAttribute("class", "item hasSubmenu needClick" + item.separator);
		}
		else {
			item.domElement.addEventListener("mouseover", showSubmenu);
		}
		
		item.subMenu.hide(false);
		
		console.log("DropdownMenuItem:addSubmenu: pullout=" + pullout + " item.parentMenu=" + item.parentMenu + " item.parentMenu.parentMenu=" + (item.parentMenu && item.parentMenu.parentMenu));
		
		return item.subMenu;
		
		
		function showSubmenu(mouseEvent) {
			console.log("showSubmenu");
			
			if(!mouseEvent && typeof event != "undefined") mouseEvent = event;
			
			item.domElement.setAttribute("aria-expanded", "true");
			
			var rect = item.domElement.getBoundingClientRect();
			
			if(stemParent) stemParent.activated = true;
			
			item.subMenu.show(rect);
			
			// Prevent navigation on the link
			// Do not call preventDefault here or it would cause the submenu to hide when we move the mouse to a sibling!
			return false;
			
		}
		
		function showSubmenuMaybe() {
			//console.log("showSubmenuMaybe");
			if(stemParent && stemParent.activated) {
				
				item.parentMenu.hideSiblings(item.subMenu);
				showSubmenu();
			}
			
		}
		
	}
	
	
	var dropdownMenuRoot;
	EDITOR.windowMenu = {
		add: function addWindowMenuItem(label, where, whenClicked, separator, keyComboFunction) {
			/*
				Example:
				
				where = ["File", "Save", 1]
				
				separator = top or bottom
				
			*/
			
			if(typeof separator == "function" && keyComboFunction == undefined) {
				keyComboFunction = separator;
				separator = undefined;
			}
			
			if(separator !== undefined) {
				if(separator != "top" && separator != "bottom") throw new Error("Fourth argument separator=" + separator + " should be either top or bottom!")
			}
			
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
				
				// Add top level menu entries to control the order
				dropdownMenuRoot.addItem(S("Editor"), undefined, undefined, 1);
				dropdownMenuRoot.addItem(S("File"), undefined, undefined, 2);
				dropdownMenuRoot.addItem(S("Edit"), undefined, undefined, 3);
				dropdownMenuRoot.addItem(S("View"), undefined, undefined, 4);
				dropdownMenuRoot.addItem(S("Navigate"), undefined, undefined, 5);
				dropdownMenuRoot.addItem(S("Tools"), undefined, undefined, 6);
				dropdownMenuRoot.addItem("Node.js", undefined, undefined, 7);
				
				// Add key bindings
				
				var showMenu = function(item) {
					item.domElement.click(); // Opens the submenu
					
					item.parentMenu.hideSiblings(item.subMenu); // Hide all other submenus in this menu
					
					var cell = item.subMenu.domElement.firstChild;
					
					var label = cell.getElementsByTagName("a")[0];
					label.focus();
					
					EDITOR.input = false;
					
					return false;
				}
				
				// Only bother with the standard menu shortcuts. ref: https://en.wikipedia.org/wiki/Table_of_keyboard_shortcuts
				EDITOR.bindKey({desc: "Open File window menu", charCode: 70, combo: ALT, fun: // Alt+F
					function showFileMenu() {
						return showMenu(dropdownMenuRoot.items[S("File")]);
}
				});
				EDITOR.bindKey({desc: "Open Edit window menu", charCode: 69, combo: ALT, fun: // Alt+E
					function showEditMenu() {
						return showMenu(dropdownMenuRoot.items[S("Edit")]);
					}
				});
				EDITOR.bindKey({desc: "Open View window menu", charCode: 86, combo: ALT, fun: // Alt+V
					function showViewMenu() {
						return showMenu(dropdownMenuRoot.items[S("View")]);
					}
				});
				
				// Key to activate the root window menu (Ctrl+Esc)
				EDITOR.bindKey({desc: "Focus window menu", charCode: 27, combo: CTRL, fun:
					function focusWindowMenu() {
						console.log("windowMenu: Focusing on Window menu ...");
						
						var item = dropdownMenuRoot.items[S("Editor")];
						var label = item.domElement.getElementsByTagName("a")[0];
						
						console.log("windowMenu: label=", label);
						
						label.focus();
						
						EDITOR.input = false;
						return false;
					}
				});
				
			}
			
			if(typeof label != "string") throw new Error("label=" + label + " need to be a string!");
			if(!Array.isArray(where)) throw new Error("Where to put the mnu item? Second argument (where) needs to be an array!");
			if(typeof whenClicked != "function") throw new Error("whenClicked=" + whenClicked + " need to be a function!");
			
			var order = 1000;
			var parentOrder = 1000;
			if( UTIL.isNumeric(where[where.length-1]) ) order = where.pop();
			if( UTIL.isNumeric(where[where.length-1]) ) parentOrder = where.pop();
			
			var menu = dropdownMenuRoot;
			var item;
			for(var i=0; i<where.length; i++) {
				item = menu.items[ where[i] ];
				
				if(!item) {
					item = menu.addItem(where[i], undefined, undefined, parentOrder);
				}
				
				menu = item.subMenu;
				if(!menu) {
					menu = item.addSubmenu();
				}
			}
			
			if(menu == dropdownMenuRoot) var keyCombo = null; // Don't show key combos in top level menus
			else var keyCombo = EDITOR.getKeyFor(keyComboFunction || whenClicked);
			
			
			var action = function menuItemClick(clickEvent) {
				var file = EDITOR.currentFile;
				var combo = getCombo(clickEvent);
				var character = null;
				var charCode = 0;
				var direction = "down";
				
				EDITOR.input = true; // Some commands require the editor canvas to be in focus
				// Assume that operations shoud be done in the editor, and not not DOM elements
				
				whenClicked(file, combo, character, charCode, direction, clickEvent);
				
			}
			
			item = menu.addItem(label, keyCombo, action, order, separator);
			
			if(item == undefined) throw new Error("Failed to add item!? menu=", menu, " label=", label, " ");
			
			return item;
			
		},
		remove: function removeWindowMenuItem(menuItem) {
			
if(menuItem.parentMenu) {
			menuItem.parentMenu.removeItem(menuItem);
			}
			else {
				console.warn("Unable to remove menu item: ", menuItem);
			}

		},
		update: function updateWindowMenuItem(menuItem, options) {
			
			if(!menuItem instanceof DropdownMenuItem) throw new Error("menuItem is not a dropdown menu item: ", menuItem);
			
			if(options.active === true) menuItem.activate();
			else if(options.active === false) menuItem.deactivate();
			
			if(options.label) menuItem.setLabel(options.label);
			
			if(options.action) menuItem.setAction(options.action);
			
		},
		enable: function disableWindowMenu() {
			var windowMenu = document.getElementById("windowMenu");
			windowMenu.style.display="block";
			
			var windowMenuHeight = document.getElementById("windowMenuHeight");
			windowMenuHeight.style.display="block";
			
			EDITOR.windowMenu.isEnabled = true;
			
		},
		disable: function enableWindowMenu() {
			var windowMenu = document.getElementById("windowMenu");
			windowMenu.style.display="none";
			
			var windowMenuHeight = document.getElementById("windowMenuHeight");
			windowMenuHeight.style.display="none";
			
			EDITOR.windowMenu.isEnabled = false;
			
			EDITOR.stat("disable_windowMenu");
			
		},
		hide: function hideWindowMenu() {
			// Hides the dropdown menu. Use EDITOR.windowMenu.disable() to hide the whole menu
			if(dropdownMenuRoot) dropdownMenuRoot.hide(true);
		},
		click: function clickWindowMenu(where, onlyifactive) {
			// todo: able to automate clicks on menu
		},
		isVisible: true
	}
	
	// TEST-CODE-START
	
	
	// TEST-CODE-END
	
	
	EDITOR.ctxMenu = {
		add: function addCtxMenuItem(htmlText, position, callback, keyboardFunction) {
			
			// USE EDITOR.ctxMenu.addItem instead!!
			
			if(typeof position == "function" && typeof callback == "number") {
				var posTemp = callback;
				callback = position;
				position = posTemp;
			}
			else if(typeof position == "function" && callback == undefined) {
				callback = position;
				position = undefined;
			}
			else if(typeof position == "function" && typeof callback == "function") {
				keyboardFunction = callback;
				callback = position;
				position = undefined;
			}
			
			if(typeof htmlText != "string") throw new Error("EDITOR.ctxMenu.add: First argument htmlText need to be a (HTML) string!");
			if(typeof callback != "function") throw new Error("Menu item htmlText=" + htmlText + " has to callback (click) function!");
			
			return EDITOR.ctxMenu.addItem({
				text: htmlText,
				order: position,
				callback: callback,
				keyCombo: keyboardFunction,
				temp: false
			});
				
			
			
			
		},
		addTemp: function addTempCtxMenuItem(htmlText, addSeparator, callback, keyboardFunction) {
			/*
				These items are removed when the menu is hidden
				
				USE EDITOR.ctxMenu.addItem with option.temp=true !
			*/
			
			if(typeof htmlText == "object") throw new Error("First argument to EDITOR.ctxMenu.addTemp should be a HTML or plain string. Did you mean to use EDITOR.ctxMenu.addItem ?");
			
			if(typeof addSeparator == "function" && callback == undefined) {
				callback = addSeparator;
				addSeparator = false;
			}
			else if(typeof addSeparator == "function" && typeof callback == "function") {
				keyboardFunction = callback;
				callback = addSeparator;
				addSeparator = false;
			}
			
			if(typeof keyboardFunction != "undefined" && typeof keyboardFunction != "function") throw new Error("keyboardFunction=" + keyboardFunction + " should be undefined or a function!");
			
			return EDITOR.ctxMenu.addItem({
				temp: true,
				text: htmlText,
				callback: callback,
				keyCombo: keyboardFunction,
				separator: addSeparator
			});
			
		},
		addItem: function addItem(options, trap) {
			
			/*
				Adds an item to the context menu.
				Items can be temporary (options.temp) or "general" (always show up no matter where you click)
				
				Don't forget to call EDITOR.ctxMenu.hide() after the item has been clicked!
				
			*/
			
			if(typeof options != "object") throw new Error("First argument to EDITOR.ctxMenu.addItem need to be an options object!");
			if(trap != undefined) throw new Error("EDITOR.ctxMenu.addItem only takes one argument (an options object)!");
			
			var allowedOptions = ["text", "temp", "callback", "keyCombo", "order", "separator"];
			
			for(var key in options) {
				if(allowedOptions.indexOf(key) == -1) throw new Error("Unrecognized option: " + key);
			}
			
			if(options.text == undefined) throw new Error("option text is requred!");
			if(options.callback != undefined && typeof options.callback != "function") throw new Error("option callback needs to be a function!");
			if(options.keyCombo != undefined && typeof options.keyCombo != "function") throw new Error("option keyCombo needs to be a function!");
			
			//if(options.temp && options.separator == undefined) options.separator = true;
			
			if(options.temp) {
				var menu = document.getElementById("contextmenuTemp");
			}
			else {
				var menu = document.getElementById("contextmenuGeneral");
			}
			
			console.log("EDITOR.ctxMenu.addItem: text=" + options.text + " menu=", menu);
			
			var li = document.createElement("li");
			li.setAttribute("class", "item");
			
			var bullet = document.createElement("span");
			bullet.setAttribute("class", "bullet inactive");
			
			li.appendChild(bullet);
			
			var menuText = document.createElement("span");
			menuText.setAttribute("class", "text");
			menuText.innerHTML = options.text;
			//menuText.innerHTML = options.order + " " + options.text;
			
			li.appendChild(menuText);
			
			var keyCombo = EDITOR.getKeyFor(options.keyCombo || options.callback);
			var keyComboEl = document.createElement("span");
			keyComboEl.setAttribute("class", "key");
			if(keyCombo) keyComboEl.innerText = keyCombo;
			li.appendChild(keyComboEl);
			
			
			li.setAttribute("aria-label", options.text + (keyCombo ? " " + keyCombo : ""));
			
			console.warn("EDITOR.ctxMenu.addItem: Adding menu item: " + options.text + " keyCombo=" + keyCombo);
			
			if(options.callback) {
				li.onclick = clickOnCtxItem;
				li.onmouseup = mouseupOnCtxItem;
				li.onkeyup = keyupOnCtxItem;
				
				// An id is needed so that the menu item can be targeted while recording
				var fName = UTIL.getFunctionName(options.callback);
				if(fName.length == 0) throw new Error("callback function has no name!");
				var liId = "ctxMenu_" + fName;
				if(document.getElementById(liId)) {
					throw new Error("fName=" + fName + " is not a unique function name among context menu items! Or there is still a reference to an old element!");
				}
				li.id = liId;
			}
			
			console.log("EDITOR.ctxMenu.addItem: li.id=" + li.id);
			
			var preventClick = false;
			
			function keyupOnCtxItem(keyEvent) {
				// Number 13 is the "Enter" key on the keyboard
				if (keyEvent.keyCode === 13) {
					console.log("EDITOR.ctxMenu.addItem: Pressed enter on item!");
					
					// Cancel the default action, if needed
					keyEvent.preventDefault();
					
					EDITOR.ctxMenu.hide(); // note: it gives input(focus) back to the editor canvas!
					
					if(options.callback) options.callback(EDITOR.currentFile,  getCombo(keyEvent), null, 0, "down", keyEvent);
					
				}
			}
			
			function mouseupOnCtxItem(mouseUpEvent) {
				preventClick = true; // Prevent the click event from firing (preventDefault() had no effect)
				console.log("EDITOR.ctxMenu.addItem: mouseupOnCtxItem! preventClick=" + preventClick);
				ctxItemClickAction(mouseUpEvent);
			}
			
			function clickOnCtxItem(clickEvent) {
				if(preventClick) {
					console.log("EDITOR.ctxMenu.addItem: clickOnCtxItem prevented!");
					preventClick = false;
					return false;
				}
				console.log("EDITOR.ctxMenu.addItem: clickOnCtxItem! preventClick=" + preventClick);
				ctxItemClickAction(clickEvent);
			}
			
			function ctxItemClickAction(someEvent) {
				console.log("EDITOR.ctxMenu.addItem: ctxItemClickAction! someEvent.ctrlKey=" + someEvent.ctrlKey);
				// Give the same function parameters as key bound events
				if(options.callback) options.callback(EDITOR.currentFile, getCombo(someEvent), null, 0, "down", someEvent);
			}
			
			var defaultPosition = 10;
			
			if(options.order) {
				li.setAttribute("position", options.order);
			}
			else {
				li.setAttribute("position", defaultPosition);
			}
			
			menu.appendChild(li);
			
			// Add the separator before reordering, because it also needs to be ordered
			if(options.separator) {
				var separator =  document.createElement("li");
				separator.classList.add("sep");
				separator.setAttribute("addedby", fName);
				
				if(options.order) {
					separator.setAttribute("position", options.order);
				}
				else {
					separator.setAttribute("position", defaultPosition);
				}
				console.log("EDITOR.ctxMenu.addItem: Added separator=", separator, " fName=" + fName + " options.order=" + options.order);
				
				menu.appendChild(separator);
			}

			// Re-order positions of the menu items
			var itemCount = options.temp ? 100 : 200; // Temporary items start with tabindex 100, Ordinary items start with tabindex 200
			var items = Array.prototype.slice.call( menu.getElementsByTagName("LI"), 0 ); // Convert DOM array to normal array for convenience
			console.log("EDITOR.ctxMenu.addItem: items=", items);
			items.sort(function sortItemsByPosition(a,b) {
				var pA = parseInt(a.getAttribute("position"));
				var pB = parseInt(b.getAttribute("position"));
				
				console.log("EDITOR.ctxMenu.addItem: Sorting a=", a, " b=", b, " pA=" + pA + " vs pB=" + pB + "  " + pA + ">" + pB + "?" + (pA> pB));
				
				if(isNaN(pA)) throw new Error("NaN: No position attribute in a=" + (a.innerHTML ? a.innerHTML : a) );
				if(isNaN(pB)) throw new Error("NaN: No position attribute in b=" + b + " b.outerHTML=" + b.outerHTML + " " );
				
				if(pA > pB) return 1;
				else if(pB > pA) return -1;
				else return 0;
				
			});
			items.forEach(function (li) {
				itemCount++;
				
				console.log("EDITOR.ctxMenu.addItem: itemCount=" + itemCount + " Reappening li=", li);
				menu.appendChild(li);
				
				// tabindex is needed in order for tab navigating to work (in Chrome)
				li.setAttribute("tabindex", itemCount);
				
			});
			
			
			// Prevent double separators
			if(separator && menu.lastChild.className == "sep" && menu.lastChild != separator) menu.removeChild(separator);
			
			
			if(!CONTEXT_MENU_IS_FULL_SCREEN && options.temp) {
				/*
					Adding more items makes the menu higher
					Make sure no part is hidden below the view
					
					EDITOR.ctxMenu.show() should take care of this beause it waits some time before moving the mnu. But just in case...
				*/
				
				var contextmenu = document.getElementById("contextmenu");
				var offsetHeight = parseInt(contextmenu.offsetHeight); // height of the element including vertical padding and borders
				var offsetWidth = parseInt(contextmenu.offsetWidth);
				var itemHeight = parseInt(li.offsetHeight);
				var posY = parseInt(contextmenu.style.top);
				var borderOrSomething = 3;
				
				console.log("EDITOR.ctxMenu.addItem: itemHeight=" + itemHeight + " contextmenu.style.top=" + contextmenu.style.top + " contextmenu.style.bottom=" + contextmenu.style.bottom + " EDITOR.height=" + EDITOR.height + " offsetHeight=" + offsetHeight);
				
				if(posY > (EDITOR.height - offsetHeight)) {
					posY = EDITOR.height - offsetHeight - borderOrSomething;
					console.log("EDITOR.ctxMenu.addItem: Updating posY=" + posY);
					contextmenu.style.top = posY + "px";
				}
			}
			
			return li;
			
		},
		remove: function removeCtxMenuItem(menuElement) {
			
			if(!menuElement) throw new Error("EDITOR.ctxMenu.remove was called with no function parameters! menuElement=" + menuElement);
			if(!menuElement.tagName) throw new Error("EDITOR.ctxMenu.remove argument menuElement is not a HTML node!")
			
			if(menuElement.parentNode == undefined) {
				console.warn("menuElement has no parent! menuElement.innerHTML=" + menuElement.innerHTML);
				return;
			}
			
			var menu = menuElement.parentNode;
			
			var positionIndex = Array.prototype.indexOf.call(menu.children, menuElement);
			
			/*
				Problem: The item will still linger in memory and be accessible by calling document.getElementById
			*/
			
			menuElement.onclick = null;
			menuElement.onmouseup = null;
			menuElement.onkeyup = null;
			
			console.log("EDITOR.ctxMenu.remove: id=" + menuElement.id);
			
			menuElement.id = "removeMe";
			
			menu.removeChild(menuElement);
			
			return positionIndex; // So another node can be inserted at this position
			
		},
		activate: function activateContextMenuItem(menuElement) {
			if(menuElement == undefined) throw new Error("First argument menuElement=" + menuElement + " must be defined!");
			var li = menuElement;
			
			var child = li.childNodes;
			var bullet = child[0];
			
			bullet.classList.add("active");
			bullet.classList.remove("inactive");
		},
		deactivate: function activateContextMenuItem(menuElement) {
			if(menuElement == undefined) throw new Error("First argument menuElement=" + menuElement + " must be defined!");
			var li = menuElement;
			
			var child = li.childNodes;
			var bullet = child[0];
			
			bullet.classList.remove("active");
			bullet.classList.add("inactive");
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
		hide: function hideCtxMenu() {
			
			console.log(UTIL.getStack("Hide context menu"));
			
			var menu = document.getElementById("contextmenu");
			
			if(!menu.classList.contains("visible")) {
				console.warn("Context menu already hidden. No need to hide it!");
				return;
			}
			
			recoverFromFullScreenMenu(menu);
			
			// We can't use .display="none" or it will not be possible to measure the size of the menu!
			menu.classList.remove("visible");
			
			
			// Move it elsewhere so we don't see the ghost border in Android browser
			menu.style.top = -1000 + "px";
			menu.style.left = -1000 + "px";
			
			// Clear temorary menu items
			var tempItems = document.getElementById("contextmenuTemp");
			while(tempItems.firstChild){
				EDITOR.ctxMenu.remove(tempItems.firstChild);
			}
			
			// Blur selected item
			if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
			
			if(EDITOR.currentFile) EDITOR.input = true; // Give focus back for text entry
			
		},
		show: function showCtxMenu(clickEventOrTargetElement) {
			// The clickEventOrTargetElement parameter is used to figure out what the user clicked on, 
			// eg. to get the context. It can be an event, or the element that was supposably clicked on.
			
			if(clickEventOrTargetElement == undefined && typeof event != "undefined") clickEventOrTargetElement = event;
			if(clickEventOrTargetElement == undefined) throw new Error("First argument to EDITOR.ctxMenu.show() needs to be a mouse/click event or a DOM target element!");
			
			console.log("showCtxMenu: Showing context menu! clickEventOrTargetElement=" + clickEventOrTargetElement + " ctrl?" + clickEventOrTargetElement.ctrlKey + " callStack:" + UTIL.getStack("showCtxMenu"));
			
			if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("ctxMenu") != -1) return new Error("Menu is disabled by query string!");;
			
			if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
			if(typeof clickEventOrTargetElement.preventDefault == "function") clickEventOrTargetElement.preventDefault();
			
			if(clickEventOrTargetElement.target) {
				// It's a click event
				var target = clickEventOrTargetElement.target;
				var combo = getCombo(clickEventOrTargetElement);
			}
			else {
				// It's a DOM element!
				// Check to make sure it *is* a DOM element
				if( clickEventOrTargetElement.nodeType!=1 || typeof clickEventOrTargetElement.style != "object" ) throw new Error("First parameter (" + clickEventOrTargetElement + ") does not appear to be a DOM element!");
				
				var target = clickEventOrTargetElement;
				var combo = getCombo(undefined); // assume no alt,ctrl,shift was pressed
			}
			
			
			EDITOR.input = false;
			
			clearSelection();
			
			// Clear temorary menu items
			var tempItems = document.getElementById("contextmenuTemp");
			console.log("showCtxMenu: tempItems=", tempItems);
			while(tempItems.firstChild){
				EDITOR.ctxMenu.remove(tempItems.firstChild);
			}
			
			
			if(ctxMenuVisibleOnce == false) EDITOR.renderNeeded();
			ctxMenuVisibleOnce = true;
			
			var menu = document.getElementById("contextmenu");
			
			
			var notUpOnMenu = 6; // displace the menu so that the mouse-up event doesn't fire on it
			var menuDownABit = 10;
			
			//recoverFromFullScreenMenu(menu);
			
			var touchX = EDITOR.mouseX;
			var touchY = EDITOR.mouseY;
			
// We only care about the caret if it's the file canvas context menu
			if(target.className=="fileCanvas") var caret = EDITOR.mousePositionToCaret();
			else var caret = null;
			
			console.log("showCtxMenu: caret=" + JSON.stringify(caret));
			
			var posX = touchX + notUpOnMenu;
			var posY = touchY + menuDownABit;
			
			var f = EDITOR.eventListeners.ctxMenu.map(funMap);
			for(var i=0, f; i<f.length; i++) {
				f[i](EDITOR.currentFile, combo, caret, target);
			}
			
			
			// Make sure there is a separator between temp and regular menu items
			// But don't show a separator if the last item in temp already has a separator
			
			var tempMenu = document.getElementById("contextmenuTemp");
			var lastTempItem = tempMenu.lastChild;
			if(lastTempItem && !lastTempItem.classList.contains("sep")) {
				var separator = document.createElement("li");
				separator.classList.add("sep");
				separator.setAttribute("position", "100");
				separator.setAttribute("addedby", "EDITOR.ctxMenu.show: separator between temp and regular");
				tempMenu.appendChild(separator);
			}
			
			
			
			// Make sure it fits on the screen!!
			/*
				setTimeout(function() { // Wait for div content to load
				
				}, 100);
			*/
			var offsetHeight = parseInt(menu.offsetHeight); // height of the element including vertical padding and borders
			var offsetWidth = parseInt(menu.offsetWidth);
			
			//alert("offsetHeight=" + offsetHeight + " offsetWidth=" + offsetWidth);
			
			console.log("showCtxMenu: menu.offsetHeight=" + offsetHeight + " menu.offsetWidth=" + offsetWidth + " EDITOR.width=" + EDITOR.width + " EDITOR.height=" + EDITOR.height + " EDITOR.mouseX=" + EDITOR.mouseX + " EDITOR.mouseY=" + EDITOR.mouseY);
			
			/*
				When long touching the menu comes up underneath and a menu click is triggered!
				So bring in the menu outside of the touch, and then correct the position
			*/
			
			var orgX = posX; // For debugging info
			var orgY = posY;
			
			var borderOrSomething = 3;
			if((posY+offsetHeight) > EDITOR.height) posY = EDITOR.height - offsetHeight - borderOrSomething;
			if((posX+offsetWidth) > EDITOR.width) {
posX = EDITOR.width - offsetWidth;
				console.log("showCtxMenu: Placing the menu inside the screen area (the clicks was far to the right) EDITOR.width=" + EDITOR.width + " menu.offsetWidth=" + menu.offsetWidth + " new posX=" + posX + " orgX=" + orgX + " EDITOR.mouseX=" + EDITOR.mouseX);
				
				if(posX <= EDITOR.mouseX) {
					// Place the menu on the left side
					console.log("showCtxMenu: Placing the menu on the left side because posX=" + posX + " <= " + EDITOR.mouseX + "");
					posX = EDITOR.mouseX - offsetWidth - notUpOnMenu;
				}
			}
			
			if(posX < 0) posX = 0;
			if(posY < 0) posY = 0;
			
			var belowTouch = !((touchX < posX || touchX > posX + offsetWidth) && (touchY < posY || touchY > posY + offsetHeight));
			
			console.log("showCtxMenu: EDITOR.touchDown=" + EDITOR.touchDown + " belowTouch=" + belowTouch + " touchX=" + touchX + " posX=" + posX +
			" offsetWidth=" + offsetWidth + " touchY=" + touchY + " posY=" + posY + " offsetHeight=" + offsetHeight +
			" orgX=" + orgX + " orgY=" + orgY + " EDITOR.width=" + EDITOR.width + " EDITOR.height=" + EDITOR.height +
			" menu.style.width=" + menu.style.width + " menu.style.height=" + menu.style.height);
			
			if(EDITOR.touchDown && belowTouch) {
				
				menu.style.top = posY + "px";
				menu.style.left = posX + "px";
				
				var interval = setInterval(waitForTouchUp, 50);
				var timeout = setTimeout(giveUp, 1500);
			}
			else {
				menu.style.top = posY + "px";
				menu.style.left = posX + "px";
				
				fullScreenMenuMaybe();
			}
			
			menu.classList.add("visible");
			
			
			//menu.style.height = "100%";
			
			console.log("showCtxMenu: menu.style.visibility=" + menu.style.visibility);
			
			console.log("showCtxMenu: menu.childNodes=", menu.childNodes);
			console.log("showCtxMenu: menu.children=", menu.children);
			
			console.log("showCtxMenu: menu=", menu);
			console.log("showCtxMenu: menu.childNodes[0]=", menu.childNodes[0]);
			
			// element[0] is the temp-holder
			menu.children[1].focus(); // Focus the first element
			
			menu.onmouseover = function() {
				menu.children[1].blur(); // Don't focus child elements if we have a mouse
			}
			
			return true;
			
			
			function waitForTouchUp() {
				console.log("showCtxMenu: waitForTouchUp:");
				if(typeof event != "undefined" && typeof event.preventDefault == "function") event.preventDefault();
				if(typeof clickEvent != "undefined" && typeof clickEvent.preventDefault == "function") clickEvent.preventDefault();
				clearSelection();
				
				//var offsetHeight = parseInt(menu.offsetHeight);
				//if((posY+offsetHeight) > EDITOR.height) posY = EDITOR.height - offsetHeight;
				
				if(!EDITOR.touchDown) {
					console.log("TshowCtxMenu: here where no touch down!");
					giveUp();
					fullScreenMenuMaybe();
				}
				else {
					console.log("showCtxMenu: There was a touch down!");
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
				console.log("showCtxMenu: fullScreenMenuMaybe: offsetHeight=" + offsetHeight + " EDITOR.height=" + EDITOR.height + " EDITOR.width=" + EDITOR.width);
				if(offsetHeight > EDITOR.height || offsetWidth*1.1 > EDITOR.width || EDITOR.width < 500) {
					// Hide everything besides the menu
					console.log("showCtxMenu: fullScreenMenuMaybe: Entering full screen menu ...");
					fullScreenMenu(menu);
				}
				else {
					console.log("showCtxMenu: fullScreenMenuMaybe: No need to enter full screen menu");
					menu.style.top = posY + "px";
					menu.style.left = posX + "px";
				}
			}
			
		}
	}
	
	EDITOR.virtualDisplay = {
		started: false, // If the virtual display has started
		open: false, // If the browser window with the VNC client is open
		_win: null, // The browser window
		width: Math.round(   Math.min(  1000, screen.width, Math.max(screen.width/3, 800)  )   ),
		height: Math.round(   Math.min(  1000, screen.height-110, Math.max(screen.height, 900)  )   ),
		start: function(show, preferredWith, preferredHeight, callback, recurse) {
			
			console.warn("EDITOR.virtualDisplay.start()");
			
			var desktopWidth = preferredWith || EDITOR.virtualDisplay.width ;
			var desktopHeight = preferredHeight || EDITOR.virtualDisplay.height;
			
			if(recurse == undefined) recurse = 0;
			
			CLIENT.cmd("display.start", {width: desktopWidth, height: desktopHeight}, function displayStarted(err, info) {
				if(err) {
					if(callback) callback(err);
					else alertBox(err.message);
					callback = null;
					return;
				}
				
				console.log("display.start: info=" + JSON.stringify(info));
				
				EDITOR.virtualDisplay.password = info.password;
				EDITOR.virtualDisplay.port = info.port;
				EDITOR.virtualDisplay.width = info.width;
				EDITOR.virtualDisplay.height = info.height;
				EDITOR.virtualDisplay.started = true;
				
				var f = EDITOR.eventListeners.virtualDisplay.map(funMap);
				for(var i=0; i<f.length; i++) f[i]("start");
				
				if(show) EDITOR.virtualDisplay.show(undefined, undefined, callback, recurse);
				else if(callback) callback(null);
				
				callback = null;
			});
			
			return PREVENT_DEFAULT;
		},
		stop: function() {
			
			console.warn("EDITOR.virtualDisplay.stop()");
			
			EDITOR.virtualDisplay.started = false;
			
			var f = EDITOR.eventListeners.virtualDisplay.map(funMap);
			for(var i=0; i<f.length; i++) f[i]("stop");
			
			return PREVENT_DEFAULT;
		},
		show: function(preferredWith, preferredHeight, callback, recurse) {
			console.warn("EDITOR.virtualDisplay.show()");
			
			if(typeof preferredWith == "function" && preferredHeight == undefined && callback == undefined) {
				callback = preferredWith;
				preferredWith = undefined;
			}
			
			if(recurse == undefined) recurse = 0;
			if(typeof callback != "function") throw new Error("callback=" + callback + " (" + (typeof callback) + ")");
			
			if(!EDITOR.virtualDisplay.started) return EDITOR.virtualDisplay.start(true, preferredWith, preferredHeight, callback, ++recurse);

			// The display should be running, but check status just in case! (user worker might have restarted)
			console.log("EDITOR.virtualDisplay.show: Checking display.status...");
			CLIENT.cmd("display.status", function checkedDisplayStatus(err, status) {
				console.log("EDITOR.virtualDisplay.show: Got display.status: " + JSON.stringify(status));
				if(err) {
					callback(new Error("Unable to get display.status! Error: " + err.message));
					callback = null;
					return;
				}
				
				if(recurse > 3) return callback(new Error("Too much recursion! status=" + JSON.stringify(status, null, 2) + " recurse=" + recurse + ""));
				
				if(status.noDisplays) return EDITOR.virtualDisplay.start(true, preferredWith, preferredHeight, callback, ++recurse);
				
				for(var displayId in status) {
					if( status[displayId].started ) return openWindow();
					else if( status[displayId].starting ) return setTimeout(openWindow, 1000);
					else if( status[displayId].stopping ) return callback(new Error("The display is being stopped. Please try again in a few seconds..."));
					else throw new Error("status=" + JSON.stringify(status));
				}
				
			});
			
			
			return PREVENT_DEFAULT;
			
			function openWindow() {
				console.log("EDITOR.virtualDisplay.show: Opening window...");
				
			if(EDITOR.virtualDisplay.open) {
				if(callback) callback(null);
				
				return PREVENT_DEFAULT;
			}
			
				/*
					problem: We need to access port.user.domain.tld and will get a cross-origin error!
					solution: Use /noVNC and add Access-Control-Allow-Origin * to port.user.domain.tld
				*/
				
if(EDITOR.user.domain) {
// Certificate might not yet have been registered, so we use http:
// If you would use the TLD and the domain would not yet have been registered we would get cert errors
					//var urlHost = "http://" + EDITOR.user.domain + "/vnc_/";
					var urlHost = "noVNC/";
					var hostQuery = EDITOR.virtualDisplay.port + "." + EDITOR.user.domain;
				}
				else {
					var urlHost = "noVNC/";
					var hostQuery = window.location.hostname + "&port=" + EDITOR.virtualDisplay.port;
				}
				
					var url = urlHost + "vnc.html?host=" + hostQuery + "&autoconnect=true"
				
					// If we set a password, the user will never get the password prompt!
					if(EDITOR.virtualDisplay.password) url = url + "&password=" + encodeURIComponent(EDITOR.virtualDisplay.password);
					
					
				var width = EDITOR.virtualDisplay.width;
			var height = EDITOR.virtualDisplay.height + 1;
			var top = 0;
			var left = screen.width-EDITOR.virtualDisplay.width;
			
				var winLoadedCalled = false;
				
				console.warn("EDITOR.virtualDisplay calling EDITOR.createWindow ");
			var theWindow = EDITOR.createWindow({url: url, width: width, height: height, top: top, left: left, waitUntilLoaded: true}, winLoaded);
			
setTimeout(function winNeverLoaded() {
					if(!winLoadedCalled) {
						throw new Error("winLoaded event never called when opening desktop window! (likely stopped by popup blocker)");
					}
				}, 15000); // Window might get killed by popup stopper and we have to wait for the retry dialog...
				
				return PREVENT_DEFAULT;
				
				
				function winLoaded(err, win) {
					winLoadedCalled = true;
					console.log("EDITOR.virtualDisplay window loaded!");
					
					if(err && err.code != "CROSS_ORIGIN") return alertBox("Problem opening window for desktop: " + err.message);
				
				//alertBox("Window loaded! EDITOR.virtualDisplay.open=" + EDITOR.virtualDisplay.open + " (before)");
				
				if(callback) callback(null);
				
					if(!win) return;
					
					
					EDITOR.virtualDisplay.open = true;
					EDITOR.virtualDisplay._win = win || theWindow;
					
					//win.resizeTo(width, height);

// Enable scaling
					var sel = win.document.getElementById("noVNC_setting_resize");
					if(sel) {
						sel.value = "scale";
var evt = win.document.createEvent("HTMLEvents");
evt.initEvent("change", false, true);
sel.dispatchEvent(evt);
					}
					
					try {
// These might not exist depending on the version of noVNC
win.document.getElementById("noVNC_control_bar_anchor").style.display="none"; // Not needed
				win.document.getElementById("noVNC_canvas").style.margin = "0px";
				win.document.getElementById("noVNC_status").style.display="none"; // Flashes so fast we can't read what it says
							
				}
catch(err) {
console.warn(err.message);
}
					
					var f = EDITOR.eventListeners.virtualDisplay.map(funMap);
				for(var i=0; i<f.length; i++) f[i]("open"); //
				
				win.onunload = close;
				win.beforeunload = close;
				
				function close() {
					if(!EDITOR.virtualDisplay.open) return;
					
					EDITOR.virtualDisplay.open = false;
					EDITOR.virtualDisplay._win = null;
					
					var f = EDITOR.eventListeners.virtualDisplay.map(funMap);
					for(var i=0; i<f.length; i++) f[i]("close");
				}
				
				setTimeout(function() {
					win.document.title = "Desktop";
				}, 3000);
			}
			}
		},
		hide: function() {
			var win = EDITOR.virtualDisplay._win;
			if(win) win.close();
			
			return PREVENT_DEFAULT;
		}
	}
	
	
	var stats = null; // Key:value to store stats
	var saveStatsTimer;
	EDITOR.statsEnabled = true;
	EDITOR.localStorage.getItem("_stats_", function(err, str) {
		if(err) {
			console.error(err);
		}
		else {
			if(str == null) {
				stats = {};
				return;
			}
			
			try {
				stats = JSON.parse(str);
			}
			catch(err) {
				console.error("Unable to parse str=" + str + " Error: " + err.message);
				stats = {};
			}
		}
	});
	
	EDITOR.stat = function stat(key, retry) {
		// Increment a key value
		
		if(!EDITOR.statsEnabled) return;
		
		if(retry == undefined) retry = 0;
		
		if(stats == null && retry < 3) {
			console.warn("stats not yet loaded!");
			setTimeout(function() {
				EDITOR.stat(key, ++retry);
			}, 100);
			
			return;
		}
		
		if(!stats.hasOwnProperty(key)) stats[key] = 0;
		if(typeof stats[key] == "number") stats[key]++;
		else {
			console.warn("key=" + key + " is of type=" + typeof stats[key]);
			return;
		}
		
		// Premature optimization to prevent JSON.stringify from klogging down key presses
		clearTimeout(saveStatsTimer);
		saveStatsTimer = setTimeout(function saveStats() {
			EDITOR.localStorage.setItem("_stats_", JSON.stringify(stats), function(err) {
				if(err) {
					console.error(err);
				}
			});
		}, 5000);
	}
	
	EDITOR.statInfo = function statInfo(key, val) {
		// Pushes a string to a key array
		
		if(!EDITOR.statsEnabled) return;
		
		if(!stats.hasOwnProperty(key)) stats[key] = [];
		
		var statsObj = stats[key];
		
		if(Array.isArray(statsObj)) {
			statsObj.push(val);
			EDITOR.localStorage.setItem("_stats_", JSON.stringify(stats), function(err) {
				if(err) {
					console.error(err);
				}
			});
		}
		else {
			console.error("Not an array: key=" + key + " " )
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
			console.warn("EDITOR.addInfo: Too many info messages! Resetting!");
			info.length = 0;
		}
		
		if(!file) throw new Error("No file!");
		if(file.grid.length <= row) throw new Error("file only has " + file.grid.length + " rows!" +
		" Unable to place info message on row=" + row);
		
		// Why not just create div's and show them on top of the canvas!?!?
		
		console.log("EDITOR.addInfo: textString=" + textString);
		
		if(EDITOR.soundAssist) {
			if(lvl == 3) var message = "Info: ";
			else if(lvl == 2) var message = "Warning: ";
			else if(lvl == 1) var message = "Error: ";
			
			message = message + UTIL.getFilenameFromPath(file.path) + " line " + (row+1);
			if(col != 0) message = message + " column " + col;
			message = message + " " + textString;
			EDITOR.say(message);
		}
		
		
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
			
			console.log("EDITOR.addInfo: imgArray.length=" + imgArray.length);
			
			// Remove all text at next editor interaction ?
			// nope: They will be removed when moving the cursor
			/*
				EDITOR.onNextInteraction(function(ev) {
				console.log("EDITOR.addInfo: editor interaction ev=", ev);
				if(ev == "mouseMove") return;
				console.warn("EDITOR.addInfo: Clearing info! row=" + row + " col=" + col + " txt=" + JSON.stringify(txt));
				EDITOR.removeAllInfo(file, row, col);
				});
			*/
			
			// Check if there's already info on that positioin
			for(var i=0; i<info.length; i++) {
				if(info[i].row == row && info[i].col == col) {
					
					if(info[i].str == textString) {
						console.log("EDITOR.addInfo: Same text as in info[" + i + "]");
						info[i].count++;
					}
					else {
						// Add text ...
						// Adding too many info boxes can freeze the computer because we'll run out of memory!
						if(info[i].text.length > 100) {
							console.warn("EDITOR.addInfo: Too many info messages added to row=" + row + " and col=" + col);
						return;
						}
						
						for(var j=0; j<imgArray.length; j++) {
							console.log("EDITOR.addInfo: Adding info to info[" + i + "]");
							info[i].text.push(imgArray[j]);
						}
					}
					found = true;
					break;
				}
			}
			
			if(!found) {
				console.log("EDITOR.addInfo: No info found on that position. Adding it!");
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
			
			console.log("EDITOR.addInfo: Info added on row=" + row + " col=" + col + " textString=" + textString + " file.path=" + file.path);
			// todo: only re-render if the info is in view
			EDITOR.renderNeeded();
			resizeAndRender();
			
		}
		
		function makeImage(item) {
			console.log("EDITOR.addInfo: makeImage item=" + item);
			htmlToImage(item, function(img) {
				imgArray.push(img);
				
				imagesMade++;
				
				console.log("EDITOR.addInfo: imagesToMake=" + imagesToMake);
				console.log("EDITOR.addInfo: imagesMade=" + imagesMade);
				
				if(imagesMade == imagesToMake) {
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
		
		var f = EDITOR.eventListeners.error.map(funMap);
		if(f.length > 0) {
			console.log("Calling error listeners (" + f.length + ") ...");
			for(var i=0; i<f.length; i++) {
				f[i](message, source, lineno, colno, error); // Call function
			}
		}
		
		return FAIL;
	}
	
	EDITOR.removeAllInfo = function(file, row, col) {
		// Find the item in the array, then splice it ...
		
		//console.log(UTIL.getStack("EDITOR.removeAllInfo!"));
		
		if(file instanceof ImageFile) return;
		
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
		
		var f = EDITOR.eventListeners.interaction.map(funMap);
		if(f.length > 0) {
			console.log("Calling interaction listeners (" + f.length + ") ...");
			for(var i=0; i<f.length; i++) {
				f[i](EDITOR.currentFile, interaction, options); // Call function
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
	

	var audioCtx; // AudioContext must be created after a user gesture!

	EDITOR.beep = function beep(volume, frequency, type, duration) {
		// Makes a beep sound
		
		if(!audioCtx) {
			var Audio = window.AudioContext || window.webkitAudioContext;
			if(Audio) audioCtx = new Audio;
			else { 
				console.warn("Audio API not supported on " + BROWSER);
				return;
			}
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
		var returns = {};
		var waitingForFunction = [];
		
		var f = EDITOR.eventListeners[eventName].map(funMap);
		//console.log("Calling " + eventName + " listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) runFunc(f[i]);
		
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
				console.error(err);
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
	
	EDITOR.renderOrder = {};
	EDITOR.addRender = function(fun, order) {
		
		var fName = UTIL.getFunctionName(fun);
		
		if(EDITOR.renderOrder.hasOwnProperty(fName)) {
			throw new Error("There is already a render function with the name " + fName + ". Render function names need to be unique!");
		}
		if(order == undefined) throw new Error("Render order (second argument) need to be defined for " + fName + " Use number 1-1999 for backgrounds and 2000+ for foreground");
		
		for(var fn in EDITOR.renderOrder) {
			if(EDITOR.renderOrder[fn] == order) throw new Error(fName + " has the same order=" + order + " as " + fn + ". Increase the order to make it run after " + fn + " or decrease the order to make it run before.");
		}

		EDITOR.renderOrder[fName] = order;
		
		//console.log("Adding render: " + UTIL.getFunctionName(fun));
		if(EDITOR.renderFunctions.indexOf(fun) != -1) throw new Error("The function is already registered as a renderer: " + fName);
		
		EDITOR.renderFunctions.push(fun);
		
		EDITOR.renderFunctions.sort(sortByRenderOrder);
		
		// Do not return index as it's not safe to remove the function based on index
		
		function sortByRenderOrder(fA, fB) {
			var fNameA = UTIL.getFunctionName(fA);
			var fNameB = UTIL.getFunctionName(fB);
			var a = EDITOR.renderOrder[fNameA];
			var b = EDITOR.renderOrder[fNameB];
			
			if(a > b) return 1;
			else if(b > 1) return -1;
			else return 0;
		}
		
	}
	
	EDITOR.removeRender = function(fun) {
		console.log("Removing render: " + UTIL.getFunctionName(fun));
		
		delete EDITOR.renderOrder[ UTIL.getFunctionName(fun) ];
		
		removeFrom(EDITOR.renderFunctions, fun);
	}
	
	EDITOR.addPreRender = function(fun) {
		// pre-renders modifies the buffer and returns the buffer, for example adding colors
		return EDITOR.preRenderFunctions.push(fun) - 1;
	}
	EDITOR.removePreRender = function(fun) {
		return removeFrom(EDITOR.preRenderFunctions, fun);
	}
	
	EDITOR.mousePositionToCaret = function (paramMouseX, paramMouseY, clickFeel) {
		/*
			Returns a caret on the file.grid
			
			---
			
			We need to know row indentation to know what column!
			We also need to take into account how much is scrolled
			And also the width of special-width characters such as emojis and tab columns
			
			FILE CARET IS BOUND TO THE GRID!
			caret.index is always the index in file.text (it doesn't correspond to the position in a big file)
			
		*/
		
		var mouseX = paramMouseX;
		var mouseY = paramMouseY;
		
		if(mouseX == undefined) mouseX = EDITOR.canvasMouseX;
		if(mouseY == undefined) mouseY = EDITOR.canvasMouseY;
		
		if(mouseX == undefined || mouseY == undefined) {
			
			throw new Error("Unable to get mouse position from: paramMouseX=" + paramMouseX + " paramMouseY=" + paramMouseY + " EDITOR.canvasMouseX=" + EDITOR.canvasMouseX + " EDITOR.canvasMouseY=" + EDITOR.canvasMouseY + "");
		}
		
		if(EDITOR.currentFile) {
			
			var file = EDITOR.currentFile;
			var grid = file.grid;
			
			if(!file.grid) return null;
			
			if(clickFeel == undefined) clickFeel = EDITOR.settings.gridWidth / 2;
			
			var mouseRow = Math.floor((mouseY - EDITOR.settings.topMargin) / EDITOR.settings.gridHeight) + file.startRow;
			
			if(isNaN(mouseRow)) throw new Error("mouseRow=" + mouseRow + " mouseY=" + mouseY + " EDITOR.settings.topMargin=" + EDITOR.settings.topMargin + " EDITOR.settings.gridHeight=" + EDITOR.settings.gridHeight + " file.startRow=" + file.startRow + " ");
			
			//console.log("mousePositionToCaret: mouseRow=" + mouseRow);
			
			if(mouseRow >= grid.length) {
				console.warn("mousePositionToCaret: Mouse position, mouseRow=" + mouseRow + " >= grid.length=" + grid.length + ". file.partStartRow=" + file.partStartRow + " file.totalRows=" + file.totalRows);
				
				// For example when clicking under the text when scrolled down so only half the screen contains text
				
				return file.createCaret(undefined, grid.length-1, 0);
				
			}
			else if(mouseRow < 0) {
				console.warn("mousePositionToCaret: Mouse position above the grid!");
				return file.createCaret(0, 0, 0);
			}
			else {
				var gridRow = grid[mouseRow];
				
				if(gridRow == undefined) throw new Error("mouseRow=" + mouseRow + " grid.length=" + grid.length);
				
				//console.log("mousePositionToCaret: Mouse on row " + gridRow.lineNumber);
				
				var mouseColBegin = Math.floor((mouseX - EDITOR.settings.leftMargin - ((gridRow.indentation) * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth + clickFeel) / EDITOR.settings.gridWidth);
				var mouseCol = mouseColBegin;
				
				var walker = EDITOR.gridWalker(gridRow);
				while(!walker.done && walker.totalWidth < mouseCol) walker.next();
				var extraSpace = walker.extraSpace;
				var charWidth = walker.charWidth;
				
				console.log("mousePositionToCaret: mouseCol=" + mouseCol + " walker=" + JSON.stringify(walker));
				
				if(mouseCol > walker.totalWidth) {
					// Place mouse at EOL
					mouseCol = gridRow.length;
				}
				else {
					mouseCol = walker.col + walker.charCodePoints;
					
					if(charWidth > 0) {
						var mouseColX = Math.floor((EDITOR.settings.leftMargin + ((gridRow.indentation) * EDITOR.settings.tabSpace - file.startColumn + walker.totalWidth ) * EDITOR.settings.gridWidth));
						var diff = mouseColX - mouseX;
						console.log("mousePositionToCaret: charWidth=" + charWidth + " mouseCol=" + mouseCol + " extraSpace=" + extraSpace + " mouseColX=" + mouseColX + " mouseX=" + mouseX + " diff=" + diff + " ");
						if(diff/EDITOR.settings.gridWidth > walker.charWidth/2) {
							console.log("mousePositionToCaret: Adjusting to left glyph as we clicked left of it");
							mouseCol -= walker.charCodePoints;
						}
						
					}
					
				}
				
				
				if(mouseCol > gridRow.length) { // End of line
					mouseCol = gridRow.length;
				}
				else if(mouseCol < 0) { // Start of line
					mouseCol = 0;
				}
				
				if( gridRow[mouseCol] && UTIL.isSurrogateEnd(gridRow[mouseCol].char) ) {
					console.log("mousePositionToCaret: surrogate END! mouseCol=" + mouseCol);
					mouseCol++;
				}
				else if( gridRow[mouseCol] && UTIL.isSurrogateModifierStart(gridRow[mouseCol].char) ) {
					console.log("mousePositionToCaret: at surrogate modifier start! mouseCol=" + mouseCol);
					mouseCol += 2;
				}
				
				// Broken surrogate can make the adjustment wrong
				if(mouseCol > gridRow.length) mouseCol = gridRow.length;
				
				
				return file.createCaret(undefined, mouseRow, mouseCol);
				
			}
			
		}
		else {
			console.warn("mousePositionToCaret: No file open!");
		}
		
	}
	
	EDITOR.makeGlyphWidthDetector = function() {
		
		/*
			The width depens on the font, so it's impossible to say what the width is based on the character code!
			So we must render the character to know for sure.
			For optimization we use a hearustic that all characters below 256!? are rendered as one character
			
			Make this function *after* the font has been set!
			
			Should we call this function with character codepoints instead of file and index !? (so the caller don't have to know about file)
		*/
		
		var glyphWidthCache = {}; // Memoization
		var oneCharWidth = EDITOR.settings.gridWidth;
		
		return function(char) {
			if(typeof char != "string") throw new Error("char=" + char + " (" + (typeof char) + ") is not a string! ");
			
			// Optimization :P
			var charCode = char.charCodeAt(0)
			if(charCode < 256) return 1;
			
			if( glyphWidthCache[char] ) {
				//console.log("glyphWidth: Found char=" + char + " charCode=" + charCode + " in cache!");
				return glyphWidthCache[char];
			}
			
			var renderWidth = EDITOR.canvasContext.measureText(char).width;
			//console.log("glyphWidth: renderWidth=" + renderWidth + " oneCharWidth=" + oneCharWidth + " ");
			
			glyphWidthCache[char] = Math.ceil(Math.floor(renderWidth*10) / Math.floor(oneCharWidth*10));
			
			//console.log("glyphWidth: " + char + "=" + glyphWidth[char]);
			
			return glyphWidthCache[char];
		}
	}
	
	EDITOR.glyphWidth = function() {
		console.warn("glyphWidth not yet initiated!");
		return 1;
	}

EDITOR.glyphWidth2 = function(char) {
var renderWidth = EDITOR.canvasContext.measureText(char).width;
return Math.ceil(Math.floor(renderWidth*10) / Math.floor(EDITOR.settings.gridWidth*10));
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
		
		var waitingForAsync = 0;
		
		/*
			We want to include whole of document.getElementById("foobar").innerH
			but only bar in foo(bar)
			And also foo(x in foo(x
			
		*/
		
		var leftParentheses = 0;
		var rightParentheses = 0;
		var dotInWord = false;
		var caretStepLeft = 0;
		for(var i=file.caret.index-1; i>-1; i--) {
			char = left1;
			left1 = left2;
			left2 = file.text.charAt(i-2);
			
			//if(char == "") continue; // "abc".indexOf("") = 0
			
			console.log("EDITOR.autoComplete: char=" + char);
			
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
				console.log("EDITOR.autoComplete: break because of if(");
				break;
			}
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = char + word;
			console.log("EDITOR.autoComplete: word=" + word);
			
			caretStepLeft++;
		}
		// Also go right just in case we are inside a word
		
		for(var i=file.caret.index; i<file.text.length; i++) {
			char = file.text.charAt(i);
			
			console.log("EDITOR.autoComplete: char=" + char);
			
			if(wordDelimitersRight.indexOf(char) > -1) break; // Exit loop
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = word + char;
		}
		
		word = word.trim();
		var wordLength = word.length;
		console.log("EDITOR.autoComplete: Autocomplete: *" + word + "* (" + wordLength + " chars)");
		
		var ret, addWord, addMcl, functionArguments, removeOptions = [];
		
		var f = EDITOR.eventListeners.autoComplete.map(funMap);
		console.log("EDITOR.autoComplete: Calling autoComplete listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			
			ret = f[i](file, word, wordLength, options.length, callback);
			
			console.log("EDITOR.autoComplete: function " + UTIL.getFunctionName(f[i]) + " returned: " + JSON.stringify(ret));
			
			if(ret == undefined) continue;

			if(!ret.async) callback(ret, true);
			else waitingForAsync++;
			
			if(ret.exclusive) break;
		}
		
		if(waitingForAsync == 0) gotOptions();
		
		return PREVENT_DEFAULT;
		
		function gotOptions() {
			
			if(options.length != mcl.length) {
				throw new Error("Something went wrong! options=" + JSON.stringify(options) + "\nmcl=" +  JSON.stringify(mcl) + " ");
				return false;
			}
			
			console.log("EDITOR.autoComplete: options:" + JSON.stringify(options, null, 2));
			
			var removeIndex = -1;
			for(var i=0; i<removeOptions.length; i++) {
				removeIndex = options.indexOf(removeOptions[i]);
				while(removeIndex != -1) {
					options.splice(removeIndex, 1);
					removeIndex = options.indexOf(removeOptions[i]);
				}
			}
			
			if(options.length > 1) {
				
				// Remove empty items
				options = options.filter(function(item) {
					return typeof item == "string" && item.length > 0;
				});
				
				// Type up until the common character  fooBar vs fooBaz, type fooBa|
				var shared = sharedStart(options);
				
				console.log("EDITOR.autoComplete: sharedStart=" + shared + " word=" + word);
				
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
			
			if(options.length == 0) EDITOR.stat("autocomplete_nothing");
			else EDITOR.stat("autocomplete_found");
		}
		
		function callback(ret, notAsync) {
			if(!ret) return;
			
			console.log("EDITOR.autoComplete: ret=" + JSON.stringify(ret) + " waitingForAsync=" + waitingForAsync);
			
			if(!Array.isArray(ret) && typeof ret == "object") {
				if(ret.remove) removeOptions = removeOptions.concat(ret.remove);
				if(ret.exclusive) removeOptions =  removeOptions.concat(options);
				ret = ret.add;
			}
			
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
					
					console.log("EDITOR.autoComplete: word=" + word + " addWord=" + addWord + " addMcl=" + addMcl);
					
					if(word.length > 0 && addWord.indexOf(word) != 0) {
						console.warn("EDITOR.autoComplete: Function " + UTIL.getFunctionName(f[i]) + " returned '" + addWord + "' witch does not start with word=" + word + " !");
					}
					if(options.indexOf(addWord) == -1) {
						options.push(addWord);
						mcl.push(addMcl);
					}
				}
			}
			else {
				throw new Error(UTIL.getFunctionName(f[i]) + " did not return an array! It returned " + (typeof ret));
			}
			
			if(!notAsync) {
				waitingForAsync--;
				if(waitingForAsync == 0) {
					gotOptions();
				}
			}
			
		}
		
		function completeWord(word, wholeWord, moveCaret) {
			
			if(wholeWord.length == 0) console.warn("wholeWord.length=" + wholeWord.length + " wholeWord=" + wholeWord + " word=" + word + " moveCaret=" + moveCaret)
			
			if(wholeWord.substring(0, word.length) != word && wholeWord.length > 0) {
				// Delete the word, then insert the text
				
				/*
					Issue 1: Removing the whole word is very annoying if that's Not what the user intended!
					Can me make a smart decision somehow!?
					
					ex: User writes EDITOR.curr| but there is not EDITOR.curr.. BUT there's a currentFile
					
					Issue 2: When atuocompleting a quote ex: "foo" and you get "foobar" and "foobarr",
					we don't want to delete 4 letters, only 3. Or the letter left to the " would also be deleted
					solution: Calculate where in the word the caret is in, and only delete the characters to the left
					
					
				*/
				console.warn("EDITOR.autoComplete: Deleting word=" + word + " caretStepLeft=" + caretStepLeft + " to autocomple wholeWord=" + wholeWord);
				for(var i=0; i<Math.min(caretStepLeft, word.length); i++) {
					file.moveCaretLeft();
					file.deleteCharacter();
				}
				var insert = wholeWord;
			}
			else {
				var insert = wholeWord.substring(word.length); // Start at length, continue to end
			}
			
			console.log("EDITOR.autoComplete: Completing word=" + word + " wholeWord=" + wholeWord + " moveCaret=" + moveCaret + " insert=" + insert + "");
			
			
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
		var sortedArray = array.concat().sort(); // Create new array with the words sorted
		var firstElement = sortedArray[0];
		var lastElement = sortedArray[sortedArray.length-1];
		var firstElementLength = firstElement.length;
		var i = 0;
		
		while(i<firstElementLength && firstElement.charAt(i) === lastElement.charAt(i)) i++;
		
		return firstElement.substring(0, i);
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
		
		console.log("Calling exit event listeners...");
		EDITOR.fireEvent("exit", ["exit"], function afterExitEvent(err, returns) {
			console.log("All exit event listeners called!");
			if(err) throw(err);
			
			if(CLIENT.inFlight == 0) exitNow();
			else {
				console.log("Waiting one second before exiting... CLIENT.inFlight=" + CLIENT.inFlight);
				setTimeout(exitNow, 1000);
			}
			
			function exitNow() {
				console.log("Closing the editor ...");
				if(typeof process == "object" && typeof process.exit == "function") process.exit(1);
				
				if(CLIENT.connected) {
					CLIENT.cmd("quit", {});
				}
				
				self.close();
				
				window.close();
				
				// Firefox hack
				window.open('','_parent','');
				window.close();
				
				if(typeof browser == "object" && browser.tabs && typeof browser.tabs.remove == "function") browser.tabs.remove();
				
				
				alertBox("Manually close the window to exit");
			}
			
		});
		
	}
	
	EDITOR.showFileReset = function showFileReset() {
		// Useful in tests where file open show state is set, to allow showing other files
		showFile = undefined;
	}
	
	EDITOR.showFile = function(fileOrFilePath, focus, overrideShowFile) {
		
		if(fileOrFilePath instanceof File) {
			var file = fileOrFilePath;
		}
		else if(fileOrFilePath instanceof ImageFile) {
			var file = fileOrFilePath;
		}
		else if(typeof fileOrFilePath == "string") {
			if(EDITOR.files.hasOwnProperty(fileOrFilePath)) {
				var file = EDITOR.files[fileOrFilePath];
			}
			else {
				throw new Error("File not open: fileOrFilePath=" + fileOrFilePath + " Open files are: " + JSON.stringify(Object.keys(EDITOR.files)));
			}
		}
		else {
			throw new Error("fileOrFilePath=" + fileOrFilePath + " is not a string nor an instance of File!");
		}
		
		if(!file) throw new Error("fileOrFilePath=" + fileOrFilePath + " need to be a File object or a path to an open file");
		
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
			var f = EDITOR.eventListeners.fileHide.map(funMap);
			console.log("Calling fileHide listeners (" + f.length + ") EDITOR.currentFile.path=" + EDITOR.currentFile.path);
			for(var i=0; i<f.length; i++) {
				f[i](EDITOR.currentFile); // Call function
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
		
		
		var f = EDITOR.eventListeners.fileShow.map(funMap);
		console.log("Calling fileShow listeners (" + f.length + ") file.path=" + file.path);
		for(var i=0; i<f.length; i++) {
			f[i](file, EDITOR.lastFileShowed); // Call function
		}
		
		
		
		EDITOR.resizeNeeded(); // Update the view
		EDITOR.renderNeeded();
		
		//EDITOR.interact("showFile", window.event);
	}
	
	EDITOR.getKeyFor = function(funName, actualComboSum) {
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
			"ESC", // [27]
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
					character = f.char || f.key;
				}
				
				var combo = comboSumToString(actualComboSum || f.combo);
				
				
				//console.log("getKeyFor: funName=" + funName + " combo=" + combo + " character=" + character);
				
				if(combo) return combo + " + " + character;
				else return character;
				
				break;
			}
		}
		
		return null;
		
	}
	
	function comboSumToString(sum) {
		var combo = "";
		switch(sum) {
			case 1: combo = "SHIFT"; break;
			case 2: combo = "CTRL"; break;
			case 3: combo = "SHIFT + CTRL"; break;
			case 4: combo = "ALT"; break;
			case 5: combo = "SHIFT + ALT"; break;
			case 6: combo = "CTRL + ALT"; break;
			case 7: combo = "SHIFT + CTRL + ALT"; break;
		}
		return combo;
	}
	
	EDITOR.keyBindings = function() {
		// Returns a list of key bindings
		return keyBindings;
		
	}
	
	EDITOR.bindKey = function(b) {
		
		if(b.charCode != undefined && isNaN(b.charCode)) throw new Error("charCode=" + b.charCode + " needs to be a number!");
		if((typeof b.fun !== "function")) throw new Error("Object argument needs to have a 'fun' method!");
		
		if(!b.desc) {
			console.log(UTIL.getStack("Key binding should have a description!"));
		}
		
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
					console.log(UTIL.getStack("There's already a key binding (" + UTIL.getFunctionName(keyBindings[i].fun) + ") for charCode=" + b.charCode + " and combo=" + b.combo + " !"));
				}
			}
		}
		
		for (var i=0; i<disable.length; i++) {
			keyBindings.splice( keyBindings.indexOf(disable[i], 1) );
		}
		
		keyBindings.push(b);
		
		keyBindings.sort(function(a, b) {
			if(a.order == undefined) return -1;
			else if(b.order == undefined) return 1;
			else if(a.order > b.order) return 1;
			else if(b.order > a.order) return -1;
			else return 0;
		});
		
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
			if(err) {
				callback(err);
				EDITOR.stat("connect_" + protocol + "_fail");
			}
			else {
				
				setWorkingDirectory(json.workingDirectory);
				
				EDITOR.connections[serverAddress] = {protocol: protocol};
				callback(null, json.workingDirectory);
				
				EDITOR.stat("connect_" + protocol + "_success");
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
	
	EDITOR.folderExist = function(pathToFolder, callback) {
		/*
			Check if a folder/path exist
			Note that it's not neccesary to check if a folder exist before creating it,
			or check if a folder exist before opening a file in it (just open the file and check for (ENOENT) error)
		*/
		
		var pathToParentFolder = UTIL.parentFolder(pathToFolder);
		var folderName = UTIL.getFolderName(pathToFolder);

		return EDITOR.folderExistIn(pathToParentFolder, folderName, callback);

	}

	EDITOR.folderExistIn = function(pathToParentFolder, folderName, folderExistInCallback) {
		console.log("folderExistIn pathToParentFolder=" + pathToParentFolder);
		
		EDITOR.listFiles(pathToParentFolder, function(err, list) {
			
			console.log("list=" + list);
			
			if(err) {
				console.log("folderExistIn pathToParentFolder=" + pathToParentFolder + " err.message=" + err.message);
				
				if(err.code != "ENOENT") {
					var error = new Error("Unable to check if folder=" + folderName + " exist in pathToParentFolder=" + pathToParentFolder + "\n" + err.message);
					error.code = err.code;

					folderExistInCallback(error, undefined);
				}
				else {
					folderExistInCallback(null, false);
				}
			}
			else {
				
				for(var i=0; i<list.length; i++) {
					if(list[i].type == "d" && list[i].name == folderName) {
						folderExistInCallback(null, list[i].path);
						return;
					}
					else console.log(list[i].type + " " + list[i].name + " != " + folderName);
				}
				// end of for loop reached, no folder found:
				folderExistInCallback(null, false);
				
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
			EDITOR.folderExistIn(pathToParentFolder, folderName, function folderExistInCallback(err, folderPath) {
				if(err) {
					if(callback) callback(err);
					else alertBox(err.message);
					return;
				}

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
	
	EDITOR.checkFilePermission = function(fileOrPath, callback) {
		if(fileOrPath instanceof File) var path = fileOrPath.path;
		else if(typeof fileOrPath == "string") var path = fileOrPath;
		else throw new Error("fileOrPath=" + fileOrPath + " does not seem to be a file nor a path!");

		CLIENT.cmd("stat", {path: path}, function(err, stats) {

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
		if(lastCharOfPath != "/" && lastCharOfPath != "\\") {
			var err =  new Error("Last character of a directoryPathToCreate=" + directoryPathToCreate + " needs to have a path delimiter (slash or backslash): " + directoryPathToCreate);
			if(createPathCallback) return createPathCallback(err);
			else throw err;
		}
		
		var json = {pathToCreate: directoryPathToCreate};
		CLIENT.cmd("createPath", json, function pathCreated(err, json) {
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
	
	EDITOR.createWidget = function(buildFunction, parentNode) {
		
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
			// Add input elements in a grid, which is a multi dimentional array or rows and columns
			
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
	EDITOR.createWindow = function createWindow(options, callback) {
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
		
		console.warn("EDITOR.createWindow: Creating new window url=" + url);
		
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
		// Sometimes we will not get theWindow descriptor right away... (for example when there is a cross-origin error)
		if(theWindow != null) {
			console.log("EDITOR.createWindow: theWindow available right away!");
			testWindow(theWindow);
		}
		else setTimeout(function waitedBecauseWindowWasNullOrUndefined() {
		if(theWindow != null) {
				console.log("EDITOR.createWindow: theWindow available after timeout!");
				testWindow(theWindow);
			}
			else {
				console.log("EDITOR.createWindow: theWindow not available!");
				
			// If something goes wrong, for example if the window is stopped by a popup stopper, theWindow will be null
			
				var allowLink = '<a target="_blank" class="allowDefault" href="https://webide.se/about/popups.htm">allow</a>';
				
				var failText = 'The new window was most likely blocked by the browser. ' +
				'(' + allowLink + ' window/popups from ' + document.domain + ' to get rid of this message)'

				var errorText = "If the new window could not open, it was probably blocked by the browser (please " + allowLink + " " + window.location.host + " to open new windows)";

			/*
				// native confirm dialog did not enable the window!
				var tryAgain = confirm(failText);
				if(tryAgain) theWindow = open(url);
			*/
			
			var retry = "Retry";
			var cancel = "Cancel";
			confirmBox(failText, [retry, cancel], function confirmOpenWindow(answer) {
				if(answer == retry) {
					theWindow = open(url);
					// Kinda annoying if the user clicks "allow window" after clicking OK. Not much we can do about that !?
					if(!theWindow) {
							console.warn("EDITOR.createWindow: Calling back!");
							callback(new Error(errorText));
							callback = function() { return "Already called callback after open fail, after retry confirmBox" };
							return;
						}
						else return testWindow(theWindow);
				}
				else {
						console.warn("EDITOR.createWindow: Calling back!");
						callback(new Error(errorText));
						callback = function() { return "Already called callback after canceled retry confirmBox" };
					}
				});
				
				
			}
		}, 200);
		
		return theWindow;
		
		function testWindow(theWindow) {
			console.log("EDITOR.createWindow: testWindow!");
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
				console.log("EDITOR.createWindow: Possible cross-origin error!");
				
				var origin = UTIL.getLocation(document.location.href);
				var other = UTIL.getLocation(url);
				var diff = [];
				
				if(origin.protocol != other.protocol) diff.push("protocol: " + origin.protocol + " vs " + other.protocol);
				if(origin.host != other.host) diff.push("host: " + origin.host + " vs " + other.host);
				if(origin.port != other.port) diff.push("port: " + origin.port + " vs " + other.port);
				
				var error = new Error( "Unable to access " + url + " \n" + err.message + " diff=" + JSON.stringify(diff) );
				if(diff.length > 0) error.code = "CROSS_ORIGIN";
				
				console.warn("EDITOR.createWindow: Calling back!");
				callback(error);
				callback = function() { return "Already called callback after theWindow.document.domain error in testWindow" };
				return;
			}
			
			console.log("EDITOR.createWindow: We can access theWindow.document.domain=" + test);
			
			/*
				Problem: It's impossible to tell if the window has finished loading. eg. if we attach a load event listener to it, it might never fire!
				Chrome always gives document.readyState=complete even if it has not finished loading.
				Firefox gives document.readyState=uninitialized
				We can however check for theWindow.location.href that will be about:blank until the window has loaded!
				(window.location.href will be populated at DOMContentLoaded)
				
			*/
			
			try { // Edge browser throws 0: Permission denied
				console.log("EDITOR.createWindow: theWindow.location.href = " + theWindow.location.href); 
				console.log("EDITOR.createWindow: New window: " + (new Date()).getTime() + " document.readyState=" + theWindow.document.readyState + " theWindow.location.href=" + theWindow.location.href);
				console.log("EDITOR.createWindow: theWindow.document.documentElement.innerHTML=" + theWindow.document.documentElement.innerHTML);
				
				if(theWindow.location.href == "about:blank") theWindow.loadedByWebideYo = false;  // Unique property for sanity
				else theWindow.loadedByWebideYo = true;
				
				// window.location wont be populated until DOMContentLoaded! So it's impossible to check if the URL is blank or not! Thus:
				if(url == "about:blank") theWindow.isBlankUrl = true;
			}
			catch(err) {
				
			}
			
			theWindow.addEventListener("load", function createdWindowLoaded() {
				console.log("EDITOR.createWindow: New window: " +  UTIL.timeStamp() + " load event!");
				console.log("EDITOR.createWindow: theWindow.location.href = " + theWindow.location.href);
				/*
					document.readyState === "complete" does not mean everything has loaded!
					So because it's impossible to tell if the window has loaded or not,
					we will give the window object a new property: loaded (true or undefined)
					
					What if the window was loaded until we got here (theWindow.addEventListener("load") ? Nightmare!
					
				*/
				if(theWindow.loadedByWebideYo === true) throw new Error("It seems the window has already loaded!!"); // Sanity check
				theWindow.loadedByWebideYo = true; 
				if(waitUntilLoaded) {
					console.warn("EDITOR.createWindow: Calling back!");
					callback(null, theWindow);
					callback = function() { return "Already called callback after theWindow got load event" };
				}
				
}, false);
			theWindow.addEventListener("DOMContentLoaded", function createdWindowDOMContentLoaded() {
				console.log("EDITOR.createWindow: New window: " + UTIL.timeStamp() + " DOMContentLoaded event! theWindow.document.readyState changed to: " + theWindow.document.readyState); 
				console.log("EDITOR.createWindow: theWindow.location.href = " + theWindow.location.href);
			}, false);
			
			console.log("EDITOR.createWindow: theWindow.document.domain=" + theWindow.document.domain);
			console.log("EDITOR.createWindow: document.domain=" + document.domain);
			
			if(!url) {
				theWindow.document.open();
				theWindow.document.write("<!DOCTYPE html><head></head><body><p>Loading ...</p></body>");
				theWindow.document.close();
			}
			
			EDITOR.openWindows.push(theWindow); // So that they can be conveniently closed on reload
			
			if(!waitUntilLoaded) {
				console.warn("EDITOR.createWindow: Calling back!");
				callback(null, theWindow);
				callback = function() { return "Already called callback in testWindow because not waitUntilLoaded" };
				return;
			}
			
			// It might have been loaded already
			try {
var loaded = !!theWindow.location.href;
			}
			catch(err) {
				console.error(err);
			}
			console.log("EDITOR.createWindow: waitUntilLoaded=" + waitUntilLoaded + " loaded=" + loaded + " ");
			if(waitUntilLoaded && loaded) {
				// A timeout to be really sure it has been loaded
console.log("EDITOR.createWindow: Waiting to be really sure the window have been loaded...");
				setTimeout(function waitedToBeSureWindowHadLoaded() {
					if(theWindow.loadedByWebideYo === true) {
						console.warn("EDITOR.createWindow: waitUntilLoaded=" + waitUntilLoaded + " loaded=" + loaded + " Aborting callback because theWindow.loadedByWebideYo=" + theWindow.loadedByWebideYo);
						return;
					}
					console.warn("EDITOR.createWindow: Calling back!");
					callback(null, theWindow);
					callback = function() { return "Already called callback in testWindow because not waitUntilLoaded and loaded" };
				}, 500);
			}
			
		}
		
		function open(url) {
			if(!url) url = "about:blank";
			var windowId = "previewWindow" + (EDITOR.openWindows.length + 1);
			
			return window.open(url, windowId, "height=" + previewHeight + ",width=" + previeWidth + ",top=" + posY + ",left=" + posX + ",location=no");
		}
		
	} // End of EDITOR.createWindow (JSX screwed with the indentation!)
	
	
	// Tools for handling repositories (Mercurial, Git, etc)
	EDITOR.commitTool = function commitTool(directory) {
		var f = EDITOR.eventListeners.commitTool.map(funMap);
		console.log("Calling commitTool listeners (" + f.length + ")");
		for(var i=0; i<f.length; i++) {
			f[i](directory);
		}
	}
	
	EDITOR.resolveTool = function resolveTool(resolved, unresolved, directory) {
		if(typeof resolved == "string" && unresolved == undefined && directory == undefined) {
			directory = resolved;
			resolved = undefined;
			unresolved = undefined;
		}
		
		var f = EDITOR.eventListeners.resolveTool.map(funMap);
		console.log("Calling resolveTool listeners (" + f.length + ")");
		for(var i=0; i<f.length; i++) {
			f[i](resolved, unresolved, directory);
		}
	}
	
	EDITOR.mergeTool = function mergeTool(directory) {
		var f = EDITOR.eventListeners.mergeTool.map(funMap);
		console.log("Calling mergeTool listeners (" +f.length + ")");
		for(var i=0, f; i<f.length; i++) {
			f[i](directory);
		}
	}
	
	EDITOR.runTests = function runTests(onlyOne, allInSync) {
		
		if(EDITOR.workingDirectory.indexOf("/wwwpub/") == -1 && !onlyOne) {
			return alertBox("Make sure you are running the editor as a cloud IDE before running tests!\
			(Working directory (" + EDITOR.workingDirectory + ") needs to be wwwpub/)");
		}
		
		//if(!onlyOne) EDITOR.changeWorkingDir("/");
		
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
		hide: function hideDashboard(stayHidden) {
			var dashboard = document.getElementById("dashboard");
			
			dashboard.style.display = "none";
			EDITOR.canvas.style.display = "block";
			
			EDITOR.dashboard.isVisible = false;
			EDITOR.fireEvent("hideDashboard");
			
			if(stayHidden) EDITOR.dashboard.stayHidden = true;
			
			return true;
		},
		show: function showDashboard() {
			
			console.warn("Showing the dashboard! stayHidden=" + EDITOR.dashboard.stayHidden);
			
			if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("dashboard") != -1) throw new Error("dashboard disabled via query string!");
			
			var dashboard = document.getElementById("dashboard");
			
			EDITOR.canvas.style.display = "none";
			dashboard.style.display = "block";
			
			if(!EDITOR.dashboard.isVisible) EDITOR.fireEvent("showDashboard");
			
			EDITOR.dashboard.isVisible = true;
			
			setTimeout(placeDashboard , 500);
			
			EDITOR.stat("show_dashboard");
			
			return true;
			
			function placeDashboard() {
				// Place it just below the header
				var header = document.getElementById("header");
				var headerRect = header.getBoundingClientRect();
				
				dashboard.style.top = (headerRect.bottom - 1) + "px";
			}
		},
		isVisible: false,
		stayHidden: false
	}
	
	EDITOR.openFileTool = function fileOpenTool(options, filePath) {
		var f = EDITOR.eventListeners.openFileTool.map(funMap);
		console.log("Calling openFileTool listeners (" + f.length + ")");
		
		var ret = false;
		
		for(var i=0; i<f.length; i++) {
			ret = f[i](options, filePath);
			if(ret === true) break; // Only open one tool
		}
		
		if(!ret) EDITOR.statInfo("tool_openFileTool_enoext", UTIL.getFileExtension(filePath));
		
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
		
		var f = EDITOR.eventListeners.pathPickerTool.map(funMap);
		console.log("Calling pathPickerTool listeners (" + f.length + ") ");
		
		var ret = false;
		
		for(var i=0, f; i<f.length; i++) {
			ret = f[i](options, gotPath);
			if(ret === true) return true; // Only open one tool, hope it will call back!
		}
		
		// If no path picker wanted to handle it: Use the stone-age path picker
		var defaultPath = options && options.defaultPath;
		var instruction = (options && options.instruction) || "Choose a file path:";
		promptBox(instruction, {defaultValue: defaultPath}, function(path) {
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
	
	EDITOR.previewTool = tool("previewTool", false);
	
	EDITOR.runScript = tool("runScript", false);
	
	EDITOR.stopScript = tool("stopScript", false);
	
	EDITOR.share = tool("share", false);
	
	EDITOR.wrapText = tool("wrapText", false);
	
	EDITOR.findInFiles = tool("findInFiles", false);
	
	function tool(eventListenerName) {
		return function(file, ev) {
			if(file == undefined && EDITOR.currentFile) file = EDITOR.currentFile;
			
			if(! file instanceof File) throw new Error("First argument file need to be a File object!");
			
			// Must pass the (click) event so plugins can know if shift,ctrl etc was pressed
			console.log("ev.constructor.name=" + (ev && ev.constructor && ev.constructor.name));
			if(typeof ev != "object") throw new Error("Second argument to " + eventListenerName + " needs to be an event object (mouseClick,keyPress, etc)!");
			
			
			if(!EDITOR.eventListeners.hasOwnProperty(eventListenerName)) throw new Error("Unknown event listener: " + eventListenerName);
			
			var f = EDITOR.eventListeners[eventListenerName].map(funMap);
			console.log("Calling eventListener=" + eventListenerName + " (" + f.length + ")");
			
			var ret = PASS;
			
			var combo = getCombo(ev);
			
			for(var i=0; i<f.length; i++) {
				ret = f[i](file, combo);
				if(ret === HANDLED) return PREVENT_DEFAULT; // Only run once
				else if(ret !== PASS) console.warn("Function " + UTIL.getFunctionName(f[i]) + " did not return true or false!");;
			}
			
			var fileName = UTIL.getFilenameFromPath(file.path);

			var message = "Could not run \"" + eventListenerName + "\" on " + fileName + ". None of the " + f.length + " plugins listening for " + eventListenerName + " could handle the request!";

			promptBox(message + "\nWhat would you like the editor to do?", {
				placeholder: "I was expecting that running " + eventListenerName + " on " + fileName + " the editor should..."
			}, function(answer) {
				message = message + "\n\nFeedback: " + answer + "\n\nBROWSER=" + BROWSER;
				EDITOR.sendFeedback(message, "No handler for " + eventListenerName, true);
			});

			EDITOR.statInfo("tool_" + eventListenerName + "_enoext", UTIL.getFileExtension(file.path));
			
			return ALLOW_DEFAULT;
		}
	}
	
	EDITOR.fileExplorer = function fileExplorerTool(directory) {
		var f = EDITOR.eventListeners.fileExplorer.map(funMap);
		console.log("Calling fileExplorer listeners (" +f.length + ") to explore directory=" + directory);
		
		var ret = false;
		
		for(var i=0; i<f.length; i++) {
			ret = f[i](directory);
			if(ret === true) break; // Only open one tool
		}
		
		return ret;
	}
	
	EDITOR.move = function renameFile(oldPath, newPath, callback) {
		// Also used for renaming files and folders!
		
		console.log("Moving oldPath=" + oldPath + " to newPath=" + newPath);
		
		if(callback == undefined || typeof callback != "function") throw new Error("Expected third function argument callback in EDITOR.move to be a callback function! typeof callback = " + (typeof callback) + " ");
		
		if(oldPath instanceof File) oldPath = oldPath.path;
		
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
		var uniqueFunctionNames = [];
	var returnedOrCalledBack = [];
	var stackTrace = {};
	
		var f = EDITOR.eventListeners[ev].map(funMap);
		
		for(var i=0; i<f.length; i++) {
			callListener(f[i]);
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
				if(waitingFor.length == 0 && returnedOrCalledBack.length == f.length && !alreadyTooLate) {
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

EDITOR.reload = function reload(url) {
	console.warn("Reloading the editor ...");
		
		console.log("Calling exit event listeners...");
		EDITOR.fireEvent("exit", ["reload"], function afterExitEvent(err, returns) {
			console.log("All exit event listeners called!");
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
			
				if(CLIENT.inFlight == 0) reloadNow(); 
				else {
					console.log("Waiting one second before reloading... CLIENT.inFlight=" + CLIENT.inFlight);
					setTimeout(reloadNow, 1000);
				}
				
			}

function reloadNow() {
console.log("Reloading! RUNTIME=" + RUNTIME);

window.onbeforeunload = null;
if(url) window.location=url;
else location.reload();

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
		
		var f = EDITOR.eventListeners.parse.map(function(f) {return f});
		for(var i=0, ret=false; i<f.length; i++) {
			//console.log("parse: typeof f[" + i + "]=" + (typeof f[i]) + " (" + f[i] + ") f.length=" + f.length + " f=", f + " EDITOR.eventListeners.parse=", EDITOR.eventListeners.parse);

			if(callback) ret = f[i](fileOrString, lang, path, parseDone); // async
			else ret = f[i](fileOrString, lang, path); // sync
			if(ret) return ret; // Only let one parser parse it
		}
		
		function parseDone(err, parseResult) {
			if(!waitingForFileToBeParsed.hasOwnProperty(path)) throw new Error("path=" + path + " not in waitingForFileToBeParsed=" + JSON.stringify(waitingForFileToBeParsed, null, 2) + "\nfileOrString=" + fileOrString+ " lang=" + lang + " err?" + (!!err) + " parseResult?" + (!!parseResult) + ". How did this happen!?");
			
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
		var f = EDITOR.eventListeners.registerAltKey.map(funMap);
		for (var j=0; j<f.length; j++) {
			reg = f[j](options);
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
			var f = EDITOR.eventListeners.unregisterAltKey.map(funMap);
			for (var j=0; j<f.length; j++) {
				f[j](fun);
		}
	}
}




EDITOR.hideVirtualKeyboard = function hideVirtualKeyboard(keyboards) {
	if(keyboards == undefined) keyboards = []; // An empty array hides all keyboards
	var returns = [];
		var f = EDITOR.eventListeners.hideVirtualKeyboard.map(funMap);
		for (var j=0, ret; j<f.length; j++) {
			ret = f[j](keyboards);
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
		var f = EDITOR.eventListeners.showVirtualKeyboard.map(funMap);
		for (var j=0, ret; j<f; j++) {
			ret = f[j](keyboards);
		// Should return an array of virtual keyboards that was turned on.
		if(!Array.isArray(ret)) throw new Error("ret=" + ret + " expected a list of keyboard names! (list can be empty)");
		returns.concat(ret);
	}
	return returns;
}

EDITOR.showMessageFromStackTrace = function showMessageFromStackTrace(options) {
	// Finds a currently opened file from the stack trace, and shows the message on the line from the stack trace
	
		// Edge will throw SCRIPT28: SCRIPT28: Out of stack space
		// When trying to stringify the options!
		console.log("EDITOR.showMessageFromStackTrace: options=" + JSON.stringify(Object.keys(options)));
	
	if(options.message) {
			console.log("showMessageFromStackTrace: message=options.message=" + options.message);
		var message = options.message;
	}
	else if(options.error) {
			console.log("showMessageFromStackTrace: options.error! message=options.error.message=" + options.error.message);
			var message = options.error.message;
	}
	else if(options.errorEvent) {
			if(!options.errorEvent.error) {
			console.log("showMessageFromStackTrace: options.errorEvent: ", options.errorEvent);
			return FAIL;
		}
			console.log("showMessageFromStackTrace: options.errorEvent! message=options.errorEvent.error.message=" + options.errorEvent.error.message);
			var message = options.errorEvent.error.message;
	}
	
	if(options.stackTrace) {
			console.log("showMessageFromStackTrace: options.stackTrace!");
			var errorStack = options.stackTrace;
	}
	else if(options.error) {
			console.log("showMessageFromStackTrace: options.error!");
		var errorStack = options.error.stack;
	}
	else if(options.errorEvent) {
			console.log("showMessageFromStackTrace: options.errorEvent!");
		var errorStack = options.errorEvent.error.stack;
		
		if(!errorStack) {
			//console.log("showMessageFromStackTrace: options.errorEvent: " + JSON.stringify(options.errorEvent, null, 2));
			//Firefox browser wont give access to the error event, because it's in another window !?
			
			//console.log("showMessageFromStackTrace: options.errorEvent.filename=" + options.errorEvent.filename);
			// It seems we can still extract some data out of it! ...
			
			errorStack = options.errorEvent.filename + ":" + options.errorEvent.lineno + ":" + options.errorEvent.colno
		}
		
	}
	else {
			console.log("showMessageFromStackTrace: Generating stack!");
		var errorStack = UTIL.getStack(message);
	}
	
	if(!errorStack) {
			return new Error("Specify either a stackTrace, error or errorEvent in options!");
	}
	
		var parsedError = UTIL.parseErrorMessage(errorStack);
		//var stackLines = UTIL.parseStackTrace(errorStack);
		
		console.log("parsedError: " + JSON.stringify(parsedError, null, 2));
		
		if(!parsedError) {
		console.warn("showMessageFromStackTrace: Failed to parse errorStack: " + errorStack);
		//alertBox(message || errorStack, "ERROR_PARSING", "error");
		return FAIL;
	}
	
		if(parsedError && !message && parsedError.message) message = parsedError.message;
	
	if(!message) {
			return new Error( "Unable to find message from options=" + JSON.stringify(options, null, 2) + " It does not appear to be an error message!" );
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
		var stackLines = parsedError.stack || parsedError;
		
		if(stackLines == undefined) {
			return new Error( "Unable to find stackLines from options=" + JSON.stringify(options, null, 2) + "\nparsedError=" + JSON.stringify(parsedError, null, 2) );
		}
		
		
		var lineno, colno;
		
		var file = findFile(stackLines);
		
		function findFile(stackLines) {
			if(!Array.isArray(stackLines)) throw new Error("Not an array: stackLines=" + stackLines + " (" + stackLines + "==undefined?" + (stackLines == undefined) + ")"    );

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
				
						
				var file = EDITOR.files[filePath];
						lineno = stackLines[i].line || stackLines[i].lineno;
						colno = stackLines[i].col || stackLines[i].colno;
						console.log("showMessageFromStackTrace: sourcePath in filePath: yes! ");
						
				break stackLoop;
			}
			else console.log("showMessageFromStackTrace: sourcePath in filePath: nope");
		}
	}
			
			return file;
		}
		
		if(!file || !lineno) {
			stackLines = UTIL.parseStackTrace(errorStack)
			console.log("showMessageFromStackTrace: Trying UTIL.parseStackTrace: " + (!!stackLines));
			if(stackLines) {
			var file = findFile(stackLines);
			}
			else {
				console.warn("showMessageFromStackTrace: Failed to get file from errorStack=", errorStack);
			}
		}
		
		if(file && lineno) {
			var row = lineno - 1;
		var gridRow = file.grid[row];
		if(!gridRow) { // Sanity check
				return new Error("Error found on row=" + row + " but the file only has file.grid.length=" + file.grid.length);
		}
		var indentationCharacters = file.grid[row].indentationCharacters.length;
		var col = colno - indentationCharacters;
		
		if(level == 1) file.scrollToLine(lineno); // Only scroll there if it's an error
		
		EDITOR.addInfo(row, col, message, file, level);
		
		if(EDITOR.currentFile != file) EDITOR.showFile(file);
		
		return SUCCESS;
		
	}
		else console.warn("showMessageFromStackTrace: file=" + file + " lineno=" + lineno + " Unable to locate an open file from stackLines=" + JSON.stringify(stackLines, null, 2));
	
	return FAIL;
}

EDITOR.getSSHPublicKey = function getSSHPublicKey(callback) {
	var pubKeyPath = ".ssh/id_rsa.pub";
	
		var homeDir = (EDITOR.user && EDITOR.user.homeDir) || UTIL.homeDir(EDITOR.workingDirectory);
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
		var codes = EDITOR.openDialogs.map(function(dialog) { return dialog.code + " = " + UTIL.shortString(dialog.div.innerText, 50) });
		throw new Error( "No dialogs where closed! dialogCode=" + dialogCode + " EDITOR.openDialogs.length=" + EDITOR.openDialogs.length + " codes=" + JSON.stringify(codes) );
	}
}

	EDITOR.isTextInputElement = function isTextInputElement(el) {
		return el &&   (( el.nodeName == "INPUT" &&  (el.type == "text" || el.type == "password") ) || el.nodeName == "TEXTAREA")
	}
	
	EDITOR.typeIntoElement = function typeIntoElement(el, text) {
		// Inserts text into an DOM text input element, useful for virtual keyboard or playback
		
		var characters = [];
		
		if(typeof text == "string") {
			for(var i=0; i<text.length; i++) {
				characters.push({
					key: text[i], 
					code: text.charCodeAt(i)
				});
			}
		}
		else if(typeof text == "number") {
			// Assume it's a character code
			characters.push({
				key: String.fromCharCode(text),
				code: text
			});
			text = characters[0].key;
		}
		else {
			throw new Error('Expected second argument "text" to be a string or character code!');
		}
		
		if(EDITOR.isTextInputElement(el)) {
			insertAtCaret(el, text);
		}
		
		el.focus();
		
		// Fire events 
		characters.forEach(function fireEvent(str) {

			var ev = {
				charCode: str.code,
				key: str.key,
				shiftKey: false,
				altKey: false,
				ctrlKey: false
			}
			
			// note: KeyCode is *not* the same as charCode!
			var keyCode;
			
			if(str.key == "\r") keyCode = 13;
			
			
			if(keyCode) ev.keyCode = keyCode;
			
			
			
			var keydown = new Event('keydown');
			var keyup = new Event('keyup');
			var keypress = new Event('keyup');
			
			UTIL.addProps(ev, keydown);
			UTIL.addProps(ev, keyup);
			UTIL.addProps(ev, keypress);
			
			el.dispatchEvent(keydown);
			el.dispatchEvent(keyup);
			el.dispatchEvent(keypress);
		});
		
		function insertAtCaret(t, text) {
			/*
				The caret is lost when the element is blurred, eg when you push a button on the virtual keyboard.
				Solution: Save the caret position every time the element blurs
			*/
			
			if(text == undefined) throw new Error("text=" + text + " t=", t);
			
			var sTop = t.scrollTop || parseInt(t.getAttribute("sTop")) || 0;
			var selStart = t.selectionStart || parseInt(t.getAttribute("selStart")) || 0;
			var selEnd = t.selectionEnd || parseInt(t.getAttribute("selEnd")) || 0;
			
			console.log("insertAtCaret: text=" + text + " Element: id=" + t.id + " sTop=" + sTop + " selStart=" + selStart + " selEnd=" + selEnd);
			
			if( typeof selStart != "number" || isNaN(selStart) ){
				throw new Error("Unable to get caret position (selStart=" + selStart + ") for element id=" + t.id + " selectionStart=" + t.selectionStart + " attribute selStart=" + t.getAttribute("selStart") + " value=" + t.value );
			}
			if( typeof selEnd != "number" || isNaN(selEnd) ){
				throw new Error("Unable to get selection end (selEnd=" + selEnd + ") for element id=" + t.id + " selectionEnd=" + t.selectionEnd + " attribute selEnd=" + t.getAttribute("selEnd") + " value=" + t.value );
			}
			if( typeof sTop != "number" || isNaN(sTop) ) {
				throw new Error("Unable to get scroll position (sTop=" + sTop + ") for element id=" + t.id + " scrollTop=" + t.scrollTop + " attribute sTop=" + t.getAttribute("sTop") + " value=" + t.value );
			}
			
			//console.log("selStart=" + selStart + " (" + t.getAttribute("sTop") + ")");
			
			var front = (t.value).substring(0, selStart);
			var back = (t.value).substring(selEnd, t.value.length);
			
			
			if(text == "←") {
				if(selStart>0) selStart--;
			}
			else if(text == "→") {
				if(selStart<t.value.length) selStart++;
			}
			else if(text == "↑") {
				if(sTop>0) sTop--;
			}
			else if(text == "↓") {
				sTop++;
			}
			else if(text == "\b") {
				console.log("Deleting character: " + front.slice(-1) + " at selStart=" + selStart);
				t.value = front.slice(0, -1) + back;
				selStart = selStart - 1;
			}
			else {
				console.log("Adding character(s): " + text + " at selStart=" + selStart);
				t.value = front + text + back;
				selStart = selStart + text.length;
			}
			
			t.selectionStart = selStart;
			t.selectionEnd = selStart;
			t.focus();
			t.scrollTop = sTop;
			
			t.setAttribute("sTop", sTop);
			t.setAttribute("selStart", selStart);
			t.setAttribute("selEnd", selStart);
			
			
			if(EDITOR.settings.devMode) {
				// Sanity check
				var sTop = t.scrollTop || parseInt(t.getAttribute("sTop"));
				var selStart = t.selectionStart || parseInt(t.getAttribute("selStart"));
				var selEnd = t.selectionEnd || parseInt(t.getAttribute("selEnd"));
				
				if( typeof selStart != "number" || isNaN(selStart) ){
					throw new Error("Nuked selectionStart for element id=" + t.id + " selectionStart=" + t.selectionStart + " attribute selStart=" + t.getAttribute("selStart") );
				}
				if( typeof selEnd != "number" || isNaN(selEnd) ){
					throw new Error("Nuked selection end for element id=" + t.id + " selectionEnd=" + t.selectionEnd + " attribute selEnd=" + t.getAttribute("selEnd") );
				}
				if( typeof sTop != "number" || isNaN(sTop) ) {
					throw new Error("Nuked scroll position for element id=" + t.id + " scrollTop=" + t.scrollTop + " attribute sTop=" + t.getAttribute("sTop") );
				}
			}
			
		}
	}
	
	if('speechSynthesis' in window) {
		EDITOR.say = function say(text, rate) {
			
			console.log("EDITOR.say: text=" + text + " rate=" + rate);
			
			if(rate == undefined) rate = EDITOR.speechRate;
			
			window.speechSynthesis.cancel(); // Stop ongoing speach
			
			//clearTimeout(sayingTimer);
			
			// Prevent current text from canceling
			var sayingTimer = setTimeout(function() {
				
				if(text == undefined) throw new Error("No text! text=" + text);
				
				if(rate !== undefined) {
					if(rate < 0.1) throw new Error("Lowest rate is 0.1");
					if(rate > 10) throw new Error("Highest rate is 10");
				}
				
				console.log("EDITOR.say:Speaking: text=" + text);
				
				var msg = new SpeechSynthesisUtterance(text);
				
				msg.volume = 1; // 0 to 1
				msg.rate = rate || 1; // 0.1 to 10
				msg.pitch = 2; //0 to 2
				msg.text = text;
				msg.lang = 'en-US';
				
				msg.onend = function(e) {
					console.log('EDITOR.say: Finished speak in ' + e.elapsedTime + ' seconds.');
				};
				
				msg.onerror = function(event) {
					console.log("EDITOR.say: " + event.error);
				};
				
				window.speechSynthesis.speak(msg);
				
			}, 10);
			
		}
	}
	else {
		console.warn("Speech Synthesis not available! browser=" + BROWSER + "");
	}
	
	
	/*
		Encrypting sounds like a good idea, but it depens on what you want to protect from.
		For example:
		* Laptop get stolen
		* Server get hacked
		
		What happens when you forget the password for the key or lose the key?
		All encrypted data, inluding backups of encrypted data will be useless.
		
		When the key is changed, the editor need to remember everything it encrypted with that key
		and re-encrypt it with the new key...
	*/
	EDITOR.encrypt = function encrypt(str) {
		console.warn("EDITOR.encryp not yet implemented!");
		return str;
	}
	EDITOR.decrypt = function decryot(str) {
		return str;
	}
	
	EDITOR.sendFeedback = function sendFeedback(feedback, subject, silent) {
		UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: feedback, namn: 'WebIDE', subject: subject ? subject: "WebIDE feedback", robot: "42" }, function (err, respStr) {
			if(silent) return;

			if(err) {
				alertBox("Problem sending feedback! Error: " + err.message + "\n");
				EDITOR.putIntoClipboard(feedback, "Copy feedback to clipboard");
				throw err;
			}
			else if(respStr.indexOf("Bad Gateway") != -1 || respStr.indexOf("Meddelande mottaget") == -1) {
				alertBox("Problem sending feedback. Please e-mail it it to editor@webtigerteam.com (it will be copied to clipboard) Error: " + respStr + "");
				console.log("respStr=" + respStr);
			
				EDITOR.putIntoClipboard(feedback, "Copy feedback to clipboard");

			}
			else {
				alertBox('Thanks for your invaluable feedback! ' + 
				' Don\'t hesitate to <a href="mailto: editor@webtigerteam.com">contact support</a> if you have more feedback, questions or issues.' +
				' ');
			}
		});
	}
	
	EDITOR.findFileReverseRecursive = function findFiles(names, startDir, callback) {
		/*
Searches down towards the root, looking for file names
*/
		if(typeof names == "string") names = [names];
		
		var filesFound = [];
		var folders = UTIL.getFolders(startDir, true);
		
		search(folders.pop()); // Search down recursively
		
		return true;
		
		function search(currentFolder) {
			EDITOR.listFiles(currentFolder, function listedFiles(err, files) {
				
				console.log("findFileReverseRecursive: startDir=" + startDir + " currentFolder= " + currentFolder + " err=" + (err && err.message));

				if(err) {
					// File/folder has probably been deleted! Or we have been disconnected Or we don't have access
					return callback(err);
					callback = null;
				}
				
				for (var i=0; i<files.length; i++) {
					if(names.indexOf(files[i].name) != -1) {
						console.log("findFileReverseRecursive: Found " + files[i].name + " in " + JSON.stringify(names));
						filesFound.push(UTIL.trailingSlash(currentFolder) + files[i].name);
					}
				}
				
				if(folders.length > 0) search(folders.pop());
				else {
					return callback(null, filesFound);
					callback = null;
				}
				
			});
		}
	}
	
	// ## Eval worker
	try {
		var evalWorker = new Worker("safeEval.js");
	}
	catch(err) {
		console.error(err);
		var workerInitError = err;
	}
	var evalWorkerCounter = 0;
	var evalWorkerCallbacks = {};
	if(evalWorker) {
		evalWorker.addEventListener('message', function(msg) {

			var obj = msg.data;

			console.log("from evalWorker: obj=", obj);

			var id = obj.id;

			if(!evalWorkerCallbacks.hasOwnProperty(id)) throw new Error("evalWorker: No callback for answer with id=" + id);

			var callback = evalWorkerCallbacks[id];
			callback(obj.error, obj.result);
		});
	}
	EDITOR.eval = function evaluate(str, callback) {
		if(!evalWorker) return callback(new Error("Web Workers not supported by browser=" + BROWSER + "! (" + workerInitError.message + ")"));

		if(typeof callback != "function") throw new Error("Second argument to EDITOR.eval needs to be a callback function!");

		var id = evalWorkerCounter++;

		evalWorkerCallbacks[id] = callback;

		evalWorker.postMessage({
			id: id,
			str: str
		});

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
		
			console.log("Calling exit event listeners...");
			EDITOR.fireEvent("exit", ["close"], function(err, returns) {
				console.log("All exit event listeners called!");
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
	EDITOR.eventListeners.exit.push({
			fun: function exitKioskMode() {
			var GUI = require('nw.gui').Window.get();
			GUI.leaveKioskMode();
			return true;
	}
		});
	
	EDITOR.eventListeners.exit.push({
			fun: function closeOpenConnections() {
			
			for(var serverAddress in EDITOR.connections) CLIENT.cmd("disconnect", {serverAddress: serverAddress});
			
			return true;			
	}
		});
	
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
window.addEventListener("resize", function resizeAndRenderOnInteraction(resizeEvent) {
	console.warn("EVENT RESIZE!");
	EDITOR.resizeNeeded();
	EDITOR.renderNeeded();
	
	EDITOR.interact("resize", resizeEvent);
	
}, false);
	
	window.addEventListener("unload", function unloading() {
		console.log("unload event!");
		
		// It is unlikely that we manage to run all exit events...
		console.log("Calling exit event listeners...");
		EDITOR.fireEvent("exit", ["unload"], function afterExitEvent(err, returns) {
			console.log("All exit event listeners called!");
			if(err) console.error(err);
		});
		
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
	
		if(target.className == "allowDefault") {
			console.log("contextmenu: (target.className=allowDefault)");
			return true;
		}

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
	
		var canvas = EDITOR.canvas = document.getElementById("editorCanvas");
		
		EDITOR.initCanvas(canvas);
	
		var ctx = EDITOR.getCanvasContext(canvas);
		
		
		
		// Don't bother resetting the canvas context here, wait for the resize!
	
		
		setTimeout(debugCtx, 1);
		setTimeout(debugCtx, 10);
		setTimeout(debugCtx, 100);
		setTimeout(debugCtx, 1000);
		
		function debugCtx() {
			console.log("DebugCtx: (interval) windowLoaded=" + windowLoaded + " ctx.imageSmoothingEnabled=" + ctx.imageSmoothingEnabled + " EDITOR.canvasContext.imageSmoothingEnabled=" + EDITOR.canvasContext.imageSmoothingEnabled + " ctx==EDITOR.canvasContext?" + (EDITOR.canvasContext==ctx) + " ctx.font=" + ctx.font);
		}
		
		
	EDITOR.resizeNeeded(); // We must call the resize function at least once at editor startup.
	
	EDITOR.bindKey({desc: "Autocomplete", charCode: EDITOR.settings.autoCompleteKey, fun: EDITOR.autoComplete, combo: 0});
	//keyBindings.push({charCode: EDITOR.settings.autoCompleteKey, fun: EDITOR.autoComplete, combo: 0});
	
	EDITOR.windowMenu.add(S("Autocomplete"), [S("Edit"), 2], EDITOR.autoComplete);
	
	EDITOR.bindKey({desc: "Show context menu", key: "ContextMenu", 
			fun: function showContextMenu(file, combo, character, charCode, direction, targetElementClass, keyDownEvent) {
			EDITOR.input = false;
				EDITOR.ctxMenu.show(keyDownEvent);
			return PREVENT_DEFAULT;
		}
	});
		
		EDITOR.registerAltKey({
			char: ";", alt:1, label: "☰", fun: function() {
				EDITOR.ctxMenu.show(EDITOR.canvas);
			}
		});
		
		EDITOR.registerAltKey({char: "space", alt:2, label: "Preview", fun:
		function(file, combo, character, charCode, direction, targetElementClass, someEvent) {
			EDITOR.previewTool(file, someEvent);
		}
	});
	
		EDITOR.windowMenu.add(S("live_preview"), [S("Tools"), 1], EDITOR.previewTool);
	
		EDITOR.registerAltKey({char: "Enter", alt:1, label: S("run"), fun:
		function(file, combo, character, charCode, direction, targetElementClass, someEvent) {
			EDITOR.runScript(file, someEvent);
		}
	});
	
		EDITOR.registerAltKey({char: "Enter", alt:2, label: S("stop"), fun:
		function(file, combo, character, charCode, direction, targetElementClass, someEvent) {
			EDITOR.stopScript(file, someEvent);
		}
	});
	
	EDITOR.registerAltKey({char: "c", alt:1, label: "Commit", fun:
		function(file, combo, character, charCode, direction, targetElementClass, someEvent) {
			EDITOR.commitTool(file);
		}
	});
	
	
	window.onbeforeunload = confirmExit;
	
		window.onblur = function() {
			console.log("window.onblur!");
			EDITOR.windowGotFocus = false;
			// If user is holding down a key, we probably wont get the keyup event!
			EDITOR.metaKeyIsDown = false;
			EDITOR.ctrlKeyIsDown = false;
			if(typeof recognition != "undefined" && voiceCommandsEnabled) {
				recognition.stop();
			}
		}
		
		window.onfocus = function() {
			console.log("window.onfocus!");
			EDITOR.windowGotFocus = true;
		}
		
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
				homeDir: login.homeDir,
				platform: login.platform,
domain: login.tld && (login.user + "." + login.tld)
		};

if(login.netnsIP) EDITOR.user.netnsIP = login.netnsIP;
		
			if(login.homeDir != "/") EDITOR.stat("nochroot");
			
		if(!login.installDirectory) console.warn("Did not get install directory! login=" + JSON.stringify(login));
		
		EDITOR.installDirectory = login.installDirectory || "/";
		//alertBox(JSON.stringify(login));
		
			console.log("Logged in as user: " + EDITOR.user.name + " on a " + EDITOR.user.platform + " server");
		
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
			
				if(_serverStorage.showDiscoveryBar == "false") {
					EDITOR.discoveryBar.hide();
				}
else if(_serverStorage.showDiscoveryBar == "true") {
EDITOR.discoveryBar.show();
}
				
				if(_serverStorage.showDiscoveryBarCaptions) EDITOR.discoveryBar.toggleCaptions(_serverStorage.showDiscoveryBarCaptions);
				
				
			// Many plugins depend on the storage being available ...
			// They need to be refactored to start on EDITOR.on("storageReady" ... !!
				// Treat EDITOR.storage like window.localStorage! Eg. It's all strings so you have to JSON.parse !
			
				var f = EDITOR.eventListeners.storageReady.map(funMap);
				for(var i=0; i<f.length; i++) {
					f[i](_serverStorage);
			}
		});
			
			UTIL.setCookie("user", login.user, 999);
	});
	
		CLIENT.on("workerClose", function() {
			//alertBox("workerClose event!");
			fileOpenExtraCallbacks.length = 0;
			EDITOR.openFileQueue.length = 0;
	});
	
		
	var progressValue = 0;
	var progressMax = 1;
	CLIENT.on("progress", function handleProgress(increment) {
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
	
		
		if(EDITOR.saveBandwith) alertBox("Some editor functionality has been turned off to save data/bandwith (data-saver in enabled on your device)");
		
		
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
		var f = EDITOR.eventListeners.start.map(funMap);
		for(var i=0; i<f.length; i++) {
			//console.time("Start listener: " + UTIL.getFunctionName(f[i]));
			f[i](); // Call function
			//console.timeEnd("Start listener: " + UTIL.getFunctionName(f[i]));
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
	
		var pluginLoaders = EDITOR.plugins.map(function(p) {return p.load});
		console.log("Loading plugins (length=" + pluginLoaders.length + ")");
		for(var i=0; i<pluginLoaders.length; i++) {
			
			//console.time("Load plugin: " + UTIL.getFunctionName(pluginLoaders[i]));
			
		if(EDITOR.settings.devMode) {
				pluginLoaders[i](EDITOR);
		}
		else {
			// An error in any of the plugins will make all plugins after it to not load! So we have to use a try catch
			try {
					pluginLoaders[i](EDITOR); // Call function (and pass global objects!?)
			}
			catch(err) {
				console.error(err.message);
				console.log(err.stack);
					alertBox('Failed to (fully) run:\n<i>"' + UTIL.getFunctionName(pluginLoaders[i]) + '"</i>\nError: ' + err.message);
			}
		}
			
			//console.timeEnd("Load plugin: " + UTIL.getFunctionName(pluginLoaders[i]));
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
		
		showDisoveryBarWindowMenuItem = EDITOR.windowMenu.add(S("discovery_bar"), [S("View"), 130], EDITOR.discoveryBar.toggle);
		showDisoveryBarCaptions = EDITOR.windowMenu.add(S("discovery_bar_captions"), [S("View"), 135], EDITOR.discoveryBar.toggleCaptions);
		showDisoveryBarCaptions.activate();
		
		var hideDiscoveryBarButton = document.createElement("button");
		hideDiscoveryBarButton.title = "Hide discovery bar icons";
		hideDiscoveryBarButton.classList.add("hide");
		hideDiscoveryBarButton.innerText = "Hide";
		hideDiscoveryBarButton.onclick = EDITOR.discoveryBar.hide;
		EDITOR.discoveryBar.add(hideDiscoveryBarButton, 1000)
		
		/*
			Always show the discovery bar! Even if it will be hidden later when user settings is loaded
			This will make it "blink".
			But we want to show the discovery bar by default if the user has not logged in (for a first time user)
		*/
		if(EDITOR.discoveryBar.enabled && !(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("discoveryBar") != -1)) EDITOR.discoveryBar.show();
		
		
		// Voice recognition only works for some people...
		enableVoiceCommands = EDITOR.windowMenu.add(S("enable_voice_commands"), [S("Editor"), 50], toggleVoiceCommands);
		
		
		console.log("typeof navigator.keyboard = " + (typeof navigator.keyboard));
		if(typeof navigator.keyboard == "object") {
			//navigator.keyboard.lock();
		}
		
		// Loading styles reset
		setTimeout(function() {
			document.getElementById("wireframe").classList.remove("beforeload");
			document.getElementById("header").classList.remove("beforeload");
			document.getElementById("columns").classList.remove("beforeload");
			document.getElementById("leftColumn").classList.remove("beforeload");
			document.getElementById("editorCanvas").classList.remove("beforeload");
			EDITOR.resizeNeeded(); // If the measurements in beforeload CSS is correct there won't be a resize!
		}, 1000); // Wont get the login dialog in the footer until the reset!
		
		sendStatistics();
		
		
		
		windowLoaded = true;
	}
	
	function toggleVoiceCommands() {
		
		if(voiceCommandsEnabled) {
			enableVoiceCommands.deactivate();
			voiceCommandsEnabled = false;
		}
		else {
			
			if(recognition == undefined) {
				if(SpeechRecognition) {
					var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
					var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
					var speechRecognitionList = new SpeechGrammarList();
					recognition = new SpeechRecognition();
					//recognition.continuous = false;
					recognition.lang = 'en-US';
					recognition.interimResults = false;
					recognition.maxAlternatives = 1;
					recognition.onresult = speechRecognitionResult;
					recognition.onspeechend = function speechRecognitionEnd() {
						recognition.stop();
					}
					recognition.onerror = function speechRecognitionError(ev) {
						alertBox("Speech recognition error: " + ev.error);
					}
					recognition.onnomatch = function speechRecognitionNomatch(ev) {
						console.log(ev);
						console.warn("Speech recognition found no matching commands!");
					}
				}
				else {
					alertBox("SpeechRecognition is not supported by your BROWSER=" + BROWSER);
					return;
				}
			}
			
			enableVoiceCommands.activate();
			voiceCommandsEnabled = true;
		}
		
	}
	
	function sendStatistics() {
		if(EDITOR.statsEnabled && typeof stats == "object" && Object.keys(stats).length > 0) {
			
			if(typeof navigator.sendBeacon == "function") {
				var sent = navigator.sendBeacon("https://www.webtigerteam.com/editor/stats", "json=" +  encodeURIComponent(JSON.stringify(stats)));
				if(sent) reset();
			}
			else {
				var post = {json: JSON.stringify(stats)};
				UTIL.httpPost("https://www.webtigerteam.com/editor/stats", post, function(err, resp) {
					if(err == null && resp == "OK") {
						reset();
					}
				});
			}
		}
		
		function reset() {
			stats = {};
			clearTimeout(saveStatsTimer);
			EDITOR.localStorage.setItem("_stats_", JSON.stringify(stats), function(err) {
				if(err) {
					console.error(err);
				}
			});
		}
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
		
		if(EDITOR.openDialogs.length > 0) return alert("Close all open dialogs before running tests!"); // Tests that try to close dialogs could otherwise fail
		
		EDITOR.dashboard.hide(true);
		
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
			
			EDITOR.dashboard.stayHidden = false;
			
			if(fails === 0) {
				//EDITOR.closeAllDialogs();
				testResults.push("All " + finished + " tests passed!")
			}
			else testResults.push(fails + " of " + finished + " test failed:");
			
			EDITOR.openFile("testresults.txt", testResults.join("\n"), function(err, file) {
				
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
	if(speechRecognitionEvent == undefined) throw new Error("speechRecognitionResult: speechRecognitionEvent=" + speechRecognitionEvent);

	var last = speechRecognitionEvent.results.length - 1;
	var speechResult = speechRecognitionEvent.results[last][0].transcript;
	//var speechResult = speechRecognitionEvent.results[0][0].transcript;
	
	console.log ("speechResult=" + speechResult);
	
	var file = EDITOR.currentFile;
	
		// Need to copy list in case of one listener removing itself 
		var voiceListeners = EDITOR.eventListeners.voiceCommand.map(function(voiceListener) {  return {re: voiceListener.re, fun: voiceListener.fun}  });
		console.log("Calling voiceCommand listeners (" + voiceListeners.length + ")");
		for(var i=0, re, match, captured; i<voiceListeners.length; i++) {
			re = voiceListeners[i].re;
		if(re) {
			match = speechResult.match(re);
			if(match) {
					captured = voiceListeners[i].fun(speechResult, file, match);
					if(captured != true && captured != false) throw new Error(UTIL.getFunctionName(voiceListeners[i].fun) 
				+ ' did not return true or false (' + captured + ') to indicate if it "captured" the voice command.');
				if(captured === true) {
					break;
				}
			}
		}
			else voiceListeners[i].fun(speechResult, file);
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
		
			var reImage = /^data:image\/(.*);base64,/;
			var matchImage = text.match(reImage);
			if(matchImage) {
				var ext = matchImage[1];
				EDITOR.openFile("image." + ext, text, {image: true}, function(err, file) {
					if(err) alertBox("Failed to open text as image: " + err.message);
				});
				return;
			}
			
			var reBlobUrl = /^blob:.*:\/\//;
			var matchBlobUrl = text.match(reBlobUrl);
			if(matchBlobUrl) {
				
				console.log("fileDrop: Dropped a blob URL ...")
				
// Blob URL's can only be accessed if they are from the same page :/

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
			
			
			// todo: What if you drop a single folder ?
			
			var file = fileDropEvent.dataTransfer.files[0];
			var filePath = file.path || file.name;
			
			console.log("fileDrop: Dropped Single file !? file.path=" + file.path + " file.name=" + file.name);
			
			if(filePath.indexOf("/") == -1 && filePath.indexOf("\\") == -1) filePath = (EDITOR.workingDirectory || "/upload/") + filePath;
			
			var fileType = file.type;
			
			// The default action is to open the file in the editor.
			// But if the editor don't support the file, ask plugins what to do with it ...
			var handled = false;
			if(!supported(fileType)) {
				
				var f = EDITOR.eventListeners.fileDrop.map(funMap);
				console.log("fileDrop: File is not supported. Calling fileDrop listeners (" +f.length + ")");
				for(var i=0, h=false; i<f.length; i++) {
					h = f[i](file);
					if(h) handled = true;
				}
				
				if(!handled) {
					promptBox("Where do you want to save the dropped " + fileType + " file ?", {defaultValue: filePath}, function(path) {
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

if(!EDITOR.user) return alertBox("Need to be logged in to upload files!");

			path = path || UTIL.joinPaths(EDITOR.user.homeDir, "/upload/");
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
				//var tmpPath = UTIL.joinPaths([EDITOR.workingDirectory, filePath]);
					console.log("fileDrop: Saving file to disk before opening because content.length=" + content.length + " > " + EDITOR.settings.bigFileSize + " : " + filePath);
				
					EDITOR.checkPath(filePath, "Do not upload", function(err, fullPath) {
					if(err) {
						if(err.code != "CANCEL") alertBox(err.message);
						return;
					}
					EDITOR.saveToDisk(fullPath, content, function fileSavedMaybe(err) {
						if(err) throw err;
						
						EDITOR.openFile(fullPath);
					});
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
	else if(msg.disablePlugin) EDITOR.disablePlugin(msg.disablePlugin, true);
		else if(msg.createFile) {
			
			console.log("createFile: ", EDITOR.user);
			
			if(EDITOR.user) createFileOnce(false);
			else {
				console.log("createFile: Waiting for login ...");
				CLIENT.on("loginSuccess", createFileOnce);
			}
			
		}
		else {
			console.warn("Ddoes not recognise msg=" + msg);
		//throw new Error("Unable to handle message: " + msg);
	}
		
		EDITOR.stat("window_message");
		
		function createFileOnce(removeListener) {
			console.log("createFileOnce! removeListener=" + removeListener)
			var filePath = UTIL.joinPaths(EDITOR.user.homeDir, "/embed/", msg.createFile.path);
			var content = msg.createFile.content;
			createFile(filePath, content);
			if(removeListener !== false) CLIENT.removeEvent("loginSuccess", createFileOnce);
		}
		
		function createFile(filePath, content) {
			console.log("createFile: filePath=" + filePath);
			EDITOR.createPath(UTIL.getDirectoryFromPath(filePath), function(err, path) {
				if(err) return alertBox("Unable to create path:" + filePath + " Error:" + err.message);
				EDITOR.saveToDisk(filePath, content, function(err, path) {
					if(err) return alertBox("Unable save file path:" + filePath + " Error:" + err.message);
					EDITOR.openFile(filePath);
				});
			});
		}
		
}

function copy(copyEvent) {
	
		console.warn("copyEvent EDITOR.input=" + EDITOR.input + 
	" EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + 
	" giveBackFocusAfterClipboardEvent=" + giveBackFocusAfterClipboardEvent + 
		" EDITOR.input=" + EDITOR.input + 
		" copyEvent.target=" + copyEvent.target);
	
		nativeCopy = false; // Allow next key press to register
		
	if(EDITOR.settings.useCliboardcatcher && giveBackFocusAfterClipboardEvent) {
		// Give focus back to the editor/canvas
		EDITOR.input = true;
			EDITOR.canvas.focus();
		giveBackFocusAfterClipboardEvent = false;
	}
	
		if(EDITOR.input && EDITOR.currentFile && (EDITOR.currentFile instanceof File)) {
		
		var textToPutOnClipboard = "";
		
		if(EDITOR.currentFile) {
				if(EDITOR.currentFile instanceof File) textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
		}
		
		if(textToPutOnClipboard == "") {

				console.warn("Prevented clearing the clipboard!");
				
			}
			else {
				if (BROWSER.indexOf("MSIE") == 0) {
			window.clipboardData.setData('Text', textToPutOnClipboard);    
		} else {
			copyEvent.clipboardData.setData('text/plain', textToPutOnClipboard);
		}
		copyEvent.preventDefault();
		
			var f = EDITOR.eventListeners.copy.map(funMap);
			console.log("Calling copy listeners (" + f.length + ") workingDirectory=" + workingDirectory);
			for(var i=0; i<f.length; i++) {
				//console.log("function " + UTIL.getFunctionName(f[i]));
				f[i](textToPutOnClipboard, true, false); // Call function
			}
			
			EDITOR.pseudoClipboard = textToPutOnClipboard;
			console.log("copy: Put " + textToPutOnClipboard.length + " characters into EDITOR.pseudoClipboard");
			}
		}
		else {
			// Do the default action (enable copying outside the canvas)
			console.warn("Copying outside the canvas! EDITOR.input=" + EDITOR.input);
		}
		
	//console.log("textToPutOnClipboard=" + textToPutOnClipboard);
	
		EDITOR.interact("copy", copyEvent);
	
	return textToPutOnClipboard;
}

function cut(cutEvent) {
	
	console.log("cutEvent EDITOR.input=" + EDITOR.input + " EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + " giveBackFocusAfterClipboardEvent=" + giveBackFocusAfterClipboardEvent);
	
		nativeCut = false; // Allow next key press to register
		
	if(EDITOR.settings.useCliboardcatcher && giveBackFocusAfterClipboardEvent) {
		// Give focus back to the editor/canvas
		EDITOR.input = true;
			EDITOR.canvas.focus();
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
	
		nativePaste = false; // Allow next key press to register
		
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
			EDITOR.canvas.focus();
		giveBackFocusAfterClipboardEvent = false;
	}
	
	//console.log("PASTE: " + UTIL.lbChars(text));
	
		var f = EDITOR.eventListeners.paste.map(funMap);
			console.log("Calling paste listeners on paste event (" + f.length + ") ...");
			for(var i=0; i<f.length; i++) {
			
				ret = f[i](EDITOR.currentFile, text, pasteEvent);
			
				if(EDITOR.settings.devMode) console.log("Paste listener: " + UTIL.getFunctionName(f[i]) + " returned: (" + (typeof ret) + ") \n" + ret);
			
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
		
		if(EDITOR.input && EDITOR.currentFile) {
			
			pasteEvent.preventDefault();
		// Insert text at caret position
		if(EDITOR.currentFile && EDITOR.currentFile instanceof File) {
			var file = EDITOR.currentFile;
			
			text = EDITOR.sanitizeText(file, text);
			
				
				/*
					// Make sure the copied text has the wanted line-break convention before inserting it
					var lbText = UTIL.determineLineBreakCharacters(text);
					if(file.lineBreak != lbText) {
					alertBox("Replacing " + UTIL.lbChars(lbText) + " with " + UTIL.lbChars(file.lineBreak));
					text = text.replace(new RegExp(lbText, "g"), file.lineBreak);
					}
					else {
					alertBox("lbText=" + UTIL.lbChars(lbText) + " same as file.lineBreak=" + UTIL.lbChars(file.lineBreak));
					}
				*/
				
				text = UTIL.fixInconsistentLineBreaks(text, file.lineBreak);
				
				
				// If there is a text selection. Delete the selection first!
			file.deleteSelection();
			
			file.insertText(text);
			
			//file.fixCaret();
				
				
				/*
					In Chrome pressing Ctrl+Shift+V will paste.
					But keydown is called before paste event!
					So if you have something bound to Ctrl+Shift+V nothing will be pasted!
					
					After pasting, Chrome will call keyPressed. 
					And there seem to be no way to prevent Chrome from calling keyPressed. 
					eg. preventDefault doesn't work.
					Resulting in a dialog asking the user what to do as keyPressed thinkgs a Control character was inserted.
					
					In Safari and Firefox Ctrl/Cmd+Shift+V will do nothing
					
					Ctrl+Shift+V in Chrome means "paste as plain text".
					But the editor already does that for Ctrl+V
					(There doesn't seem to be a way to get the "richtext" from the clipboard, just the plain text)
				*/
				
		}
	}
	else {
			// Do the default action (enable pasting outside the canvas)
			console.log("paste: Not inserting text because EDITOR.input=" + EDITOR.input + " EDITOR.currentFile=" + EDITOR.currentFile);
	}
	
		
	EDITOR.interact("paste", pasteEvent);
	
}

	EDITOR.onPaste = paste; // Used for automated tests


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
	
		console.warn("keyPressed: charCode=" + charCode + " character=" + character + " (key=" + keyPressEvent.key + " code=" + keyPressEvent.code + " charCode=" + keyPressEvent.charCode + ", keyCode=" + keyPressEvent.keyCode + ", which=" + keyPressEvent.which + ") combo=" + JSON.stringify(combo) + " EDITOR.input=" + (EDITOR.currentFile ? EDITOR.input : "NoFileOpen EDITOR.input=" + EDITOR.input + "") + "");
	
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
	
		var f = EDITOR.eventListeners.keyPressed.map(funMap);
		console.log("Calling keyPressed listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			funReturn = f[i](file, character, combo, keyPressEvent); // Call function
		
		if(funReturn !== true && funReturn !== false) {
				throw new Error("keyPressed event listener: " + UTIL.getFunctionName(f[i]) + 
			" did not return true or false!");
		}
		
		if(funReturn === false && !preventDefault) {
			preventDefault = true;
				if(file && EDITOR.input) {
console.log(UTIL.getFunctionName(f[i]) + " prevented insertion of character=" + character + " into file.path=" + file.path);
				}
			}
		}
		
		
		/*
			if(character == benchmarkCharacter) {
			
			//process.nextTick(function() {
			// Test optimization
			var middle = EDITOR.settings.topMargin + (EDITOR.currentFile.caret.row - EDITOR.currentFile.startRow) * EDITOR.settings.gridHeight + Math.floor(EDITOR.settings.gridHeight/2);
			var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + tempTest + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			//var left = EDITOR.settings.leftMargin + (EDITOR.currentFile.caret.col + (EDITOR.currentFile.grid[EDITOR.currentFile.caret.row].indentation * EDITOR.settings.tabSpace) - EDITOR.currentFile.startColumn) * EDITOR.settings.gridWidth;
			EDITOR.canvasContext.fillStyle = "rgb(0,0,0)";
			EDITOR.canvasContext.fillText(benchmarkCharacter, left, middle);
			tempTest++;
			return;
			//EDITOR.canvasContext.fillText(character, 0, Math.floor(EDITOR.settings.gridHeight/2));
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
		
		//console.log("keyPressed: file?" + !!file + " EDITOR.input=" + EDITOR.input + " preventDefault=" + preventDefault + " charCode=" + character.charCodeAt(0) + " ");
		
		if(file && EDITOR.input && !preventDefault) {
			
			if(character.charCodeAt(0) < 32) {
				// This will send a control character and the File will complain...
				// Ask the user what he/she wanted to do
				
				var comboStr = comboSumToString(combo.sum);
				
				// I + SHIFT + CTRL brings up the developer console in most browsers!
				// It seems we can only capture this when running in app mode!
				if(keyPressEvent.key == "I" && comboStr == "SHIFT + CTRL") {
					EDITOR.stat("shift_ctrl_i");
					console.log("Showing developer console!?");
					return;
				}
				//console.log("keyPressEvent.key=" + keyPressEvent.key + " comboStr=" + comboStr);

				promptBox("Missing key-binding for " + keyPressEvent.key + " + " + comboStr + "  \nWhat would you like the editor to do?", 
				{placeholder: "When pressing " + keyPressEvent.key + " + " + comboStr + " the editor should..."},
				function(answer) {
					if(!answer) return;
					
					var message = answer + "\nkey=" + keyPressEvent.key + "\ncombo=" + JSON.stringify(combo) + "\ncomboStr=" + comboStr + "\nBROWSER=" + BROWSER;
					EDITOR.sendFeedback(message, "Keybinding wanted");
				});
				
				return;
			}
			

			// Insert a character at current caret position:
			
			file.putCharacter(character);
			
			// Optimization: Render only the row, instead of the whole screen (20x perf increase on Opera Mobile)
			//EDITOR.renderNeeded();
			EDITOR.renderRow();
			
			
			// Experiment: Hide the caret while typing !?
			
			// Hiding caret is annoying when typing using the virtual keyboard
			// It's also annoying when using space to indentate a plain test file
			var rowContent = file.text.slice(file.grid[file.caret.row].startIndex, file.caret.index);
			var isIndentation = (charCode==32 && !file.fullAutoIndentation && rowContent.match(/^\s*$/) !== null);

			//console.log("FadingCaret: rowContent=" + UTIL.lbChars(rowContent) + " (" + (rowContent.match(/^\s*$/) !== null) + ") isIndentation=" + isIndentation + " charCode=" + charCode + " (" + (charCode==32) + ") file.fullAutoIndentation=" + file.fullAutoIndentation + " (" + (fullAutoIndentation) + ") EDITOR.touchScreen=" + EDITOR.touchScreen + " EDITOR.settings.caretAnimation=" + EDITOR.settings.caretAnimation + " if(" + (  !EDITOR.touchScreen && EDITOR.settings.caretAnimation && !isIndentation  ) + ") ");

			if(  !EDITOR.touchScreen && EDITOR.settings.caretAnimation && !isIndentation  ) {
				
				// First remove any old ones so they do not stop before the caret is fully filled
				clearTimeout(renderCaretTimer);
				EDITOR.removeAnimation(fadeInCaretAnimation);
			
				/*
					console.log("since lastTimeCharacterInserted=" + (new Date() - EDITOR.lastTimeCharacterInserted) +
					" since insert vs action=" + (EDITOR.lastTimeCharacterInserted - EDITOR.lastTimeInteraction) +
					" lastTimeCharacterInserted=" + EDITOR.lastTimeCharacterInserted.getTime() + " lastTimeInteraction=" + EDITOR.lastTimeInteraction.getTime());
				*/
			
				if(new Date() - EDITOR.lastTimeCharacterInserted > 1000 || EDITOR.lastTimeCharacterInserted - EDITOR.lastTimeInteraction < -20 || EDITOR.lastTimeCharacterInserted - EDITOR.lastTimeInteraction > 3000) {
					console.log("FadingCaret: Rendering caret!");
					EDITOR.renderCaret(file.caret);
					EDITOR.canvas.style.cursor = 'text';
					cursorHidden = false;
				}
				else {
					console.log("FadingCaret: Fading caret!");
					
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
						EDITOR.canvas.style.cursor = 'none'; // Hide mouse pointer while typing
						cursorHidden = true;
					}
				
					renderCaretTimer = setTimeout(function() {
						EDITOR.removeAnimation(fadeInCaretAnimation);
						if(file==EDITOR.currenctFile) EDITOR.renderCaret(file.caret);
						EDITOR.canvas.style.cursor = 'text';
						cursorHidden = false;
					}, 3000);
				}
			}
			else {
				// Always render caret
				EDITOR.renderCaret(file.caret);
			}
		}
	
		EDITOR.interact("keyPressed", keyPressEvent);
	
		// Prevent Firefox's quick search (/ slash)
		if(EDITOR.input && charCode == 47) preventDefault = true;
	
		// Prevent Firefox's quick find (' single quote)
		if(EDITOR.input && charCode == 39) preventDefault = true;
	
		// Prevent scrolling down when hitting space in Firefox
		if(EDITOR.input && charCode == 32) preventDefault = true;
	
		EDITOR.stat("key_press");
		
		if(preventDefault) {
			console.log("keyPressed: Preventing default browser action!");
		if(typeof keyPressEvent.preventDefault == "function") keyPressEvent.preventDefault();
		return false;
	}
	else return true;
}

function resizeAndRender(afterResize) {
	
		//console.log("resizeAndRender: EDITOR.shouldResize=" + EDITOR.shouldResize + " EDITOR.shouldRender=" + EDITOR.shouldRender + " EDITOR.isScrolling=" + EDITOR.isScrolling + " windowLoaded=" + windowLoaded);
	
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
					EDITOR.canvasContext.drawImage(EDITOR.canvas, sx*PIXEL_RATIO, sy*PIXEL_RATIO, sWidth*PIXEL_RATIO, sHeight*PIXEL_RATIO, dx, dy, dWidth, dHeight);
			}
			catch(err) {
				var error = new Error(err.message + " sx=" + sx + " sy=" + sy + " sWidth=" + sWidth + " sHeight=" + sHeight + " PIXEL_RATIO=" + PIXEL_RATIO + " dx=" + dx + " dy=" + dy + " dWidth=" + dWidth + " dHeight=" + dHeight);
				throw error;
			}
			
			//EDITOR.shouldRender = false;
			//return;
		}
		
		if(EDITOR.shouldRender) {
			console.log("resizeAndRender: render! EDITOR.isScrolling=" + EDITOR.isScrolling + " fileStartRow=" + fileStartRow + " fileEndRow=" + fileEndRow + " rowDiff=" + rowDiff + " screenStartRow=" + screenStartRow);
			
				EDITOR.render(file, fileStartRow, fileEndRow, screenStartRow, EDITOR.canvas, EDITOR.canvasContext);
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

	EDITOR.metaKeyIsDown = false; // Chrome fires separate event for meta key, you can not combine meta with other key like Meta+A on Chrome
	EDITOR.ctrlKeyIsDown = false;
	
	function keyIsDown(keyDownEvent) {
	/*
		
		note: Windows OS (or Chromium?) has some weird keyboard commands, like Ctrl + I to insert a tab!
		
	*/
	keyDownEvent = keyDownEvent || window.event;
	
	//keyDownEvent.preventDefault();
	
		if(keyDownEvent.metaKey) EDITOR.metaKeyIsDown = true;
		if(keyDownEvent.ctrlKey) EDITOR.ctrlKeyIsDown = true;
		
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
			EDITOR.canvasContext.fillStyle = EDITOR.settings.style.bgColor;
			//EDITOR.canvasContext.fillStyle = "rgba(255,0,0, 0.5)";
			EDITOR.canvasContext.fillRect(left, top, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
		return;
		
		}
	*/
	
		EDITOR.lastKeyDown = key || charCode;
		
		console.log("keyIsDown: key=" + keyDownEvent.key + " charCode=" + charCode + " keyCode=" + keyDownEvent.keyCode + " which=" + keyDownEvent.which + " character=" + character + " lastKeyDown=" + lastKeyDown + " combo=" + JSON.stringify(combo) + " EDITOR.metaKeyIsDown=" + EDITOR.metaKeyIsDown + " targetElementClass=" + targetElementClass + " EDITOR.mode=" + EDITOR.mode + " EDITOR.input=" + EDITOR.input);
	
		//alertBox("keyIsDown: key=" + keyDownEvent.key + " charCode=" + charCode + " keyCode=" + keyDownEvent.keyCode + " which=" + keyDownEvent.which + " character=" + character + " lastKeyDown=" + lastKeyDown + " combo=" + JSON.stringify(combo) + " targetElementClass=" + targetElementClass + " EDITOR.mode=" + EDITOR.mode + " EDITOR.input=" + EDITOR.input);
		
		
		// Voice recognition support in browsers seem to have been discontinued :(
		if(charCode == charCodeCtrl && voiceCommandsEnabled) {
			console.log("keyIsDown: recognition start! (keyDown Ctrl)");
		if(recognition) {
			try {
				recognition.start();
			}
			catch(err) {
					console.error(err);
			}
		}
	}
		
		// Prevent unsupported combo error ? 
		// But what if we want a binding of *just* ALT!?
		// Can't have that or it will mess with all native combos. You need to bind to shift|alt|ctrl PLUS something else
		// Shift <> stopped working
		
		if(charCode == charCodeCtrl) return true; // Ctrl
		if(charCode == charCodeAlt) return true; // ALT
		
		if(combo.alt && combo.shift) {
			console.warn("keyIsDown: Alt + shift is the default for changing keyboard layout in Windows!");
	}
	
	// Be aware of OS/shell specific key bindings! If there for example is a Gnome shell keybinding for Ctrl+Alt+Arrow (switiching workspace) the editor wont capture it! (the arrow key)
	
	
	// PS. Alt Gr = Ctrl+Alt
	// AltGr is the same as hitting Ctrl+ Alt
	
	// You probably want to use bindKey instead of eventListeners.keyDown!
	var f = EDITOR.eventListeners.keyDown.map(funMap);
		//console.log("keyIsDown: Calling keyDown listeners (" + f.length + ") ...");
	for(var i=0; i<f.length; i++) {
		funReturn = f[i](EDITOR.currentFile, character, combo, keyDownEvent); // Call function
		
		if(funReturn === false) {
			preventDefault = true;
			console.log("keyIsDown: Default browser action prevented by keyDown listener " + UTIL.getFunctionName(f[i]) + "!");
		}
	}
	
	if(!preventDefault) {
		// Check key bindings
		var capturedBy = [];
		var f = [];
			console.log("keyIsDown: combo.sum=" + combo.sum + " EDITOR.mode=" + EDITOR.mode);
		for(var i=0, binding; i<keyBindings.length; i++) {
			
			binding = keyBindings[i];
			
			/*
					console.log("keyIsDown: " + UTIL.getFunctionName(binding.fun) + ": " + JSON.stringify(binding) + 
				" char=" + (binding.char == character || binding.charCode == charCode) +
				" combo=" + (binding.combo == combo.sum || binding.combo === undefined) + 
				" dir=" + (binding.dir == "down" || binding.dir === undefined) + 
				" mode=" + (binding.mode == EDITOR.mode || binding.mode == "*") );
			*/
			
			if( (binding.char === character || binding.charCode === charCode || binding.key === key) && // === so that undefined doesn't match null
			(binding.combo == combo.sum || (binding.combo === undefined && combo.sum===0)) && // Esc should not trigger all combinations of Esc
			(binding.dir == "down" || binding.dir === undefined) && // down is the default direction
			(binding.mode == EDITOR.mode || binding.mode == "*") ) {
				
				if(binding.charCode == charCodeShift || binding.charCode == charCodeAlt || binding.charCode == charCodeCtrl) {
					throw new Error("Can't have nice things! Causes a bug that will make native shift+ or algGr+ keyboard combos not work");
				}
				else {
					
					f.push(binding.fun);
					
				}
			}
			else {
					//console.log("keyIsDown: NOT calling function:" + UTIL.getFunctionName(binding.fun) + " " + JSON.stringify(binding));
			}
		}
		
		// call key bindings
		for(var i=0; i<f.length; i++) {
				console.log("keyIsDown: Calling function: " + UTIL.getFunctionName(f[i]) + "...");
			
			if(captured) {
					console.warn("keyIsDown: Key combo has already been captured by " + capturedBy.map(UTIL.getFunctionName).join(",") + " : ");
			}
			
			captured = true;
			capturedBy.push(f[i]);
			
				if(!EDITOR.currentFile) console.warn("keyIsDown: No file open!");
			
			funReturn = f[i](EDITOR.currentFile, combo, character, charCode, "down", targetElementClass, keyDownEvent);
			
				//console.log("keyIsDown: " + UTIL.getFunctionName(binding.fun) + " returned " + funReturn);
			
			if(funReturn === false) { // If one of the functions returns false, the default action will be prevented!
				preventDefault = true;
				console.log("keyIsDown: Default browser action prevented by key binding=" + UTIL.getFunctionName(binding.fun) + "!");
			}
			else if(funReturn !== true) {
					throw new Error("You must make an active choice whether to allow (return true) or prevent (return false) default (chromium) browser action,\
				like typing in input boxes, tabbing between elements, etc. function called: " + UTIL.getFunctionName(binding.fun));
			}
		}
		
	}
	
	// Throwing the actual error here doesn't give a call stack! meh ... Need to see the console.warning to see the call stack
	//if(gotError) throw gotError; // throw new Error("There was an error when calling keyBindings. Se warnings in console log!");
	// Otimally we would want all key bound functions to run before throwing the error, but it's too annoying to not see the call stack in the error
	
		if(EDITOR.currentFile && EDITOR.currentFile instanceof File) {
		EDITOR.currentFile.checkGrid();
		EDITOR.currentFile.checkCaret();
	}
	
	EDITOR.interact("keyDown", {charCode: charCode, target: targetElementClass, shiftKey: keyDownEvent.shiftKey, altKey: keyDownEvent.altKey, ctrlKey: keyDownEvent.ctrlKey});
	
	var leftWindowKey = 91; // Command key on Mac
	var rightWindowKey = 92;
	
	var windowKey = lastKeyDown == leftWindowKey || lastKeyDown == rightWindowKey;
	var metaCmdKey = keyDownEvent.metaKey; // The key labeled cmd on a Mac keyboard
	
		console.log("keyIsDown: combo.sum=" + combo.sum + " windowKey=" + windowKey + " metaCmdKey=" + metaCmdKey + " EDITOR.metaKeyIsDown=" + EDITOR.metaKeyIsDown + " BROWSER=" + BROWSER + " MAC=" + MAC);
	
	if((combo.sum > 0 || metaCmdKey) && !captured) {
		// The user hit a combo, with shift, alt, ctrl + something, but it was not captured.
		
		if( (combo.ctrl || metaCmdKey) && character == "C") {
				console.log("keyIsDown: Native command: copy !? MAC=" + MAC);
			
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
				console.log("keyIsDown: Native command: paste !? MAC=" + MAC + " EDITOR.settings.useCliboardcatcher=" + EDITOR.settings.useCliboardcatcher + " EDITOR.input=" + EDITOR.input);
			
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
				console.log("keyIsDown: Native command: cut !?");
			
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
else if(combo.meta) {} // Wait for cmd+key combo!
			else if(charCode == 17 || combo.ctrl) {console.log("keyIsDown: Ctrl ...");} // Wait for Ctrl+key combo!
			else if(windowKey) {console.log("keyIsDown: Window key ...");preventDefault = true;} // Do we want to capture Window combos !?
			else if(metaCmdKey) {console.log("keyIsDown: meta/cmd key ...");preventDefault = true;} // Do we want to capture Meta/Cmd combos !?
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
			//console.log("keyIsDown: Executing default browser/OS action ...");
		
			if(keyDownEvent.target == document.getElementById("windowMenu")) {
				console.log("keyIsDown: Key down on Window menu!");
			}
			
		return true;
	}
	
	
}

function getCombo(eventObject) {
	
	var combo = {shift: false, alt: false, ctrl: false, meta: false, sum: 0};
	
		if(eventObject == undefined) {
			console.warn("getCombo: eventObject=" + eventObject + " returning zeroed combo!");
			return combo;
		}
		
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
		
		// Mac keyboard's Command key is called meta. If it's not a Mac it will be the Window key
		// Old versions of Chrome doesn't treat meta as a modifier and fires a separate event for the Meta key
		if(eventObject.metaKey || EDITOR.metaKeyIsDown) {
			combo.meta = true;
			combo.sum += META;
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
	
		// keyUpEvent.metaKey is false on the keyup event. So we have to check manually
		if(keyUpEvent.key=="Meta" 
		|| charCode==91 // Left Command
		|| charCode==93 // Right command
		|| charCode==224 // Meta on Firefox
		|| charCode==17 // Meta on old Opera
		) EDITOR.metaKeyIsDown = false; 
		
		if(charCode==17) EDITOR.ctrlKeyIsDown = false; 
		
		console.log("keyUp: key=" + keyUpEvent.key + " charCode=" + charCode + " character=" + character + " combo=" + JSON.stringify(combo) + " EDITOR.metaKeyIsDown=" + EDITOR.metaKeyIsDown + "");
	
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
	var targetElementClass = keyUpEvent.target.className;
	for(var i=0, binding; i<keyBindings.length; i++) {
		
		binding = keyBindings[i];
		
		if( (binding.char == character || binding.charCode == charCode) && (binding.combo == combo.sum || (binding.combo === undefined && combo.sum===0)) && (binding.dir == "up") && (binding.mode == EDITOR.mode || binding.mode == "*") ) { // down is the default direction
			
			console.log("keyUp: Calling function: " + UTIL.getFunctionName(binding.fun) + "...");
			
			funReturn = binding.fun(EDITOR.currentFile, combo, character, charCode, "up", targetElementClass, keyUpEvent);
			
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
		if(charCode == charCodeCtrl && voiceCommandsEnabled) {
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
	

		var lastFocused = EDITOR.lastElementWithFocus;
	EDITOR.lastElementWithFocus = document.activeElement || mouseDownEvent.target;
	// EDITOR.lastElementWithFocus = The last element that had focus, eg, NOT the element that was just clicked!!
	
		if(EDITOR.lastElementWithFocus != lastFocused) {
			console.warn("Changed focus from ", lastFocused, " to ", EDITOR.lastElementWithFocus);
		}

	
		if(mouseDownEvent.type == "touchstart") {
			if(!EDITOR.touchScreen) {
				/*
					Detected a touch device.
					If this is an Android phone we want to disable contentediable on the canvas element,
					or the mobile browser will zoom in like alot when you touch a HTML element.
					The reason why it has the contentEditable attribute is so that screenreaders will let users insert text.
					The Android screenreader is not supported atm. Blind people would need to use a PC,
					as text input would be an issue - and Google has deprecated Speech to text in Chrome :(
				*/
				EDITOR.canvas.contentEditable = false;
			}
			EDITOR.touchScreen = true;
		}
		
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
		
	
	//UTIL.objInfo(target);
	var leftMouseButton = 0;
	var rightMouseButton = 2;
	var maybeCenterMouseButton = 1;
	
	if(button == undefined) button = leftMouseButton; // For like touch events
	
		var menu = document.getElementById("contextmenu");
	
	console.log("mouseDown on target.className=" + target.className);
	
		if(target.className == "allowDefault") {
			console.log("mouseDown: (target.className=allowDefault)");
			return true;
		}
	else if(target.className == "fileCanvas" || target.className == "content centerColumn") {
		
		EDITOR.windowMenu.hide();
		
		// Some browsers send a mousedown event after a touchstart event. Don't hide the second time (a plugin might show the menu on mousedown)
		if(! (lastMouseDownEventType == "touchstart" && mouseDownEvent.type == "mousedown") ) EDITOR.ctxMenu.hide();
		
		caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
		
		
		if(EDITOR.currentFile && (button == leftMouseButton)) {// 0=Left mouse button, 2=Right mouse button, 1=Center?
			// Give focus
			EDITOR.input = true;
			
			// Remove focus from everything else
			if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
			else console.log("mouseDown: Unable to blur active element!:");
			
				EDITOR.canvas.focus();
			
			// Delete selection outside of the canvas
				console.log("Removing selection!");
			window.getSelection().removeAllRanges();
			
			/*
				Try to steal focus from any textboxes like find/replace.
				
				Meh, why doesn't this work!!!?
				
				
				document.body.focus(); // EDITOR.currentFile.canvas
				
				document.getElementById("leftColumn").focus();
				
				console.log("REFOCUS!");
			*/
		}
			
		}
		else{
			
		console.log("mouseDown: Removing focus/input from the Editor because the click was registered outside the canvas!");
		EDITOR.input = false;
		
		if(targetIsDashboard(target)) {
			if(button == leftMouseButton) {
				EDITOR.ctxMenu.hide();
			}
			else {
					EDITOR.ctxMenu.show(mouseDownEvent);
			}
		}
		
	}
	
	function targetIsDashboard(targetElement) {
		while(targetElement.parentElement) {
			if(targetElement.className == "dashboard") return true;
			targetElement = targetElement.parentElement
		}
		return false;
	}
	
	if(target.className == "fileCanvas") {
		// Prevent whatever nasty thing the browser wants to do
		// like zooming out etc.
		mouseDownEvent.preventDefault();
	}
	
	console.log("mouseDown:  caret=" + JSON.stringify(caret) + " (" + mouseX + "," + mouseY + ") button=" + button + " className=" + target.className + " tagName=" + target.tagName);
	console.log(mouseDownEvent);
	
		var f = [];
		for(var i=0, binding; i<EDITOR.eventListeners.mouseClick.length; i++) {
		
		click = EDITOR.eventListeners.mouseClick[i];
		
		if((click.dir == "down" || click.dir == undefined) && 
		(click.button == button || click.button == undefined) && 
		(click.targetClass == target.className || click.targetClass == undefined) && 
		(click.combo == keyboardCombo.sum || click.combo === undefined) &&
		(click.targetTag == target.tagName || click.targetTag == undefined)
		) {
				f.push(click.fun);
		}
	}
		
		var funReturn;
		console.log("mouseDown: Calling mouseClick (down) listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			// Note that caret is a temporary position caret (not the current file.caret)!
			
			funReturn = f[i](mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent); // Call it
			
			console.log("mouseDown: mouseClick event " + UTIL.getFunctionName(f[i]) + " for mouseDown returned " + funReturn);
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("mouseDown: " + UTIL.getFunctionName(f[i]) + " prevented other mouseClick actions!");
				break;
			}
			else if(funReturn !== true) {
				throw new Error(UTIL.getFunctionName(f[i]) + " did not return true or false!");
			}
		}
		
		if(mouseDownEvent.type == "touchstart" && recognition && voiceCommandsEnabled) {
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
		if(!!el) { // Edge and IE11 throws a InvalidStateError on some elements unless we bang-bang it!?
	// selectionStart etc seem to get lost when the element lose focus, so save it!
	// mouse up event sometime doesn't fire, so save selectionStart on both down and up event
			try { // Might throw a InvalidStateError in IE
	if(el.scrollTop != undefined) el.setAttribute("sTop", el.scrollTop);
	if(el.selectionStart != undefined) el.setAttribute("selStart", el.selectionStart);
	if(el.selectionEnd != undefined) el.setAttribute("selEnd", el.selectionEnd);
			}
			catch(err) {
				console.error(err);
			}
		}
		
		EDITOR.interact("mouseDown", mouseDownEvent);
		
		if(mouseDownEvent.type == "touchstart") EDITOR.stat("touch_down");
		else EDITOR.stat("mouse_down");
		
		if(preventDefault) {
			console.log("mouseDown:Preventing default!");
		mouseDownEvent.preventDefault(); // To prevent the annoying menus
		mouseDownEvent.stopPropagation();
		return false;
	}
		else if(button !== leftMouseButton && (target.className == "fileCanvas" || target.className == "content centerColumn")) {
			
			EDITOR.input = false;
			EDITOR.ctxMenu.show(mouseDownEvent);
			
		}
	
	return true;
	
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
	
	//console.log("Mouse up on class " + target.className + "!");
	//console.log(mouseUpEvent);
	
		if(target.className == "allowDefault") {
			console.log("mouseUp: (target.className=allowDefault)");
			return true;
		}
		else if(target.className == "fileCanvas") {
		
		// Only get a caret if the click is on the canvas 
		caret = EDITOR.mousePositionToCaret(mouseX, mouseY);

			// Prevent whatever nasty thing the browser wants to do
			// like zooming out etc.
			mouseUpEvent.preventDefault();
		
	}
	
	console.log("Calling mouseClick (up) listeners (" + EDITOR.eventListeners.mouseClick.length + ") ...");
	console.time("mouseClick listeners");
	var funReturn = true;
	var preventDefault = false;
		var f = [];
	for(var i=0, binding; i<EDITOR.eventListeners.mouseClick.length; i++) {
		click = EDITOR.eventListeners.mouseClick[i];
		
		// Make sure to define click.dir (to prevent double action)!
		if((click.dir == "up" || click.dir == undefined) && 
		(click.button == button || click.button == undefined) && 
		(click.targetClass == target.className || click.targetClass == undefined) && 
		(click.combo == keyboardCombo.sum || click.combo == undefined) && 
		(click.targetTag == target.tagName || click.targetTag == undefined)
		) {
				f.push(click.fun);
		}
	}
		
		var fName;
		for(var i=0; i<f.length; i++) {
			fName = UTIL.getFunctionName(f[i])
			console.time(fName);
			funReturn = f[i](mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseUpEvent); // Call it
			console.timeEnd(fName);
			
			console.log("mouseClick event " + fName + " for mouseUp returned " + funReturn);
			
			if(funReturn === false) {
				preventDefault = true;
				console.log("" + fName + " prevented other mouseClick actions!");
				break;
			}
			else if(funReturn !== true) {
				throw new Error(fName + " did not return true or false!");
			}
		}
		
		console.timeEnd("mouseClick listeners");
	console.timeEnd("mouseUp");
	
	//console.log("mouseUp, EDITOR.shouldRender=" + EDITOR.shouldRender);
	
		if(mouseUpEvent.type == "touchstart" && recognition && voiceCommandsEnabled) {
		recognition.stop();
	}
	
	var el = EDITOR.lastElementWithFocus || mouseUpEvent.target;
	// selectionStart etc seem to get lost when the element lose focus, so save it!
		try { // This might throw a InvalidStateError in IE!
	if(el.scrollTop != undefined) el.setAttribute("sTop", el.scrollTop);
	if(el.selectionStart != undefined) el.setAttribute("selStart", el.selectionStart);
	if(el.selectionEnd != undefined) el.setAttribute("selEnd", el.selectionEnd);
		}
		catch(err) {
			console.error(err);
		}
		
		EDITOR.interact("mouseUp", mouseUpEvent);
	
	if(preventDefault) {
		console.log("mouseUp: Preventing default!");
		if(typeof mouseUpEvent.preventDefault == "function") mouseUpEvent.preventDefault();
		if(typeof mouseUpEvent.stopPropagation == "function") mouseUpEvent.stopPropagation();
		return false;
	}
else {
// Allow default
return true;
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
	
	if(mouseX != undefined && mouseY != undefined && mouseEvent.target && mouseEvent.target == EDITOR.canvas) {
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
		if(mouseEvent.target == EDITOR.canvas) {
				var rect = EDITOR.canvas.getBoundingClientRect();
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
	
		var f = EDITOR.eventListeners.mouseMove.map(funMap);
		if(f.length > 0) {
			//console.log("Calling mouseMove listeners (" + f.length + ") ...");
			for(var i=0; i<f.length; i++) {
			f[i](mouseX, mouseY, target, mouseMoveEvent); // Call it
		}
	}
		
		/*
			while(!target.id && target.parentNode) {
			console.log("target.id=" + target.id + " target.tagName=" + target.tagName + " target.class=" + target.class);
			target = target.parentNode;
			}
			console.log("Final: target.id=" + target.id + " target.tagName=" + target.tagName + " target.class=" + target.class + " target.parentNode=", target.parentNode);
		*/
		
		//console.log("EDITOR.input=" + EDITOR.input);
	
	EDITOR.interact("mouseMove", mouseMoveEvent);
	
// Always show the mouse cursor when moving the mouse in case it has been hidden
// Canvas not available on IE before mouse move
if(cursorHidden && typeof EDITOR.canvas != "undefined" && typeof EDITOR.canvas.style != "undefined") {
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
				EDITOR.canvas.focus();
			
			// Delete selection outside of the canvas
				console.log("Removing selection!");
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
	
		var f = [];
		for(var i=0, binding; i<EDITOR.eventListeners.dblclick.length; i++) {
		
		click = EDITOR.eventListeners.dblclick[i];
		
		if((click.button == button || click.button == undefined) && 
		(click.targetClass == target.className || click.targetClass == undefined) && 
		(click.combo == keyboardCombo.sum || click.combo === undefined) &&
		(click.targetTag == target.tagName || click.targetTag == undefined)
		) {
			f.push(click.fun);
		}
	}
		
		console.log("Calling dblclick listeners (" + f.length + ") ...");
		for(var i=0; i<f.length; i++) {
			//console.log("Calling " + UTIL.getFunctionName(f[i]) + " ...");
			
			// Note that caret is a temporary position caret (not the current file.caret)!
			
			funReturn = f[i](mouseX, mouseY, caret, button, target, keyboardCombo); // Call it
			
			if(funReturn === false) {
				preventDefault = true;
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
			var f = EDITOR.eventListeners.mouseScroll.map(funMap);
			console.log("Calling mouseScroll listeners (" + f.length + ") ...");
			for(var i=0; i<f.length; i++) {
				f[i](dir, steps, combo, scrollWheelEvent);
		}
	}
	
	EDITOR.interact("mouseScroll", scrollWheelEvent);
	
		return ALLOW_DEFAULT;
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


	function htmlToImage(html, textOnly, callback) {
	
		if(typeof textOnly == "function") {
			callback = textOnly;
			textOnly = false;
		}
		
	if(!callback) throw new Error("No callback function in htmlToImage");
	
	html = html + " "; // Last word wont show unless there's a space at the end! WTF!?
	
	
	// The svg seems to need a width and height beforehand, or it will use a default width of 100px
	var width = Math.ceil(EDITOR.settings.gridWidth * html.length);
		var height = Math.ceil(EDITOR.settings.gridHeight);
	
	//  width="' + width + '" height="' + height + '"
	
		//console.log("htmlToImage: width=" + width);
	
	var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">';
		//data += '<image x="0" y="0" width="30" height="30" xlink:href="/gfx/error.svg" />';
		data += '<foreignObject width="100%" height="100%">';
		// Font must be web safe font! Seems to ignore our style.css ...
		// color is always black! background is transparent.
		data = data + '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; font-family: Arial;">';
		data += html;
		data += '</div>';
		data += '</foreignObject>';
		data += '</svg>';
		
		// foreignObject in SVG seem to have stopped working in IE11 !?!?!?
		
		if(BROWSER == "MSIE" || textOnly) {
			var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><text x="0" y="16">' + UTIL.stripHtml(html) + '</text></svg>';
		}
		
		console.log("htmlToImage: (BROWSER=" + BROWSER + ") Creating SVG image: data=" + data);
		
		var img = new Image();
		
		var domurl = window.URL || window.webkitURL || window;
		
		var onloadCalled = false;
		var onErrorCalled = false;
		var timeoutOut = false;
		
		img.onload = function () {
			onloadCalled = true;
			console.log("htmlToImage: SVG image created/loaced! (img.onload event) img.width=" + img.width + " img.height=" + img.height);
			
			if(url) {
				console.log("htmlToImage: Releasing object URL")
				domurl.revokeObjectURL(url);
			}
			
			if(callback) {
				callback(img);
				callback = null;
			}
			else {
				console.warn("htmlToImage: Already called back because it took too long for the image to load.");
			}
		}
		
		if( domurl.createObjectURL && BROWSER != "Safari") { // Safari ends up with a zero width image
			console.log("htmlToImage: Creating image using domurl.createObjectURL")
			var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
			var url = domurl.createObjectURL(svg);
			img.src = url;
		}
		else {
			console.log("htmlToImage: Creating image using data src")
			data = "data:image/svg+xml," + data;
			img.src = data;
		
			console.log("htmlToImage: SVG image created!? img.width=" + img.width + " img.height=" + img.height);
		}
		
		img.onerror = function imageError(err) {
			onErrorCalled = true;
			
			clearTimeout(timeoutTimer);
			console.log("htmlToImage: Problem creating image! html=" + html + "\nError: " + (err.message || err))
			
			if(!callback) {
				throw new Error("htmlToImage: Failed to create image. But we have already called back! BROWSER=" + BROWSER + " domurl.createObjectURL?" + (!!domurl.createObjectURL) + " onloadCalled=" + onloadCalled + " onErrorCalled=" + onErrorCalled + " timeoutOut=" + timeoutOut + "");
			}
			
			// Make sure we do not end up in a recursive loop
			if(textOnly == true) throw new Error("htmlToImage: It seems we also failed to create a text based image! html=" + html);
			
			htmlToImage(html, true, callback);
			callback = null; // JS pass references by-val, so pointing it to null here wont change the value passed into htmlToImage
		}
		
		/*
			problem 1: Some browsers wont fire img.onload (when data url is used)
			solution: Use a timeout
			
			problem 2: Some browsers wont show the massage if the timeout is fired before img.onload
			solution: Skip the timeout on browsers where img.onload is confirmed to work
			
			
		*/
		
		if(BROWSER != "Firefox") {
		var timeoutTimer = setTimeout(function() {
				timeoutOut = true;
			console.log("htmlToImage: Callback timeout! callback?" + (!!callback));
			if(callback) {
				callback(img);
				callback = null;
			}
			}, 500); // Make the timeout long enough so that the image has a chance to be created. If we call back befor it's created we will instead get an error when trying to paint the image!!
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
		sendStatistics();
		for(var path in EDITOR.files) {
			if(!EDITOR.files[path].isSaved) return "Are you sure you want to close the editor ?";
		}
		
	}
	
	function clearSelection() {
		console.log("Removing selection! (clearSelection)");
		if ( document.selection ) {
			document.selection.empty();
		} else if ( window.getSelection ) {
			window.getSelection().removeAllRanges();
		}
	}
	
	function fullScreenMenu(menu) {
		// The menu will cover the whole screen
		
		console.log("fullScreenMenu:");
		
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
		
		CONTEXT_MENU_IS_FULL_SCREEN = true;
		
		EDITOR.ctxMenu.addTemp("Hide menu", function exitFullscreenMenu() {
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
		CONTEXT_MENU_IS_FULL_SCREEN = false;
		EDITOR.resizeNeeded();
	}
	
	
	
})();
