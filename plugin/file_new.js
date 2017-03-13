/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Create new file option to context menu and bound to Ctrl + O",
		load: function load() {
			// Bind to ctrl + N
			EDITOR.bindKey({desc: "Create new file", charCode: 78, combo: CTRL, fun: createNewFile});
			
			menuItem = EDITOR.addMenuItem("Create new file", createNewFile);
			
		},
		unload: function unload() {
			EDITOR.removeMenuItem(menuItem);
			
			EDITOR.unbindKey(createNewFile);
		}
	});
	
	
	function createNewFile(file, combo, character, charCode, direction) {
		
		EDITOR.hideMenu();
		
		var content = "";
		var path = "new file";
		
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


