(function() {
	/*

	Insert semicolon after var , because forgetting this might give you bugs!

	*/
	"use strict";
		
	editor.on("start", autoSemicolonMain);
	
	function autoSemicolonMain() {
	
		editor.on("edit", onEdit);

	}

	function onEdit(file, type, character, index, row, col) {
	
		if(type=="insert") {
			
			// Get last 4 characters to see if it's var or let
			
			if(col > 3) {
				var str = "";
				
			}
	
			if(character == singleQuote || character == dblQuote) autoQuote(file, type, character, index, row, col);
			
		}
		
		
	}


})();