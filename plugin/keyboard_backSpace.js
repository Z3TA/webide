
(function() {
	
	"use strict";
	
	editor.on("start", keyboard_backspace);
	
	function keyboard_backspace() {
		editor.bindKey({desc: "Moves the caret left and deletes one character. Or deletes all selected characters.", charCode: 8, fun: backSpace});
	}
	
	function backSpace(file, combo, character, charCode, keyPush) {
		
		if(editor.input) {
			
			var caret = file.caret,
				leftIndex = caret.index - 1,
				char,
				grid = file.grid;
			
			var renderNotNeeded = editor.settings.clearColumnOptimization;
			
			if(file.selected.length > 0) {
				renderNotNeeded = false;
				file.deleteSelection();
				editor.renderNeeded();
			}
			

			
			if(caret.index > 0) {
				
				if(renderNotNeeded && caret.eol && grid[caret.row].length > 0) {
					editor.clearColumn(caret.row, caret.col-1);
				}
				else {
					renderNotNeeded = false;
				}
				
				// Move the caret to the left, then delete that character
				file.moveCaretLeft();
				file.deleteCharacter();
				editor.renderNeeded();
			}
			
			/*
				We need to prevent the default (browser) action (history.go).
				But not if we're on a widget ...
			*/ 
			return false; 
		}
		
		return true;
		
	}
	
	
})();