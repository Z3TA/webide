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

		console.log("autoCompleteJsMisc: lbLength=" + lbLength + " whiteSpace.length=" + whiteSpace.length + "  ");

		/*
			math skill: 
			} = 1 char
			white space before } = whiteSpace
			two lines breaks = lbLength*2
			() { = 4 chars
			
			gotcha: EDITOR.autocomplete uses file.moveCaretLeft for stepping,
			so if the file is loaded as code, it wont step over white space!
			and line break counts as one step even though it's CRLF
		*/
		if(file.fullAutoIndentation) {
			whiteSpace = "";
			lbLength = 1;
		}

		if("function".substr(0, wordLength) == word) {
			options.push(["function () {" + file.lineBreak + file.lineBreak + whiteSpace + "}", 5+lbLength*2+whiteSpace.length]);
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
	

	// TEST-CODE-START

	EDITOR.addTest(false, function testAutoCompleteFunctionStr(callback) {

		EDITOR.openFile("testAutoCompleteFunctionStr.js", "functio\n", function(err, file) {
			if(err) throw err;

			file.moveCaretToIndex(7);

			EDITOR.autoComplete();

			UTIL.assert(file.rowText(0, false), "function () {");
			UTIL.assert(file.caret.col, 9);

			EDITOR.closeFile(file);

			EDITOR.openFile("testAutoCompleteFunctionStr2.js", "{\n\t{\n\t\tfunctio\n", function(err, file) {
				if(err) throw err;

				file.moveCaretToIndex(14);

				EDITOR.autoComplete();

				UTIL.assert(file.rowText(2, false), "function () {");
				UTIL.assert(file.caret.col, 9);

				EDITOR.closeFile(file);

				EDITOR.openFile("testAutoCompleteFunctionStr3.js", "{\r\n\t{\r\n\t\tfunctio\r\n", function(err, file) {
					if(err) throw err;

					file.moveCaretToIndex(16);

					EDITOR.autoComplete();

					UTIL.assert(file.rowText(2, false), "function () {");
					UTIL.assert(file.caret.col, 9);

					callback(true);

				});

			});

		});

	});

	// TEST-CODE-END
	
})();
