
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
		
		var renderRow = makeLineRender(containSpecialWidthCharacters, ctx);
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;

			tabIndention = 0;
			while(tabIndention < buffer[row].length && buffer[row][tabIndention].char == "\t") tabIndention++;
			indentation += tabIndention;
			
			indentationWidth = indentation * EDITOR.settings.tabSpace;
			
			//console.log("indentation=" + indentation);
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			middle = top + Math.floor(EDITOR.settings.gridHeight/2);
			
			//ctx.fillText(indentation, 15, top);
			
			colStart = Math.max(0, file.startColumn - indentationWidth)
			colStop = Math.min(EDITOR.view.endingColumn-indentationWidth, EDITOR.view.visibleColumns+file.startColumn-indentationWidth);
			
			
			left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
			
			renderRow(buffer[row], colStart, colStop, left, middle, tabIndention);
			
		}
		
		//console.timeEnd("textRender");
		
	}
	
	function makeLineRender(containSpecialWidthCharacters, ctx) {
		
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
			var extraSpace = 0; // Mainly for calculating tab column space!?
			var bufferRowCol;
			var characters = "";
			var charWidth = 1;
			
			var start = 0;
			
			if(colStart > 0) {
				start = Math.max(0, colStart-transparentCharsLeft);
				left -= (colStart-start) * EDITOR.settings.gridWidth;
			}
			
			var transpLvlStepLeft = 100 / (colStart-start+1);
			
			var transpLvlLeft = transpLvlStepLeft;
			var transpLvlRight = 100-transpLvlStepRight;
			
			for(var col = start; col < (colStop-extraSpace+transparentCharsRight) && col < gridRow.length; col++) {
				
				bufferRowCol = gridRow[col];
				
				if( UTIL.containsEmoji(bufferRowCol.char) ) {
					charWidth = 2;
				}
				else {
					charWidth = 1;
				}
				
				console.log("textRender: col=" + col + " char=" + bufferRowCol.char + " oldStyle=" + oldStyle + " start=" + start + " colStart=" + colStart + " colStop=" + colStop + " extraSpace=" + extraSpace + " ");
				
				if( (col+extraSpace) < colStart) {
					// Chars in left margin
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlLeft);
					transpLvlLeft += transpLvlStepLeft * charWidth;
					//ctx.fillStyle = oldStyle = "orange";
				}
				else if(col+extraSpace > colStop) {
					// Chars in right margin
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlRight);
					transpLvlRight -= transpLvlStepRight * charWidth;
					//ctx.fillStyle = oldStyle = "orange";
				}
				else if(oldStyle != bufferRowCol.color) ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb
				
				if(col >= tabIndention && bufferRowCol.char == "\t") {
					charWidth += 7 - (col-tabIndention+extraSpace) % 8;
				}
				if( UTIL.isSurrogateStart(bufferRowCol.char) ) {
					if( gridRow[col+2] && gridRow[col+3] && UTIL.isSurrogateModifierStart(gridRow[col+2].char) ) {
						ctx.fillText(bufferRowCol.char + gridRow[col+1].char + gridRow[col+2].char + gridRow[col+3].char, left, middle);
						col += 3;
						charWidth++;
						extraSpace -= 3; // To make the tab column width calculation correct
					}
					else if(gridRow[col+1]) {
						ctx.fillText(bufferRowCol.char + gridRow[col+1].char, left, middle);
						col++;
						charWidth++;
					}
				}
				else ctx.fillText(bufferRowCol.char, left, middle);
				
				if(bufferRowCol.wave) renderWave(middle-EDITOR.settings.gridHeight/2, left, charWidth);
				else if(bufferRowCol.circle) renderCircle(middle-EDITOR.settings.gridHeight/2, left, charWidth)
				
				left += EDITOR.settings.gridWidth * charWidth;
				
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
