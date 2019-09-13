(function() {
	"use strict";
	
	var winMenuLorem;
	
	EDITOR.plugin({
		desc: "Lorem ipsum generator",
		load: loadLoremIpsum,
		unload: unloadLoremIpsum,
	});
	
	function loadLoremIpsum() {
		// Bind to ctrl + L
		EDITOR.bindKey({desc: "Insert lorem ipsum", charCode: 76, combo: CTRL, fun: lorem});
		winMenuLorem = EDITOR.windowMenu.add("Lorem ipsum", ["Tools", 20], lorem);
	}
	
	function unloadLoremIpsum() {
		EDITOR.unbindKey(lorem);
		EDITOR.windowMenu.remove(winMenuLorem);
	}
	
	function lorem(file, combo, character, charCode, keyDirection) {
		var text = capitalizeFirstLetter(randomWord());
		var visibleColumns = EDITOR.view.visibleColumns;
		var words = visibleColumns / 8;
		var length = Math.ceil(words/4) + Math.floor(Math.random()*words);
		
		for(var i=0; i<length; i++) {
			text = text + " " + randomWord();
		}
		
		//text.slice(0, -1); // Remove last space
		
		text = text + "."; // Puntiation!
		
		file.insertText(text);
		file.insertLineBreak();
		
		EDITOR.stat("lorem_ipsum");
		
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