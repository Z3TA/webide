(function() {
	"use strict";

	var winMenuItem;
	var defaultSubpixelAntialias = EDITOR.settings.sub_pixel_antialias;
	console.log("toggle_subpixel_antialias: defaultSubpixelAntialias=" + defaultSubpixelAntialias);
	
EDITOR.plugin({
		desc: "Able to toggle sub pixel antialias",
		load: function loadExploadingCharacters() {
			
			winMenuItem = EDITOR.windowMenu.add(S("sub_pixel_antialias"), [S("View"), 60], toggleSubpixelAntialias);
			if(EDITOR.settings.sub_pixel_antialias) winMenuItem.activate();
			else winMenuItem.deactivate();
			
			EDITOR.on("storageReady", function setSubpixelAntialiasWhenStorageReady() {
				console.log("toggle_subpixel_antialias: storageReady!");
				
				if(EDITOR.storage.getItem("sub_pixel_antialias") == "true") {
					console.log("toggle_subpixel_antialias: Enable by editor storage");
					setSubpixelAntialias(true);
					winMenuItem.activate();
				}
				else if(EDITOR.storage.getItem("sub_pixel_antialias") == "false") {
					console.log("toggle_subpixel_antialias: Disable by editor storage");
					setSubpixelAntialias(false);
					winMenuItem.deactivate();
				}
				else {
					// No saved setting
					console.log("toggle_subpixel_antialias: No settings in EDITOR.storage");
					// Automatically turn off sub-pixel antialias if the device have a high pixel density
					if(window.devicePixelRatio > 1) {
						setSubpixelAntialias(false);
						winMenuItem.deactivate();
						console.log("toggle_subpixel_antialias: Disabled because window.devicePixelRatio=" + window.devicePixelRatio);
					 }
					
				}
			});
			
		},
		unload: function unloadExploadingCharacters() {
			
			setSubpixelAntialias(defaultSubpixelAntialias)
			
			EDITOR.windowMenu.remove(winMenuItem);
			
		}
	});
	
	function setSubpixelAntialias(state) {
		console.warn("toggle_subpixel_antialias: Setting EDITOR.settings.sub_pixel_antialias=" + state);
		EDITOR.settings.sub_pixel_antialias = state;
		
		
		// We must re-create the canvas in order to change subpixel antialias!
		var oldCanvas = document.getElementById("editorCanvas");
		var newCanvas = document.createElement("canvas");
		// Get the values from the original canvas
		newCanvas.setAttribute("class", oldCanvas.getAttribute("class"));
		newCanvas.setAttribute("aria-label", oldCanvas.getAttribute("aria-label"));
		newCanvas.setAttribute("role", oldCanvas.getAttribute("role"));
		newCanvas.setAttribute("aria-multiline", oldCanvas.getAttribute("aria-multiline"));
		newCanvas.setAttribute("contenteditable", oldCanvas.getAttribute("contenteditable"));
		
		var content = document.getElementById("content");
		content.insertBefore(newCanvas, oldCanvas);
		content.removeChild(oldCanvas);
		newCanvas.id = "editorCanvas";
		newCanvas.style.display="block";
		
		EDITOR.canvas = EDITOR.initCanvas(newCanvas);
		EDITOR.getCanvasContext(EDITOR.canvas);
		EDITOR.resize(true);
		
		
		
	}
	
	function toggleSubpixelAntialias() {
		
		console.log("toggle_subpixel_antialias: toggleSubpixelAntialias: EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias);
		
		if(EDITOR.settings.sub_pixel_antialias) {
			setSubpixelAntialias(false);
			winMenuItem.deactivate();
		}
		else {
			setSubpixelAntialias(true);
			winMenuItem.activate();
		}
		
		// Remember setting
		EDITOR.storage.setItem("sub_pixel_antialias", EDITOR.settings.sub_pixel_antialias);
		
	}
	
})();
