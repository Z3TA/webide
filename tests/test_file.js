(function() {
	"use strict";
	
	/*
		
		Tests covering the functionality in File.js
		
	*/
	
	EDITOR.addTest(function moveCaret(callback) {
		
		EDITOR.openFile("moveCaret.js", "abcdefghijklmno", function(err, file) {
			
			var index = 3;
			file.moveCaret(index);
			
			if(file.caret.col != 3) throw new Error("Expected file.caret.col=" + file.caret.col + " to be 3");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
		
	});
	
	
	EDITOR.addTest(function fileWriteLine(callback) {
		
		EDITOR.openFile("testing_writeLine", "", function(err, file) {
			file.writeLine("Hello world!");
			file.writeLine("Hello again!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
		
	});
	
	
})();
