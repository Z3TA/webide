(function() {
	
	/*
	
		Show line numbers in the left margin
	
	*/
	
	var leftMargin = 1;
	var lastLineNr = 0 | 0;
	var lastRowCount = 0 | 0;
	
	// Optimization: Store the line numbers in a seperate buffer and only write to the main canvas if they change
	var cacheCanvas = document.createElement('canvas');
	var cacheCtx = cacheCanvas.getContext('2d');
	
	EDITOR.plugin({
		desc: "Render line numbers",
		load: function() {
			// lineNumbers function will be called on every frame render
			EDITOR.addRender(paintLineNumbers);
			
			// Add new item for lineNumberColor to EDITOR.settings if it's not already added
			EDITOR.settings.style.lineNumberColor = EDITOR.settings.style.lineNumberColor ? EDITOR.settings.style.lineNumberColor : "rgb(200,200,200)";
			
			cacheCtx.textBaseline = "top";
			cacheCtx.fillStyle = EDITOR.settings.style.lineNumberColor;
			cacheCtx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			
		},
		unload: function() {
			EDITOR.removeRender(paintLineNumbers);
			cacheCanvas = null;
		}
	});
	
	function paintLineNumbers(ctx, buffer, file, startRow) {
		var lineNr = buffer[0].lineNumber + file.partStartRow,
			lastLine = -1;
		
		if(!(lineNr == lastLineNr && lastRowCount == buffer.length)) {
			
			lastLineNr = lineNr;
			lastRowCount = buffer.length;
			
		if(startRow == undefined) startRow = 0;
		
			cacheCanvas.width = EDITOR.settings.leftMargin - leftMargin;
			cacheCanvas.height = EDITOR.canvas.height;
			
			cacheCtx.textBaseline = "top";
			cacheCtx.fillStyle = EDITOR.settings.style.lineNumberColor;
			cacheCtx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			
		for(var row = 0; row < buffer.length; row++) {
			lineNr = buffer[row].lineNumber + file.partStartRow;
			//console.log("Line " + line);
			if(lineNr > lastLine) {
					lastLine = lineNr;
					cacheCtx.fillText(lineNr, leftMargin, EDITOR.settings.topMargin + (row+startRow) * EDITOR.settings.gridHeight);
				}
			}
		}
		
		ctx.drawImage(cacheCanvas, leftMargin, 0);
		
	}
	
})();
