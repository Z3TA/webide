
(function() {
	
	EDITOR.bindKey({
		desc: "Makes a line break",
		charCode: 13, 
		fun: keyboard_enter,
		order: 100
	});
	
	EDITOR.bindKey({
		desc: "Enter new line without breaking current line",
		charCode: 13,
		combo: SHIFT,
		fun: keyboard_shift_enter,
		order: 10000
	});

	function keyboard_shift_enter(file) {
		
		/*
			Pressing Shift+Enter should create a new line then go to that line without breaking the current line

			(make sure it also works when in plain text mode!)
		*/

		if(!EDITOR.input) return ALLOW_DEFAULT;

		var caret = file.createCaret(undefined, file.caret.row+1, 0);
		file.insertLineBreak(caret);
		file.moveCaret(undefined, file.caret.row+1);

		return PREVENT_DEFAULT;
	}

	function keyboard_enter(file) {
		
		//console.log("Pushed Enter");
		
		if(EDITOR.input && file) {
			
			file.insertLineBreak();
			
			// Pressing enter should scroll back to the left!
			file.startColumn = 0;
			
			
			EDITOR.renderNeeded();
			
			return false; // Prevent default
		}
		
		return true;
	}
	
	
})();