(function() {
	"use strict";
	
	/*
		
		Tests covering the functionality in File.js
		
	*/
	
	editor.addTest(function moveCaret(callback) {
		
		editor.openFile("moveCaret.js", "abcdefghijklmno", function(err, file) {
			
			var index = 3;
			file.moveCaret(index);
			
			if(file.caret.col != 3) throw new Error("Expected file.caret.col=" + file.caret.col + " to be 3");
			
			editor.closeFile(file.path);
			callback(true);
			
		});
		
	});
	
	
	editor.addTest(function fileWriteLine(callback) {
		
		editor.openFile("testing_writeLine", "", function(err, file) {
			file.writeLine("Hello world!");
			file.writeLine("Hello again!");
			
			editor.closeFile(file.path);
			
			callback(true);
		});
		
	});
	
	
})();
