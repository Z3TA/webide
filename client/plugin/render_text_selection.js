
(function() {

	/*
	
		Effects for selected text
		
	*/
	
	// Sanity check
	if(!EDITOR.settings.style.selectedTextBg) {
		console.warn("No selectedTextBg defined!");
	}


	EDITOR.addRender(selectionRender, 1920); // Have higher order then render_textbg so we can se what we are selecting when there is a background

	//console.log("Loaded selectionRender");
	
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
	
		var startLeft = 0;
		
		for(var row = 0, walker; row < buffer.length; row++) {
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			indentation = buffer[row].indentation;
			walker = EDITOR.gridWalker(buffer[row]);
			startLeft = EDITOR.settings.leftMargin + (indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
			while(!walker.done) {
				walker.next();
				if(buffer[row][walker.col].selected) {
					ctx.rect(
					startLeft + (walker.totalWidth - walker.charWidth) * EDITOR.settings.gridWidth, 
					top, 
					walker.charWidth * EDITOR.settings.gridWidth, 
					EDITOR.settings.gridHeight
					);
				}
			}
		}
		
		ctx.fill();
		
		//console.timeEnd("selectionRender");
		
	}
	
	
})();
