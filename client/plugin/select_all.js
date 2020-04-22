
(function() {
	
	"use strict";
		
	EDITOR.bindKey({
		desc: S("select_all_text"),
		charCode: 65,
		combo: CTRL,
		fun: selectAll
	});
	
	if(MAC) {
console.log("selectAll: Adding key binding for Meta+A to select all");
		EDITOR.bindKey({
			desc: S("select_all_text"),
			key: "A",
			combo: META,
			fun: macSelectAll
		});
	}
	
	EDITOR.windowMenu.add(S("select_all_text"), [S("File"), 6], selectAll);
	
function macSelectAll(file) {
return selectAll(file);
}

	function selectAll(file) {
		
		console.log("selectAll:  EDITOR.input=" +  EDITOR.input);
		
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