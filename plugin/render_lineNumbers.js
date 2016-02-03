
(function() {
	
	/*
	
		Show line numbers in the left margin
	
	*/
	
	var leftMargin = 1;
	
	// Add new item for lineNumberColor to global.settings if it's not already added
	global.settings.lineNumberColor = global.settings.lineNumberColor ? global.settings.lineNumberColor : "rgb(200,200,200)";
	
	
	
	global.renders.push(paintLineNumbers); // lineNumbers function will be called on every frame render
	
	
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
		
		ctx.font=global.settings.fontSize + "px " + global.settings.font;
		ctx.textBaseline = "top";
		ctx.fillStyle = global.settings.lineNumberColor;
		
		for(var row = 0; row < buffer.length; row++) {
			
			line = buffer[row].lineNumber;
			
			//console.log("Line " + line);
			
			if(line > lastLine) {
				lastLine = line;
				ctx.fillText(line, leftMargin, global.settings.topMargin + (row+startRow) * global.settings.gridHeight);
			}
			
		}

		
	}
	
})();