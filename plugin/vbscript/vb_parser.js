(function() {
	
	/*
		This is a parser for vbScript
		
		Goal is to return an object with:
		quotes
		comments
		
		And make code indentions!
		 
		... and maybe ...
		
		functions
		quotes
		comments
		globalVariables
		blockMatch = true|false (if there are as many { as there are }
		xmlTags
		
	*/
	
	function parseVbScript(file) {
		
		var text = file.text.toLowerCase(); // vbScript is not case sensitive!
		
		var char = "";
		var insideQuote = false;
		
		for(var i=0; i<text.length; i++) {
			char = text.charAt(i);
			
			if(char == '"' && !insideQuote) {
				inside
				
			}
		}
		
		
}

})();