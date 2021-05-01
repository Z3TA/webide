(function() {
	"use strict";
	
	// Showing the local desktop on the desktop you are already on will result in an endless mirror-in-mirror loop
	var h = window.location.hostname;
	if(h == "127.0.0.1" || h == "localhost") return;
	
	var windowMenu;
	var discoveryBarIcon;
	var desktopWidth = Math.round(   Math.min(  1000, screen.width, Math.max(screen.width/3, 1000)  )   );
	var desktopHeight = Math.round(   Math.min(  1000, screen.height-110, Math.max(screen.height, 900)  )   );
	
	EDITOR.plugin({
		desc: "A virtual desktop for GUI apps",
		load: function loadDesktop() {
			
			EDITOR.bindKey({desc: "Show Desktop", charCode: 68, combo: CTRL+SHIFT, fun: showDesktopFromKeyboardCombo}); // D
			
			windowMenu = EDITOR.windowMenu.add(S("displayDesktop"), [S("View"), 1], toggleDisplayFromWindowMenu, showDesktopFromKeyboardCombo);
			
			
			EDITOR.on("virtualDisplay", virtualDisplayStatus);
			
			//discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/monitor.svg", 110,  S("displayDesktop") + " (" + EDITOR.getKeyFor(showDesktopFromKeyboardCombo) + ")", "dspl", toggleDisplayFromDiscoveryBar);
			// Icon created by: https://www.flaticon.com/authors/phatplus
			
		},
		unload: function unloadDesktop() {
			EDITOR.unbindKey(showDesktopFromKeyboardCombo);
			
			EDITOR.windowMenu.remove(windowMenu);
			windowMenu = null;
			
			EDITOR.removeEvent("virtualDisplay", virtualDisplayStatus);
			
			if(discoveryBarIcon) EDITOR.discoveryBar.remove(discoveryBarIcon);
		}
	});
	
	function virtualDisplayStatus(status) {
		//console.log("display: virtualDisplayStatus=" + status);
		if(status == "open") {
windowMenu.activate();
			if(discoveryBarIcon) discoveryBarIcon.classList.add("active");
		}
		else if(status == "close") {
			windowMenu.deactivate();
			if(discoveryBarIcon) discoveryBarIcon.classList.remove("active");
		}
	}
	
	function toggleDisplayFromDiscoveryBar() {
		return toggleDisplay();
	}
	
	function toggleDisplayFromWindowMenu() {
		//console.log("display: toggleDisplayFromWindowMenu!");
		return toggleDisplay();
	}
	
	function toggleDisplay() {
		//console.log("display: toggleDisplay!");
		if(EDITOR.virtualDisplay.open) {
			//console.log("display: Virtual display was open. Hiding!");
			EDITOR.virtualDisplay.hide();
		}
		else if(!EDITOR.virtualDisplay.open) {
			//console.log("display: Virtual display was NOT open! Showing it...");
			EDITOR.virtualDisplay.show(desktopWidth, desktopHeight, function(err) {
				if(err) alertBox("Unable to show the local desktop! Error: " + err.message);
				//console.log("display: Virtual display should now be visible!");
			});
		}
		
		return PREVENT_DEFAULT;
	}
	
	function showDesktopFromKeyboardCombo() {
		return showDesktop();
	}
	
	function showDesktop() {
		
		return EDITOR.virtualDisplay.show(desktopWidth, desktopHeight, function(err) {
			if(err) alertBox(err.message);
		});
	}
	
})();
