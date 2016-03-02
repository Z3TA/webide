
(function() {
	
	editor.renderFunctions.push(highLightLine); // function will be called on every frame render

	var color = editor.settings.style.currentLineColor;
	
	function highLightLine(ctx, buffer, file) {
		
		var top = editor.settings.topMargin + (file.caret.row - file.startRow) * editor.settings.gridHeight;
		
		ctx.fillStyle = color;
		
		ctx.fillRect(0, top, editor.view.canvasWidth, editor.settings.gridHeight); // x, y, with, height
		
	}
	
	
})();