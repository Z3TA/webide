(function() {
	
	"use strict";
	
	var singleQuote = "'";
	var dblQuote = '"';
	
		
	editor.on("start", autoQuoteMain);
	
	function autoQuoteMain() {
	
		editor.on("edit", onEdit);

	}

	function onEdit(file, type, character, index, row, col) {

		// Only auto-insert quotes when we are coding, not when writing text!
		if(!file.parse) return;
		
		if(type=="insert") {
			
			if(character == singleQuote || character == dblQuote) autoQuote(file, type, character, index, row, col);
			
		}
		
		
	}
	
	
	function autoQuote(file, type, character, index, row, col) {
		// character is a single or double quote ...
		
		var lastCharacter = "";
		var nextCharacter = ""
		
		if(index > 0) {
			lastCharacter = file.text.charAt(index-1);
		}
		
		if(index < file.text.length) {
			var nextCharacter = file.text.charAt(index+1);
		}
		
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
				if(char == quote) {
					openQuote = false; // It's closed
					break;
				}
			}
		}
		
		var xor = ( ( openQuote|inQuote && !openQuote|inQuote ) || ( !openQuote|inQuote && openQuote|inQuote ) );
		
		/*
		console.log("quote=" + quote);
		console.log("dblQuote=" + dblQuote);
		console.log("singleQuote=" + singleQuote);
		console.log("inQuote=" + inQuote);
		console.log("insideDbl=" + insideDbl);
		console.log("insideSingle=" + insideSingle);
		console.log("openQuote=" + openQuote);
		
		console.log("xor=" + xor);
		*/
		
		if(lastCharacter != "\\" && lastCharacter != quote && nextCharacter != quote) {
			
			if(inQuote && !openQuote) {
				file.insertText(" +  + " + quote);
				file.moveCaretLeft(file.caret, 4);
				editor.renderNeeded();
			}
			else if(   !xor    && !(quote == singleQuote && insideDbl)) {
				// Insert one quote character
				file.putCharacter(quote);
				file.moveCaretLeft();
				editor.renderNeeded();
			}
		}
		
		if(lastCharacter == quote && nextCharacter == quote) {
			file.deleteCharacter();
		}
	}
	
	function getRowText(file, row) {
		// Returns the text on the row
		var gridRow = file.grid[row],
			lastCol = gridRow.length-1,
			start = gridRow.startIndex;
		
		if(lastCol < 0) return "";
		
		var end = gridRow[lastCol].index;

		//substr: second argument: Length
		//substring: second argument: Index
		
		return file.text.substring(start, end);

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
	
	
})();