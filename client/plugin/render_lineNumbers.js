(function() {
	
	/*
	
		Show line numbers in the left margin
	
		todo: Fix issue for when you delete text then render single row
		
	*/
	
	var leftMargin = 1;
	var lastLineNr = 0 | 0;
	var lastRowCount = 0 | 0;
	
	// Optimization: Store the line numbers in a seperate buffer and only write to the main canvas if they change
	var cacheCanvas = document.createElement('canvas');
	var cacheCtx = cacheCanvas.getContext('2d');
	var pixelRatio = window.devicePixelRatio || 1;
	var cacheCanvasWidth = 0;
	var cacheCanvasHeight = 0;
	var debug = false;
	
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
			
			// START DEBUG CODE
			if(debug) {
			var rightColumn = document.getElementById("rightColumn");
			rightColumn.appendChild(cacheCanvas);
			}
			// END DEBUG CODE
			
		},
		unload: function() {
			EDITOR.removeRender(paintLineNumbers);
			EDITOR.removeEvent("afterResize", linerNumbersAfterResize);
			cacheCanvas = null;
		}
	});
	
	function linerNumbersAfterResize() {
		pixelRatio = window.devicePixelRatio || 1;
		
		cacheCanvasWidth = EDITOR.settings.leftMargin - leftMargin;
		cacheCanvasHeight = EDITOR.view.canvasHeight;
		
		cacheCanvas.width = cacheCanvasWidth * pixelRatio;
		cacheCanvas.height = cacheCanvasHeight * pixelRatio;
		// Setting the width and height will clear the canvas!
		lastLineNr = 0;
		//cacheCanvas.style.height = EDITOR.view.canvasHeight + "px";
		
		// START DEBUG CODE
		if(debug) {
		cacheCanvas.style.width=cacheCanvasWidth + "px";
		cacheCanvas.style.height=cacheCanvasHeight + "px";
		}
		// END DEBUG CODE
	}
	
	function paintLineNumbers(ctx, buffer, file, screenStartRow, containZeroWidthCharacters, fileStartRow, fileEndRow) {
		if(buffer.length == 0) return;
		if(EDITOR.settings.showLineNumbers == false) return;
		
		if(screenStartRow == undefined) screenStartRow = 0;
		if(fileStartRow == undefined) fileStartRow = file.startRow;
		
		var lineNr = buffer[0].lineNumber + file.partStartRow,
			lastLine = -1;
		
		if(!(lineNr == lastLineNr && lastRowCount == buffer.length)) {
			
			if(pixelRatio !== 1) {
				cacheCtx.restore();
				cacheCtx.save();
				cacheCtx.scale(pixelRatio,pixelRatio);
				//cacheCtx.scale(1,1);
			}
			
			// The cache canvas does not take into account screenStartRow!
			var fillX = 0;
			var fillY = 0;
			var fillWidth = EDITOR.view.canvasWidth;
			var fillHeight = (fileEndRow-fileStartRow+1) * EDITOR.settings.gridHeight + EDITOR.settings.topMargin;
			cacheCtx.fillStyle = EDITOR.settings.style.bgColor;
			cacheCtx.fillRect(fillX, fillY, fillWidth, fillHeight);
			
			// START DEBUG CODE
			if(debug) {
			cacheCtx.fillStyle ="darkred";
				cacheCtx.fillRect(16, 5, 2, cacheCanvasHeight-10);
			cacheCtx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			}
			// End DEBUG CODE
			
			cacheCtx.fillStyle = EDITOR.settings.style.textColor;

			lastLineNr = lineNr;
			lastRowCount = buffer.length;
			
			
		
			cacheCtx.textBaseline = "top";
			cacheCtx.fillStyle = EDITOR.settings.style.lineNumberColor;
			cacheCtx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			
		for(var row = 0; row < buffer.length; row++) {
			lineNr = buffer[row].lineNumber + file.partStartRow;
			//console.log("Line " + line);
			if(lineNr > lastLine) {
					lastLine = lineNr;
					cacheCtx.fillText(lineNr, leftMargin, EDITOR.settings.topMargin + (row) * EDITOR.settings.gridHeight);
				}
			}
			
			// START DEBUG CODE
			if(debug) {
				cacheCtx.fillText(screenStartRow, 10, 0) ;
			cacheCtx.font=EDITOR.settings.style.fontSize/2 + "px " + EDITOR.settings.style.font;
			var tmp = 0;
			for (var i=EDITOR.settings.topMargin; i<cacheCanvasHeight; i+=EDITOR.settings.gridHeight) cacheCtx.fillText(++tmp, 20, i) ;
			}
			// END DEBUG CODE
			
		}
		
		//cacheCtx.restore();
		
		
		var sourceX = 0; // the left X position to start clipping
		var sourceY = screenStartRow==0 ? 0 : EDITOR.settings.topMargin * pixelRatio; //screenStartRow==0 ? 0: screenStartRow * EDITOR.settings.gridHeight + EDITOR.settings.topMargin; // the top Y position to start clipping
		var sourceRectWidth = cacheCanvasWidth * pixelRatio; // clip this width of pixels from the source
		var sourceRectHeight = ( (fileEndRow-fileStartRow+1) * EDITOR.settings.gridHeight + (screenStartRow==0 ? EDITOR.settings.topMargin : 0) ) * pixelRatio; // clip this height of pixels from the source
		var destinationX = leftMargin; // the left X canvas position to start drawing the clipped sub-image
		var destinationY =  screenStartRow==0 ? 0: screenStartRow * EDITOR.settings.gridHeight + EDITOR.settings.topMargin; // the top Y canvas position to start drawing the clipped sub-image
		var destinationWidth = sourceRectWidth / pixelRatio; // scale sourceRectWidth to destinationWidth and draw a destinationWidth wide sub-image on the canvas
		var destinationHeight = sourceRectHeight / pixelRatio; // scale sourceRectHeight to destinationHeight and draw a destinationHeight high sub-image on the canvas
		
		console.log("screenStartRow=" + screenStartRow + " fileStartRow=" + fileStartRow + " fileEndRow=" + fileEndRow + " sourceX=" + sourceX + 
		" sourceY=" + sourceY + " sourceRectWidth=" + sourceRectWidth + " sourceRectHeight=" + sourceRectHeight + " destinationX=" + destinationX + 
		" destinationY=" + destinationY + " destinationWidth=" + destinationWidth + " destinationHeight=" + destinationHeight);
		
		ctx.drawImage(cacheCanvas, sourceX, sourceY, sourceRectWidth, sourceRectHeight, destinationX, destinationY, destinationWidth, destinationHeight);
		
	}
	
})();
