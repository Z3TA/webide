
(function() {

	"use strict";
	
	/*
	
		Renders the grid
		
		note: fillText is about 3 times faster then putImageData or drawImage on Windows!
		
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.fontSize) {
		debug.warn("No fontSize defined!");
	}
	if(!EDITOR.settings.style.font) {
		debug.warn("No font defined!");
	}

	EDITOR.renderFunctions.push(textRender);
	
	console.log("Loaded textRenderer");
	
	function textRender(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		
		//console.time("textRender");
		
		//console.log("EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);
		
		if(startRow == undefined) startRow = 0;
		
		var left = 0,
			top = 0,
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
		ctx.textBaseline = "top";
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
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			indentationWidth = indentation * EDITOR.settings.tabSpace;
			
			//console.log("indentation=" + indentation);
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			
			
			//ctx.fillText(indentation, 15, top);
			
			colStart = Math.max(0, file.startColumn - indentationWidth)
			colStop = Math.min(EDITOR.view.endingColumn-indentationWidth, EDITOR.view.visibleColumns+file.startColumn-indentationWidth, buffer[row].length);
			
			
			left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
			
			if(isNaN(left)) throw new Error("left is NaN");
			if(isNaN(top)) throw new Error("top is NaN");

			for(var col = colStart; col < colStop; col++) {
				
				//left = EDITOR.settings.leftMargin + (col + indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
				
				bufferRowCol = buffer[row][col];
				
				if(bufferRowCol.hasCharacter) {
					
					if(oldStyle != bufferRowCol.color || containZeroWidthCharacters) {
						
						ctx.fillText(characters, left, top);
						
						left += characters.length * EDITOR.settings.gridWidth;
						
						characters = "";
						ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb 
					}
					//console.log(bufferRowCol.char + " " + bufferRowCol.color + " top=" + top + " left=" + left + "");
					
					characters += bufferRowCol.char;
					
					
					//ctx.fillText(String.fromCharCode(bufferRowCol.char.charCodeAt(0)), left, top);
					
					//console.log(bufferRowCol.char.charCodeAt(0));
					
					//ctx.fillText(String.fromCharCode(229), left, top);
					
					// You need to save as UTF8 for åäö character to work
					
					
					if(bufferRowCol.wave) {
						ctx.beginPath();
						ctx.strokeStyle="rgba(255,0,0,0.5)";
						
						// simple line:
						//ctx.moveTo(left, top + EDITOR.settings.gridHeight);
						//ctx.lineTo(left + EDITOR.settings.gridWidth, top + EDITOR.settings.gridHeight);
						
						x = left + (characters.length-1) * EDITOR.settings.gridWidth - 1;
						y = top + EDITOR.settings.gridHeight - 3 + Math.sin(x);
						
						ctx.moveTo(x, y);
						
						for(var x = x, y = y; x < (left + (characters.length-1) * EDITOR.settings.gridWidth + EDITOR.settings.gridWidth); x++, y+=Math.sin(x+1)) {
							ctx.lineTo(x, y);
						}
						
						ctx.stroke();
						
					}
					else if(bufferRowCol.circle) {
						// ### Circle
						var x = left + (characters.length-1) * EDITOR.settings.gridWidth + EDITOR.settings.gridWidth / 2;
						var y = top + EDITOR.settings.gridHeight / 2;
						
						ctx.strokeStyle="rgba(255,0,0,0.6)";
						ctx.lineWidth=4;
						ctx.beginPath();
						ctx.arc(x, y, EDITOR.settings.gridWidth * 2.2, 0, 2*Math.PI);
						ctx.stroke();
						
					}

				}
				else {
					// Should never happen / depricated
					throw new Error("Box doesn't have a character!");
					
				}
				
			}
			
			if(characters != "") {
				
				ctx.fillText(characters, left, top);
				
				characters = "";
			}
			
		}
		
		
		//console.timeEnd("textRender");


	}


})();