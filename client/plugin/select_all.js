
(function() {
	
	"use strict";
		
	EDITOR.bindKey({
		desc: S("select_all_text"),
		charCode: 65,
		combo: CTRL,
		fun: selectAll
	});
	
	EDITOR.windowMenu.add(S("select_all_text"), [S("File"), 6], selectAll);
	
	function selectAll(file, combo, character, charCode, keyPushDirection) {
		
		console.log("Ctrl + A = SELECT ALL");
		
		if(file && EDITOR.input) {
			// Select everything
			
			var everything = [],
				grid = file.grid;
			
			for(var row=0; row<grid.length; row++) {
				for(var col=0; col<grid[row].length; col++) {
					everything.push(grid[row][col]);
				}
			}
			
			file.select(everything, "right");
				
			EDITOR.renderNeeded();
			
			return false; // Disable bubble

		}
		else {
			return true; // Allow default browser action
		}
	}
	
	
})();