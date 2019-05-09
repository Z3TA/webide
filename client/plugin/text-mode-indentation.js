(function() {
	
	/*
		
		Indentation in text mode:
		* Increment when hitting tab in the beginning of a line
		* Increment all selected lines when hitting tab
		* de-increment all selected lines when hitting shift+tab
		* When pasting a code snippet trim upto first level of indentation, then use the indentation level where it's pasted
		
		
	*/
	
	
	var TAB = 9;
	
	var indentation = {}; // file: \t or space
	
	EDITOR.plugin({
		desc: "Indentate helper in plain text files",
		load: function loadTextModeIndentation() {
			
			EDITOR.bindKey({desc: "Indentate", fun: indentate, charCode: TAB, combo: 0});
			EDITOR.bindKey({desc: "de-Indentate", fun: deindentate, charCode: TAB, combo: SHIFT});
			
			EDITOR.on("fileOpen", detectIndentation);
			EDITOR.on("fileClose", cleanupIndentation);
			
},
		unload: function unloadTextModeIndentation() {
			
			EDITOR.unbindKey(indentate);
			EDITOR.unbindKey(deindentate);
			
			EDITOR.removeEvent("fileOpen", detectIndentation);
			EDITOR.removeEvent("fileClose", cleanupIndentation);
			
		}
	});

	function deindentate(file) {
		return indent(file, true);
	}
	
	function indentate(file) {
		return indent(file, false)
	}
	
	function indent(file, shift) {
		
		console.log("indentate: shift=" + shift);
		
		if(file.mode!="text") {
			console.log("indentate: Not indentating because not plain text! file.mode=" + file.mode);
			return ALLOW_DEFAULT;
		}
		
		var caret = file.caret;
		
		var beforeText = false;
		
		if(caret.col==0) beforeText = true;
		else {
			var col = caret.col;
			var char = "";
			while(col--) {
				char = file.grid[caret.row][col].char;
				console.log("indentate: row=" + caret.row + " col=" + col + " char=" + UTIL.lbChars(char));
				if(char != "\t" && char != " ") {
					break;
				}
			}
			console.log("indentate: col=" + col);
			if(col == -1) beforeText = true;
		}
		
		var selectedRows = getSelectedRowsStartindex(file);
		
		if(selectedRows.length == 0 && !shift && !beforeText) {
			console.log("indentate: Not indentating because selectedRows.length=" + selectedRows.length + " shift=" + shift + " beforeText=" + beforeText + " file.mode=" + file.mode);
			return ALLOW_DEFAULT;
		}
		
		if(selectedRows.length > 0) {
			console.log("indentate: selectedRows=" + JSON.stringify(selectedRows));
			if(shift) {
				// Remove indentation
				for (var i=selectedRows.length-1; i>-1; i--) {
					index = selectedRows[i];
					removeIndentation(file, index);
				}
			}
			else {
				// Add indentation
				// Start from the bottom to keep indexes intact
				var index = 0;
				for (var i=selectedRows.length-1; i>-1; i--) {
					index = selectedRows[i];
					insertIndentation(file, index);
				}
			}
			EDITOR.renderNeeded();
			
		}
		else if(beforeText || shift) {
			
			if(shift) {
				removeIndentation(file, file.grid[caret.row].startIndex);
			}
			else if(beforeText) {
				insertIndentation(file, file.grid[caret.row].startIndex);
				
				var lastCharOnLine = file.grid[caret.row][ file.grid[caret.row].length-1 ].char;
				
				console.log("indentate: lastCharOnLine=" + lastCharOnLine );
				
				if( lastCharOnLine == " " || lastCharOnLine == "\t") file.moveCaretToEndOfLine(file.caret);
				
			}
			
			EDITOR.renderNeeded();
		}
		
		return PREVENT_DEFAULT;
	}
	
	function insertIndentation(file, index) {
		if(index == undefined) throw new Error("index=" + index);
		
		var characters = indentation[file];
		var caret = file.createCaret(index);
		
		console.warn("indentate:insertIndentation: row=" + caret.row + " index=" + index + " characters=" + UTIL.lbChars(characters));
		
		// Use insertText instead of putCharacter to keep selection
		file.insertText(characters, caret);
	}
	
	function removeIndentation(file, rowStartIndex) {
		if(rowStartIndex == undefined) throw new Error("index=" + index);
		
		var characters = indentation[file];
		var caret = file.createCaret(rowStartIndex);
		
		console.log("indentate:removeIndentation: row=" + caret.row + " index=" + rowStartIndex + " characters=" + UTIL.lbChars(characters));
		
		for (var i=0; i<characters.length; i++) {
			if(file.text.charAt(rowStartIndex) != characters[i]) break;
			file.deleteCharacter(caret);
		}
	}
	
	
	function getSelectedRowsStartindex(file) {
		var rows = [];
		var char = "";
		var row = 0;
		var col = 0;
		var selected = false;
		var gridRow;
		var nonWhiteSpaceCharacter = false;
		var nonWhiteSpaceCharacterWasFound = false;
		for (row=0; row<file.grid.length; row++) {
			gridRow = file.grid[row];
			if(gridRow.length > 0) { // Don't check empty rows!
				// Check if the none-white space part of the row is selected
				nonWhiteSpaceCharacterWasFound = false;
				for(col=0; col<gridRow.length; col++) {
					char = gridRow[col].char;
					selected = gridRow[col].selected;
					nonWhiteSpaceCharacter = (char != "\t" && char != " ");
					
					if(nonWhiteSpaceCharacter) nonWhiteSpaceCharacterWasFound = true;
					
					if(nonWhiteSpaceCharacter && !selected) break;
				}
				if(col == gridRow.length && nonWhiteSpaceCharacterWasFound) rows.push(gridRow.startIndex); // All non-white-space character are selected!
				
			}
		}
		
		return rows;
	}
	
	
	function detectIndentation(file) {
		if(file.mode!="text") return; // We only want to work with plain text, code will be automatically indented
		
		var countSpaces = UTIL.occurrences(file.text, "\n  ", false);
		var countTabs = UTIL.occurrences(file.text, "\n\t", false);
		var indent = "\t";
		
		if( countSpaces >= countTabs ) {
			// How many spaces ?
			var count4 = UTIL.occurrences(file.text, "\n    ", false);
			if(count4 > 0 && count4 > countSpaces*.9-1) indent = "    ";
			else indent = "  ";
		}
		
		indentation[file] = indent;
		console.log("indentate:detectIndentation countSpaces=" + countSpaces + " countTabs=" + countTabs + " count4=" + count4 + " indent=" + UTIL.lbChars(indent));
		
	}
	
	function cleanupIndentation(file) {
		delete indentation[file];
	}
	
	
	// TEST-CODE-START
	
	
	// TEST-CODE-END
	
})();
