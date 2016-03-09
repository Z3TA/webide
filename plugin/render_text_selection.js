
(function() {

	/*
	
		Effects for selected text
		
	*/
	
	// Sanity check
	if(!editor.settings.style.selectedTextBg) {
		debug.warn("No selectedTextBg defined!");
	}


	editor.renderFunctions.push(selectionRender);
	
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
			
		var file = editor.currentFile;
		
		ctx.fillStyle=editor.settings.style.selectedTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			
			top = editor.settings.topMargin + (row + startRow) * editor.settings.gridHeight;
			
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(editor.settings.leftMargin, top,	editor.settings.gridWidth * buffer[row].length, editor.settings.gridHeight);
			}
			{
				
				for(var col = 0; col < buffer[row].length; col++) {
					
					
					left = editor.settings.leftMargin + (col + indentation * editor.settings.tabSpace - file.startColumn) * editor.settings.gridWidth;
					
					//if(isNaN(left)) console.error(new Error("left is NaN! editor.settings.leftMargin=" + editor.settings.leftMargin + " col=" + col + " indentation=" + indentation + " editor.settings.tabSpace=" + editor.settings.tabSpace + " file.startColumn=" + file.startColumn + " editor.settings.gridWidth=" + editor.settings.gridWidth + ""));
					//if(isNaN(top)) console.error(new Error("top is NaN"));
					
					if(buffer[row][col].selected) {
						ctx.rect(left, top,	editor.settings.gridWidth, editor.settings.gridHeight);
					}
					
				}
			}
				
		}
		
		ctx.fill();

		//ctx.stroke();
		//console.timeEnd("selectionRender");


	}


})();