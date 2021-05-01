(function() {

/*
Show transparent bracket as a suggestion, then insert them if you press enter or tab
*/

"use strict";

	var activated = false;
	var renderFunction;
	var reKeywords = /for|if|while|do|function/; // Only suggest curly brackets after these
	
EDITOR.plugin({
		desc: "Bracket suggestions",
load: function() {

			EDITOR.on("fileChange", suggestBrackets);
			
			var TAB = 9;
			EDITOR.bindKey({desc: "Insert brackets maybe", charCode: TAB, fun: insertBracketsMaybe});
			
			var ENTER = 13;
			// Need to run before keyboard_enter.js
			EDITOR.bindKey({desc: "Insert brackets and new line maybe", order: 90, charCode: ENTER, fun: insertBracketsAndNewLineMaybe});
			
},
unload: function() {

			EDITOR.removeEvent("fileChange", suggestBrackets);
			EDITOR.unbindKey(insertBracketsMaybe);
			EDITOR.unbindKey(insertBracketsAndNewLineMaybe);
			
			activated = false;
}
});

	function insertBracketsMaybe(file) {
		if(!activated) return true;
		if(!file) return true;
		
		var col = file.caret.col;
		if(col == 0) return true;
		
		var row = file.caret.row;
		
		if(col > 0 && file.grid[row][col-1].char!=" ") file.putCharacter(" ");
		
		file.putCharacter("{");
		file.putCharacter("}");
		file.moveCaretLeft();
		EDITOR.renderNeeded();
		
		activated = false;
		
		return PREVENT_DEFAULT;
	}
	
	function insertBracketsAndNewLineMaybe(file) {
		
		if(!activated) return true;
		if(!file) return true;
		
		var col = file.caret.col;
		if(col == 0) return true;
		
		var row = file.caret.row;
		
		if(col > 0 && file.grid[row][col-1].char!=" ") file.putCharacter(" ");
		
		file.putCharacter("{");
		file.insertLineBreak();
		file.putCharacter("}");
		file.moveCaretLeft();
file.moveCaretLeft();
		EDITOR.renderNeeded();
		
		activated = false;
		
		return PREVENT_DEFAULT;
	}
	
	function deactivate() {
		activated = false;
		EDITOR.removeRender(renderFunction);
		EDITOR.renderNeeded();
	}
	
	function suggestBrackets(file, change, text, index) {
		//console.log("suggestBrackets: text=" + text);
		
		if(change != "insert") return true;
		
		if(activated && text != " ") deactivate();
		
		if(text != ")") return true;
		
		var row = file.caret.row;
		var col = file.caret.col;
		var rowText = file.rowText(row);
		// find matching parenthese
		var pL = 0;
		var pR = 0;
		var char = "";
		var word = "";
		for(var i=col-1; i>-1; i--) {
			char = file.grid[row][i].char;
			//console.log("suggestBrackets: i=" + i + " char=" + char + " pL=" + pL + " pR=" + pR + "");
			if(pL==pR && char==".") return true;
			
			if(pL==pR) {
				word = char + word;
			}
			
			if(pL==pR && word && char == " ") {
				break;
			}
			
			if(char=="(") {
				pL++;
				
			}
			else if(char==")") pR++;
		}
		
		//console.log("suggestBrackets: word=" + word);
		
		if(!reKeywords.test(word)) return true;
		
		if( file.caret.eol || file.grid[row][col].char==" " ) {
			if(activated) deactivate();
			
			renderFunction = renderBrackets("{}");
			EDITOR.addRender(renderFunction, 2333);
			activated = true;
			setTimeout(deactivate, 2000);
		}
		
	}
	
	function renderBrackets(stringToRender) {
		var file = EDITOR.currentFile;
		if(!file) return;
		
		var row = file.caret.row;
		var col = file.caret.col + 1;
		var bufferStartRow = file.startRow;
		var screenStartRow = 0;
		
		var walker = EDITOR.gridWalker(file.grid[row], col);
		while(!walker.done) walker.next();
		var colAdjustment = walker.extraSpace;
		
		var top = Math.floor(EDITOR.settings.topMargin + (row - bufferStartRow + screenStartRow) * EDITOR.settings.gridHeight);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + colAdjustment + ((file.grid[row].indentation) * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth);
		var middle = top + Math.floor(EDITOR.settings.gridHeight/2);
		
		//console.log("suggestBrackets: Rendering on left=" + left + " middle=" + middle);
		
		return function renderBracketSuggestion(ctx) {
			
			ctx.fillStyle = UTIL.makeColorTransparent(EDITOR.settings.style.textColor, 50);;
			
			ctx.fillText(stringToRender, left, middle);
		}
	}
	
})();
