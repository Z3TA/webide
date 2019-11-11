
var NODE = {

	require: function(user, json, callback) {
		var nameStr = json.nameStr; // Name of the module
		var dir = json.directory;
		if(dir && nameStr.charAt(0) == ".") {
			// nameStr is a path to a module!
			
			var module_path = require("path");
			var absolutePath = module_path.resolve(dir, nameStr);
		
			console.log("nameStr=" + nameStr + " absolutePath=" + absolutePath + " dir=" + dir);
			
		}
		
		/*
			Requiring a module should be safe most of the time ...
		*/
		try {
			var obj = require(absolutePath || nameStr);
		}
		catch(err) {
			return callback(err);
		}
		
		var variables = {};
		var functions = [];
		var nameChain = nameStr;
		
		collect(obj, variables, nameChain);
		
		callback(null, {variables: variables, functions: functions, nameStr: absolutePath || nameStr});
		
		function collect(obj, variables, nameChain) {
			for(var name in obj) {
				
				variables[name] = new Variable();
				
				if(Array.isArray(obj[name])) variables[name].type = "Array";
				else if(typeof obj[name] == "string") variables[name].type = "String";
				else if(typeof obj[name] == "number") variables[name].type = "Number";
				else if(typeof obj[name] == "boolean") variables[name].type = "Boolean";
				else if(Object.prototype.toString.call(obj[name]) == '[object RegExp]') variables[name].type = "RegExp";
				else if(typeof obj[name] == "function") {
					variables[name].method = true;
					var func = parseFunction(obj[name].toString());
					functions.push(  new Func(nameChain + "." + name, (func && func.args))  ); 
				}
				else if(typeof obj[name] == "object") {
					collect(obj[name], variables[name].keys, nameChain + "." + name)
				}
			}
		}
		
	}
	
}


function parseFunction(str) {
	/*
		Find the content inside the first parentheses
	*/
	
	var left = 0;
	var right = 0;
	var lcount = 0;
	var rcount = 0;
	
	for (var i=0, c; i<str.length; i++) {
		c = str[i];
		
		if(c=="(") {
			if(!left) left = i+1;
			lcount++;
		}
		else if(c==")") {
			if(!right) right = i;
			rcount++;
			if(lcount == rcount) {
				
				if(right > left) var args = str.slice(left, right);
				console.log("parseFunction: Found args between left=" + left + " and right=" + right + " args=" + args);
				
				if(args && args.length != (right-left)) throw new Error("args.length=" + args.length + " right-left=" + (right-left) + " str=" + str);
				
				return {args: args ? args : ""};
			}
		}
		
		console.log("parseFunction: c=" + c + " left=" + left + " right=" + right + " lcount=" + lcount + " rcount=" + rcount + " ");
	}
	
	return null;
}

// from client/plugin/javascript/js_parser.js

function Variable(type, value) {
	
	this.type = type || "unknown";
	this.value = value || "";
	this.keys = {};
	this.method = false;
	this.args = "";
	
	// Variables can be methods, all functions are however added to functions/subfunctions, so arguments have to be looked up from there
	
	// Only functions Should have a prototype!
	
	//console.warn("new Variable! type=" + type + " value=" + value + "");
}

function Func(name, args, start, lineNumber) {
	var func = this;
	
	func.name = name || "";
	func.arguments = args || "";
	func.start = start || -1;
	func.end =-1;
	func.subFunctions = [];
	func.variables = {};
	func.lineNumber = lineNumber;
	func.endRow = -1;
	func.arrowFunction = false;
	func.lambda = false; // If it's declared inline, meaning it can only be called by itself'
	func.global = false;  // If the function is a method to a global variable, and thus callable from global scope
	func.prototype = {}; // Variables. (Prototype methods will also be added as a variable here for consistency, it will also exist as a function)
	func.returns = []; // List of variables, or null's (void)
	
	/*
		No need for an order property, we can order by start.
		
		
	*/
}


module.exports = NODE;

