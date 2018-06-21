/*
	
	Proof of concept modal editing like in vi/vim
	The goal of this plugin is to let old vi/vim users use their reflexes.
	"Good design is when the program does what the user expects will happen"
	
	Activate via context menu
	After activation: Esc = Enters command mode (or should we use tab!?)
	
	Problem: A lot of key bindings overlap "modern" key bindings like Ctrl+V for pasting, while in vim it goes into visual block mode.
	Solution: Disable other key bindings when enabling modal editing and Enable them again when Disabling modal editing
	
	
	Visual Mode: Basically highlight stuff ... plus some magic !?
	
	
	Emacs:
	Ctrl + K = Kill, kills in context, eg kill inside a paranthesis removes all text from the cursor to the end of the paranthesis
	
	
	Hmm, we probably don't need editor first class support for modal mode !
	For example Ctrl+E should show the file explorer in all modes !?
	Do we really need .mode in keybinding options !?
	
*/

(function() {
	"use strict";
	
	if(window.location.href.indexOf("&vim") == -1) return; // Work in progress!
	
	var vimMenuItem;
	var vimCommandBuffer;
	
	var VIM_ACTIVE = false;
	
	var originalNormalMap = {}; // The original/default vim normal key mapping
	originalNormalMap["h"] = function moveCursorLeft(repeat) {
		var file = EDITOR.currentFile;
		if(!file) return;
		if(file.caret.col > 0) file.moveCaretLeft(file.caret, Math.min(file.caret.col, repeat));
	}
	originalNormalMap["h"] = function moveCursorLeft(repeat) {
		var file = EDITOR.currentFile;
		if(!file) return;
		if(file.caret.col > 0) file.moveCaretLeft(file.caret, Math.min(file.caret.col, repeat));
	}
	originalNormalMap["0"] = function moveToColumnZero() {
		var file = EDITOR.currentFile;
		if(!file) return;
		file.moveCaret(undefined, file.caret.row, 0);
	}
	
	var normalMap = {};
	for (var str in originalNormalMap) {
		normalMap[str]  = originalNormalMap[str];
	}
	
	EDITOR.plugin({
		desc: "Modal editing using vim key bindings",
		load: function loadVim() {
			vimMenuItem = EDITOR.addMenuItem("Vim/modal mode", toggleVim);
			
			EDITOR.on("keyPressed", vimKeyPress);
			
			var keySpace = 32;
			EDITOR.bindKey({desc: "Toggle vim/modal mode", fun: toggleVim, charCode: keyF9, combo: SHIFT});
			
		},
		unload: function unloadVim() {
			EDITOR.removeMenuItem(vimMenuItem);
			EDITOR.unbindKey(toggleVim);
			EDITOR.removeEvent("keyPressed", vimKeyPress);
		}
		});
		
	
	
		
	function vimKeyPress(file, char, combo) {
			
		if(!VIM_ACTIVE) return true; // Do the default
		
		/*
				Should we use flags eg. command="delete" when detecting d ? 
				It's better to always parse the command though, then you can edit the command and it will ease debugging and testing
				
			*/
			
		vimCommandBuffer += char;
		
		if(vimCommandBuffer.charAt(0) == ":") return do_cmdline(vimCommandBuffer.splice(1))
			
		// if <CR> or <Esc> and :  do_cmdline
		
		var command = vimCommandBuffer.match(/(\d+)?([^\d])?(\d+)?(.)/);
			
		if(command) normal_cmd(command[1] || 1, command[2], command[3] || 1, command[3]);
		
		return false; // Prevent defult browser action
		}
	
	
	function nmap(str, oldStr) {
		// Allow recursive mapping
		normalMap[str] = normalMap[oldStr];
	}
	
	function nnoremap(str, originalStr) {
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
		if(lastChar == "l") file.moveCaretRight(file.caret, actionNr);
		
		
		if(lastChar == "e") file.moveCaretToEndOfNextWord()
		
		var GOTO_FIRST_LINE_ON_SCREEN = "H";
		var GOTO_MIDDLE_LINE_ON_SCREEN = "M";
		var GOTO_LAST_LINE_ON_SCREEN = "L";
		
		
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
	
	function do_cmdline(command) {
		// Open file commands !?
		// Connect to server !?
	}
	
	function toggleVim() {
		if(VIM_ACTIVE) {
			VIM_ACTIVE = false;
			EDITOR.updateMenuItem(vimMenuItem, false);
		}
		else {
			VIM_ACTIVE = true;
			EDITOR.updateMenuItem(vimMenuItem, true);
		}
		EDITOR.hideMenu();
	}
	
	
})();

