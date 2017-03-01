
/*
	
	Functions for WYSIWYG editing
	
*/
(function() {
	"use strict";
	
	var menuItem;
	
	editor.plugin({
		desc: "WYSIWYG editor for HTML files",
		load: load,
		unload: unload,
	});
	
	function load() {
		menuItem = editor.addMenuItem("WYSIWYG", function() {
			createwysiWygEditor(editor.currentFile);
			editor.hideMenu();
		});
	}
	
	function unload() {
		editor.removeMenuItem(menuItem);
		wysiwygEditor.close();
	}
	
	function createwysiWygEditor(file) {
		
		var wysiwygEditor = new WysiwygEditor(file);
		
	}
	
	
})();