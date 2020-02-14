(function() {
	"use strict";

var windowMenu;
	var discoveryBarIcon;
	
	console.log("android.js");
	
	EDITOR.plugin({
		desc: "Android support",
		load: function loadAndroid() {
			windowMenu = EDITOR.windowMenu.add(S("androidEmulator"), [S("tools"), 50], startEmulatorFromWindowMenu);

			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/android.svg", 120, S("androidEmulator"), "AVD", emulatorFromDiscoveryBar);

CLIENT.on("androidEmulatorStatus", androidEmulatorStatus);

			console.log("android.js plugin loaded!");
			
		},
		unload: function unloadAndroid() {
			EDITOR.windowMenu.remove(windowMenu);
			windowMenu = null;
			
EDITOR.discoveryBar.remove(discoveryBarIcon);

			CLIENT.removeEvent("androidEmulatorStatus");
		}
	});
	
	// event below is not yet implemented
	function androidEmulatorStatus(status) {
		if(status.started) {
windowMenu.activate();
discoveryBarIcon.classList.add("active");
}
		if(status.stopped) {
windowMenu.deactivate();
			discoveryBarIcon.classList.remove("active");
		}
	}

	function startEmulatorFromWindowMenu() {
		return startEmulator();
	}

function emulatorFromDiscoveryBar() {
return startEmulator();
}

function startEmulator() {
// We could in theory start the emulator in it's own screen/display/desktop...

		var emulatorWidth = 500;
		var emulatorHeight = 900;
		
		EDITOR.virtualDisplay.show(emulatorWidth, emulatorHeight, displayReady);
		
		function displayReady() {
var startTimeout = 10000;
			CLIENT.cmd("android.startEmulator", {}, startTimeout, function(err) {
				if(err) {
					// The emulator is a bit random if it starts or not...
					var msg = "If you do not see the Android Emulator, try clicking on the Android icon again! Error: " + err.message);
					alertBox(msg);
					
					return;
				}
				
				windowMenu.activate();
				discoveryBarIcon.classList.add("active");

});
		}
		
return PREVENT_DEFAULT;
	}
	
})();
