(function() {
	"use strict";
	
	var menuItem;
	var winMenuCopyFilePath;
	
	EDITOR.plugin({
		desc: 'Adds "Copy file path" to the context menu',
		load: function load() {
			
			menuItem = EDITOR.ctxMenu.add("Copy file path", copyFilePath, 5);
			winMenuCopyFilePath = EDITOR.windowMenu.add("Copy file path", ["File", 5], copyFilePath);
			
			EDITOR.registerAltKey({char: "d", alt:1, label: "Copy file path", fun: copyFilePath});
			
		},
		unload: function unload() {
			EDITOR.ctxMenu.remove(menuItem);
			EDITOR.windowMenu.remove(winMenuCopyFilePath);
			}
		});
	
	function copyFilePath() {
		
		// Puts the current file path into the clipboard
		
		if(EDITOR.currentFile) {
			
			var text = EDITOR.currentFile.path;
			
			if(RUNTIME == "nw.js") {
				
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
				//window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
				EDITOR.putIntoClipboard(text, function(err) {
					if(err) alertBox(err.message);
					else {
						winMenuCopyFilePath.hide();
						EDITOR.input = true;
					}
				});
			}
		}
		else {
			alertBox("No file open!");
		}
		
		EDITOR.ctxMenu.hide();
		
	}
	
})();
