
(function() {
	
	"use strict";
	
	global.keyBindings.push({charCode: 33, fun: pageUp});
	global.keyBindings.push({charCode: 34, fun: pageDown});
	global.keyBindings.push({charCode: 35, fun: end});
	global.keyBindings.push({charCode: 36, fun: home});
	
	
	
	function pageUp(file, combo, character, charCode, pushDirection) {
		// Move the cursor one page up
		
		// Move temporary caret and then scroll!??
		
		file.checkCaret();
		file.caret.row = Math.max(0, file.caret.row - global.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		global.render = true;
		
	}
	
	function pageDown(file) {
		// Move the cursor one page down
		
		file.checkCaret();
		file.caret.row = Math.min(file.grid.length, file.caret.row + global.view.visibleRows);
		
		file.fixCaret();
		file.checkCaret();
		file.scrollToCaret();

		global.render = true;
	}

	function end(file, combo) {
		
		file.checkCaret(); // for sanity

		if(combo == CTRL) {
			// Move caret to end of line
			file.caret.col = file.grid[file.caret.row].length;
		}
		else {
			// Move caret to the bottom
			file.caret.row = file.grid.length;
		}

		file.fixCaret();

		file.scrollToCaret();

		global.render = true;
	}
	
	
	function home(file, combo) {
		file.checkCaret();

		if(combo == CTRL) {
			// Move caret to the start of line
			file.caret.col = 0;
		}
		else {
			// Move caret to the top
			file.caret.row = 0;
			file.caret.col = 0;
		}

		
		file.fixCaret(); // also calls checkCaret

		file.scrollToCaret();

		global.render = true;
	}
	
	
})();