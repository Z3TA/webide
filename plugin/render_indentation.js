(function() {
	/*
		Render a indention line to make it easier 
		Make the line red when caret is next to a {
		
	*/
	"use strict";
	
	editor.on("start", indention_helper);
	
	function indention_helper() {
		
		global.renders.push(indention_render);
		
	}
	
	function indention_render(ctx, buffer, file, startRow) {
		
		if(startRow == undefined) startRow = 0;
		
		if(buffer.length == 0) return; // Nothing to render
		
		var tabSpace = global.settings.tabSpace;
		var gridWidth = global.settings.gridWidth;
		var gridHeight = global.settings.gridHeight;
		var leftMargin = global.settings.leftMargin;
		var topMargin = global.settings.topMargin;
		
		// Find out if the caret is in the buffer
		var firstRow = file.startRow + startRow,
		lastRow = startRow + buffer.length,
		caretRow = file.caret.row,
			caretInBuffer = caretRow >= firstRow && caretRow <= lastRow,
			caretRowIndentation = file.grid[caretRow].indentation,
			caretBufferRow = caretRow - firstRow;
		
		
		ctx.strokeStyle = "rgb(219, 219, 219)";
		ctx.lineWidth=0.5;
		
		ctx.beginPath();
		ctx.moveTo(0,0);
		
		for(var row=0; row<buffer.length; row++) {
			
			let level = buffer[row].indentation;
			
			
			for(var lvl=1; lvl<level; lvl++) {
				
				// All lines goes straight down
				
				let x1 = leftMargin + (lvl) * tabSpace * gridWidth + 2.5; // x.5 for sub-pixel (very thin) line
				let y1 = topMargin + (row+startRow) * gridHeight;
				let x2 = x1;
				let y2 = y1 + gridHeight;
				
				ctx.moveTo(x1, y1);
				ctx.lineTo(x1, y2);
					
			}
			
		}
		
		ctx.stroke();
		
		var lastIndentation = file.grid[file.grid.length-1].indentation;
		
		if(lastIndentation > 0) {
			// We have an unclosed block!
			ctx.strokeStyle = "rgb(255, 0, 0)";
			ctx.lineWidth=2;
			ctx.beginPath();
			
			let x1 = leftMargin + (caretRowIndentation) * tabSpace * gridWidth + 2.5; // x.5 for sub-pixel (very thin) line
				let y1 = topMargin + (caretBufferRow > 0 ? (caretBufferRow+1) * gridHeight : 0);
			let x2 = x1;
			let y2 = global.view.canvasHeight;
			}
			
			ctx.moveTo(x1, y1);
			ctx.lineTo(x1, y2);
			
			ctx.stroke();
		}
		
		// If caret is outside the screen, highlight that line
		if(!caretInBuffer && 1==2) {
			
			ctx.strokeStyle = "rgb(255, 0, 0)";
			ctx.lineWidth=1;
			ctx.beginPath();
			
			for(var row=0; row<buffer.length; row++) {
				
				let level = buffer[row].indentation;
				
				if(level == caretRowIndentation) {
				
					let x1 = leftMargin + (level-1) * tabSpace * gridWidth + 0.5; // x.5 for sub-pixel (very thin) line
					let y1 = topMargin + (row+startRow) * gridHeight;
					let x2 = x1;
					let y2 = y1 + gridHeight;
			
			ctx.moveTo(x1, y1);
			ctx.lineTo(x1, y2);
			}
			}
			
			ctx.stroke();
		}
	
	
})();
