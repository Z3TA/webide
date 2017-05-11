(function() {
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: 'Adds "Copy file path" to the context menu',
		load: function load() {
			
			menuItem = EDITOR.addMenuItem("Copy file path", function copyFilePath() {
				
				// Puts the current file path into the clipboard
				
				if(EDITOR.currentFile) {
					
					var text = EDITOR.currentFile.path;
					
					if(runtime == "nw.js") {
					
					// Load native UI library
					var gui = require('nw.gui');
					
					// We can not create a clipboard, we have to receive the system clipboard
					var clipboard = gui.Clipboard.get();
					
					// Read from clipboard
					//var text = clipboard.get('text');
					//console.log(text);
					
					// Or write something
						clipboard.set(text, 'text');
					
					// And clear it!
					//clipboard.clear();
					}
					else {
						 window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
					}
				}
				else {
					alert("No file open!");
				}
				
				EDITOR.hideMenu();
				
				
			});
			
		},
		unload: function unload() {
			EDITOR.removeMenuItem(menuItem);
			}
		});
	
})();
