/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var newFileCounter = 1;
	
	// Bind to ctrl + N
	EDITOR.bindKey({desc: "Create new file", charCode: 78, combo: CTRL, fun: createNewFile});


	
	function createNewFile(file, combo, character, charCode, direction) {
		
		var content = "";
			var path = "new file" // + (newFileCounter++);
		
		// Do not overwrite opened files!
		//while(EDITOR.files[path]) {
			//path = "new file " + (newFileCounter++);
		//}
		
		EDITOR.openFile(path, content, function(err, file) {
			// Mark the file as NOT saved, because its a NEW file
			file.isSaved = false;
			file.savedAs = false;
		});
				
		EDITOR.renderNeeded();
		EDITOR.resizeNeeded();
		
		return false;
		
	}
	
	
})();


