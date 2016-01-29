(function() {
	
	"use strict";
	
	editor.on("start", fixIndentationMain);
	
	function fixIndentationMain() {
	
		/*
			Problem: 
			If this runs before the jsParser, we will not have any editor indentation
			But if we run it after the jsParser, indexes for comments etc will be off!
			
			Solution:
			
			1. Parse file
			2. Fix indentation of inserted text
			3. Parse file again, or fix index's for comments etc?
			
		*/
		
		
		editor.on("edit", onEdit, 110);

	}

	function onEdit(file, type, character, index, row, col) {
		
		// todo: Only do this for files parsed by jsParser! (or we will fuck up files parsed by other parsers. unless ... we are very strict on what a parser should return)
		
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
		
		console.log("Fixing indentation on row=" + row);
		
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
			
			// Update index's for parsed data
			var js = file.parsed;
			var somethingChanged = false;
			
			// 		return {functions: functions, quotes: quotes, comments: comments, globalVariables: globalVariables};
			
			// Update functions
			var fun;
			for(var name in js.functions) {
				fun = js.functions[name];
				if(fun.end >= index || fun.start >= index) {
					updateFunction(fun);
					somethingChanged = true;
				}
			}
			
			// Update quotes
			var quote;
			for(var i=js.quotes.length-1; i>0; i--) { // start from bottom
				quote = js.quotes[i];
				if(quote.start >= index || quote.end >= index) {
					if(quote.start >= index) quote.start += totalCharactersAdded;
					if(quote.end >= index) quote.end += totalCharactersAdded;
					somethingChanged = true;
				}
				else {
					break;
				}
			}
			
			// Update comments
			var comment;
			for(var i=js.comments.length-1; i>0; i--) { // start from bottom
				comment = js.comments[i];
				if(comment.start >= index || comment.end >= index) {
					if(comment.start >= index) comment.start += totalCharactersAdded;
					if(comment.end >= index) comment.end += totalCharactersAdded;
					somethingChanged = true;
				}
				else {
					break;
				}
			}
			
			if(somethingChanged) file.haveParsed(js);
			
		}
		
		file.sanityCheck();
		
		function updateFunction(fun) {
			if(index <= fun.start) fun.start += totalCharactersAdded;
			if(index <= fun.end) fun.end += totalCharactersAdded;
			for(var name in fun.subFunctions) {
				updateFunction(fun.subFunctions[name]);
			}
		}
		
	}

})();