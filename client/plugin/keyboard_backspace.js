
(function() {
	
	"use strict";
	
	EDITOR.on("start", keyboard_backspace);
	
	function keyboard_backspace() {
		EDITOR.bindKey({desc: "Moves the caret left and deletes one character. Or deletes all selected characters.", charCode: 8, fun: backSpace});
	}
	
	function backSpace(file, combo, character, charCode, keyPush) {
		
		if(EDITOR.input) {
			
			var caret = file.caret;
			var leftIndex = caret.index - 1;
			var char;
				var grid = file.grid;
			
			var renderNotNeeded = EDITOR.settings.clearColumnOptimization;
			
			if(file.selected.length > 0) {
				renderNotNeeded = false;
				file.deleteSelection();
				EDITOR.renderNeeded();
				return true; // Only delete the selection
			}
			
			if(caret.index > 0) {
				
				if(renderNotNeeded && caret.eol && grid[caret.row].length > 0) {
					EDITOR.clearColumn(caret.row, caret.col-1);
				}
				else {
					renderNotNeeded = false;
				}
				
				// Move the caret to the left, then delete that character
				file.moveCaretLeft();
				file.deleteCharacter();
				EDITOR.renderNeeded();
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