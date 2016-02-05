

(function() {
	
	"use strict";

	var originalTopMargin = global.settings.topMargin;

	editor.on("scroll", onScroll);
	
	
	function onScroll(dir, steps, combo) {
		
		if(combo.sum == CTRL) {
			// Resize text
			console.log("yo");
		}
		
		else {
			
			var file = global.currentFile;
			
			if(file) {
				
				var maxStartRow = Math.max(0, global.currentFile.grid.length - global.view.visibleRows/2);
				
				var startRow = file.startRow + global.settings.scrollStep * dir;
				
				
				if(startRow > maxStartRow) {
					startRow = maxStartRow;
				}
				
				console.log("file.startRow=" + file.startRow);
				console.log("maxStartRow=" + maxStartRow);
				console.log("startRow=" + startRow);
				console.log("global.settings.topMargin=" + global.settings.topMargin);
				console.log("originalTopMargin=" + originalTopMargin);
				
				if(startRow < 0) {
					// We are scrolling up above the first row, increase the top margin instead!
					
					// No! This is a ugly hack!
					//global.settings.topMargin += Math.abs(startRow) * global.settings.gridHeight;
					startRow = 0
				}
				else if(startRow > 0 && global.settings.topMargin > originalTopMargin) {
					// We are scrolling down, and the top margin is larger then the original
					global.settings.topMargin -= Math.abs(startRow) * global.settings.gridHeight;
					startRow = 0;
					if(global.settings.topMargin < originalTopMargin) global.settings.topMargin = originalTopMargin;


				}


				
				// Dont allow scrolling up higher then half of the visible space
				var maxTopMargin = Math.floor((global.view.visibleRows-2) * global.settings.gridHeight / 2);
				if(global.settings.topMargin > maxTopMargin) global.settings.topMargin = maxTopMargin;

				
				/*
					bugfix: If we have scrolled up, then resize the window, the view will be off because of the new topMargin!!
					So we have to reset the visibleRows (in case there was a resize).
				*/
				global.view.visibleRows = Math.ceil((global.view.canvasHeight - global.settings.topMargin - global.settings.bottomMargin) / global.settings.gridHeight);

				
				
				console.log("... startRow=" +startRow);
				console.log("global.settings.topMargin=" +global.settings.topMargin);


				file.scrollTo(undefined, startRow);
				
				
			}
			else {
				console.warn("Scrolling, but no currentFile!")
				
			}
		}
		
		editor.renderNeeded();
		
	}
	
})();