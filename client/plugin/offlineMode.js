(function() {
	"use strict";

	var menuToggleOfflineMode;

	EDITOR.plugin({
		desc: "Toggle offline mode",
		load: function loadOfflineToggler() {

			menuToggleOfflineMode = EDITOR.windowMenu.add(S("offline mode"), [S("Editor"), 8], toggleOfflineMode);

			EDITOR.on("offlineMode", offlineModeEvent); // Other plugins might also toggle offline mode

			EDITOR.on("start", checkIfOnline);

		},
		unload: function unloadOfflineToggler() {

			EDITOR.windowMenu.remove(menuToggleOfflineMode);

			EDITOR.removeEvent("offlineMode", offlineModeEvent);

			EDITOR.removeEvent("start", checkIfOnline);
		}
	});

	function checkIfOnline(babar) {
		/*
			note: We might be working locally, so check both navigator.onLine and CLIENT.connected (if we have a server connection)!

			Offline mode is only helpful if you want to use https://webide.se as an "native" editor. If you run webide locally (npx webide.se) everything works "offline".'
		*/

		var runningLocally = window.location.origin.indexOf(":8099") != -1; // 

		if(!navigator.onLine && !CLIENT.connected && !runningLocally || 1==1) {
			var enterOfflineMode = "Enter offline mode";
			var continueTrying = "Continue trying to re-connect";

			confirmBox('The editor is unable to connect to the backend. Do you want to work in offline mode ?\n' + 
			'PS. You can also <a href="https://webide.se/about/about.htm#local">install the editor on the device itself</a>', [enterOfflineMode, continueTrying], function(answer) {
				if(answer == enterOfflineMode) {
					EDITOR.changeOfflineMode(true, function(err) {
						if(err) alertBox(err.message);
					});
				}
			});

		}
	}

	function toggleOfflineMode() {
		var offline = menuToggleOfflineMode.toggle();
	
		EDITOR.changeOfflineMode(offline);

	}

	function offlineModeEvent(offline) {

		if(offline) menuToggleOfflineMode.activate();
		else menuToggleOfflineMode.deactivate();

		return ALLOW_DEFAULT;
	}


})();