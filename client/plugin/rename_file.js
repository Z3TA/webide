(function() {
	"use strict";
	
/*

todo: Refactor file_explorer.js to use this, where file_exporer and also other plugins need to listen for move event

*/

	EDITOR.on("ctxMenu", copyFilePathCtxmenuOption);

	var winMenuItem;
	
	EDITOR.plugin({
		desc: 'Rename files',
		load: function loadRenameFiles() {
			
			EDITOR.on("ctxMenu", renameFileCtxmenuOption);
			
			winMenuItem = EDITOR.windowMenu.add(S("rename_file"), [S("File"), 5], renameFile);
			
			EDITOR.registerAltKey({char: "r", alt:3, label: S("rename_file"), fun: renameFile});
			
		},
		unload: function unloadRenameFiles() {
			EDITOR.removeEvent("ctxMenu", renameFileCtxmenuOption);
			EDITOR.windowMenu.remove(winMenuItem);
		}
	});
	
	function renameFileCtxmenuOption(file, combo, caret, target) {
		if(target.className=="fileCanvas" && file) {
			var filePath = file.path;
		}
		else if(target.getAttribute("path")) {
			var filePath = target.getAttribute("path");
		}
		
		console.log("rename_file: filePath=" + filePath);
		
		if(!filePath) return;
		
		EDITOR.ctxMenu.addTemp(S("rename_file"), function renameFileViaCtxMenu() {
			renameFile(filePath);
		});
		
	}
	
	function renameFile(filePath) {
		
	}
	
})();