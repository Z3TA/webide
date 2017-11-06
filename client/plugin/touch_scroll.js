(function() {
	
	var TOUCH = false;
	var mouseCounter = 0;
	var touchCounter = 0;
	var lastX = -1;
	var lastY = -1;
	var deltaNextX = 0;
	var deltaNextY = 0;
	var scrollbarRight = false;
	var scrollbarBottom = false;
	
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
			
			EDITOR.removeRender(scrollbarRightRender);
			EDITOR.removeRender(scrollbarBottomRender);
			
		}
	});
	
	function tsTouchDown() {
		touch.apply(this, arguments);
	}
	
	function tsTouchUp() {
		touch.apply(this, arguments);
	}
	
	function touch(x, y, caret, direction, button, target, keyboardCombo, ev) {
		
		if(scrollbarRight) {
			EDITOR.removeRender(scrollbarRightRender);
			scrollbarRight = false;
		}
		if(scrollbarBottom) {
			EDITOR.removeRender(scrollbarBottomRender);
			scrollbarBottom = false;
		}
		
		
		
	}
	
	function tsTouchMove(x, y, target, ev) {
		if(ev.type == "touchmove") {
			// Prevent scrolling of the body
			ev.preventDefault();
			ev.stopPropagation();
			window.scrollTo(0, 0);
			
			// Scroll the text!?
			
			var file = EDITOR.currentFile;
			var deltaX = Math.abs(lastX - x);
			var deltaY = Math.abs(lastY - y);
			
			console.log("--> deltaX=" + deltaX + " deltaY=" + deltaY);
			
			if(x > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone)) {
				
				if(!scrollbarRight) {
					EDITOR.addRender(scrollbarRightRender);
					scrollbarRight = true;
				}
				
				if(lastY != -1 && file) {
					
					var dir = lastY > y ? 1 : -1;
					var scrollSpeed = Math.round((deltaY + deltaNextY) / 5);
					
					if(scrollSpeed == 0) deltaNextY += deltaY;
					else deltaNextY = 0;
					
					if(scrollSpeed > 0) {
						var startRow = file.startRow + scrollSpeed * dir;
						console.log("Scrolling from row " + file.startRow + " to " + startRow + " deltaY=" + deltaY + " dir=" + dir + " scrollSpeed=" + scrollSpeed + " ");
						if(startRow < 0) startRow = 0;
						file.scrollTo(undefined, startRow);
						
						EDITOR.renderNeeded();
					}
				}
			}
			else if(y > EDITOR.view.canvasHeight - EDITOR.settings.scrollZone) {
				
				if(!scrollbarBottom) {
					EDITOR.addRender(scrollbarBottomRender);
					scrollbarBottom = true;
				}
				
				if(deltaX && file) {
					
					var dir = lastX > x ? 1 : -1;
					var scrollSpeed = Math.floor((deltaX + deltaNextX) / 30);
					
					if(scrollSpeed == 0) deltaNextX += deltaX;
					else deltaNextX = 0;
					
					if(scrollSpeed > 0) {
						
						var startColumn = file.startColumn + scrollSpeed * dir;
						if(startColumn < 0) startColumn = 0;
						var deltaColumn = file.startColumn - startColumn;
						
						// Prevent scrolling too far to the left
						if(file.startColumn < 0) {
							file.startColumn = 0;
							EDITOR.view.endingColumn = file.startColumn + EDITOR.view.visibleColumns;
							EDITOR.renderNeeded();
						}
						
						// Prevent scrolling too far to the right
						for (var row=file.startRow; row<=(file.startRow+EDITOR.view.visibleRows) && row < file.grid.length; row++) {
							if( (file.startColumn+EDITOR.view.endingColumn) < file.grid[row].length) {
								// Found something. Do the scrolling
								file.startColumn += scrollSpeed * dir;
								EDITOR.view.endingColumn = file.startColumn + EDITOR.view.visibleColumns;
								EDITOR.renderNeeded();
								break;
							}
						}
						
					}
				}
			}
			
			lastY = y;
			lastX = x;
			
			isSelecting = false;
			return;
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

	function scrollbarRightRender(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		
		ctx.strokeStyle="rgba(0,255,0,0.5)";
		ctx.fillStyle="rgba(0,0,255,0.5)";
		
		var x = EDITOR.view.canvasWidth - EDITOR.settings.scrollZone;
		var y = 0;
		var width = EDITOR.settings.scrollZone;
		var height = EDITOR.view.canvasHeight;
		
		ctx.rect(x,y,width,height);
		ctx.stroke();
		
	}
	
	function scrollbarBottomRender(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		
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
