
(function() {
	/*
		Allows placing the caret using the mouse
		
	*/
	
	"use strict";
	
	editor.addEvent("mouseClick", {fun: placeCaretOnCursor, dir: "up", targetClass:"fileCanvas", button: 0, combo: 0}); // Set dir to "up" so that the caret col and row doesnt change between down and up.
	
	function placeCaretOnCursor(mouseX, mouseY, caret, direction, button) {

		
		if(editor.currentFile && caret) {
			
			console.log("Setting caret to " + JSON.stringify(caret));

			console.log("caret.row=" + caret.row);
			console.log("editor.currentFile.caret.row=" + editor.currentFile.caret.row);
			

			editor.currentFile.scrollToCaret(caret);

		
			editor.currentFile.caret = caret;
			
			editor.fireEvent("moveCaret", editor.currentFile, caret);
			
			editor.renderNeeded();
			
			/*
			var canvas =editor.currentFile.canvas,
				ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias
			
				ctx.strokeStyle="rgba(0,255,255,0.5)";

				ctx.beginPath();
				ctx.rect(mouseX, mouseY, editor.settings.gridWidth, editor.settings.gridHeight);
				ctx.stroke();
			
			*/
		}
		
	}


})();