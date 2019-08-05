(function() {

	EDITOR.plugin({
		desc: "Autocomplete JSX components",
		load: function loadAutocompleteHTML() {
			
			var order = 150; // After autocomplete_js.js
			
			EDITOR.on("autoComplete", autoCompleteJSX, order);
			
		},
		unload: function unloadAutocompleteHTML() {
			
			EDITOR.removeEvent("autoComplete", autoCompleteJSX);
			
		}
	});
	
	function autoCompleteJSX(file, word, wordLength, gotOptions) {
		if(!file.parsed) return;
		
		var charBeforeWord = file.text.charAt(file.caret.index-wordLength-1);
		var tagStart = charBeforeWord == "<";
		var tagEnd = charBeforeWord == "/";
		
		console.log("autoCompleteJSX: word=" + word + " charBeforeWord=" + charBeforeWord + " tagStart=" + tagStart + " tagEnd=" + tagEnd);
		
		if(!tagStart && !tagEnd) return;
		
		var options = [];
		var optionsToRemove = [];
		
		var scope = UTIL.scope(file.caret.index, file.parsed.functions, file.parsed.globalVariables);
		
		console.log(scope);
		
		
		var complStr = "";
		var foundComplIndex = -1;
		
		for(var fName in scope.functions) {
			if(fName.slice(0,wordLength) == word) {
				console.log("autoCompleteJSX: " + fName.slice(0,wordLength) + " == " + word + " => " + fName);
				if(tagEnd) options.push(fName + ">");
				else {
					
					complStr = fName;
					if(scope.functions[fName].arguments.length > 0) {
						complStr += props(scope.functions[fName].arguments);
					}
					complStr += " />";
					
					optionsToRemove.push(fName + "()");
					
					options.push(complStr);
				}
			}
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
	
	
	
	
	
	
})();

