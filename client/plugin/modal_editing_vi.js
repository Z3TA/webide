/*
	
	Proof of concept modal editing like in vi/vim
	The goal of this plugin is to let old vi/vim users use their reflexes.
	And make it so you can use the editor conforably on a laptop without a mouse.
	Without having to reach for arrow or navigation keys.
	
	"Good design is when the program does what the user expects will happen"
	
	Problem: A lot of key bindings overlap "modern" key bindings like Ctrl+V for pasting, while in vim it goes into visual block mode.
	Solution: Existing key bindings have to co-exist with vim/modal mode. We only want the "essential" vim commands.
	We know we will *never* be able to satisfy hardcore vim users. 
	
	Visual Mode: Basically highlight stuff ... plus some magic !? We will only support normal mode!
	But maybe we'll add some custom commands !?
	
	You are free to make your own vim plugin!
	If you want the full vim experience you will probably need to run vim via the built in terminal though :P
	
	We probably don't need editor to have built insupport for modal mode !?
	For example Ctrl+E should show the file explorer in all modes !?
	We don't really need option.mode in keybinding options.
	
	Some vim key bindings:
	
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
	
	
*/

(function() {
	"use strict";
	
	if(window.location.href.indexOf("&vim") == -1) return; // Work in progress!
	
	var vimMenuItem;
	var vimCommandBuffer = "";
	var searchString = "";
	var searchStringHistory = [];
	var commandLineHistory = [];
	var highlightAllSearchMatches = false;
	
	var COMMAND_NORMAL = false;
	
	// The original/default vim normal key mapping
	// a=a, b=b, c=c etc so they can be remapped
	var originalNormalMap = {}; 
	
	var normalMap = {};
	for (var str in originalNormalMap) {
		normalMap[str]  = originalNormalMap[str];
	}
	
	EDITOR.plugin({
		desc: "Modal editing using vim key bindings",
		load: function loadVim() {
			vimMenuItem = EDITOR.addMenuItem("Vim/modal mode", toggleVim);
			
			EDITOR.on("keyPressed", vimKeyPress);
			
			var charCodeSpace = 32;
			EDITOR.bindKey({desc: "Toggle vim/modal mode", fun: toggleVim, charCode: charCodeSpace, combo: SHIFT});
			
			EDITOR.addRender(showCommandBuffer);
			
		},
		unload: function unloadVim() {
			EDITOR.removeMenuItem(vimMenuItem);
			EDITOR.unbindKey(toggleVim);
			EDITOR.removeEvent("keyPressed", vimKeyPress);
			EDITOR.removeRender(showCommandBuffer);
		}
		});
		
	
	
		
	function vimKeyPress(file, char, combo) {
			
		if(!COMMAND_NORMAL) return true; // Do the editor defailt (insert)
		
		vimCommandBuffer += char;
		
		parseCommand(vimCommandBuffer);
		
		return false; // Prevent defult browser action
		}
	
	function parseCommand(str) {
		
		/*
			Example:
			d2w = delete two words
			
			ref: http://vimdoc.sourceforge.net/htmldoc/usr_03.html
			
		*/
		
		// https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
		var END = String.fromCharCode(35);
		var HOME = String.fromCharCode(36);
		var BACKSPACE = String.fromCharCode(8);
		var UP = String.fromCharCode(38);
		var DOWN = String.fromCharCode(40);
		var LEFT = String.fromCharCode(37);
		var RIGHT = String.fromCharCode(39);
		
		var commandNr = "";
		var repeat = 1;
		var char = "";
		var lastChar = "";
		var findLeft = false;
		var findRight = false;
		var findToLeft = false;
		var findToRight = false;
		var inSearchCommand = false;
		
		
		if(str.charAt(0) == ":") {
			/*
				# Command line
				The commands starting with ":" also have a history.  That allows you to recall
				a previous command and execute it again.  These two histories are separate.
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
			
			if(UTIL.isNumeric(char)) {
				commandNr += char;
				repeat = parseInt(commandNr);
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
				searchString = searchString.slice(0,-1);
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
			
			// ## Word movement
			// A word ends at a non-word character, such as a ".", "-" or ")".
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
			else if(char == "$" || char == END) {
				// moves the cursor to the end of a line
				
			}
			else if(char == "^") {
				// moves to the first non-blank character of the line
			}
			else if(char == "0" || char == HOME) {
				// moves to the very first character of the line
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
				if(commandNr == "") {
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
				// Adds a new line and goes into input mode
				COMMAND_NORMAL = false;
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
			
		}
		
		updateCommandVisual();
		}
	
	function commandLineDone(str) {
		commandLineHistory.push(str);
	}
	
	function clearCommandBuffer() {
		vimCommandBuffer = "";
		searchString = "";
		
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
		// c = change, deletes and goes into input mode
		// ex: ci' = change (delete) inside single quote and go into input mode
		
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
		// I/A = move to the beginning/end of line and go into input mode
		// o/O = insert new line above/below current line and go into input mode
		
		// ex: yyp = yank current line, then paste it
		
		
		// Macros: A sequence of commands recorded to a register
		// ex: q{register} ... starts recording the marcro ... do stuff ... q = ends the macro
		// @{register} = replays the macro
		
		
		
	}
	
	
	function toggleVim() {
		if(COMMAND_NORMAL) {
			COMMAND_NORMAL = false;
			EDITOR.updateMenuItem(vimMenuItem, false);
		}
		else {
			COMMAND_NORMAL = true;
			EDITOR.updateMenuItem(vimMenuItem, true);
		}
		EDITOR.hideMenu();
	}
	
	function updateCommandVisual() {
		var ctx = EDITOR.canvasContext;
		clearCommandVisual(ctx);
		showCommandBuffer(ctx);
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
	
	
})();

