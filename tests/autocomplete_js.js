(function() {
	"use strict";
	
	/*
	editor.addTest(function autocompleteThisVariables(callback) {
		editor.openFile("autocompleteThisVariables.js", 'function Person(name) {\nthis.name = name;\n}\nvar myPerson = new Person("World");\n\nmyPerson.na\n', function(err, file) {
			
			var index = 92;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "name");
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	}, 1);
	*/
	
	editor.addTest(function autocompleteObjects(callback) {
		editor.openFile("autocompleteObjects.js", 'var object = {foo: 1, bar: 2}\nobject.b', function(err, file) {
			
			var index = 38;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "object.bar");
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	});
	
	editor.addTest(function autocompleteVariables(callback) {
		editor.openFile("autocompleteVariables.js", 'var foobar = 1\nfoo', function(err, file) {
			
			var index = 18;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "foobar");
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	});
	
	editor.addTest(function autocompleteFunctionArguments(callback) {
		editor.openFile("autocompleteFunctionArguments.js", 'function foo(abaCadabra, bubbelBabbel) {\n\n}\n', function(err, file) {
			
			
			var firstArg = "abaCadabra";
			var secondArg = "bubbelBabbel";
			
			var key_a = 65;
			var key_tab = 9;
			
			file.moveCaret(undefined, 1); // Move into the function
			
			file.putCharacter(firstArg.substr(0,1)); // a
			
			editor.mock("keydown", {charCode: key_tab}); // tab
			
			var textOnRow = file.rowText(file.caret.row).trim();
			
			UTIL.assert(textOnRow, firstArg);
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	});
	
	function autoComplete(file, index) {
		
		var key_tab = 9;
		var wordDelimiters = " \t\r\n;:()"
		
		file.moveCaretToIndex(index);
		editor.mock("keydown", {charCode: key_tab}); // tab to autocomplete
		
		return file.wordAtCaret(file.caret, wordDelimiters);
	} 
	
})();


