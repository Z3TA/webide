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
	var PATH = "";
	var LINE = "";

	var currentState = {};

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
				EDITOR.on("changeProject", updateProjectInUrl);
				EDITOR.on("changeBranch", updateBranchInUrl);
				EDITOR.on("start", checkUrlParametersOnStart);

				window.addEventListener("popstate", browserNavigation);
				window.addEventListener("hashchange", hashChange);
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
				EDITOR.removeEvent("changeProject", updateProjectInUrl);
				EDITOR.removeEvent("changeBranch", updateBranchInUrl);
				EDITOR.removeEvent("start", checkUrlParametersOnStart);

				window.removeEventListener("popstate", browserNavigation);
				window.removeEventListener("hashchange", hashChange);
			}

		}
	});

	function checkUrlParametersOnStart() {
		var hash = window.location.hash;
		var state = parseHash(hash);

		// Wait until the file has fully loaded
		// The editor is probably re-opening a bunch of files...
		setTimeout(function() {
			navigate(state);
		}, 2000);
		
	}

	function hashChange(ev) {
		var hash = window.location.hash;
		var state = parseHash(hash);
		navigate(state);
	}


	function parseHash(hash) {
		var arr = hash.split("#");

		if(hash.charAt(0) == "#") arr.shift();

		var last = arr.pop();
		// Last is probably line nr
		if( !isNaN(parseInt(last)) ) {
			var line = parseInt(last);
		}
		else if(last.charAt(0) == "/") {
			// It's a path !? {
			var path = last;
		}
		else if(last && last.trim() != "") throw new Error("Unable to determine what " + last + " means in the url hash");

		var last = arr.pop();

		if(line && last.charAt(0) == "/") {
			var path = last;
		}
		else if(path) {
			var branch = last;
		}
		else if(last && last.trim() != "") throw new Error("Unable to determine what " + last + " means in the url hash");

		var last = arr.pop();

		if(last != undefined) {
			var branch = last;
		}

		var last = arr.pop();

		if(last != undefined) {
			var project = last;
		}

		var obj = {};

		if(line) obj.line = line;
		if(path) obj.path = path;
		if(branch) obj.branch = branch;
		if(project) obj.project = project;

		return obj;
	}
	// assert: parseHash("#/foo/bar#123")=   
	// assert: parseHash("#branch#/foo/bar#123")=   
	// assert: parseHash("#project#branch#/foo/bar#123")=   
	// assert: parseHash("#/foo/bar")=   



	function setUrl() {

		if(DISPLAY_MODE == "standalone") return; // Don't bother if we can't see the URL or back/forward buttons

		if(PROJECT_NAME == currentState.project && BRANCH_NAME == currentState.branch && PATH == currentState.path && LINE == currentState.line) return; // No need to push another history

		currentState = {
			project: PROJECT_NAME,
			branch: BRANCH_NAME,
			path: PATH,
			line: LINE
		};

		var title = PATH; // Not used by any browser!?

		var url = window.location.search;
		if(PROJECT_NAME) url = url + "#" + PROJECT_NAME;
		if(BRANCH_NAME) url = url + "#" + BRANCH_NAME;
		if(PATH) url = url + "#" + PATH;
		if(LINE) url = url + "#" + LINE;

		window.history.pushState(currentState, title, url);
	}

	function updateBranchInUrl(branchName) {
		BRANCH_NAME = branchName;
		setUrl();
	}

	function updateProjectInUrl(projectName, oldProjectName) {
		PROJECT_NAME = projectName;
		setUrl();
	}

	function showInfoInUrl(file) {
		if(!file) return;

		PATH = file.path;

		if(lastJump.hasOwnProperty(file.path)) LINE = lastJump[file.path].row + file.startRow + 1;
		else LINE = file.currentLine();

		setUrl();

	}

	function browserNavigation(ev) {
		console.log("browserNavigation: ev=", ev);

		var state = ev.state;

		console.log("browserNavigation: state=", state);

		if(!state) return;

		navigate(state);
	}

	function navigate(state) {

		alert("navigate: state=" + JSON.stringify(state));

		if(state.project != EDITOR.project) EDITOR.changeProject(state.project);
		if(state.branch != EDITOR.branch) EDITOR.checkoutSCMBranch(state.branch);
		if(EDITOR.currentFile && state.path != EDITOR.currentFile.path) EDITOR.showFile(state.path);
		if(EDITOR.currentFile && state.line != EDITOR.currentFile.currentLine()) EDITOR.currentFile.gotoLine(state.line);
		EDITOR.dashboard.hide();
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
			
				LINE = file.currentLine();
				setUrl();

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
