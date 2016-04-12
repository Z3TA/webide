
(function() {
	
	"use strict";
	
	editor.on("start", keyboard_backspace);
	
	function keyboard_backspace() {
		editor.keyBindings.push({
			charCode: 8, 
			fun: backSpace
		});
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
				file.deleteCharacter(undefined, undefined, renderNotNeeded);
				
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