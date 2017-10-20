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
	
	
	// todo: Check if we are browser or nodejs or other JS platform
	var globalContextVariables = {

		document: {
			keys: {
				getElementById: {type: "Method", arguments: "id"},
				createElement: {type: "Method", arguments: "tagName"}
			}
		}

	}
	
	
	EDITOR.plugin({
		desc: "Autocomplete for JavaScript",
		load: function load() {
			EDITOR.on("autoComplete", autoCompleteJS);
		},
		unload: function unload() {
			EDITOR.removeEvent("autoComplete", autoCompleteJS);
		},
	});
	
	
	
	function autoCompleteJS(file, wordToComplete, wordLength, gotOptions) {
		
		var options = [];
		var js = file.parsed;
		var charIndex = file.caret.index;
		
		if(!js) {
			console.log("File has not been parsed. No JavaScript auto-complete available");
			return;
			}
		
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

			
		}
		
		
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
				
				var fullName = "";
				
				var lastIndexOfDot = wordToComplete.indexOf(".");
				
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
						if(func.subFunctions[i].name == functionName) analyze(func.subFunctions[i]);
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
		if(foundFunctions.length > 0) {
			thisIs = foundFunctions[foundFunctions.length-1];
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
	
})();
