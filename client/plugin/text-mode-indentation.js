(function() {
	
	/*
		
		Indentation in text mode:
		* Increment when hitting tab in the beginning of a line
		* Increment all selected lines when hitting tab
		* de-increment all selected lines when hitting shift+tab
		* Create the same level of indentation when pressing Enter
		* Render white-space characters
		* When pasting a code snippet trim upto first level of indentation, then use the indentation level where it's pasted
		
		
	*/
	
	var SHOW_WHITE_SPACE = false;
	
	var TAB = 9;
	var ENTER = 13;
	
	var indentation = {}; // file: \t or space
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Indentate helper in plain text files",
		load: function loadTextModeIndentation() {
			
			EDITOR.bindKey({desc: "Indentate", fun: indentate, charCode: TAB, combo: 0});
			EDITOR.bindKey({desc: "de-Indentate", fun: deindentate, charCode: TAB, combo: SHIFT});
			EDITOR.bindKey({desc: "Add indentation", fun: addindentation, charCode: ENTER, combo: 0});
			
			EDITOR.on("fileOpen", detectIndentation);
			EDITOR.on("fileClose", cleanupIndentation);
			
			EDITOR.on("showMenu", showWhiteSpaceMaybe);
			
},
		unload: function unloadTextModeIndentation() {
			
			EDITOR.unbindKey(indentate);
			EDITOR.unbindKey(deindentate);
			
			EDITOR.removeEvent("fileOpen", detectIndentation);
			EDITOR.removeEvent("fileClose", cleanupIndentation);
			
			EDITOR.removeEvent("showMenu", showWhiteSpaceMaybe);
			
			//EDITOR.ctxMenu.remove(menuItem);
			
		},
		order: 200 // run after keyboard_enter.js
	});

	function showWhiteSpaceMaybe() {
		var file = EDITOR.currentFile;
		
		console.log("showWhiteSpaceMaybe: file.mode=" + (file && file.mode));
		
		if(!file) return;
		if(file.mode!="text") return;
		
		menuItem = EDITOR.ctxMenu.addTemp("Show white space", false, toggleShowWhiteSpace);
		EDITOR.ctxMenu.update(menuItem, SHOW_WHITE_SPACE, "Show white space");
	}
	
	function toggleShowWhiteSpace() {
		SHOW_WHITE_SPACE = !SHOW_WHITE_SPACE;
		
		if(SHOW_WHITE_SPACE) {
			EDITOR.addRender(renderWhiteSpace, 2050);
		}
		else {
			EDITOR.removeRender(renderWhiteSpace);
		}
		
		EDITOR.ctxMenu.hide();
		
		EDITOR.renderNeeded();
	}
	
	function renderWhiteSpace(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		if(!SHOW_WHITE_SPACE || !file) return;
		if(file.mode!="text") return;
		
		var transparencePercent = 20;
		ctx.fillStyle = UTIL.makeColorTransparent(EDITOR.settings.style.textColor, transparencePercent);
		
		var colStart = 0;
		var colStop = 0;
		var left = 0;
		var middle = 0;
		var bufferRowCol;
		var char = "";
		var characters = "";
		var indentationWidth = 0;
		var gotCharacter = false; // Only show white space characters on the edges
		var caretRow = file.caret.row - startRow;
		var caretCol = file.caret.col;
		
		
		for(var row = 0; row < buffer.length; row++) {
			
			colStart = Math.max(0, file.startColumn - indentationWidth)
			colStop = Math.min(EDITOR.view.endingColumn-indentationWidth, EDITOR.view.visibleColumns+file.startColumn-indentationWidth, buffer[row].length);
			
			middle = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight + Math.floor(EDITOR.settings.gridHeight/2);
			left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
			
			gotCharacter = false;
			
			for(var col = colStart; col < colStop; col++) {
				bufferRowCol = buffer[row][col];
				char = bufferRowCol.char;
				
				if(char==" ") {
					characters += "•";
				}
				else if(char=="\t") {
					characters += "→";
				}
				else if(char=="\u00A0" || char=="\u2000" || char=="\u2001" || char=="\u2002" || char=="\u2003" || char=="\u2004" || char=="\u2005" || char=="\u2006" || char=="\u2007" || char=="\u2008" || char=="\u2009" || char=="\u200A" || char=="\u200B" || char=="\u202F" || char=="\u205F" || char=="\u3000") {
					characters += "☺";
				}
				else if(characters) {
					if(!gotCharacter) {
print();
						left += (characters.length+1) * EDITOR.settings.gridWidth;
						characters = "";
					}
					else {
						left += (characters.length+1) * EDITOR.settings.gridWidth;
						characters = "";
					}
				}
else {
					left += EDITOR.settings.gridWidth;
					gotCharacter = true;
				}
			}
			
			//console.log("renderWhiteSpace: row=" + row + " caretRow=" + caretRow + " col=" + col + " caretCol=" + caretCol);
			
			// don't show white space next to the caret while typing
			if(characters && !(caretRow == row && caretCol == col && characters.length == 1)) print();
			characters = "";
		}
		
		function print() {
			//console.log("renderWhiteSpace: print " + characters.length);
			ctx.fillText(characters, left, middle);
		}
		
	}
	
	
	function addindentation(file) {
		if(file == undefined) return ALLOW_DEFAULT;
		
		if(file.mode!="text" || !EDITOR.input) {
			console.log("indentate:addindentation Not indentating! file.mode=" + file.mode + " EDITOR.input=" + EDITOR.input + " file?" + (!!file) + " ");
			return ALLOW_DEFAULT;
		}
		
		var row = file.caret.row;
		var indentationCurrentRow = getIndentationOn(file, row);
		var indentationRowAbove = getIndentationOn(file, row-1);
		var rowAbove = file.grid[row-1];
		var last = rowAbove && rowAbove.length > 0 ? rowAbove[rowAbove.length-1].char : "";
		var lastRowEndWithLeftBracket = (last=="{" || last=="[" || last=="(");
		var shouldHaveIndentation = indentationRowAbove;
		
		if(lastRowEndWithLeftBracket) {
			shouldHaveIndentation = indentationRowAbove + indentation[file];
		}
		
		console.log("indentate:addindentation: row=" + row + " indentationCurrentRow=" + indentationCurrentRow.length + " shouldHaveIndentation=" + shouldHaveIndentation.length + " lastRowEndWithLeftBracket=" + lastRowEndWithLeftBracket + " last=" + last);
		
		if( indentationCurrentRow != shouldHaveIndentation ) {
			var currentRow = file.grid[row];
			var caret = file.createCaret(currentRow.startIndex);
			
			if(indentationCurrentRow.length > 0) file.deleteTextRange(currentRow.startIndex, currentRow.startIndex + indentationCurrentRow.length - 1);
			file.insertText(shouldHaveIndentation, caret);
			file.moveCaretRight(file.caret, shouldHaveIndentation.length);
			EDITOR.renderNeeded();
		}
		
		return PREVENT_DEFAULT;
	}
	
	function getIndentationOn(file, row) {
		if(row < 0) return "";
		
		var indentation = "";
		var gridRow = file.grid[row];
		var char = "";
		for(var col=0; col<gridRow.length; col++) {
			char = gridRow[col].char;
			if( char == " " || char == "\t" ) indentation += char;
			else break;
		}
		return indentation;
	}
	
	
	function deindentate(file) {
		return indent(file, true);
	}
	
	function indentate(file) {
		return indent(file, false)
	}
	
	function indent(file, shift) {
		if(!file) return ALLOW_DEFAULT;;
		
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
	
	EDITOR.addTest(function addIndentationOnEnter(callback) {
		EDITOR.openFile("addIndentationOnEnter.txt", '    foo\nbar\n', function(err, file) {
			
			file.moveCaretToEndOfLine();
			
			EDITOR.mock("keydown", {charCode: ENTER});
			
			if(file.text != "    foo\n    \nbar\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			if(file.caret.row != 1) throw new Error("Unexpected file.caret.row=" + file.caret.row);
			if(file.caret.col != 4) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	
	// TEST-CODE-END
	
})();
