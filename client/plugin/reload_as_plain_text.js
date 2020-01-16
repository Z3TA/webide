(function() {
	/*
		Can be useful for when debugging minified code
	*/
	"use strict";
	
	var winMenuReloadAsPlainText;
	
	EDITOR.plugin({
		desc: "Able to reload a file as plain text",
		load: loadFileReloadAsPlainText,
		unload: unloadFileReloadAsPlainText
	});
	
	function loadFileReloadAsPlainText() {
		
		winMenuReloadAsPlainText = EDITOR.windowMenu.add(S("reload_as_plain_text"), [S("Edit"), 5], reloadAsPlainText);
		
/*
optimally we only want the menu item to show up when we are in a code file, but that would require some refactoring of editor the window menu
*/

		//EDITOR.on("fileShow", reloadAsPlainTextOptionMaybe);
	}
	
	function unloadFileReloadAsPlainText() {
		
		EDITOR.windowMenu.remove(winMenuReloadAsPlainText);
		
		//EDITOR.removeEvent("fileShow", reloadAsPlainTextOptionMaybe);
	}
	
	/*
		function reloadAsPlainTextOptionMaybe(file) {
		if(file.mode != "text") {
		if(!winMenuReloadAsPlainText) {
		winMenuReloadAsPlainText = EDITOR.windowMenu.add(S("reload_as_plain_text"), [S("Edit"), 5], reloadAsPlainText);
		}
		else {
		//winMenuReloadAsPlainText.show();
		}
		}
		else {
		alertBox("file.path=" + file.path + " file.mode=" + file.mode + " file.parse=" + file.parse);
		if(winMenuReloadAsPlainText) winMenuReloadAsPlainText.hide();
		}
		}
	*/
	
	function reloadAsPlainText(file) {
		
		//if(file.mode == "text" && file.parse === false) return alertBox(file.path + " is already loaded as plain text!");
		
		file.reload(file.text,  {
			mode: "text", 
			parse: false, 
			parsed: {}
		});
	}
	
})();