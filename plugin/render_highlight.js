
(function() {

	/*
	
		Effects for selected text
	
	*/
	
	// Sanity check
	if(!global.settings.style.highlightTextBg) {
		debug.warn("No highlightTextBg style defined!");
	}


	global.renders.push(highlightRender);
	
	console.log("Loaded highlightRender");
	
	function highlightRender(ctx, buffer) {
		
		console.time("highlightRender");
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		ctx.beginPath(); // Reset all the paths!
		
		var left = 0,
			top = 0,
			indentation = 0;
			
		var file = global.currentFile;
		
		ctx.fillStyle=global.settings.style.highlightTextBg;
	
		
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			
			top = global.settings.topMargin + row * global.settings.gridHeight;
			
			/*
			if(buffer[row].selected) { // The whole row is selected
				ctx.rect(global.settings.leftMargin, top,	global.settings.gridWidth * buffer[row].length, global.settings.gridHeight);
			}
			*/
			
			for(var col = 0; col < buffer[row].length; col++) {
				
				
				left = global.settings.leftMargin + (col + indentation * global.settings.tabSpace - file.startColumn) * global.settings.gridWidth;
				
				if(isNaN(left)) console.error(new Error("left is NaN"));
				if(isNaN(top)) console.error(new Error("top is NaN"));
				
				if(buffer[row][col].highlighted && !buffer[row][col].selected) {
					ctx.rect(left, top,	global.settings.gridWidth, global.settings.gridHeight);
				}
				
			
			}
			
			
		}
		
		ctx.fill();

		//ctx.stroke();
		console.timeEnd("highlightRender");


	}


})();