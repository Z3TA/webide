
(function() {
	
	"use strict";
	
	/*
		Make the letters in the left and right margin semi transparent to show that the text continues.

		You need to save in UTF8 for åäö character to work!

	*/
	
	// Sanity check
	if(!global.settings.style.fontSize) {
		console.error("No fontSize defined!");
	}
	if(!global.settings.style.font) {
		console.error("No font defined!");
	}
	if(global.settings.gridWidth <= 0) {
		console.error("gridWidth too small!");
	}
	if(global.settings.gridHeight <= 0) {
		console.error("gridHeight too small!");
	}
	
	
	global.renders.push(transparentMarginCharacters);
	
	console.log("Loaded textRenderer");
	
	
	var transparentChars = Math.floor(Math.min(global.settings.leftMargin / global.settings.gridWidth, global.settings.rightMargin / global.settings.gridWidth));
		
	if(transparentChars <= 0) {
		console.warn("No transarent chars will be rendered in the margin");
	}
	
	//transparentChars = 3;
	
	var transpLvlStep = Math.round(8 / transparentChars * 10);
	
	function transparentMarginCharacters(ctx, buffer, file, startRow) {
		
		if(startRow == undefined) startRow = 0;
		
		console.time("transparentMarginCharacters");
		
		var left = 0,
			top = 0,
			indentation = 0,
			char = "",
			indentationWidth = 0,
			over = 0,
			transpLvl = 0;
			

		//ctx.strokeStyle="rgba(0,255,0,0.5)";
		ctx.font=global.settings.style.fontSize + "px " + global.settings.style.font;
		ctx.textBaseline = "top";
		
		ctx.beginPath(); // Reset all the paths!
		
		for(var row = 0; row < buffer.length; row++) {

			top = global.settings.topMargin + (row+startRow) * global.settings.gridHeight;

			indentation = buffer[row].indentation;
			indentationWidth = indentation * global.settings.tabSpace;
		
			if(file.startColumn > 0) {
				
				// Render text in the left margin
				transpLvl = transpLvlStep;
				
				for(var col = Math.max(0, file.startColumn - transparentChars - indentationWidth); col < Math.min(file.startColumn-indentationWidth, buffer[row].length-1); col++) {
					left = global.settings.leftMargin + (col + indentationWidth - file.startColumn) * global.settings.gridWidth;
					
					transpLvl += transpLvlStep;
					
					print(buffer[row][col]);
				}
			}
			
			transpLvl = 100-transpLvlStep;
			
			over = (global.view.visibleColumns+file.startColumn-indentationWidth);
			
			if(buffer[row].length > over) {
				// Render text in the right margin
				for(var col = Math.max(0, global.view.visibleColumns+file.startColumn-indentationWidth); col <= Math.min(buffer[row].length-1, over+transparentChars); col++) {
					left = global.settings.leftMargin + (col + indentationWidth - file.startColumn) * global.settings.gridWidth;
					
					transpLvl -= transpLvlStep;
					
					//console.log("print row=" + row + " col=" + col);
					print(buffer[row][col]);
				}
			}
			

		}
		
		
		console.timeEnd("transparentMarginCharacters");

		function print(box) {
			if(box.hasCharacter) {
				
				char = box.char;
				
				//console.log("rendering: " + char);
				
				ctx.fillStyle = makeTransparent(box.color); // for fillText rgb 
				
				//console.log("ctx.fillStyle=" + ctx.fillStyle + " hmm=" + makeTransparent(box.color));
				
				ctx.fillText(char, left, top);
			}
		}
		
		function makeTransparent(colorString) {
			// Take a rgb color and make it transparent rgba
			var useTranspLvl;
			
			if(transpLvl < 10) {
				useTranspLvl = "0" + transpLvl;
			}
			else {
				useTranspLvl = transpLvl;
			}
			
			if(colorString.substr(0, 4) == "rgb(") {
				return "rgba(" + colorString.substring(4, colorString.indexOf(")")) + ", 0." + useTranspLvl + ")";
			}
			else {
				console.warn("Unknown color: " + colorString);
				return "rgba(255,0,0, 0.5)";
			}
		}
		
	}
	

	

})();