(function() {
	"use strict";
	
	// !DO:NOT:BUNDLE!
	
	EDITOR.plugin({
		desc: "Launch noVNC",
		load: function() {
			
			var char_V = 86;
			
			EDITOR.bindKey({desc: "Launch noVNC", fun: launchNoVnc, charCode: char_V, combo: CTRL + ALT});
		},
		unload: function() {
			EDITOR.unbindKey(launchNoVnc);
		}
	});
	
	function launchNoVnc() {
		
		var host = "webide.se";
		var port = "5901";
		var pw = "";
		var url = "noVNC/vnc.html??host=" + host + "&port=" + port + "&password=" + encodeURIComponent(pw) + "&autoconnect=true"
		var width = 780; // When Chromium runs fullscreen inside a 800x600 screen
		var height = 553;
		var top = 1;
		var left = 500;
		
		EDITOR.createWindow({url: url, width: width, height: height, top: top, left: left, waitUntilLoaded: true}, winLoaded);
		
		return false;
		
		function winLoaded(err, win) {
			if(err) return alertBox(err.message);
			
			var noVNC_control_bar_anchor = win.document.getElementById("noVNC_control_bar_anchor");
			noVNC_control_bar_anchor.style.display="none"; // Not needed
			win.document.getElementById("noVNC_canvas").style.margin = "0px";
			//win.resizeTo(width, height);
			win.document.getElementById("noVNC_status").style.display="none"; // Flashes so fast we can't read what it says
			
		}
		
	}
	
	
})();
