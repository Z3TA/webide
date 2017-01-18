

(function() {
	"use strict";
	
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
			
			assert(textOnRow, firstArg);
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	}, 1);
	
	
	
	
})();


