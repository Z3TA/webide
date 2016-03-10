
(function() {
	
	/*
	
		Show line numbers in the left margin
	
	*/
	
	var leftMargin = 1;
	
	// Add new item for lineNumberColor to editor.settings if it's not already added
	editor.settings.lineNumberColor = editor.settings.lineNumberColor ? editor.settings.lineNumberColor : "rgb(200,200,200)";
	
	
	
	editor.renderFunctions.push(paintLineNumbers); // lineNumbers function will be called on every frame render
	
	
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
		
		ctx.font=editor.settings.fontSize + "px " + editor.settings.font;
		ctx.textBaseline = "top";
		ctx.fillStyle = editor.settings.lineNumberColor;
		
		for(var row = 0; row < buffer.length; row++) {
			
			line = buffer[row].lineNumber + file.partStartRow;
			
			//console.log("Line " + line);
			
			if(line > lastLine) {
				lastLine = line;
				ctx.fillText(line, leftMargin, editor.settings.topMargin + (row+startRow) * editor.settings.gridHeight);
			}
			
		}

		
	}
	
})();