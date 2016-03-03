
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
			
			if(file.selected.length > 0) {
				file.deleteSelection();
				//editor.renderNeeded();
			}
			
			if(caret.index > 0) {

				// Move the caret to the left, then delete that character
				
				file.moveCaretLeft();
				file.deleteCharacter(undefined, undefined, true); // true = renderRow
				
			}
			
			/*
				We need to prevent the default (browser) action (history.go).
				But not if we're on a widget ...
			*/ 
			return false; 
		}
		
		
	}
	
	
})();