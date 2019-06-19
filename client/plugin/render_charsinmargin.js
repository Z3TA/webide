
(function() {
	
	"use strict";
	
	/*
		Make the letters in the left and right margin semi transparent to show that the text continues.

		You need to save in UTF8 for åäö character to work!

	*/
	
	// Sanity check
	if(!EDITOR.settings.style.fontSize) {
		throw "No fontSize defined!";
	}
	if(!EDITOR.settings.style.font) {
		throw "No font defined!";
	}
	if(EDITOR.settings.gridWidth <= 0) {
		throw "gridWidth too small!";
	}
	if(EDITOR.settings.gridHeight <= 0) {
		throw "gridHeight too small!";
	}
	
	
	EDITOR.addRender(transparentMarginCharacters, 2300);
	
	console.log("Loaded textRenderer");
	
	
	var transparentChars = Math.floor(Math.min(EDITOR.settings.leftMargin / EDITOR.settings.gridWidth, EDITOR.settings.rightMargin / EDITOR.settings.gridWidth));
		
	if(transparentChars <= 0) {
		console.warn("No transarent chars will be rendered in the margin");
	}
	
	//transparentChars = 3;
	
	var transpLvlStep = Math.round(8 / transparentChars * 10);
	
	function transparentMarginCharacters(ctx, buffer, file, startRow) {
		
		if(startRow == undefined) startRow = 0;
		
		//console.time("transparentMarginCharacters");
		
		var left = 0,
		middle = 0,
			indentation = 0,
			char = "",
			indentationWidth = 0,
			over = 0,
			transpLvl = 0;
			

		//ctx.strokeStyle="rgba(0,255,0,0.5)";
		//ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		
		
		ctx.beginPath(); // Reset all the paths!
		
		for(var row = 0; row < buffer.length; row++) {

			middle = EDITOR.settings.topMargin + (row+startRow) * EDITOR.settings.gridHeight + Math.floor(EDITOR.settings.gridHeight/2);

			indentation = buffer[row].indentation;
			indentationWidth = indentation * EDITOR.settings.tabSpace;
		
			if(file.startColumn > 0) {
				
				// Render text in the left margin
				transpLvl = transpLvlStep;
				
				for(var col = Math.max(0, file.startColumn - transparentChars - indentationWidth); col < Math.min(file.startColumn-indentationWidth, buffer[row].length-1); col++) {
					left = EDITOR.settings.leftMargin + (col + indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
					
					transpLvl += transpLvlStep;
					
					print(buffer[row][col]);
				}
			}
			
			transpLvl = 100-transpLvlStep;
			
			over = (EDITOR.view.visibleColumns+file.startColumn-indentationWidth);
			
			if(buffer[row].length > over) {
				// Render text in the right margin
				for(var col = Math.max(0, EDITOR.view.visibleColumns+file.startColumn-indentationWidth); col <= Math.min(buffer[row].length-1, over+transparentChars); col++) {
					left = EDITOR.settings.leftMargin + (col + indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
					
					transpLvl -= transpLvlStep;
					
					//console.log("print row=" + row + " col=" + col);
					print(buffer[row][col]);
				}
			}
			

		}
		
		
		//console.timeEnd("transparentMarginCharacters");

		function print(box) {
			if(box.hasCharacter) {
				
				char = box.char;
				
				//console.log("rendering: " + char);
				
				ctx.fillStyle = UTIL.makeColorTransparent(box.color, transpLvl); // for fillText rgb 
				
				//console.log("ctx.fillStyle=" + ctx.fillStyle + " hmm=" + UTIL.makeColorTransparent(box.color));
				
				ctx.fillText(char, left, middle);
			}
		}
		
		
	}
	

	

})();