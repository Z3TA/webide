(function() {
	
	"use strict";
	
	EDITOR.on("start", closeFileKeyCombo);
	
	function closeFileKeyCombo() {
		
		var charQ = 81;
		var charW = 119;
		
		// Should we be consistent with how browsers work? Ctrl+Q seems more initutive and Ctrl + W is already used by the Word-Wrapper.
		
		EDITOR.bindKey({desc: "Close current file", charCode: charQ, combo: CTRL, fun: closeFile});
		EDITOR.bindKey({desc: "Close current file", charCode: charQ, combo: CTRL + SHIFT, fun: closeEditor});
		
		EDITOR.addMenuItem("Close file (Ctrl+Q)", closeFile);
		
	}
	
	function closeEditor(file, combo) {
		console.log("Closing the editor ...");
		process.exit(1);
		return false;
	}
	
	function closeFile(file, combo) {
		
		if(file) {
			
			var close = true;
			
			// Check if it's saved first!
			if(!file.isSaved) {
				// Language?
				var yes = "Yes, close it";
				var no = "No, keep it open";
				
				confirmBox("All unsaved changes will be lost, are you sure you want to close this file?<br><b>" + file.path + "</b>", [yes, no], function(answer) {
					if(answer == yes) EDITOR.closeFile(EDITOR.currentFile.path);
				});
			}
			else {
				// Close it right away if it's saved
				EDITOR.closeFile(EDITOR.currentFile.path);
			}
			
		}
		else {
			// Close the editor!?
			EDITOR.exit();
		}
		
		return false;
		
	}
	
})();