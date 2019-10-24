
(function() {

var winMenuBiggerText;
	var bigTextActive = false;
	var originalFontSize, originalGridHeight, originalGridWidth, originalLeftMargin, originalTabSpace;
	
EDITOR.plugin({
desc: "Increase text size",
load: function loadBiggerText() {

			winMenuBiggerText = EDITOR.windowMenu.add(S("bigger_text"), [S("View"), 100], toggleBigText);
			
			originalFontSize = EDITOR.settings.style.fontSize;
			originalGridHeight = EDITOR.settings.gridHeight;
			originalGridWidth = EDITOR.settings.gridWidth;
			originalLeftMargin = EDITOR.settings.leftMargin;
			originalTabSpace = EDITOR.settings.tabSpace;
			
		},
unload: function unloadBiggerText() {
			EDITOR.windowMenu.remove(winMenuBiggerText);
}
});

	function toggleBigText() {
		
		var matchHighlightFontSize = EDITOR.settings.style.highlightMatchFont.match(/(\d*)px/);
		if(matchHighlightFontSize) {
			var pxStr = matchHighlightFontSize[0];
			var size = parseFloat(matchHighlightFontSize[1]);
		}
		
		
		if(bigTextActive) {
			
			EDITOR.settings.style.fontSize = EDITOR.settings.style.fontSize / 2;
			EDITOR.settings.gridHeight = EDITOR.settings.gridHeight / 2;
			EDITOR.settings.gridWidth = EDITOR.settings.gridWidth / 2;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = EDITOR.settings.tabSpace * 2;
			
			if(matchHighlightFontSize) {
				EDITOR.settings.style.highlightMatchFont = EDITOR.settings.style.highlightMatchFont.replace(pxStr, size*2);
			}
			
			bigTextActive = false;
			
			winMenuBiggerText.deactivate();
		}
		else {
			var fontSize = parseFloat(EDITOR.settings.style.fontSize);
			
			EDITOR.settings.style.fontSize = EDITOR.settings.style.fontSize * 2;
			EDITOR.settings.gridHeight = EDITOR.settings.gridHeight * 2;
			EDITOR.settings.gridWidth = EDITOR.settings.gridWidth * 2;
			EDITOR.settings.leftMargin = Math.floor( (EDITOR.currentFile ? Math.log(EDITOR.currentFile.grid.length) * Math.LOG10E : 3) * EDITOR.settings.gridWidth + EDITOR.settings.gridWidth / 2);
			EDITOR.settings.tabSpace = EDITOR.settings.tabSpace / 2;
			
			if(matchHighlightFontSize) {
				EDITOR.settings.style.highlightMatchFont = EDITOR.settings.style.highlightMatchFont.replace(pxStr, size/2);
			}
			
			bigTextActive = true;
			
			winMenuBiggerText.activate();
		}
		
		
		
		EDITOR.resize(true);
	}
	
})();
