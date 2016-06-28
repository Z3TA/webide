(function() {
	
	"use strict";
	
	editor.on("start", main);
	
	function main() {
		
		var charQ = 81;
		var charW = 119;
		
		// Should we be consistent with how browsers work? Ctrl+Q seems more initutive and Ctrl + W is already used by the Word-Wrapper.
		
		editor.keyBindings.push({charCode: charQ, combo: CTRL, fun: closeFile});
		
		editor.addMenuItem("Close file (Ctrl+Q)", closeFile);
		
	}
	
	function closeFile() {
		
		var file = editor.currentFile;
		
		if(file) {
			
			var close = true;
			
			// Check if it's saved first!
			if(!file.isSaved) {
				// Language?
				var yes = "Yes, close it";
				var no = "No, keep it open";
				
				confirmBox("All unsaved changes will be lost, are you sure you want to close this file?<br><b>" + file.path + "</b>", [yes, no], function(answer) {
					if(answer == yes) editor.closeFile(editor.currentFile.path);
				});
			}
			
		}
		else {
			// Close the editor!?
			editor.exit();
		}
		
		return false;
		
	}
	
})();