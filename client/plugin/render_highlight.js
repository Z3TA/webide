
(function() {
	"use strict";
	
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
		var tabIndention = 0;

		ctx.fillStyle=EDITOR.settings.style.highlightTextBg;
	
		var startLeft = 0;
		for(var row = 0, walker; row < buffer.length; row++) {
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			indentation = buffer[row].indentation;
			walker = EDITOR.gridWalker(buffer[row]);
			startLeft = EDITOR.settings.leftMargin + (indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
			while(!walker.done) {
				walker.next();
				if(buffer[row][walker.col].highlighted && !buffer[row][walker.col].selected) {
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
		
		return;
		
		//console.timeEnd("highlightRender");

	}


})();