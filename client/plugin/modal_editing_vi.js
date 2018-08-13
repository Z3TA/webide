"use strict";

/*
	
	Proof of concept modal editing like in vi/vim
	The goal of this plugin is to let old vi/vim users use their reflexes.
	And make it so you can use the editor comfortably on a laptop without a mouse.
	Without having to reach for arrow or navigation keys.
	
	"Good design is when the program does what the user expects will happen"
	
	Problem: A lot of key bindings overlap "modern" key bindings like Ctrl+V for pasting, while in vim it goes into visual block mode.
	Solution: The editor will have different modes, where Ctrl+V to paste is in "default" mode and vim mode is "vimNormal" or "vimInsert".
	
	
	Visual Mode: Basically highlight stuff ... plus some magic !? 
	We will only support normal and insert mode for now.
	
	
	
	Some vim key bindings:
	
	
	While in normal/command mode
	-----------------------------
	
	CTRL-G = You get a message like this (assuming the 'ruler' option is off):
	"usr_03.txt" line 233 of 650 --35%-- col 45-52
	
	CTRL-U = scrolls down half a screen of text.
	
	CTRL-D = moves the viewing window down half a screen in the file,
	thus scrolls the text up half a screen.
	
	CTRL-E = croll up one line at a time
	
	CTRL-Y = croll down one line at a time
	
	CTRL-F = scroll forward by a whole screen (except for two lines)
	
	CTRL-B = Same like CTRL+F but backwards
	
	CTRL-O = Jump back to where you where
	
	CTRL-I = Jump forward to where you where before you jumped back
	
	CTRL-] = Jump to a subject under the cursor.
	
	
	While in insert mode:
	---------------------
	Ctrl + O = Waits for a normal mode command, executes it, then goes back to insert mode
	CTRL-W = Delete word at cursor
	CTRL-U = Delete current line
	CTRL-r {reg} = Puts text from a register
	CTRL+N = Auto complete
	CTRL-E  insert the character from below the cursor (row below)
	CTRL-Y  insert the character from above the cursor (row above)
	CTRL-A  insert previously inserted text
	
	
	Registers on keyPress: Enter,Delete
	
	
	Idea:
	:q = window.close
	:q! = nuke onbeforeunload then window.close (eg don't ask if sure)
	
	
	
	
	https://hea-www.harvard.edu/~fine/Tech/vi.html#defs
	https://www.youtube.com/watch?v=5r6yzFEXajQ
	
	
	
	
	// {Command}{Text object || Motion}
	
	
	
	// Commands d=delete/cut c=delete+insert y=copy v=visually select
	// Can have a number before, eg repeat this command n times
	// Example: diw = delete in word
	// Example: caw = change all word, and go into insert mode
	// Example: yi) = yank all text inside parentheses (yank=copy)
	// Example: da[ = delete all text inside the brackets, including the brackets
	// Example: dtx = delete until the x
	// Example: dfx = delete until the x, including the f
	// va" = Visually select all inside the double quotes, uincluding the quotes
	
	// u = undo()
	// y = yank (copy) selected text or followed by text object and or motion
	// c = change, deletes and goes into insert mode
	// ex: ci' = change (delete) inside single quote and go into insert mode
	
	// p = paste below the current line
	// P = paste above the current line
	
	// example: (not vi standard):
	// ysiw' = {yank}{substitute single character with new text}{Select all inside the next character}{one word}{single quote}
	
	
	
	
	// Repetition, the dot command
	// ex: ci' + foo + esc (a single motion) ... go to another string and . repeats it
	
	
	// Additional commands
	// dd/yy = delete/yank the current line
	// D/C = delete/change until end of line
	// ^$ = move to the beginning/end of line
	// I/A = move to the beginning/end of line and go into insert mode
	// o/O = insert new line above/below current line and go into insert mode
	
	// ex: yyp = yank current line, then paste it
	
	
	// Macros: A sequence of commands recorded to a register
	// ex: q{register} ... starts recording the marcro ... do stuff ... q = ends the macro
	// @{register} = replays the macro
	
	
	Because the editor does auto indentation we could have Esc=Tab so it's easier to reach
	
	todo: Handle large files. Ex: gg goto first line of the "large" file, and not the first line of the file buffer.
	
*/

