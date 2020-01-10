(function() {
	"use strict";
	
	var winMenuCopyFilePath;
	
	EDITOR.plugin({
		desc: 'Adds "Copy file path" to the context menu',
		load: function loadCopyFilePath() {
			
			EDITOR.on("ctxMenu", copyFilePathCtxmenuOption);
			
			winMenuCopyFilePath = EDITOR.windowMenu.add(S("copy_file_path"), [S("File"), 5], copyFilePath);
			
			EDITOR.registerAltKey({char: "d", alt:1, label: S("copy_file_path"), fun: copyFilePath});
			
		},
		unload: function unloadCopyFilePath() {
			EDITOR.removeEvent("ctxMenu", copyFilePathCtxmenuOption);
			EDITOR.windowMenu.remove(winMenuCopyFilePath);
			}
		});
	
	function copyFilePathCtxmenuOption(file, combo, caret, target) {
		if(target.className=="fileCanvas" && file) {
			var filePath = file.path;
		}
		else if(target.getAttribute("path")) {
			var filePath = target.getAttribute("path");
		}
		
		console.log("copy_filepath: filePath=" + filePath);
		
		if(!filePath) return;
		
		EDITOR.ctxMenu.addTemp(S("copy_file_path"), function copyFilePathViaCtxMenu() {
			copyFilePath(filePath);
		});
		
	}
	
	function copyFilePath(filePath) {
		// Puts the text into the clipboard
		
		if(typeof filePath == "object" && filePath.hasOwnProperty("path")) filePath = filePath.path; // Can be a File object
		
work in progress!

				EDITOR.putIntoClipboard(text, function(err) {
					if(err) alertBox(err.message);
					else {
						winMenuCopyFilePath.hide();
				EDITOR.ctxMenu.hide();
				
						EDITOR.input = true;
					}
				});
			
			EDITOR.stat("copy_file_path");
		
	}
	
})();
