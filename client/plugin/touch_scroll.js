(function() {
	"use strict";
	
	var TOUCH = false;
	var mouseCounter = 0;
	var touchCounter = 0;
	var verticalScrolling = false;
	var horizontalScrolling = false;
	
	var touchDownX = 0;
	var touchDownY = 0;
	var startRow = 0;
	var startColumn = 0;
	var lastPosX = 0;
	var lastPosY = 0;
	var scrollSpeedX = 0;
	var scrollSpeedY = 0;
	var lastMeasureX = 0;
	var lastMeasureY = 0;
	var maybeScroll = false;
	var lastMeasuredMove = new Date();
	var touching = false;
	var lastMoveDirectionX = 0;
	var lastMoveDirectionY = 0;
	
	
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
		console.log("touchdown!");
		horizontalScrolling = false;
		verticalScrolling = false;
		maybeScroll = true;
		touching = true;
		touchDownX = x;
		touchDownY = y;
		EDITOR.removeRender(verticalScrollingRender);
		EDITOR.removeRender(horizontalScrollingRender);
		}
	
	function tsTouchUp() {
		console.log("touchUP!");
		horizontalScrolling = false;
		verticalScrolling = false;
		maybeScroll = false;
		touching = false;
		EDITOR.removeRender(verticalScrollingRender);
		EDITOR.removeRender(horizontalScrollingRender);
		}
	
	
	function tsTouchMove(x, y, target, ev) {
		
		if(!touching) return; // Do nothing unless the finger is touching the screen
		
		var file = EDITOR.currentFile;
		if(!file) return true; // Do nothing if no file is open
		
		
		//if(ev.type != "touchmove") return; // Do nothing unless it's a touchmove event, eg. ignore mousemove events
		
		// Prevent scrolling of the DOM window. We only want to scroll the text
			ev.preventDefault();
			ev.stopPropagation();
			window.scrollTo(0, 0);
			
			console.log("touchmove: maybeScroll=" + maybeScroll + 
			" x=" + x +
			" y=" + y + 
			" horizontalScrolling=" + horizontalScrolling + 
			" verticalScrolling=" + verticalScrolling);
			
		
			/*
				Check if we are inside the scrolling zones
			*/
			
		// User has touched the screen! Are we gonna scroll ? And in what plane ?
			
				if(x > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone) && y > (EDITOR.view.canvasHeight - EDITOR.settings.scrollZone)) {
					// In the bottom right corner
					if(Math.abs(x - lastPosX) > Math.abs(y - lastPosY)) {
				if(!horizontalScrolling) EDITOR.addRender(horizontalScrollingRender);
						horizontalScrolling = true;
					}
					else if(Math.abs(x - lastPosX) < Math.abs(y - lastPosY)) {
				if(!verticalScrolling) EDITOR.addRender(verticalScrollingRender);
						verticalScrolling = true;
					}
					// else: Unable to determine if the user is scrolling horizontally or vertical
				}
				else if(x > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone)) {
					// Inside vertical (row) scroll area
			if(!verticalScrolling) EDITOR.addRender(verticalScrollingRender);
					verticalScrolling = true;
				}
				else if(y > EDITOR.view.canvasHeight - EDITOR.settings.scrollZone) {
					// Inside horizontal (column) scroll area
			if(!horizontalScrolling) EDITOR.addRender(horizontalScrollingRender);
					horizontalScrolling = true;
				}
		else {
			console.log("Not in scroll zone! x=" + x + " y=" + y + " EDITOR.view.canvasWidth=" + EDITOR.view.canvasWidth + " EDITOR.view.canvasHeight=" + EDITOR.view.canvasHeight + " EDITOR.settings.scrollZone=" + EDITOR.settings.scrollZone + " ");
			reset();
			return; // Outside the scrolling zone. Do nothing!
		}
		
		// Keep track of swiping speed and direction. (Swiping faster should scroll more)
		var measureInterval = 20;
		
		if( (new Date()) - lastMeasuredMove > measureInterval) {
			
			var deltaX = Math.abs(lastMeasureX - x);
			var deltaY = Math.abs(lastMeasureY - y);
				
			var moveDirectionX = x > touchDownX ? -1 : 1;
			var moveDirectionY = y > touchDownY ? -1 : 1;
			
			scrollSpeedX = (deltaX * 0.02);
			scrollSpeedY = (deltaY * 0.05);
				
			lastMeasureX = x;
			lastMeasureY = y;
			
			// Reset original touch-down when changing direction
			if(moveDirectionX != lastMoveDirectionX) touchDownX = x;
			if(moveDirectionY != lastMoveDirectionY) touchDownY = y;
			
			lastMoveDirectionX = moveDirectionX;
			lastMoveDirectionY = moveDirectionY;
			
			lastMeasuredMove = new Date();
			}
			
			
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
		
			console.log(" -- verticalScrolling=" + verticalScrolling + 
			" horizontalScrolling=" + horizontalScrolling + 
		" lastMoveDirectionX=" + lastMoveDirectionX + 
			" moveDistanceX=" + moveDistanceX + 
		" moveDistanceY=" + moveDistanceY + 
			" scrollSpeedX=" + scrollSpeedX + 
			" scrollSpeedY=" + scrollSpeedY + 
			" x=" + x + 
			" y=" + y + 
		" lastMeasureX=" + lastMeasureX + 
		" lastMeasureY=" + lastMeasureY + 
			" lastPosX=" + lastPosX + 
			" lastPosY=" + lastPosY + 
			" deltaX=" + deltaX + 
			" deltaY=" + deltaY + 
		" startColumn=" + startColumn +
		" startRow=" + startRow + "");
			
			if(verticalScrolling) {
				
			var scrollToRow = startRow + Math.round(moveDistanceY * scrollSpeedY) * lastMoveDirectionY;
				if(scrollToRow < 0) scrollToRow = 0;
				
			if(isNaN(scrollToRow)) throw new Error("scrollToRow=" + scrollToRow + " startRow=" + startRow + " startColumn=" + startColumn + " scrollSpeedY=" + scrollSpeedY + " lastMoveDirectionY=" + lastMoveDirectionY);
				
				console.log("file.startRow=" + file.startRow + " scrollToRow=" + scrollToRow);
				
				if(file.startRow != scrollToRow) {
				console.log("Scrolling from row " + file.startRow + " to " + scrollToRow + " deltaY=" + deltaY + " lastMoveDirectionY=" + lastMoveDirectionY + " scrollSpeedY=" + scrollSpeedY + " ");
					
					file.scrollTo(undefined, scrollToRow);
					reset();
					
				}
			}
			else if(horizontalScrolling) {
				
			var scrollToColumn = startColumn + Math.round(moveDistanceX * scrollSpeedX) * lastMoveDirectionX;
				if(scrollToColumn < 0) scrollToColumn = 0;
				
			if(isNaN(scrollToColumn)) throw new Error("scrollToColumn=" + scrollToColumn + " startColumn=" + startColumn + " scrollSpeedX=" + scrollSpeedX + " lastMoveDirectionX=" + lastMoveDirectionX);
				
				console.log("file.startColumn=" + file.startColumn + " scrollToColumn=" + scrollToColumn);
				
				if(file.startColumn != scrollToColumn) {
				console.log("Gonna scroll ---");
				if(lastMoveDirectionX == 1) {
					var foundText = false;
					// Prevent scrolling too far to the right
					for (var row=file.startRow; row<=(file.startRow+EDITOR.view.visibleRows) && row < file.grid.length; row++) {
						if( (file.startColumn + EDITOR.view.visibleColumns) < file.grid[row].length) {
							// Found something. Do the scrolling
							foundText = true;
							file.scrollTo(scrollToColumn, undefined);
							reset();
							break;
						}
					}
					if(!foundText) console.warn("Did not scroll to the right because there's nothing there!");
				}
				else if(lastMoveDirectionX == -1) {
					// Scrolling left
					file.scrollTo(scrollToColumn, undefined);
					reset();
				}
				else throw new Error("Not moving in any direction! lastMoveDirectionX=" + lastMoveDirectionX + "");
			}
		}
		
		lastPosX = x;
		lastPosY = y;
		
		
		function reset() {
			touchDownX = x;
			touchDownY = y;
			
			startRow = file.startRow;
			startColumn = file.startColumn;
			
			maybeScroll = false;
			
			/*
			verticalScrolling = false;
			horizontalScrolling = false;
			
			EDITOR.removeRender(verticalScrollingRender);
			EDITOR.removeRender(horizontalScrollingRender);
			*/
			
			lastMeasuredMove = new Date();
			
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
