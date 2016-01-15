
(function() {
	
	global.renders.push(highLightLine); // lineNumbers function will be called on every frame render

	var color = global.settings.style.currentLineColor;
	
	function highLightLine(ctx, buffer, file) {
		
		var top = global.settings.topMargin + (file.caret.row - file.startRow) * global.settings.gridHeight;
		
		ctx.fillStyle = color;
		
		ctx.fillRect(0, top, global.view.canvasWidth, global.settings.gridHeight); // x, y, with, height
		
	}
	
	
})();