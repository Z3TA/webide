(function() {
	/*
		The editor can render (single row) before the index's for the grid is recalculated!
		So we can not depend on these index's for rendering!
		
		A renderer should Only depend on the buffer! Not the text nor the grid!
	*/
	
	editor.on("start", init);
	
	function init() {
		
		highLightX("(", ")");
		highLightX("{", "}");
		
	}
	
	function highLightX(a, b) {
		global.renders.push(function(ctx, buffer, file, startRow) {
			highlightMatch(ctx, buffer, file, a, b, startRow);
		});
	}
	
	function highlightMatch(ctx, buffer, file, lP, rP, startRow) {
		
		if(startRow == undefined) startRow = 0;
		
		var leftEqualsRightCount = true;
		
		// The caret position on the buffer
		var row = file.caret.row - file.startRow + startRow;
		var col = file.caret.col;
		
		//console.log("row=" + row + " col=" + col + "");
		
		// Is the caret inside the buffer!?
		var caretInsideBuffer = row >= 0 && row < buffer.length;
		
		if(caretInsideBuffer) {
			// What type of character is the caret on?
			var charAtCaret = "";
			var charToTheLeft = "";
			
			if(!file.caret.eol && buffer[row].length > 0) {
				charAtCaret = buffer[row][col].char;
			}
			
			if(col > 0) {
				charToTheLeft = buffer[row][col-1].char;
			}
			
			
			//console.log("lP=" + lP + " rP=" + rP + " charAtCaret=" + charAtCaret + " (" + (charAtCaret == lP || charAtCaret == rP) + ") charToTheLeft=" + charToTheLeft + " (" + (charToTheLeft==lP || charToTheLeft==rP) + ") ");
			
			if(charToTheLeft == lP && charAtCaret == rP) { // (|)
				//console.log("We are between two matches");
				return;
			}
			
			// Figure out if we are next to a character we want to match, and witch one
			var charToMatch;
			if(charAtCaret == lP || charAtCaret == rP) {
				//console.log("charAtCaret==lP||rP, " + charAtCaret + "=" + lP + " || " + rP);
				charToMatch = charAtCaret;
			}
			else if(charToTheLeft == lP || charToTheLeft == rP) {
				//console.log("wooot");
				col--;
				charToMatch = charToTheLeft;
			}
			else {
				//console.log("Caret is not close to an " + lP + " or " + rP + " ");
				//console.log("lP=" + lP + " rP=" + rP + " charAtCaret=" + charAtCaret + " (" + (charAtCaret == lP || charAtCaret == rP) + ") charToTheLeft=" + charToTheLeft + " (" + (charToTheLeft==lP || charToTheLeft==rP) + ") ");
			
				return;
			}
			
			// todo: If the one at the character is not inside a string: ignore strings. If it's inside a string, search just that string.
			
				// A render function should not depend on a parser. Because some times there will be a render before a parse!
			
			// Search the buffer for the matching character
			
			
			var leftPosition, rightPosition;
			
			if(charToMatch == lP) {
				leftPosition = {row: row, col: col};
				rightPosition = searchBufferRight(row, col+1);
				}
			else {// if(char == rP || lastChar == rP) {
				leftPosition = searchBufferLeft(row, col-1);
				rightPosition = {row: row, col: col};
				}
			
			//console.log("leftPosition=" + JSON.stringify(leftPosition) + " rightPosition=" + JSON.stringify(rightPosition) );
			
			if(!leftPosition || !rightPosition) {
				//console.log("No match found! (probably located outside the buffer)")
				return;
			}
			
			
			var firstLocation = {
				x: global.settings.leftMargin + (leftPosition.col + buffer[leftPosition.row].indentation * global.settings.tabSpace - file.startColumn) * global.settings.gridWidth,
				y: global.settings.topMargin + (leftPosition.row+startRow) * global.settings.gridHeight
			};
			
			
			
			var secondLocation = {
				x: global.settings.leftMargin + (rightPosition.col + buffer[rightPosition.row].indentation * global.settings.tabSpace - file.startColumn) * global.settings.gridWidth,
					y: global.settings.topMargin + (rightPosition.row+startRow) * global.settings.gridHeight
			};
					
				
			// Now when we got both positions, lets show something!
			
			//ctx.rect(firstLocation.x, firstLocation.y, global.settings.gridWidth, global.settings.gridHeight); // x,y,width,height
			//ctx.rect(secondLocation.x, secondLocation.y, global.settings.gridWidth, global.settings.gridHeight); // x,y,width,height
			
			ctx.font=global.settings.style.highlightMatchFont;
			
			//console.log("ctx.font=" + ctx.font);
			//console.log("global.settings.style.highlightMatchFont=" + global.settings.style.highlightMatchFont);
			
			// Clear boxes before painting in them
			/*
			ctx.fillStyle = global.settings.style.highlightMatchBackground;
			ctx.fillRect(firstLocation.x, firstLocation.y, global.settings.gridWidth, global.settings.gridHeight);
			ctx.fillRect(secondLocation.x, secondLocation.y, global.settings.gridWidth, global.settings.gridHeight);
			*/
			
			// Render the things
			if(leftEqualsRightCount === true) {
				ctx.fillStyle=global.settings.style.highlightMatchFontColor;
			}
			else {
			ctx.fillStyle=global.settings.style.highlightMissMatchFontColor;
			}
			
			ctx.fillText(lP, firstLocation.x, firstLocation.y);
				ctx.fillText(rP, secondLocation.x, secondLocation.y);
			
			//ctx.fill(); // Needed for rect to fill!
		}
		else {
			// The caret is not inside the buffer.
			
			// Make separate curlyBracketMather module!
			
			// Draw a line depending on the caret indentation
			/*
			var indentation = file.grid[file.caret.row].indentation;
			
			var x = global.settings.leftMargin + (indentation * global.settings.tabSpace) * global.settings.gridWidth;
			
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, global.view.canvasHeight);
			ctx.stroke();
				*/
		}
		
		console.timeEnd("highlightMatch " + lP + rP);
		
		
		
		function searchBufferRight(row, col) {
			var skip = 0, char = "";
			//console.log("Searching right:");
			for(var row=row; row<buffer.length; row++) {
				for(var col=col; col<buffer[row].length; col++) {
					char = buffer[row][col].char;
					//console.log(char + "=" + rP + " ? " + (char==rP));
					if(char == lP) skip++
					else if(char == rP) {
						if(skip--===0) {
							//console.log("Found second RIGHT match at row=" + row + " col=" + col + " ");
							return {row: row, col: col};
						}
					}
				}
				col = 0; // Start from the first column
			}
			return false; // Nothing found
		}
		
		
		function searchBufferLeft(row, col) {
			// Look for lP ...
		//console.log("Searching left:");
			// First search current row
			var skip = 0, char = "";
		for(var col=col; col>=0; col--) {
			char = buffer[row][col].char;
			//console.log(char + "=" + lP + " ? " + (char==lP));
			if(char == rP) skip++
			else if(char == lP) {
				if(skip--===0) {
					//console.log("Found second LEFT match at row=" + row + " col=" + col + " ");
					return {row: row, col: col};
				}
			}
		}
		// Then search the rest
		for(var row=row-1; row>=0; row--) { // Search up
			for(var col=0; col<buffer[row].length; col++) { // We can start from the left because we already searched the first row
				char = buffer[row][col].char;
				//console.log(char + "=" + lP + " ? " + (char==lP));
				if(char == rP) skip++
				else if(char == lP) {
					if(skip--===0) {
						//console.log("Found second LEFT match at row=" + row + " col=" + col + " ");
							return {row: row, col: col};
					}
				}
			}
			}
			return false; // Did not find it.
			}
		
	}
	
	
	
})();
