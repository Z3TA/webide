
(function() {

	/*
	
		Effects for selected text
	
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.highlightTextBg) {
		debug.warn("No highlightTextBg style defined!");
	}


	EDITOR.renderFunctions.push(highlightRender);
	
	console.log("Loaded highlightRender");
	
	function highlightRender(ctx, buffer, file, startRow) {
		
		//console.time("highlightRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0,
			top = 0,
			indentation = 0;
			
		var file = EDITOR.currentFile;
		
		ctx.fillStyle=EDITOR.settings.style.highlightTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			
			/*
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(EDITOR.settings.leftMargin, top,	EDITOR.settings.gridWidth * buffer[row].length, EDITOR.settings.gridHeight);
			}
			*/
			
			for(var col = 0; col < buffer[row].length; col++) {
				
				
				left = EDITOR.settings.leftMargin + (col + indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
				
				//if(isNaN(left)) throw new Error("left is NaN");
				//if(isNaN(top)) throw new Error("top is NaN");
				
				if(buffer[row][col].highlighted && !buffer[row][col].selected) {
					ctx.rect(left, top,	EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
				}
				
			
			}
			
			
		}
		
		ctx.fill();

		//ctx.stroke();
		//console.timeEnd("highlightRender");


	}


})();