var vm = require('node:vm');
var UTIL = require("../client/UTIL.js");



var scriptTags = 0;
var scriptTagsLoaded = 0;


// Need to keep track of all elements so they can get returned by getElementById
var allElements = [];

// Some elements that the editor expects (in index.htm)
var globalElements = {
	
	fileInput: createElement("input"),
	directoryInput: createElement("input"),
	contextmenuGeneral: createElement("ul"),
	
	wireframe: createElement("div"),
	header: createElement("div"),
	windowMenuHeight: createElement("div"),
	columns: createElement("div"),
	leftColumn: createElement("div"),
	content: createElement("div"),
	editorCanvas: createElement("canvas"),
	dashboard: createElement("div"),
	rightColumn: createElement("div"),

	footer: createElement("div"),
	virtualKeyboard2: createElement("div"),
	progress: createElement("progress"),

	body: createElement("body"),
	head: createElement("head"),

	loginScreen: createElement("div"),
	loginAsGuest: createElement("button"),
	loginMessage: createElement("div"),
	backend_url: createElement("input"),
	nat_code: createElement("input"),
	connectButton: createElement("button"),
	loginButton: createElement("button"),
};



function createCanvas(element) {
	if(element == undefined) element = createElement("canvas");

	var canvas = element;
	var ctx = {
		restore: function() {

		},
		save: function() {

		},
		scale: function() {

		},
		fillRect: function() {

		},
		fillText: function() {

		},
		measureText: function(str) {
			return {
				width: str.length * 10
			}
		},
		beginPath: function() {

		},
		drawImage: function() {

		},
		fill: function () {

		}
	};
	
	canvas.getContext = function() {
		return ctx;
	};

	return canvas;
}

function getElementWithId(id) {
	for (var i=0; i<allElements.length; i++) {

		if(allElements[i].getId() == id) return allElements[i];

		if(allElements[i].id == id) return allElements[i];
		//if(allElements[i].attributes.id !== undefined) console.log(allElements[i].attributes.id);
		if(allElements[i].attributes.id === id) {
			return allElements[i];
		}
	}
	//console.log("Unable to find a element with id=" + id);
	//console.log( allElements.map( (obj) => obj.attributes.id) );

	return null;
}

function createElement(elementType) {
	//console.log("createElement: elementType=" + elementType);
	var el = {
		tagName: elementType.toUpperCase(),
		attributes: {
			class: ""
		},
		childNodes: [],
		addEventListener: function addEventListener(event, fun) {
			//console.log("Element " + elementType + " addEventListener: event=" + event + " fun=" + fun.name);
		}
	}

	el.children = el.childNodes;


	el.classList = {};
	el.classList.add = function (className) {
		var classNames = el.attributes.class.split(" ");
		//console.log("classNames=" + classNames + " (" + typeof classNames + ") " + JSON.stringify(classNames))
		classNames.push(className);
		el.attributes.class = classNames.join(" ");
	}
	el.classList.remove = function (className) {
		var classNames = el.attributes.class.split(" ");
		//console.log("classNames=" + classNames + " (" + typeof classNames + ") " + JSON.stringify(classNames))
		var index = classNames.indexOf(className);
		if(index == -1) return;
		classNames.splice(index, 1);
		el.attributes.class = classNames.join(" ");
	}

	el.getElementsByClassName = function getElementsByClassName(className) {
		var allChildren = findAllChildren(el.childNodes);
		return allChildren.filter( el => el.attributes.class.hasOwnProperty(className) );
	},


	el.setAttribute = function setAttribute(attribute, value) {
		el.attributes[attribute] = value;
		if(attribute == "id") el.id = value;
	}
	el.getAttribute = function setAttribute(attribute) {
		return el.attributes[attribute];
	}
	el.hasAttribute = function hasAttribute(attribute) {
		return el.attributes.hasOwnProperty(attribute);
	}

	el.style = {
	}

	el.offsetWidth = 0;
	el.offsetHeight = 0;

	el.appendChild = function(childElement) {
		el.childNodes.push(childElement);
		el.firstChild = el.childNodes[0];
	}

	el.removeChild = function(childElement) {
		var index = el.childNodes.indexOf(childElement);
		if(index == -1) return;
		
		var allIndex = allElements.indexOf(childElement);
		if(allIndex != -1) {
			//console.log( "Removing from allElements: childElement=" + JSON.stringify(childElement) );
			allElements.splice(allIndex, 1);
		}
		else {
			//console.log( "Did not find in allElements: childElement=" + JSON.stringify(childElement) );
		}

		var node = el.childNodes.splice(index, 1);

		// We need to recursely remove all children so that they can't be found with document.getElementById
		// But keep them in memory, just not in the DOM tree...
		var nodesToRemove = findAllChildren(node);

		nodesToRemove.forEach(function(nodeToBeRemoved) {
			var allIndex = allElements.indexOf(nodeToBeRemoved);
			if(allIndex != -1) allElements.splice(allIndex, 1);
		});

		if( el.childNodes.length == 0 ) el.firstChild = null;

		return node;
	}

	el.contains = function(childElement) {
		var children = findAllChildren(el.childNodes);
		for (var i=0; i<children.length; i++) {
			if(childElement == children[i]) return true;
		}
		return false;
	}

	el.insertBefore = function(node, newNode) {
		var index = el.childNodes.indexOf(node);
		if(index == -1) index = 0;
		el.childNodes.splice(index, 0, newNode);
		return newNode;
	}
	
	el.getId = function getId() {
		if(el.id !== undefined) return el.id;
		if(el.attributes["id"] !== undefined) return el.attributes["id"];
		return null;
	}

	el.getElementsByTagName = function(tag) {
		var allChildren = findAllChildren(el.childNodes);
		return allChildren.filter( el => el.tagName == tag );
	}

	el.focus = function() {
		//console.log("Element " + el.tagName + " id=" + el.id + " should be in focus");
	}

	el.getBoundingClientRect = function() {
		return {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		}
	}

	if(elementType == "canvas") el = createCanvas(el);
	else if(elementType == "script") {
		scriptTags++;
		watchScriptSrc(el)
	}
	//console.log("typeof allElements: " + typeof allElements);

	watchProperty(el, "innerText", "", function(newValue) {
		//console.log(el.tagName + "#" + el.id + " innerText: " + newValue);
	});
	

	allElements.push(el);

	return el;
}


