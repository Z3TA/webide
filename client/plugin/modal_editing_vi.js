/*
	
	Proof of concept modal editing like in vi/vim
	The goal of this plugin is to let old vi/vim users use their reflexes.
	And make it so you can use the editor conforably on a laptop without a mouse.
	Without having to reach for arrow or navigation keys.
	
	"Good design is when the program does what the user expects will happen"
	
	Problem: A lot of key bindings overlap "modern" key bindings like Ctrl+V for pasting, while in vim it goes into visual block mode.
	Solution: Existing key bindings have to co-exist with vim/modal mode. We only want the "essential" vim commands.
	We know we will *never* be able to satisfy hardcore vim users. 
	
	Visual Mode: Basically highlight stuff ... plus some magic !? 
	We will only support normal mode for now.
	But maybe we'll add some custom commands !?
	
	Feel free to make your own vim plugin!
	If you want the full vim experience you will probably need to run vim via the built in terminal though :P
	
	
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
	
	
	
	
*/

(function() {
	"use strict";
	
	if(window.location.href.indexOf("&vim") == -1) return; // Work in progress!
	
	// https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
	var BACKSPACE = String.fromCharCode(8);
	var UP = String.fromCharCode(38);
	var DOWN = String.fromCharCode(40);
	var LEFT = String.fromCharCode(37);
	var RIGHT = String.fromCharCode(39);
	var SPACE = 32;
	var ESC = 27;
	var R = 82;
	
	var vimMenuItem;
	var vimCommandBuffer = "";
	var vimCommandCaretPosition = "0";
	var searchString = "";
	var searchStringHistory = [];
	var commandLineHistory = [];
	var highlightAllSearchMatches = false;
	var keyPressHistory = [];
	var VIM_ACTIVE = false; // Always start with false, see plugin.load (toggles vim mode if &vimactive in url query)
	var lastCommand = "";
	var lastInsert = "";
	var history = []; // Undo redo history {undo: [f,f,f], redo: [f,f,f]} or a new branch/array
	history.index = -1; // Keep track of where in the history
	
	var undoBeforeInsert; // The command before insert example i or c, or ci"
	var commandHistory = [];
	commandHistory.index = -1;
	var searchOnlyCommandHistoryStartingWith = ""; // When using up/down arrows to toggle command history
	
	
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
			
			
			EDITOR.bindKey({desc: "Toggle vim/modal mode", fun: toggleVim, charCode: SPACE, combo: SHIFT, mode: "*"});
			
			EDITOR.bindKey({desc: "Vim redo", fun: vimRedo, charCode: R, combo: 0, mode: "vimNormal"});
			
			EDITOR.bindKey({desc: "Goes to vim normal/command mode", fun: toVimNormalMode, charCode: ESC, combo: 0, mode: "vimInsert"});
			EDITOR.bindKey({desc: "Delete the character left of the caret in Vim insert mode", fun: vimInsertBackspace, charCode: BACKSPACE, combo: 0, mode: "vimInsert"});
			EDITOR.bindKey({desc: "Move the caret left in Vim/modal mode", fun: vimLeft, charCode: LEFT, combo: 0, mode: "*"});
			EDITOR.bindKey({desc: "Move the caret left in Vim/modal mode", fun: vimLeft, charCode: LEFT, combo: 0, mode: "*"});
			
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
			EDITOR.unbindKey(toVimNormalMode);
			EDITOR.unbindKey(vimRedo);
		}
		});
		
	function toVimNormalMode() {
		if(VIM_ACTIVE) {
			console.log("Setting vim mode to normal (command)");
EDITOR.setMode("vimNormal");
			
			if(keyPressHistory.length > 0) {
				/*
					Using the arrow keys in insert mode in vim seems to clear the command history
					and . will repeat the insert that happened after the move
					Each arrow-move in insert-mode adds to the history (starts a new history)
					
					ci" (change inside ") and inserting text, then undo undoes both inserted text and change (deletion)
				*/
				lastInsert = keyPressHistory.join();
				var undoCommandBeforeInsert = undoBeforeInsert; // Closure magic
				addHistory({
					undo: function() {
						if(typeof undoCommandBeforeInsert == "function") undoCommandBeforeInsert();
						parseCommand("d" + lastInsert.length + "h");
					},
					redo: function() {
						parseCommand(lastCommand + lastInsert); // ex: ifoo (insert) foo
					}
				})
			}
			
			keyPressHistory.length = 0;
			
			
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimKeyPress(file, char, combo) {
		/*
			
		*/
		
		console.log("vimKeyPress: VIM_ACTIVE=" + VIM_ACTIVE + " EDITOR.mode=" + EDITOR.mode);
		
		if(!VIM_ACTIVE) return true;
		
		if(EDITOR.mode == "vimNormal") {
			
			if(char == "\n") { // Press Enter
				parseCommand(vimCommandBuffer);
				return false;
			}
			
			vimCommandBuffer += char;
			vimCommandCaretPosition++;
			
			if(vimCommandBuffer == "u") {
				// Undo
				vimUndo();
				clearCommandBuffer();
			}
			else if(vimCommandBuffer == ".") {
				// Repeat last command
				if(lastCommand) parseCommand(lastCommand + lastInsert);
				else console.warn("No command has yet been registered. Unable to repeat!");
				
				clearCommandBuffer();
			}
			else {
				
				parseCommand(vimCommandBuffer);
			}
			
			return false; // Prevent defult browser action
		}
		else if(EDITOR.mode == "vimInsert") {
			/*
				The only "function" keys that get registered in keyPress in JavaScript is Enter and Delete!
				We need to EDITOR.bindKey for example backspace and arrow keys.
			*/
			
			if(char == "\n") {
				var ev = {
					undo: function() {
						file.moveCaretLeft();
						file.deleteCharacter();
					},
					redo: function() {
						file.insertLineBreak();
					}
				}
				ev.redo();
				EDITOR.renderNeeded();
				updateHistory(ev);
			}
			else if(char.charCodeAt(0) == DELETE) {
				var deletedCharacter = file.text.charAt(file.caret.index);
				var ev = {
					undo: function() {
						file.putCharacter(deletedCharacter);
					},
					redo: function () {
						file.deleteCharacter();
					}
				}
				ev.redo();
				EDITOR.renderNeeded();
			}
			else {
				
				var ev = {
					undo: function() {
						file.moveCaretLeft();
						file.deleteCharacter();
					},
					redo: function () {
						file.putCharacter(char);
					}
				}
				ev.redo();
				EDITOR.renderNeeded();
				
				// Record key presses in order to repeat
				keyPressHistory.push(char);
			}
			
			return false;
		}
		else {
			return true; // Do the editor default
		}
	}
	
	function vimBackspace() {
		if(EDITOR.mode == "vimInsert") {
			keyPressHistory.pop();
			file.moveCaretLeft();
			file.deleteCharacter();
			EDITOR.renderNeeded();
			return false;
		}
		else if(EDITOR.mode == "vimNormal") {
			if(vimCommandCaretPosition == vimCommandBuffer.length) {
				vimCommandBuffer = vimCommandBuffer.slice(0,-1);
			}
			else {
				vimCommandBuffer = vimCommandBuffer.slice(0,vimCommandCaretPosition) + vimCommandBuffer.slice(vimCommandCaretPosition+1);
			}
			vimCommandCaretPosition--;
			updateCommandVisual();
			// Wait for Enter before parsing/executing the command !?
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimLeft() {
		if(EDITOR.mode == "vimInsert") {
			file.moveCaretLeft();
			EDITOR.renderNeeded();
			return false;
		}
		else if(EDITOR.mode == "vimNormal") {
			vimCommandCaretPosition--;
			updateCommandVisual();
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimUp() {
		if(EDITOR.mode == "vimInsert") {
			file.moveCaretUp();
			EDITOR.renderNeeded();
			return false;
		}
		else if(EDITOR.mode == "vimNormal") {
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
						vimCommandCaretPosition = vimCommandBuffer.length;
					}
				}
			}
			else {
				commandHistory.index--;
				vimCommandBuffer = commandHistory[commandHistory.index];
				vimCommandCaretPosition = vimCommandBuffer.length;
			}
			
			return false;
		}
		else {
			return true;
		}
	}
	
	function vimRedo() {
		if(history.length == 0) return console.warn("Unable to redo! No recorded history!");
		var branch = history[history.index];
		while(Array.isArray(branch) && branch.index != -1) {
			branch = branch[branch.index];
		}
		
		branch.index++;
		
		for (var i=0; i<branch.redo.length; i++) {
			branch.redo[i]();
		}
	}
	
	function vimUndo() {
		if(history.length == 0) return console.warn("Unable to undo! No recorded history!");
		var branch = history[history.index];
		while(Array.isArray(branch) && branch.index > -1) {
			branch = branch[branch.index];
		}
		
		branch.index--;
		
		for (var i=0; i<branch.undo.length; i++) {
			branch.undo[i]();
		}
	}
	
	function updateHistory(ev) {
		// Adds to existing undo/redo history
		if(typeof ev != "object") throw new Error("Want a history object with undo and redo functions! ev=" + ev + " is not an object!");
		if(typeof ev.undo != "function") throw new Error("ev.undo=" + ev.undo + " needs to be a function!");
		if(typeof ev.redo != "function") throw new Error("ev.redo=" + ev.redo + " needs to be a function!");
		
		if(history.length == 0) throw new Error("There is no history to add to! history.length=" + history.length);
		// Figure out current branch
		var branch = history[history.index];
		while(Array.isArray(branch) && branch.index > -1) {
			branch = branch[branch.index];
		}
		branch.undo.push(ev.undo);
		branch.redo.push(ev.redo);
	}
	
	function addHistory(ev) {
		// Create a new Undo, redo history
		
		
		if(history.index != history.length-1) {
			// We are in the middle of the history, so branche out
			var branch = [history[history.index]];
			branch.index = 0;
			history[history.index] = branch;
		}
		else {
			var branch = history; // Tree stem
		}
		
		// Don't create a new history entry if last one is empty!
		...var empty = branch.redo.length == 0 && branch.undo.length == 0;
		
		
		if() {
			
			var newEvent = {
				date: new Date();
				undo: ev && ev.undo ? [ev.undo] : [],
				redo: ev && ev.redo ? [ev.redo] : []
			};
			
			var newIndex = branch.push(newEvent) - 1; // Push returns the length of the array
			branch.index = newIndex;
		}
	}
	
	function addCommandHistory(command) {
		// normal mode history
		
		// Don't add to command history if the command was repeated
		if(commandHistory.length > 0 && commandHistory[commandHistory.length-1] != command) {
			commandHistory.push(command);
		}
	}
	
	function parseCommand(str) {
		/*
			Example:
			d2w = delete two words
			
			ref: http://vimdoc.sourceforge.net/htmldoc/usr_03.html
			
		*/
		
		if(typeof str != "string") throw new Error("Nothing to parse: str=" + str);
		
		console.log("Parsing vim command: " + str);
		
		
		
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
		
		
		if(str.charAt(0) == ":") {
			/*
				# Command line
				The commands starting with ":" also have a history.  That allows you to recall
				a previous command and execute it again.  These two histories are separate.
				
				set: set some option ex: :set option or :set nooption to turn it off
				a question mark shows if it's on or not: ex: :set compatible? shows compatible if its on or nocompatible if it's off
			*/
			if(str == ":set number") {
				// Turn line numbers on
			}
			else if(str == ":set nonumber") {
				// Turn line numbers off
			}
			else if(str == ":set ruler") {
				/*
					When enabled, the ruler is displayed on the right side of the status line at the bottom of the window. By default, it displays the line number, the column number, the virtual column number, and the relative position of the cursor in the file (as a percentage).
				*/
			}
			else if(str == ":set ignorecase") {
				// Ignores case when searching /i 
			}
			else if(str == ":set noignorecase") {
				// Case sensitive searching
			}
			else if(str == ":set hlsearch") {
				highlightAllSearchMatches = true;
			}
			else if(str == ":set nohlsearch") {
				highlightAllSearchMatches = false;
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
			
			
			return;
		}
		
		var file = EDITOR.currentFile;
		if(!file) return;
		
		for (var i=0; i<str.length; i++) {
			lastChar = char;
			char = getNormalMap(str.charAt(i)); // Converts to default keys
			
			if(replace) {
				console.log("repeat=" + repeat);
				// Replace the character under the cursor with char
				while(repeat--) {
					file.deleteCharacter();
					file.putCharacter(char);
				}
				EDITOR.renderNeeded();
				return done(function() {

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
				clearCommandBuffer();
			}
			else if(findLeft) {
				// Search left n times to find char
				clearCommandBuffer();
			}
			else if(findToLeft) {
				// Search left n times to find char, stops one character before the searched character
				clearCommandBuffer();
			}
			else if(findToRight) {
				// Search right n times to find char, stops one character before the searched character
				clearCommandBuffer();
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
			else if(searchString.length > 0 && char == BACKSPACE) {
				
				// Search while typing! (use regexp)
				// Arrow keys moves the caret in the input field
				// Use already existing find plugin !?
			}
			else if(searchString.length > 0 && char == ENTER) {
				// Executes search command
				// Searches left is starting with ? or right if starting with /
				inSearchCommand = true;
				searchStringHistory.push(searchString);
			}
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
			else if(searchString.length > 0 && char == UP) {
				// Use last search, like pressing up in bash
				// if there's already something in searchString, search the search history for a match
			}
			else if(searchString.length > 0 && char == DOWN) {
				// Moves the search history, like pressing down in bash
			}
			
			/*
				## Operators
				
				Operators are followed by a motion ex: d2w (delete two words)
			*/
			else if(char == "d") {
				del = true;
				foundOperator();
			}
			else if(char == "c") {
				change = true;
			}
			else if(char == "d" && lastChar == "d") {
				// Delete whole line (removes it)
				done();
			}
			else if(char == "c" && lastChar == "c") {
				// Delete whole line and go into insert mode
				done();
			}
			else if( char == "x" || (char == "l" && lastChar == "d") ) {
				// delete character under the cursor
				done();
			}
			else if( char == "X" || (char == "h" && lastChar == "d" && !repeat) ) {
				console.log("Vim: delete character left of the cursor");
				done();
			}
			else if( char == "D" || (char == "$" && lastChar == "d") ) {
				// delete to end of the line
				done();
			}
			else if( char == "D" || (char == "$" && lastChar == "d") ) {
				// delete to end of the line
				done();
			}
			else if( char == "C" || (char == "$" && lastChar == "c") ) {
				// change to end of the line
				done();
			}
			else if (char == "s" || (char == "l" && lastChar == "c") ) {
				// change one character
				done();
			}
			else if( char == "S" || (char == "c" && lastChar == "c") ) {
				// change a whole line (clears the text and goes into insert mode)
				done();
			}
			
			// # Movement
			
			/*
				## Word movement
				A word ends at a non-word character, such as a ".", "-" or ")".
			*/
			else if(char == "w") {
				// Word movement forward
				cb();
			}
			else if(char == "b") {
				// Word movement backwards
				cb();
			}
			else if(char == "e" && lastChar == "g") {
				// Moves to the previous end of a word
				cb();
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
			}
			else if(char == "h" && (del || change)) {
				console.log("Vim: Delete left n steps");
				var startRange = file.caret.index - Math.max(file.grid[file.caret.row].startIndex, file.caret.index - repeat*operatorRepeat);
				var removedText = file.deleteTextRange(startRange, file.caret.index-1);
				if(change) toInsert();
				EDITOR.renderNeeded();
				return done(function () {
					file.insertText(removedText);
				});
			}
			else if(char == "h") {
				// Move cursor left n steps
				if(file.caret.col > 0) file.moveCaretLeft(file.caret, Math.min(file.caret.col, repeat));
				clearCommandBuffer();
				EDITOR.renderNeeded();
				return;
			}
			else if(char == "l") {
				// Move cursor right n steps
				if(file.caret.col < file.grid[file.caret.row].length) {
file.moveCaretRight(file.caret, Math.min(file.grid[file.caret.row].length-file.caret.col, repeat));
				}
				clearCommandBuffer();
				EDITOR.renderNeeded();
				return;
			}
			else if(char == "0") {
				// Move to column zero
				file.moveCaret(undefined, file.caret.row, 0);
				clearCommandBuffer();
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
				file.moveCaretToEndOfLine();
				file.insertLineBreak();
return toInsert();
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
				
			}
			
			else if(char == "i") {
				// Goes to insert mode
				return toInsert();
			}
			
		}
		
		updateCommandVisual();
		
		function done(undo) {
			if(typeof undo != "function") throw new Error("done must be called with a undo function!");
			
			addHistory({
				undo: undo,
				redo: function() {
					parseCommand(vimCommandBuffer);
				}
});
			
			addCommandHistory(vimCommandBuffer);
			
			clearCommandBuffer();
		}
		
		function foundOperator() {
			if(repeat > 1) {
				operatorRepeat = repeat;
				repeat = 1;
				nr = "";
			}
		}
		
		function toInsert(undo) {
			/*
				Switch to insert mode
				insert remaining characters (str) if any
			*/
			console.log("str=" + str + " i=" + i);
			if(i < str.length-1) {
				var text = str.slice(i+1);
				file.insertText(text);
			}
			else {
				undoBeforeInsert = undo;
			}
			lastInsert = "";
			clearCommandBuffer();
			EDITOR.setMode("vimInsert");
		}
		
	}
	
	function commandLineDone(str) {
		commandLineHistory.push(str);
	}
	
	function clearCommandBuffer() {
		lastCommand = vimCommandBuffer;
		vimCommandBuffer = "";
		vimCommandCaretPosition = 0;
		clearCommandVisual(EDITOR.canvasContext);
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
	
	function normal_cmd(commandNr, command, actionNr, action) {
		
		/*
			https://hea-www.harvard.edu/~fine/Tech/vi.html#defs
			https://www.youtube.com/watch?v=5r6yzFEXajQ
			
			
		*/
		
			var file = EDITOR.currentFile;
			
			if(!file) return;
			
		var YANK = "y";
		
		if(command == YANK) pasteBuffer = ""; // Clear the paste buffer
		
		
		var startIndex = file.caret.index;
		
		var DELETE = "d";
		var CHANGE = "c";
		
			// Motions (cursor motion command)
			
		
		
		
		
		if(action == MOVE_TO_COLUMN_ZERO) {
			file.moveCaret(undefined, file.caret.row, 0);
			if(command == DELETE || command == CHANGE) {
				var str = file.deleteTextRange(file.caret.index, startIndex);
				undo.push("i" + str);
			}
			if(command == CHANGE) INSERT_MODE = true;
				EDITOR.renderNeeded();
				clearCmd();
			}
			
		var MOVE_LEFT_ONE_CHARACTER = "h";
		var VISUAL_SELECT = "v";
		
		if(action == MOVE_LEFT_ONE_CHARACTER) {
			for (var i=0; i<commandNr*actionNr; i++) {
				file.moveCaretLeft(file.caret, actionNr);
				if(command == DELETE || command == CHANGE) {
					file.deleteCharacter();
				}
				else if(command == YANK) pasteBuffer = file.text.charAt(file.caret.index) + paste;
				else if(command == VISUAL_SELECT) file.select(file.grid[file.caret.row][file.caret.col]);
			}
			EDITOR.renderNeeded();
		}
		if(lastChar == "j") file.moveCaretDown(file.caret,actionNr);
		if(lastChar == "k") file.moveCaretUp(file.caret, actionNr);
		
		
		if(lastChar == "e") file.moveCaretToEndOfNextWord()
		
		
		if(lastChar == "H") file.moveCaretToTheTopOfTheWindow();
		if(lastChar == "M") file.moveCaretToTheMiddleOfTheWindow();
		if(lastChar == "L") file.moveCaretToTheBottomOfTheWindow();
		
		if(lastChar == "g" && llChar == "g") file.moveCaretToTopOfFile();
		
		if(lastChar == "G") file.moveCaretToEndOfFile();
		
		
		// Special ? motions a=all i=in til='till f=find-worard F=find-backwards
		// Doesn't seem to be available in command line vim !?'
		if(lastChar == "a") file.selectAll(); // All what ?
		if(lastChar == "i") file.selectIn(); // Select all inside the next character ... eg ' selects all inside the single quotes
		if(lastChar == "f") file.findForward();
		if(lastChar == "F") file.findBackward();
		
		
		// Text objects w=word s=sentence p=paragraph t=tag (xml tags)
		if(lastChar == "w") file.moveCaretToNextWord()
		if(lastChar == "s") file.moveCaretToNextSentence()
		if(lastChar == "p") file.moveCaretToNextParagraph()
		if(lastChar == "t") file.moveCaretToNextTag(); // Available in XML/HTML files
		
		
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
		}
		EDITOR.hideMenu();
		return false;
	}
	
	function updateCommandVisual() {
		var ctx = EDITOR.canvasContext;
		clearCommandVisual(ctx);
		showCommandBuffer(ctx);
		renderCommandCaret(ctx);
	}
	
	function clearCommandVisual(ctx) {
		var top = EDITOR.view.canvasHeight - EDITOR.settings.gridHeight - EDITOR.settings.bottomMargin
		var textWidth = ctx.measureText(vimCommandBuffer).width;
		var left = EDITOR.view.canvasWidth - textWidth - EDITOR.settings.rightMargin;
		var height = EDITOR.settings.gridHeight;
		var width = textWidth;
		
		ctx.fillStyle = EDITOR.settings.style.bgColor;
		ctx.fillRect(left, top, width, height);
	}
	
	function showCommandBuffer(ctx) {
		
		var top = EDITOR.view.canvasHeight - EDITOR.settings.gridHeight - EDITOR.settings.bottomMargin
		var textWidth = ctx.measureText(vimCommandBuffer).width;
		var left = EDITOR.view.canvasWidth - textWidth - EDITOR.settings.rightMargin;
		
		ctx.fillStyle = EDITOR.settings.style.textColor;
		//ctx.beginPath(); // Reset all the paths!
		ctx.fillText(vimCommandBuffer, left, top);
		
	}
	
	function renderCommandCaret(ctx) {
		// Don't sow the caret if it's at the end of the buffer
		if(vimCommandBuffer.length == vimCommandCaretPosition) return;
		
	}
	
	
})();

