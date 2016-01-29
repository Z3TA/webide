(function() {
	"use strict";
	

	editor.on("start", main);
	
	function main() {
		// Bind to ctrl + L
		global.keyBindings.push({charCode: 76, combo: CTRL, fun: lorem});
		
	}
	
	function lorem(file, combo, character, charCode, keyDirection) {
		var text = capitalizeFirstLetter(randomWord());
		var visibleColumns = global.view.visibleColumns;
		var words = visibleColumns / 8;
		var length = Math.ceil(words/4) + Math.floor(Math.random()*words);
		
		for(var i=0; i<length; i++) {
			text = text + " " + randomWord();
		}
		
		//text.slice(0, -1); // Remove last space
		
		text = text + "."; // Puntiation!
		
		file.insertText(text);
		file.insertLineBreak();
		
		return false; // false = prevent default browser action
		
		
		function randomWord() {
			var word =  ['ad', 'adipisicing', 'aliqua', 'aliquip', 'amet', 'anim', 'aute', 'cillum', 'commodo', 'consectetur', 'consequat', 'culpa', 'cupidatat', 'deserunt', 'do', 'dolor', 'dolore', 'duis', 'ea', 'eiusmod', 'elit', 'enim', 'esse', 'est', 'et', 'eu', 'ex', 'excepteur', 'exercitation', 'fugiat', 'id', 'in', 'incididunt', 'ipsum', 'irure', 'labore', 'laboris', 'laborum', 'Lorem', 'magna', 'minim', 'mollit', 'nisi', 'non', 'nostrud', 'nulla', 'occaecat', 'officia', 'pariatur', 'proident', 'qui', 'quis', 'reprehenderit', 'sint', 'sit', 'sunt', 'tempor', 'ullamco', 'ut', 'velit', 'veniam', 'voluptate'];
			
			return word[Math.floor(Math.random()*word.length)];
		}
		
		function capitalizeFirstLetter(string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
	}

})();