function watchProperty(el, prop, defaultValue, callback) {
	var value = defaultValue;
	Object.defineProperty(el, prop, {
		get: function () { return value; },
		set: function (newValue) {
			value = newValue;
			if(callback) callback(newValue);
		},
		enumerable: true
	});
}

function findAllChildren(nodes) {
	var allChildren = [];

	nodes.forEach(recursiveFindChildren);

	return allChildren;

	function recursiveFindChildren(node) {

		if(node.childNodes == undefined) throw new Error("Node has no childNodes! node=" + JSON.stringify(node));

		node.childNodes.forEach(function (childNode) {
			allChildren.push(childNode);
			recursiveFindChildren(childNode);
		});
	}
}

function watchScriptSrc(element) {
	var src = element.src || "";
	Object.defineProperty(element, 'src', {
		get: function getSrc() { return src; },
		set: function setSrc(newValue) {
			src = newValue;
			dynamicLoadScript("client" + src);
		},
		enumerable: true
	});
}


function createTextNode(data) {
	
	var textNode = {
		childNodes: [],
		data: data
	};

	return textNode;
}


var globalEvents = {};
function addGlobalEventListener(event, fun) {
	//console.log("addGlobalEventListener: event=" + event + " fun=" + fun.name);
	if(globalEvents[event] == undefined) {
		globalEvents[event] = [];
	}
	globalEvents[event].push(fun);
}

// Put any browser context here
var interfaceContext = {
	DISPLAY_MODE: "headless"
};


interfaceContext.document = {
	getElementById: function getElementById(id) {

		if(globalElements.hasOwnProperty(id)) return globalElements[id];

		var el = getElementWithId(id);
		if(el != null) return el;

		return null;
	},
	getElementsByClassName: function getElementsByClassName(className) {
		return allElements.filter( el => el.attributes.class.hasOwnProperty(className) );
	},
	cookie: "",
	createElement: createElement,
	createTextNode: createTextNode,
	addEventListener: addGlobalEventListener,
	head: globalElements.head
};

interfaceContext.navigator = {
	platform: process.platform,
	userAgent: "headless"
};

interfaceContext.location = {
	search: process.argv.join("&"),
	href: "ws://localhost:8099/webide/",
	hostname: "localhost",
	hash: "",
	origin: "headless"
};

