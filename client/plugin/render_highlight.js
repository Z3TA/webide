
(function() {

	/*
	
		Effects for selected text
	
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.highlightTextBg) {
		console.warn("No highlightTextBg style defined!");
	}


	EDITOR.addRender(highlightRender, 101);
	
	console.log("Loaded highlightRender");
	
	function highlightRender(ctx, buffer, file, startRow, containSpecialWidthCharacters) {
		
		//console.time("highlightRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0;
		var top = 0;
		var indentation = 0;
		var file = EDITOR.currentFile;
		var charWidth = 1;
		
		ctx.fillStyle=EDITOR.settings.style.highlightTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			
			/*
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(EDITOR.settings.leftMargin, top,	EDITOR.settings.gridWidth * buffer[row].length, EDITOR.settings.gridHeight);
			}
			*/
			
			indentation = buffer[row].indentation;
			
			tabIndention = 0;
			while(tabIndention < buffer[row].length && buffer[row][tabIndention].char == "\t") tabIndention++;
			indentation += tabIndention;
			
			left = EDITOR.settings.leftMargin + (indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
			
			for(var col = 0; col < buffer[row].length; col++) {
				
				if(containSpecialWidthCharacters && UTIL.containsEmoji(buffer[row][col].char) ) {
					charWidth = 2;
				}
				else {
					charWidth = 1;
				}
				
				//if(isNaN(left)) throw new Error("left is NaN");
				//if(isNaN(top)) throw new Error("top is NaN");
				
				if(buffer[row][col].highlighted && !buffer[row][col].selected) {
					ctx.rect(left, top,EDITOR.settings.gridWidth*charWidth, EDITOR.settings.gridHeight);
				}
				
				left += EDITOR.settings.gridWidth*charWidth;
				
			}
			
			
		}
		
		ctx.fill();

		//ctx.stroke();
		//console.timeEnd("highlightRender");


	}


})();