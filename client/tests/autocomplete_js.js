(function() {
	"use strict";
	
	/*
	EDITOR.addTest(function autocompleteThisVariables(callback) {
		EDITOR.openFile("autocompleteThisVariables.js", 'function Person(name) {\nthis.name = name;\n}\nvar myPerson = new Person("World");\n\nmyPerson.na\n', function(err, file) {
			
			var index = 92;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "name");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	*/
	
	EDITOR.addTest(function autocompleteObjects(callback) {
		EDITOR.openFile("autocompleteObjects.js", 'var object = {foo: 1, bar: 2}\nobject.b', function(err, file) {
			
			var index = 38;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "object.bar");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function autocompleteVariables(callback) {
		EDITOR.openFile("autocompleteVariables.js", 'var foobar = 1\nfoo', function(err, file) {
			
			var index = 18;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "foobar");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function autocompleteFunctionArguments(callback) {
		EDITOR.openFile("autocompleteFunctionArguments.js", 'function foo(abaCadabra, bubbelBabbel) {\n\n}\n', function(err, file) {
			
			
			var firstArg = "abaCadabra";
			var secondArg = "bubbelBabbel";
			
			var key_a = 65;
			var key_tab = 9;
			
			file.moveCaret(undefined, 1); // Move into the function
			
			file.putCharacter(firstArg.substr(0,1)); // a
			EDITOR.showFile(file);
			EDITOR.mock("keydown", {charCode: key_tab}); // tab
			
			var textOnRow = file.rowText(file.caret.row).trim();
			
			UTIL.assert(textOnRow, firstArg);
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function autocompleteAfterIf(callback) {
		EDITOR.openFile("autocompleteAfterIf.js", 'var foobar = 1\nif(foo\n', function(err, file) {
			
			var index = 21;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "foobar");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	}, 1);
	
	function autoComplete(file, index) {
		
		var key_tab = 9;
		var wordDelimiters = " \t\r\n;:()"
		
		file.moveCaretToIndex(index);
		EDITOR.mock("keydown", {charCode: key_tab}); // tab to autocomplete
		
		return file.wordAtCaret(file.caret, wordDelimiters);
	} 
	
})();


