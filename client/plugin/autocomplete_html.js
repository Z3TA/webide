(function() {

	var completions = {
		a: ['a href=""></a>', 4],
		// Cannot have anything else on a or a wont autocomplete (which is much more common then the other elements tarting with a)
		//address: ["address></address>", 10],
		blockquote: ['blockquote></blockquote>', 13],
		button: ["button></button>", 9]
		
		
	};
	
	// todo: https://www.w3schools.com/tags/
	
	var htmlTags = [];
	
	
	EDITOR.plugin({
		desc: "Autocomplete HTML elements",
		load: function loadAutocompleteHTML() {
			
			var order = 50; // Before js_misc
			
			EDITOR.on("autoComplete", autoCompleteHtml, order);
			
		},
		unload: function unloadAutocompleteHTML() {
			
			EDITOR.removeEvent("autoComplete", autoCompleteHtml);
			
		}
	});
	
	function autoCompleteHtml(file, word, wordLength, gotOptions) {
		
		var charBeforeWord = file.text.charAt(file.caret.index-wordLength-1);
		
		if(charBeforeWord == "!" && "DOCTYPE".slice(0, wordLength) == word) {
			return [
				['DOCTYPE html>\n<html lang="en">\n<head>\n<title></title>\n</head>\n<body>\n\n</body>\n</html>\n', 42]
			];
		}
		
		if(!isHTML(file)) return;
		
		var tagStart = charBeforeWord == "<";
		var tagEnd = charBeforeWord == "/";
		
		console.log("autoCompleteHtml: word=" + word + " charBeforeWord=" + charBeforeWord + " tagStart=" + tagStart + " tagEnd=" + tagEnd);
		
		
		if(!tagStart && !tagEnd) return;
		
		var options = [];
		
		for(var el in completions) {
			if(el.slice(0,wordLength) == word) {
				console.log("autoCompleteHtml: " + el.slice(0,wordLength) + " == " + word + " => " + el);
				if(tagEnd) options.push(el + ">");
				else options.push(completions[el]);
			}
			
		}
		
		if(options.length > 0) return options;
		
	}
	
	
	function isHTML(file) {
		if(file.path.match(/html?$/i)) return true;
		else if(file.text.match(/<!DOCTYPE html>/i)) return true;
		else if(file.text.match(/<html>/i)) return true;
		else if(file.text.match(/<script>/i)) return true;
		
		else return false;
	}
	
})();

