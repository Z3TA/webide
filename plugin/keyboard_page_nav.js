
(function() {
	
	"use strict";
	
	editor.bindKey({desc: 'Moves the caret one "page" up', charCode: 33, combo: 0, fun: pageUp});
	editor.bindKey({desc: 'Moves the caret one "page" down', charCode: 34, combo: 0, fun: pageDown});
	editor.bindKey({desc: 'Moves the caret to the end of file', charCode: 35, combo: 0, fun: end});
	editor.bindKey({desc: 'Moves the caret to the beginning of file', charCode: 36, combo: 0, fun: home});
	
	
	function pageUp(file, combo, character, charCode, pushDirection) {
		// Move the cursor one page up
		
		// Move temporary caret and then scroll!??
		
		file.checkCaret();
		file.caret.row = Math.max(0, file.caret.row - editor.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		editor.renderNeeded();
		
		return false;
	}
	
	function pageDown(file) {
		// Move the cursor one page down
		
		file.checkCaret();
		file.caret.row = Math.min(file.grid.length, file.caret.row + editor.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		editor.renderNeeded();
		
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
			file.moveCaretToEnd(file.caret, function() {
				
				file.scrollToCaret();

				editor.renderNeeded();
				
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
	
	
})();