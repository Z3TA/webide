
(function() {
	
	EDITOR.bindKey({
		desc: "Makes a line break",
		charCode: 13, 
		fun: keyboard_enter,
		order: 100
	});
	
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