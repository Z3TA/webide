/*
	
	Expose some handy constants and functions to global scope.
	These are the only global variables except editor and File.
	
	Hide File from global scope!? Then it would have to be merged with editor.js
	
*/

"use strict";

var runtime = (function is_nwjs() {
	try{
		return (typeof require('nw.gui') !== "undefined");
	} catch (e){
		return false;
	}
})() ? "nw.js" : "browser";



if(runtime == "browser") {
	//alert("runtime=" + runtime);
	var process = {
		platform: (function findPlatForm() {
			var platform = "win32";
			if(navigator.platform == "Win32") platform = "win32";
			if(navigator.platform.indexOf("Linux") != -1) platform = "linux";
			return platform;
		})(),
		cwd: function getWorkingDirectory() {
			return getDirectoryFromPath(document.location.href);
		},
		nextTick: function(cb) {
			setTimout(cb, 0);
		},
		argv: (function getArguments() {
			var query = window.location.search.substring(1);
			var arr = query.split('&');
			
			arr.unshift(document.location.href);
			
			return arr;
			
		})()
		
	};
}



Error.stackTraceLimit = Infinity;


// Global constants, note that const is block scoped!! (can't if(foo) const bar =1)
const SHIFT = 1;
const CTRL = 2;
const ALT = 4;



// Global functions ...

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function getFile(url, callback) {
	
	console.log("Opening url:" + url);
	
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = processRequest;
	xmlHttp.open( "GET", url, true );
	xmlHttp.send( null );
	
	function processRequest() {
		if (xmlHttp.readyState == 4) {
			
			console.log("xmlHttp.status=" + xmlHttp.status);
			
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


function debugWhiteSpace(str) {
	return str.replace(/\r/g, "R").replace(/\n/g, "N\n").replace(/ /g, "S").replace(/\t/g, "T");
}


function getFunctionName(fun) {
	var ret = fun.toString();
	ret = ret.substr('function '.length);
	ret = ret.substr(0, ret.indexOf('('));
	return ret;
}

function determineLineBreakCharacters(text) {
	/*
		What line break character is used !??
		
		Line Feed & New Line (10) = \n
		Carriage Return (13) = \r
		
		Default in windows: cr lf = \r\n
		
		Example:
		rnrnrn
		
		rn = 3 (wins)
		nr = 2
		
	*/
	
	console.log("Determining what line break characters to use ...");
	
	if(text.length == 0) {
		console.warn("Can't determine line breaks without any text!");
		return "";
	}
	
	var nr = occurrences(text, "\n\r", true),
	rn = occurrences(text, "\r\n", true)
	
	console.log("Line break? nr=" + nr + " rn=" + rn + "");
	
	if(rn > nr) {
		return "\r\n";
	}
	else if(nr > rn) {
		return "\n\r";
	}
	else if(text.indexOf("\n") > -1) {
		return "\n";
	}
	else {
		// Text has no line breaks. Use the default: (cr lf in windows)
		if(navigator.platform.indexOf("Win") > -1) {
			return "\r\n";
		}
		else {
			return "\n";
		}
	}
}

function occurrences(string, subString, allowOverlapping) {
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


function escapeRegExp(str) {
	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function getFilenameFromPath(path) {
	if(path.indexOf("/") > -1) {
		return path.substr(path.lastIndexOf('/')+1);
	}
	else {
		// Assume \ is the folder separator
		return path.substr(path.lastIndexOf('\\')+1);
	}
}

function getDirectoryFromPath(path) {
	var backSlashIndex = path.lastIndexOf("\\");
	var slashIndex = path.lastIndexOf("/")
	
	if(backSlashIndex > slashIndex) {
		path = path.substring(0,backSlashIndex+1);
	}
	else {
		path = path.substring(0,slashIndex+1);
	}
	return path;
}

function isFilePath(filePath) {
	if(runtime == "browser") {
		if(linuxPathValidation(filePath) || linuxPathValidation(filePath)) return true
		else return false;
	}
	else {
		var fs = require("fs");
		try {
			var stat = fs.lstatSync(filePath);
			return stat.isFile();
		}
		catch(e) {
			return false;
		}
	}
	
	function linuxPathValidation(contPathLinux) {
		for(var k=0;k<contPathLinux.length;k++){
			if(contPathLinux.charAt(k).match(/^[\\]$/) ){
				return false;
			}
		}
		if(contPathLinux.charAt(0) != "/")
		{
			return false;
		}
		if(contPathLinux.charAt(0) == "/" && contPathLinux.charAt(1) == "/")
		{
			return false;
		}
		return true;
	}
	
	function windowsPathValidation(contwinpath)
	{
		if((contwinpath.charAt(0) != "\\" || contwinpath.charAt(1) != "\\") || (contwinpath.charAt(0) != "/" || contwinpath.charAt(1) != "/"))
		{
			if(!contwinpath.charAt(0).match(/^[a-zA-Z]/))
			{
				return false;
			}
			if(!contwinpath.charAt(1).match(/^[:]/) || !contwinpath.charAt(2).match(/^[\/\\]/))
			{
				return false;
			}
			
		}
}
	
	function UrlExists(url) {
		var http = new XMLHttpRequest();
		http.open('HEAD', url, false);
		http.send();
		return http.status!=404;
	}
}

function getFileExtension(filePath) {
	return filePath.substr((~-filePath.lastIndexOf(".") >>> 0) + 2);
}

function isFolderPath(path) {
	var fs = require("fs");
	try {
		var stat = fs.lstatSync(path);
		return stat.isDirectory();
	}
	catch(e) {
		return false;
	}
}

function getStack(msg) {
	// Used in debugging, to get a stack trace of function being called
	
	if(msg == undefined) msg = "";
	
	var str = new Error(msg).stack;
	
	// Remove first at (this function)
	str = str.substr(str.indexOf("\n")+5, str.length);
	str = str.substr(str.indexOf("\n")+5, str.length);
	
	return msg + ": " + str;
}


function httpPost(urlStr, form, callback) {
	var querystring = require('querystring');
	var http = require('http');
	var url = require("url");
	
	var urlObj = url.parse(urlStr);
	
	// Build the post string from an object
	var post_data = querystring.stringify(form);
	
	// An object of options to indicate where to post to
	var post_options = {
		host: urlObj.hostname,
		port: urlObj.port ? urlObj.port : '80',
		path: urlObj.path, // path comtains querystring (search)
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	};
	
	// Set up the request
	var dataStr = "";
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			dataStr += chunk;
			console.log('Response: ' + chunk);
		});
		res.on('end', function () {
			callback(dataStr, null);
		});
	});
	post_req.on('error', function(e) {
		console.log(`problem with request: ${e.message}`);
		callback(null, e);
	});
	// post the data
	post_req.write(post_data);
	post_req.end();
	
	
}


function spacePad(str, padLength) {
	
	if(padLength == undefined) padLength = 42;
	
	var left = padLength - str.length;
	if (left < 0) return str; // Return early if no padding is needed
	
	var padding = "";
	for(var i=0; i<left; i++) padding += " ";
	return str + padding;
}

function makePathAbsolute(path) {
	if(path.match(/^.*:\/\//) == null) { // It's already absolute if it starts with a protocol, like ftp://
		var fspath = require("path");
		if(!fspath.isAbsolute(path)) {
			let absolutePath = fspath.resolve(path);
			console.warn("Making path absolute: " + path + " ==> " + absolutePath);
			path = absolutePath; // Make the path absolute
		}
	}
	return path;
}
		
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	


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

