(function() {
"use strict";

	var defaultLeftMargin = 0;
	var defaultRightMargin = 0;
	var afterResize = false;
	
	EDITOR.plugin({
		desc: "Dynamic margins",
		load: function loadDynamicMargins() {
			
			defaultLeftMargin = EDITOR.settings.leftMargin;
			defaultRightMargin = EDITOR.settings.rightMargin;
			
			EDITOR.on("beforeResize", changeMarginMaybe);
			
		},
		unload: function unloadDynamicMargins() {
			
			EDITOR.removeEvent("beforeResize", changeMarginMaybe);
			
		}
	});

var changeLaterTimeout;

	function changeMarginMaybe(file, windowWidth) {
		
		if(!file) {
clearTimeout(changeLaterTimeout);
			changeLaterTimeout = setTimeout(function() {
				setMargin(file, windowWidth);
			}, 1000);
			afterResize = true;
			return;
		}

		afterResize = false;
		
		setMargin(file, windowWidth);
		
		return ALLOW_DEFAULT;
	}
	
	function setMargin(file, windowWidth) {
if(!file) return;
		if(!(file instanceof File)) return;
		
		/*
			Problem: We don't know the canvasWidth until after the resize, but we want to set the margin Before the resize
		*/
		
		//console.log("setMargin: EDITOR.view.canvasWidth=" + EDITOR.view.canvasWidth + " windowWidth=" + windowWidth);
		
		if(windowWidth > 1000 || EDITOR.view.canvasWidth > 600) {
			EDITOR.settings.leftMargin = defaultLeftMargin;
			EDITOR.settings.rightMargin = defaultRightMargin;
		}
		else {
			var maxLine = Math.max(10, file.grid.length+1);
			var lineLetters = (" " + maxLine).trim().length;
			var margin = Math.floor(EDITOR.settings.gridWidth * lineLetters + EDITOR.settings.gridWidth + 5);
			
			EDITOR.settings.leftMargin = margin;
			EDITOR.settings.rightMargin = margin;
			
		}
		
		if(afterResize) EDITOR.resizeNeeded();
		
	}
	
	
	
	
})();
