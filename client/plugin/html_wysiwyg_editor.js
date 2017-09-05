
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
			
			if(EDITOR.currentFile) createwysiWygEditor(EDITOR.currentFile);
			else alertBox("No file open! Open a HTML file and try again.");
			
			EDITOR.hideMenu();
		});
	}
	
	function unload() {
		EDITOR.removeMenuItem(menuItem);
		if(wysiwygEditor) wysiwygEditor.close();
	}
	
	function createwysiWygEditor(file) {
		
		if(wysiwygEditor) {
			wysiwygEditor.close();
		}
		
		wysiwygEditor = new WysiwygEditor(file);

	}
	
	
})();