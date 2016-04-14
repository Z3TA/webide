(function() {
"use strict";
	
	/*
Press F11 to enter/exit full screen mode.

	*/
	
	var keyF11 = 122;
	var GUI = require('nw.gui').Window.get();
	
	editor.keyBindings.push({charCode: keyF11, fun: toggleTullScreen});
	
	function toggleTullScreen() {
		GUI.toggleKioskMode();
		return false;
	}
	
})();