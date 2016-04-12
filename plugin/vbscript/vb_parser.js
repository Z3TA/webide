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
		
		var text = file.text.toLowerCase(); // vbScript is not case sensitive!
		
		var char = "";
		var pastChar = new Array("", "", "", "", "", "", "");
		
		var insideDblQuote = false;

		var doubleQuoteStart = 0;
		var quotes = [];
		
		var insideComment = false;
		var commentStart = 0;
		var comments = [];
		
		var codeBlockLeft = 0;
		var codeBlockRight = 0;
		
		var xmlTags = [];
		
		var insideVariableDeclaration = false;
		var variables = [];
		var globalVariables = [];
		
		var insideIf = false;
		
		var LF="\n", CR="\r", C="c", D="d", E="e", F="f", H="h", I="i", L="l", M="m", N="n", O="o", P="p", R="r", S="s", T="t", W="w"; 
		var space = " ", tab = "\t", comma = ",", colon = ":";
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
		else console.error(new Error("No linebreaks!"));
		
		var word = "";
		var lastWord = "";
		
		var afterThen = false;
		var afterIf = false;
		
		var thisRowIndentation = 0;
		var nextRowIndentation = false;
		
		var row = 0;
		
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
			
			console.log("char=" + char.replace(/\n/, "LF").replace(/\r/, "CR") + " insideDblQuote=" + insideDblQuote + " insideComment=" + insideComment);
			
			/*
				## Comments
				
				' bla bla
			*/
			if(!insideComment && (char == singleQuote || (char == space && pastChar[0] == M && pastChar[1] == E && pastChar[2] == R))) {
				insideComment = true;
				commentStart = charIndex + (char == M);
			}
			else if(insideComment && char == firstLineBreakCharacter) {
				insideComment = false;
				comments.push(new Comment(commentStart, charIndex-1));
			}
			
			
			
			/* 
				## Quotes
				vbScript escape double quotes with "", 
				ex: 
				foo = "one ""two"" three"
				foo = "" ' Empty string
			*/
			else if(char == doubleQuote) {
				if(insideDblQuote) {
					insideDblQuote = false;
					quotes.push(new Quote(doubleQuoteStart, charIndex));
				}
				else {
					insideDblQuote = true;
					doubleQuoteStart = charIndex;
				}
				
			}
			
			else if(!insideDblQuote && !insideComment) {
				
				// ### Collect words
				
				if(char == LF || char == CR || char == space || char == tab || char == colon) {
										
					if(word) {
					
						// ### Variable declarations
						if(insideVariableDeclaration && char == firstLineBreakCharacter) {
							insideVariableDeclaration = false;
							if(word) variables.push(word);
						}
						else if(word == "dim") {
							insideVariableDeclaration = true;
						}
						
						// ### IF .. THEN .. ELSE ..
						else if(word == "if" && lastWord == "end") { // END IF
							thisRowIndentation--;
						}
						else if(word == "if") {
							afterIf = true; // Inside single line if maybe!?
							nextRowIndentation = true; 
						}
						else if(word == "then" && afterIf) {
							afterThen = true; // If a word comes next; it's a single line if-statement
						}
						else if(afterThen) {
							afterThen = false;
							// This is a single line if-statement!
							nextRowIndentation = false; // Cancel out the indentation
							console.log("afterThen yo!");
						}
						else if(word == "else") {
							thisRowIndentation--;
							nextRowIndentation = true; 
						}
						else if(word == "elseif") {
							thisRowIndentation--;
							nextRowIndentation = true
						}
						
						// ### DO ... LOOP
						else if(word == "do") {
							nextRowIndentation = true;
						}
						else if(word == "loop") {
							thisRowIndentation--;
						}
						
						// ### FOR ... NEXT
						else if(word == "for") {
							console.log("for: nextRowIndentation=" + nextRowIndentation);
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
						
						console.log("line=" + (row+1) + " word=" + word + " thisRowIndentation=" + thisRowIndentation + " nextRowIndentation=" + nextRowIndentation);
						
						lastWord = word;
						word = "";
					}
					
				}
				else {
					
					if(insideVariableDeclaration && char == comma) {
						if(word) variables.push(word);
						word = "";
					}
					else {
						
						// Add to the word ...
						word += char;
					}
					
				}
			}
			
			// ### Line break
			if(char == lastLineBreakCharacter) {
				
				console.log("--- new line=" + (row+2) + " thisRowIndentation=" + thisRowIndentation + " ---");
				file.grid[row].indentation = Math.max(0, thisRowIndentation);
				
				row++;
				
				if(nextRowIndentation) {
					thisRowIndentation++;
					nextRowIndentation = false;
				}
			
			}
			
		}
		
		//return {functions: functions, quotes: quotes, comments: comments, globalVariables: globalVariables, blockMatch: (codeBlockLeft - codeBlockRight) === 0, xmlTags: xmlTags};
		return {quotes: quotes, comments: comments, globalVariables: globalVariables, blockMatch: (thisRowIndentation === 0), xmlTags: xmlTags};
		
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
		
		// console.time("regex detect vbScript");
		
		if(file.fileExtension == "vb" || file.fileExtension == "vbs") return true;
		
		if(file.text.match(/^end if$|^end sub$|^end function$|^end class$|^dim /im) != null) return true;
		
		return false;
	}
	
	

})();