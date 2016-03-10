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
