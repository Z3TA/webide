(function() {
	
	/*

		This file parses javascript and returns an object with the following objects:
			functions
			quotes
			comments
			globalVariables
	blockMatch = true|false (if there are as many { as there are }
		xmlTags
		
	
		Goals: 
			Intelli:
				Find misspelled properties!

			Parser:
				Find property name variables xxx.prop = yyy
		
		
		Optimization:
		parseJavaScript: 18-31ms (File.js)
		
		after accessing string like an array (char = text.charAt(charIndex); vs char = text[charIndex];): 21-31ms (no improvement)
		
		
		
	*/

	"use strict";
	
	editor.on("start", jsParserMain);
	
	function jsParserMain() {
	
		editor.on("fileOpen", onFileOpen); // Why did I remove this???
		editor.on("fileChange", onEdit, 100);

	}

	
	function onFileOpen(file) {
		
		//console.log("jsParser.js");
		
		if(shouldParse(file)) {
			
			console.log("Parsing " + file.path);
			
			var js = parseJavaScript(file);

			file.haveParsed(js); // Tell the file that it has been parsed so that functions depending on the parsed data can update
			
		}
		else {
			console.warn(file.path + " didn't want to be parsed by the JavaScript parser");			
		}

	}
	

	
	
	
	function shouldParse(file) {
		
		//console.log("file.fileExtension=" + file.fileExtension + " file.parse=" + file.parse);
		
		if(file.parse === false) return;
		
		// file.fileExtension == "", Assume all new files are JavaScript files :P
		
		if((file.fileExtension == "") || file.fileExtension == "js" || file.fileExtension == "json" || file.fileExtension == "css" || file.fileExtension == "htm" || file.fileExtension == "html" || file.fileExtension == "java") {
			return true;
		}
		else {
			console.warn(file.name + " will not be parsed by the JavaScript parser!");
			return false;
		}
	}

	
	function onEdit(file, type, character, index, row, col) {
		/*
			type: "delete", "linebreak", "insert", "text"
		*/
		
		if(shouldParse(file)) { // If the file should be parsed or not
			
			// We will just re-parse the text (for now). optimization is evil :P
			onFileOpen(file); // For now ... :P
			
		}
		else {
			}
		
		
		

		
	
		/*
			We could probably do a ton of optimization on this function ... 
		
		
		
		var box = file.grid[row][col];
		
		if(characters.length > 1) {
			// More then one characters was inserted or deleted
			
		}
		else {
			
			var char = characters,
				lastChar = index > 0 ? file.text.charAt(index-1) : "",
				nextChar = index < file.text.length ? file.text.charAt(index+1) : "",
				escaped = (lastChar == "\\"),
				insideDoubleQuote = checkRange(js.quotes),
				 = 

			
			if(char == "'") { // Ending/starting single quote if not inside double quote and not escaped
				if(insideDoubleQuote())
			}
			else if(char == '"') { // Ending double quote maybe
				
			}
			else if(char == "\\") { // Escaping 
				
			}
			else if(char == "/") { // Comment maybe
				
			}
		}
		
		
		
		if(type=="insert") {
			
			
			// Check ranges and apply colors ...
			
			for(var i=0; i<js.quotes.length; i++) {
				if(inRange(js.quotes[i])) {
					box.color = editor.settings.style.quoteColor;
					return; // We do not have to do anything else
				};
			}
			
			for(var i=0; i<js.comments.length; i++) {
				if(inRange(js.comments[i])) {
					box.color = editor.settings.style.commentColor;
					return; // We do not have to do anything else
				};
			}
		
		
		}
		

			
		function inRange(obj) {
			return (index > obj.start && index < obj.end);
		}
		*/
	}
	
	

	function isNumeric(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}
	
	function parseJavaScript(file) {

		/*
			Todo:
			 ES6 (fuck you) support!?
		*/
		
		console.time("parseJavaScript");
		
		var text = file.text,
			insideDblQuote = false,
			insideSingleQuote = false,
			insideFunctionDeclaration = false,
			insideFunctionArguments = false,
			afterPointer = [],
			variableStart = 0,
			variableEnd = 0,
			variableName = "",
			functionName = "",
			char = "",
			jchar = "",
			functionArgumentsStart = 0,
			functionArguments = "",
			insideFunctionBody = [],
			insideQuote = false,
			lastChar = "",
			insideLineComment = false,
			insideBlockComment = false,
			insideHTMLComment = false,
			L = [], // {
			R = [], // }
			subCount = 0, // Level of function scope depth
			functions = {},
			myFunction = [],
			functionId = -1,
			insideObject = false,
			comments = [],
			quotes = [],
			quoteStart = 0,
			commentStart = 0,
			commentStartIndentation = 0,
			objCount = 0,
			codeBlockDepth = 0,
			row = 0,
			lineNumber = 1,
			word = "",
			words = [],
			lastWord = "",
			insideVariableDeclaration = [],
			globalVariables = {},
			codeBlock = [{word: "", indenttation: 0, line: 0}],
			codeBlockRight = 0,
			codeBlockLeft = 0,
			insideCodeBlock = false,
			insideXmlTag = false,
			insideXmlTagEnding = false,
			xmlTag = "",
			lastXmlTag = "",
			tagBreak = editor.settings.indentAfterTags,
			codeBlockLeftRow = -1,
			codeBlockRightRow = -2,
			insideArray = [],
			arrayStart = [],
			arrayItemCount = [],
			insideParenthesis = [],
			parenthesisStart = [],
			leftSide = "",
			rightSide = "",
			variableIndex = -1,
			insideComment = false,
			xmlTagStart = -1, 
			xmlTags = [],
			xmlTagWordLength = 0,
			xmlTagSelfEnding = false,
			openXmlTags = 0,
			xmlTagLastOpenRow = -1,
			tmpXmlMode = false,
			llChar = "",
			lllChar = "",
			willBeJSON = false,
			willBeJSONValue = false,
			insideRegExp = false,
			eq = "=",
			colon = ":",
			pastChar = [],
		xmlMode = false,
		xmlModeBeforeScript = false,
			textLength = text.length,
			foundVariableInVariableDeclaration = false, // Why did I add this? Comments damnit!!!
			lastLineBreakCharacter = file.lineBreak.charAt(file.lineBreak.length-1);
			
		// -----
		
		if(file.fileExtension == "htm" || file.fileExtension == "html") xmlMode = true; // Start in xml mode
		
		tmpXmlMode = xmlMode;
		xmlModeBeforeScript = xmlMode;
		
		insideFunctionBody[subCount] = false;
		L[subCount] = 1; // { Asume open
		R[subCount] = 0; // }

		
		insideVariableDeclaration[0] = false;
		
		afterPointer[0] = false;
		insideArray[0] = false;
		
		
		// Look for function(a, b, c) { ... } not inside ' or "
		
		for(var i=0; i<textLength; i++) {
			checkCharacter(i)
		}
		
		console.timeEnd("parseJavaScript");
		
		
		//console.log("words:" + JSON.stringify(words, null, 2));
		//console.log("globalVariables:" + JSON.stringify(globalVariables, null, 2));
		//console.log("functions:" + JSON.stringify(functions, null, 2));
		//console.log("comments:" + JSON.stringify(comments, null, 2));
		
		
		return {language: "JavaScript", functions: functions, quotes: quotes, comments: comments, globalVariables: globalVariables, blockMatch: (codeBlockLeft - codeBlockRight) === 0, xmlTags: xmlTags};
		
		//console.log(JSON.stringify(functions, null, 4));
		
		
		function codeBlockL() {
			
			/*
				Entered a new codeblock {
				
			*/
			
			codeBlockDepth++;
			codeBlockLeft++;
			codeBlockLeftRow = row;
			
			//console.log("new codeBlock(" +codeBlockDepth + ") word=" + lastWord + " (line=" + lineNumber + ")");
			
			codeBlock[codeBlockDepth] = {word: lastWord, indenttation: codeBlockDepth, line: lineNumber};
			afterPointer[codeBlockDepth] = false;
			insideArray[codeBlockDepth] = false;
			arrayStart[codeBlockDepth] = -1;
			arrayItemCount[codeBlockDepth] = 0;
			insideParenthesis[codeBlockDepth] = "";
			parenthesisStart[codeBlockDepth] = -1;
			
			
			/*
			if(codeBlockDepth > 0) {
				// We went deeper ... Inheret the afterPointer value from parent
				afterPointer[codeBlockDepth] = afterPointer[codeBlockDepth-1];
			}
			*/
			
			if(insideVariableDeclaration[codeBlockDepth-1]) {
				codeBlock[codeBlockDepth].indenttation++;
			}
			
			insideVariableDeclaration[codeBlockDepth] = false;
			
			if(codeBlockDepth > 1) {
				let parent = codeBlock[codeBlockDepth-1];
					let parentWord = parent.word;
				let parentLine = parent.line;
				
				//if(parentLine == lineNumber) codeBlock[codeBlockDepth].indenttation--;
				
				if(parentWord != "if" && parentWord != "for" && parentWord.charAt(0) !== "(") {
					codeBlock[codeBlockDepth].parent = codeBlock[codeBlockDepth-1];
				}
			}

			
			
		}
		
		function codeBlockR() {
			codeBlockRight++;
			codeBlockRightRow = row;
			
			codeBlockDepth--;
			
			
			if(codeBlockDepth < 0) {
				console.warn("Code-block doesn't match in:" + file.path);
				codeBlockDepth = 0;
			}
			
			
			// Never after a pointer after a } unless in an array
			if(!insideArray[codeBlockDepth]) afterPointer[codeBlockDepth] = false;  
			
			
			
			//insideVariableDeclaration[codeBlockDepth] = false; // Don't change because of bug with multi line var.
			//console.log()
			
			if(file.grid[row].indentation > 0 && codeBlockLeftRow != codeBlockRightRow) {
				file.grid[row].indentation--;
			}
		}
		
		
		function getVariableType(rightSide) {
			/*
				Lets make a guess on what type of variable this is.
				
				Sets the .type of the variable
			
			*/
			
			var type = "unknown";
			
			if(rightSide.charAt(0) == '"' || rightSide.charAt(0) == "'") {
				type = "String";
			}
			else if(rightSide.charAt(0) == '[') {
				type = "Array";
			}
			else if(rightSide.charAt(0) == '/') {
				type = "RegExp";
			}
			else if(rightSide == "true" || rightSide == "false") {
				type = "Boolean";
			}
			else if(rightSide == "this") {
				type = "this";
			}
			else if(rightSide.charAt(0) == "(") {
				// Inside a parenthesis, it's either a number, boolean, or function call
				// foo = bar(baz) 
				
				if(rightSide.indexOf("==") > -1 || rightSide.indexOf("!=") > -1 || rightSide.indexOf("<=") > -1 || rightSide.indexOf(">=") > -1 || rightSide.indexOf("&&") > -1 || rightSide.indexOf("||") > -1) {
					type = "Boolean";
				}
				else {
					type = "Number";
				}
				
			}
			else if(rightSide.indexOf("*") > -1 || rightSide.indexOf("-") > -1 || rightSide.indexOf("+") > -1 || rightSide.indexOf("/") > -1 || rightSide.indexOf("%") > -1) {
				type = "Number";
			}
			else if(isNumeric(rightSide)) {
				type = "Number";
			}
			else {
				
				let par = rightSide.indexOf("(");
				
				if(par > -1) {
					// It's an Object object
					type = rightSide.substr(0, par).trim();
				}
				else {
					//console.log("Dunno what " + rightSide + " is!??");
				}

				
			}
			
			return type;
		}
		
		
		function findLeftSide(pointerCharacter) {
			
			// Figure out the left side (the variable name) of a pointer (= or :)
			
			var leftSide = "";
			
			if(pointerCharacter == ":") {
				
				/*
					
					Figure out the whole path! Ex: foo.bar.baz
					
					Also support arrays! Ex: foo.0, or foo.0.bar.0.baz
					
					JSON example:
					
					var foo = {
						bar: [
							55,
							{
								a1: 1, a2: 2
							}
						]
					}
				*/
				
				
				//console.log("figuring out leftside. word=" + word + " lastWord=" + lastWord + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + "");
				
				//leftSide = lastWord;
				
				var d = codeBlockDepth;
				
				if(insideArray[d]) {
					leftSide = insideArray[d] + "." + arrayItemCount[d]; // leftSide=arr.0
				}
				else {
					leftSide = lastWord; // leftSide=foo
				}
				
				while(d>0) {
					if(afterPointer[d] != ":") break;
				
					if(insideArray[d-1]) {
						leftSide = insideArray[d-1] + "." + arrayItemCount[d-1] + "." + leftSide; // leftSide=arr.0.foo
					}
					else {
						leftSide = codeBlock[d].word + "." + leftSide; // leftSide=bar.foo
					}
					

					d--;
					//console.log("while leftSide=" + leftSide);
					//console.log("afterPointer[" + d + "]=" + afterPointer[d]);
				}
			
				
				/*
					
				while(!insideArray[d] && afterPointer[d] == ":") {
					if(leftSide) {
						leftSide = codeBlock[d].word + "." + leftSide;
					}
					else {
						leftSide = codeBlock[d].word;
					}
					d--;
					console.log("while leftSide=" + leftSide);
					console.log("d=" + d);
				}
				console.log("d=" + d);

				if(insideArray[d]) {
					// The array name contains the full path
					leftSide = insideArray[d] + "." + arrayItemCount[d];
				}
				if(insideArray[d-1]) {
					// The array name contains the full path
					leftSide = insideArray[d-1] + "." + arrayItemCount[d-1] + "." + lastWord;
				}
				else {
					leftSide = leftSide + "." + lastWord;
				}
				
				

				*/

				
				/*
				// Dig into that JSON tree
				var  d = codeBlockDepth;

				
				while(afterPointer[d] == ":") {
					if(insideArray[d]) {
						leftSide = leftSide + "." + arrayItemCount[d];
					}
					
					else {
						
						if(leftSide) {
							if(insideArray[d-1]) {
								leftSide = leftSide + "." + arrayItemCount[d-1];
							}
							else {
								leftSide = codeBlock[d].word + "." + leftSide;	
							}
						}
						else {
							if(insideArray[d-1]) {
								leftSide = codeBlock[d-1].word + "." + insideArray[d-1] + "." + arrayItemCount[d-1];
							}
							else {
								leftSide = codeBlock[d].word;
							}
						}								
					}
					d--;
					console.log("leftSide=" + leftSide + " codeBlock[" + d + "].word=" + codeBlock[d].word + "");
				}
				
				leftSide += "." + lastWord;
				
				*/
			}
			else if(pointerCharacter == "=") {
				// Ex: x = y; (leftside=x)
				//console.log("What is best? leftSide=" + leftSide + " lastWord=" + lastWord + "");
				leftSide = lastWord;
			}
			else {
				throw new Error("Unexpected pointerCharacter=" + pointerCharacter + " (line=" + lineNumber + ")");
			}
			
			//console.log("findLeftSide return leftSide=" + leftSide);

			return leftSide;
		}
		
		
		function endPointer() {
			
			// We have found a value for a variable!
			
			var variable;
			var func = myFunction[subCount];
			var leftSide = findLeftSide(afterPointer[codeBlockDepth]);
			
			//console.log("Got value for variable! leftSide=" + leftSide + " rightSide=" + rightSide + " afterPointer[codeBlockDepth:" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth] + " insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " (line:" + lineNumber + ")");
			
			if(insideArray[codeBlockDepth]) {
				// Key is arrayItemCount[codeBlockDepth] !!!!
				//leftSide = leftSide + "." + arrayItemCount[codeBlockDepth];
			}
			else {
				afterPointer[codeBlockDepth] = false;
			}
			
			if(leftSide.length > 0 && rightSide.length > 0) {
				//console.log("We have Left & right side of variable pointer: " + leftSide + "=" + rightSide + "");
				
				var properties = leftSide.split(".");
				var variableName = properties[0];
				var startIndex = 1;
				
				if(insideFunctionBody[subCount]) {
					if(func.variables.hasOwnProperty(variableName)) {
						variable = func.variables[variableName];
						//console.log("Variable= '" + variableName + "' listed in function=" + func.name + " variables! Yey!");
					}
					else {
						// We have found a GLOBAL variable inside a function!?
						// or an if statement: if*(foo) bar* = baz
						//console.log("varibale='" + variableName + "' does not exist in function=" + func.name + " rightSide=" + rightSide + " (line=" + lineNumber + ")");
					}
						
				}
				else {
					
					// Look for global variables
					if(globalVariables.hasOwnProperty(variableName)) {
						variable = globalVariables[variableName];
					}
					// Look for function names
					else if(functions.hasOwnProperty(variableName)) {
						//console.log("hmm? " + variableName + " is a function!");
						
						if(properties.length > 1) {
							if(!functions[properties[0]].variables.hasOwnProperty(properties[1])) {
								functions[properties[0]].variables[properties[1]] = new Variable();
							}
							variable = functions[properties[0]].variables[properties[1]];
							startIndex = 2;
						}

					}
					else {
						// We have found an undeclared (no var) global variable?
						// or arr[foo] = 1, where [foo] is leftSide
						//console.log("varibale=" + variableName + " does not exist in globalVariables! lastWord=" + lastWord + " word=" + word + "");
					}
					
				}
				
				if(variable) {
					// Traverse the variable pyramid ... Loop through the property chain
					variable = traverseVariableTree(properties, variable, startIndex);
					

					
					variable.type = getVariableType(rightSide);
					if(variable.type == "this") {
						if(subCount > -1) {
							variable.value = myFunction[subCount].name; // We could point directly att the functon, but we want to avoid too much dublication
						}
						else {
							variable.value = "window"; // "this" is the global scope
						}
						
					}
					else {
						variable.value = rightSide;
					}
					
				}
				
				rightSide = "";
				
				if(insideVariableDeclaration[codeBlockDepth]) foundVariableInVariableDeclaration = true;
				
			}
			else {
				//console.log("Nothing to do?");
			}
			
		}
		
		
		function traverseVariableTree(properties, variable, startindex) {
			// Go though a object dot notation (foo.bar.baz) add keys if they do not exist and return the final variable
			for(var i=startindex; i<properties.length; i++) {
				if(!variable.keys.hasOwnProperty(properties[i])) {
					variable.keys[properties[i]] = new Variable();
				}
				variable = variable.keys[properties[i]];
			}
			return variable;
		}
		
		function checkCharacter(charIndex) {
			
			var backSlash = String.fromCharCode(92); // this: \
			
			// Save a history of the last characters
			pastChar[6] = pastChar[5];
			pastChar[5] = pastChar[4];
			pastChar[4] = pastChar[3];
			pastChar[3] = pastChar[2];
			pastChar[2] = pastChar[1];
			pastChar[1] = pastChar[0];
			
			pastChar[0] = char;
			
			lllChar = llChar;
			llChar = lastChar;
			lastChar = char;
			
			//char = text.charAt(charIndex);
			char = text[charIndex];
			

			if( (char == "\r" || char=="\n") && insideVariableDeclaration[codeBlockDepth] && !(pastChar[0] == "," || pastChar[1] == "," || pastChar[2] == ",") ) {
				// A new line without , exits variable declaration
				insideVariableDeclaration[codeBlockDepth] = false;
				foundVariableInVariableDeclaration = false;
				//console.log("pastChar=" + JSON.stringify(pastChar) + " char=" + char + " ? " +  (pastChar[0] == "," || pastChar[1] == "," || pastChar[2] == ",") );
			}
			
			
			if(char == lastLineBreakCharacter) {
				lineNumber++;
				row++;
				
				
				//console.log("(Indent) codeBlockDepth=" + codeBlockDepth + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]  + " insideBlockComment=" + insideBlockComment + " line:" + lineNumber);
				
				file.grid[row].indentation = Math.max(0, codeBlock[codeBlockDepth].indenttation + insideVariableDeclaration[codeBlockDepth] + insideBlockComment + openXmlTags);
				
				//console.warn("Line=" + lineNumber + " file.grid[" + row + "].indentation=" + file.grid[row].indentation + " insideBlockComment=" + insideBlockComment + " codeBlock[" + codeBlockDepth + "].indenttation=" + codeBlock[codeBlockDepth].indenttation + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]);
				//console.log("Row " + row);
			}


			
			/*
				### RegExp strings
				
				Anything between / and / not escaped by \
				
				RegExp or block comment!? RegExp can not start with *!
				
			*/
			if(char == "/" && !insideRegExp && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment) {
				insideRegExp = true;
			}
			else if(insideRegExp && char == "/" && lastChar != backSlash) {
				insideRegExp = false;
			}
			
			
			// ### Quotes and comments ...
			
			/*
			kjjkj
			
			*/
			
			//console.log("insideLineComment="+ insideLineComment);
			
			// We can not have /* after a lineComment, it will do nothing
			
			// ### Comments: <!-- -->
			if(char == "-" && lastChar == "-" && llChar == "!" && lllChar == "<" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideRegExp) { // <!--
				insideHTMLComment = true;
				insideXmlTag = false;
				xmlMode = tmpXmlMode;
				commentStart = i-4;
			}
			else if(char == ">" && lastChar == "-" && llChar == "-" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && insideHTMLComment && !insideRegExp) { // -->
				insideHTMLComment = false;
				comments.push(new Comment(commentStart, i));
				//console.warn("Found HTML comment! line=" + lineNumber + " ");
			}
			
			if(!xmlMode) {
			
				// ### Comments: //
				if(char == "/" && lastChar == "/" && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideLineComment  && !insideHTMLComment && !insideRegExp) {
					insideLineComment = true;
				commentStart = i-1;
				//console.log("insideLineComment!");
			}
			else if(char == "\n" && insideLineComment) {
				insideLineComment = false;
				comments.push(new Comment(commentStart, i));
				//console.log("Found line comment: " +  text.substring(commentStart, i))
				return;
			}
			
			// ### Comments: /*   */
				else if(char == "*" && lastChar == "/" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideHTMLComment && !insideBlockComment) {
					insideBlockComment = true;
					insideRegExp = false;
				commentStart = i-1;
				commentStartIndentation = file.grid[row].indentation;
					//console.log("insideBlockComment!");
			}
				else if(char == "/" && lastChar == "*" && insideBlockComment) {
					insideBlockComment = false;
				comments.push(new Comment(commentStart, i));
				//console.log("Found block comment: " + text.substring(commentStart, i));
				if(file.grid[row].indentation > 0) {
					// Set same indentation as the start of the comment
					file.grid[row].indentation = commentStartIndentation;
				}
				
				return;
			}
			
			// ### Quotes: double
			// JavaScript can not escape quotes outside of strings! So no need for  && lastChar != "\\"
				else if(char === '"' && !insideLineComment && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideRegExp) {
				if(insideDblQuote) {
					if(lastChar != backSlash || (lastChar == backSlash && llChar == backSlash)) {				
						insideDblQuote = false;
						quotes.push(new Quote(quoteStart, i));
						word = text.substring(quoteStart, i+1);
						return;
					}
				}
				else {
					insideDblQuote = true;
					quoteStart = i;
					//console.log("insideDblQuote!");
				}
			}
			
			// ### Quotes: single
				else if(char === "'" && !insideDblQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment && !insideRegExp) {
				if(insideSingleQuote) {
					insideSingleQuote = false;
					quotes.push(new Quote(quoteStart, i));
					return;
				}
				else {
					insideSingleQuote = true;
					quoteStart = i;
					//console.log("insideSingleQuote!");
				}
			}
				
			}
			
			insideQuote = insideDblQuote || insideSingleQuote;
			insideComment = insideLineComment || insideBlockComment || insideHTMLComment;
			
			//console.log("char(" + i + ")=" + char + "  " + insideQuote + " " + insideComment);
			
			if(!insideComment) {
				/*
					### Find xml-tags.
					
					Look out for if( x < y) and bitwise operations >> <<
					and array of strings: "<", ">",
					
					PS: We are Not inside an HTML comment until the parser finds the last - in <!--
				*/
				if(insideXmlTag && pastChar[0] == "<" && char == "/") {
					// Ending tag: </foo>
					insideXmlTagEnding = true;
				}
				else if(char == "<" && !insideParenthesis[codeBlockDepth]) {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i;
					if(!insideXmlTagEnding) {
						tmpXmlMode = xmlMode; // xmlMode when the tag starts
						xmlMode = false;
					}
					if(insideHTMLComment) throw new Error("WTF");
				}
				else if(char == " " && insideXmlTag && xmlTagWordLength === 0) {
					xmlTagWordLength = i - xmlTagStart;
				}
				else if(char == ">" && insideXmlTag && !insideParenthesis[codeBlockDepth]) {
					if(pastChar[0] == "/") {
						xmlTagSelfEnding = true; // Self ending xml tag: <foo />
					}
					
					if(xmlTagWordLength === 0) xmlTagWordLength = i - xmlTagStart;
					xmlTag = text.substr(xmlTagStart + 1 + insideXmlTagEnding, xmlTagWordLength - 1 - insideXmlTagEnding);
					xmlTags.push(new XmlTag(xmlTagStart, i, xmlTagWordLength, xmlTagSelfEnding) );
					
										xmlMode = tmpXmlMode; // Set the xmlMode we had when the tag started
					
					if(xmlTag.toLowerCase() == "script" || xmlTag.toLowerCase() == "pre") {
						
						if(insideXmlTagEnding) {
							// Use default xmlMode after script tag ended
							xmlMode = xmlModeBeforeScript;
						}
						else {
							// We are <script HERE>
							xmlModeBeforeScript = xmlMode;
							xmlMode = false;
						}
						}
					
					if(tagBreak.indexOf(xmlTag) > -1) {
						
						//console.log("tag=" + tag + " lastXmlTag=" + lastXmlTag);
						
						if(insideXmlTagEnding) {
							// It's a ending tag </tag>
							openXmlTags--;
							if(xmlTagLastOpenRow != row && file.grid[row].indentation > 0) file.grid[row].indentation--;
						}
						else {
							// It's a tag opening
							openXmlTags++;
							xmlTagLastOpenRow = row;
						}
						}
					
					lastXmlTag = xmlTag;
					xmlTag = "";
					
					xmlTagWordLength = 0;
					insideXmlTag = false;
					insideXmlTagEnding = false;
					
					
				}
				
			}
			
			if(codeBlockLeft == codeBlockRight) {
				insideCodeBlock = false;
			} 
			else {
				insideCodeBlock = true;
			}

			if(!insideQuote && !insideComment && !xmlMode) {
				
				//console.log("char(" + i + ")=" + char + "");
				
				/*
				5773
				char == " " || char == "\t" || char == "\n" || 
				*/
				
				if(char == "}" || char == ";" || char == "," || char == "{" || char == lastLineBreakCharacter) {
					variableStart = i+1;
				}
				
				
				// Read words ...
				readWords(charIndex);
				

				
		
				
				
				// ### Code block indentation for JavaScript & CSS
				if(char == "}") {
					codeBlockR();
				}
				else if(char == "{") {
					codeBlockL();
					willBeJSON = true; // Maybe :P
				}
				
				
				if(char == ";") {
					insideVariableDeclaration[codeBlockDepth] = false;
					foundVariableInVariableDeclaration = false;
					
					//console.log("Found character=; ending pointer ...");
					
					//endPointer();
					
				}
				
				else if(char == "," && !insideParenthesis[codeBlockDepth]) {
					
					//console.log("Found character=, insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " leftSide=" + leftSide + " rightSide=" + rightSide + " word=" + word + " lastWord=" + lastWord + " (line=" + lineNumber + ")");

					if(insideArray[codeBlockDepth]) {
						arrayItemCount[codeBlockDepth]++;
					}
					
					foundVariableInVariableDeclaration = false;
					
					/*
					Only end pointer after a word!
					console.log("ep char=" + char + "");
					endPointer(); 
					*/
					

				}
				/*
				else if(char == " " && lastWord == "var") {
					insideVariableDeclaration[codeBlockDepth] = true;
				}
				*/
				else if(char == "[") {
					//console.log("array! word=" + word + " lastWord=" + lastWord);
					
					insideArray[codeBlockDepth] = lastWord;
					
					//insideArray[codeBlockDepth] = findLeftSide(afterPointer[codeBlockDepth]);
					
					//afterPointer[codeBlockDepth] = false; // only endpointer should end it!?
					arrayStart[codeBlockDepth] = i;
				}
				else if(char == "]") {
					//console.log("End of array=" + insideArray[codeBlockDepth] + " word=" + word + " lastWord=" + lastWord + " leftSide=" + leftSide + " rightSide=" + rightSide + "");
					
					lastWord = insideArray[codeBlockDepth];
					
					word = text.substring(arrayStart[codeBlockDepth], i+1);
					
					insideArray[codeBlockDepth] = false;
				
				}
				else if(char == "}") {
					/*
						Problem:
							How can we know if this is the end of a function body?
							
							function foo() {
								
								var bar = {};
								
							}
					
					*/
					
					//console.log("} insideFunctionBody[" + subCount + "]=" + insideFunctionBody[subCount] + " line:" + lineNumber + "");

					
					if(insideFunctionBody[subCount]) {
						R[subCount]++;
						
						
						
						insideFunctionDeclaration = false;
						
						//console.log("R[" + subCount + "]++");
						
						//console.log("L[" + subCount + "]=" + L[subCount] + ", R[" + subCount + "]=" + R[subCount] + " (line:" + lineNumber + ")");

						
						if(L[subCount] === R[subCount]) {
							// End of current function
							//console.log("Reached end of function body for " + myFunction[subCount].name + " L[" + subCount + "]=" + L[subCount] + "  R[" + subCount + "]=" + R[subCount] + " (line:" + lineNumber + ")");
							insideFunctionBody[subCount] = false;
							
							myFunction[subCount].end = i;
							

							
							if(subCount > 0) {
								L[subCount] = -1;
								R[subCount] = -1;
								
								subCount--;
								R[subCount]++;
							}
							else {
								R[subCount] = L[subCount]-1;
							}
							
						}
						
						
					}

				}
				else if( (char == "=" || char == ":") && !insideParenthesis[codeBlockDepth]) {
					
					variableName = text.substring(variableStart, i).trim();  // Used to find name of function
					
					afterPointer[codeBlockDepth] = char;
					
					//console.log("found a pointer (" + char + ") codeBlockDepth=" + codeBlockDepth + " variableName=" + variableName + " leftSide=" + leftSide + " rightSide=" + rightSide + " lastWord=" + lastWord + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + "  (line:" + lineNumber + ")");

					// Figure out the left side (the variable name)
					
					//leftSide = findLeftSide(char);
					

					//console.log("ap leftSide=" + leftSide);

				}
				else if(char == "(") {
					
					insideParenthesis[codeBlockDepth] = "(";
					parenthesisStart[codeBlockDepth] = i;
					
					if(insideFunctionDeclaration) {
						
						// Figure out the name of the function
						
						//console.log("function!? line=" + lineNumber + " col=" + i + " word=" + word + " lastWord=" + lastWord + " variableName=" + variableName + " functionName=" + functionName + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth]);
						// Sometimes you have var infront of function. 
						
						functionName = lastWord || word.replace("(", "");
						
						// Note: we do not want to give names to anonymous functions! Or the function-list would be too cluttered
						
						insideFunctionArguments = true;
						
						//console.log("insideFunctionArguments!");
						
						functionArgumentsStart = i+1;

					}
					/*
					if(words[words.length-1] == "function") {
						
						insideFunctionDeclaration = true;
						console.log("insideFunctionDeclaration? (line:" + lineNumber + ")")

						// Anonymous function?
						//console.log("variableName=" + variableName);
						//console.log("word-2=" + words[words.length-2]);
						
						// Sometimes you have var infront of function. 
						
						if(variableName.substr(0,3) == "var" || variableName.substr(0,3) == "let") {
							functionName = variableName.substring(4, variableName.length);
						}
						else if(words[words.length-2] == variableName) {
							functionName = variableName;
						}
						else {
							functionName = "Anonymous function";
						}
						
					}
					else if(words[words.length-2] == "function") {
						insideFunctionDeclaration = true;
						willBeJSON = false; // Defenitly! ... function ... (we are here)
						console.log("insideFunctionDeclaration! (line:" + lineNumber + ")")
						functionName = words[words.length-1];
						
					}
					*/
					
				}

				else if(char == ")") {
					insideParenthesis[codeBlockDepth] = "";
					word = text.substring(parenthesisStart[codeBlockDepth], i+1);
					
					if(insideFunctionArguments) {
						insideFunctionArguments = false;
						
						functionArguments = text.substring(functionArgumentsStart, i);
						
						//console.log("arguments: " + functionArguments + "");
					}
				}
				
				else if(char == "{") {
					
					//console.log("{ insideFunctionBody[" + subCount + "]=" + insideFunctionBody[subCount] + " insideFunctionDeclaration=" + insideFunctionDeclaration + " insideFunctionArguments=" + insideFunctionArguments + " line:" + lineNumber + "");
					
					if(insideFunctionBody[subCount]) L[subCount]++;
					
					if((insideFunctionDeclaration) && !insideFunctionArguments) {
						
						// We have found a new function !
						
						//console.log("Found function=" + functionName + "! insideFunctionDeclaration=" + insideFunctionDeclaration + " insideFunctionBody[" + subCount + "]=" + insideFunctionBody[subCount] + " insideFunctionArguments=" + insideFunctionArguments + "");
						
						willBeJSON = false; // It will not be JSON until we find another {
						
						
						
						/*
						json = {
							foo: function() {
								<!-- We are here, cleare the afterPointer for current depth
							}
						}
						
						*/
						//afterPointer[codeBlockDepth] = false; // only endpointer should end it!?
						
						let newFunc = new Func(functionName, functionArguments, i, lineNumber);
						
						//console.log("functionName=" + functionName + " type=" + typeof functionName);
						
						
						if(functionName === false) functionName = "unknownmeh"; // Why can functionName be a boolean (false) !???
						
						let properties = functionName.split(".");
						

						//console.log("subCount=" + subCount);
						
						if(insideFunctionBody[subCount]) {
							//It's a sub-function
							
							myFunction[subCount].subFunctions[functionName] = newFunc;
							
							myFunction[subCount+1] = myFunction[subCount].subFunctions[functionName];
							
							subCount++; // Functions within this function's body will be sub-functions
							
							L[subCount] = 1;
							R[subCount] = 0;
							
							if(properties.length > 1) {
								if(myFunction[subCount-1].variables.hasOwnProperty(properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									// Change the variable type to Method
									let variable = myFunction[subCount-1].variables[properties[0]];
									let startIndex = 1;
									variable = traverseVariableTree(properties, variable, startIndex);
									
									variable.type = "Method";
									
								}
							}
							
						}
						else {
							// a global function
							functions[functionName] = newFunc;
							myFunction[subCount] = functions[functionName];
							
							// Remove from global variables
							if(globalVariables.hasOwnProperty(functionName)) {
								delete globalVariables[functionName];
							}
							

							if(properties.length > 1) {
								if(functions.hasOwnProperty(properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									// This is run after variables has been added.
									// Change the variable type to Method
									if(functions[properties[0]].variables.hasOwnProperty(properties[1])) {
										
										let variable = functions[properties[0]].variables[properties[1]];
										let startIndex = 2;
										variable = traverseVariableTree(properties, variable, startIndex);
										
										variable.type = "Method";
									}

								}
							}
						}
						
						
						insideFunctionBody[subCount] = true;
						insideFunctionDeclaration = false;
						
						//console.log("L[" + subCount + "]++");
						

					}
					else {
						//console.log("1130: Did we find a JSON? (line:" + lineNumber + ")")
						
					}
				}
				
			}
		}
		
		
		function readWords(charIndex) {
			// Collects the words to find variables
			
			//console.log("char=" + char + " word=" + word);
			
			
			// .substr(start,length)   .substring(start,end)
			// problem: if the whole script is encapsulated with a clusure: (function() {
			// problem 2: Prevent functionSomething to be registered
			if(insideParenthesis[codeBlockDepth]) {
				if(char != " ") { // Why do I need to ignore spaces?
					insideParenthesis[codeBlockDepth] += char;
					word = word + char;
				}
				if(  insideParenthesis[codeBlockDepth] + char == "(function " || insideParenthesis[codeBlockDepth] == "(function(" ) {
						//console.log("clousure line=" + lineNumber + "");
						insideFunctionDeclaration = true;
						lastWord="";
						word = "";
					}
				
				//word = "";
				lastWord = "";
				return;
			}
			// Letters keeps adding to the word ...
			else if(char == " " && word == "var") {
				insideVariableDeclaration[codeBlockDepth] = true;
				word = "";
				return;
			}
			else if(char == " " && word == "function") {
				// Detects: function foo() ...
				insideFunctionDeclaration = true;
				word = "";
				return;
			}
			else if(char == "(" && word == "function") {
				// Anonymous function
				//console.log("anon function line=" + lineNumber + "");
				insideFunctionDeclaration = true;
				variableName = "Anonymous function";
				word = "";
				return;
			}
			else if(char == " " && word == "new") {
				word = "";
				return;
			}
			/*
				if(pastChar[2] == "v" && pastChar[1] == "a" && pastChar[0] == "r") {

				}
				else if(pastChar[1] == "i" && pastChar[0] == "f") {
					word = "";
					return;
				}
				else if(pastChar[3] == "e" && pastChar[2] == "l" && pastChar[1] == "s" && pastChar[0] == "e") {
					word = "";
					return;
				}
				else if(pastChar[2] == "n" && pastChar[1] == "e" && pastChar[0] == "w") {
					word = "";
					return;
				}
			*/
			else if(charIndex == textLength || char == "=" || char == "(" || char == ")" || char == "\t" || char == "\r" || char == "\n" || char == "," || char == ";" || char == "{" || char == "}" || char == ":" || char == "," || char == "[" || char == "]") {

				// char == " " || char == "+" || char == "-" || char == "/" || char == ">" || char == "<" ||
				// If we are inside an array, the word is a value!
				// insideArray[codeBlockDepth] ||
				
				word = word.trim();
				
				if(word.length > 0 && word != "/") { // Ignore / slash
					
					if(word == "if" || word == "else" || word == "new" || word == "while" || word == "for") {
						word = "";
						return;
					}
					else if(word == "function") {
						// Detects var foo = function() ...
						insideFunctionDeclaration = true;
						word = "";
						return;
					}
					else {

						words.push(word);
						
						//console.log("NEW WORD='" + word + "' insideVariableDeclaration[" + subCount + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[codeBlockDepth=" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth] + " insideFunctionBody[" + subCount + "]=" + insideFunctionBody[subCount] + "  insideCodeBlock=" + insideCodeBlock + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + " insideFunctionDeclaration=" + insideFunctionDeclaration + " willBeJSON=" + willBeJSON + " insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " foundVariableInVariableDeclaration=" + foundVariableInVariableDeclaration + " (line:" + lineNumber + ")");
						
						if(afterPointer[codeBlockDepth]) {
							// We are on the rights side of a pointer
							rightSide += word;
							//console.log("found rightSide=" + rightSide + " (leftSide=" + leftSide + ")");
							endPointer();
						}
						else if(insideArray[codeBlockDepth]) {
							// Got a array value, 
							//leftSide = insideArray[codeBlockDepth];
							rightSide += word;
							//console.log("got array=" + insideArray[codeBlockDepth] + " value=" + rightSide + "");
							if(afterPointer[codeBlockDepth]) {
								// ex: foo = [1,*]
								endPointer();
							}
							else {
								// Inside an array (or object literal) ex: foo[1*]
								leftSide = insideArray[codeBlockDepth] + "." + rightSide;
								rightSide = "";
							}
							
						}
						else {
							
							if(insideVariableDeclaration[codeBlockDepth]) { //  && foundVariableInVariableDeclaration == false, removed because we couldn't find vars inside a function declared with var f = function
								
								// We are inside a var declaration!
								
								//console.log(word + " is a variable (declared with var)! insideFunctionBody[" + subCount + "]=" + insideFunctionBody[subCount] + "");
								
								
								if(!insideCodeBlock) {
									// A global variable is declared:

									globalVariables[word] = new Variable();
									//console.log("Added GLOBAL variable=" + word + "");
									foundVariableInVariableDeclaration = false;
								}
								else {
									// A local variable (inside a function or JSON??)
									if(insideFunctionBody[subCount]) {
										
										// Check if the parent (word) exist in 
										
										
										let codeBlockDepthTemp = codeBlockDepth;
										
										while(codeBlock[codeBlockDepthTemp].parent) {
											codeBlockDepthTemp--;
										}
										let rootWord = codeBlock[codeBlockDepthTemp].word;
										
										//console.log("Inside function=" + insideFunctionBody[subCount].name + " word=" + word + " rootWord=" + rootWord + "");
										
										
										if(!myFunction[subCount].variables.hasOwnProperty(rootWord)) {
											myFunction[subCount].variables[word] = new Variable("");
											//console.log("Added variable=" + word + " to function=" + myFunction[subCount].name + " codeBlock[" + codeBlockDepth + "].word=" + codeBlock[codeBlockDepth].word + " parent.word=" + (codeBlock[codeBlockDepth].parent ? codeBlock[codeBlockDepth].parent.word : 'undefined') + " rootWord=" + rootWord + "");
										}
										else {
											
											//console.log("WTF happaned!??");
											
											//myFunction[subCount].variables[rootWord].type = new Variable("Object");
										}
										
										

										
									}
									else {
										// Inside a global object notation declaration
										//console.log("Inside a global object notation declaration !??? word=" + word + " (line:" + lineNumber + ")");
									}
									
								}
								
							}
							else {
								//console.log("Inside a JSON declaration? (line=" + lineNumber + ")")
							}
						}
						
						lastWord = word;
						
						word = "";
					}
					

				}
				else {
					//console.log("errm? word=" + word);
				}
			}
			else {

				word = word + char;
				
				if(word == " ") word = "";
				if(word == "/") word = ""; // Prevent words after comments having /
				
			}
			
			//console.log("word=" + word + " lastWord=" + lastWord);
			
			
		}
		
		
	}
	
	
	function Func(name, args, start, lineNumber) {
		var func = this;
		
		func.name = name || "";
		func.arguments = args || "";
		func.start = start || -1;
		func.end =-1;
		func.subFunctions = {};
		func.variables = {};
		func.lineNumber = lineNumber;
		func.prototype = {}; // Variables. (Methods will also be added as a variable here for consistency, it will also exist as a function)
		
		/*
			No need for an order property, we can order by start.
			
			
		*/
	}
	
	function Obj(name) {
		var obj = this;
		
		obj.name = name;
		obj.index = -1;
		obj.childs = [];
	}
	
	function Comment(start, end, text) {
		var comment = this;
		
		comment.start = start || -1;
		comment.end = end || -1;
		//comment.text = text;
	}
	
	function Quote(start, end) {
		var quote = this;
		
		quote.start = start || -1;
		quote.end = end || -1;
	}
	
	function Variable(type, value) {
		var variable = this;
	
		variable.type = type;
		variable.value = value;
		variable.keys = {};
		
		// Only functions Should have a prototype! 
		
	}
	
	function XmlTag(start, end, wordLength, selfEnding) {
		this.start = start;
		this.end = end;
		this.wordLength = wordLength;
		this.selfEnding = selfEnding;
	}
	
	
})();