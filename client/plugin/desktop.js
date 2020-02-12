(function() {
	"use strict";
	
	var windowMenu;
	var active = false;
	var desktopPassword = "";
	var desktopPort = -1;
	
	EDITOR.plugin({
		desc: "A virtual desktop for GUI apps",
		load: function loadDesktop() {
			
			windowMenu = EDITOR.windowMenu.add(S("desktop"), [S("View"), 1], showDesktopFromWindowMenu, showDesktopFromKeyboardCombo);
			
			EDITOR.bindKey({desc: "Show Desktop", charCode: 68, combo: CTRL, fun: showDesktopFromKeyboardCombo}); // Ctrl+D
			
			CLIENT.on("desktopWindow", handleDekstopEvent);
			
		},
		unload: function unloadDesktop() {
			CLIENT.removeEvent("desktop", handleDekstopEvent);
			
			EDITOR.unbindKey(showDesktopFromKeyboardCombo);
			
			EDITOR.windowMenu.remove(windowMenu);
			windowMenu = null;
			
			
			
		}
	});
	
	function handleDekstopEvent(obj) {
		// Falsh discovery icon!?
		alertBox(JSON.stringify(obj));
	}
	
	function showDesktopFromWindowMenu() {
		return showDesktop();
	}
	
	function showDesktopFromKeyboardCombo() {
		return showDesktop();
	}
	
	function startDesktop(show) {
		CLIENT.cmd("desktop.start", {}, function(err, info) {
			if(err) return alertBox(err.message);
			
			desktopPassword = info.password;
			desktopPort = info.port;
			
			active = true;
			
			if(show) showDesktop()
			
		});
		
	}
	
	function showDesktop() {
		
		if(!active) return startDesktop(true); 
		
		var u = EDITOR.user;
		var proto = window.location.protocol;
		
		var url = "noVNC/vnc.html?host=" + desktopPort + "." + u.domain + "&password=" + encodeURIComponent(desktopPassword) + "&autoconnect=true"
		var width = 800;
		var height = 600 + 1;
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
			
			windowMenu.activate();
			
			win.beforeunload = function() {
				windowMenu.deactivate();
				return true;
			}
			
			setTimeout(function() {
				win.document.title = "Desktop";
			}, 3000);
			
		}
	}
	
	function handleVnc(info) {
		
		var scrollbarWidth = 18;
		var scrollbarHeight = 18;
		var url = "noVNC/vnc.html?path=_vnc" + info.vncPort + "&password=" + encodeURIComponent(info.vncPassword) + "&autoconnect=true"
		var width = info.res.x + scrollbarWidth;
		var height = info.res.y + scrollbarHeight;
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
