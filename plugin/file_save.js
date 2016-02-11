"use strict";

(function() {
	
	"use strict";
	
	var fileInput;
	var callback;
		
		
	window.addEventListener("load", file_save, false);
	
	function file_save() {
		
		// Bind to ctrl + S
		global.keyBindings.push({charCode: 83, combo: CTRL, fun: saveCurrentFile});

		
		// Listen for edits and set the file as not saved
		editor.on("edit", fileNotSaved);

		
		// Add items to the canvas context meny
		editor.addMenuItem("Save as ...", saveAs);
		
	}
	
	function fileNotSaved(file, change, text, index, row, col) {
		file.isSaved = false;
	}
	
	function saveAs(e) {
		
		var file = global.currentFile;
		var defaultPath;
		
		if(!file) console.error(new Error("No file open!?"));
		
		if(file.savedAs) {
			// Set the current path as default
			defaultPath = file.path;
		}
		// else: it will use the path of the last savedAs file viewed

		editor.fileSaveDialog(defaultPath, function(path) {
			editor.save(file, path);
		})
		
	}
	
	function saveCurrentFile(file, combo, character, charCode, direction) {
		
		if(file.savedAs === false || combo.sum == CTRL + SHIFT) {
			saveAs();
		}
		else {
			editor.save(file);
		}
		
		return false;
		
	}
	
})();


