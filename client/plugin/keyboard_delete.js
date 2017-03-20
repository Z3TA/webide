
(function() {

	EDITOR.on("start", keyboard_delete);
	
	function keyboard_delete() {
		EDITOR.bindKey({
			desc: "Deletes the one character right of the caret. Or deletes all selected text.",
			charCode: 46, 
			fun: keydel
		});
	}
	
	function keydel(file, combo, character, charCode, keyPush) {
		
		if(EDITOR.input) {
			
			if(file.selected.length > 0) {
				
				// Delete all selected
				
				file.deleteSelection();
				
			}
			else {
				file.deleteCharacter(file.caret);
			}
			
			EDITOR.renderNeeded();
			
			return false; // Prevent default
				
		}
		
		return true;
	}

})();