/*
	
	Proof of concept modal editing like in vi/vim
	
	Activate via context menu
	After activation: Esc = Enters command mode
	
	Contributions are welcome!
	
	Tags !? 
	
*/

(function() {
	"use strict";
	
	var modalEditMenuItem;
	var modalEditCommandWidget;
	var modalEditingCommandInput;
	
	var ENABLED = false;
	
	var ENABLE_STR = "Enable modal editing (vi keybindings)";
	var DISABLE_STR = "Disable modal editing (vi keybindings)"
	
	
	EDITOR.plugin({
		desc: "Server login dialog",
		load: function loadModalEditing() {
			modalEditMenuItem = EDITOR.addMenuItem(ENABLE_STR, enableModalEditing);
			modalEditCommandWidget = EDITOR.createWidget(buildModalEditCommandWidget);
			
		},
		unload: unloadModalEditing() {
			EDITOR.removeMenuItem(modalEditMenuItem);
			
			EDITOR.unbindKey(backToCommandMode);
			
			disableCommandKeys();
			
			modalEditCommandWidget.unload();
			
		}
		});
	
	function buildModalEditCommandWidget(widget) {
		
		modalEditingCommandInput = document.createElement("input");
		input.setAttribute("type", "text");
		input.keyup = inputKeyUp;
		
		return input;
	}
	
	function inputKeyUp(input) {
		
		var file = EDITOR.currentFile();
		
		// Open file commands !?
		// Connect to server !?
		
		if(!file) return;
		
		var cmd = input.value;
		
		var lastChar = cmd.charAt(cmd.length-1);
		var llChar = cmd.length > 1 ? cmd.charAt(cmd.length-2) : null;
		
		var rePrecedingNr = new RegExp("(\\d*)" + lastChar);
		var matchPrecedingNr = cmd.match(rePrecedingNr);
		var precedingNr = matchPrecedingNr ? parseInt(matchPrecedingNr[matchPrecedingNr.length-1]) : null;
		
		// Navigation
			// Cursor movement: ←h ↓j ↑k l→
		if(lastChar == "h") file.moveCaretLeft(file.caret, (precedingNr !== null) ? precedingNr : 1);
		if(lastChar == "i") file.moveCaretDown(file.caret, (precedingNr !== null) ? precedingNr : 1);
		if(lastChar == "k") file.moveCaretUp(file.caret, (precedingNr !== null) ? precedingNr : 1);
		if(lastChar == "l") file.moveCaretRight(file.caret, (precedingNr !== null) ? precedingNr : 1);
		
		
		if(lastChar == "e") file.moveCaretToEndOfNextWord()
		
		if(lastChar == "H") file.moveCaretToTheTopOfTheWindow();
		if(lastChar == "M") file.moveCaretToTheMiddleOfTheWindow();
		if(lastChar == "L") file.moveCaretToTheBottomOfTheWindow();
		
		if(lastChar == "g" && llChar == "g") file.moveCaretToTopOfFile();
		
		if(lastChar == "G") file.moveCaretToEnd();
		
		// Text objects
		if(lastChar == "w") file.moveCaretToNextWord()
		if(lastChar == "s") file.moveCaretToNextSentence()
		if(lastChar == "p") file.moveCaretToNextParagraph()
		if(lastChar == "t") file.moveCaretToNextTag(); // Available in XML/HTML files
		
		// Motions
		if(lastChar == "a") file.selectAll(); // All what ?
		if(lastChar == "i") file.selectIn(); // Select all inside the next character ... eg ' selects all inside the single quotes
		if(lastChar == "f") file.findForward(); 
		if(lastChar == "F") file.findBackward(); 
		
		// {Command}{Text object || Motion}
		
		// Commands
		// Can have a number before, eg repeat this command n times
		// Example: diw = delete in word
		// Example: caw = change all word, and go into insert mode
		// Example: yi) = yank all text inside parentheses (yank=copy)
		// Example: da[ = delete all text inside the brackets, including the brackets
		// Example: dtx = delete until the x
		// Example: dfx = delete until the x, including the f
		// va" = Visually select all inside the double quotes, uincluding the quotes
		
		
		}
	
	function enableModalEditing() {
		ENABLED = true;
		
		enableCommandKeys();
		var KEY_ESC = 27;
		EDITOR.bindKey({desc: "Create new file", charCode: KEY_ESC, combo: 0, fun: backToCommandMode});
		
		
		var menuItemPosition = EDITOR.removeMenuItem(modalEditMenuItem);
		modalEditMenuItem = EDITOR.addMenuItem(DISABLE_STR, disableModalEditing, menuItemPosition);
		
		EDITOR.hideMenu();
	
		EDITOR.bindKey({desc: "Reload/Update the editor", charCode: keyF5, fun: reloadEditor});
	
	}
	
	function disableModalEditing() {
		ENABLED = false;
		
		disableCommandKeys();
		EDITOR.unbindKey(backToCommandMode);
		
		
		var menuItemPosition = EDITOR.removeMenuItem(modalEditMenuItem);
		modalEditMenuItem = EDITOR.addMenuItem(DISABLE_STR, enableModalEditing, menuItemPosition);
		
		EDITOR.hideMenu();
	}
	
	function backToCommandMode() {
		
		//modalEditingCommandInput.value = "";
		modalEditingCommandInput.focus();
		
		modalEditCommandWidget.show();
		
	}
	
	function disableCommandKeys() {
	
		EDITOR.unbindKey(scrollWindowDown);
		
	}
	
	function enableCommandKeys() {
		/*
			https://stackoverflow.com/questions/5400806/what-are-the-most-used-vim-commands-keypresses
			
			https://www.youtube.com/watch?v=5r6yzFEXajQ
		*/
		
		var KEY_E = 69;
		var KEY_Y = 89;
		var KEY_F = 70;
		var KEY_B = 66;
		
		EDITOR.bindKey({desc: "Scroll the window down", charCode: KEY_E, combo: CTRL, fun: scrollWindowDown});
		EDITOR.bindKey({desc: "Scroll the window up", charCode: KEY_Y, combo: CTRL, fun: scrollWindowUp});
		EDITOR.bindKey({desc: "Scroll down one page", charCode: KEY_F, combo: CTRL, fun: scrollDownOnePage});
		EDITOR.bindKey({desc: "Scroll up one page", charCode: KEY_B, combo: CTRL, fun: scrollUpOnePage});
		
		
	}
	
	function scrollWindowDown() {
		// Keep caret at the same column
		
	}
	
	function scrollWindowUp() {
		
	}
	
	// ### Cursor movement: ←h ↓j ↑k l→
	function moveCursorLeft(file) {
		file.moveCaretLeft();
	}
	
	function moveCursorDown(file) {
		file.moveCaretDown();
	}
	
	function moveCursorUp(file) {
		file.moveCaretUp();
	}
	
	function moveCursorRight(file) {
		file.moveCaretRight();
	}
	
	
})();
	
