
(function() {

	/*
	
		Effects for selected text
	
	*/
	
	// Sanity check
	if(!global.settings.style.selectedTextBg) {
		debug.warn("No selectedTextBg defined!");
	}


	global.renders.push(selectionRender);
	
	console.log("Loaded selectionRender");
	
	function selectionRender(ctx, buffer, file, startRow) {
		
		if(buffer.length === 0) return;
		
		console.time("selectionRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0,
			top = 0,
			indentation = 0;
			
		var file = global.currentFile;
		
		ctx.fillStyle=global.settings.style.selectedTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			
			top = global.settings.topMargin + (row + startRow) * global.settings.gridHeight;

			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(global.settings.leftMargin, top,	global.settings.gridWidth * buffer[row].length, global.settings.gridHeight);
			}
			
			for(var col = 0; col < buffer[row].length; col++) {
				
				
				left = global.settings.leftMargin + (col + indentation * global.settings.tabSpace - file.startColumn) * global.settings.gridWidth;
				
				if(isNaN(left)) console.error(new Error("left is NaN! global.settings.leftMargin=" + global.settings.leftMargin + " col=" + col + " indentation=" + indentation + " global.settings.tabSpace=" + global.settings.tabSpace + " file.startColumn=" + file.startColumn + " global.settings.gridWidth=" + global.settings.gridWidth + ""));
				if(isNaN(top)) console.error(new Error("top is NaN"));
				
				if(buffer[row][col].selected) {
					ctx.rect(left, top,	global.settings.gridWidth, global.settings.gridHeight);
				}
				
			
			}
			
			
		}
		
		ctx.fill();

		//ctx.stroke();
		console.timeEnd("selectionRender");


	}


})();