(function() {
	
	/*
		
		warning: There be dragons!
		
		This file parses javascript/HTML and returns an object with the following objects:
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
		
		
		
		About var declarations: They will not be indented, which will encurage you to write:
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
		
		indentation after if, for, while ? ex:
		if(1==1) 
		console.log("hi");
		
	*/
	
	"use strict";
	
	var character = "";     // Keep track of what character was inserted before
	var lastCharacter = "";
	var parseRequestId = 0;
	var parseWorkerCallbacks = {}; // id: callback-function
	
	EDITOR.plugin({
		desc: "Parse JavaScript etc",
		order: 100,
		load:function jsParserMain() {
			
			EDITOR.on("fileOpen", onFileOpen);
			EDITOR.on("fileChange", parseJsOnChange, 100);
			EDITOR.on("parse", parseRequest);
			
		},
		unload: function unloadJsParser() {
			
			EDITOR.removeEvent("fileOpen", onFileOpen);
			EDITOR.removeEvent("fileChange", parseJsOnChange);
			EDITOR.removeEvent("parse", parseRequest);
		}
	});
	
	function parseRequest(fileOrString, lang, path, callback) {
		if(lang != "JS" && lang != "JavaScript") {
			console.log("Ignoring parse request because lang=" + lang + " is not JavaScript!");
			return false;
		}
		
		var id = ++parseRequestId;
		
		var options = {
			noIndention: true
		}
		
		if(fileOrString instanceof File) {
			var file = fileOrString;
		}
		else {
			var file = {
				text: fileOrString,
				lineBreak: UTIL.determineLineBreakCharacters(fileOrString),
				fileExtension: "js",
				path: path || "parse-request" + id + ".js"
			}
		}
		
		console.log("parseRequest" + id + " = " + file.path);
		
		console.time("parseRequest" + id);
		
		if(parseWorker && callback) {
			parseWorkerCallbacks[id] = callback;
			console.log("Posting message to parseWorker ...");
			parseWorker.postMessage({id: id, file: file, options: options});
		}
		else {
			var parseError = null;
			options.parseError = function registerParseError(err) {
				parseError = err;
			}
			var parseResult = parseJavaScript(file, options);
			console.timeEnd("parseRequest" + id);
			
			if(callback) callback(parseError, parseResult);
			else return parseResult;
		}
		
		return true;
	}
	
	function messageFromParseWorker(e) {
		console.log("Recived message from parseWorker ...");
		
		var id = e.data.id;
		console.timeEnd("parseRequest" + id);
		
		var callback = parseWorkerCallbacks[id];
		if(!parseWorkerCallbacks.hasOwnProperty(id)) throw new Error("No callback function for id=" + id);
		parseWorkerCallbacks[id](e.data.error, e.data.result);
		delete parseWorkerCallbacks[id];
	}
	
	
	/* ### start: Helper code for parse worker */
	
	function workerReciveMessage(e) {
		console.log("parseWorker recived message ...");
		
		var id = e.data.id;
		var file = e.data.file;
		var options = e.data.options;
		
		var parseError = null;
		options.parseError = function registerParseError(err) {
			parseError = err;
		}
		var parseResult = parseJavaScript(file, options);
		console.log("parseWorker posting message ...");
		postMessage({id: id, error: parseError, result: parseResult});
		
	}
	
	/* ### end: Helper code for parse worker */
	
	if(typeof Worker=="undefined") {
		console.warn("Web Worker not supported on " + BROWSER);
	}
	else if(typeof URL=="undefined") {
		console.warn("URL object not supported on " + BROWSER);
	}
	else {
		var parseWorker = new Worker(URL.createObjectURL( new Blob(['console.log("parseWorker loading ...");' + 
			'onmessage='+ workerReciveMessage + ';Func=' + Func + ';Obj=' + Obj + ';Comment=' + Comment + ';Quote=' + Quote + 
		';Variable=' + Variable + '; XmlTag=' + XmlTag + ';parseJavaScript=' + parseJavaScript + ';console.log("parseWorker loaded!");']) ));
		
		parseWorker.onmessage = messageFromParseWorker;
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
		
		if(file.parse === false) return false;
		if(file.isBig) return false;
		
		/* 
			Dilemma: Should we also parse ASP and PHP here!? (Go into vbScript PHP , etc mode when encontering <% or <?PHP)
			Yes, this is the easiest solution, and we do not have to redo xmlParsing (like we would have to if we had separate plugins)
			We could argue that PHP scripts should not include html, or JS, but most php scripts probably does.
		*/
		
		if( file.fileExtension=="" || 
		file.fileExtension=="js" || 
		file.fileExtension=="php" || 
		file.fileExtension=="asp" || 
		file.fileExtension=="vbs" ||  // Visual Basic Script
		file.fileExtension=="vb" ||   // Visual Basic
		file.fileExtension=="json" || 
		file.fileExtension=="css" || 
		file.fileExtension=="htm" || 
		file.fileExtension=="html" || 
		file.fileExtension=="java") {
			return true;
		}
		else if(file.fileExtension=="xml" && (file.text.indexOf("<?JS") != -1)) {
			return true;
		}
		else {
			console.warn(file.name + " will not be parsed by the JavaScript parser!");
			return false;
		}
	}
	
	
	function isWhiteSpace(char) {
		return char=="" || char==" " || char=="\t" || char=="\r" || char=="\n";
	}
	
	function diffVariables(a, b) {
		var diff = [];
		for( var variable in a) {
			if(!Object.hasOwnProperty.call(b, variable)) {
				diff.push(variable);
			}
		}
		for( var variable in b) {
			if(!Object.hasOwnProperty.call(a, variable)) {
				diff.push(variable);
			}
		}
		return JSON.stringify(diff);
	}
	
	function parseJsOnChange(file, type, characters, caretIndex, row, col) {
		/*
			### Parse only function optimizer
			
			type: "delete", "linebreak", "insert", "text", deleteTextRange, deleteCharacter, reload, removeRow
		*/
		
		if(shouldParse(file)) { // If the file should be parsed or not
			
			/*
				We should not need to re-parse if we're just typeing, unless we type some special character like { or } or " or '
				And probably shouln't re-parse if we typed { or } and it would cause a block-missmatch !? No always parse after { or } or users will be annoyed because of no indention.
				type=="insert": Inserted one character
				type=="delete": Deleted one character
				
				Hmm, we might be inside a variable, and typing thus changes the variable name!
			*/
			
			var specialCharacters = "{}<>/\\\"'";
			
			if(type=="insert") {
				lastCharacter = character;
				character = characters;
			}
			
			if(file.parsed && characters.length==1 && (type =="insert" || type=="delete") && lastCharacter != "\\" && specialCharacters.indexOf(characters)==-1)  {
				
				console.log("no re-parse opt");
				
				var charactersLength = 1;
				if(type=="delete") charactersLength = -1;
				var oldParse = file.parsed;
				// Update functions
				console.log("functions to update: " + (oldParse.functions && oldParse.functions.length))
				if(oldParse.functions) updateThingsFunctions(oldParse.functions, caretIndex, 0, charactersLength);
				else console.log("No parsed functions to update! file.parsed=", file.parsed);
				
				// Update quotes
				for(var i=0; i<oldParse.quotes.length; i++) {
					if(oldParse.quotes[i].start >= caretIndex) {
						oldParse.quotes[i].start += charactersLength;
						oldParse.quotes[i].end += charactersLength;
					}
					else if(oldParse.quotes[i].end >= caretIndex) {
						oldParse.quotes[i].end += charactersLength;
					}
				}
				
				// Update comments
				for(var i=0; i<oldParse.comments.length; i++) {
					if(oldParse.comments[i].start >= caretIndex) {
						oldParse.comments[i].start += charactersLength;
						oldParse.comments[i].end += charactersLength;
					}
					else if(oldParse.comments[i].end >= caretIndex) {
						oldParse.comments[i].end += charactersLength;
					}
				}
				
				// Update xmlTags
				for(var i=0; i<oldParse.xmlTags.length; i++) {
					if(oldParse.xmlTags[i].start >= caretIndex) {
						oldParse.xmlTags[i].start += charactersLength;
						oldParse.xmlTags[i].end += charactersLength;
					}
					else if(oldParse.xmlTags[i].end >= caretIndex) {
						console.log("between " + JSON.stringify(oldParse.xmlTags[i]) + " caretIndex=" + caretIndex + " charactersLength=" + charactersLength + " characters=" + UTIL.lbChars(characters) );
						oldParse.xmlTags[i].end += charactersLength;
						if( (oldParse.xmlTags[i].start + oldParse.xmlTags[i].wordLength + 1) > caretIndex && characters!=" ") {
							console.log("update wordLength!");
							oldParse.xmlTags[i].wordLength += charactersLength;
						}
					}
				}
				return;
			}
			else if(file.parsed && (type=="delete" || type=="linebreak" || type=="insert" || type=="text" || type=="deleteTextRange" || type=="removeRow")) { // If the file was parsed before
				
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
					
					if(type=="delete" || type=="deleteTextRange" || type=="removeRow") {
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
						
						// If the function is not the majority of the file
						if( ((f.end - f.start) < maxFunctionBodySize || EDITOR.settings.devMode) && file.text.charAt(f.end + charactersLength)=="}") {
							
							console.time("parseOnlyFunctionOptimizer");
							
							//console.log("change type=" + type);
							
							//console.log("Parsing only function name=" + f.name + " line=" + f.lineNumber + " endRow=" + f.endRow);
							
							
							// The start property is at the { after function
							// We need to start parsing at the function declaration so that the parser will find it
							var parseEnd = f.end + charactersLength + 1;
							var parseStartRow = f.lineNumber-1;
							
							var oldStart = f.start;
							var oldEnd = f.end;
							
							// Try to find the function declaration
							var gridRowStartIndex = file.grid[parseStartRow].startIndex;
							// Prevent from searching too far
							var funcDecText = file.text.substring(gridRowStartIndex, f.start);
							
							if(funcDecText.indexOf("function")==-1) {
								// The function declaration is probably above
								// Seek to the left until we find a line that has function in it 
								while(parseStartRow > 0 && funcDecText.indexOf("function")==-1) {
									parseStartRow--;
									gridRowStartIndex = file.grid[parseStartRow].startIndex;
									funcDecText = file.text.substring(gridRowStartIndex, f.start);
								}
							}
							
							var baseIndentation = file.grid[parseStartRow].indentation;
							
							//console.log("funcDecText=" + funcDecText);
							
							// Search backwards in file.text starting from f.start
							var parseStart = funcDecText.lastIndexOf("function" + (f.name.length > 0 ? " " + f.name : "") + "(", f.start); 
							
							
							// I do not trust reLastIndexOf ...
							
							if(parseStart==-1) {
								
								var arrParseStart = [];
								
								arrParseStart.push(funcDecText.lastIndexOf("function " + f.name + " (", f.start));
								
								
								// Fix for: foo = function() and foo = function foo()
								arrParseStart.push(funcDecText.lastIndexOf(f.name + " = function", f.start));
								arrParseStart.push(funcDecText.lastIndexOf(f.name + "=function", f.start));
								
								
								// Find foo: function foo()
								arrParseStart.push(funcDecText.lastIndexOf(f.name + ": function", f.start));
								arrParseStart.push(funcDecText.lastIndexOf(f.name + " : function", f.start));
								
								
								//console.time("hmm"); // These used to be slow
								//if(parseStart==-1) parseStart = UTIL.reLastIndexOf(new RegExp("function\\s" + f.name + "\\s" + "(", "m"), file.text, f.start, f.end);
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
							
							if(parseStart==-1) throw new Error("Unable to find start of function=*" + f.name + "* f.start=" + f.start + " parseStart=" + parseStart + "\n" + 
							" funcDecText=" + funcDecText + " text @index=f.start-15: " + file.text.substr(Math.max(0, f.start-15), 15));
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
								oldParse.globalVariables[varName] = newParse.globalVariables[varName];
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
							
							if(newParse.functions.length==0) throw new Error("Parsed code contains no function! newParse.functions=" + JSON.stringify(newParse.functions) + " text=\n" + file.text.substring(parseStart, parseEnd) + "\n");
							
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
							// Have to go though all functions (recursive) because they are not necessary in the right order
							
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
								if(Object.keys(fullParse.globalVariables).length != Object.keys(oldParse.globalVariables).length) {
throw new Error("fullParse.globalVariables=" + Object.keys(fullParse.globalVariables).length + " diff=" + diffVariables(oldParse.globalVariables, fullParse.globalVariables) + " oldParse.globalVariables=" + Object.keys(oldParse.globalVariables).length + " oldParse.globalVariables=" + JSON.stringify(oldParse.globalVariables, null, 2) + "\nfullParse.globalVariables=" + JSON.stringify(fullParse.globalVariables, null, 2));
								}
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
			
			for(var i=0; i<functions.length; i++) {
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
				
				if(EDITOR.settings.devMode && (isBelow || isParent)) {
					//console.log("Checking func=" + func.name + " ... start=" + func.start + " (" + UTIL.lbChars(file.text.charAt(func.start)) + ") end=" + func.end + " (" + UTIL.lbChars(file.text.charAt(func.end)) + ")");
					// Make sure the function starts with an { and ends with an }
					// We will get an alert if we add a { inside a function, then add more content before it.
					// But we should be able to recover from this when there's a full reparse. Or should this trigger a full reparse !?
					if(file.text.charAt(func.start) != "{") {
						file.debugGrid();
						alertBox("Expected func.name=" + func.name + " start=" + func.start + " character=" + UTIL.lbChars(file.text.charAt(func.start)) + " to be a {  in file.path=" + file.path, "parser", "warning");
					}
					
					if(file.text.charAt(func.end) != "}") {
						file.debugGrid();
						alertBox("Expected func.name=" + func.name + " end=" + func.end + " character=" + UTIL.lbChars(file.text.charAt(func.end)) + " to be a } in file.path=" + file.path, "parser", "warning");
					}
				}
			}
		}
		
		function insideFunction(functions, caretIndex, parent, charactersLength) {
			// Check if inside a function
			// Returns the function, or false
			var f, s;
			
			//console.log("insideFunction: Checking " + functions.length + " functions (parent=" + (parent && parent.name) + ") ...");
			
			for(var i=0; i<functions.length; i++) {
				f = functions[i];
				//console.log("insideFunction: f.name=" + f.name + " f.arrowFunction=" + f.arrowFunction + " f.start=" + f.start + " caretIndex=" + caretIndex + " f.end=" + f.end + " charactersLength=" + charactersLength + " ");
				if(!f.arrowFunction && f.start < caretIndex && f.end >= caretIndex) {
					// Deleted text are now allowed to be larger then the function body
					if(charactersLength > 0 || (charactersLength < 0 && (f.end-f.start) > Math.abs(charactersLength) )) {
						//console.log("insideFunction: Found function=" + f.name);
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
			
			if(func.arrowFunction) continue;
			
			// Make sure the function starts with an { and ends with an }
			if(file.text.charAt(func.start) != "{") {
				file.debugGrid();
				throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + UTIL.lbChars(file.text.charAt(func.start)) + " to be a {");
			}
			
			if(file.text.charAt(func.end) != "}") {
				file.debugGrid();
				throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + UTIL.lbChars(file.text.charAt(func.end)) + " to be a }");
			}
			
			//console.log(func.name + " OK");
			
			checkFunctionStartEnd(file, func.subFunctions); // Check subfunctions
			
		}
		
	}
	
	function parseError(error) {
		throw error;
	}
	
	function parseJavaScript(file, options) {
		
		console.warn("parseJavaScript: options=" + JSON.stringify(options));
		
		console.time("parseJavaScript");
		
		if(options==undefined) options = {};
		
		var reValidVariableName = /^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)[$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc][$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]*$/;
		var parseStart = options.start;
		var parseEnd = options.end;
		var baseIndentation = options.baseIndentation;
		var parseStartRow = options.startRow;
		var indentate = options.noIndention ? false : true;
		var parseError = options.parseError;
		var text = file.text;
		var textLength = text.length;
		
		if(baseIndentation==undefined) baseIndentation = 0;
		if(parseStartRow==undefined) parseStartRow = 0;
		
		if(parseStart==undefined) parseStart = 0;
		if(parseEnd==undefined) parseEnd = textLength;
		
		var singleStatementContext = 0;
		
		// Optimization to try: Putting all the bools into an int for less memory lookups
		
		var originalBaseIndentation = baseIndentation,
		insideIfStatement = false,
		ifStatementParenthesesDepth = 0,
		leftParentheses = [],
		rightParentheses = [],
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
		altFunctionName = "",
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
		insideReturn = [],
		returnStart = 0,
		insideReturnStatement = false,
		returnStatement = null,
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
		tagBreak = indentate ? EDITOR.settings.indentAfterTags : [],
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
		xmlTagInsideTemplateLiteral = false,
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
		language = "JS", // Update the language to vbScript, or PHP, depending on ... ?
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
			if(file.fileExtension=="htm" || 
			file.fileExtension=="html" || 
			file.fileExtension=="asp" || 
			file.fileExtension=="php" || 
			file.fileExtension=="xml") xmlMode = true; // Start in xml mode
			
			var matchHtml = file.text.substr(0,100).trim().match(/(<!DOCTYPE html)|(<html.*>)/i);
			
			if(matchHtml) {
				if(matchHtml.index==0) {
					xmlMode = true;
					console.log("Set xmlMode=" + xmlMode);
				}
			}
		}
		
		
		if(file.fileExtension=="vbs" || file.fileExtension=="vb") vbScript = true;
		
		xmlModeBeforeTag = xmlMode;
		xmlModeBeforeScript = xmlMode;
		
		insideFunctionBody[subFunctionDepth] = false;
		L[subFunctionDepth] = 1; // { Asume open
		R[subFunctionDepth] = 0; // }
		
		leftParentheses[0]=0;
		rightParentheses[0]=0;
		
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
			
			if(parentCodeBlock.indentation < 0) error(new Error("Line:" + lineNumber + " parentCodeBlock.indentation=" + parentCodeBlock.indentation));
			
			codeBlock[codeBlockDepth] = {word: lastWord, indentation: parentCodeBlock.indentation+1, line: lineNumber};
			afterPointer[codeBlockDepth] = false;
			insideArray[codeBlockDepth] = false;
			arrayStart[codeBlockDepth] = -1;
			arrayItemCount[codeBlockDepth] = 0;
			insideParenthesis[codeBlockDepth] = "";
			parenthesisStart[codeBlockDepth] = -1;
			leftParentheses[codeBlockDepth] = 0;
			rightParentheses[codeBlockDepth] = 0;
			insideReturn[codeBlockDepth] = false;
			
			if(codeBlockDepth==0) error( new Error("codeBlockDepth can not be zero") );
			
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
			
			//console.log("codeBlockR: lineNumber=" + lineNumber);
			
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
			
			if(indentate && file.grid[row].indentation > 0 && codeBlockLeftRow != codeBlockRightRow) {
				file.grid[row].indentation--;
			}
		}
		
		
		function getVariableType(rightSide) {
			/*
				Lets make a guess on what type of variable this is.
				
				Sets the .type of the variable
				
			*/
			
			//console.log("getVariableType: rightSide=" + rightSide);
			
			var type = "unknown";
			
			if(rightSide.charAt(0)=='"' || rightSide.charAt(0)=="'") {
				type = "String";
			}
			else if(rightSide.charAt(0)=='[') {
				type = "Array";
			}
			else if(rightSide.charAt(0)=='/') {
				type = "RegExp";
			}
			else if(rightSide=="true" || rightSide=="false") {
				type = "Boolean";
			}
			else if(rightSide=="this") {
				type = "this";
			}
			else if(rightSide.charAt(0)=="(") {
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
			else if( !isNaN(parseFloat(rightSide)) && isFinite(rightSide) ) {
				type = "Number";
			}
			else if(rightSide.indexOf("createElement") != -1 || rightSide.indexOf("getElementById") != -1) {
				type = "Element";
			}
			else if(rightSide.charAt(0) == rightSide.charAt(0).toUpperCase()) {
				type = rightSide;
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
		
		
		function findLeftSide(pointerCharacter, d) {
			
			// Figure out the left side (the variable name) of a pointer (= or :)
			
			var leftSide = "";
			
			if(pointerCharacter==":") {
				
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
				
				if(d == undefined) d = codeBlockDepth;
				
				if(insideArray[d]) {
					leftSide = insideArray[d] + "." + arrayItemCount[d]; // leftSide=arr.0
				}
				else {
					if(lastWord.match(reValidVariableName)) leftSide = lastWord;
					else if(llWord.match(reValidVariableName)) leftSide = llWord;
				}
				
				while(d>0) {
					if(afterPointer[d] != ":") break;
					
					if(insideArray[d-1]) {
						leftSide = insideArray[d-1] + "." + arrayItemCount[d-1] + "." + leftSide; // leftSide=arr.0.foo
					}
					else {
						leftSide = codeBlock[d].word + (leftSide ? "." + leftSide : ""); // leftSide=bar.foo
					}
					
					
					d--;
					//console.log("while leftSide=" + leftSide);
					//console.log("afterPointer[" + d + "]=" + afterPointer[d]);
				}
				
				
			}
			else if(pointerCharacter=="=") {
				// Ex: x = y; (leftside=x)
				//console.log("What is best? leftSide=" + leftSide + " lastWord=" + lastWord + "");
				leftSide = lastWord;
			}
			else {
				error( new Error("Unexpected pointerCharacter=" + pointerCharacter + " (line=" + lineNumber + ")") );
			}
			
			//console.log("findLeftSide return leftSide=" + leftSide);
			
			return leftSide;
		}
		
		
		function endPointer() {
			
			// We have found a value for a variable!
			
			var variable;
			var func = myFunction[subFunctionDepth];
			
			var leftSide = findLeftSide(afterPointer[codeBlockDepth]);
			
			console.warn("Got value for variable! leftSide=" + leftSide + " rightSide=" + rightSide + " afterPointer[codeBlockDepth:" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth] + " insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " (line:" + lineNumber + ")");
			
			if(insideArray[codeBlockDepth]) {
				// Key is arrayItemCount[codeBlockDepth] !!!!
				//leftSide = leftSide + "." + arrayItemCount[codeBlockDepth];
			}
			else {
				afterPointer[codeBlockDepth] = false;
			}
			
			if(leftSide.length > 0 && rightSide.length > 0) {
				console.log("We have Left & right side of variable pointer: " + leftSide + "=" + rightSide + "");
				
				var properties = leftSide.split(".");
				var pointerName = properties[0];
				var startIndex = 1;
				
				if(insideFunctionBody[subFunctionDepth]) {
					
					//console.log("inside function body! pointerName=" + pointerName + " function " + myFunction[subFunctionDepth].name + " parameters=" + myFunction[subFunctionDepth].arguments);
					
					if(Object.hasOwnProperty.call(func.variables, pointerName)) { // LOL: Objects can have hasOwnProperty as key, and it will no longer work
						variable = func.variables[pointerName];
						//console.log("Variable= '" + pointerName + "' listed in function=" + func.name + " variables! Yey!");
					}
					else {
						
						if(pointerName=="this") {
							func.variables["this"] = new Variable("this");
							variable = func.variables["this"];
						}
						else if(insideReturnStatement) {
							console.log("Return statement ? leftSide=" + leftSide + " rightSide=" + rightSide);
							if(returnStatement == null) {
								returnStatement = new Variable();
								myFunction[subFunctionDepth].returns.push(returnStatement);
							}
							variable = returnStatement;
						}
						else if(properties[0].match(reValidVariableName)) {
							// We have found a GLOBAL variable inside a function!?
							// It's a valid variable name, so make it a global variable
							// But not if it's a function parameter
							if(myFunction[subFunctionDepth].arguments.indexOf(properties[0]) == -1) {
								//console.log("Not listen in parameters: " +  properties[0]);
								if(!Object.hasOwnProperty.call(globalVariables, properties[0])) {
									variable = globalVariables[properties[0]] = new Variable();
									//console.log("Added new global variable properties[0]=" + properties[0] + " leftSide=" + leftSide + " insideFunctionBody[subFunctionDepth=" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " myFunction[subFunctionDepth=" + subFunctionDepth + "].arguments=" + myFunction[subFunctionDepth].arguments);
							}
								else {
									variable = globalVariables[properties[0]];
								}
							}
						}
						else {
							//console.log("leftSide=" + leftSide + " does not seem like a valid variable name, and it's not already in global variables.");
						}
						
					}
					
				}
				else {
					
					
					theFunction = getFunctionWithName(functions,pointerName);
					// Look for global variables
					if(Object.hasOwnProperty.call(globalVariables, pointerName)) {
						variable = globalVariables[pointerName];
					}
					// Look for function names
					else if(theFunction) {
						console.log("hmm? " + pointerName + " is a function!");
						
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
						
						if(properties[0].match(reValidVariableName)) {
							// It's a valid variable name, so make it a global variable
							variable = globalVariables[properties[0]] = new Variable();
							//console.log("Added new global variable properties[0]=" + properties[0] + " leftSide=" + leftSide + " myFunction[subFunctionDepth=" + subFunctionDepth + "]=" + myFunction[subFunctionDepth]);
						}
						else {
							//console.log("leftSide=" + leftSide + " does not seem like a valid variable name, and it's not already in global variables.");
						}
					}
					
				}
				
				if(variable) {
					//console.log("variable=" + JSON.stringify(variable, null, 2));
					
					variableName = ""; // Reset global variableName because we have found the right side
					
					// Traverse the variable pyramid ... Loop through the property chain
					variable = traverseVariableTree(properties, variable, startIndex);
					
					variable.type = getVariableType(rightSide);
					if(variable.type=="this") {
						//console.log("found variable with type=this");
						if(subFunctionDepth > 0) {
							variable.value = myFunction[subFunctionDepth-1].name; // We could point directly at the functon, but we want to avoid too much dublication
						}
						else {
							variable.value = "window"; // "this" is the global scope
						}
						
					}
					else {
						variable.value = rightSide;
					}
					
				}
				else {
					//console.log("No variable!");
				}
				
				rightSide = "";
				
				if(insideVariableDeclaration[codeBlockDepth]) foundVariableInVariableDeclaration = true;
				
			}
			else {
				//console.log("Nothing to do?");
			}
			
		}
		
		
		function traverseVariableTree(properties, variable, startindex) {
			// Go through a object dot notation (foo.bar.baz) - add keys if they do not exist, and return the final variable
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
			//if(char=="-" && lastChar=="-" && llChar=="!") console.log("lllChar=" + lllChar + " insideLineComment=" + insideLineComment + " insideDblQuote=" + insideDblQuote + " insideSingleQuote=" + insideSingleQuote + " insideBlockComment=" + insideBlockComment + " insideHTMLComment=" + insideHTMLComment + " insideRegExp=" + insideRegExp);
			if(!insideScriptTag && char=="-" && lastChar=="-" && llChar=="!" && lllChar=="<" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideRegExp && !CSS) { // <!--
				insideHTMLComment = true;
				insideXmlTag = false;
				xmlMode = xmlModeBeforeTag;
				commentStart = i-4;
			}
			else if(!insideScriptTag && char==">" && lastChar=="-" && llChar=="-" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && insideHTMLComment && !insideRegExp) { // -->
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
				
				if(char=="/"
				&& (lnw=="=" || lnw=="(" || lnw=="[" || lnw=="{" || lnw==";" || lnw=="&" || lnw=="|" || lnw=="^" || lnw=="~" || lnw=="<" || lnw==">" || lnw=="")
				&& !insideRegExp && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideHTMLComment && !insideXmlTag &&
				!CSS && !insideTemplateLiteral) {
					insideRegExp = true;
					regExpStart = i;
					//console.log("RegExp: insideRegExp=" + insideRegExp + " insideRegExpBracket=" + insideRegExpBracket + " line=" + lineNumber + " column=" + column);
				}
				else if(insideRegExp && char=="[" && lastChar != "\\") {
					insideRegExpBracket = true;
					//console.log("RegExp: insideRegExp=" + insideRegExp + " insideRegExpBracket=" + insideRegExpBracket + " line=" + lineNumber + " column=" + column);
				}
				else if(insideRegExp && char=="]" && (lastChar != "\\" || (lastChar=="\\" && llChar=="\\" ))) {
					insideRegExpBracket = false;
					//console.log("RegExp: insideRegExp=" + insideRegExp + " insideRegExpBracket=" + insideRegExpBracket + " line=" + lineNumber + " column=" + column);
				}
				else if(insideRegExp && char=="/" && !insideRegExpBracket && (lastChar != backSlash || (llChar==backSlash && lastChar==backSlash)) ) {
					insideRegExp = false;
					//console.log("RegExp: Exit! : line:" + lineNumber + " col:" + column + " regexContentLength=" + (i - regExpStart) + " insideRegExp=" + insideRegExp + " typeof=" + typeof insideRegExp + " file.path=" + file.path);
					if((i - regExpStart) > 1) return; // Do not return if we see a // line comment (regExp with zero content)
				}
				
				/*
					console.log(" i=" + i + " char=" + char + " line=" + lineNumber + " col=" + column + " insideRegExp=" + insideRegExp + " regExpStart=" + regExpStart + 
					" insideLineComment=" + insideLineComment + " insideDblQuote=" + insideDblQuote + " insideSingleQuote=" + insideSingleQuote + " insideHTMLComment=" + insideHTMLComment + 
					" insideBlockComment=" + insideBlockComment + " insideTemplateLiteral=" + insideTemplateLiteral + " check=" + (insideRegExp && regExpStart != i-1));
				*/
				
				// ### Comments: //
				if(char=="/" && lastChar=="/" && !insideDblQuote && !insideSingleQuote && !insideBlockComment && !insideLineComment  && !insideHTMLComment && !insideRegExp && !CSS && !insideTemplateLiteral) {
					insideLineComment = true;
					commentStart = i-1;
					//console.log("insideLineComment!");
					if(insideArrowFunction) endArrowFunction(1);
				}
				else if(char=="\n" && insideLineComment) {
					insideLineComment = false;
					comments.push(new Comment(commentStart, i));
					//console.log("Found line comment: " +  text.substring(commentStart, i))
				}
				
				// ### Comments: /*   */
				else if(char=="*" && lastChar=="/" && !insideLineComment && !insideDblQuote && !insideSingleQuote && !insideHTMLComment 
				&& !insideBlockComment && !insideTemplateLiteral && !(insideRegExp && regExpStart != i-1)) {
					insideBlockComment = true;
					insideRegExp = false;
					commentStart = i-1;
					commentStartIndentation = indentate && file.grid[row].indentation;
					//console.log("insideBlockComment!");
				}
				else if(char=="/" && lastChar=="*" && insideBlockComment) {
					insideBlockComment = false;
					comments.push(new Comment(commentStart, i));
					//console.log("Found block comment: " + text.substring(commentStart, i));
					if(indentate && file.grid[row].indentation > 0) {
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
						if(lastChar != backSlash || (lastChar==backSlash && llChar==backSlash && lllChar!=backSlash || vbScript)) {				
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
						if(lastChar != backSlash || (lastChar==backSlash && llChar==backSlash)) {	
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
				else if(vbScript && char=="'" && !insideDblQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment) {
					insideLineComment = true;
					commentStart = i-1;
				}
				else if(vbScript && char=="\n" && insideLineComment) {
					insideLineComment = false;
					comments.push(new Comment(commentStart, i));
				}
				
				
				// ### Template literals
				else if(char=="`" && !insideDblQuote && !insideSingleQuote && !insideLineComment && !insideBlockComment && !insideHTMLComment && !insideRegExp) {
					if(insideTemplateLiteral) {
						if(lastChar != backSlash || (lastChar==backSlash && llChar==backSlash)) {	
							insideTemplateLiteral = false;
							quotes.push(new Quote(quoteStart, i));
							
							// Leave xml tag if it was opened inside the quote
							if(insideXmlTag && xmlTagInsideTemplateLiteral) {
								insideXmlTag = false;
								xmlTagInsideTemplateLiteral = false;
								return;
							}
							
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
				if(file.fileExtension=="php") {
					if(pastChar3=="<" &&  pastChar2=="?" &&  pastChar1=="p" &&  pastChar0=="h" && char=="p") { // <?php
						PHP = true;
						language = "PHP";
						xmlMode = false;
						insideXmlTag = false;
					}
					else if(pastChar0=="?" && char==">" && PHP) { // ?>
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
				if(file.fileExtension=="asp" || file.fileExtension=="html" || file.fileExtension=="htm" || file.fileExtension=="inc") {
					if(pastChar0=="<" && char=="%") { // <%
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
					else if(pastChar0=="%" && char==">" && ASP) { // %>
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
				if(file.fileExtension=="xml" || file.fileExtension=="html" || file.fileExtension=="htm") {
					if(pastChar2=="<" &&  pastChar1=="?" &&  pastChar0=="J" && char=="S") { // <?JS
						SSJS = true;
						xmlMode = false;
						insideXmlTag = false;
					}
					else if(pastChar0=="?" && char==">" && SSJS) { // ?>
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
				if(insideXmlTag && pastChar0=="<" && char=="/") {
					// Ending tag: </foo>
					insideXmlTagEnding = true;
				}
				else if(char=="<" && !insideParenthesis[codeBlockDepth] && (xmlMode || (insideQuote && !insideXmlTag) )) {
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
					if(insideTemplateLiteral) xmlTagInsideTemplateLiteral = true;
					
					xmlTagSelfEnding = false;
					xmlTagStart = i;
					xmlTagWordLength = 0;
					if(!insideXmlTagEnding) {
						xmlModeBeforeTag = xmlMode; // xmlMode when the tag starts
						xmlMode = false; // Why end xmlMode inside tags !?? 
					}
					if(insideHTMLComment) error( new Error("WTF") );
				}
				
				// Exit out of style
				else if(CSS && pastChar5=="<" && pastChar4=="/" && pastChar3=="s" && pastChar2=="t" && pastChar1=="y" && pastChar0=="l" && char=="e") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-6;
					insideXmlTagEnding = true;
					insideRegExp = false;
					// CSS=false is set below ... (scroll down)
				}
				// Exit out of script
				else if(insideScriptTag && pastChar6=="<" && pastChar5=="/" && pastChar4=="s" && pastChar3=="c" && pastChar2=="r" && pastChar1=="i" && pastChar0=="p" && char=="t") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-7;
					insideXmlTagEnding = true;
					insideRegExp = false;
				}
				// Exit out of pre
				else if(insideScriptTag && pastChar3=="<" && pastChar2=="/" && pastChar1=="p" && pastChar0=="r" && char=="e") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-4;
					insideXmlTagEnding = true;
					insideRegExp = false;
				}
				// Exit out of textarea
				else if(insideScriptTag && pastChar8=="<" && pastChar7=="/" && pastChar6=="t" && pastChar5=="e" && pastChar4=="x" && pastChar3=="t" && pastChar2=="a" && pastChar1=="r" && pastChar0=="e" && char=="a") {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = i-9;
					insideXmlTagEnding = true;
					insideRegExp = false;
				}
				else if(char==" " && insideXmlTag && xmlTagWordLength === 0) {
					xmlTagWordLength = i - xmlTagStart;
				}
				else if(char==">" && insideXmlTag && (!insideQuote || (xmlTagInsideDblQuote || xmlTagInsideSingleQuote || xmlTagInsideTemplateLiteral)) && !insideParenthesis[codeBlockDepth]) {
					if(pastChar0=="/") {
						xmlTagSelfEnding = true; // Self ending xml tag: <foo />
					}
					
					if(xmlTagWordLength === 0) xmlTagWordLength = i - xmlTagStart;
					xmlTag = text.substr(xmlTagStart + 1 + insideXmlTagEnding, xmlTagWordLength - 1 - insideXmlTagEnding);
					xmlTags.push(new XmlTag(xmlTagStart, i, xmlTagWordLength, xmlTagSelfEnding) );
					
					xmlMode = xmlModeBeforeTag; // Set the xmlMode we had when the tag started
					
					//console.log("xmlTag=" + xmlTag);
					
					if(xmlTag.toLowerCase()=="script" || xmlTag.toLowerCase()=="pre" ||  xmlTag.toLowerCase()=="textarea") {
						
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
					else if(xmlTag.toLowerCase()=="style" && !insideQuote) {
						
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
							if(indentate && xmlTagLastOpenRow != row && file.grid[row].indentation > 0) file.grid[row].indentation--;
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
					xmlTagInsideTemplateLiteral = false;
					
				}
				
			}
			
			
			
			//console.log("Line " + lineNumber + " column=" + column + " char=" + char + " CSS=" + CSS + " xmlMode=" + xmlMode + " xmlModeBeforeTag=" + xmlModeBeforeTag + " xmlModeBeforeScript=" + xmlModeBeforeScript + " insideXmlTag=" + insideXmlTag + " lastXmlTag=" + lastXmlTag + " insideScriptTag=" + insideScriptTag + " insideHTMLComment=" + insideHTMLComment + " insideRegExp=" + insideRegExp);
			
			if(codeBlockLeft==codeBlockRight) {
				insideCodeBlock = false;
			} 
			else {
				insideCodeBlock = true;
			}
			
			if(!insideQuote && !insideComment && !xmlMode && !vbScript && !PHP && !CSS && !insideRegExp && !insideXmlTag) {
				
				//console.log("char(" + i + ")=" + char + "");
				
				/*
					char==" " || char=="\t" || char=="\n" || 
				*/
				
				if(char=="}" || char==";" || char=="," || char=="{" || char==lastLineBreakCharacter) {
					variableStart = i+1;
				}
				
				
				// Read words ...
				readWords(charIndex);
				
				
				//console.log("char=" + char + " word=" + word + " lastWord=" + lastWord + " insideIfStatement=" + insideIfStatement + " ifStatementParenthesesDepth=" + ifStatementParenthesesDepth + " functionName=" + functionName + " insideFunctionDeclaration=" + insideFunctionDeclaration);
				
				// ### Code block indentation for JavaScript & CSS
				if(char=="}") {
					codeBlockR();
				}
				else if(char=="{") {
					codeBlockL();
					willBeJSON = true; // Maybe :P
				}
				
				if(insideIfStatement && char=="(") {
					ifStatementParenthesesDepth++;
				}
				else if(insideIfStatement && char==")") {
					ifStatementParenthesesDepth--;
					if(ifStatementParenthesesDepth==0) {
						singleStatementContext = 1;
						insideIfStatement = false;
						// Find variable assignments inside the if statement !?
						//console.log("end if statement: word=" + word);
						word = "";
						
						
					}
				}
				else if(word=="if" && (char==" " || char=="\t" || char=="(" || char=="\n" || char=="\r")) {
					insideIfStatement = true;
					if(char=="(") ifStatementParenthesesDepth++;
					word = "";
				}
				else if(char==";") {
					insideVariableDeclaration[codeBlockDepth] = false;
					foundVariableInVariableDeclaration = false;
					variableName = "";
					
					if(insideArrowFunction) endArrowFunction(); // Arrow functions without {angel wings} can't have ; inside it
				}
				
				else if(char=="," && !insideParenthesis[codeBlockDepth]) {
					
					//console.log("Found character=, insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " leftSide=" + leftSide + " rightSide=" + rightSide + " word=" + word + " lastWord=" + lastWord + " (line=" + lineNumber + ")");
					
					if(insideArray[codeBlockDepth]) {
						arrayItemCount[codeBlockDepth]++;
					}
					
					foundVariableInVariableDeclaration = false;
					
				}
				else if(char=="[") {
					//console.log("array! word=" + word + " lastWord=" + lastWord);
					
					insideArray[codeBlockDepth] = lastWord;
					
					//insideArray[codeBlockDepth] = findLeftSide(afterPointer[codeBlockDepth]);
					
					//afterPointer[codeBlockDepth] = false; // only endpointer should end it!?
					arrayStart[codeBlockDepth] = i;
					
					codeBlock[codeBlockDepth].indentation++;
					
					arrayStartRow = row;
					
				}
				else if(char=="]") {
					//console.log("End of array=" + insideArray[codeBlockDepth] + " word=" + word + " lastWord=" + lastWord + " leftSide=" + leftSide + " rightSide=" + rightSide + "");
					
					lastWord = insideArray[codeBlockDepth];
					
					word = text.substring(arrayStart[codeBlockDepth], i+1);
					
					insideArray[codeBlockDepth] = false;
					
					if(codeBlock[codeBlockDepth].indentation > 0) codeBlock[codeBlockDepth].indentation--;
					
					if(indentate && file.grid[row].indentation > 0 && arrayStartRow != row) file.grid[row].indentation--;				
					
				}
				else if(char=="}") {
					
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
				else if( ( (char=="=" && lastChar != "=" && text[charIndex+1] != "=") || char==":") && !insideParenthesis[codeBlockDepth]) {
					
					lastVariableName = variableName;
					variableName = text.substring(variableStart, i).trim();  // Used to find name of function
					if(variableName.indexOf("=") != -1) variableName = variableName.slice(0, variableName.indexOf("=")-1);
					afterPointer[codeBlockDepth] = char;
					
					//console.log("found a pointer (char" + char + " lastChar=" + lastChar + " next char=" + text[charIndex+1] + ") codeBlockDepth=" + codeBlockDepth + " variableName=" + variableName + " leftSide=" + leftSide + " rightSide=" + rightSide + " lastWord=" + lastWord + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + "  (line:" + lineNumber + ")");
					
					// Figure out the left side (the variable name)
					
					//leftSide = findLeftSide(char);
					
					
					//console.log("ap leftSide=" + leftSide);
					
				}
				else if(char=="(") {
					
					leftParentheses[codeBlockDepth]++;
					
					if(insideFunctionDeclaration) {
						
						// Figure out the name of the function
						
						//console.log("function!? line=" + lineNumber + " char=" + i + " lastChar = " + lastChar + " word=" + word + " lastWord=" + lastWord + " llWord=" + llWord + " variableName=" + variableName + " functionName=" + functionName + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth]);
						// Sometimes you have var infront of function. 
						
						altFunctionName = lastWord;
						if(altFunctionName=="function") altFunctionName = "";
						
						// insideParenthesis[0]=(functionbar(
						var match = String(insideParenthesis[codeBlockDepth]).match(/function(.*)\(/);
						//if( String(insideParenthesis[codeBlockDepth]).replace(/\s/g, "")=="(function(" ) functionName = ""; // prevent anonymous function to get a (the wrong) name
						
						if(match) {
							if(match[1]) functionName = match[1];
							else functionName = "";
						}
						else if(variableName != "") functionName = variableName;
						else if(lastWord=="function") functionName = ""; // Anonymous!
						else functionName = (lastWord=="function" ? llWord : lastWord) || word.replace("(", "");
						
						if(functionName.indexOf("||") != -1) functionName = ""; // Fix: foo = baz || \n function ...
						
						if(functionName.indexOf("(") != -1) functionName = ""; // Fix for foo(bar(), function() {}); where functionName becomes= ()
						
						//if(functionName.indexOf("=") != -1) functionName = "";
						
						// Note: we do not want to give names to anonymous functions! Or the function-list would be too cluttered
						
						insideFunctionArguments = true;
						
						//console.log("insideFunctionArguments!");
						
						functionArgumentsStart = i+1;
						
					}
					
					//console.log("insideParenthesis! char=" + char + " word=" + word + " llWord=" + llWord);
					
					insideParenthesis[codeBlockDepth] = "(";
					parenthesisStart[codeBlockDepth] = i;
					
				}
				
				else if(char==")") {
					rightParentheses[codeBlockDepth]++;
					insideParenthesis[codeBlockDepth] = "";
					word = text.substring(parenthesisStart[codeBlockDepth], i+1);
					
					if(insideFunctionArguments) {
						insideFunctionArguments = false;
						
						functionArguments = text.substring(functionArgumentsStart, i);
						
						//console.log("functionArguments=" + functionArguments + " (because of right parenthesis)");
					}
					else if(insideArrowFunction) endArrowFunction();
				}
				
				else if(char==">" && lastChar=="=") {
					
					// ## Found Arrow function
					
					if(insideArrowFunction) endArrowFunction(1);
					
					//console.log("Arrow function! line=" + lineNumber + " char=" + i + " lastChar = " + lastChar + " word=" + word + " lastWord=" + lastWord + " llWord=" + llWord + " variableName=" + variableName + " lastVariableName=" + lastVariableName + " functionName=" + functionName + " insideParenthesis[" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth]);
					
					insideArrowFunction = true;
					insideFunctionArguments = false;
					functionArguments = lastWord;
					if(functionArguments.substring(0,1)=="(") {
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
					
					//console.log("functionArguments=" + functionArguments);
					
					//insideFunctionDeclaration = true;
					functionName = lastVariableName;
					
					arrowFunctionStart = i;
					
					afterPointer[codeBlockDepth] = false;
					
				}
				
				else if(char=="{") {
					
					if(singleStatementContext==1) singleStatementContext = 0;
					
					if(indentate && singleStatementContext==2 && file.grid[row].indentation > 0) {
						file.grid[row].indentation--;
					}
					// ### Found function maybe
					
					//console.log("{ insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " insideFunctionDeclaration=" + insideFunctionDeclaration + " insideFunctionArguments=" + insideFunctionArguments + " line:" + lineNumber + "");
					
					if(insideFunctionBody[subFunctionDepth]) L[subFunctionDepth]++;
					
					if((insideFunctionDeclaration) && !insideFunctionArguments) {
						
						// We have found a new function !
						
						//console.log("Found function=" + functionName + "! insideFunctionDeclaration=" + insideFunctionDeclaration + " insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " insideFunctionArguments=" + insideFunctionArguments + " afterPointer[codeBlockDepth=" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth] + " afterPointer[codeBlockDepth-1=" + (codeBlockDepth-1) + "]=" + afterPointer[codeBlockDepth-1] + " insideParenthesis[codeBlockDepth=" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth] + " insideParenthesis[codeBlockDepth-1=" + (codeBlockDepth-1) + "]=" + insideParenthesis[codeBlockDepth-1] + " leftParentheses[codeBlockDepth-1=" + (codeBlockDepth-1) + "]=" + leftParentheses[codeBlockDepth-1] + " rightParentheses[codeBlockDepth-1=" + (codeBlockDepth-1) + "]=" + rightParentheses[codeBlockDepth-1]);
						
						willBeJSON = false; // It will not be JSON until we find another {
						
						
						/*
							json = {
							foo: function() {
							<!-- We are here, cleare the afterPointer for current depth
							}
							}
							
						*/
						//afterPointer[codeBlockDepth] = false; // only endpointer should end it!?
						
						/*
							Add functions to either functions or function.subFunctions!
							If it's a member variable pointing to the function,
							add the whole foo.bar.baz to the function name,
							and add a new key variable with method=true
						*/
						
						newFunc = new Func(functionName, functionArguments, i, lineNumber+parseStartRow, codeBlockLeft, codeBlockRight);
						
						if(insideArrowFunction) newFunc.arrowFunction = true;
						
						if(leftParentheses[codeBlockDepth-1] > rightParentheses[codeBlockDepth-1]) newFunc.lambda = true;
						
						//console.log("functionName=" + functionName + " type=" + typeof functionName);
						
						
						if(functionName === false) functionName = "unknownmeh"; // Why can functionName be a boolean (false) !???
						
						properties = functionName.split(".");
						
						if(afterPointer[codeBlockDepth-1] == ":" && properties.length == 1) {
							leftSide = findLeftSide(":", codeBlockDepth-1);
							//console.log("method? leftSide=" + leftSide + " functionName=" + functionName + " altFunctionName=" + altFunctionName + " world=" + word + " lastWord=" + lastWord + " variableName=" + variableName + " lastVariableName=" + lastVariableName);
							// todo: Add the variable!?
							if(leftSide.charAt(leftSide.length-1) == ".") functionName = leftSide + functionName;
							else if(leftSide.indexOf(".") != -1) functionName = leftSide;
							
							if(functionName.charAt(0) == ".") {
// It's an object without a name that has a method pointing to a function !?
								newFunc.lambda = true;
								if(altFunctionName) functionName = altFunctionName;
								else functionName = variableName;
							}
							
							newFunc.name = functionName;
							properties = functionName.split(".");
						}
						
						//console.log("subFunctionDepth=" + subFunctionDepth);
						
						if(globalVariables[properties[0]]) newFunc.global = true; // A global variable pointing to a function!
						
						if(insideFunctionBody[subFunctionDepth]) { 
							// It's a sub-function. 
							
							subFunctionIndex = myFunction[subFunctionDepth].subFunctions.push(newFunc) - 1;
							
							myFunction[subFunctionDepth+1] = myFunction[subFunctionDepth].subFunctions[subFunctionIndex];
							
							subFunctionDepth++; // Functions within this function's body will be sub-functions
							
							L[subFunctionDepth] = 1;
							R[subFunctionDepth] = 0;
							
							if(properties.length > 1) {
								if(Object.hasOwnProperty.call(myFunction[subFunctionDepth-1].variables, properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									variable = myFunction[subFunctionDepth-1].variables[properties[0]];
									startIndex = 1;
									variable = traverseVariableTree(properties, variable, startIndex);
									variable.method = true;
								}
							}
							
						}
						else {
							
							// a global function
							if(!newFunc.lambda) newFunc.global = true;
							functionIndex = functions.push(newFunc) - 1;
							
								myFunction[subFunctionDepth] = functions[functionIndex];
							
							// Remove from global variables
							if(Object.hasOwnProperty.call(globalVariables, functionName)) {
								//console.log("deleteFromGlobalVar=" + functionName + " newFunc.name=" + newFunc.name + " row=" + row + " column=" + column);
								delete globalVariables[functionName];
							}
							
							if(properties.length > 1) {
								if(Object.hasOwnProperty.call(globalVariables, properties[0])) {
									// This is a variable (method) for a function: foo.bar.baz = function()
									variable = globalVariables[properties[0]];
									startIndex = 1;
									variable = traverseVariableTree(properties, variable, startIndex);
									variable.method = true;
								}
							}
							
							
							
							
						}
						
						
						if(properties.length > 1 && properties[properties.length-2] == "prototype") {
							// it's a prototype function
							for(var j=0; j<functions.length; j++) {
								if(functions[j].name == properties[properties.length-3]) {
									//newFunc.name = properties[properties.length-1];
									functions[j].prototype[ properties[properties.length-1] ] = new Variable();
									functions[j].prototype[ properties[properties.length-1] ].method = true;
									//console.log("Added " +  properties[properties.length-1] + " to " + properties[properties.length-3] + " prototype");
									break;
								}
							}
							if(j==functions.length) console.warn("Unable to find function " + properties[properties.length-3]);
							
						}
						else if(properties.length > 1) {
							theFunction = getFunctionWithName(functions, properties[0]);
							if(theFunction) {
								// This is a variable (method) for a function: foo.bar.baz = function()
								// This is run after variables has been added.
								// Using Object.hasOwnProperty.call because the object might have a variable called "hasOwnProperty"
								if(Object.hasOwnProperty.call(theFunction.variables, properties[1])) {
									
									variable = theFunction.variables[properties[1]];
									startIndex = 2;
									variable = traverseVariableTree(properties, variable, startIndex);
									variable.method = true;;
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
				
				//console.log("char=" + char.replace("\r", "<R>").replace("\n", "<N>") + " word=" + word + " insideDblQuote=" + insideDblQuote + " insideLineComment=" + insideLineComment + " LLC=" + (char==lastLineBreakCharacter) + " FLC=" + (char==firstLineBreakCharacter) + " firstLineBreakCharacter=" + firstLineBreakCharacter.replace("\r", "<R>").replace("\n", "<N>") + " insideVariableDeclaration[codeBlockDepth]=" + insideVariableDeclaration[codeBlockDepth]);
				
				//char = char.toLowerCase(); // vbScript is not case sensitive!
				
				if(!insideDblQuote && (char==" " || char=="\t") && pastChar0.toLowerCase()=="m" && pastChar1.toLowerCase()=="e" && pastChar2.toLowerCase()=="r" && isWhiteSpace(pastChar3)) {
					insideLineComment = true;
					commentStart = i;
				}
				// else console.log("char=" + char + " pastChar0=" + pastChar0 + " pastChar1=" + pastChar1 + " pastChar2=" + pastChar2 + " pastChar3=" + pastChar3);					
				
				
				
				if(!insideDblQuote && !insideLineComment) {
					
					// ### Collect vbScript words
					
					if(char=="\r" || char=="\n" || char=="%" || char==" " || char=="\t" || char==":" || char==",") {
						
						// ### vbScript Variable declarations
						if(insideVariableDeclaration[codeBlockDepth] && (char==firstLineBreakCharacter || char==":")) {
							variableName = word || lastWord;
							insideVariableDeclaration[codeBlockDepth] = false;
							if(variableName) globalVariables[variableName] = new Variable();
							console.log("LLBS New variable found=" + variableName + " line=" + lineNumber + " column=" + column);
						}
						else if(word=="dim") {
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
							else if(word=="if" && lastWord=="end") { // END IF
								vb_thisRowIndentation--;
							}
							else if(word=="if") {
								vb_afterIf = true; // Inside single line if maybe!?
								vb_insideCondition = true;
								vb_nextRowIndentation = 1; 
							}
							else if(word=="then" && vb_afterIf) {
								vb_afterThen = true; // If a word comes next; it's a single line if-statement
							}
							else if(vb_afterThen) {
								vb_afterThen = false;
								// This is a single line if-statement!
								vb_nextRowIndentation = 0; // Cancel out the indentation
								//console.log("vb_afterThen yo!");
							}
							else if(word=="else" && lastWord != "case") {
								vb_thisRowIndentation--;
								vb_nextRowIndentation = 1; 
							}
							else if(word=="elseif") {
								vb_insideCondition = true;
								vb_thisRowIndentation--;
								vb_nextRowIndentation = 1
							}
							
							// ### DO ... LOOP
							else if(word=="do" && lastWord != "exit") {
								vb_nextRowIndentation = 1;
								vb_insideCondition = true;
							}
							else if(word=="loop") {
								vb_thisRowIndentation--;
								vb_insideCondition = true;
							}
							
							// ### FOR ... NEXT
							else if(word=="for" && lastWord != "exit") {
								//console.log("for: vb_nextRowIndentation=" + vb_nextRowIndentation);
								vb_nextRowIndentation = 1;
								vb_insideFor++;
							}
							else if(word=="next" && vb_insideFor != 0) {
								vb_thisRowIndentation--;
								vb_insideFor--;
							}
							
							// ### CLASS ... END CLASS
							else if(word=="class" && lastWord=="end") {
								vb_thisRowIndentation--;
							}
							else if(word=="class") {
								vb_nextRowIndentation = 1;
							}
							
							// ### WHILE ... WEND
							else if(word=="while") {
								vb_nextRowIndentation = 1;
								vb_insideCondition = true;
							}
							else if(word=="wend") {
								vb_thisRowIndentation--;
							}
							
							/*
								Note: We will not support VB, just VBS!
								VB for example allows "end while" while you can only end with "wend" in VBS
							*/
							
							// ### SELECT CASE ... END SELECT
							else if(word=="select" && lastWord=="end") {
								vb_thisRowIndentation--;
							}
							else if(word=="case" && lastWord=="select") {
								vb_nextRowIndentation = 1;
							}
							
							// ### CASE
							else if(word=="case") {
								vb_nextRowIndentation = 1;
								//if(haveCase) vb_thisRowIndentation--;
								vb_thisRowIndentation--;
							}
							
							
							// ### FUNCTION ... END FUNCTION
							else if(word=="function" && lastWord=="end") {
								vb_thisRowIndentation--;
							}							
							else if(word=="function" && lastWord != "exit") {
								vb_nextRowIndentation = 1;
							}
							
							
							// ### SUB ... END SUB
							else if(word=="sub" && lastWord=="end") {
								vb_thisRowIndentation--;
							}
							else if(word=="sub" && lastWord != "exit") {
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
				if(char=="{") {
					codeBlockL();
				}
				else if(char=="}") {
					codeBlockR();
				}
				
			}
			
			else if(CSS) {
				// ## Parse CSS
				
				if(char=="{") {
					codeBlockL();
				}
				else if(char=="}") {
					codeBlockR();
				}
				
			}
			
			
			if(insideArrowFunction && (char=="\r" || char=="\n")) endArrowFunction();
			
			
			
			
			if( (char=="\r" || char=="\n") && insideVariableDeclaration[codeBlockDepth] && !(pastChar0=="," || pastChar1=="," || pastChar2==",") ) {
				// A new line without , exits variable declaration
				insideVariableDeclaration[codeBlockDepth] = false;
				foundVariableInVariableDeclaration = false;
				variableName = "";
				
				//console.log("pastChar0=" + JSON.stringify(pastChar0) + " char=" + UTIL.lbChars(char) + " ? " +  (pastChar0=="," || pastChar1=="," || pastChar2==",") );
				
				
				
			}
			
			
			if(char==lastLineBreakCharacter) {
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
				
				if(vb_nextRowIndentation==1) {
					vb_thisRowIndentation++;
					vb_nextRowIndentation = 0;
				}
				
				// Sets indentation on NEXT row
				
				lineNumber++;
				row++;
				column = 0;
				
				if(singleStatementContext==2) singleStatementContext = 0;
				
				//console.log("i=" + i + " lineNumber=" + lineNumber + " lastWord=" + lastWord + " word=" + word);
				
				//console.log("(Indent) codeBlockDepth=" + codeBlockDepth + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]  + " insideBlockComment=" + insideBlockComment + " line:" + lineNumber);
				
				//console.log("Setting indentation on line=" + lineNumber + " : " + Math.max(0, codeBlock[codeBlockDepth].indentation + insideBlockComment + openXmlTags + baseIndentation));
				
				if(indentate) {
					if(!file.grid[row]) error( new Error("Grid row=" + row + " does not exist!") );
					file.grid[row].indentation = Math.max(0, codeBlock[codeBlockDepth].indentation + insideBlockComment + openXmlTags + baseIndentation + singleStatementContext);
				}
				if(insideXmlTag && (insideDblQuote || insideSingleQuote) && !insideQuote) insideXmlTag = false;
				
				if(singleStatementContext==1) singleStatementContext++;
				
				//console.warn("Line=" + lineNumber + " file.grid[" + row + "].indentation=" + file.grid[row].indentation + " insideBlockComment=" + insideBlockComment + " codeBlock[" + codeBlockDepth + "].indentation=" + codeBlock[codeBlockDepth].indentation + " insideVariableDeclaration[" + codeBlockDepth + "]=" + insideVariableDeclaration[codeBlockDepth]);
				//console.log("Row " + row);
			}
			
			
		}
		
		function endArrowFunction(indexMinus) {
			
			// Arrow functions without { angel wings } CAN have sub functions =)
			// Don't bother trying to figure out the subfunctions though, just place them under the function function or global
			
			//console.log("End Arrow Function: word=" + word + " char=" + char + " functionName=" + functionName + " functionArguments=" + functionArguments + " subFunctionDepth=" + subFunctionDepth + " lastVariableName=" + lastVariableName);
			
			functionName = lastVariableName || functionName;
			
			if(functionName.indexOf("=") != -1) {
				functionArguments = functionName.slice(functionName.indexOf("=")+1).trim();
				functionName = lastVariableName;
			}
			
			newFunc = new Func(functionName, functionArguments, arrowFunctionStart, lineNumber+parseStartRow);
			
			newFunc.arrowFunction = true;
			newFunc.lambda = true;
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
						variable = myFunction[subFunctionDepth].variables[properties[0]];
						startIndex = 1;
						variable = traverseVariableTree(properties, variable, startIndex);
						variable.method = true;
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
							// Using Object.hasOwnProperty.call because the object might have a variable called "hasOwnProperty"
							if(Object.hasOwnProperty.call(theFunction.variables, properties[1])) {
								
								variable = theFunction.variables[properties[1]];
								startIndex = 2;
								variable = traverseVariableTree(properties, variable, startIndex);
								variable.method = true;
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
			
			//console.log("readWords: char=" + char + " word=" + word + " leftParentheses[codeBlockDepth=" + codeBlockDepth + "]=" + leftParentheses[codeBlockDepth] + " rightParentheses[codeBlockDepth=" + codeBlockDepth + "]=" + rightParentheses[codeBlockDepth] + " afterPointer[codeBlockDepth=" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth]);
			
			// .substr(start,length)   .substring(start,end)
			// problem: if the whole script is encapsulated with a clusure: (function() {
			// problem 2: Prevent functionSomething to be registered
			if(insideParenthesis[codeBlockDepth]) {
				if(char != " ") { // Why do I need to ignore spaces?
					insideParenthesis[codeBlockDepth] += char;
					word = word + char;
				}
				if(  insideParenthesis[codeBlockDepth] + char=="(function " || insideParenthesis[codeBlockDepth]=="(function(" ) {
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
			else if(char==" " && word=="var") {
				insideVariableDeclaration[codeBlockDepth] = true;
				lastVariableDeclarationLine = lineNumber;
				word = "";
				variableStart = i;
				return;
			}
			else if(char==" " && word=="function") {
				// Detects: function foo() ...
				insideFunctionDeclaration = true;
				word = "";
				llWord = lastWord;
				lastWord = "function";
				return;
			}
			else if(char=="(" && word=="function") {
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
			else if(char==" " && insideFunctionBody[subFunctionDepth] && word=="return") {
				console.log("Start of return statement? lineNumber=" + lineNumber + " column=" + column);
				insideReturn[codeBlockDepth] = true;
				returnStart = i+1;
				insideReturnStatement = true;
				returnStatement = null;
				word = "";
				return;
			}
			else if( insideReturn[codeBlockDepth] && (char=="\r" || char=="\n") && !(lnw=="+" || lnw=="-" || lnw=="*" || lnw=="/" || lnw=="%" || lnw=="|" || lnw=="&" || lnw=="{" || lnw=="[") ) {
				console.log("End of return statement? lineNumber=" + lineNumber + " column=" + column);
				myFunction[subFunctionDepth].returns.push(text.slice(returnStart, i));
				insideReturn[codeBlockDepth] = false;
				insideReturnStatement = true;
				returnStatement = null;
			}
			else if(char==" " && word=="new") {
				word = "";
				return;
			}
			else if(charIndex==textLength || char=="=" || char=="(" || char==")" || char=="\t" || char=="\r" || char=="\n" || char=="," || char==";" || char=="{" || char=="}" || char==":" || char=="," || char=="[" || char=="]" || char==">") {
				
				// char==" " || char=="+" || char=="-" || char=="/" || char==">" || char=="<" ||
				// If we are inside an array, the word is a value!
				// insideArray[codeBlockDepth] ||
				
				word = word.trim();
				
				//console.log("i=" + i + " line=" + lineNumber + " word=" + word + " lastWord=" + lastWord);
				
				//console.log("i=" + i + " word=" + word + " singleStatementContext=" + singleStatementContext)
				if(singleStatementContext==1 && !insideParenthesis[codeBlockDepth] && word && word.slice(-1) != ")" && word.slice(-1) != "/") {
					//console.log("i=" + i + " line=" + lineNumber + " char=" + char + " reset singleStatementContext!");
					singleStatementContext = 0;
				}
				
				if(word.length > 0 && word != "/") { // Ignore / slash
					
					if(word=="if" || word=="else" || word=="new" || word=="while" || word=="for") {
						if(word == "if") {
							insideIfStatement = true;
							//if(char == "(") ifStatementParenthesesDepth++;
						}
						word = "";
						singleStatementContext = 1;
						return;
					}
					else if(word=="function") {
						// Detects var foo = function() ...
						insideFunctionDeclaration = true;
						word = "";
						return;
					}
					else if(word.charAt(0)=="(" && word.charAt(word.length-1)==")") {
						// We got parameters for function call/declaration, or for/while/do loops
						// Everything insiide a parentheses is added to the word 
						//console.log("In parentheses: word=" + word + " lastWord=" + lastWord + " llWord=" + llWord + " singleStatementContext=" + singleStatementContext);
						//lastWord = lastWord + word;
						if(singleStatementContext && word.indexOf(";") != -1) {
							// Found variable declaration insode for loop !?
							findVariables( word.slice(1,word.indexOf(";")), myFunction, subFunctionDepth);
						}
						
						word = "";
						return;
					}
					else {
						
						words.push(word);
						
						console.log("NEW WORD='" + word + "' insideVariableDeclaration[" + subFunctionDepth + "]=" + insideVariableDeclaration[codeBlockDepth] + " afterPointer[codeBlockDepth=" + codeBlockDepth + "]=" + afterPointer[codeBlockDepth] + " insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + "  insideCodeBlock=" + insideCodeBlock + " codeBlock[" + codeBlockDepth + "]=" + JSON.stringify(codeBlock[codeBlockDepth]) + " insideFunctionDeclaration=" + insideFunctionDeclaration + " willBeJSON=" + willBeJSON + " insideArray[" + codeBlockDepth + "]=" + insideArray[codeBlockDepth] + " foundVariableInVariableDeclaration=" + foundVariableInVariableDeclaration + " (line:" + lineNumber + ")");
						
						
						if(word=="return") {
							console.log("return undefined?");
							if(myFunction[subFunctionDepth]) {
							myFunction[subFunctionDepth].returns.push("void");
							}
						}
						
						if(afterPointer[codeBlockDepth]) {
							// We are on the rights side of a pointer
							// Look for foo = bar = baz = 1
							if(char!="=" && lastWord != "function") {
								rightSide += word;
								//console.log("found rightSide=" + rightSide + " (leftSide=" + leftSide + " char=" + char + " word=" + word + " lastWord=" + lastWord + " llWord=" + llWord + ")");
								endPointer();
							}
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
							
							if(insideVariableDeclaration[codeBlockDepth]) { //  && foundVariableInVariableDeclaration==false, removed because we couldn't find vars inside a function declared with var f = function
								
								// We are inside a var declaration!
								
								//console.log(word + " is a variable (declared with var)! insideFunctionBody[" + subFunctionDepth + "]=" + insideFunctionBody[subFunctionDepth] + " insideCodeBlock=" + insideCodeBlock + " ");
								
								
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
									// Inside a global object notation declaration ?
									//console.log("Inside a global object notation declaration !??? word=" + word + " (line:" + lineNumber + ")");
									
									// A global variable is declared:
									
									globalVariables[word] = new Variable();
									//console.log("Added GLOBAL variable=" + word + "");
									foundVariableInVariableDeclaration = false;
									
								}
								
								
								
							}
							else if(insideFunctionDeclaration) {
								//console.log("Found functon name maybe? word=" + word);
								functionName = word;
							}
							
							else {
								//console.log("Inside a JSON declaration? (line=" + lineNumber + ")")
							}
						}
						
						lastWord = word;
						
						word = "";
					}
					
					
				}
				else if(char=="}" && afterPointer[codeBlockDepth-1]=="=" && lastWord && lastWord.match(reValidVariableName)) {
					// Find object notation and mark the variable as type Object
					console.log("Object? lineNumber=" + lineNumber + " variableName=" + variableName + " word=" + word + " lastWord=" + lastWord + " insideParenthesis[codeBlockDepth=" + codeBlockDepth + "]=" + insideParenthesis[codeBlockDepth]);
					// Find the variable and set the type to Object
					properties = lastWord.split(".");
					variable = null;
					if(myFunction[subFunctionDepth]) {
						if(Object.hasOwnProperty.call(myFunction[subFunctionDepth].variables, properties[0])) {
							variable = myFunction[subFunctionDepth].variables[properties[0]];
						}
					}
					
					if(!variable) {
						// If it's not found inside the function, asume it's a global
						if(Object.hasOwnProperty.call(globalVariables, properties[0])) variable = globalVariables[properties[0]];
						else {
							//console.log("Variable " + properties[0] + " doesn't exist in global variables. Creating it!");
							variable = globalVariables[properties[0]] = new Variable(); // Add it if it doesn't exist
							
						}
					}
					
					//console.log("Variable: " + properties[0] + "=" + JSON.stringify(variable, null, 2) + " type=" + variable.type + " (" + (typeof variable.type) + ")");
					
					if(properties.length>1) {
						variable = traverseVariableTree(properties, variable, 1);
					}
					
					//console.log("Setting type=Object to " + lastWord + " (" + JSON.stringify(variable) + ")");
					variable.type = "Object";
					
					//console.log("After setting type: " + properties[0] + "=" + JSON.stringify(variable, null, 2) + " type=" + variable.type + " (" + (typeof variable.type) + ") globalVariables=" + JSON.stringify(globalVariables, null, 2));
					
				}
				else {
					//console.log("errm? word=" + word);
				}
			}
			else {
				
				word = word + char;
				
				if(word==" ") word = "";
				if(word=="/") word = ""; // Prevent words after comments having /
				
			}
			
			//console.log("word=" + word + " lastWord=" + lastWord);
			
			
		}
		
		
		function getFunctionWithName(functions, name) {
			for(var i=0; i<functions.length; i++) {
				if(functions[i].name==name) return functions[i];
			}
			return null;
		}
		
		function error(err) {
			i = parseEnd; // Exit the loop
			
			if(typeof parseError != "undefined") parseError(err);
			else throw err;
		}
		
		function findVariables(str, myFunction, subFunctionDepth) {
			str = str.trim();
			var variableDeclarationWord = str.slice(0, str.indexOf(" "));
			if( variableDeclarationWord=="var" || variableDeclarationWord=="let" || variableDeclarationWord=="const" ) {
				str = str.slice(variableDeclarationWord.length);
			}
			else variableDeclarationWord = "";
			
			var variables = str.split(",");
			
			variables = variables.map(function(varStr) {
				var eqIndex = varStr.indexOf("=");
				if( eqIndex != -1 ) {
					var left = varStr.slice(0, eqIndex ).trim();
					var right = varStr.slice(eqIndex+1).trim();
				}
				else {
					var left = varStr.trim();
					var right = "";
				}
				return {left: left, right: right};
			});
			
			//console.log("findVariables: variables = " + JSON.stringify(variables));
			
			variables.forEach(function(variable) {
				
				var theVariable = new Variable( getVariableType(variable.right), variable.right );
				var func = myFunction[subFunctionDepth];
				
				if( variableDeclarationWord && func) {
					func.variables[ variable.left ] = theVariable;
				}
				else {
					globalVariables[ variable.left ] = theVariable;
				}
				
			});
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
		func.lambda = false; // If it's declared inline, meaning it can only be called by itself'
		func.global = false;  // If the function is a method to a global variable, and thus callable from global scope 
		func.prototype = {}; // Variables. (Prototype methods will also be added as a variable here for consistency, it will also exist as a function)
		func.returns = []; // List of variables, or null's (void)
		
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
		
		this.type = type || "unknown";
		this.value = value || "";
		this.keys = {};
		this.method = false;
		
		// Variables can be methods, all functions are however added to functions/subfunctions, so arguments have to be looked up from there
		
		// Only functions Should have a prototype! 
		
		//console.warn("new Variable! type=" + type + " value=" + value + "");
		}
	
	function XmlTag(start, end, wordLength, selfEnding) {
		this.start = start;
		this.end = end;
		this.wordLength = wordLength;
		this.selfEnding = selfEnding;
	}
	
	function compareObjects(arr1, arr2) {
		// Assumes each item in the array is an object
		var diff = [];
		for(var i=0; i<arr1.length && i<arr2.length; i++) {
			for(var key in arr1[i]) {
				if(arr1[i][key] != arr2[i][key]) return "Item " + i + ": " + JSON.stringify(arr2[i]);
			}	
		}
		return "Same!";
	}
	
	
	
})();
