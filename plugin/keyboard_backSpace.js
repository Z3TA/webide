
(function() {
	
	"use strict";
	
	global.keyBindings.push({
		charCode: 8, 
		fun: backSpace
	});
	
	function backSpace(file, combo, character, charCode, keyPush) {
		
		if(file.gotFocus) {
			
			var caret = file.caret,
				leftIndex = caret.index - 1,
				char,
				grid = file.grid;
			
			if(file.selected.length > 0) {
				file.deleteSelection();
			}
			
			if(caret.index > 0) {

				// Move the caret to the left, then delete that character
				
				file.moveCaretLeft();
				file.deleteCharacter();

				global.render = true;
				
			}
			
			/*
				We need to prevent the default (browser) action (history.go).
				But not if we're on a widget ...
			*/ 
			return false; 
		}
		
		
	}
	
	
})();