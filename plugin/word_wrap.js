(function() {
	"use strict";

	// Add plugin to editor
	editor.plugin({
		desc: "Word wrap text to fit inside line length limit",
		load: load,
		unload: unload,
	});
	
	function load() {
		editor.bindKey({
			charCode: 87,
			combo: CTRL,
			fun: wordWrap
		});
	}
	
	function unload() {
		editor.unbindKey(wordWrap);
	}

	function wordWrap(file) {
		"use strict";
		
		//alertBox("wordWrap text");
		
		var maxTextWidth = editor.view.visibleColumns;
		var space = " ";
		
		//maxTextWidth = 20;
		
		if(!file) return true;
		
		console.log("file.lineBreak=" + lbChars(file.lineBreak));
		
		// Find the paragraph
		var lastLineBreakCharacter = file.lineBreak.charAt(file.lineBreak.length-1);
		var startOfParagraph = -1;
		var endOfParagraph = -1;
		// Search right for double line breaks
		lbloop: for(var char, charInBtwLbs, i=Math.max(file.caret.index, 1); i<file.text.length; i++) {
			char = file.text.charAt(i)
			if(char == lastLineBreakCharacter) {
				
				// Two line breaks after each other is the end of a paragraph
				if(charInBtwLbs.trim() == "") {
					
					break;
				}
				
				charInBtwLbs = "";
				
				// endOfParagraph will be before the first of the two line breaks, due to the break
				endOfParagraph = i - file.lineBreak.length; // Do not include the line break
				
			}
			else charInBtwLbs += char;
		}
		
		if(endOfParagraph == -1) {
			alertBox("Did not find end of paragraph");
			return false;
		}
		
		// Search left to find two double breaks
		for(var char, charInBtwLbs, i=Math.max(file.caret.index, 1); i>1; i--) {
			char = file.text.charAt(i)
			if(char == lastLineBreakCharacter) {
				
				if(charInBtwLbs.trim() == "") {
					startOfParagraph = i+1;
					break;
				}
				charInBtwLbs = "";
				
		}
			else charInBtwLbs += char;
		}
		
		if(startOfParagraph == -1) {
			alertBox("Did not find start of paragraph");
			return false;
		}
		
		
		
		
		console.log("startOfParagraph=" + startOfParagraph);
		console.log("endOfParagraph=" + endOfParagraph);
		
		var text = file.text.substring(startOfParagraph, endOfParagraph+1);
		
		text = text.trim();
		
		// Make sure it's text or html and not code
		if(text.indexOf("{") != -1 || text.match(/<ul/i) ) {
			alertBox("Not word wrapping (not plain text) text=" + text);
			return false;
		}
		
		// Todo: Make sure it doesn't contain HTML elements besides <p> and <br>
		
		var firstCharacter = text.charAt(0);
		var secondCharacter = text.charAt(1);
		var lastCharacter = text.charAt(text.length-1);
		
		console.log("firstCharacter=" + lbChars(firstCharacter));
		console.log("secondCharacter=" + lbChars(secondCharacter));
		console.log("lastCharacter=" + lbChars(lastCharacter));
		
		// todo: Allow it to start and end with tags besides p if the tags are the same
		
		if(firstCharacter != "<" && secondCharacter != "p" && file.mode != "text") {
			alertBox("The word wrapper is currently only supported inside HTML paragraphs or in plain text files");
			console.log("firstCharacter=" + firstCharacter);
			console.log("secondCharacter=" + secondCharacter);
			console.log("file.mode=" + file.mode);
			console.log("startOfParagraph=" + startOfParagraph);
			console.log("endOfParagraph=" + endOfParagraph);
			console.log("text=" + lbChars(text));
			return false;
		}
		
		if(firstCharacter == "<") {
			if(lastCharacter != ">") {
				alertBox("Paragraph must have an ending tag!");
				console.log("firstCharacter=" + firstCharacter);
				console.log("lastCharacter=" + lastCharacter);
				console.log("text=" + lbChars(text));
				return false;
			}
		}
		
		console.log( "paragraph text=" + lbChars(text));
		
		//return false;
		
		var caretIndex = file.caret.index;
		var wordLeftOfCaret = getWord(caretIndex, true);
		var wordRightOfCaret = getWord(caretIndex, false);
		
		
		file.moveCaretToIndex(startOfParagraph);
		
		var indentation = file.grid[file.caret.row].indentation;
		
		//console.log("file.caret=" + JSON.stringify(file.caret));
		
		//file.debugGrid();
		file.checkGrid();
		
		file.deleteTextRange(startOfParagraph, endOfParagraph);
		
		var textLengthBefore = text.length;
		var containedLineBreak = text.indexOf(file.lineBreak) != -1;
		
		file.checkGrid();
		
		//file.debugGrid();
		
		text = wordWrapText(text, maxTextWidth - indentation * editor.settings.tabSpace);
		var textLengthAfter = text.length;
		
		console.log("text='" + debugWhiteSpace(text) + "'");
		
		
		// Sanity check: The text should still start and end with the same characters!
		if(text.charAt(0) != firstCharacter) throw new Error("First character is not the same before and after! " + text.charAt(0) + " != " + firstCharacter);
		if(text.charAt(text.length-1) != lastCharacter) throw new Error("Last character is not the same before and after! " + text.charAt(text.length-1) + " != " + lastCharacter);

		
		// deleteTextRange *might* trim the line breaks ...
		//file.insertLineBreak();
		
		file.insertText(text, file.caret);
		
		if(containedLineBreak) file.insertLineBreak();
		
		
		// Find out where to move the caret ... it should stay at the same place in the text!
		var textLengthDiff = textLengthBefore - textLengthAfter;
		console.log("textLengthDiff=" + textLengthDiff);
		// Place the caret where it was in the text
		var leftWord, rightWord;
		for(var i=Math.max(0, caretIndex - Math.abs(textLengthDiff)); i<Math.min(Math.max(0, endOfParagraph - Math.abs(textLengthDiff)), file.text.length); i++) {
			leftWord = getWord(i, true);
			rightWord = getWord(i, false);
			
			console.log("'" + leftWord + "==" + wordLeftOfCaret + "' '" + rightWord + "==" + wordRightOfCaret + "'");
			
			if( leftWord == wordLeftOfCaret && rightWord == wordRightOfCaret) {
				file.moveCaretToIndex(i);
				break;
			}
		}
		
		if(file.startColumn > 0) file.scrollTo(0, file.startRow); // Scroll to the left
		
		editor.renderNeeded();
		
		//alertBox("Text word wrapped!");
		
		return false;
		
		
		function getWord(index, searchLeft) {
			// Get the word directly at the caret (so we can find the position later)
			var word = "";
			var char = "";
			if(searchLeft) {
				for(var i=index; i>0; i--) {
					char = file.text.charAt(i);
					if( (char == space && word.length > 0) || char == "\r" || char == "\n") {
						return word;
					}
					else {
						word = char + word;
					}
				}
			}
			else { // Search right
				for(var i=index; i<file.text.length; i++) {
					char = file.text.charAt(i);
					if( (char == space && word.length > 0) || char == "\r" || char == "\n") {
						return word;
					}
					else {
						word = word + char;
					}
				}
			}
			return word;
}
		
		
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
			
			if(text.length <= width) {
				console.log("text.length=" + text.length + " <= width=" + width);
				return text;
			}
			
			var words = text.split(space);
			var rows = []; // Array of strings
			var rowNr = 0;
			var lineLength = words[0].length + 1;
			var lc = ""; // Last character of last word
			var breakAnyway = false;
			rows.push([]); // First row, each row is a array of strings (the words)
			rows[rowNr].push(words[0]); // Add the first word to the first row
			for(var i=1; i<words.length; i++) { // Start with the second word (so we can check the word before)
				
				if(lineLength > (width*.8)) {
					lc = words[i-1].charAt(words[i-1].length-1);
					if(lc == "." || lc == ":" || lc == "," || lc == ";" || lc == "!" || lc == "?") {
						breakAnyway = true;
					}
					else {
						breakAnyway = false;
					}
				}
				else {
					breakAnyway = false;
				}
				
				lineLength += words[i].length;
				
				if((lineLength > width || breakAnyway) && rows[rowNr].length != 0) {
					
					//if(breakAnyway) rows[rowNr].push("YAYA!");
					
					rowNr = rows.push([]) - 1;
					lineLength = words[i].length;
					breakAnyway = false;
					
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
			
			 
			
			return text;
		}
		
		
	}
	
	editor.addTest(function testWordWrapText(callback) {
		
		var before = '<!DOCTYPE html>\r\n<div class="wrap1">\r\n\t<div class="content">\r\n\t\t\r\n\t\t<p>Esse proident dolore cupidatat in dolor reprehenderit irure nostrud eu.\r\n\t\tMollit voluptate pariatur cillum enim voluptate excepteur amet non.\r\n\t\tEnim duis irure dolore laborum quis mollit adipisicing labore excepteur fugiat dolor esse reprehenderit sunt excepteur.\r\n\t\tMollit ad laboris ad nulla dolor sint do nostrud exercitation dolore nostrud mollit.</p>\r\n\t\t\r\n\t</div>\r\n</div>\r\n';
		//var expectedAfter = '<!DOCTYPE html>\r\n<div class="wrap1">\r\n\t<div class="content">\r\n\t\t\r\n\t\t        \r\n\t\t\r\n\t</div>\r\n</div>\r\n';
		
		editor.openFile("testWordWrapText.html", before, function(err, file) {
			
			var row = 3, col = 0;
			file.moveCaret(undefined, row, col);
			
			wordWrap(file);
			
			
			
			editor.closeFile(file.path);
			
			callback(true);
		});
	});
	
	
	
})();