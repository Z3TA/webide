/*

	I often look at the top for the full path, but when running in the browser we can't control the top bar (only tabs)
	So use the free space in the URL to show info!

	#project#SCP-branch#file-PATH#Row (only change row when making a large jump, the we can use browsers back button to go back!)

	Git branch names can't start with /


*/

(function() {

	"use strict";

	var lastJump = {}; // {index, row, col}
	var lastFile;
	var winMenuMoveBack;
	var lastCaretPos = {}; // {index, row, col}

	var PROJECT_NAME = "";
	var BRANCH_NAME = "";
	VAR PATH = "";
	var ROW = "";

	EDITOR.plugin({
		desc: "Move caret back to last position",
		load: function loadGoBack() {

			var charCode = 66; // B
			
			EDITOR.bindKey({desc: S("to_last_position"), charCode: charCode, combo: SHIFT+CTRL, fun: moveCaretBackToLastPosition});
			// Ctrl + B is likely preserved by browsers (for Bookmarking) and Alt+B is a menu action in Firefox
			
			winMenuMoveBack = EDITOR.windowMenu.add(S("to_last_position"), [S("Navigate"), 5], moveCaretBackToLastPosition, "bottom");

			EDITOR.on("moveCaret", rememberCaretPosition);

			// No need to show stuff in the address if the user can't see the address eg. standalone mode
			if(DISPLAY_MODE == "browser") {
				EDITOR.on("fileShow", showInfoInUrl);

				window.addEventListener("popstate", browserNavigation);
			}



		},
		unload: function unloadGoBack() {

			EDITOR.unbindKey(moveCaretBackToLastPosition);
			//EDITOR.unbindKey(moveCaretBackToLastPosition2);

			EDITOR.windowMenu.remove(winMenuMoveBack);

			EDITOR.removeEvent("moveCaret", rememberCaretPosition);

			lastJump = {};
			lastFile = undefined;

			if(DISPLAY_MODE == "browser") {
				EDITOR.removeEvent("fileShow", showInfoInUrl);
				window.removeEventListener("popstate", browserNavigation);
			}

		}
	});

	function setUrl() {

		if(DISPLAY_MODE == "standalone") return; // Don't bother if we can't see the URL or back/forward buttons

		var state = {
			project: PROJECT_NAME,
			branch: BRANCH_NAME,
			path: PATH,
			row: ROW
		};

		var title = PATH; // Not used by any browser!?

		var url = window.location.search;
		if(PROJECT_NAME) url = url + "#" + PROJECT_NAME;
		if(BRANCH_NAME) url = url + "#" + BRANCH_NAME;
		if(PATH) url = url + "#" + PATH;
		if(ROW) url = url + "#" + ROW;

		window.history.pushState(state, title, url);
	}

	function browserNavigation(ev){
		console.log("info_in_url: browserNavigation: ev=", ev);
		if(ev.state) {
			console.log("info_in_url:browserNavigation: ev.state=", ev.state);

			// todo: Switch to the file in the adress hash!

		}
	};

	function showInfoInUrl(file) {
		if(!file) return;

		PATH = file.path;

		if(lastJump.hasOwnProperty(file.path)) ROW = lastJump[file.path].row
		else ROW = file.caret.row;

		setUrl();

	}

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
			file.scrollTo(0, row - Math.round(EDITOR.view.visibleRows / 2));

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
