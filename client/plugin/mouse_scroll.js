

(function() {
	
	"use strict";

	var originalTopMargin = EDITOR.settings.topMargin;
	var deltaNext = 0;
	
	
	EDITOR.on("mouseScroll", onScroll);
	
	var lastScroll = new Date();
	
	function onScroll(dir, steps, combo, scrollEvent) {
		
		var time = new Date();
		var deltaY = Math.abs(scrollEvent.deltaY)
		var scrollSeed = Math.floor((deltaY + deltaNext) / 17);
		
		console.log("scroll dir=" + dir + " time=" + (time - lastScroll) + " scrollSeed=" + scrollSeed + " deltaNext=" + deltaNext + " deltaY=" + deltaY);
		
		//if((time - lastScroll) < 58 && navigator.platform.indexOf("Mac") != -1) {
			// It's annoying if we limit scroll speed on most systems
			// But on Mac it's super fast, so it's more annoying because it's too fast.
			//console.log("skipped scroll dir!");
			//return; // Fix insane fast scrolling
		//}
		
		
		if(scrollSeed == 0) deltaNext += deltaY;
		else deltaNext = 0;
		
		lastScroll = time;
		
		if(combo.sum == CTRL) {
			// Resize text
			console.log("yo");
		}
		
		else {
			
			var file = EDITOR.currentFile;
			
			if(file) {
				
				var maxStartRow = Math.max(0, EDITOR.currentFile.grid.length - EDITOR.view.visibleRows/2);
				
				
				
				// Smooth scroll if scrollSeed == 1 !?
				
				var startRow = file.startRow + scrollSeed * dir;
				
				
				if(startRow > maxStartRow) {
					startRow = maxStartRow;
				}
				
				console.log("file.startRow=" + file.startRow);
				console.log("maxStartRow=" + maxStartRow);
				console.log("startRow=" + startRow);
				console.log("EDITOR.settings.topMargin=" + EDITOR.settings.topMargin);
				console.log("originalTopMargin=" + originalTopMargin);
				
				if(startRow < 0) {
					// We are scrolling up above the first row, increase the top margin instead!
					
					// No! This is a ugly hack!
					//EDITOR.settings.topMargin += Math.abs(startRow) * EDITOR.settings.gridHeight;
					startRow = 0
				}
				else if(startRow > 0 && EDITOR.settings.topMargin > originalTopMargin) {
					// We are scrolling down, and the top margin is larger then the original
					EDITOR.settings.topMargin -= Math.abs(startRow) * EDITOR.settings.gridHeight;
					startRow = 0;
					if(EDITOR.settings.topMargin < originalTopMargin) EDITOR.settings.topMargin = originalTopMargin;


				}


				
				// Dont allow scrolling up higher then half of the visible space
				var maxTopMargin = Math.floor((EDITOR.view.visibleRows-2) * EDITOR.settings.gridHeight / 2);
				if(EDITOR.settings.topMargin > maxTopMargin) EDITOR.settings.topMargin = maxTopMargin;

				
				/*
					bugfix: If we have scrolled up, then resize the window, the view will be off because of the new topMargin!!
					So we have to reset the visibleRows (in case there was a resize).
				*/
				EDITOR.view.visibleRows = Math.ceil((EDITOR.view.canvasHeight - EDITOR.settings.topMargin - EDITOR.settings.bottomMargin) / EDITOR.settings.gridHeight);

				
				
				console.log("... startRow=" +startRow);
				console.log("EDITOR.settings.topMargin=" +EDITOR.settings.topMargin);


				file.scrollTo(undefined, startRow);
				
				
			}
			else {
				console.warn("Scrolling, but no currentFile!")
				
			}
		}
		
		EDITOR.renderNeeded();
		
	}
	
})();