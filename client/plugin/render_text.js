
(function() {

	"use strict";
	
	/*
	
		Renders the grid
		
		note: fillText is about 3 times faster then putImageData or drawImage on Windows!
		
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.fontSize) {
		console.warn("No fontSize defined!");
	}
	if(!EDITOR.settings.style.font) {
		console.warn("No font defined!");
	}

	EDITOR.addRender(textRender, 2100);
	
	console.log("Loaded textRenderer");
	
	function textRender(ctx, buffer, file, startRow, containSpecialWidthCharacters) {
		
		//console.time("textRender");
		
		//console.log("EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);
		
		if(startRow == undefined) startRow = 0;
		
		var left = 0,
			top = 0,
			middle = 0,
			indentation = 0,
			indentationWidth = 0,
			bufferRowCol,
			x = 0,
			y = 0,
			characters = "",
			oldStyle = EDITOR.settings.style.textColor;
		

		ctx.strokeStyle="rgba(0,255,0,0.5)";
		// Setting the font takes 1-2ms! Don't do it at every render!
		//ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		
		ctx.fillStyle = oldStyle;
		
		ctx.beginPath(); // Reset all the paths!
		/*
			Optimization:
			
			* Addin colStart & colStop had no effect!
			* Commenting some if's had no effect!
			* Commenting (not setting) ctx.fillStyle made it faster 30% faster! textRender: 9.792ms
			* ctx.fillStyle behind if, textRender: 8.727ms, even faster!
			* Calling ctx.fillTex in chunks: Alot faster! (5-6 times faster)
			
			*/
		
		var colStart = 0;
		var colStop = 0;
		
		var tabIndention = 0;
		
		var tabColumnCounter = 0;
		var extraSpace = 0;
		
		var tabSpace = 0;
		
		var renderRow = makeLineRender(file, containSpecialWidthCharacters, ctx);
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;

			tabIndention = 0;
			while(tabIndention < buffer[row].length && buffer[row][tabIndention].char == "\t") tabIndention++;
			indentation += tabIndention;
			
			indentationWidth = indentation * EDITOR.settings.tabSpace;
			
			//console.log("textRender:indentation=" + indentation);
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			middle = top + Math.floor(EDITOR.settings.gridHeight/2);
			
			//ctx.fillText(indentation, 15, top);
			
			colStart = Math.max(0, file.startColumn - indentationWidth)
			colStop = Math.min(EDITOR.view.endingColumn-indentationWidth, EDITOR.view.visibleColumns+file.startColumn-indentationWidth);
			
			
			left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
			
			//console.log("textRender:renderRow: row=" + row);
			renderRow(buffer[row], colStart, colStop, left, middle, tabIndention);
			
		}
		
		//console.timeEnd("textRender");
		
	}
	
	function makeLineRender(file, containSpecialWidthCharacters, ctx) {
		
		var oldStyle = EDITOR.settings.style.textColor;
		
		//var transparentChars = Math.floor(Math.min( (EDITOR.settings.leftMargin) / EDITOR.settings.gridWidth - 2, EDITOR.settings.rightMargin / EDITOR.settings.gridWidth));
		var transparentCharsLeft = Math.floor(EDITOR.settings.leftMargin / EDITOR.settings.gridWidth - 2);
		var transparentCharsRight = Math.floor(EDITOR.settings.rightMargin / EDITOR.settings.gridWidth);
		
		
		
		console.log("textRender: transparentCharsLeft=" + transparentCharsLeft + " transparentCharsRight=" + transparentCharsRight);
		
		//transparentCharsLeft = 3;
		
		var transpLvlStepLeft = 100 / transparentCharsLeft;
		var transpLvlStepRight = 100 / transparentCharsRight;
		
		return function drawLineWithSpecialWidthCharacters(gridRow, colStart, colStop, left, middle, tabIndention) {
			/*
				
				Because characters can have different width's we can't just start on a column,
				we have to measure the width of the text before it
				
			*/
			
			var bufferRowCol;
			var characters = "";
			var charWidth = 1;
			
			var start = 0;
			
			if(colStart > 0) {
				start = Math.max(0, colStart-transparentCharsLeft);
				left -= (colStart-start) * EDITOR.settings.gridWidth;
				
				var surrogatesBefore = start > 0 ? file.surrogates(gridRow, start-1) : 0;
				//left -= surrogatesBefore * EDITOR.settings.gridWidth;
			}
			
			var transpLvlStepLeft = 100 / (colStart-start+1);
			
			var transpLvlLeft = transpLvlStepLeft;
			var transpLvlRight = 100-transpLvlStepRight;
			
			var startIndex = gridRow.startIndex;
			
			var extraSpace = 0;
			
			var walker = file.columnWalker(gridRow);
			while(!walker.done) {
				walker.next();
				if( paint(walker) === false ) {
					//console.log("paint: Stopping because paint() returned false");
					break;
				}
				
			}
				
			//console.log("paint: Exit loop walker=" + JSON.stringify(walker));
			
			function paint(walker) {
				var col = walker.col;
				var extraSpace = walker.extraSpace;
				var charWidth = walker.charWidth;
				var character = walker.char;
				
				if(col > (colStop-extraSpace+transparentCharsRight)) {
					console.log("paint: Stopping because col=" + col + " colStop=" + colStop + " extraSpace=" + extraSpace + " transparentCharsRight=" + transparentCharsRight + " ");
return false;
				}
				var bufferRowCol = gridRow[col];
				if(!bufferRowCol) {
					console.log("paint: Stopping because bufferRowCol=" + bufferRowCol + " col=" + col + " gridRow.length=" + gridRow.length);
					return false;
				}
				
				console.log("paint: col=" + col + " character=" +character + " charWidth=" + charWidth + " oldStyle=" + oldStyle + " start=" + start + " colStart=" + colStart + " colStop=" + colStop + " extraSpace=" + extraSpace + " gridRow.length=" + gridRow.length);
				
				// ### Set the fill style
				if( (col+extraSpace) < colStart && (col+extraSpace) >= start) {
					// Chars in left margin
					//console.log("paint: col=" + col + " left margin");
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlLeft);
					transpLvlLeft += transpLvlStepLeft * charWidth;
					//ctx.fillStyle = oldStyle = "orange";
				}
				else if(col+extraSpace > colStop) {
					// Chars in right margin
					//console.log("paint: col=" + col + " right margin");
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlRight);
					transpLvlRight -= transpLvlStepRight * charWidth;
					//ctx.fillStyle = oldStyle = "orange";
				}
				else if(oldStyle != bufferRowCol.color) {
					//console.log("paint: col=" + col + " oldStyle=" + oldStyle + " bufferRowCol.color=" + bufferRowCol.color + "  ");
					ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb
				}
				
				// ### Paint the character
				if(  (col+extraSpace) >= start  ) {
					//console.log("paint: col=" + col + " default");
					ctx.fillText(character, left, middle);
				}
				
				if(bufferRowCol.wave) renderWave(middle-EDITOR.settings.gridHeight/2, left, charWidth);
				else if(bufferRowCol.circle) renderCircle(middle-EDITOR.settings.gridHeight/2, left, charWidth)
				
				if(  (col+extraSpace) >= start  ) {
					left += EDITOR.settings.gridWidth * charWidth;
				}
				
			}
			
			
			return;
			
			// Seems we need to start from the beginning!
			for(var col = 0; col < (colStop-extraSpace+transparentCharsRight) && col < gridRow.length; col++) {
				
				bufferRowCol = gridRow[col];
				
				charWidth = EDITOR.glyphWidth(file, startIndex + col);
				
				//console.log("textRender: col=" + col + " char=" + bufferRowCol.char + " charWidth=" + charWidth + " oldStyle=" + oldStyle + " start=" + start + " colStart=" + colStart + " colStop=" + colStop + " extraSpace=" + extraSpace + " gridRow.length=" + gridRow.length);
				
				// ### Set the fill style
				if( (col+extraSpace) < colStart && (col+extraSpace) >= start) {
					// Chars in left margin
					console.log("textRender: col=" + col + " left margin");
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlLeft);
					transpLvlLeft += transpLvlStepLeft * charWidth;
					//ctx.fillStyle = oldStyle = "orange";
				}
				else if(col+extraSpace > colStop) {
					// Chars in right margin
					console.log("textRender: col=" + col + " right margin");
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlRight);
					transpLvlRight -= transpLvlStepRight * charWidth;
					//ctx.fillStyle = oldStyle = "orange";
				}
				else if(oldStyle != bufferRowCol.color) {
					//console.log("textRender: col=" + col + " oldStyle=" + oldStyle + " bufferRowCol.color=" + bufferRowCol.color + "  ");
ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb
				}
				
				// ### Paint the character and calculate spacing
				if(col >= tabIndention && bufferRowCol.char == "\t") {
					console.log("textRender: col=" + col + " tabIndention=" + tabIndention + " extraSpace=" + extraSpace + " ");
					charWidth += (  (8 - charWidth) - (col-tabIndention+extraSpace) % 8  );
				}
				else if( UTIL.isSurrogateStart(bufferRowCol.char) ) {
					//console.log("textRender: col=" + col + " surrogate start");
					if( gridRow[col+2] && gridRow[col+3] && UTIL.isSurrogateModifierStart(gridRow[col+2].char) ) {
						console.log("textRender: col=" + col + " surrogate modifier");
						if( (col+extraSpace) >= start ) ctx.fillText(bufferRowCol.char + gridRow[col+1].char + gridRow[col+2].char + gridRow[col+3].char, left, middle);
						// a surrage with a modifier is 4 utf16 characters but only take up 1-3 spaces depending on glyph width
						col += 3;
						//charWidth++;
						extraSpace -= 3;
					}
					else if(gridRow[col+1]) {
						console.log("textRender: col=" + col + " no modifier");
						 if( (col+extraSpace) >= start ) ctx.fillText(bufferRowCol.char + gridRow[col+1].char, left, middle);
						col++;
						extraSpace -= 1;
					}
				}
				else if(  (col+extraSpace) >= start  ) {
					//console.log("textRender: col=" + col + " default");
ctx.fillText(bufferRowCol.char, left, middle);
				}
				
				if(bufferRowCol.wave) renderWave(middle-EDITOR.settings.gridHeight/2, left, charWidth);
				else if(bufferRowCol.circle) renderCircle(middle-EDITOR.settings.gridHeight/2, left, charWidth)
				
				if(  (col+extraSpace) >= start  ) {
				left += EDITOR.settings.gridWidth * charWidth;
				}
				
				if(charWidth > 1) extraSpace += charWidth-1;
				
			}
			
		}
		
		function drawLineWithSingleLengthCharacter(gridRow, colStart, colStop, left, middle, tabIndention) {
			
			var bufferRowCol;
			var characters = "";
			
			if(colStart > 0) {
				ctx.fillStyle = oldStyle = "orange";
				left -= colStart * EDITOR.settings.gridWidth;
			}
			
			for(var col = 0; col < (colStop-extraSpace) && col < gridRow.length; col++) {
				
				bufferRowCol = gridRow[col];
				
				if( UTIL.containsEmoji(bufferRowCol.char) ) {
					charWidth = 2;
				}
				else {
					charWidth = 1;
				}
				
				if(col < colStart) {
					// We can't see it, but still need to measure the width
					ctx.fillText(bufferRowCol.char, left, middle);
					left += EDITOR.settings.gridWidth * charWidth;
					continue;
				}
				
				if(oldStyle != bufferRowCol.color) {
					
					ctx.fillText(characters, left, middle);
					
					left += characters.length * EDITOR.settings.gridWidth;
					
					characters = "";
					
					ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb
				}
				
				characters += bufferRowCol.char;
				
				if(bufferRowCol.wave) renderWave(middle, left, characters.length);
				else if(bufferRowCol.circle) renderCircle(middle, left, characters.length)
			}
			
			if(characters != "") {
				ctx.fillText(characters, left, middle);
			}
		}
		
		function renderWave(top, left, charLength) {
			ctx.beginPath();
			ctx.strokeStyle="rgba(255,0,0,0.5)";
			
			// simple line:
			//ctx.moveTo(left, top + EDITOR.settings.gridHeight);
			//ctx.lineTo(left + EDITOR.settings.gridWidth, top + EDITOR.settings.gridHeight);
			
			var x = left + (charLength-1) * EDITOR.settings.gridWidth - 1;
			var y = top + EDITOR.settings.gridHeight - 3 + Math.sin(x);
			
			ctx.moveTo(x, y);
			
			for(var x = x, y = y; x < (left + (charLength-1) * EDITOR.settings.gridWidth + EDITOR.settings.gridWidth); x++, y+=Math.sin(x+1)) {
				ctx.lineTo(x, y);
			}
			
			ctx.stroke();
		}
		
		function renderCircle(top, left, charLength) {
			// ### Circle
			var x = left + (charLength-1) * EDITOR.settings.gridWidth + EDITOR.settings.gridWidth / 2;
			var y = top + EDITOR.settings.gridHeight / 2;
			
			ctx.strokeStyle="rgba(255,0,0,0.6)";
			ctx.lineWidth=4;
			ctx.beginPath();
			ctx.arc(x, y, EDITOR.settings.gridWidth * 2.2, 0, 2*Math.PI);
			ctx.stroke();
		}
		
	}
	
	
})();
