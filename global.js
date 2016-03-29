/*

	Expose some handy constands and functions to global scope.
	These are the only global variables except editor, File, and Box.

*/

"use strict";


// Global constants
const SHIFT = 1;
const CTRL = 2;
const ALT = 4;



/* Added to global scope as a utility function */
function functionName(fun) {
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