interfaceContext.screen = {
	availHeight:800,
	availLeft:0,
	availTop:0,
	availWidth:800,
	colorDepth:24,
	height:600,
	isExtended:false,
	onchange:null,
	orientation: {angle: 0, type: 'landscape-primary', onchange: null},
	pixelDepth:24,
	width:800
};


interfaceContext.localStorage = {
	items: []
};
interfaceContext.localStorage.getItem = function (name) {
	//console.log("Get localStorage item=" + name);
	if(interfaceContext.localStorage.items.hasOwnProperty(name)) return interfaceContext.localStorage.items[name];
	else return null;
}
interfaceContext.localStorage.setItem = function (name, value) {
	//console.log("Set localStorage item=" + name);
	interfaceContext.localStorage[name] = value;
}
interfaceContext.localStorage.removeItem = function (name) {
	//console.log("Remove localStorage item=" + name);
	delete interfaceContext.localStorage[name];
}

interfaceContext.window = {
	navigator: interfaceContext.navigator,
	document: interfaceContext.document,
	location: interfaceContext.location,
	addEventListener: addGlobalEventListener,
	localStorage: interfaceContext.localStorage,
	getComputedStyle: function getComputedStyle(el) {
		var comp = {
			width: getPropertyValue("width"),
			height: getPropertyValue("height"),
			getPropertyValue: getPropertyValue
		};
		
		return comp;

		function getPropertyValue(name) {
			var val = el.style[name];
			var parsedVal = 0;

			if(val == undefined) parsedVal = 0;
			else parsedVal = parseInt(val);

			if(isNaN(parsedVal)) parsedVal = 0;

			//console.log("getComputedStyle:getPropertyValue: name=" + name + " val=" + val + " parsedVal=" + parsedVal);

			return parsedVal;
		}

	},
	innerHeight: 0,
	innerWidth: 0,
	resizeTo: function(width, height) {
		this.innerHeight = height;
		this.innerWidth = width;
	},
	console: console,
	WebSocket: WebSocket,
};

interfaceContext.window.window = interfaceContext.window; // Trick the editor that we are a browser...




// hmm, will these work!? yep :)
interfaceContext.setInterval = setInterval;
interfaceContext.clearInterval = clearInterval;
interfaceContext.setTimeout = setTimeout;
interfaceContext.clearTimeout = clearTimeout;


interfaceContext.console = {
	log: function(msg) {
		console.log("log: " + msg);
	},
	warn: function(msg) {
		console.warn("warn: " + msg);
	},
	error: function(msg) {
		console.log("error: " + msg);
		console.error(msg);
	},
}

interfaceContext.alert = function alert(msg) {
	console.log("ALERT: " + msg);
}

//console.log(interfaceContext.window);
//process.exit(0);

vm.createContext(interfaceContext); // Contextify the object.

var fs = require("fs");

var coreFiles = [
	{path: "client/capture_errors.js"},
	{path: "client/UTIL.js"},
	{path: "client/global.js"},
	{path: "client/locale/en.js"},

	{path: "client/sockjs-0.3.4.js"},

	{path: "client/CLIENT.js"},
	{path: "client/Dialog.js"},
	{path: "client/File.js"},
	{path: "client/ImageFile.js"},
	{path: "client/EDITOR.js"}
];


// Find core plugins
var indexHtml = fs.readFileSync("client/index.htm", "utf8");

var rePlugin = /"plugin\/.*"/g;
var corePluginPaths = indexHtml.match(rePlugin);

//console.log(corePluginPaths);

var corePlugins = [];
corePluginPaths.forEach(function(path) {
	path = path.slice(1, -1); // Remove "
	path = "client/" + path;
	corePlugins.push({
		path: path
	});
});


var includes = [];

includes = includes.concat(coreFiles, corePlugins);

var lines = 0;

includes.forEach(loadScript);


// Trick the editor that we are running

globalEvents["load"].forEach(function (fun) {
	fun();
});

console.log("scriptTags=" + scriptTags + " scriptTagsLoaded=" + scriptTagsLoaded);

var waitTimeout;

wait();

function wait() {
	clearTimeout(waitTimeout);
	console.log("waiting...");

	console.log("scriptTags=" + scriptTags + " scriptTagsLoaded=" + scriptTagsLoaded);

	waitTimeout = setTimeout(check, 250);

	function check() {
		if(scriptTags < 20) return wait();

		if(scriptTags == scriptTagsLoaded) doYourThing();

	}

	//waitTimeout = setTimeout(doYourThing, 5000);
}

