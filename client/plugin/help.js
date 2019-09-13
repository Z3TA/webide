
(function() {
"use strict";

	var helpWindow;
	var winMenuHelp;
	
EDITOR.plugin({
		desc: "Help files",
load: loadHelp,
unload: unloadHelp
});

function loadHelp() {

		var keyF1 = 112;
		
		EDITOR.bindKey({desc: "Show help files", fun: showHelp, charCode: keyF1, combo: 0});
		
		winMenuHelp = EDITOR.windowMenu.add("Documentation", ["Editor", 12], showHelp);
		
}

function unloadHelp() {
		EDITOR.unbindKey(showHelp);
		
		EDITOR.windowMenu.remove(winMenuHelp);
		
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
			
			EDITOR.stat("show_documentation");
		});
		
		return false;
	}
	

})();