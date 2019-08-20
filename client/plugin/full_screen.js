(function() {
	"use strict";
	
	/*
		Press F11 to enter/exit full screen mode.
		
	*/
	
	var winMenuFullScreen;
	
	EDITOR.plugin({
		desc: "Full screen",
		load: function loadFullScreen() {

			var keyF11 = 122;
			
			EDITOR.bindKey({desc: "Toggle full screen mode", charCode: keyF11, fun: toggleTullScreen});
			
			winMenuFullScreen = EDITOR.windowMenu.add("Full screen", ["View", 10], toggleTullScreen);
			
			
		},
		unload: function unloadFullScreen() {

			EDITOR.unbindKey(toggleTullScreen);
			
			EDITOR.windowMenu.remove(winMenuFullScreen);
		},
	});
	
	
	
	function toggleTullScreen() {
		
		if(RUNTIME == "nw.js") { 
			var GUI = require('nw.gui').Window.get();
			GUI.toggleKioskMode();
			
			winMenuFullScreen.toggle();
			}
		else {
			// Asume browser
			if ((document.fullScreenElement && document.fullScreenElement !== null) ||
			(!document.mozFullScreen && !document.webkitIsFullScreen)) {
				if (document.documentElement.requestFullScreen) {
					document.documentElement.requestFullScreen();
				} else if (document.documentElement.mozRequestFullScreen) {
					document.documentElement.mozRequestFullScreen();
				} else if (document.documentElement.webkitRequestFullScreen) {
					document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
				}
				
				winMenuFullScreen.activate();
				
			} else {
				if (document.cancelFullScreen) {
					document.cancelFullScreen();
				} else if (document.mozCancelFullScreen) {
					document.mozCancelFullScreen();
				} else if (document.webkitCancelFullScreen) {
					document.webkitCancelFullScreen();
				}
				
				winMenuFullScreen.deactivate();
				
			}
		}
		
		return false;
	}
	
})();