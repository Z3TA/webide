
(function() {
	
	"use strict";
	
	var key_LEFT = 37;
	var key_RIGHT = 39;
	var key_UP = 38;
	var key_DOWN = 40;
	
	var selectStart, selectEnd;
	
	
	
	// ## Right arrow
	EDITOR.bindKey({desc: "Move caret right", charCode: key_RIGHT, fun: moveCaretRight});
	
	function moveCaretRight(file, combo) {
		return keyboard_arrows_moveRight(file, combo);
	}
	
	EDITOR.bindKey({desc: "Moves caret right while selecting", charCode: key_RIGHT, combo: SHIFT, fun: moveCaretRightAndSelect});
	function moveCaretRightAndSelect(file, combo) {
		return keyboard_arrows_moveRight(file, combo);
	}
	
	EDITOR.bindKey({desc: "Move caret one word right", charCode: key_RIGHT, combo: CTRL, fun: moveCaretOneWordRight});
	function moveCaretOneWordRight(file, combo) {
		return keyboard_arrows_moveRight(file, combo);
	}
	
	EDITOR.bindKey({desc: "Moves caret one word right while selecting", charCode: key_RIGHT, combo: SHIFT+CTRL, fun: moveCaretOneWordRightAndSelect});
	function moveCaretOneWordRightAndSelect(file, combo) {
return keyboard_arrows_moveRight(file, combo);
}
	
	// ## Left arrow
	EDITOR.bindKey({desc: "Move the caret left", charCode: key_LEFT, fun: 
		function moveCaretLeft(file, combo) {
			return keyboard_arrows_moveLeft(file, combo);
		}
	});
	EDITOR.bindKey({desc: "Move caret one word left", charCode: key_LEFT, combo: CTRL, fun:
		function moveCaretOneWordLeft(file, combo) {
			return keyboard_arrows_moveLeft(file, combo);
		}
	});
	EDITOR.bindKey({desc: "Move the caret left while selecting", charCode: key_LEFT, combo: SHIFT, fun:
		function moveCaretLeftWhileSelecting(file, combo) {
			return keyboard_arrows_moveLeft(file, combo);
		}
	});
	EDITOR.bindKey({desc: "Move caret one word left while selecting", charCode: key_LEFT, combo: SHIFT+CTRL, fun:
		function moveCaretOneWordLeftWhileSelecting(file, combo) {
			return keyboard_arrows_moveLeft(file, combo);
		}
	});
	
	function caretInsideQuote(file, caret) {
		if(!file.parsed) return false;

		var index = file.caret.index;
		var quotes = file.parsed.quotes;
		for(var i=0; i<quotes.length; i++) {
			if(quotes[i].start >= index && quotes[i].end <= index) return true;
		}

		return false;
	}

	function keyboard_arrows_moveRight(file, combo) {
		
		if(!EDITOR.input) return true;
		if(!file) return true;
		if(!(file instanceof File)) return ALLOW_DEFAULT;

		console.log("keyboard_arrows_moveRight: Moving caret right ... combo=" + JSON.stringify(combo));
		
		// Holding down ctrl should step a while word!?
		
		
		file.removeHighlights();
		
		var caret = file.caret;
		var caretIndex = caret.index;
		var stepStart = caretIndex;
		var stepStop = caretIndex;
		
		
		if(combo.alt) return true; // Do nothing if alt key is down
		
		if(combo.ctrl) {
			
			var nextChar;
			var selectedText = file.getSelectedText();
			var insideQuote = caretInsideQuote(file, file.caret);
			var currentlyAt = file.text.charAt(file.caret.index);
			var firstSelectedChar = file.selected.length == 0 ? "" : file.selected[0].char;
			var lastSelectedChar = file.selected.length == 0 ? "" : file.selected[file.selected.length-1].char;
			var rowText = file.rowText(file.caret.row, !file.parsed).slice(0, file.caret.col);

			console.log("keyboard_arrows_moveRight: step to next word... selectedText=" + selectedText + " insideQuote=" + insideQuote + " currentlyAt=" + currentlyAt + " firstSelectedChar=" + firstSelectedChar);

			for(var i=stepStart; i<file.text.length; i++) {
				//char = file.text.charAt(i);
				nextChar = file.text.charAt(i+1);
				console.log("keyboard_arrows_moveRight: nextChar=" + nextChar);
				if( isWhiteSpace(nextChar) ) {
					stepStop = i;
					break;
				}
				else if( (firstSelectedChar == '"' || currentlyAt == '"') && nextChar == '"' ) {
					stepStop = i+1;
					break;
				}
				else if( nextChar == '"' && selectedText.indexOf('"') == -1 ) { // Stop before " when selecting text
					stepStop = i;
					break;
				}
				else if( nextChar == '"' && rowText.indexOf('"') != -1 ) { // Stop after the " if there is a " left of the character on that row
					stepStop = i+1;
					break;
				}
				else if( !insideQuote && nextChar == ")" && (selectedText.indexOf('(') == -1 || firstSelectedChar=="(") ) {
					stepStop = i+1;
					break;
				}
				else if(  !insideQuote && nextChar == "("  ) {
					stepStop = i;
					break;
				}
				else if( !insideQuote && nextChar == "(" && ( lastSelectedChar==")") ) {
					stepStop = i;
					break;
				}
				else if(  !insideQuote && nextChar == "]" && ( selectedText.indexOf('[') == -1 || firstSelectedChar=="[" )  ) {
					stepStop = i+1;
					break;
				}
				else if(  !insideQuote && nextChar == "}" && ( selectedText.indexOf('{') == -1 || firstSelectedChar=="{" )  ) {
					stepStop = i+1;
					break;
				}
			}
		}
		
		if(!combo.shift) file.deselect();
		
		for(var i=stepStart; i<=stepStop; i++) {
			if(combo.shift) {
				if(!caret.eol) {
					file.select(file.grid[caret.row][caret.col], "right");
					// Also select surrogate pairs
					if(  UTIL.isSurrogateStart( file.grid[caret.row][caret.col].char)  ) {
						console.log("keyboard_arrows_moveRight: Selecting surrogate pair");
						file.select(file.grid[caret.row][caret.col+1], "right");
						// Also select surrogate modifier
						if( file.grid[caret.row][caret.col+2] && UTIL.isSurrogateModifierStart(file.grid[caret.row][caret.col+2].char) ) {
							console.log("keyboard_arrows_moveRight: Selecting surrogate modifier (pair)");
							file.select(file.grid[caret.row][caret.col+2], "right");
							file.select(file.grid[caret.row][caret.col+3], "right");
						}
					}
					
				}
			}
			
			file.moveCaretRight(caret);
		}
		
		file.scrollToCaret(caret);
		
		EDITOR.renderNeeded();
		
		file.checkCaret();
		
		return false;
		
	}
	
	
	// ## Left arrow
	
	function keyboard_arrows_moveLeft(file, combo) {
		
		if(!EDITOR.input) return true;
		if(!file) return true;
		
		file.removeHighlights();
		
		var caret = file.caret;
		var caretIndex = caret.index;
		var stepStart = caretIndex;
		var stepStop = caretIndex;
		var spacesFound = 0;
		
		/*
			var shift = (combo==1 || combo==3 || combo==5 || combo == 7); // shift: 1, 3, 5, 7
			var ctrl = (combo==2 || combo==3 || combo==6 || combo==7); // ctrl: 2, 3, 6, 7
			var alt = (combo==4 || combo==5 || combo==6 || combo==7); // alt: 4, 5, 6, 7
		*/
		
		if(combo.alt) return true; // Do nothing if alt key is down
		
		if(combo.ctrl) {
			// step to next word

			var nextChar;
			var selectedText = file.getSelectedText();
			var insideQuote = caretInsideQuote(file, file.caret);
			var currentlyAt = file.text.charAt(file.caret.index-1);
			var firstSelectedChar = file.selected.length == 0 ? "" : file.selected[file.selected.length-1].char;
			var rowText = file.rowText(file.caret.row, !file.parsed).slice(file.caret.col);

			for(var i=stepStop-1; i>-1; i--) {
				//char = file.text.charAt(i);
				nextChar = file.text.charAt(i-1);

				if( isWhiteSpace(nextChar) ) {
					stepStart = i+1;
					break;
				}
				else if( (firstSelectedChar == '"' || currentlyAt == '"') && nextChar == '"' ) {
					stepStart = i;
					break;
				}
				else if(  nextChar=='"' && selectedText.indexOf('"')==-1  ) { // Stop before " when selecting text inside a string/quotes
					stepStart = i+1;
					break;
				}
				// Always stop before the " if there is nothing selected and the text right of the caret does not contain a "
				else if( nextChar == '"' && file.selected.length == 0 && rowText.indexOf('"') == -1 ) {
					stepStart = i+1;
					break;
				}
				else if( nextChar == '"' && selectedText.indexOf('"') == -1 ) {
					stepStart = i;
					break;
				}
				else if(  !insideQuote && nextChar == "(" && ( selectedText.indexOf(')') == -1 || firstSelectedChar==")" )  ) {
					stepStart = i;
					break;
				}
				else if(  !insideQuote && nextChar == "[" && ( selectedText.indexOf(']') == -1 || firstSelectedChar=="]" )  ) {
					stepStart = i;
					break;
				}
				else if(  !insideQuote && nextChar == "{" && ( selectedText.indexOf('}') == -1 || firstSelectedChar=="}" )  ) {
					stepStart = i;
					break;
				}

				/*
					if( isWhiteSpace(nextChar)
					|| (nextChar == '"' && selectedText.indexOf('"') == -1)
					|| (!insideQuote && nextChar == "(" && selectedText.indexOf(')') == -1)
					|| (!insideQuote && nextChar == "[" && selectedText.indexOf(']') == -1)
					|| (!insideQuote && nextChar == "{" && selectedText.indexOf('}') == -1)
					) {
					stepStart = i+1;
					//if(file.selected.length > 0) stepStart--;
					break;
					}
				*/
				
			}

			/*
				for(var i=stepStop-2; i>-1; i--) {
				if(isWhiteSpace(file.text.charAt(i))) {
				spacesFound++;
				if(spacesFound==1) {
				stepStart = i+2;
				break;
				}
				}
				}
			*/
			
		}
		
		console.log("keyboard_arrows_moveLeft: stepStart=" + stepStart);
		console.log("keyboard_arrows_moveLeft: stepStop=" + stepStop);
		
		if(!combo.shift) file.deselect();
		
		for(var i=stepStart; i<=stepStop; i++) {
			if(combo.shift) {
				if(caret.col > 0) {
					file.select(file.grid[caret.row][caret.col-1], "left");
					// Also select surrogate pairs
					if(  UTIL.isSurrogateEnd( file.grid[caret.row][caret.col-1].char)  ) {
						console.log("keyboard_arrows_moveLeft: Selected a surrogate end!");
						
						if( UTIL.isSurrogateModifierEnd(file.grid[caret.row][caret.col-1].char) && file.grid[caret.row][caret.col-2] ) {
							console.log("keyboard_arrows_moveLeft: Selecting surrogate modifier");
							file.select(file.grid[caret.row][caret.col-2], "left");
							
							if( file.grid[caret.row][caret.col-3] && UTIL.isSurrogateEnd(file.grid[caret.row][caret.col-3].char) && file.grid[caret.row][caret.col-4] ) {
								console.log("keyboard_arrows_moveLeft: Selecting surrogate (pair) after selecting modifier");
								file.select(file.grid[caret.row][caret.col-3], "left");
								file.select(file.grid[caret.row][caret.col-4], "left");
							}
						}
						else if( UTIL.isSurrogateEnd(file.grid[caret.row][caret.col-1].char) && file.grid[caret.row][caret.col-2] ) {
							console.log("keyboard_arrows_moveLeft: Selecting surrogate");
							file.select(file.grid[caret.row][caret.col-2], "left");
						}
						
					}
				}
			}
			
			file.moveCaretLeft(caret);
		}
		
		file.scrollToCaret(caret);
		
		EDITOR.renderNeeded();
		
		return false;
		
	}
	
	
	// ## Up arrow
	
	EDITOR.bindKey({desc: "Move caret up", charCode: key_UP, fun: 
		function moveCaretUp(file, combo) {
			return keyboard_arrows_moveUp(file, combo);
		}
	});
	EDITOR.bindKey({desc: "Move caret up while selecting", charCode: key_UP, combo: SHIFT, fun:
		function moveCaretUpWhileSelecting(file, combo) {
			return keyboard_arrows_moveUp(file, combo);
		}
	});
	
	function keyboard_arrows_moveUp(file, combo) {
		
		if(!EDITOR.input) return true;
		if(!file) return true;

		file.removeHighlights();
		
		var caret = file.caret;
		
		if(combo.alt) return true; // Do nothing if alt key is down
		if(combo.ctrl) return true; // Do nothing if alt ctrl is down
		
		console.log("Moving caret up ...");
	
		if(combo.sum == SHIFT) {
			// End the selection with the character left of the caret
			
			if(caret.col > 0) {
				selectEnd = file.grid[caret.row][caret.col-1].index; // character to the left
			}
			else if(caret.col == 0) {// Caret is on the first character of the row
				// The left character is at the end of the row above
				if(caret.row > 0) {
					var rowAbove = file.grid[caret.row-1];
					
					if(rowAbove.length > 0) {
						selectEnd = rowAbove[rowAbove.length-1].index;
					}
					else {
						selectEnd = rowAbove.startIndex;
					}

				}
				else {
					// The caret is on the first character on the first row
					// Moving up will do nothing!
					selectEnd = undefined;
				}
			}
		}
		else {
			selectStart = undefined;
			selectEnd = undefined;
			file.deselect();
		}
		
		file.moveCaretUp(); // Moves the caret !
		
		if(combo.sum == SHIFT) {
			selectStart = caret.index;
		}
		
		if(selectStart !== undefined && selectEnd !== undefined) {
			var textRange = file.createTextRange(selectStart, selectEnd);
			
			//textRange.pop(); // Do not select the last character
			
			file.select(textRange, "left");
				
		}
		
		file.scrollToCaret(caret);
		
		EDITOR.renderNeeded();
		
		return false;
	
	}
	
	
	// ## Key down
	
	EDITOR.bindKey({desc: "Move caret down", charCode: key_DOWN, fun: 
		function moveCaretDown(file, combo) {
			return keyboard_arrows_moveDown(file, combo);
}
	});
	EDITOR.bindKey({desc: "Move caret down while selecting", charCode: key_DOWN, combo: SHIFT, fun:
		function moveCaretDownWhileSelecting(file, combo) {
			return keyboard_arrows_moveDown(file, combo);
		}
	});
	
	function keyboard_arrows_moveDown(file, combo) {
		
		if(!EDITOR.input) return true;
		if(!file) return true;

		file.removeHighlights();
		
		if(combo.alt) return true; // Do nothing if alt key is down
		if(combo.ctrl) return true; // Do nothing if alt ctrl is down

		console.log("Moving caret down ...");
		
		var caret = file.caret;
		
		if(combo.sum == SHIFT) {
			selectStart = caret.index;

			// Also select the last row if we are at it
			if(caret.row >= file.grid.length-1) {
				console.log("on last row");
				
				// Move caret to eof
				caret.eof = true;
				caret.eol = true;
				caret.col = file.grid[caret.row].length;
				caret.index = file.text.length;
			}
			else {
				console.log("on row=" + caret.row + " file.grid.length=" + file.grid.length);
			}
		}
		else {
			selectStart = undefined;
			selectEnd = undefined;
			file.deselect();
		}
		
		caret = file.moveCaretDown(caret); // Moves the caret
		
					
		if(combo.sum == SHIFT) {
			selectEnd = caret.index;
			
		}

		
		console.log("selectStart=" + selectStart + ", selectEnd=" + selectEnd + "");
		
		if(selectStart != undefined && selectEnd != undefined) {
			var textRange = file.createTextRange(selectStart, selectEnd);
			
			if(!caret.eol) textRange.pop(); // Do not select the last character
			
			//console.log("Selecting: " + JSON.stringify(textRange, null, 2));
			
			file.select(textRange, "right");
				
		}
		
		file.scrollToCaret(caret); // Scroll to the new caret
		
		file.caret = caret; // Set the new caret
		
		EDITOR.renderNeeded();
		
		return false;
		
	}
	
	function isWhiteSpace(char) {
		return (char == " " || char == "\n" || char == "\r");
	}
	

	// TEST-CODE-START

	EDITOR.addTest(false, testStopAtQuote);
	EDITOR.addTest(false, testStopBeforeQuoteWhenSelectingInsideQuote);

	EDITOR.bindKey({desc: "Run keyboard arrow tests", charCode: key_RIGHT, combo: SHIFT + ALT, fun: runKeyboardArrowTests});

	function runKeyboardArrowTests() {
		var success = 0;
		var fail = 0;
		var total = 0;

		var tests = [testStopAtQuote, testStopBeforeQuoteWhenSelectingInsideQuote];
		
		tests.forEach(function(test) {
			test(cb);
		});

		return PREVENT_DEFAULT;

		function cb(ok) {
			if(ok) success++;
			else fail++;

			total++;

			if(total == tests.length) alertBox(success + " tests succeeded. " + fail + " tests failed");

		}
	}

	function testStopBeforeQuoteWhenSelectingInsideQuote(callback) {
		var ctrlCombo = {ctrl: true};
		var ctrlSelect = {ctrl: true, shift: true};
		EDITOR.openFile("testStopBeforeQuoteWhenSelectingInsideQuote.txt", 'var foo="foo bar baz";\n', function (err, file) {
			if(err) throw err;

			// If there is a quote left of the caret it should stop after the quote
			file.moveCaretToIndex(9);
			keyboard_arrows_moveRight(file, ctrlSelect)
			UTIL.assert(file.caret.index, 12), new Error();
			UTIL.assert(file.getSelectedText(), 'foo', new Error());
			
			keyboard_arrows_moveRight(file, ctrlSelect)
			UTIL.assert(file.caret.index, 16, new Error());
			UTIL.assert(file.getSelectedText(), 'foo bar', new Error());

			keyboard_arrows_moveRight(file, ctrlSelect)
			UTIL.assert(file.caret.index, 20, new Error());
			UTIL.assert(file.getSelectedText(), 'foo bar baz', new Error());

			file.deselect();

			keyboard_arrows_moveLeft(file, ctrlSelect);
			keyboard_arrows_moveLeft(file, ctrlSelect);
			keyboard_arrows_moveLeft(file, ctrlSelect);
			UTIL.assert(file.caret.index, 9, new Error());
			UTIL.assert(file.getSelectedText(), 'foo bar baz', new Error());

			EDITOR.closeFile(file);

			callback(true);
		});
	}

	function testStopAtQuote(callback) {
		var ctrlCombo = {ctrl: true};
		var ctrlSelect = {ctrl: true, shift: true};
		EDITOR.openFile("testStopAtQuote.txt", 'var foo="bar";//comment', function (err, file) {
			if(err) throw err;

			// If there is a quote left of the caret it should stop after the quote
			file.moveCaretToIndex(8);
keyboard_arrows_moveRight(file, ctrlCombo)
			UTIL.assert(file.caret.index, 13);

			keyboard_arrows_moveLeft(file, ctrlCombo)
			UTIL.assert(file.caret.index, 8);

			// Should do the same thing when selecting
			file.moveCaretToIndex(8);
			keyboard_arrows_moveRight(file, ctrlSelect)
			UTIL.assert(file.caret.index, 13);
			UTIL.assert(file.getSelectedText(), '"bar"');
			file.deselect();
			keyboard_arrows_moveLeft(file, ctrlSelect)
			UTIL.assert(file.caret.index, 8);
			UTIL.assert(file.getSelectedText(), '"bar"', new Error());

			EDITOR.closeFile(file);

			callback(true);
		});
	}


	// TEST-CODE-END


})();