/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var newFileCounter = 1;
	
	// Bind to ctrl + N
	global.keyBindings.push({charCode: 78, combo: CTRL, fun: createNewFile});


	
	function createNewFile(file, combo, character, charCode, direction) {
		
		var content = "",
			path = "new file " + (newFileCounter++);
		
		// Do not overwrite opened files!
		while(global.files[path]) {
			path = "new file " + (newFileCounter++);
		}
		
		editor.openFile(path, content, function(file) {
			// Mark the file as NOT saved, because its a NEW file
			file.saved = false;
			file.savedAs = false;
		});
				
		global.render = true;
		global.resize = true;
		
		return false;
		
	}
	
	
})();


