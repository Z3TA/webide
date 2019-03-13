/*
	
	In some browsers (Firefox on Android) you can't bring up the meny by long pressing!
	So show a menu button just in case the "irght click" menu doesn't work!
	
*/
(function() {
"use strict";
	
	// cant't have menu in the name or the menu will also be disabled!
	if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("trmb") != -1) return;
	
var button;

EDITOR.plugin({
desc: "Adds a menu button in the top right corner",
load: function loadTopRightMenuButton() {

			button = document.createElement("button");
			button.innerText = "☰";
			button.setAttribute("title", "menu");
			button.setAttribute("class", "topRightMenuButton"); // For styling

			button.onclick = function(clickEvent) {
EDITOR.hideMenu();
EDITOR.showMenu(undefined, undefined, clickEvent);
};
			
			var header = document.getElementById("header");
			header.appendChild(button);
			
},
unload: function unloadTopRightMenuButton() {

			if(button) button.parentElement.removeChild(button);
			
		}
});

})();

