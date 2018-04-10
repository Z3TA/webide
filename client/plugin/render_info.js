
(function() {
	/*
		Prints talk bubbles
		
		Add "comments" with EDITOR.addInfo();
		Remove them with EDITOR.removeAllInfo();
	
	*/
	
	"use strict";
	
	var pigHeight = 10; // talk bubble
	var adjustX = 1;    // Adjust so that the pig points at a Consolas dot.
	var adjustY = 4;
	
	EDITOR.on("start", infoBubbles);
	
	// Load icons
	var iconError = new Image();
	iconError.src = "gfx/error.svg";
	
	
	function infoBubbles() {
		
		// Extend editor (moved to core, because many plugins depend on this)
		
		// Add renderer
		EDITOR.renderFunctions.push(infoRender);
}
	

	function infoRender(ctx, buffer, file) {
		
		var x = 0;
		var y = 0;
		var textPadding = 5;
		var textWidth = 0;
		var textHeight = 0;
		var radius = 10;
		var gridHeight = EDITOR.settings.gridHeight;
		var gridWidth = EDITOR.settings.gridWidth;
		var startRow = file.startRow;
		var startColumn = file.startColumn;
		var visibleRows = EDITOR.view.visibleRows;
		var comments = EDITOR.info;
		var comment;
		var topMargin = EDITOR.settings.topMargin;
		var leftMargin = EDITOR.settings.leftMargin;
		var indentation = 0;
		var indentationWidth = 0;
		var tabSpace = EDITOR.settings.tabSpace;
		var iconPadding = 0;
		var fontHeight = 19;
		var iconHeight = 18;
		var countTextWidth = 0;
		var countTextHeight = 0;
		var countTextPadding = 0;
		
		//ctx.font="14px Arial";
		
		//ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;

		
		for(var i=0; i<comments.length; i++) {
			
			comment = comments[i];
			
			if(comment.file != EDITOR.currentFile) continue;
			
			if(comment.row >= file.grid.length) {
				throw new Error("row=" + comment.row + " above file grid! comment=" + JSON.stringify(comment) + " curren-file: " + EDITOR.currentFile.path);
				}
			
			// Calculate position ...
			indentation = file.grid[comment.row].indentation;
			indentationWidth = indentation * tabSpace;

			x = leftMargin + (comment.col + indentationWidth - startColumn) * gridWidth + adjustX;
			y = topMargin + comment.row * gridHeight - startRow * gridHeight + gridHeight + adjustY;

			textHeight = comment.text.length * fontHeight;
			
			console.log("textHeight=" + textHeight);
			
			// Measure max text width
			for(var j=0; j<comment.text.length;j++) {
				//textWidth = Math.max(textWidth, ctx.measureText(comment.text[j]).width);
				console.log("imgWidth=" + comment.text[j].width);
				textWidth = Math.max(textWidth, comment.text[j].width);
			}
			
			if(comment.count > 1) {
				//ctx.font="10px Arial";
				countTextWidth = ctx.measureText(comment.count.toString()).width;
				countTextHeight = 13; // Can't measure the height
				countTextPadding = 2;
			}
			else {
				countTextWidth = 0;
				countTextHeight = 0;
				countTextPadding = 0;
			}
			
			// Draw the bubble
			ctx.fillStyle=EDITOR.settings.style.currentLineColor;
			drawBubble(ctx, x, y, textWidth + textPadding*2 + countTextWidth, textHeight + textPadding*2, radius, comment.lvl);

			// Draw the text
			/*
			ctx.fillStyle=EDITOR.settings.style.textColor;
			for(var j=0; j<comment.text.length;j++) {
				ctx.fillText(comment.text[j], x + textPadding, y + textPadding + j * gridHeight);
			}
			*/
			
			if(comment.lvl == 1) {
				ctx.drawImage(iconError, x+textPadding, y + textHeight/2 - iconHeight/2 + textPadding, iconHeight,iconHeight);
				iconPadding = 25;
			}
			else {
				iconPadding = 0;
			}
			
			if(comment.count > 1) {
				ctx.fillStyle="rgba(0,0,0, .7)";
				ctx.fillText(comment.count, x + textPadding + iconPadding, y + textPadding);
				}
			
			for(var j=0; j<comment.text.length;j++) {
				ctx.drawImage(comment.text[j], x + textPadding + iconPadding + countTextWidth + countTextPadding, y + textPadding + j * fontHeight);
			}
			
			
		}
		
		
	}
	
	function drawBubble(ctx, x, y, w, h, radius, lvl) {
		
		if(lvl == 1) {
			ctx.fillStyle="rgb(255, 236, 236)";
			ctx.strokeStyle="rgba(255,180,180, 0.8)";
			ctx.lineWidth="2";
		}
		else if(lvl == 2) {
			ctx.fillStyle=EDITOR.settings.style.currentLineColor;
ctx.strokeStyle="rgba(255,255,0, 0.5)";
			ctx.lineWidth="1";
		}
		else {
			ctx.fillStyle=EDITOR.settings.style.currentLineColor;
ctx.strokeStyle="rgba(0,0,0, 0.5)";
			ctx.lineWidth="1";
		}
		
		var r = x + w;
		var b = y + h;
		ctx.beginPath();
		
		
		ctx.moveTo(x+radius, y);
		ctx.lineTo(x+radius/2, y-pigHeight);
		ctx.lineTo(x+radius * 2, y);
		ctx.lineTo(r-radius, y);
		ctx.quadraticCurveTo(r, y, r, y+radius);
		ctx.lineTo(r, y+h-radius);
		ctx.quadraticCurveTo(r, b, r-radius, b);
		ctx.lineTo(x+radius, b);
		ctx.quadraticCurveTo(x, b, x, b-radius);
		ctx.lineTo(x, y+radius);
		ctx.quadraticCurveTo(x, y, x+radius, y);
		ctx.stroke();
		ctx.fill();
	}
	
	
})();