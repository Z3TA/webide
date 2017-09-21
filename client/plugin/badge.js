(function() {
	"use strict";
	
	/*
	
		Idea: Connect it to a bug tracker and show live updates of how many bugs there are
	
	*/
	
	var key_B = 66;
	
	EDITOR.bindKey({desc: "Show a message in window taskbar icon", charCode: key_B, combo: CTRL + ALT, fun: badgeMe});
	
	function badgeMe() {
		
		var browser = browser || chrome;
		browser.browserAction.setBadgeText({text: "99"});
		
		return true;
	}

})();