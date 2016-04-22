editor.bindKey({
	charCode: 87, 
	combo: CTRL, 
	fun: function wordWrap(file, combo, character, charCode, direction, targetElementClass) {
		"use strict";
		
		var maxTextWidth = editor.view.visibleColumns;
		
		//maxTextWidth = 20;
		
		if(!file) return true;
		
		// Find the paragraph
		var lastLineBreakCharacter = file.lineBreak.charAt(file.lineBreak.length-1);
		var startOfParagraph = -1;
		var endOfParagraph = -1;
		// Search right for double line breaks
		for(var i=Math.max(file.caret.index, 1); i<file.text.length; i++) {
			if(file.text.charAt(i) == lastLineBreakCharacter) {
				if(file.text.charAt(i-file.lineBreak.length) == lastLineBreakCharacter) {
					// blablaRNRN or blablaNN
					endOfParagraph = i - file.lineBreak.length * 2 - 0; // Do not select the line breaks
					break;
				}
			}
		}
		
		if(endOfParagraph == -1) {
			console.log("Did not find end of paragraph");
			return true;
		}
		
		// Search left to find two double breaks
		for(var i=Math.max(file.caret.index, 1); i>1; i--) {
			if(file.text.charAt(i) == lastLineBreakCharacter) {
				if(file.text.charAt(i-file.lineBreak.length) == lastLineBreakCharacter) {
					startOfParagraph = i+1;
					break;
				}
			}
		}
		
		if(startOfParagraph == -1) {
			console.log("Did not find start of paragraph");
			return true;
		}
		
		var firstCharacter = file.text.charAt(startOfParagraph);
		var secondCharacter = file.text.charAt(startOfParagraph+1);
		
		if(firstCharacter != "<" && secondCharacter != "p" && file.mode != "text") {
			console.log("The word wrapper is currently only supported inside HTML paragraphs or in plain text files");
			return true;
		}
		
		//console.log( "First character: " + debugWhiteSpace(file.text.charAt(startOfParagraph)) );
		//console.log( "Last character: " + debugWhiteSpace(file.text.charAt(endOfParagraph)) );
		
		//return false;
		
		file.moveCaretToIndex(startOfParagraph);
		
		var indentation = file.grid[file.caret.row].indentation;
		
		//console.log("file.caret=" + JSON.stringify(file.caret));
		
		var text = file.deleteTextRange(startOfParagraph, endOfParagraph);
		
		//file.debugGrid();
		
		text = wordWrapText(text, maxTextWidth - indentation * editor.settings.tabSpace);
		
		//console.log("text='" + debugWhiteSpace(text) + "'");
		
		file.insertText(text, file.caret);
		
		// Place the caret where it was in the text
		
		return false;
		
		function wordWrapText(text, width) {
			/*
				This function can be polished a lot!
				
				example:
				- Use code language context: Break after + or _
				- When in English/latin context: More likely to break after a punctuation
				- Avoid having lonely words

			*/
			
			if(text.match(/<br>/i) != null) {
				// Always break after <br>
				var arr = text.split(/<br>/i);
				text = "";
				if(arr.length > 1) {
					for(var i=0; i<arr.length-1; i++) {
						text += wordWrapText(arr[i], width) + "<br>" + file.lineBreak;
					}
				}
				text += wordWrapText(arr[arr.length-1], width);
				return text;
			}
			
			text = text.replace(new RegExp(file.lineBreak, 'g'), " "); // Replace all line breaks with spaces
			text = text.replace(/\s{2,}/g, ' '); // Remove multiple spaces
			text = text.trim(); // Remove white space at the edges
			
			var space = " ";
			
			if(text.length <= width) {
				console.log("text.length=" + text.length + " <= width=" + width);
				return text;
			}
			
			var words = text.split(space);
			var rows = []; // Array of strings
			var rowNr = 0;
			var lineLength = 0;
			rows.push([]); // First row, each row is a array of strings (the words)
			for(var i=0; i<words.length; i++) {
				lineLength += words[i].length;
				
				if((lineLength) > width && rows[rowNr].length != 0) {
					
					rowNr = rows.push([]) - 1;
					lineLength = words[i].length;
					
				}
				rows[rowNr].push(words[i]);
				lineLength++; // Account for the space
			}
			
			// Join the words with a space between
			for(var i=0; i<rows.length; i++) {
				rows[i] = rows[i].join(space);
			}
			
			// Join the rows with line breaks in between
			text = rows.join(file.lineBreak);
			
			console.log("Duke Nukem");
			
			return text;
}
		
	}
})