function doYourThing() {
	//console.log("I'm doing my thing!");

	//console.log("scriptTags=" + scriptTags + " scriptTagsLoaded=" + scriptTagsLoaded);

	var onlyOne = false;
	var allInSync = true;

	var EDITOR = interfaceContext.EDITOR;

	console.log("Closing the following open dialogs:");
	
	EDITOR.openDialogs.forEach(function closeIt(dialog) {
		console.log("dialog: " + dialog.message);
		dialog.close();
	});

	//EDITOR.changeWorkingDir("/wwwpub/");

	// Connect to server

	console.log("CLIENT.connected=" + interfaceContext.CLIENT.connected);


	function runTests() {

	interfaceContext.EDITOR.runTests(onlyOne, allInSync, function(result, description) {

		//console.log("ALL TESTS DONE!!?=?!?!?!!??!");

		var exitCode = 1;

		if(interfaceContext.EDITOR.currentFile) {
			var file = interfaceContext.EDITOR.currentFile;
			console.log("============== " + file.path + " ==============");
			console.log(file.text);
			exitCode = 0;
		}

		if(description) console.log(description);

		if(result) console.error(result);

		//process.exit(exitCode);

	});
	}
}

function dynamicLoadScript(src) {

	if(src == null) showError(new Error("Script has no source!"));

	console.log("Dynamic script load: " + src);

	includes.push({
		path: src
	});

	includeFile = includes[includes.length-1];

	loadScript(includeFile);
	scriptTagsLoaded++;
}

function loadScript(includeFile) {
	var code = fs.readFileSync(includeFile.path, "utf8");
	var fileLines = countLines(code);

	includeFile.startLine = lines;
	includeFile.endLine = lines + fileLines;

	console.log("EVALUATING " + includeFile.path);
	try {
		vm.runInContext(code, interfaceContext, {filename: includeFile.path});
	}
	catch(err) {
		var errLine = findErrorLine(err);

		// Figure out which file

		for (var i=0; i<includes.length; i++) {
			if(errLine <= includes[i].endLine && errLine >= includes[i].startLine) {
				console.log("ERROR in " + includes[i].path);
				console.log("ERROR on line " + (errLine - includes[i].startLine));
			}
		}

		console.log(err);
		process.exit(1);
	}

	lines = lines + fileLines;
	//console.log("Lines: " + lines);


}



function findErrorLine(errObj) {
	//var properError = UTIL.parseErrorMessage(errObj.stack);
	//console.log(properError);
	// First number in the stack should be the line we are looking for

	var str = errObj.stack;
	return findNumberInString(str);
}

function findNumberInString(str) {
	var foundNr = false;
	var theNr = "";
	for (var i=0; i<str.length; i++) {
		var char = str[i];
		//console.log("char=" + char);
		if( isNumber(char) ) {
			foundNr = true;
			theNr = theNr + char;
			//console.log("It's a number!");
		}
		else if(foundNr) {
			//console.log("Found the number: " + theNr);
			return parseInt(theNr);
		}
	}

	function isNumber(char) {
		if(char == "0" || char == "1" || char == "2" || char == "3" || char == "4" || char == "5" || char == "6" || char == "7" || char == "8" || char == "9") return true;
		else return false;
	}
}

function countLines(str) {
	//console.log(typeof str);
	//if(typeof str != "string") str = 
	return str.split('\n').length;
}

function showError(err) {
	var stack = err.stack;

	console.log("ERROR!");

	var lines = stack.split("\n");
	for (var i=0; i<lines.length; i++) {
		if(lines[i].includes("(evalmachine")) {

			var nr = findNumberInString(lines[i]);

			console.log("nr=" + nr + " found in str=" + lines[i]);

			findErrorOnLine(nr);

		}
	}

	throw err;
}

function findErrorOnLine(nr) {
	for (var i=0; i<includes.length; i++) {
		if(nr <= includes[i].endLine && nr >= includes[i].startLine) {
			console.log("ERROR in " + includes[i].path + " start=" + includes[i].startLine + " end=" + includes[i].endLine);
			console.log("ERROR on line " + (nr - includes[i].startLine));
		}
	}
}

