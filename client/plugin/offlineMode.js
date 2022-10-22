(function() {
	"use strict";

	var menuToggleOfflineMode;

	EDITOR.plugin({
		desc: "Toggle offline mode",
		load: function loadOfflineToggler() {

			menuToggleOfflineMode = EDITOR.windowMenu.add(S("offline mode"), [S("Editor"), 8], toggleOfflineMode);

			EDITOR.on("offlineMode", offlineModeEvent); // Other plugins might also toggle offline mode

		},
		unload: function unloadOfflineToggler() {

			EDITOR.windowMenu.remove(menuToggleOfflineMode);

			EDITOR.removeEvent("offlineMode", offlineModeEvent);

		}
	});

	function toggleOfflineMode() {
		var offline = menuToggleOfflineMode.toggle();
	
		EDITOR.changeOfflineMode(offline);

	}

	function offlineModeEvent(offline) {

		if(offline) menuToggleOfflineMode.activate();
		else menuToggleOfflineMode.deactivate();

	}


})();