(function() {
	
	var TOUCH = false;
	var mouseCounter = 0;
	var touchCounter = 0;
	var verticalScrolling = false;
	var horizontalScrolling = false;
	
	var touchDownX = 0;
	var touchDownY = 0;
	var startRow = 0;
	var startCol = 0;
	var lastPosX = 0;
	var lastPosY = 0;
	var isScrolling = false;
	var scrollSpeedX = 0;
	var scrollSpeedY = 0;
	var lastSpeedMeasureX = 0;
	var lastSpeedMeasureY = 0;
	
	EDITOR.plugin({
		desc: "Allow touch scrolling in right and bottom screen area",
		load: function loadTochScroll() {
			
			// Wait for touch events before activating touch scrolling
			//EDITOR.on("mouseClick", touchMaybeOnMouseDown);
			
			EDITOR.addEvent("mouseClick", {fun: tsTouchDown, dir: "down", targetClass:"fileCanvas", button: 0});
			EDITOR.addEvent("mouseClick", {fun: tsTouchUp, dir: "up", targetClass:"fileCanvas", button: 0});
			
			EDITOR.on("mouseMove", tsTouchMove);
			
		},
		unload: function unloadTouchScroll() {
			
			EDITOR.removeEvent("mouseClick", tsTouchDown);
			EDITOR.removeEvent("mouseClick", tsTouchUp);
			
			EDITOR.removeEvent("mouseClick", tsTouchMove);
			
			EDITOR.removeRender(verticalScrollingRender);
			EDITOR.removeRender(horizontalScrollingRender);
			
		}
	});
	
	function tsTouchDown(x, y) {
		var file = EDITOR.currentFile;
		}
	
	function tsTouchUp() {
		}
	
	
	function tsTouchMove(x, y, target, ev) {
		if(ev.type == "touchmove") {
			// Prevent scrolling of the body
			ev.preventDefault();
			ev.stopPropagation();
			window.scrollTo(0, 0);
			
			// Scroll the text!?
			
			var file = EDITOR.currentFile;
			
			if(!file) return true;
			
			
			console.log("touchmove: isScrolling=" + isScrolling + 
			" x=" + x +
			" y=" + y + 
			" horizontalScrolling=" + horizontalScrolling + 
			" verticalScrolling=" + verticalScrolling);
			
			if(!isScrolling) {
				reset();
				
				isScrolling = true;
				lastMove = new Date();
				
				if(x > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone) && y > (EDITOR.view.canvasHeight - EDITOR.settings.scrollZone)) {
					// In the bottom right corner
					if(Math.abs(x - lastPosX) > Math.abs(y - lastPosY)) {
						EDITOR.addRender(horizontalScrollingRender);
						horizontalScrolling = true;
						}
					else if(Math.abs(x - lastPosX) < Math.abs(y - lastPosY)) {
						EDITOR.addRender(verticalScrollingRender);
						verticalScrolling = true;
						}
					// else: Unable to determine if the user is scrolling horizontally or vertical
					}
				else if(x > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone)) {
					// Inside vertical (row) scroll area
					EDITOR.addRender(verticalScrollingRender);
					verticalScrolling = true;
					}
				else if(y > EDITOR.view.canvasHeight - EDITOR.settings.scrollZone) {
					// Inside horizontal (column) scroll area
					EDITOR.addRender(horizontalScrollingRender);
					horizontalScrolling = true;
					}
			}
			
			// Keep track of swiping speed. Swiping faster should scroll more
			var measureInterval = 50;
			
			if( (new Date()) - lastMove > measureInterval) {
				
				var deltaX = Math.abs(lastSpeedMeasureY - x);
				var deltaY = Math.abs(lastSpeedMeasureX - y);
				
				scrollSpeedX = (deltaX * 0.01);
				scrollSpeedY = (deltaY * 0.05);
				
				lastSpeedMeasureY = y;
				lastSpeedMeasureX = x;
			}
			
			lastMove = new Date();
			
			//if(scrollSpeedX == 0) scrollSpeedX = 1;
			//if(scrollSpeedY == 0) scrollSpeedY = 1;
			
			
			var moveDistanceX = Math.abs(touchDownX - x);
			var moveDistanceY = Math.abs(touchDownY - y);
			
			/*
				Swiping right --> should scroll left
				Swiping left <--- should scroll right
				Swiping up should scroll down
				Swping down should scroll up
			*/
			var moveDirectionX = x > touchDownX ? -1 : 1;
			var moveDirectionY = y > touchDownY ? -1 : 1;
			
			console.log(" -- verticalScrolling=" + verticalScrolling + 
			" horizontalScrolling=" + horizontalScrolling + 
			" moveDirectionX=" + moveDirectionX + 
			" moveDistanceX=" + moveDistanceX + 
			" moveDistanceY=" + moveDirectionY + 
			" scrollSpeedX=" + scrollSpeedX + 
			" scrollSpeedY=" + scrollSpeedY + 
			" x=" + x + 
			" y=" + y + 
			" lastSpeedMeasureX=" + lastSpeedMeasureX + 
			" lastSpeedMeasureY=" + lastSpeedMeasureY + 
			" lastPosX=" + lastPosX + 
			" lastPosY=" + lastPosY + 
			" deltaX=" + deltaX + 
			" deltaY=" + deltaY + "");
			
			if(verticalScrolling) {
				
				var scrollToRow = startRow + Math.round(moveDistanceY * scrollSpeedY * moveDirectionY);
				if(scrollToRow < 0) scrollToRow = 0;
				
				if(isNaN(scrollToRow)) throw new Error("startRow=" + startRow + " startColumn=" + startColumn + " scrollSpeedY=" + scrollSpeedY + " moveDirectionY=" + moveDirectionY);
				
				console.log("file.startRow=" + file.startRow + " scrollToRow=" + scrollToRow);
				
				if(file.startRow != scrollToRow) {
					console.log("Scrolling from row " + file.startRow + " to " + scrollToRow + " deltaY=" + deltaY + " moveDirectionY=" + moveDirectionY + " scrollSpeedY=" + scrollSpeedY + " ");
					
					file.scrollTo(undefined, scrollToRow);
					reset();
					
				}
			}
			else if(horizontalScrolling) {
				
				var scrollToColumn = startColumn + Math.round(moveDistanceX + scrollSpeedX * moveDirectionX);
				if(scrollToColumn < 0) scrollToColumn = 0;
				
				if(isNaN(scrollToColumn)) throw new Error("scrollToColumn=" + scrollToColumn + " startColumn=" + startColumn + " scrollSpeedX=" + scrollSpeedX + " moveDirectionX=" + moveDirectionX);
				
				console.log("file.startColumn=" + file.startColumn + " scrollToColumn=" + scrollToColumn);
				
				if(file.startColumn != scrollToColumn) {
					
					// Prevent scrolling too far to the right
					for (var row=file.startRow; row<=(file.startRow+EDITOR.view.visibleRows) && row < file.grid.length; row++) {
						if( (file.startColumn+EDITOR.view.endingColumn) < file.grid[row].length) {
							// Found something. Do the scrolling
							file.scrollTo(scrollToColumn, undefined);
							reset();
							break;
						}
					}
					
				}
			}
			
			lastPosX = x;
			lastPosY = y;
		}
		
		function reset() {
			touchDownX = x;
			touchDownY = y;
			
			startRow = file.startRow;
			startColumn = file.startColumn;
			
			isScrolling = false;
			verticalScrolling = false;
			horizontalScrolling = false;
			
				EDITOR.removeRender(verticalScrollingRender);
				EDITOR.removeRender(horizontalScrollingRender);
				
		}
	}
	
	
	function touchMaybeOnMouseDown(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {
		console.log(mouseDownEvent);
		if(mouseDownEvent.type == "touchstart") {
			TOUCH = true;
			touchCounter++;
			EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
			EDITOR.virtualKeyboard.show();
		}
		else if(mouseDownEvent.type == "mousedown") {
			// Mobile browsers also send mousedown events on touchstart events!
			mouseCounter++;
			if(mouseCounter > 1 && mouseCounter > touchCounter) {
				TOUCH = false;
				EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
				EDITOR.virtualKeyboard.hide();
			}
		}
	}
	
	function verticalScrollingRender(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		
		ctx.strokeStyle="rgba(0,255,0,0.5)";
		ctx.fillStyle="rgba(0,0,255,0.5)";
		
		var x = EDITOR.view.canvasWidth - EDITOR.settings.scrollZone;
		var y = 0;
		var width = EDITOR.settings.scrollZone;
		var height = EDITOR.view.canvasHeight;
		
		ctx.rect(x,y,width,height);
		ctx.stroke();
		
	}
	
	function horizontalScrollingRender(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		
		ctx.strokeStyle="rgba(0,255,0,0.5)";
		ctx.fillStyle="rgba(0,0,255,0.5)";
		
		var x = 0;
		var y = EDITOR.view.canvasHeight - EDITOR.settings.scrollZone;
		var width = EDITOR.view.canvasWidth;
		var height = EDITOR.settings.scrollZone;
		
		ctx.rect(x,y,width,height);
		ctx.stroke();
		
	}
	
	
})();
