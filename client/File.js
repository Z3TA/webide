/*
	The Global File interface. 
	Feel free to add additional methods to this object here! Don't extend it elsewhere!
	
	Can not be hotloaded
	
*/

"use strict";


var BrowserFile = window.File; // Native file object. todo: Rename our File variable to something else, or maybe incorporate the browsers File methods !?

var File; // File object is global

(function() { // Encapsulate so that we do not bleed out to global scope
	
	function funMap(f){return f.fun}
	
	// Note: No var infront. Expose File object to global scope!
	File = function File(text, path, fileIndex, bigFile, stateProps, callback) { 
		var file = this;
		
		if(typeof stateProps == "function") {
			callback = stateProps;
			stateProps = undefined;
		}

		if(!UTIL.isString(text)) throw new Error("text is not a string! text=" + text);
		
		if(!UTIL.isString(path)) throw new Error("path is not a string! path=" + path);
		
		file.hash = ""; // For storing the file hash for convenient access. Only the last saved state! To prevent overwriting changed files
		
		file.changed = false; // If the file has changed from last save
		file.isSaved = false; // file.isSaved is the opposit of file.changed, but can only be true if the file is also saved as!
		file.savedAs = false;
		file.lastChange = new Date();
		
		file.noChangeEvents = false; // Do not call file change event listeners if set to true
		
		file.isCallingChangeEventListeners = undefined; // Prevent fileChange event listeners from changing the file. Will point to the offending function
		
		file.noCollaboration = false; // Disable collaboration on this file if set to true

		file.disallowScrollingBeyondEof = false;

		file.text = text;
		file.path = path;
		file.isBig = bigFile ? true : false;
		file.index = fileIndex;
		file.order = fileIndex; // For ordering files, in for example a tab list
		file.name = UTIL.getFilenameFromPath(path);
		
		/*
			Check if a file has been parsed:
			file.parsed == null

			Forbid parsers from parsing a file:
			file.disableParsing = true

			Check if the file has been auto-indentated:
			file.fullAutoIndentation

		*/

		file.fileExtension = UTIL.getFileExtension(file.path); // Without the dot
		file.disableParsing = (stateProps && stateProps.disableParsing != undefined) ? stateProps.disableParsing : false;
		
		if(!stateProps || stateProps.disableParsing == undefined) {
			var fullAutoIndentation = file.checkFullAutoIndentationSupport();
		}
		else {
			var fullAutoIndentation = stateProps.fullAutoIndentation;
		}

		//console.warn("Set file.fullAutoIndentation=" + fullAutoIndentation);
		file.fullAutoIndentation = fullAutoIndentation;

		if( QUERY_STRING["plainTextOnly"] ) {
			// Use plain text mode in order to feel the pain
			file.fullAutoIndentation = false;
			file.disableParsing = true;
		}
		
		file.lineBreak = UTIL.determineLineBreakCharacters(text);
		
		
		//console.log("file.lineBreak=" + file.lineBreak.replace(/\r/g, "CR").replace(/\n/g, "LF"));
		file.text = UTIL.fixInconsistentLineBreaks(text, file.lineBreak); // Many functions count on the linebreak character being consistent
		file.indentation = UTIL.determineIndentationConvention(text, file.lineBreak);
		file.partStartRow = 0;
		file.tail = false; // We are on the last part of the stream if true
		file.head = false, // We are on the first part of the stream if true
		
		file.isStreaming = false; // If the file is currently pulling data from the file read stream
		file.render = true; // Can (temporary) disable rendering for this file by setting it to false
		
		file.startRow = 0;    // Scrolling up/down
		file.startColumn = 0; // Scrolling left/right
		
		file.selected = []; // Selected text boxes
		file.highlighted = []; // Highlighted text boxes
		
		
		
		this.loadFilePartDialog = undefined; // To prevent many dialogs from loadFilePart
		
		if(file.fullAutoIndentation) {
			// Don't let the file start or end with a tab
			while(file.text.charAt(0) == "\t") file.text = file.text.slice(1);
			while(file.text.charAt(file.text.length-1) == "\t") file.text = file.text.slice(0, file.text.length-1);
		}
		
		//console.log("Gonna create the grid for file.path=" + file.path);	
		file.grid = file.createGrid();
		
		var checkGridError = null;
		try {
			file.checkGrid(); // Sanity check
		}
		catch(err) {
			checkGridError = err;
		}
		
		// A splitted emty string will always become one item in an array. So if the file is empty: file.grid.length will be 1
		file.totalRows = file.grid.length-1; // Only big files use this!
		if(file.isBig) file.totalRows = -1; // Leaving it to loadFilePart() to find totalRows
		
		var checkCaretError = null;
		try {
		file.caret = file.createCaret(0,0,0); // Create the caret, even if it's a stream
		}
		catch(err) {
			checkCaretError = err;
			// We failed to create the caret, so create a caret manually
			if(checkGridError) {
				//console.warn("Problem creating grid and placing caret in file.path=" + path);
				file.text = file.text.trim();
				if(file.text.length == 0) file.caret = {index: 0, row: 0, col: 0, eol: true, eof: true};
				else file.caret = {index: 0, row: 0, col: 0, eol: false, eof: false};
			}
			else file.caret = {index: 0, row: 0, col: 0, eol: (file.grid[0].length > 0 ? false : true), eof: (file.grid.length > 0 ? false : true)};
		}
		
		
		if(file.isBig) {
			file.disableParsing = true; // Do not parse big files
			file.fullAutoIndentation = false; // Again, don't try to parse it
			file.loadFilePart(file.partStartRow, function filePartLoaded() {
				
				if(callback) callback(checkGridError || checkCaretError);
				
			});
			
		}
		else {
			
			// Q: Why is there a setTimeout here ?
			// A: Callback needs to be called *after* new File constructor has returned!
			// (otherwise the variable that new File will be assigned to will still be undefined when the callback functions runs) 
			if(callback) setTimeout(function newFileConstructorFinished() {
			callback(checkGridError || checkCaretError);
			}, 0);
			
		}
		
		//console.log("new file Reloading file.path=" + file.path + " file.fullAutoIndentation=" + file.fullAutoIndentation + " file.fileExtension=" + file.fileExtension);
		
	}
	
	File.prototype.checkFullAutoIndentationSupport = function() {
		var file = this;

		//console.log("File: file.disableParsing=" + file.disableParsing);

		var fullAutoIndentation = false;

		if(!file.disableParsing) {
			
			for(var i=0, canParseResult; i<EDITOR.parsers.length; i++) {
				canParseResult = EDITOR.parsers[i].canParse(file);
				//console.log("File: Parser " + i + " () canParseResult=", canParseResult);
				if(canParseResult && canParseResult.fullAutoIndentation) {
					fullAutoIndentation = true;
					break;
				}
			}
		}

		return fullAutoIndentation;
	}

	File.prototype.whiteSpaceOnRow = function(row) {
		var file = this;

		if(row == undefined) row = file.caret.row;

		if(row < 0) throw new Error("row=" + row + " less then zero");
		if(row >= file.grid.length) throw new Error("File.rowText: row=" + row + " can not be more or equal to file.grid.length=" + file.grid.length);

		var whiteSpace = file.grid[row].indentationCharacters;

		if(whiteSpace) return whiteSpace;

		var start = file.grid[row].startIndex;
		var end = start + file.grid[row].length;
		var reSpace = /\s/;
		for(var i=start; i<end ; i++) {

			//console.log( "whiteSpaceOnRow: i=" + i + " text=" + UTIL.lbChars(file.text[i]) + " match?" + (!!file.text[i].match(reSpace)) );

			if(file.text[i].match(reSpace)) whiteSpace += file.text[i];
			else break;
		}

		return whiteSpace;
	}

	File.prototype.rowText = function(row, includeIndentationCharacters) {
		var file = this;
		
		// Returns the characters on that row
		
		if(row == undefined) row = file.caret.row;
		//if(row == undefined) throw new Error("First argument row=" + row + " in File.rowText() need to be specified!");
		
		if(includeIndentationCharacters == undefined) includeIndentationCharacters = true; // Including indentation characters!
		
		// No need to check row because it will throw an error anyway if it's "wrong". But this gives friendlier error:
		if(row < 0) throw new Error("row=" + row + " less then zero");
		if(row >= file.grid.length) throw new Error("File.rowText: row=" + row + " can not be more or equal to file.grid.length=" + file.grid.length);
		
		var txt = "";
		
		if(includeIndentationCharacters) txt = txt + file.grid[row].indentationCharacters;
		
		for(var col=0; col<file.grid[row].length; col++) {
			txt = txt + file.grid[row][col].char;
		}
		return txt;
	}
	
	File.prototype.copyCaret = function copyCaret(caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		
		return file.mutateCaret({}, caret);
	}

	File.prototype.currentLine = function currentLine(caret) {
		var file = this;

		if(caret == undefined) caret = file.caret;

		return caret.row + file.partStartRow + 1;
	}
	
	File.prototype.mutateCaret = function(oldCaret, newCaret) {
		var file = this;
		
		/*
			Takes all properties from newCaret and gives it to oldCaret
			Can be used to mutate, clone, or copy the caret object
			
			Consider using File.fixCaret() !
		*/
		
		if(typeof oldCaret != "object") {
			throw new Error("Caret (first argument) need to be an object! (but not necessarily a caret)");
		}
		
		//console.log("File:mutateCaret");
		
		file.checkCaret(newCaret);
		
		oldCaret.index = newCaret.index;
		oldCaret.col = parseInt(newCaret.col);
		oldCaret.row = parseInt(newCaret.row);
		oldCaret.eol = newCaret.eol;
		oldCaret.eof = newCaret.eof;
		
		if(oldCaret == file.caret) EDITOR.fireEvent("moveCaret", [file, file.caret]);
		
		return oldCaret;
	}
	
	
	File.prototype.moveCaret = function(index, row, col, caret) {
		var file = this;
		
		//console.log("File:moveCaret");
		
		if(caret == undefined) caret = file.caret;
		
		if(caret.index == index && caret.row == row && caret.col == col) {
			//console.warn("Caret already at " + JSON.stringify(file.caret));
			return caret;
		}
		
		if(index != undefined && row == undefined && col == undefined) return file.moveCaretToIndex(index, caret);
		else {

			if(index != undefined) caret.index = index;
			if(row != undefined) caret.row = parseInt(row);
			if(col != undefined) caret.col = parseInt(col);
		
			file.fixCaret(caret);

			if(caret == file.caret) {
				EDITOR.fireEvent("moveCaret", [file, file.caret]);
				EDITOR.renderNeeded();
			}
			return caret;
		}

	}
	
	
	File.prototype.createCaret = function(index, row, col) {
		var file = this;
		
		/*
			Returns a valid caret position
			
			16259=102| 16260=117| 16261=110| 16262=99| 16263=116| 16264=105| 16265=111| 16266=110| 16267=76| 16268=105| 16269=115| 16270=116| 16271=87| 16272=114| 16273=97| 16274=112| 16275=46| 16276=115|
			
			Creating caret at index=16265 row=675 col=0
			grid[675].length=0
			grid[675].startIndex=16329
			
			Character "o" (111) at the caret.index=16265, should be either a Line Feed (10) or Carriage return (13) when caret.eol = true and not caret.eof=true
			File size=36411 rows=1464
			
		*/
		
		if(row != undefined) row = parseInt(row);
		if(col != undefined) col = parseInt(col);
		
		var grid = file.grid;
		var caret = {index: index, row: row, col: col, eol: false, eof: false};
		
		//console.log("File:createCaret index=" + index + " row=" + row + " col=" + col + " grid.length=" + grid.length);

		if(index != undefined) {
			if(index > 0) file.checkGrid(); // Check the grid for errors
		}
		
		if(grid.length == 0) {
			//console.log("File:createCaret: The file has no rows! grid.length=" + grid.length);
			// The file has no rows! But it can still have text, like white space
			// Caret can only be at index=file.text.length, row=0, col=0
			
			// Make sure I know what I'm doing ...
			if(index != undefined) {
				// Index must be file.text.length
				if(index != file.text.length) throw new Error("Index needs to be text.length=" + file.text.length + " when grid.length=" + grid.length);
			}
			
			if(row != undefined) {
				if(row !== 0) throw new Error("row=" + row + " must be 0 when grid.length=" + grid.length);
			}
			
			if(col != undefined) {
				if(col !== 0) throw new Error("col=" + col + " must be 0 when grid.length=" + grid.length);
			}
			
			caret.index = file.text.length;
			caret.row = 0;
			caret.col = 0;
			caret.eol = true;
			caret.eof = true;
			
			//return caret;
		}
		else if(index == undefined && row == undefined && col == undefined) {
			//console.log("File:createCaret: We got nothing: index=" + index + " row=" + row + " col=" + col + " ");
			placeCaretAtFirstRowWithTextOrEof();
		}
		else if(index == undefined && row != undefined && col != undefined) {
			//console.log("File:createCaret: We have row=" + row + " and col=" + col + ", but not index=" + index);
			if(isNaN(row)) {
				throw new Error("row=" + row + " is not a number!");
			}
			else if(row < 0) {
				throw new Error("row=" + row + " < 0");
			}
			else if(row >= grid.length) {
				throw new Error("row=" + row + " >= grid.length=" + grid.length);
			}
			else if(isNaN(col)) {
				throw new Error("col=" + col + " is not a number!");
			}
			else if(col < 0) {
				throw new Error("col=" + col + " < 0");
			}
			else if(col > grid[row].length) {
				throw new Error("col=" + col + " > grid[" + row + "].length=" + grid[row].length);
			}
			else {
				caret.index = file.getIndexFromRowCol(row, col);
				caret.row = row;
				caret.col = col;
				
				if(col == grid[row].length) {
					caret.eol = true;
					
					if(row == (grid.length-1)) caret.eof = true;
				}
				// Default caret.eol and caret.eof is false!
			}
		}
		else if(index == undefined && row != undefined) {
			//console.log("File:createCaret: We have only the row=" + row + " ! index=" + index + " col=" + col);
			if(isNaN(row)) {
				throw new Error("row=" + row + " is not a number!");
			}
			else if(row < 0) {
				throw new Error("row=" + row + " < 0");
			}
			else if(row >= grid.length) {
				throw new Error("File:createCaret: row=" + row + " >= grid.length=" + grid.length + " file.isBig=" + file.isBig);
			}
			else {
				// Place the caret on that row
				caret.index = grid[row].startIndex;
				caret.row = row;
				caret.col = 0;
				
				if(grid[row].length == 0) caret.eol = true;
				
				if(grid[row].length == 0 && row == (grid.length-1)) caret.eof = true;
				
			}
			}
		else if(index == undefined && col != undefined) {
			//console.log("File:createCaret: We have only the col=" + col + " ! index=" + index + " row=" + row);
			if(isNaN(col)) {
				throw new Error("col=" + col + " is not a number!");
			}
			else if(col < 0) {
				throw new Error("col=" + col + " < 0");
			}
			else {
				if(col == 0) {
					placeCaretAtFirstRowWithTextOrEof();
				}
				else {
					// Find a row with at least col characters
					var r = 0;
					while(r < grid.length) {
						if(grid[r].length >= col) break;
						r++;
					}
					if(r == grid.length) {
						// Place caret at EOF
						r--;
						caret.index = file.text.length;
						caret.row = r;
						caret.col = grid[r].length;
						caret.eol = true;
						caret.eof = true;
					}
					else {
						caret.index = file.getIndexFromRowCol(r, col);
						caret.row = r;
						caret.col = col;
						
						if(col == grid[r].length) caret.eol = true;
						
					}
					
				}
			}
			
		}
		else {
			//console.log("File:createCaret: We have only index=" + index + " ! row=" + row + " col=" + col + "");
			if(isNaN(index)) {
				throw new Error("Index is not a number!");
			}
			else {
				//console.log("Placing new caret at index=" + index + " (character=" + file.text.charAt(index) + " charCode=" + file.text.charCodeAt(index) + ")");
				
				caret = file.moveCaretToIndex(index, caret);
			}
		}
		
		//console.log("Creating caret at index=" + caret.index + " row=" + caret.row + " col=" + caret.col + " eol=" + caret.eol + " eof=" + caret.eof + " grid.length=" + grid.length);
		//console.log(UTIL.getStack("creating caret"));
		
		// Sanity check if we got it right
		if(caret.index == undefined) {
			throw new Error("caret.index=" + caret.index + " is undefined!");
		}
		
		if(caret.row == undefined) {
			throw new Error("caret.row=" + caret.row + " is undefined!");
		}
		
		if(caret.col == undefined) {
			throw new Error("caret.col=" + caret.col + " is undefined!");
		}
		
		if(grid.length < caret.row) {
			throw new Error("Row " + caret.row + " is higher then last row=" + grid.length + "");
		}
		
		if(grid[caret.row].length < caret.col) {
			throw new Error("Caret col=" + caret.col + " is higher then available columns on row " + caret.row + ", witch is " + grid[row].length + "");
		}

		if(caret.row < 0) {
			throw new Error("Caret row=" + caret.row + " must be higher then zero!");
		}
		
		if(caret.col < 0) {
			throw new Error("Caret col=" + caret.col + " must be higher then zero!");
		}
		
		//console.log("grid[" + caret.row + "].length=" + grid[caret.row].length);
		//console.log("grid[" + caret.row + "].startIndex=" + grid[caret.row].startIndex);
		
		// Check if we got eol & eof right ...
		if(caret.col == grid[caret.row].length) {
			if(caret.eol != true) throw new Error("caret.eol=" + caret.eol + " should be true when caret.col=" + caret.col + " == grid[" + caret.row + "].length=" + grid[caret.row].length);
			//caret.eol = true;
			
			if(caret.index == file.text.length) {
				if(caret.eof != true) throw new Error("caret.eof=" + caret.eof + " should be true when caret.col=" + caret.col + " == grid[" + caret.row + "].length=" + grid[caret.row].length + ", grid.length=" + grid.length + " and caret.index=" + caret.index + " == file.text.length=" + file.text.length);
				//caret.eof = true;
			}
			else {
				if(caret.eof != false) {
					//file.debugGrid();
					throw new Error("caret.eof=" + caret.eof + " should be false when caret.col=" + caret.col + " == grid[" + caret.row + "].length=" + grid[caret.row].length + ", grid.length=" + grid.length + " and NOT caret.index=" + caret.index + " == file.text.length=" + file.text.length + " (index=" + index + " row=" + row + " col=" + col + ") ");
				}
				//caret.eof = false;
			}
		}
		else {
			if(caret.eol != false || caret.eof != false) throw new Error("Both caret.eol=" + caret.eol + " and  caret.eof=" + caret.eof + " should be false when NOT caret.col=" + caret.col + " == grid[" + caret.row + "].length=" + grid[caret.row].length);
			//caret.eol = false;
			//caret.eof = false;
		}
		
		if(!caret.eol) {
			if(grid[caret.row][caret.col].index != caret.index) {
				throw new Error("Caret index=" + caret.index + " is not the same as the index on row=" + caret.row + " and col=" + caret.col + ", and it should be index=" + grid[caret.row][caret.col].index + "");
				caret.index = grid[caret.row][caret.col].index;
			}
		}
		
		file.checkCaret(caret); // Another sanity check (we have already checked once, but it doesn't hurt to check twice)
		
		return caret;
		
		function placeCaretAtFirstRowWithTextOrEof() {
			var row = 0;
			while(row < grid.length) {
				if(grid[row].length > 0) break;
				row++;
			}
			if(row == file.grid.length) {
				// Didn't find any line with text. Place caret at EOF
				caret.index = file.text.length;
				caret.row = grid.length-1;
				caret.col = 0;
				caret.eol = true;
				caret.eof = true;
			}
			else {
				// We found some text
				var firstCol = grid[row][0];
				caret.index = firstCol.index;
				caret.row = row;
				caret.col = 0;
				caret.eol = false;
				caret.eof = false;
			}
		}
		}
	
	
	File.prototype.checkGrid = function() {
		/* 
			Sanity check for the grid to detect possible bugs
			
			Having the file representated in both a text string and grid array 
			and then cross checking them for errors does find a lot of bugs!
			
		*/
		
		if(EDITOR.settings.devMode == false) {
			return;
		}
		
		// TEST-CODE-START

		var file = this;
		var row = 0;
		var col = 0;
		var grid = file.grid;
		var lastRow;
		var expect;
		var box;
		var lineBreakCharacters;
		var index = 0;
		
		if(file.fullAutoIndentation) {
			// Files ending up with a tab at the start or end is so common that we can't throw an error.
			// It is for example used in some tests
			// We do however want to figure out all the reasons why the file ends up with a tab at the end! (and fix them)
		if(file.text.charAt(0) == "\t") {
				//throw new Error("File grid sanity check error: File starts with a tab: " + file.path);
				console.warn("File grid sanity check error: File starts with a tab: " + file.path);
				if(EDITOR.settings.devMode && !EDITOR.runningTests) alertBox("File starts with a tab: " + file.path);
			}
			if(file.text.charAt(file.text.length-1) == "\t") {
				//throw new Error("File grid sanity check error: File ends with a tab: " + file.path);
				console.warn("File grid sanity check error: File ends with a tab: " + file.path);
				if(EDITOR.settings.devMode && !EDITOR.runningTests) alertBox("File now ends with a tab: " + file.path);
			}
		}
		
		if(file.startRow % 1 > 0) throw new Error("File grid sanity check error: file.startRow=" + file.startRow + " Needs to be an integer!");
		
		if(file.startRow < 0) throw new Error("File grid sanity check error: file.startRow=" + file.startRow + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows + "");
		
		if(file.partStartRow > 0) {
			if(file.startRow >= (grid.length + file.partStartRow)) throw new Error("File grid sanity check error: file.startRow=" + file.startRow + " grid.length=" + grid.length + " file.partStartRow=" + file.partStartRow);
		}
		
		for(var row=0; row<grid.length; row++) {
			
			// Make sure the properties exist
			if(typeof grid[row].startIndex !== "number") throw new Error("File grid sanity check error: startIndex of grid row=" + row + " is " + grid[row].startIndex + " (not a number)");
			if(typeof grid[row].lineNumber !== "number") throw new Error("File grid sanity check error: lineNumber of grid row=" + row + " is " + grid[row].lineNumber + " (not a number)");
			if(typeof grid[row].indentation !== "number") throw new Error("File grid sanity check error: indentation of grid row=" + row + " is " + grid[row].indentation + " (not a number)");
			if(typeof grid[row].indentationCharacters !== "string") throw new Error("File grid sanity check error: indentationCharacters of grid row=" + row + " is " + grid[row].indentationCharacters + " (not a string)");
			
			
			// Check Startindex
			
			index += grid[row].indentationCharacters.length;
			
			if(grid[row].startIndex != index) {
				file.debugGrid();
				throw new Error("File grid sanity check error: grid[" + row + "].startIndex=" + grid[row].startIndex + " Expected startIndex=index=" + index + " grid[" + row + "].indentationCharacters=" + UTIL.lbChars(grid[row].indentationCharacters) + " (" + grid[row].indentationCharacters.length + " characters)");
			}
			index += grid[row].length + file.lineBreak.length;
			
			
			if(grid[row].length > 0) {
				// Startindex should be the same as the index of the first letter box
				if(grid[row].startIndex != grid[row][0].index) {
					file.debugGrid();
					throw new Error("File grid sanity check error: startIndex (" + grid[row].startIndex + ") on row " + row + " doesn't match index (" + grid[row][0].index + ") of first box=" + JSON.stringify(grid[row][0]));
				}
			}
			else if(row>0){
				lastRow = grid[row-1];
				// Startindex should be: lastrow.startIndex + lastRow.length + lineBreak.length + currentRow.indentationCharacters.length
				expect = lastRow.startIndex + lastRow.length + file.lineBreak.length + grid[row].indentationCharacters.length;
				if(grid[row].startIndex != expect) {
					file.debugGrid();
					throw new Error("File grid sanity check error: Row " + row + " has startIndex=" + grid[row].startIndex + " but it was expected to be " + expect + ".\nlastRow.startIndex=" + lastRow.startIndex + " lastRow.indentationCharacters.length=" + lastRow.indentationCharacters.length + " lastRow.length=" + (lastRow.length) + " file.lineBreak.length=" + file.lineBreak.length + " currentRow.indentationCharacters.length=" + grid[row].indentationCharacters.length + " path=" + file.path);
				}
			}
			
			// Check Line number
			if(row>0){
				lastRow = grid[row-1];
				if((grid[row].lineNumber-1) != lastRow.lineNumber) {
					throw new Error("File grid sanity check error: Line number of row " + row + " is " + grid[row].lineNumber + " but was expected to be " + (lastRow.lineNumber+1) + ". Row " + (row-1) + " lineNumber = " + lastRow.lineNumber + "");
				}
			}
			
			
			// Check line breaks from the row above
			if(row>0){
				lineBreakCharacters = "";
				for(var lbCharNr=file.lineBreak.length; lbCharNr>0; lbCharNr--) {
					lineBreakCharacters += file.text.charAt(grid[row].startIndex - grid[row].indentationCharacters.length - lbCharNr);
				}
				
				if(lineBreakCharacters != file.lineBreak) {
					expect = "";
					for(var lbCharNr=0; lbCharNr<file.lineBreak.length; lbCharNr++) {
						expect += lineBreakCharacters.charCodeAt(lbCharNr) + "==" + file.lineBreak.charCodeAt(lbCharNr) + " "
					}
					file.debugGrid();
					throw new Error("File grid sanity check error: Expected the last " + file.lineBreak.length + " characters(s) (" + UTIL.lbChars(lineBreakCharacters) + ") on Line " + (row) + " to be a line-break: (" + expect + ") file.lineBreak=" + UTIL.lbChars(file.lineBreak) + " grid[" + row + "].startIndex=" +  grid[row].startIndex + " in file=" + file.path + " file.text=" + UTIL.lbChars(file.text));
				}
			}
			
			// Check indentation
			if(grid[row].indentation < 0) {
				throw new Error("File grid sanity check error: Indentation is " + grid[row].indentation + " or row " + row + "!");
			}
			
			
			for(var col=0; col<grid[row].length; col++) {
				// Check if character on the grid and on file.text is the same
				if(grid[row][col].char != file.text.charAt(grid[row][col].index)) {
					file.debugGrid();
					throw new Error("File grid sanity check error: grid[" + row + "][" + col + "].char=" + UTIL.lbChars(grid[row][col].char) + " is not the same as file.text.charAt(" + grid[row][col].index + ")=" + UTIL.lbChars(file.text.charAt(grid[row][col].index)));
				}
				// Make sure there is no line break character in the middle of the text
				else if(file.text.charCodeAt(grid[row][col].index) == 10 || file.text.charCodeAt(grid[row][col].index) == 13) {
				throw new Error("File grid sanity check error: Line break in the middle of the row:\n grid[" + row + "].length=" + grid[row].length + " grid[" + row + "][" + col + "].char=" + grid[row][col].char + " (" + file.text.charCodeAt(grid[row][col].index) + ") is a line break character! file.lineBreak=" + UTIL.lbChars(file.lineBreak) + " file.path=" + file.path);
			}
				
				// Make sure the box has these properties:
				box = grid[row][col];
				if(box.char === undefined) throw new Error("File grid sanity check error: grid[" + row + "][" + col + "] doesn't have a char value!");
				if(box.index === undefined) throw new Error("File grid sanity check error: grid[" + row + "][" + col + "] doesn't have a index value!");
				if(box.color === undefined) throw new Error("File grid sanity check error: grid[" + row + "][" + col + "] doesn't have a color value!");
				if(box.selected === undefined) throw new Error("File grid sanity check error: grid[" + row + "][" + col + "] doesn't have a selected value!");
				if(box.highlighted === undefined) throw new Error("File grid sanity check error: grid[" + row + "][" + col + "] doesn't have a highlighted value!");
				
				if(box.char === "") throw new Error("File grid sanity check error: grid[" + row + "][" + col + "].char is nothing!"); 
			}
			
		}
		
		if(EDITOR.currentFile == file) {
		// Check if the scrolling is OK
		if(EDITOR.view.endingColumn != file.startColumn + EDITOR.view.visibleColumns) {
				throw new Error("File grid sanity check error: Scrolling bug:" +  
				" EDITOR.view.endingColumn=" + EDITOR.view.endingColumn + 
				" file.startColumn=" + file.startColumn + 
				" EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns + 
				" EDITOR.currentFile.path=" + EDITOR.currentFile.path + 
				" file.path=" + file.path);
			}
		}
		
		// TEST-CODE-END

	}
	
	File.prototype.checkCaret = function(caret) {
		// Sanity check to detect possible bugs
		
		if(EDITOR.settings.devMode == false) {
			return;
		}
		
		// TEST-CODE-START

		var file = this,
		char;
		
		if(caret == undefined) {
			//console.warn("No caret specified, checking file.caret ...");
			caret = file.caret;
		}
		
		if(caret == undefined) throw new Error("File has no caret: " + file.path);
		
		//console.log("Checking caret=" + JSON.stringify(caret));
		
		if(caret.index == null) {
			throw new Error("Caret index is null! isFileCaret=" + (caret == file.caret) + " caret=" + JSON.stringify(caret));
		}
		else if(isNaN(caret.index)) {
			throw new Error("Caret index is NaN!");
		}
		else if(caret.eof == undefined) {
			throw new Error("Caret eof is undefined!");
		}
		else if(caret.eof == null) {
			throw new Error("Caret eof is null!");
		}
		else if(caret.eof != true && caret.eof != false) {
			throw new Error("Caret eof is not true or false!");
		}
		else if(caret.eol == undefined) {
			throw new Error("Caret eol is undefined!");
		}
		else if(caret.eol == null) {
			throw new Error("Caret eol is null!");
		}
		else if(caret.eol != true && caret.eol != false) {
			throw new Error("Caret eol is not true or false!");
		}
		else if(isNaN(caret.row)) {
			throw new Error("Caret row is NaN!");
		}
		else if(isNaN(caret.col)) {
			throw new Error("Caret col is NaN!");
		}
		
		
		if(file.grid.length == 0) {
			console.warn("The grid is zero");
			
			if(caret.row !== 0) throw new Error("wow must be 0 when there's no grid");
			if(caret.col !== 0) throw new Error("col must be 0 when there's no grid");
			if(caret.eof !== true) throw new Error("eof must be true when there's no grid");
			if(caret.eol !== true) throw new Error("eol must be true when there's no grid");
			if(caret.index !== 0) throw new Error("index must be 0 when there's no grid");
			return; // No more checking is needed if theres no grid
		}
		
		if(caret.row >= file.grid.length) throw new Error("caret.row=" + caret.row + " >= file.grid.length=" + file.grid.length);
		
		if(caret.eof) {
			if(caret.row != (file.grid.length-1)) {
				throw new Error("Caret on row " + caret.row + " (caret=" + JSON.stringify(caret) + "). Expected it to be on row " + (file.grid.length-1) + " because caret.eof = true in file.path=" + file.path);
			}
			else if(caret.eol != true) {
				throw new Error("Caret should be on EOL when caret.eof = true\ncaret=" + JSON.stringify(caret) + "\n" + "file.text.length=" + file.text.length + " file.path=" + file.path);
			}
		}
		if(caret.eol) {
			if(caret.col != file.grid[caret.row].length) {
				throw new Error("Caret on column " + caret.col + ". Expected it to be on column file.grid[" + caret.row + "].length=" + file.grid[caret.row].length + " because caret.eol=" + caret.eol + " (true) ");
			}
			if(!caret.eof) {
				char = file.text.charAt(caret.index);
				if(char != "\r" && char != "\n") {
					file.debugGrid();
					throw new Error("Character \"" + char + "\" (" + char.charCodeAt(0) + ") at the caret.index=" + caret.index + 
					", should be either a Line Feed (10) or Carriage return (13) when caret.eol = " + caret.eol + 
					"(true) and not caret.eof=true(" + caret.eof + ")\nFile size=" + file.text.length + " rows=" + (file.grid.length+1) + 
					" caret.row=" + caret.row + " caret.col=" + caret.col + " file.grid[" + caret.row + "].length=" + file.grid[caret.row].length + 
					"file.path=" + file.path + " file.text=" + UTIL.lbChars(file.text));
				}
			}
		}
		else if(caret.eof == false) {
			
			if(caret.eol == false) {
				
				if(!file.grid[caret.row][caret.col]) {
					throw new Error("file.grid[" + caret.row + "][" + caret.col + "]=" + file.grid[caret.row][caret.col] + " when caret.eol=" + caret.eol + " file.grid[" + caret.row + "].length=" + file.grid[caret.row].length + " grid.length=" + file.grid.length + " in file.path=" + file.path + " row: " + UTIL.lbChars(file.rowText(caret.row, false)) );
				}
				else if(file.grid[caret.row][caret.col].char != file.text.charAt(caret.index)) {
					file.debugGrid();
					throw new Error("Character \"" + file.grid[caret.row][caret.col].char + "\" on file.grid[" + caret.row + "][" + caret.col + "] is not the same as character \"" + file.text.charAt(caret.index) + "\" in file.text on caret.index=" + caret.index + "");
				}
			}
			
			if(caret.index==file.text.length) {
				throw new Error("Caret should be on EOF! caret.index=" + caret.index + " file.text.length=" + file.text.length + "");
			}
		}
		
		// TEST-CODE-END
	}
	
	File.prototype.sanityCheck = function() {
		var file = this;
		
		if(EDITOR.settings.devMode == false) {
			return;
		}
		
		// TEST-CODE-START
		file.checkGrid();
		file.checkCaret();
		
		//file.debugGrid();
		
		// TEST-CODE-END

	}
	
	File.prototype.write = function(text, addLineBreak) {
		// Writes text at EOF (faster then insertText)
		
		// Note: Try to avoid console.log in this function in order to prevent recursion with debug_console.js plugin

		if(FILE_WRITE_RECURSION !== 0) throw new Error("File.write recursion! file.path=" + file.path + " text=" + text);

		FILE_WRITE_RECURSION++;

		//console.log("File.write: text=" + text);

		if(typeof text != "string") text = UTIL.toString(text);
		
		if(!UTIL.isString(text)) throw new Error("text is not a string! text=" + text);
		
		if(text.length == 0) {
			//console.warn("No text in write argument!");
			FILE_WRITE_RECURSION--;
			return;
		}
		
		var file = this;
		
		if(text.indexOf(file.lineBreak) != -1) {
			
			var rows = text.split(file.lineBreak);
			
			for(var i=0; i<rows.length; i++) {
				rows[i].replace(/\n|\r/g, ""); // Remove all CR and LF
				if(rows[i] == "") file.writeLineBreak();
				else file.writeLine(rows[i]);
			}
			addLineBreakMaybe();
			FILE_WRITE_RECURSION--;
			return;
		}
		
		var grid = file.grid;
		var textIndex = file.text.length;
		var gridRow = grid[grid.length-1]; // Last row
		
		var char = "";
		for(var i=0; i<text.length; i++) {
			char = text.charAt(i);
			
			gridRow.push(new Box(char, textIndex));
			
			textIndex++;
		}
		
		file.text += text;
		
		file.checkGrid();

		if(file.caret.eof) {
			// Move the caret (only have to do that if it's EOF)
			file.caret.index = file.text.length;
			file.caret.row = grid.length - 1;
			file.caret.col = grid[grid.length-1].length;
			
			file.checkCaret();
			
			file.scrollToCaret();
		}
		
		addLineBreakMaybe();
		
		FILE_WRITE_RECURSION--;

		function addLineBreakMaybe() {

			if(file.text.length == 0) throw new Error("added text=" + text + " but file.text.length=" + file.text.length + " file.text=" + file.text);

			if(addLineBreak) {
				
				file.debugGrid();

				var caret = file.createCaret(file.text.length);
				file.insertLineBreak(caret);

			}
		}
	}
	
	File.prototype.writeLine = function(text) {
		/*
			Insert a new line at EOF
			
			Always add another row because it's more simple, sligly faster and less bug prone.
			If you want to add text to the first row, open the file using that text.
			Use File.insertTextRow() to insert a row before EOF.


			Note: Try to avoid console.log in this function in order to prevent recursion with debug_console.js plugin
		*/
		
		
		
		text = text + ''; // Convert to string if it's not already a string
		
		if(text.length == 0) {
			//console.warn("No text in writeLine argument!");
			return;
		}
		
		var file = this;
		var grid = file.grid;
		var textIndex = file.text.length + file.lineBreak.length;
		
file.sanityCheck();

		if(text.indexOf(file.lineBreak) != -1) {
			var rows = text.split(file.lineBreak);
			// Add the lines one by one
			for(var i=0; i<rows.length; i++) {
				rows[i].replace(/\n|\r/g, ""); // Remove all CR and LF
				
				insertGridRow(file, textIndex, rows[i]);
				file.text += file.lineBreak;
				file.text += rows[i];
				textIndex += rows[i].length 
				textIndex += file.lineBreak.length;
			}
			return;
		}
		
		if(text.indexOf("\n") != -1) throw new Error("File.writeLine: Text contains a line break: " + text);
		
		insertGridRow(file, textIndex, text);
		file.text += file.lineBreak
		file.text += text;
		
		file.checkGrid();
		
		if(file.caret.eof) {
			// Move the caret (only have to do that if it's EOF)
			file.caret.index = file.text.length;
			file.caret.row = grid.length - 1;
			file.caret.col = grid[grid.length-1].length;
			
			file.checkCaret();
			
			file.scrollToCaret();
		}
		
		file.sanityCheck();
		
	}
	
	File.prototype.writeLineBreak = function() {
		// Inserts a line break at EOF
		var file = this;
		
		if(!file.lineBreak) throw new Error("File has no line break! file.lineBreak=" + file.lineBreak);
		
		file.sanityCheck();
		
		var textIndex = file.text.length + file.lineBreak.length;
		
		insertGridRow(file, textIndex, "");
		
		file.text += file.lineBreak;
		
		var grid = file.grid;
		if(file.caret.eof) {
			// Move the caret (only have to do that if it's EOF)
			file.caret.index = file.text.length;
			file.caret.row = grid.length - 1;
			file.caret.col = grid[grid.length-1].length;
			
			file.checkCaret();
			
			file.scrollToCaret();
		}
		
		file.sanityCheck();
		
		// Should I call file.change !?!?!?
		
	}
	
	File.prototype.insertTextOnRow = function(text, row) {
		// Inserts text at the first column at row
		
		var file = this;
		var grid = file.grid;
		
		if(text == undefined) throw new Error("File.insertTextOnRow: First parameter text is undefined!");
		if(text.length == 0) {
			//throw new Error("File.insertTextOnRow: First parameter text has zero length!");
			//console.warn("File.insertTextOnRow doing nothing because text.length=" + text.length);
			return;
		}
		if(row == undefined) throw new Error("File.insertTextOnRow: Second parameter row is undefined!");
		if(row >= grid.length) throw new Error("row=" + row + " is above grid.length=" + grid.length);
		if(row < 0) throw new Error("row=" + row + " is below zero!");
		
		//console.log("insertTextOnRow row=" + row);
				
		//var startIndex = grid[row].startIndex;
		//file.moveCaretToIndex(startIndex);
		
		file.moveCaret(undefined, row, 0);
		
		file.insertText(text);
		
	}
	
	File.prototype.insertTextRow = function(text, row) {
		//console.log("Insert a new row of text=" + text + " at row=" + row);
		
		var file = this;
		var grid = file.grid;

		if(text == undefined) throw new Error("Argument text is undefined!");
		if(row == undefined) throw new Error("Argument row is undefined!");

		if(row >= grid.length) {
			//console.warn("row=" + row + " is above grid.length=" + grid.length + " text will be inserted at EOL");
			file.writeLine(text);
			return true;
		}
		
		if(row < 0) throw new Error("row=" + row + " is below zero!");
		
		file.moveCaret(undefined, row, 0);

		if(text.length == 0) {
			// Only insert a line-break
			file.insertLineBreak();
			return true;
		}
		
		file.insertText(text + file.lineBreak);
		
	}
	
	File.prototype.removeText = function(text, firstIndex) {
		// Removes the text, starting at firstIndex
		// Similar to deleteTextRange, but it figures out the range itself
		
		var file = this;
		
		if(firstIndex == undefined) firstIndex = -1;
		
		firstIndex= file.text.indexOf(text, firstIndex);
		
		if(firstIndex == -1) throw new Error("Text not found in file: " + file.path + ": " + text);
		
		var lastIndex = firstIndex + text.length - 1;
		
		file.deleteTextRange(firstIndex, lastIndex);
		
	}
	
	File.prototype.removeRow = function(row) {
		// Removes all text on that row, plus the line break
		
		var file = this;
		
		//console.log("++++++++++ removeRow row=" + row + " ++++++++++");
		
		file.sanityCheck();
		
		var grid = file.grid;
		
		if(row == undefined) throw new Error("removeRow: Argument row is undefined!");
		if(row >= grid.length) throw new Error("removeRow: row=" + row + " is above grid.length=" + grid.length);
		if(row < 0) throw new Error("removeRow: row=" + row + " is below zero!");
		
		
		var firstIndex = grid[row].startIndex - grid[row].indentationCharacters.length;
		
		//console.log("firstIndex=" + firstIndex + " grid[" + row + "].startIndex=" + grid[row].startIndex + " grid[" + row + "].indentationCharacters.length=" + grid[row].indentationCharacters.length)
		
		var lastIndex;
				
		if(row < (grid.length-1)) {
			lastIndex = grid[row+1].startIndex - grid[row+1].indentationCharacters.length - 1;
		}
		else {
			lastIndex = file.text.length-1; // Index of last character in the file
		}
		
		var removedText = file.text.substring(firstIndex, lastIndex+1); // Second argument in String.substring is "up to, but not including"
		
		var endCol = grid[row].length-1 + grid[row].indentationCharacters.length;
		
		file.text = deletePart(file.text, firstIndex, lastIndex);
		
		file.grid.splice(row, 1); // Remove the row
		
		var deletionLength = removedText.length;
		var lineNumberDecrementor = 1;
		
		fixIndexOnRemainingRows(grid, row, deletionLength, lineNumberDecrementor);
		
		file.fixCaret();
		
		file.sanityCheck();
		
		EDITOR.renderNeeded();
		
		var col = 0;
		file.change("removeRow", removedText, firstIndex, row, col, row, endCol);
		
		
		return removedText;
		
	}
	
	File.prototype.removeAllTextOnRow = function(row) {
		// Removes all text on that row, but keep the line-break
		var file = this;
		var grid = file.grid;
		
		if(row == undefined) throw new Error("Argument row is undefined!");
		if(row >= grid.length) throw new Error("row=" + row + " is above grid.length=" + grid.length);
		if(row < 0) throw new Error("row=" + row + " is below zero!");
		
		if(file.grid[row].length === 0) {
			//console.warn("The row=" + row + " do not contain any text!");
			return "";
		}
		
		var firstIndex = grid[row].startIndex - grid[row].indentationCharacters.length;
		var lastIndex = -1;
		
		if(grid[row].length > 0) {
			lastIndex= grid[row][grid[row].length-1].index;
		}
		else {
			lastIndex = firstIndex + grid[row].indentationCharacters.length - (grid[row].indentationCharacters.length > 0 ? 1 : 0);
		}
		
		// Sanity check:
		var textToBeRemoved = file.text.substring(firstIndex, lastIndex+1);
		if(textToBeRemoved.match(/\n|\r\n/)) {
			file.debugGrid();
			throw new Error("Insane: The range contains a line break! textToBeRemoved=" + UTIL.lbChars(textToBeRemoved) + " RAW: ***" + textToBeRemoved + "*** firstIndex=" + firstIndex + " lastIndex=" + lastIndex + " grid[" + row + "].indentationCharacters.length=" + grid[row].indentationCharacters.length + " file.path=" + file.path);
		}
		
		file.sanityCheck();
		
		return file.deleteTextRange(firstIndex, lastIndex);
		
	}
	
	File.prototype.rowColFromMouse = function(mouseX, mouseY) {
		var file = this;
		
		var mouseRow = Math.floor((mouseY - EDITOR.settings.topMargin) / EDITOR.settings.gridHeight) + file.startRow;
		var clickFeel = EDITOR.settings.gridWidth / 2;
		var gridRow = file.grid[mouseRow] || {indentation: 0};
		var mouseCol = Math.floor((mouseX - EDITOR.settings.leftMargin - (gridRow.indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth + clickFeel) / EDITOR.settings.gridWidth);
		
		return {row: mouseRow, col: mouseCol};
	}
	
	File.prototype.insertSpace = function(spaceCount, caret) {
		// Insert spaceCount spaces at caret
		var file = this;
		
		if(spaceCount == undefined) spaceCount = 1;
		if(caret == undefined) caret = file.caret;
		
		var spaces = "";
		for(var j=0; j<spaceCount; j++) {
			spaces += " ";
		}
		
		return file.insertText(spaces, caret);
	}
	
	File.prototype.insertText = function(text, caret) {
		
		// Inserts text on the position of the caret 
		
		var file = this;
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		if(text == undefined) {
			throw new Error("insertText: No text to insert! text is undefined!");
		}
		else if(typeof text == "object") {
			throw new Error("insertText: First argument to file.insertText should be the text string. The second argument should be the caret (or undefined to use the file caret)");
		}
		else if(!UTIL.isString(text)) {
			throw new Error("insertText: text=" + text + " need to be a string!\n" + text);
		}
		else if(text.length === 0) {
			//console.warn("insertText: No text to insert! (text.length=" + text.length + ")");
			return;
		}
		
		file.sanityCheck();
		
		//console.log("insertText: Inserting '" + text + "' (text.length=" + text.length + ") on " + JSON.stringify(caret) + " (file.text.length=" + file.text.length + ")");
		
		//console.time("insertText");
		
		var index = caret.index;
		
		
		// Fix inconsistent line breaks ? No, we should not alter the text or it will cause undo/redo history indexes to become off. It's up to the caller to sanitize
		//text = text.replace(/\r/g, "");
		//if(file.lineBreak.length > 1) text = text.replace(/\n/g, file.lineBreak);
		
		file.text = file.text.substr(0, index) + text + file.text.substring(index, file.text.length); // Insert the text
		
		var textRows = text.split(file.lineBreak);
		
		// Insert the first row on the same row as the caret
		var gridRow = file.grid[caret.row];
		
		// Take the remaining and save in temp array
		var remain = gridRow.splice(caret.col, gridRow.length-caret.col);
		
		//console.log("insertText: remain=" + JSON.stringify(remain, null, 2));
		
		var textIndex = index;
		//console.log("insertText: 1. textIndex=" + textIndex);
		
		// Add the first text row
		for (var i=0; i<textRows[0].length; i++) {
			gridRow.push(new Box(textRows[0].charAt(i), textIndex));
			//console.log("insertText: Adding Box charAt=" + textRows[0].charAt(i) + " !!" + (!!textRows[0].charAt(i)) + " type=" + (typeof textRows[0].charAt(i)) + " length=" + (textRows[0].charAt(i).length) + " charCode=" + textRows[0].charCodeAt(i) + " codePointAt=" + textRows[0].codePointAt(i));
			textIndex++;
		}
		//console.log("insertText: 2. textIndex=" + textIndex);
		
		
		var gridRowIndex = caret.row;
		
		// Insert the rest of the rows into the grid
		for (var i=1; i<textRows.length; i++) {
			gridRowIndex++;
			textIndex += file.lineBreak.length;
			insertGridRow(file, textIndex, textRows[i], gridRowIndex);
			textIndex += textRows[i].length;
		}
		//console.log("insertText: 3. textIndex=" + textIndex);
		
		// Update box index of the remaining
		for (var i=0; i<remain.length; i++) {
			remain[i].index = textIndex;
			textIndex++;
		}
		
		//console.log("insertText: 4. textIndex=" + textIndex);
		
		// Insert the remaining at the last inserted row
		
		gridRow = file.grid[gridRowIndex];
		
		//console.log("insertText: caret.row=" + caret.row + " textRows.length=" + textRows.length + " file.grid.length=" + file.grid.length);
		
		//console.log("insertText: gridRow=" + JSON.stringify(gridRow));
		for(var i=0; i<remain.length; i++) {
			gridRow.push(remain[i]);
		}
		
		
		// Update the box index and row startIndex of the rest of the grid
		var incIndex = text.length;
		var incLines = textRows.length-1; 
		
		for(var i=gridRowIndex+1; i<file.grid.length; i++) {
			file.grid[i].startIndex += incIndex;
			file.grid[i].lineNumber += incLines;
			// ... and all columns
			for(var j=0; j<file.grid[i].length; j++) {
				file.grid[i][j].index += incIndex;
			}
		}
		
		//file.debugGrid();
		
		// Save row and col
		var row = caret.row,
		col = caret.col;
		
		// Place the caret at the end of the inserted text
		var newCaret = file.createCaret(index + text.length); //  + 
		file.mutateCaret(caret, newCaret);
		
		if(caret != file.caret) file.fixCaret(file.caret);
		
		//console.timeEnd("insertText");
		
		
		file.sanityCheck();
		
		file.change("text", text, index, row, col);
		
		
		EDITOR.renderNeeded();
		
		
		
		return caret;
		
	}
	
	
	
	File.prototype.putCharacter = function(character, caret) {
		/*
			
			The caller needs to explicitly call EDITOR.renderNeeded()
			
			Do not worry about Word-wrap here, we'll only word-wrap the buffer on the fly!
			
			
			perf: Make box into a plain object ?
			Slighly higher spikes in Chrome, no difference in Opera Mobile.
			
			perf: gridRow variable in nested for loop ?
			Higher spikes in Chrome, no differeence in Opera Mobile
			
			
			
		*/
		var file = this;
		
		if(character.length > 1) {
			//console.warn("Multiple characters are going to be inserted!");
			for(var i=0; i<character.length; i++) {
				file.putCharacter(character[i], caret);
			}
			return;
		}
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		file.checkCaret(caret);
		
		// Delete selection before putting character
		if(file.selected.length > 0) {
			file.deleteSelection();
			caret = file.caret;
		}
		
		var grid = file.grid;
		var row = caret.row;
		var col = caret.col;
		var index = caret.index;
		
		
		if(character == undefined) {
			throw new Error("character is undefined!");
		}
		else if(character.charCodeAt(0) == 10) {
			throw new Error("Tried to insert a line feed character");
		}
		else if(character.charCodeAt(0) == 13) {
			throw new Error("Tried to insert a carriage return character");
		}
		else if(EDITOR.mode == "default" && character.charCodeAt(0) == 9) {
			throw new Error("Tried to insert a tab character");
		}
		else if(character.charCodeAt(0) == 8) {
			throw new Error("Tried to insert a backspace character");
		}
		else if(EDITOR.mode == "default" && character.charCodeAt(0) < 32) {
			throw new Error("Tried to insert a control character (" + character + " = " + character.charCodeAt(0) + ") EDITOR.lastKeyDown=" + EDITOR.lastKeyDown);
		}
		
		EDITOR.lastTimeCharacterInserted = new Date();
		
		// Sanity check in case someting is wrong
		file.sanityCheck();
		
		//console.log("Inserting character: " + character);
		
		//console.time("putCharacter");
		//console.time("putCharacterCore");
		// Insert the character in the text string
		file.text = file.text.substr(0, index) + character + file.text.substring(index+EDITOR.settings.insert, file.text.length);
		
		// Update the grid
		if(EDITOR.settings.insert && !caret.eof && !caret.eol) {
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
			
			
			//console.log("Added " + character + " at index=" + index + " row=" + row + " col=" + col + "");
			
			// Update the caret
			caret.col++;
			caret.index++;
			
			
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
			
			if(caret == file.caret) file.scrollToCaret(caret);
			
		}
		
		//console.timeEnd("putCharacterCore");
		
		// The other caret's might now be off
		if(caret != file.caret) {
			if(file.caret.index >= index) file.caret.index++
			if(file.caret.row == row && file.caret.col >= col) file.caret.col++;
		}
		
		// Call file edit listeners
		file.change("insert", character, index, row, col) // change, text, index, row, col
		
		//console.timeEnd("putCharacter");
		
		file.sanityCheck();
		
	}
	
	File.prototype.checkSelection = function(selection) {
		/* 
			Sanity check selection
			
			Each box in file.selected is a reference to a box in the grid. 
			
		*/
		
		if(EDITOR.settings.devMode == false) return; // Do not check in production
		
		// TEST-CODE-START

		var file = this;
		
		if(selection == undefined) selection = file.selected;
		
		var box = selection;
		
		for(var i=0; i<box.length; i++) {
			// Each box must have an index!
			if(isNaN(box[i].index)) throw new Error("Selected box i=" + i + " has no index! box[" + i + "].index=" + box[i].index + " box[" + i + "]=" + JSON.stringify(box[i]));
			
			// Each selected box must also have the selected boolen set to true
			if(!box[i].selected) throw new Error("Selected box i=" + i + " is not selected! box[" + i + "]=" + JSON.stringify(box[i]));
		}
		
		// All grid boxes that are selected must be in file.selected Array
		var grid = file.grid;
		for(var row=0; row<grid.length; row++) {
			for (var col=0; col<grid[row].length; col++) {
				if(grid[row][col].selected) {
					if(box.indexOf(grid[row][col]) == -1) throw new Error("grid[" + row + "][" + col + "] is selected but not in file.selected!");
				}
			}
		}
		
		//console.log("checkSelection passed!");

		// TEST-CODE-END

	}
	
	File.prototype.select = function(box, direction) {
		var file = this;
		var selection = file.selected;
		var start = 0;
		
		if(box == undefined) {
			//console.warn("Nothing to select!");
			return;
		}
		
		//console.log("Selecting ...");
		
		//console.log(typeof box);
		
		// Turn the box to an array of boxes, if it's not already an array
		if(!Array.isArray(box)) {
			box = [box];
		}
		
		// mark boxes as selected ...
		// boxes already selected will be deselected
		var deselect = [];
		for(var i=0; i<box.length; i++) {
			if(box[i].selected) {
				box[i].selected = false;
				//console.log("DESEL " + JSON.stringify(box[i]));
				deselect.push(box[i]);
			}
			else {
				box[i].selected = true;
				//console.log("SEL " + JSON.stringify(box[i]));
			}
		}
		
		//if(deselect.length > 0) EDITOR.fireEvent("deselect", deselect);
		
		// Remove all deselected boxes
		//console.log("deselect.length=" + deselect.length + " box.length=" + box.length + " selection.length=" + selection.length);
		var remove;
		while(deselect.length > 0) {
			remove = deselect.pop();
			box.splice(box.indexOf(remove), 1);
			selection.splice(selection.indexOf(remove), 1);
		}
		//console.log("deselect.length=" + deselect.length + " box.length=" + box.length + " selection.length=" + selection.length);
		
		if(box.length > 0) {
			// Insert the new boxes on the left or right side
			if(direction == "left") {
				//selection = box.concat(selection);
				for(var i=box.length-1; i>=0; i--) {
					selection.unshift(box[i]);
				}
			}
			else {
				//selection = selection.concat(box);
				for(var i=0; i<box.length; i++) {
					selection.push(box[i]);
				}
			}
		}
		
		// Sort selection by index !?
		
		file.checkSelection();
		
		if(EDITOR.eventListeners.select.length > 0) EDITOR.fireEvent("select", [ file, selection.map(function(box) {return {index: box.index} }) ]);
		
		
		EDITOR.renderNeeded();
		
	}
	
	File.prototype.deselect = function(box) {
		var file = this;
		var selected = file.selected;
		var selectedLength = selected.length;
		
		//console.warn("File.deselect! selectedLength=" + selectedLength);

		if(selectedLength == 0) return; // Early return optimization
		
		if(box) {
			
			if(EDITOR.eventListeners.deselect.length > 0) {
				EDITOR.fireEvent("deselect", [ file, [{index: box.index}] ]);
			}
			
			box.selected = false;
			selected.splice(selected.indexOf(box), 1);
		}
		else {
			// Deselect all
			
			//EDITOR.fireEvent("deselectAll", [ file ]);
			
			//if(EDITOR.eventListeners.deselect.length > 0) EDITOR.fireEvent("deselect", [ file, selected.map(function(box) {return {index: box.index} }) ]);
			
			
			for(var i=0; i<selectedLength; i++) {
				selected[i].selected = false;
			}
			
			selected.length = 0;
		}
		
		file.checkSelection();
		
		EDITOR.renderNeeded();
		
	}
	
	File.prototype.deleteTextRange = function(firstIndex, lastIndex) {
		var file = this;
		
		//console.log("deleteTextRange: firstIndex=" + firstIndex + " lastIndex=" + lastIndex + " " + JSON.stringify(file.rowFromIndex(firstIndex)));
		
		file.sanityCheck();
		//file.debugGrid();
		
		if(firstIndex > lastIndex) throw new Error("deleteTextRange: firstIndex=" + firstIndex + " can not be larger then lastIndex=" + lastIndex + " file.path=" + file.path);
		if(lastIndex >= file.text.length) throw new Error("deleteTextRange: lastIndex=" + lastIndex + " can not be equal or larger then file.text.length=" + file.text.length  + " file.path=" + file.path);
		if(firstIndex < 0) throw new Error("deleteTextRange: firstIndex=" + firstIndex + " can not be less then 0 file.path=" + file.path);

		if(file.lineBreak == "\r\n") {
			if(file.text.charAt(firstIndex) == "\n") throw new Error("deleteTextRange: First index can not be between line-break characters " + UTIL.lbChars(file.lineBreak) + " file.path=" + file.path);
			if(file.text.charAt(lastIndex) == "\n") throw new Error("deleteTextRange: Last index can not be between line-break characters " + UTIL.lbChars(file.lineBreak) + " file.path=" + file.path);
		}
		
		/*
			This function need to be able to reverse File.inserText()!
			The challange is updating the grid, and gridRow.indentationCharacters
		*/
		
		//console.log("++++++++ deleteTextRange ++++++++");
		
		//console.time("deleteTextRange");
		
		var removedText = file.text.substring(firstIndex, lastIndex+1); // Second argument in String.substring is "up to, but not including"
		
		var grid = file.grid;
		
		var startCaret = file.createCaret(firstIndex);
		// note: firstIndex can be inside indentation characters!
		// note: iff firstIndex is on a linebreak, the caret will have col=[end col] and eol=true
		if(startCaret.index > firstIndex) { // firstIndex is inside indentation characters!
			var startColIndentationCharCount = firstIndex-startCaret.index;
		}
		else var startColIndentationCharCount = grid[startCaret.row].indentationCharacters.length;
		
		var endCaret = file.createCaret(lastIndex);
		var endRow = endCaret.row;
		if(endCaret.eol) endRow++;
		
		var endColBeforeChange = endCaret.col;
		// note: lastIndex can also be inside indentation characters!
		if(endCaret.index > lastIndex) { // lastIndex is inside indentation characters!
			var endColIndentCharCount = lastIndex - endCaret.index ;
		}
		var endColIndentCharCount = grid[endCaret.row].indentationCharacters.length;
		
		var deletionLength = lastIndex - firstIndex;
		deletionLength++; // same index is still one char
		
		
		// Now when we got the values for the file.change, we can start changing the file state/content
		
		//console.log("deleteTextRange: firstIndex=" + firstIndex + " lastIndex=" + lastIndex + " startCaret=" + JSON.stringify(startCaret) + " endCaret=" + JSON.stringify(endCaret));
		//console.log("deleteTextRange: startColIndentationCharCount=" + startColIndentationCharCount + " endColIndentCharCount=" + endColIndentCharCount + " deletionLength=" + deletionLength); 
		
		file.text = deletePart(file.text, firstIndex, lastIndex); // Delete the text
		
		
		if(startColIndentationCharCount < 0) {
			//console.log("deleteTextRange: Delete " + Math.abs(startColIndentationCharCount) + " indentation characters from row=" + startCaret.row);
			grid[startCaret.row].indentationCharacters = grid[startCaret.row].indentationCharacters.slice(0, startColIndentationCharCount);
			grid[startCaret.row].startIndex += startColIndentationCharCount;
		}
		
		if(endColIndentCharCount < 0) {
			//console.log("deleteTextRange: Delete " + Math.abs(endColIndentCharCount) + " indentation characters from row=" + endCaret.row);
			grid[endCaret.row].indentationCharacters = grid[endCaret.row].indentationCharacters.slice(0, endColIndentCharCount);
			grid[endCaret.row].startIndex += endColIndentCharCount;
		}
		
		if(startCaret.row == endRow) {
			// Text was deleted from one row only
			
			// Update index of remaining columns on the row
			
			for(var col=endCaret.col; col < grid[endCaret.row].length; col++) {
				//console.log("deleteTextRange: Updating index on row=" + endCaret.row + " col=" + col + " to " + (grid[endCaret.row][col].index - deletionLength));
				grid[endCaret.row][col].index -= deletionLength;
			}
			// Delete columns to be deleted from first row
			for(var col=startCaret.col; col<=endCaret.col; col++) {
				//console.log("deleteTextRange: Deleting col=" + col + " from row=" + startCaret.row);
				grid[startCaret.row].splice(startCaret.col, 1); // Remove same index
			}
			
		}
		else if(endRow > startCaret.row) {
			// Merge the first row with the end row
			
			// Remove the deleted columns from the first row
			var columsToRemove = grid[startCaret.row].length - startCaret.col;
			var col = startCaret.col;
			//console.log("deleteTextRange: columsToRemove=" + columsToRemove + " from row=" + startCaret.row + " grid[" + startCaret.row + "].length=" + grid[startCaret.row].length);
			while(columsToRemove > 0) {
				//console.log("deleteTextRange: Removing col char=" + grid[startCaret.row][col].char);
				grid[startCaret.row].splice(col, 1);
				columsToRemove--;
			}
			//console.log("deleteTextRange: grid[" + startCaret.row + "].length=" + grid[startCaret.row].length);
			
			if(endCaret.index > lastIndex || endCaret.eol) {
				// lastIndex is within the indentation characters
				// or lastIndex is on a line break!
				// The deleted indentation characters has already been removed.
				// Add the remaining indentation characters from the last row
				var indentationCharactersToAdd = grid[endCaret.row].indentationCharacters.length;
				for(var i=0; i<grid[endCaret.row].indentationCharacters.length; i++) {
					//console.log("deleteTextRange: Adding indentation character=" + UTIL.lbChars(grid[endCaret.row].indentationCharacters.charAt(i)) + " from row=" + endCaret.row + " with index=" + (firstIndex+i));
					grid[startCaret.row].push( new Box(grid[endCaret.row].indentationCharacters.charAt(i), firstIndex+i) );
				}
			}
			else {
				var indentationCharactersToAdd = 0;
			}
			
			// Add the remaining columns on the last row
			if(endCaret.eol) var col = 0; // endCaret.eol means lastIndex is on a line break character
			else var col = endCaret.col+1
			
			for(var index=firstIndex+indentationCharactersToAdd; col<grid[endRow].length; col++, index++) {
				
				//console.log("deleteTextRange: Adding column=" + col + " from row=" + endRow + " to row=" + startCaret.row + " and giving it index=" + index);
				
				if(grid[endRow][col] == undefined) throw new Error("col=" + col + " does not exist! grid[" + endCaret.row + "].length=" + grid[endCaret.row].length);
				
				grid[endRow][col].index = index; // Update index of the column
				grid[startCaret.row].push( grid[endRow][col] ); // Add the column
				
			}
			
			// Remove deleted rows
			var rowsToRemove = endRow - startCaret.row;
			
			var row = startCaret.row+1;
			//console.log("deleteTextRange: rowsToRemove=" + rowsToRemove + " grid.length=" + grid.length + " row=" + row + " endCaret.eol=" + endCaret.eol);
			
			while(rowsToRemove > 0) {
				//console.log("deleteTextRange: Removing row!");
				file.grid.splice(row, 1);
				rowsToRemove--;
			}
			//console.log("deleteTextRange: grid.length=" + grid.length + "");
			
		}
		else throw new Error("endRow=" + endRow + " startCaret.row=" + startCaret.row);
		
		
		// Update indexes on all rows below
		var lineNumberDecrementor = endRow - startCaret.row;
		fixIndexOnRemainingRows(grid, startCaret.row+1, deletionLength, lineNumberDecrementor);
		
		grid[startCaret.row].owned = true;
		
		
		if(grid.length == 0) throw new Error("Grid length should never be zero!");
		
		if(file.caret.index >= firstIndex) {
			file.fixCaret(file.caret);
		}
		
		// Update the view if it's below
		if(  file.startRow >= (file.grid.length - EDITOR.view.visibleRows / 2)  ) file.scrollToCaret();
		
		
		//console.timeEnd("deleteTextRange");
		
		file.sanityCheck();
		
		EDITOR.renderNeeded();
		
		file.change("deleteTextRange", removedText, firstIndex, startCaret.row, startCaret.col, startColIndentationCharCount, endRow, endColIndentCharCount);
		
		return removedText;
	}
	
	File.prototype.deleteSelection = function(selection) {
		/*
			Deletes the selected text ...
			
		*/
		
		//console.time("deleteSelection");
		
		var file = this;
		var box;
		
		if(selection == undefined) {
			selection = file.selected;
		}
		
		file.checkSelection(); // Sanity check
		
		if(selection.length == 0) {
			//console.warn("Nothing is selected!");
			return;
		}
		
		// selection is an array of Box's
		
		//console.log("Removing selection:\n" + JSON.stringify(selection));
		
		var firstBox = selection[0];
		var firstIndex = firstBox.index;
		var optimized = false;
		var rowsBefore = file.grid.length;
		
		if(isContinuous(selection)) {
			var lastIndex = selection[selection.length-1].index;
			
			// The text might have been selected right to left
			if(lastIndex < firstIndex) {
				var tmpIndex = firstIndex;
				firstIndex = lastIndex;
				lastIndex = tmpIndex;
			}
			
			file.deleteTextRange(firstIndex, lastIndex);
			
			//console.log("after selection removed, text.length=" + text.length);
			
			optimized = true;
		}
		
		if(!optimized) {
			
			//console.warn("There are multiple selections"); 
			// Although not possible atm but probably will in the future
			
			// We'll have to delete the characters one by one ...
			// Witch will be very slow because file.deleteCharacter calls file.change witch updates stuff (like parsing the file)
			// We can optimze by having isContinuous return an index, call file.deleteTextRange, then repeat for every continous string
			
			var caret = file.createCaret(firstBox.index);
			
			for(var i=0; i<selection.length; i++) {
				
				box = selection[i];
				
				if(box.index == undefined) throw new Error("Index is undefined. Stuff will go wrong! box=" + JSON.stringify(box));
				
				//console.log("Deselecting box:\n" + JSON.stringify(box));
				
				// Move caret to the box
				caret = file.moveCaretToIndex(box.index, caret);
				
				// Deselect the box
				box.selected = false;
				
				// Delete character
				file.deleteCharacter(caret);
				
			}
			
			file.sanityCheck();
			
		}
		
		// Deselect all 
		selection.length = 0;
		
		var rowsAfter = file.grid.length;
		
		//console.log("file.caret.index=" + file.caret.index + " firstIndex=" + firstIndex + " rowsBefore=" + rowsBefore + " rowsAfter=" + rowsAfter);
		
		if(rowsBefore > rowsAfter) {
			// Rows where deleted
			if(file.caret.index > firstIndex) {
				file.caret.row -= (rowsBefore-rowsAfter);
			}
		}
		
		// Note: file.caret.row might be above file.grid.length!
		if(file.grid[file.caret.row] && file.grid[file.caret.row].length > 0) {
			// Place the caret where the selection started
			file.moveCaretToIndex(firstIndex);
		}
		else file.fixCaret(file.caret);
		
		//console.timeEnd("deleteSelection");
		
		EDITOR.renderNeeded();
		
		// file.change is called either by file.deleteTextRange or file.deleteCharacter
		
		
		
		function isContinuous(selection) {
			var index = 0;
			var lastIndex = selection[0].index;
			var char = "";
			for(var i=0; i<selection.length; i++) {
				index = selection[i].index;
				if( (index - lastIndex) > 1) {
					// Check if it's white-space or not
					for(var j=lastIndex+1; j<index; j++) {
						char = file.text.charAt(j);
						//console.log("char=" + char);
						if(!(char == " " || char == "\t" || char == "\n" || char == "\r" )) {
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
		
		var missedNewLine = 0;
		var missedSpace = 0;

		for(var i=0; i<selected.length; i++) {
			
			box = selected[i];
			
			if(index > -1 && (box.index-index) > 1) {
				// See what we missed
				// update: When making column select I updated this from selecting everything between, to skip all text between
				// update: When selecting many text rows we want to keep the line breaks!
				missedNewLine = 0;
				missedSpace = 0;
				whileloop: while(index < (box.index-1)) {
					index++;
					missed = file.text.charAt(index);
					//console.log("missed=" + missed + " (" + missed.charCodeAt(0) + ")");

					if(missed == "\n") {missedNewLine++;};
					if(missed == " ") {missedSpace++; break whileloop};

					//text += missed;
				}
				//console.log("missedNewLine=" + missedNewLine + " missedSpace=" + missedSpace);
				if(missedNewLine != 0) {
					for (var j=0; j<missedNewLine; j++) {
						text += file.lineBreak;
					}
				}
				else if(missedSpace != 0) {
					text = text.trim() + ", ";
				}
			}

			text += selected[i].char;
			index = box.index;
		}
		
		return text;
		
	}
	
	File.prototype.getFileSize = function size(humanReadable) {
		var file = this;

		var size = UTIL.byteSize(file.text);

		if(!humanReadable) return size;
		else return EDITOR.humanReadableNumber(size) + "B";
	}

	File.prototype.insertLineBreak = function(caret) {
		// Inserts a line break at the file caret
		var file = this;
		
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		
		//console.warn("Inserting line break at caret=" + JSON.stringify(caret) + " grid.length=" + file.grid.length);
		
		//if(caret != file.caret) console.warn("caret=" + JSON.stringify(caret) + " is not file.caret=" + JSON.stringify(file.caret) + "");

		file.sanityCheck(); // Sanity check in case someting is wrong
		
		
		var row = caret.row;
		var col = caret.col;
		var totalCharactersAdded = file.lineBreak.length;
		var grid = file.grid;
		var index = caret.index;
		var currentRow = grid[row];
		var box;
		var tabCharacters = "";
		var newRow;
		var movedCharacters = 0;
		
		//console.log("Inserting line break at index=" + index);
		
		
		// Insert a new row
		grid.splice(row+1, 0, []);
		
		// Give properties to the new row
		newRow = grid[row+1];
		
		newRow.startIndex = caret.index;
		newRow.lineNumber = currentRow.lineNumber; // It will be incremented later when all other rows are incremented // currentRow.lineNumber + 1;
		newRow.indentationCharacters = "";
		newRow.indentation = 0;
		newRow.owned = true;
		
		
		/* 
			How much indentation?
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
			else caret.eof = false;
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
		
		
		//console.log("row=" + row + " " + file.startRow + " + " + EDITOR.view.visibleRows + " = " + (file.startRow + EDITOR.view.visibleRows) + "");
		
		// Scroll down if we ended up under visible space
		if(row >= file.startRow + EDITOR.view.visibleRows - 1 ) {
			file.startRow++;
		}
		
		// Scroll all the way to the left
		file.startColumn = 0;
		EDITOR.view.endingColumn = EDITOR.view.visibleColumns;
		
		file.checkCaret(caret);

		if(caret != file.caret) file.fixCaret(file.caret);
		
		file.sanityCheck();

		// Call file edit listeners
		file.change("linebreak", file.lineBreak, index, row, col) // change, text, index, row, col
		
		
		EDITOR.fireEvent("moveCaret", [file, caret]);
		
		EDITOR.renderNeeded();
		
	}
	
	File.prototype.moveCaretRight = function(caret, repeat) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		if(repeat === undefined) repeat = 1;
		if(repeat === 0) return;
		if(repeat < 0) throw new Error("repeat=" + repeat);
		
		file.checkCaret(caret);
		
		file.sanityCheck();
		
		//console.log("moveCaretRight: caret.index=" + caret.index + " file.text.length=" + file.text.length);
		
		if(caret.index < file.text.length) {
			
			if(caret.eol) {
				// Move to next line
				caret.row++;
				caret.col = 0;
				caret.index += file.lineBreak.length;
				//console.log("moveCaretRight: Moved caret.index " + file.lineBreak.length + " steps to the right doe to linebreak");
				
				caret.index += file.grid[caret.row].indentationCharacters.length;
				//console.log("moveCaretRight: Moved caret.index " + file.grid[caret.row].indentationCharacters.length + " steps to the right due to indentation");
				
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
				
				// Step over the surrogates etc.
				var walker = EDITOR.gridWalker(file.grid[caret.row], caret.col);
				while(!walker.done) walker.next();
				caret.col += walker.charCodePoints;
				caret.index += walker.charCodePoints;
				//console.log("moveCaretRight: walker=" + JSON.stringify(walker));
				
				
				if( file.grid[caret.row].length==caret.col ) caret.eol = true;
				else caret.eol = false;
			}
			
			if(caret.index == file.text.length) {
				caret.eof = true;
			}
			else {
				caret.eof = false;
			}
			
		}
		
		repeat = repeat - 1;
		
		if(repeat > 0) {
			file.moveCaretRight(caret, repeat);
			return;
		}
		
		
		file.sanityCheck();
		
		EDITOR.fireEvent("moveCaret", [file, caret]);
		
		//if(caret == file.caret) EDITOR.renderNeeded();

	}
	
	
	File.prototype.moveCaretLeft = function(caret, times) {
		/*
			Moves any caret one step to the left in this file.
			Caret must pass the sanity check!
			
		*/
		var file = this;
		
		if(times == undefined) times = 0;
		if(times < 0) throw new Error("times=" + times);
		
		//console.log("moveCaretLeft: ");
		
		if(caret == undefined) {
			caret = file.caret;
		}
		else {
			// Is it a real caret, or did we place "times" as the first argument!?
			if(caret.index == null) throw new Error("First argument should be a caret! arguments=" + JSON.stringify(arguments));
		}
		
		file.checkCaret(caret);
		
		
		var grid = file.grid;
		var row = caret.row;
		
		//console.log("moveCaretLeft: Moving caret left from " + JSON.stringify(caret) + "...");
		
		
		// Sanity check in case something is wrong (don't want to run a full sanity check as it would also test the file.caret but caret might not be the same as file caret and currently chaning)
		file.checkCaret(caret);
		
		if(caret.col > 0 || caret.row > 0) {
			caret.col--;
			
			if(caret.col == -1) {
				// Move one row up
				//console.log("moveCaretLeft: Moving one row up");
				caret.row--;
				caret.col = grid[caret.row].length;
				caret.eol = true;
				caret.index -= file.lineBreak.length;
				caret.index -= grid[row].indentationCharacters.length;
				
				//console.log("moveCaretLeft: caret.index=" + caret.index + " grid[" + row + "].indentationCharacters.length=" + grid[row].indentationCharacters.length);
				
			}
			else {
				caret.eol = false;
				caret.index--;
				
				unicodeSkip();
			}
			
			caret.eof = false;
			
		}
		
		file.checkCaret(caret);
		
		times = times - 1;
		
		if(times > 0) {
			file.moveCaretLeft(caret, times);
		}
		
		EDITOR.fireEvent("moveCaret", [file, caret]);
		
		if(caret == file.caret) EDITOR.renderNeeded();
		
		return caret;
		
		function unicodeSkip() {
			// We can't use gridWalker when moving left.
			// We have to walk backwards.
			// When modifying this we also have to modify EDITOR.gridWalker and vice versa
			
			
			if( file.grid[caret.row][caret.col] && UTIL.isVariationSelector(file.grid[caret.row][caret.col].char) ) {
				//console.log( "moveCaretLeft:unicodeSkip: Skipping variation selector:" + file.grid[caret.row][caret.col].char.codePointAt(0).toString(16) );
				caret.col--;
				caret.index--;
			}
			
			if(caret.col == 0) return;
			
			skipSurrogates(caret.col);
			
			if(caret.col == 0) return;
			
			checkZeroWidthJoiner();
			
			function checkZeroWidthJoiner() {
				//console.log("moveCaretLeft:unicodeSkip:checkZeroWidthJoiner: caret.col=" + caret.col);
				if( file.grid[caret.row][caret.col-1] && file.grid[caret.row][caret.col-1].char=="\u200D" ) {
					//console.log("moveCaretLeft:unicodeSkip:checkZeroWidthJoiner: Skipping zero width joiner");
					caret.col--;
					caret.index--;
					
					if(caret.col == 0) return; // Might be a ZWJ without anything before it due to corrution (deleted chars)
					
					caret.col--;
					caret.index--;
					if(!skipSurrogates(caret.col)) {
						//console.log("moveCaretLeft:unicodeSkip:checkZeroWidthJoiner: Skipped non surrogate char=" + (file.grid[caret.row][caret.col] && file.grid[caret.row][caret.col].char));
					}
					
					checkZeroWidthJoiner();
				}
			}
			
			function skipSurrogates(col) {
				if( file.grid[caret.row][col] && UTIL.isSurrogateModifierEnd(file.grid[caret.row][col].char) && file.grid[caret.row][col-1] && UTIL.isSurrogateModifierStart(file.grid[caret.row][col-1].char) ) {
					//console.log("moveCaretLeft:unicodeSkip:skipSurrogates: Skip surrogate modifier " + (file.grid[caret.row][col-1].char + file.grid[caret.row][col].char));
					caret.col--
					caret.index--;
					col--;
					// We might be between a surrogate and modifier
					if( col > 1 && UTIL.isSurrogateEnd( file.grid[caret.row][col-1].char) && UTIL.isSurrogateStart( file.grid[caret.row][col-2].char) ) {
						//console.log("moveCaretLeft:unicodeSkip:skipSurrogates: Skip surrogate after skipping modifier " + (file.grid[caret.row][col-2].char + file.grid[caret.row][col-1].char));
						caret.col-=2;
						caret.index-=2;
						col--;
						return true;
					}
				}
				else if(   file.grid[caret.row][col] && UTIL.isSurrogateEnd(file.grid[caret.row][col].char) && file.grid[caret.row][col-1] && UTIL.isSurrogateStart( file.grid[caret.row][col-1].char) ) {
					//console.log("moveCaretLeft:unicodeSkip:skipSurrogates: Skip surrogate " + (file.grid[caret.row][col-1].char + file.grid[caret.row][col].char));
					caret.col--;
					caret.index--;
					col--;
					return true;
				}
				//else {console.log("moveCaretLeft:unicodeSkip:skipSurrogates: Not a surrogate start nor end: col=" + col + " file.grid.length=" + file.grid.length + " char=" + (file.grid[caret.row][col] && file.grid[caret.row][col].char) + " (" + (file.grid[caret.row][col] && file.grid[caret.row][col].char).codePointAt(0).toString(16) + ")");}
				
				return false;
			}
		}
		
	}
	
	
	File.prototype.moveCaretUp = function(caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		file.checkCaret(caret);
		
		file.sanityCheck();
		
		if(caret.row > 0) {
			
			var rowBefore = file.grid[caret.row];
			var walker = EDITOR.gridWalker(rowBefore, caret.col);
			while( !walker.done) walker.next();
			var widthCurrentLine = walker.totalWidth;
			if(!caret.eol) widthCurrentLine -= walker.charWidth;
			
			caret.row--;
			var gridRow = file.grid[caret.row];
			
			var originalCol = caret.col;
			
			var indentationDiff = (rowBefore.indentation - gridRow.indentation) * EDITOR.settings.tabSpace;
			//console.log("moveCaretUp: indentationDiff=" + indentationDiff);
			
			var walker = EDITOR.gridWalker(gridRow);
			while(!walker.done && (walker.totalWidth) <= (widthCurrentLine+indentationDiff)) walker.next();
			
			caret.col = walker.col;
			
			//console.log("moveCaretUp: widthCurrentLine=" + widthCurrentLine + " walker.totalWidth=" + walker.totalWidth + " indentationDiff=" + indentationDiff + "  caret.col=" + caret.col + " walker=" + JSON.stringify(walker) + " ");
			
			if(walker.totalWidth <= (widthCurrentLine+indentationDiff) && walker.done) {
				// We are on the last column. Step to EOL
				caret.col += walker.charCodePoints;
			}
			
			if(caret.col < 0) caret.col = 0;
			
			var gridRowLength = gridRow.length;
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
		
		EDITOR.fireEvent("moveCaret", [file, caret]);
		
		//if(caret == file.caret) EDITOR.renderNeeded();
		
		return caret;
	}
	
	File.prototype.moveCaretDown = function(caret) {
		var file = this;
		
		//console.log("File:moveCaretDown");
		
		if(caret == undefined) caret = file.caret;
		file.checkCaret(caret);
		
		file.sanityCheck();
		
		if(caret.row < (file.grid.length-1)) {
			
			var rowBefore = file.grid[caret.row];
			var walker = EDITOR.gridWalker(rowBefore, caret.col);
			while( !walker.done) walker.next();
			var widthCurrentLine = walker.totalWidth;
			if(!caret.eol) widthCurrentLine -= walker.charWidth;
			
			caret.row++;
			
			if(caret.row >= file.startRow + EDITOR.view.visibleRows) {
				file.startRow++;
			}
			
			var gridRow = file.grid[caret.row];
			
			var indentationDiff = (rowBefore.indentation - gridRow.indentation) * EDITOR.settings.tabSpace;
			//console.log("moveCaretDown: indentationDiff=" + indentationDiff);
			
			
			var walker = EDITOR.gridWalker(gridRow);
			while( !walker.done && (walker.totalWidth) <= (widthCurrentLine+indentationDiff) ) walker.next();
			
			caret.col = walker.col;
			
			//console.log("moveCaretDown: widthCurrentLine=" + widthCurrentLine + " indentationDiff=" + indentationDiff + " caret.col=" + caret.col + " walker=" + JSON.stringify(walker) + " ");
			
			if(walker.totalWidth <= (widthCurrentLine+indentationDiff) && walker.done) {
				// We are on the last column. Step to EOL
				//console.log("moveCaretDown: Stepping right!");
				caret.col += walker.charCodePoints;
			}
			
			if(caret.col < 0) {
				caret.col = 0;
			}
			
			var gridRowLength = gridRow.length;
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
				
				//console.log("moveCaretDown: " + JSON.stringify(caret, null, 4));
				
				caret.index = gridRow[caret.col].index;
			}
			
		}
		
		file.sanityCheck();
		
		EDITOR.fireEvent("moveCaret", [file, caret]);
		
		//if(caret == file.caret) EDITOR.renderNeeded();
		
		return caret;
	}
	
	
	File.prototype.unindentRow = function(row) {
		
	}
	
	File.prototype.deleteCharacter = function(caret) {
		/*
			Removes the character the caret is on.
			Behaves like delete in most editors.	
			
			The caller needs to explicitly call EDITOR.renderNeeded()
			
			Only deletes forward (to the right) so caller need to be aware of surrogates!
			eg. will delete surrogate end if characters is a surrogate start, 
			but will not delete surrogate start if character is a surrogate end.
		*/
		
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		
		file.sanityCheck();
		
		
		//console.log("deleteCharacter: Deleting character at " + JSON.stringify(caret) + " ...");
		
		var grid = file.grid;
		var row = caret.row;
		var col = caret.col;
		var index = caret.index;
		var thisRow = grid[row];
		var rowBelow = row < grid.length ? grid[row+1] : undefined;
		var character = caret.eof ? undefined : file.text.charAt(index);
		var indexDecrementor = 1; // How many characters to remove
		var box;
		var startColIndentationCharCount = thisRow.indentationCharacters.length; // For change event
		var endRow = caret.row; // For change event
		var endCol = caret.col; // For change event
		var endColIndentCharCount = startColIndentationCharCount;
		
		//console.log("deleteCharacter: Deleting character=" + character + " at row=" + row + " col=" + col + " ");
		
		file.checkCaret(caret); // Sanity check in case something is wrong
		
		//file.debugGrid();
		
		if(caret.eof) {
			//console.warn("deleteCharacter: Can not delete at EOF!");
			return;
		}
		
		//console.time("deleteCharacter");
		
		if(caret.eol) {
			/*
				The caret is positioned on a line break.
				Remove the line break (and row). Plus all indentation characters
			*/
			
			endRow++; // For change event
			endCol = 0;
			
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
			
			//console.log("deleteCharacter: Row " + (row+1) + " removed");
			
		}
		else {
			
			var walker = EDITOR.gridWalker(thisRow, col, col);
			walker.next();
			
			indexDecrementor = walker.charCodePoints;
			
			if(indexDecrementor > 1) {
				// Give deleted characters for edit listeners
				character = "";
				for(var i=index; i<index+indexDecrementor; i++) {
					character += file.text.charAt(i);
					endCol++;
				}
			}
			
			//console.log("deleteCharacter: thisRow.length=" + thisRow.length + " col=" + col + " indexDecrementor=" + indexDecrementor + " character=" + character);
			
			// Remove box/boxes from the grid
			thisRow.splice(col, indexDecrementor);
			
		}
		
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
		
		//if(renderRow) EDITOR.renderRow(); // early paint (always change/update both the text, grid and cursor before rendering! Or some functionality like xmatching will not work properly.
		
		
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
		
		// The other caret's might now be off
		if(caret != file.caret) {
			file.fixCaret(file.caret);
		}
		
		// Call file edit listeners
		if(character.length == 1) {
			file.change("delete", character, index, row, col, startColIndentationCharCount, endRow, endCol, endColIndentCharCount) // change, text, index, row, col
		}
		else {
			file.change("deleteTextRange", character, index, row, col, startColIndentationCharCount, endRow, endCol, endColIndentCharCount);
		}
		
		//console.timeEnd("deleteCharacter");
		
		//file.debugGrid();
		
		file.sanityCheck();
		
		file.scrollToCaret();
		
		return caret;
		
	}
	
	File.prototype.moveCaretToCol = function(col, caret) {
		var file = this;
		
		if(caret == undefined) caret = file.caret;
		
		col = parseInt(col);
		if(isNaN(col)) throw new Error("col=" + col + " needs to be a numeric value!");
		
		if(col < 0) col = caret.col + col;
		if(col < 0) col = 0;
		if(file.grid[caret.row].length < col) col = file.grid[caret.row].length;
		
		var index = caret.index;
		caret.index = index - (caret.col - col);
		caret.col = col;

		
		if(file.grid[caret.row].length <= col) caret.eol = true;
		else caret.eol = false;
		
		if(file.text.length <= caret.index) caret.eof = true;
		else caret.eof = false;
		
		file.checkCaret();
		
		if(caret == file.caret) {
			EDITOR.fireEvent("moveCaret", [file, caret]);
		}
		
		return caret;
		
	}
	
	File.prototype.moveCaretToIndex = function(index, caret) {
		var file = this;
		var grid = file.grid;
		var gridIndex;
		
		//console.log("File:moveCaretToIndex");
		
		if(index == undefined) {
			throw new Error("moveCaretToIndex: index=" + index + " caret=" + JSON.stringify(caret));
		}
		else if(index < 0) {
			throw new Error("moveCaretToIndex: index=" + index + " can not be less then zero!");
		}
		else if(index > file.text.length) {
			throw new Error("moveCaretToIndex: index=" + index + " can not be over file.text.length=" + file.text.length + " file.path=" + file.path);
		}
		else if(isNaN(index)) throw new Error("moveCaretToIndex: index=" + index + " is not a number!");
		
		if(caret == undefined) {
			caret = file.caret;
		}
		
		
		/*
			If the file text contains Anything, file grid will have at least one row.
			*/
		
		//console.log("moveCaretToIndex: " + index + " (text.length=" + file.text.length + ")");
		
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
			
			if(index == file.text.length) {
				// EOF
				caret.row = grid.length-1;
				caret.col = grid[caret.row].length;
				caret.eol = true;
				caret.eof = true;
			}
			else if(index == 0) {
				// Start of the file, and not EOF
				caret.index = grid[0].startIndex;
				caret.row = 0;
				caret.col = 0;
				caret.eol = (grid[0].length == 0);
				caret.eof = false;
			}
			else {
				//console.log("grid.length=" + grid.length);
				
				var found = false;
				
				// Set the row, col, eol and eof
				main: for(var row=0; row<grid.length; row++) {
					
					//console.log("grid[" + row + "].length=" + grid[row].length);
					
					if(grid[row].startIndex >= index) {
						caret.index = grid[row].startIndex;
						caret.row = row;
						caret.col = 0;
						if(grid[row].length > 0) caret.eol = false;
						else caret.eol = true;
						if(file.text.length > index) caret.eof = false;
						else caret.eof = true;
						found = true;
						break main;
					}
					//else console.log("grid[" + row + "].startIndex < " + index);
					
					for(var col=0; col<grid[row].length; col++) {
						
						gridIndex = grid[row][col].index;
						
						//console.log("gridIndex=" + gridIndex + " col=" + col + " row=" + row);
						
						if(gridIndex == index) {
							caret.row = row;
							caret.col = col;
							caret.eol = (col > (grid[row].length-1));
							caret.eof = false;
							
							found = true;
							break main;
							
						}
						else if(gridIndex == (index-1) && col==grid[row].length-1) {
							// eol on this row! (but not eof)
							caret.row = row;
							caret.col = col+1;
							caret.eol = true;
							caret.eof = false;
							
							found = true;
							break main;
							
						}
						else if(gridIndex > index) {
							throw new Error("We should never reach this: gridIndex=" + gridIndex + " index=" + index);
							// index might be on an empty line
							// or index might be in the indentation characters
							if(row == 0) {
								// Place caret at col
								caret.index = gridIndex;
								caret.row = row;
								caret.col = col;
								caret.eol = (col > (grid[row].length-1));
								caret.eof = false;
							}
							else {
								// Place caret at the end of last row
								caret.row = row-1;
								caret.col = grid[caret.row].length;
								caret.eol = true;
								
								if(grid[caret.row].length > 0) {
									caret.index = grid[caret.row][caret.col-1].index + 1; // Last character on the row + 1
								}
								else {
									caret.index = grid[caret.row].startIndex;
								}
							}
							
							found = true;
							break main;
							
						}
					}
				}
				
				if(!found) {
					//console.log("Are all lines emty?");
					// Probably because all lines (below row) are empty!
					caret.col = 0;
					caret.eol = true;
					caret.eof = false; // We do not know this yet, asume it's not. It Will be set to true if we are on the last row
					caret.row = Math.floor(index / file.lineBreak.length); // Aproximate line
					
					if(caret.row >= (grid.length-1)) {
						caret.row = grid.length-1;
						caret.eof = true;
						
						caret.index = file.text.length; // Update the index
					}
					
					if(caret.row % 1 !== 0) { // Make sure it's an integer
						throw new Error("Couldn't set cursor! index=" + index + " caret.row=" + caret.row);
						//return undefined;
					}
				}
			}
		}
		
		file.checkCaret(caret);
		
		if(caret == file.caret) {
			EDITOR.fireEvent("moveCaret", [file, caret]);
			file.scrollToCaret();
			EDITOR.renderNeeded();
		}
		
		return caret;
		
	}
	
	File.prototype.moveCaretToStartOfLine = function(caret) {
		var file = this;
		
		//console.warn("File:moveCaretToStartOfLine");
		
		if(caret == undefined) caret = file.caret;
		
		if(caret.col > 0) caret.eof = false; // We will no longer be at EOF
		
		caret.index -= caret.col;
		caret.col = 0;
		
		if(file.grid[caret.row].length == 0) caret.eol = true;
		else caret.eol = false;
		
			file.checkCaret(caret);
			
			EDITOR.fireEvent("moveCaret", [file, caret]);
			
			return caret;
		}
	
	File.prototype.moveCaretToEndOfLine = function(caret) {
		var file = this;
		
		//console.log("File:moveCaretToEndOfLine");
		
		if(caret == undefined) caret = file.caret;
		
		caret.index -= caret.col;
		caret.col = file.grid[caret.row].length;
		caret.index += caret.col;
		caret.eol = true;
		
		if(file.text.length == caret.index) caret.eof = true;
		
		file.checkCaret(caret);
		
			EDITOR.fireEvent("moveCaret", [file, caret]);
			
			return caret;
		}
	
	File.prototype.moveCaretToEndOfFile = function(caret, cb) {
		var file = this;
		
		//console.log("File:moveCaretToEndOfFile");
		
		if(caret == undefined) caret = file.caret;
		
		if(file.isBig && !file.tail) {
			
			//console.log("file is a stream! And it's not at the end");
			
			if(caret != file.caret) throw new Error("Can not place virtual caret, only file.caret if the file is big!");
			
			if(file.totalRows == -1) {
				alert("Please wait for the stream to finish");
				//throw new Error("totalRows not yet found! Wait ...?");
			}
			
			var partStartRow = file.totalRows - EDITOR.settings.bigFileLoadRows + 1;
			
			if(partStartRow < 0) throw new Error("The file has less then EDITOR.settings.bigFileLoadRows=" + EDITOR.settings.bigFileLoadRows + " rows!");
			
			file.loadFilePart(partStartRow, function loadPartDone() {
				
				//console.log("loadPartDone! partStartRow=" + partStartRow + " file.partStartRow=" + file.partStartRow);
				
				file.caret.row = file.grid.length-1;
				
				file.fixCaret();
				
				if(cb) cb(file.caret);
				
			});
			
		}
		else {
			
			//console.log("file Not a stream or it's at the end.");
			
			caret.row = file.grid.length-1;
			caret.col = file.grid[caret.row].length;
			caret.eol = true;
			caret.eof = true;
			
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
		
		if(grid.length == 0) return 0;
		
		if(row == undefined) throw new Error("row is undefined!");
		if(col == undefined) throw new Error("col is undefined!");
		
		// Note: caret always represent the position on the grid and index in file.text (not the whole file in big files)
		
		if(row < 0) {
			throw new Error("row=" + row + " must be higher then zero!");
		}
		else if(row >= grid.length) {
			throw new Error("Row " + row + " is higher then grid.length=" + grid.length + " file.partStartRow=" + file.partStartRow);
		}
		
		var gridRow = grid[row];
		
		if(col < 0) {
			throw new Error("col=" + col + " must be higher then zero!");
		}
		else if(col > gridRow.length) {
			throw new Error("col=" + col + " > " + gridRow.length + " (higher then available columns on row " + row + ")");
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
			//console.warn("start-position is over end-position. They will be switched!")
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
	
	File.prototype.reload = function(text, options) {
		// Used for example in reopening the file in another encoding
		
		var file = this;
		
		var isCurrentFile = (EDITOR.currentFile == file);

		//console.log("Reloading file.path=" + file.path + " file.fullAutoIndentation=" + file.fullAutoIndentation + " file.fileExtension=" + file.fileExtension);
		
		if(text == undefined) throw new Error("No text!");
		
		for(var prop in options) {
			if(file.hasOwnProperty(prop)) file[prop] = options[prop];
			else throw new Error("Unknown file property: " + prop);
		}
		
		var fullAutoIndentation = file.checkFullAutoIndentationSupport();
		//console.warn("Set file.fullAutoIndentation=" + fullAutoIndentation);
		file.fullAutoIndentation = fullAutoIndentation;

		var index = 0, row = 0, col = 0, startColIndentationCharCount = 0, 
		endRowBeforeChange =  file.grid.length-1, 
		endColBeforeChange = file.grid[endRowBeforeChange].length-1, 
		endColIndentCharCount = file.grid[endRowBeforeChange].indentationCharacters.length;
		
		file.lineBreak = UTIL.determineLineBreakCharacters(text);
		file.indentation = UTIL.determineIndentationConvention(text, file.lineBreak);
		file.text = UTIL.fixInconsistentLineBreaks(text, file.lineBreak);
		
		file.grid = file.createGrid(); 
		file.caret = file.createCaret(0,0,0);
		
		
		
		file.checkGrid();
		
		EDITOR.renderNeeded();
		
		file.change("reload", text, index, row, col, startColIndentationCharCount, endRowBeforeChange, endColBeforeChange, endColIndentCharCount); // Fire events
		
		//console.log("After Reloading file.path=" + file.path + " file.fullAutoIndentation=" + file.fullAutoIndentation + " file.fileExtension=" + file.fileExtension);
	
		// Should we call fileClose and fileOpen events!?
		// For example highlight listens for fileOpen before deciding if it should parse or not

		EDITOR.fireEvent("fileClose", [file]);
		EDITOR.fireEvent("fileOpen", [file]);

		if(isCurrentFile) EDITOR.fireEvent("fileShow", [file]);
	}
	
	File.prototype.addToGrid = function() {
		// Add text to the file grid. Like when inserting text at EOF.
		
	}
	
	File.prototype.createGrid = function() {
		/*
			
			Tabs after a line break will indent the line. 
			Tabs Not after a line break will be displayed as white space.
			
		*/
		
		//console.time("createGrid");
		
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
		tabulation = file.fullAutoIndentation,
		j = 0,
		codeBlockDepth = 0,
		codeBlockStartCharacter = "{",
		codeBlockEndCharacter = "}";
		
		//console.log("Creating grid (text.length=" + text.length + ") fullAutoIndentation=" + file.fullAutoIndentation + " file.lineBreak=" + UTIL.lbChars(file.lineBreak) + " path=" + file.path + "...");	
		
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
		grid[0].owned = false;
		
		//console.log("EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
		
		for(var i=0; i<totalCharacters; i++) {
			addCharacterToGrid(i);
		}
		
		
		//file.grid = grid;
		
		file.parsed = null; // Reset the parsed data to force another parse after the grid has been (re)created
		
		//console.timeEnd("createGrid");
		
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
				
				if(file.fullAutoIndentation) tabulation = true;
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
		
	}
	
	
	File.prototype.debugGrid = function() {
		/*
			Useful when debugging ...
			
			
		*/
		
		//console.log(UTIL.getStack("debugGrid"));
		
		if(!EDITOR.settings.devMode) {
			return;
		}
		
		// TEST-CODE-START

		var file = this,
		grid = this.grid,
		text = this.text,
		str = "",
		letters = stringToCharCodes(text).join(", ");
		
		var maxCharsToDebug = 500;
		if(file.text.length > maxCharsToDebug) {
			//console.warn("File too big to debug");
			return;
		}
		
		//console.log(JSON.stringify(grid, null, 4));
		for(var row=0; row<grid.length; row++) {
			console.log("row=" + row + ": startIndex=" + grid[row].startIndex + " indentation=" + grid[row].indentation + " indentationCharacters=" + UTIL.lbChars(grid[row].indentationCharacters));
			console.log(JSON.stringify(grid[row], null, 2));
		}
		
		
		//console.log("letters:" + letters);
		
		//console.log("text:\n" + text.replace(/ /g, "~").replace(/\r/g, "CR").replace(/\n/g, "LF\n"));
		
		for(var i=0; i<text.length; i++) {
			console.log(i + "=" + UTIL.lbChars(text[i]));
		}
		
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
		// TEST-CODE-END

	}
	
	
	File.prototype.cloneRow = function(row, maxColumns) {
		/*
			This might have performance issues for very long lines ...
			It also use up a lot of extra memory.
			
		*/
		var file = this;
		var grid = file.grid;
		
		if(row < 0) {
			throw new Error("row=" + row);
			return;
		}
		else if(row >= grid.length) {
			throw new Error("row=" + row + " > grid.length=" + grid.length);
			return;
		}
		else if(maxColumns == undefined) {
			throw new Error("maxColumns=" + maxColumns);
		}
		else if(maxColumns <= 0) {
			throw new Error("maxColumns=" + maxColumns + " can not be zero or less!");
		}
		
		/*
			Calling clone[i].clone(); Chrome on dev machine: createBuffer: 0.264892578125ms, Opera on Mobile: createBuffer: 41ms (41168µsec)
			Creating a Object (no prototype): Chrome on dev machine: createBuffer: 0.185791015625ms, Opera on Mobile: createBuffer: 7ms (6561µsec)
			Box.prototype.clone() was depricated because it was too slow!
			
			new Array() instead of slice ? No major difference, maybe fluctuating more. Also seem to fluctuate more in Opera mobile
			[] and push instead of cline[i] ? createBuffer: 0.2060546875ms slightly slower in Chrome, and maybe 25% slower in Opera mobile createBuffer: 9ms (8636µsec)
			hmm maybe it was grid[row] that made it slower? not in Opera though (back to 5ms)
			var gridRow = grid[row] ? Back to 0.18 in Chrome and no difference in Opera
		*/
		
		var gridRow = grid[row];
		var clone = new Array(Math.min(gridRow.length, maxColumns));
		
		// Copy the values so preRenders doesn't have to reset them
		for (var i=0; i<clone.length; i++) {
			clone[i] = {
				char: gridRow[i].char,
				index: gridRow[i].index,
				color: gridRow[i].color,
				bgColor: gridRow[i].bgColor,
				selected: gridRow[i].selected,
				highlighted: gridRow[i].highlighted,
				wave: gridRow[i].wave,
				circle: false,
				quote: false,
				comment: false
			};
		}
		
		/*
			we are not cloning circle, quote or comment because those are set by pre-renders
			(only used in the javascript plugin, and added to the Box template to prevent "hidden classes".
			. We probably will have to refactor how this work. )
			
			Avoid setting box color and bgcolor. Instead apply the color via preRender functions !
			
		*/
		
		// slice wont copy these
		clone.indentation = gridRow.indentation;
		clone.lineNumber = gridRow.lineNumber;
		clone.startIndex = gridRow.startIndex;
		clone.owned = gridRow.owned;
		
		return clone;
		
	}
	
	File.prototype.change = function(change, text, index, row, col, startColIndentationCharCount, endRowBeforeChange, endColBeforeChange, endColIndentCharCount) {
		/*
			This method is hopefully called every time the file changes.
			So that we can know if the file has been saved or not.
			
			
			endRow and endColIncludingIndentationCharsLength wanted by LSP protocol (https://microsoft.github.io/language-server-protocol/specifications/specification-3-14/)
			While it's not explicitly documented (LSP documentation sux) I assume endRow and endCol is *before* the change.
			And most LSP implementations don't support Range and require you to send the whole file content on each change ... 
			
			
		*/
		var file = this;
		
		if(file.noChangeEvents===true) return;
		
		if(file.isCallingChangeEventListeners) {
			throw new Error("fileChange event listeners (" + UTIL.getFunctionName(file.isCallingChangeEventListeners) + 
			") are not allowed to change the file! Or it could cause a never ending loop. Try binding to a key event instead.")
		}
		
		file.changed = true;
		
		file.isSaved = false;
		
		file.lastChange = new Date();
		
		/*
			Call file edit listeners ...
			
			Problem: A edit listener can make another change, witch makes it unessesary to run the remaining (with old state)
			Not a solution: file.recursiveFileChange variable. Abort if it's true (It will not work because all changeEvent listeners must run IN ORDER to give them a chanse to track file changes)
			Solution: Throw an error if the file is changed while for-looping the event listeners
			Possible other solution: queue up recursive changes and run them afterwards, so that event listeners are called in the same order as changes where made
			
		*/
		
		// Optimization note: console.time adds around 1ms, so for 6 eventListeners it adds 6ms!
		//console.time("fileChange eventListeners");
		var f = EDITOR.eventListeners.fileChange.map(funMap);
		for(var i=0; i<f.length; i++) {
			file.isCallingChangeEventListeners = f[i];
			//console.log("Calling fileChange event listener: " + UTIL.getFunctionName(f[i]) + " (file.recursiveFileChange=" + file.recursiveFileChange + ")");
			//console.time("fileChange event listener: " + UTIL.getFunctionName(f[i]) + "");
			f[i](file, change, text, index, row, col, startColIndentationCharCount, endRowBeforeChange, endColBeforeChange, endColIndentCharCount);
			//console.timeEnd("fileChange event listener: " + UTIL.getFunctionName(f[i]) + "");
		}
		//console.timeEnd("fileChange eventListeners");
		file.isCallingChangeEventListeners = undefined;
	}
	
	File.prototype.fixCaret = function(caret) {
		var file = this;
		
		/*
			Moves the caret to a possible position 
		*/
		
		//console.log("File:fixCaret");
		//console.log("before: " + JSON.stringify(caret));
		
		if(caret == undefined) caret = file.caret
		else {
			if(!caret.hasOwnProperty("index")) throw new Error("caret has no index property! You probably want to use file.createCaret() instead."); // caret.index = 0;
			if(!caret.hasOwnProperty("row"))  throw new Error("caret has no row property! You probably want to use file.createCaret() instead."); // caret.row = 0;
			if(!caret.hasOwnProperty("col"))  throw new Error("caret has no col property! You probably want to use file.createCaret() instead."); // caret.col = 0;
			if(!caret.hasOwnProperty("eof"))  throw new Error("caret has no eof property! You probably want to use file.createCaret() instead."); // caret.eof = false;
			if(!caret.hasOwnProperty("eol"))  throw new Error("caret has no eol property! You probably want to use file.createCaret() instead."); // caret.eol = false;
		}
		
		if(caret.row < 0) caret.row = 0;
		else if(caret.row >= file.grid.length) {
			if(file.grid.length == 0) caret.row = 0;
			else caret.row = file.grid.length-1;
		}
		
		if(file.grid.length == 0) {
			caret.col = 0;
			caret.eol = true;
			caret.eof = true;
		}
		else {
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
		}
		caret.index = file.getIndexFromRowCol(caret.row, caret.col);
		
		//console.log("after: " + JSON.stringify(caret));
		
		file.checkCaret(caret);
		
		if(caret == file.caret) EDITOR.fireEvent("moveCaret", [file, caret]);
		
		return caret;
		}
	
	File.prototype.scrollToCaret = function(caret, lookAhead) {
		var file = this;
		/*
			note: Caret is bound to the grid! And caret.index is the index in file.text
			This function only scrolls the grid (not the whole file)
			
			lookAhead: How much you want to see on the right side of the caret
		*/
		
		if(caret == undefined) caret = file.caret;
		if(lookAhead == undefined) lookAhead = 0;
		
		file.checkCaret(caret);
		
		//console.log("scrollToCaret: scrolling to caret:" + JSON.stringify(caret) + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
		
		var startRow = file.startRow;
		var startColumn = file.startColumn;
		
		//console.log("scrollToCaret: visibleRows=" + EDITOR.view.visibleRows);
		//console.log("scrollToCaret: caret.row=" + caret.row + " < file.startRow=" + file.startRow + " ? " + (caret.row < file.startRow))
		//console.log("scrollToCaret: caret.row=" + caret.row + " > file.startRow=" + file.startRow + " + EDITOR.view.visibleRows=" + EDITOR.view.visibleRows + " (" + (file.startRow + EDITOR.view.visibleRows) + ")? " + (caret.row > file.startRow + EDITOR.view.visibleRows))
		
		if(caret.row < file.startRow) {
			// Caret is above the visible space. 
			startRow = caret.row;
			
		}
		
		/*
			rev 2529 - annoying that the editor scrolls down one step when scrolling to the last visible row => Removed - 1
			That resultet in the the text sometimes getting half visible, eg outside the screen. (unable to repeat the issue in 2529)
			So added back - 1 again.
		*/
		
		else if(caret.row >= (file.startRow + EDITOR.view.visibleRows - 1)) {
			//console.log("scrollToCaret: Caret is below the visible space");
			
			startRow = caret.row - EDITOR.view.visibleRows + 2;
		}
		
		if(startRow < 0) startRow = 0;
		
		
		if(file.grid.length == 0) {
			//console.warn("scrollToCaret: The grid is zero");
			if(caret.row != 0) throw new Error("Can't scroll to caret.row=" + caret.row + " because zero grid");
			return file.scrollTo(0, 0);
		}
		
		if(caret.row >= file.grid.length) throw new Error("Can't scroll to caret.row=" + caret.row + " because file.grid.length=" + file.grid.length);
		
		
		
		// ##########################################
		// #            Left & Right                #
		// ##########################################
		var delta = 0;
		var startColumn = file.startColumn;
		
		//console.log("scrollToCaret: caret.col=" + caret.col + " > EDITOR.view.endingColumn=" + EDITOR.view.endingColumn + " ? " + (caret.col > EDITOR.view.endingColumn));
		//console.log("scrollToCaret: caret.col=" + caret.col + " < file.startColumn=" + file.startColumn + " ? " + (caret.col < file.startColumn));
		
		
		var indentationWidth = file.grid[caret.row].indentation * EDITOR.settings.tabSpace;
		
		
		
		/*
			
			Note: caret.col does not take indentation into account! But startColumn does!
			
		*/
		
		var minIndentation = file.grid[caret.row].indentation;
		for(var row=file.startRow; row<(file.startRow+EDITOR.view.visibleRows) && row<file.grid.length; row++) {
			//console.log("scrollToCaret: row=" + row + " indentation=" + file.grid[row].indentation + " minIndentation=" + minIndentation);
			if(file.grid[row].indentation < minIndentation) minIndentation = file.grid[row].indentation;
		}
		
		var textWidth = file.measureText(caret.row, caret.col, false);
		
		//console.log("scrollToCaret: textWidth=" + textWidth + " indentationWidth=" + indentationWidth + " EDITOR.view.endingColumn=" + EDITOR.view.endingColumn + " lookAhead=" + lookAhead + " startColumn=" + startColumn + " caret.col=" + caret.col + " ");
		
		if((textWidth+indentationWidth) > (EDITOR.view.endingColumn-lookAhead)) {
			//console.log("scrollToCaret: Caret is after the visible space");
			// We want to see a bit forward, but not more then to eol ? No, it's actually easier to read if we do not make a big jump!
			delta = ((textWidth+indentationWidth) - (EDITOR.view.endingColumn-lookAhead)) //+ Math.max(0, Math.min(Math.floor(EDITOR.view.visibleColumns/2), file.grid[caret.row].length - caret.col));
			//EDITOR.view.endingColumn += delta; // Do I need to do this!?
			startColumn += delta;
		}
		else if(caret.col < (file.startColumn-indentationWidth)) {
			
			delta = (file.startColumn-indentationWidth) - caret.col;
			
			//EDITOR.view.endingColumn -= delta;  // Do I need to do this!? or does file.scrollTo do it!?
			startColumn -= delta;
			
			//console.log("scrollToCaret: Caret is left of the visible space! delta=" + delta + " startColumn=" + startColumn + " indentationWidth=" + indentationWidth);
			
			if((startColumn-indentationWidth) >= 0) {
				// We would prefer if the startColumn was 0
				// But we don't need to see the indentation
				// it's annoying if it jumps while reading, but we usually don't read from right to left
				
				if((caret.col+indentationWidth) < EDITOR.view.visibleColumns) startColumn = minIndentation*EDITOR.settings.tabSpace;
				//console.log("scrollToCaret: Adjusted startColumn=" + startColumn + " from minIndentation=" + minIndentation);
			}
		}
		
		
		// We want to see the whole line if possible
// but we also want to see the whole line of the line we are currently on.
		var widthOfWholeLine =  file.measureText(caret.row, file.grid[caret.row].length);
		//console.log("scrollToCaret: widthOfWholeLine=" + widthOfWholeLine + " file.grid[" + caret.row + "].length=" + file.grid[caret.row].length + " EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
		if(widthOfWholeLine <= EDITOR.view.visibleColumns) {
			// If possible we would also like to see the start of all lines on the screen
			// just make sure we can see the caret on the line we are on!
if(startColumn-indentationWidth > minIndentation*EDITOR.settings.tabSpace) {
				startColumn = minIndentation*EDITOR.settings.tabSpace + indentationWidth;
			}
			
// If we need to scroll, we might just as well scroll a lot,
// so that we need to scroll less.
			
			// We prefer seeing the start of each line, it's OK if we don't see the end of some lines
			// We however want to see as much as possible of the line the caret is currently on
		} 
		
		
		//console.log("scrollToCaret: startColumn=" + startColumn + " minIndentation=" + minIndentation + " lookAhead=" + lookAhead + " delta=" + delta);
		
		//console.log("scrollToCaret: EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);
		
		
		file.scrollTo(startColumn, startRow);
		
		//EDITOR.renderNeeded(); // Don't need to render until actually scrolled
		
	}
	
	
	File.prototype.saved = function(callback) {
		/*
			Not to be confused with isSaved property

			This method sets the state to saved and calls afterSave event listeners.
			(Let the editor handle saving and loading from disk)

			*/
		var file = this;
		
		file.isSaved = true;
		file.changed = false;
		file.savedAs = true;
		
		// The afterSave event listeners need to take a callback or return something, so we can know when they're done'
		EDITOR.callEventListeners("afterSave", file, function allListenersCalled(errors) {
			
			//if(errors.length > 0) {console.warn("Some afterSave event listeners failed:");}

			// see error stacktraces in dev tools!
			for (var i=0; i<errors.length; i++) {
				console.error(errors[i]);
			}
			
			var err = null;

			if(errors.length > 0) {
				var errorStrings = errors.map(function mapError(err) {
					return err.message;
				}).join(" ");
				var err = new Error("Errors: " + errorStrings);
			}

			if(callback) callback(err);
		});
		
	}
	
	// Prevent setting file.saved = true
	Object.defineProperty(File.prototype, "saved", {
		value: File.prototype.saved,
		writable: false
	});
	
	File.prototype.highlightText = function(text, startAt, stopAt) {
		// Searches for all instances of text and highlights it
		var file = this;
		
		if(text.length == 0) {
			throw new Error("No text to highlight!");
			return;
		}
		
		//console.log("text=" + text);
		
		/*
			Hmm, for highlighting to stay, we need to modify insertText 
			to not touch the grid above or under the inserted text ...
			
		*/
		
		// Find all occurencie(s) of text and highlight it
		var start = (startAt == undefined) ? 0 : startAt;
		var end = 0;
		var highlightRanges = [];
		var textRange;
		
		if(stopAt == undefined) stopAt = file.text.length;
		
		while(true) { // while(true) loops are very prone for bugs! (for example if the word is one character long)
			
			//console.log("Searching for '" + text + "' start=" + start);
			
			start = file.text.indexOf(text, start);
			
			if(start == -1 || start >= stopAt) break;
			
			end = start + text.length-1;
			
			textRange = file.createTextRange(start, end);
			
			//console.log("highlightning textRange=" + textRange);
			
			textRange.forEach(highLightBox);
			
			start = end+1; // Continue search at the end of the word to prevent loop
			
		}
		
		function highLightBox(box) {
			// box is a gridBox
			box.highlighted = true;
			file.highlighted.push(box);
		}
		
	}
	
	File.prototype.highLightTextRange = function highLightTextRange(start, end) {
		// Highlights text from start to end
		var file = this;
		
		var textRange = file.createTextRange(start, end);
		textRange.forEach(highLightBox);
		
		function highLightBox(box) {
			// box is a gridBox
			box.highlighted = true;
			file.highlighted.push(box);
		}
	}
	
	File.prototype.removeHighLightTextRange = function highLightTextRange(start, end) {
		// Remove highlights text from start to end
		var file = this;
		
		var textRange = file.createTextRange(start, end);
		textRange.forEach(removeHighLight);
		
		function removeHighLight(box) {
			// box is a gridBox
			box.highlighted = false;
			file.highlighted.splice(file.highlighted.indexOf(box), 1);
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
		/*
			Language persers need to call this function so that we can listen on the fileParse event

		*/ 

		var file = this;
		
		file.parsed = parseData; // After the file has been parsed, "file.parsed" property should hold the parsed data
		
		var f = EDITOR.eventListeners.fileParse.map(funMap);
		for(var i=0; i<f.length; i++) {
			f[i](file); // Call function
		}
		
	}
	
	File.prototype.gotoLine = function(line, callback) {
		// Goes to a line in a file. Loads part of a file if necessary (big files)
		
		//console.log(UTIL.getStack("Going to line=" + line + " " + (typeof line) + " ..."));
		
		var file = this;
		
		if(file.isStreaming) throw new Error("File.gotoLine: Can't goto line in a file that is streaming!");
		
		if(undefined == line) {
			throw new Error("File.gotoLine: line=" + line + " is undefined!");
		}
		else if(isNaN(line)) {
			throw new Error("File.gotoLine: line=" + line + " is not a number!");
		}
		else if(line < 1) {
			//console.warn("Can't go to line=" + line + " because it's below 1!");
			line = 1;
		}
		else if(!file.isBig && line > Math.max(file.grid.length, (file.totalRows+1))) {
			//console.warn("Can't go to line=" + line + " because it's above file.totalRows=" + file.totalRows + "");
			line = file.totalRows+1;
		}
		
		//var maxFileRow = Math.max(0, Math.max(file.grid.length, (file.totalRows+1)) - EDITOR.view.visibleRows);
		
		var fileRow = line-1;
		
		var topSpace = 1; // How many lines that should be visible above the caret
		
		if(fileRow >= file.partStartRow && (fileRow + file.partStartRow) < file.grid.length) {
			//console.log("fileRow=" + fileRow + " file.partStartRow=" + file.partStartRow + " file.grid.length=" + file.grid.length + " file.totalRows=" + file.totalRows);
			
			// We gan go to the line without loading a new part
			file.caret = file.createCaret(undefined, fileRow);
			//file.scrollTo(undefined, Math.min(maxFileRow, Math.max(0, fileRow-2)));
			//file.scrollTo(undefined, Math.max(0, fileRow-topSpace));
			file.scrollToCaret();
			
			EDITOR.fireEvent("moveCaret", [file, file.caret]); // Always fire an event when we move the file caret!
			
			EDITOR.renderNeeded();
			if(callback) callback(null);
		}
		else if(file.isBig) {
			// It's a big file and we'll have to load another part of the file ...
			var column = 0;
			var partStartRow = Math.round(fileRow - EDITOR.settings.bigFileLoadRows / 2);
			
			if(partStartRow < 0) partStartRow = 0;
			
			if(file.totalRows == 0) throw new Error("File.gotoLine: Problem in large file: file.totalRows=" + file.totalRows + " file.path=" + file.path + " file.grid.length=" + file.grid.length);
			
			file.loadFilePart(partStartRow, function placeCaretAfterLoadingPart(err) {
				
				if(err) {
					if(callback) return callback(err);
					else throw err;
				}
				
				var gridRow = fileRow - file.partStartRow; // This is the line we want to go to, translated to the new file part
				
				if(gridRow < 0 || gridRow >= file.grid.length) throw new Error("File.gotoLine: Problem in large file: gridRow=" + gridRow + " fileRow=" + fileRow + " file.partStartRow=" + file.partStartRow + " line=" + line + " file.grid.length=" + file.grid.length);
				
				file.caret = file.createCaret(undefined, gridRow); // index, row, col
				file.scrollToCaret();
				
				EDITOR.renderNeeded();
				
				if(callback) callback(null);
				
			});
		} 
		else {
			throw new Error("File.gotoLine: fileRow=" + fileRow + " >= file.grid.length=" + file.grid.length);
		}
		
	}
	
	File.prototype.scrollToLine = function(line) {
		/* 
			Only scrolls on the grid. 
			Do not support large files. 
			Does not move the caret!
			
		*/
		//console.log("Scrolling to line=" + line + " ...");
		
		var file = this;
		
		if(file.isStreaming) throw new Error("Can't scroll to line in a file that is streaming!");
		
		if(line == undefined) {
			throw new Error("line=" + line + " is undefined!");
		}
		else if(isNaN(line)) {
			throw new Error("line=" + line + " is not a number!");
		}
		else if(line < 1) {
			throw new Error("Can't scroll to line=" + line + " because it's below 1! line=" + line);
		}
		else if(line > file.grid.length) {
			throw new Error("Can't scroll to line=" + line + " because it's above file.grid.length=" + file.grid.length + "");
		}
		
		//console.log("Line " + line);
		
		var maxStartRow = Math.max(0, file.grid.length - EDITOR.view.visibleRows);
		
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
		
		EDITOR.renderNeeded();
	}
	
	
	File.prototype.scrollTo = function(x, y) {
		/*
			Sets the startColumn and startRow
			
			Use this function instead of modifying file.startColumn and file.startRow directly!
			
			This function is ONLY used to scroll the grid. It should NOT be used to load parts of large files. 
			Although it will automatically load "ahead" in large files. 
			
			Function parameter y is the row in the grid (not large file)
			
		*/
		
		var file = this;

		if(EDITOR.currentFile != file) {
			console.warn( "Scrolling in a file that is not the current file! file.path=" + file.path + " EDITOR.currentFile.path=" + (EDITOR.currentFile && EDITOR.currentFile.path) );
			// If the file is not in view, just set the state.
			if( UTIL.isNumeric(x) ) file.startColumn = parseInt(x);
			if( UTIL.isNumeric(y) ) file.startRow = parseInt(y);
			return;
		}

		if(EDITOR.currentFile != file) {
			throw new Error("Scrolling in a file that is not the current file! EDITOR.currentFile.path=" + (EDITOR.currentFile && EDITOR.currentFile.path) + " file.path=" + file.path);
		}

		var startColumn = file.startColumn;
		var startRow = file.startRow;
		var scrolled = false;
		var oldPartStartRow = file.partStartRow;
		
		if((x == undefined || x == startColumn) && (y == undefined || y == startRow)) {
			//console.warn("No need to scroll! x=" + x + " y=" + y + " startRow=" + startRow + " startColumn=" + startColumn + "");
			return;
		}
		
		//console.log("scrollTo: x=" + x + " y=" + y);
		
		if(x != undefined) startColumn = parseInt(x);
		
		if(y != undefined) {
			
			y = parseInt(y);
			
			if(file.isBig && file.grid.length > 1) {
				
				// We only want to "load more" of "large files" if the caret is near the "edge"
				
				if(y < 0) throw new Error("y=" + y + " < 0");
				if(y >= file.grid.length) throw new Error("y=" + y + " >= file.grid.length=" + file.grid.length);
				
				var high = Math.min((file.grid.length - EDITOR.view.visibleRows), Math.floor(file.grid.length * .85 - EDITOR.view.visibleRows));
				var low = Math.floor(file.grid.length * .15);
				var middle = Math.floor(file.grid.length * .5);
				var moveRows = Math.floor(file.grid.length * .25);
				
				if(high < low) throw new Error("high=" + high + " < low=" + low + ". file.grid.length=" + file.grid.length + " path=" + file.path);
				
				//console.log(UTIL.getStack("scrollTo"));
				
				//console.log("Scrolling in big file: file.isStreaming=" + file.isStreaming + " file.totalRows=" + file.totalRows + " file.startRow=" + file.startRow + " file.partStartRow=" + file.partStartRow + " y=" + y + " high=" + high + " low=" + low + " middle=" + middle);
				
				if(file.isStreaming) {
					console.warn("Scrolling while the file is streaming ...");
				}
				else if(y > high && !file.tail) {
					file.loadFilePart(file.partStartRow + moveRows, streamLoaded);
					return;
				}
				else if(y < low && !file.head) {
					file.loadFilePart(Math.max(0, file.partStartRow - moveRows), streamLoaded);
					return;
				}
			}
			
			// Allow user to scroll so that the last line appears at the middle, but not so that the text get invisible
			var maxY = Math.floor(file.grid.length - EDITOR.view.visibleRows / 2);
			if(file.disallowScrollingBeyondEof) {
				var maxY = Math.floor(file.grid.length - EDITOR.view.visibleRows);
			}
			
			startRow = Math.min(y, maxY);
			
			if(startRow < 0) {
				//console.warn("y=" + y + " maxY=" + maxY + " file.grid.length=" + file.grid.length);
				startRow = 0;
			}
		}
		
		doTheScrolling(false);
		
		function doTheScrolling(scrolled) {
			
			//console.log("Doing the scrolling ... file.startRow=" + file.startRow + " startRow=" + startRow + " file.startColumn=" + file.startColumn + " startColumn=" + startColumn);
			
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
			
			var newEndingColumnValue = (file.startColumn + EDITOR.view.visibleColumns)
			if(EDITOR.view.endingColumn != newEndingColumnValue) {
				
				if( (file.startColumn + EDITOR.view.visibleColumns) != newEndingColumnValue ) {
					throw new Error("This should never throw! newEndingColumnValue=" + newEndingColumnValue + " file.startColumn=" + file.startColumn + " EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns + " EDITOR.view.endingColumn=" + EDITOR.view.endingColumn);
				}

				/*
					Error: Scroll bug: EDITOR.view.endingColumn=211 new value for EDITOR.view.endingColumn 203 but EDITOR.view.visibleColumns=203 EDITOR.currentFile.startColumn =8 (code=undefined)
				*/

				console.log("File.scrollTo: Going to set newEndingColumnValue=" + newEndingColumnValue + " file.startColumn=" + file.startColumn + " EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns + " EDITOR.view.endingColumn=" + EDITOR.view.endingColumn + " file.path=" + file.path + " EDITOR.currentFile.path=" + EDITOR.currentFile.path + " file.isBig=" + file.isBig );

				EDITOR.view.endingColumn = newEndingColumnValue;
				scrolled = true;
			}
			
			//console.log("scrolled=" + scrolled + " file.startColumn=" + file.startColumn + " file.startRow=" + file.startRow);
			
			if(scrolled) EDITOR.renderNeeded();
			
		}
		
		function streamLoaded() {
			// Adjust position
			
			var diff = oldPartStartRow - file.partStartRow;
			
			//console.log("streamLoaded scroll y=" + y + " file.partStartRow=" + file.partStartRow + " oldPartStartRow=" + oldPartStartRow + " diff=" + diff + " file.startRow=" + file.startRow);
			
			y = y + diff;
			
			//if(diff < 0) {console.log("We scrolled up y--");y--;}
			
			
			//console.log("y=" + y + " low=" + low + " diff=" + diff);
			
			if(y < low) console.warn("You are scrolling too fast ... Or Increase EDITOR.settings.bigFileLoadRows=" + EDITOR.settings.bigFileLoadRows + " to at least " + ( EDITOR.settings.bigFileLoadRows + (low-y) )  );
			
			// Allow user to scroll so that the last line appears at the middle, but not so that the text get invisible
			var maxY = Math.floor(file.grid.length - EDITOR.view.visibleRows / 2);
			
			startRow = Math.max(Math.min(y, maxY), 0);
			
			//console.log("startRow=" + startRow + " maxY=" + maxY);
			
			doTheScrolling(true);
			
		}
	}
	
	File.prototype.scroll = function(deltaX, deltaY) {
		/*
			Adds to the current scroll possition.
			
			Use this function instead of modifying file.startColumn and file.startRow directly!
			
			This function only scrolls on the grid!
			
		*/
		var file = this;
		
		if(deltaX == undefined) deltaX = 0;
		if(deltaY == undefined) deltaY = 0;
		
		file.scrollTo(file.startColumn + deltaX, file.startRow + deltaY);
	}
	
	
	File.prototype.getWordOnCaret = function(caret, callback) {
		// to be deprecated. Use wordAtCaret instead!
		
		var file = this;
		
		if(callback === undefined) {
			throw new Error("Expected a callback function!");
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
	
	File.prototype.wordAtCaret = function(caret, wordDelimiters) {
		// Returns {word: wholeWord, left: leftSide, right: rightSide} at caret
		var file = this;
		
		if(caret === undefined) caret = file.caret;
		else if(caret == null || typeof caret != "object") throw new Error("First argument to file.wordAtCaret: caret=" + caret + " need to be a file caret. Or undefined to use the file caret.");
		else if(typeof caret.index != "number") throw new Error("First argument to file.wordAtCaret: caret=" + caret + " doesn't appear to be a file caret!");
		
		if(wordDelimiters === undefined) wordDelimiters = " .,[]()=:\"<>/{}\t\n\r!*-+;_";
		
		var word = "";
		var char = "";
		
		// First go left, and break on non-letter
		for(var i=caret.index-1; i>-1; i--) {
			char = file.text.charAt(i);
			
			if(wordDelimiters.indexOf(char) == -1) {
				word = char + word;
			}
			else {
				break;
			}
		}
		var leftSide = file.text.substring(i+1, caret.index);
		var start = i+1;
		
		// Then go right, and break on non-letter
		for(var i=caret.index; i<file.text.length; i++) {
			char = file.text.charAt(i);
			
			if(wordDelimiters.indexOf(char) == -1) {
				word = word + char;
			}
			else {
				break;
			}
		}
		var rightSide = file.text.substring(caret.index, i);
		var end = i-1;
		
		/*
			console.log("start=" + start + "=" + file.text.charAt(start));
			console.log("end=" + end + "=" + file.text.charAt(end));
		*/
		
		return {word: word, left: leftSide, right: rightSide, start: start, end: end};
		
	}
	
	File.prototype.rowVisible = function (gridRow) {
		var file = this;
		
		// Is the row visible?
		var startRow = file.startRow;
		var endRow = Math.min(file.grid.length, file.startRow+EDITOR.view.visibleRows);
		
		return !(gridRow < startRow || gridRow > endRow);
	}
	
	File.prototype.loadFilePart = function loadFilePart(partStartRow, callback) {
		var file = this;
		
		/*
			if(this.loadFilePartDialog && this.loadFilePartDialog.isOpen()) {
			var error = new Error("File.loadFilePart: Waiting for user dialog to choose if to save the current buffer/chunk or abort ...");
			if(callback) callback(error);
			else console.warn(error);
			return;
			}
		*/
		
		if(!file.isSaved && file.totalRows != -1) {
			var yes = "Save now";
			var no = "Abort";
			if(this.loadFilePartDialog) this.loadFilePartDialog.close();
			this.loadFilePartDialog = confirmBox("Current chunk/buffer need to be saved before loading a new one!", [yes, no], function(answer) {
				if(answer == yes) {
					EDITOR.saveFile(file, function(err) {
						if(err) {
							if(callback) return callback(err);
							else throw err;
						}
						file.loadFilePart(partStartRow, callback);
					});
				}
				else {
					var error = new Error("File.loadFilePart: Aborted by user because unsaved changes.");
					if(callback) callback(error);
					else console.warn(error.message);
				}
			});
			return;
		}
		
		if(partStartRow == undefined) partStartRow = 0;
		
		if(partStartRow < 0) throw new Error("File.loadFilePart: Can not begin stream in negative row:" + partStartRow);
		
		if(file.totalRows != -1) {
			if(partStartRow >= file.totalRows) {
				throw new Error("File.loadFilePart: Can not begin stream in above file.totalRows=" + file.totalRows + " (partStartRow=" + partStartRow + ")");
			}
		}
		
		//if(callback == undefined) console.warn("File.loadFilePart: loadFilePart with no callback!");
		
		var endRow = partStartRow + EDITOR.settings.bigFileLoadRows;
		
		//alertBox("File.loadFilePart: file.grid.length=" + file.grid.length + " file.path=" + file.path);
		
		CLIENT.cmd("readLines", {path: file.path, start: partStartRow+1, end: endRow+1, lineBreak: file.grid.length > 1 && file.lineBreak, max: EDITOR.settings.bigFileLoadRows}, function readLines(err, resp) {
			
			if(err) {
				if(callback) callback(err);
				else alertBox("Unable to load file part: " + err.message);
			}
			else {
				
				// resp: {path, lines, end, totalLines, lineBreak?}
				
				if(resp.lineBreak) file.lineBreak = resp.lineBreak;
				file.text = resp.lines.join(file.lineBreak);
				
				var endReached = resp.end == resp.totalLines;
				
				//file.debugGrid();
				
				file.indentation = UTIL.determineIndentationConvention(file.text, file.lineBreak);
				
				file.grid = file.createGrid();
				
				//console.log("File.loadFilePart: Loaded " + file.grid.length + " rows! EDITOR.settings.bigFileLoadRows=" + EDITOR.settings.bigFileLoadRows);
				
				//console.log("File.loadFilePart: Fixing caret ... ");
				//console.log("File.loadFilePart: file.caret.row=" + file.caret.row + " ");
				
				var diff = (file.partStartRow - partStartRow);
				
				//console.log("File.loadFilePart: diff=" + diff);
				
				// Move the caret to the same position it was on
				file.caret.row += diff;
				//console.log("File.loadFilePart: Placed it at file.caret.row=" + file.caret.row + " ");
				
				if(file.caret.row < 0) {
					// Place the caret at the top
					//console.log("File.loadFilePart: Place the caret at the top");
					file.caret.row = 0;
					file.caret.col = 0;
					
					
					if(file.grid[0].length > 0) {
						file.caret.eol = false;
						file.caret.eof = false;
					}
					else {
						file.caret.eol = true;
						if(file.caret.row == (file.grid.length-1)) {
							file.caret.eof = true;
						}
						else {
							file.caret.eof = false;
						}
					}
					
				}
				else if(file.caret.row >= (file.grid.length)) {
					// Place the caret at EOF
					//console.log("File.loadFilePart: Place the caret at EOF");
					file.caret.row = file.grid.length-1;
					file.caret.col = file.grid[file.grid.length-1].length -1;
					file.caret.eol = true;
					file.caret.eof = true;
				}
				
				file.fixCaret();
				
				//console.log("File.loadFilePart: After fixing caret: file.caret.row=" + file.caret.row + " ");
				
				file.partStartRow = partStartRow;
				
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
				
				//console.log("File.loadFilePart: file.totalRows=" + file.totalRows);
				var totalLineBreaks = resp.totalLines-1;
				file.totalRows = totalLineBreaks;
				
				if(callback) callback(null);
			
			}
		});
		}
	
	
	File.prototype.fixIndentation = function fixIndentation(indentationCharacters) {
		var file = this;
		var text = file.text;
		var grid = file.grid;
		
		if(!indentationCharacters) indentationCharacters = file.indentation;
		
		var currentIndentationCharacters = "";
		var shouldHaveIndentationCharacters = "";
		
		// Go from bottom to top so that startIndex don't get effected
		for(var row=grid.length-1; row>-1; row--) {
			
			currentIndentationCharacters = grid[row].indentationCharacters,
			shouldHaveIndentationCharacters = "";
			for(var i=0; i<grid[row].indentation; i++) shouldHaveIndentationCharacters += indentationCharacters;
			
			//console.log("row=" + row + " shouldHaveIndentationCharacters=" + UTIL.lbChars(shouldHaveIndentationCharacters) + " currentIndentationCharacters=" + UTIL.lbChars(currentIndentationCharacters));
			
			if(shouldHaveIndentationCharacters != currentIndentationCharacters) {
				
				// Remove and add
				text = text.substr(0, grid[row].startIndex-currentIndentationCharacters.length) + shouldHaveIndentationCharacters + text.substring(grid[row].startIndex, text.length);
				
				//console.log("text=" + UTIL.lbChars(text));
			}
		}
		
		file.reload(text);
	}
	
	
	// Private functions ...
	
	function insertGridRow(file, textIndex, text, rowIndex) {
		
		var grid = file.grid;
		
		if(rowIndex == undefined) rowIndex = grid.push([]) - 1 // Push returns the new Array.length
		else {
			grid.splice(rowIndex, 0, []);
		}
		
		var gridRow = grid[rowIndex];
		
		gridRow.lineNumber = rowIndex+1;
		gridRow.indentation = 0;
		gridRow.indentationCharacters = "";
		gridRow.startIndex = textIndex;
		gridRow.owned = true;
		
		var char = "";
		var tabulation = file.fullAutoIndentation;
		
		for(var i=0; i<text.length; i++) {
			char = text.charAt(i);
			
			if((char == "\t" || char == " ") && tabulation) {
				gridRow.indentationCharacters += char;
				gridRow.startIndex++;
			}
			else {
				tabulation = false;
				
				gridRow.push(new Box(char, textIndex));
				
			}
			
			textIndex++;
		}
	}
	
	File.prototype.rowFromIndex = function rowFromIndex(index) {
		/*
			Returns the row and col, and indentation position of index in the grid
			
			Optimize with binary search ?
		*/
		var file = this;
		var grid = file.grid;
		var gridRow;
		
		for(var row=0; row<grid.length; row++) {
			if(grid[row].startIndex > index) break;
		}
		
		// Index can be in the indentation characters or on the row above, or at the line break (on last row)
		
		var insideIndentationCharacter = undefined;
		var column = undefined;
		var lbChar = undefined;
		
		var gridRow;
		
		
		if(row == grid.length && row > 0) {
			// End of file, can't be inside indentation characters
			row--;
			gridRow = grid[row];
		}
		else if(row >= 0) {
			
			gridRow = grid[row];
			
			// Check if inside indentation characters
			if( (gridRow.startIndex - gridRow.indentationCharacters.length) <= index) {
				insideIndentationCharacter = gridRow.startIndex - index;
				return {row: row, indentChar: insideIndentationCharacter};
			}
			
			row--;
			gridRow = grid[row];
			
		}
		else {
			throw new Error("Index=" + index + " outside file.text.length=" + file.text.length);
		}
		
		
		
		var gridRow = grid[row];
		
		//console.log("gridRow.startIndex=" + gridRow.startIndex);
		//console.log("gridRow.indentationCharacters.length=" + gridRow.indentationCharacters.length);
		//console.log("index=" + index);
		
		//console.log("gridRow.length=" + gridRow.length);
		
		for(var col=0; col<gridRow.length; col++) {
			if(gridRow[col].index == index) break;
		}
		
		//console.log("col=" + col);
		
		if(col == gridRow.length || gridRow.length == 0) {
			lbChar = gridRow.startIndex + gridRow.length - index;
			return {row: row, lbChar: lbChar};
		}
		else {
			column = col;
		}
		
		return {row: row, col: column};
		
	}
	
	File.prototype.rowIndentationLevel = function getRowIndentation(row) {
		// Returns the level of indentation on a row, for both code and plain text
		var file = this;

		if(row == undefined) row = file.caret.row;

		if(file.fullAutoIndentation) {
			return file.grid[row].indentation;
		}
		else {
			var indentation = "";
			var gridRow = file.grid[row];
			var char = "";
			for(var col=0; col<gridRow.length; col++) {
				char = gridRow[col].char;
				if( char == " " || char == "\t" ) indentation += char;
				else break;
			}
			return Math.floor(indentation.length / file.indentation.length);
		}
	}

	File.prototype.measureText = function measureText(row, endCol, includeEndCol) {
		// Returns the total monospace (glyph) width from first column until and including endCol
		if(typeof row != "number") throw new Error("measureText: First argument row=" + row + " should be a number!");
		var file = this;
		
		var walker = EDITOR.gridWalker(file.grid[row], endCol);
		while(!walker.done) walker.next();
		
		var totalWidth = walker.totalWidth;
		
		if(includeEndCol === false) {
			totalWidth -= walker.charWidth;
		}
		
		return totalWidth;
	}
	
	File.prototype.canvasPosition = function(row, col) {
		var file = this;
		// Returns the x and y coordinate for a column
		
		var columns = file.measureText(row, col, false);
		
		var indentationWidth = file.grid[row].indentation * EDITOR.settings.tabSpace;
		var x = EDITOR.settings.leftMargin + (columns + indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
		var y = EDITOR.settings.topMargin + (row-file.startRow) * EDITOR.settings.gridHeight;
		
		return {x: x, y: y};
	}
	
	File.prototype.getCharacterAt = function getCharacterAt(caretOrIndex) {
		var file = this;
		var index = caretOrIndex.index || caretOrIndex;
		var r = file.rowFromIndex(index);
		
		if(r.indentChar) return r.indentChar;
		if(r.lbChar) return r.lbChar;
		
		var row = r.row;
		var col = r.col;
		var gridRow = file.grid[row];
		var walker = EDITOR.gridWalker(gridRow, col, col);
		walker.next();
		
		return walker.char;
	}
	
	/*
		
		Every character is a box!
		
		Only the File object should use this Object.
		
	*/
	
	function Box(char, index) {
		
		var box = this;
		
		if(index == undefined) index = -1;
		if(char == undefined) {
			throw new Error("No character!");
		}
		
		box.char = char;
		box.index = index;
		box.selected = false;
		box.highlighted = false;
		box.wave = false;
		box.circle = false;
		box.color = EDITOR.settings.style.textColor;
		box.bgColor = null;
		box.quote = false; // part of a quote
		box.comment = false; // part of a comment
	}
	
	function deletePart(txt, start, end) {
		// Also deletes the end character!
		// Returns txt with the range from start to end removed
		
		if(EDITOR.settings.devMode && txt.length < 100) visualizeTextRange(txt, start, end);

		return txt.substring(0, start) + txt.substring(end+1);
	}
	
	function visualizeTextRange(txt, start, end) {
		
		txt = txt.replace(/\n|\r/g, "#"); // Replace line feeds and carage returns with # to make them easier to count
		txt = txt.replace(/\t/g, "→");
		
		//console.log("visualizeTextRange: start=" + start + " end=" + end + "\n" + txt + "\n" + spaces(start) + underline(end-start+1) + spaces(txt.length-end) + "\n");
		
		function spaces(n) {
			var str = "";
			for(var i=0;i<n;i++) str += " ";
			return str;
		}
		
		function underline(n) {
			var str = "";
			for(var i=0;i<n;i++) str += "=";
			return str;
		}
		
	}
	
	function fixIndexOnRemainingRows(grid, startRow, indexDecrementor, lineNumberDecrementor) {
		//console.log("fixIndexOnRemainingRows: startRow=" + startRow + " indexDecrementor=" + indexDecrementor + " lineNumberDecrementor=" + lineNumberDecrementor);
		for(var i=startRow; i<grid.length; i++) {
			grid[i].startIndex -= indexDecrementor;
			grid[i].lineNumber -= lineNumberDecrementor;
			// ... and all columns
			for(var j=0; j<grid[i].length; j++) {
				grid[i][j].index -= indexDecrementor;
			}
		}
	}

})();

