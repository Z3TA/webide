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
		
		Hmm, parsing the same file now takes 40-60ms. What did I do?
		Addded a bunch of checks ... Lets add some flags to skip some parts, to see where the sacrification is
		
		Measure by typing inside File.js
		parseJavaScript: 50.770ms
		
		Replace pastChar with natives instead of arrays:
		parseJavaScript: 18-32 ms
		
		
		
		
		
		
		About var declarations: They will not be indented, witch will encurage you to write:
		var a, b, c;
		var a;
		var b;
		var c;
		
		instead of:
		var a,
			b,
			b;
		
		var foo = {
		},
		bar = 1;
		
		see: http://benalman.com/news/2012/05/multiple-var-statements-javascript/
		
		Arguments for only having one var declaration:
		* Faster parsing ... Neglectable
		* Less keyboard typing ... Neglectable
		* Smaller file size ... Use a minifier
		
		Arguments for having many var declarations:
		* Easier to remove/reorder
		* Looks better in SCM commits when you remove/add
		* Less prone to errors (important!)
		
		
		
		What about indentation inside parentheses?
		Have not decided yet, it's fairly uncommon to have line breaks inside a function call or function arguments,
		and in that case you should probably make the argument's into an array instead.
		
	*/

	"use strict";
	
	editor.on("start", jsParserMain);
	
	function jsParserMain() {
	
		editor.on("fileOpen", onFileOpen); // Why did I remove this???
		editor.on("fileChange", parseJsOnChange, 100);

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
		
		/* 
			Dilemma: Should we also parse ASP and PHP here!? (Go into vbScript PHP , etc mode when encontering <% or <?PHP)
			Yes, this is the easiest solution, and we do not have to redo xmlParsing (like we would have to if we had separate plugins)
			We could argue that PHP scripts should not include html, or JS, but most php scripts probably does.
		*/
		
		if( file.fileExtension == "" || 
		file.fileExtension == "js" || 
		file.fileExtension == "php" || 
		file.fileExtension == "asp" || 
		file.fileExtension == "vbs" ||  // Visual Basic Script
		file.fileExtension == "vb" ||   // Visual Basic
		file.fileExtension == "json" || 
		file.fileExtension == "css" || 
		file.fileExtension == "htm" || 
		file.fileExtension == "html" || 
		file.fileExtension == "java") {
			return true;
		}
		else if(file.fileExtension == "xml" && (file.text.indexOf("<?JS") != -1)) {
			return true;
		}
		else {
			console.warn(file.name + " will not be parsed by the JavaScript parser!");
			return false;
		}
	}

	
	function parseJsOnChange(file, type, characters, caretIndex, row, col) {
		/*
			### Parse only function optimizer
			
			type: "delete", "linebreak", "insert", "text", deleteTextRange, deleteCharacter, reload, 
		*/
		
		if(shouldParse(file)) { // If the file should be parsed or not
			
			if(file.parsed && (type=="delete" || type == "linebreak" || type == "insert" || type == "text" || type == "deleteTextRange" || type == "deleteCharacter")) { // If the file was parsed before
				
				console.log("type=" + type + " characters=" + characters);
				
				var oldParse = file.parsed;
				
				if(oldParse.blockMatch) {
					//var insideComment = false;
					
					//var char = characters.toLowerCase();
					var lastChar = file.text.length > caretIndex ? file.text.charAt(caretIndex-1) : "";
					//console.log(JSON.stringify(comments));
					
					/*
						if(char != "\n" && (char != "/" && lastChar != "*") {
						// Check if we are inside a comment
						for (var i=0; i<comments.length; i++) {
						if(comments[i].end > caretIndex && comments[i].start < caretIndex) {
						insideComment = true;
						break;
						}
						}
						}
					*/
					
					var charactersLength = characters.length;
					
					if(type == "delete" || type == "deleteTextRange" || type == "deleteCharacter") {
						charactersLength = -charactersLength;
					}
					
					console.log("charactersLength=" + charactersLength);
					
					var functions = oldParse.functions;
					//console.log(JSON.stringify(functions));
					
					var f = insideFunction(functions, caretIndex, false, charactersLength);
					var maxFunctionBodySize = Math.round(file.text.length * 0.8);
					
					if(f) { // Parse only that function
						console.log("Inside " + f.name);
						if((f.end - f.start) < maxFunctionBodySize && file.text.charAt(f.end + charactersLength) == "}") { // If the function is not the majority of the file
							
							console.time("parseOnlyFunctionOptimizer");
							
							console.log("change type=" + type);
							
							console.log("Parsing only f=" + f.name + "");
							
							// The start property is at the { after function
							var parseStart = file.text.lastIndexOf("function" + (f.name.length > 0 ? " " + f.name : ""), f.start);
							var parseEnd = f.end + charactersLength + 1;
							var parseStartRow = f.lineNumber-1;
							var baseIndentation = file.grid[parseStartRow].indentation;
							var oldStart = f.start;
							var oldEnd = f.end;
							
							if(parseStart == -1) {
								// Fix for: foo = function() and foo = function foo()
								parseStart = file.text.lastIndexOf(f.name + " = function");
								// note: Should probably use regexp to find foo      =function (lots of, or no white space)
							}
							
							if(parseStart == -1) throw new Error("Unable to find start of function=" + f.name + " parseStart=" + parseStart);

							// function names can include the string "function" ex: function function_function ( )  {
							
							
							
							//if(charactersLength < 0) parseEnd++;
							
							console.log("characters=" + lbChars(characters));
							console.log("parseStartRow=" + parseStartRow + " baseIndentation=" + baseIndentation + " charactersLength=" + charactersLength + " parseStart=" + parseStart + " parseEnd=" + parseEnd);
							
							//console.log("Gonna parse text=\n" + file.text.substring(parseStart, parseEnd));
							
							console.log("Gonna parse text=\n" + lbChars(file.text.substring(parseStart, parseEnd)));
							
							if(file.text.charAt(parseEnd-1) != "}") {
								file.debugGrid();
								throw new Error("Expected parseEnd-1 = " + (parseEnd-1) + " character=" + lbChars(file.text.charAt(parseEnd-1)) + " to be an }");
							}
							
							//console.log(file.text.substring(parseStart, parseEnd));
							
							var newParse = parseJavaScript(file, {start: parseStart, end: parseEnd, baseIndentation: baseIndentation, startRow: parseStartRow});
							// The parser will find the first function and only parse that
							
							//console.log("newParse=" + JSON.stringify(newParse));
							
							var spliceStart = -1;
							var spliceLen = 0;
							
							
							// Remove all quotes in the function, then add them again, and increment index of all below
							for(var i=0; i<oldParse.quotes.length; i++) {
								if(oldParse.quotes[i].start > oldStart && oldParse.quotes[i].end < oldEnd) {
									spliceLen++;
									//console.log("remove quote " + i + " spliceLen=" + spliceLen + " : " + file.text.substring(oldParse.quotes[i].start, oldParse.quotes[i].end));
									if(spliceStart==-1) spliceStart = i;
									continue;
								}
								else if(spliceLen > 0) {
									break;
								}
								else if(oldParse.quotes[i].start > oldEnd) {
									spliceStart = i;
									break;
								}
							}
							
							console.log("quotes: spliceStart=" + spliceStart + " spliceLen=" + spliceLen + " length=" + oldParse.quotes.length);
							
							if(spliceLen && spliceStart != -1) {
								
								oldParse.quotes.splice(spliceStart, spliceLen);
								
								for(var i=spliceStart; i<oldParse.quotes.length; i++) {
									//console.log("inc quote " + i + " : " + file.text.substring(oldParse.quotes[i].start+charactersLength, oldParse.quotes[i].end+charactersLength));
									oldParse.quotes[i].start += charactersLength;
									oldParse.quotes[i].end += charactersLength;
								}
							}
							else {
								// The function had no quotes last time it was parsed (some might been added in the new parse). Update all quotes After the function
								for(var i=0; i<oldParse.quotes.length; i++) {
									if(oldParse.quotes[i].start > f.end) {
										//console.log("inc quote " + i + " : " + file.text.substring(oldParse.quotes[i].start+charactersLength, oldParse.quotes[i].end+charactersLength));
										oldParse.quotes[i].start += charactersLength;
										oldParse.quotes[i].end += charactersLength;
									}
								}								
							}
							console.log("newParse.quotes.length=" + newParse.quotes.length + " oldParse.quotes.length=" + oldParse.quotes.length);
							if(newParse.quotes.length > 0) {
								// Can we splice instead? So we dont have to sort!?
								for(var i=0; i<newParse.quotes.length; i++) {
									oldParse.quotes.push(newParse.quotes[i]);
									//console.log("add quote : " + file.text.substring(newParse.quotes[i].start, newParse.quotes[i].end))
								}
								oldParse.quotes.sort(sortyByStart);
							}
							
							// Remove all comments in the function, then add them again, and increment index of all below
							spliceStart = -1;
							spliceLen = 0;
							for(var i=0; i<oldParse.comments.length; i++) {
								if(oldParse.comments[i].start > oldStart && oldParse.comments[i].end < oldEnd) {
									spliceLen++;
									//console.log("remove comments " + i + " spliceLen=" + spliceLen + " : " + file.text.substring(oldParse.comments[i].start, oldParse.comments[i].end));
									if(spliceStart==-1) spliceStart = i;
									continue;
								}
								else if(spliceLen > 0) {
									break;
								}
								else if(oldParse.comments[i].start > oldEnd) {
									spliceStart = i;
									break;
								}
							}
							
							console.log("comments: spliceStart=" + spliceStart + " spliceLen=" + spliceLen + " length=" + oldParse.comments.length);
							
							if(spliceLen && spliceStart != -1) {
								
								oldParse.comments.splice(spliceStart, spliceLen)
								
								for(var i=spliceStart; i<oldParse.comments.length; i++) {
									oldParse.comments[i].start += charactersLength;
									oldParse.comments[i].end += charactersLength;
								}
								
							}
							else {
								for(var i=0; i<oldParse.comments.length; i++) {
									if(oldParse.comments[i].start > f.end) {
										//console.log("inc quote " + i + " : " + file.text.substring(oldParse.comments[i].start+charactersLength, oldParse.comments[i].end+charactersLength));
										oldParse.comments[i].start += charactersLength;
										oldParse.comments[i].end += charactersLength;
									}
								}
							}
							console.log("newParse.comments.length=" + newParse.comments.length);
							console.log("oldParse.comments.length=" + oldParse.comments.length);
							if(newParse.comments.length > 0) {
								for(var i=0; i<newParse.comments.length; i++) {
									oldParse.comments.push(newParse.comments[i]);
								}
								oldParse.comments.sort(sortyByStart);
							}
							
							// Remove all xmlTags in the function, then add them again, and increment index of all below
							spliceStart = -1;
							spliceLen = 0;
							for(var i=0; i<oldParse.xmlTags.length; i++) {
								if(oldParse.xmlTags[i].start > oldStart && oldParse.xmlTags[i].end < oldEnd) {
									spliceLen++;
									//console.log("remove xmlTags " + i + " spliceLen=" + spliceLen + " : " + file.text.substring(oldParse.xmlTags[i].start, oldParse.xmlTags[i].end));
									if(spliceStart==-1) spliceStart = i;
									continue;
								}
								else if(spliceLen > 0) {
									break;
								}
								else if(oldParse.xmlTags[i].start > oldEnd) {
									spliceStart = i;
									break;
								}
							}
							
							if(spliceLen && spliceStart != -1) {
								
								oldParse.xmlTags.splice(spliceStart, spliceLen);
								
								for(var i=spliceStart; i<oldParse.xmlTags.length; i++) {
									oldParse.xmlTags[i].start += charactersLength;
									oldParse.xmlTags[i].end += charactersLength;
								}
							}
							else {
								// No xmlTags in the function. Update all xmlTags After the function
								for(var i=0; i<oldParse.xmlTags.length; i++) {
									if(oldParse.xmlTags[i].start > f.end) {
										//console.log("inc quote " + i + " : " + file.text.substring(oldParse.xmlTags[i].start+charactersLength, oldParse.xmlTags[i].end+charactersLength));
										oldParse.xmlTags[i].start += charactersLength;
										oldParse.xmlTags[i].end += charactersLength;
									}
								}								
							}
							if(newParse.xmlTags.length > 0) {
								for(var i=0; i<newParse.xmlTags.length; i++) {
									oldParse.xmlTags.push(newParse.xmlTags[i]);
								}
								oldParse.xmlTags.sort(sortyByStart);
							}
							console.log("globalVariables=" + JSON.stringify(newParse.globalVariables));						
							
							// Update blockMatch
							// Curly brackets inside a function always match!
							console.log("oldParse.codeBlockLeft=" + oldParse.codeBlockLeft);
							console.log("newParse.codeBlockLeft=" + newParse.codeBlockLeft);
							console.log("oldParse.codeBlockRight=" + oldParse.codeBlockRight);
							console.log("newParse.codeBlockRight=" + newParse.codeBlockRight);
							console.log("oldParse.blockMatch=" + oldParse.blockMatch);
							console.log("newParse.blockMatch=" + newParse.blockMatch);
							
							oldParse.blockMatch = (((oldParse.codeBlockLeft - newParse.codeBlockLeft) - (oldParse.codeBlockRight - newParse.codeBlockRight)) === 0);
							
							
							//  f is a ref to the old function in oldParse
							if(f.end < 0) throw new Error("Old function " + f.name + " did not have an ending! end=" + f.end);	
							
							if(Object.keys(newParse.functions).length == 0) throw new Error("Parsed code contains no function! newParse.functions=" + JSON.stringify(newParse.functions));
							
							var ff = newParse.functions[firstValueInObjectList(newParse.functions)]; // Ref to the same function in new parse
							
							if(ff.end < 0) {
								// The parsed function did not get an ending.
								if(newParse.blockMatch) throw new Error("New parse of function " + ff.name + " did not get an ending! end=" + ff.end);	
								else {
									// Give it a temporary/virtual ending
									// Next parse should be a full parse due to the block missmatch (could probably skip the full parse because of block missmatch if we need to optimize)
									
									ff.end = parseEnd;
								}
							}
							
							
							// Save old values
							var oldEnd = f.end;
							var endRowDiff = ff.endRow - f.endRow;

							
							// Update the start, end, endRow, and lineNumber of all functions below the one just parsed, or parents of it.
							// Have to go though all functions (recursive) because we can't asume our named array is sorted
							
							updateThingsFunctions(oldParse.functions, oldEnd, endRowDiff, charactersLength);
							
							// Update the parsed function.
							f.variables = ff.variables;
							f.subFunctions = ff.subFunctions;
							f.end = ff.end;
							f.endRow = ff.endRow;
							
							console.timeEnd("parseOnlyFunctionOptimizer");
							
							if(editor.settings.devMode && newParse.blockMatch) {
								
								// Make a full parse and compare to see if there are any bugs
								
								var fullParse = parseJavaScript(file, {noIndention: true});
								
								if(fullParse.comments.length != oldParse.comments.length) throw new Error("fullParse.comments.length=" + fullParse.comments.length + " oldParse.comments.length=" + oldParse.comments.length + " ");
								if(fullParse.quotes.length != oldParse.quotes.length) throw new Error("fullParse.quotes.length=" + fullParse.quotes.length + " oldParse.quotes.length=" + oldParse.quotes.length + " ");
								if(fullParse.xmlTags.length != oldParse.xmlTags.length) throw new Error("fullParse.xmlTags.length=" + fullParse.xmlTags.length + " oldParse.xmlTags.length=" + oldParse.xmlTags.length + " ");
								
								if(Object.keys(fullParse.functions).length != Object.keys(oldParse.functions).length) throw new Error("fullParse.functions=" + Object.keys(fullParse.functions).length + " oldParse.functions=" + Object.keys(oldParse.functions).length + " ");
								if(Object.keys(fullParse.globalVariables).length != Object.keys(oldParse.globalVariables).length) throw new Error("fullParse.globalVariables=" + Object.keys(fullParse.globalVariables).length + " oldParse.globalVariables=" + Object.keys(oldParse.globalVariables).length + " ");
								
								if(fullParse.blockMatch != oldParse.blockMatch) throw new Error("Not the same: fullParse.blockMatch=" + fullParse.blockMatch  + " oldParse.blockMatch=" + oldParse.blockMatch);
								
								// Deep compare
								
							}
							
							
							file.haveParsed(oldParse);
							
							return;
						}
						else {
							console.log("f.end=" + f.end + " - f.start=" + f.start + " < maxFunctionBodySize=" + maxFunctionBodySize + " file.text.charAt(" + (f.end + charactersLength) + ")=" + lbChars(file.text.charAt(f.end + charactersLength)));
						}
					}
					else {
						console.log("Not inside any function!");
					}
				}
				else {
					console.log("oldParse.blockMatch=" + oldParse.blockMatch);
				}
			}
			else {
				console.log((file.parsed ? "file was parsed before" : "file was NOT parsed before") + " type=" + type);
			}
			
			// Parse the while file
			console.log("Parsing whole file");
			var newParse = parseJavaScript(file);
			
			// Sanity check (we had some problems with functions having bad start and end, witch need to be correct for the "parse only current function" optimizer)
			if(editor.settings.devMode && newParse.blockMatch) {
				console.log("Checking checkFunctionStartEnd");
				try {
					checkFunctionStartEnd(file, newParse.functions);
				}
				catch(err) {
					console.log(JSON.stringify(newParse));
					throw err;
				}
			}
			
			file.haveParsed(newParse);
			
			
			
		}
		else {
			// File should not be parsed
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
		
		function updateThingsFunctions(functions, oldEnd, endRowDiff, charactersLength) {
			// Will update start or end positions of all functions below oldEnd or parent functions
			
			var func;
			
			var isBelow = false;
			var isParent = false;
			
			for(var fname in functions) {
				func = functions[fname];
				
				isBelow = (func.start > oldEnd);
				isParent = (func.end > oldEnd && func.start < oldEnd);
				
				console.log("func " + func.name + " start=" + func.start + " end=" + func.end + " isBelow=" + isBelow + " isParent=" + isParent + " oldEnd=" + oldEnd);
				
				if(isBelow || isParent) updateThingsFunctions(func.subFunctions, oldEnd, endRowDiff, charactersLength); // Check/Update subfunctions
				
				if(isBelow) {
					console.log("func " + func.name + " start=" + func.start + " below old end=" + oldEnd);
					
					func.start += charactersLength;
					func.end += charactersLength;
					func.lineNumber += endRowDiff;
					func.endRow += endRowDiff;
				}
				else if(isParent) {
					console.log("func " + func.name + " end=" + func.end + " below oldEnd=" + oldEnd + " and start=" + func.start + " before. Adding " + charactersLength + " to end.");
					
					func.end += charactersLength;
					func.endRow += endRowDiff;
				}
				
				if(isBelow || isParent) {
					console.log("Checking func=" + func.name + " ... start=" + func.start + " (" + lbChars(file.text.charAt(func.start)) + ") end=" + func.end + " (" + lbChars(file.text.charAt(func.end)) + ")");
					// Make sure the function starts with an { and ends with an }
					if(file.text.charAt(func.start) != "{") {
						file.debugGrid();
						throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + lbChars(file.text.charAt(func.start)) + " to be a {");
					}
					
					if(file.text.charAt(func.end) != "}") {
						file.debugGrid();
						throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + lbChars(file.text.charAt(func.end)) + " to be a }");
					}
				}
			}
		}
		
		function insideFunction(functions, caretIndex, parent, charactersLength) {
			// Check if inside a function
			// Returns the function, or false
			var f, s;
			for(var name in functions) {
				f = functions[name];
				if(f.start < caretIndex && f.end >= caretIndex) {
					// Deleted text are now allowed to be larger then the function body
					if(charactersLength > 0 || (charactersLength < 0 && (f.end-f.start) > Math.abs(charactersLength) )) {
						console.log("Found function=" + f.name);
						// Check sub functions
						return insideFunction(f.subFunctions, caretIndex, f, charactersLength);
					}
				}
			}
			return parent;
		}
		
		function firstValueInObjectList(obj) {
			for(var id in obj) {
				return id;
			}
			console.log(JSON.stringify(obj));
			throw new Error("Object list is emty! " + JSON.stringify(obj));
		}
		
		function sortyByStart(a, b) {
			return a.start - b.start;
		}
		
	}
	
	
	function checkFunctionStartEnd(file, functions) {
		// Check all functions to make sure they start and end with { and }
		var func;
		for(var fname in functions) {
			func = functions[fname];
			
			// Make sure the function starts with an { and ends with an }
			if(file.text.charAt(func.start) != "{") {
				file.debugGrid();
				throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + lbChars(file.text.charAt(func.start)) + " to be a {");
			}
			
			if(file.text.charAt(func.end) != "}") {
				file.debugGrid();
				throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + lbChars(file.text.charAt(func.end)) + " to be a }");
			}
			
			console.log(func.name + " OK");
						
			checkFunctionStartEnd(file, func.subFunctions); // Check subfunctions

		}
		
	}
	

	function isNumeric(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}
	
	function parseJavaScript(file, options) {
		
		console.time("parseJavaScript");
		
		if(options == undefined) options = {};
		
		var parseStart = options.start;
		var parseEnd = options.end;
		var baseIndentation = options.baseIndentation;
		var parseStartRow = options.startRow;
		var indentate = options.noIndention ? false : true;
		
		if(baseIndentation == undefined) baseIndentation = 0;
		if(parseStartRow == undefined) parseStartRow = 0;
		
		var text = file.text,
		originalBaseIndentation = baseIndentation,
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
			newFunc,
			properties,
			variable,
			startIndex = 0,
			comments = [],
			quotes = [],
			quoteStart = 0,
			commentStart = 0,
			commentStartIndentation = 0,
			codeBlockDepth = 0,
			codeBlockDepthTemp = 0,
			rootWord = "",
			row = parseStartRow,
			lineNumber = 1,
			word = "",
			words = [],
			lastWord = "",
			insideVariableDeclaration = [],
			lastVariableDeclarationLine = 0,
			globalVariables = {},
			codeBlock = [{word: "", indentation: 0, line: 0}],
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
			arrayStartRow = 0,
			arrayItemCount = [],
			insideParenthesis = [],
			parenthesisStart = [],
			leftSide = "",
			rightSide = "",
			insideComment = false,
			xmlTagStart = -1, 
			xmlTags = [],
			xmlTagWordLength = 0,
			xmlTagSelfEnding = false,
			openXmlTags = 0,
			xmlTagLastOpenRow = -1,
			xmlModeBeforeTag = false,
			xmlTagInsideQuote = false,
			insideScriptTag = false,
			llChar = "",
			lllChar = "",
			willBeJSON = false,
			insideRegExp = false,
			regExpStart = 0,
			insideRegExpBracket = false,
			column = 0,
			lnw = "", // Last Not Whitespace character
			pastChar0 = "",
		pastChar1 = "",
		pastChar2 = "",
		pastChar3 = "",
		pastChar4 = "",
		pastChar5 = "",
		pastChar6 = "",
			xmlMode = false,
		xmlModeBeforeScript = false,
			textLength = text.length,
			foundVariableInVariableDeclaration = false, // Why did I add this? Comments damnit!!!
		lastLineBreakCharacter = file.lineBreak.length > 1 ? file.lineBreak.charAt(file.lineBreak.length-1) : file.lineBreak.charAt(0),
		vbScript = false,
		language = "JavaScript", // Update the language to vbScript, PHP depending on ... ?
		ASP = false,
		PHP = false,
		CSS = false,
		SSJS = false;
			
		// -----
		
		
		// ### vbScript variables
		var firstLineBreakCharacter = file.lineBreak.length > 1 ? file.lineBreak.charAt(0) : file.lineBreak;
		var vb_insideCondition = false;
		var vb_afterThen = false;
		var vb_thisRowIndentation = 0;
		var vb_nextRowIndentation = false;
		var vb_afterIf = false;
		var vb_insideFor = 0;
		
		//console.log("file.fileExtension=" + file.fileExtension);
		if((file.fileExtension == "htm" || 
		file.fileExtension == "html" || 
		file.fileExtension == "asp" || 
		file.fileExtension == "php" || 
		file.fileExtension == "xml") 
		&& parseStart == undefined) xmlMode = true; // Start in xml mode
		
		
		if(file.fileExtension == "vbs" || file.fileExtension == "vb") vbScript = true;
		
		xmlModeBeforeTag = xmlMode;
		xmlModeBeforeScript = xmlMode;
		
		insideFunctionBody[subCount] = false;
		L[subCount] = 1; // { Asume open
		R[subCount] = 0; // }

		
		insideVariableDeclaration[0] = false;
		
		afterPointer[0] = false;
		insideArray[0] = false;
		
		
		if(parseStart == undefined) parseStart = 0;
		if(parseEnd == undefined) parseEnd = textLength;
		
		// Look for function(a, b, c) { ... } not inside ' or "
		
		for(var i=parseStart; i<parseEnd; i++) {
			checkCharacter(i)
		}
		
		console.timeEnd("parseJavaScript");
		
		
		//console.log("words:" + JSON.stringify(words, null, 2));
		//console.log("globalVariables:" + JSON.stringify(globalVariables, null, 2));
		//console.log("functions:" + JSON.stringify(functions, null, 2));
		//console.log("comments:" + JSON.stringify(comments, null, 2));
		
		
		return {
			language: language, 
			functions: functions, 
			quotes: quotes,
			comments: comments, 
			globalVariables: globalVariables, 
			codeBlockLeft: codeBlockLeft, 
			codeBlockRight: codeBlockRight, 
			blockMatch: (codeBlockLeft - codeBlockRight) === 0, 
			xmlTags: xmlTags
		};
		
		//console.log(JSON.stringify(functions, null, 4));
		
		
		function codeBlockL() {
			
			/*
				Entered a new codeblock {
				The character is always a {
			*/
			
			var parentCodeBlock = codeBlock[codeBlockDepth];
			
			codeBlockDepth++;
			codeBlockLeft++;
			codeBlockLeftRow = row;
			
			//console.log("new codeBlock(" +codeBlockDepth + ") word=" + lastWord + " (line=" + lineNumber + ")");
			
			if(parentCodeBlock.indentation < 0) throw new Error("Line:" + lineNumber + " parentCodeBlock.indentation=" + parentCodeBlock.indentation);
			
			codeBlock[codeBlockDepth] = {word: lastWord, indentation: parentCodeBlock.indentation+1, line: lineNumber};
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
			
			if(codeBlockDepth == 0) throw new Error("codeBlockDepth can not be zero")
			
			insideVariableDeclaration[codeBlockDepth] = false;
			
			if(codeBlockDepth > 1) {
				
				// why only on codeBlockDepth 2 and higher???
				var parentWord = parentCodeBlock.word;

				if(parentWord != "if" && parentWord != "for" && parentWord.charAt(0) !== "(") {
					codeBlock[codeBlockDepth].parent = parentCodeBlock;
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
			
			if(file.grid[row].indentation > 0 && codeBlockLeftRow != codeBlockRightRow && indentate) {
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
				
				var par = rightSide.indexOf("(");
				
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
					if(Object.hasOwnProperty.call(func.variables, variableName)) { // LOL: Objects can have hasOwnProperty as key, and it will no longer work
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
					if(Object.hasOwnProperty.call(globalVariables, variableName)) {
						variable = globalVariables[variableName];
					}
					// Look for function names
					else if(Object.hasOwnProperty.call(functions, variableName)) {
						//console.log("hmm? " + variableName + " is a function!");
						
						if(properties.length > 1) {
							if(!Object.hasOwnProperty.call(functions[properties[0]].variables, properties[1])) {
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
				if(!Object.hasOwnProperty.call(variable.keys, properties[i])) {
					variable.keys[properties[i]] = new Variable();
				}
				variable = variable.keys[properties[i]];
			}
			return variable;
		}
		
		function checkCharacter(charIndex) {
			
			var backSlash = String.fromCharCode(92); // this: \
			
			// Save a history of the last characters
			pastChar6 = pastChar5;
			pastChar5 = pastChar4;
			pastChar4 = pastChar3;
			pastChar3 = pastChar2;
			pastChar2 = pastChar1;
			pastChar1 = pastChar0;
			
			pastChar0 = char;
			
			lllChar = llChar;
			llChar = lastChar;
			lastChar = char;
			
			
			if(char != " " && char != "\t" && char != "\r" && char != "\n") lnw = char; // Last non whitespace character
			
			//char = text.charAt(charIndex);
			char = text[charIndex];
			
			column++;
			

			
			
			// ### Quotes and comments ...
			
			/*
				kjjkj
				
			*/
			
			//console.log("insideLineComment="+ insideLineComment);
			
			// We can not have /* after a lineComment, it will do nothing
			
			// ### HTML Comments: <!-- -->
			//if(char == "-" && lastChar == "-" && llChar == "!") console.log("lllChar=" + lllChar + " insideLineComment=" + insideLineComment + " insideDblQuote=" + insideDblQuote + " insideSingleQuote=" + insideSingleQuote + " insideBlockComment=" + insideBlockComment + " insideHTMLComment=" + insideHTMLComment + " insideRegExp=" + insideRegExp);
			if(!insideScriptTag && char == "-" && lastChar == "-" && llChar == "!" && lllChar == "<" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideRegExp && !CSS) { // <!--
				insideHTMLComment = true;
				insideXmlTag = false;
				xmlMode = xmlModeBeforeTag;
				commentStart = i-4;
			}
			else if(!insideScriptTag && char == ">" && lastChar == "-" && llChar == "-" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && insideHTMLComment && !insideRegExp) { // -->
				insideHTMLComment = false;
				comments.push(new Comment(commentStart, i));
				//console.warn("Found HTML comment! line=" + lineNumber + " ");
			}
			
			if(!xmlMode) {
				
				
				/*
					### RegExp strings
					
					Anything between / and / not escaped by \
					
					note: / insde a bracket doesn't have to be escaped!
					
					RegExp or block comment!? RegExp can not start with *!
					
					RegExp or division!?  
					For example, (, [, {, ;, and all of the binary operators can only be followed by a regexp. 
					Likewise, ), ], }, identifiers, and string/number literals can only be followed by a division sign.
					http://stackoverflow.com/questions/4726295/division-regexp-conflict-while-tokenizing-javascript
					
				*/
				if(char == "/" 
				&& (lnw=="=" || lnw=="(" || lnw=="[" || lnw=="{" || lnw==";" || lnw=="&" || lnw=="|" || lnw=="^" || lnw=="~" || lnw=="<" || lnw==">" || lnw=="") 
				&& !insideRegExp && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideXmlTag && !CSS) {
					
					insideRegExp = true;
					regExpStart = i;
					//console.log("RegExp: line=" + lineNumber + " column=" + column);
				}
				else if(insideRegExp && char == "[" && lastChar != "\\") {
					insideRegExpBracket = true;
				}
				else if(insideRegExp && char == "]" && lastChar != "\\") {
					insideRegExpBracket = false;
				}
				else if(insideRegExp && char == "/" && !insideRegExpBracket && (lastChar != backSlash || (llChar == backSlash && lastChar == backSlash)) ) {
					insideRegExp = false;
					//console.log("Exit regexp: line:" + lineNumber + " col:" + column + " regexContentLength=" + (i - regExpStart) + " insideRegExp=" + insideRegExp + " typeof=" + typeof insideRegExp);
					if((i - regExpStart) > 1) return; // Do not return if we see a // line comment (regExp with zero content)
				}
				
				// ### Comments: //
				if(char == "/" && lastChar == "/" && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideLineComment  && !insideHTMLComment && !insideRegExp && !CSS) {
					insideLineComment = true;
					commentStart = i-1;
					//console.log("insideLineComment!");
				}
				else if(char == "\n" && insideLineComment) {
					insideLineComment = false;
					comments.push(new Comment(commentStart, i));
					//console.log("Found line comment: " +  text.substring(commentStart, i))
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
					if(file.grid[row].indentation > 0 && indentate) {
						// Set same indentation as the start of the comment
						file.grid[row].indentation = commentStartIndentation;
					}
					
					return;
				}
				
				// ### Quotes: double
				// JavaScript can not escape quotes outside of strings! So no need for  && lastChar != "\\"
				else if(char === '"' && !insideLineComment && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideRegExp) {
					if(insideDblQuote) {
						if(lastChar != backSlash || (lastChar == backSlash && llChar == backSlash || vbScript)) {				
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
				else if(!vbScript && char === "'" && !insideDblQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment && !insideRegExp) {
					if(insideSingleQuote) {
						if(lastChar != backSlash || (lastChar == backSlash && llChar == backSlash)) {	
							insideSingleQuote = false;
							quotes.push(new Quote(quoteStart, i));
							return;
						}
					}
					else {
						insideSingleQuote = true;
						quoteStart = i;
						//console.log("insideSingleQuote!");
					}
				}
				
				// ### Single quote is a comment in vbScript
				else if(vbScript && char == "'" && !insideDblQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment) {
					insideLineComment = true;
					commentStart = i-1;
				}
				else if(vbScript && char == "\n" && insideLineComment) {
					insideLineComment = false;
					comments.push(new Comment(commentStart, i));
				}
				
				
			}
			
			insideQuote = insideDblQuote || insideSingleQuote;
			insideComment = insideLineComment || insideBlockComment || insideHTMLComment;
			
			//console.log("char(" + i + ")=" + char + "  " + insideQuote + " " + insideComment);
			
			
			if(!insideComment && !insideQuote) {
				
				
				// ### PHP script tags <?php ?>
				if(file.fileExtension == "php") {
					if(pastChar3 == "<" &&  pastChar2 == "?" &&  pastChar1 == "p" &&  pastChar0 == "h" && char == "p") { // <?php
						PHP = true;
						language = "PHP";
						xmlMode = false;
						insideXmlTag = false;
					}
					else if(pastChar0 == "?" && char == ">" && PHP) { // ?>
						PHP = false;
						xmlMode = true;
					}
				}
				
				/*
					### ASP script tags
					<%
					...
					%>
					
				*/
				if(file.fileExtension == "asp" || file.fileExtension == "html" || file.fileExtension == "htm" || file.fileExtension == "inc") {
					if(pastChar0 == "<" && char == "%") { // <%
						ASP = true;
						// Is it vbScript?
						//if(file.text.match(/^end if$|^end sub$|^end function$|^end class$|^dim /im) != null) return true;
						// It's also possible to write classic ASP in JavaScript, but asume it's vbScript for now
						vbScript = true;
						language = "VBScript";
						xmlMode = false;
						insideXmlTag = false;
						
						//console.log("ASP start here line=" + lineNumber);
					}
					else if(pastChar0 == "%" && char == ">" && ASP) { // %>
						ASP = false;
						vbScript = false;
						xmlMode = true;
						
						//console.log("ASP Ends here line=" + lineNumber);
					}
				}
				
				// ### Server side JS script tag
				if(file.fileExtension == "xml" || file.fileExtension == "html" || file.fileExtension == "htm") {
					if(pastChar2 == "<" &&  pastChar1 == "?" &&  pastChar0 == "J" && char == "S") { // <?JS
						SSJS = true;
						xmlMode = false;
						insideXmlTag = false;
					}
					else if(pastChar0 == "?" && char == ">" && SSJS) { // ?>
						SSJS = false;
						xmlMode = true;
					}
				}
				
				
				
			}
			
			
			
			
			if(!insideComment) {
				/*
					### Find xml-tags.
					
					Look out for if( x < y) and bitwise operations >> <<
					and array of strings: "<", ">",
					
					PS: We are Not inside an HTML comment until the parser finds the last - in <!--
				*/
				if(insideXmlTag && pastChar0 == "<" && char == "/") {
					// Ending tag: </foo>
					insideXmlTagEnding = true;
				}
				else if(char == "<" && !insideParenthesis[codeBlockDepth] && (xmlMode || insideQuote)) {
					insideXmlTag = true;
					
					if(insideQuote) xmlTagInsideQuote = true;
					
					xmlTagSelfEnding = false;
					xmlTagStart = i;
					if(!insideXmlTagEnding) {
						xmlModeBeforeTag = xmlMode; // xmlMode when the tag starts
						xmlMode = false;
					}
					if(insideHTMLComment) throw new Error("WTF");
				}
				
				else if(pastChar3 == "<" && pastChar2 == "h" && pastChar1 == "t" && pastChar0 == "m" && char == "l" && !insideQuote) {
					xmlModeBeforeTag = true; // Turn on HTML mode if we find a html tag
					insideXmlTag = true;
					xmlTagStart = i-4;
				}
				// Exit out of style
				else if(CSS && pastChar5 == "<" && pastChar4 == "/" && pastChar3 == "s" && pastChar2 == "t" && pastChar1 == "y" && pastChar0 == "l" && char == "e") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-6;
					insideXmlTagEnding = true;
					insideRegExp = false;
					// CSS=false is set below ... (scroll down)
				}
				// Exit out of script
				else if(insideScriptTag && pastChar6 == "<" && pastChar5 == "/" && pastChar4 == "s" && pastChar3 == "c" && pastChar2 == "r" && pastChar1 == "i" && pastChar0 == "p" && char == "t") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-7;
					insideXmlTagEnding = true;
					insideRegExp = false;
				}
				// Exit out of pre
				else if(insideScriptTag && pastChar3 == "<" && pastChar2 == "/" && pastChar1 == "p" && pastChar0 == "r" && char == "e") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-4;
					insideXmlTagEnding = true;
					insideRegExp = false;
				}
				else if(char == " " && insideXmlTag && xmlTagWordLength === 0) {
					xmlTagWordLength = i - xmlTagStart;
				}
				else if(char == ">" && insideXmlTag && !insideParenthesis[codeBlockDepth]) {
					if(pastChar0 == "/") {
						xmlTagSelfEnding = true; // Self ending xml tag: <foo />
					}
					
					if(xmlTagWordLength === 0) xmlTagWordLength = i - xmlTagStart;
					xmlTag = text.substr(xmlTagStart + 1 + insideXmlTagEnding, xmlTagWordLength - 1 - insideXmlTagEnding);
					xmlTags.push(new XmlTag(xmlTagStart, i, xmlTagWordLength, xmlTagSelfEnding) );
					
					xmlMode = xmlModeBeforeTag; // Set the xmlMode we had when the tag started
					
					//console.log("xmlTag=" + xmlTag);
					
					if(xmlTag.toLowerCase() == "script" || xmlTag.toLowerCase() == "pre") {
						
						//console.log(xmlTag);
						
						if(insideXmlTagEnding) {
							// Use default xmlMode after script tag ended
							xmlMode = xmlModeBeforeScript;
							insideScriptTag = false;
						}
						else { // Tag start
							// We are <script HERE>
							xmlModeBeforeScript = xmlMode; // xmlMode;
							xmlMode = false;
							insideScriptTag = true;
						}
					}
					else if(xmlTag.toLowerCase() == "style") {
						
						if(insideXmlTagEnding) { // Tag end
							CSS = false;
							xmlMode = xmlModeBeforeScript;
						}
						else { // Tag start
							CSS = true;
							xmlModeBeforeScript = xmlMode; // Reuse this varibale :P 
							xmlMode = false;
						}

					}
					
					if(tagBreak.indexOf(xmlTag) > -1 && !insideQuote) {
						
						//console.log("tag=" + tag + " lastXmlTag=" + lastXmlTag);
						
						if(insideXmlTagEnding) {
							// It's a ending tag </tag>
							openXmlTags--;
							if(xmlTagLastOpenRow != row && file.grid[row].indentation > 0 && indentate) file.grid[row].indentation--;
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
			
			//console.log("Line " + lineNumber + " column=" + column + " char=" + char + " CSS=" + CSS + " xmlMode=" + xmlMode + " xmlModeBeforeTag=" + xmlModeBeforeTag + " xmlModeBeforeScript=" + xmlModeBeforeScript + " insideXmlTag=" + insideXmlTag + " lastXmlTag=" + lastXmlTag + " insideScriptTag=" + insideScriptTag + " insideHTMLComment=" + insideHTMLComment + " insideRegExp=" + insideRegExp);
			
			if(codeBlockLeft == codeBlockRight) {
				insideCodeBlock = false;
			} 
			else {
				insideCodeBlock = true;
			}

			if(!insideQuote && !insideComment && !xmlMode && !vbScript && !PHP && !CSS && !insideRegExp) {
				
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
					variableName = "";
					
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
					
					codeBlock[codeBlockDepth].indentation++;
					
					arrayStartRow = row;
					
				}
				else if(char == "]") {
					//console.log("End of array=" + insideArray[codeBlockDepth] + " word=" + word + " lastWord=" + lastWord + " leftSide=" + leftSide + " rightSide=" + rightSide + "");
					
					lastWord = insideArray[codeBlockDepth];
					
					word = text.substring(arrayStart[codeBlockDepth], i+1);
					
					insideArray[codeBlockDepth] = false;
					
					if(codeBlock[codeBlockDepth].indentation > 0) codeBlock[codeBlockDepth].indentation--;
					
					if(file.grid[row].indentation > 0 && arrayStartRow != row && indentate) file.grid[row].indentation--;				
					
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
							myFunction[subCount].endRow = row;

							
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
						
						console.log("function!? line=" + lineNumber + " char=" + i + " word=" + word + " lastWord=" + lastWord + " variableName=" + variableName + " functionName=" + functionName + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth]);
						// Sometimes you have var infront of function. 
						
						if(variableName != "" && lastWord != "") functionName = variableName;
						else functionName = lastWord || word.replace("(", "");
						
						if(functionName.indexOf("||") != -1) functionName = ""; // Fix: foo = baz || \n function ...
						
						if(functionName.indexOf("(") != -1) functionName = ""; // Fix for foo(bar(), function() {}); where functionName becomes= ()
						
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
						
						newFunc = new Func(functionName, functionArguments, i, lineNumber+parseStartRow, codeBlockLeft, codeBlockRight);
						
						//console.log("functionName=" + functionName + " type=" + typeof functionName);
						
						
						if(functionName === false) functionName = "unknownmeh"; // Why can functionName be a boolean (false) !???
						
						properties = functionName.split(".");
						

						//console.log("subCount=" + subCount);
						
						if(insideFunctionBody[subCount]) {
							//It's a sub-function
							
							myFunction[subCount].subFunctions[functionName] = newFunc;
							
							myFunction[subCount+1] = myFunction[subCount].subFunctions[functionName];
							
							subCount++; // Functions within this function's body will be sub-functions
							
							L[subCount] = 1;
							R[subCount] = 0;
							
							if(properties.length > 1) {
								if(Object.hasOwnProperty.call(myFunction[subCount-1].variables, properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									// Change the variable type to Method
									variable = myFunction[subCount-1].variables[properties[0]];
									startIndex = 1;
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
							if(Object.hasOwnProperty.call(globalVariables, functionName)) {
								delete globalVariables[functionName];
							}
							

							if(properties.length > 1) {
								if(Object.hasOwnProperty.call(functions, properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									// This is run after variables has been added.
									// Change the variable type to Method
									if(Object.hasOwnProperty.call(functions[properties[0]].variables, properties[1])) {
										
										variable = functions[properties[0]].variables[properties[1]];
										startIndex = 2;
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
			else if(vbScript) {
				// ## Parse vbScript
				// note: If it's ASP and JavaScript is should be all good
				
				//console.log("char=" + char.replace("\r", "<R>").replace("\n", "<N>") + " word=" + word + " insideDblQuote=" + insideDblQuote + " insideLineComment=" + insideLineComment + " LLC=" + (char == lastLineBreakCharacter) + " FLC=" + (char == firstLineBreakCharacter) + " firstLineBreakCharacter=" + firstLineBreakCharacter.replace("\r", "<R>").replace("\n", "<N>") + " insideVariableDeclaration[codeBlockDepth]=" + insideVariableDeclaration[codeBlockDepth]);
				
				//char = char.toLowerCase(); // vbScript is not case sensitive!
				
				if(!insideDblQuote && char.toLowerCase() == "m" && lastChar.toLowerCase() == "e" && llChar.toLowerCase() == "r") {
					insideLineComment = true;
					commentStart = i+1;
				}
				
				
				if(!insideDblQuote && !insideLineComment) {
					
					// ### Collect vbScript words
					
					if(char == "\r" || char == "\n" || char == "%" || char == " " || char == "\t" || char == ":" || char == ",") {
						
						// ### vbScript Variable declarations
						if(insideVariableDeclaration[codeBlockDepth] && (char == firstLineBreakCharacter || char == ":")) {
							variableName = word || lastWord;
							insideVariableDeclaration[codeBlockDepth] = false;
							if(variableName) globalVariables[variableName] = new Variable();
							console.log("LLBS New variable found=" + variableName + " line=" + lineNumber + " column=" + column);
						}
						else if(word == "dim") {
							insideVariableDeclaration[codeBlockDepth] = true;
							word = "";
							//console.log("DIM");
						}
						else if(word) {
							
							if(insideVariableDeclaration[codeBlockDepth]) {
								variableName = word || lastWord;
								if(variableName) globalVariables[variableName] = new Variable();
								//console.log("New variable found=" + variableName + " line=" + lineNumber + " column=" + column);
							}
							
							// ### IF .. THEN .. ELSE ..
							else if(word == "if" && lastWord == "end") { // END IF
								vb_thisRowIndentation--;
							}
							else if(word == "if") {
								vb_afterIf = true; // Inside single line if maybe!?
								vb_insideCondition = true;
								vb_nextRowIndentation = 1; 
							}
							else if(word == "then" && vb_afterIf) {
								vb_afterThen = true; // If a word comes next; it's a single line if-statement
							}
							else if(vb_afterThen) {
								vb_afterThen = false;
								// This is a single line if-statement!
								vb_nextRowIndentation = 0; // Cancel out the indentation
								//console.log("vb_afterThen yo!");
							}
							else if(word == "else" && lastWord != "case") {
								vb_thisRowIndentation--;
								vb_nextRowIndentation = 1; 
							}
							else if(word == "elseif") {
								vb_insideCondition = true;
								vb_thisRowIndentation--;
								vb_nextRowIndentation = 1
							}
							
							// ### DO ... LOOP
							else if(word == "do") {
								vb_nextRowIndentation = 1;
								vb_insideCondition = true;
							}
							else if(word == "loop") {
								vb_thisRowIndentation--;
								vb_insideCondition = true;
							}
							
							// ### FOR ... NEXT
							else if(word == "for") {
								//console.log("for: vb_nextRowIndentation=" + vb_nextRowIndentation);
								vb_nextRowIndentation = 1;
								vb_insideFor++;
							}
							else if(word == "next" && vb_insideFor != 0) {
								vb_thisRowIndentation--;
								vb_insideFor--;
							}
							
							// ### CLASS ... END CLASS
							else if(word == "class" && lastWord == "end") {
								vb_thisRowIndentation--;
							}
							else if(word == "class") {
								vb_nextRowIndentation = 1;
							}
							
							// ### WHILE ... WEND
							else if(word == "while") {
								vb_nextRowIndentation = 1;
								vb_insideCondition = true;
							}
							else if(word == "wend") {
								vb_thisRowIndentation--;
							}
							
							/*
								Note: We will not support VB, just VBS!
								VB for example allows "end while" while you can only end with "wend" in VBS
							*/
							
							// ### SELECT CASE ... END SELECT
							else if(word == "select" && lastWord == "end") {
								vb_thisRowIndentation--;
							}
							else if(word == "case" && lastWord == "select") {
								vb_nextRowIndentation = 1;
							}
							
							// ### CASE
							else if(word == "case") {
								vb_nextRowIndentation = 1;
								//if(haveCase) vb_thisRowIndentation--;
								vb_thisRowIndentation--;
							}
							
							
							// ### FUNCTION ... END FUNCTION
							else if(word == "function" && lastWord == "end") {
								vb_thisRowIndentation--;
							}							
							else if(word == "function") {
								vb_nextRowIndentation = 1;
							}

							
							// ### SUB ... END SUB
							else if(word == "sub" && lastWord == "end") {
								vb_thisRowIndentation--;
							}
							else if(word == "sub") {
								vb_nextRowIndentation = 1;
							}

														
							console.log("line=" + (lineNumber) + " word=" + word + " vb_thisRowIndentation=" + vb_thisRowIndentation + " vb_nextRowIndentation=" + vb_nextRowIndentation);
							
							lastWord = word || lastWord; // Prevent lastWord to change to emty
							word = "";
						}
						
					}
					else {
						
						if(insideVariableDeclaration[codeBlockDepth]) word += char // Keep case (for auto completion of variable names)
						else word += char.toLowerCase(); // Add to the word, vbScript is not case sensitive!
						
						//console.log("word++" + char);
						
					}
				}
				
			}
			else if(PHP) {
				// ## Parse PHP
				
				// PHP looks like C/JavaScript, so we can reuse some functons (for now)
				if(char == "{") {
					codeBlockL();
				}
				else if(char == "}") {
					codeBlockR();
				}
				
			}
			
			else if(CSS) {
				// ## Parse CSS
				
				if(char == "{") {
					codeBlockL();
				}
				else if(char == "}") {
					codeBlockR();
				}
				
			}
			
			
			
			if( (char == "\r" || char=="\n") && insideVariableDeclaration[codeBlockDepth] && !(pastChar0 == "," || pastChar1 == "," || pastChar2 == ",") ) {
				// A new line without , exits variable declaration
				insideVariableDeclaration[codeBlockDepth] = false;
				foundVariableInVariableDeclaration = false;
				variableName = "";
				
				//console.log("pastChar=" + JSON.stringify(pastChar) + " char=" + char + " ? " +  (pastChar0 == "," || pastChar1 == "," || pastChar2 == ",") );
				
				if(insideXmlTag && xmlTagInsideQuote && !insideQuote) insideXmlTag = false;
				
			}
			
			if(char == lastLineBreakCharacter) {
				// ## Line breaks
				

					
				// Set indentation on CURRENT row
				
				//console.log("Adding indentation to line=" + lineNumber + " : " + vb_thisRowIndentation);

				// If we are still inside a quote, and the line break was not preceded with a backslash: ignore the quote
				if((insideSingleQuote || insideDblQuote) && lnw != "\\") {
					console.warn("Line " + lineNumber + ": Unclosed quote!");
					insideDblQuote = false;
					insideSingleQuote = false;
				}
				
				// We can not have multi line regexp
				if(insideRegExp) {
					console.warn("Line " + lineNumber + ": Lonely slash!"); // NodeJS says: Invalid regular expression: missing /
					insideRegExp = false;
				}
				
				vb_afterThen = false;
				
				vb_insideCondition = false;
				
				//console.log("--- new line=" + (row) + " vb_thisRowIndentation=" + vb_thisRowIndentation + " ---");
				if(indentate) file.grid[row].indentation = Math.max(0, file.grid[row].indentation + vb_thisRowIndentation);

				if(vb_nextRowIndentation == 1) {
					vb_thisRowIndentation++;
					vb_nextRowIndentation = 0;
				}
				
				// Sets indentation on NEXT row
				
				lineNumber++;
				row++;
				column = 0;
				
				//console.log("(Indent) codeBlockDepth=" + codeBlockDepth + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]  + " insideBlockComment=" + insideBlockComment + " line:" + lineNumber);
				
				//console.log("Setting indentation on line=" + lineNumber + " : " + Math.max(0, codeBlock[codeBlockDepth].indentation + insideBlockComment + openXmlTags + baseIndentation));
				
				if(!file.grid[row]) throw new Error("Grid row=" + row + " does not exist!");
				
				if(indentate) file.grid[row].indentation = Math.max(0, codeBlock[codeBlockDepth].indentation + insideBlockComment + openXmlTags + baseIndentation);
				
				
				
				//console.warn("Line=" + lineNumber + " file.grid[" + row + "].indentation=" + file.grid[row].indentation + " insideBlockComment=" + insideBlockComment + " codeBlock[" + codeBlockDepth + "].indentation=" + codeBlock[codeBlockDepth].indentation + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]);
				//console.log("Row " + row);
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
				lastVariableDeclarationLine = lineNumber;
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
				//variableName = "Anonymous function";
				variableName = "";
				word = "";
				return;
			}
			else if(char == " " && word == "new") {
				word = "";
				return;
			}
			/*
				if(pastChar2 == "v" && pastChar1 == "a" && pastChar0 == "r") {

				}
				else if(pastChar1 == "i" && pastChar0 == "f") {
					word = "";
					return;
				}
				else if(pastChar3 == "e" && pastChar2 == "l" && pastChar1 == "s" && pastChar0 == "e") {
					word = "";
					return;
				}
				else if(pastChar2 == "n" && pastChar1 == "e" && pastChar0 == "w") {
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
										
										
										codeBlockDepthTemp = codeBlockDepth;
										
										while(codeBlock[codeBlockDepthTemp].parent) {
											codeBlockDepthTemp--;
										}
										rootWord = codeBlock[codeBlockDepthTemp].word;
										
										//console.log("Inside function=" + insideFunctionBody[subCount].name + " word=" + word + " rootWord=" + rootWord + "");
										
										
										if(!Object.hasOwnProperty.call(myFunction[subCount].variables, rootWord)) {
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
		func.endRow = -1;
		
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
	
	function reIndexOf(reIn, str, startIndex) {
		var re = new RegExp(reIn.source, 'g' + (reIn.ignoreCase ? 'i' : '') + (reIn.multiLine ? 'm' : ''));
		re.lastIndex = startIndex || 0;
		var res = re.exec(str);
		if(!res) return -1;
		return re.lastIndex - res[0].length;
	};
	
	function reLastIndexOf(reIn, str, startIndex) {
		var src = /\$$/.test(reIn.source) && !/\\\$$/.test(reIn.source) ? reIn.source : reIn.source + '(?![\\S\\s]*' + reIn.source + ')';
		var re = new RegExp(src, 'g' + (reIn.ignoreCase ? 'i' : '') + (reIn.multiLine ? 'm' : ''));
		re.lastIndex = startIndex || 0;
		var res = re.exec(str);
		if(!res) return -1;
		return re.lastIndex - res[0].length;
	};
	
	
})();