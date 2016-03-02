/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var newFileCounter = 1;
	
	// Bind to ctrl + N
	editor.keyBindings.push({charCode: 78, combo: CTRL, fun: createNewFile});


	
	function createNewFile(file, combo, character, charCode, direction) {
		
		var content = "",
			path = "new file " + (newFileCounter++);
		
		// Do not overwrite opened files!
		while(editor.files[path]) {
			path = "new file " + (newFileCounter++);
		}
		
		editor.openFile(path, content, function(file) {
			// Mark the file as NOT saved, because its a NEW file
			file.isSaved = false;
			file.savedAs = false;
		});
				
		editor.renderNeeded();
		editor.resizeNeeded();
		
		return false;
		
	}
	
	
})();


