
(function() {
	
	"use strict";
		
	global.keyBindings.push({
		charCode: 65,
		combo: CTRL,
		fun: selectAll
	});
	
	function selectAll(file, combo, character, charCode, keyPushDirection) {
		
		console.log("Ctrl + A = SELECT ALL");
		
		if(file && file.gotFocus) {
			// Select everything
			
			var everything = [],
				grid = file.grid;
			
			for(var row=0; row<grid.length; row++) {
				for(var col=0; col<grid[row].length; col++) {
					everything.push(grid[row][col]);
				}
			}
			
			file.select(everything, "right");
				
			editor.renderNeeded();
			
			return false; // Disable bubble

		}
		else {
			return true; // Allow default browser action
		}
	}
	
	
})();