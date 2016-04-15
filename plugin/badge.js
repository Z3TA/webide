(function() {
"use strict";
	
	var key_B = 66;
	
	editor.keyBindings.push({charCode: key_B, combo: CTRL, fun: badgeMe});
	
	function badgeMe() {
		var GUI = require('nw.gui').Window.get();
		GUI.setBadgeLabel("99");
		return true;
	}

})();