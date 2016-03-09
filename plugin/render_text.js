
(function() {

	"use strict";
	
	/*
	
		Renders the grid
	
	*/
	
	// Sanity check
	if(!editor.settings.style.fontSize) {
		debug.warn("No fontSize defined!");
	}
	if(!editor.settings.style.font) {
		debug.warn("No font defined!");
	}

	editor.renderFunctions.push(textRender);
	
	console.log("Loaded textRenderer");
	
	function textRender(ctx, buffer, file, startRow) {
		
		//console.time("textRender");
		
		//console.log("editor.view.endingColumn=" + editor.view.endingColumn);
		
		if(startRow == undefined) startRow = 0;
		
		var left = 0,
			top = 0,
			indentation = 0,
			indentationWidth = 0,
			bufferRowCol,
			x = 0,
			y = 0,
			char = "",
			oldStyle = editor.settings.style.textColor;
		

		ctx.strokeStyle="rgba(0,255,0,0.5)";
		ctx.font=editor.settings.style.fontSize + "px " + editor.settings.style.font;
		ctx.textBaseline = "top";
		ctx.fillStyle = oldStyle;
		
		ctx.beginPath(); // Reset all the paths!
		/*
			Optimization:
			
			Addin colStart & colStop had no effect!
			Commenting some if's had no effect!
			Commenting (not setting) ctx.fillStyle made it faster 30% faster! textRender: 9.792ms
			ctx.fillStyle behind if, textRender: 8.727ms, even faster!
			
			
			*/
		
		var colStart = 0;
		var colStop = 0;
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			indentationWidth = indentation * editor.settings.tabSpace;
			
			//console.log("indentation=" + indentation);
			
			top = editor.settings.topMargin + (row + startRow) * editor.settings.gridHeight;
			
			
			//ctx.fillText(indentation, 15, top);
			
			colStart = Math.max(0, file.startColumn - indentationWidth)
			colStop = Math.min(editor.view.endingColumn-indentationWidth, editor.view.visibleColumns+file.startColumn-indentationWidth, buffer[row].length);
			
			for(var col = colStart; col < colStop; col++) {
				
				
				left = editor.settings.leftMargin + (col + indentationWidth - file.startColumn) * editor.settings.gridWidth;
				
				
				if(isNaN(left)) console.error(new Error("left is NaN"));
				if(isNaN(top)) console.error(new Error("top is NaN"));
				
				if(editor.settings.drawGridBox) {
					ctx.beginPath();
					ctx.rect(left, top,	editor.settings.gridWidth, editor.settings.gridHeight);
					ctx.stroke();
				}
				
				
				bufferRowCol = buffer[row][col];
				
				if(bufferRowCol.hasCharacter) {
					
					char = bufferRowCol.char;
					
					if(oldStyle != bufferRowCol.color) {
						ctx.fillStyle = oldStyle = bufferRowCol.color; // for fillText rgb 
					}
					//console.log(bufferRowCol.char + " " + bufferRowCol.color + " top=" + top + " left=" + left + "");
					
					ctx.fillText(char, left, top);
					//ctx.fillText(String.fromCharCode(bufferRowCol.char.charCodeAt(0)), left, top);
					
					//console.log(bufferRowCol.char.charCodeAt(0));
					
					//ctx.fillText(String.fromCharCode(229), left, top);
					
					// You need to save at UTF8 for åäö character to work
					
					
					if(bufferRowCol.wave) {
						ctx.beginPath();
						ctx.strokeStyle="rgba(255,0,0,0.5)";
						
						// simple line:
						//ctx.moveTo(left, top + editor.settings.gridHeight);
						//ctx.lineTo(left + editor.settings.gridWidth, top + editor.settings.gridHeight);
						
						x = left-1;
						y = top + editor.settings.gridHeight - 3 + Math.sin(x);
						
						ctx.moveTo(x, y);
						
						for(var x = x, y = y; x < left + editor.settings.gridWidth; x++, y+=Math.sin(x+1)) {
							ctx.lineTo(x, y);
						}
						
						ctx.stroke();
											
					}
					else if(bufferRowCol.circle) {
						// ### Circle
						var x = left + editor.settings.gridWidth / 2;
						var y = top + editor.settings.gridHeight / 2;
						
						ctx.strokeStyle="rgba(255,0,0,0.6)";
						ctx.lineWidth=4;
						ctx.beginPath();
						ctx.arc(x, y, editor.settings.gridWidth * 2.2, 0, 2*Math.PI);
						ctx.stroke();
						
					}
					
					
				}
				
			}
			
			
		}
		
		
		//console.timeEnd("textRender");


	}


})();