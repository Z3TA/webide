(function() {
	
	/*
		
		
	*/
	
	"use strict";
	
	var eq = "=";
	var lP = "(";
	var rP = ")";
	
	editor.on("fileChange", onEdit);
	
	function onEdit(file, type, character, index, row, col) {
		
		if(!file.parse) return; // Do nothing if the file hasn't been parsed (non JS). Probably need to refactor parsing if we add more parsers for other languages
		
		if(type=="insert") {
			
			if(character == eq && afterIf()) {
				file.putCharacter(eq);
			}
			else if(character == lP && afterIf())  {
				file.putCharacter(rP);
				file.moveCaretLeft();
			}
			}
	}
	
	
	function afterIf(text, index) {
		// Search left
		var char1 = "";
		var char2 = "";
		var char3 = "";
		
		for (var i=col; i>-1; i--) {
			char3 = char2;
			char2 = char1;
			char1 = file.grid[row][i].char;
			
			if( (char1 == "(" || char1 == " ") && char2 == "f" && char3 == "i") ) {
				return true;
			}
		}
		
		return false;
	}
		
		
})();