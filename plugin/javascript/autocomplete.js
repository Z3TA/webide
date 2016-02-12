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
	
	
	editor.on("start", autocomplete_main);
	
	function autocomplete_main() {
		global.keyBindings.push({charCode: 9, fun: autoComplete, combo: 0}); // Tab key
		
		
	}
	
	
	function autoComplete(file, combo, character, charCode, keyPushDirection) {
		// Pressed tab
		
		var word = "";
		var char = "";
		var options = [];
		var wordLength = 0;
		var js = file.parsed;
		var charIndex = file.caret.index;
		var lbLength = file.lineBreak.length;
		var wordDelimiters = " ()[]{}+-/<>\r\n";
		
		if(!js) {
			console.log("File has not been parsed. No auto-complete available");
			return;
			}
		
		// Go left to get the word
		for(var i=file.caret.index-1; i>0; i--) {
			char = file.text.charAt(i);
			
			console.log("char=" + char);
			
			if(wordDelimiters.indexOf(char) > -1) break; // Exit loop
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = char + word;
		}
		// Also go right just in case we are inside a word
		
		for(var i=file.caret.index; i<file.text.length; i++) {
			char = file.text.charAt(i);
			
			console.log("char=" + char);
			
			if(wordDelimiters.indexOf(char) > -1) break; // Exit loop
			
			//if(isWhiteSpace(char) || char == ",") break;
			
			word = word + char;
		}
		
		word = word.trim();
		console.log("Autocomplete: *" + word + "* (" + word.length + " chars)");
		
		wordLength = word.length;
		
		/*
			When pushing to options,
			Push an array with 0: word, 1:text, 2: characters to move
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
				editor.addInfo(file.caret.row, file.caret.col, "Nothing found");
			}
			else if(fc.argument.substring(0, word.length) == word && word.length > 0) {
				options.push([word, fc.argument, 0]);
			}
			else {
				editor.addInfo(file.caret.row, file.caret.col, fc.allArguments);
			}
		}
		else {
			// Only if not inside function call
			
			if(wordLength > 0) {
				if("for".substr(0, wordLength) == word) {
					options.push([word, "for (var i=0, i<.length; i++) {" + file.lineBreak + file.lineBreak + "}", 15 + lbLength*2]);
				}
				else if("switch".substr(0, wordLength) == word) {
					options.push([word, "switch() {" + file.lineBreak + "case :    ; break" + file.lineBreak + "}", 19 + lbLength*2]);
				}
				else if("if".substr(0, wordLength) == word) {
					options.push([word, "if () {" + file.lineBreak + file.lineBreak + "}", 2 + lbLength*2]);
				}
			}

		}
		
		if(wordLength > 0) {
			
			//console.warn(JSON.stringify(js.functions, null, 2));
			
			if(js.functions) findFunctions(js.functions);
			
		
			
			if(js.globalVariables) searchVariables(js.globalVariables, word); // Check global variables

			
			// Auto type keyword blocks ...
			
			if("function".substr(0, wordLength) == word) {
				options.push([word, "function () {" + file.lineBreak + file.lineBreak + "}", 3 + lbLength*2]);
			}
			
		}
		
		if(options.length == 0) {
			// Found nothing to complete. Maybe we want to close last opened xml tag!?
			var lastOpenXmlTag = findLastOpenXmlTag(file.text, charIndex);
			
			if(lastOpenXmlTag) {
				options.push(["", "</" + lastOpenXmlTag + ">", 0]);
			}
			
			
		}

		if(options.length > 1) {
			console.log("options:" + JSON.stringify(options, null, 2));
			
			// Type up until the common character  fooBar vs fooBaz, type fooBa|
			
			var shared = sharedStart(options);
			
			console.log("sharedStart=" + shared + " word=" + word);
			
			if(shared.length > 0) {
				if(word.indexOf(".") != -1) {
					let arr = word.split(".");
					
					completeWord([arr[arr.length-1], shared, 0]);
				}
				else {
					completeWord([word, shared, 0]);
				}
				
			}
			
			// Show info
			for(var i=0; i<options.length; i++) {
				editor.addInfo(file.caret.row, file.caret.col, options[i][1].replace(new RegExp(file.lineBreak,"g"), " "));
			}
			
			
		}
		else if(options.length == 1) {
			completeWord(options[0]);
		}

		return false; // disable default action
		
		
		function checkFunctionName(functionName, word) {
			console.log("Checking if word=" + word + " mathes function name=" + functionName + "");
			//if(typeof functionName != "string") return; // It can be an anonymous function
			//console.warn(functionName + "(" + typeof functionName + ")");
			if(functionName.substr(0, wordLength) == word) {
				options.push([word, functionName + "()", 1]);
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

		
		function completeWord(optionValue) {
			
			
			var word = optionValue[0];
			var wholeWord = optionValue[1];
			var moveCaret = optionValue[2];
			var insert = wholeWord.substring(word.length);
			
			console.log("Completing word=" + word + " wholeWord=" + wholeWord + " moveCaret=" + moveCaret + " insert=" + insert + "");
			
			
			/* Use insertText for non-single letters ...
			for(var i=wordLength; i<word.length; i++) {
				file.putCharacter(word.charAt(i));
			}
			*/
			
			//console.log("wordLength=" + wordLength);
			//console.log("word.length=" + word.length);
			//console.log("insert=" + insert);
			
			file.insertText(insert);
			
			//console.log("moveCaret="+ moveCaret);
			
			if(moveCaret) file.moveCaretLeft(file.caret, moveCaret);
	
			
			editor.renderNeeded();
			
		}
		
		function findFunctions(functions) {
			// Find out if we are inside functions, then check those functions for variables and name of sub-functions.
			
			if(!functions) console.warn(typeof functions + " passed to findFunctions");
			
			console.log("functionCount=" + Object.keys(functions).length + " charIndex=" + charIndex);
			
			for(var functionName in functions) {
				
				
				let func = functions[functionName];
				
				console.log("checking function=" + functionName + " start=" + func.start + " end=" + func.end + "  ...");

				if(func.start <= charIndex && func.end >= charIndex) {
					// Cursor is inside this function!
					
					console.log("Inside " + func.name);
					searchVariables(func.variables, word, func.name); // check variables in this functions
					
					// check names of sub-functions
					for(var subFunctionName in func.subFunctions) {
						if(subFunctionName) checkFunctionName(subFunctionName, word);
					}
					
					// Search sub-functions (recursive)
					findFunctions(func.subFunctions);
					
				}
				else {
					console.log("Not inside function=" + func.name);
				}
				
				checkFunctionName(func.name, word); // Check parent scope function-names
				
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
								if(!optionExist(key)) {
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
						let p = functionName.split(".");
						
						searchFunctionThis(p[0], keyName);
					}
				}

			}
			else {
				// Check each variable in the list
				for(var variableName in variables) {
					
					console.log()
					if(variableName.substr(0, wordLength) == word) {
						
						let variable = variables[variableName];
						
						if(!optionExist(variableName)) {
							
							pushVariable(word, variable, variableName);
							
						}
						
						
					}
				}
			}

			if(variables.hasOwnProperty("prototype")) searchVariables(variables["prototype"].keys, word);

			
			function pushVariable(word, variable, variableName) {
				if(variable.type=="Array") {
					options.push([word, variableName + "[]", 1]);

				}
				else if(variable.type == "Method") {
					options.push([word, variableName + "()", 1]);
				}
				else if(variable.hasOwnProperty("keys")) {
					if(Object.keys(variable.keys).length > 0) {
						// It's a json: Add a dot at the end
						options.push([word, variableName + ".", 0]);
					}
					else {
						options.push([word, variableName, 0]);
					}
				}
				else {
					options.push([word, variableName, 0]);
				}

			}
			
			function optionExist(variableName) {
				for(var i=0; i<options.length; i++) {
					if(options[i][1] == variableName) return true;
				}
				return false;
				
			}
			
		}
		
		function searchFunctionThis(functionName, keyName) {
			
			console.log("searchFunctionThis functionName=" + functionName + " keyName=" + keyName + "");
			
			/*
			
				Note that js.functions is a tree!
				
			
			*/
			
			// Looking for this.keyName in a function called functionName
			
			// Look for subfunctions in functions we are currently in
			for(var fName in js.functions) {
				
				let func = js.functions[fName];
				
				if(func.start < charIndex && func.end > charIndex) {
					// We are in this function. Check it's subfunctions
					
					for(var sfName in func.subFunctions) {
						if(sfName == functionName) analyze(func.subFunctions[sfName]);
					}
					
				}
				
				// And analyze all global functions if it has the right name
				if(fName == functionName) analyze(js.functions[fName]);
			}
			
			function analyze(objectCreator) {
				// Look for variables named "this" or variables with type "this"
				
				console.log("Analyzing " + objectCreator.name);
				
				if(objectCreator.variables.hasOwnProperty("this")) {
					// Search that one
					searchVariables(objectCreator.variables["this"].keys, keyName);
				}
				
				// Check if any of the variables is of type "this"
				for(var variableName in objectCreator.variables) {
					if(objectCreator.variables[variableName].type == "this") {
						// Check its keys
						searchVariables(objectCreator.variables[variableName].keys, keyName);
					}
				}
				
				if(objectCreator.variables.hasOwnProperty("prototype")) {
					// Search the prototype
					searchVariables(objectCreator.variables["prototype"].keys, keyName);
				}
				
			}
			
		}
		
	}

	function isWhiteSpace(char) {
		return /\s/.test(char);
	}
	
	
	function findLastOpenXmlTag(text, charIndex) {
		var textUpUntilChar = text.substr(0, charIndex);
		// PS: lastIndexOf searches backwards!
		var lastXmlTagClose = textUpUntilChar.lastIndexOf("</");
		
		if(lastXmlTagClose != -1) textUpUntilChar = textUpUntilChar.substring(lastXmlTagClose+2, lastXmlTagClose.length);
		
		var lastOpenXmlTagStart = textUpUntilChar.lastIndexOf("<");
		
		// todo: support nested tags like <div><span><b>x</b> ... close span
		
		var xmlTagName = "";
		
		if(lastOpenXmlTagStart != -1) {
			// We have an open xml tag ... What is it?
			var xmlTagBody = textUpUntilChar.substring(lastOpenXmlTagStart, charIndex);
			let firstSpace = xmlTagBody.indexOf(" ");
			let firstRightTag = xmlTagBody.indexOf(">");
			let end = 0;
			if(firstSpace > -1 && firstSpace < firstRightTag) {
				end = firstSpace;
			}
			else {
				end = firstRightTag;
			}
			xmlTagName = xmlTagBody.substring( 1, end );
			
		}
		
		return xmlTagName;
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
				
		//console.log("startOfFunctionName=" + startOfFunctionName);
		//console.log("endOfFunctionName=" + endOfFunctionName);
		//console.log("startOfArguments=" + startOfArguments);
		
		if(startOfFunctionName && endOfFunctionName) {
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
			
			//console.log("functionArguments=" + functionArguments);
			
			argumentIndex = countLetter(",", functionArguments);
			
			//console.log("argumentIndex=" + argumentIndex);
			
			
			// Find the function in the function list
			var property = functionName.split(".");
			
			var scope = getScope(charIndex, js.functions, js.globalVariables);
			
			var theFunction = scope.functions[property[0]];
			
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
					let thisProps = scope.thisIs.name.split(".");
					
					let functionNameLastPart = property[property.length-1];
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
					let variable = js.globalVariables[vName];
					if(variable.type == "unknown") {
						let possibleFunctionName = variable.value;
						if(js.functions.hasOwnProperty(possibleFunctionName)) {
							theFunction = js.functions[possibleFunctionName];
							break;
						}
					}
				}

			}
			
			if(!theFunction) {
				/* Try variable names and use their type to display built in prototype method info
				   Ex: myString.substring( ... )
				*/
				
				if(scope.variables.hasOwnProperty(property[0])) {
					// We found the variable
					let variable = scope.variables[property[0]];
					
					// Traverse the variable-property tree
					for(var i=1; i<property.length; i++) {
						if(variable.keys.hasOwnProperty(property[i])) {
							variable = variable.keys[property[i]];
						}
					}
					
					let functionNameLastPart = property[property.length-1];
					
					if(variable.type == "String") {
						theFunction = stringPrototype[functionNameLastPart];
					}
					
				}
			}
			else {
				/* Traverse dot tree, foo.bar.baz() of theFunction...

				*/
				for(var i=1; i<property.length; i++) {
					if(theFunction.subFunctions.hasOwnProperty(property[i])) {
						theFunction = js.functions.subFunctions[property[i]];
					}
					
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
		
		var foundFunctions = [];
		var foundVariables = {};
		var thisIs;
		
		// Add global variables to the scope
		if(globalVariables) {
			for(var variableName in globalVariables) {
				foundVariables[variableName] = globalVariables[variableName];
			}
		}
		
		searchScope(functions, true); // Recursive finds all functions and push to foundFunctions
		
		foundFunctions.sort(function(a, b) {
			// Sort by position in the code (line number) ascending
			return a.start - b.start;
		});
		
		foundFunctions = overWriteDublicates(foundFunctions); // Recursively overwrites (removes) functions with the same name
		
		// Add local varibales for each function
		for(var i=0; i<foundFunctions.length; i++) {
			let func = foundFunctions[i];
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
		for(var i=0; i<foundFunctions.length; i++) {
			let func = foundFunctions[i];
			foundFunctionsObj[func.name] = func;
		}
		
		return {functions: foundFunctionsObj, variables: foundVariables, thisIs: thisIs};
		
		
		function overWriteDublicates(foundFunctions) {
			// Overwrite (remove) global functions with local functions if they have the same name
			var functionIndex = {};
			for(var i=0; i<foundFunctions.length; i++) {
				let fName = foundFunctions[i].name;
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
		
		function searchScope(functions, glob) {
			// Glob means global function
			
			var index = -1;
			
			for(var functionName in functions) {
				/*
					There is no guarantee that the functions will be checked in order!
					So we have to turn the list into an array, and sort it by position		
				
				*/
				let func = functions[functionName];

				if( (func.start <= charIndex && func.end >= charIndex) || glob ) {
					// Cursor is inside this function (or its a global function)!
					
					// Add itself to functions (yes functions can call themselves)
					//foundFunctions[func.name] = func;
					foundFunctions.push(func);
					
					console.log("Scope fun=" + func.name);
					
					if(!glob) {
						// Add local subfunctions
						for(var subFunctionName in func.subFunctions) {
							//foundFunctions[subFunctionName] = func.subFunctions[subFunctionName];
							foundFunctions.push(func.subFunctions[subFunctionName]);
						}
					}
					
					// Search sub-functions (recursive)
					searchScope(func.subFunctions, false);
					
				}
				
			}
		}
	}
	
	
	
})();