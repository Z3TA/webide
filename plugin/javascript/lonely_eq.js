(function() {
	/*
		
		Warn if there is an assigment inside an if statement (a common JS bug)
		
		if (foo = bar) ...
		
		This plugin depends on colors.js to set quote / comment to true!
		Might need refactoring to make it independent!
		
		We do not have to check across several rows because having additional conditions with a=b will throw an error anyway!
		
		will Not throw error: if(a=b)
		will Not throw error: if(a=b && 1==1)
		but this will: if(1==1 && a=b) Invalid left-hand side in assignment
		
	*/
	
	EDITOR.on("start", main, 100); // Start after color.js
	
	function main() {
	EDITOR.preRenderFunctions.push(lonelyEq);
	}
	
	function lonelyEq(buffer, file) {
		// Prerenders must return the buffer!!
		
		// Only do this on .js files!
		if(file.fileExtension != "js") return buffer;
		
		
		//console.time("lonelyeq");
		
		var insideIf = false;
		var insideIfP = false;
		var left = 0;
		var right = 0;
		var lc = 0;
		var lcAtRow = 0;
		var lcAtCol = 0;
		var lastChar = "";
		var llChar = "";
		var char = "";
		
		var lonely = [];
		
		for (var row=0; row<buffer.length; row++) {
			for (var col=0; col<buffer[row].length; col++) {
				
				llChar = lastChar;
				lastChar = char;
				
				char = buffer[row][col].char;
				
				if(!buffer[row][col].comment && !buffer[row][col].quote && !(file.caret.row == row)) {
					
					//console.log("char=" + char);
					
				if(char == " " && lastChar == "f" && llChar == "i") {
					insideIf = true;
				}
				else if(char == "(" && lastChar == "f" && llChar == "i") {
					insideIf = true;
					insideIfP = true;
					left = 1;
				}
				else if(insideIf) {
					
					if(char=="(") {
							insideIfP = true;
							left++;
					}
					else if(char == ")") {
						if(insideIfP) right++;
						
						//console.log("insideIf=" + insideIf + " insideIfP=" + insideIfP + " left=" + left + " right=" + right);
						
						if(left == right) {
							insideIfP = false;
							insideIf = false;
							left=0;
							right=0;
						}
					}
						else if(char == "="  && lastChar != "!" && lastChar != ">" && lastChar != "<" && llChar != "!") {
						lc++;
							if(lc==1) {
						lcAtRow = row;
							lcAtCol = col;
						}
						}
					else {
						
						if(lc==1) {
								// Lonely = found!
								lonely.push([lcAtRow, lcAtCol]);
							
						}
						
						lc=0;
					}
					
				}
				
				}
				
			}
			
			// End of row
			
			insideIf = false;
			left = 0;
			right = 0;
			lc = 0;
		}
		
		for (var i=0; i<lonely.length; i++) {
			buffer[ lonely[i][0] ][ lonely[i][1] ].circle = true;
		}
		
		//console.timeEnd("lonelyeq");
		
		return buffer;
	}
	
	
	
})();
