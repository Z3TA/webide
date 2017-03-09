
(function() {

	EDITOR.on("paste", pasteFormat);
	
	function pasteFormat(file, clipboard) {
		
		var text = clipboard.getData('text');
		
		// Fix lonely carrige-returns (without a line-feed)
		//console.log("lineBreak=" + EDITOR.currentFile.lineBreak.replace("\r", "CR").replace("\n", "LF"));
		text = text.replace(/\r/g, "");
		
		//console.log("clipboard text=" + UTIL.lbChars(text));
		
		var lines = text.split("\n");
		
		if(lines.length > 1) {
		
		for(var i=0; i<lines.length; i++) {
			lines[i] = trim(lines[i]);
		}
		}
		else {
			// Only trim \r , \n and \t
			lines[0] = lines[0].replace(/[\r\n\t]/g, "");
			}
		function trim(line) {
			
			//console.log(line.length);
			
			// Remove all line feeds and carriage returns
			//line = line.replace(/\r/g, "")
			//line = line.replace(/\n/g, "")
			
			// Trim other white space
			line = line.trim();
			
			//console.log(line.length + "\n---");
			
			return line;
			
		}
		
		text = lines.join(file.lineBreak);
		
		//console.log("text=" + UTIL.lbChars(text));

		
		return text;
		
	}

})();