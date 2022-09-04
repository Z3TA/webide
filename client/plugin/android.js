/*
	
	Known issues:
* Android emulator settings screen cant be closed
	
*/

(function() {
	"use strict";

var windowMenu;
	var discoveryBarIcon;
	var myDescription = "Android emulator";

	//console.log("android.js");
	
	EDITOR.plugin({
		desc: myDescription,
		load: function loadAndroid() {
			windowMenu = EDITOR.windowMenu.add(S("androidEmulator"), [S("tools"), 90], startEmulatorFromWindowMenu);

			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/android.svg", 120, S("androidEmulator"), "AVD", emulatorFromDiscoveryBar);

CLIENT.on("androidEmulatorStatus", androidEmulatorStatus);

			CLIENT.on("loginSuccess", disableAndroidSupportMaybe);
			
			//console.log("android.js plugin loaded!");
			
		},
		unload: function unloadAndroid() {
			EDITOR.windowMenu.remove(windowMenu);
			windowMenu = null;
			
EDITOR.discoveryBar.remove(discoveryBarIcon);

			CLIENT.removeEvent("androidEmulatorStatus");
			
			CLIENT.removeEvent("loginSuccess", disableAndroidSupportMaybe);
		}
	});
	
	function disableAndroidSupportMaybe(login) {
		if(!login.tld) {
			//console.warn("Disabling Android AVD plugin");
			EDITOR.disablePlugin(myDescription, myDescription);
			return;
}
	}
	
	// event below is not yet implemented
	function androidEmulatorStatus(status) {
		if(status.started) {
windowMenu.activate();
			discoveryBarIcon.activate();
}
		if(status.stopped) {
windowMenu.deactivate();
			discoveryBarIcon.deactivate();
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

		var phoneWidth = 500;
		var settingsWidth = 900;
		
		var emulatorWidth = Math.min(screen.width, phoneWidth+settingsWidth);
		var emulatorHeight = Math.min(screen.height, 900);;
		
		EDITOR.virtualDisplay.show(emulatorWidth, emulatorHeight, displayReady);
		
		function displayReady() {
			var startTimeout = 10000;
			CLIENT.cmd("android.startEmulator", {}, startTimeout, function(err) {
				if(err) {
					// The emulator is a bit random if it starts or not...
					var msg = "If you do not see the Android Emulator, you may try clicking on the Android icon again! Error: " + err.message;
					
					alertBox(msg);
					
					return;
				}
				//else {console.log("Android emulator started successfully!?");}

				windowMenu.activate();
				discoveryBarIcon.classList.add("active");

});
		}
		
return PREVENT_DEFAULT;
	}
	
})();
