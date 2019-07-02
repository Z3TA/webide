(function() {
	"use strict";
	
	/*
		!DO:NOT:BUNDLE!
		
		todo: Implement chromium debug api!?
		
		
	*/
	
	var noVncWindow;
	
	EDITOR.plugin({
		desc: "Run chromium-browser in noVNC",
		load: function() {
			
			var char_C = 67;
			
			EDITOR.bindKey({desc: "Launch chromium-browser in VNC", fun: debugInBrowserVnc, charCode: char_C, combo: CTRL + ALT});
		},
		unload: function() {
			EDITOR.unbindKey(debugInBrowserVnc);
		}
	});
	
	function debugInBrowserVnc() {
	
		
			var reqJson = {
				url: "http://www.webtigerteam.com/johan/"
			};
			
			CLIENT.cmd("debugInBrowserVnc", reqJson, function(err, respJson) {
				if(err) {
					alertBox("Error when running chromium-browser in vnc: " + err.message);
				}
				else {
					
					var vncChannel = respJson.vncChannel;
					var vncPassword = respJson.vncPassword;
					var vncHost = respJson.vncHost;
					var vncPort = respJson.vncPort;
					
					var path = undefined;
					
					var loc = UTIL.getLocation(window.location.href);
					
					if(vncChannel) path = "/vnc/" + vncChannel;
					else if(loc.protocol == "https") path = "/_vnc" + vncPort;
					
					//alertBox((path ? path : vncPort) + " pw=" + vncPassword);
					
					
					launchNoVnc(vncHost, vncPort, path, vncPassword);
					
				}
		});
		
		return true;
		
	}
	
	
	function launchNoVnc(host, port, path, pw) {
		
		var url;
		
		if(path) url = "/noVNC/vnc.html?path=" + encodeURIComponent(path) + "&password=" + encodeURIComponent(pw) + "&autoconnect=true";
		else url = "/noVNC/vnc.html?host=" + host + "&port=" + port + "&password=" + encodeURIComponent(pw) + "&autoconnect=true"
		
		// When Chromium runs fullscreen inside a 800x600 screen
		var width = 800;
		var height = 600;
		var top = 1;
		var left = 500;
		
		// Get rid of the black border (but prevent scrollbars)
		width = 780;
		height = 580;
		
		EDITOR.createWindow({url: url, width: width, height: height, top: top, left: left, waitUntilLoaded: true}, winLoaded);
		
		return false;
		
		function winLoaded(err, theWindow) {
			if(err) return alertBox(err.message);
			
			noVncWindow = theWindow;
			
			var noVNC_control_bar_anchor = noVncWindow.document.getElementById("noVNC_control_bar_anchor");
			noVNC_control_bar_anchor.style.display="none"; // Not needed
			noVncWindow.document.getElementById("noVNC_canvas").style.margin = "0px";
			//noVncWindow.resizeTo(width, height);
			noVncWindow.document.getElementById("noVNC_status").style.display="none"; // Flashes so fast we can't read what it says
			
		}
		
	}
	
	
})();
