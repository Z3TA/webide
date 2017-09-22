(function() {
	"use strict";
	
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
		
		var win = EDITOR.createWindow(url, width, height, top, left);
		
		// Why doesn't it load automatically !?
		win.location = url;
		
		var checksIfWinLoaded = 0;
		var checkLoadedInterval = setInterval(winLoadedMaybe, 100);
		var noVNC_control_bar_anchor;
		
		return false;
		
		function winLoadedMaybe() {
			var maxTest = 10;
			console.log("Have the noVNC window loaded yet ? Test " + checksIfWinLoaded + " of " + maxTest);
			noVNC_control_bar_anchor = win.document.getElementById("noVNC_control_bar_anchor");
			
			if(noVNC_control_bar_anchor) {
				clearInterval(checkLoadedInterval);
				winLoaded();
			}
			else {
				if(++checksIfWinLoaded > maxTest) {
					clearInterval(checkLoadedInterval);
					alertBox("It seems noVNC failed to load ... !?");
				};
			}
		}
		
		function winLoaded() {
			//alertBox("noVNC loaded!");
			
			noVNC_control_bar_anchor.style.display="none"; // Not needed
			win.document.getElementById("noVNC_canvas").style.margin = "0px";
			//win.resizeTo(width, height);
			win.document.getElementById("noVNC_status").style.display="none"; // Flashes so fast we can't read what it says
			
		}
		
	}
	
	
})();
