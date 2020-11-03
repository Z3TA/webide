/*



*/

(function() {

	"use strict";

	var lastJump = {}; // {index, row, col}
	var lastFile;
	var winMenuMoveBack;
	var lastCaretPos = {}; // {index, row, col}

	EDITOR.plugin({
		desc: "Move caret back to last position",
		load: function loadGoBack() {

			var charCode = 66; // B
			
			EDITOR.bindKey({desc: S("to_last_position"), charCode: charCode, combo: SHIFT+CTRL, fun: moveCaretBackToLastPosition});
			// Ctrl + B is likely preserved by browsers (for Bookmarking) and Alt+B is a menu action in Firefox
			
			winMenuMoveBack = EDITOR.windowMenu.add(S("to_last_position"), [S("Navigate"), 5], moveCaretBackToLastPosition, "bottom");

			EDITOR.on("moveCaret", rememberCaretPosition);

		},
		unload: function unloadGoBack() {

			EDITOR.unbindKey(moveCaretBackToLastPosition);
			//EDITOR.unbindKey(moveCaretBackToLastPosition2);

			EDITOR.windowMenu.remove(winMenuMoveBack);

			EDITOR.removeEvent("moveCaret", rememberCaretPosition);

			lastJump = {};
			lastFile = undefined;

		}
	});

	function moveCaretBackToLastPosition2(file) {
		return moveCaretBackToLastPosition(file);
	}

	function moveCaretBackToLastPosition(file) {

		console.log("to_last_position: moveCaretBackToLastPosition! file.path=" + file.path + " ");

		if( lastJump.hasOwnProperty(file.path) ) {

			var jumpFromIndex = file.caret.index;
			var jumpFromRow = file.caret.row;
			var jumpFromCol = file.caret.col;

			lastCaretPos[file.path].index = jumpFromIndex;


			var index = lastJump[file.path].index;
			var row = lastJump[file.path].row;
			var col = lastJump[file.path].col;

			console.log("to_last_position: moveCaretBackToLastPosition: row=" + row + " lastCaretPos=", lastCaretPos[file.path]);

			file.moveCaret(undefined, row);

			file.scrollToCaret();
			file.scrollTo(col, row - Math.round(EDITOR.view.visibleRows / 2));

			lastJump[file.path].col;

		}
		else if(lastFile) {
			console.log("to_last_position: moveCaretBackToLastPosition: Showing last file =" + lastFile.path);
			EDITOR.show(lastFile);
		}
		else {
			alertBox("Nothing to move back to!");
		}

		return PREVENT_DEFAULT;
	}

	function rememberCaretPosition(file, caret) {

		// Note: We want to save the caret postion we where on *before* the jump, not the new position!

		console.log("to_last_position: rememberCaretPosition: file.path=" + file.path + " ");

		if( !lastJump.hasOwnProperty(file.path) ) {
			lastJump[file.path] = {
				index: caret.index,
				row: caret.row,
				col: caret.col
			};

			lastCaretPos[file.path] = {
				index: caret.index,
				row: caret.row,
				col: caret.col
			};

			console.log("to_last_position: rememberCaretPosition: init! file.path=" + file.path + " lastJump=", lastJump[file.path]);

		}
		else {

			var jump = Math.abs(lastCaretPos[file.path].row - caret.row);
		if( jump > EDITOR.view.visibleRows ) {

				console.log("to_last_position: rememberCaretPosition: before-update file.path=" + file.path + " lastJump=", lastJump[file.path]);

			// Moving more then visible rows counts as a big jump
			
				lastJump[file.path].index = lastCaretPos[file.path].index;
				lastJump[file.path].row = lastCaretPos[file.path].row;
				lastJump[file.path].col = lastCaretPos[file.path].col;

				console.log("to_last_position: rememberCaretPosition: update! file.path=" + file.path + " lastCaretPos=",  lastCaretPos[file.path]);
			}
		else {
			console.log("to_last_position: rememberCaretPosition: Not long enough jump=" + jump + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
		}

		lastCaretPos[file.path].index = caret.index;
			lastCaretPos[file.path].row = caret.row;
			lastCaretPos[file.path].col = caret.col;

		}

		lastFile = file;

		return null;

	}


})();
