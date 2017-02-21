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
		
		editor.on("fileOpen", parseXmlOnFileOpen);
		editor.on("fileChange", parseXmlMaybe, 100);
		
		function parseXmlMaybe(file, type, character, index, row, col) {
			parseXmlOnFileOpen(file); //  optimization is evil
		}
		
		function parseXmlOnFileOpen(file) {
			
			if(isXML(file)) {
				
				console.log("File is XML: " + file.path + " ...");
				
				var xml = parseXML(file);
				
				//console.log("xml=" + JSON.stringify(xml));
				
				file.haveParsed(xml); // Tell the file that it has been parsed so that functions depending on the parsed data can update
				
			}
			else {
				console.log("File NOT XML: " + file.path);
			}
			
		}
	}
	
	
	function parseXML(file) {
		
		console.time("parseXML");
		
		
		//var text = file.text.toLowerCase();
		// XML is case sensetive!
		var text = file.text;
		
		var char = "";
		// Native objects are faster then accessing elements in an array!
		var lastChar0 = "";
		var lastChar1 = "";
		var lastChar2 = "";
		var lastChar3 = "";
		var lastChar4 = "";
		var lastChar5 = "";
		var lastChar6 = "";
		var lastChar7 = "";
		
		var insideCDATA = false;
		
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
		
		if(file.lineBreak.length == 2) {
			var firstLineBreakCharacter = file.lineBreak.charAt(0);
			var lastLineBreakCharacter = file.lineBreak.charAt(1);
		}
		else if(file.lineBreak == "\n") {
			var firstLineBreakCharacter = "\n";
			var lastLineBreakCharacter = "\n";
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
		
		var angelBracketDepth = 0;
		var lastRowAngelBracketDepth = 0;
		
		for(var charIndex=0; charIndex<text.length; charIndex++) {
			
			// Save a history of the last characters
			lastChar7 = lastChar6;
			lastChar6 = lastChar5;
			lastChar5 = lastChar4;
			lastChar4 = lastChar3;
			lastChar3 = lastChar2;
			lastChar2 = lastChar1;
			lastChar1 = lastChar0;
			lastChar0 = char;
			char = text.charAt(charIndex);
			
			//console.log("char=" + char.replace(/\n/, "LF").replace(/\r/, "CR") + " insideXmlTag=" + insideXmlTag + " xmlMode=" + xmlMode + " insideDblQuote=" + insideDblQuote + " insideComment=" + insideComment);
			
			/*
				<![CDATA[ " and end with the string " ]]>
				
				CDATA stands for Character Data and it means that the data in between these strings includes data that could be interpreted as XML markup, but should not be. 
				
				Processing instructions & Prolog and Document Type Declaration: <? ... ?>
				
			*/
			
			if(char == "[" && lastChar0 == "A" && lastChar1 == "T" && lastChar2 == "A" && lastChar3 == "D" && lastChar4 == "C" && lastChar5 == "[" && lastChar6 == "!" && lastChar7 == "<") {
				insideCDATA = true;
			}
			else if(insideCDATA && char == ">" && lastChar0 == "]" && lastChar1 == "]") {
				insideCDATA = false;
			}
			
			
			// ### Comments: <!-- -->
			if(char == "-" && lastChar0 == "-" && lastChar1 == "!" && lastChar2 == "<" && !insideComment && !insideDblQuote && !insideComment) { // <!--
				insideComment = true;
				insideXmlTag = false;
				xmlMode = tmpXmlMode;
				commentStart = charIndex-4;
			}
			else if(char == ">" && lastChar0 == "-" && lastChar1 == "-" && !insideDblQuote && insideComment) { // -->
				insideComment = false;
				comments.push(new Comment(commentStart, charIndex));
				//console.warn("Found HTML comment! line=" + lineNumber + " ");
			}
			
			if(!xmlMode) {
				
				/*
					## Quotes
					XML can have both single quote and double quote as quotes
				*/
				if(char == '"' && !insideComment) {
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
						quotes.push(new Quote(singleQuoteStart, charIndex));
						return;
					}
					else {
						insideSingleQuote = true;
						singleQuoteStart = charIndex;
						//console.log("insideSingleQuote!");
					}
				}
				
			}
			
			if(!insideComment && !insideSingleQuote && !insideDblQuote) {
				
				// ### Keep track of angel brackets
				if(char == "{") {
					angelBracketDepth++;
				}
				else if(char == "}") {
					angelBracketDepth--;
				}
				
				
				/*
					### Find xml-tags.
					
					PS: We are Not inside an comment until the parser finds the last - in <!--
					
				*/
				
				if(insideXmlTag && lastChar0 == "<" && char == "/") {
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
					if(lastChar0 == "/") {
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
						else if(lastChar0 != "?") {
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
				
				if(lastRowAngelBracketDepth > angelBracketDepth) thisRowIndentation--;
				
				//console.log("--- new line=" + (row+2) + " thisRowIndentation=" + thisRowIndentation + " ---");
				file.grid[row].indentation = Math.max(0, thisRowIndentation);
				
				row++;
				
				if(lastRowAngelBracketDepth < angelBracketDepth) thisRowIndentation++;
				
				if(nextRowIndentation) {
					thisRowIndentation++;
					nextRowIndentation = false;
				}
				
				lastRowAngelBracketDepth = angelBracketDepth;
				
			}
			
		}
		
		//console.log("comments:" + JSON.stringify(comments, null, 2));
		
		console.timeEnd("parseXML");
		
		//console.log("quotes:" + JSON.stringify(quotes, null, 2));
		//console.log("comments:" + JSON.stringify(comments, null, 2));
		//console.log("xmlTags:" + JSON.stringify(xmlTags, null, 2));
		
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
		
		if(file.parsed.language && file.parsed.language != "XML") {
			console.warn("File has already been parsed:  file.parsed.language=" + file.parsed.language + " file.path=" + file.path);
			return false;
		}
		
		if(file.fileExtension == "xml" ||
		file.fileExtension == "svg") {
			return true;
		}
		
		if(file.text.match(/^<\?xml.*\?>$ /i) != null) return true;
		
		return false;
	}
	
	
	
	/*
		# Tests
	*/
	
	
	editor.addTest(function test_xml_CDATA(callback) {
		editor.openFile("cdata.svg", '<svg>\n<defs>\n<style type="text/css"><![CDATA[\ntext {\nfont-size: 12px;\n}\n</style>\n</defs>\n</svg>\n', function(err, file) {
		
			if(file.grid[4].indentation != 4) throw new Error("Expected line five's indentation to be 4 levels, not " + file.grid[4].indentation);
			
				editor.closeFile(file.path);
				callback(true);
				
			});
	}, 1);
	
})();
