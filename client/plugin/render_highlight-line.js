
(function() {
	
	EDITOR.renderFunctions.push(highLightLine); // function will be called on every frame render

	var color = EDITOR.settings.style.currentLineColor;
	
	function highLightLine(ctx, buffer, file) {
		
		var top = EDITOR.settings.topMargin + (file.caret.row - file.startRow) * EDITOR.settings.gridHeight;
		
		ctx.fillStyle = color;
		
		ctx.fillRect(0, top, EDITOR.view.canvasWidth, EDITOR.settings.gridHeight); // x, y, with, height
		
	}
	
	
})();