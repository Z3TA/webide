(function() {
	
	"use strict";
	
	var order = 100;
	
	editor.on("autoComplete", autoCompleteXml, order);
	
	function autoCompleteXml(file, word, wordLength, gotOptions) {
		
		//if(gotOptions > 0) return;
		
		var options = [];
		var charIndex = file.caret.index;
			
		// Found nothing to complete. Maybe we want to close last opened xml tag!?
		var lastOpenXmlTag = findLastOpenXmlTag(file.text, charIndex);
		
		if(lastOpenXmlTag.length > 0 && lastOpenXmlTag != "<") {
			options.push("</" + lastOpenXmlTag + ">");
		}
		
		return options;
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
			let firstSpace = xmlTagBody.indexOf(" ");
			let firstRightTag = xmlTagBody.indexOf(">");
			let end = 0;
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
