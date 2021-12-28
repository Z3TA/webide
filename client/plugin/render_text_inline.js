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

	//console.log("Loaded textRenderer");
	
	
	/*
		Optimizations:
		
		* Adding colStart & colStop had no effect!
		* Commenting some if's had no effect!
		* Commenting (not setting) ctx.fillStyle made it faster 30% faster! textRender: 9.792ms
		* ctx.fillStyle behind if, textRender: 8.727ms, even faster!
		* Calling ctx.fillTex in chunks: Alot faster! (5-6 times faster)
		* Inlining function calls after implementing better unicode and tab support ca 30% faster on Chrome, no effect on Firefox
		(inlining functinos often makes things faster in Chrome, but it might also worsen the performance as the function might become too big for V8 to cache/optimize)
		
		Setting the font takes 1-2ms! Don't do it at every render!
	*/
	function textRender(ctx, buffer, file, startRow, containSpecialWidthCharacters) {

		//console.log("textRender!");

		//console.time("textRender");

		//console.log("EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);

		//console.log("textRender: ctx.font=" + ctx.font);

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
		oldStyle;

		//ctx.strokeStyle="rgba(0,255,0,0.5)"; // For rendering circles and waves

		//ctx.fillStyle = oldStyle;

		//ctx.beginPath(); // For rendering circles and waves - Reset all the paths!
		

		var colStart = 0;
		var colStop = 0;

		var tabIndention = 0;

		var tabColumnCounter = 0;
		var extraSpace = 0;

		var tabSpace = 0;

		var transparentCharsLeft = Math.floor(EDITOR.settings.leftMargin / EDITOR.settings.gridWidth - 2);
		var transparentCharsRight = Math.floor(EDITOR.settings.rightMargin / EDITOR.settings.gridWidth);
		
		//console.log("textRender: transparentCharsLeft=" + transparentCharsLeft + " transparentCharsRight=" + transparentCharsRight);
		
		var transpLvlStepLeft = 100 / transparentCharsLeft;
		var transpLvlStepRight = 100 / transparentCharsRight;
		
		var gridRow
		
		var start = 0;
		
		var walker;
		
		var transpLvlLeft = transpLvlStepLeft;
		var transpLvlRight = 100-transpLvlStepRight;
		
		var charBuffer = "";
		var charBufferPosLeft = left;
		
		var bufferRowCol;
		
		for(var row = 0; row < buffer.length; row++) {

			indentation = buffer[row].indentation;

			indentationWidth = indentation * EDITOR.settings.tabSpace;

			//console.log("textRender:indentation=" + indentation);

			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			middle = top + Math.floor(EDITOR.settings.gridHeight/2);

			//ctx.fillText(indentation, 15, top);

			colStart = Math.max(0, file.startColumn - indentationWidth)
			colStop = Math.min(EDITOR.view.endingColumn-indentationWidth, EDITOR.view.visibleColumns+file.startColumn-indentationWidth);


			left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;

			//console.log("textRender:renderRow: row=" + row);
			//renderRow(ctx, buffer[row], colStart, colStop, left, middle);

			
			gridRow = buffer[row];
			
			
			start = 0;
			walker = EDITOR.gridWalker(gridRow);
			if(colStart > 0) {
				/*
					colStart is how much is scrolled to the right
					but we want to start earlier in order to show the transparent characters in left margin
				*/
				start = Math.max(0, colStart-transparentCharsLeft);
				left -= (colStart - start) * EDITOR.settings.gridWidth;
				
				while(walker.col + walker.extraSpace < start-walker.charWidth && !walker.done) walker.next();
				left += (walker.col + walker.extraSpace - start + walker.charWidth) * EDITOR.settings.gridWidth;
				
			}
			
			transpLvlStepLeft = 100 / (colStart-start+1);
			transpLvlLeft = transpLvlStepLeft;
			transpLvlRight = 100-transpLvlStepRight;
			
			charBuffer = "";
			charBufferPosLeft = left;
			
			while(!walker.done) {
				walker.next();
				
				// Paint function inlined for optimization (had very little effect)
				// Optimization: Avoid calling ctx methods at all cost!
				
				if(walker.col > (colStop - walker.extraSpace + transparentCharsRight)) {
					//console.log("paint: Stopping because col=" + walker.col + " colStop=" + colStop + " extraSpace=" + walker.extraSpace + " transparentCharsRight=" + transparentCharsRight + " ");
					break;
				}
				bufferRowCol = gridRow[walker.col];
				if(!bufferRowCol) {
					//console.log("paint: Stopping because bufferRowCol=" + bufferRowCol + " col=" + col + " gridRow.length=" + gridRow.length);
					break;
				}
				
				//console.log("paint: col=" + walker.col + " extraSpace=" + walker.extraSpace + " walker.char=" + walker.char + " charWidth=" + walker.charWidth + " oldStyle=" + oldStyle + " start=" + start + " colStart=" + colStart + " colStop=" + colStop + " extraSpace=" + extraSpace + " gridRow.length=" + gridRow.length);
				
				if( (walker.col + walker.extraSpace) < colStart && (walker.col + walker.extraSpace) >= start) {
					// Chars in left margin
					//console.log("paint: col=" + walker.col + " left margin");

					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlLeft);
					
					transpLvlLeft += transpLvlStepLeft * walker.charWidth;
					//ctx.fillStyle = oldStyle = "orange";
					ctx.fillText(walker.char, left, middle);
					
					charBufferPosLeft = left + EDITOR.settings.gridWidth * walker.charWidth;
				}
				else if(walker.col + walker.extraSpace > colStop) {
					// Chars in right margin
					
					if(charBuffer.length > 0) {
						//console.log("paint: col=" + walker.col + " charBuffer=" + charBuffer + " right margin");
						ctx.fillText(charBuffer, charBufferPosLeft, middle);
						charBuffer = "";
					}
					
					//console.log("paint: col=" + walker.col + " walker.char=" + walker.char + " right margin");
					
					ctx.fillStyle = oldStyle = UTIL.makeColorTransparent(bufferRowCol.color, transpLvlRight);
					transpLvlRight -= transpLvlStepRight * walker.charWidth;
					//ctx.fillStyle = oldStyle = "orange";
					ctx.fillText(walker.char, left, middle);
				}
				else if( (walker.col + walker.extraSpace) >= start && oldStyle != bufferRowCol.color) {
					//console.log("paint: col=" + walker.col + " oldStyle=" + oldStyle + " bufferRowCol.color=" + bufferRowCol.color + "  ");
					
					if(charBuffer.length > 0) {
						//console.log("paint: col=" + walker.col + " charBuffer=" + charBuffer + " ctx.fillStyle=" + ctx.fillStyle + " ???");
						ctx.fillText(charBuffer, charBufferPosLeft, middle);
						charBuffer = "";
					}
					
					ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb
					if(walker.charWidth != 1) {
						//console.log("paint: col=" + walker.col + " walker.char=" + walker.char + " ctx.fillStyle=" + ctx.fillStyle + " because walker.charWidth=" + walker.charWidth);
						ctx.fillText(walker.char, left, middle);
						charBufferPosLeft = left + EDITOR.settings.gridWidth * walker.charWidth;
					}
					else {
						charBuffer = walker.char;
						charBufferPosLeft = left;
					}
					
				}
				else if(  (walker.col + walker.extraSpace) >= start  ) {
					if(walker.charWidth != 1) {
						if(charBuffer.length > 0) {

							//console.log("paint: charBuffer=" + charBuffer + " ctx.fillStyle=" + ctx.fillStyle + "");
							ctx.fillText(charBuffer, charBufferPosLeft, middle);
							charBuffer = "";
						}
						//console.log("paint: Painting walker.char=" + walker.char + " for col=" + walker.col + " ctx.fillStyle=" + ctx.fillStyle + "");
						ctx.fillText(walker.char, left, middle);
						
						charBufferPosLeft = left + EDITOR.settings.gridWidth * walker.charWidth;
					}
					else {
						//console.log("paint: Adding walker.char=" + walker.char + " to charBuffer=" + charBuffer);
						charBuffer += walker.char;
					}
				}
				else {
					//console.log("paint: Not painting walker.char=" + walker.char + " because col=" + walker.col + " plus extraSpace=" + walker.extraSpace + " is less then start=" + start + "  ");
				}
				
				if(bufferRowCol.wave) renderWave(ctx, middle-EDITOR.settings.gridHeight/2, left, walker.charWidth);
				else if(bufferRowCol.circle) renderCircle(ctx, middle-EDITOR.settings.gridHeight/2, left, walker.charWidth)
				
				if(  (walker.col + walker.extraSpace) >= start  ) {
					left += EDITOR.settings.gridWidth * walker.charWidth;
				}
				
			}
			
			//console.log("paint: Exit loop walker=" + JSON.stringify(walker));
			
			if(charBuffer.length > 0) {
				//console.log("paint: charBuffer=" + charBuffer + "  ctx.fillStyle=" + ctx.fillStyle + "");
				ctx.fillText(charBuffer, charBufferPosLeft, middle);
			}
			
		}

		//console.timeEnd("textRender");

	}

	function renderWave(ctx, top, left, charLength) {
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

	function renderCircle(ctx, top, left, charLength) {
		// ### Circle
		var x = left + (charLength-1) * EDITOR.settings.gridWidth + EDITOR.settings.gridWidth / 2;
		var y = top + EDITOR.settings.gridHeight / 2;

		ctx.strokeStyle="rgba(255,0,0,0.6)";
		ctx.lineWidth=4;
		ctx.beginPath();
		ctx.arc(x, y, EDITOR.settings.gridWidth * 2.2, 0, 2*Math.PI);
		ctx.stroke();
	}




})();

/*
function drawLineWithSingleLengthCharacter(gridRow, colStart, colStop, left, middle, tabIndention) {

var bufferRowCol;
var characters = "";

if(colStart > 0) {
ctx.fillStyle = oldStyle = "orange";
left -= colStart * EDITOR.settings.gridWidth;
}

for(var col = colStart; col < colStop && col < gridRow.length; col++) {

bufferRowCol = gridRow[col];

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
*/