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

		CLIENT.cmd("android.startEmulator", {}, function(err) {
if(err) return alertBox(err.message);

EDITOR.virtualDisplay.show();

});

return PREVENT_DEFAULT;
	}
	
})();
