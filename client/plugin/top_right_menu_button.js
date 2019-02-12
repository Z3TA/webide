/*
	
	In some browsers (Chrome on Android) it can be almost impossible to bring up the menu
	
*/
(function() {

"use strict";

var button;

EDITOR.plugin({
desc: "Adds a menu button in the top right corner",
load: function loadTopRightMenuButton() {

			button = document.createElement("button");
			button.innerText = "Menu";
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

