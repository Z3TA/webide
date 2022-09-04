/*
	
	In some browsers (Firefox on Android) you can't bring up the menu by long pressing!
	So show a menu button just in case the "tight click" menu doesn't work!
	
*/
(function() {
"use strict";
	
	// cant't have menu in the name or the menu will also be disabled!
	if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("trmb") != -1) return;
	
var button;
var winMenu;

EDITOR.plugin({
desc: "Adds a menu button in the top right corner",
load: function loadTopRightMenuButton() {

			winMenu = EDITOR.windowMenu.add("☰", [9], showContextMenu)
			
			if(typeof winMenu.domElement.getElementsByTagName == "function") winMenu.domElement.getElementsByTagName("a")[0].setAttribute("title", "Activate Context menu");
			
		},
		unload: function unloadTopRightMenuButton() {

			EDITOR.windowMenu.remove(winMenu);
			
			if(button) button.parentElement.removeChild(button);
			
		}
});
	
	function showContextMenu(file, combo, character, charCode, direction, clickEvent) {
		EDITOR.ctxMenu.hide();
		EDITOR.ctxMenu.show(clickEvent);
	}
	
})();

