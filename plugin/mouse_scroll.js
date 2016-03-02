

(function() {
	
	"use strict";

	var originalTopMargin = editor.settings.topMargin;

	editor.on("scroll", onScroll);
	
	
	function onScroll(dir, steps, combo) {
		
		if(combo.sum == CTRL) {
			// Resize text
			console.log("yo");
		}
		
		else {
			
			var file = editor.currentFile;
			
			if(file) {
				
				var maxStartRow = Math.max(0, editor.currentFile.grid.length - editor.view.visibleRows/2);
				
				var startRow = file.startRow + editor.settings.scrollStep * dir;
				
				
				if(startRow > maxStartRow) {
					startRow = maxStartRow;
				}
				
				console.log("file.startRow=" + file.startRow);
				console.log("maxStartRow=" + maxStartRow);
				console.log("startRow=" + startRow);
				console.log("editor.settings.topMargin=" + editor.settings.topMargin);
				console.log("originalTopMargin=" + originalTopMargin);
				
				if(startRow < 0) {
					// We are scrolling up above the first row, increase the top margin instead!
					
					// No! This is a ugly hack!
					//editor.settings.topMargin += Math.abs(startRow) * editor.settings.gridHeight;
					startRow = 0
				}
				else if(startRow > 0 && editor.settings.topMargin > originalTopMargin) {
					// We are scrolling down, and the top margin is larger then the original
					editor.settings.topMargin -= Math.abs(startRow) * editor.settings.gridHeight;
					startRow = 0;
					if(editor.settings.topMargin < originalTopMargin) editor.settings.topMargin = originalTopMargin;


				}


				
				// Dont allow scrolling up higher then half of the visible space
				var maxTopMargin = Math.floor((editor.view.visibleRows-2) * editor.settings.gridHeight / 2);
				if(editor.settings.topMargin > maxTopMargin) editor.settings.topMargin = maxTopMargin;

				
				/*
					bugfix: If we have scrolled up, then resize the window, the view will be off because of the new topMargin!!
					So we have to reset the visibleRows (in case there was a resize).
				*/
				editor.view.visibleRows = Math.ceil((editor.view.canvasHeight - editor.settings.topMargin - editor.settings.bottomMargin) / editor.settings.gridHeight);

				
				
				console.log("... startRow=" +startRow);
				console.log("editor.settings.topMargin=" +editor.settings.topMargin);


				file.scrollTo(undefined, startRow);
				
				
			}
			else {
				console.warn("Scrolling, but no currentFile!")
				
			}
		}
		
		editor.renderNeeded();
		
	}
	
})();