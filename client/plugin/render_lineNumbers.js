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
	var pixelRatio = window.devicePixelRatio || 1;
	
	//rightColumn.appendChild(cacheCanvas);
	
	EDITOR.plugin({
		desc: "Render line numbers",
		load: function() {
			// lineNumbers function will be called on every frame render
			EDITOR.addRender(paintLineNumbers, 900);
			
			EDITOR.on("afterResize", linerNumbersAfterResize);
			
			// Add new item for lineNumberColor to EDITOR.settings if it's not already added
			EDITOR.settings.style.lineNumberColor = EDITOR.settings.style.lineNumberColor ? EDITOR.settings.style.lineNumberColor : "rgb(200,200,200)";
			
			cacheCtx.textBaseline = "top";
			cacheCtx.fillStyle = EDITOR.settings.style.lineNumberColor;
			cacheCtx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			
		},
		unload: function() {
			EDITOR.removeRender(paintLineNumbers);
			EDITOR.removeEvent("afterResize", linerNumbersAfterResize);
			cacheCanvas = null;
		}
	});
	
	function linerNumbersAfterResize() {
		pixelRatio = window.devicePixelRatio || 1;
		
		cacheCanvas.width = (EDITOR.settings.leftMargin - leftMargin) * pixelRatio;
		cacheCanvas.height = EDITOR.canvas.height;
		// Setting the width and height will clear the canvas!
		lastLineNr = 0;
		//cacheCanvas.style.height = EDITOR.view.canvasHeight + "px";
		
		
		
	}
	
	function paintLineNumbers(ctx, buffer, file, startRow) {
		if(buffer.length == 0) return;
		if(EDITOR.settings.showLineNumbers == false) return;
		
		var lineNr = buffer[0].lineNumber + file.partStartRow,
			lastLine = -1;
		
		if(!(lineNr == lastLineNr && lastRowCount == buffer.length)) {
			
			if(pixelRatio !== 1) {
				cacheCtx.restore();
				cacheCtx.save();
				cacheCtx.scale(pixelRatio,pixelRatio);
				//cacheCtx.scale(1,1);
			}
			
			cacheCtx.fillStyle = EDITOR.settings.style.bgColor;
			cacheCtx.fillRect(0, 0, EDITOR.view.canvasWidth, EDITOR.view.canvasHeight);
			
			cacheCtx.fillStyle = EDITOR.settings.style.textColor;
			
			lastLineNr = lineNr;
			lastRowCount = buffer.length;
			
		if(startRow == undefined) startRow = 0;
		
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
		
		//cacheCtx.restore();
		
		
		var sourceX = 0;
		var sourceY = 0;
		var sourceRectWidth = cacheCanvas.width;
		var sourceRectHeight = cacheCanvas.height;
		var destinationX = leftMargin;
		var destinationY = 0;
		var destinationWidth = sourceRectWidth / pixelRatio;
		var destinationHeight = sourceRectHeight / pixelRatio;
		
		ctx.drawImage(cacheCanvas, sourceX, sourceY, sourceRectWidth, sourceRectHeight, destinationX, destinationY, destinationWidth, destinationHeight);
		
	}
	
})();
