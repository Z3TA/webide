
(function() {

	/*
	
		Effects for selected text
		
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.selectedTextBg) {
		debug.warn("No selectedTextBg defined!");
	}


	EDITOR.addRender(selectionRender, 200);

	console.log("Loaded selectionRender");
	
	function selectionRender(ctx, buffer, file, startRow) {
		
		if(buffer.length === 0) return;
		
		//console.time("selectionRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0,
			top = 0,
			indentation = 0;
			
		var file = EDITOR.currentFile;
		
		ctx.fillStyle=EDITOR.settings.style.selectedTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(EDITOR.settings.leftMargin, top,	EDITOR.settings.gridWidth * buffer[row].length, EDITOR.settings.gridHeight);
			}
			
				for(var col = 0; col < buffer[row].length; col++) {
					
					left = EDITOR.settings.leftMargin + (col + indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
					
					//if(isNaN(left)) throw new Error("left is NaN! EDITOR.settings.leftMargin=" + EDITOR.settings.leftMargin + " col=" + col + " indentation=" + indentation + " EDITOR.settings.tabSpace=" + EDITOR.settings.tabSpace + " file.startColumn=" + file.startColumn + " EDITOR.settings.gridWidth=" + EDITOR.settings.gridWidth + "");
					//if(isNaN(top)) throw new Error("top is NaN");
					
					if(buffer[row][col].selected) {
						ctx.rect(left, top,	EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
					}
					
			}
			
		}
		
		ctx.fill();
		
		//ctx.stroke();
		//console.timeEnd("selectionRender");
		
	}
	
	
})();