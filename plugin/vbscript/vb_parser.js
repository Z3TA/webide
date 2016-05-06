(function() {
	"use strict";
	
	/*
		This is a parser for vbScript
		
		Goal is to return an object with:
		quotes
		comments
		
		And make code indentation !
		
		... and maybe ...
		
		functions
		quotes
		comments
		globalVariables
		blockMatch = true|false (if there are as many { as there are }
		xmlTags
		
	*/
	
	editor.on("start", vbParserInit, 100);
	
	function vbParserInit() {
		
		editor.on("fileOpen", onFileOpen);
		editor.on("fileChange", onEdit, 100);
		
		function onEdit(file, type, character, index, row, col) {
			onFileOpen(file); //  optimization is evil
		}
		
		function onFileOpen(file) {
			
			if(isVbScript(file)) {
				
				console.log("File is vb-script: " + file.path + " ...");
				
				file.haveParsed(parseVbScript(file)); // Tell the file that it has been parsed so that functions depending on the parsed data can update
				
			}
			else {
				console.log("File NOT vb-script: " + file.path);
			}
			
		}
	}


	function parseVbScript(file) {
		
		console.time("parseVbScript");
		
		var text = file.text.toLowerCase(); // vbScript is not case sensitive!
		
		var char = "";
		var pastChar = new Array("", "", "", "", "", "", "");
		
		var insideDblQuote = false;

		var doubleQuoteStart = 0;
		var quotes = [];
		
		var insideLineComment = false;
		var commentStart = 0;
		var comments = [];
		var insideHTMLComment = false;
		
		var codeBlockLeft = 0;
		var codeBlockRight = 0;
		
		var xmlTags = [];
		
		var insideVariableDeclaration = false;
		var variables = [];
		var globalVariables = [];
		
		var insideCondition = false;
		
		var LF="\n", CR="\r", C="c", D="d", E="e", F="f", H="h", I="i", L="l", M="m", N="n", O="o", P="p", R="r", S="s", T="t", W="w"; 
		var space = " ", tab = "\t", comma = ",", colon = ":", percent = "%", leftArrow = "<", rightArrow = ">";
		var singleQuote = "'";
		var doubleQuote = '"';
		
		if(file.lineBreak.length == 2) {
			var firstLineBreakCharacter = file.lineBreak.charAt(0);
			var lastLineBreakCharacter = file.lineBreak.charAt(1);
		}
		else if(file.lineBreak == LF) {
			var firstLineBreakCharacter = LF;
			var lastLineBreakCharacter = LF;
		}
		else throw new Error("No linebreaks!");
		
		var word = "";
		var lastWord = "";
		
		var afterThen = false;
		var afterIf = false;
		
		var thisRowIndentation = 0;
		var nextRowIndentation = false;
		
		var row = 0;
		
		var xmlMode = (file.fileExtension == "asp");
		var insideXmlTag = false;
		var insideXmlTagEnding = false;
		var xmlTag = "";
		var lastXmlTag = "";
		var xmlTagStart = -1; 
		var xmlTags = [];
		var xmlTagWordLength = 0;
		var xmlTagSelfEnding = false;
		var openXmlTags = 0;
		var xmlTagLastOpenRow = -1;
		var tmpXmlMode = xmlMode;
		var tagBreak = editor.settings.indentAfterTags;
		var xmlModeBeforeScript = xmlMode;
		
		
		for(var charIndex=0; charIndex<text.length; charIndex++) {
			
			// Save a history of the last characters
			pastChar[6] = pastChar[5];
			pastChar[5] = pastChar[4];
			pastChar[4] = pastChar[3];
			pastChar[3] = pastChar[2];
			pastChar[2] = pastChar[1];
			pastChar[1] = pastChar[0];
			pastChar[0] = char;
			char = text.charAt(charIndex);
			
			//console.log("char=" + char.replace(/\n/, "LF").replace(/\r/, "CR") + " insideXmlTag=" + insideXmlTag + " insideCondition=" + insideCondition + " xmlMode=" + xmlMode + " insideDblQuote=" + insideDblQuote + " insideLineComment=" + insideLineComment);
			
			
			/*
				### ASP script tags
				<% 
				...
				%>
				
			*/
			if(!insideLineComment && !insideDblQuote) {
				if(pastChar[0] == leftArrow && char == percent) { // <%
					xmlMode = false;
				}
				else if(pastChar[0] == percent && char == rightArrow) { // %>
					xmlMode = true;
				}
			}
			
			// ### Comments: <!-- -->
			if(char == "-" && pastChar[0] == "-" && pastChar[1] == "!" && pastChar[2] == "<" && !insideLineComment && !insideDblQuote && !insideHTMLComment) { // <!--
				insideHTMLComment = true;
				insideXmlTag = false;
				xmlMode = tmpXmlMode;
				commentStart = charIndex-4;
			}
			else if(char == ">" && pastChar[0] == "-" && pastChar[1] == "-" && !insideLineComment && !insideDblQuote && insideHTMLComment) { // -->
				insideHTMLComment = false;
				comments.push(new Comment(commentStart, charIndex));
				//console.warn("Found HTML comment! line=" + lineNumber + " ");
			}
			
			if(!xmlMode) {
				
				/*
					## Comments
					REM bla bla
					' bla bla
				*/
				if(!insideLineComment && !insideDblQuote && (char == singleQuote || (char == space && pastChar[0] == M && pastChar[1] == E && pastChar[2] == R))) {
					insideLineComment = true;
					commentStart = charIndex + (char == M);
				}
				else if(insideLineComment && char == firstLineBreakCharacter) {
					insideLineComment = false;
					comments.push(new Comment(commentStart, charIndex-1));
				}
				
				
				/* 
					## Quotes
					vbScript escape double quotes with "", 
					ex: 
					foo = "one ""two"" three"
					foo = "" ' Empty string
				*/
				if(char == doubleQuote && !insideLineComment) {
					if(insideDblQuote) {
						insideDblQuote = false;
						quotes.push(new Quote(doubleQuoteStart, charIndex));
					}
					else {
						insideDblQuote = true;
						doubleQuoteStart = charIndex;
					}
				}
				
				else if(!insideDblQuote && !insideLineComment) {
					
					// ### Collect words
					
					if(char == LF || char == CR || char == space || char == tab || char == colon || char == comma) {
										
						// ### Variable declarations
						if(insideVariableDeclaration && char == firstLineBreakCharacter) {
							insideVariableDeclaration = false;
							if(word) globalVariables.push(word);
						}
						else if(word == "dim") {
							insideVariableDeclaration = true;
							word = "";
						}
						else if(word) {
							
							if(insideVariableDeclaration) globalVariables.push(word);
							
							// ### IF .. THEN .. ELSE ..
							else if(word == "if" && lastWord == "end") { // END IF
								thisRowIndentation--;
							}
							else if(word == "if") {
								afterIf = true; // Inside single line if maybe!?
								insideCondition = true;
								nextRowIndentation = true; 
							}
							else if(word == "then" && afterIf) {
								afterThen = true; // If a word comes next; it's a single line if-statement
							}
							else if(afterThen) {
								afterThen = false;
								// This is a single line if-statement!
								nextRowIndentation = false; // Cancel out the indentation
								//console.log("afterThen yo!");
							}
							else if(word == "else") {
								thisRowIndentation--;
								nextRowIndentation = true; 
							}
							else if(word == "elseif") {
								insideCondition = true;
								thisRowIndentation--;
								nextRowIndentation = true
							}
							
							// ### DO ... LOOP
							else if(word == "do") {
								nextRowIndentation = true;
								insideCondition = true;
							}
							else if(word == "loop") {
								thisRowIndentation--;
								insideCondition = true;
							}
							
							// ### FOR ... NEXT
							else if(word == "for") {
								//console.log("for: nextRowIndentation=" + nextRowIndentation);
								nextRowIndentation = true;
							}
							else if(word == "next") {
								thisRowIndentation--;
							}
							
							// ### CLASS ... END CLASS
							else if(word == "class" && lastWord == "end") {
								thisRowIndentation--;
							}
							else if(word == "class") {
								nextRowIndentation = true;
							}
							
							// ### WHILE ... WEND
							else if(word == "while") {
								nextRowIndentation = true;
								insideCondition = true;
							}
							else if(word == "wend") {
								thisRowIndentation--;
							}
							
							// ### SELECT CASE ... END SELECT
							else if(word == "select" && lastWord == "end") {
								thisRowIndentation--;
							}
							else if(word == "case" && lastWord == "select") {
								nextRowIndentation = true;
							}
							
							//console.log("line=" + (row+1) + " word=" + word + " thisRowIndentation=" + thisRowIndentation + " nextRowIndentation=" + nextRowIndentation);
							
							lastWord = word;
							word = "";
						}
						
					}
					else {
						
						word += char; // Add to the word
						
					}
				}
			}
			
			if(!insideLineComment && !insideHTMLComment) {
				/*
					### Find xml-tags.
					
					Look out for IF x < y
					and array of strings: "<", ">",
					
					PS: We are Not inside an HTML comment until the parser finds the last - in <!--
					
					In for example img src there can be a /
					but we can also have html inside quotes! foo='<img src="foo/bar.jpg"/>'
				*/
				
				if(insideXmlTag && pastChar[0] == "<" && char == "/") {
					// Ending tag: </foo>
					insideXmlTagEnding = true;
				}
				else if(char == "%" && insideXmlTag) {
					insideXmlTag = false;
				}
				else if(char == "<" && !insideXmlTag && !insideCondition) { // Removed  && (xmlMode || insideDblQuote) because of script tag turning off xmlMode causing not to find end of script tag, so xmlMode never turns on again
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = charIndex;
					if(!insideXmlTagEnding) {
						tmpXmlMode = xmlMode; // xmlMode when the tag starts
						xmlMode = false;
					}
					if(insideHTMLComment) throw new Error("WTF");
				}
				else if(char == " " && insideXmlTag && xmlTagWordLength === 0) {
					xmlTagWordLength = charIndex - xmlTagStart;
				}
				else if(char == ">" && insideXmlTag && !insideCondition) {
					if(pastChar[0] == "/") {
						xmlTagSelfEnding = true; // Self ending xml tag: <foo />
					}
					if(xmlTagWordLength === 0) xmlTagWordLength = charIndex - xmlTagStart;
					xmlTag = text.substr(xmlTagStart + 1 + insideXmlTagEnding, xmlTagWordLength - 1 - insideXmlTagEnding);
					xmlTags.push(new XmlTag(xmlTagStart, charIndex, xmlTagWordLength, xmlTagSelfEnding) );
					
					xmlMode = tmpXmlMode; // Set the xmlMode we had when the tag started
					
					if(xmlTag.toLowerCase() == "script" || xmlTag.toLowerCase() == "pre") {
						
						if(insideXmlTagEnding) {
							// Use default xmlMode after script tag ended
							xmlMode = xmlModeBeforeScript;
							//console.log("Ended tag:" + xmlTag);
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
							
							//console.log("Ending tag=" + xmlTag + " xmlTagLastOpenRow=" + xmlTagLastOpenRow + " row=" + row + " ");
							
							openXmlTags--;
							if(xmlTagLastOpenRow != row && thisRowIndentation > 0) thisRowIndentation--;
							
							if(xmlTagLastOpenRow == row) nextRowIndentation = false;
							
						}
						else {
							// It's a tag opening
							openXmlTags++;
							xmlTagLastOpenRow = row;
							nextRowIndentation = true;
						}
						}
					
					lastXmlTag = xmlTag;
					xmlTag = "";
					
					xmlTagWordLength = 0;
					insideXmlTag = false;
					insideXmlTagEnding = false;
					
					
				}
				
			}
			
			
			
			
			// ### Line break
			if(char == lastLineBreakCharacter) {
				
				insideCondition = false;
				
				//console.log("--- new line=" + (row+2) + " thisRowIndentation=" + thisRowIndentation + " ---");
				file.grid[row].indentation = Math.max(0, thisRowIndentation);
				
				row++;
				
				if(nextRowIndentation) {
					thisRowIndentation++;
					nextRowIndentation = false;
				}
			
			}
			
		}
		
		//console.log("globalVariables:" + JSON.stringify(globalVariables, null, 2));
		//console.log("functions:" + JSON.stringify(functions, null, 2));
		//console.log("comments:" + JSON.stringify(comments, null, 2));
		
		console.timeEnd("parseVbScript");
		
		//return {functions: functions, quotes: quotes, comments: comments, globalVariables: globalVariables, blockMatch: (codeBlockLeft - codeBlockRight) === 0, xmlTags: xmlTags};
		return {language: "VbScript", quotes: quotes, comments: comments, globalVariables: globalVariables, blockMatch: (thisRowIndentation === 0), xmlTags: xmlTags};
		
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
	
	function isVbScript(file) {
		
		if(file.parsed.language) return false; // Parsed by another parser
		
		// console.time("regex detect vbScript");
		
		if(file.fileExtension == "vb" || file.fileExtension == "vbs") return true;
		
		//if(file.text.match(/^end if$|^end sub$|^end function$|^end class$|^dim /im) != null) return true;
		
		return false;
	}
	
	

})();