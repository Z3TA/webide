
(function() {
	
	EDITOR.bindKey({
		desc: "Makes a line break",
		charCode: 13, 
		fun: keyboard_enter,
		order: 100
	});
	
	EDITOR.bindKey({
		desc: "Also makes a line break",
		charCode: 13,
		combo: SHIFT,
		fun: keyboard_enter2,
		order: 10000
	});

	function keyboard_enter2(file) {
		return keyboard_enter(file);
	}

	function keyboard_enter(file) {
		
		console.log("Pushed Enter");
		
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