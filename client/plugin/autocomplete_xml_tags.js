(function() {
	
	/*
		Autocompletes xml tag closings eg </foo>
	*/


	"use strict";
	
	var order = 100;
	
	EDITOR.on("autoComplete", autoCompleteXml, order);
	
	function autoCompleteXml(file, word, wordLength, gotOptions) {
		
		if(gotOptions > 0) return;
		
		var options = [];
		var charIndex = file.caret.index;
		var insideQuote = areWeInsideQuote(file, charIndex);
		
		if(!(file.fileExtension == "htm" || file.fileExtension == "html" || file.fileExtension == "xml" || insideQuote || file.text.slice(0,15) == "<!DOCTYPE html>" )) {
			//console.log("Not autocompleting tags because its not a html file or inside a quote");
			return;
		}
		
		// Don't insert tag ending if we are inside a tag opening eg <foo ...
		for (var i=file.caret.index; i>file.grid[file.caret.row].startIndex-1; i--) {
			//console.log("" + file.text.charAt(i));
			if(file.text.charAt(i) == ">") break;
			if(file.text.charAt(i) == "<") {
				//console.log("Not autocompleting tag ending because inside tag");
				return;
			}
			
		}
		//console.log("not inside tag");

		// Because high order, there's probably nothing else to complete. Maybe we want to close last opened xml tag!?
		var lastOpenXmlTag = UTIL.findLastOpenXmlTag(file, charIndex);
		
		if(lastOpenXmlTag.length == 0) return;
		if(lastOpenXmlTag == "<") return;
		
		//console.log("lastOpenXmlTag=" + lastOpenXmlTag + " word=" + word);
		
		if(lastOpenXmlTag.match(/script/i) && word.length > 0) return; // Avoid adding </script> when inside a script element
		
		if( lastOpenXmlTag.match(/!DOCTYPE/i) ) return;
		
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
