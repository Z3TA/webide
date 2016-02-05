
(function() {

	editor.on("start", keyboard_delete);
	
	function keyboard_delete() {
		global.keyBindings.push({
			charCode: 46, 
			fun: keydel
		});
	}
	
	function keydel(file, combo, character, charCode, keyPush) {
		
		if(file.gotFocus) {
			
			if(file.selected.length > 0) {
				
				// Delete all selected
				
				file.deleteSelection();
				
			}
			else {
				file.deleteCharacter(file.caret);
			}
				

			editor.renderNeeded();
			
			return false; // Prevent default
				
		}
		
	}

})();