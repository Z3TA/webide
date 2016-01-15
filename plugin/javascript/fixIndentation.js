(function() {
	
	"use strict";
	
	editor.on("start", fixIndentationMain);
	
	function fixIndentationMain() {
	
		editor.on("edit", onEdit, 10); // Make sure jsParser runs first!

	}

	function onEdit(file, type, character, index, row, col) {
		
		if(type=="linebreak") {
			// We now "own" this new line. And nobody will complain if we fix indentation ...
			fixIndentation(file, row);
			fixIndentation(file, row+1);
			//file.grid[row+1].unshift(new Box("*"));
		}
		else if(type=="text") {
			// A bunch of text was inserted. We own this text so it's safe to fix indentation ...
			for(var i = row; i<=file.caret.row; i++) {
				fixIndentation(file, i);
			}
		}
	
	}
	
	function fixIndentation(file, row) {
		
		console.log("Fixing indentation");
		
		var grid = file.grid,
			gridRow = grid[row],
			currentIndentationCharacters = gridRow.indentationCharacters,
			defaultIndentationCharacters = file.indentation,
			shouldHaveIndentationCharacters = "",
			indentation = gridRow.indentation,
			charactersToRemove = 0,
			charactersToAdd = 0,
			totalCharactersAdded = 0,
			index = gridRow.startIndex;
			
		for(var i=0; i<indentation; i++) {
			shouldHaveIndentationCharacters += defaultIndentationCharacters;
		}
		
		//console.log("defaultIndentationCharacters=" + defaultIndentationCharacters + " (" + defaultIndentationCharacters.length + ")");
		//console.log("currentIndentationCharacters=" + currentIndentationCharacters + " (" + currentIndentationCharacters.length + ")");
		//console.log("shouldHaveIndentationCharacters=" + shouldHaveIndentationCharacters + " (" + shouldHaveIndentationCharacters.length + ")");
		
		if(shouldHaveIndentationCharacters == currentIndentationCharacters) {
			return; // Do nothing 
		}
		else if(currentIndentationCharacters.length == shouldHaveIndentationCharacters.length) {
			// We only have to replace them!
			gridRow.indentationCharacters = shouldHaveIndentationCharacters;
		}
		else {
			// We'll remove the current characters and add the new ones
			charactersToRemove = currentIndentationCharacters.length;
			charactersToAdd = shouldHaveIndentationCharacters.length;
			totalCharactersAdded = charactersToAdd - charactersToRemove;
			
			gridRow.indentationCharacters = shouldHaveIndentationCharacters;
			
			// Remove
			//file.text = file.text.substr(0, index-charactersToRemove) + file.text.substring(index, file.text.length);

			// Remove and add
			file.text = file.text.substr(0, index-charactersToRemove) + gridRow.indentationCharacters + file.text.substring(index, file.text.length);

			// Update indexes
			for(var i=row; i<grid.length; i++) {
				grid[i].startIndex += totalCharactersAdded;
				
				for(var j=0; j<grid[i].length; j++) {
					
					//console.log("grid[" + i + "][" + j + "]=" + grid[i][j]);
					
					grid[i][j].index += totalCharactersAdded;
				}
			}
			
			// Update caret index
			file.caret.index += totalCharactersAdded;
			
		}
		
		file.sanityCheck();
		
		
		
	}

})();