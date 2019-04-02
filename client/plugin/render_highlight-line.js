
(function() {
	
	EDITOR.plugin({
		desc: "Highlight current line",
		load: function() {
			EDITOR.addRender(highLightLine, 100);
},
unload: function() {
			EDITOR.removeRender(highLightLine);
}
	});
	
	function highLightLine(ctx, buffer, file, screenStartRow, containZeroWidthCharacters, bufferStartRow, bufferEndRow) {
		
		if(file.caret.row > bufferEndRow || file.caret.row < bufferStartRow) return;
		
		var top = EDITOR.settings.topMargin + (file.caret.row - bufferStartRow + screenStartRow) * EDITOR.settings.gridHeight;
		
		ctx.fillStyle = EDITOR.settings.style.currentLineColor;
		
		ctx.fillRect(0, top, EDITOR.view.canvasWidth, EDITOR.settings.gridHeight); // x, y, with, height
		
	}
	
	
})();