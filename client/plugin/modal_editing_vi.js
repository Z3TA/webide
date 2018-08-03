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
	
	var vimMenuItem;
	var vimCommandBuffer = "";
	var commandCaretPosition = 0;
	var messageToShow = "ENTER COMMAND"; // Helper message to show if there is nothing in command buffer 
	var insertedString = "";
	var lastCommand = ""; // Used for repeating last command with .
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
		hlsearch: false // Highlight text when searching ??
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
			
			if(EDITOR.settings.devMode) {
				var DOT = 190;
				EDITOR.bindKey({desc: "Test vim commands", fun: testVimCommands, charCode: DOT, combo: CTRL+SHIFT, mode: "*"});
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
		history[file.path] = [new HistoryItem()];
		history[file.path].currentItem = 0;
		history[file.path].lastEditedRow = -1;
		history[file.path].rowContentBeforeEdit = "";
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
		
		console.log("vimKeyPress: char=" + UTIL.lbChars(char) + " VIM_ACTIVE=" + VIM_ACTIVE + " EDITOR.mode=" + EDITOR.mode);
		
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
				
				vimCommandBuffer += char;
				commandCaretPosition++;
				messageToShow = "";
				EDITOR.renderNeeded();
				
				if(vimCommandBuffer == "u") {
					// Undo
				vimUndo(file);
					return false;
			}
			else if(vimCommandBuffer == ".") {
				// Repeat last command
					var command = parseNormalCommand(lastCommand);
				}
				else if(vimCommandBuffer.charAt(0) != ":") {
					var command = parseNormalCommand(vimCommandBuffer);
			}
				else console.log("Entering editor command : " + vimCommandBuffer + " ...");
			}
			
			if(command) {
				clearCommandBuffer();
				
				addHistory(file, undefined); // Start a new history entry
				
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
			
			if(vimCommandBuffer.indexOf("\n") != -1) throw new Error("Command buffer contains new-line character! vimCommandBuffer=" + UTIL.lbChars(vimCommandBuffer));
			
			return false; // Prevent defult browser action
		}
		else if(EDITOR.mode == "vimInsert") {
			/*
				The only "function" keys that get registered in keyPress in JavaScript is Enter and Delete!
				We need to EDITOR.bindKey for example backspace and arrow keys.
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
			else if(char == String.fromCharCode(127)) { // Delete
				console.log("DELETE");
				insertedString = insertedString.slice(0,-1);
				var deletedCharacter = file.text.charAt(file.caret.index);
				return rdo(function deleteUndo() {
					file.moveCaretToIndex(caretIndex);
					file.putCharacter(deletedCharacter);
				}, function deleteRedo() {
					file.moveCaretToIndex(caretIndex);
					file.deleteCharacter();
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
				});
			}
		}
		else { // Not vimInsert or VimNormal
			return true; // Do the editor default
		}
		
		function rdo(undo, redo) {
			var ev = {undo: undo, redo: redo};
			ev.redo();
			EDITOR.renderNeeded();
			updateHistory(file, ev);
			
			return false;
		}
	}
	
	
	function vimBackspace(file, combo) {
		// Backspace is not captured by keyPress!
		if(!VIM_ACTIVE) return true;
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
				vimCommandBuffer = vimCommandBuffer.slice(0,commandCaretPosition) + vimCommandBuffer.slice(commandCaretPosition+1);
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
	
	function vimRedo(file) {
		clearCommandBuffer();
		
		var fileHistory = history[file.path];
		
		console.log("vim:redo: file.path=" + file.path + " fileHistory.length=" + fileHistory.length + " fileHistory.currentItem=" + fileHistory.currentItem);
		
		if(fileHistory.length == 0) {
console.warn("Unable to redo! No recorded history!");
			return false;
		}
		
		if(fileHistory.currentItem == -1 && fileHistory.length > 0) {
			// The item index has reached the bottom in order to prevent repetition of the first undo
			// Now go forward
			console.log("set fileHistory.currentItem = 0");
			fileHistory.currentItem = 0;
		}
		
		if(fileHistory.currentItem >= fileHistory.length) {
			console.log("fileHistory already at the tip! fileHistory.currentItem=" + fileHistory.currentItem + " fileHistory.length=" + fileHistory.length);
			console.log(fileHistory);
			showMessage("Already at newest change");
			return false;
		}
		
		var tip = getHistoryTip(fileHistory);
		var branch = tip.branch;
		
		console.log("root branch ? " + (branch==fileHistory));
		console.log("before redo: branch.currentItem=" + branch.currentItem);
		
		if(branch == fileHistory && branch.currentItem != fileHistory.currentItem) {
			console.log(branch);
			console.log(fileHistory);
			throw new Error("fileHistory.currentItem=" + fileHistory.currentItem + " branch.currentItem=" + branch.currentItem + " branch===fileHistory ? " + (branch===fileHistory));
		}
		
		if( branch.currentItem >= branch.length) {
			console.log("branch already at the tip! branch.currentItem=" + branch.currentItem + " branch.length=" + branch.length);
			console.log(fileHistory);
			showMessage("Already at newest change");
			return false;
		}
		else {
			console.log("branch.currentItem=" + branch.currentItem + " branch.length=" + branch.length);
		}
		
		var historyItem = branch[branch.currentItem];
		
		for (var i=0, f; i<historyItem.redo.length; i++) {
			f = historyItem.redo[i]
			console.log("redo " + i + ":" + UTIL.getFunctionName(f) + ": " + f.toString()); 
			f();
		}
		
		branch.currentItem++;
		
		console.log("after redo: branch.currentItem=" + branch.currentItem);
		
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
			console.log("set fileHistory.currentItem = " + fileHistory.length-1);
			fileHistory.currentItem = fileHistory.length-1;
		}
		
		var tip = getHistoryTip(fileHistory);
		var branch = tip.branch;
		var historyItem = tip.item;
		
		console.log("root branch ? " + (branch==fileHistory));
		
		if(branch.currentItem == undefined) {
			console.log("branch:", branch);
			throw new Error("branch.currentItem=" + branch.currentItem);
		}
		
		console.log("before undo: branch.currentItem=" + branch.currentItem);
		branch.currentItem--;
		console.log("after undo: branch.currentItem=" + branch.currentItem);
		
		// Should the undo run backwards !? Last in last out !?
		for (var i=historyItem.undo.length-1, f; i>-1; i--) {
			f = historyItem.undo[i];
			console.log("undo " + i + ":" + UTIL.getFunctionName(f) + ": " + f.toString()); 
			f();
		}
		
		// No need to have EDITOR.renderNeeded() inside each undo function
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
		var historyItem = branch[branch.currentItem];
		while(historyItem.branches.length > 0 && historyItem.currentBranch >= -1 && historyItem.branches[historyItem.currentBranch].currentItem > -1) {
			branch = historyItem.branches[historyItem.currentBranch];
			historyItem = branch[branch.currentItem];
		}
		if(branch.currentItem <= -1) throw new Error("branch.currentItem=" + branch.currentItem + " branch:", branch);
		return {branch: branch, item: historyItem};
	}
	
	function addHistory(file, ev) {
		// Add/Create a new undo/redo history item, when running a command
		
		console.log("vim:addHistory: file.path=" + file.path + " ev=", ev); 
		
		var fileHistory = history[file.path];
		if(fileHistory == undefined) throw new Error("No history for file.path=" + file.path);
		
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
		
		// Don't create a new Emty history entry if last one is already Empty!
		if(ev == undefined && historyItem.redo.length == 0 && historyItem.undo.length == 0) return;
		
		var newEvent = new HistoryItem(ev && ev.undo, ev && ev.redo);
		
		if(branch.currentItem != branch.length-1) {
			// We are in the middle of the history, so branche out
			branch = [];
			historyItem.currentBranch = historyItem.branches.push(branch)-1;
			console.log("brancing out");
		}
		else {
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
	
	function HistoryItem(undo, redo) {
		// Object model for history items
		this.date = new Date();
		this.undo = undo ? [undo] : [];
		this.redo = redo ? [redo] : [];
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
		if(str.slice(0, 5) == ":set ") {
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
		else return null;
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
			}
			
			/*
				"3d2w" deletes two words, repeated three times, for a total of six words.
			*/
			else if(UTIL.isNumeric(char)) {
				nr += char;
				repeat = parseInt(nr);
			}
			
			// ## Quick search single letter
else if(findRight) {
				// Search right n times to find char
				
			}
			else if(findLeft) {
				// Search left n times to find char
				
			}
			else if(findToLeft) {
				// Search left n times to find char, stops one character before the searched character
				
			}
			else if(findToRight) {
				// Search right n times to find char, stops one character before the searched character
				
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
			else if(char == "w") {
				console.log("Word movement forward");
				
			}
			else if(char == "b") {
				// Word movement backwards
				
			}
			else if(char == "e" && lastChar == "g") {
				// Moves to the previous end of a word
				
			}
			else if(char == "e") {
				// Moves to the next end of a word
			}
			
			// ### Move by white-space separated WORDs
			else if(char == "E" && lastChar == "g") {
				// Move back to the end of last word
			}
			else if(char == "B") {
				// Move back a word
			}
			else if(char == "W") {
				// Move forward a word
			}
			else if(char == "W") {
				// Move forward to the next end of a word
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
				
			}
			else if(char == "^") {
				// moves to the first non-blank character of the line
			}
			
			/*
				## Moving to a character
			*/
			else if(char == "f") {
				find = true;
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
			else if(char == "G") {
				// Goto line n
				
			}
			else if(char == "g" && lastChar == "g") {
				// go to the start of a file
			}
			else if(char == "H") {
				// Moves to (home) top of screen
			}
			else if(char == "M") {
				// Moves to middle of screen
			}
			else if(char == "L") {
				// Moves to last line of screen
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
			else if(char == "0") {
				// Move to column zero
				return cursorMovement(function moveCursorToColumZero() {
					file.moveCaret(undefined, file.caret.row, 0);
				});
			}
			
			// ## Misc
			else if(char == "z" && lastChar == "z") {
				// Center the line that cursors at, scroll so the line with the cursors is in the center
			}
			else if(char == "t" && lastChar == "z") {
				// puts the cursor line at the top
			}
			else if(char == "b" && lastChar == "z") {
				// puts the cursor line at at the bottom.
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
			
insertedString = "";

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
		
	};
	
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
		
		var str = "index=" + file.caret.index + " row=" + (file.caret.row) + " col=" + (file.caret.col);
		if(file.caret.eol) str += " EOL";
		if(file.caret.eof) str += " EOF";
		showMessage(str);
	}
	
	function showMessage(msg) {
		console.log("Vim:showMessage:", msg);
		if(msg == undefined) msg = "";
		if(typeof msg != "string") msg = JSON.stringify(msg);
		messageToShow = msg;
		EDITOR.renderNeeded();
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
	
	function testVimCommands(callback) {
		EDITOR.openFile("testVimCommands.txt", "\n", function(err, file) {
			var vimWasActive = VIM_ACTIVE;
			if(!vimWasActive) toggleVim();
			var assert = UTIL.assert();
			
			/*
				
			*/
			
			// Get out from any mode
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("keydown", {charCode: ESC});
			
			// Make sure undo/redo history works with only one item in the history
			EDITOR.mock("typing", "i123");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Undo insert
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Should do nothing
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Undo insert (again)
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			
			// See if we can travel the history
			EDITOR.mock("typing", "a456");
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123456\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Undo insert 456
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Undo insert 123
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 123
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 456
			if(file.text != "123456\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			// See if the history can branch
			EDITOR.mock("typing", "u"); // Undo insert 456
			EDITOR.mock("typing", "adef"); // Branch the history by appending def
			EDITOR.mock("keydown", {charCode: ESC});
			if(file.text != "123def\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Undo insert def
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "u"); // Undo insert 123
			if(file.text != "\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert 123
			if(file.text != "123\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "R", ctrlKey: true}); // Redo insert def
			// Note: It should now pick the def branch (test shouldbe 123def and not 123456)
			if(file.text != "123def\n") throw new Error("Unexpected text: " + UTIL.lbChars(file.text));
			
			
			/*
				
				Following the guide at: http://vimhelp.appspot.com/
				
			*/
			
			// ### *02.2*Inserting text
			
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
			
			EDITOR.mock("typing", "u");
			if(file.text != "A young intelligent \nturtle") throw new Error("Expected u (undo) to put the lb back: " + file.text);
			
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "A young intelligent turtle") throw new Error("Expected Ctrl+R to redo merge! file.text=" + file.text);
			
			file.moveCaretToIndex(0);
			
			EDITOR.mock("typing", "xxxxxxx");
			if(file.text != " intelligent turtle") throw new Error("Expected xxxxxxx to remove 'A young': " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "g intelligent turtle") throw new Error("Expected u (undo) to put back one character! file.text=" + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "ng intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "ung intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "oung intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "young intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != " young intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "A young intelligent turtle") throw new Error("Unexpected u (undo): " + file.text);
			
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "young intelligent turtle") throw new Error("Unexpected after two redo: " + file.text);
			if(file.caret.col != 0) throw new Error("Unexpected: file.caret.col=" + file.caret.col);
			
			EDITOR.mock("typing", "iSome ");
			EDITOR.mock("keydown", {charCode: ESC});
			EDITOR.mock("typing", "u");
			if(file.text != "young intelligent turtle") throw new Error("Unexpected: " + file.text);
			if(file.caret.col != 0) throw new Error("Unexpected: file.caret.col=" + file.caret.col);
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "Some young intelligent turtle") throw new Error("Unexpected: " + file.text);
			
			
			/*
				### Special undo (U)
				The undo line command undoes all the changes made on the last line that was
				edited.  Typing this command twice cancels the preceding "U".
			*/
			
			EDITOR.mock("typing", "dd"); // Delete whole line
			if(file.text != "") throw new Error("Unexpected: " + UTIL.lbChars(file.text));
			EDITOR.mock("typing", "iA very intelligent turtle");
			EDITOR.mock("keydown", {charCode: ESC});
			file.moveCaretToIndex(2);
			EDITOR.mock("typing", "xxxx"); // Delete very
			if(file.text != "A  intelligent turtle") throw new Error("Unexpected: " + file.text);
			EDITOR.mock("typing", "13l");
			EDITOR.mock("typing", "xxxxxx"); // Delete turtle
			if(file.text != "A  intelligent ") throw new Error("Unexpected: " + file.text);
			EDITOR.mock("typing", "U"); // Restore line with "U"
			if(file.text != "A very intelligent turtle") throw new Error("Unexpected: " + file.text);
			
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
			EDITOR.mock("typing", "u"); // Undo open new line
			if(file.text != "A very intelligent turtle\nFound programming UNIX a hurdle") throw new Error("Unexpected: " + file.text);
			if(file.caret.col != 24) throw new Error("Unexpected file.caret.col=" + file.caret.col);
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
			
			EDITOR.mock("typing", "u");
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellosworldworld") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellos") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("typing", "u");
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtles") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellos") throw new Error("Unexpected: " + file.text);
			
			EDITOR.mock("keydown", {char: "R", ctrlKey: true});
			if(file.text != "hellohellohelloworldworldworld\nMany turtles\nMany turtles\nMany turtlehellohellosworldworld") throw new Error("Unexpected: " + file.text);
			
			
			
			return true;
			
			
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
			
			EDITOR.mock("keydown", ":");
			EDITOR.mock("keydown", {charCode: UP});
			if(vimCommandBuffer != ":foo") throw new Error("Expected key up to toggle command history! vimCommandBuffer=" + vimCommandBuffer + " commandHistory.length=" + commandHistory.length);
			
			
			
			EDITOR.mock("typing", ":set showmode?");
			if(messageToShow != "noshowmode") throw new Error("Expected :set showmode? to show noshowmode because it's turned off");
			
			
			
			if(!vimWasActive) toggleVim(); // Turn Vim/modal off again
			
			//EDITOR.closeFile(file.path);
			if(typeof callback == "function") callback(true);
			else {
alertBox("All vim commands suceeded!");
			}
		});
		
		if(typeof callback != "function") return false;
		};
	
	EDITOR.addTest(testVimCommands, 1);
	
	// TEST-CODE-END
	
})();

