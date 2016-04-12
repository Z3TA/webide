
(function() {

	editor.on("start", keyboard_delete);
	
	function keyboard_delete() {
		editor.keyBindings.push({
			charCode: 46, 
			fun: keydel
		});
	}
	
	function keydel(file, combo, character, charCode, keyPush) {
		
		if(editor.input) {
			
			if(file.selected.length > 0) {
				
				// Delete all selected
				
				file.deleteSelection();
				
			}
			else {
				file.deleteCharacter(file.caret, undefined);
			}
				
			return false; // Prevent default
				
		}
		
		return true;
	}

})();