(function() {
	"use strict";
	
	editor.on("start", function editorStarted() {
		
		//editor.bindKey({desc: "Show the manager for the static site generator", fun: show, charCode: keyF9, combo: CTRL});
		
		editor.addMenuItem("Copy file path", function copyFilePath() {
			
			// Puts the current file path into the clipboard
			
			if(editor.currentFile) {
				// Load native UI library
				var gui = require('nw.gui');
				
				// We can not create a clipboard, we have to receive the system clipboard
				var clipboard = gui.Clipboard.get();
				
				// Read from clipboard
				//var text = clipboard.get('text');
				//console.log(text);
				
				// Or write something
				clipboard.set(editor.currentFile.path, 'text');
				
				// And clear it!
				//clipboard.clear();
			}
			else {
				alert("No file open!");
			}
			
			editor.hideMenu();
			
			
		});
		
	});
	
})();