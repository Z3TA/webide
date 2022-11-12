(function() {
	"use strict";
	
	/*
	
		!DO:NOT:BUNDLE!
		
		Idea: Connect it to a bug tracker and show live updates of how many bugs there are
	
	*/
	
	var key_B = 66;
	
	EDITOR.bindKey({desc: "Show a message in window taskbar icon", charCode: key_B, combo: CTRL + ALT, fun: badgeMe});
	
	function badgeMe() {
		
		var browser = window.browser || window.chrome;
		if(browser && browser.browserAction && typeof browser.browserAction.setBadgeText == "function") browser.browserAction.setBadgeText({text: "99"});
		else alertBox("badge text not supported by your browser (" + BROWSER + ")");
		
		return true;
	}

})();