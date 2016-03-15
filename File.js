/*
	The Global File interface. 
	Feel free to add additional methods to this object here! Don't extend it elsewhere!
*/

"use strict";

(function() { // Allows private variables
	
	// Note: No var infront. Expose this object to global scope!
	File = function File(text, path, fileIndex, bigFile) { 
		var file = this;
		
		if(!isString(text)) console.error(new Error("text is not a string!"));

		file.text = text;
		file.path = path;
		file.isBig = bigFile ? true : false;
		file.index = fileIndex;
		file.order = fileIndex; // For ordering files, in for example a tab list
		
		file.name = editor.getFilenameFromPath(path);
		
		file.lineBreak = determineLineBreakCharacters(text);
		console.log("file.lineBreak=" + file.lineBreak.replace(/\r/g, "CR").replace(/\n/g, "LF"));


		file.text = fixInconsistentLineBreaks(text, file.lineBreak);

		
		file.indentation = determineIndentationConvention(text, file.lineBreak);
		
		file.partStartRow = 0;
		file.tail = false; // We are on the last part of the stream if true
		file.head = false, // We are on the first part of the stream if true
		
		file.isStreaming = false; // If the file is currently pulling data from the file read stream
		file.render = true; // Can (temporary) disable rendering for this file by setting it to false
		
		file.startRow = 0;    // Scrolling up/down
		file.startColumn = 0; // Scrolling left/right
		
		file.selected = []; // Selected text boxes
		file.highlighted = []; // Highlighted text boxes
		
		file.changed = false; // If the file has changed from last save
		file.isSaved = false;
		file.savedAs = false;
		
		file.fileExtension = editor.getFileExtension(path);
		file.parsed = {}; // After the file has been parsed, "file.parsed" property should hold the parsed data
		file.lastChange = new Date();
		
		file.parse = true; // Always parse new files by default

		//if(file.fileExtension == "txt" || file.fileExtension == "md") file.parse = false; // Never parse text or markdown files

		
		// The grid ... A digital frontier ... I tried to picture clusters of information ... And then ... One day ... I got in!!!

		file.grid = file.createGrid();
		file.totalRows = file.grid.length-2;
		console.log("file.totalRows=" + file.totalRows);
		
		file.caret = file.createCaret(0,0,0); // Create the caret, even if it's a stream
	
		if(file.isBig) {
			file.parse = false; // Do not parse big files

			loadFilePart(file, file.partStartRow);
		
		}	
	}
	


	function fixInconsistentLineBreaks(text, lineBreak) {
		
		if(lineBreak == "\r\n") {
			console.log("Searching for lonely (LF) \\n characters ... ");
				
			var fixedILF = false;
			var indexILF = text.indexOf("\n");
			var rowCount = 0;
			while(indexILF > -1) {
				if(text.charAt(indexILF-1) != "\r") {
					if(!fixedILF) console.log("text:\n" + text.replace(/ /g, "~").replace(/\r/g, "CR").replace(/\n/g, "LF\n"));
					text = text.substring(0, indexILF) + "\r" + text.substring(indexILF);
					console.log("Inserted (CR) on index=" + indexILF);
					fixedILF = true;
				}
				rowCount++;
				indexILF = text.indexOf("\n", indexILF+1);
			}
			
			if(fixedILF) {
				console.warn("Fixed inconsitent line breaks! (line: " + (rowCount+1) + ")");
			}
		}
			
		return text;
	}
	
	File.prototype.mutateCaret = function(oldCaret, newCaret) {
		/*
			Takes all properties from newCaret and gives it to oldCaret
			Can be used to mutate, clone, or copy the caret object
			
			Consider using File.fixCaret() !
		*/
		
		if(typeof oldCaret != "object") {
			console.error(new Error("Caret (first argument) need to be an object! (but not necessarily a caret)"));
		}
		
		var file = this;
		
		file.checkCaret(newCaret);
		
		oldCaret.index = newCaret.index;
		oldCaret.col = newCaret.col;
		oldCaret.row = newCaret.row;
		oldCaret.eol = newCaret.eol;
		oldCaret.eof = newCaret.eof;
		
		return oldCaret;
	}
	
	
	File.prototype.moveCaret = function(index, row, col) {
		
		if(index != undefined) file.caret.index = index;
		if(row != undefined) file.caret.row = row;
		if(col != undefined) file.caret.col = col;
		
		file.fixCaret();
		
		editor.fireEvent("moveCaret", file, file.caret);
		
	}
	
	
	
	
	File.prototype.createCaret = function(index, row, col) {
		/*
			Returns a valid caret position
			
			16259=102| 16260=117| 16261=110| 16262=99| 16263=116| 16264=105| 16265=111| 16266=110| 16267=76| 16268=105| 16269=115| 16270=116| 16271=87| 16272=114| 16273=97| 16274=112| 16275=46| 16276=115|
			
			Creating caret at index=16265 row=675 col=0
			grid[675].length=0
			grid[675].startIndex=16329
			
			Character "o" (111) at the caret.index=16265, should be either a Line Feed (10) or Carriage return (13) when caret.eol = true and not caret.eof=true
			File size=36411 rows=1464
			
		*/
		
		var file = this,
			grid = file.grid,
			caret = {index: index, row: row, col: col, eol: false, eof: false};
		
		
		if(file.grid.length == 0) {
			if(index == 0 && row == 0 && col == 0) {
				caret.eof = true;
				caret.eol = true;
				return caret;
			}
			else {
				console.error(new Error("Can't place the caret on index=" + index + " row=" + row + " col=" + col + " when file.grid.length=" + file.grid.length + " !"));
			}
		}
		
		if(index > 0) file.checkGrid();
		
		//console.log("caret=" + JSON.stringify(caret));
		
		
		if(index === undefined && (row === undefined || col === undefined)) {
			// We have nothing
			//console.log("Placing new caret at the first column");
			
			if(file.text.length > 0) {
				var firstColumn = file.grid[0][0];
				caret.index = firstColumn.index;
				caret.row = 0;
				caret.col = 0;
				caret.eol = false;
				caret.eof = false;
			}
			else {
				caret.index = 0;
				caret.row = 0;
				caret.col = 0;
				caret.eol = true;
				caret.eof = true;
			}
		}
		else if(row === undefined || col === undefined){
			// We have index, but not row AND col
			if(isNaN(index)) {
				console.error(new Error("Index is not a number!"));
			}
			else {
				console.log("Placing new caret at index=" + index + " (character=" + file.text.charAt(index) + " charCode=" + file.text.charCodeAt(index) + ")");
				return file.moveCaretToIndex(index, caret);
			}
		}
		else {
			// We have row and col!
			caret.index = file.getIndexFromRowCol(row, col);
		}
		
		
		//console.log("Creating caret at index=" + caret.index + " row=" + caret.row + " col=" + caret.col + "");
		
		
		// Check valid data (this should / could be omitted) ...
		if(grid.length < caret.row) {
			console.error(new Error("Row " + caret.row + " is higher then last row=" + grid.length + ""));
		}
		else if(caret.row < 0) {
			console.error(new Error("Caret row=" + caret.row + " must be higher then zero!"));
		}
		else if(grid[row].length < caret.col) {
			console.error(new Error("Caret col=" + caret.col + " is higher then available columns on row " + caret.row + ", witch is " + grid[row].length + ""));
		}
		else if(caret.col < 0) {
			console.error(new Error("Caret col=" + caret.col + " must be higher then zero!"));
		}
		
		console.log("grid[" + caret.row + "].length=" + grid[caret.row].length);
		console.log("grid[" + caret.row + "].startIndex=" + grid[caret.row].startIndex);
		
		
		// Apply eol, eof ...
		if(caret.col == grid[caret.row].length) {
			
			caret.eol = true;
			
			if(caret.index == file.text.length) {
				caret.eof = true;
			}
			else {
				caret.eof = false;
			}
		}
		else {
			caret.eol = false;
			caret.eof = false;
		}
		
		if(!caret.eol) {
			if(grid[caret.row][caret.col].index != caret.index) {
				console.warn("Caret index=" + caret.index + " is not the same as the index on row=" + caret.row + " and col=" + caret.col + ", and will change to that index=" + grid[caret.row][caret.col].index + "!");
				caret.index = grid[caret.row][caret.col].index;
			}
		}
		
		file.checkCaret(caret);
		
		return caret;
	}
	
	
	
	File.prototype.checkGrid = function() {
		// Sanity check for the grid to detect possible bugs
		
		if(editor.settings.devMode == false) {
			return;
		}
		
		var file = this,
			row = 0,
			col = 0,
			grid = file.grid,
			lastRow,
			expect,
			box,
			lineBreakCharacters;
		
		if(file.startRow % 1 > 0) console.error(new Error("file.startRow=" + file.startRow + " Needs to be an integer!"));
		
		if(file.startRow < 0) console.error(new Error("file.startRow=" + file.startRow + " editor.view.visibleRows=" + editor.view.visibleRows + ""));
		if(file.startRow >= grid.length) console.error(new Error("file.startRow=" + file.startRow + " grid.length=" + grid.length));
		
		
		for(var i=0; i<grid.length; i++) {
			
			// Check Startindex
			
			if(typeof grid[i].startIndex !== "number") console.error(new Error("startIndex of grid row=" + i + " is " + grid[i].startIndex + " (not a number)"));
			if(typeof grid[i].lineNumber !== "number") console.error(new Error("lineNumber of grid row=" + i + " is " + grid[i].lineNumber + " (not a number)"));
			if(typeof grid[i].indentation !== "number") console.error(new Error("indentation of grid row=" + i + " is " + grid[i].indentation + " (not a number)"));
			if(typeof grid[i].indentationCharacters !== "string") console.error(new Error("indentationCharacters of grid row=" + i + " is " + grid[i].indentationCharacters + " (not a string)"));
			
			
			if(grid[i].length > 0) {
				// Startindex should be the same as the index of the first letter box
				if(grid[i].startIndex != grid[i][0].index) {
					file.debugGrid();
					console.error(new Error("startIndex (" + grid[i].startIndex + ") on row " + i + " doesn't match index (" + grid[i][0].index + ") of first box=" + JSON.stringify(grid[i][0])));
				}
			}
			else if(i>0){
				lastRow = grid[i-1];
				// Startindex should be: lastrow.startIndex + lastRow.length + lineBreak.length + currentRow.indentationCharacters.length
				expect = lastRow.startIndex + lastRow.length + file.lineBreak.length + grid[i].indentationCharacters.length;
				if(grid[i].startIndex != expect) {
					file.debugGrid();
					console.error(new Error("Row " + i + " has startIndex=" + grid[i].startIndex + " but it was expected to be " + expect + ".\nlastRow.startIndex=" + lastRow.startIndex + " lastRow.indentationCharacters.length=" + lastRow.indentationCharacters.length + " lastRow.length=" + (lastRow.length) + " file.lineBreak.length=" + file.lineBreak.length + " currentRow.indentationCharacters.length=" + grid[i].indentationCharacters.length + " path=" + file.path));
				}
			}
			
			// Check Line number
			if(i>0){
				lastRow = grid[i-1];
				if((grid[i].lineNumber-1) != lastRow.lineNumber) {
					console.error(new Error("Line number of row " + i + " is " + grid[i].lineNumber + " but was expected to be " + (lastRow.lineNumber+1) + ". Row " + (i-1) + " lineNumber = " + lastRow.lineNumber + ""));
				}
			}
			
			
			// Check for line breaks
			if(i>0){
				lineBreakCharacters = "";
				for(var k=file.lineBreak.length; k>0; k--) {
					lineBreakCharacters += file.text.charAt(grid[i].startIndex - grid[i].indentationCharacters.length - k);
				}
				
				if(lineBreakCharacters != file.lineBreak) {
					expect = "";
					for(var k=0; k<file.lineBreak.length; k++) {
						expect += lineBreakCharacters.charCodeAt(k) + "==" + file.lineBreak.charCodeAt(k) + " "
					}
					file.debugGrid();
					console.error(new Error("Expected the last " + file.lineBreak.length + " characters(s) on Line " + i + " to be a line-break: (" + expect + ")"));
				}
			}
			
			// Check indentation
			if(grid[i].indentation < 0) {
				console.error(new Error("Indentation is " + grid[i].indentation + " or row " + i + "!"));
			}
			
			
			for(var j=0; j<grid[i].length; j++) {
				// Check if character on the grid and on file.text is the same
				if(grid[i][j].char != file.text.charAt(grid[i][j].index)) {
					console.error(new Error("grid[" + i + "][" + j + "].char=" + grid[i][j].char + " is not the same as file.text.charAt(" + grid[i][j].index + ")=" + file.text.charAt(grid[i][j].index + "")));
				}
				// Make sure there is no line break character in the middle of the text
				else if(file.text.charCodeAt(grid[i][j].index) == 10 || file.text.charCodeAt(grid[i][j].index) == 13) {
					console.error(new Error("grid[" + i + "][" + j + "].char=" + grid[i][j].char + " (" + file.text.charCodeAt(grid[i][j].index) + ") is a line break character!"));
				}
				
				// Make sure the box has these properties:
				box = grid[i][j];
				if(box.char === undefined) console.error(new Error("grid[" + i + "][" + j + "] doesn't have a char value!"));
				if(box.index === undefined) console.error(new Error("grid[" + i + "][" + j + "] doesn't have a index value!"));
				if(box.color === undefined) console.error(new Error("grid[" + i + "][" + j + "] doesn't have a color value!"));
				if(box.selected === undefined) console.error(new Error("grid[" + i + "][" + j + "] doesn't have a selected value!"));
				if(box.highlighted === undefined) console.error(new Error("grid[" + i + "][" + j + "] doesn't have a highlighted value!"));
				
			}
			
		}
		
		// Check if the scrolling is OK
		if(editor.view.endingColumn != file.startColumn + editor.view.visibleColumns) {
			console.error(new Error("Scrolling bug: editor.view.endingColumn=" + editor.view.endingColumn + " file.startColumn=" + file.startColumn + " editor.view.visibleColumns=" + editor.view.visibleColumns + " path=" + file.path));
		}
		
		
	}
	
	File.prototype.checkCaret = function(caret) {
		// Sanity check to detect possible bugs
		
		if(editor.settings.devMode == false) {
			return;
		}
		
		var file = this,
			char;
		
		if(caret == undefined) {
			//console.warn("No caret specified, checking file.caret ...");
			caret = file.caret;
		}
		
		//console.log("Checking caret=" + JSON.stringify(caret));
		
		if(caret.index == null) {
			console.error(new Error("Caret index is null!"));
		}
		else if(isNaN(caret.index)) {
			console.error(new Error("Caret index is NaN!"));
		}
		
		if(caret.eof) {
			if(caret.row != (file.grid.length-1)) {
				console.error(new Error("Caret on row " + caret.row + ". Expected it to be on row " + file.grid.length + " because caret.eof = true"));
			}
			else if(caret.eol != true) {
				console.error(new Error("Caret should be on EOL when caret.eof = true\ncaret=" + JSON.stringify(caret) + "\n" + "file.text.length=" + file.text.length + ""));
			}
		}
		if(caret.eol) {
			if(caret.col != file.grid[caret.row].length) {
				console.error(new Error("Caret on column " + caret.col + ". Expected it to be on column " + file.grid[caret.row].length + " because caret.eol = true"));
			}
			if(!caret.eof) {
				char = file.text.charAt(caret.index);
				if(char != "\r" && char != "\n") {
					file.debugGrid();
					console.error(new Error("Character \"" + char + "\" (" + char.charCodeAt(0) + ") at the caret.index=" + caret.index + ", should be either a Line Feed (10) or Carriage return (13) when caret.eol = true and not caret.eof=true\nFile size=" + file.text.length + " rows=" + (file.grid.length+1) + ""));
				}
			}
		}
		else if(!caret.eof) {
			if(!file.grid[caret.row][caret.col]) {
				console.error(new Error("file.grid[" + caret.row + "][" + caret.col + "]=" + file.grid[caret.row][caret.col]));
			}
			else if(file.grid[caret.row][caret.col].char != file.text.charAt(caret.index)) {
				console.error(new Error("Character \"" + file.grid[caret.row][caret.col].char + "\" on file.grid[" + caret.row + "][" + caret.col + "] is not the same as character \"" + file.text.charAt(caret.index) + "\" in file.text on caret.index=" + caret.index + ""));
			}
			else if(caret.index==file.text.length) {
				console.error(new Error("Caret should be on EOF! caret.index=" + caret.index + " file.text.length=" + file.text.length + ""));
			}
		}
		
		
	}
	
	File.prototype.sanityCheck = function() {
		var file = this;
		
		if(editor.settings.devMode == false) {
			return;
		}
		
		file.checkGrid();
		file.checkCaret();
		
		//file.debugGrid();
		
	}
	
	File.prototype.insertText = function(text, caret) {
		var file = this;
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		if(text == undefined) {
			console.error(new Error("No text to insert! text is undefined!"));
		}
		else if(typeof text != "string") {
			console.error(new Error("text need to be a string!\n" + text));
		}
		else if(text.length === 0) {
			console.warn("No text to insert! (text.length=" + text.length + ")");
			return;
		}
		
		file.sanityCheck();
		
		console.log("Inserting '" + text + "' (text.length=" + text.length + ") on " + JSON.stringify(caret) + " (file.text.length=" + file.text.length + ")");
		
		console.time("insertText");
		
		var index = caret.index;
		
		// Insert the text
		file.text = file.text.substr(0, index) + text + file.text.substring(index, file.text.length);
		
		/* 
			Update the grid ...
			It's probably faster to re-create the grid then to insert all characters one by one.
		*/
		file.grid = file.createGrid();
		
		
		// Save row and col
		var row = caret.row,
			col = caret.col;
		
		// Place the caret at the end of the inserted text
		var newCaret = file.createCaret(index + text.length); //  + 
		file.mutateCaret(caret, newCaret);
		
		console.timeEnd("insertText");
		
		//file.debugGrid();
		file.sanityCheck();
		
		file.change("text", text, index, row, col);
		
		
		editor.renderNeeded();
		
		
		
		return caret;
		
	}
	
	
	
	File.prototype.putCharacter = function(character, caret) {
		/*
			
			Do not worry about Word-wrap here, we'll only word-wrap the buffer on the fly!
			
		*/
		var file = this;
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		// Delete selection before putting character
		if(file.selected.length > 0) {
			file.deleteSelection();
			caret = file.caret;
			
			// Then it's proabably also highlighted, so remove the highlight
			//file.removeHighlights();
		}
		
		
		
		
		var grid = file.grid,
			row = caret.row,
			col = caret.col,
			index = caret.index;
		
		var renderRow = editor.settings.renderRowOptimization; // Optimization
		
		if(character == undefined) {
			console.error(new Error("character is undefined!"));
		}
		else if(character.charCodeAt(0) == 13) {
			console.error(new Error("Tried to insert a new line character"));
		}
		else if(character.charCodeAt(0) == 9) {
			console.error(new Error("Tried to insert a tab character"));
		}
		else if(character.charCodeAt(0) == 8) {
			console.error(new Error("Tried to insert a backspace character"));
		}
		else if(character.charCodeAt(0) < 32) {
			console.error(new Error("Tried to insert a control character (" + character + " = " + character.charCodeAt(0) + ")"));
			return;
		}
		
		
		if(character == "{" || character == "}") renderRow = false;
		
		// Sanity check in case someting is wrong
		file.sanityCheck();
		
		console.log("Inserting character: " + character);
		
		console.time("putCharacter");
		
		// Insert the character in the text string
		file.text = file.text.substr(0, index) + character + file.text.substring(index+editor.settings.insert, file.text.length);
		
		// Update the grid
		if(editor.settings.insert && !caret.eof && !caret.eol) {
			// Overwrite current character
			grid[row][col].char = character;
		}
		else {
			// Add a column on the row
			
			if(caret.eol) {
				grid[row].push(new Box(character, caret.index));
			}
			else {
				grid[row].splice(col, 0, new Box(character, caret.index));
			}
			
			console.log("Added " + character + " at index=" + index + " row=" + row + " col=" + col + "");
			
			// Update the caret
			caret.col++;
			caret.index++;
			
			if(renderRow) editor.renderRow(row); // Render the row early (before heavy indexing)
			
			// Mehh, it wont render until JavaScript have finished crushing ... 
			// Fix!? Use setTimeout!? Works sometimes. But sanityCheck fails! asdasdas alksjdalskjdlaksdjalskdj asdlkjasdlj
			
			
			
			// Increment index of the rest of the columns on this row
			for(var j=col+1; j<grid[row].length; j++) {
				grid[row][j].index++;
			}
			
			// Increment startIndex of all rows below this one
			for(var i=row+1; i<grid.length; i++) {
				grid[i].startIndex++
				// ... and all columns
				for(var j=0; j<grid[i].length; j++) {
					grid[i][j].index++;
				}
			}
			
			//console.log("Done fixing grid indexes");
			
			file.scrollToCaret(caret);
			
			
		}
		
		
		// Call file edit listeners
		file.change("insert", character, index, row, col) // change, text, index, row, col
		
		console.timeEnd("putCharacter");
		
		file.sanityCheck();
		
		if(!renderRow) editor.renderNeeded();
		
	}
	
	File.prototype.select = function(box, direction) {
		var file = this,
			selected = file.selected,
			start = 0,
			allSelected = true;
		
		if(box == undefined) {
			console.warn("Nothing to select!");
			return;
		}
		
		//console.log("Selecting ...");
		
		//console.log(typeof box);
		
		// Turn the box to an array of boxes, if it's not already an array
		if(Object.prototype.toString.call( box ) != '[object Array]') {
			box = [box];
		}
		
		box.forEach(selectBox);
		
		if(allSelected) {
			// Remove the selected 
			selected.splice(selected.indexOf(box[0]), box.length);
		}
		else {
			// Insert the new boxes on the left or right side
			if(direction == "left") {
				start = 0;
			}
			else {
				start = selected.length;
			}
			Array.prototype.splice.apply(selected, [start, 0].concat(box)); // inserts the boxes at the start position
		}
		
		editor.renderNeeded();
		
		function selectBox(box) {
			if(box.selected) {
				//console.log("DESEL " + box.char);
				box.selected = false;
			}
			else {
				allSelected = false;
				//console.log("SEL " + box.char);
				box.selected = true;
			}
			
			
		}
		
	}
	
	File.prototype.deselect = function(box) {
		var file = this;
		var selected = file.selected;
		var selectedLength = selected.length;
		
		if(selectedLength == 0) return; // Early return optimization
		
		if(box) {
			box.selected = false;
			selected.splice(selected.indexOf(box), 1);
		}
		else {
			// Deselect all
			for(var i=0; i<selectedLength; i++) {
				selected[i].selected = false;
			}
			
			selected.length = 0;
		}
		
		editor.renderNeeded();
		
	}
	
	File.prototype.deleteSelection = function(selection) {
		/*
			Deletes the selected text ...
			
			This is slow because the file is reparsed on each "edit".
			
			Deleting from a 53283 byte file with 1k lines:
			Before optimization: deleteSelection: 2741.412ms
			After disabling parse: deleteSelection: 2271.171ms
			After removing file.debugGrid(): deleteSelection: 101.272ms
			After devMode: false: deleteSelection: 47.054ms
			
			Deleting everything: deleteSelection: 5316.839ms
			Deleting 100 rows: deleteSelection: 1001.039ms
			
			Deleting 100 rows After "reload" optimization: deleteSelection: 7.688ms
		*/
		
		console.time("deleteSelection");
		
		var file = this;
		var box;
		var row = 0;
		
		var bubbleUp = false;
		
		if(selection == undefined) {
			selection = file.selected;
		}
		
		if(selection.length == 0) {
			console.warn("Nothing is selected!");
			return;
		}
		
		// selection is an array of Box's
		
		//console.log("Removing selection:\n" + JSON.stringify(selection));
		
		var firstBox = selection[0];
		var firstIndex = firstBox.index;
		
		
		// Get the selected text into a string
		var chars = [];
		for(var i=0; i<selection.length; i++) {
			chars.push(selection[i].char);
		}
		var text = chars.join("");
		var optimized = false;
		
		/*
			Optimization if needed ...
		*/
		if(selection.length > 1000) {
			
			if(isContinuous(selection)) {
				var lastIndex = selection[selection.length-1].index;
				
				file.text = file.text.substr(0, firstIndex) + file.text.substring(lastIndex+1, file.text.length);
				
				file.grid = file.createGrid();
				
				// Place the caret where the selection was
				file.caret = file.moveCaretToIndex(firstIndex);
				
				// Set these based on the new caret postion (for "deletedSelection" event)
				var firstRow = file.caret.row;
				var firstCol = file.caret.col;
				
				// Reset the view
				file.scrollTo(undefined, file.caret.row-1);
				
				optimized = true;
			}
			else {
				console.warn("Selection is not continuous!");
			}
		}
		
		if(!optimized) {
			
			file.caret = file.moveCaretToIndex(firstBox.index);
			
			var firstRow = file.caret.row;
			var firstCol = file.caret.col;
			
			for(var i=0; i<selection.length; i++) {
				
				box = selection[i];
				
				if(box.index == undefined) console.error(new Error("Index is undefined. Stuff will go wrong!"));
				
				//console.log("Deselecting box:\n" + JSON.stringify(box));
				
				// Move caret to the box
				file.caret = file.moveCaretToIndex(box.index);
				
				// Deselect the box
				box.selected = false;
				
				// Delete character
				file.deleteCharacter(file.caret, bubbleUp);
				
			}
		}
		
		// Deselect all 
		selection.length = 0;
		
		console.timeEnd("deleteSelection");
		
		
		// Delete cleared rows if they are empty!?
		
		//file.debugGrid();
		file.sanityCheck();
		
		
		file.change("deletedSelection", text, firstIndex, firstRow, firstCol);
		
		
		editor.renderNeeded();
		
		
		function isContinuous(selection) {
			var index = 0;
			var lastIndex = selection[0].index;
			var sp = " ";
			var tab = "\t";
			var lf = "\n";
			var cr = "\r";
			var char = "";
			for(var i=0; i<selection.length; i++) {
				index = selection[i].index;
				if( (index - lastIndex) > 1) {
					// Check if it's white-space or not
					for(var j=lastIndex+1; j<index; j++) {
						char = file.text.charAt(j);
						//console.log("char=" + char);
						if(!(char == sp || char == tab || char == lf || char == cr )) {
							// It has a non-whitespace character inbetween selections.
							// So the selection is not continuous.
							//console.log("Char: '" + char + "' is not a white-space character!");
							return false; 
						}
					}
				}
				lastIndex = index;
			}
			
			return true;
		}
	}
	
	File.prototype.getSelectedText = function() {
		var file = this,
			text = "",
			selected = file.selected,
			index = -1,
			box,
			missed = "";
		
		//console.log("SEL:" + JSON.stringify(selected, null, 2));
		
		// Selected text always goes from left to right!
		
		for(var i=0; i<selected.length; i++) {
			
			box = selected[i];
			
			if(index > -1 && (box.index-index) > 1) {
				// See what we missed
				while(index < (box.index-1)) {
					index++;
					missed = file.text.charAt(index);
					text += missed;
					//console.log("missed=" + missed + " (" + missed.charCodeAt(0) + ")");
				}
			}
			text += selected[i].char;
			index = box.index;
		}
		
		return text;
		
	}
	
	
	
	File.prototype.insertLineBreak = function(caret) {
		var file = this;
		
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		file.sanityCheck();
		
		
		//console.log("Inserting lalaline breaka at " + JSON.stringify(caret));
		
		// Sanity check in case someting is wrong
		file.sanityCheck();
		
		
		var row = caret.row,
			col = caret.col,
			totalCharactersAdded = file.lineBreak.length,
			grid = file.grid,
			index = caret.index,
			currentRow = grid[row],
			box,
			tabCharacters = "",
			newRow,
			movedCharacters = 0;
		
		//console.log("Inserting line break at index=" + index);
		
		
		// Insert a new row
		grid.splice(row+1, 0, []);
		
		// Give properties to the new row
		newRow = grid[row+1];
		
		newRow.startIndex = caret.index;
		newRow.lineNumber = currentRow.lineNumber; // It will be incremented later when all other rows are incremented // currentRow.lineNumber + 1;
		newRow.indentationCharacters = "";
		newRow.indentation = 0;
		
		
		
		/* How much indentation?
			Let the code intelligence handle the indentation!
			
			newRow.indentation = currentRow.indentation;
			
			
			for(var i=0; i<newRow.indentation; i++) {
			tabCharacters += "\t";
			}
			totalCharactersAdded += newRow.indentation;
		*/
		
		// Insert the line-break character(s) and indentation (tab characters) to the text string
		file.text = file.text.substr(0, index) + file.lineBreak + tabCharacters + file.text.substring(index, file.text.length);
		
		
		// Move caret to the new row
		caret.row++;
		caret.col = 0;
		
		// Set caret.index to the text position of the first non-whitespace character (column)
		caret.index += totalCharactersAdded;
		
		
		
		//console.log("totalCharactersAdded=" + totalCharactersAdded);
		
		//file.debugGrid();
		
		//console.log("currentRow.length=" + currentRow.length);
		//console.log("newRow.length=" + newRow.length);
		
		//console.log("currentRow=" + JSON.stringify(currentRow));
		//console.log("newRow=" + JSON.stringify(newRow));
		
		
		// Move all characters right of col to the new line
		for(var i=col; i<currentRow.length; i++) {
			//console.log(i);
			movedCharacters++;
			newRow.push(currentRow[i]);
		}
		
		//file.debugGrid();
		
		// Remove the columns right of col
		currentRow.length = col;
		
		
		//console.log("movedCharacters=" + movedCharacters);
		if(movedCharacters===0) {
			// Caret should be on eol if no characters where moved
			caret.eol = true;
			
			if(caret.index == file.text.length) {
				caret.eof = true;
			}
		}
		else {
			caret.eol = false;
			caret.eof = false;
		}
		
		
		
		// Increment line-number and index of all rows below
		for(var i=row+1; i<grid.length; i++) {
			grid[i].lineNumber++;
			grid[i].startIndex += totalCharactersAdded;
			
			for(var j=0; j<grid[i].length; j++) {
				
				//console.log("grid[" + i + "][" + j + "]=" + grid[i][j]);
				
				grid[i][j].index += totalCharactersAdded;
			}
		}
		
		
		//console.log("row=" + row + " " + file.startRow + " + " + editor.view.visibleRows + " = " + (file.startRow + editor.view.visibleRows) + "");
		
		// Scroll down if we ended up under visible space
		if(row >= file.startRow + editor.view.visibleRows - 1 ) {
			file.startRow++;
		}
		
		// Scroll all the way to the left
		file.startColumn = 0;
		editor.view.endingColumn = editor.view.visibleColumns;
		
		
		// Call file edit listeners
		file.change("linebreak", file.lineBreak, index, row, col) // change, text, index, row, col
		
		
		file.sanityCheck();
		
		editor.fireEvent("moveCaret", file, caret);
		
		editor.renderNeeded();
		
	}
	
	File.prototype.moveCaretRight = function(caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		
		file.checkCaret(caret);
		
		file.sanityCheck();
		
		if(caret.index < file.text.length) {
			
			if(caret.eol) {
				// Move to next line
				caret.row++;
				caret.col = 0;
				caret.index += file.lineBreak.length;
				//console.log("Moved caret.index " + file.lineBreak.length + " steps to the right doe to linebreak");
				
				caret.index += file.grid[caret.row].indentationCharacters.length;
				//console.log("Moved caret.index " + file.grid[caret.row].indentationCharacters.length + " steps to the right due to indentation");
				
				if(file.grid[caret.row].length == 0) {
					caret.eol = true;
				}
				else {
					caret.eol = false;
				}
			}
			else if(caret.col == file.grid[caret.row].length - 1) {
				// Move to EOL
				caret.col++;
				caret.eol = true;
				caret.index++;
			}
			else {
				caret.col++;
				caret.index++;
				caret.eol = false;
			}
			
			if(caret.index == file.text.length) {
				caret.eof = true;
			}
			else {
				caret.eof = false;
			}
			
		}
		
		file.sanityCheck();
		
		//if(caret == file.caret) editor.renderNeeded();
		
	}
	
	
	File.prototype.moveCaretLeft = function(caret, times) {
		/*
			Moves any caret one step to the left in this file.
			Caret must pass the sanity check!
			
		*/
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		
		file.checkCaret(caret);
		
		
		var grid = file.grid;
		var row = caret.row;
		
		//console.log("Moving caret left from " + JSON.stringify(caret) + "...");
		
		
		// Sanity check in case something is wrong
		file.sanityCheck();
		
		if(caret.col > 0 || caret.row > 0) {
			caret.col--;
			
			if(caret.col == -1) {
				// Move one row up
				//console.log("Moving one row up");
				caret.row--;
				caret.col = grid[caret.row].length;
				caret.eol = true;
				caret.index -= file.lineBreak.length;
				caret.index -= grid[row].indentationCharacters.length;
				
				//console.log("caret.index=" + caret.index + " grid[" + row + "].indentationCharacters.length=" + grid[row].indentationCharacters.length);
				
			}
			else {
				caret.eol = false;
				caret.index--;
			}
			
			caret.eof = false;
			
		}
		
		file.sanityCheck();
		
		if(times == undefined) times = 0;
		
		times = times - 1;
		
		if(times > 0) {
			file.moveCaretLeft(caret, times);
		}
		
		editor.fireEvent("moveCaret", file, caret);
		
		//if(caret == file.caret) editor.renderNeeded();
		
		return caret;
		
	}
	
	
	File.prototype.moveCaretUp = function(caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		file.checkCaret(caret);
		
		file.sanityCheck();
		
		if(caret.row > 0) {
			
			var rowBefore = file.grid[caret.row];
			
			caret.row--;
			
			var	gridRow = file.grid[caret.row];
			var gridRowLength = gridRow.length;
			var indentationDiff = (rowBefore.indentation - gridRow.indentation) * editor.settings.tabSpace;
			
			//console.log("indentationDiff=" + indentationDiff);
			
			caret.col += indentationDiff;
			caret.index += indentationDiff;
			
			if(caret.col < 0) {
				caret.index -= caret.col;
				caret.col = 0;
			}
			
			if(caret.col >= gridRowLength) {
				caret.col = gridRowLength;
				caret.eol = true;
				if(gridRowLength == 0) { // No characters on the row
					caret.index = gridRow.startIndex;
				}
				else {
					caret.index = gridRow[gridRowLength - 1].index + 1;
				}
			}
			else {
				caret.eol = false;
				caret.index = gridRow[caret.col].index;
			}
			
			caret.eof = false;
			
		}
		else {
			// Move the the start of the file
			file.moveCaretToIndex(0, caret);
			
			//console.log("Moved to start of file: " + JSON.stringify(caret));
		}
		
		file.sanityCheck();
		
		editor.fireEvent("moveCaret", file, caret);
		
		//if(caret == file.caret) editor.renderNeeded();
		
		return caret;
	}
	
	File.prototype.moveCaretDown = function(caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		file.checkCaret(caret);
		
		file.sanityCheck();
		
		if(caret.row < (file.grid.length-1)) {
			
			var rowBefore = file.grid[caret.row];
			
			caret.row++;
			
			if(caret.row >= file.startRow + editor.view.visibleRows) {
				file.startRow++;
			}
			
			var	gridRow = file.grid[caret.row];
			var gridRowLength = gridRow.length;
			var indentationDiff = (rowBefore.indentation - gridRow.indentation) * editor.settings.tabSpace;
			
			//console.log("indentationDiff=" + indentationDiff);
			
			
			
			caret.col += indentationDiff;
			caret.index += indentationDiff;
			
			if(caret.col < 0) {
				caret.index -= caret.col;
				caret.col = 0;
			}
			
			
			if(caret.col >= gridRowLength) {
				caret.col = gridRowLength;
				caret.eol = true;
				
				if(caret.row == (file.grid.length -1)) { // Last row
					caret.index = file.text.length;
					caret.eof = true;
				}
				else {
					
					if(gridRowLength == 0) { // No characters on the row
						caret.index = gridRow.startIndex;
					}
					else {
						caret.index = gridRow[gridRowLength - 1].index + 1;
					}
					
				}
			}
			else {
				caret.eol = false;
				
				//console.log(JSON.stringify(caret, null, 4));
				
				caret.index = gridRow[caret.col].index;
			}
			
		}
		
		file.sanityCheck();
		
		editor.fireEvent("moveCaret", file, caret);
		
		//if(caret == file.caret) editor.renderNeeded();
		
		return caret;
	}
	
	
	File.prototype.unindentRow = function(row) {
		
	}
	
	File.prototype.deleteCharacter = function(caret, bubble, renderRow) {
		/*
			Removes the character the caret is on.
			Behaves like delete in most editors.	
			
		*/
		
		var file = this;
		
		if(bubble == undefined) bubble = true;
		if(caret == undefined) caret = file.caret;
		
		file.sanityCheck();
		
		if(editor.settings.renderRowOptimization==false) renderRow = false;
		
		//console.log("Deleting character at " + JSON.stringify(caret) + " ...");
		
		var grid = file.grid,
			row = caret.row,
			col = caret.col,
			index = caret.index,
			thisRow = grid[row],
			rowBelow = row < grid.length ? grid[row+1] : undefined,
			character = caret.eof ? undefined : file.text.charAt(index),
			indexDecrementor = 1, // How many characters to remove
		box;
		
		
		file.checkCaret(caret); // Sanity check in case something is wrong
		
		//file.debugGrid();
		
		console.time("deleteCharacter");
		
		if(caret.eof) {
			console.warn("Can not delete at EOF!");
			return;
		}
		
		if(caret.eol) {
			/*
				The caret is positioned on a line break.
				Remove the line break (and row). Plus all indentation characters
			*/
			
			
			// Remove all tabs and line-break characters
			indexDecrementor = file.lineBreak.length + rowBelow.indentationCharacters.length;
			
			
			// Give deleted characters for edit listeners
			character = "";
			for(var i=index; i<index+indexDecrementor; i++) {
				character += file.text.charAt(i);
			}
			
			// character will always have the lineBreak characters, because lines only break after them.
			
			
			// put all characters on the line below to this line
			if(rowBelow.length > 0) {
				
				while(rowBelow.length > 0) {
					box = rowBelow.shift();
					thisRow.push(box);
				} // Each index will be decremented later!
				
				caret.eol = false;
			}
			
			
			grid.splice(row+1, 1); // Remove the row below
			
			// Decrement the line-number of all rows below
			for(var i=row+1; i<grid.length; i++) {
				grid[i].lineNumber--;
			}
			
			//console.log("Row " + (row+1) + " removed");
			
			renderRow = false;
			
		}
		else {
			
			// Remove box from the grid
			
			var box = grid[row][col];
			
			box.char = undefined;
			box.index = undefined;
			
			thisRow.splice(col, 1);
			
			/*
				if(character == "\t") {
				thisRow.indentation--;
				}
			*/
		}
		
		if(character == "{" || character == "}") renderRow = false;
		
		// Remove the character(s) from the text string
		file.text = file.text.substr(0, index) + file.text.substring(index+indexDecrementor, file.text.length);
		
		
		// Did we delete the last character on the row?
		if(grid[caret.row].length == caret.col) {
			caret.eol = true;
			
			// Are we at EOF?
			if(caret.index == file.text.length) {
				caret.eof = true;
			}
		}
		
		// Update the caret index ??
		//caret.index -= indexDecrementor;
		
		if(renderRow) editor.renderRow(); // early paint (always change/update both the text, grid and cursor before rendering! Or some functionality like xmatching will not work properly.
		
		
		// Decrement index of the rest of the columns on this row
		for(var j=col; j<grid[row].length; j++) {
			grid[row][j].index -= indexDecrementor;
		}
		
		// Decrement startIndex of all rows below this one
		for(var i=row+1; i<grid.length; i++) {
			grid[i].startIndex -= indexDecrementor;
			// ... and all columns
			for(var j=0; j<grid[i].length; j++) {
				grid[i][j].index -= indexDecrementor;
			}
		}
		
		// Call file edit listeners
		if(bubble) {
			file.change("delete", character, index, row, col) // change, text, index, row, col
		}
		
		
		console.timeEnd("deleteCharacter");
		
		//file.debugGrid();
		
		file.sanityCheck();
		
		file.scrollToCaret();
		
		if(!renderRow) editor.renderNeeded();
		
		return caret;
		
	}
	

	
	File.prototype.moveCaretToIndex = function(index, caret) {
		var file = this,
			grid = file.grid,
			gridIndex;
		
		if(index == undefined) {
			console.error(new Error("index is undefined!"));
		}
		else if(index < 0) {
			console.error(new Error("Index can not be less then zero!"));
		}
		else if(index > file.text.length) {
			console.error(new Error("Index can not be over file length=" + file.text.length + ""));
		}
		
		if(caret == undefined) caret = file.caret;
		
		/*
			If the file text contains Anything, file grid will have at least one row.
			
		*/
		
		//console.log("moveCaretToIndex: " + index + "(text.length=" + file.text.length + ")");
		
		if(file.text.length == 0) {
			caret.index = 0;
			caret.row = 0;
			caret.col = 0;
			caret.eol = true;
			caret.eof = true;
			
		}
		else {
			// Set the index
			caret.index = index;
			
			if(index >= file.text.length) {
				// EOF
				caret.row = grid.length-1;
				caret.col = grid[caret.row].length;
				caret.eol = true;
				caret.eof = true;
				
			}
			else {
				//console.log("grid.length=" + grid.length);
				
				var found = false;
				
				// Set the row, col, eol and eof
				main: for(var row=0; row<grid.length; row++) {
					
					//console.log("grid[" + row + "].length=" + grid[row].length);
					
					for(var col=0; col<grid[row].length; col++) {
						
						gridIndex = grid[row][col].index;
						
						//console.log("gridIndex=" + gridIndex);
						
						if(gridIndex == index) {
							caret.row = row;
							caret.col = col;
							caret.eol = false;
							caret.eof = false;
							
							found = true;
							break main;
							
						}
						else if(gridIndex > index) {
							// We are at the end of last row
							caret.row = row-1;
							caret.col = grid[caret.row].length;
							caret.eol = true;
							
							if(grid[caret.row].length > 0) {
								caret.index = grid[caret.row][caret.col].index;
							}
							else {
								caret.index = grid[caret.row].startIndex;
							}
							
							found = true;
							break main;
							
						}
						else if(gridIndex == (index-1) && col==grid[row].length-1) {
							// eol on this row! (but not eof)
							caret.row = row;
							caret.col = col+1;
							caret.eol = true;
							
							found = true;
							break main;
							
						}
					}
				}
				
				if(!found) {
					// Probably because all lines are empty!
					caret.col = 0;
					caret.eol = true;
					caret.row = Math.floor(index / file.lineBreak.length); // Aproximate line
					
					if(caret.row >= grid.length-1) {
						caret.row = grid.length-1;
						caret.eof = true;
					}
					
					if(caret.row % 1 !== 0) { // Make sure it's an integer
						console.error(new Error("Couldn't set cursor! index=" + index + " caret.row=" + caret.row));
						//return undefined;
					}
				}
			}
		}
		
		file.checkCaret(caret);
		
		if(caret == file.caret) editor.fireEvent("moveCaret", file, caret);
		
		return caret;
		
	}
	
	File.prototype.moveCaretToStart = function(caret, cb) {
		var file = this;
		
		// Moves the caret to the start of the file
		
		var startIndex = 0;
		
		if(caret == undefined) caret = file.caret;
		
		if(file.isBig && !file.head) {
			if(caret != file.caret) console.error(new Error("Can not place virtual caret, only file.caret if the file is big!"));
			
			var partStartRow = 0;
			loadFilePart(file, partStartRow, function() {

				caret = file.moveCaretToIndex(startIndex, caret);
				
				if(cb) cb(caret);
			});
			
		}
		else {
			
			caret = file.moveCaretToIndex(startIndex, caret);
			
			if(cb) {
				cb(caret);
			}
			else {
				return caret;
			}
		}
		
	}
	
	File.prototype.moveCaretToEnd = function(caret, cb) {
		var file = this;
		// Moves the caret to the end of the file
		
		if(caret == undefined) caret = file.caret;
		
		if(file.isBig && !file.tail) {
			
			console.log("file is a stream! And it's not at the end");
			
			if(caret != file.caret) console.error(new Error("Can not place virtual caret, only file.caret if the file is big!"));
			
			if(file.totalRows == -1) console.error(new Error("totalRows not yet found! Wait ...?"));
			
			var startRow = file.totalRows - editor.settings.bigFileLoadRows + 1;
		
			if(startRow < 0) console.error(new Error("The file has less then editor.settings.bigFileLoadRows=" + editor.settings.bigFileLoadRows + " rows!"));
			
			loadFilePart(file, startRow, function() {
				
				file.caret.row = file.grid.length;
				
				file.fixCaret();
				
				if(cb) cb(file.caret);
				
			});
			
		}
		else {
			
			console.log("file Not a stream or it's at the end.");
			
			caret.row = file.grid.length-1;
			caret.col = file.grid[caret.row].length-1;
			
			file.fixCaret(caret);
			
			if(cb) {
				cb(caret);
			}
			else {
				return caret;
			}
		}
		
	}

	
	File.prototype.getIndexFromRowCol = function(row, col) {
		var file = this,
			grid = file.grid;
		
		//console.log("getIndexFromRowCol!")
		
		if(row == undefined) console.error(new Error("row is undefined!"));
		if(col == undefined) console.error(new Error("col is undefined!"));
		
		if(row < 0) {
			console.error(new Error("row=" + row + " must be higher then zero!"));
		}
		else if(row > grid.length) {
			console.error(new Error("Row " + row + " is higher then last row=" + grid.length + ""));
		}
		
		var gridRow = grid[row];
		
		if(col < 0) {
			console.error(new Error("col=" + col + " must be higher then zero!"));
		}
		else if(col > gridRow.length) {
			console.error(new Error("col=" + col + " > " + gridRow.length + " (higher then available columns on row " + row + ")"));
		}
		else if(col === 0) {
			return gridRow.startIndex;
		}
		else if(col == gridRow.length) {
			// EOL, col is not zero, row has at least one column
			return gridRow[col-1].index + 1;
		}
		else {
			return gridRow[col].index;
		}
	}
	
	/*
		File.prototype.getGridPositionFromIndex = function(index) {
		var file = this,
		grid = file.grid;
		
		file.sanityCheck();
		
		
		// Could probably be optimized
		for(var row=0; row<grid.length; row++) {
		for(var col=0; col<grid[row].length; col++) {
		if(grid[row][col].index == index) {
		return {row: row, col: col};
		}
		}
		}
		
		if(index == file.text.length) {
		return {row: row-1, col: col};
		}
		
		console.warn("Can not find index=" + index + " in file text-length=" + file.text.length + "", (new Error).lineNumber);
		}
	*/
	
	var hmmm = false;
	
	File.prototype.createTextRange = function(start, end) {
		
		// Returns an array of "boxes" (that you can apply styles on)
		
		var file = this,
			grid = file.grid,
			boxes;
		
		//file.sanityCheck();
		
		if(start > end) {
			// Switch places
			console.warn("start-position is over end-position. They will be switched!")
			var oldStart = start;
			start = end;
			end = oldStart;
		}
		//else if(start == end) {
		// Select that character!
		//	return boxes;
		//}
		
		/*
			This function took up 75% of the CPU time so I had to optimize it ...
			putCharacter: 103.782ms
			putCharacter: 19.756ms
			
		*/
		
		return getBoxes(grid, start, end);
		
		function getBoxes(grid, start, end) {
			var gridRow,
				boxes = [];
			
			for(var row=grid.length-1; row>=0; row--) {
				
				gridRow = grid[row];
				
				if(end >= gridRow.startIndex) {
					
					for(var col=gridRow.length-1; col>=0; col--) {
						
						if(gridRow[col].index < start) {
							//if(hmmm) console.log("Break from col");
							break;
						}
						else if(gridRow[col].index <= end) {
							boxes.unshift(gridRow[col]);
						}
						
					}
				}
				else if(start >= gridRow.startIndex) {
					break;
				}
				
			}
			return boxes;
		}
		
	}
	
	File.prototype.reload = function(text) {
		// ex: Re-open the file in another encoding
		
		var file = this;
		
		if(text == undefined) console.error(new Error("No text!"));
		
		file.text = text;
		
		file.grid = file.createGrid(); 
		file.caret = file.createCaret(0,0,0);
		
		editor.renderNeeded();
		
		file.change("reload", text, 0, 0, 0); // Fire events
		
	}
	
	
	File.prototype.createGrid = function() {
		/*
			
			Tabs after a line break will indent the line. 
			Tabs Not after a line break will be displayed as white space.
			
		*/

		console.time("createGrid");
		
		var file = this,
			text = file.text,
			grid = [],
			totalCharacters = text.length,
			row = 0,
			col = 0,
			char = "",
			lastChar = "",
			charBeforeThat = "",
			inWord = false,
			word,
			lineNumber = 1,
			tabulation = true,
			j = 0,
			codeBlockDepth = 0,
			codeBlockStartCharacter = "{",
			codeBlockEndCharacter = "}";
		
		console.log("Creating grid (text.length=" + text.length + ") ...");	
		
		var lastLinebreakCharacter = "";
		var lineBreakCharacters = file.lineBreak.length;
		
		//console.log("lineBreakCharacters=" + lineBreakCharacters + " (" + file.lineBreak.replace(/\r/g, "R(10)").replace(/\n/g, "N(13)") + ")");
		
		if(lineBreakCharacters > 1) {
			lastLinebreakCharacter = file.lineBreak.charAt(1);
		}
		else {
			lastLinebreakCharacter = file.lineBreak.charAt(0);
		}
		
		//console.log("lastLinebreakCharacter=" + lastLinebreakCharacter.charCodeAt(0) + " (charcode)");
		
		grid[0] = []; // First column
		grid[0].lineNumber = 1;
		grid[0].indentation = 0;
		grid[0].indentationCharacters = "";
		grid[0].startIndex = 0;
		
		//console.log("editor.view.visibleColumns=" + editor.view.visibleColumns);
		
		for(var i=0; i<totalCharacters; i++) {
			addCharacterToGrid(i);
		}
		
		
		//file.grid = grid;
		
		console.timeEnd("createGrid");
		
		//console.log("grid created");
		
		return grid;
		
		// Optimizations are the root of all evil!!!
		
		
		function addCharacterToGrid(textIndex) {
			//console.log(textIndex);
			
			charBeforeThat = lastChar;
			lastChar = char;
			
			char = text.charAt(textIndex);
			
			//console.log("row=" + row + " col=" + col + " char=" + char + " index=" + textIndex + "");
			
			//grid[row][col] = new Box(char, textIndex);
			
			/*
				note:  Atari 8-bit and QNX pre-POSIX implementation not supported. All other systems use and combination of \n and \r
				
				Line Feed = \n
				Carriage Return = \r
				
				windows linebreak = \r\n
			*/
			
			if(char == lastLinebreakCharacter) {
				
				//grid[row].pop(); // Remove the character (the line-break character)
				
				//if(lastChar == "\r" || lastChar == "\n") grid[row].pop(); // Remove the first line-break character too!
				
				lineNumber++;
				row++;
				
				grid[row] = [];
				
				grid[row].lineNumber = lineNumber;
				grid[row].startIndex = textIndex + 1; // It will start at next character (+1)
				grid[row].indentation = codeBlockDepth; // Will be updated by the parser
				grid[row].indentationCharacters = "";
				grid[row].owned = false; // Wheter we can "do whatever we want" with this line, like messing with the indentation
				
				col = 0;
				tabulation = true;
			}
			else if((char == "\t" || char == " ") && tabulation) {
				/*
					Tabs and spaces after a line break will be ignored.
					Then you do not have to worry about indentation.
					A good editor should manage the indentation for you!
					But we'll still keep the original indentation,
					so that we do not mess up other peoples code.
				*/
				grid[row].indentationCharacters += char;
				grid[row].startIndex++;
				//console.log("indentation++");
			}
			else if(char == "\n" || char == "\r") {
				// Ignoring LF, CR
			}
			else {
				
				//console.log("character=" + char + " (" + char.charCodeAt(0) + ")");
				
				tabulation = false;
				
				grid[row].push(new Box(char, textIndex));
				
				col++;
				
				//  Let the code parser/intelligence handle the indentation!
				
			}
		}
		
		file.checkGrid();
		
	}
	
	
	File.prototype.debugGrid = function() {
		/*
			Useful when debugging ...
			
			
		*/
		
		if(!editor.settings.devMode) {
			return;
		}
		
		
		var file = this,
			grid = this.grid,
			text = this.text,
			str = "",
			letters = stringToCharCodes(text).join(", ");
		
		//console.log(JSON.stringify(grid, null, 4));
		
		//console.log("letters:" + letters);
		
		console.log("text:\n" + text.replace(/ /g, "~").replace(/\r/g, "CR").replace(/\n/g, "LF\n"));
		
		for(var row=0; row<grid.length; row++) {
			for(var col=0; col<grid[row].length; col++) {
				if(grid[row][col] == undefined) {
					//console.log("(grid[" + row + "][" + col + "] undefined!");
					str += tableCell("!!");
				}
				else {
					str += tableCell(grid[row][col].index + "=" + file.text.charCodeAt(grid[row][col].index));
				}
			}
			
			str += "\n";
			
		}
		
		//console.log(str);
		
		function tableCell(str) {
			
			str = (" " + str).trim(); // Convert to string
			
			if(str == undefined || str == "undefined") {
				str = "X";
			}
			
			//console.log("str=" + str + " " + typeof str);
			
			var cellWidth = 7,
				width = cellWidth - str.length;
			
			//console.log("width=" + width);
			for(var i=0; i<width; i++) {
				str += " ";
			}
			//console.log("hmm=" + str + "*");
			
			return " " + str + "|";
			
		}
		
		function stringToCharCodes(str) {
			var arr = [];
			
			for(var i=0; i<str.length; i++) {
				arr.push(str.charCodeAt(i));
			}
			
			return arr;
			
		}
		
	}
	
	
	File.prototype.cloneRow = function(row) {
		var file = this;
		var grid = file.grid;
		
		if(row < 0) {
			console.error(new Error("row=" + row));
			return;
		}
		else if(row >= grid.length) {
			console.error(new Error("row=" + row + " > grid.length=" + grid.length));
			return;
		}
		
		var clone = grid[row].slice(0);
		
		
		for (var i=0; i<clone.length; i++) {
			clone[i] = clone[i].clone();
		}
		
		
		// slice wont copy these
		clone.indentation = grid[row].indentation;
		clone.lineNumber = grid[row].lineNumber;
		clone.startIndex = grid[row].startIndex;
		clone.owned = grid[row].owned;
		
		return clone;
		
	}
	
	File.prototype.change = function(change, text, index, row, col) {
		/*
			This method is hopefully called every time the file changes.
			So that we can know if the file has been saved or not.
			
		*/
		var file = this;
		
		file.changed = true;
		
		if(file.isBig) {
			alert("Big file support not yet implemented. Changes will not be saved!")
		}
		
		file.isSaved = false;
		
		file.lastChange = new Date();
		
		// Call file edit listeners
		for(var i=0; i<editor.eventListeners.fileChange.length; i++) {
			editor.eventListeners.fileChange[i].fun(file, change, text, index, row, col);
		}
		
		
	}
	
	File.prototype.fixCaret = function(caret) {
		/*
			Moves the caret to a possible position 
		*/
		
		var file = this;
		
		
		if(caret == undefined) caret = file.caret;
		
		if(caret.row < 0) caret.row = 0;
		else if(caret.row >= file.grid.length) {
			caret.row = file.grid.length-1;
		}
		
		if(caret.col < 0) caret.col = 0;
		else if(caret.col > file.grid[caret.row].length) {
			caret.col = file.grid[caret.row].length;
		}
		
		if(caret.col == file.grid[caret.row].length) {
			caret.eol = true;
			
			if(caret.row == file.grid.length-1) {
				caret.eof = true;
			}
			else {
				caret.eof = false;
			}
		}
		else {
			caret.eol = false;
			caret.eof = false;
		}
		
		caret.index = file.getIndexFromRowCol(caret.row, caret.col);
		
		file.checkCaret(caret);
		
		editor.fireEvent("moveCaret", file, caret);
		
	}
	
	File.prototype.scrollToCaret = function(caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		
		console.log("scrolling to caret:" + JSON.stringify(caret) + " editor.view.visibleRows=" + editor.view.visibleRows);
		
		
		// Up and down ...
		var maxStartRow = Math.max(0, file.grid.length - editor.view.visibleRows) + 1;
		var startRow = file.startRow;
		var startColumn = file.startColumn;
		
		//console.log("visibleRows=" + editor.view.visibleRows);
		//console.log("caret.row=" + caret.row + " < file.startRow=" + file.startRow + " ? " + (caret.row < file.startRow))
		//console.log("caret.row=" + caret.row + " > file.startRow=" + file.startRow + " + editor.view.visibleRows=" + editor.view.visibleRows + " (" + (file.startRow + editor.view.visibleRows) + ")? " + (caret.row > file.startRow + editor.view.visibleRows))
		
		if(caret.row < file.startRow) {
			// Caret is above the visible space. 
			startRow = caret.row;
			
		}
		else if(caret.row >= (file.startRow + editor.view.visibleRows - 1)) {
			// Caret is below the visible space
			
			startRow = caret.row - editor.view.visibleRows + 2;
		}
		
		if(startRow < 0) startRow = 0;
		
		
		
		// Left & Right
		var delta = 0;
		var startColumn = file.startColumn;
		
		//console.log("caret.col=" + caret.col + " > editor.view.endingColumn=" + editor.view.endingColumn + " ? " + (caret.col > editor.view.endingColumn));
		//console.log("caret.col=" + caret.col + " < file.startColumn=" + file.startColumn + " ? " + (caret.col < file.startColumn));
		
		var indentationWidth = file.grid[caret.row].indentation * editor.settings.tabSpace;
		var columnEnd = editor.view.endingColumn - indentationWidth;
		var columnStart = file.startColumn; // Intentional: Omitting indentation here
		
		if(caret.col > columnEnd) {
			// Caret is after the visible space
			delta = caret.col - columnEnd;
			//editor.view.endingColumn += delta; // Do I need to do this!?
			startColumn += delta;
		}
		else if(caret.col < columnStart) {
			// Caret is infront of the visible space
			delta = columnStart - caret.col;
			
			//editor.view.endingColumn -= delta;  // Do I need to do this!? or does file.scrollTo do it!?
			startColumn -= delta;
		}
		
		//console.log("delta=" + delta);
		//console.log("editor.view.endingColumn=" + editor.view.endingColumn);
		
		file.scrollTo(startColumn, startRow);
		
		//editor.renderNeeded(); // Don't need to render until actually scrolled
		
		
	}
	
	
	File.prototype.saved = function(path) {
		/*
			Only call listeners. 
			Let the editor handle saving and loading from disk
		*/
		var file = this;
		
		file.isSaved = true;
		file.changed = false;
		file.savedAs = true;
		
		for(var i=0; i<editor.eventListeners.fileSave.length; i++) {
			editor.eventListeners.fileSave[i].fun(file);
		}
		
	}
	
	
	File.prototype.highlightText = function(text) {
		var file = this;
		
		if(text.length == 0) {
			console.error(new Error("No text to highlight!"));
			return;
		}
		
		//console.log("text=" + text);
		
		/*
			Hmm, for highlighting to stay, we need to modify insertText 
			to not touch the grid above or under the inserted text ...
			
		*/
		
		// Find all occurencie(s) of text and highlight it
		var start = 0;
		var end = 0;
		var highlightRanges = [];
		var textRange;
		
		while(true) { // while(true) loops are very prone for bugs! (for example if the word is one character long)
			
			//console.log("Searching for '" + text + "' start=" + start);
			
			start = file.text.indexOf(text, start);
			
			if(start == -1) break;
			
			end = start + text.length-1;
			
			textRange = file.createTextRange(start, end);
			
			textRange.forEach(highLightBox);
			
			start = end+1; // Continue search at the end of the word to prevent loop
			
		}
		
		function highLightBox(box) {
			// box is a gridBox
			box.highlighted = true;
			file.highlighted.push(box);
		}
		
	}
	
	File.prototype.removeHighlights = function() {
		var file = this;
		
		// Undo all highlightning
		
		for(var i=0; i<file.highlighted.length; i++) {
			file.highlighted[i].highlighted = false;
		}
		
		file.highlighted.length = 0;	
		
	}
	
	File.prototype.haveParsed = function(parseData) {
		var file = this;
		
		file.parsed = parseData; // After the file has been parsed, "file.parsed" property should hold the parsed data
		
		for(var i=0; i<editor.eventListeners.fileParse.length; i++) {
			editor.eventListeners.fileParse[i].fun(file); // Call function
		}
		
	}
	
	File.prototype.gotoLine = function(line) {
		var file = this;
		
		//console.log("Line " + line);
		
		var maxStartRow = Math.max(0, file.grid.length - editor.view.visibleRows);
		
		var startRow = line-2;
		
		if(startRow > maxStartRow) {
			startRow = maxStartRow;
		}
		
		if(startRow < 0) {
			file.startRow = 0;
		}
		
		file.scrollTo(undefined, startRow);
		
		//console.log("file.startRow=" + file.startRow);
		//console.log("maxStartRow=" +maxStartRow);
		
		editor.renderNeeded();
	}
	
	File.prototype.scrollTo = function(x, y) {
		/*
			Sets the startColumn and startRow
			
			Use this function instead of modifying file.startColumn and file.startRow directly!
		*/
		var file = this;
		var startColumn = file.startColumn;
		var startRow = file.startRow;
		var scrolled = false;
		var oldPartStartRow = file.partStartRow;
		
		console.log("scrollTo: x=" + x + " y=" + y);
		
		//console.log(editor.getcallStack());
		
		if(x != undefined) startColumn = parseInt(x);
		if(y != undefined) {
			
			y = parseInt(y);
			
			if(file.isBig && file.grid.length > 1) {

				var high = Math.min((file.grid.length - editor.view.visibleRows), Math.floor(file.grid.length * .85 - editor.view.visibleRows));
				var low = Math.floor(file.grid.length * .15);
				var middle = Math.floor(file.grid.length * .5);
				var moveRows = Math.floor(file.grid.length * .25);
				
				if(high < low) console.error(new Error("high=" + high + " < low=" + low + ". file.grid.length=" + file.grid.length + " path=" + file.path));
				
				//console.log(editor.getcallStack("scrollTo"));
				
				console.log("Scrolling in big file: file.isStreaming=" + file.isStreaming + " file.totalRows=" + file.totalRows + " file.startRow=" + file.startRow + " file.partStartRow=" + file.partStartRow + " y=" + y + " high=" + high + " low=" + low + " middle=" + middle);
				
				if(file.isStreaming) {
					
				}
				else if(y > high && !file.tail) {
					loadFilePart(file, file.partStartRow + moveRows, streamLoaded);
					return;
				}
				else if(y < low && !file.head) {
					loadFilePart(file, Math.max(0, file.partStartRow - moveRows), streamLoaded);
					return;
				}
				
			}
			
			// Allow user to scroll so that the last line appears at the middle, but not so that the text get invisible
			var maxY = Math.floor(file.grid.length - editor.view.visibleRows / 2);
			
			startRow = Math.min(y, maxY);
			
			if(startRow < 0) {
				console.warn("y=" + y + " maxY=" + maxY);
				startRow = 0;
			}
			
		}
		
		doTheScrolling(false);
		
		function doTheScrolling(scrolled) {
			
			console.log("Doing the scrolling ... file.startRow=" + file.startRow + " startRow=" + startRow );
			
			if(file.startColumn != startColumn || file.startRow != startRow) {
				file.startColumn = startColumn;
				file.startRow = startRow;
				scrolled = true;
			}
			
			/*
				if(file.startRow > maxY) {
				console.warn("Attempted to scroll below visible veiw");
				file.startRow = maxY;
				scrolled = true;
				}
				
				if(file.startRow < 0) {
				console.warn("We can not scroll up higher then the first row."); // But we can increase the top margin!? erm noo
				file.startRow = 0;
				scrolled = true;
				}
			*/
			
			// Update endingcolumn and render?
			if(editor.view.endingColumn != file.startColumn + editor.view.visibleColumns) {
				editor.view.endingColumn = file.startColumn + editor.view.visibleColumns;
				scrolled = true;
			}
			
			if(scrolled) editor.renderNeeded();
		}
		
		function streamLoaded() {
			// Adjust position
			
			var diff = oldPartStartRow - file.partStartRow;

			console.log("scroll y=" + y + " file.partStartRow=" + file.partStartRow + " oldPartStartRow=" + oldPartStartRow + " diff=" + diff + " file.startRow=" + file.startRow);
			
			y = y + diff;

			//if(diff < 0) {console.log("We scrolled up y--");y--;}
			
			
			console.log("y=" + y);

			if(y < low) console.error(new Error("Increase editor.settings.bigFileLoadRows=" + editor.settings.bigFileLoadRows + " to at least " + ( editor.settings.bigFileLoadRows + (low-y) )  ));
			
			// Allow user to scroll so that the last line appears at the middle, but not so that the text get invisible
			var maxY = Math.floor(file.grid.length - editor.view.visibleRows / 2);
			
			startRow = Math.max(Math.min(y, maxY), 0);
			
			console.log("startRow=" + startRow + " maxY=" + maxY);
			
			doTheScrolling(true);
			
		}
		
		
	}
	
	File.prototype.scroll = function(deltaX, deltaY) {
		/*
			Adds to the current scroll possition.
			
			Use this function instead of modifying file.startColumn and file.startRow directly!
		*/
		var file = this;
		
		if(deltaX == undefined) deltaX = 0;
		if(deltaY == undefined) deltaY = 0;
		
		file.scrollTo(file.startColumn + deltaX, file.startRow + deltaY);
	}
	
	
	File.prototype.getWordOnCaret = function(caret, callback) {
		var file = this;
		
		if(callback === undefined) {
			console.error(new Error("Expected a callback function!"));
			return;
		}
		
		if(caret === undefined) caret = file.caret;
		
		var word = "";
		var char = "";
		
		
		// First go left, and break on non-letter
		for(var i=caret.index-1; i>-1; i--) {
			char = file.text.charAt(i);
			
			if(isLetter(char)) {
				word = char + word; 
			}
			else {
				break;
			}
		}
		var start = i+1;
		
		// Then go right, and break on non-letter
		for(var i=caret.index; i<file.text.length; i++) {
			char = file.text.charAt(i);
			
			if(isLetter(char)) {
				word = word + char; 
			}
			else {
				break;
			}
		}
		var end = i-1;
		
		/*
			console.log("start=" + start + "=" + file.text.charAt(start));
			console.log("end=" + end + "=" + file.text.charAt(end));
		*/
		
		callback(word, start, end);
		
		function isLetter(char) {
			var wordDelimiters = " .,[]()=:\"<>/{}\t\n\r!*-+;_";
			return wordDelimiters.indexOf(char) == -1;
		}
		
	}
	
	File.prototype.rowVisible = function (gridRow) {
		var file = this;
		
		// Is the row visible?
		var startRow = file.startRow;
		var endRow = Math.min(file.grid.length, file.startRow+editor.view.visibleRows);
		
		return !(gridRow < startRow || gridRow > endRow);
	}
	
	/*
		
		Every character is a box!
		
		Only the File object should use this Object.
		
	*/
	
	function Box(char, index) {
		
		var box = this;
		
		if(index == undefined) index = -1;
		if(char == undefined) {
			console.error(new Error("No character!"));
		}
		
		box.char = char;
		box.index = index;
		box.selected = false;
		box.highlighted = false;
		box.hasCharacter = (char != undefined);
		box.wave = false;
		box.circle = false;
		box.color = editor.settings.style.textColor;
		box.quote = false; // part of a quote
		box.comment = false; // part of a comment
	}
	
	
	Box.prototype.clone = function() {
		var box = this,
			newBox = new Box(box.char, box.index);
		
		//newBox.color = box.color;
		newBox.selected = box.selected;
		newBox.highlighted = box.highlighted;
		newBox.highlighted = box.highlighted;
		newBox.wave = box.wave;
		
		// Decoration and color will not be cloned, and have to be applied by preRender functions
		
		return newBox;		
	}
	
	function determineIndentationConvention(text, lineBreak) {
		/*
			Find out the indentation convention for this file
			Is it tabs? Or spaces, and how many?
			
		*/
		
		console.log("Determining what line indention convention to use ...");
		
		var maxCheckLength = 500,
			char = "",
			lastLineBreakCharacter = lineBreak.charAt(lineBreak.length-1),
			voteTabs = 0,
			voteSpaces = 0,
			spaceCount = [],
			codeBlockStartCharacter = "{",
			codeBlockEndCharacter = "}",
			codeBlockDepth = 0,
			returnString = "",
			lastChar = "",
			identation = false,
			spaces = 0,
			tabs = 0;
		
		
		
		for(var i=0; i<text.length; i++) {
			
			lastChar = char;
			
			char = text.charAt(i);
			
			if(char == codeBlockStartCharacter) {
				codeBlockDepth++;
			}
			else if(char == codeBlockEndCharacter) {
				codeBlockDepth--;
			}
			
			if(char == lastLineBreakCharacter && codeBlockDepth) {
				identation = true;
			}
			else if(char == " " && identation) {
				spaces++;
			}
			else if(char == "\t" && identation) {
				tabs++;
			}
			else {
				// End of indentation
				
				if(identation) {
					if(tabs > 0) {
						voteTabs++;
					}
					else if(spaces > 0) {
						voteSpaces++;
						spaceCount.push(spaces / codeBlockDepth);
					}
					
					spaces = 0;
					tabs = 0;
				}
				
				identation = false;
			}
			
			//console.log("char=" + char + " identation=" + identation + " isLineBreak=" + (char == lastLineBreakCharacter) + "");
			
		}
		
		//console.log("voteTabs:" + voteTabs);
		//console.log("voteSpaces:" + voteSpaces);
		
		
		if(voteTabs >= voteSpaces) {
			return "\t";
		}
		else {
			// Use spaces for indentation, but how many?
			spaces = sortByFrequencyAndRemoveDuplicates(spaceCount)[0];
			
			//console.log("spaces count:" + spaces);
			
			for(var i=0; i<spaces; i++) {
				returnString += " ";
			}
			
			//console.log("indentation-string: '" + returnString + "'");
			
			return returnString;
		}
		
		
		
		function sortByFrequencyAndRemoveDuplicates(array) {
			var frequency = {}, value;
			
			// compute frequencies of each value
			for(var i = 0; i < array.length; i++) {
				value = array[i];
				if(value in frequency) {
					frequency[value]++;
				}
				else {
					frequency[value] = 1;
				}
			}
			
			// make array from the frequency object to de-duplicate
			var uniques = [];
			for(value in frequency) {
				uniques.push(value);
			}
			
			// sort the uniques array in descending order by frequency
			function compareFrequency(a, b) {
				return frequency[b] - frequency[a];
			}
			
			return uniques.sort(compareFrequency);
			
		}
		
	}
	
	
	function determineLineBreakCharacters(text) {
		/*
			What line break character is used !??
			
			Line Feed & New Line (10) = \n
			Carriage Return (13) = \r
			
			Default in windows: cr lf = \r\n
			
			Example:
			rnrnrn
			
			rn = 3 (wins)
			nr = 2
			
		*/
		
		console.log("Determining what line break characters to use ...");
		
		if(text.length == 0) {
			console.warn("Can't determine line breaks without any text!");
			return "";
		}
		
		var nr = occurrences(text, "\n\r", true),
			rn = occurrences(text, "\r\n", true)
		
		console.log("Line break? nr=" + nr + " rn=" + rn + "");
		
		if(rn > nr) {
			return "\r\n";
		}
		else if(nr > rn) {
			return "\n\r";
		}
		else if(text.indexOf("\n") > -1) {
			return "\n";
		}
		else {
			// Text has no line breaks. Use the default: (cr lf in windows)
			if(navigator.platform.indexOf("Win") > -1) {
				return "\r\n";
			}
			else {
				return "\n";
			}
		}
	}
	

	function loadFilePart(file, partStartRow, callback) {
		/*
			
			To not get event limit errors we have to flush the toilet after we are done.
			We can't simply restart the stream.
			
			Each time we load a part, we have to make a new stream			
		
		*/
		
		var stream = fs.createReadStream(file.path);
		stream.setEncoding('utf8');
		
		console.log("Catching stream .... partStartRow=" + partStartRow + " file.partStartRow=" + file.partStartRow + " file.totalRows=" + file.totalRows);
		
		if(file.changed && !file.isSaved) {
			alert("Can not catch the stream if the file is not saved! File is too large.");
			return;
		}
		
		if(file.isStreaming) {
			console.error(new Error("The file is already busy streaming! isPaused=" + stream.isPaused() + ""));
			return;
		}

		
		var text = "";
		var endReached = false;
		var totalLineBreaks = 0;
		var startLinebreaks = -1;
		var countRows = false; // If set to true, only count line breaks
		var flush = false;
		
		if(partStartRow == undefined) partStartRow = 0;
		
		if(partStartRow < 0) console.error(new Error("Can not begin stream in negative row:" + partStartRow));
		

		
		console.log("Gone fishing ... partStartRow=" + partStartRow + " file.partStartRow=" + file.partStartRow + " isPaused=" + stream.isPaused() + " ...")
		
		
		file.isStreaming = true;
		file.render = false;
		
		
		stream.on('readable', readStream);
		stream.on("end", streamEnded);
		stream.on("error", streamError);
		stream.on("close", streamClose);
		
		
		function streamClose() {
			console.log("Stream closed! flush=" + flush);
			// Tidy up ?
			//stream.removeListener("readable", readStream);
			//stream.removeListener("end", streamEnded);
			//stream.removeListener("error", streamError);
			//stream.removeListener("close", streamClose);
			
			file.isStreaming = false;
		}
		
		function streamError(err) {
			console.log("Stream error!");
			console.error(err);
		}
		
		function streamEnded() {
			console.log("Stream ended! countRows=" + countRows + " flush=" + flush);
			if(countRows) {
				file.totalRows = totalLineBreaks-1;
			}
			else if(!flush) {
				gotFish(true);
			}

		}
		
		function readStream() {
			// Called each time there is someting comming down the stream
			
			var chunk;
			var lineBreaks = 0;
			var str = "";
			var decoder = new StringDecoder('utf8');
			var chunkSize = 512; // How many bytes to recive in each chunk
			
			//console.log("Reading stream ... isPaused=" + stream.isPaused());
			
			while (null !== (chunk = stream.read(chunkSize)) && !stream.isPaused() ) {
				
				if(flush) {
					//console.log("Flushing the toilet ....");
				}
				else {

					// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
					str = decoder.write(chunk);
					
					
					// Only add to the string after we got enough line breaks ...
					if(!file.lineBreak) file.lineBreak = determineLineBreakCharacters(str);
					lineBreaks = occurrences(str, file.lineBreak, false);
					
					if(file.lineBreak.length > 1) {
						// Account for lost linebreaks due to breaks in the middle between CR and LF
						if(str.charAt(0) == file.lineBreak.charAt(1)) lineBreaks++;
					}
					
					totalLineBreaks += lineBreaks;
					
					if(totalLineBreaks >= partStartRow && !countRows) {
						// Start saving characters
						if(startLinebreaks == -1) startLinebreaks = totalLineBreaks - lineBreaks; // Accumulated linebreaks when we started capturing text
						text = text + str;
					}
					
					//console.log("Got chunk! chunk.length=" + chunk.length + " str.length=" + str.length + " text.length=" + text.length + " lineBreaks=" + lineBreaks + " totalLineBreaks=" + totalLineBreaks + " partStartRow=" + partStartRow + " countRows=" + countRows);

					
					// Stop when we got enough characters (not line breaks)
					//if(text.length > editor.settings.bigFileLoadRows) gotFish(false); 
					
					if( startLinebreaks != -1 && (totalLineBreaks - partStartRow) > editor.settings.bigFileLoadRows && !countRows) gotFish(false); 
				}
			}
		}
		
		
		function gotFish(endReached) {
			
			console.log("Got fish! countRows=" + countRows);
			
			file.render = true; // Let the editor render the file again
			
			console.log("L=" + (partStartRow+1) + " text.length=" + text.length);


			if(!file.lineBreak) file.lineBreak = determineLineBreakCharacters(text);
			
			if(partStartRow > 0) {
				// Make the text start at partStartRow

				var linesToCut = partStartRow - startLinebreaks;
				if(linesToCut < 0) linesToCut = partStartRow;
				//console.log("startLinebreaks=" + startLinebreaks + " partStartRow=" + partStartRow + " linesToCut=" + linesToCut);
				while(linesToCut-- > 0) {
					text = text.substring(text.indexOf(file.lineBreak) + file.lineBreak.length, text.length);
					//console.log("cutting! linesToCut=" + linesToCut);
				}
			}
			
			if(!endReached) {
				// Cut the text at last newline so that we don't stop in the middle of a line
				
				var cutAt = text.lastIndexOf(file.lineBreak);
				var cutText = text.substring(cutAt, text.length);
				
				//stream.unshift(cutText); // Put the cut text back into the stream
				
				text = text.substr(0, cutAt);				
				
			}
			
			text = fixInconsistentLineBreaks(text, file.lineBreak);
			
			file.text = text;
			
			//file.debugGrid();
			
			file.indentation = determineIndentationConvention(file.text, file.lineBreak);

			file.grid = file.createGrid();
			
			console.log("Loaded " + file.grid.length + " rows! editor.settings.bigFileLoadRows=" + editor.settings.bigFileLoadRows);
			
			console.log("Fixing caret ... ");
			console.log("file.caret.row=" + file.caret.row + " ");
			
			var diff = (file.partStartRow - partStartRow);
			
			console.log("diff=" + diff);
			
			// Move the caret to the same position it was on
			file.caret.row += diff;
			console.log("Placed it at file.caret.row=" + file.caret.row + " ");
			
			if(file.caret.row < 0) {
				// Place the caret at the top
				console.log("Place the caret at the top");
				file.caret.row = 0;
				file.caret.col = 0;
			}
			else if(file.caret.row >= (file.grid.length)) {
				// Place the caret at EOF
				console.log("Place the caret at EOF");
				file.caret.row = file.grid.length-1;
				file.caret.col = file.grid[file.grid.length-1].length -1;
				file.caret.eol = true;
				file.caret.eof = true;
			}

			file.fixCaret();
			
			console.log("After fixing caret: file.caret.row=" + file.caret.row + " ");
			
			file.partStartRow = partStartRow;
			
			
			editor.renderNeeded();
			
			if(endReached) {
				file.tail = true;
				file.head = false;
			}
			else if(partStartRow == 0) {
				file.head = true;
				file.tail = false;
			}
			else {
				file.head = false;
				file.tail = false;
			}
			
			if(callback) callback();


			if(file.totalRows == -1) {
				// Continue to load the file to find out how many rows it has
				countRows = true;
			}
			else {
				// Flush the stream down the toilet (do nothing with it)
				flush = true;
			}

			
		}
		
	}
	
	
})();
