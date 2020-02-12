(function() {
	"use strict";
	
	EDITOR.plugin({
		desc: "Use GUI apps via VNC",
		load: function loadVnc() {
			
			CLIENT.on("vnc", handleVnc);
			
		},
		unload: function unloadVnc() {
			CLIENT.removeEvent("vnc", handleVnc);
		}
	});
	
	function handleVnc(info) {
		
		var scrollbarWidth = 18;
		var scrollbarHeight = 18;
		var url = "noVNC/vnc.html?path=_vnc" + info.vncPort + "&password=" + encodeURIComponent(info.vncPassword) + "&autoconnect=true"
		var width = info.res.x// + scrollbarWidth;
		var height = info.res.y + 1// + scrollbarHeight;
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
			
			setTimeout(function() {
				win.document.title = info.app;
			}, 3000);
			
		}
		
	}
	
	
})();
