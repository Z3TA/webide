
(function() {

	"use strict";
	
	/*
	
		Renders the grid
	
	*/
	
	// Sanity check
	if(!global.settings.style.fontSize) {
		debug.warn("No fontSize defined!");
	}
	if(!global.settings.style.font) {
		debug.warn("No font defined!");
	}

	global.renders.push(textRender);
	
	console.log("Loaded textRenderer");
	
	function textRender(ctx, buffer, file) {
		
		console.time("textRender");
		
		console.log("global.view.endingColumn=" + global.view.endingColumn);
		
		var left = 0,
			top = 0,
			indentation = 0,
			indentationWidth = 0,
			bufferRowCol,
			x = 0,
			y = 0,
			char = "";
		

		ctx.strokeStyle="rgba(0,255,0,0.5)";
		ctx.font=global.settings.style.fontSize + "px " + global.settings.style.font;
		ctx.textBaseline = "top";
		
		ctx.beginPath(); // Reset all the paths!

		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			indentationWidth = indentation * global.settings.tabSpace;
			
			//console.log("indentation=" + indentation);
			
			top = global.settings.topMargin + row * global.settings.gridHeight;
			
			
			//ctx.fillText(indentation, 15, top);
			
			for(var col = Math.max(0, file.startColumn - indentationWidth); col < Math.min(global.view.endingColumn-indentationWidth, global.view.visibleColumns+file.startColumn-indentationWidth, buffer[row].length); col++) {
				
				
				left = global.settings.leftMargin + (col + indentationWidth - file.startColumn) * global.settings.gridWidth;
				
				if(isNaN(left)) console.error(new Error("left is NaN"));
				if(isNaN(top)) console.error(new Error("top is NaN"));
				
				if(global.settings.drawGridBox) {
					ctx.beginPath();
					ctx.rect(left, top,	global.settings.gridWidth, global.settings.gridHeight);
					ctx.stroke();
				}
				
				bufferRowCol = buffer[row][col];
				
				if(bufferRowCol.hasCharacter) {
					
					char = bufferRowCol.char;
								
					ctx.fillStyle = bufferRowCol.color;// for fillText rgb 
					
					//console.log(bufferRowCol.char + " " + bufferRowCol.color + " top=" + top + " left=" + left + "");
					
					ctx.fillText(char, left, top);
					//ctx.fillText(String.fromCharCode(bufferRowCol.char.charCodeAt(0)), left, top);
					
					//console.log(bufferRowCol.char.charCodeAt(0));
					
					//ctx.fillText(String.fromCharCode(229), left, top);
					
					// You need to save at UTF8 for åäö character to work
					
					if(bufferRowCol.decoration.redWave) {
						ctx.beginPath();
						ctx.strokeStyle="rgba(255,0,0,0.5)";
						
						// simple line:
						//ctx.moveTo(left, top + global.settings.gridHeight);
						//ctx.lineTo(left + global.settings.gridWidth, top + global.settings.gridHeight);
						
						x = left-1;
						y = top + global.settings.gridHeight - 3 + Math.sin(x);
						
						ctx.moveTo(x, y);
						
						for(var x = x, y = y; x < left + global.settings.gridWidth; x++, y+=Math.sin(x+1)) {
							ctx.lineTo(x, y);
						}
						
						ctx.stroke();
						
						
					}
					
				}
				
			}
			
			
		}
		
		
		console.timeEnd("textRender");


	}


})();