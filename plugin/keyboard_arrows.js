
(function() {
	
	"use strict";
	
	global.keyBindings.push({charCode: 39, fun: moveRight, dir: "down"});
	//global.keyBindings.push({charCode: 39, fun: moveRightAndSelect, combo: 1});
	
	global.keyBindings.push({charCode: 37, fun: moveLeft});
	global.keyBindings.push({charCode: 38, fun: moveUp});
	global.keyBindings.push({charCode: 40, fun: moveDown});
	
	var selectStart, selectEnd;

	
	function isWhiteSpace(char) {
		return (char == " " || char == "\n" || char == "\r");
	}
	
	
	function moveLeft(file, combo, character, charCode, keyPush) {
		
		if(file.gotFocus) {
			file.removeHighlights();

			console.log("Move caret left!");

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
			
			if(combo.alt) return; // Do nothing if alt key is down
			
			if(combo.ctrl) {
				// step to next word
				for(var i=stepStop-2; i>0; i--) {
					if(isWhiteSpace(file.text.charAt(i))) {
						spacesFound++;
						if(spacesFound==1) {
							stepStart = i+2;
							break;
						}
					}
				}
			}
			
			console.log("stepStart=" + stepStart);
			console.log("stepStop=" + stepStop);
			
			if(!combo.shift) file.deselect();
			
			for(var i=stepStart; i<=stepStop; i++) {

				file.moveCaretLeft(caret);
				
				if(combo.shift) {
					if(!caret.eol) {
						file.select(file.grid[caret.row][caret.col], "left");
					}
				}
			}
			
			file.scrollToCaret(caret);

			global.render = true;
		}
		else {
			console.log("File dont have focus!");
		}

	}
	
	function moveRight(file, combo) {

		
		console.log("Moving caret right ...");
		
		// Holding down ctrl should step a while word!?
		
		if(file.gotFocus) {
			
			file.removeHighlights();
			
			var caret = file.caret;
			var caretIndex = caret.index;
			var stepStart = caretIndex;
			var stepStop = caretIndex;
			

			if(combo.alt) return; // Do nothing if alt key is down
			
			if(combo.ctrl) {
				// step to next word
				for(var i=stepStart; i<file.text.length; i++) {
					if(isWhiteSpace(file.text.charAt(i))) {
						stepStop = i;
						break;
					}
				}
			}
			
			if(!combo.shift) file.deselect();
			
			for(var i=stepStart; i<=stepStop; i++) {
				if(combo.shift) {
					if(!caret.eol) {
						file.select(file.grid[caret.row][caret.col], "right");
					}
				}
				
				file.moveCaretRight(caret);
			}

			file.scrollToCaret(caret);
			
			global.render = true;
			
		}
		
		file.checkCaret();
		
	}
	
	function moveRightAndSelect(file) {
		
	}
	
	
	function moveUp(file, combo) {
		
		
		if(file.gotFocus) {
			file.removeHighlights();
			
			console.log("Moving caret up ...");

			var caret = file.caret;
			
			if(combo.alt) return; // Do nothing if alt key is down
			if(combo.ctrl) return; // Do nothing if alt ctrl is down

		
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
			
			global.render = true;

		}
		
	
	}
	
	function moveDown(file, combo) {
		
		if(file.gotFocus) {
			file.removeHighlights();
			
			if(combo.alt) return; // Do nothing if alt key is down
			if(combo.ctrl) return; // Do nothing if alt ctrl is down

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
			
			file.moveCaretDown(caret); // Moves the caret
			
			
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
			
			file.scrollToCaret(caret);
			
			global.render = true;
			
		}
		
	}
	
	
})();