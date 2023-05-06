/*
	Autocomplete caluclations like 1+1=
*/
(function() {

	EDITOR.plugin({
		desc: "Autocomplete JSX components",
		load: function loadAutocompleteCalcMath() {

			var order = 150; // After autocomplete_js.js

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

		var row = file.rowText();

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
				autocompleteCb(null);
			}

			console.log("txt_calc: eval result: " + result);

			if(typeof result == "number" && thousandSeparator) {
				result = result.toLocaleString();

				if(result.match(reThousand) && thousandSeparator == ".") {
					result = result.replace(reThousand, "$1.$2");
				}

			}
			else {
				result = result.toString();
			}

			console.log("txt_calc: string result=" + result);

			autocompleteCb([result]);
		});
		
		return {async: true};
	}

})();
