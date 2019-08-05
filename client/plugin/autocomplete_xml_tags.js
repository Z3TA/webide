(function() {
	
	"use strict";
	
	var order = 100;
	
	EDITOR.on("autoComplete", autoCompleteXml, order);
	
	function autoCompleteXml(file, word, wordLength, gotOptions) {
		
		if(gotOptions > 0) return;
		
		var options = [];
		var charIndex = file.caret.index;
		var insideQuote = areWeInsideQuote(file, charIndex);
		
		if(!(file.fileExtension == "htm" || file.fileExtension == "html" || file.fileExtension == "xml" || insideQuote)) {
			console.log("Not autocompleting tags because its not a html file or inside a quote");
			return;
		}
		
		// Because high order, there's proabbly nothing else to complete. Maybe we want to close last opened xml tag!?
		var lastOpenXmlTag = UTIL.findLastOpenXmlTag(file, charIndex);
		
		if(lastOpenXmlTag.length == 0) return;
		if(lastOpenXmlTag == "<") return;
		
		console.log("lastOpenXmlTag=" + lastOpenXmlTag);
		
		if(lastOpenXmlTag.match(/script/i) && word.length > 0) return; // Avoid adding </script> when inside a script element
		
			options.push(word + "</" + lastOpenXmlTag + ">");
		
		
		return options;
	}
	
	function areWeInsideQuote(file, i) {
		if(!file.parsed) return false;
		
		var quotes = file.parsed.quotes;
		
		if(!quotes) return false;
		
		for(var i=0; i<quotes.length; i++) {
			if(quotes[i].start > i) return false
			else if(quotes[i].end > i && quotes[i].start < i) return true;
		}
	}
	
})();
