(function() {
	
	"use strict";
	
	var order = 100;
	
	EDITOR.on("autoComplete", autoCompleteXml, order);
	
	function autoCompleteXml(file, word, wordLength, gotOptions) {
		
		//if(gotOptions > 0) return;
		
		var options = [];
		var charIndex = file.caret.index;
		var insideQuote = areWeInsideQuote(file, charIndex);
		
		if(!(file.fileExtension == "htm" || file.fileExtension == "html" || file.fileExtension == "xml" || insideQuote)) {
			console.log("Not autocompleting tags because its not a html file or inside a quote");
			return;
		}
		
		// Because high order, there's proabbly nothing else to complete. Maybe we want to close last opened xml tag!?
		//var lastOpenXmlTag = findLastOpenXmlTag(file.text, charIndex);
		var lastOpenXmlTag = findLastOpenXmlTag2(file, charIndex);
		
		if(lastOpenXmlTag.length > 0 && lastOpenXmlTag != "<") {
			options.push(word + "</" + lastOpenXmlTag + ">");
		}
		
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
	
	function findLastOpenXmlTag2(file, charIndex) {
		// Use parsed data
		
		if(!file.parsed) return "";
		
		var tags = file.parsed.xmlTags;
		
		if(!tags) return "";
		
		var text = file.text;
		
		var openTags = [];
		var tag = "";
		var slashPos = -1;
		var j = 0;
		for (var i=0; i<tags.length; i++) {
			
			if(tags[i].start >= charIndex) break;
			
			tag = text.substr(tags[i].start, tags[i].wordLength);
			slashPos = tag.indexOf("/");
			if(slashPos != -1) {
				// Ending tag
				tag = tag.substr(slashPos+1); // Remove the slash
				console.log("Ending tag: *" + tag + "*");
				var index = openTags.lastIndexOf(tag);
				if(index != -1) openTags.splice(index, 1);
			}
			else if(!tags[i].selfEnding) {
				tag = tag.substr(1); // Remove the left arrow
				
				if(tag != "br") {
					console.log("Opening tag: *" + tag + "*");
					openTags.push(tag);
}
			}
			
		}
		
		if(openTags.length > 0) {
			return openTags[openTags.length-1];
		}
		else return "";
}
	
	
	function findLastOpenXmlTag(text, charIndex) {
		var textUpUntilChar = text.substr(0, charIndex);
		// PS: lastIndexOf searches backwards!
		var lastXmlTagClose = textUpUntilChar.lastIndexOf("</");
		
		if(lastXmlTagClose != -1) textUpUntilChar = textUpUntilChar.substring(lastXmlTagClose+2, lastXmlTagClose.length);
		
		var lastOpenXmlTagStart = textUpUntilChar.lastIndexOf("<");
		
		// todo: support nested tags like <div><span><b>x</b> ... close span
		
		var xmlTagName = "";
		
		if(lastOpenXmlTagStart != -1) {
			// We have an open xml tag ... What is it?
			var xmlTagBody = textUpUntilChar.substring(lastOpenXmlTagStart, charIndex);
			var firstSpace = xmlTagBody.indexOf(" ");
			var firstRightTag = xmlTagBody.indexOf(">");
			var end = 0;
			if(firstSpace > -1 && firstSpace < firstRightTag) {
				end = firstSpace;
			}
			else {
				end = firstRightTag;
			}
			xmlTagName = xmlTagBody.substring( 1, end );
			
		}
		
		return xmlTagName;
	}
	
})();
