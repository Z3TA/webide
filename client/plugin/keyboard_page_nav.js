
(function() {
	
	"use strict";
	
	var END = 35;
	var HOME = 36;
	
	EDITOR.bindKey({desc: S("moves_caret_one_page_up"), charCode: 33, combo: 0, fun: pageUp});
	EDITOR.bindKey({desc: S("moves_caret_one_page_down"), charCode: 34, combo: 0, fun: pageDown});
	
	EDITOR.bindKey({desc: S("moves_caret_to_end_of_file"), charCode: END, combo: CTRL, fun: end});
	if(MAC) EDITOR.bindKey({desc: S("moves_caret_to_end_of_file"), key: "ArrowDown", combo: META, fun: mac_end});
	
	EDITOR.bindKey({desc: S("moves_caret_to_beginning_of_file"), charCode: HOME, combo: CTRL, fun: home});
	if(MAC) EDITOR.bindKey({desc: S("moves_caret_to_end_of_line"), key: "ArrowUp", combo: META, fun: mac_home});
	
	EDITOR.bindKey({desc: S("moves_caret_to_end_of_line"), charCode: END, combo: 0, fun: endOfLine, mode: "default"});
	if(MAC) EDITOR.bindKey({desc: ("moves_caret_to_end_of_line"), key: "ArrowRight", combo: META, fun: mac_endOfLine});
	
	EDITOR.bindKey({desc: S("moves_caret_to_beginning_of_line"), charCode: HOME, combo: 0, fun: startOfLine, mode: "default"});
	if(MAC) EDITOR.bindKey({desc: S("moves_caret_to_beginning_of_line"), key: "ArrowLeft", combo: META, fun: mac_startOfLine});
	
	
	EDITOR.bindKey({desc: S("selects_all_from_current_position_to_start"), charCode: HOME, combo: CTRL + SHIFT, fun: selectToTop, mode: "default"});
	EDITOR.bindKey({desc: S("selects_all_from_current_position_to_end"), charCode: END, combo: CTRL + SHIFT, fun: selectToEnd, mode: "default"});
	
	
	EDITOR.windowMenu.add(S("page_up"), [S("Navigate"), 10], pageUp);
	EDITOR.windowMenu.add(S("page_down"), [S("Navigate"), 10], pageDown);
	
	EDITOR.windowMenu.add(S("end_of_file"), [S("Navigate"), 10], end, "top");
	EDITOR.windowMenu.add(S("beginning_of_file"), [S("Navigate"), 10], home);
	EDITOR.windowMenu.add(S("end_of_line"), [S("Navigate"), 10], endOfLine);
	EDITOR.windowMenu.add(S("beginning_of_line"), [S("Navigate"), 10], startOfLine, "bottom");
	
	function selectToTop(file) {
		if(!EDITOR.input) return true;
		
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
		if(!EDITOR.input) return true;
		
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
		if(!EDITOR.input) return true;
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
		if(!EDITOR.input) return true;
		// Move the cursor one page down
		
		file.checkCaret();
		file.caret.row = Math.min(file.grid.length, file.caret.row + EDITOR.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		EDITOR.renderNeeded();
		
		return false;
	}

	function mac_end(file, combo) {
		return end(file, combo);
	}
	
	function end(file, combo) {
		if(!EDITOR.input) return true;
		
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
	
	function mac_home(file, combo) {
return home(file, combo);
}

	function home(file, combo) {
		if(!EDITOR.input) return true;
		
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
	
	function mac_endOfLine(file, combo) {
		return endOfLine(file, combo);
	}
	
	function endOfLine(file, combo) {
		if(!EDITOR.input) return true;
		
		var caret = file.caret;
		
		var index = undefined;
		var row = caret.row;
		var col = file.grid[caret.row].length;
		
			file.moveCaret(index, row, col, caret);
		file.scrollToCaret();
		
		EDITOR.renderNeeded();
		
		return false;
		}
	
	function mac_startOfLine(file, combo) {
		return startOfLine(file, combo);
	}
	
	function startOfLine(file, combo) {
		if(!EDITOR.input) return true;
		
		var caret = file.caret;
		
		var index = undefined;
		var row = caret.row;
		var col = 0;
		
		file.moveCaret(index, row, col, caret);
		file.scrollToCaret();

		EDITOR.renderNeeded();
		
		return false;
	}
	
	
})();