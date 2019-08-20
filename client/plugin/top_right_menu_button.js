/*
	
	In some browsers (Firefox on Android) you can't bring up the meny by long pressing!
	So show a menu button just in case the "irght click" menu doesn't work!
	
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
			
			
			return;
			
			button = document.createElement("button");
			button.innerText = "☰";
			button.setAttribute("title", "Activate Context menu");
			button.setAttribute("class", "topRightMenuButton"); // For styling

			button.onclick = function(clickEvent) {
EDITOR.ctxMenu.hide();
EDITOR.ctxMenu.show(undefined, undefined, clickEvent);
};
			
			var header = document.getElementById("header");
			header.appendChild(button);
			
},
unload: function unloadTopRightMenuButton() {

			EDITOR.windowMenu.remove(winMenu);
			
			if(button) button.parentElement.removeChild(button);
			
		}
});
	
	function showContextMenu(file, combo, character, charCode, direction, clickEvent) {
		EDITOR.ctxMenu.hide();
		EDITOR.ctxMenu.show(undefined, undefined, clickEvent);
	}
	
})();

