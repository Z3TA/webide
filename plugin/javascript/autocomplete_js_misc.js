(function() {
	
	"use strict";
	
	var order = 99;
	
	editor.on("autoComplete", autoCompleteJsMisc, order);
	
	
	function autoCompleteJsMisc(file, word, wordLength, gotOptions) {
		
		if(wordLength === 0) return;
		
		var options = [];
		
		var lbLength = file.lineBreak.length;
		
			if("function".substr(0, wordLength) == word) {
			options.push(["function () {" + file.lineBreak + file.lineBreak + "}", 3 + lbLength*2]);
		}
		else if("for".substr(0, wordLength) == word) {
			options.push(["for (var i=0; i<.length; i++) {" + file.lineBreak + file.lineBreak + "}", 14 + lbLength*2]);
		}
		else if("switch".substr(0, wordLength) == word) {
			options.push(["switch() {" + file.lineBreak + "case :    ; break" + file.lineBreak + "}", 19 + lbLength*2]);
		}
		else if("if".substr(0, wordLength) == word) {
			options.push(["if () {" + file.lineBreak + file.lineBreak + "}", 2 + lbLength*2]);
		}
		
		return options;
	}
	
	
})();
