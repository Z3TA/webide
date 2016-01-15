
(function() {
	
	global.keyBindings.push({
		charCode: 13, 
		fun: keyboard_enter,
	});
	
	function keyboard_enter(file) {
		
		console.log("Pushed Enter");
		
		
		if(file.gotFocus) {
			
			file.insertLineBreak();
			
			// Pressing enter should scroll back to the left!
			file.startColumn = 0;
			
			
			global.render = true;
			
			return false; // Prevent default
		}
	}
	
	
})();