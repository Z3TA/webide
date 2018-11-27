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
	
	// debug
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
		
		cacheCanvasWidth = EDITOR.view.canvasWidth;
		cacheCanvasHeight = EDITOR.view.canvasHeight;
		
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
		
		if(buffer.length==1) {
			var sourceX = 0; // the left X position to start clipping
			var sourceY = startRow * EDITOR.settings.gridHeight; // the top Y position to start clipping
			var sourceRectWidth = cacheCanvasWidth; // clip this width of pixels from the source
			var sourceRectHeight = EDITOR.settings.gridHeight + EDITOR.settings.topMargin; // clip this height of pixels from the source
			var destinationX = leftMargin; // the left X canvas position to start drawing the clipped sub-image
			var destinationY =  sourceY; // the top Y canvas position to start drawing the clipped sub-image
			var destinationWidth = sourceRectWidth / pixelRatio; // scale sourceRectWidth to destinationWidth and draw a destinationWidth wide sub-image on the canvas
			var destinationHeight = sourceRectHeight / pixelRatio; // scale sourceRectHeight to destinationHeight and draw a destinationHeight high sub-image on the canvas
			
			ctx.drawImage(cacheCanvas, sourceX, sourceY, sourceRectWidth, sourceRectHeight, destinationX, destinationY, destinationWidth, destinationHeight);
			
return;
		}
		
		if(!(lineNr == lastLineNr && lastRowCount == buffer.length)) {
			
			if(pixelRatio !== 1) {
				cacheCtx.restore();
				cacheCtx.save();
				cacheCtx.scale(pixelRatio,pixelRatio);
				//cacheCtx.scale(1,1);
			}
			
			cacheCtx.fillStyle = EDITOR.settings.style.bgColor;
			cacheCtx.fillRect(0, 0, EDITOR.view.canvasWidth, EDITOR.view.canvasHeight);
			
			// debug
			// cacheCtx.fillStyle ="darkred";
			// cacheCtx.fillRect(5, 5, cacheCanvasWidth-10, cacheCanvasHeight-10);
			// cacheCtx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			
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
			
			// debug
			// cacheCtx.fillText(startRow, 10, 0) ;
			// cacheCtx.font=EDITOR.settings.style.fontSize/2 + "px " + EDITOR.settings.style.font;
			// var tmp = 0;
			// for (var i=EDITOR.settings.topMargin; i<cacheCanvasHeight; i+=EDITOR.settings.gridHeight) {
			// cacheCtx.fillText(++tmp, 20, i) ;
// }
			
		}
		
		//cacheCtx.restore();
		
		
		var sourceX = 0; // the left X position to start clipping
		var sourceY = 0; // the top Y position to start clipping
		var sourceRectWidth = cacheCanvasWidth; // clip this width of pixels from the source
		var sourceRectHeight = cacheCanvasHeight; // clip this height of pixels from the source
		var destinationX = leftMargin; // the left X canvas position to start drawing the clipped sub-image
		var destinationY =  sourceY; // the top Y canvas position to start drawing the clipped sub-image
		var destinationWidth = sourceRectWidth / pixelRatio; // scale sourceRectWidth to destinationWidth and draw a destinationWidth wide sub-image on the canvas
		var destinationHeight = sourceRectHeight / pixelRatio; // scale sourceRectHeight to destinationHeight and draw a destinationHeight high sub-image on the canvas
		
		ctx.drawImage(cacheCanvas, sourceX, sourceY, sourceRectWidth, sourceRectHeight, destinationX, destinationY, destinationWidth, destinationHeight);
		
	}
	
})();
