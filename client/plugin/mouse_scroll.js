

(function() {
	
	"use strict";

	var originalTopMargin = EDITOR.settings.topMargin;
	var deltaNext = 0;
	
	var lastScroll = new Date();
	var lastSmoothScroller;
	
	EDITOR.plugin({
		desc: "Scroll using mouse wheel",
		load: function loadMouseWheelScroll() {
			EDITOR.on("mouseScroll", onScroll);
		},
		unload: function unloadMouseWheelScroll() {
			EDITOR.removeEvent("mouseScroll", onScroll);
		},
	});

	function onScroll(dir, steps, combo, scrollEvent) {
		
		var time = new Date();
		var deltaY = Math.abs(scrollEvent.deltaY)
		
		if(!deltaY) deltaY = 53; // Some browsers (Firefox) don't give deltaY
		
		/*
			Sometimes the deltaY can be wicked, which causes a big jump...

			it seem wheelDelta and wheelDeltaY are also wicked when deltaY is wicked

			it happens more often if you scroll agressively,
			but it's very annoying when it happens when you want to scroll slowly...

			Macbooks probably works in a stupid way, so make sure you test on a Macbook when trying to fix...
		*/

		if(deltaY > 100) {
			UTIL.objInfo(scrollEvent);
		}


		var scrollSpeed = Math.floor((deltaY + deltaNext) * EDITOR.settings.scrollSpeedMultiplier);
		
		console.log("mouse_scroll: onScroll: scrollEvent{deltaY:" + scrollEvent.deltaY + " wheelDelta:" + scrollEvent.wheelDelta + " wheelDeltaY:" + scrollEvent.wheelDeltaY + "} scrollSpeed=" + scrollSpeed + " deltaY=" + deltaY + " deltaNext=" + deltaNext + " EDITOR.settings.scrollSpeedMultiplier=" + EDITOR.settings.scrollSpeedMultiplier + " dir=" + dir + " ");

		//console.log("mouse_scroll: onScroll: dir=" + dir + " time=" + (time - lastScroll) + " scrollSpeed=" + scrollSpeed + " deltaNext=" + deltaNext + " deltaY=" + deltaY + " scrollEvent.deltaY=" + scrollEvent.deltaY);
		
		//if((time - lastScroll) < 58 && navigator.platform.indexOf("Mac") != -1) {
		// It's annoying if we limit scroll speed on most systems
		// But on Mac it's super fast, so it's more annoying because it's too fast.
		//console.log("mouse_scroll: onScroll: skipped scroll dir!");
		//return; // Fix insane fast scrolling
		//}
		
		
		if(scrollSpeed == 0) {
			console.warn("mouse_scroll: onScroll: Incrementing deltaNext=" + deltaNext + " with deltaY=" + deltaY + " because scrollSpeed=" + scrollSpeed);
			deltaNext += deltaY;
		}
		else deltaNext = 0;
		
		var timeDiff = time - lastScroll;
		lastScroll = time;
		
		if(combo.sum == CTRL) {
			// Resize text
			//console.log("mouse_scroll: onScroll: Not scrolling because CTRL key was down");
			return;
		}
		
		if(combo.sum != 0) {
			return;
		}
			
			var file = EDITOR.currentFile;
			
if(file == undefined) return;
			if(file.grid == undefined) return;
			
			if(file) {
				
				var maxStartRow = Math.max(0, EDITOR.currentFile.grid.length - EDITOR.view.visibleRows/2);
				
				
				
				// Smooth scroll if scrollSpeed == 1 !?
				
				var startRow = file.startRow + scrollSpeed * dir;
				
				
				if(startRow > maxStartRow) {
					startRow = maxStartRow;
				}
				
			console.log("mouse_scroll: onScroll: file.startRow=" + file.startRow + " maxStartRow=" + maxStartRow + " startRow=" + startRow + " EDITOR.settings.topMargin=" + EDITOR.settings.topMargin + " originalTopMargin=" + originalTopMargin + " file.path=" + file.path);
			
				/*
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
				*/
				
				
				/*
					bugfix: If we have scrolled up, then resize the window, the view will be off because of the new topMargin!!
					So we have to reset the visibleRows (in case there was a resize).
				
				me from the future: EDITOR.resize is responsible for EDITOR.view.visibleRows - yes !?
			*/
				//EDITOR.view.visibleRows = Math.ceil((EDITOR.view.canvasHeight - EDITOR.settings.topMargin - EDITOR.settings.bottomMargin) / EDITOR.settings.gridHeight);

			//console.log("mouse_scroll: onScroll: ... startRow=" +startRow);
			//console.log("mouse_scroll: onScroll: EDITOR.settings.topMargin=" +EDITOR.settings.topMargin);

				if(startRow < 0) startRow = 0;
				
				file.scrollTo(undefined, startRow);
				
				/*
					Doing smooth scrollling turned out to be difficult ...
					Browsers send the scoll event many times, in different rates
					
				*/
				
			}
		//else {console.warn("mouse_scroll: onScroll: Scrolling, but no currentFile!")}

		
		
		EDITOR.renderNeeded();
		
	}
	
})();