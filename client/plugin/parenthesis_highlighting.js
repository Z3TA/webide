/*
	This file is depricated in favour for xmathcing.js
	
	*/

(function() {
	
	EDITOR.renderFunctions.push(parenthesis_highlight);
	
	function parenthesis_highlight(ctx, buffer, file) {
		
		console.log("Rendering parenthesis_highlight...");
		
		if(file) {
			
			
			// Sanity check
			file.checkGrid();
			
			// Is the caret visible on the screen?
			var caret = file.caret;

			
			// Only highlight if the caret is close to a parenthesis 
			var index = caret.index,
				text = file.text,
				char = text.charAt(index),
				lP = "(",
				rP = ")",
				match,
				firstP,
				secondP,
				skip = 0, // How many matches to skip before matching
				lastChar = text.charAt(index - 1); // bug at first char?
			
			if(lastChar == lP && char == rP) {
				// We are between two parenthesis
				
				console.log("We are between two parenthesis");
				return;
				
			}
			else if(char == lP || char == rP) {
				firstP = index;
			}
			else if(lastChar == lP || lastChar == rP) {
				firstP = index - 1;
			}
			
			if(firstP == undefined) {
				console.log("Caret is not next to a parenthesis! char=" + char + " lastChar=" + lastChar + "");
				return;
			}
			
			
			
			if(char == lP || lastChar == lP) {
				// Search to the right
				console.log("Searching right:");
				for(var i=firstP+1, char; i<text.length; i++) {
					char = text.charAt(i);
					//console.log("i=" + i + " char= " + char + " skip=" + skip);
					if(char == lP) skip++
					else if(char == rP) {
						if(skip--===0) {
							secondP = i;
							console.log("Found second RIGHT parenthesis at index=" + i + "");
							break;
						}
					}
				}
			}
			else {// if(char == rP || lastChar == rP) {
				// Search to the left
				
				console.log("Searching left:");
				for(var i=firstP-1, char; i>=0; i--) {
					char = text.charAt(i);
					//console.log("i=" + i + " char= " + char + " skip=" + skip);
					if(char == rP) skip++
					else if(char == lP) {
						if(skip--===0) {
							secondP = i;
							console.log("Found second LEFT parenthesis at index=" + i + "");
							break;
						}
					}
				}
			}
			
			if(secondP == undefined) {
				console.log("Matching parenthesis not found!")
				return;
			}
			
			
			
			/* 
				Figure out where the parenthesis's are located on the screen ...
				We know where the caret is! So we know firstP's location already
			*/
			console.log("caret.row=" + caret.row);
			var row = caret.row - file.startRow; // the buffer row! (not file.grid row)
			var col = caret.col - file.startColumn;
			
			if(row < 0) row = 0;
			
			if(firstP < caret.index) col--;
			
			var firstLocation = {
				x: EDITOR.settings.leftMargin + (col + buffer[row].indentation * EDITOR.settings.tabSpace) * EDITOR.settings.gridWidth,
				y: EDITOR.settings.topMargin + row * EDITOR.settings.gridHeight
			}
			
			console.log("firstP=" + firstP + " on row=" + row);

			// Use the buffer to search the grid to find the location of the second parenthesis ...
			var firstBufferIndex = buffer[0].startIndex;
			var lastBufferIndex = getLastBufferIndex(buffer);
			
			if(secondP < firstBufferIndex) {
				console.log("Parenthesis is located above the buffer")
				return;
			}
			if(secondP > lastBufferIndex) {
				console.log("Parenthesis is located below the buffer");
				return;
			}
			
			row = buffer.length-1;
			
			// Start from the bottom and go up until we find the row that has the second parenthesis
			console.log("Before: buffer[" + row + "].startIndex=" + buffer[row].startIndex + " > secondP=" + secondP + "");

			while(buffer[row].startIndex > secondP) {
				console.log("buffer[" + row + "].startIndex=" + buffer[row].startIndex + " > secondP=" + secondP + "");
				row--;
			}
			
			console.log("Second parenthesis can be found on row=" + row);
			
			// Traverse the column's to find what column the second parenthesis is on
			for(col=0; col<buffer[row].length; col++) {
				if(buffer[row][col].index == secondP) {
					// We've found it!
					console.log("Found col=" + col);
					break;
				}
			}
			
			console.log("col is now " + col);
			
			col -= file.startColumn; // So that we get it right when scrolled horizontally
			
			var secondLocation = {
				x: EDITOR.settings.leftMargin + (col + buffer[row].indentation * EDITOR.settings.tabSpace) * EDITOR.settings.gridWidth,
				y: EDITOR.settings.topMargin + row * EDITOR.settings.gridHeight
			}
			
			console.log("firstLocation=" + JSON.stringify(firstLocation) + " secondLocation=" + JSON.stringify(secondLocation));
			
			
			// Now when we got both positions, lets show something!
			
			ctx.fillStyle=EDITOR.settings.style.highlightParenthesisFontColor;
			
			//ctx.rect(firstLocation.x, firstLocation.y, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight); // x,y,width,height
			//ctx.rect(secondLocation.x, secondLocation.y, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight); // x,y,width,height
			
			ctx.font=EDITOR.settings.style.highlightParenthesisFont;
			
			//console.log("ctx.font=" + ctx.font);
			//console.log("EDITOR.settings.style.highlightParenthesisFont=" + EDITOR.settings.style.highlightParenthesisFont);
			
			if(firstP > secondP) { // right parenthesis first
				ctx.fillText(rP, firstLocation.x, firstLocation.y);
				ctx.fillText(lP, secondLocation.x, secondLocation.y);
			}
			else { // left parenthesis first
				ctx.fillText(lP, firstLocation.x, firstLocation.y);
				ctx.fillText(rP, secondLocation.x, secondLocation.y);
			}
			
			// Reset the font
			ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			
			
			//ctx.fill(); // Needed for rect to fill!
			
			
			
			function getLastBufferIndex(buffer) {
				var lastRow = buffer[buffer.length-1];
				
				if(lastRow.length > 0) {
					return lastRow[lastRow.length-1].index;
				}
				else {
					return lastRow.startIndex;
				}
			}
		}
		
	}
	
	
})();