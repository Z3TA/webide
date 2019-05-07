(function() {
	/*
		
		Autocomplete variable names and functions,
		and figure out object type in order to autocomplete (prototype) methods and properties.
		
		Also gives function argument hints.
		
	*/
	
	"use strict";
	
	var builtInFunctions = [
		{name: "eval", arguments: "codeString", type: ["undefined",  "other"]}, // todo: We can figure out what type is returned by analyzing the avaluated string
		{name: "isFinite", arguments: "testValue", type: "Boolean"},
		{name: "isNaN", arguments: "value", type: "Boolean"},
		{name: "parseFloat", arguments: "value", type: "Number"},
		{name: "parseInt", arguments: "value, radix", type: "Number"},
		{name: "decodeURI", arguments: "encodedURI", type: "String"},
		{name: "decodeURIComponent", arguments: "encodedURI", type: "String"},
		{name: "encodeURI", arguments: "UriString", type: "String"},
		{name: "encodeURIComponent", arguments: "UriStringComponent", type: "String"},
		
		// ### Array
		{name: "Array", arguments: "", variables: {prototype:{"length": {type: "Number"}}}},
		{name: "Array.prototype.concat", arguments: "...arraysOrValues", type: "Array"},
		{name: "Array.prototype.filter", arguments: "callback, thisArg", type: "Array"},
		{name: "Array.prototype.forEach", arguments: "callback, thisArg", type: "undefined"},
		{name: "Array.prototype.indexOf", arguments: "searchElement, fromIndex", type: "Number"},
		{name: "Array.prototype.join", arguments: "separator", type: "String"},
		{name: "Array.prototype.map", arguments: "callback", type: "Array"},
		{name: "Array.prototype.pop", arguments: "", type: ["Object", "other"]}, // todo: Type depends on what's in the array. Could probably figure it out from the declaration or from what is pushed/unshfted to it
		{name: "Array.prototype.push", arguments: "...elements", type: "Number"},
		{name: "Array.prototype.reduce", arguments: "callback, initialValue", type: ["Object", "something"]}, // todo: Return type depends on the reduce function. Might be able to figure it out by analyzing the reduce function.
		{name: "Array.prototype.shift", arguments: "", type: ["Object", "other"]},
		{name: "Array.prototype.slice", arguments: "begin, end", type: "Array"},
		{name: "Array.prototype.some", arguments: "callback, thisArg", type: "Boolean"},
		{name: "Array.prototype.sort", arguments: "compareFunction", type: "Array"}, // todo: Show a warning that sort modifies the array!? Eg. you shouln't assign the return to a new variable
		{name: "Array.prototype.splice", arguments: "start, deleteCount, ...addItems", type: "Array"},
		{name: "Array.prototype.unshift", arguments: "...elements", type: "Number"},
		
		// ### String
		{name: "String", arguments: "", variables: {prototype:{"length": {type: "Number"}}}},
		{name: "String.fromCharCode", arguments: "...charCodes", type: "String"},
		{name: "String.prototype.charAt", arguments: "index", type: "String"},
		{name: "String.prototype.charCodeAt", arguments: "index", type: "Number"},
		{name: "String.prototype.concat", arguments: "...strings", type: "String"},
		{name: "String.prototype.indexOf", arguments: "searchvalue, start", type: "Number"},
		{name: "String.prototype.lastIndexOf", arguments: "searchvalue, start", type: "Number"},
		{name: "String.prototype.match", arguments: "regexp", type: ["RegExp", "null"]},
		{name: "String.prototype.replace", arguments: "searchvalue, newvalue", type: "String"},
		{name: "String.prototype.search", arguments: "stringOrRegexp", type: "Number"},
		{name: "String.prototype.slice", arguments: "start, end", type: "String"},
		{name: "String.prototype.split", arguments: "separator, limit", type: "Array"},
		{name: "String.prototype.substr", arguments: "start, length", type: "String"},
		{name: "String.prototype.substring", arguments: "start, end", type: "String"},
		{name: "String.prototype.toLocaleLowerCase", arguments: "", type: "String"},
		{name: "String.prototype.toLocaleUpperCase", arguments: "", type: "String"},
		{name: "String.prototype.toLowerCase", arguments: "", type: "String"},
		{name: "String.prototype.toUpperCase", arguments: "", type: "String"},
		{name: "String.prototype.trim", arguments: "", type: "String"},
		
		// ### Number
		{name: "Number.isInteger", arguments: "value", type: "Boolean"},
		{name: "Number.isNaN", arguments: "value", type: "Boolean"},
		{name: "Number.isSafeInteger", arguments: "testValue", type: "Boolean"},
		{name: "Number.parseFloat", arguments: "string", type: "Number"},
		{name: "Number.parseInt", arguments: "string, radix", type: "Number"},
		{name: "Number.prototype.toExponential", arguments: "fractionDigits", type: "Number"},
		{name: "Number.prototype.toFixed", arguments: "digits", type: "Number"},
		{name: "Number.prototype.toLocaleString", arguments: "locales, options", type: "String"},
		{name: "Number.prototype.toPrecision", arguments: "precision", type: "Number"},
		{name: "Number.prototype.toString", arguments: "radix", type: "String"},
		{name: "Number.prototype.valueOf", arguments: "", type: "Number"},
		
		
		//{name: "Array.prototype.", arguments: ""},
		
		// ### Date
		{name: "Date", arguments: "unixTimeDateStringOrYear, monthIndex, day, hours, minutes, seconds, milliseconds", type: "Date"},
		{name: "Date.prototype.UTC", arguments: "", type: "Number"},
		{name: "Date.prototype.now", arguments: "", type: "Number"},
		{name: "Date.prototype.parse", arguments: "", type: "Number"},
		{name: "Date.prototype.getDate", arguments: "", type: "Number"},
		{name: "Date.prototype.getDay", arguments: "", type: "Number"},
		{name: "Date.prototype.getFullYear", arguments: "", type: "Number"},
		{name: "Date.prototype.getHours", arguments: "", type: "Number"},
		{name: "Date.prototype.getMilliseconds", arguments: "", type: "Number"},
		{name: "Date.prototype.getMinutes", arguments: "", type: "Number"},
		{name: "Date.prototype.getMonth", arguments: "", type: "Number"},
		{name: "Date.prototype.getSeconds", arguments: "", type: "Number"},
		{name: "Date.prototype.getTime", arguments: "", type: "Number"},
		{name: "Date.prototype.getTimezoneOffset", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCDate", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCDay", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCFullYear", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCHours", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCMilliseconds", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCMinutes", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCMonth", arguments: "", type: "Number"},
		{name: "Date.prototype.getUTCSeconds", arguments: "", type: "Number"},
		{name: "Date.prototype.setDate", arguments: "dayOfMonth", type: "Number"},
		{name: "Date.prototype.setFullYear", arguments: "yearValue, monthValue, dayValue", type: "Number"},
		{name: "Date.prototype.setHours", arguments: "hoursValue, minutesValue, secondsValue, millisecondsValue", type: "Number"},
		{name: "Date.prototype.setMilliseconds", arguments: "millisecondsValue", type: "Number"},
		{name: "Date.prototype.setMinutes", arguments: "minutesValue, secondsValue, millisecondsValue", type: "Number"},
		{name: "Date.prototype.setMonth", arguments: "monthValue, dayValue", type: "Number"},
		{name: "Date.prototype.setSeconds", arguments: "secondsValue, millisecondsValue", type: "Number"},
		{name: "Date.prototype.setTime", arguments: "millisecondsSinceEpoch", type: "Number"},
		{name: "Date.prototype.setUTCDate", arguments: "dayValue", type: "Number"},
		{name: "Date.prototype.setUTCFullYear", arguments: "yearValue, monthValue, dayValue", type: "Number"},
		{name: "Date.prototype.setUTCHours", arguments: "hoursValue, minutesValue, secondsValue, millisecondsValue", type: "Number"},
		{name: "Date.prototype.setUTCMilliseconds", arguments: "millisecondsValue", type: "Number"},
		{name: "Date.prototype.setUTCMinutes", arguments: "minutesValue, secondsValue, millisecondsValue", type: "Number"},
		{name: "Date.prototype.setUTCMonth", arguments: "monthValue, dayValue", type: "Number"},
		{name: "Date.prototype.setUTCSeconds", arguments: "secondsValue, millisecondsValue", type: "Number"},
		{name: "Date.prototype.toDateString", arguments: "", type: "String"},
		{name: "Date.prototype.toISOString", arguments: "", type: "String"},
		{name: "Date.prototype.toJSON", arguments: "", type: "String"},
		{name: "Date.prototype.toLocaleDateString", arguments: "locales, options", type: "String"},
		{name: "Date.prototype.toLocaleString", arguments: "locales, options", type: "String"},
		{name: "Date.prototype.toLocaleTimeString", arguments: "locales, options", type: "String"},
		{name: "Date.prototype.toString", arguments: "", type: "String"},
		{name: "Date.prototype.toTimeString", arguments: "", type: "String"},
		{name: "Date.prototype.toUTCString", arguments: "", type: "String"},
		{name: "Date.prototype.valueOf", arguments: "", type: "Number"},
		
		// ### Math
		{name: "Math.abs", arguments: "numbers", type: "Number"},
		{name: "Math.acos", arguments: "number", type: "Number"},
		{name: "Math.acosh", arguments: "number", type: "Number"},
		{name: "Math.asin", arguments: "number", type: "Number"},
		{name: "Math.asinh", arguments: "number", type: "Number"},
		{name: "Math.atan", arguments: "number", type: "Number"},
		{name: "Math.atan2", arguments: "coordinateY, coordinateX", type: "Number"},
		{name: "Math.atanh", arguments: "number", type: "Number"},
		{name: "Math.cbrt", arguments: "number", type: "Number"},
		{name: "Math.ceil", arguments: "number", type: "Number"},
		{name: "Math.cos", arguments: "radians", type: "Number"},
		{name: "Math.cosh", arguments: "number", type: "Number"},
		{name: "Math.exp", arguments: "number", type: "Number"},
		{name: "Math.floor", arguments: "...numbers", type: "Number"},
		{name: "Math.log", arguments: "number", type: "Number"},
		{name: "Math.max", arguments: "...numbers", type: "Number"},
		{name: "Math.min", arguments: "...numbers", type: "Number"},
		{name: "Math.pow", arguments: "base, exponent", type: "Number"},
		{name: "Math.random", arguments: "", type: "Number"},
		{name: "Math.round", arguments: "number", type: "Number"},
		{name: "Math.sin", arguments: "radians", type: "Number"},
		{name: "Math.sinh", arguments: "number", type: "Number"},
		{name: "Math.sqrt", arguments: "number", type: "Number"},
		{name: "Math.tan", arguments: "radianAngle", type: "Number"},
		{name: "Math.tanh", arguments: "number", type: "Number"},
		{name: "Math.trunc", arguments: "number", type: "Number"},
		
		// ### Object
		{name: "Object.assign", arguments: "target, ...sources", es: 2016},
		{name: "Object.create", arguments: "prototype, propertiesObject"},
		{name: "Object.defineProperties", arguments: "object, properties"},
		{name: "Object.defineProperty", arguments: "object, propertyOfObject, propertyDescription"},
		{name: "Object.entries", arguments: "obj", es: 2016},
		{name: "Object.freeze", arguments: "obj"},
		{name: "Object.fromEntries", arguments: "iterable", es: 2019},
		{name: "Object.getOwnPropertyDescriptor", arguments: "obj, prop"},
		{name: "Object.getOwnPropertyDescriptors", arguments: "obj", es: 2017},
		{name: "Object.getOwnPropertyNames", arguments: "obj"},
		{name: "Object.getOwnPropertySymbols", arguments: "obj", es: 2015},
		{name: "Object.getPrototypeOf", arguments: "obj"},
		{name: "Object.is", arguments: "value1, value2", es: 2015},
		{name: "Object.isExtensible", arguments: "obj"},
		{name: "Object.isFrozen", arguments: "obj"},
		{name: "Object.isSealed", arguments: "obj"},
		{name: "Object.keys", arguments: "obj"},
		{name: "Object.prototype.hasOwnProperty", arguments: "prop"},
		{name: "Object.prototype.isPrototypeOf", arguments: "object"},
		{name: "Object.prototype.propertyIsEnumerable", arguments: "prop"},
		{name: "Object.prototype.toLocaleString", arguments: ""},
		{name: "Object.prototype.toString", arguments: ""},
		{name: "Object.prototype.valueOf", arguments: ""},
		{name: "Object.prototype.seal", arguments: ""},
		{name: "Object.prototype.setPrototypeOf", arguments: "obj, prototype"},
		{name: "Object.prototype.values", arguments: "obj", es: 2017},
		
		// ### JSON
		{name: "JSON.parse", arguments: "string, reviver", type: "Object"},
		{name: "JSON.stringify", arguments: "value, replacer, space", type: "String"},
		
		// ### Promise
		{name: "Promise", arguments: "executorFunction", type: "Promise", es: 2015},
		{name: "Promise.all", arguments: "iterableObjectOrArray", type: "Promise", es: 2015},
		{name: "Promise.race", arguments: "iterableObjectOrArray", type: "Promise", es: 2015},
		{name: "Promise.reject", arguments: "reason", type: "Promise", es: 2015},
		{name: "Promise.resolve", arguments: "value", type: "Promise", es: 2015},
		{name: "Promise.prototype.catch", arguments: "onRejected", type: "Promise", es: 2015},
		{name: "Promise.prototype.finally", arguments: "onFinally", type: "Promise", es: 2015},
		{name: "Promise.prototype.then", arguments: "onFulfilled, onRejected", type: "Promise", es: 2015},
		
		// ### Element (Should this be DOM_node !?)
		{name: "Element.prototype.addEventListener", arguments: "event, function, useCapture", type: "undefined"},
		{name: "Element.prototype.appendChild", arguments: "node", type: "Element"},
		{name: "Element.prototype.blur", arguments: "", type: "undefined"},
		{name: "Element.prototype.click", arguments: "", type: "undefined"},
		{name: "Element.prototype.cloneNode", arguments: "deep", type: "Element"},
		{name: "Element.prototype.compareDocumentPosition", arguments: "otherNode", type: "Number"},
		{name: "Element.prototype.contains", arguments: "node", type: "Boolean"},
		{name: "Element.prototype.exitFullscreen", arguments: "", type: "undefined"},
		{name: "Element.prototype.focus", arguments: "", type: "undefined"},
		{name: "Element.prototype.getAttribute", arguments: "attributename", type: "String"},
		{name: "Element.prototype.getAttributeNode", arguments: "attributename", type: "String"},
		{name: "Element.prototype.getBoundingClientRect", arguments: "", type: "Object"},
		{name: "Element.prototype.getElementsByClassName", arguments: "classname", type: "Array"},
		{name: "Element.prototype.getElementsByTagName", arguments: "tagname", type: "Array"},
		{name: "Element.prototype.hasAttribute", arguments: "attributename", type: "Boolean"},
		{name: "Element.prototype.hasAttributes", arguments: "", type: "Boolean"},
		{name: "Element.prototype.hasChildNodes", arguments: "", type: "Boolean"},
		{name: "Element.prototype.insertAdjacentElement", arguments: "position, element", type: ["Element", "null"]},
		{name: "Element.prototype.insertAdjacentHTML", arguments: "position, text", type: "undefined"},
		{name: "Element.prototype.insertAdjacentText", arguments: "position, text", type: "undefined"},
		{name: "Element.prototype.insertBefore", arguments: "newnode, existingnode", type: "Element"},
		{name: "Element.prototype.isDefaultNamespace", arguments: "namespaceURI", domVersion: 3, type: "Boolean"},
		{name: "Element.prototype.isEqualNode", arguments: "node", domVersion: 3, type: "Boolean"},
		{name: "Element.prototype.isSameNode", arguments: "node", domVersion: 3, type: "Boolean"},
		{name: "Element.prototype.normalize", arguments: "", type: "undefined"},
		{name: "Element.prototype.querySelector", arguments: "CSS_selectors", type: "Element"},
		{name: "Element.prototype.querySelectorAll", arguments: "CSS_selectors", type: "Array"},
		{name: "Element.prototype.removeAttribute", arguments: "attributename", type: "undefined"},
		{name: "Element.prototype.removeAttributeNode", arguments: "attributenode", type: "undefined"},
		{name: "Element.prototype.removeChild", arguments: "node", type: "undefined"},
		{name: "Element.prototype.removeEventListener", arguments: "event, function, useCapture", type: "undefined"},
		{name: "Element.prototype.replaceChild", arguments: "newnode, oldnode", type: "undefined"},
		{name: "Element.prototype.requestFullscreen", arguments: "options", type: "Promise"},
		{name: "Element.prototype.scrollIntoView", arguments: "alignTo", type: "undefined"},
		{name: "Element.prototype.setAttribute", arguments: "attributename, attributevalue", type: "undefined"},
		{name: "Element.prototype.setAttributeNode", arguments: "attributenode", type: "undefined"},
		{name: "Element.prototype.toString", arguments: "", type: "String"}
	];
	
	
	var browserGlobalFunctions = [
		{name: "document.getElementById", arguments: "id", type: "Element"},
		{name: "document.createElement", arguments: "tagName", type: "Element"},
	];
	// todo: Check if we are browser or nodejs or other JS platform
	builtInFunctions = builtInFunctions.concat(browserGlobalFunctions);
	
	var consoleApi = [
		{name: "console.assert", arguments: "assertion, ...msgOrObjects, ...objOrSubstitutes", es: 2015},
		{name: "console.clear", arguments: "", es: 2015},
		{name: "console.count", arguments: "label", es: 2015},
		{name: "console.countReset", arguments: "label", es: 2015},
		{name: "console.debug", arguments: "objectOrMessage, ...moreObjectsOrSubsitutes"},
		{name: "console.dir", arguments: "object"},
		{name: "console.dirxml", arguments: "object"},
		{name: "console.error", arguments: "objectOrMessage, ...moreObjectsOrSubsitutes"},
		{name: "console.group", arguments: "label"},
		{name: "console.groupCollapsed", arguments: "label"},
		{name: "console.groupEnd", arguments: ""},
		{name: "console.info", arguments: "objectOrMessage, ...moreObjectsOrSubsitutes"},
		{name: "console.log", arguments: "objectOrMessage, ...moreObjectsOrSubsitutes"},
		{name: "console.table", arguments: "data, columns"},
		{name: "console.time", arguments: "label"},
		{name: "console.timeEnd", arguments: "label"},
		{name: "console.timeLog", arguments: "label"},
		{name: "console.trace", arguments: ""},
		{name: "console.warn", arguments: "objectOrMessage, ...moreObjectsOrSubsitutes"}
	];
	builtInFunctions = builtInFunctions.concat(consoleApi);
	
	
	var builtInVariables = {
		"Infinity": {type: "Number"},
		"NaN": {type: "Number"},
		"undefined": {},
		"null": {},
		
		"Number": {
			keys: {
				"EPSILON": {type: "Number"},
				"MAX_SAFE_INTEGER": {type: "Number"},
				"MAX_VALUE": {type: "Number"},
				"MIN_SAFE_INTEGER": {type: "Number"},
				"MIN_VALUE": {type: "Number"},
				"NEGATIVE_INFINITY": {type: "Number"},
				"NaN": {type: "Number"},
				"POSITIVE_INFINITY": {type: "Number"},
			}
		},
		
		"Math": {
			keys: {
				"E": {type: "Number"}, 
				"LN2": {type: "Number"}, 
				"LN10": {type: "Number"}, 
				"LOG2E": {type: "Number"}, 
				"LOG10E": {type: "Number"}, 
				"PI": {type: "Number"}, 
				"SQRT1_2": {type: "Number"}, 
				"SQRT2": {type: "Number"}, 
			}
		},
	};
	
	var objectPrototype = builtInFunctions.filter(function(f) {
		return (f.name.indexOf("Object.prototype") == 0);
	});
	
	
	
	var relatedScripts = {}; // path: [array of file paths] 
	var parsedFiles = {}; // path: parsed-object ref
	var reScripts = /<script[^>]*src="([^"]*)"[^>]*><\/script>/ig; // The g flag is important, or exec will run in an endless loop!
	var reHTML = /html?$/i;
	var reJS = /js$/i;
	
	var localVariableColor = "rgb(51, 99, 172)"; // blue
	var scopedVariableColor = "rgb(196, 162, 37)"; // orange
	var globalVariableColor = "rgb(143, 15, 16)"; // red
	
	
	
	EDITOR.plugin({
		desc: "Autocomplete for JavaScript",
		load: function load() {
			var order = 10; // Run before autoComplete_js_misc.js
			EDITOR.on("autoComplete", autoCompleteJS, order);
			EDITOR.on("afterSave", autoCompleteJS_fileSave);
			EDITOR.on("fileOpen", autoCompleteJS_fileOpen);
			EDITOR.on("fileParse", autoCompleteJS_fileParse);
			
			if(QUERY_STRING["variable_colors"]) EDITOR.addPreRender(variableColors);
			
		},
		unload: function unload() {
			EDITOR.removeEvent("autoComplete", autoCompleteJS);
			EDITOR.removeEvent("afterSave", autoCompleteJS_fileSave);
			EDITOR.removeEvent("fileOpen", autoCompleteJS_fileOpen);
			EDITOR.removeEvent("fileParse", autoCompleteJS_fileParse);
			
			EDITOR.removePreRender(variableColors);
		},
	});
	
	
	function autoCompleteJS_fileParse(file) {
		parsedFiles[file.path] = file.parsed; // Save a reference to the parse-object
	}
	
	function autoCompleteJS_fileSave(file) {
		
		if(file.path.match(reHTML)) {
			updateRelatedScripts(file);
		}
		
		return true;
	}
	
	function autoCompleteJS_fileOpen(file) {
		
		if(file.path.match(reHTML)) {
			updateRelatedScripts(file);
		}
		else if(file.path.match(reJS)) {
			if(!relatedScripts.hasOwnProperty(file.path)) {
				relatedScripts[file.path] = [];
			}
		}
		
		return true;
	}
	
	function updateRelatedScripts(htmlFile) {
		console.time("updateRelatedScripts in " + htmlFile.path);
		var directory = UTIL.getDirectoryFromPath(htmlFile.path);
		var scripts = findScriptFiles(directory, htmlFile.text);
		
		console.log("scripts=" + scripts);
		
		for (var i=0; i<scripts.length; i++) {
			if(!relatedScripts.hasOwnProperty(scripts[i])) {
				relatedScripts[ scripts[i] ] = [];
			}
			
			for (var j=0; j<scripts.length; j++) {
				if(scripts[i] != scripts[j]) relatedScripts[ scripts[i] ].push( scripts[j] );
			}
		}
		
		// Check if the scripts have been parsed
		for (var i=0; i<scripts.length; i++) {
			if(!parsedFiles.hasOwnProperty(scripts[i])) {
				
				if( scripts[i].match(/^.*:\/\//i) ) console.warn("todo: Support third party scripts");
				else loadAndParse(scripts[i]);
			}
		}
		
		console.timeEnd("updateRelatedScripts in " + htmlFile.path);
	}
	
	function loadAndParse(fileToParse) {
		console.log("loadAndParse: fileToParse=" + fileToParse);
		
		// Wait 5 seconds in case the file is opened or parsed, so that we do not do it many times
		setTimeout(maybeParsedAlready, 5000);
		
		function maybeParsedAlready() {
			if(EDITOR.files.hasOwnProperty(fileToParse)) {
				if(!parsedFiles.hasOwnProperty(fileToParse)) throw new Error("Expected file to be in fileToParse=" + Object.keys(fileToParse) + ": fileToParse=" + fileToParse);
				if(!relatedScripts.hasOwnProperty(fileToParse)) throw new Error("Expected file to be in relatedScripts=" + Object.keys(relatedScripts) + " fileToParse=" + fileToParse);
				return; // It has already been related!
			}
			else if(parsedFiles.hasOwnProperty(fileToParse)) {
				
				return; // It has already been related!
			}
			else {
				EDITOR.readFromDisk(fileToParse, function(err, path, data, hash) {
					if(err) {
						console.warn("Failed to load from disk: fileToParse=" + fileToParse + " err=" + err.message);
						return;
					}
					EDITOR.parse(data, "JS", function(err, parseResult) {
						if(err) {
							console.warn("Failed to parse: fileToParse=" + fileToParse + " err=" + err.message);
							return;
						}
						else {
							parsedFiles[fileToParse] = parseResult;
						}
					});
				});
			}
		}
	}
	
	
	
	function findScriptFiles(dir, str) {
		var matches;
		var filesPaths = [];
		var filePath = "";
		while( matches = reScripts.exec(str) ) {
			console.log(matches);
			filePath = matches[1];
			if(filePath.indexOf("/") == -1 && filePath.charAt(0) != ".") filePath = "./" + filePath;
			filesPaths.push( UTIL.resolvePath(dir, filePath) );
		}
		return filesPaths;
	}
	
	function autoCompleteJS(file, wordToComplete, wordLength, gotOptions) {
		
		console.log("autoCompleteJS: wordToComplete=" + wordToComplete);
		
		var options = [];
		var js = file.parsed;
		var charIndex = file.caret.index;
		
		if(!js) {
			console.log("File has not been parsed. No JavaScript auto-complete available");
			return;
		}
		
		if(js.language != "JS") return;
		
		/*
			When pushing to options,
			Push an array with 0:text, 1: characters to move
		*/
		
		
		// Give the current function argument if inside a function call
		var fc = insideFunctionCall(file, file.caret, js);
		if(fc) {
			console.log("fc=" + JSON.stringify(fc));
			
			if(fc.argument===null) {
				// No more arguments! Delete the last comma and close the function!?
			}
			else if(fc.allArguments === "<b></b>") {
				console.warn("Found no function arguments for " + fc.name + "!");
				EDITOR.addInfo(file.caret.row, file.caret.col, "Nothing found");
			}
			else if(fc.argument.substring(0, wordToComplete.length) == wordToComplete && wordToComplete.length > 0) {
				options.push([fc.argument, 0]);
			}
			else {
				EDITOR.addInfo(file.caret.row, file.caret.col, fc.allArguments);
			}
		}
		else console.log("Not inside function call!");
		
		if(wordLength > 0) {
			
			//console.warn(JSON.stringify(js.functions, null, 2));
			
			if(js.functions) findFunctions(js.functions, js);
			
			if(js.globalVariables) searchVariables(js.globalVariables, wordToComplete, undefined, js); // Check global variables
			
			// Global variables from other files
			console.log(file.path + " related scripts =" + (relatedScripts[file.path] && relatedScripts[file.path].length));
			console.log(relatedScripts[file.path]);
			
			if(relatedScripts[file.path]) {
				for (var i=0, script, globalVariables, functions; i<relatedScripts[file.path].length; i++) {
					script = relatedScripts[file.path][i]
					if( !parsedFiles.hasOwnProperty(script) ) {
						console.warn(script + " has not been parsed!");
						continue;
					}
					
					functions = parsedFiles[script].functions;
					if(!functions) {
						console.warn(script + " does not have a functions member!");
						continue;
					}
					console.log("Search (global) functions (" + functions.length + ") in related script: " + script + " ...");
					findFunctions(functions, parsedFiles[script]);
					
					globalVariables = parsedFiles[script].globalVariables;
					if(!globalVariables) {
						console.warn(script + " does not have a globalVariables member!");
						continue;
					}
					console.log("Search global variables (" + Object.keys(globalVariables).length + ") in related script: " + script + " ...");
					searchVariables(globalVariables, wordToComplete, undefined, parsedFiles[script]); // Check global variables
					
					
				}
			}
			
			// Search builtin's'
			searchVariables(builtInVariables, wordToComplete, undefined, js);
			
			for(var i=0; i<builtInFunctions.length; i++) {
				checkFunctionName(builtInFunctions[i].name, wordToComplete);
				
				//if(builtInFunctions[i].variables && builtInFunctions[i].variables.prototype) searchVariables(builtInFunctions[i].variables.prototype, wordToComplete);
				
			}
			
		}
		
		console.log("autoCompleteJS: options=" + JSON.stringify(options, null, 2)); 
		
		return options; // disable default action
		
		function checkGlobalFunctionNames(functions, wordToComplete) {
			if(functions == undefined) throw new Error("First parameter functions=" + functions);
			var globalFunctions = getGlobalFunctions(functions);
			for (var i=0; i<globalFunctions.length; i++) {
				checkFunctionName(globalFunctions[i].name, wordToComplete)
			}
		}
		
		function checkFunctionName(functionName, word) {
			console.warn("Checking if word=" + word + " matches function name=" + functionName + "");
			if(functionName.indexOf(".prototype.") != -1) return;
			//if(typeof functionName != "string") return; // It can be an anonymous function
			//console.warn(functionName + "(" + typeof functionName + ")");
			if(functionName.substr(0, wordLength) == word) {
				options.push([functionName + "()", 1]);
			}
		}
		
		
		function sharedStart(array) {
			var wholeWord = 1;
			var A= array.concat().sort(), 
			a1= A[0][wholeWord], 
			a2= A[A.length-1][wholeWord], 
			L= a1.length, 
			i= 0;
			
			while(i<L && a1.charAt(i)=== a2.charAt(i)) i++;
			return a1.substring(0, i);
		}
		
		function figureOutParameterType(fun, autocompleteArgumentIndex, charIndex, js) {
			// Figures out the type of a function parameter
			console.log("figureOutParameterType: inside fun.name=" + fun.name + " autocompleteArgumentIndex=" + autocompleteArgumentIndex + " charIndex=" + charIndex);
			
			if(js == undefined) throw new Error("Parsed js not in arguments! " + JSON.stringify(arguments));
			
			var file = EDITOR.currentFile;
			var scope = getScope(charIndex, js.functions, js.globalVariables);
			
			
			// Find call sites (in the file)
			var reCalls = new RegExp(fun.name + "\\s*\\(", "g");
			var arr;
			var i=0;
			var leftP=0;
			var rightP=0;
			var char = "";
			var startIndex = 0;
			while ((arr = reCalls.exec(file.text)) !== null) {
				// We can't use regexp to find the arguments, because of the possibility of nested parentheses
				startIndex = arr.index+arr[0].length;
				for (i=startIndex, leftP=0, rightP=0; i<file.text.length; i++) {
					char = file.text.charAt(i);
					
					if(char=="(") leftP++;
					else if(char==")") rightP++;
					
					//console.log("i=" + i + " char=" + char + " leftP=" + leftP + " rightP=" + rightP);
					
					if(rightP > leftP) {
						// We reached the end of the arg string
						analyzeArgString(file.text.slice(startIndex, i), startIndex);
						break;
					}
				}
			}
			
			
			// Find places where the function is used as a parameter
			var reInArgument = new RegExp("(\\w+)\\(.*" + fun.name + ".*\\)", "g");
			
			var arr;
			var count = 0;
			var argumentIndex = -1;
			while ((arr = reInArgument.exec(file.text)) !== null) {
				argumentIndex = findArgumentIndex(arr[0], fun.name);
				console.log("figureOutParameterType: arr=" + JSON.stringify(arr) + " argumentIndex=" + argumentIndex);
				checkFunctionParameters(arr[1], argumentIndex);
				
				if(++count > 10) break;
			}
			
			function checkFunctionParameters(fname, parameterIndex) {
				
				// Find the function in the scope
				var f = scope.functions[fname];
				if(!f) {
					console.log("figureOutParameterType: checkFunctionParameters: fname=" + fname + " is not in scope: " + JSON.stringify(scope, null, 2));
					return;
				}
				
				var parameterName = getParameterName(f.arguments, parameterIndex);
				
				// Check the function body to get the arguments used when calling the parameter as a function
				var reCalls = new RegExp(parameterName + "\\s*\\(", "g");
				var fBody = file.text.slice(f.start, f.end);
				console.log("checkFunctionParameters: fBody=" + fBody);
				var arr;
				var i=0;
				var leftP=0;
				var rightP=0;
				var char = "";
				var startIndex = 0;
				while ((arr = reCalls.exec(fBody)) !== null) {
					// We can't use regexp to find the arguments, because of the possibility of nested parentheses
					startIndex = arr.index+arr[0].length;
					
					console.log("checkFunctionParameters in functionb body: startIndex=" + startIndex + " arr.index=" + arr.index + " arr=" + JSON.stringify(arr));
					
					for (i=startIndex, leftP=0, rightP=0; i<fBody.length; i++) {
						char = fBody.charAt(i);
						
						if(char=="(") leftP++;
						else if(char==")") rightP++;
						
						//console.log("i=" + i + " char=" + char + " leftP=" + leftP + " rightP=" + rightP);
						
						if(rightP > leftP) {
							// We reached the end of the arg string
							analyzeArgString(fBody.slice(startIndex, i), startIndex+f.start);
							break;
						}
					}
				}
			}
			
			function analyzeArgString(argStr, index) {
				var argsArr = parseArgumentString(argStr);
				
				analyzeExpression(argsArr[autocompleteArgumentIndex], index);
			}
			
			function analyzeExpression(str, index) {
				console.log("analyzeExpression: str=" + str + " index=" + index);
				
				// Figure out the type of this expression
				var scope = getScope(index, js.functions, js.globalVariables);
				var variable = scope.variables[str];
				
				if(variable) {
					console.log("figureOutParameterType: " + str + " is a variable=" + JSON.stringify(variable));
					
					// Replace the variable with our local parameter
					var localParams =wordToComplete.split(".");
					var theVariable = {}
					theVariable[localParams[0]] = variable;
					
					//var word = wordToComplete.slice(wordToComplete.indexOf(".")+1);
					
					searchVariables(theVariable, wordToComplete, undefined, js);
				}
				else {
					console.log("analyzeExpression: Unable to find variable " + str + " in scope=" + JSON.stringify(scope, null, 2));
				}
				
			}
			
			function parseArgumentString(argStr) {
				console.log("parseArgumentString: argStr=" + argStr);
				var args = argStr.split(",");
				args = args.map(function(a) {
					return a.trim();
				});
				return args;
			}
			
			function findArgumentIndex(callString, arg) {
				var args = callString.slice( callString.indexOf("(")+1, callString.lastIndexOf(")") );
				console.log("findArgumentIndex: args=" + args);
				var args = args.split(",");
				args = args.map(function(a) {
					return a.trim();
				});
				return args.indexOf(arg);
			}
			
			function getParameterName(parameterString, parameterIndex) {
				var parameters = parameterString.split(",");
				var name = parameters[parameterIndex];
				var defaultValue = name.indexOf("=");
				if(defaultValue != -1) name = name.slice(0, defaultValue);
				
				return name;
			}
			
		}
		
		function findFunctions(functions, js) {
			// Find out if we are inside functions, then check those functions for variables and name of sub-functions.
			
			if(!functions) console.warn(typeof functions + " passed to findFunctions");
			
			console.log("functionCount=" + Object.keys(functions).length + " charIndex=" + charIndex);
			
			var func;
			
			var props = wordToComplete.split(".");
			
			
			for(var i=0; i<functions.length; i++) {
				
				func = functions[i];
				
				console.log("checking function=" + func.name + " start=" + func.start + " end=" + func.end + "  ...");
				
				if(func.global) {
					// Check name of global function
					checkFunctionName(func.name, wordToComplete);
				}
				
				if(func.start <= charIndex && func.end >= charIndex) {
					// Cursor is inside this function!
					
					console.log("Inside " + func.name + " ");
					
					checkFunctionName(func.name, wordToComplete);
					
					// Give arguments
					if(func.arguments.length > 0) {
						var functionArguments = func.arguments.split(",");
						for(var a=0; a<functionArguments.length; a++) {
							functionArguments[a] = functionArguments[a].trim(); // Get rid of spaces
							// todo: Handle default function argument values
							// maybe: Search for calls of this function to figure out what Type of variable it is
							console.log("parameter " + a + ": " + functionArguments[a] + " wordToComplete=" + wordToComplete + " props[0]=" + props[0] + " ");
							if(functionArguments[a].indexOf(wordToComplete) == 0) options.push(functionArguments[a]);
							else if(functionArguments[a] == props[0]) figureOutParameterType(func, a, charIndex, js);
						}
					}
					
					
					searchVariables(func.variables, wordToComplete, func.name, js); // check variables in this functions
					
					// check names of sub-functions
					for(var j=0; j<func.subFunctions.length; j++) {
						if(func.subFunctions[j].name.length > 0 && !func.subFunctions[j].lambda) checkFunctionName(func.subFunctions[j].name, wordToComplete);
					}
					
					// Search sub-functions (recursive)
					findFunctions(func.subFunctions, js);
					
				}
				else {
					console.log("charIndex=" + charIndex + " Not between func.start=" + func.start + " and " + func.end + " function=" + func.name);
				
					// We are not inside this function, but we still want to check if it has global functions in it ...
					console.log(func.name);
					console.log("subfunctions=" + func.subFunctions.length)
					checkGlobalFunctionNames(func.subFunctions, wordToComplete);
					
				}
				
				if(!func.lambda) checkFunctionName(func.name, wordToComplete); // Check parent scope function-names
				
			}
		}
		
		function searchVariables(variables, word, functionName, js) {
			var wordLength = word.length;
			
			console.log("searchVariables: Searching " + JSON.stringify(variables) + " for: " + word + "");
			
			var properties = word.split("."); // If it's JSON
			
			if(properties.length > 1) {
				// Traverse the property chain ...
				if(variables.hasOwnProperty(properties[0])) {
					
					console.log("searchVariables: found variable=" + properties[0] + "");
					
					var variable = variables[properties[0]];
					
					if(!variable.hasOwnProperty("keys")) {
						console.log("Variable does not have a keys property: " + properties[0]);
					}
					else {
					// Traverse the chain ... foo.bar.bas.xx
					for(var propertyIndex=1; propertyIndex<properties.length; propertyIndex++) {
						if(variable.keys.hasOwnProperty(properties[propertyIndex])) {
							console.log("searchVariables: Setting new variable:" + properties[propertyIndex]);
							variable = variable.keys[properties[propertyIndex]];
						}
						else {
							break;
						}
					}
					
					var keyName = properties[propertyIndex]; // This is the word we are gonna auto-complete
					
					console.log("searchVariables: propertyIndex=" + propertyIndex + " keyName=" + keyName + "");
					
					
					if( (!variable.hasOwnProperty("keys") || Object.keys(variable.keys).length == 0) && properties[properties.length-1] != "" ) {
						console.log("searchVariables: Patch variable=" + JSON.stringify(variable, null, 2));
						patchVariableKeysFromFunctionReturnObjectLiteral(variable, charIndex, js);
					}
					else {
						console.log("searchVariables: Variable " + properties[propertyIndex-1] + " already have " +  Object.keys(variable.keys).length + " keys!");
					}
					
					if(variable.hasOwnProperty("keys")) {
						// Search for keys
						for(var key in variable.keys) {
							console.log("searchVariables: " + key.substr(0, keyName.length) + " == " + keyName + " ? (key=" + key + ")");
							if(key.substr(0, keyName.length) == keyName) {
								if(!optionExist(options, key)) {
									pushVariable(keyName, variable.keys[key], key);
								}
								//options.push([keyName, key, 0]);
							}
						}
					}
					
					console.log("searchVariables: variable.type=" + variable.type);
					
					if(variable.type=="unknown") {
						variable.type=figureOutVariableType(variable.value, charIndex, js);
					}
					
					if(variable.type == "this" && functionName) {
						var p = functionName.split(".");
						
						searchFunctionThis(p[0], keyName, js);
					}
					else {
						
						// Look for prototype functions with the keyName
						console.log("searchVariables: keyName=" + keyName);
						
						for (var i=0; i<builtInFunctions.length; i++) {
							if( builtInFunctions[i].name.indexOf(variable.type + ".prototype." + keyName) == 0 ) {
								var key = builtInFunctions[i].name.slice(builtInFunctions[i].name.lastIndexOf(".")+1);
								pushVariable(keyName, {method: true}, key);
							}
						}
						// Check global function prototypes
						var globalFunctions = getGlobalFunctions(js.functions);
						for (var i=0; i<globalFunctions.length; i++) {
							if( globalFunctions[i].name.indexOf(variable.type + ".prototype." + keyName) == 0 ) {
								var key = globalFunctions[i].name.slice(globalFunctions[i].name.lastIndexOf(".")+1);
								pushVariable(keyName, {method: true}, key);
							}
						}
						
						// Check built in "class" prototype properties
						for (var i=0; i<builtInFunctions.length; i++) {
							if(builtInFunctions[i].variables && builtInFunctions[i].variables.prototype && builtInFunctions[i].name.indexOf(variable.type) == 0) {
								var keys = Object.keys( builtInFunctions[i].variables.prototype );
								for(var j=0; j<keys.length; j++) {
									if( keys[j].indexOf(keyName)==0 ) {
										pushVariable(keyName, {method: false}, keys[j]);
									}
								}
							}
						}
						
						// Check for functions with that name, then check if the function has a property that match the word
						if(properties.length > propertyIndex) {
							for(var i=propertyIndex+1; i<properties.length; i++) {
								keyName += "." + properties[i];
							}
						}
						searchFunctionThis(variable.value, keyName, js);
						
						// All objects has access to Object.prototype!
						// But only show these if we have not yet discovered other keys. And not on natives!
						if(options.length==0 && (variable.type=="Object" || Object.keys(variable.keys).length > 0 )) {
							for (var i=0; i<objectPrototype.length; i++) {
								if( objectPrototype[i].name.indexOf("Object.prototype." + keyName) == 0 ) {
									var key = objectPrototype[i].name.slice(objectPrototype[i].name.lastIndexOf(".")+1);
									pushVariable(keyName, {method: true}, key);
								}
							}
						}
						
					}
				}
				}
				
			}
			else {
				// Check each variable in the list
				for(var variableName in variables) {
					
					if(variableName.substr(0, wordLength) == word) {
						
						var variable = variables[variableName];
						
						if(!optionExist(options, variableName)) {
							
							pushVariable(word, variable, variableName);
							
						}
						
						
					}
				}
			}
			
			if(variables.hasOwnProperty("prototype")) searchVariables(variables["prototype"].keys, word, undefined, js);
			
			
			function pushVariable(word, variable, variableName) {
				
				console.warn("pushVariable: word=" + word + " variableName=" + variableName + " wordToComplete=" + wordToComplete + " variable=" + JSON.stringify(variable, null, 2) );
				
				var fullName = "";
				
				var lastIndexOfDot = wordToComplete.lastIndexOf(".");
				
				if(lastIndexOfDot != -1) {
					fullName = wordToComplete.substring(0, lastIndexOfDot) + "." + variableName;
				}
				else fullName = variableName;
				
				if(variable.type=="Array") {
					options.push([fullName + "[]", 1]);
					
				}
				else if(variable.method) {
					options.push([fullName + "()", 1]);
				}
				else if(variable.hasOwnProperty("keys")) {
					if(Object.keys(variable.keys).length > 0) {
						// It's a json: Add a dot at the end
						options.push([fullName + ".", 0]);
					}
					else {
						options.push([fullName, 0]);
					}
				}
				else {
					options.push([fullName, 0]);
				}
				
			}
			
			function optionExist(options, variableName) {
				// options can both be an array and a string
				for(var i=0; i<options.length; i++) {
					
					//console.log("optionExist options=" + JSON.stringify(options) + "");
					if(typeof options[i]  == "object") {
						//console.log("options[" + i + "]=" + JSON.stringify(options[i]) + "");
						if(options[i][0].indexOf(variableName) != -1) return true;
					}
					else {
						if(options[i].indexOf(variableName) != -1) return true;
					}
				}
				return false;
			}
			
		}
		
		function searchFunctionThis(functionName, keyName, js) {
			console.log("searchFunctionThis functionName=" + functionName + " keyName=" + keyName + "");
			
			/*
				
				Note that js.functions is a tree!
				
				
			*/
			
			// Looking for this.keyName... in a function called functionName
			
			// Look for subfunctions in functions we are currently in
			for(var i=0, func; i<js.functions.length; i++) {
				
				func = js.functions[i];
				
				if(func.start < charIndex && func.end > charIndex) {
					// We are in this function. Check it's subfunctions
					
					for(var j=0; j<func.subFunctions.length; j++) {
						if(func.subFunctions[j].name == functionName) analyze(func.subFunctions[j]);
					}
					
				}
				
				// And analyze all global functions if it has the right name
				if(func.name == functionName) analyze(func);
			}
			
			function analyze(objectCreatorFunction) {
				// Look for variables named "this" or variables with type "this"
				
				console.log("Analyzing " + objectCreatorFunction.name);
				
				if(objectCreatorFunction.variables.hasOwnProperty("this")) {
					// Search that one
					searchVariables(objectCreatorFunction.variables["this"].keys, keyName, undefined, js);
				}
				
				// Check if any of the variables is of type "this"
				for(var variableName in objectCreatorFunction.variables) {
					if(objectCreatorFunction.variables[variableName].type == "this") {
						// Check its keys
						searchVariables(objectCreatorFunction.variables[variableName].keys, keyName, undefined, js);
					}
				}
				
				if(objectCreatorFunction.variables.hasOwnProperty("prototype")) {
					// Search the prototype
					searchVariables(objectCreatorFunction.variables["prototype"].keys, keyName, undefined, js);
				}
			}
		}
	}
	
	function patchVariableKeysFromFunctionReturnObjectLiteral(variable, charIndex, js) {
		var value = variable.value;
		if(value=="" || value==undefined) {
			console.log("patchVariableKeysFromFunctionReturnObjectLiteral: There's no value!");
			return;
		}
		
		var func = findFunctionFromValue(value, charIndex, js);
		
		if(!func) {
			console.log("patchVariableKeysFromFunctionReturnObjectLiteral: value=" + value + " does't seem to be a function!");
			return;
		}
		
		var returns = func.returns;
		
		console.log("patchVariableKeysFromFunctionReturnObjectLiteral: " + func.name + " return statements: " + JSON.stringify(func.returns, null, 2));
		
		for (var i=0; i<returns.length; i++) {
			if(returns[i].hasOwnProperty("keys")) {
				variable.keys = returns[i].keys;
				console.log("patchVariableKeysFromFunctionReturnObjectLiteral: Patched variable with keys: " + JSON.stringify(returns[i], null, 2));
				return;
			}
		}
		
		console.log("patchVariableKeysFromFunctionReturnObjectLiteral: function " + func.name + " does not seem to return any object literals!");
		return;
	}
	
	
	function findFunctionFromValue(value, charIndex, js) {
		var scope = getScope(charIndex, js.functions, js.globalVariables);
		var func = scope.functions[value];
		if(func) return func;
		
		var props = value.split(".");
		
		if(props.length == 1) {
			console.log("findFunctionFromValue: Unable to find a function with name=" + value + " from scope at charIndex=" + charIndex);
			return null;
		}
		
		// Also check prototype functions
		var fName = value.slice(0, value.lastIndexOf(".")) + ".prototype." + props[props.length-1];
		var func = scope.functions[value];
		if(func) return func;
		
		console.log("findFunctionFromValue: Unable to find a function with name=" + fName + " from scope at charIndex=" + charIndex);
		return null;
	}
	
	function showWarningAt(index, message) {
		var file = EDITOR.currentFile;
		var caret = file.createCaret(index);
		var level = WARNING;
		EDITOR.addInfo(caret.row, caret.col, message, file, level);
	}
	
	function figureOutVariableType(value, charIndex, js) {
		// Figure out the variable type from the variable value (which can be the name of another variable, a function-call, or expression)
		console.log("figureOutVariableType: value=" + value);
		
		if(value=="" || value==undefined) {
			console.log("figureOutVariableType: Unable to figure out type from value=" + value);
			return "unknown";
		}
		
		var file = EDITOR.currentFile;
		var types = [];
		// Is there a function with that value ?
		var scope = getScope(charIndex, js.functions, js.globalVariables);
		
		var func = scope.functions[value];
		
		if(!func) {
			console.log("figureOutVariableType: Unable to find any functions in scope with the name " + value + "");
			
			// Maybe bar as in foo.bar is a prototype method !?
			
			var props = value.split(".");
			if(props.length == 1) return "unknown";
			
			var variable = scope.variables[props[0]];
			if(!variable) return "unknown";
			
			// Traverse the chain
			for (var i=1; i<props.length-1; i++) {
				variable = scope.keys[props[i]];
			}
			
			if(!variable) {
				console.warn("Unable to find all keys in " + value + " in variable=" + props[0]);
				return "unknown";
			}
			
			// is foo.bar a prototype method !?
			var methodName = props[props.length-1];
			var methodReturnType;
			for (var i=0; i<builtInFunctions.length; i++) {
				if(builtInFunctions[i].name == variable.type + ".prototype." + methodName) {
					if(Array.isArray(builtInFunctions[i].type)) {
						showWarningAt(charIndex, value + " can be " + builtInFunctions[i].type.join(", "));
						return builtInFunctions[i].type[0];
					}
					return builtInFunctions[i].type;
				}
				// todo: Also check userland prototype methods!
			}
			
			return "unknown";
		}
		
		// What does the function return ?
		var reRet = /return(.*)/g;
		var fBody = file.text.slice(func.start, func.end);
		var arr;
		var count = 0;
		while ((arr = reRet.exec(fBody)) !== null) {
			console.log("findFunctionReturnStatement: arr=" + JSON.stringify(arr));
			analyzeReturnStatement(arr[1]);
			if(++count > 10) break;
		}
		
		console.log("figureOutVariableType: types.length=" + types.length);
		if(types.length == 0) {
			
			return "unknown";
		}
		else {
			// Make sure all types are the same, with the exception of null !?
			console.log("figureOutVariableType: types=" + JSON.stringify(types));
			if(types.length > 0) showWarningAt(charIndex, value + " can be " + types.join(", "));
			return types[0];
		}
		
		function analyzeReturnStatement(ret) {
			console.log("analyzeReturnStatement: ret=" + ret);
			ret = ret.trim();
			
			// Remove comment
			var commentIndex = ret.indexOf("//");
			if(commentIndex!=-1) ret.slice(0, commentIndex);
			
			ret = ret.trim();
			
			// Remove semicolon
			if(ret.charAt(ret.length-1) == ";") ret = ret.slice(0,-1);
			
			ret = ret.trim();
			
			// Remove parentheses
			ret = ret.replace(/\(|\)/g, ""); 
			
			ret = ret.trim();
			
			if(ret=="") types.push("undefined"); // void
			else if(ret.match(/['"`]/)) types.push("String");
			else if(ret.indexOf("+")!=-1 || ret.indexOf("-")!=-1 || ret.indexOf("*")!=-1 || ret.indexOf("/")!=-1 || ret.indexOf("%")!=-1) types.push("Number");
			else if(ret == "true" || ret == "false") types.push("Boolean");
			else if(ret.indexOf("!!") != -1) types.push("Boolean");
			else {
				if(ret.indexOf("[")) {
					// An array of values
					// todo: Figure out the type of that value
				}
				
				var props = ret.split(".");

// Changle the scope to the function point ot view
				var scope = getScope(func.start+1, js.functions, js.globalVariables);

				// Search the scope for variables and functions
				var variable = scope.variables[props[0]];
				if(variable) {
					console.warn("figureOutVariableType: Found variable " + props[0] + "");
					if(props.length == 1) types.push( variable.type );
					else {
						for (var i=1; i<props.length; i++) {
							variable = variable.keys[props[i]]
							if(!variable) {
console.warn("Found variable " + props[0] + " but not the member " + ret);
								return;
							}
						}
						types.push(variable.type);
					}
					return;
				}
else {
					
					var otherFunction = scope.functions[ret];
					if(otherFunction) {
						console.log("figureOutVariableType: The return from " + func.name + " function is another function: " + otherFunction.name + " !");
						// Make another search from the scope of that function
						types.push( figureOutVariableType(ret, otherFunction.start+1, js) );
					}
				}
			}
		}
	}
	
	function isWhiteSpace(char) {
		return /\s/.test(char);
	}
	
	function insideFunctionCall(file, caret, js) {
		// Return false if not inside function call, or the function name and argument index if inside
		
		//console.log("row=" + row + " col=" + col + "");
		
		if(caret == undefined) caret = file.caret;
		
		var row = caret.row,
		gridRow = file.grid[row],
		rowStartIndex = gridRow.startIndex,
		rowEndIndex = rowStartIndex + gridRow.length + gridRow.indentationCharacters,
		text = file.text,
		char,
		endOfArguments,
		startOfArguments,
		endOfFunctionName,
		startOfFunctionName,
		charIndex = file.caret.index,
		functionArguments = "",
		functionName = "",
		argumentIndex,
		index = caret.index;
		
		// Go left to find function name
		// If we have found a character that is not a letter, we've found the function name
		for(var i=index; i>rowStartIndex; i--) {
			char = text.charAt(i);
			
			console.log("char=" + char);
			
			if(char=="(") {
				startOfArguments = i;
				endOfFunctionName = i;
			}
			else if(char==")") {
				// This is after a function call. Ex: foo(bar).baz
				return false;
			}
			else if(isWhiteSpace(char) && endOfFunctionName) { // End of function name
				
				startOfFunctionName = i+1;
				break;
			}
		}
		if(!startOfFunctionName) {
			startOfFunctionName = rowStartIndex;
		}
		
		console.log("startOfFunctionName=" + startOfFunctionName);
		console.log("endOfFunctionName=" + endOfFunctionName);
		console.log("startOfArguments=" + startOfArguments);
		
		if(startOfFunctionName != undefined && endOfFunctionName != undefined) {
			// We have a function name!
			
			functionName = text.substring(startOfFunctionName, endOfFunctionName);
			
			console.log("functionName=" + functionName);
			
			/* Go right to find end of arguments
				for(var i=index; i<rowEndIndex; i++) {
				char = text.charAt(i);
				
				if(char == ")") {
				endOfArguments = i;
				break;
				}
				}
				
				if(endOfArguments == undefined) {
				endOfArguments = index;
				}
			*/
			
			functionArguments = text.substring(startOfArguments, index);
			
			console.log("functionArguments=" + functionArguments);
			
			argumentIndex = countLetter(",", functionArguments);
			
			console.log("argumentIndex=" + argumentIndex);
			
			
			// Find the function in the function list
			var property = functionName.split(".");
			
			console.log("js.functions=" + JSON.stringify(js.functions));
			console.log("js.globalVariables=" + JSON.stringify(js.globalVariables));
			
			var scope = getScope(charIndex, js.functions, js.globalVariables);
			
			console.log("scope=" + JSON.stringify(scope, null, 2));
			
			var theFunction = scope.functions[property[0]]; // scope.functions is a object literal!
			
			console.log("theFunction=" + JSON.stringify(theFunction, null, 2));
			
			if(!theFunction) {
				// Check for "this".
				if( scope.variables.hasOwnProperty(property[0]) ) {
					if(scope.variables[property[0]].type == "this") {
						property[0] = "this";
					}
				}
				if(property[0] == "this") {
					/* Check what function "this" refers to
						And method
					*/
					var thisProps = scope.thisIs.name.split(".");
					
					var functionNameLastPart = property[property.length-1];
					functionName = "";
					for(var i=0; i<thisProps.length-1; i++) {
						functionName = functionName + thisProps[i] + ".";
					}
					functionName = functionName + functionNameLastPart;
					
					if(scope.functions.hasOwnProperty(functionName)) {
						theFunction = scope.functions[functionName];
					}
					else {
						console.warn("There is no function called " + functionName + " in current scope!");
					}
					
				}
			}
			
			
			if(!theFunction) {
				/* Try the unknown variables to see if we can find the function
					Ex: foo = new Bar() // Function is "Bar"
					
				*/ 
				for(var vName in js.globalVariables) {
					var variable = js.globalVariables[vName];
					if(variable.type == "unknown") {
						var possibleFunctionName = variable.value;
						
						theFunction = getFunctionWithName(js.functions, possibleFunctionName)
						
					}
				}
				
			}
			
			if(!theFunction) {
				/* Try variable names and use their type to display built in prototype method info
					Ex: myString.substring( ... )
				*/
				
				if(scope.variables.hasOwnProperty(property[0])) {
					// We found the variable
					var variable = scope.variables[property[0]];
					
					// Traverse the variable-property tree
					for(var i=1; i<property.length; i++) {
						if(variable.keys.hasOwnProperty(property[i])) {
							variable = variable.keys[property[i]];
						}
					}
					
					var functionNameLastPart = property[property.length-1];
					
					// Check for function arguments in built in function prototype methods
					for (var i=0; i<builtInFunctions.length; i++) {
						console.log("Checking " + builtInFunctions[i].name);
						if(builtInFunctions[i].name == variable.type + ".prototype." + functionNameLastPart) {
							console.log("Found function " + builtInFunctions[i].name);
							theFunction = builtInFunctions[i];
							break;
						}
					}
					
					// All objects has access to Object.prototype!
					for (var i=0; i<objectPrototype.length; i++) {
						if( objectPrototype[i].name == "Object.prototype." + functionNameLastPart ) {
							theFunction = objectPrototype[i];
							break;
						}
					}
					
				}
			}
			else {
				/* Traverse dot tree, foo.bar.baz() of theFunction...
					
				*/
				for(var i=1; i<property.length; i++) {
					
					theFunction = getFunctionWithName(theFunction.subFunctions, property[i]);
					
					if(theFunction) break;
					
					// Include the prototype!?
				}
			}
			
			if(!theFunction) {
				// Check built in functions
				console.log("insideFunctionCall: Checking built in functions ...");
				
				for(var i=0; i<builtInFunctions.length; i++) {
					if( builtInFunctions[i].name == functionName ) {
						theFunction = builtInFunctions[i];
						break;
					}
				}
			}
			
			if(theFunction) {
				
				var args = theFunction.arguments.split(",");
				
				console.log("arguments=" + args.length + " index=" + argumentIndex + "");
				
				if(args.length > argumentIndex) {
					return {
						name: functionName, 
						argumentIndex: argumentIndex, 
						argument: args[argumentIndex].trim(),
						allArguments: theFunction.arguments.replace(args[argumentIndex], "<b>" + args[argumentIndex] + "</b>")
					};
				}
				else {
					return {
						name: functionName, 
						argumentIndex: argumentIndex, 
						argument: null,
						allArguments: theFunction.arguments.replace(args[argumentIndex], "<b>" + args[argumentIndex] + "</b>")
					};
				}
			}
			
		}
		
		return false;
		
	}
	
	function countLetter(letter, text) {
		var count = 0;
		for(var i=0; i<text.length; i++) {
			if(text.charAt(i) == letter) {
				count++;
			}
		}
		return count;
	}
	
	function getGlobalFunctions(functions) {
		// Returns a list of all global functions
		//console.log("getGlobalFunctions: functions=" + JSON.stringify(functions, null, 2));
		var arr = [];
		findGlobal(functions); 
		return arr;
		
		function findGlobal(f) {
			//console.log("getGlobalFunctions: findGlobal: f=" + JSON.stringify(f, null, 2));
			if(f == undefined) throw new Error("f=" + f);
			// recursevily searches all functions and their subFunction's
			for (var i=0; i<f.length; i++) {
				if(f[i].global) arr.push(f[i]);
				//console.log("recursively searching f[" + i + "].name=" + f[i].name + " f[" + i + "].subFunctions=" + f[i].subFunctions);
				findGlobal(f[i].subFunctions);
			}
		}
	}
	
	function getScope(charIndex, functions, globalVariables) {
		// Returns all variables and functions available in the current scope (where the character's at)
		// As a flattened object literal
		
		
		var foundVariables = {};
		var thisIs;
		
		// Add global variables to the scope
		if(globalVariables) {
			for(var variableName in globalVariables) {
				foundVariables[variableName] = globalVariables[variableName];
			}
		}
		
		var foundFunctions = functionsScope(functions, charIndex);
		
		console.log("foundFunctions=" + JSON.stringify(foundFunctions, null, 2));
		
		if(foundFunctions.length > 0) {
			// Insade a function scope
			
			// Add global functions first, then overwrite them with the scoped functions
			foundFunctions = getGlobalFunctions(functions).concat(foundFunctions);
			foundFunctions = overWriteDublicates(foundFunctions); // Recursively overwrites (removes) functions with the same name
			
			// "this" is always the latest function
			// Or is it the first !?!?
			if(foundFunctions.length > 0) {
				thisIs = foundFunctions[foundFunctions.length-1];
			}
		}
		else {
			// Not inside any function
			foundFunctions = getGlobalFunctions(functions);
		}
		
		// Make foundFunctions into an object literal for convencience, now when the order doesn't matter
		var foundFunctionsObj = {};
		for(var i=0, func; i<foundFunctions.length; i++) {
			func = foundFunctions[i];
			foundFunctionsObj[func.name] = func;
		}
		
		console.log("foundFunctionsObj=" + JSON.stringify(foundFunctionsObj, null, 2));
		
		return {functions: foundFunctionsObj, variables: foundVariables, thisIs: thisIs};
		
		
		function overWriteDublicates(foundFunctions) {
			// Overwrite (remove) global functions with local functions if they have the same name
			var functionIndex = {};
			for(var i=0, fName; i<foundFunctions.length; i++) {
				fName = foundFunctions[i].name;
				if(functionIndex.hasOwnProperty(fName)) {
					foundFunctions.splice(functionIndex[fName], 1);
					
					// Run again becase the array changed size
					return overWriteDublicates(foundFunctions);
				}
				else {
					functionIndex[fName] = i;
				}
			}
			
			// All dublicates have been removed!
			return foundFunctions;
		}
		
		function functionsScope(functions, charIndex) {
			// Returns an array of all functions available (to be called) in the lexical scope (where caret's at)
			
			var foundFunctions = [];
			
			searchScope(functions, true); // Recursive finds all functions and push to foundFunctions
			
			return foundFunctions;
			/*
				foundFunctions.sort(function(a, b) {
				// Sort by position in the code (line number) ascending
				return a.start - b.start;
				});
			*/
			
			function searchScope(functions) {
				for(var i=0, func, cursorInside; i<functions.length; i++) {
					
					func = functions[i];
					
					console.log("Look: name=" + func.name + " start=" + func.start + " end=" + func.end + " subFunctions.length=" + func.subFunctions.length + "");
					
					cursorInside = (func.start <= charIndex && func.end >= charIndex);
					
					// All functions from the same scope are available
					if(func.name.length > 0) foundFunctions.push(func);
					
					
					if( cursorInside) {
						
						console.log("Function Scope name=" + func.name + " start=" + func.start + " end=" + func.end + " subFunctions.length=" + func.subFunctions.length + "");
						
						
						// Local subfunctions can be called from here!
						for(var j=0; j<func.subFunctions.length; j++) {
							console.log("local: " + func.subFunctions[j].name);
							if(func.subFunctions[j].name.length > 0) foundFunctions.push(func.subFunctions[j]);
						}
						
						// Add variables from the function we are in
						for(var variableName in func.variables) {
							foundVariables[variableName] = func.variables[variableName];
							// Deeper nests over-rides globals as intended!
						}
						
						// Search sub-functions (recursive)
						searchScope(func.subFunctions);
						
					}
					
				}
			}
		}
	}
	
	function getFunctionWithName(functions, name) {
		for(var i=0; i<functions.length; i++) {
			if(functions[i].name == name) return functions[i];
		}
		return null;
	}
	
	
	function variableColors(buffer, file, bufferStartRow) {
		"use strict";
		
		if(!file.parse) return buffer;
		
		var words = [];
		var word = "";
		var char = "";
		var gridRow;
		var wordIndex = 0;
		var wordCol = 0;
		var wordBufferRow = 0;
		var wordLine = 0; // Easier debugging
		var wordDot = false;
		for (var row=0; row<buffer.length; row++) {
			gridRow = buffer[row];
			word = "";
			for (var col=0; col<gridRow.length; col++) {
				
				if(insideComment(gridRow[col].index, file)) continue;
				if(insideQuote(gridRow[col].index, file)) continue;
				
				char = gridRow[col].char;
				//console.log("char=" + char + " word=" + word);
				
				if( char.match(/\W/) ) {
					// It's a "non word" character
					if(word) {
						//console.log("Got word=" + word + " on line=" + wordLine + " col=" + wordCol);
						words.push({index: wordIndex, word: word, row: wordBufferRow, col: wordCol, dot: wordDot, line: wordLine});
						word = "";
						
						if(char == ".") wordDot = true;
						else wordDot = false;
					}
				}
				else {
					if(word == "") {
						wordIndex = gridRow[col].index;
						wordCol = col;
						wordBufferRow = row;
						wordLine = bufferStartRow + row + 1;
					}
					
					word += char;
				}
			}
			
			if(word) {
				//console.log("Got word=" + word + " on line=" + wordLine + " col=" + wordCol);
				words.push({index: wordIndex, word: word, row: wordBufferRow, col: wordCol, dot: wordDot, line: wordLine});
			}
		}
		
		//console.log("variableColors: words=" + JSON.stringify(words, null, 2));
		
		var globalVariables = file.parsed.globalVariables;
		var globalFunctionNames = file.parsed.functions && file.parsed.functions.map(function(f) { return f.name }) || [];
		var functionScope;
		var result;
		
		//console.log( "globalFunctionNames=" + JSON.stringify(globalFunctionNames) );
		
		for (var i=0; i<words.length; i++) {
			
			if(!isNaN(words[i].word)) continue; // It's a number
			//if(jsKeywords.indexOf( words[i].word ) continue; // It's a JS keyword
			
			if(file.parsed.functions) {
				// Check current function scope
				functionScope = getFunctionScope(words[i].index, file);
				
				if(functionScope.length == 0) {
					//console.log("variableColors: No function scope for " + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index);
				}
				else {
					//console.log( "variableColors: Checking function scope for word=" + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + ": " + JSON.stringify(functionScope, null, 2) )
					
					for (var j=0; j<functionScope.length; j++) {
						result = colorKeys( functionScope[j], words, i, (j == 0 ? localVariableColor: scopedVariableColor) );
						if(result.index != i) {
							//console.warn("i=" + i + " result.index=" + result.index + " words.length=" + words.length + " Jumped " + (result.index-i) + " words forward");
							i = result.index;
						}
						if(result.found) continue; // Don't check global or parent scope variables if we found a local or in scope variable!
					}
				}
			}
			
			if(globalVariables) {
				// Check global variables
				//console.log( "variableColors: Checking global scope for word=" + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + ": " + JSON.stringify(globalVariables, null, 2) )
				result = colorKeys( globalVariables, words, i, globalVariableColor );
				if(result.index != i) {
					//console.warn("i=" + i + " result.index=" + result.index + " words.length=" + words.length + " Jumped " + (result.index-i) + " words forward");
					i = result.index;
				}
				if(result.found) continue;
			}
			
			if(globalFunctionNames) {
				// Check global functions
				//console.log( "variableColors: Checking if word=" + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + " is in globalFunctionNames=" + JSON.stringify(globalFunctionNames) )
				if( globalFunctionNames.indexOf(words[i].word) != -1 ) {
					applyColor(words[i].row, words[i].col, words[i].word.length, globalVariableColor);
				}
			}
			
		}
		
		return buffer;
		
		function colorKeys(variables, words, i, color, recursive) {
			
			if(!variables) throw new Error("variables=" + variables);
			
			//console.log("variableColors: colorKeys: variables=" + Object.keys(variables) + " word=" + words[i].word);
			
			for(var variableName in variables) {
				if( variableName == words[i].word ) {
					//console.log("variableColors: colorKeys: Found variable: " + variableName + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + "");
					applyColor(words[i].row, words[i].col, words[i].word.length, color);
					
					if(i == words.length-1 || !words[i+1].dot) return {index: i, found: true};
					else return colorKeys(variables[variableName].keys, words, i+1, color, true);
					
				}
			}
			
			//console.log("variableColors: colorKeys: No variable found for word=" + words[i].word);
			
			if(recursive) return {index: i-1, found: true}; // Because no keys where found
			else return {index: i, found: false};
		}
		
		function applyColor(bufferRow, col, wordLength, color) {
			
			var gridRow = buffer[bufferRow];
			
			var column;
			for (var i=0; i<wordLength; i++) {
				column = gridRow[col+i];
				if(!column) {
					//console.warn("bufferRow=" + bufferRow + " buffer.length=" + buffer.length + " gridRow.length=" + gridRow.length + " col=" + col + " i=" + i + " wordLength=" + wordLength);
					break;
				}
				column.color = color;
			}
		}
	}
	
	function insideComment(index, file) {
		if(!file.parsed) return null;
		var comments = file.parsed.comments;
		if(!comments) return null;
		for (var i=0; i<comments.length; i++) {
			if( comments[i].start < index && comments[i].end > index ) return true;
		}
		
		return false;
	}
	
	function insideQuote(index, file) {
		if(!file.parsed) return null;
		var quotes = file.parsed.quotes;
		if(!quotes) return null;
		for (var i=0; i<quotes.length; i++) {
			if( quotes[i].start < index && quotes[i].end > index ) return true;
		}
		
		return false;
	}
	
	function getFunctionScope(index, file) {
		// Returns a list of variables in scope (also including functions)
		var js = file.parsed;
		
		var functionScope = [];
		var functionScopeLevel = [];
		var globalFunctions = getGlobalFunctions(js.functions);
		var globalFunctionsAsVariables = {};
		
		
		for (var i=0; i<globalFunctions.length; i++) {
			globalFunctionsAsVariables[globalFunctions[i].name] = {
				type: "function",
				keys: {}
			};
		}
		functionScope.push(globalFunctionsAsVariables);
		
		if(js.functions) checkFunctions(js.functions, 0);
		else {
			//console.log("variableColors (getFunctionScope): No functions on index=" + index + " in file.path=" + file.path);
		}
		return functionScope;
		
		function checkFunctions(functions) {
			
			//console.log("variableColors: getFunctionScope: checkFunctions: " + JSON.stringify(functions, null, 2));
			
			if(!functions) throw new Error(JSON.stringify(js));
			
			var variables = {};
			
			for (var i=0; i<functions.length; i++) {
				
				if(functions[i].start <= index && functions[i].end > index) {
					// We are inside this function
					
					// Add function name 
					if( functions[i].name ) {
						variables[functions[i].name] = {
							type: "function",
							keys: {}
						};
					}
					
					// Add function parameters
					functions[i].arguments.split(",").map(function(str){return str.trim();}).forEach(function(variable) {
						variables[variable] = {
							type: "function parameter",
							keys: {}
						}
					});
					
					// Add local variables
					for (var variableName in functions[i].variables) {
						variables[variableName] = functions[i].variables[variableName]
					}
					
					// Add sub-functions as variables
					functions[i].subFunctions.forEach(function(subFunction) {
						if(subFunction.name && !subFunction.lambda) {
							variables[subFunction.name] = {
								type: "function",
								keys: {}
							};
						}
					});
					
					checkFunctions(functions[i].subFunctions);
					// index cannot be in any other functions on the same level, only subfunctions!
					break;
				}
			}
			
			if(Object.keys(variables).length != 0) functionScope.push(variables);
		}
	}
	
})();
