
(function() {
"use strict";

	var helpWindow;
	
EDITOR.plugin({
		desc: "Help files",
load: loadHelp,
unload: unloadHelp
});

function loadHelp() {

		var keyF1 = 112;
		
		EDITOR.bindKey({desc: "Show help files", fun: showHelp, charCode: keyF1, combo: 0});
		
}

function unloadHelp() {
		EDITOR.unbindKey(showHelp);
		
		if(helpWindow) helpWindow.close();
}
	
	function showHelp() {
		
		var width = window.innerWidth
		|| document.documentElement.clientWidth
		|| document.body.clientWidth;
		
		var height = window.innerHeight
		|| document.documentElement.clientHeight
		|| document.body.clientHeight;
		
		var options = {
			url: "https://webide.se/about/index.htm",
			width: Math.min(width, 900),
			height: Math.min(height, 700)
		};
		
		EDITOR.createWindow(options, function windowCreated(err, theWindow) {
			if(err) return alertBox(err.message);
			
			helpWindow = theWindow;
		});
		
		return false;
	}
	

})();