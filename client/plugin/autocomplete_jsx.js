(function() {

	EDITOR.plugin({
		desc: "Autocomplete JSX components",
		load: function loadAutocompleteJSX() {
			
			var order = 150; // After autocomplete_js.js
			
			EDITOR.on("autoComplete", autoCompleteJSX, order);
			
		},
		unload: function unloadAutocompleteJSX() {
			
			EDITOR.removeEvent("autoComplete", autoCompleteJSX);
			
		}
	});
	
	function autoCompleteJSX(file, word, wordLength, gotOptions) {
		if(!file.parsed) return;
		
		var charBeforeWord = file.text.charAt(file.caret.index-wordLength-1);
		var tagStart = charBeforeWord == "<";
		var tagEnd = charBeforeWord == "/";
		
		console.log("autoCompleteJSX: word=" + word + " charBeforeWord=" + charBeforeWord + " tagStart=" + tagStart + " tagEnd=" + tagEnd);
		
		// Don't insert tag ending if we are inside a tag opening eg <foo ...
		for (var i=file.caret.index; i>file.grid[file.caret.row].startIndex-1; i--) {
			console.log("autoCompleteJSX: " + file.text.charAt(i));
			if(file.text.charAt(i) == ">") break;
			if(file.text.charAt(i) == "<") {
				console.log("autoCompleteJSX: Not autocompleting tag ending because inside tag");
				return;
			}

		}
		console.log("autoCompleteJSX: not inside tag");

		var options = [];
		var optionsToRemove = [];
		
		if(tagStart || tagEnd) {
			
			var scope = UTIL.scope(file.caret.index, file.parsed.functions, file.parsed.globalVariables);
			
			console.log(scope);
			
			
			var complStr = "";
			var foundComplIndex = -1;
			
			for(var fName in scope.functions) {
				if(fName.slice(0,wordLength) == word) {
					console.log("autoCompleteJSX: " + fName.slice(0,wordLength) + " == " + word + " => " + fName);
					
					optionsToRemove.push(fName + "()");
					
					if(tagEnd) options.push(fName + ">");
					else {
						
						complStr = fName;
						if(scope.functions[fName].arguments.length > 0) {
							complStr += props(scope.functions[fName].arguments);
						}
						complStr += " />";
						
						options.push(complStr);
					}
				}
			}
		}
		
		console.log("autoCompleteJSX: options.length=" + options.length + " gotOptions=" + gotOptions + " word.length=" + word.length);
		// Why only autocomplete when on an emty line!?  && word.length == 0
		if(options.length == 0 && gotOptions == 0) {
			// Close last opened tag
			
			var charIndex = file.caret.index;
			var lastOpenXmlTag = UTIL.findLastOpenXmlTag(file, charIndex);
			
			
			
			if(lastOpenXmlTag.length == 0) return;
			if(lastOpenXmlTag == "<") return;
			
			console.log("autoCompleteJSX: lastOpenXmlTag=" + lastOpenXmlTag);
			
			if(lastOpenXmlTag.match(/script/i) && word.length > 0) return; // Avoid adding </script> when inside a script element
			if( lastOpenXmlTag.match(/!DOCTYPE/i) ) return;

			options.push(word + "</" + lastOpenXmlTag + ">");
			
		}
		else {
			console.log("autoCompleteJSX: options=" + JSON.stringify(options) + " gotOptions=" + gotOptions);
		}
		
		if(options.length > 0) return {add: options, remove: optionsToRemove};
		
	}
	
	function props(parameterStr) {
		console.log("autoCompleteJSX:props: parameterStr=" + parameterStr);
		var propsStr = ""
		var arr = parameterStr.split(",");
		
		arr.forEach(function(prop) {
			prop = prop.trim();
			if(prop.indexOf("=") == -1) propsStr = propsStr + " " + prop + "={" + prop + "}";
		});
		
		return propsStr;
	}
	
	EDITOR.addTest(function autocompleteJsxComponent(callback) {
		EDITOR.openFile(EDITOR.user.homeDir + "/wwwpub/autocompleteJsxComponent.js", 'return (\n<foo>bar\n', function(err, file) {
			
			file.moveCaretToIndex(17);
			EDITOR.mock("keydown", {charCode: 9}); // tab to autocomplete
			
			UTIL.assert(file.wordAtCaret(file.caret, "/").left, "foo>");
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
})();

