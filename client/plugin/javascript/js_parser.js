(function() {
	
	/*

		warning: There be dragons!
		
		This file parses javascript and returns an object with the following objects:
			functions
			quotes
			comments
			globalVariables
			blockMatch = true|false (if there are as many { as there are }
			xmlTags
		
		It also updates the indentation property on the grid rows!!
	
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
		
		
		Try next: Loading and saving to memory is expensive, use bitvise operation to avoid memory access when reading a variable:
		read: https://reaktor.com/blog/javascript-performance-fundamentals-make-bluebird-fast/
		inside A=1: inside & 1 != 0
		set inside A=1 to true: inside = inside | 1         OR
		set insde A=1 to false: inside = inside & (~1)      AND NOT
		
		
		
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
		foo(
		bar(
		baz(done)));
	*/

	"use strict";
	
	EDITOR.plugin({
		desc: "Parse JavaScript etc",
		order: 100,
		load:function jsParserMain() {
			
		EDITOR.on("fileOpen", onFileOpen);
		EDITOR.on("fileChange", parseJsOnChange, 100);

	},
		unload: function unloadJsParser() {
			
			EDITOR.removeEvent("fileOpen", onFileOpen);
			EDITOR.removeEvent("fileChange", parseJsOnChange);
			
		}
	});
	
	
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

	
	function isWhiteSpace(char) {
		return char == "" || char == " " || char == "\t" || char == "\r" || char == "\n";
	}
	
	function parseJsOnChange(file, type, characters, caretIndex, row, col) {
		/*
			### Parse only function optimizer
			
			type: "delete", "linebreak", "insert", "text", deleteTextRange, deleteCharacter, reload, removeRow
		*/
		
		if(shouldParse(file)) { // If the file should be parsed or not
			
			if(file.parsed && (type=="delete" || type == "linebreak" || type == "insert" || type == "text" || type == "deleteTextRange" || type == "deleteCharacter" || type == "removeRow")) { // If the file was parsed before
				
				//console.log("type=" + type + " characters=" + characters);
				
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
					
					if(type == "delete" || type == "deleteTextRange" || type == "deleteCharacter" || type == "removeRow") {
						charactersLength = -charactersLength;
					}
					
					//console.log("charactersLength=" + charactersLength);
					
					var functions = oldParse.functions;
					//console.log(JSON.stringify(functions));
					
					var f = insideFunction(functions, caretIndex, false, charactersLength);
					// We will not bother with arrow functions for now (will need slow regex to know where to begin parsing)
					
					// This optimization has about 15% overhead in large files. So skip it if the function size is larger then 80% of the file
					var maxFunctionBodySize = Math.round(file.text.length * 0.8);
										
					
					if(f) { // Parse only that function
						//console.log("Inside " + f.name);
						if( ((f.end - f.start) < maxFunctionBodySize || EDITOR.devMode) && file.text.charAt(f.end + charactersLength) == "}") { // If the function is not the majority of the file
							
							console.time("parseOnlyFunctionOptimizer");
							
							//console.log("change type=" + type);
							
							//console.log("Parsing only function name=" + f.name + " line=" + f.lineNumber + " endRow=" + f.endRow);
							
							
							// The start property is at the { after function
							// We need to start parsing at the function declaration so that the parser will find it
							var parseEnd = f.end + charactersLength + 1;
							var parseStartRow = f.lineNumber-1;
							var baseIndentation = file.grid[parseStartRow].indentation;
							var oldStart = f.start;
							var oldEnd = f.end;

							// Try to find the function declaration
							var gridRowStartIndex = file.grid[parseStartRow].startIndex;
							// Prevent from searching too far
							var funcDecText = file.text.substring(gridRowStartIndex, f.start);

							//console.log("funcDecText=" + funcDecText);

							var parseStart = funcDecText.lastIndexOf("function" + (f.name.length > 0 ? " " + f.name : "") + "(", f.start); // Search backwards in file.text starting from f.start

							
							// I do not trust reLastIndexOf ...
							
							if(parseStart == -1) {

								var arrParseStart = [];

								arrParseStart.push(funcDecText.lastIndexOf("function " + f.name + " (", f.start));
								
								
								// Fix for: foo = function() and foo = function foo()
								arrParseStart.push(funcDecText.lastIndexOf(f.name + " = function", f.start));
								arrParseStart.push(funcDecText.lastIndexOf(f.name + "=function", f.start));
								
								
								// Find foo: function foo()
								arrParseStart.push(funcDecText.lastIndexOf(f.name + ": function", f.start));
								arrParseStart.push(funcDecText.lastIndexOf(f.name + " : function", f.start));


								//console.time("hmm"); // These used to be slow
								//if(parseStart == -1) parseStart = UTIL.reLastIndexOf(new RegExp("function\\s" + f.name + "\\s" + "(", "m"), file.text, f.start, f.end);
								arrParseStart.push(UTIL.reLastIndexOf(new RegExp(f.name + "\\s*:\\s*function"), funcDecText));
								arrParseStart.push(UTIL.reLastIndexOf(new RegExp(f.name + "\\s*=\\s*function"), funcDecText));
								//console.timeEnd("hmm");

								// Anonymous functions
								arrParseStart.push(funcDecText.lastIndexOf("function", f.start));

								// Pick the location closest to the function body
								arrParseStart.sort(function sortNumber(a,b) {
								    return a - b;
								});

								parseStart = arrParseStart[arrParseStart.length-1];

							}
							
							if(parseStart == -1) throw new Error("Unable to find start of function=*" + f.name + "* f.start=" + f.start + " parseStart=" + parseStart + "\n" + file.text.substr(Math.max(0, f.start-15), 15));
							// function names can include the string "function" ex: function function_function ( )  {
							// Make a full parse instead of throwing an error when not in dev mode !?
							
							//console.log("parseStart=" + parseStart);

							parseStart = parseStart + gridRowStartIndex;
						
							
							//console.log("characters=" + UTIL.lbChars(characters));
							//console.log("parseStartRow=" + parseStartRow + " baseIndentation=" + baseIndentation + " charactersLength=" + charactersLength + " parseStart=" + parseStart + " parseEnd=" + parseEnd);
							
							//console.log("Gonna parse text=\n" + file.text.substring(parseStart, parseEnd));
							
							//console.log("Gonna parse text=\n" + UTIL.lbChars(file.text.substring(parseStart, parseEnd)));
							
							if(file.text.charAt(parseEnd-1) != "}") {
								file.debugGrid();
								throw new Error("Expected parseEnd-1 = " + (parseEnd-1) + " character=" + UTIL.lbChars(file.text.charAt(parseEnd-1)) + " to be an }");
							}
							
							//console.log(file.text.substring(parseStart, parseEnd));
							
							var newParse = parseJavaScript(file, {start: parseStart, end: parseEnd, baseIndentation: baseIndentation, startRow: parseStartRow, jsMode: true});
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
							
							//console.log("quotes: spliceStart=" + spliceStart + " spliceLen=" + spliceLen + " length=" + oldParse.quotes.length);
							
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
							//console.log("newParse.quotes.length=" + newParse.quotes.length + " oldParse.quotes.length=" + oldParse.quotes.length);
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
							
							//console.log("comments: spliceStart=" + spliceStart + " spliceLen=" + spliceLen + " length=" + oldParse.comments.length);
							
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
							//console.log("newParse.comments.length=" + newParse.comments.length);
							//console.log("oldParse.comments.length=" + oldParse.comments.length);
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
							
							// Update or add any global variables
							for(var varName in newParse.globalVariables) {
								oldParse[varName] = newParse.globalVariables[varName];
							}
							
							//console.log("globalVariables=" + JSON.stringify(newParse.globalVariables));						
							
							// Update blockMatch
							// Curly brackets inside a function always match!
							//console.log("oldParse.codeBlockLeft=" + oldParse.codeBlockLeft);
							//console.log("newParse.codeBlockLeft=" + newParse.codeBlockLeft);
							//console.log("oldParse.codeBlockRight=" + oldParse.codeBlockRight);
							//console.log("newParse.codeBlockRight=" + newParse.codeBlockRight);
							//console.log("oldParse.blockMatch=" + oldParse.blockMatch);
							//console.log("newParse.blockMatch=" + newParse.blockMatch);
							
							oldParse.blockMatch = (((oldParse.codeBlockLeft - newParse.codeBlockLeft) - (oldParse.codeBlockRight - newParse.codeBlockRight)) === 0);
							
							
							//  f is a ref to the old function in oldParse
							if(f.end < 0) throw new Error("Old function " + f.name + " did not have an ending! end=" + f.end);	
							
							if(newParse.functions.length == 0) throw new Error("Parsed code contains no function! newParse.functions=" + JSON.stringify(newParse.functions) + " text=\n" + file.text.substring(parseStart, parseEnd) + "\n");
							
							var ff = newParse.functions[0]; // Ref to the same function in new parse
							
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
							
							if(EDITOR.settings.devMode && newParse.blockMatch) {
								
								// Make a full parse and compare to see if there are any bugs
								console.log("fullParse to check for errors:");
								var fullParse = parseJavaScript(file, {noIndention: true});
								
								if(fullParse.comments.length != oldParse.comments.length) {
									console.log(fullParse.comments);
									console.log(oldParse.comments);
									throw new Error("fullParse.comments.length=" + fullParse.comments.length + " oldParse.comments.length=" + oldParse.comments.length + " " + compareObjects(fullParse.comments, oldParse.comments));
								}
								if(fullParse.quotes.length != oldParse.quotes.length) throw new Error("fullParse.quotes.length=" + fullParse.quotes.length + " oldParse.quotes.length=" + oldParse.quotes.length + " ");
								if(fullParse.xmlTags.length != oldParse.xmlTags.length) throw new Error("fullParse.xmlTags.length=" + fullParse.xmlTags.length + " oldParse.xmlTags.length=" + oldParse.xmlTags.length + " ");
								
								if(fullParse.functions.length != oldParse.functions.length) throw new Error("fullParse.functions=" + fullParse.functions.length + " oldParse.functions=" + oldParse.functions.length + " ");
								if(Object.keys(fullParse.globalVariables).length != Object.keys(oldParse.globalVariables).length) throw new Error("fullParse.globalVariables=" + Object.keys(fullParse.globalVariables).length + " oldParse.globalVariables=" + Object.keys(oldParse.globalVariables).length + " oldParse=" + JSON.stringify(oldParse.globalVariables, null, 2) + "\nfullParse=" + JSON.stringify(fullParse.globalVariables, null, 2));
								
								if(fullParse.blockMatch != oldParse.blockMatch) throw new Error("Not the same: fullParse.blockMatch=" + fullParse.blockMatch  + " oldParse.blockMatch=" + oldParse.blockMatch);
								
								
								// Sanity check (we had some problems with functions having bad start and end, witch need to be correct for the "parse only current function" optimizer)
								if(EDITOR.settings.devMode && newParse.blockMatch) {
									console.log("Checking checkFunctionStartEnd");
									try {
										checkFunctionStartEnd(file, newParse.functions);
									}
									catch(err) {
										console.log(JSON.stringify(newParse));
										throw err;
									}
								}
								}
							
							
							file.haveParsed(oldParse);
							
							return;
						}
						else {
							console.log("f.end=" + f.end + " - f.start=" + f.start + " < maxFunctionBodySize=" + maxFunctionBodySize + " file.text.charAt(" + (f.end + charactersLength) + ")=" + UTIL.lbChars(file.text.charAt(f.end + charactersLength)));
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
			
			// Parse the whole file
			console.log("Parsing whole file");
			var newParse = parseJavaScript(file);
			
			
			
			file.haveParsed(newParse);
			
			
			
		}
		else {
			// File should not be parsed
		}
		
		
		
		function updateThingsFunctions(functions, oldEnd, endRowDiff, charactersLength) {
			// Will update start or end positions of all functions below oldEnd or parent functions
			
			var func;
			
			var isBelow = false;
			var isParent = false;
			
			for(var i; i<functions.length; i++) {
				func = functions[i];
				
				isBelow = (func.start > oldEnd);
				isParent = (func.end > oldEnd && func.start < oldEnd);
				
				//console.log("func " + func.name + " start=" + func.start + " end=" + func.end + " isBelow=" + isBelow + " isParent=" + isParent + " oldEnd=" + oldEnd);
				
				if(isBelow || isParent) updateThingsFunctions(func.subFunctions, oldEnd, endRowDiff, charactersLength); // Check/Update subfunctions
				
				if(isBelow) {
					//console.log("func " + func.name + " start=" + func.start + " below old end=" + oldEnd);
					
					func.start += charactersLength;
					func.end += charactersLength;
					func.lineNumber += endRowDiff;
					func.endRow += endRowDiff;
				}
				else if(isParent) {
					//console.log("func " + func.name + " end=" + func.end + " below oldEnd=" + oldEnd + " and start=" + func.start + " before. Adding " + charactersLength + " to end.");
					
					func.end += charactersLength;
					func.endRow += endRowDiff;
				}
				
				if(isBelow || isParent) {
					//console.log("Checking func=" + func.name + " ... start=" + func.start + " (" + UTIL.lbChars(file.text.charAt(func.start)) + ") end=" + func.end + " (" + UTIL.lbChars(file.text.charAt(func.end)) + ")");
					// Make sure the function starts with an { and ends with an }
					if(file.text.charAt(func.start) != "{") {
						file.debugGrid();
						throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + UTIL.lbChars(file.text.charAt(func.start)) + " to be a {");
					}
					
					if(file.text.charAt(func.end) != "}") {
						file.debugGrid();
						throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + UTIL.lbChars(file.text.charAt(func.end)) + " to be a }");
					}
				}
			}
		}
		
		function insideFunction(functions, caretIndex, parent, charactersLength) {
			// Check if inside a function
			// Returns the function, or false
			var f, s;

			for(var i=0; i<functions.length; i++) {
				f = functions[i];
				if(!f.arrowFunction && f.start < caretIndex && f.end >= caretIndex) {
					// Deleted text are now allowed to be larger then the function body
					if(charactersLength > 0 || (charactersLength < 0 && (f.end-f.start) > Math.abs(charactersLength) )) {
						//console.log("Found function=" + f.name);
						// Check sub functions
						return insideFunction(f.subFunctions, caretIndex, f, charactersLength);
					}
				}
			}
			return parent;
		}
		
		
		function sortyByStart(a, b) {
			return a.start - b.start;
		}
		
	}
	
	
	function checkFunctionStartEnd(file, functions) {
		// Check all functions to make sure they start and end with { and }
		var func;
		for(var i=0; i<functions.length; i++) {
			func = functions[i];
			
			// Make sure the function starts with an { and ends with an }
			if(file.text.charAt(func.start) != "{") {
				file.debugGrid();
				throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + UTIL.lbChars(file.text.charAt(func.start)) + " to be a {");
			}
			
			if(file.text.charAt(func.end) != "}") {
				file.debugGrid();
				throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + UTIL.lbChars(file.text.charAt(func.end)) + " to be a }");
			}
			
			console.log(func.name + " OK");
			
			checkFunctionStartEnd(file, func.subFunctions); // Check subfunctions
			
		}
		
	}
	
	function parseJavaScript(file, options) {
		
		console.log("parseJavaScript: options=" + JSON.stringify(options));
		
		console.time("parseJavaScript");
		
		if(options == undefined) options = {};
		
		var parseStart = options.start;
		var parseEnd = options.end;
		var baseIndentation = options.baseIndentation;
		var parseStartRow = options.startRow;
		var indentate = options.noIndention ? false : true;
		var text = file.text;
		var textLength = text.length;
		
		if(baseIndentation == undefined) baseIndentation = 0;
		if(parseStartRow == undefined) parseStartRow = 0;
		
		if(parseStart == undefined) parseStart = 0;
		if(parseEnd == undefined) parseEnd = textLength;
		
		
		// Optimization to try: Putting all the bools into an int for less memory lookups
		
		var originalBaseIndentation = baseIndentation,
		insideDblQuote = false,
		insideDblQuoteBeforeLangTag = false,
		insideSingleQuote = false,
		insideTemplateLiteral = false,
		insideFunctionDeclaration = false,
		insideFunctionArguments = false,
		afterPointer = [],
		variableStart = parseStart,
		variableEnd = 0,
		variableName = "",
		lastVariableName = "",
		functionName = "",
		char = "",
		functionArgumentsStart = parseStart,
		functionArguments = "",
		insideFunctionBody = [],
		insideArrowFunction = false,
		arrowFunctionStart = -1,
		insideQuote = false,
		lastChar = "",
		insideLineComment = false,
		insideBlockComment = false,
		insideHTMLComment = false,
		L = [], // {
		R = [], // }
		subFunctionDepth = 0, // Level of function scope depth
		functions = [],
		myFunction = [],
		functionIndex = -1,
		subFunctionIndex = -1,
		theFunction,
		newFunc,
		properties,
		variable,
		startIndex = parseStart,
		comments = [],
		quotes = [],
		quoteStart = parseStart,
		commentStart = parseStart,
		commentStartIndentation = 0,
		codeBlockDepth = 0,
		codeBlockDepthTemp = 0,
		rootWord = "",
		row = parseStartRow,
		lineNumber = 1, // ParseonlyfunctionOptimizer will update linebumber
		word = "",
		llWord = "",
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
		tagBreak = EDITOR.settings.indentAfterTags,
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
		xmlTagInsideDblQuote = false,
		xmlTagInsideSingleQuote = false,
		insideScriptTag = false,
		llChar = "",
		lllChar = "",
		willBeJSON = false,
		insideRegExp = false,
		regExpStart = parseStart,
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
		pastChar7 = "",
		pastChar8 = "",
		pastChar9 = "",
		xmlMode = false,
		xmlModeBeforeScript = false,
		foundVariableInVariableDeclaration = false, // Why did I add this? Comments damnit!!!
		lastLineBreakCharacter = file.lineBreak.length > 1 ? file.lineBreak.charAt(file.lineBreak.length-1) : file.lineBreak.charAt(0),
		vbScript = false,
		language = "JavaScript", // Update the language to vbScript, PHP depending on ... ?
		ASP = false,
		PHP = false,
		CSS = false,
		SSJS = false; // Server Side JavaScript
		
		// -----
		
		
		// ### vbScript variables
		var firstLineBreakCharacter = file.lineBreak.length > 1 ? file.lineBreak.charAt(0) : file.lineBreak;
		var vb_insideCondition = false;
		var vb_afterThen = false;
		var vb_thisRowIndentation = 0;
		var vb_nextRowIndentation = false;
		var vb_afterIf = false;
		var vb_insideFor = 0;
		
		
		if(options.jsMode) xmlMode = false;
		else {
			//console.log("file.fileExtension=" + file.fileExtension);
			if(file.fileExtension == "htm" || 
			file.fileExtension == "html" || 
			file.fileExtension == "asp" || 
			file.fileExtension == "php" || 
			file.fileExtension == "xml") xmlMode = true; // Start in xml mode

			var matchHtml = file.text.substr(0,100).trim().match(/(<!DOCTYPE html)|(<html.*>)/i);
			
			if(matchHtml) {
				if(matchHtml.index == 0) {
				xmlMode = true;
				console.log("Set xmlMode=" + xmlMode);
				}
			}
		}
		
		
		if(file.fileExtension == "vbs" || file.fileExtension == "vb") vbScript = true;
		
		xmlModeBeforeTag = xmlMode;
		xmlModeBeforeScript = xmlMode;
		
		insideFunctionBody[subFunctionDepth] = false;
		L[subFunctionDepth] = 1; // { Asume open
		R[subFunctionDepth] = 0; // }
		
		
		insideVariableDeclaration[0] = false;
		
		afterPointer[0] = false;
		insideArray[0] = false;
		
		
		
		// Look for function(a, b, c) { ... } not inside ' or "
		
		for(var i=parseStart; i<parseEnd; i++) {
			checkCharacter(i)
		}
		
		
		if(insideLineComment) comments.push(new Comment(commentStart, i)); // Find comment on last line
		
		
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
			else if(UTIL.isNumeric(rightSide)) {
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
			var func = myFunction[subFunctionDepth];
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
				
				if(insideFunctionBody[subFunctionDepth]) {
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
					
					
					theFunction = getFunctionWithName(functions,variableName);
					// Look for global variables
					if(Object.hasOwnProperty.call(globalVariables, variableName)) {
						variable = globalVariables[variableName];
					}
					// Look for function names
					else if(theFunction) {
						//console.log("hmm? " + variableName + " is a function!");
						
						if(properties.length > 1) {
							if(!Object.hasOwnProperty.call(theFunction.variables, properties[1])) {
								theFunction.variables[properties[1]] = new Variable();
							}
							variable =theFunction.variables[properties[1]];
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
						if(subFunctionDepth > 0) {
							variable.value = myFunction[subFunctionDepth-1].name; // We could point directly att the functon, but we want to avoid too much dublication
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
			pastChar8 = pastChar7;
			pastChar7 = pastChar6;
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
			
			//console.log("char=" + char);
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
				
				//if(char === '"') console.log("insideDblQuote? insideDblQuote=" + insideDblQuote + " insideLineComment=" + insideLineComment + " insideSingleQuote=" + insideSingleQuote + " insideBlockComment=" + insideBlockComment + " insideHTMLComment=" + insideHTMLComment + " insideRegExp=" + insideRegExp); 
				
				/*
					### RegExp strings
					
					Anything between / and / not escaped by \
					
					note: / insde a bracket doesn't have to be escaped!
					
					RegExp or block comment!? RegExp can not start with *
					
					RegExp or division!?  
					For example, (, [, {, ;, and all of the binary operators can only be followed by a regexp. 
					Likewise, ), ], }, identifiers, and string/number literals can only be followed by a division sign.
					http://stackoverflow.com/questions/4726295/division-regexp-conflict-while-tokenizing-javascript
					
				*/
				
				if(char == "/" 
				&& (lnw=="=" || lnw=="(" || lnw=="[" || lnw=="{" || lnw==";" || lnw=="&" || lnw=="|" || lnw=="^" || lnw=="~" || lnw=="<" || lnw==">" || lnw=="") 
				&& !insideRegExp && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideXmlTag && !CSS && !insideTemplateLiteral) {
					
					insideRegExp = true;
					regExpStart = i;
					//console.log("RegExp: line=" + lineNumber + " column=" + column);
				}
				else if(insideRegExp && char == "[" && lastChar != "\\") {
					insideRegExpBracket = true;
				}
				else if(insideRegExp && char == "]" && (lastChar != "\\" || (lastChar == "\\" && llChar == "\\" ))) {
					insideRegExpBracket = false;
				}
				else if(insideRegExp && char == "/" && !insideRegExpBracket && (lastChar != backSlash || (llChar == backSlash && lastChar == backSlash)) ) {
					insideRegExp = false;
					//console.log("Exit regexp: line:" + lineNumber + " col:" + column + " regexContentLength=" + (i - regExpStart) + " insideRegExp=" + insideRegExp + " typeof=" + typeof insideRegExp);
					if((i - regExpStart) > 1) return; // Do not return if we see a // line comment (regExp with zero content)
				}
				
				
				// ### Comments: //
				if(char == "/" && lastChar == "/" && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideLineComment  && !insideHTMLComment && !insideRegExp && !CSS && !insideTemplateLiteral) {
					insideLineComment = true;
					commentStart = i-1;
					//console.log("insideLineComment!");
					if(insideArrowFunction) endArrowFunction(1);
				}
				else if(char == "\n" && insideLineComment) {
					insideLineComment = false;
					comments.push(new Comment(commentStart, i));
					//console.log("Found line comment: " +  text.substring(commentStart, i))
				}
				
				
				// ### Comments: /*   */
				else if(char == "*" && lastChar == "/" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideHTMLComment && !insideBlockComment && !insideTemplateLiteral) {
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
				else if(char === '"' && !insideLineComment && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideRegExp && !insideTemplateLiteral) {
					if(insideDblQuote) {
						//console.log("insideDblQuote? lastChar=" + lastChar + " llChar=" + llChar + " vbScript=" + vbScript);
						if(lastChar != backSlash || (lastChar == backSlash && llChar == backSlash || vbScript)) {				
							insideDblQuote = false;
							quotes.push(new Quote(quoteStart, i));
							word = text.substring(quoteStart, i+1);
							//console.log("endeDblQuote! quoteStart=" + quoteStart + " i=" + i);
							
							// Leave xml tag if it was opened inside the quote
							// But not if it's a vbScript doube "" ("" escpapes a double-quote in vbScript!)
							if(insideXmlTag && xmlTagInsideDblQuote && text.charAt(charIndex+1) != '"') {
								insideXmlTag = false;
								xmlTagInsideDblQuote = false;
							}
							return;
						}
					}
					else {
						insideDblQuote = true;
						quoteStart = i;
						//console.log("insideDblQuote! quoteStart=" + i);
					}
				}
				
				// ### Quotes: single
				else if(!vbScript && char === "'" && !insideDblQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment && !insideRegExp && !insideTemplateLiteral) {
					if(insideSingleQuote) {
						if(lastChar != backSlash || (lastChar == backSlash && llChar == backSlash)) {	
							insideSingleQuote = false;
							quotes.push(new Quote(quoteStart, i));
							
							// Leave xml tag if it was opened inside the quote
							if(insideXmlTag && xmlTagInsideSingleQuote) {
								insideXmlTag = false;
								xmlTagInsideSingleQuote = false;
							return;
							}
						}
					}
					else {
						insideSingleQuote = true;
						quoteStart = i;
						//console.log("insideSingleQuote! quoteStart=" + quoteStart);
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
				
				
				// ### Template literals
				else if(char == "`" && !insideDblQuote && !insideSingleQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment && !insideRegExp) {
					if(insideTemplateLiteral) {
						if(lastChar != backSlash || (lastChar == backSlash && llChar == backSlash)) {	
							insideTemplateLiteral = false;
							quotes.push(new Quote(quoteStart, i));
							return;
						}
					}
					else {
						insideTemplateLiteral = true;
						quoteStart = i;
						//console.log("insideSingleQuote!");
					}
				}
				
			}
			
			insideQuote = insideDblQuote || insideSingleQuote || insideTemplateLiteral;
			insideComment = insideLineComment || insideBlockComment || insideHTMLComment;
			
			//console.log("char(" + i + ")=" + char + "  insideQuote=" + insideQuote + " insideComment=" + insideComment + " xmlMode=" + xmlMode );
			
			
			if(!insideComment) {
				
				
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
						
						if(insideDblQuote) {
						quotes.push(new Quote(quoteStart, i-2));
						//word = text.substring(quoteStart, i+1);
						//console.log("endeDblQuote! quoteStart=" + quoteStart + " i=" + i);
						
							insideDblQuoteBeforeLangTag = true;
						}
						insideDblQuote = false;
						
						//console.log("ASP start here line=" + lineNumber);
					}
					else if(pastChar0 == "%" && char == ">" && ASP) { // %>
						ASP = false;
						vbScript = false;
						
						if(!insideScriptTag) xmlMode = true;
						
						if(insideDblQuoteBeforeLangTag) {
							insideDblQuote = true;
							quoteStart = i+1;
							
							insideDblQuoteBeforeLangTag = false;
						}
						
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
				else if(char == "<" && !insideParenthesis[codeBlockDepth] && (xmlMode || (insideQuote && !insideXmlTag) )) {
					insideXmlTag = true;
					
					/*console.log("insideXmlTag! col=" + column + 
					" row=" + row + 
					" xmlMode=" + xmlMode + 
					" insideQuote=" + insideQuote + 
					" insideSingleQuote=" + insideSingleQuote + 
					" insideDblQuote=" + insideDblQuote);
					*/
					
					if(insideDblQuote) xmlTagInsideDblQuote = true;
					if(insideSingleQuote) xmlTagInsideSingleQuote = true;
					
					xmlTagSelfEnding = false;
					xmlTagStart = i;
					xmlTagWordLength = 0;
					if(!insideXmlTagEnding) {
						xmlModeBeforeTag = xmlMode; // xmlMode when the tag starts
						xmlMode = false; // Why end xmlMode inside tags !?? 
					}
					if(insideHTMLComment) throw new Error("WTF");
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
				// Exit out of textarea
				else if(insideScriptTag && pastChar8 == "<" && pastChar7 == "/" && pastChar6 == "t" && pastChar5 == "e" && pastChar4 == "x" && pastChar3 == "t" && pastChar2 == "a" && pastChar1 == "r" && pastChar0 == "e" && char == "a") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-9;
					insideXmlTagEnding = true;
					insideRegExp = false;
				}
				else if(char == " " && insideXmlTag && xmlTagWordLength === 0) {
					xmlTagWordLength = i - xmlTagStart;
				}
				else if(char == ">" && insideXmlTag && (!insideQuote || (xmlTagInsideDblQuote || xmlTagInsideSingleQuote)) && !insideParenthesis[codeBlockDepth]) {
					if(pastChar0 == "/") {
						xmlTagSelfEnding = true; // Self ending xml tag: <foo />
					}
					
					if(xmlTagWordLength === 0) xmlTagWordLength = i - xmlTagStart;
					xmlTag = text.substr(xmlTagStart + 1 + insideXmlTagEnding, xmlTagWordLength - 1 - insideXmlTagEnding);
					xmlTags.push(new XmlTag(xmlTagStart, i, xmlTagWordLength, xmlTagSelfEnding) );
					
					xmlMode = xmlModeBeforeTag; // Set the xmlMode we had when the tag started
					
					//console.log("xmlTag=" + xmlTag);
					
					if(xmlTag.toLowerCase() == "script" || xmlTag.toLowerCase() == "pre" ||  xmlTag.toLowerCase() == "textarea") {
						
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
					else if(xmlTag.toLowerCase() == "style" && !insideQuote) {
						
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
					
						xmlTagInsideDblQuote = false;
						xmlTagInsideSingleQuote = false;
					
				}
				
			}
			
			//console.log("Line " + lineNumber + " column=" + column + " char=" + char + " CSS=" + CSS + " xmlMode=" + xmlMode + " xmlModeBeforeTag=" + xmlModeBeforeTag + " xmlModeBeforeScript=" + xmlModeBeforeScript + " insideXmlTag=" + insideXmlTag + " lastXmlTag=" + lastXmlTag + " insideScriptTag=" + insideScriptTag + " insideHTMLComment=" + insideHTMLComment + " insideRegExp=" + insideRegExp);
			
			if(codeBlockLeft == codeBlockRight) {
				insideCodeBlock = false;
			} 
			else {
				insideCodeBlock = true;
			}

			if(!insideQuote && !insideComment && !xmlMode && !vbScript && !PHP && !CSS && !insideRegExp && !insideXmlTag) {
				
				//console.log("char(" + i + ")=" + char + "");
				
				/*
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
					
					if(insideArrowFunction) endArrowFunction(); // Arrow functions without {angel wings} can't have ; inside it
				}
				
				else if(char == "," && !insideParenthesis[codeBlockDepth]) {
					
					//console.log("Found character=, insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " leftSide=" + leftSide + " rightSide=" + rightSide + " word=" + word + " lastWord=" + lastWord + " (line=" + lineNumber + ")");

					if(insideArray[codeBlockDepth]) {
						arrayItemCount[codeBlockDepth]++;
					}
					
					foundVariableInVariableDeclaration = false;
					
				}
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
					
					//console.log("} insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " line:" + lineNumber + "");

					
					if(insideFunctionBody[subFunctionDepth]) {
						R[subFunctionDepth]++;
						
						insideFunctionDeclaration = false;
						
						//console.log("R[" + subFunctionDepth + "]++");
						
						//console.log("L[" + subFunctionDepth + "]=" + L[subFunctionDepth] + ", R[" + subFunctionDepth + "]=" + R[subFunctionDepth] + " (line:" + lineNumber + ")");

						
						if(L[subFunctionDepth] === R[subFunctionDepth]) {
							// End of current function
							//console.log("Reached end of function body for " + myFunction[subFunctionDepth].name + " L[" + subFunctionDepth + "]=" + L[subFunctionDepth] + "  R[" + subFunctionDepth + "]=" + R[subFunctionDepth] + " (line:" + lineNumber + ")");
							insideFunctionBody[subFunctionDepth] = false;
							
							myFunction[subFunctionDepth].end = i;
							myFunction[subFunctionDepth].endRow = row;

							
							if(subFunctionDepth > 0) {
								L[subFunctionDepth] = -1;
								R[subFunctionDepth] = -1;
								
								subFunctionDepth--;
								R[subFunctionDepth]++;
							}
							else {
								R[subFunctionDepth] = L[subFunctionDepth]-1;
							}
							
							variableName = "";
							
						}
						
						
					}

				}
				else if( (char == "=" || char == ":") && !insideParenthesis[codeBlockDepth]) {
					
					lastVariableName = variableName;
					variableName = text.substring(variableStart, i).trim();  // Used to find name of function
					
					afterPointer[codeBlockDepth] = char;
					
					//console.log("found a pointer (" + char + ") codeBlockDepth=" + codeBlockDepth + " variableName=" + variableName + " leftSide=" + leftSide + " rightSide=" + rightSide + " lastWord=" + lastWord + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + "  (line:" + lineNumber + ")");

					// Figure out the left side (the variable name)
					
					//leftSide = findLeftSide(char);
					

					//console.log("ap leftSide=" + leftSide);

				}
				else if(char == "(") {
					
					if(insideFunctionDeclaration) {
						
						// Figure out the name of the function
						
						//console.log("function!? line=" + lineNumber + " char=" + i + " lastChar = " + lastChar + " word=" + word + " lastWord=" + lastWord + " llWord=" + llWord + " variableName=" + variableName + " functionName=" + functionName + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth]);
						// Sometimes you have var infront of function. 
						
						
						// insideParenthesis[0]=(functionbar(
						var match = String(insideParenthesis[codeBlockDepth]).match(/function(.*)\(/);
						//if( String(insideParenthesis[codeBlockDepth]).replace(/\s/g, "") == "(function(" ) functionName = ""; // prevent anonymous function to get a (the wrong) name
						
						if(match) {
							if(match[1]) functionName = match[1];
							else functionName = "";
						}
						else if(variableName != "") functionName = variableName;
						else if(lastWord == "function") functionName = ""; // Anonymous!
						else functionName = (lastWord=="function" ? llWord : lastWord) || word.replace("(", "");
						
						if(functionName.indexOf("||") != -1) functionName = ""; // Fix: foo = baz || \n function ...
						
						if(functionName.indexOf("(") != -1) functionName = ""; // Fix for foo(bar(), function() {}); where functionName becomes= ()
						
						//if(functionName.indexOf("=") != -1) functionName = "";
												
						// Note: we do not want to give names to anonymous functions! Or the function-list would be too cluttered
						
						insideFunctionArguments = true;
						
						//console.log("insideFunctionArguments!");
						
						functionArgumentsStart = i+1;

					}
					
					insideParenthesis[codeBlockDepth] = "(";
					parenthesisStart[codeBlockDepth] = i;
					
				}

				else if(char == ")") {
					insideParenthesis[codeBlockDepth] = "";
					word = text.substring(parenthesisStart[codeBlockDepth], i+1);
					
					if(insideFunctionArguments) {
						insideFunctionArguments = false;
						
						functionArguments = text.substring(functionArgumentsStart, i);
						
						//console.log("arguments: " + functionArguments + "");
					}
					else if(insideArrowFunction) endArrowFunction();
				}
				
				else if(char == ">" && lastChar == "=") {
					
					// ## Found Arrow function
					
					if(insideArrowFunction) endArrowFunction(1);
					
					console.log("Arrow function! line=" + lineNumber + " char=" + i + " lastChar = " + lastChar + " word=" + word + " lastWord=" + lastWord + " llWord=" + llWord + " variableName=" + variableName + " lastVariableName=" + lastVariableName + " functionName=" + functionName + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth]);
					
					insideArrowFunction = true;
					functionArguments = lastWord;
					if(functionArguments.substring(0,1) == "(") {
						functionArguments = functionArguments.substring(1, functionArguments.length-1); // Trim the parentheses
					}
					else if(functionArguments === "") {
						// Arrow functions need at least one argument if there are no parentheses
						if(word.indexOf("=>") != -1) {
							functionArguments = word.substring(0, word.indexOf("=>"));
							if(functionArguments.indexOf(",") != -1) functionArguments = functionArguments.substring(functionArguments.lastIndexOf(",")+1).trim();
						}
					}
					
					if(functionArguments.indexOf(">") != -1) functionArguments = functionArguments.replace(">", "").trim();
					
					insideFunctionDeclaration = true;
					functionName = lastVariableName;
										
					arrowFunctionStart = i;
					
					afterPointer[codeBlockDepth] = false;
					
				}
				
				else if(char == "{") {
					
					// ### Found function maybe
					
					//console.log("{ insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " insideFunctionDeclaration=" + insideFunctionDeclaration + " insideFunctionArguments=" + insideFunctionArguments + " line:" + lineNumber + "");
					
					if(insideFunctionBody[subFunctionDepth]) L[subFunctionDepth]++;
					
					if((insideFunctionDeclaration) && !insideFunctionArguments) {
						
						// We have found a new function !
						
						//console.log("Found function=" + functionName + "! insideFunctionDeclaration=" + insideFunctionDeclaration + " insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " insideFunctionArguments=" + insideFunctionArguments + "");
						
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
						
						if(insideArrowFunction) newFunc.arrowFunction = true;
						
						//console.log("functionName=" + functionName + " type=" + typeof functionName);
						
						
						if(functionName === false) functionName = "unknownmeh"; // Why can functionName be a boolean (false) !???
						
						properties = functionName.split(".");
						

						//console.log("subFunctionDepth=" + subFunctionDepth);
						
						if(insideFunctionBody[subFunctionDepth]) {
							//It's a sub-function
							
							subFunctionIndex = myFunction[subFunctionDepth].subFunctions.push(newFunc) - 1;
							
							myFunction[subFunctionDepth+1] = myFunction[subFunctionDepth].subFunctions[subFunctionIndex];
							
							subFunctionDepth++; // Functions within this function's body will be sub-functions
							
							L[subFunctionDepth] = 1;
							R[subFunctionDepth] = 0;
							
							if(properties.length > 1) {
								if(Object.hasOwnProperty.call(myFunction[subFunctionDepth-1].variables, properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									// Change the variable type to Method
									variable = myFunction[subFunctionDepth-1].variables[properties[0]];
									startIndex = 1;
									variable = traverseVariableTree(properties, variable, startIndex);
									
									variable.type = "Method";
									
								}
							}
							
						}
						else {
							// a global function
							functionIndex = functions.push(newFunc) - 1;
							myFunction[subFunctionDepth] = functions[functionIndex];
							
							// Remove from global variables
							if(Object.hasOwnProperty.call(globalVariables, functionName)) {
								//console.log("deleteFromGlobalVar=" + functionName + " newFunc.name=" + newFunc.name + " row=" + row + " column=" + column);
								delete globalVariables[functionName];
							}
							

							if(properties.length > 1) {
								theFunction = getFunctionWithName(functions, properties[0]);
								if(theFunction) {
								// This is a variable (method) for a function: foo.bar.baz = function()
									// This is run after variables has been added.
									// Change the variable type to Method
									// Using Object.hasOwnProperty.call because the object might have a variable called "hasOwnProperty"
									if(Object.hasOwnProperty.call(theFunction.variables, properties[1])) {
										
										variable = theFunction.variables[properties[1]];
										startIndex = 2;
										variable = traverseVariableTree(properties, variable, startIndex);
										
										variable.type = "Method";
									}

								}
							}
						}
						
						
						// Prevent the function name from being reused
						functionName = "";
						variableName = "";
						
						insideFunctionBody[subFunctionDepth] = true;
						insideFunctionDeclaration = false;
						
						insideArrowFunction = false;
						
						//console.log("L[" + subFunctionDepth + "]++");
						

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
				
				if(!insideDblQuote && (char == " " || char == "\t") && pastChar0.toLowerCase() == "m" && pastChar1.toLowerCase() == "e" && pastChar2.toLowerCase() == "r" && isWhiteSpace(pastChar3)) {
					insideLineComment = true;
					commentStart = i;
				}
				// else console.log("char=" + char + " pastChar0=" + pastChar0 + " pastChar1=" + pastChar1 + " pastChar2=" + pastChar2 + " pastChar3=" + pastChar3);					
				
				
				
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
							else if(word == "do" && lastWord != "exit") {
								vb_nextRowIndentation = 1;
								vb_insideCondition = true;
							}
							else if(word == "loop") {
								vb_thisRowIndentation--;
								vb_insideCondition = true;
							}
							
							// ### FOR ... NEXT
							else if(word == "for" && lastWord != "exit") {
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
							else if(word == "function" && lastWord != "exit") {
								vb_nextRowIndentation = 1;
							}

							
							// ### SUB ... END SUB
							else if(word == "sub" && lastWord == "end") {
								vb_thisRowIndentation--;
							}
							else if(word == "sub" && lastWord != "exit") {
								vb_nextRowIndentation = 1;
							}

							
							//console.log("line=" + (lineNumber) + " word=" + word + " vb_thisRowIndentation=" + vb_thisRowIndentation + " vb_nextRowIndentation=" + vb_nextRowIndentation);
							
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
			
			
			if(insideArrowFunction && (char == "\r" || char=="\n")) endArrowFunction();
			
			
			if( (char == "\r" || char=="\n") && insideVariableDeclaration[codeBlockDepth] && !(pastChar0 == "," || pastChar1 == "," || pastChar2 == ",") ) {
				// A new line without , exits variable declaration
				insideVariableDeclaration[codeBlockDepth] = false;
				foundVariableInVariableDeclaration = false;
				variableName = "";
				
				//console.log("pastChar0=" + JSON.stringify(pastChar0) + " char=" + UTIL.lbChars(char) + " ? " +  (pastChar0 == "," || pastChar1 == "," || pastChar2 == ",") );
				
				
				
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
					console.warn("Line " + lineNumber + ": Lonely slash! path=" + file.path); // NodeJS says: Invalid regular expression: missing /
					insideRegExp = false;
					insideRegExpBracket = false;
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
				
				if(insideXmlTag && (insideDblQuote || insideSingleQuote) && !insideQuote) insideXmlTag = false;
				
				//console.warn("Line=" + lineNumber + " file.grid[" + row + "].indentation=" + file.grid[row].indentation + " insideBlockComment=" + insideBlockComment + " codeBlock[" + codeBlockDepth + "].indentation=" + codeBlock[codeBlockDepth].indentation + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]);
				//console.log("Row " + row);
			}
			
			
		}
		
		function endArrowFunction(indexMinus) {
			
			// Arrow functions without { angel wings } CAN have sub functions =)
			// Don't bother trying to figure out the subfunctions though, just place them under the function function or global
			
			console.log("End Arrow Function: word=" + word + " char=" + char + " functionName=" + functionName + " functionArguments=" + functionArguments + " subFunctionDepth=" + subFunctionDepth);
			
			newFunc = new Func(functionName, functionArguments, arrowFunctionStart, lineNumber+parseStartRow);
			
			newFunc.arrowFunction = true;
			newFunc.end = indexMinus ? i - indexMinus : i;
			newFunc.endRow = lineNumber+parseStartRow;
			
			properties = functionName.split(".");

			//console.log("subFunctionDepth=" + subFunctionDepth);
			
			if(insideFunctionBody[subFunctionDepth] && myFunction[subFunctionDepth]) {
				//It's a sub-function
				
				subFunctionIndex = myFunction[subFunctionDepth].subFunctions.push(newFunc) - 1;
				
								
				if(properties.length > 1) {
					if(Object.hasOwnProperty.call(myFunction[subFunctionDepth].variables, properties[0])) {
						// This is a variable (method) for a function: foo.bar.baz = () => {}
						// Change the variable type to Method
						variable = myFunction[subFunctionDepth-1].variables[properties[0]];
						startIndex = 1;
						variable = traverseVariableTree(properties, variable, startIndex);
						
						variable.type = "Method";
						
					}
				}
				
			}
			else {
				// a global function
				functionIndex = functions.push(newFunc) - 1;
				
				if(functionName !== "") {
					// Remove from global variables (for convenience!?)
					if(Object.hasOwnProperty.call(globalVariables, functionName)) {
						//console.log("deleteFromGlobalVar=" + functionName + " newFunc.name=" + newFunc.name + " row=" + row + " column=" + column);
						delete globalVariables[functionName];
					}
				

					if(properties.length > 1) {
						theFunction = getFunctionWithName(functions, properties[0]);
						if(theFunction) {
							// This is a variable (method) for a function: foo.bar.baz = function()
							// This is run after variables has been added.
							// Change the variable type to Method
							// Using Object.hasOwnProperty.call because the object might have a variable called "hasOwnProperty"
							if(Object.hasOwnProperty.call(theFunction.variables, properties[1])) {
								
								variable = theFunction.variables[properties[1]];
								startIndex = 2;
								variable = traverseVariableTree(properties, variable, startIndex);
								
								variable.type = "Method";
							}

						}
					}
				}
			}
			
			// Prevent the function name from being reused
			functionName = "";
			variableName = "";
			lastVariableName = "";
			
			insideFunctionDeclaration = false;
			
			insideArrowFunction = false;
			
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
				variableStart = i;
				return;
			}
			else if(char == " " && word == "function") {
				// Detects: function foo() ...
				insideFunctionDeclaration = true;
				word = "";
				llWord = lastWord;
				lastWord = "function";
				return;
			}
			else if(char == "(" && word == "function") {
				// Anonymous function
				//console.log("anon function line=" + lineNumber + "");
				insideFunctionDeclaration = true;
				//variableName = "Anonymous function";
				//variableName = "";
				word = "";
				llWord = lastWord;
				lastWord = "function";
				return;
			}
			else if(char == " " && word == "new") {
				word = "";
				return;
			}
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
						
						//console.log("NEW WORD='" + word + "' insideVariableDeclaration[" + subFunctionDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[codeBlockDepth=" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth] + " insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + "  insideCodeBlock=" + insideCodeBlock + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + " insideFunctionDeclaration=" + insideFunctionDeclaration + " willBeJSON=" + willBeJSON + " insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " foundVariableInVariableDeclaration=" + foundVariableInVariableDeclaration + " (line:" + lineNumber + ")");
						
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
								
								//console.log(word + " is a variable (declared with var)! insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + "");
								
								
								if(!insideCodeBlock) {
									// A global variable is declared:

									globalVariables[word] = new Variable();
									//console.log("Added GLOBAL variable=" + word + "");
									foundVariableInVariableDeclaration = false;
								}
								else {
									// A local variable (inside a function or JSON??)
									if(insideFunctionBody[subFunctionDepth]) {
										
										// Check if the parent (word) exist in 
										
										
										codeBlockDepthTemp = codeBlockDepth;
										
										while(codeBlock[codeBlockDepthTemp].parent) {
											codeBlockDepthTemp--;
										}
										rootWord = codeBlock[codeBlockDepthTemp].word;
										
										//console.log("Inside function=" + insideFunctionBody[subFunctionDepth].name + " word=" + word + " rootWord=" + rootWord + "");
										
										
										if(!Object.hasOwnProperty.call(myFunction[subFunctionDepth].variables, rootWord)) {
											myFunction[subFunctionDepth].variables[word] = new Variable("");
											//console.log("Added variable=" + word + " to function=" + myFunction[subFunctionDepth].name + " codeBlock[" + codeBlockDepth + "].word=" + codeBlock[codeBlockDepth].word + " parent.word=" + (codeBlock[codeBlockDepth].parent ? codeBlock[codeBlockDepth].parent.word : 'undefined') + " rootWord=" + rootWord + "");
										}
										else {
											
											//console.log("WTF happaned!??");
											
											//myFunction[subFunctionDepth].variables[rootWord].type = new Variable("Object");
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
		
		
		function getFunctionWithName(functions, name) {
			for(var i=0; i<functions.length; i++) {
				if(functions[i].name == name) return functions[i];
			}
			return null;
		}
		
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
	
	function Comment(start, end) {
		this.start = start;
		this.end = end;
	}
	
	function Quote(start, end) {
		this.start = start;
		this.end = end;
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
	
	function compareObjects(arr1, arr2) {
		// Asumes each item in the array if an object
		var diff = [];
		for(var i=0; i<arr1.length && i<arr2.length; i++) {
			for(var key in arr1[i]) {
				if(arr1[i][key] != arr2[i][key]) return "Item " + i + ": " + JSON.stringify(arr2[i]);
			}	
		}
		return "Same!";
	}


	
})();
