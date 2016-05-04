(function() {
	"use strict";
	
	/*
		
		WORK IN PROGRESS ...
		
		This is a parser for XML code
		
		Goal is to return an object with:
		quotes
		comments
		xmlTags
		
		And make code indentation !
		
		... and maybe ...
		
	*/
	
	editor.on("start", xmlParserInit, 100);
	
	function xmlParserInit() {
		
		editor.on("fileOpen", onFileOpen);
		editor.on("fileChange", onEdit, 100);
		
		function onEdit(file, type, character, index, row, col) {
			onFileOpen(file); //  optimization is evil
		}
		
		function onFileOpen(file) {
			
			if(isXML(file)) {
				
				console.log("File is vb-script: " + file.path + " ...");
				
				file.haveParsed(parseXML(file)); // Tell the file that it has been parsed so that functions depending on the parsed data can update
				
			}
			else {
				console.log("File NOT vb-script: " + file.path);
			}
			
		}
	}
	
	
	function parseXML(file) {
		
		console.time("parseXML");
		
		
		//var text = file.text.toLowerCase();
		// XML is case sensetive!
		var text = file.text;
		
		var char = "";
		var pastChar = new Array("", "", "", "", "", "", "");
		
		var insideDblQuote = false;
		var doubleQuoteStart = 0;
		
		var insideSingleQuote = false;
		var singleQuoteStart = 0;
		
		var quotes = [];
		var insideQuote = insideDblQuote || insideSingleQuote;
		
		var insideComment = false;
		var commentStart = 0;
		var comments = [];
		var insideComment = false;
		
		var LF="\n", CR="\r", C="c", D="d", E="e", F="f", H="h", I="i", L="l", M="m", N="n", O="o", P="p", R="r", S="s", T="t", W="w";
		var space = " ", tab = "\t", comma = ",", colon = ":", percent = "%", leftArrow = "<", rightArrow = ">";
		var singleQuote = "'";
		var doubleQuote = '"';
		var questionmark = "?";
		
		if(file.lineBreak.length == 2) {
			var firstLineBreakCharacter = file.lineBreak.charAt(0);
			var lastLineBreakCharacter = file.lineBreak.charAt(1);
		}
		else if(file.lineBreak == LF) {
			var firstLineBreakCharacter = LF;
			var lastLineBreakCharacter = LF;
		}
		else throw new Error("No linebreaks!");
		
		var row = 0;
		
		var xmlMode = true; // This is a xml file!
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
		
		var nextRowIndentation = false;
		var thisRowIndentation = false;
		
		var docType = false;
		
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
			
			//console.log("char=" + char.replace(/\n/, "LF").replace(/\r/, "CR") + " insideXmlTag=" + insideXmlTag + " xmlMode=" + xmlMode + " insideDblQuote=" + insideDblQuote + " insideComment=" + insideComment);
			
			/*
				<![CDATA[ " and end with the string " ]]>
				
				Processing instructions & Prolog and Document Type Declaration: <? ... ?>
				
			*/
			
			
			
			// ### Comments: <!-- -->
			if(char == "-" && pastChar[0] == "-" && pastChar[1] == "!" && pastChar[2] == "<" && !insideComment && !insideDblQuote && !insideComment) { // <!--
				insideComment = true;
				insideXmlTag = false;
				xmlMode = tmpXmlMode;
				commentStart = charIndex-4;
			}
			else if(char == ">" && pastChar[0] == "-" && pastChar[1] == "-" && !insideDblQuote && insideComment) { // -->
				insideComment = false;
				comments.push(new Comment(commentStart, charIndex));
				//console.warn("Found HTML comment! line=" + lineNumber + " ");
			}
			
			if(!xmlMode) {
				
				/*
					## Quotes
					XML can have both single quote and double quote as quotes
				*/
				if(char == doubleQuote && !insideComment) {
					if(insideDblQuote) {
						insideDblQuote = false;
						quotes.push(new Quote(doubleQuoteStart, charIndex));
					}
					else {
						insideDblQuote = true;
						doubleQuoteStart = charIndex;
					}
				}
				
				// ### Quotes: single
				else if(char === "'" && !insideDblQuote && !insideComment) {
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
			
			if(!insideComment && !insideSingleQuote && !insideDblQuote) {
				/*
					### Find xml-tags.
					
					PS: We are Not inside an comment until the parser finds the last - in <!--
					
				*/
				
				if(insideXmlTag && pastChar[0] == "<" && char == "/") {
					// Ending tag: </foo>
					insideXmlTagEnding = true;
				}
				else if(char == "<" && !insideXmlTag) {
					insideXmlTag = true;
					xmlTagSelfEnding = false;
					xmlTagStart = charIndex;
					if(!insideXmlTagEnding) {
						tmpXmlMode = xmlMode; // xmlMode when the tag starts
						xmlMode = false;
					}
					if(insideComment) throw new Error("WTF");
				}
				else if(char == " " && insideXmlTag && xmlTagWordLength === 0) {
					xmlTagWordLength = charIndex - xmlTagStart;
				}
				else if(char == ">" && insideXmlTag) {
					if(pastChar[0] == "/") {
						xmlTagSelfEnding = true; // Self ending xml tag: <foo />
					}
					
					
					if(xmlTagWordLength === 0) xmlTagWordLength = charIndex - xmlTagStart;
					xmlTag = text.substr(xmlTagStart + 1 + insideXmlTagEnding, xmlTagWordLength - 1 - insideXmlTagEnding);
					xmlTags.push(new XmlTag(xmlTagStart, charIndex, xmlTagWordLength, xmlTagSelfEnding) );
					
					xmlMode = tmpXmlMode; // Set the xmlMode we had when the tag started
					
					if(!xmlTagSelfEnding) {
						// All line breaks after tags will make indentation
						
						//console.log("tag=" + tag + " lastXmlTag=" + lastXmlTag);
						
						if(insideXmlTagEnding) {
							// It's a ending tag </tag>
							
							//console.log("Ending tag=" + xmlTag + " xmlTagLastOpenRow=" + xmlTagLastOpenRow + " row=" + row + " ");
							
							openXmlTags--;
							if(xmlTagLastOpenRow != row && thisRowIndentation > 0) thisRowIndentation--;
							
							if(xmlTagLastOpenRow == row) nextRowIndentation = false;
							
						}
						else if(pastChar[0] != "?") {
							// It's a tag opening (ignore doc type declaration)
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
				
				//console.log("--- new line=" + (row+2) + " thisRowIndentation=" + thisRowIndentation + " ---");
				file.grid[row].indentation = Math.max(0, thisRowIndentation);
				
				row++;
				
				if(nextRowIndentation) {
					thisRowIndentation++;
					nextRowIndentation = false;
				}
				
			}
			
		}
		
		//console.log("comments:" + JSON.stringify(comments, null, 2));
		
		console.timeEnd("parseXML");
		
		return {language: "XML", quotes: quotes, comments: comments, xmlTags: xmlTags};
		
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
	
	function XmlTag(start, end, wordLength, selfEnding) {
		this.start = start;
		this.end = end;
		this.wordLength = wordLength;
		this.selfEnding = selfEnding;
	}
	
	function isXML(file) {
		
		if(file.fileExtension == "xml") return true;
		
		if(file.text.match(/^<\?xml.*\?>$ /i) != null) return true;
		
		return false;
	}
	
	
	
})();
