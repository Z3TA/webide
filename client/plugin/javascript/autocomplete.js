(function() {
	/*
		
		Todo: search prototype and include built-in prototypes
		
		todo: Use JSdoc info to show variable types for function arguments
		
	*/
	
	"use strict";
	
	// Built in JavaScript prototypes for auto completion
	
	var stringPrototype = {
		length: {type: "Number"}, 
		substring: {type: "Method", arguments: "start, end"}
	};
	
	var arrayPrototype = {
		length: {type: "Number"}, 
		// Methods
		concat: {type: "Method", arguments: "arraysOrValues..."},
		filter: {type: "Method", arguments: "callback, thisArg"},
		forEach: {type: "Method", arguments: "callback, thisArg"},
		indexOf: {type: "Method", arguments: "searchElement, fromIndex"},
		join: {type: "Method", arguments: "separator"},
		map: {type: "Method", arguments: "callback"},
		pop: {type: "Method", arguments: ""},
		push: {type: "Method", arguments: "elements..."},
		reduce: {type: "Method", arguments: "callback, initialValue"},
		shift: {type: "Method", arguments: ""},
		slice: {type: "Method", arguments: "begin, end"},
		some: {type: "Method", arguments: "callback, thisArg"},
		sort: {type: "Method", arguments: "compareFunction"},
		splice: {type: "Method", arguments: "start, deleteCount, addItems..."},
		unshift: {type: "Method", arguments: "elements..."}
	};
	
	
	// todo: Check if we are browser or nodejs or other JS platform
	var globalContextVariables = {
		
		document: {
			keys: {
				getElementById: {type: "Method", arguments: "id"},
				createElement: {type: "Method", arguments: "tagName"}
			}
		}
		
	}
	
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
			EDITOR.on("autoComplete", autoCompleteJS);
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
			
			if(js.functions) findFunctions(js.functions);
			
			searchVariables(globalContextVariables, wordToComplete);
			
			if(js.globalVariables) searchVariables(js.globalVariables, wordToComplete); // Check global variables
			
			// Global variables from other files
			console.log(file.path + " related scripts =" + (relatedScripts[file.path] && relatedScripts[file.path].length));
			console.log(relatedScripts[file.path]);
			
			if(relatedScripts[file.path]) {
				for (var i=0, script, globalVariables; i<relatedScripts[file.path].length; i++) {
					script = relatedScripts[file.path][i]
					if( !parsedFiles.hasOwnProperty(script) ) {
						console.warn(script + " has not been parsed!");
						continue;
					}
					globalVariables = parsedFiles[script].globalVariables;
					if(!globalVariables) {
						console.warn(script + " does not have a globalVariables member!");
						continue;
					}
					console.log("Search global variables (" + Object.keys(globalVariables).length + ") in related script: " + script + " ...");
					searchVariables(globalVariables, wordToComplete); // Check global variables
				}
			}
			
		}
		
		console.log("autoCompleteJS: options=" + JSON.stringify(options, null, 2)); 
		
		return options; // disable default action
		
		
		function checkFunctionName(functionName, word) {
			console.log("Checking if word=" + word + " mathes function name=" + functionName + "");
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
		
		
		function findFunctions(functions) {
			// Find out if we are inside functions, then check those functions for variables and name of sub-functions.
			
			if(!functions) console.warn(typeof functions + " passed to findFunctions");
			
			console.log("functionCount=" + Object.keys(functions).length + " charIndex=" + charIndex);
			
			var func;
			
			for(var i=0; i<functions.length; i++) {
				
				func = functions[i];
				
				console.log("checking function=" + func.name + " start=" + func.start + " end=" + func.end + "  ...");
				
				if(func.start <= charIndex && func.end >= charIndex) {
					// Cursor is inside this function!
					
					console.log("Inside " + func.name);
					
					// Give arguments
					if(func.arguments.length > 0) {
						var functionArguments = func.arguments.split(",");
						for(var a=0; a<functionArguments.length; a++) {
							functionArguments[a] = functionArguments[a].trim(); // Get rid of spaces
							// todo: Handle default function argument values
							// maybe: Search for calls of this function to figure out what Type of variable it is
							if(functionArguments[a].indexOf(wordToComplete) == 0) options.push(functionArguments[a]);
						}
					}
					
					
					searchVariables(func.variables, wordToComplete, func.name); // check variables in this functions
					
					// check names of sub-functions
					for(var j=0; j<func.subFunctions.length; j++) {
						if(func.subFunctions[j].name.length > 0) checkFunctionName(func.subFunctions[j].name, wordToComplete);
					}
					
					// Search sub-functions (recursive)
					findFunctions(func.subFunctions);
					
				}
				else {
					console.log("Not inside function=" + func.name);
				}
				
				checkFunctionName(func.name, wordToComplete); // Check parent scope function-names
				
			}
		}
		
		function searchVariables(variables, word, functionName) {
			
			var wordLength = word.length;
			
			console.log("Searching " + JSON.stringify(variables) + " for: " + word + "");
			
			var properties = word.split("."); // If it's JSON
			
			if(properties.length > 1) {
				// Traverse the property chain ...
				if(variables.hasOwnProperty(properties[0])) {
					
					console.log("found variable=" + properties[0] + "");
					
					var variable = variables[properties[0]];
					
					// Traverse the chain ... foo.bar.bas.xx
					for(var propertyIndex=1; propertyIndex<properties.length; propertyIndex++) {
						if(variable.keys.hasOwnProperty(properties[propertyIndex])) {
							console.log("Setting new variable:" + properties[propertyIndex]);
							variable = variable.keys[properties[propertyIndex]];
						}
						else {
							break;
						}
					}
					
					console.log("propertyIndex=" + propertyIndex);
					
					var keyName = properties[propertyIndex]; // This is the word we are gonna auto-complete
					
					console.log("keyName=" + keyName + "");
					
					if(variable.hasOwnProperty("keys")) {
						// Search for keys
						for(var key in variable.keys) {
							console.log(key.substr(0, keyName.length) + " == " + keyName + " ? (key=" + key + ")");
							if(key.substr(0, keyName.length) == keyName) {
								if(!optionExist(options, key)) {
									pushVariable(keyName, variable.keys[key], key);
								}
								//options.push([keyName, key, 0]);
							}
						}
					}
					
					console.log("variable.type=" + variable.type);
					
					// Try built in prototype methods and properties
					if(variable.type == "String") {
						searchVariables(stringPrototype, keyName);
					}
					else if(variable.type == "Array") {
						searchVariables(arrayPrototype, keyName);
					}
					else if(variable.type == "unknown") { // Variable
						
						// Check for functions with that name, then check if the function has a property that match the word
						
						if(properties.length > propertyIndex) {
							for(var i=propertyIndex+1; i<properties.length; i++) {
								keyName += "." + properties[i];
							}
						}
						
						searchFunctionThis(variable.value, keyName);
						
					}
					else if(variable.type == "this") {
						var p = functionName.split(".");
						
						searchFunctionThis(p[0], keyName);
					}
				}
				
			}
			else {
				// Check each variable in the list
				for(var variableName in variables) {
					
					console.log()
					if(variableName.substr(0, wordLength) == word) {
						
						var variable = variables[variableName];
						
						if(!optionExist(options, variableName)) {
							
							pushVariable(word, variable, variableName);
							
						}
						
						
					}
				}
			}
			
			if(variables.hasOwnProperty("prototype")) searchVariables(variables["prototype"].keys, word);
			
			
			function pushVariable(word, variable, variableName) {
				
				console.log("pushVariable: word=" + word + " variableName=" + variableName + " wordToComplete=" + wordToComplete + " variable=" + JSON.stringify(variable, null, 2) );
				
				var fullName = "";
				
				var lastIndexOfDot = wordToComplete.lastIndexOf(".");
				
				if(lastIndexOfDot != -1) {
					fullName = wordToComplete.substring(0, lastIndexOfDot) + "." + variableName;
				}
				else fullName = variableName;
				
				if(variable.type=="Array") {
					options.push([fullName + "[]", 1]);
					
				}
				else if(variable.type == "Method") {
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
		
		function searchFunctionThis(functionName, keyName) {
			
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
					searchVariables(objectCreatorFunction.variables["this"].keys, keyName);
				}
				
				// Check if any of the variables is of type "this"
				for(var variableName in objectCreatorFunction.variables) {
					if(objectCreatorFunction.variables[variableName].type == "this") {
						// Check its keys
						searchVariables(objectCreatorFunction.variables[variableName].keys, keyName);
					}
				}
				
				if(objectCreatorFunction.variables.hasOwnProperty("prototype")) {
					// Search the prototype
					searchVariables(objectCreatorFunction.variables["prototype"].keys, keyName);
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
					
					if(variable.type == "String") {
						theFunction = stringPrototype[functionNameLastPart];
					}
					else if(variable.type == "Array") {
						theFunction = arrayPrototype[functionNameLastPart];
					}
					
				}
			}
			else {
				/* Traverse dot tree, foo.bar.baz() of theFunction...
					
				*/
				for(var i=1; i<property.length; i++) {
					
					theFunction = getFunctionWithName(js.functions.subFunctions, property[i]);
					
					if(theFunction) break;
					
					// Include the prototype!?
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
		
		if(foundFunctions.length == 0) {
			// We are in the global scope!
			// Add the global functions
			for(var i=0; i<functions.length; i++) {
				if(functions[i].name.length > 0) foundFunctions.push(functions[i]);
			}
		}
		else {
			// Insade a function scope
			foundFunctions = overWriteDublicates(foundFunctions); // Recursively overwrites (removes) functions with the same name
			
			// Add local varibales for each function
			for(var i=0; i<foundFunctions.length; i++) {
				var func = foundFunctions[i];
				for(var variableName in func.variables) {
					foundVariables[variableName] = func.variables[variableName];
					// Deeper nests over-rides globals as intended!
				}
			}
			
			// "this" is always the latest function
			// Or is it the first !?!?
			if(foundFunctions.length > 0) {
				thisIs = foundFunctions[foundFunctions.length-1];
			}
		}
		
		// Make foundFunctions into an object literal, now when the order doesn't matter
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
					
					if( cursorInside) {
						
						// Add itself to functions (yes functions can call themselves)
						if(func.name.length > 0) foundFunctions.push(func); // Don't add anonymous functions
						
						console.log("Function Scope name=" + func.name + " start=" + func.start + " end=" + func.end + " subFunctions.length=" + func.subFunctions.length + "");
						
						
						// Local subfunctions can be called from here!
						for(var j=0; j<func.subFunctions.length; j++) {
							console.log("local: " + func.subFunctions[j].name);
							if(func.subFunctions[j].name.length > 0) foundFunctions.push(func.subFunctions[j]);
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
				console.log("char=" + char + " word=" + word);
				
				if( char.match(/\W/) ) {
					// It's a "non word" character
					if(word) {
						console.log("Got word=" + word + " on line=" + wordLine + " col=" + wordCol);
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
				console.log("Got word=" + word + " on line=" + wordLine + " col=" + wordCol);
				words.push({index: wordIndex, word: word, row: wordBufferRow, col: wordCol, dot: wordDot, line: wordLine});
			}
		}
		
		console.log("variableColors: words=" + JSON.stringify(words, null, 2));
		
		var globalVariables = file.parsed.globalVariables;
		var globalFunctionNames = file.parsed.functions && file.parsed.functions.map(function(f) { return f.name }) || [];
		var functionScope;
		var result;
		
		console.log( "globalFunctionNames=" + JSON.stringify(globalFunctionNames) );
		
		for (var i=0; i<words.length; i++) {
			
			if(!isNaN(words[i].word)) continue; // It's a number
			//if(jsKeywords.indexOf( words[i].word ) continue; // It's a JS keyword
			
			if(file.parsed.functions) {
			// Check current function scope
			functionScope = getFunctionScope(words[i].index, file);
			
				if(functionScope.length == 0) console.log("variableColors: No function scope for " + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index);
			else {
					console.log( "variableColors: Checking function scope for word=" + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + ": " + JSON.stringify(functionScope, null, 2) )
					
					for (var j=0; j<functionScope.length; j++) {
						result = colorKeys( functionScope[j], words, i, (j == 0 ? localVariableColor: scopedVariableColor) );
						if(result.index != i) {
							console.warn("i=" + i + " result.index=" + result.index + " words.length=" + words.length + " Jumped " + (result.index-i) + " words forward");
							i = result.index;
						}
						if(result.found) continue; // Don't check global or parent scope variables if we found a local or in scope variable!
					}
				}
			}
			
			if(globalVariables) {
				// Check global variables
				console.log( "variableColors: Checking global scope for word=" + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + ": " + JSON.stringify(globalVariables, null, 2) )
				result = colorKeys( globalVariables, words, i, globalVariableColor );
				if(result.index != i) {
					console.warn("i=" + i + " result.index=" + result.index + " words.length=" + words.length + " Jumped " + (result.index-i) + " words forward");
					i = result.index;
				}
				if(result.found) continue;
			}
			
			if(globalFunctionNames) {
				// Check global functions
				console.log( "variableColors: Checking if word=" + words[i].word + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + " is in globalFunctionNames=" + JSON.stringify(globalFunctionNames) )
				if( globalFunctionNames.indexOf(words[i].word) != -1 ) {
					applyColor(words[i].row, words[i].col, words[i].word.length, globalVariableColor);
				}
			}
			
		}
		
		return buffer;
		
		function colorKeys(variables, words, i, color, recursive) {
			
			if(!variables) throw new Error("variables=" + variables);
			
			console.log("variableColors: colorKeys: variables=" + Object.keys(variables) + " word=" + words[i].word);
			
			for(var variableName in variables) {
				if( variableName == words[i].word ) {
					console.log("variableColors: colorKeys: Found variable: " + variableName + " on line=" + words[i].line + " col=" + words[i].col + " index=" + words[i].index + "");
					applyColor(words[i].row, words[i].col, words[i].word.length, color);
					
					if(i == words.length-1 || !words[i+1].dot) return {index: i, found: true};
					else return colorKeys(variables[variableName].keys, words, i+1, color, true);
					
				}
			}
			
			console.log("variableColors: colorKeys: No variable found for word=" + words[i].word);
			
			if(recursive) return {index: i-1, found: true}; // Because no keys where found
			else return {index: i, found: false};
		}
		
		function applyColor(bufferRow, col, wordLength, color) {
			
			var gridRow = buffer[bufferRow];
			
			var column;
			for (var i=0; i<wordLength; i++) {
				column = gridRow[col+i];
				if(!column) {
					console.warn("bufferRow=" + bufferRow + " buffer.length=" + buffer.length + " gridRow.length=" + gridRow.length + " col=" + col + " i=" + i + " wordLength=" + wordLength);
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
		var js = file.parsed;
		
		var functionScope = [];
		var functionScopeLevel = [];
		
		if(js.functions) checkFunctions(js.functions, 0);
		else console.log("variableColors (getFunctionScope): No functions on index=" + index + " in file.path=" + file.path);
		
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
						if(subFunction.name) {
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
