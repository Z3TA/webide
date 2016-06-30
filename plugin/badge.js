(function() {
	"use strict";
	
	/*
	
		Idea: Connect it to a bug tracker and show live updates of how many bugs there are
	
	*/
	
	var key_B = 66;
	
	editor.bindKey({desc: "Show a message in window taskbar icon", charCode: key_B, combo: CTRL, fun: badgeMe});
	
	function badgeMe() {
		var GUI = require('nw.gui').Window.get();
		GUI.setBadgeLabel("99");
		return true;
	}

})();