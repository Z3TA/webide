
(function() {
	/*
	EDITOR.plugin({
		desc: "Render the text's background color",
		load: function loadTextBgRenderl() {
			
			// We want this render function to run before text rendering
			// But after renders that clears the background!
			EDITOR.renderFunctions.unshift(textBgRender); 
			
			console.log("Loaded textbg renderer");
			},
		unload: function unloadTextBgRenderl() {
			var index = EDITOR.renderFunctions.indexOf(textBgRender);
			while(index > -1) {
			EDITOR.renderFunctions.splice(index, 1);
				index = EDITOR.renderFunctions.indexOf(textBgRender);
			}
			console.log("Unloaded textbg renderer");
		},
		order: 1 // Make sure it runs before text render so that the text is rendered above (and not under) the background
	});
	
	*/
	
	EDITOR.renderFunctions.push(textBgRender); 
	
	function textBgRender(ctx, buffer, file, startRow) {
		
		//console.time("textBgRender");
		
		if(startRow == undefined) startRow = 0;
		
		//console.log(JSON.stringify(buffer, null, 2));
		
		//ctx.beginPath(); // Reset all the paths!
		
		var left = 0;
			var top = 0;
			var indentation = 0;
		var indentationWidth = 0;
			var file = EDITOR.currentFile;
		var oldBgColor = null;
		var chars = 0;
		var width = 0;
		
		ctx.fillStyle=EDITOR.settings.style.highlightTextBg;
	
		for(var row = 0; row < buffer.length; row++) {
			
			indentation = buffer[row].indentation;
			indentationWidth = indentation * EDITOR.settings.tabSpace;
			top = EDITOR.settings.topMargin + (row + startRow) * EDITOR.settings.gridHeight;
			left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
			
			oldBgColor = null;
			chars = 0;
			
			for(var col = 0; col < buffer[row].length; col++) {
				//console.log("xxx col=" + col + " chars=" + chars);
				if(buffer[row][col].bgColor != oldBgColor) {
					if(oldBgColor) {
						
						width = EDITOR.settings.gridWidth * chars;
						
					ctx.fillStyle = oldBgColor;
						ctx.fillRect(left, top,	width, EDITOR.settings.gridHeight);
						//console.log("oldBgColor=" + oldBgColor + " chars=" + chars + " row=" + row + " col=" + col + " left=" + left + " top=" + top + " width=" + width);
						
				}
					
					left += chars * EDITOR.settings.gridWidth;
					oldBgColor = buffer[row][col].bgColor;
					chars = 0;
				}
				
				chars++;
				
			}
			//console.log("yyy row=" + row);
			
			// For the last bgcolor
			if(oldBgColor) {
				width = EDITOR.settings.gridWidth * chars;
				ctx.fillStyle = oldBgColor;
				ctx.fillRect(left, top,	width, EDITOR.settings.gridHeight);
				//console.log("oldBgColor=" + oldBgColor + " chars=" + chars + " row=" + row + " col=" + col + " left=" + left + " top=" + top + " width=" + width + " EOL!");
			}
			}
		
		//ctx.stroke();
		//console.timeEnd("textBgRender");

	}

})();
