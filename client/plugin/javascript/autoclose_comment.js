(function() {
	
	"use strict";
	
	var active = false;
	
	EDITOR.plugin({
		desc: "Auto close multi line comments",
		load: function loadAutocloseComment() {
			
			EDITOR.on("fileShow", activateAutocloseComment);
			
		},
		unload: function unloadAutocloseComment() {
			EDITOR.removeEvent("fileShow", activateAutocloseComment);
		
			if(active) deactivate();
		}
	});
	
	function activateAutocloseComment(file) {
		if(UTIL.getFileExtension(file.path) == "js") {
			if(!active) activate();
		}
		else {
			if(active) deactivate();
		}
	}
	
	function activate() {
		EDITOR.on("keyPressed", autocloseComment);
		active = true;
	}
	
	function deactivate() {
		EDITOR.removeEvent("keyPressed", autocloseComment);
		active = false;
	}
	
	function autocloseComment(file, character, combo) {
		console.log("autocloseComment: character=" + character);
		
		if(!file) return true;
		if(!EDITOR.input) return true;
		if(UTIL.getFileExtension(file.path) != "js") return true;
		if(character != "*") return true;
		
		console.log("comment !? " + UTIL.lbChars(file.text.charAt(file.caret.index-1)));
		
		if(file.text.charAt(file.caret.index-1) != "/") return true;
		
		// Do not insert the closing if it's already there! eg we made the closing first and are now making the opening.
		var indentation = file.grid[file.caret.row].indentation;
		for(var row = file.caret.row; row < file.grid.length && file.grid[row].indentation == indentation; row++) {
			if(file.grid[row].length == 2 && file.grid[row][0].char == "*" && file.grid[row][1].char == "/") {
				//console.log("yaya");
				return true;
			}
		}
		
		//console.log("insrta!");
		file.insertText("*" + file.lineBreak + file.lineBreak + "*/");
		file.moveCaretLeft(file.caret, 3);
		return false;
		
	}
	
})();
