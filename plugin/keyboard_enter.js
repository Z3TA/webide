
(function() {
	
	editor.bindKey({
		desc: "Makes a line break"
		charCode: 13, 
		fun: keyboard_enter,
	});
	
	function keyboard_enter(file) {
		
		console.log("Pushed Enter");
		
		if(editor.input) {
			
			file.insertLineBreak();
			
			// Pressing enter should scroll back to the left!
			file.startColumn = 0;
			
			
			editor.renderNeeded();
			
			return false; // Prevent default
		}
		
		return true;
	}
	
	
})();