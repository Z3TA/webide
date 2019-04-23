(function() {
	
	"use strict";
	
	var singleQuote = "'";
	var dblQuote = '"';
	
	EDITOR.plugin({
		desc: "Auto insert quote characters when typing a quote",
		load: autoQuoteMain,
		unload: autoQuoteUnload,
	});
	
	
	function autoQuoteMain() {

		EDITOR.on("keyPressed", auto_quote_on_keyPressed);
		
	}

	function autoQuoteUnload() {
		EDITOR.removeEvent("keyPressed", auto_quote_on_keyPressed);
	}
	
	function auto_quote_on_keyPressed(file, character, combo) {
		
		if(!file) return true;
		if(!EDITOR.input) return true;
		if(!file.parsed) return true;
		
		// Only auto-insert quotes when we are coding, not when writing text!
		if(Object.keys(file.parsed).length == 0) return true;
		
		//console.log(JSON.stringify(file.parsed));
		
		if(character == singleQuote || character == dblQuote) return autoQuote(file, character, combo)
		else return true;
	}
	
	
	function autoQuote(file, character, combo) {
		// character is a single or double quote ...
		
		var index = file.caret.index;
		var row = file.caret.row;
		var col = file.caret.col;
		
		console.log("file.parsed.languag=" + file.parsed.languag);
		
		if(file.parsed.language=="VBScript") {
			
			if(character == "'") return true; // Single quotes ' Are used to make comments in vbScript
			
			var insideTag = isInsideRe(file.text, index, "<[^%]", "[^%]>");
			var insideASP = isInside(file.text, index, "<%", "%>");
			
			console.log("insideASP=" + insideASP + " insideTag=" + insideTag);
			
			if(insideASP && insideTag) {
				file.insertText('""');
				EDITOR.renderNeeded();
				return false;
			}
		}
		
		var lastCharacter = "";
		var nextCharacter = "";
		
		if(index > 0) {
			lastCharacter = file.text.charAt(index-1);
		}
		
		if(index < file.text.length) {
			nextCharacter = file.text.charAt(index);
		}
		
		var isXml = (file.fileExtension == "htm" || file.fileExtension == "html");
		
		if(isXml) {
			// Don't auto quote ' in HTML documents unless we're inside a tag or <script> 
			var insideTag = isInside(file.text, index, "<", ">");
			var insideScript = isInside(file.text, index, "<script", "</script>");
			
			if(!insideTag && !insideScript) return true;
		}
		
		
		var insideHtmlComment = isInside(file.text, index, "<!--", "-->");
		var insideBlockComment = isInside(file.text, index, "/*", "*/");
		var insideLineComment = isInside(file.text, index, "//", file.lineBreak);
		
		// Don't auto quote inside comments
		if(insideHtmlComment || insideBlockComment || insideLineComment) return true; 
		
		
		// todo: test if we get an error if at the beginning or end!
		
		var rowText = getRowText(file, row);
		var quote = character;
		var insideSingle = false;
		var insideDbl = false;
		var char = "";
		var inQuote = false;
		var openQuote = true; // If true, it doesn't have an ending quote on the same line
		// 		var openQuote = insideQuote(rowText, col, quote, false);

		for(var i=0; i<col; i++) {
			char = rowText.charAt(i);
			if(char == singleQuote && !insideDbl) {
				insideSingle = insideSingle ? false : true;
			}
			else if(char == dblQuote && !insideSingle) {
				insideDbl = insideDbl ? false : true;
			}
		}
		
		if((insideSingle && quote == singleQuote) || (insideDbl && quote == dblQuote)) {
			inQuote = true;
			
			// Check if the quote has an ending quote
			for(var i=col+1; i<rowText.length; i++) {
				char = rowText.charAt(i);
				console.log("char=" + char);
				if(char == quote) {
					openQuote = false; // It's closed
					break;
				}
			}
		}
		
		var xor = ( ( openQuote|inQuote && !openQuote|inQuote ) || ( !openQuote|inQuote && openQuote|inQuote ) );
		
		
		console.log("quote=" + quote);
		console.log("dblQuote=" + dblQuote);
		console.log("singleQuote=" + singleQuote);
		console.log("inQuote=" + inQuote);
		console.log("insideDbl=" + insideDbl);
		console.log("insideSingle=" + insideSingle);
		console.log("openQuote=" + openQuote);
		console.log("lastCharacter=" + lastCharacter);
		console.log("nextCharacter=" + nextCharacter);
		console.log("xor=" + xor);
		console.log("file.parsed.language=" + file.parsed.language);
		
		if(lastCharacter != "\\" && lastCharacter != quote && nextCharacter != quote) {
			
			if(inQuote && !openQuote) {
				
				file.deleteSelection();
				
				if(file.parsed.language=="JS") {
					file.insertText(quote + " +  + " + quote);
					file.moveCaretLeft(file.caret, 4);
					EDITOR.renderNeeded();
					return false;
				}
				else if(file.parsed.language=="VBScript") {
					file.insertText(quote + " &  & " + quote);
					file.moveCaretLeft(file.caret, 4);
					EDITOR.renderNeeded();
					return false;
				}
				else if(file.parsed.language=="PHP") {
					file.insertText(quote + " .  . " + quote);
					file.moveCaretLeft(file.caret, 4);
					EDITOR.renderNeeded();
					return false;
				}
				else {
					throw new Error("I dont know what to do with the quote! file.parsed.language=" + file.parsed.language);
				}
			}
			else if(   !xor    && !(quote == singleQuote && insideDbl)) {
				
				// Insert one quote character
				
				file.deleteSelection();
				
				file.insertText(quote + quote);
				file.moveCaretLeft();
				EDITOR.renderNeeded();
				return false;
			}
		}
		
		// This might become annoying
		if(lastCharacter == quote && nextCharacter == quote) {
			//file.deleteCharacter();
			return false;
		}
		
		return true; // If we get this far, default behaviour will be to insert the quote
	}
	
	function getRowText(file, row) {
		// Returns the text on the row
		var gridRow = file.grid[row],
			lastCol = gridRow.length-1,
			start = gridRow.startIndex;
		
		if(lastCol < 0) return "";
		
		var end = gridRow[lastCol].index+1;

		//substr: second argument: Length
		//substring: second argument: Index
		
		return file.text.substring(start, end);

	}
	
	function isInside(text, index, str1, str2) {
		// Returns true if index inside text is between str1 and str2
		/*
			Eu ad incididunt id <b>irure</b> reprehenderit duis (insde b?) esse eu <b>pariatur</b> ut adipisicing.
			'                   |    
			
		*/
		
		var before = text.substr(0, index).lastIndexOf(str1);
		
		if(before == -1) return false; // str1 doesn't exist before index
		
		var beforeEnded = text.indexOf(str2, before);
		
		return beforeEnded > index; // index is between str1 and str2, or not
		
	}
	
	function isInsideRe(text, index, re1, re2) {
		var r1 = new RegExp(re1);
		var r2 = new RegExp(re2);
		
		var before = UTIL.reLastIndexOf(r1, text, index);
		
		if(before == -1) return false; // re1 doesn't exist before index
		
		var beforeEnded = UTIL.reIndexOf(r2, text, before);
		
		return beforeEnded > index; // index is between str1 and str2, or not
		
	}
	
	
	function insideQuote(text, pos, quote, checkEnding) {
		/*
			q = "inside " + not_inside + " inside";
		*/
				
		var insideSingle = false,
			insideDbl = false,
			char = "";
			
		for(var i=0; i<pos; i++) {
			char = text.charAt(i);
			check(char);
		}
		
		if((insideSingle && quote == singleQuote) || (insideDbl && quote == dblQuote)) {
			if(checkEnding) {
				// Check if the quote has an ending quote
				for(var i=pos; i<text.length; i++) {
					char = text.charAt(i);
					if(char == quote) return true;
				}
			}
			else {
				return true;
			}
		}

		return false;
		
		
		function check(char) {
			if(char == singleQuote && !insideDbl) {
				insideSingle = insideSingle ? false : true;
			}
			else if(char == dblQuote && !insideSingle) {
				insideDbl = insideDbl ? false : true;
			}
		}
		
		
	}
	
	
	/*
	 *  When do we want to do " &  & " ? and when not ?
	 * 
	 * not: "<span class="
	 * not: "<span class=""foo"">"
	 * 
	 * do: "<span class=""foo" & bar & "
	 * do: " hello <b>" & name & "</b>."
	 * 
	 * 
	 */
	
	// TEST-CODE-START
	
	EDITOR.addTest(function classic_asp_concat(callback) {
		EDITOR.openFile("classic_asp_concat.asp", '<% Response.Write "<span class= </span>" %>', function(err, file) {
			
			var index = 31;
			file.moveCaret(index);
			
			var quote = 34; // "
			EDITOR.mock("keypress", {charCode: quote}); // Simulate "
			
			if(file.text != '<% Response.Write "<span class="" </span>" %>') throw new Error("Did not expect a concatenation");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	// TEST-CODE-END
	
})();
