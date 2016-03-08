(function() {
	
	/*
		
		DEPRECATED! We didn't need this.
		
		
		After we implemented the warnings for lonely = inside if statements, 
		we should auto insert ) after ( inside if's or warnings will show on var foo = bar
		
		And auto insert extra = inside if statements.
		
	*/
	
	"use strict";
	
	var eq = "=";
	var lP = "(";
	var rP = ")";
	
	editor.on("fileChange", onEdit);
	
	function onEdit(file, type, character, index, row, col) {
		
		if(!file.parse) return; // Do nothing if the file hasn't been parsed (non JS). Probably need to refactor parsing if we add more parsers for other languages
		
		if(type=="insert" && col >= 2) {
			
			var lastChar = file.grid[row][col-1].char;
			var llChar = file.grid[row][col-2].char;
			var nextChar = (col<file.grid[row].length-1) ? file.grid[row][col+1].char : "";
			
			var aIf = afterIf();
			
			console.log("aIf=" + aIf + " lastChar=" + lastChar + " llChar=" + llChar + " nextChar=" + nextChar);
			
			if(character == eq && aIf && lastChar != eq) {
				file.putCharacter(eq);
			}
			else if(character == lP && aIf)  { // ### Auto insert a right paranthesis after inserting a left paranthesis.
				file.putCharacter(rP);
				file.moveCaretLeft();
			}
			else if(character == rP && lastChar == lP && nextChar == rP && !pMatch()) { // fix: if (|))
				file.moveCaretLeft();
				file.deleteCharacter();
			}
		}
		
		function pMatch() {
			var char = "";
			var lc = 0;
			var rc = 0;
			
			for (var i=0; i<file.grid[row].length; i++) {
				char = file.grid[row][i].char;
				if(char=="(") lc++
				else if(char==")") rc++;
			}
			return lc==rc;
		}
			
			function afterIf(text, index) {
				
				//if(insideQuote())
				
				
				// Search left
				var char1 = "";
				var char2 = "";
				var char3 = "";
				
				for (var i=col; i>-1; i--) {
					char3 = char2;
					char2 = char1;
					char1 = file.grid[row][i].char;
					
					console.log("char1=" + char1 + " char2=" + char2 + " char3=" + char3 + " col=" + col + " i=" + i + " col-i=" + (col-i));
					
					if( char1 == "i" && char2 == "f" &&  (char3 == "(" || char3 == " " || (col-i) == 2)) {
						return true;
					}
				}
				
				return false;
			}
	}
	
		
})();