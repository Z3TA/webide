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
	
	var INSERT_MODE = false;
	
	var originalNormalMap = {}; // The original/default vim key mapping
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
	
	
	var normalMap = {};
	for (var str in originalNormalMap) {
		normalMap[str]  = originalNormalMap[str];
	}
	
	EDITOR.plugin({
		desc: "Modal editing using vim key bindings",
		load: function loadVim() {
			vimMenuItem = EDITOR.addMenuItem("Vim mode", toggleVim);
			
			EDITOR.addMode("vim_normal", {}); // Command mode
			EDITOR.addMode("vim_insert", {});
			
			bindKeys();
		},
		unload: function unloadVim() {
			EDITOR.removeMenuItem(vimMenuItem);
				
			unbindKeys();
			
			delete EDITOR.modes["vim_normal"];
			delete EDITOR.modes["vim_insert"];
		}
		});
		
	function bindKeys() {
		/*
			https://stackoverflow.com/questions/5400806/what-are-the-most-used-vim-commands-keypresses
			
			https://www.youtube.com/watch?v=5r6yzFEXajQ
		*/
		
		var KEY_E = 69;
		var KEY_Y = 89;
		var KEY_F = 70;
		var KEY_B = 66;
		
		EDITOR.bindKey({desc: "cursor left", charCode: KEY_H, combo: CTRL, fun: scrollWindowDown, disableOthers: true}) );
		
		EDITOR.bindKey({desc: "Scroll the window down", charCode: KEY_E, combo: CTRL, fun: scrollWindowDown, disableOthers: true}) );
		EDITOR.bindKey({desc: "Scroll the window up", charCode: KEY_Y, combo: CTRL, fun: scrollWindowUp, disableOthers: true}) );
		EDITOR.bindKey({desc: "Scroll down one page", charCode: KEY_F, combo: CTRL, fun: scrollDownOnePage, disableOthers: true}) );
		EDITOR.bindKey({desc: "Scroll up one page", charCode: KEY_B, combo: CTRL, fun: scrollUpOnePage, disableOthers: true}) );
		
		vimBind("h", function cursorLeft() {
			
		});
		
	}
	
	function unbindKeys() {
		EDITOR.unbindKey(normalMode);
		EDITOR.unbindKey(scrollWindowDown);
		EDITOR.unbindKey(scrollWindowUp);
		EDITOR.unbindKey(scrollDownOnePage);
		EDITOR.unbindKey(scrollUpOnePage);
	}
	
		
	function keyPressed(file, char, combo) {
			
			/*
				Should we use flags eg. command="delete" when detecting d ? 
				It's better to always parse the command though, then you can edit the command and it will ease debugging and testing
				
			*/
			
		if(EDITOR.mode == "vim_insert") {
				
			//if(backspace ...
				
			file.putCharacter(char);
			
			return false; // Prevent defult browser action
			}
		else if(EDITOR.mode == "vim_normal") {
			
			vimCommandBuffer += char;
			
			if(vimCommandBuffer.charAt(0) == ":") return do_cmdline(vimCommandBuffer.splice(1))
			
		// if <CR> or <Esc> and :  do_cmdline
		
			var command = vimCommandBuffer.match(/(\d+)?([^\d])?(\d+)?(.)/);
			
		if(command) normal_cmd(command[1] || 1, command[2], command[3] || 1, command[3]);
			
			return false; // Prevent defult browser action
		}
		else return true; // Allow default browser action
	}
	
	function esc() {
		EDITOR.mode = "vim_normal";
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
			
		var MOVE_TO_COLUMN_ZERO = "0";
		
		
		for (var i=0; i<commandNr; i++) {
			
			
			for (var i=0; i<actionNr; i++) {
				
				// 
				
				if(action == MOVE_TO_COLUMN_ZERO) file.moveCaret(undefined, file.caret.row, 0);
				else if(action == MOVE_LEFT_ONE_CHARACTER) file.moveCaretLeft(file.caret, actionNr);
				
			}
			
			// Commands
			
		}
		
		
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
		if(EDITOR.mode.slice(0, 3) == "vim") {
			EDITOR.mode = "default";
			EDITOR.updateMenuItem(vimMenuItem, false);
		}
		else {
			EDITOR.mode = "vim_normal";
			EDITOR.updateMenuItem(vimMenuItem, true);
		}
		EDITOR.hideMenu();
	}
	
	function normalMode() {
		// Goes into "normal" mode
		EDITOR.mode = "vim_normal";
		return false;
	}
	
	function scrollWindowDown() {
		// Keep caret at the same column
		
		return false;
	}
	
	function scrollWindowUp() {
		
		return false;
	}
	
	function scrollDownOnePage() {
		
		return false;
	}
	
	function scrollUpOnePage() {
		
		return false;
	}
	
})();

