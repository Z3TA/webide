(function() { // An anonymous function that runs itself, so all variables are local (and not clutter global scope)
	
	"use strict";
	
	var order = 1; // A higher order makes the function run after others, default is 1. 
	
	EDITOR.on("autoComplete", autoCompleteExample, order);
	
	function autoCompleteExample(file, word, wordLength, gotOptions) {
		
		if(wordLength == 0) return; // Return early, unless we have super smart suggestions
		
		var myWords = ["EDITOR.renderNeeded()", "EDITOR.resizeNeeded()"]
		var andMoveCaret = [['EDITOR.on("")', 2], ['EDITOR.closeFile()', 1]];
		var camelSmart = [["rend", "EDITOR.renderNeeded()"], ["rez", "EDITOR.resizeNeeded()"]];
		
		var options = [];
		
		for(var i=0; i<myWords.length; i++) {
			if(myWords[i].substr(0, wordLength) == word) {
				options.push(myWords[i]);
				}
		}
		
		for(var i=0; i<andMoveCaret.length; i++) {
			if(andMoveCaret[i][0].substr(0, wordLength) == word) {
				options.push(andMoveCaret[i]);
			}
		}
		
		for(var i=0; i<camelSmart.length; i++) {
			if(camelSmart[i][0] == word) {
				options.push(camelSmart[i][1]);
			}
		}
		
		return options;
	}
	
})();
