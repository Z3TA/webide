
(function() {
	/*
		Prints talk bubbles
		
		Add "comments" with editor.addInfo(row, col, info);
		Remove them with editor.removeAllInfo(row, col);
	
	*/
	
	"use strict";
	
	var pigHeight = 10; // talk bubble
	var adjustX = 1;    // Adjust so that the pig points at a Consolas dot.
	var adjustY = 4;
	
	editor.on("start", infoBubbles);
	
	function infoBubbles() {
		
		// Extend editor (moved to core, because many plugins depend on this)
		
		// Add renderer
		global.renders.push(infoRender);

	}
	

	function infoRender(ctx, buffer, file) {
		
		var x = 0;
		var y = 0;
		var textPadding = 5;
		var textWidth = 0;
		var textHeight = 0;
		var radius = 10;
		var gridHeight = global.settings.gridHeight;
		var gridWidth = global.settings.gridWidth;
		var startRow = file.startRow;
		var startColumn = file.startColumn;
		var visibleRows = global.view.visibleRows;
		var comments = global.info;
		var comment;
		var topMargin = global.settings.topMargin;
		var leftMargin = global.settings.leftMargin;
		var indentation = 0;
		var indentationWidth = 0;
		var tabSpace = global.settings.tabSpace;
		
		//ctx.font="14px Arial";
		
		ctx.font=global.settings.style.fontSize + "px " + global.settings.style.font;

		
		for(var i=0; i<comments.length; i++) {

			comment = comments[i];
			
			// Calculate position ...
			indentation = file.grid[comment.row].indentation;
			indentationWidth = indentation * tabSpace;

			x = leftMargin + (comment.col + indentationWidth - startColumn) * gridWidth + adjustX;
			y = topMargin + comment.row * gridHeight - startRow * gridHeight + gridHeight + adjustY;

			textHeight = comment.text.length * gridHeight;
			
			console.log("textHeight=" + textHeight);
			
			// Measure max text width
			for(var j=0; j<comment.text.length;j++) {
				//textWidth = Math.max(textWidth, ctx.measureText(comment.text[j]).width);
				console.log("imgWidth=" + comment.text[j].width);
				textWidth = Math.max(textWidth, comment.text[j].width);
			}
			
			// Draw the bubble
			ctx.fillStyle=global.settings.style.currentLineColor;
			drawBubble(ctx, x, y, textWidth + textPadding*2, textHeight + textPadding*2, radius);

			// Draw the text
			/*
			ctx.fillStyle=global.settings.style.textColor;
			for(var j=0; j<comment.text.length;j++) {
				ctx.fillText(comment.text[j], x + textPadding, y + textPadding + j * gridHeight);
			}
			*/
			for(var j=0; j<comment.text.length;j++) {
				ctx.drawImage(comment.text[j], x + textPadding, y + textPadding + j * gridHeight);
			}
			
			
		}
		
		
	}
	
	function drawBubble(ctx, x, y, w, h, radius)
	{
		var r = x + w;
		var b = y + h;
		ctx.beginPath();
		ctx.strokeStyle="rgba(0,0,0, 0.5)";
		ctx.lineWidth="1";
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