(function() {
	"use strict";
	
	if(window.location.href.indexOf("&vim") == -1) {
console.warn("vim mode hidden behind &vim query string flag"); // Work in progress!
		return;
	}
	
	// https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
	var BACKSPACE = 8;
	var UP = 38;
	var DOWN = 40;
	var LEFT = 37;
	var RIGHT = 39;
	var SPACE = 32;
	var ESC = 27;
	var R = 82;
	var DELETE = 46;
	var END = 35;
	var HOME = 36;
	var G = 71;
	var U = 85;
	var D = 68;
	var E = 69;
	var Y = 89;
	var F = 70;
	var B = 66;
	
	var vimMenuItem;
	var vimCommandBuffer = "";
	var commandCaretPosition = 0;
	var messageToShow = "ENTER COMMAND"; // Helper message to show if there is nothing in command buffer 
	var insertedString = "";
	var lastCommand = ""; // Used for repeating last command with .
	var lastFind = ""; // Last f, F, t, T command so it can be repeated with ; or ,
	var searchString = "";
	var searchStringHistory = [];
	var highlightAllSearchMatches = false;
	var VIM_ACTIVE = false; // Always start with false, see plugin.load (toggles vim mode if &vimactive in url query)
	var lastCol = 0; // When moving the cursor up/down try to place the cursor at this column
	var repeatInsert = 0; // How many times the insert should be repeated after pressing Esc
	var repeatCommand = null; // If the insert is preceded by a command, repeat this command before each insert
	var history = {}; // Undo redo history [file.path] = {undo: [f,f,f], redo: [f,f,f]} or a new branch/array
	
	var commandHistory = [];
	commandHistory.index = -1;
	var searchOnlyCommandHistoryStartingWith = ""; // When using up/down arrows to toggle command history
	
	var option = {
		showmode: true, // show EDITOR.mode
		number: true, // Show line numbers
		ruler: false, /*
			When enabled, the ruler is displayed on the right side of the status line at the bottom of the window.
			By default, it displays the line number, the column number, the virtual column number,
			and the relative position of the cursor in the file (as a percentage).
		*/
		ignorecase: false, // Ignore case when searching
		hlsearch: false, // Highlight text when searching ??
		number: true // Show line numbers (editor default)
	}
	
	
	// The original/default vim normal key mapping
	// a=a, b=b, c=c etc so they can be remapped
	var originalNormalMap = {}; 
	var normalMap = {};
	for (var str in originalNormalMap) {
		normalMap[str]  = originalNormalMap[str];
	}
	
	EDITOR.on("start", function addVimNormalMode() {
		EDITOR.addMode("vimNormal");
		EDITOR.addMode("vimInsert");
		//EDITOR.addMode("vimVisual");
	});
	
	EDITOR.plugin({
		desc: "Modal editing using vim key bindings",
		load: function loadVim() {
			vimMenuItem = EDITOR.addMenuItem("Vim/modal mode", toggleVim);
			
			EDITOR.on("keyPressed", vimKeyPress);
			
			EDITOR.on("fileOpen", vimFileOpen);
			EDITOR.on("fileClose", vimFileClose);
			EDITOR.on("fileShow", vimFileShow);
			EDITOR.on("fileHide", vimFileHide);
			
			
			EDITOR.bindKey({desc: "Toggle vim/modal mode", fun: toggleVim, charCode: SPACE, combo: SHIFT, mode: "*"});
			
			EDITOR.bindKey({desc: "Vim redo", fun: vimRedo, charCode: R, combo: CTRL, mode: "vimNormal"});
			
			EDITOR.bindKey({desc: "Vim Esc to normal/command mode", fun: escapeFromInsert, charCode: ESC, combo: 0, mode: "vimInsert"});
			EDITOR.bindKey({desc: "Vim Esc to normal/command mode", fun: vimEscape, charCode: ESC, combo: 0, mode: "vimNormal"});
			
			EDITOR.bindKey({desc: "Vim backspace", fun: vimBackspace, charCode: BACKSPACE, combo: 0, mode: "*"});
			EDITOR.bindKey({desc: "Vim arrow left: Move caret left", fun: vimLeftArrowKey, charCode: LEFT, combo: 0, mode: "*"});
			EDITOR.bindKey({desc: "Vim arrow right: Move caret right", fun: vimRightArrowKey, charCode: RIGHT, combo: 0, mode: "*"});
			EDITOR.bindKey({desc: "Vim arrow up", fun: vimUpArrowKey, charCode: UP, combo: 0, mode: "*"});
			EDITOR.bindKey({desc: "Vim arrow down", fun: vimDownArrowKey, charCode: DOWN, combo: 0, mode: "*"});
			
			EDITOR.bindKey({desc: "Vim HOME", fun: vimHome, charCode: HOME, combo: 0, mode: "*"});
			
			EDITOR.bindKey({desc: "Vim END in Normal mode", fun: vimEndNormal, charCode: END, combo: 0, mode: "vimNormal"});
			EDITOR.bindKey({desc: "Vim END in Insert mode", fun: vimEndInsert, charCode: END, combo: 0, mode: "vimInsert"});
			
			EDITOR.bindKey({desc: "Vim where am I", fun: vimWhereAmI, charCode: G, combo: CTRL, mode: "vimNormal"});
			
			EDITOR.bindKey({desc: "Vim Delete", fun: vimDelete, charCode: DELETE, combo: 0, mode: "*"});
			
			EDITOR.bindKey({desc: "Scroll half a window up", fun: vimScrollHalfScreenUp, charCode: U, combo: CTRL, mode: "vimNormal"});
			EDITOR.bindKey({desc: "Scroll half a window down", fun: vimScrollHalfScreenDown, charCode: D, combo: CTRL, mode: "vimNormal"});
			EDITOR.bindKey({desc: "Scroll one line up", fun: vimScrollOneLineUp, charCode: Y, combo: CTRL, mode: "vimNormal"});
			EDITOR.bindKey({desc: "Scroll one line down", fun: vimScrollOneLineDown, charCode: E, combo: CTRL, mode: "vimNormal"});
			EDITOR.bindKey({desc: "Scroll a whole a screen up", fun: vimScrollWholeScreenUp, charCode: B, combo: CTRL, mode: "vimNormal"});
			EDITOR.bindKey({desc: "Scroll a whole a screen down", fun: vimScrollWholeScreenDown, charCode: F, combo: CTRL, mode: "vimNormal"});
			
			if(EDITOR.settings.devMode) {
				var ONE = 49;
				var TWO = 50;
				var THREE = 51;
				var FOUR = 52;
				EDITOR.bindKey({desc: "Vim test 1", fun: vimTest1, charCode: ONE, combo: CTRL+SHIFT, mode: "*"});
				EDITOR.bindKey({desc: "Vim test 2", fun: vimTest2, charCode: TWO, combo: CTRL+SHIFT, mode: "*"});
				EDITOR.bindKey({desc: "Vim test 3", fun: vimTest3, charCode: THREE, combo: CTRL+SHIFT, mode: "*"});
				
			}
			
			EDITOR.addRender(showCommandBuffer);
			
			if((window.location.href.indexOf("&vimactive") != -1)) {
				toggleVim();
			}
			
		},
		unload: function unloadVim() {
			EDITOR.removeMenuItem(vimMenuItem);
			EDITOR.removeEvent("keyPressed", vimKeyPress);
			EDITOR.removeRender(showCommandBuffer);
			
			EDITOR.unbindKey(toggleVim);
			EDITOR.unbindKey(escapeFromInsert);
			EDITOR.unbindKey(vimRedo);
		}
		});
		
	function noEol(file, caret) {
		if(file == undefined) file = EDITOR.currentFile;
		if(file == undefined) return null;
		if(caret == undefined) caret = file.caret;
		//console.log("caret.row=" + caret.row + " file.grid[" + caret.row + "].length=" +file.grid[caret.row].length + " caret.eol=" + caret.eol);
		if(file.grid[caret.row].length > 0 && caret.eol) {
file.moveCaretLeft();
			EDITOR.renderNeeded();
			return true;
		}
		else return false;
	}
	
	function vimFileOpen(file) {
		if(VIM_ACTIVE) return startHistory(file);
		else return true;
	}
	
	function vimFileClose(file) {
		delete history[file];
		return true;
	}
	
	function vimFileShow(file) {
		if(!history.hasOwnProperty(file.path)) return startHistory(file);
		else return true;
	}
	
	function vimFileHide(file) {
		if(EDITOR.mode == "vimInsert") {
			vimEscape(file);
		}
		return true;
	}
	
	function startHistory(file) {
		history[file.path] = []; // A history branch is just an Array with a currentItem property
		history[file.path].push(new HistoryItem());
		history[file.path].currentItem = 0;
		history[file.path].lastEditedRow = -1;
		history[file.path].rowContentBeforeEdit = "";
		//history[file.path].currentBranch = -1;
		
		return false;
	}
	
function vimEscape(file) {
if(EDITOR.mode == "vimInsert") {
return escapeFromInsert(file);
		}
		else if(EDITOR.mode == "vimNormal") {
			
			var moved = noEol();
			var cleared = clearCommandBuffer();
			
			if(!moved && !cleared) {
				// A beep means we did nothing, and are already in normal mode
				beep();
				console.warn("beep!");
				return false;
			}
			else {
				console.log("nobeep");
			}
			
			return false; // false to prevent editor default
		}
}

	function escapeFromInsert(file) {
		if(file == undefined) throw new Error("file=" + file);
		
		if(EDITOR.mode != "vimInsert") throw new Error("Expected vimInsert: EDITOR.mode=" + EDITOR.mode);
		console.log("Setting vim mode to normal (command mode)");
			
		lastCommand += insertedString; // So it can be repeated with . (dot)

		if(repeatInsert && repeatInsert > 0) {
			var str = insertedString; // Closure
			var caretIndex = file.caret.index - str.length; // Closure
			console.log("Repeating last insert command " + repeatInsert + " times and repeatCommand ? " + !!repeatCommand + " caretIndex=" + caretIndex);
			
			for (var i=0; i<repeatInsert; i++) {
				if(repeatCommand) {
					updateHistory(file, repeatCommand);
					repeatCommand.redo();
				}
				
				if(str.length > 0) {
					updateHistory(file, undoRedo(function repeatInsertStringUndo() {
						file.moveCaretToIndex(caretIndex);
						file.deleteTextRange(caretIndex, caretIndex+str.length-1);
					}, function repeatInsertStringRedo() {
						file.moveCaretToIndex(caretIndex);
						file.insertText(str);
					}));
					
					file.insertText(str);
				}
			}
			repeatInsert = 0;
			repeatCommand = null;
		}
		
		noEol();
		
		EDITOR.setMode("vimNormal");
		messageToShow = "ENTER COMMAND";
		
		EDITOR.renderNeeded();
		
		return false;
		
		
		
	}
	
	function undoRedo(undo, redo) {
		return {undo: undo, redo: redo};
	}
	
	function vimKeyPress(file, char, combo) {
		/*
			
		*/
		
		if(vimCommandBuffer === undefined) throw new Error("vimCommandBuffer=" + vimCommandBuffer);
		
		console.log("vimKeyPress: char=" + UTIL.lbChars(char) + " VIM_ACTIVE=" + VIM_ACTIVE + " EDITOR.mode=" + EDITOR.mode + " Enter?" + (char == "\n" || char == "\r") + " Delete?" + (char == String.fromCharCode(127)) );
		
		if(!VIM_ACTIVE) return true;
		
		//char = getNormalMap(char); // It's possible to remap keys
		// map keys inside the parse function !?
		
		if(typeof char != "string" && Array.isArray(char)) {
			// Many characters/commands mapped to the same key or recursive
			for (var i=0; i<char.length; i++) {
				vimKeyPress(file, char[i], combo);
			}
			return;
		}
		
		if(EDITOR.mode == "vimNormal") {
			
			if(char == "\n" || char == "\r") { // Sometimes it's LF and sometime CR !? 
				// Pressed Enter
				console.log("Vim: pressed Enter: vimCommandBuffer=" + vimCommandBuffer);
				if(vimCommandBuffer.charAt(0) == ":") {
					var editorCommand = vimCommandBuffer.slice(1);
					var runOption = parseLineCommand(vimCommandBuffer);
					
					clearCommandBuffer();
					
					if(runOption instanceof Error) {
						showMessage(runOption.message);
					}
					else if(typeof runOption == "function") {
						runOption();
					}
					else if(runOption == null) {
						showMessage("Unknown editor command: " + editorCommand);
					}
					else throw new Error("Unexpected: runOption=" + runOption);
					
					addCommandHistory(":" + editorCommand);
					return false;
				}
				else {
					var command = parseNormalCommand(vimCommandBuffer);
					if(!command) {
						showMessage("Unknown command: " + vimCommandBuffer);
						clearCommandBuffer();
					}
				}
				
			}
			else {
				
				if(commandCaretPosition < vimCommandBuffer.length) {
					vimCommandBuffer = vimCommandBuffer.slice(0, commandCaretPosition) + char + vimCommandBuffer.slice(commandCaretPosition);
				}
				else {
					vimCommandBuffer += char;
				}
				
				commandCaretPosition++;
				messageToShow = "";
				EDITOR.renderNeeded();
				
				var searchCommandReg = /^(\d*)?([fFtT])(.)/;
				
				if(vimCommandBuffer == "u") {
					// Undo
				vimUndo(file);
					return false;
			}
			else if(vimCommandBuffer == ".") {
				// Repeat last command
					var command = parseNormalCommand(lastCommand);
				}
				// ### Repeat find command
				else if(vimCommandBuffer == ";") {
					// Repeat last find-command
					if(lastFind == "") return showMessage("Yet no find command");
					
					var matchSearch = lastFind.match(searchCommandReg);
					if(matchSearch == null || (matchSearch && matchSearch.length != 4 )) {
						throw new Error("Unable to parse lastFind=" + lastFind + " searchCommandReg=" + searchCommandReg);
					}
					
					var command = parseNormalCommand(lastFind);
					
				}
				else if(vimCommandBuffer == ",") {
					// Repeat last find-command, but in the other direction
					if(lastFind == "") return showMessage("Yet no find command");
					
					var matchSearch = lastFind.match(searchCommandReg);
					if(matchSearch == null || (matchSearch && matchSearch.length != 4 )) {
						clearCommandBuffer();
						return showMessage("Not a search command: " + lastCommand);
					}
					
					var searchCommand = matchSearch[2];
						if(searchCommand == "f") searchCommand = "F";
						else if(searchCommand == "F") searchCommand = "f";
						else if(searchCommand == "t") searchCommand = "T";
						else if(searchCommand == "T") searchCommand = "t";
						else throw new Error("Something wrong with searchCommandReg=" + searchCommandReg);
					
					var lastLastFind = lastFind;
						var command = parseNormalCommand( (matchSearch[1] ? matchSearch[1] : "") + searchCommand + matchSearch[3] );
					lastFind = lastLastFind; // So we can click , repeatable to search in the same direction
					
				}
				else if(vimCommandBuffer.charAt(0) != ":") {
					var command = parseNormalCommand(vimCommandBuffer);
			}
				else console.log("Entering editor command : " + vimCommandBuffer + " ...");
			}
			
			if(command) {
				
				addHistory(file, undefined); // Start a new history entry
				
				if(command.scroll) {
					file.scrollTo(command.scroll.x, command.scroll.y);
				}
				
				if(command.moveCursor) {
					command.moveCursor();
					showCursorPosition();
				}
				
				if(command.undo && !command.redo || command.redo && !command.undo) {
throw new Error("undo?" + !!command.undo + " redo?" + command.redo + " vimCommandBuffer=" + vimCommandBuffer);
				}
				
				if(command.redo) {
command.redo(); // Runs the command
					EDITOR.renderNeeded(); // Asume the command did something. So that we don't need to have EDITOR.renderNeeded() in all undo and redo functions.
					
					addHistory(file, {
						undo: command.undo,
						redo: command.redo
					});
					
					lastCommand = vimCommandBuffer;
				}
				
				// When we clear the command buffer vimCommandBuffer will be "" and all messages will disappear
				clearCommandBuffer();
				
				if(command.insert) {
					// Insert some text
					var text = command.insert;
					var repeat = command.repeat || 1;
					for (var i=0; i<repeat; i++) {
						for (var j=0; i<text.length; i++) {
							if(text.charAt(j) == "\n") file.insertLineBreak(file.caret);
							else file.putCharacter(text.charAt(j));
						}
					}
EDITOR.renderNeeded();
					insertedString = "";
}
				
if(command.toInsert) {
// Switch to insert mode
EDITOR.setMode("vimInsert");
					if(option.showmode) showMessage("-- INSERT --");
					
					if(command.repeat) repeatInsert = command.repeat-1;
					else repeatInsert = 0;
					
					if(repeatInsert > 0 && command.redo) {
repeatCommand = {undo: command.undo, redo: command.redo};
					}
					else repeatCommand = null;
					
					insertedString = "";
				}
				
				}
			else if(command === null) {
				clearCommandBuffer();
			}
			
			if(vimCommandBuffer.indexOf("\n") != -1) throw new Error("Command buffer contains new-line character! vimCommandBuffer=" + UTIL.lbChars(vimCommandBuffer));
			
			return false; // Prevent defult browser action
		}
		else if(EDITOR.mode == "vimInsert") {
			/*
				The only "function" keys that get registered in keyPress in JavaScript is Enter and Delete!
				We need to EDITOR.bindKey for example backspace and arrow keys.
				In Firefox it only seems to be Enter that is captured by keyPress and everything else needed to be captured by EDITOR.bindKey!
			*/
			
			console.log("VimInsert:");
			var caretIndex = file.caret.index;
			
			if(char == "\n" || char == "\r") {
				console.log("Line break");
				insertedString += "\n";
				return rdo(function undoNewLine() {
					file.moveCaretToIndex(caretIndex);
					file.moveCaretLeft();
					file.deleteCharacter();
				},function redoNewLine() {
					file.moveCaretToIndex(caretIndex);
					file.insertLineBreak();
				});
			}
			else {
				console.log("Vim insert character=" + UTIL.lbChars(char));
				insertedString += char;
				return rdo(function insertCharacterUndo() {
					file.moveCaretToIndex(caretIndex);
					//file.moveCaretLeft();
					file.deleteCharacter();
				}, function insertCharacterRedo() {
					file.moveCaretToIndex(caretIndex);
					file.putCharacter(char);
				}, "char=" + char);
			}
		}
		else { // Not vimInsert or VimNormal
			return true; // Do the editor default
		}
		
		function rdo(undo, redo, comment) {
			var ev = {undo: undo, redo: redo, comment: comment};
			ev.redo();
			EDITOR.renderNeeded();
			updateHistory(file, ev);
			
			return false;
		}
	}
	
	
	
	function vimBackspace(file, combo) {
		// Backspace is not captured by keyPress!
		if(!VIM_ACTIVE) return true;
		console.log("vim: Backspace");
		if(EDITOR.mode == "vimInsert") {
			
			var backspaceRedo = function moveLeftAndDeleteCharacter() {
				file.moveCaretLeft();
				file.deleteCharacter();
			}
			
			var backspaceUndo;
			
			if(file.caret.eol) {
				backspaceUndo = function reinsertLineBreak() {
					file.insertLineBreak();
				}
			}
			else {
				var removedCharacter = file.text.charAt(file.caret.index-1);
				backspaceUndo = function reinsertCharacter() {
					file.putCharacter(removedCharacter);
				}
			}
			
			return rdo(backspaceUndo, backspaceRedo);
			
			function rdo(undo, redo) {
				var ev = {undo: undo, redo: redo};
				ev.redo();
				EDITOR.renderNeeded();
				updateHistory(file, ev);
				
				return false;
			}
			
		}
		else if(EDITOR.mode == "vimNormal" && vimCommandBuffer.charAt(0) == ":") {
			console.log("commandCaretPosition=" + commandCaretPosition);
			console.log("vimCommandBuffer=" + vimCommandBuffer);
			
			if(commandCaretPosition == vimCommandBuffer.length) {
				vimCommandBuffer = vimCommandBuffer.slice(0,-1);
			}
			else {
				vimCommandBuffer = vimCommandBuffer.slice(0,commandCaretPosition-1) + vimCommandBuffer.slice(commandCaretPosition);
			}
			
			if(vimCommandBuffer === undefined) throw new Error("vimCommandBuffer=" + vimCommandBuffer);
			
			commandCaretPosition--;
			EDITOR.renderNeeded();
			
			// Wait for Enter before parsing/executing the command !? Yes! Only commands starting with : can be edited!
			
			return false;
		}
		else if(EDITOR.mode == "vimNormal") {
			clearCommandBuffer();
			return false;
		}
		else {
			return true;
		}
	}
	
	/*
		Each arrow-move in insert-mode adds to the history (starts a new history)
		and . will repeat the insert that happened after the move
		
		ci" (change inside ") and inserting text, then undo undoes both inserted text and change (deletion)
		
		Arrow keys are not captured by keyPress
		You can not undo arrow keys (move caret)
	*/
	
	function vimLeftArrowKey(file, combo) {
		if(!VIM_ACTIVE) return true;
		
		if( EDITOR.mode == "vimInsert" || (EDITOR.mode == "vimNormal" && vimCommandBuffer.length == 0) ) {
			file.moveCaretLeft();
			showCursorPosition();
			EDITOR.renderNeeded();
			addHistory(file, undefined); // Start a new history
			insertedString = "";
			return false;
		}
		else if(EDITOR.mode == "vimNormal" && vimCommandBuffer.charAt(0) == ":" && commandCaretPosition > 1) {
			commandCaretPosition--;
			EDITOR.renderNeeded();
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimRightArrowKey(file, combo) {
		if(!VIM_ACTIVE) return true;
		
		if( EDITOR.mode == "vimInsert" || (EDITOR.mode == "vimNormal" && vimCommandBuffer.length == 0) ) {
			file.moveCaretRight();
			showCursorPosition();
			EDITOR.renderNeeded();
			addHistory(file, undefined); // Start a new history
			insertedString = "";
			return false;
		}
		else if(EDITOR.mode == "vimNormal") {
			commandCaretPosition++;
			EDITOR.renderNeeded();
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimUpArrowKey(file, combo) {
		if(!VIM_ACTIVE) return true;
		
		console.log("vim key up");
		
		if( EDITOR.mode == "vimInsert" || (EDITOR.mode == "vimNormal" && vimCommandBuffer.length == 0) ) {
			file.moveCaretUp();
			showCursorPosition();
			EDITOR.renderNeeded();
			addHistory(file, undefined); // Start a new history
			insertedString = "";
			return false;
		}
		else if(EDITOR.mode == "vimNormal" && vimCommandBuffer.charAt(0) == ":") {
			
			console.log("commandHistory.length=" + commandHistory.length + " commandHistory.index=" + commandHistory.index);
			
			if(commandHistory.length == 0) {
				console.warn("No commands have been entered! commandHistory.length=" + commandHistory.length);
				return false;
			}
			
			if(commandHistory.index+1 == commandHistory.length) {
				// Add current command to the history before selecting an older entry
				addCommandHistory(vimCommandBuffer);
			}
			
			if(commandHistory.index == 0) {
				console.log("Already at the oldest commandHistory entry! commandHistory.index=" + commandHistory.index + " commandHistory.length=" + commandHistory + "");
				return false;
			}
			
			// Toggle vim command history
			if(commandHistory.index-1 == commandHistory.length && vimCommandBuffer) {
				searchOnlyCommandHistoryStartingWith = vimCommandBuffer;
			}
			else if(!vimCommandBuffer) {
				searchOnlyCommandHistoryStartingWith = "";
			}
			
			if(searchOnlyCommandHistoryStartingWith) {
				for (var i=commandHistory.index; i>-1; i--) {
					if(commandHistory[i].slice(0,vimCommandBuffer.length) == searchOnlyCommandHistoryStartingWith) {
						vimCommandBuffer = commandHistory[i];
						commandCaretPosition = vimCommandBuffer.length;
						commandHistory.index = i;
						break;
					}
				}
			}
			else {
				commandHistory.index--;
				if(commandHistory.index < 0) throw new Error("commandHistory.index=" + commandHistory.index);
				vimCommandBuffer = commandHistory[commandHistory.index];
				commandCaretPosition = vimCommandBuffer.length;
			}
			EDITOR.renderNeeded();
			
			if(vimCommandBuffer === undefined) throw new Error("vimCommandBuffer=" + vimCommandBuffer);
			
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimDownArrowKey(file, combo) {
		if(!VIM_ACTIVE) return true;
		
		if( EDITOR.mode == "vimInsert" || (EDITOR.mode == "vimNormal" && vimCommandBuffer.length == 0) ) {
			file.moveCaretDown();
			showCursorPosition();
			EDITOR.renderNeeded();
			addHistory(file, undefined); // Start a new history
			insertedString = "";
			return false;
		}
		else if(EDITOR.mode == "vimNormal" && vimCommandBuffer.charAt(0) == ":") {
			// Toggle vim command history
			
			if(commandHistory.length == 0) {
				console.warn("No commands have been entered! commandHistory.length=" + commandHistory.length);
				return false;
			}
			
			// Do nothing if we're already at the history tip
			if(commandHistory.index+1 == commandHistory.length) {
				console.log("Already at history tip"); 
				return false;
			}
			
			if(searchOnlyCommandHistoryStartingWith) {
				for (var i=commandHistory.index; i<commandHistory.length; i++) {
					if(commandHistory[i].slice(0,vimCommandBuffer.length) == searchOnlyCommandHistoryStartingWith) {
						vimCommandBuffer = commandHistory[i];
						commandCaretPosition = vimCommandBuffer.length;
						commandHistory.index = i;
						break;
					}
				}
			}
			else {
				commandHistory.index++;
				console.log("commandHistory:", commandHistory);
				console.log("commandHistory.length=" + commandHistory.length);
				console.log("commandHistory.index=" + commandHistory.index);
				vimCommandBuffer = commandHistory[commandHistory.index];
				commandCaretPosition = vimCommandBuffer.length;
			}
			
			if(vimCommandBuffer === undefined) throw new Error("vimCommandBuffer=" + vimCommandBuffer);
			
			EDITOR.renderNeeded();
			
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimHome(file) {
		// Does the same thing in both normal and insert mode
		// Goes to the first character of the line
		if(!VIM_ACTIVE) return true;
		
		file.moveCaretToStartOfLine();
		showCursorPosition();
		
		return false; // Prevent (browser) default
	}
	
	function vimEndNormal(file) {
		// Goes to the last character of the line
		file.moveCaretToEndOfLine();
		file.moveCaretLeft();
		showCursorPosition();
		
		return false; // Prevent (browser) default
	}
	
	function vimEndInsert(file) {
		// Goes to EOL
		file.moveCaretToEndOfLine();
		showCursorPosition();
		
		return false; // Prevent (browser) default
	}
	
	function vimRedo(file) {
		clearCommandBuffer();
		
		var fileHistory = history[file.path];
		
		console.log("vim:redo: file.path=" + file.path + " fileHistory.length=" + fileHistory.length + " fileHistory.currentItem=" + fileHistory.currentItem + "");
		console.log("file.text=" + file.text);
		
		if(fileHistory.length == 0) {
console.warn("Unable to redo! No recorded history!");
			return false;
		}
		
		var alreadyGoneForward = false;
		
		if(fileHistory.currentItem == -1 && fileHistory.length > 0) {
			// The item index has reached the bottom in order to prevent repetition of the first undo
			// Now go forward
			console.log("set fileHistory.currentItem = 0");
			fileHistory.currentItem = 0;
			alreadyGoneForward = true;
		}
		
		if(fileHistory.currentItem >= fileHistory.length) {
			console.log("fileHistory already at the tip! fileHistory.currentItem=" + fileHistory.currentItem + " fileHistory.length=" + fileHistory.length);
			console.log(fileHistory);
			showMessage("Already at newest change");
			return false;
		}
		
		var tip = getHistoryTip(fileHistory);
		var branch = tip.branch;
		var historyItem = tip.item;
		
		var isRootBranch = (branch==fileHistory)
		console.log("isRootBranch=" + isRootBranch);
		
		if(!isRootBranch) alreadyGoneForward = false;
		
		if(branch == fileHistory && branch.currentItem != fileHistory.currentItem) {
			console.log(branch);
			console.log(fileHistory);
			throw new Error("fileHistory.currentItem=" + fileHistory.currentItem + " branch.currentItem=" + branch.currentItem + " branch===fileHistory ? " + (branch===fileHistory));
		}
		
		if(!alreadyGoneForward) {
		// Go forward in history
		// Redo goes forward Before redoing, while Undo goes backwards After undoing
		console.log(branch);
		console.log("branch.currentItem=" + branch.currentItem);
		console.log("branch[" + branch.currentItem + "].branches.length = " + branch[branch.currentItem].branches.length + "");
		console.log("branch[" + branch.currentItem + "].currentBranch=" + (branch[branch.currentItem] && branch[branch.currentItem].currentBranch) + "");
			//historyItem = branch[branch.currentItem];
			while(historyItem && historyItem.currentBranch > -1) {
				console.log("Go forward into historyItem.currentBranch=", historyItem.currentBranch);
				branch = historyItem.branches[historyItem.currentBranch];
				historyItem = branch[branch.currentItem];
				//branch[branch.currentItem].branches[ branch[branch.currentItem].currentBranch ].currentItem++;
			}
			branch.currentItem++;
			historyItem = branch[branch.currentItem];
		}
		
		console.log("branch.currentItem=" + branch.currentItem + " branch.length=" + branch.length);
		
		if( branch.currentItem >= branch.length) {
			console.log("branch already at the tip! branch.currentItem=" + branch.currentItem + " branch.length=" + branch.length);
			console.log(fileHistory);
			showMessage("Already at newest change");
			return false;
		}
		
		for (var i=0, f; i<historyItem.redo.length; i++) {
			f = historyItem.redo[i]
			console.log( "redo " + i + ":" + UTIL.getFunctionName(f) + ": " + f.toString() + (historyItem.comment && historyItem.comment[i] ? "// " + historyItem.comment[i] : "") ); 
			f();
		}
		
		
		// No need to have EDITOR.renderNeeded() inside each redo function
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimUndo(file) {
		if(!(file instanceof File)) throw new Error("file=" + file); 
		clearCommandBuffer();
		
		var fileHistory = history[file.path];
		
		console.log("vim:undo: file.path=" + file.path + " fileHistory.length=" + fileHistory.length + " fileHistory.currentItem=" + fileHistory.currentItem);
		
		console.log("fileHistory: fileHistory.currentItem=" + fileHistory.currentItem);
		console.log(fileHistory);
		
		if(fileHistory.length == 0) {
console.warn("Unable to undo! No recorded history!");
			return false;
		}
		
		if(fileHistory.currentItem == -1) {
			console.log("No more history to undo!");
			showMessage("Already at oldest change");
			return false;
		}
		
		if(fileHistory.currentItem == fileHistory.length) {
			// The item index has reached above the ceiling in order to prevent aditional redo
			fileHistory.currentItem = fileHistory.length-1;
			console.log("set fileHistory.currentItem = " + fileHistory.currentItem);
		}
		
		var tip = getHistoryTip(fileHistory);
		var branch = tip.branch;
		var parentBranch = tip.parentBranch;
		var historyItem = tip.item;
		
		console.log("root branch ? " + (branch==fileHistory));
		
		if(branch.currentItem == undefined) {
			console.log("branch:", branch);
			throw new Error("branch.currentItem=" + branch.currentItem);
		}
		
		if(branch.currentItem == branch.length) {
			// The item index has reached above the ceiling in order to prevent aditional redo
			branch.currentItem = branch.length-1;
			console.log("set branch.currentItem = " + branch.currentItem );
			historyItem = branch[branch.currentItem];
		}
		
		console.log(branch);
		console.log("branch.currentItem=" + branch.currentItem);
		console.log("branch.length=" + branch.length);
		console.log("historyItem=" + historyItem);
		
		// Should the undo run backwards !? Last in last out !?
		for (var i=historyItem.undo.length-1, f; i>-1; i--) {
			f = historyItem.undo[i];
			console.log( "undo " + i + ":" + UTIL.getFunctionName(f) + ": " + f.toString() + (historyItem.comment && historyItem.comment[i] ? "// " + historyItem.comment[i] : "") ); 
			f();
		}
		
		// Go backwards in history
		console.log("before undo: branch.currentItem=" + branch.currentItem + " parentBranch ? " + !!parentBranch);
		branch.currentItem--;
		if(parentBranch && branch.currentItem == -1 && parentBranch.currentBranch > -1) {
			console.log("Step back out of the branch");
			parentBranch.currentBranch = -1;
		}
		console.log("after undo: branch.currentItem=" + branch.currentItem);
		
		// No need to have EDITOR.renderNeeded() inside each undo function
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimWhereAmI(file) {
		var line = file.caret.row+1;
		var totalLines = file.grid.length;
		var percentage = Math.ceil( (line-1) / (totalLines-1) * 100 - 1 );
		var column = file.caret.col + 1;
		showMessage("Line " + line + " of " + totalLines + " --" + percentage + "%-- column " + column);
		return false;
	}
	
	function vimDelete(file) {
		if(!VIM_ACTIVE) return true;
		console.log("vim: DELETE");
		
		if( EDITOR.mode == "vimNormal" && vimCommandBuffer.charAt(0) == ":" ) {
			// Pressing delete while editing command buffer
			console.log("commandCaretPosition=" + commandCaretPosition);
			console.log("vimCommandBuffer=" + vimCommandBuffer);
			
			if(commandCaretPosition == vimCommandBuffer.length-1) {
				vimCommandBuffer = vimCommandBuffer.slice(0,-1);
			}
			else {
				vimCommandBuffer = vimCommandBuffer.slice(0,commandCaretPosition) + vimCommandBuffer.slice(commandCaretPosition+1);
			}
			
			if(vimCommandBuffer === undefined) throw new Error("vimCommandBuffer=" + vimCommandBuffer);
			
			EDITOR.renderNeeded();
			
			// Wait for Enter before parsing/executing the command !? Yes! Only commands starting with : can be edited!
			
			return false;
		}
		else { //if(EDITOR.mode == "vimInsert") {
			// Delete in Vim always seem to delete in the text buffer unless you are inside a command buffer
			insertedString = insertedString.slice(0,-1);
			var caretIndex = file.caret.index;
			var deletedCharacter = file.text.charAt(caretIndex);
			return rdo(function deleteUndo() {
				file.moveCaretToIndex(caretIndex);
				file.putCharacter(deletedCharacter);
			}, function deleteRedo() {
				file.moveCaretToIndex(caretIndex);
				file.deleteCharacter();
			});
		}
		
		
		
		// Function placed here so file will be in closure
		function rdo(undo, redo, comment) {
			var ev = {undo: undo, redo: redo, comment: comment};
			ev.redo();
			EDITOR.renderNeeded();
			updateHistory(file, ev);
			
			return false;
		}
		
	}
	
	function vimScrollHalfScreenUp(file) {
		clearCommandBuffer();
		
		var scrollStep = Math.round(EDITOR.view.visibleRows / 2);
		// Vim also moves the cursor when scrolling
		file.moveCaretToStartOfLine();
		while(scrollStep--) file.moveCaretUp();
		file.scrollToCaret();
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimScrollHalfScreenDown(file) {
		clearCommandBuffer();
		
		var scrollStep = Math.round(EDITOR.view.visibleRows / 2);
		// Vim also moves the cursor when scrolling
		file.moveCaretToStartOfLine();
		while(scrollStep--) file.moveCaretDown();
		file.scrollToCaret();
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimScrollOneLineUp(file) {
		clearCommandBuffer();
		file.scroll(0, -1);
		// Vim doesn't move the cursor unless it would go off screen
		if(file.caret.row >= file.startRow + EDITOR.view.visibleRows) {
			file.moveCaret(undefined, file.startRow + EDITOR.view.visibleRows - 1);
		}
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimScrollOneLineDown(file) {
		clearCommandBuffer();
		file.scroll(0, 1);
		
		if(file.caret.row < file.startRow) {
			file.moveCaret(undefined, file.startRow);
		}
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimScrollWholeScreenUp(file) {
		clearCommandBuffer();
		
		var scrollStep = Math.max(1, EDITOR.view.visibleRows-2);
		file.scroll(0, -scrollStep);
		
		if(file.caret.row >= file.startRow + EDITOR.view.visibleRows) {
			file.moveCaret(undefined, file.startRow + EDITOR.view.visibleRows - 1);
			file.moveCaretToStartOfLine();
		}
		
		EDITOR.renderNeeded();
		return false;
	}
	
	function vimScrollWholeScreenDown(file) {
		clearCommandBuffer();
		
		var scrollStep = Math.max(1, EDITOR.view.visibleRows-2);
		file.scroll(0, scrollStep);
		
		if(file.caret.row < file.startRow) {
			file.moveCaret(undefined, file.startRow);
			file.moveCaretToStartOfLine();
		}
		
		EDITOR.renderNeeded();
		return false;
	}
	
	function updateHistory(file, ev) {
		// Adds to existing/current undo/redo history, when adding insert to current command
		if(typeof ev != "object") throw new Error("Want a history object with undo and redo functions! ev=" + ev + " is not an object!");
		if(typeof ev.undo != "function") throw new Error("ev.undo=" + ev.undo + " needs to be a function!");
		if(typeof ev.redo != "function") throw new Error("ev.redo=" + ev.redo + " needs to be a function!");
		
		if(!history.hasOwnProperty(file.path)) throw new Error("file.path=" + file.path + " does not exist in history=" + Object.keys(history) + " VIM_ACTIVE=" + VIM_ACTIVE);
		
		var fileHistory = history[file.path];
		
		if(fileHistory.length == 0) {
			console.warn("There is no history to add to! fileHistory.length=" + fileHistory.length + " Adding new history item ...");
			return addHistory(file, ev);
		}
		
		var tip = getHistoryTip(fileHistory);
		var branch = tip.branch;
		var historyItem = tip.item;
		
		if(historyItem.undo == undefined) {
			console.log("branch:");
			console.log(branch);
			console.log("fileHistory:");
			console.log(fileHistory);
		}
		
		historyItem.undo.push(ev.undo);
		historyItem.redo.push(ev.redo);
		historyItem.comment.push(ev.comment);
		historyItem.date = new Date();
	}
	
	function getHistoryTip(fileHistory) {
		if(fileHistory.currentItem <= -1) {
			console.log(fileHistory);
			throw new Error("fileHistory.currentItem=" + fileHistory.currentItem + "");
		}
		if(fileHistory.currentItem >= fileHistory.length) {
			console.log(fileHistory);
			throw new Error("fileHistory.length=" + fileHistory.length + " fileHistory.currentItem=" + fileHistory.currentItem + "");
		}
		
		var branch = fileHistory;
		var parentBranch = null;
		var historyItem = branch[branch.currentItem];
		console.log(fileHistory);
		console.log("branch.currentItem=" + branch.currentItem);
		console.log("historyItem.branches.length=" + historyItem.branches.length);
		console.log("historyItem.currentBranch=" + historyItem.currentBranch);
		console.log("historyItem.branches[" + historyItem.currentBranch + "]=", historyItem.branches[historyItem.currentBranch]);
		console.log("historyItem.branches[" + historyItem.currentBranch + "].currentItem=" + (historyItem.branches[historyItem.currentBranch] && historyItem.branches[historyItem.currentBranch].currentItem) );
		while(historyItem && historyItem.branches.length > 0 && historyItem.currentBranch >= -1 && historyItem.branches[historyItem.currentBranch].currentItem > -1) {
			console.log("Selecting history branch historyItem.currentBranch=" + historyItem.currentBranch);
			parentBranch = branch;
			branch = historyItem.branches[historyItem.currentBranch];
			console.log("branch.currentItem=" + branch.currentItem);
			console.log("branch.length=" + branch.length);
			historyItem = branch[branch.currentItem];
			console.log("historyItem:", historyItem);
			console.log("branch:", branch);
		}
		if(branch.currentItem <= -1) throw new Error("branch.currentItem=" + branch.currentItem + " branch:", branch);
		if(branch == undefined) throw new Error("branch=" + branch);
		if(branch.currentItem == undefined) throw new Error("branch.currentItem=" + branch.currentItem);
		//if(historyItem == undefined) throw new Error("historyItem=" + historyItem);
		return {branch: branch, item: historyItem, parentBranch: parentBranch};
	}
	
	function addHistory(file, ev) {
		// Add/Create a new undo/redo history item, when running a command
		
		var fileHistory = history[file.path];
		if(fileHistory == undefined) throw new Error("No history for file.path=" + file.path);
		
		console.log("vim:addHistory: file.path=" + file.path + " ev=", ev, " fileHistory.currentItem=" + fileHistory.currentItem); 
		console.log("file.text=" + file.text);
		
		if(fileHistory.currentItem <= -1) {
			// Create a new empt history item (that we will branch out from)
			fileHistory.unshift(new HistoryItem());
			fileHistory.currentItem = 0;
		}
		else if(fileHistory.currentItem >= fileHistory.length) {
			// Most likely the currentItem has reached over the ceiling to prevent additional redo's
			fileHistory.currentItem = fileHistory.length-1;
		}
		
		var tip = getHistoryTip(fileHistory);
		var branch = tip.branch;
		var historyItem = tip.item;
		
		console.log(branch);
		console.log("branch.currentItem=" + branch.currentItem);
		console.log("branch.length=" + branch.length);
		
		// Don't create a new Emty history entry if last one is already Empty!
		if(ev == undefined && historyItem && historyItem.redo.length == 0 && historyItem.undo.length == 0) return;
		
		var newEvent = new HistoryItem(ev && ev.undo, ev && ev.redo, ev && ev.comment);
		
		if(branch.currentItem < (branch.length-1) && branch.currentItem > -1) {
			// We are in the middle of the history, so branche out
			console.log("brancing out on branch.currentItem=" + branch.currentItem);
			branch = [];
			historyItem.currentBranch = historyItem.branches.push(branch)-1;
		}
		else if(branch.currentItem == branch.length-1) {
			// We are at the tip
			// Replace current item if it's empty!
			if(historyItem.undo.length == 0) {
				console.log("Replacing tip because it's empty");
				branch[branch.currentItem] = newEvent;
				return;
			}
		}
		
		// Add new history item/event
		branch.currentItem = branch.push(newEvent) - 1; // Push returns the length of the array
		
		console.log("Added new history item/event to branch=", branch);
	}
	
	function HistoryItem(undo, redo, comment) {
		// Object model for history items
		this.date = new Date();
		this.undo = undo ? [undo] : [];
		this.redo = redo ? [redo] : [];
		this.comment = comment ? [comment]: []; // For debugging
		this.branches = [];
		this.currentBranch = -1;
	}
	
	function addCommandHistory(command) {
		if(command.charAt(0) != ":") {
console.warn("Only store commands starting with :");
			return null;
		}
		
		// Don't add to command history if the command was repeated
		if(commandHistory.length == 0 || commandHistory[commandHistory.length-1] != command) {
			if(commandHistory.index+1 == commandHistory.length) {
				// At the tip
				commandHistory.index++;
			}
			var index = commandHistory.push(command);
			return index;
		}
		else {
			console.log("command=" + command + " same ast last command in history");
			return null;
		}
	}
	
	function parseLineCommand(str) {
		
		console.log("Parsing vim option: " + str);
		
		var file = EDITOR.currentFile;
		
		/*
			# Command line
				The commands starting with ":" also have a history.  That allows you to recall
				a previous command and execute it again.  These two histories are separate.
				
			*/
		
		if(str == ":set number") {
			return function showLineNumbers() {
				EDITOR.settings.showLineNumbers = true;
				EDITOR.settings.leftMargin = 50;
			}
		}
		else if(str == ":set nonumber") {
			// Turn off line numbers
			return function hideLineNumbers() {
				EDITOR.settings.showLineNumbers = false;
				EDITOR.settings.leftMargin = 5;
			}
		}
		else if(str == ":set number?" || str == ":set nonumber?") {
			return function showIfLineNumbersVisible() {
				showMessage( EDITOR.settings.showLineNumbers ? "number" : "nonumber" );
			}
		}
		else if(str.slice(0, 5) == ":set ") {
			/*
				set: set some option ex: :set option or :set nooption to turn it off
				a question mark shows if it's on or not: ex: :set compatible? shows compatible if its on or nocompatible if it's off
			*/
			var activate = str.slice(5,7) != "no";
			var key = activate ? str.slice(5) : str.slice(7);
			var question = str.slice(-1) == "?";
			
			if(question) key = key.slice(0,-1);
			
			if(!option.hasOwnProperty(key)) return new Error("Unknown option: " + key);
			
			if(question) {
				return function showStatus() {
					showMessage( option[key] ? key : "no" + key );
				}
			}
			else if(activate) {
				return function enable() {
					option[key] = true;
				}
			}
			else {
				return function disable() {
					option[key] = false;
				}
			}
		}
		else if(str == ":nohlsearch") {
				// Clear all highlighted text
			}
			else if(str.slice(0,5) == ":edit") {
				// Open a file for editing
			}
			else if(str == ":marks") {
				// Show a list of marks (a-z)
			}
		else if(str == ":q!") {
			// Close file without saving
			return function closeFile() {
				EDITOR.closeFile(file.path);
			}
		}
		else if(str == ":q") {
			// Close file, but not if there are unsaved changes
			if(file.isSaved) {
				return function closeFile() {
					EDITOR.closeFile(file.path);
				}
			}
			else {
				return function err37() {
					showMessage("No write since last change (use ! to override)");
					beep();
				}
			}
		}
		else if(str == ":e!") {
			// Reload file from disk, ignore changes
			return function reloadFromDisk() {
				EDITOR.readFromDisk(file.path, function(err, path, text, hash) {
					if(err) {
						showMessage("Failed to load file: " + err.message);
						beep();
					}
					else {
						file.reload(text);
						file.hash = hash;
						file.saved(); // Because we reloaded from disk
					}
				});
			}
		}
		else if(str == ":help") {
			// Reload file from disk, ignore changes
			return function help() {
				alertBox("Sorry, there is not yet any documentation besides the README.txt that comes with the program.");
			}
		}
		
		else return null;
	}
	
	function isKeyword(char) {
		// vim default: @,48-57,_,192-255
		var code = char.charCodeAt(0);
		if( char == "_" || (code >= 48 && code <= 57) || (code >= 192 && code <= 255) ) return true;
		else return false;
	}
	
	function parseNormalCommand(str, file) {
		/*
			Returns the following object:
			{undo: Function, redo: Function, insert: String, toInsert: Boolean}
				
			Example:
			d2w = delete two words
			
			ref: http://vimhelp.appspot.com/
			
		*/
		
		if(file == undefined) file = EDITOR.currentFile;
		if(!file) return null;
		
		if(typeof str != "string") throw new Error("Nothing to parse: str=" + str);
		
		console.log("Parsing vim command: " + str);
		
		if(str.charAt(0) == ":") throw new Error("Parse using parseLineCommand instead!");
		
		var nr = "";
		var repeat = 1;
		var operatorRepeat = 1;
		var char = "";
		var lastChar = "";
		var findLeft = false;
		var findRight = false;
		var findToLeft = false;
		var findToRight = false;
		var inSearchCommand = false;
		var del = false;
		var change = false;
		var replace = false;
		var caretIndex = file.caret.index;
		var lineBreak = file.lineBreak;
		var firstLbChar = lineBreak[0];
		var lastLbChar = lineBreak[lineBreak.length-1];
		
		// non-word that is not a white-space
		var nwww = /[^A-Za-z0-9_ \f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/
		
		for (var i=0; i<str.length; i++) {
			lastChar = char;
			char = getNormalMap(str.charAt(i)); // Converts to default keys
			
			console.log("vim:Parse char=" + char + " lastChar=" + lastChar);
			
			if(replace) {
				console.log("Replace " + repeat * operatorRepeat + " character(s) under the cursor with char=" + char);
				var charsToReplace = Math.min(repeat * operatorRepeat, file.grid[file.caret.row].length - file.caret.col);
				var removedText = file.text.slice(file.caret.index, file.caret.index + charsToReplace);
				var insertedText = "";
				for (var j=0; j<charsToReplace; j++) {
					insertedText += char;
				}
				return cmd(function replaceCharUndo() {
					file.moveCaretToIndex(caretIndex);
					file.deleteTextRange(caretIndex, caretIndex + charsToReplace - 1);
					file.insertText(removedText);
				}, function replaceCharRedo() {
					file.moveCaretToIndex(caretIndex);
					file.deleteTextRange(caretIndex, caretIndex + charsToReplace - 1);
					file.insertText(insertedText);
				});
			}
			else if((char == "0" && !nr)) {
				// moves to the very first character of the line
				var index = file.grid[file.caret.row].startIndex;
				
				return cursorMovement(function zeroMoveTo() {
					file.moveCaretToIndex(index);
				});
			}
			
			/*
				"3d2w" deletes two words, repeated three times, for a total of six words.
			*/
			else if(UTIL.isNumeric(char)) {
				nr += char;
				repeat = parseInt(nr);
			}
			
			// ## Quick search single letter
			else if(findRight || findToRight) {
				lastFind = str;
				
				if(file.caret.eof) return nil();
				
				var lookFor = char;
				console.log("findRight: lookFor=" + lookFor);
				var char = "";
				var toRepeat = repeat;
				
				for (var i=caretIndex+1+findToRight; i<file.text.length; i++) {
					char = file.text.charAt(i);
					console.log("findRight: i=" + i + " char=" + char + " lookFor=" + lookFor);
					if(char == lookFor && !(--toRepeat)) break;
					if(char == "\r" || char == "\n") return nil();
				}
				if(i == file.text.length-1) return nil();
				
				if(findRight) var index = i;
				if(findToRight) var index = i-1;
				return cursorMovement(function findRight() {
					file.moveCaretToIndex(index);
				});
			}
			else if(findLeft || findToLeft) {
				lastFind = str;
				if(file.caret.col==0) return nil();
				
				var lookFor = char;
				var char = "";
				var toRepeat = repeat;
				for (var i=caretIndex-1-findToLeft; i>-1; i--) {
					char = file.text.charAt(i);
					if(char == lookFor && !(--toRepeat)) break;
					else if(char == "\r" || char == "\n") return nil();
				}
				if(i < 0) return nil();
				
				if(findLeft) var index = i;
				if(findToLeft) var index = i+1;
				return cursorMovement(function findLeft() {
					file.moveCaretToIndex(index);
				});
			}
			/*
				## Search strings
			*/
			else if(char == "/") {
				// Find a string
				searchString = "/"
			}
			else if(char == "?") {
				// Find a string
				searchString = "?"
			}
			else if(char == "*") {
				// grab the word under the cursor and use it as the search string.
				// You can prepend a count: "3*" searches for the third occurrence of the word under the cursor.
			}
			else if(char == "#") {
				// grab the word under the cursor and use it as the search string.
				// But searches the opposit direction (left)
			}
			else if(char == "*" && lastChar == "g") {
				// grab the word under the cursor and use it as the search string.
				// match partial words
			}
			else if(char == "#" && lastChar == "g") {
				// grab the word under the cursor and use it as the search string in opposit direction.
				// match partial words
			}
			else if(searchString.length > 0) {
				searchString += char;
			}
			
				// Search while typing! (use regexp)
				// Arrow keys moves the caret in the input field
				// Use already existing find plugin !?
			
				// Searches left is starting with ? or right if starting with /
			
			else if(inSearchCommand && char == "n") {
				// Search next
				// ex: 3n = third match
				// Searches left is starting with ? or right if starting with /
			}
			else if(inSearchCommand && char == "N") {
				// Search next, but in opposit direction
				// ex: 3n = third match
				// Searches right is starting with ? or left if starting with /
			}
			/*
				### Search history
				If you know what a previously used pattern starts with, and you want to use it
				again, type that character before pressing <Up>.  With the previous example,
				you can type "/o<Up>" and Vim will put "/one" on the command line.
				
			*/
			
				// Use last search, like pressing up in bash
				// if there's already something in searchString, search the search history for a match
			
				// Moves the search history, like pressing down in bash
			
			
			/*
				## Operators
				
				Operators are followed by a motion ex: d2w (delete two words)
			*/
			else if(char == "d" && lastChar == "d") {
				console.log("Delete " + repeat * operatorRepeat + " whole line(s)");
				var rowsToBeDeleted = Math.min(repeat * operatorRepeat, file.grid.length - file.caret.row);
				var removedRows = [];
				for (var i=0; i<rowsToBeDeleted; i++) {
					removedRows.push(file.rowText(file.caret.row + i));
				}
				
				var rowBefore = file.caret.row;
				
				var caret = file.createCaret(file.caret.index, file.caret.col, file.caret.row);
				if(caret.row > 0) {
					file.moveCaretUp(caret);
					file.moveCaretToEndOfLine(caret);
				}
				else {
					file.moveCaretToStartOfLine(caret);
					//caretIndex = 0;
				}
				
				var indexEndOfLineBefore = caret.index;
				
				return cmd(function deleteLineUndo() {
					file.moveCaretToIndex(indexEndOfLineBefore);
					for (var i=0; i<rowsToBeDeleted; i++) {
						console.log("inserting on row=" + (rowBefore+i) + ": " + removedRows[i]);
						if(removedRows[i].length > 0) file.insertTextRow(removedRows[i], rowBefore+i);
						else file.insertLineBreak();
					}
					file.moveCaretToIndex(caretIndex);
				}, function deleteLineRedo() {
					file.moveCaretToIndex(caretIndex);
					for (var i=0; i<rowsToBeDeleted; i++) {
						if(file.grid.length > 1) file.removeRow(file.caret.row);
						else file.removeAllTextOnRow(0);
					}
					file.moveCaretToStartOfLine();
				});
			}
			else if(char == "d") {
				del = true;
				foundOperator();
				}
			else if(char == "J") {
				console.log("Delete " + (repeat-1) + " line breaks to join " + (repeat) + " rows");
				var lineBreaksToBeRemoved = Math.min(repeat > 1 ? repeat-1: 1, file.grid.length - file.caret.row);
				
				var lb = [];
				var caret = file.createCaret(file.caret.index, file.caret.col, file.caret.row);
				for (var i=0; i<lineBreaksToBeRemoved; i++) {
					file.moveCaretToEndOfLine(caret);
					lb.push({
						index: caret.index, 
						spaceBefore: (file.text.charAt(caret.index-1) == " "),
						spaceAfter: (file.text.charAt(caret.index+file.lineBreak.length) == " ")
					});
					file.moveCaretDown(caret);
				}
				
				return cmd(function joinRowsUndo() {
					file.moveCaretToIndex(caretIndex);
					for (var i=0; i<lineBreaksToBeRemoved; i++) {
						console.log("Inserting line break on index=" + lb[i].index);
						file.moveCaretToIndex(lb[i].index);
						if(!lb[i].spaceBefore && !lb[i].spaceAfter) file.deleteCharacter(); // Delete the added white space
						file.insertLineBreak();
					}
					file.moveCaretToIndex(caretIndex);
				}, function joinRowsRedo() {
					file.moveCaretToIndex(caretIndex);
					for (var i=0; i<lineBreaksToBeRemoved; i++) {
						file.moveCaretToEndOfLine();
						file.deleteCharacter(); // Delete the line break
						if(!lb[i].spaceBefore && !lb[i].spaceAfter) {
file.putCharacter(" "); // Insert white space between the merged lines
							file.moveCaretLeft();
						}
					}
				});
			}
			else if(char == "c") {
				if(lastChar == "c") {
					// Delete whole line and go into insert mode
				}
				else {
					change = true;
				}
			}
			else if( char == "x" || (char == "l" && lastChar == "d") ) {
				console.log("Delete " + repeat + " character(s) under the cursor");
				var charsToDelete = Math.min(repeat, file.grid[file.caret.row].length - file.caret.col);
				var removedText = file.text.slice(file.caret.index, file.caret.index + charsToDelete);
				return cmd(function deleteCharacterUndo() {
					file.moveCaretToIndex(caretIndex);
					file.insertText(removedText);
					file.moveCaretToIndex(caretIndex);
				}, function deleteCharacterRedo() {
					editFileRow(file, file.caret.row);
					file.moveCaretToIndex(caretIndex);
					file.deleteTextRange(caretIndex, caretIndex + charsToDelete - 1);
				});
			}
			else if( char == "X") {
				console.log("Vim: delete character left of the cursor");
				
			}
			else if( char == "D" || (char == "$" && lastChar == "d") ) {
				// delete to end of the line
				
			}
			else if( char == "D" || (char == "$" && lastChar == "d") ) {
				// delete to end of the line
				
			}
			else if( char == "C" || (char == "$" && lastChar == "c") ) {
				// change to end of the line
				
			}
			else if (char == "s" || (char == "l" && lastChar == "c") ) {
				// change one character
				
			}
			else if( char == "S" || (char == "c" && lastChar == "c") ) {
				// change a whole line (clears the text and goes into insert mode)
				
			}
			
			// # Movement
			
			/*
				## Word movement
				A word ends at a non-word character, such as a ".", "-" or ")".
			*/
			else if(char == "W") {
				// Word movement forward by WORD
				// A WORD ends strictly with a white-space. This may not be a word in normal sense, hence the uppercase.
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var char = "";
				while(toRepeat--) {
					var afterWhiteSpace = false;
					var lastChar = file.text.charAt(index);
					while(index<file.text.length) {
						index++;
						char = file.text.charAt(index);
						
						// Stop if we got onto a new line. And it's empty or starts with a non-white-space
						if( lastChar == lastLbChar && (char == firstLbChar || char.match(/\S/)) ) break;
						else if( char.match(/\s/) ) afterWhiteSpace = true;
						else if(afterWhiteSpace) break; // Stop at antything if it's after white-space
						
						lastChar = char;
					}
				}
				
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function WORD_forward() {
					file.moveCaretToIndex(index);
				});
				
			}
			else if(char == "w") {
				// Word movement forward by word
				// A word ends at a non-word character, such as a ".", "-" or ")".
				
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var char = "";
				while(toRepeat--) {
					var lastChar = file.text.charAt(index);
					while(index<file.text.length) {
						index++;
						char = file.text.charAt(index);
						
						// Stop on a word if last char was a white space
						//if( char.match(/\w/) && lastChar.match(/\s/) ) break;
						
						// Stop on a word if last char was a non-word
						if( char.match(/\w/) && lastChar.match(/\W/) ) break;
						
						// Stop if on a non-word-that-is-not-a-white-space if last char was a word or white-space
						if( char.match(nwww) && lastChar.match(/\w|\s/) ) break;
						
						// Stop if we got onto a new line. And it's empty or starts with a non-white-space
						if( lastChar == lastLbChar && (char == firstLbChar || char.match(/\S/)) ) break;
						
						lastChar = char;
					}
				}
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function wordForward() {
					file.moveCaretToIndex(index);
				});
			}
			else if(char == "B") {
				// WORD movement backwards (a WORD is anything separated by white-space)
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var leftChar = "";
				while(toRepeat--) {
					var char = file.text.charAt(index-1);
					while(index>0) {
						index--;
						
						leftChar = file.text.charAt(index-1);
						
						// Stop if before a white space and on a non-white-space
						if( leftChar.match(/\s/) && char.match(/\S/) ) break;
						
						// Stop if before line-break. And on an empty line or the line starts with a non-white-space
						if(leftChar == lastLbChar && (char == firstLbChar || char.match(/\S/)) ) break;
						
						char = leftChar;
					}
				}
				
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" + 
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				
				return cursorMovement(function backwardsByWORD() {
					file.moveCaretToIndex(index);
				});
				
			}
			else if(char == "b" && lastChar == "z") {
				// puts the cursor line at at the bottom.
				return scroll(undefined, file.caret.row - EDITOR.view.visibleRows + 1);
			}
			else if(char == "b") {
				// word movement backwards (stop at start of word)
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var leftChar = "";
				while(toRepeat--) {
					var char = file.text.charAt(index-1);
					while(index>0) {
						index--;
						
						leftChar = file.text.charAt(index-1);
						
						// Stop on a word if left char is a white-space
						if( char.match(/\w/) && leftChar.match(/\s/) ) break;
						
						// Stop on a non-word-that-is-not-a-white-space if left char is a white space
						if( char.match(nwww) && leftChar.match(/\s/) ) break;
						
						// Stop on a word if left char is a non-word
						if( char.match(/\w/) && leftChar.match(/\W/) ) break;
						
						// Stop on a non-word-that-is-not-a-white-space if left char is a word
						if( char.match(nwww) && leftChar.match(/\w/) ) break;
						
						// Stop on empty lines
						if( char == firstLbChar && leftChar == lastLbChar ) break;
						
						char = leftChar;
					}
				}
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function backwardsByWord() {
					file.moveCaretToIndex(index);
				});
			}
			
			else if(char == "E" && lastChar == "g") {
				// Moves to the previous end of a WORD
				// Stop at empty lines!
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var leftChar = "";
				while(toRepeat--) {
					var char = file.text.charAt(index-1);
					var rightChar =  file.text.charAt(index);
					while(index>0) {
						index--;
						leftChar = file.text.charAt(index-1);
						
						// Stop on any non-white-space if right char is a white-space
						if( char.match(/\S/) && rightChar.match(/\s/) ) break;
						
						// Stop on empty lines
						if(char == firstLbChar && leftChar == lastLbChar) break;
						
						rightChar = char;
						char = leftChar;
					}
				}
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function endOfWORD_backwards() {
					file.moveCaretToIndex(index);
				});
			}
			
			else if(char == "e" && lastChar == "g") {
				// Moves to the previous end of a word
				// Stop at empty lines!
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var leftChar = "";
				while(toRepeat--) {
					var char = file.text.charAt(index-1);
					var rightChar =  file.text.charAt(index);
					while(index>0) {
						index--;
						leftChar = file.text.charAt(index-1);
						
						// Stop on any non-white-space if right char is a white-space
						if( char.match(/\S/) && rightChar.match(/\s/) ) break;
						
						// Stop on any non-character-that-is-not-a-white-space if right char is a word
						if( char.match(nwww) && rightChar.match(/\w/) ) break;
						
						// Stop on any word if right char is not a word
						if( char.match(/\w/) && rightChar.match(/\W/) ) break;
						
						// Stop on empty lines
						if(char == firstLbChar && leftChar == lastLbChar) break;
						
						
						rightChar = char;
						char = leftChar;
					}
				}
				
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function endOfWordBackwards() {
					file.moveCaretToIndex(index);
				});
			}
			
			else if(char == "E") {
				// Moves to the next end of a WORD (separated by space)
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var nextChar = "";
				while(toRepeat--) {
					var char = file.text.charAt(index+1);
					while(index<file.text.length) {
						index++;
						
						nextChar = file.text.charAt(index+1);
						
						// Stop on a non-white-space if next char is a white space
						if( char.match(/\S/) && nextChar.match(/\s/) ) break;
						
						// Don't stop on empty lines!
						
						char = nextChar;
					}
				}
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function endOfWORDForward() {
					file.moveCaretToIndex(index);
				});
			}
			else if(char == "e") {
				// Move forward to the last end of word
				var index = caretIndex;
				var toRepeat = repeat * operatorRepeat;
				var nextChar = "";
				while(toRepeat--) {
					var char = file.text.charAt(index+1);
					while(index<file.text.length) {
						index++;
						
						nextChar = file.text.charAt(index+1);
						
						// Stop on a non-white-space if next char is a white space
						if( char.match(/\S/) && nextChar.match(/\s/) ) break;
						
						// Stop on a word if next char is a non-word
						if( char.match(/\w/) && nextChar.match(/\W/) ) break;
						
						// Don't stop on empty lines!
						
						char = nextChar;
					}
				}
				// Sanity check so we are not between line-break characters
				if(lineBreak.length > 1 && file.text[index] == lastLbChar) {
					throw new Error( "Character position " + index + " is between two line-break characters!\n" +
					" i" + (index-1) + "=" + UTIL.lbChars(file.text[index-1]) + "\n" +
					" i" + (index) + "=" + UTIL.lbChars(file.text[index]) + "\n" +
					" i" + (index+1) + "=" + UTIL.lbChars(file.text[index+1]) );
				}
				return cursorMovement(function endOfWordForward() {
					file.moveCaretToIndex(index);
				});
			}
			
			/*
				## Moving to the start or end of a line
				
				"1$" moves you to the end of the first line (the one you're on), 
				"2$" to the end of the next line, and so on.
				
				The "0" command doesn't take a count argument, because the "0" would be
				part of the count.  Unexpectedly, using a count with "^" doesn't have any
				effect.
			*/ 
			else if(char == "$") {
				// moves the cursor to the end of a line
				var toRepeat = repeat * operatorRepeat;
				var caret = file.createCaret(file.caret.index, file.caret.col, file.caret.row);
				while(--toRepeat) file.moveCaretDown(caret);
				
				var gridRow = file.grid[caret.row]
				if(gridRow.length == 0) var lastCharIndex = caretIndex;
				else var lastCharIndex = gridRow[gridRow.length-1].index;
				
				return cursorMovement(function endOfWordForward() {
					file.moveCaretToIndex(lastCharIndex);
				});
				
			}
			else if(char == "^") {
				// moves to the first non-blank character of the line
				var gridRow = file.grid[file.caret.row]
				if(gridRow.length == 0) {
var lastCharIndex = caretIndex;
					var index = file.caret.index;
				}
				else {
var lastCharIndex = gridRow[gridRow.length-1].index;
					var index = gridRow.startIndex;
				}
				
				while(index < lastCharIndex) {
					if(file.text.charAt(index).match(/\S/)) break;
					index++;
				}
				
				return cursorMovement(function endOfWordForward() {
					file.moveCaretToIndex(index);
				});
			}
			
			/*
				## Moving to a character
			*/
			else if(char == "F") {
				findLeft = true;
			}
			else if(char == "f") {
				findRight = true;
			}
			
			else if(char == "%" && nr) {
				// Goto percentage of file
				var percentage = parseInt(nr) / 100;
				var row = Math.floor(percentage * file.grid.length);
				if(row > file.grid.length-1) row = file.grid.length-1;
				if(row < 0) row = 0;
				var index = file.grid[row].startIndex;
				
				return cursorMovement(function gotoPercentage() {
					file.moveCaretToIndex(index);
				});
			}
			/*
				## Matching a parenthesis
				
				If the cursor is on a "(" it will move to the matching ")".  
				If it's on a ")" it will move to the matching "(".
				This also works for [] and {} pairs.
				
				When the cursor is not on a useful character, "%" will search forward to find
				one.  Thus if the cursor is at the start of the line of the previous example,
				"%" will search forward and find the first "(".  Then it moves to its match:
				
				if (a == (b * c) / d)
				---+---------------->
				%
			*/
			else if(char == "%") {
				if(nr == "") {
					//  moves to the matching parenthesis
					if(file.text.length <= 1) return nil(); // Don't match if the file has no or only one character
					
					var index = caretIndex < file.text.length ? caretIndex : caretIndex-1;
					var charOn = file.text[index];
					var bracketReg = /[{([\])}]/;
					var direction = 0;
					console.log("matchingBracket: index=" + index + " charOn=" + charOn + " match: ", charOn.match(bracketReg));
					
					if(charOn.match(bracketReg) == null) {
						
						// Seek to a bracket (both left and right)
						var indexLeft = caretIndex-1;
						var indexRight = caretIndex+1;
						while(indexLeft > 0 || indexRight < file.text.length-1) {
							console.log("matchingBracket: indexLeft=" + indexLeft + " (" + file.text[indexLeft] + ") indexRight=" + indexRight + " (" + file.text[indexRight] + ") file.text.length=" + file.text.length + " ");
							if(file.text[indexLeft]) {
								if(file.text[indexLeft].match(bracketReg) ) {
								index = indexLeft;
									break;
							}
								indexLeft--;
							}
							
							if(file.text[indexRight]) {
								if( file.text[indexRight].match(bracketReg) ) {
								index = indexRight;
									break;
							}
								indexRight++;
							}
						}
						if(indexLeft <= 0 && indexRight >= file.text.length) return nil(); // Found no brackets
					}
					
					
					charOn = file.text[index];
					console.log("matchingBracket: charOn=" + charOn + " index=" + index);
					var lookFor
					
					if(     charOn == "(") { lookFor = ")"; direction=1;}
					else if(charOn == ")") { lookFor = "("; direction=-1;}
					else if(charOn == "[") { lookFor = "]"; direction=1;}
					else if(charOn == "]") { lookFor = "["; direction=-1;}
					else if(charOn == "{") { lookFor = "}"; direction=1;}
					else if(charOn == "}") { lookFor = "{"; direction=-1;}
					
					if(direction == 0) throw new Error("direction=" + direction + " charOn=" + charOn + " index=" + index);
					
					var openBrackets = 1;
					console.log("matchingBracket: direction=" + direction);
					// todo: Don't match inside strings unless the caret is insade that string then only match in that string !?
					for (var i=index+direction; i<file.text.length && i>0; i+=direction) {
						console.log("matchingBracket: direction=" + direction + " i=" + i + " openBrackets=" + openBrackets + " file.text.length=" + file.text.length);
						if(file.text[i] == lookFor && !(--openBrackets)) break;
						else if(file.text[i] == charOn) openBrackets++;
					}
					if(i == -1 || i == file.text.length) return nil(); // Found no matching bracket
					
					return cursorMovement(function findMatchingBracket() {
						file.moveCaretToIndex(i);
					});
					
				}
				else {
					// moves to xx% of the file
					// example "50%" moves you to halfway the file.  "90%" goes to near the end.
					
				}
			}
			
			/*
				## Moving to a specific line
				With no argument, "G" positions you at the end of the file.
			*/
			else if(char == "G" && nr) {
				// Goto line n
				var line = parseInt(nr);
				if(line > file.grid.length-1) line = file.grid.length-1;
				var index = file.grid[line-1].startIndex;
				
				return cursorMovement(function gotoLine() {
					file.moveCaretToIndex(index);
				});
			}
			else if(char == "G") {
				// Goto last line
				if(file.grid.length <= 1) return nil();
				
				var lastRow = file.grid[file.grid.length-1];
				var index = lastRow.startIndex;
				
				return cursorMovement(function gotoLastLine() {
					file.moveCaretToIndex(index);
				});
			}
			
			else if(char == "g" && lastChar == "g") {
				// go to the start of a file
				var index = 0;
				return cursorMovement(function gotoStart() {
					file.moveCaretToIndex(index);
				});
			}
			else if(char == "H") {
				// Moves to (home) top of screen
				var firstRow = file.startRow;
				var index = file.grid[firstRow].startIndex;
				
				return cursorMovement(function gotoHome() {
					file.moveCaretToIndex(index);
				});
			}
			else if(char == "M") {
				// Moves to middle of screen
				var firstRow = file.startRow;
				var lastRow = Math.min(file.startRow + EDITOR.view.visibleRows - 1, file.grid.length-1);
				var middleRow = Math.round(firstRow + (lastRow - firstRow) / 2); // Vim: Line H25, M38, L50
				var index = file.grid[middleRow].startIndex;
				
				return cursorMovement(function gotoMiddle() {
					file.moveCaretToIndex(index);
				});
			}
			else if(char == "L") {
				// Moves to last line of screen
				var lastRow = Math.min(file.startRow + EDITOR.view.visibleRows - 1, file.grid.length-1);
				console.log("lastRow=" + lastRow + " file.grid.length=" + file.grid.length + " file.startRow=" + file.startRow + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
				var index = file.grid[lastRow].startIndex;
				
				return cursorMovement(function gotoLast() {
					file.moveCaretToIndex(index);
				});
			}
			
			/*
				## Moving the cursor
			*/
			else if(char == "j") {
				// Move cursor down one line
				return cursorMovement(function moveCursorDown() {
					var colBefore = file.caret.col;
					for (var i=0; i<repeat; i++) {
						file.moveCaretDown();
					}
					var rowLength = file.grid[file.caret.row].length;
					noEol(file);
					
					if(file.caret.col < lastCol && rowLength > file.caret.col) {
						file.moveCaretRight( file.caret, Math.min(lastCol-file.caret.col, rowLength-file.caret.col-1) );
					}
					else if(file.caret.col < colBefore) {
						lastCol = colBefore;
					}
					if(rowLength > 0 && file.caret.eol) throw new Error("We should not place the caret at eol! file.caret=", file.caret);
					
				});
			}
			else if(char == "k") {
				// Move cursor up one line
				return cursorMovement(function moveCursorUp() {
					var colBefore = file.caret.col;
					for (var i=0; i<repeat; i++) {
						file.moveCaretUp();
					}
					var rowLength = file.grid[file.caret.row].length;
					noEol(file);
					
					if(file.caret.col < lastCol && rowLength > file.caret.col) {
						file.moveCaretRight( file.caret, Math.min(lastCol-file.caret.col, rowLength-file.caret.col-1) );
					}
					else if(file.caret.col < colBefore) {
						lastCol = colBefore;
					}
					if(rowLength > 0 && file.caret.eol) throw new Error("We should not place the caret at eol! file.caret=", JSON.stringify(file.caret));
					
				});
			}
			else if(char == "h") {
				// Move cursor left n steps
				var moveLeft =  Math.min(file.caret.col, repeat * operatorRepeat);
				if(file.caret.col <= 0) return nil();
				// Simulate move
				var caret = file.createCaret(file.caret.index, file.caret.col, file.caret.row);
				file.moveCaretLeft(caret, moveLeft);
				var caretIndex = caret.index;
				if(del || change) {
					var removedText = file.text.slice(file.caret.index, file.caret.index + moveLeft);
					//var removedText = file.deleteTextRange(file.caret.index, file.caret.index + moveLeft - 1);
					return cmd(function deleteTextLeftUndo() {
						file.moveCaretToIndex(caretIndex);
						file.insertText(removedText);
						//file.moveCaretRight(file.caret, moveLeft);
					}, function deleteTextLeftRedo() {
						file.moveCaretToIndex(caretIndex);
						file.deleteTextRange(caretIndex, caretIndex + moveLeft - 1);
						//file.moveCaretRight(file.caret, moveLeft);
					}, change);
				}
				else {
					return cursorMovement(function moveCursorLeft() {
						file.moveCaretLeft(file.caret, moveLeft);
					});
				}
			}
			else if(char == "l") {
				console.log("Move cursor right " + repeat + " steps: file.grid[file.caret.row].length=" + file.grid[file.caret.row].length + " file.caret.col=" + file.caret.col);
				if(file.caret.col < file.grid[file.caret.row].length) {
					return cursorMovement(function moveCursorRight() {
						file.moveCaretRight(file.caret, Math.min(file.grid[file.caret.row].length - file.caret.col - 1, repeat));
						if(file.caret.eol) throw new Error("We should not move the caret to end-of-line! file.caret=" + JSON.stringify(file.caret));
					});
				}
				else return nil();
			}
			
			// ## Misc
			else if(char == "z" && lastChar == "z") {
				// Center the line that cursors at, scroll so the line with the cursors is in the center
				return scroll(undefined, Math.round(file.caret.row - EDITOR.view.visibleRows/2));
			}
			else if(char == "t" && lastChar == "z") {
				// puts the cursor line at the top
				
				return scroll(undefined, file.caret.row);
				
			}
			else if(char == "T") {
				findToLeft = true;
			}
			else if(char == "t") {
				findToRight = true;
			}
			else if(char == "o") {
				// Adds a new line and goes into insert mode
				var caretIndex = file.caret.index;
				var row = file.caret.row + 1;
				return cmd(function addLineUndo() {
					//file.removeRow(row);
					file.moveCaretToIndex(caretIndex);
					file.moveCaretToEndOfLine();
					file.deleteCharacter();
					file.moveCaretToIndex(caretIndex);
				}, function addLineRedo() {
					file.moveCaretToEndOfLine();
					file.insertLineBreak();
				}, true, repeat);
			}
			
			else if(char == "r") {
				replace = true;
			}
			
			/*
				## Marks
				When you make a jump to a position with the "G" command, Vim remembers the
				position from before this jump.  This position is called a mark.
				
				If you use the same command a second time you will jump back again.  That's
				because the ` command is a jump itself, and the position from before this jump
				is remembered.
				
				Generally, every time you do a command that can move the cursor further than
				within the same line, this is called a jump.  This includes the search
				commands "/" and "n" (it doesn't matter how far away the match is).  But not
				the character searches with "fx" and "tx" or the word movements "w" and "e".
				Also, "j" and "k" are not considered to be a jump.  Even when you use a
				count to make them move the cursor quite a long way away.
				
				The command "ma" marks the place under the cursor as mark a.
				You can place 26 marks (a through z)
				
			*/
			else if(char == "`" && lastChar == "`") {
				// Go back to last mark/position
			}
			else if(char == "'" && lastChar == "'") {
				// Go back to where you where
			}
			else if(char == "a" && lastChar == "m") {
				// marks the place under the cursor as a
			}
			else if(char == "a" && lastChar == "`") {
				// Goes to mark a (moves caret to row,col)
			}
			else if(char == "a" && lastChar == "'") {
				// Goes to mark a, but moves you to the beginning of the line containing the mark.
			}
			else if(char == "a") {
				console.log("Append text after the cursor " + repeat + " times")
				return toInsert(function moveCursorToEol() {
					if(!file.caret.eol) file.moveCaretRight(file.caret);
				}, repeat);
			}
			else if(char == "[" && lastChar == "`") {
				// Goes to the start (of word) of last change
			}
			else if(char == "]" && lastChar == "`") {
				// Goes to the end of last change
			}
			else if( (char == "[" || char == "[") && lastChar == "'") {
				// Goes to the beginning of line of last change
			}
			
			else if(char == "i" && del || change) {
				/*
					Deletes or changes inside something.
					Ex: ci" delets all text inside "here" (seeks to closest " or if inbetween) and goes to insert mode
				*/
				var startIndex = file.text.lastIndexOf(char, file.caret.index);
				var EndIndex = file.text.indexOf(char, file.caret.index);
				var lineStart = file.grid[file.caret.row].startIndex;
				var lineEnd = lineStart + file.grid[file.caret.row].length;
				var caretIndex = file.caret.index;
				if(startIndex < lineStart) return nil();
				else if(EndIndex > lineEnd) return nil();
				else {
					var removedText = file.text.slice(startIndex, EndIndex);
					return cmd(function changeInUndo() {
						file.moveCaretToIndex(startIndex);
						file.insertText(removedText);
						file.moveCaretToIndex(caretIndex);
					}, function changeInRedo() {
						file.deleteTextRange(startIndex, EndIndex);
						file.moveCaretToIndex(startIndex);
					}, true);
				}
			}
			else if(char == "i") {
				// Goes to insert mode
				return toInsert(undefined, repeat);
			}
			else if(char == "U") {
				var row = history[file.path].lastEditedRow
				console.log("Undo edit on last edited row=" + row);
				if(row == -1) return nil();
				var oldContent = history[file.path].rowContentBeforeEdit;
				var currentContent = file.rowText(row);
				
				return cmd(function undoLineUndo() {
					file.removeAllTextOnRow(row);
					file.insertTextOnRow(currentContent, row);
					file.moveCaretToIndex(caretIndex);
				}, function undoLineRedo() {
					history[file.path].rowContentBeforeEdit = currentContent;
					file.removeAllTextOnRow(row);
					file.insertTextOnRow(oldContent, row);
				});
			}
			else if(char == "Z" && lastChar == "Z") {
				// Save the file and close it
				return cmd(function saveAndCloseUndo() {
					// Reopen the file again !?
				}, function saveAndClose() {
					EDITOR.saveFile(file, file.path, function fileSaved(err, path) {
						if(err) return alertBox("Unable to save file! " + err.message);
						else EDITOR.closeFile(path);
					});
				});
			}
			else {
				console.log("Did not match any known commands: vimCommandBuffer=" + vimCommandBuffer);
			}
			
		}
		
		function foundOperator() {
			if(repeat > 1) {
				operatorRepeat = repeat;
				repeat = 1;
				nr = "";
			}
		}
		
		/*
			When a command have been found, call either cmd(), toInsert() or nil()
		*/
		
		function cmd(undo, redo, toInsert, repeat) {
			if(typeof undo != "function") throw new Error("cmd() must be called with a undo function!");
			if(typeof redo != "function") throw new Error("cmd() must be called with a redo function!");
			
			var command = {
				undo: undo,
				redo: redo,
				toInsert: !!toInsert,
				repeat: repeat || 1
			}
			
			if(toInsert && i < str.length-1) {
				var text = str.slice(i+1);
				command.insert = text;
			}
			
			return command;
		}
		
		function toInsert(moveCursor, repeat) {
			/*
				Switch to insert mode
				insert remaining characters (str) if any
			*/
			
			if(moveCursor && typeof moveCursor != "function") throw new Error("First argument should be a move function that moves the cursors, or undefined");
			if(repeat && typeof repeat != "number") throw new Error("Seceond parameter should be how many times the insert should be repeated");
			
			if(repeat == undefined) repeat = 1;
			
			console.log("str=" + str + " i=" + i);
			if(i < str.length-1) {
				var text = str.slice(i+1);
			}
			
			var action = {toInsert: true, insert: text, repeat: repeat};
			
			if(moveCursor) action.moveCursor = moveCursor;
			
			return action;
			}
		
		function scroll(x, y) {
			var action = {scroll: {x: x, y: y}};
			return action;
		}
		
		function nil() {
			// A command was found, but it did nothing
			console.warn("Command does nothing: " + str);
			return null;
		}
		
		function cursorMovement(move, toInsert) {
			if(typeof move != "function") throw new Error("First argument to cursorMovement needs to be a function that moves the cursor/caret");
			return {moveCursor: move, toInsert: !!toInsert};
		}
		
	}
	
	function editFileRow(file, row) {
		if(history[file.path].lastEditedRow != row) {
			history[file.path].lastEditedRow = row;
			history[file.path].rowContentBeforeEdit = file.rowText(row);
		}
	}
	
	function beep(volume, frequency, type, duration) {
		
		// What I imagine the beep sound like
		if(volume == undefined) volume = 0.15;
		if(frequency == undefined) frequency = 100;
		if(type == undefined) type = "square";
		if(duration == undefined) duration = 120;
		
		var audio = window.AudioContext || window.webkitAudioContext
		var audioCtx = new audio;
		var oscillator = audioCtx.createOscillator();
		var gainNode = audioCtx.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(audioCtx.destination);
		
		gainNode.gain.value = volume;
		oscillator.frequency.value = frequency;
		oscillator.type = type;
		
		oscillator.start();
		oscillator.stop(audioCtx.currentTime + duration/1000)
		
		//setTimeout(function() {oscillator.stop();},duration);
		
	}
	
	function clearCommandBuffer() {
		console.log("vim:clearCommandBuffer: vimCommandBuffer=" + vimCommandBuffer + " messageToShow=" + messageToShow + " commandCaretPosition=" + commandCaretPosition + " EDITOR.mode=" + EDITOR.mode);
		
		if(vimCommandBuffer == "" && commandCaretPosition == 0 && messageToShow == "") {
			return false; // We did nothing
		}
		else {
			
			if(vimCommandBuffer.charAt(0) == ":") addCommandHistory(vimCommandBuffer);
			
			vimCommandBuffer = "";
			commandCaretPosition = 0;
			messageToShow = "";
			EDITOR.renderNeeded();
			
			console.log("Cleared command buffer!");
			
			return true; // We did something
		}
	}
	
	function getNormalMap(char) {
		// Returns the default vim key-map
		// Useful to let users remap they keys
		var key = normalMap[char];
		if(key == undefined) return char;
		else return key;
	}
	
	function nmap(str, oldStr) {
		// Allow recursive mapping
		if(normalMap[oldStr] == undefined) normalMap[oldStr] = oldStr;
		normalMap[str] = normalMap[oldStr];
	}
	
	function nnoremap(str, originalStr) {
		if(originalNormalMap[originalStr] == undefined) originalNormalMap[originalStr] = originalStr;
		normalMap[str] = originalNormalMap[originalStr];
	}
	
	function toggleVim() {
		if(VIM_ACTIVE) {
			VIM_ACTIVE = false;
			EDITOR.setMode("default");
			EDITOR.updateMenuItem(vimMenuItem, false);
		}
		else {
			VIM_ACTIVE = true;
			EDITOR.setMode("vimNormal");
			EDITOR.updateMenuItem(vimMenuItem, true);
			if(EDITOR.currentFile && !history.hasOwnProperty(EDITOR.currentFile)) startHistory(EDITOR.currentFile);
			noEol();
		}
		EDITOR.hideMenu();
		return false;
	}
	
	function showCursorPosition(file) {
		if(file == undefined && EDITOR.currentFile == undefined) return;
		else if(file == undefined) file = EDITOR.currentFile;
		
		if(option.ruler) {
			// Show actual position line,column
			var row = file.caret.row+1;
			var col = file.caret.col + file.grid[row].indentationCharacters.length + 1;
			var str = row + "," + col;
		}
		else {
			// Show editors caret position
		var str = "index=" + file.caret.index + " row=" + (file.caret.row) + " col=" + (file.caret.col);
		if(file.caret.eol) str += " EOL";
		if(file.caret.eof) str += " EOF";
		}
		
		showMessage(str);
	}
	
	function showMessage(msg) {
		console.log("Vim:showMessage:", msg);
		if(msg == undefined) msg = "";
		if(typeof msg != "string") msg = JSON.stringify(msg);
		messageToShow = msg;
		EDITOR.renderNeeded();
		
		return false; // So you can return to this in functions that needs to return a Boolean
	}
	
	function showCommandBuffer(ctx) {
		if(EDITOR.mode != "vimNormal" && EDITOR.mode != "vimInsert") return;
		
		var text = messageToShow || vimCommandBuffer;
		
		console.log("vim:showCommandBuffer: text=" + text);
		
		if(text.length == 0) return;
		
		var top = EDITOR.view.canvasHeight - EDITOR.settings.gridHeight - EDITOR.settings.bottomMargin
		var measuredText = ctx.measureText(text)
		var textWidth = measuredText.width;
		var textHeight = measuredText.height || EDITOR.settings.gridHeight;
		var left = EDITOR.view.canvasWidth - textWidth - EDITOR.settings.rightMargin;
		
		//console.log("measuredText=", measuredText);
		
		// Transparent padding / text fade out before cut
		ctx.fillStyle = UTIL.makeColorTransparent(EDITOR.settings.style.bgColor, 70);
		ctx.fillRect(left-40, top-16, 24, textHeight+64);
		
		// Background for the text
		ctx.fillStyle = EDITOR.settings.style.bgColor;
		ctx.fillRect(left-16, top-16, textWidth+64, textHeight+64);
		
		// Print the text
		ctx.fillStyle = EDITOR.settings.style.textColor;
		ctx.fillText(text, left, top);
		
		// Don't show the caret if it's at the end of the buffer
		if(vimCommandBuffer.length == commandCaretPosition) return;
		
		var textToCaret = ctx.measureText(text.slice(0, commandCaretPosition)).width;
		
		ctx.fillStyle = EDITOR.settings.caret.color;
		
		ctx.fillRect(left + textToCaret + 1, top, EDITOR.settings.caret.width, textHeight);
		
	}
	
	
	// TEST-CODE-START
	
	// todo: Test with both CRLF and LF (\r\n and \n) !
	
	function vimTest1(callback) {
		EDITOR.openFile("vimTest1.txt", "\n", function(err, file) {
			var vimWasActive = VIM_ACTIVE;
			if(!vimWasActive) toggleVim();
			
			// Get out from any mode
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("keydown", {charCode: ESC});
			
			// Make sure undo/redo history works with only one item in the history
			
			console.log("Test: inserting 123")
			EDITOR.mock("typing", "i123");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo insert 123");
			EDITOR.mock("typing", "u"); // Undo insert
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo insert 123");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo when there is no more to redo (should do nothing)");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Should do nothing
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo insert 123 (again)");
			EDITOR.mock("typing", "u"); // Undo insert (again)
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo when there is no more to undo (should do nothing)");
			EDITOR.mock("typing", "u"); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo insert 123");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			
			// Test if we can travel the history
			console.log("Test: appending 456");
			EDITOR.mock("typing", "a456");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123456\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: undoing append 456");
			EDITOR.mock("typing", "u"); // Undo insert 456
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: undoing insert 123");
			EDITOR.mock("typing", "u"); // Undo insert 123
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: For a second time - undo when there is no more to undo (should do nothing)");
			EDITOR.mock("typing", "u"); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo insert 123");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 123
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo append 456");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 456
			if(file.text != "123456\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: For a second time - redo when there is no more to redo (should do nothing)");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Should do nothing
			if(file.text != "123456\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo append 456");
			EDITOR.mock("typing", "u"); // Remove 456
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo append 456");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 456
			if(file.text != "123456\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			
			// Test if the history can branch
			console.log("Test: Undo append 456");
			EDITOR.mock("typing", "u"); // Undo insert 456
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Append def to branch the history");
			EDITOR.mock("typing", "adef"); // Branch the history by appending def
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123def\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo append 456");
			EDITOR.mock("typing", "u"); // Undo insert def
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo insert 123");
			EDITOR.mock("typing", "u"); // Undo insert 123
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo insert 123");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 123
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo append 456");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert def (this is what vim does! confirmed!)
			// Note: It should now pick the def branch (test shouldbe 123def and not 123456)
			if(file.text != "123def\n") {
				console.log(history[file.path]);
				throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			}
			
			// Test if we can travel the history after branching
			console.log("Test: append ghi");
			EDITOR.mock("typing", "aghi");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123defghi\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo append ghi");
			EDITOR.mock("typing", "u"); // Undo insert ghi
			if(file.text != "123def\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo append ghi");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert ghi
			if(file.text != "123defghi\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Append jkl");
			EDITOR.mock("typing", "ijkl");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123defghijkl\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo append jkl");
			EDITOR.mock("typing", "u"); // Undo insert jkl
			if(file.text != "123defghi\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Undo append ghi");
			EDITOR.mock("typing", "u"); // Undo insert ghi
			if(file.text != "123def\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo append ghi");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert ghi
			if(file.text != "123defghi\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			console.log("Test: Redo append jkl");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert jkl
			if(file.text != "123defghijkl\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			
			// Moving the caret inside a line command
			EDITOR.mock("typing", ":foo");
			if(vimCommandBuffer != ":foo") throw new Error("vimCommandBuffer=" + vimCommandBuffer);
			if(commandCaretPosition != vimCommandBuffer.length) throw new Error("vimCommandBuffer=" + vimCommandBuffer + " (" + vimCommandBuffer.length + " characters) commandCaretPosition=" + commandCaretPosition);
			
			EDITOR.mock("keydown", {charCode: LEFT});
			if(commandCaretPosition != vimCommandBuffer.length-1) throw new Error("vimCommandBuffer=" + vimCommandBuffer + " (" + vimCommandBuffer.length + " characters) commandCaretPosition=" + commandCaretPosition + ". Expected arrow left to move the caret left!");
			
			EDITOR.mock("keydown", {charCode: LEFT});
			if(commandCaretPosition != vimCommandBuffer.length-2) throw new Error("vimCommandBuffer=" + vimCommandBuffer + " (" + vimCommandBuffer.length + " characters) commandCaretPosition=" + commandCaretPosition + ". Expected two arrow left to move the caret left two steps!");
			
			EDITOR.mock("keydown", {charCode: RIGHT});
			if(commandCaretPosition != vimCommandBuffer.length-1) throw new Error("vimCommandBuffer=" + vimCommandBuffer + " (" + vimCommandBuffer.length + " characters) commandCaretPosition=" + commandCaretPosition + ". Expected two arrow right to move the caret right!");
			
			EDITOR.mock("keydown", {charCode: ESC});
			if(vimCommandBuffer != "") throw new Error("Expected reset when pressing Esc: vimCommandBuffer=" + vimCommandBuffer);
			if(commandCaretPosition != 0) throw new Error("Expected reset when pressing Esc: vimCommandBuffer=" + vimCommandBuffer + " commandCaretPosition=" + commandCaretPosition);
			
			
			// Moving up/down the line command history
			EDITOR.mock("keydown", ":");
			EDITOR.mock("keydown", {charCode: UP});
			if(vimCommandBuffer != ":foo") throw new Error("Expected key up to toggle command history! vimCommandBuffer=" + vimCommandBuffer + " commandHistory.length=" + commandHistory.length);
			
			EDITOR.mock("keydown", {charCode: ESC});
			
			
			EDITOR.mock("typing", ":set noshowmode\n");
			EDITOR.mock("typing", ":set showmode?\n");
			if(messageToShow != "noshowmode") throw new Error("Expected :set showmode? to show noshowmode because it's turned off");
			EDITOR.mock("typing", ":set showmode\n");
			
			
			// Editing the command buffer
			EDITOR.mock("typing", ":abcd");
			EDITOR.mock("keydown", {charCode: LEFT});
			EDITOR.mock("keydown", {charCode: LEFT});
			EDITOR.mock("keydown", {charCode: LEFT});
			EDITOR.mock("keydown", {charCode: DELETE}); // Delete b
			if(vimCommandBuffer != ":acd") throw new Error("Unexpected vimCommandBuffer=" + vimCommandBuffer);
			EDITOR.mock("typing", "b");
			if(vimCommandBuffer != ":abcd") throw new Error("Unexpected vimCommandBuffer=" + vimCommandBuffer);
			EDITOR.mock("typing", "123");
			if(vimCommandBuffer != ":ab123cd") throw new Error("Unexpected vimCommandBuffer=" + vimCommandBuffer);
			EDITOR.mock("keydown", {charCode: BACKSPACE});
			EDITOR.mock("keydown", {charCode: BACKSPACE});
			EDITOR.mock("keydown", {charCode: BACKSPACE});
			if(vimCommandBuffer != ":abcd") throw new Error("Unexpected vimCommandBuffer=" + vimCommandBuffer);
			EDITOR.mock("keydown", {charCode: ESC});
			
			
			if(!vimWasActive) toggleVim(); // Turn Vim/modal off again
			if(typeof callback == "function") callback(true);
			else {
				EDITOR.mock("typing", "dd");
				EDITOR.mock("typing", "aTest1 passed!");
				EDITOR.mock("keydown", {charCode: ESC});
			}
			
		});
		if(typeof callback != "function") return false;
	}
	
	function vimTest2(callback) {
		EDITOR.openFile("vimTest2.txt", "\n", function(err, file) {
			var vimWasActive = VIM_ACTIVE;
			if(!vimWasActive) toggleVim();
			
			// Get out from any mode
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("keydown", {charCode: ESC});
			
			/*
				
				Following the guide at: http://vimhelp.appspot.com/
				
			*/
			
			
			if(file.text != "\n") throw new Error("Unexpected text: " + file.text);
			if(file.caret.row != 0) throw new Error("Unexpected file.caret.row=" + file.caret.row);
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			
			// ### *02.2*Inserting text
			console.log("Test: Should go into insert mode after pressing i");
			EDITOR.mock("keydown", "i");
			if(EDITOR.mode != "vimInsert") throw new Error("Expected mode to change to vimInsert after pressing i");
			
			EDITOR.mock("typing", "A very intelligent turtle");
			EDITOR.mock("keydown", "\n");
			EDITOR.mock("typing", "Found programming UNIX a hurdle");
			if(file.text != "A very intelligent turtle\nFound programming UNIX a hurdle\n") throw new Error("Unexpected text: " + file.text);
			if(file.caret.col != 31 || file.caret.eol !== true) throw new Error("file.caret.col=" + file.caret.col + " file.caret.eol=" + file.caret.eol);
			
			EDITOR.mock("keydown", {charCode: ESC});
			if(EDITOR.mode != "vimNormal") throw new Error("Expected ESC to go back to vimNormal");
			if(file.caret.col != 30 || file.caret.eol !== false) throw new Error("ESC should place the caret at the last caret and not at end of line! file.caret.col=" + file.caret.col + " file.caret.eol=" + file.caret.eol);
			
			EDITOR.mock("typing", ":set showmode");
			EDITOR.mock("keydown", "\n"); // Enter is caputured by keyPress
			if(option.showmode != true) throw new Error("Expected :set showmode to turn on showmode");
			
			// ### *02.3*	Moving around
			
			EDITOR.mock("typing", "h");
			if(file.caret.col != 29 || file.caret.eol !== false) throw new Error("Expected h to move the cursor left! file.caret.col=" + file.caret.col + " file.caret.eol=" + file.caret.eol);
			
			EDITOR.mock("typing", "l");
			if(file.caret.col != 30) throw new Error("Expected l to move the cursor right! file.caret.col=" + file.caret.col + " file.caret.eol=" + file.caret.eol);
			
			EDITOR.mock("typing", "l");
			if(file.caret.col != 30) throw new Error("Expected l to Not move the cursor to end of line! file.caret.col=" + file.caret.col + " file.caret.eol=" + file.caret.eol);
			
			EDITOR.mock("typing", "k");
			if(file.caret.col != 24 || file.caret.row != 0) throw new Error("Expected k to move the cursor up! file.caret.col=" + file.caret.col + " file.caret.row=" + file.caret.row);
			
			EDITOR.mock("typing", "j");
			if(file.caret.col != 30 || file.caret.row != 1) throw new Error("Expected j to move the cursor back up to old position! file.caret.col=" + file.caret.col + " file.caret.row=" + file.caret.row);
			
			
			// ### *02.4*Deleting characters
			
			file.moveCaretToIndex(0);
			
			EDITOR.mock("typing", "xxxxxxx");
			if(file.text != "intelligent turtle\nFound programming UNIX a hurdle\n") throw new Error("Expected the 7 first letters to be deleted: " + file.text);
			
			EDITOR.mock("typing", "iA young ");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "A young intelligent turtle\nFound programming UNIX a hurdle\n") throw new Error("Unexpected after insert: " + file.text);
			
			EDITOR.mock("typing", "dd");
			if(file.text != "Found programming UNIX a hurdle\n") throw new Error("Expected dd to delete the row: " + file.text);
			
			EDITOR.mock("typing", "dd");
			if(file.text != "") throw new Error("Expected dd to delete the row: file.text=" + UTIL.lbChars(file.text) + " (" + file.text.length + " characters)");
			
			EDITOR.mock("typing", "iA young intelligent \nturtle");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "A young intelligent \nturtle") throw new Error("Unexpected: " + UTIL.lbChars(file.text));
			
			EDITOR.mock("typing", "k");
			if(file.caret.row !== 0) throw new Error("Expected cursor to move up when pressing k: " + JSON.stringify(file.caret));
			
			EDITOR.mock("typing", "J");
			if(file.text != "A young intelligent turtle") throw new Error("Expected J to merge the rows: " + file.text);
			
			
			// ### 02.5  Undo and Redo
			console.log("Test: Undo Join line");
			EDITOR.mock("typing", "u");
			if(file.text != "A young intelligent \nturtle") throw new Error("Expected u (undo) to put the lb back: " + file.text);
			
			console.log("Test: Redo Join line");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "A young intelligent turtle") throw new Error("Expected Ctrl+R to redo merge! file.text=" + file.text);
			
			file.moveCaretToIndex(0);
			
			EDITOR.mock("typing", "xxxxxxx");
			if(file.text != " intelligent turtle") throw new Error("Expected xxxxxxx to remove 'A young': " + file.text);
			
			console.log("Test: Undo remove: g");
			EDITOR.mock("typing", "u");
			if(file.text != "g intelligent turtle") throw new Error("Expected u (undo) to put back one character! file.text=" + file.text);
			
			console.log("Test: Undo remove: n");
			EDITOR.mock("typing", "u");
			if(file.text != "ng intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			console.log("Test: Undo remove: u");
			EDITOR.mock("typing", "u");
			if(file.text != "ung intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			console.log("Test: Undo remove: o");
			EDITOR.mock("typing", "u");
			if(file.text != "oung intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			console.log("Test: Undo remove: y");
			EDITOR.mock("typing", "u");
			if(file.text != "young intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			console.log("Test: Undo remove: space");
			EDITOR.mock("typing", "u");
			if(file.text != " young intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			console.log("Test: Undo remove: A");
			EDITOR.mock("typing", "u");
			if(file.text != "A young intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			console.log("Test: Redo remove: A");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != " young intelligent turtle") throw new Error("Unexpected after two redo: " + file.text);
			
			console.log("Test: Redo remove: space");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "young intelligent turtle") throw new Error("Unexpected after two redo: " + file.text);
			if(file.caret.col != 0) throw new Error("Unexpected: file.caret.col=" + file.caret.col);
			
			console.log("Test: Inserting: Some ");
			EDITOR.mock("typing", "iSome ");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "Some young intelligent turtle") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Undo inserting: Some ");
			EDITOR.mock("typing", "u");
			if(file.text != "young intelligent turtle") throw new Error("Unexpected: " + file.text);
			if(file.caret.col != 0) throw new Error("Unexpected: file.caret.col=" + file.caret.col);
			
			console.log("Test: Redo inserting: Some ");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "Some young intelligent turtle") throw new Error("Unexpected: " + file.text);
			
			
			/*
				### Special undo (U)
				The undo line command undoes all the changes made on the last line that was
				edited.  Typing this command twice cancels the preceding "U".
			*/
			
			console.log("Test: Delete whole line");
			EDITOR.mock("typing", "dd"); // Delete whole line
			if(file.text != "") throw new Error("Unexpected: " + UTIL.lbChars(file.text));
			
			console.log("Test: Insert: A very intelligent turtle");
			EDITOR.mock("typing", "iA very intelligent turtle");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "A very intelligent turtle") throw new Error("Unexpected: " + UTIL.lbChars(file.text));
			
			console.log("Test: Remove: very");
			file.moveCaretToIndex(2);
			EDITOR.mock("typing", "xxxx"); // Delete very
			if(file.text != "A  intelligent turtle") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Remove: turtle");
			EDITOR.mock("typing", "13l");
			EDITOR.mock("typing", "xxxxxx"); // Delete turtle
			if(file.text != "A  intelligent ") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Restore line");
			EDITOR.mock("typing", "U"); // Restore line with "U"
			if(file.text != "A very intelligent turtle") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Undo restore line");
			EDITOR.mock("typing", "u"); // Undo "U" with "u"
			if(file.text != "A  intelligent ") throw new Error("Unexpected: " + file.text);
			
			
			// ### 02.6  Other editing commands
			// Appending "a"
			EDITOR.mock("typing", "dd"); // Delete whole line
			if(file.text != "") throw new Error("Unexpected: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "iand that's not saying much for the turtle.");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "and that's not saying much for the turtle.") throw new Error("Unexpected: " + file.text);
			if(file.caret.col != 41) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "x"); // delete the period
			if(file.text != "and that's not saying much for the turtle") throw new Error("Unexpected: " + file.text);
			EDITOR.mock("typing", "a!!!"); // append three exclamation points after the e in turtle
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "and that's not saying much for the turtle!!!") throw new Error("Unexpected: " + file.text);
			
			// Open a new line "o"
			EDITOR.mock("typing", "dd"); // Delete whole line
			EDITOR.mock("typing", "iA very intelligent turtle\nFound programming UNIX a hurdle");
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "k"); // Move to first line
			if(file.text != "A very intelligent turtle\nFound programming UNIX a hurdle") throw new Error("Unexpected: " + file.text);
			if(file.caret.row != 0) throw new Error("Unexpected file.caret.row=" + file.caret.row);
			if(file.caret.col != 24) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "oThat liked using Vim");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "A very intelligent turtle\nThat liked using Vim\nFound programming UNIX a hurdle") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Undo open new line");
			EDITOR.mock("typing", "u"); // Undo open new line
			if(file.text != "A very intelligent turtle\nFound programming UNIX a hurdle") throw new Error("Unexpected: " + file.text);
			if(file.caret.col != 24) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			console.log("Test: Redo open new line");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo open new line (with text)
			if(file.text != "A very intelligent turtle\nThat liked using Vim\nFound programming UNIX a hurdle") throw new Error("Unexpected: " + file.text);
			
			// Using a count
			EDITOR.mock("typing", "k"); // Move up
			EDITOR.mock("typing", "3dd"); // Delete 3 lines
			if(file.text != "") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "3ihello"); // Insert hello 3 times
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "hellohellohello") throw new Error("Unexpected: " + file.text);
			if(file.caret.col != 14) throw new Error("Unexpected: file.caret.col=" + file.caret.col);
			
			EDITOR.mock("typing", "3aworld"); // Append world 3 times
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "hellohellohelloworldworldworld") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "3oMany turtles"); // Open 3 rows 
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtles") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "2ihello"); // Insert hello 2 times
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellos") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "2aworld"); // Append world 2 times
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellosworldworld") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "2oMore turtles"); // Open 2 rows
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellosworldworld\nMore turtles\nMore turtles") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Undo opening two rows containing: More turtles");
			EDITOR.mock("typing", "u");
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellosworldworld") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Undo appending two strings containing: world");
			EDITOR.mock("typing", "u");
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellos") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Undo inserting two strings containing: hello");
			EDITOR.mock("typing", "u");
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtles") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Redo inserting two strings containing: hello");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellos") throw new Error("Unexpected: " + file.text);
			
			console.log("Test: Redo appending two strings containing: world");
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellosworldworld") throw new Error("Unexpected: " + file.text);
			
			if(!vimWasActive) toggleVim(); // Turn Vim/modal off again
			
			//EDITOR.closeFile(file.path);
			if(typeof callback == "function") callback(true);
			else {
				EDITOR.mock("typing", "kkk4dd");
				EDITOR.mock("typing", "aTest2 passed!");
				EDITOR.mock("keydown", {charCode: ESC});
			}
		});
		
		if(typeof callback != "function") return false;
	}
	
	function vimTest3(callback) {
		EDITOR.openFile("vimTest3.txt", "\n", function(err, file) {
			var vimWasActive = VIM_ACTIVE;
			if(!vimWasActive) toggleVim();
			// Get out from any mode
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("keydown", {charCode: ESC});
			
			// http://vimhelp.appspot.com/usr_03.txt.html#usr_03.txt
			
			// First test edge cases before testing the happy path (tutorial)
			//                      0 2   6   10  14  18      25     30  
			EDITOR.mock("typing", "iab'!  c_d e9f --- 123 \n  gh\n \n\n");
			EDITOR.mock("keydown", {charCode: ESC});
			
			// a "word" is any character that is not a underscore, number or white-space
			
			// Moving backwars by word
			// Should jump over lines that only contains white-space
			// Should stop at emty lines
			EDITOR.mock("typing", "b");
			if(file.caret.index != 30) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 25) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 18) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 14) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 10) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 6) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 2) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "b");
			if(file.caret.index != 0) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			
			// Moving forward by word
			EDITOR.mock("typing", "w");
			if(file.caret.index != 2) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "w");
			if(file.caret.index != 6) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "w");
			if(file.caret.index != 10) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "w");
			if(file.caret.index != 14) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "w");
			if(file.caret.index != 18) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "w");
			if(file.caret.index != 25) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "w");
			if(file.caret.index != 30) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			
			// Moving backwards strictly by WORD (a WORD is anything separated by white space)
			//  0     6   10  14  18      25     30
			//  ab'!  c_d e9f --- 123 \n  gh\n \n\n");
			EDITOR.mock("typing", "B");
			if(file.caret.index != 25) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "B");
			if(file.caret.index != 18) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "B");
			if(file.caret.index != 14) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "B");
			if(file.caret.index != 10) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "B");
			if(file.caret.index != 6) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "B");
			if(file.caret.index != 0) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			
			// Moving forward by WORD
			EDITOR.mock("typing", "W");
			if(file.caret.index != 6) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "W");
			if(file.caret.index != 10) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "W");
			if(file.caret.index != 14) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "W");
			if(file.caret.index != 18) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "W");
			if(file.caret.index != 25) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "W");
			if(file.caret.index != 30) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			
			// Moving backwards by end of word (also stops at empty lines which e doesn't)
			//   1 3    8   12  16  20     26    30
			//  ab'!  c_d e9f --- 123 \n  gh\n \n\n");
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 26) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 20) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 16) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 12) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 8) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 3) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 1) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "ge");
			if(file.caret.index != 0) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			
			// Moving forward by end of word (note: does NOT stop at empty lines!)
			EDITOR.mock("typing", "e");
			if(file.caret.index != 1) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(file.caret.index != 3) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(file.caret.index != 8) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(file.caret.index != 12) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(file.caret.index != 16) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(file.caret.index != 20) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(file.caret.index != 26) throw new Error("Unexpected file.caret.index=" + file.caret.index);
			EDITOR.mock("typing", "e");
			if(!file.caret.eof) throw new Error("Unexpected EOF! file.caret=" + JSON.stringify(file.caret));
			
			
			
			// Test the happy path (just to be sure)
			
			
			
			// Setup
			EDITOR.mock("typing", "5k5ddiThis is a line with example text");
			//EDITOR.mock("typing", "iThis is a line with example text");
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "32h");
			if(file.caret.row != 0) throw new Error("Unexpected file.caret.row=" + file.caret.row);
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			// ### 03.1  Word movement
			EDITOR.mock("typing", "w");
			if(file.caret.col != 5) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "w");
			if(file.caret.col != 8) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "w");
			if(file.caret.col != 10) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "3w");
			if(file.caret.col != 28) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			// Move word back
			EDITOR.mock("typing", "b");
			if(file.caret.col != 20) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "2b");
			if(file.caret.col != 10) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b");
			if(file.caret.col != 8) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b");
			if(file.caret.col != 5) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b");
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			// Move to end of word
			EDITOR.mock("typing", "e"); 
			if(file.caret.col != 3) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "2e");
			if(file.caret.col != 8) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "3e");
			if(file.caret.col != 26) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			// Move to previous end of word
			EDITOR.mock("typing", "ge");
			if(file.caret.col != 18) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "2ge");
			if(file.caret.col != 8) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			//                        0                    21                      45
			EDITOR.mock("typing", "ddiThis is-a line, with special/separated/words (and some more).");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.caret.col != 60) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b"); // move caret to |)
			if(file.caret.col != 59) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "4b"); // move caret to |(
			if(file.caret.col != 45) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b"); // Move caret to |words
			if(file.caret.col != 39) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b"); // Move caret to |/words
			if(file.caret.col != 38) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "b"); // Move caret to |separated
			if(file.caret.col != 29) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "7b"); // Move caret to |-a line
			if(file.caret.col != 7) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "e"); // Move caret to |a line
			if(file.caret.col != 8) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "gE"); // Move caret to Thi|s
			if(file.caret.col != 3) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "3W"); // Move caret to |with
			if(file.caret.col != 16) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "B"); // Move caret to |line
			if(file.caret.col != 10) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "3E"); // Move caret to word|s
			if(file.caret.col != 43) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			
			// ### 03.2  Moving to the start or end of a line
			EDITOR.mock("typing", "$"); // Move to the last character
			if(file.caret.col != 60) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "^"); // Move to the first non-blank character of the line
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("keydown", {charCode: END});
			if(file.caret.col != 60) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("keydown", {charCode: HOME});
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			EDITOR.mock("typing", "ddi     This is a line with example text"); // Delete line
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "$"); // Move to the last character
			if(file.caret.col != 36) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "^"); // Move to the first non-white-space character: |This
			if(file.caret.col != 5) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "0"); // Move to the start of the line
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "oSecond line\nThird line");
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "2k0");
			if(file.caret.col != 0) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			if(file.caret.row != 0) throw new Error("Unexpected file.caret.row=" + file.caret.row);
			EDITOR.mock("typing", "3$"); // Move three lines down
			if(file.caret.row != 2) throw new Error("Unexpected file.caret.row=" + file.caret.row);
			
			
			// ### 03.3  Moving to a character
			EDITOR.mock("typing", "3k3ddiTo err is human.  To really foul up you need a computer.");
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "0");
			EDITOR.mock("typing", "fh"); // |human
			if(file.caret.col != 10) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "fy"); // reall|y
			if(file.caret.col != 26) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "Fh"); // |human
			if(file.caret.col != 10) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "3fl"); // really fou|l
			if(file.caret.col != 31) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "Th"); // backwards to: h|uman
			if(file.caret.col != 11) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "tn"); // forward to: hum|an
			if(file.caret.col != 13) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			// Repeat find
			// Only seems to fork with f,F,t,T
			EDITOR.mock("typing", ";"); // Repeat to n: you| need
			if(file.caret.col != 39) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", ","); // Repeat to n in opposit direction: human|.
			if(file.caret.col != 15) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			
			// ### 03.4  Matching a parenthesis
			EDITOR.mock("typing", "ddiif (a == (b * c) / d)");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.caret.col != 20) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			EDITOR.mock("typing", "%"); // Move to matching parenthesis
			if(file.caret.col != 3) throw new Error("Unexpected file.caret.col=" + file.caret.col);
			
			// ### 03.5  Moving to a specific line
			EDITOR.mock("typing", "oLine 2\nLine3");
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "gg"); // Goto first line
			if(file.caret.row != 0) throw new Error("Unexpected file.caret.col=" + file.caret.row);
			EDITOR.mock("typing", "G"); // Goto last line
			if(file.caret.row != 2) throw new Error("Unexpected file.caret.col=" + file.caret.row);
			EDITOR.mock("typing", "2G"); // Goto second line
			if(file.caret.row != 1) throw new Error("Unexpected file.caret.col=" + file.caret.row);
			EDITOR.mock("typing", "1%"); // Goto start of file
			if(file.caret.row != 0) throw new Error("Unexpected file.caret.col=" + file.caret.row);
			EDITOR.mock("typing", "50%"); // Goto middle of file
			if(file.caret.row != 1) throw new Error("Unexpected file.caret.col=" + file.caret.row);
			
			// move to one of the lines you can see ? Hard to test, so test manually
			
			
			
			
			
			
			if(!vimWasActive) toggleVim(); // Turn Vim/modal off again
			if(typeof callback == "function") callback(true);
			else {
				EDITOR.mock("typing", "dd");
				EDITOR.mock("typing", "aTest3 passed!");
				EDITOR.mock("keydown", {charCode: ESC});
			}
			
		});
		if(typeof callback != "function") return false;
	}
	
	function vimTest4(callback) {
		EDITOR.openFile("vimTest4.txt", "\n", function(err, file) {
			var vimWasActive = VIM_ACTIVE;
			if(!vimWasActive) toggleVim();
			// Get out from any mode
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("keydown", {charCode: ESC});
			
			
			
			if(!vimWasActive) toggleVim(); // Turn Vim/modal off again
			if(typeof callback == "function") callback(true);
			else {
				EDITOR.mock("typing", "dd");
				EDITOR.mock("typing", "aTest4 passed!");
				EDITOR.mock("keydown", {charCode: ESC});
			}
		});
		if(typeof callback != "function") return false;
	}
	
	
	
	
	
	EDITOR.addTest(vimTest1);
	EDITOR.addTest(vimTest2);
	
	// TEST-CODE-END
	
})();

