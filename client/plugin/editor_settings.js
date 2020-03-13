
/*
	
	Update editor settings
	
*/

(function() {
	"use strict";
	
	var windowMenu;
	
	var wmJsx;
	
	EDITOR.plugin({
		desc: "Update editor settings from window menu",
		load: function loadEditorSettings() {
			wmJsx = EDITOR.windowMenu.add(S("parse jsx"), [S("editor"), S("settings"), 50], toggleJsx);
			wmJsx.domElement.title = "(can be buggy) enabled by default on .jsx and .tsx files";
			EDITOR.loadSettings("jsx", EDITOR.settings.jsx, function connectionStatusSettingsLoaded(state) {
				console.log("toggleJsx: loadSettings: state=" + JSON.stringify(state));
				if(state != EDITOR.settings.jsx) toggleJsx(state);
			});
			
		},
		unload: function unloadEditorSettings() {
			EDITOR.windowMenu.remove(wmJsx);
			wmJsx = null;
			
			
		}
	});
	
	
	function toggleJsx(toState) {
		
		if(toState == undefined || (toState instanceof File)) {
			var state = EDITOR.settings.jsx;
		}
		else if(typeof toState == "boolean") {
			var state = !toState;
		}
		else throw new Error("toState=" + JSON.stringify(toState) + " (" + (typeof toState) + ")");
		
		console.log("toggleJsx: toState=" + JSON.stringify(toState) + " state=" + state + " (" + (typeof state) + ")");
		
		if(state === true) {
			EDITOR.settings.jsx = false;
			wmJsx.deactivate();
		}
		else {
			EDITOR.settings.jsx = true;
			wmJsx.activate();
		}
		
		console.log("toggleJsx: EDITOR.saveSettings: " + JSON.stringify(EDITOR.settings.jsx));
		
		EDITOR.saveSettings("jsx", EDITOR.settings.jsx);
		
		if(toState == undefined) alertBox("You need to reload files for settings to take effect");
		
	}
	
	
})();
