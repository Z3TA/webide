/*
	
	Expose some handy constants and functions to global scope.
	These are the only global variables except editor and File.
	
	Hide File from global scope!? Then it would have to be merged with editor.js
	
*/

"use strict";


// Global constants
const SHIFT = 1;
const CTRL = 2;
const ALT = 4;



// Global functions ...

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

function isFilePath(filePath) {
	try {
		var stat = fs.lstatSync(filePath);
		return stat.isFile();
	}
	catch(e) {
		return false;
	}
}

function getFileExtension(filePath) {
	return filePath.substr((~-filePath.lastIndexOf(".") >>> 0) + 2);
}

function isFolderPath(path) {
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
	
	
		
	
	
		
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	




