(function() {
	
	"use strict";
	
	var order = 99;
	
	EDITOR.on("autoComplete", autoCompleteJsMisc, order);
	
	
	function autoCompleteJsMisc(file, word, wordLength, gotOptions) {
		
		if(wordLength === 0) return;
		if(gotOptions > 0) return; // Prefer other options like variables and functions
		
		var options = [];
		
		var lbLength = file.lineBreak.length;
		var whiteSpace = file.whiteSpaceOnRow();

		var lbLength = file.lineBreak.length;

		if("function".substr(0, wordLength) == word) {
			options.push(["function () {" + file.lineBreak + file.lineBreak + whiteSpace + "}", 4+lbLength*2+whiteSpace.length]);
		}
		else if("for".substr(0, wordLength) == word) {
			options.push(["for (var i=0; i<.length; i++) {" + file.lineBreak + file.lineBreak + whiteSpace + "}", 16+lbLength*2+whiteSpace.length]);
		}
		else if("switch".substr(0, wordLength) == word) {
			options.push(["switch() {" + file.lineBreak + whiteSpace + file.indentation + "case :    ; break" + file.lineBreak + whiteSpace + "}", 21+lbLength*2+whiteSpace.length*2+file.indentation.length]);
		}
		else if("if".substr(0, wordLength) == word) {
			options.push(["if () {" + file.lineBreak + file.lineBreak + whiteSpace + "}", 4+lbLength*2+whiteSpace.length]);
		}
		
		return options;
	}
	
	
})();
