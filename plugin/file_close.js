(function() {
	
	"use strict";
	
	editor.on("start", main);
	
	function main() {
		
		var charQ = 81;
		
		editor.keyBindings.push({charCode: charQ, combo: CTRL, fun: closeFile});
		
		editor.addMenuItem("Close file (Ctrl+Q)", closeFile);
		
	}
	
	function closeFile() {
		
		var file = editor.currentFile;
		
		if(file) {
			
			var close = true;
			
			// Check if it's saved first!
			if(!file.isSaved) close = confirm("All unsaved changes will be lost, are you sure you want to close this file? " + file.path);
			
			if(close) editor.closeFile(editor.currentFile.path);
		}
		else {
			// Close the editor!?
			editor.exit();
		}
		
		return false;
		
	}
	
})();