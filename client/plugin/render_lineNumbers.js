
(function() {
	
	/*
	
		Show line numbers in the left margin
	
	*/
	
	var leftMargin = 1;
	
	// Add new item for lineNumberColor to EDITOR.settings if it's not already added
	EDITOR.settings.lineNumberColor = EDITOR.settings.lineNumberColor ? EDITOR.settings.lineNumberColor : "rgb(200,200,200)";
	
	
	
	EDITOR.renderFunctions.push(paintLineNumbers); // lineNumbers function will be called on every frame render
	
	
	console.log("Loaded lineNumbers");
	
	
	function giveLineNumbers(file) {
		
		var lineNumber = 0;
		
		for(var row=0; row<file.grid; row++) {
			file.grid[row] = lineNumber++;
		}
	}
	
	
	function paintLineNumbers(ctx, buffer, file, startRow) {
		var line = 0,
			lastLine = -1;
		
		if(startRow == undefined) startRow = 0;
		
		ctx.fillStyle = EDITOR.settings.lineNumberColor;
		
		for(var row = 0; row < buffer.length; row++) {
			
			line = buffer[row].lineNumber + file.partStartRow;
			
			
			
			//console.log("Line " + line);
			
			if(line > lastLine) {
				lastLine = line;
				ctx.fillText(line, leftMargin, EDITOR.settings.topMargin + (row+startRow) * EDITOR.settings.gridHeight);
				
				/*
				if(file.partStartRow > 0 && EDITOR.settings.devMode) {
					ctx.save();
					ctx.font = "10px " + EDITOR.settings.style.font;
					ctx.fillStyle="rgb(0,0,255)";
					ctx.fillText("" + (buffer[row].lineNumber-1), leftMargin+22, EDITOR.settings.topMargin + (row+startRow) * EDITOR.settings.gridHeight);
					ctx.restore();
				}
				*/
				
			}
			
		}

		
	}
	
})();