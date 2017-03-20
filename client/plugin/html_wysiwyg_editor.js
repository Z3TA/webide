
/*
	
	Functions for WYSIWYG editing
	
*/
(function() {
	"use strict";
	
	var menuItem;
	var wysiwygEditor;
	
	EDITOR.plugin({
		desc: "WYSIWYG editor for HTML files",
		load: load,
		unload: unload,
	});
	
	function load() {
		menuItem = EDITOR.addMenuItem("WYSIWYG", function() {
			createwysiWygEditor(EDITOR.currentFile);
			EDITOR.hideMenu();
		});
	}
	
	function unload() {
		EDITOR.removeMenuItem(menuItem);
		if(wysiwygEditor) wysiwygEditor.close();
	}
	
	function createwysiWygEditor(file) {
		
		if(wysiwygEditor) {
			if(wysiwygEditor.sourceFile == file) {
				var dance = true;
				wysiwygEditor.reload(dance);
				return;
			}
			else {
				wysiwygEditor.close();
			}
		}
		
		wysiwygEditor = new WysiwygEditor(file);

	}
	
	
})();