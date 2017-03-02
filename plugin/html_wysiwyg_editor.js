
/*
	
	Functions for WYSIWYG editing
	
*/
(function() {
	"use strict";
	
	var menuItem;
	var wysiwygEditor;
	
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
		if(wysiwygEditor) wysiwygEditor.close();
	}
	
	function createwysiWygEditor(file) {
		
		if(wysiwygEditor) {
			if(wysiwygEditor.sourceFile == file) {
				wysiwygEditor.open();
				return;
			}
			else {
				wysiwygEditor.close();
			}
		}
		
		wysiwygEditor = new WysiwygEditor(file);

	}
	
	
})();