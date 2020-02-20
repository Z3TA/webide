
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
				if(state != EDITOR.settings.jsx) toggleJsx(state);
			});
			
		},
		unload: function unloadEditorSettings() {
			EDITOR.windowMenu.remove(wmJsx);
			wmJsx = null;
			
			
		}
	});
	
	
	function toggleJsx(toState) {
		
		if(toState == undefined) {
			var state = EDITOR.settings.jsx;
		}
		else {
			var state = !toState;
		}
		
		if(state === true) {
			EDITOR.settings.jsx = false;
			wmJsx.deactivate();
		}
		else {
			EDITOR.settings.jsx = true;
			wmJsx.activate();
		}
		
		EDITOR.saveSettings("jsx", EDITOR.settings.jsx);
		
		if(toState == undefined) alertBox("You need to reload files for settings to take effect");
		
	}
	
	
})();
