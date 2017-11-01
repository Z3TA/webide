
(function() {
	/*
		Allows selecting text using the mouse.
		
	*/
	
	"use strict";
	
	var oldMouseX,
		oldMouseY,
		startIndex, 
		endIndex,
		distSelfSelect = EDITOR.settings.gridWidth / 3,
		oldCaret,
		oldCaretEol = false,
		rightCaretEol = false,
		lastUp = new Date(),
		dblClickTime = 350,
		lastCaretIndex = 0,
		lastDown,
		lastDirection,
		lastSelectionStart = 0,
		lastSelectionEnd = 0,
		mouseStartX = 0,
		mouseStartY = 0,
		mouseX = 0,
		mouseY = 0,
		isSelecting = false,
		clicksAfterEachOther = 0,
	llEvType = "",
	lastEvType = "",
	lastY = -1,
	lastX = -1,
	deltaNext = 0,
		currentDirection;

	EDITOR.on("start", mouse_select_init);
	
	function mouse_select_init() {
		EDITOR.addEvent("mouseClick", {fun: mouseSelectDown, dir: "down", targetClass:"fileCanvas", button: 0});
		EDITOR.addEvent("mouseClick", {fun: mouseSelectUp, dir: "up", targetClass:"fileCanvas", button: 0});
		
		EDITOR.on("mouseMove", mouseSelectMouseMove);
	}
	
	function mouseSelectDown() {
		mouseSelect.apply(this, arguments);
	}
	
	function mouseSelectUp() {
		mouseSelect.apply(this, arguments);
	}
	
	function mouseSelect(mouseX, mouseY, caret, direction, button, target, keyboardCombo, ev) {
		
		console.log("mouseSelect! mouseX=" + mouseX + " mouseY=" + mouseY + " direction=" + direction + " button=" + button + " caret=" + JSON.stringify(caret) + " target=" + target + " keyboardCombo=" + keyboardCombo + " ev.type=" + ev.type);
		
		// Some mobile browser (Opera Mobile) fires both mousedown and touchstart!
		console.log(" llEvType=" + llEvType + " lastEvType=" + lastEvType + " ev.type=" + ev.type);
		
		if(llEvType=="touchend" && lastEvType=="mousedown" && ev.type=="mouseup") return; // Prevent "double" click when doing touch
		
		if(llEvType=="touchstart" && lastEvType=="touchend" && ev.type=="mousedown") return; // Prevent "double" mousedown after touchstart
		
		llEvType = lastEvType;
		lastEvType = ev.type;
		
		
		lastDirection = currentDirection;
		currentDirection = direction;
		
		// Note that caret is a temporary position caret (not the current file.caret)!

		if(EDITOR.currentFile && caret) {
			
			var file = EDITOR.currentFile;
			
			file.removeHighlights();
			
			console.log("direction=" + direction + " lastDirection=" + lastDirection + "");
			
			if(direction == "down") {
				startSelecting(file, caret);
			}
			else if(direction == "up") {
				endSelecting();
			}
			
			if(keyboardCombo.sum == SHIFT && direction == "down") {
				
				// If there's already an selection, use the old startIndex
				if(file.selected.length == 0) {
					startIndex = file.caret.index;
				} else {
					// Use old startIndex
					file.deselect();
					}
				console.log("sel startIndex=" + startIndex);
				endIndex = caret.index;
				oldCaretEol = file.caret.eol;
				makeSelection(file, caret);
				file.caret = caret;
				
			}
			else if(direction == "down") {
				
				lastDown = new Date();
				
				oldMouseX = mouseX;
				oldMouseY = mouseY;
				startIndex = caret.index;
				oldCaretEol = caret.eol;
				oldCaret = caret;

				file.deselect();
				

			
				// Clicking in the left margin should select the whole line!? Or du we have to double click for that!?
				/*
				if(mouseX < EDITOR.settings.leftMargin/2) {
					selectWholeLine();
					makeSelection(file, caret, false);
				}
				*/

				
			}
			else if(direction == "up" && lastDirection == "down" && keyboardCombo.sum == 0) {
					
				// ## Select text ...
				endSelecting();
				
				endIndex = caret.index;
				
				console.log("startIndex=" + startIndex + " endIndex=" + endIndex);
				
				var diff = (new Date()) - lastUp; // milliseconds
				console.log("diff=" + diff);
				
				
				if(diff < dblClickTime) { //  && lastCaretIndex == caret.index
					clicksAfterEachOther++;
				}
				else {
					clicksAfterEachOther = 0;
				}
				
				console.log("diff=" + diff + 
				" dblClickTime=" + dblClickTime + 
				" clicksAfterEachOther=" + clicksAfterEachOther + 
				" lastCaretIndex=" + lastCaretIndex + 
				" caret.index=" + caret.index);
				
				if(clicksAfterEachOther == 3) {
					console.log("Quad click!");
					// Select the whole paragraph: Look for double line-breaks + also match {}
					
					var textRange = findParagraph(file, caret.index);
					
					if(textRange) {
					
						startIndex = textRange[0];
						endIndex = textRange[1];
						
						// Place caret at the end of the selection (to prevent the last character from popping)
						//file.moveCaretToIndex(endIndex, caret);
					
						makeSelection(file, caret, false); // false means "do not pop"
					}
					
				}
				else if(clicksAfterEachOther == 2) {
					console.log("Tripple click!");
					
					selectWholeLine();
					
					// Place caret at the end of the selection (to prevent the last character from popping)
					file.moveCaretToIndex(endIndex, caret);
					
					makeSelection(file, caret);
					
					
				}
				else if(clicksAfterEachOther == 1) {
					console.log("It's a double click!");
					
					// When you double click in the margin, the whole line should be selected
					if(caret.col==0 && file.grid[caret.row].length > 0 && mouseX < EDITOR.settings.leftMargin * 0.85) {
						selectWholeLine();
						makeSelection(file, caret, false);
						
					}
					else {
						// ### Select the word we dbl-clicked on
						var range = findWord(caret.index, file.text);
						
						if(range.word.length > 0) {
							startIndex = range.start;
							endIndex = range.end;
							
							// ### Find more occurencie(s) of the select text and highlight it.
							file.highlightText(range.word);
							
							console.log("range.word=" + range.word);
							
							// Place caret at the end of the selection (to prevent the last character from popping)
							file.moveCaretToIndex(endIndex, caret);
							
							//var pop = true;
							//if(file.caret.eol) pop = false;
							
							makeSelection(file, caret);
						}
						
						
					}
					



					
				}

				
				//makeSelection(file, caret);

				// If we return here it will prevent "double" calling mouseup and mousedown, 
				
				
				// Setting lastUp seem to fire mouseup and mousedown
				
				lastUp = new Date();
				lastCaretIndex = caret.index;
				
				// But if we return here it *will* call mouseup and mousedown !
				
				

				
			}
			
			
			EDITOR.renderNeeded();
			
			return false;
			
			
			
		
		}
		
		function selectWholeLine() {
			startIndex = file.grid[caret.row].startIndex;
			if(caret.eol) {
				endIndex = startIndex;
			}
			else {
				endIndex = file.grid[caret.row][  file.grid[caret.row].length-1  ].index + 1;
			}
		}
		
		
		function mouseSelect_mouseMove() {
			// Render
			console.log("Moving ...");
			EDITOR.renderNeeded();
		}
		

		
		
	}

	function findParagraph(file, index) {
		
		var first = index;
		var second = 0;
		var startIndex = 0;
		var endIndex = 0;
		var txt = "";
		
		while(first > -1) {
			first = file.text.lastIndexOf(file.lineBreak, first) - file.lineBreak.length;
			second = file.text.lastIndexOf(file.lineBreak, first);
			
			txt = file.text.substring(first, second).trim();
			
			//console.log("LL first=" + first + " second=" + second + " txt=" + txt);
			
			if(txt == "") break;
		}
		
		if(first == -1) {
			console.log("No paragraph found!");
			return false;
		}
		
		startIndex = first + file.lineBreak.length;
		first = startIndex;
	
		
		while(second != -1) {
			first = file.text.indexOf(file.lineBreak, first) + file.lineBreak.length;
			second = file.text.indexOf(file.lineBreak, first);
			
			txt = file.text.substring(first, second).trim();
			
			//console.log("II first=" + first + " second=" + second + " txt=" + txt);
			
			if(txt == "") break;
		}
		
		if(first == -1) {
			console.log("No paragraph found!");
			return false;
		}
		
		endIndex = first;
		
		// Now make sure the "m�svingar" {} matches
		
		var text = file.text.substring(startIndex, endIndex);
		var vL = UTIL.occurrences(text, "{");
		var vR = UTIL.occurrences(text, "}");
		
		console.log("vL=" + vL + " vR=" + vR + "");
		
		if(vL > vR) {
			// Find }'s until there is a match (ignore comments!?)
			for(var i=endIndex+1; i<file.text.length; i++) {
				console.log("charAt(" + i + ")=" + file.text.charAt(i));
				if(file.text.charAt(i) == "}") {
					vR++;
					if(vR >= vL) {
						endIndex = i;
						break;
					}
				}
			}
		}
		else if(vR > vL) {
			// Remove text until {'s match (ignore comments!?)
			for(var i=endIndex; i>startIndex; i--) {
				if(file.text.charAt(i) == "}") {
					vR--;
					if(vR <= vL) {
						endIndex = i;
						break;
					}
				}
			}
		}
		
		console.warn("startIndex=" + startIndex + " endIndex=" + endIndex);
		
		return [startIndex, endIndex];
	}

	function makeSelection(file, caret, pop) {
		
		if(pop == undefined) pop = true;
		
		var start = startIndex;
		var end = endIndex;
		
		if(start != end) {
			
			if(start > end) {
				// Selected from the right to the left. Switch the cursors.
				
				rightCaretEol = oldCaretEol;
				
				var startIndexOriginal = start;
				start = end;
				end = startIndexOriginal;
				
			}
			else {
				rightCaretEol = caret.eol;
			}
			
			if(start == lastSelectionStart && end == lastSelectionEnd) {
				console.warn("Selecting the same selection again!");
			}
			
			console.log("Making selection from " + start + " to " + end + "")
			
			// Select the text
			var textRange = file.createTextRange(start, end);
			
			if(rightCaretEol == false && pop) {
				// Do not select the last character (the caret is on)
				
				console.log("POPPING!");
				
				textRange.pop();
			}

			file.select(textRange);
			
			//file.caret = caret;
			
			lastSelectionStart = start;
			lastSelectionEnd = end;
			
			console.log("Select text!");
			EDITOR.renderNeeded();

		}
		else if(Math.sqrt(  Math.pow(mouseX-oldMouseX, 2)  +  Math.pow(mouseY-oldMouseY, 2)  ) > distSelfSelect) {
			// Select the current caret
			file.select(file.grid[caret.row][caret.col]);
			EDITOR.renderNeeded();
		}

		
	}
	
	
	function startSelecting(file, caret) {
		/*
		EDITOR.addRender(select_render);
		
		console.log("indentation=" + file.grid[caret.row].indentation);
		
		mouseStartX = (caret.col - file.startColumn + file.grid[caret.row].indentation * EDITOR.settings.tabSpace ) * EDITOR.settings.gridWidth + EDITOR.settings.leftMargin;
		mouseStartY = (caret.row - file.startRow + 1) * EDITOR.settings.gridHeight + EDITOR.settings.topMargin;
		

		mouseStartX = mouseX;
		mouseStartY = mouseY;
		*/
		
		isSelecting = true;
		
		console.log("start selecting yo");
	}
	
	function endSelecting() {
		
		isSelecting = false;
		//EDITOR.removeRender(select_render);
		
	}
	
	function adjustToGridY(v) {
		var g = EDITOR.settings.gridHeight;
		
		var av = Math.abs(v);
		
		var sign = v / Math.max(1,av);
		
		v = av;
		
		v = Math.max(   Math.ceil(  (v  )   /g) * g  , g  );
		
		return v * sign;
	}
	
	function adjustToGridX(v) {
		var g = EDITOR.settings.gridWidth;
		
		var av = Math.abs(v);
		
		var sign = v / Math.max(1,av);
		
		v = av;
		
		v = Math.ceil((v-g/2)/g) * g;
		
		
		
		return v * sign;
	}
	
	function select_render(ctx, buffer, file) {
		
		// Render dotted rectangle
		
		
		
		var width = mouseX - mouseStartX;
		var height = mouseY - mouseStartY;
		
		ctx.beginPath();
		ctx.lineWidth=1;
		//ctx.setLineDash([4,8]);
		
		var gh = EDITOR.settings.gridHeight;
		
		if(1 == 1) {
			ctx.strokeStyle="rgba(255,0,0, 1)";
			var h = adjustToGridY(height);
			var t = ( h >= gh)*gh;
			ctx.strokeRect(mouseStartX,mouseStartY - t , adjustToGridX(width), h + t  );
		}
		else {
			ctx.strokeStyle="rgba(0,0,0, 1)";
			ctx.strokeRect(mouseStartX,mouseStartY, width, height);

		}
		
		/*
		function dashedLine(x,y,x2,y2,dashArray) {
			if (!dashArray) dashArray=[10,5];
			if (dashLength==0) dashLength = 0.001; // Hack for Safari
			var dashCount = dashArray.length;
			ctx.moveTo(x, y);
			var dx = (x2-x), dy = (y2-y);
			var slope = dx ? dy/dx : 1e15;
			var distRemaining = Math.sqrt( dx*dx + dy*dy );
			var dashIndex=0, draw=true;
			while (distRemaining>=0.1) {
				var dashLength = dashArray[dashIndex++%dashCount];
				if (dashLength > distRemaining) dashLength = distRemaining;
				var xStep = Math.sqrt( dashLength*dashLength / (1 + slope*slope) );
				if (dx<0) xStep = -xStep;
				x += xStep
				y += slope*xStep;
				ctx[draw ? 'lineTo' : 'moveTo'](x,y);
				distRemaining -= dashLength;
				draw = !draw;
			}
		
		}
		*/
		
	}
	
	function mouseSelectMouseMove(x, y, target, ev) {
		
		console.log("mouseSelectMouseMove: x=" + x + " y=" + y + " target=" + target + " ev.type=" + ev.type + " ");
		
		if(ev.type == "touchmove") {
			// Prevent scrolling of the body
			window.scrollTo(0, 0);
			ev.preventDefault();
			ev.stopPropagation();
			
			// Scroll the text!
			var file = EDITOR.currentFile;
			if(lastY != -1 && file) {
				//var deltaY = Math.abs(lastY - y);
				var deltaY = 1;
				var deltaX = lastX - x;
				if(deltaX == 0) { 
				console.log("--> deltaY=" + deltaY);
				var dir = lastY > y ? 1 : -1;
				var scrollSpeed = Math.floor((deltaY + deltaNext) / 5);
				
				if(scrollSpeed == 0) deltaNext += deltaY;
				else deltaNext = 0;
				
				if(scrollSpeed > 0 && !deltaX) {
				var startRow = file.startRow + scrollSpeed * dir;
				console.log("Scrolling from row " + file.startRow + " to " + startRow + " deltaY=" + deltaY + " dir=" + dir + " scrollSpeed=" + scrollSpeed + " ");
				if(startRow < 0) startRow = 0;
				file.scrollTo(undefined, startRow);
				
				EDITOR.renderNeeded();
				}
			}
			}
			
			lastY = y;
			lastX = x;
			return;
			
		}
		
		if(target.className == "fileCanvas") {
			mouseX = x;
			mouseY = y;
			//console.log("isSelecting=" + isSelecting);
			
			if(isSelecting) {
				var file = EDITOR.currentFile;
				var caret = EDITOR.mousePositionToCaret(mouseX, mouseY);
				
				// Place the caret
				EDITOR.currentFile.caret = caret;
				
				endIndex = caret.index;
				
				file.deselect();
				console.log("Deselected!");
				
				makeSelection(file, caret);
				
				EDITOR.renderNeeded();
			}
		}
		else {
			// Mouse is outside the canvas
			isSelecting = false;
		}
	}
	
	function findWord(index, text) {
		// Returns an object with the start and end index of the word
		
		var word = "",
			start = index-1,
			char = "",
			end = index;
		
		// Go left
		for(var i=index-1; i>-1; i--) {
			char = text.charAt(i);
			
			if(!isText(char)) break;
			
			word = char + word;
		}
		start = i + 1;
		
		
		// Go right
		while(end < text.length) {
			char = text.charAt(end);
			
			if(!isText(char)) break;
			
			word = word + char;
			
			end++;
		}
		
		/*
		for(var i=index; i<text.length; i++) {
			char = text.charAt(i);
			
			if(!isText(char)) break;
			
			word = word + char;
		}
		end = i;
		*/
		
		console.log(" DAS WORD YO word=" + UTIL.lbChars(word));
		console.log("world length: " + (end-start));
		
		return {start: start, end: end, word: word};
		
		function isText(letter) {
			
			console.log(letter);
			
			var nonLetters = [" ", "\n", "\r", "\t", "'", '"', "+", "-", "/", "*", "=", "(", ")", "[", "]", ",", ".", "<", ">", ";", "{", "}", ":", "!", "\\"];
				
				for(var i=0; i<nonLetters.length; i++) {
					if(letter == nonLetters[i]) {
						return false;
					}
				}
				
				return true;
				
			}
		
	}

})();
