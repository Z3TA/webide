
(function() {

	/*
	
		Effects for selected text
	
	*/
	
	// Sanity check
	if(!editor.settings.style.highlightTextBg) {
		debug.warn("No highlightTextBg style defined!");
	}


	editor.renderFunctions.push(highlightRender);
	
	console.log("Loaded highlightRender");
	
	function highlightRender(ctx, buffer, file, startRow) {
		
		//console.time("highlightRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0,
			top = 0,
			indentation = 0;
			
		var file = editor.currentFile;
		
		ctx.fillStyle=editor.settings.style.highlightTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			
			top = editor.settings.topMargin + (row + startRow) * editor.settings.gridHeight;
			
			/*
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(editor.settings.leftMargin, top,	editor.settings.gridWidth * buffer[row].length, editor.settings.gridHeight);
			}
			*/
			
			for(var col = 0; col < buffer[row].length; col++) {
				
				
				left = editor.settings.leftMargin + (col + indentation * editor.settings.tabSpace - file.startColumn) * editor.settings.gridWidth;
				
				//if(isNaN(left)) console.error(new Error("left is NaN"));
				//if(isNaN(top)) console.error(new Error("top is NaN"));
				
				if(buffer[row][col].highlighted && !buffer[row][col].selected) {
					ctx.rect(left, top,	editor.settings.gridWidth, editor.settings.gridHeight);
				}
				
			
			}
			
			
		}
		
		ctx.fill();

		//ctx.stroke();
		//console.timeEnd("highlightRender");


	}


})();