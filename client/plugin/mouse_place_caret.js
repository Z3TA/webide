
(function() {
	/*
		
		
	*/
	
	"use strict";
	
	EDITOR.plugin({
		desc: "Place the caret using the mouse",
		load: function loadMousePlaceCaret() {
			// Set dir to "up" so that the caret col and row doesn't change between down and up !??
			EDITOR.addEvent("mouseClick", {fun: placeCaretOnCursor, dir: "up", targetClass:"fileCanvas", button: 0, combo: 0, order: 2000}); // Default order is 1000
},
unload: function unloadMousePlaceCaret() {
			EDITOR.removeEvent("mouseClick", placeCaretOnCursor);
},
	});
	
	function placeCaretOnCursor(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {

		if(!EDITOR.currentFile || !caret) return true;
		
			console.log("Setting caret to " + JSON.stringify(caret));

			console.log("caret.row=" + caret.row);
			console.log("EDITOR.currentFile.caret.row=" + EDITOR.currentFile.caret.row);
			

			EDITOR.currentFile.scrollToCaret(caret);

		
			EDITOR.currentFile.caret = caret;
			
			EDITOR.fireEvent("moveCaret", [EDITOR.currentFile, caret]);
			
			EDITOR.renderNeeded();
			
			return false;
			
			/*
			var canvas =EDITOR.currentFile.canvas,
				ctx = canvas.getContext("2d", {alpha: false}); // {alpha: false} allows sub pixel anti-alias
			
				ctx.strokeStyle="rgba(0,255,255,0.5)";

				ctx.beginPath();
				ctx.rect(mouseX, mouseY, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
				ctx.stroke();
			
			*/
		
	}


})();