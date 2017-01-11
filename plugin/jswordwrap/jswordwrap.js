(function() {
	"use strict";
	
	// Add plugin to editor
	editor.plugin({
		desc: "Word wrap JavaScript to fit inside line length limit",
		load: load,
		unload: unload,
	});
	
	function load() {
		
		var W = 87;
		
		editor.bindKey({desc: "Word wrap JavaScript", fun: wordWrapJs, charCode: W, combo: CTRL});
	}
	
	function unload() {
		editor.unbindKey(wordWrapJs);
	}
	
	
	function wordWrapJs(file, combo, character, charCode, direction, targetElementClass) {
		
		//alertBox("wordWrapJs");
		
		var maxTextWidth = editor.view.visibleColumns;
		
		// # Find the text to reformat
		var index = file.caret.index;
		var grid = file.grid;
		
		for(var firstRow=file.caret.row; firstRow>-1; firstRow--) {
			if(grid[firstRow].length == 0) {// Found row with no text
				firstRow++; // Start with the row that has text on it
				break; 
			}
		}
		for(var lastRow=file.caret.row; lastRow<grid.length; lastRow++) {
			if(grid[lastRow].length == 0) { // Found row with no text
				lastRow--; // End with a row that has text on it
				break; 
			}
		}
		
		console.log("firstRow=" + firstRow + " lastRow=" + lastRow);
		
		// Find indentation diff
		var baseIndentation = grid[firstRow].indentation;
		for(var row=firstRow; row<lastRow; row++) {
			console.log("firstRow row=" + row + " indentation=" + grid[row].indentation);
			if(grid[row].indentation > baseIndentation) {
				firstRow = Math.min(row - 1, firstRow);
				break;
			}
			
		}
		for(var row=firstRow+1; row<grid.length; row++) {
			console.log("lastRow row=" + row + " indentation=" + grid[row].indentation);
			if(grid[row].indentation == baseIndentation) {
				lastRow = Math.max(row, lastRow);
				break;
			}
			
		}
		
		var firstLine = firstRow + 1;
		var lasttLine = lastRow + 1;
		alertBox("wrap firstLine=" + firstLine + " to lasttLine=" + lasttLine);
		
		// # Get char index
		var firstIndex = grid[firstRow].startIndex - grid[firstRow].indentationCharacters;
		
		if(lastIndex < (grid.lenght -1)) var lastIndex = grid[lastRow+1].startIndex - grid[firstRow+1].indentationCharacters;
		else var lastIndex = file.text.length;
		
		// Get the text
		var text = file.text.substring(firstIndex, lastIndex);
		
		var prettier = require("./plugin/jswordwrap/node_modules/prettier/");
		
		var formattedText = prettier.format(source, {
			// Fit code within this line limit
			printWidth: maxTextWidth,
			
			// Number of spaces it should use per tab
			tabWidth: file.indentation.length,
			
			// Use the flow parser instead of babylon
			useFlowParser: false,
			
			// If true, will use single instead of double quotes
			singleQuote: false,
			
			// Controls the printing of trailing commas wherever possible
			trailingComma: false,
			
			// Controls the printing of spaces inside array and objects
			bracketSpacing: true
		});
		
		file.replaceText(text, formattedText);
			
			
			return false;
		}
	
})();