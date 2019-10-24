(function() {
	
	"use strict";
	
	var menuItem;
	var windowMenuClose;
	var windowMenuQuit;
	
	EDITOR.plugin({
		desc: 'Adds "Close file" and "Close the editor" key combos and a "Close file" context menu item',
		load: closeFileKeyCombo,
		unload: closeFileKeyComboUnload
	});
	
	function closeFileKeyCombo() {
		
		var charQ = 81;
		var charW = 119;
		
		// Should we be consistent with how browsers work? Ctrl+Q seems more initutive and Ctrl + W is already used by the Word-Wrapper.
		
		EDITOR.bindKey({desc: S("close_current_file"), charCode: charQ, combo: CTRL, fun: closeFile});
		EDITOR.bindKey({desc: S("close_editor"), charCode: charQ, combo: CTRL + SHIFT, fun: closeEditor});
		
		menuItem = EDITOR.ctxMenu.add(S("close_file"), closeFile, 3);
		
		windowMenuClose = EDITOR.windowMenu.add(S("close"), [S("File"), 3], closeFile);
		windowMenuQuit = EDITOR.windowMenu.add(S("Quit"), [S("Editor"), 20], closeEditor);
		
		EDITOR.registerAltKey({char: "x", alt:2, label: S("close_file"), fun: closeFile});
		
	}
	
	function closeFileKeyComboUnload() {
		
		EDITOR.unbindKey(closeFile);
		EDITOR.unbindKey(closeEditor);
		
		EDITOR.ctxMenu.remove(menuItem);
		EDITOR.windowMenu.remove(windowMenuClose);
		EDITOR.windowMenu.remove(windowMenuQuit);
		
		EDITOR.unregisterAltKey(closeFile);
		
	}
	
	function closeEditor(file, combo) {
		console.log("Closing the editor ...");
		if(typeof process == "object" && typeof process.exit == "function") process.exit(1);
		
		self.close();
		
		window.close();
		
		// Firefox hack
		window.open('','_parent','');
		window.close();
		
		if(typeof browser == "object" && browser.tabs && typeof browser.tabs.remove == "function") browser.tabs.remove();
		
		
		alertBox("Manually close the window to exit");
		
		return false;
	}
	
	function closeFile() {
		
		var file = EDITOR.currentFile;
		
		if(file) {
			
			console.log(file);
			
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