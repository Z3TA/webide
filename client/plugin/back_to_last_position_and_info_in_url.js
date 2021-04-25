/*

	I often look at the top for the full path, but when running in the browser we can't control the top bar (only tabs)
	So use the free space in the URL to show info!

	#project#SCP-branch#file-PATH#Row (only change row when making a large jump, the we can use browsers back button to go back!)

	Git branch names can't start with /

	problem: 



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

	var ignoreHashChange = "";
	var ignoreMoveLine = -1;

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
				EDITOR.on("fileShow", changeFileInUrl);
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
				EDITOR.removeEvent("fileShow", changeFileInUrl);
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

		console.warn("url-history: checkUrlParametersOnStart: hash=" + hash + " state=" + JSON.stringify(state));

		// Wait until the file has fully loaded
		// The editor is probably re-opening a bunch of files...
		setTimeout(function() {
			console.warn("url-history: checkUrlParametersOnStart: Calling navigate()...");
			navigate(state, true);
		}, 2000);
		
	}

	function parseHash(hash) {
		var arr = hash.split("#");

		if(hash.charAt(0) == "#") arr.shift();

		var last = arr.pop();
		// Last is probably line nr
		if( !isNaN(parseInt(last)) ) {
			var line = parseInt(last);
		}
		else if( isPath(last) ) {
			// It's a path !? {
			var path = last;
		}
		else if(last && last.trim() != "") throw new Error("Unable to determine what " + last + " means in the url hash");

		var last = arr.pop();

		if(line && isPath(last)) {
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
	
		function isPath(str) {
			if( UTIL.isFilePath(str) ) return true;
			else if( EDITOR.files.hasOwnProperty(str) ) return true;
			else return false;
		}
	}
	
	function setUrl() {

		if(DISPLAY_MODE == "standalone") return; // Don't bother if we can't see the URL or back/forward buttons

		if(PROJECT_NAME == currentState.project && BRANCH_NAME == currentState.branch && PATH == currentState.path && LINE == currentState.line) return; // No need to push another history

		if(LINE == ignoreMoveLine) {
			console.log("url-history: setUrl: Ignoring LINE=" + LINE + " ignoreMoveLine=" + ignoreMoveLine + " ");
			return;
		}

		currentState = {
			project: PROJECT_NAME,
			branch: BRANCH_NAME,
			path: PATH,
			line: LINE
		};

		var title = PATH; // Not used by any browser!?

		var hash = hashFromState(currentState);
		
		if( hash == ignoreHashChange) {
			console.log("url-history: setUrl: Not doing a pushState because hash==ignoreHashChange=" + ignoreHashChange);
			return;
		}

		if(hash == window.location.hash) {
			console.log("url-history: setUrl: Not doing a pushState because hash=" + hash + " is already what we where going to save!");
			return;
		}

		var url = window.location.search + hash;

		console.warn("url-history: setUrl: (pushState) url= " + url + " ignoreHashChange=" + ignoreHashChange + " stack=" + UTIL.getStack("pushState") );

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

	function changeFileInUrl(file) {
		if(!file) return;

		PATH = file.path;

		ignoreMoveLine = -1;

		var currentLine = file.currentLine();

		if(lastJump.hasOwnProperty(file.path)) {
			var lastLineJump = lastJump[file.path].row + file.partStartRow + 1;
		}

		console.log("url-history: changeFileInUrl (fileShow " + file.path + "): lastLineJump=" + lastLineJump + " currentLine=" + currentLine + " ");

		if(lastLineJump) LINE = lastLineJump;
		else LINE = currentLine;

		setUrl();

	}

	function hashFromState(state) {
		var hash = "";
		if(state.project) hash = hash + "#" + state.project;
		if(state.branch) hash = hash + "#" + state.branch;
		if(state.path) hash = hash + "#" + state.path;
		if(state.line) hash = hash + "#" + state.line;

		return hash;
	}

	function browserNavigation(ev) {
		// User uses the browser back button (or forward)

		var state = ev.state;

		console.log("url-history: browserNavigation: state=", state);

		if(!state) return;

		var hash = hashFromState(state);
		if(ignoreHashChange == hash) {
			console.log("url-history: browserNavigation: Ignoring ignoreHashChange=" + ignoreHashChange + " hash=" + hash + "");
			return;
		}
		else {
			ignoreHashChange = window.location.hash;
			console.log("url-history: browserNavigation: Setting ignoreHashChange=" + ignoreHashChange);
		}

		navigate(state);
	}

	function hashChange(ev) {
		// user have changed the hash part of the url
		// note: hashChange also triggers after browserNavigation triggers!
		var hash = window.location.hash;
		
		if(ignoreHashChange == hash) {
			console.log("url-history: hashChange: Ignoring ignoreHashChange=" + ignoreHashChange + " hash=" + hash + "");
			return;
		}
		else {
			ignoreHashChange = hash;
			console.log("url-history: hashChange: Setting ignoreHashChange=" + ignoreHashChange);
		}

		var state = parseHash(hash);
		navigate(state, true);
	}

	function navigate(state, openFileIfNotOpen) {

		console.log("url-history: navigate: state=" + JSON.stringify(state));

		if(state.project && state.project != EDITOR.project) EDITOR.changeProject(state.project);
		if(state.branch && state.branch != EDITOR.branch) EDITOR.checkoutSCMBranch(state.branch);
		if(state.path && EDITOR.currentFile && state.path != EDITOR.currentFile.path) {
			if( EDITOR.files.hasOwnProperty(state.path) ) {
				console.warn("url-history: navigate: Showing file path=" + state.path);
				EDITOR.showFile(state.path);
				fileOpened();
			}
			else if( openFileIfNotOpen ) {
				if( UTIL.isLocalPath(state.path) ) {
					console.warn("url-history: navigate: Opening file path=" + state.path);
					EDITOR.openFile(state.path, fileOpened);
				}
				else console.log("url-history: navigate: Not opening " + state.path + " because it's not a local file-path");
			}
			else console.log("url-history: navigate: Not changing to " + state.path + " because it's not open and openFileIfNotOpen=" + openFileIfNotOpen + "");
		}
		else console.log("url-history: navigate: Not changing to " + state.path + " because it's already the current file path=" + state.path);

		checkLine();

		if( (state.path && EDITOR.currentFile && state.path == EDITOR.currentFile.path) ) {
			EDITOR.dashboard.hide();
		}

		function fileOpened(err) {
			checkLine();
			ignoreHashChange = window.location.hash;
			EDITOR.dashboard.hide();
		}

		function checkLine() {
			if(state.line && EDITOR.currentFile && state.path && EDITOR.currentFile.path == state.path && state.line != EDITOR.currentFile.currentLine()) {
				// Moving to another line would trigger a pushstate!
				ignoreMoveLine = state.line;
				console.warn("url-history: navigate: checkLine: Switching to line=" + state.line + " and Setting ignoreMoveLine=" + ignoreMoveLine);
				EDITOR.currentFile.gotoLine(state.line);
			}
			else console.log("url-history: navigate: checkLine: Not switching line because current file is already on line=" + state.line);
		}
	}

	function moveCaretBackToLastPosition2(file) {
		return moveCaretBackToLastPosition(file);
	}

	function moveCaretBackToLastPosition(file) {

		console.log("url-history: to_last_position: moveCaretBackToLastPosition! file.path=" + file.path + " ");

		if( lastJump.hasOwnProperty(file.path) ) {

			var jumpFromIndex = file.caret.index;
			var jumpFromRow = file.caret.row;
			var jumpFromCol = file.caret.col;

			lastCaretPos[file.path].index = jumpFromIndex;


			var index = lastJump[file.path].index;
			var row = lastJump[file.path].row;
			var col = lastJump[file.path].col;

			console.log("url-history: to_last_position: moveCaretBackToLastPosition: row=" + row + " lastCaretPos=", lastCaretPos[file.path]);

			file.moveCaret(undefined, row);

			file.scrollToCaret();
			file.scrollTo(0, row - Math.round(EDITOR.view.visibleRows / 2));

			// lastJump[file.path].col

		}
		else if(lastFile) {
			console.log("url-history: to_last_position: moveCaretBackToLastPosition: Showing last file =" + lastFile.path);
			EDITOR.show(lastFile);
		}
		else {
			alertBox("Nothing to move back to!");
		}

		return PREVENT_DEFAULT;
	}

	function rememberCaretPosition(file, caret) {

		// Note: We want to save the caret postion we where on *before* the jump, not the new position!

		console.log("url-history: rememberCaretPosition: file.path=" + file.path + " stack=" + UTIL.getStack("rememberCaretPosition"));

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

			console.log("url-history: rememberCaretPosition: init! file.path=" + file.path + " lastJump=", lastJump[file.path]);

		}
		else {

			var jump = Math.abs(lastCaretPos[file.path].row - caret.row);
			if( jump > EDITOR.view.visibleRows ) {

				console.log("url-history: rememberCaretPosition: before-update file.path=" + file.path + " lastJump=", lastJump[file.path]);

				// Moving more then visible rows counts as a big jump
			
				LINE = file.currentLine();
				setUrl();

				lastJump[file.path].index = lastCaretPos[file.path].index;
				lastJump[file.path].row = lastCaretPos[file.path].row;
				lastJump[file.path].col = lastCaretPos[file.path].col;

				console.log("url-history: rememberCaretPosition: update! file.path=" + file.path + " lastCaretPos=",  lastCaretPos[file.path]);
			}
			else {console.log("url-history: rememberCaretPosition: file.path=" + file.path + " Not long enough jump=" + jump + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows + " lastCaretPos=", lastCaretPos[file.path]);}


			console.log("url-history: file.path=" + file.path + " Set lastCaretPos=", lastCaretPos[file.path]);
			lastCaretPos[file.path].index = caret.index;
			lastCaretPos[file.path].row = caret.row;
			lastCaretPos[file.path].col = caret.col;

		}

		lastFile = file;

		return null;
	}


})();
