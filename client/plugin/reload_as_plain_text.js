(function() {
	/*
		Can be useful for when debugging minified code
	*/
	"use strict";
	
	var winMenuReloadAsPlainText;
	var winMenuReloadAsCode;
	
	EDITOR.plugin({
		desc: "Able to reload a file as plain text",
		load: loadFileReloadAsPlainText,
		unload: unloadFileReloadAsPlainText
	});
	
	function loadFileReloadAsPlainText() {
		
		winMenuReloadAsPlainText = EDITOR.windowMenu.add(S("reload_as_plain_text"), [S("Edit"), 10], reloadAsPlainText);
		winMenuReloadAsCode = EDITOR.windowMenu.add(S("reload_as_code"), [S("Edit"), 10], reloadAsCode);
/*
			optimally we only want the menu item to show up when we are in a code file, but that would require some refactoring of editor's window menu
*/

		//EDITOR.on("fileShow", reloadAsPlainTextOptionMaybe);
	}
	
	function unloadFileReloadAsPlainText() {
		
		EDITOR.windowMenu.remove(winMenuReloadAsPlainText);
		EDITOR.windowMenu.remove(winMenuReloadAsCode);
		
		//EDITOR.removeEvent("fileShow", reloadAsPlainTextOptionMaybe);
	}
	
	
	
	function reloadAsPlainText(file) {
		file.reload(file.text,  {
			mode: "text", 
			parse: false, 
			parsed: {}
		});
	}
	
	function reloadAsCode(file) {
		file.reload(file.text,  {
			mode: "code",
			parse: true
		});
	}
	
	
})();