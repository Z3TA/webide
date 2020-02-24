(function() {
	
	"use strict";
	
	var menuItem;
	var windowMenuClose;
	var windowMenuQuit;
	
	EDITOR.plugin({
		desc: 'Adds "Close file" and "Close the editor" key combos and a "Close file" context menu item',
		load: closeFileKeyCombo,
		unload: closeFileKeyComboUnload,
		order: 5000 // Want the "close" option in context menu to be far down
	});
	
	function closeFileKeyCombo() {
		
		var charQ = 81;
		var charW = 119;
		
		// Should we be consistent with how browsers work? Ctrl+Q seems more initutive and Ctrl + W is already used by the Word-Wrapper.
// Some keys are protected by Firefox and Chrome, Ctrl+Q is one of them
		EDITOR.bindKey({desc: S("close_current_file"), charCode: charQ, combo: ALT, fun: closeFile});
		EDITOR.bindKey({desc: S("close_current_file_discard_changes"), charCode: charQ, combo: SHIFT+ALT, fun: closeFileAndDiscardChanges});
		
		EDITOR.bindKey({desc: S("close_editor"), charCode: charQ, combo: CTRL+ALT, fun: closeEditor});
		
		
		//menuItem = EDITOR.ctxMenu.add(S("close_file"), closeFile, 3);
		EDITOR.on("ctxMenu", showCloseFileOptionMaybe);
		
		windowMenuClose = EDITOR.windowMenu.add(S("close"), [S("File"), 3], closeFile);
		windowMenuQuit = EDITOR.windowMenu.add(S("Quit"), [S("Editor"), 20], closeEditor);
		
		EDITOR.registerAltKey({char: "x", alt:2, label: S("close"), fun: closeFile});
		
	}
	
	function closeFileKeyComboUnload() {
		
		EDITOR.unbindKey(closeFile);
		EDITOR.unbindKey(closeEditor);
		
		//EDITOR.ctxMenu.remove(menuItem);
		
		EDITOR.windowMenu.remove(windowMenuClose);
		EDITOR.windowMenu.remove(windowMenuQuit);
		
		EDITOR.unregisterAltKey(closeFile);
		
	}
	
	function closeFileAndDiscardChanges(file, combo) {
		return closeFile(file, combo);
	}
	
	function closeEditor(file, combo) {
		
		EDITOR.exit();
		
		return false;
	}
	
	function showCloseFileOptionMaybe(file, combo, caret, target) {
		
		console.log("file_close: target=", target, " target.path=" + target.path + " target.getAttribute('path')=" + target.getAttribute('path') + " target.id=" + target.id);
		
		if(target.className=="fileCanvas") {
			var fileToBeClosed = file;
		}
		else if(target.getAttribute("path")) { // note: Need to use getAttribute to get custom attributes from DOM elements
			var fileToBeClosed = EDITOR.files[target.getAttribute("path")];
		}
		
		if(!fileToBeClosed) return;
		
		EDITOR.ctxMenu.addTemp("Close file", false, function closeFileMenuItemClicked(file, combo) {
			closeFile(fileToBeClosed, combo);
		});
		
	}
	
	function closeFile(file, combo) {
		
if(file == undefined) {
alertBox("There are no (more) files open!");
return ALLOW_DEFAULT;
}

		if(file == undefined) throw new Error("file=" + file);
			
			// Check if it's saved first!
			if(!file.isSaved && !combo.shift && !combo.ctrl) {
				// Language?
				var yes = "Yes, close it";
				var no = "No, keep it open";
				
				confirmBox("All unsaved changes will be lost, are you sure you want to close this file?<br><b>" + file.path + "</b>", [yes, no], function(answer) {
					if(answer == yes) EDITOR.closeFile(EDITOR.currentFile.path);
				});
			}
			else {
			// Close it right away
				EDITOR.closeFile(EDITOR.currentFile.path);
			}
		
		return false;
		
	}
	
})();