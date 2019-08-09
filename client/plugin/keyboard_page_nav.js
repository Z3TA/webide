
(function() {
	
	"use strict";
	
	var END = 35;
	var HOME = 36;
	
	EDITOR.bindKey({desc: 'Moves the caret one "page" up', charCode: 33, combo: 0, fun: pageUp});
	EDITOR.bindKey({desc: 'Moves the caret one "page" down', charCode: 34, combo: 0, fun: pageDown});
	
	EDITOR.bindKey({desc: 'Moves the caret to the end of file', charCode: END, combo: CTRL, fun: end});
	EDITOR.bindKey({desc: 'Moves the caret to the beginning of file', charCode: HOME, combo: CTRL, fun: home});
	
	EDITOR.bindKey({desc: 'Moves the caret to the end of the line', charCode: END, combo: 0, fun: endOfLine, mode: "default"});
	EDITOR.bindKey({desc: 'Moves the caret to the beginning of the line', charCode: HOME, combo: 0, fun: startOfLine, mode: "default"});
	
	EDITOR.bindKey({desc: 'Selects all from current position to the start', charCode: HOME, combo: CTRL + SHIFT, fun: selectToTop, mode: "default"});
	EDITOR.bindKey({desc: 'Selects all from current position to the end', charCode: END, combo: CTRL + SHIFT, fun: selectToEnd, mode: "default"});
	
	EDITOR.windowMenu.add("Page up", ["Navigate", 10], pageUp);
	EDITOR.windowMenu.add("Page down", ["Navigate", 10], pageDown);
	
	EDITOR.windowMenu.add("End of File", ["Navigate", 10], end, "top");
	EDITOR.windowMenu.add("Beginning of file", ["Navigate", 10], home);
	EDITOR.windowMenu.add("End of line", ["Navigate", 10], endOfLine);
	EDITOR.windowMenu.add("Beginning of line", ["Navigate", 10], startOfLine, "bottom");
	
	function selectToTop(file) {
		var selection = [],
		grid = file.grid;
		
		for(var row=0; row<file.caret.row; row++) {
			for(var col=0; col<grid[row].length; col++) {
				selection.push(grid[row][col]);
			}
		}
		for(var col=0; col<file.caret.col; col++) {
			selection.push(grid[file.caret.row][col]);
		}
		
		console.log("selectToTop: Selecting " + selection.length + " characters ...");
		
		file.select(selection, "right");
		
		EDITOR.renderNeeded();
		
		return PREVENT_DEFAULT;
	}
	
	function selectToEnd(file) {
		var selection = [],
		grid = file.grid;
		
		for(var row=file.caret.row+1; row<grid.length; row++) {
			for(var col=0; col<grid[row].length; col++) {
				selection.push(grid[row][col]);
			}
		}
		for(var col=file.caret.col+1; col<grid[file.caret.row].length; col++) {
			selection.push(grid[file.caret.row][col]);
		}
		
		console.log("selectToEnd: Selecting " + selection.length + " characters ...");
		
		file.select(selection, "left");
		
		EDITOR.renderNeeded();
		
		return PREVENT_DEFAULT;
	}
	
	function pageUp(file, combo, character, charCode, pushDirection) {
		// Move the cursor one page up
		
		// Move temporary caret and then scroll!??
		
		file.checkCaret();
		file.caret.row = Math.max(0, file.caret.row - EDITOR.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		EDITOR.renderNeeded();
		
		return false;
	}
	
	function pageDown(file) {
		// Move the cursor one page down
		
		file.checkCaret();
		file.caret.row = Math.min(file.grid.length, file.caret.row + EDITOR.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		EDITOR.renderNeeded();
		
		return false;
	}

	function end(file, combo) {
		
		file.checkCaret(); // for sanity

		if(combo == CTRL) {
			// Move caret to end of line
			file.caret.col = file.grid[file.caret.row].length;
		}
		else {
			// Move caret to the bottom
			//file.caret.row = file.grid.length;
			file.moveCaretToEndOfFile(file.caret, function() {
				
				file.scrollToCaret();

				EDITOR.renderNeeded();
				
			});
		}
		
		return false;
	}
	
	
	function home(file, combo) {
		file.checkCaret();

		if(combo == CTRL) {
			// Move caret to the start of line
			file.caret.col = 0;
		}
		else {
			// Move caret to the top
			file.gotoLine(1);
		}
		
		return false;
	}
	
	function endOfLine(file, combo) {
		
		var caret = file.caret;
		
		var index = undefined;
		var row = caret.row;
		var col = file.grid[caret.row].length;
		
			file.moveCaret(index, row, col, caret);
		
		EDITOR.renderNeeded();
		
		return false;
		}
	
	function startOfLine(file, combo) {
		
		var caret = file.caret;
		
		var index = undefined;
		var row = caret.row;
		var col = 0;
		
		file.moveCaret(index, row, col, caret);
		
		EDITOR.renderNeeded();
		
		return false;
	}
	
	
})();