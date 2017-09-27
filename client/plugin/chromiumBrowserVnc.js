(function() {
	"use strict";
	
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
	
		var width = 800; // When Chromium runs fullscreen inside a 800x600 screen
		var height = 600;
		var top = 1;
		var left = 500;
		
		// Need to create the window right away so it's registered to the event and not stopped (by popup stopper)
		noVncWindow = EDITOR.createWindow(undefined, width, height, top, left);
		
		
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
				
				if(vncChannel) path = loc.protocol + "://" + loc.host + "/vnc/" + vncChannel;
				else if(loc.protocol == "https") path = loc.protocol + "://" + loc.host + "/_vnc" + vncPort;
				
				alertBox(path ? path : vncPort);
				
				//launchNoVnc(vncHost, vncPort, path, vncPassword)
				
			}
		});
		
		return true;
	}
	
	
	function launchNoVnc(host, port, path, pw) {
		
		var url;
		
		if(path) url = "/noVNC/vnc.html?path=" + encodeURIComponent(path) + "&password=" + encodeURIComponent(pw) + "&autoconnect=true";
		else url = "/noVNC/vnc.html?host=" + host + "&port=" + port + "&password=" + encodeURIComponent(pw) + "&autoconnect=true"
		
		noVncWindow.location = url;
		
		var checksIfWinLoaded = 0;
		var checkLoadedInterval = setInterval(winLoadedMaybe, 100);
		var noVNC_control_bar_anchor;
		
		return false;
		
		function winLoadedMaybe() {
			var maxTest = 10;
			console.log("Have the noVNC window loaded yet ? Test " + checksIfWinLoaded + " of " + maxTest);
			noVNC_control_bar_anchor = noVncWindow.document.getElementById("noVNC_control_bar_anchor");
			
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
			noVncWindow.document.getElementById("noVNC_canvas").style.margin = "0px";
			//noVncWindow.resizeTo(width, height);
			noVncWindow.document.getElementById("noVNC_status").style.display="none"; // Flashes so fast we can't read what it says
			
		}
		
	}
	
	
})();
