(function() {
	
	"use strict";
	
	EDITOR.plugin({
		desc: "Shift+scroll to change emoji modifer",
		load: function loadEmojiRoller() {
			
			console.log("Loading changeEmojiModifier:");
			
			EDITOR.on("mouseScroll", changeEmojiModifier);
			
			
		},
		unload: function unloadEmojiRoller() {
			
			EDITOR.removeEvent("mouseScroll", changeEmojiModifier);
			
		}
	});
	
	function changeEmojiModifier(dir, steps, combo, scrollEvent) {
		console.log("changeEmojiModifier: combo.sum=" + combo.sum + " dir=" + dir);
		if(combo.sum != SHIFT) return;
		
		var file = EDITOR.currentFile;
		
		var caret = EDITOR.mousePositionToCaret(EDITOR.canvasMouseX, EDITOR.canvasMouseY, 0);
		
		if(caret.eol) {
			if(file.grid[caret.row].length > 0) {
console.log("changeEmojiModifier: Caret on end of line. Stepping left...");
file.moveCaretLeft(caret);
			}
else {
				console.log("changeEmojiModifier: On empty line!");
				return;
			}
		}
		
		var char = file.getCharacterAt(caret);
		console.log("changeEmojiModifier: dir=" + dir + " caret=" + JSON.stringify(caret) + " char=" + char);
		
		if(dir != -1 && dir != 1) throw new Error("Expected dir=" + dir + " to be either one or minus one!");
		
		// Find all combinations (http://unicode.org/reports/tr51/)
		
		var skinTones = [
			"\u1F3FB", // light skin tone
			"\u1F3FC", // medium-light skin tone
			"\u1F3FD", // medium skin tone
			"\u1F3FE", // medium-dark skin tone
			"\u1F3FF" // dark skin tone
		];
		
		var surrogateModifierEndings = [ // Colors
			"\uDFFB",
			"\uDFFC",
			"\uDFFD",
			"\uDFFE",
			"\uDFFF"
		];
		
		for(var i=0; i<char.length; i++) {
			if(skinTones.indexOf( char[i] ) != -1) {
				console.log("changeEmojiModifier: Rotating skintones...");
				return rotate(skinTones, i);
			}
			else if(  UTIL.isSurrogateModifierStart( char[i] ) && UTIL.isSurrogateModifierEnd(char[i+1])  ) {
				console.log("changeEmojiModifier: Rotating surrogateModifierEndings...");
				return rotate(surrogateModifierEndings, i+1);
			}
		}
		
		if( char.length==2 && UTIL.isSurrogateStart(char[0]) && UTIL.isSurrogateEnd(char[1]) ) {
			// Attempt to give it a color
			file.deleteCharacter(caret);
			char += "\uD83C" // Surrogate modifier start
			char += surrogateModifierEndings[0]; // First color
			
			file.putCharacter(char, caret);
			
			file.moveCaretLeft(caret); // Should step over both modifier and surrogate
			return rotate(surrogateModifierEndings, 3);
		}
		
		function rotate(comboArr, charIndex) {
			var charArr = char.split('');
			var i = comboArr.indexOf(charArr[charIndex]);
			
			
			if(i == -1) throw new Error("changeEmojiModifier: charIndex=" + charIndex + " char=" + char + " charArr=" + JSON.stringify(charArr) + " comboArr=" + JSON.stringify(comboArr));
			
			var j = i;
			if(dir==1 && j == comboArr.length-1) j = 0;
			if(dir==-1 && j == 0) j = comboArr.length-1;
			else j += dir;
			
			var newChar = char.slice(0, charIndex) + comboArr[j] + char.slice(charIndex+1, char.length);
			
			console.log("changeEmojiModifier: char=" + char + " (" + JSON.stringify(charArr) + ") newChar=" + newChar + " (" + JSON.stringify(newChar.split('')) + ") charIndex=" + charIndex + " j=" + j + " comboArr[" + j + "]=" + comboArr[j] + " comboArr=" + JSON.stringify(comboArr) + "  i=" + i + "  ");
			
			console.log("changeEmojiModifier: caret=" + JSON.stringify(caret));
			
			file.deleteCharacter(caret);
			console.log("changeEmojiModifier: After deletion caret=" + JSON.stringify(caret));
			
			file.putCharacter(newChar, caret);
			
			EDITOR.renderNeeded();
		}
		
	}
	
})();
