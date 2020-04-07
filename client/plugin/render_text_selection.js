
(function() {

	/*
	
		Effects for selected text
		
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.selectedTextBg) {
		console.warn("No selectedTextBg defined!");
	}


	EDITOR.addRender(selectionRender, 200);

	console.log("Loaded selectionRender");
	
	function selectionRender(ctx, buffer, file, startRow, containSpecialWidthCharacters) {
		
		if(buffer.length === 0) return;
		if(file.selected.length === 0) return;

		//console.time("selectionRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0;
		var top = 0;
			var indentation = 0;
		var file = EDITOR.currentFile;
		var charWidth = 1;
		
		ctx.fillStyle=EDITOR.settings.style.selectedTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(EDITOR.settings.leftMargin, top,	EDITOR.settings.gridWidth * buffer[row].length, EDITOR.settings.gridHeight);
			}
			
			indentation = buffer[row].indentation;
			
			left = EDITOR.settings.leftMargin + (indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
			
			tabIndention = 0;
			while(tabIndention < buffer[row].length && buffer[row][tabIndention].char == "\t") {
				
				if(buffer[row][tabIndention].selected) {
					ctx.rect(left, top, (EDITOR.settings.tabSpace+1) * EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
				}
				tabIndention++;
				left += (EDITOR.settings.tabSpace+1) * EDITOR.settings.gridWidth;
			}
			
			
			//left = EDITOR.settings.leftMargin + (indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
			
			//if(isNaN(left)) throw new Error("left is NaN! EDITOR.settings.leftMargin=" + EDITOR.settings.leftMargin + " col=" + col + " indentation=" + indentation + " EDITOR.settings.tabSpace=" + EDITOR.settings.tabSpace + " file.startColumn=" + file.startColumn + " EDITOR.settings.gridWidth=" + EDITOR.settings.gridWidth + "");
			//if(isNaN(top)) throw new Error("top is NaN");
			
			// Can probably be optimized by painting a long line rather then induvidual letters
console.log("selectionRender: row=" + row);
			var tabColumnTextLengthAdjustment = 0;
			for(var col = tabIndention; col < buffer[row].length; col++) {
				charWidth = EDITOR.glyphWidth(file, buffer[row][col].index);
				if( buffer[row][col].char == "\t") {
					charWidth = 8 - (col-tabIndention+tabColumnTextLengthAdjustment) % 8;;
				}
				else if( UTIL.isSurrogateStart(buffer[row][col].char) ) {
					console.log("selectionRender: col=" + col + " isSurrogateStart!  ")
					
					if( buffer[row][col+2] && UTIL.isSurrogateModifierStart(buffer[row][col+2].char) ) {
						console.log("selectionRender: col=" + col + " isSurrogateModifierStart!  ")
						col+= 3;
						tabColumnTextLengthAdjustment -= 3;
					}
					else if( buffer[row][col+1] ) {
						console.log("selectionRender: skip surrogate ending");
						col++;
						tabColumnTextLengthAdjustment -= 1;
					}
				}
				
				if(charWidth > 1) {
tabColumnTextLengthAdjustment += charWidth-1;
				}
				
				if(buffer[row][col] && buffer[row][col].selected) {
						ctx.rect(left, top,EDITOR.settings.gridWidth*charWidth, EDITOR.settings.gridHeight);
				}
				
				left += EDITOR.settings.gridWidth * charWidth;
				
				
			}
			
		}
		
		ctx.fill();
		
		//ctx.stroke();
		//console.timeEnd("selectionRender");
		
	}
	
	
})();