/*
	Autocomplete caluclations like 1+1=
*/
(function() {

	EDITOR.plugin({
		desc: "Autocomplete math calculations",
		load: function loadAutocompleteCalcMath() {

			var order = 150; // After autocomplete_js.js but before chatgpt

			EDITOR.on("autoComplete", autoCompleteMath, order);

		},
		unload: function unloadAutocompleteCalcMath() {

			EDITOR.removeEvent("autoComplete", autoCompleteMath);

		}
	});

	function autoCompleteMath(file, wordToComplete, wordLength, gotOptions, autocompleteCb) {
		console.log("txt_calc: wordToComplete=" + wordToComplete);
		
		var characterAt = file.getCharacterAt(file.caret.index-1);

		if(characterAt != "=") return;

		var row = file.rowText().trim();

		if(row.slice(0,2) == "//") row = row.slice(2); // Inside a comment

		// Ignore everything left of colon:
		var colon = row.indexOf(":");
		if(colon != -1) row = row.slice(colon+1);

		var equal = row.indexOf("=");
		if(equal != -1) {
			var right = row.slice(equal+1);
			var left = row.slice(0, equal);
		}
		else {
			var left = row;
		}

		// some systems use comma as decimal separator...
		// and others use commas as thousand separator...
		var reThousand = /(\d+),(\d\d\d)/g;
		var reDecimal = /(\d),(\d)/g;
		
		if(left.match(reThousand)) {
			left = left.replace(reThousand, "$1$2"); // Remove thousand separators
			var thousandSeparator = ",";
		}
		else if(left.match(reDecimal)) {
			if(left.indexOf(".") != -1) {
				var thousandSeparator = ".";
				left = left.replace(/\./g, ""); // Remove thousand separators
			}
			left = left.replace(reDecimal, "$1.$2");
		}
		
		console.log("txt_calc: left=" + left + " right=" + right + " thousandSeparator=" + thousandSeparator);

		EDITOR.eval(left, function(err, result) {
			if(err) {
				console.log("txt_calc: eval err: " + err.message);
				return autocompleteCb(null);
			}

			console.log("txt_calc: eval result: " + result);

			if(typeof result == "number" && thousandSeparator) {
				result = result.toLocaleString();

				if(result.match(reThousand) && thousandSeparator == ".") {
					result = result.replace(reThousand, "$1.$2");
				}

			}
			else if(result != null && typeof result.toString == "function")  {
				result = result.toString();
			}
			else if(result == undefined) {
				return autocompleteCb(null);
			}
			else throw new Error("result=" + result + " err=" + err);

			console.log("txt_calc: string result=" + result);

			autocompleteCb([result]);
		});
		
		return {async: true, exclusive: true};
	}


	// TEST-CODE-START

	EDITOR.addTest(1, function arithmeticsInComments(callback) {
		EDITOR.openFile("arithmeticsInComments.js", '// 1+2=', function(err, file) {
			if(err) throw err;

			file.moveCaret(undefined, 0, 7);

			console.log("Autocompleting...");

			EDITOR.autoComplete(file, function() {
				console.log("txt_calc: Autocomplete callback!");
				console.log("txt_calc: file.wordAtCaret=", file.wordAtCaret());

				var word = file.wordAtCaret().word;

				if(word != "3") throw new Error("Unexpected autocomplete: world=" + word);

				callback(true);
			});
		});
	});

	// TEST-CODE-END

})();
