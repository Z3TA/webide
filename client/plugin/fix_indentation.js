(function() {
	
	"use strict";
	
	EDITOR.plugin({
		desc: "Adds or removes indentation characters in the source file so that your colleges with inferior editors doesn’t complain.",
		load: fixIndentationMain,
		unload: unloadFixIndentationPlugin,
	});
	
	var somethingChanged = false; // Call a file.parsed event if we change anything ...
	
	var indentationBefore;
	
	function unloadFixIndentationPlugin() {
		EDITOR.removeEvent("fileChange", takeOwnageOnChange);
		EDITOR.removeEvent("fileChange", checkIndentationOnBeforeParser);
		EDITOR.removeEvent("beforeSave", fixIndentationBeforeSave);
	}
	
	function fixIndentationMain() {
		
		/*
			Problem: 
			If this runs before the jsParser, we will not have any editor indentation
			But if we run it after the jsParser, indexes for comments etc will be off!
			
			Solution:
			
			1. Parse file
			2. Fix indentation of inserted text
			3. Fix index's for comments etc!
			
		*/
		
		var runOrderOfParser = 100; 
		
		// Make sure this runs after the parser
		//EDITOR.on("fileChange", fixIndentationOnChange, runOrderOfParser+20);
		EDITOR.on("fileChange", takeOwnageOnChange);
		
		// Make sure this runs before the parser
		EDITOR.on("fileChange", checkIndentationOnBeforeParser, runOrderOfParser-20);
		
		EDITOR.on("beforeSave", fixIndentationBeforeSave);
		
		/*
			if(window.location.href.indexOf("checkIndentation") != -1) {
		// Make sure this runs after fixIndentationOnChange
		EDITOR.on("fileChange", checkIndentationAfterFix, runOrderOfParser+20+5);
		
		// Make sure this runs after the parser
		EDITOR.on("fileOpen", checkIndentationOnFileOpen, runOrderOfParser+20);
	}
		*/

	}
	
	function checkIndentationOnFileOpen(file) {
		
		if(file.mode != "code") return true; // Only check for files that are parsed
		
		// Asume the file has already been parsed!
		if(!file.parsed) throw new Error("The file has not been parsed!");
		
		var spaces = 1;
		if(file.indentationCharacters.indexOf(" ") == 0) spaces = file.indentationCharacters.length;
		
		var indentationMissmatchRow = -1;
		for(var row = 0; row<file.grid.length; row++) {
			if(file.grid[row].indentation != file.grid[row].indentationCharacters.length / spaces) {
				indentationMissmatchRow = row;
				break;
	}
		}
	
		if(indentationMissmatchRow != -1) {
			var yes = "Fix indentation";
			var no = "Leave it as is";
			
			confirmBox("Fix indentation in " + file.path + " ?\nLine " + (indentationMissmatchRow+1) + 
			" has " + file.grid[row].indentation + " levels of indentation while the source file has " + 
			UTIL.lbChars(file.grid[row].indentationCharacters), [yes, no], function (answer) {
				if(answer == yes) {
					file.fixIndentation();
				}
			});
			}
	}
	
	
	function checkIndentationAfterFix(file, typeOfFileChange) {
		// Try to detect bugs in this plugin
		if(!EDITOR.settings.devMode) return true; 
		
		console.time("Check indentation after fix on file update");
		
		for(var row = 0; row<file.grid.length; row++) {
			if(file.grid[row].indentation != file.grid[row].indentationCharacters.length) {
				console.warn("row=" + row + " indentation=" + file.grid[row].indentation + 
				" indentationCharacters=" + UTIL.lbChars(file.grid[row].indentationCharacters) + 
				" owned=" + file.grid[row].owned);
				//if(showAlert) alertBox("Inconsistent indentation on line " + (row+1) + ". Expected " + file.grid[row].indentation + 
					//" characters but there are " + file.grid[row].indentationCharacters.length + " (" + UTIL.lbChars(file.grid[row].indentationCharacters) + ")");
				}
		}
		
		console.timeEnd("Check indentation after fix on file update");
	}
	
	function checkIndentationOnBeforeParser(file, type, character, index, row, col) {
		
		if(file.mode != "code") return true; // Don't bother checking indentation of non code
		
		// Check the indentation of the surrounding rows BEFORE the parsed kicks in and updates the indentation
		
		indentationBefore = indentationAround(file, row);
		
	}
	
	function indentationAround(file, row) {
		
		var above = -1;
		var below = -1;
		var current = file.grid[row].indentation;
		
		if(file.grid.length == 0) {
			throw new Error("The grid length can not be zero!");
		}
		else if(file.grid.length == 1) {
			above = current;
			below = current;
		}
		else if(row == 0) {
			above = current;
			below = file.grid[row+1].indentation;
		}
		else if(row == (file.grid.length-1)) {
			above = file.grid[row-1].indentation;
			below = current;
		}
		else {
			 above = file.grid[row-1].indentation;
			 below = file.grid[row+1].indentation
		}
		
		if(above == -1) throw new Error("Failed to get indentation of row above (" + (row-1) + ")");
		if(below == -1) throw new Error("Failed to get indentation of row below (" + (row+1) + ")");
		
		return {above: above, below: below, current: current};
	}
	
	function takeOwnageOnChange(file, type, character, index, row, col) {
	if(file.mode != "code") return true; // Don't bother checking indentation of non code
		if(!file.parsed) return true; // Don't bother with files that has not been parsed
		if(file.parsed.blockMatch !== true && file.parsed.blockMatch !== false) return true; // Something is not right
		
		if(file.parsed.blockMatch === false) return true; // Don't do anything if there is a block missmatch
		
		if(type=="linebreak") {
			// We now "own" this new line.
			var newRowNr = row+1;
			file.grid[newRowNr].owned = true;
			if(file.grid.length <= 2 && newRowNr > 0) {
				file.grid[row].owned = true; // Also take ownership of the start row
				}
			return true;
		}
		else if(type=="text") {
			// A bunch of text was inserted. We own this text !
			for(var i = row; i<=file.caret.row; i++) {
				file.grid[i].owned = true; // Take ownership because a bunch of text was inserted.
				}
			return true;
		}
		else if(type=="insert") {
			// A character was inserted.
			if(file.grid[row].length == 1) file.grid[row].owned = true; // We put the first char on this line, so we now own it
			}
		
		if(!indentationBefore) return true; // For exampe when reloading from disk without changing the file
		
		var indentation = indentationAround(file, row);
		
		if(indentation == null) throw new Error("(in)sanity: file.path=" + file.path + " row=" + row + " indentation=" + indentation);
		
		if(indentationBefore.below == indentation.below && indentationBefore.above == indentation.above) return true;
		
		if(insideParsedObject(file.caret.index, file.parsed.quotes) || insideParsedObject(file.caret.index, file.parsed.comments)) return true;
		
		var rowIndentation = 0;
		if(indentation.below != indentationBefore.below && file.grid.length > (row+1)) {
			// Take ownership until the code block below ends
			var currentIndentation = file.grid[row].indentation;
			
			for (var i=row+1; i<file.grid.length; i++) {
				rowIndentation = file.grid[i].indentation;
				
				//console.log("currentIndentation=" + currentIndentation + " rowIndentation=" + rowIndentation);
				
				file.grid[i].owned = true;
				
				if(rowIndentation == currentIndentation) break;
				}
		}
		else if(indentation.above != indentationBefore.above && row > 0) {
			var currentIndentation = file.grid[row].indentation;
			for (var i=row-1; i>-1; i--) {
				rowIndentation = file.grid[i].indentation;
				
				file.grid[i].owned = true;
				
				if(rowIndentation == currentIndentation) break;
			}
		}
	}
	
	function fixIndentationBeforeSave(file, callback) {
		for (var row=0; row<file.grid.length; row++) {
			if(file.grid[row].owned) fixIndentation(file, row);
		}
		return true; // We must return true XOR call the callback!
	}
	
	function fixIndentationOnChange(file, type, character, index, row, col) {
		
		if(file.mode != "code") return true; // Don't bother checking indentation of non code
		
		// Only fix indentation if the parser has parsed the blocks so we know how much indentation to use
		if(!file.parsed) {
			console.log("File has not been parsed: " + file.path);
			return done();
		}
		if(file.parsed.blockMatch !== true && file.parsed.blockMatch !== false) return done();
		
		if(file.parsed.blockMatch === false) return true; // Don't fix indentation if there's a block missmatch
		
		if(type=="linebreak") {
			// We now "own" this new line. And nobody will complain if we fix indentation ...
			var newRowNr = row+1; 
			file.grid[newRowNr].owned = true;
			if(file.grid.length <= 2 && newRowNr > 0) {
				file.grid[row].owned = true; // Also take ownership of the start row
				fixIndentation(file, row); // The line the user was on when pressing Enter
			}
			fixIndentation(file, newRowNr); // The new line just inserted 
			//file.grid[row+1].unshift(new Box("*"));
			return done();
		}
		else if(type=="text") {
			// A bunch of text was inserted. We own this text so it's safe to fix indentation ...
			for(var i = row; i<=file.caret.row; i++) {
				file.grid[i].owned = true; // Take ownership because a bunch of text was inserted.
				fixIndentation(file, i);
			}
			return done();
		}
		else if(type=="insert") {
			// A character was inserted.
			if(file.grid[row].length == 1) file.grid[row].owned = true; // We put the first char on this line, so we now own it
			if(file.grid[row].owned) fixIndentation(file, row); // Fix indentation on the row if we own it
		}

		if(!file.parsed.blockMatch) return done();
		
		// Note: It might not be a JavaScript file! It can also be a vbScript file, so we can not depend on matching angel brackets
		
		// Check if the row above or below has a different indentation comparing to before the parse, then fix all rows in that block

		if(!indentationBefore) return true; // For exampe when reloading from disk without changing the file
		
		var indentation = indentationAround(file, row);
		
		if(indentation == null) throw new Error("(in)sanity: file.path=" + file.path + " row=" + row + " indentation=" + indentation);
		
		if(indentationBefore.below == indentation.below && indentationBefore.above == indentation.above) return done();
		
		if(insideParsedObject(file.caret.index, file.parsed.quotes) || insideParsedObject(file.caret.index, file.parsed.comments)) return done();
		
		var rowIndentation = 0;
		if(indentation.below != indentationBefore.below && file.grid.length > (row+1)) {
			// Take ownership and fix indentation until the code block below ends
			var currentIndentation = file.grid[row].indentation;
			
			for (var i=row+1; i<file.grid.length; i++) {
				rowIndentation = file.grid[i].indentation;
				
				//console.log("currentIndentation=" + currentIndentation + " rowIndentation=" + rowIndentation);
				
				file.grid[i].owned = true;
				fixIndentation(file, i);
				
				if(rowIndentation == currentIndentation) break;
				
			}
		}
		else if(indentation.above != indentationBefore.above && row > 0) {
			// Fix indentation until the code block above ends
			var currentIndentation = file.grid[row].indentation;
			for (var i=row-1; i>-1; i--) {
				rowIndentation = file.grid[i].indentation;
				
				file.grid[i].owned = true;
				fixIndentation(file, i);
				
				if(rowIndentation == currentIndentation) break;
			}
		}
		
		return done();
		
		function done() {
			var ret = !somethingChanged;
			if(somethingChanged) file.haveParsed(file.parsed); // Call events depending on the parsed data
			somethingChanged = false;
			return ret;
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
		console.log("currentIndentationCharacters='" + currentIndentationCharacters + "' (" + currentIndentationCharacters.length + ")");
		console.log("shouldHaveIndentationCharacters='" + shouldHaveIndentationCharacters + "' (" + shouldHaveIndentationCharacters.length + ")");
		
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
			if(file.caret.row >= row) file.caret.index += totalCharactersAdded;
			
			// Update index's for parsed data
			var js = file.parsed;
			
			// return {functions: functions, quotes: quotes, comments: comments, globalVariables: globalVariables};
			
			// Update functions
			for(var fun, i=0; i<js.functions.length; i++) {
				fun = js.functions[i];
				if(fun.end >= index || fun.start >= index) {
					updateFunction(fun);
					somethingChanged = true;
				}
			}
			
			// Update quotes
			//console.log("js.quotes=" + JSON.stringify(js.quotes));
			if(js.quotes) {
				var quote;
				for(var i=js.quotes.length-1; i>-1; i--) { // start from bottom
					quote = js.quotes[i];
					//console.log("quote.start=" + quote.start + " quote.end=" + quote.end + " index=" + index);
					if(quote.start >= index || quote.end >= index) {
						if(quote.start >= index) quote.start += totalCharactersAdded;
						if(quote.end >= index) quote.end += totalCharactersAdded;
						somethingChanged = true;
					}
					else {
						break;
					}
				}
			}
			
			// Update comments
			if(js.comments) {
				var comment;
				for(var i=js.comments.length-1; i>-1; i--) { // start from bottom
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
			}
			
			// Update xmlTags
			if(js.xmlTags) {
				var xmlTag;
				for(var i=js.xmlTags.length-1; i>-1; i--) { // start from bottom
					xmlTag = js.xmlTags[i];
					if(xmlTag.start >= index || xmlTag.end >= index) {
						if(xmlTag.start >= index) xmlTag.start += totalCharactersAdded;
						if(xmlTag.end >= index) xmlTag.end += totalCharactersAdded;
						somethingChanged = true;
					}
					else {
						break;
					}
				}
			}
		}
		
		file.sanityCheck();
		
		function updateFunction(fun) {
			if(index <= fun.start) fun.start += totalCharactersAdded;
			if(index <= fun.end) fun.end += totalCharactersAdded;
			for(var i=0; i<fun.subFunctions.length; i++) {
				updateFunction(fun.subFunctions[i]);
			}
		}
		
	}
	
	function insideParsedObject(index, parsedObj) {
	
		if(!parsedObj) throw new Error("Can not determine if we are inside parsedObj=" + parsedObj + "!");
		
		if(parsedObj.length == 0) return false;
		
		if(index < parsedObj[0].start) return false;
		if(index > parsedObj[parsedObj.length-1].end) return false;
		
		for(var i=0; i<parsedObj.length; i++) {
			if(parsedObj[i].start <=index && parsedObj[i].end >= index) return true;
		}
		
		return false;
	}
	
	
})();