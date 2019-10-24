/*
	This replaces the "minimap"/enhanced scrollbar to save precious screen real estate. 
	Strings starting with # or underlined text will show up bigger for fast navigation.
*/

(function() {
	"use strict";
	
	var o_gridHeight, o_gridWidth, o_fontSize, visibleRows, visibleColumns, blueBoxStartRow, o_font, o_scrollSpeedMultiplier;
	var zoomedIn = false;
	var charCodeUp = 38;
	var charCodeDown = 40;
	var charCodeAlt = 18;
	var charCodeShift = 16;
	var charCodeZ = 90;
	var scrollStep = 5;
	var loadOrder = 1500; // Should load after the renders
	var winMenuZoom;
	
	
	EDITOR.plugin({
		desc: "Zoom in and highlight markdown headings",
		load: function zoomInit() {
			
			o_gridHeight = EDITOR.settings.gridHeight;
			o_gridWidth = EDITOR.settings.gridWidth;
			o_fontSize = EDITOR.settings.style.fontSize;
			o_font = EDITOR.settings.style.font;
			o_scrollSpeedMultiplier = EDITOR.settings.scrollSpeedMultiplier;
			
			EDITOR.bindKey({desc: "Toggle zoom", charCode: charCodeZ, combo: ALT, fun: zoomSwitch});
			
			EDITOR.bindKey({desc: "Scroll And move the caret up", charCode: charCodeUp, combo: ALT + CTRL, fun: scrollUp});
			
			EDITOR.bindKey({desc: "Scroll And move the caret down", charCode: charCodeDown, combo: ALT + CTRL, fun: scrollDown});
			
			EDITOR.addRender(showMarkdownHeadings, 3000);
			
			EDITOR.registerAltKey({char: "z", label: S("zoom"), alt: 1, fun: zoomSwitch});
			
			winMenuZoom = EDITOR.windowMenu.add(S("zoom_out"), [S("View"), 20], zoomSwitch);
			
			
		},
		unload: function unloadZoom() {
			
			EDITOR.unbindKey(zoomSwitch);
			EDITOR.unbindKey(scrollUp);
			EDITOR.unbindKey(scrollDown);
			
			EDITOR.removeRender(showMarkdownHeadings);
			
			EDITOR.unregisterAltKey(zoomSwitch);
			
			EDITOR.windowMenu.remove(winMenuZoom);
			
		},
		order: loadOrder
	});
	
	function zoomSwitch(file, combo, character, charCode, direction) {
		if(zoomedIn) zoomReset(file, combo, character, charCode, direction)
		else zoom(file, combo, character, charCode, direction);
		return true;		
	}
	
	function zoom(file, combo, character, charCode, direction) {
		
		winMenuZoom.activate();
		
		console.log("zooming!");
		EDITOR.settings.gridHeight = EDITOR.settings.gridHeight / 6;
		EDITOR.settings.gridWidth = EDITOR.settings.gridWidth / 6;
		EDITOR.settings.style.fontSize = EDITOR.settings.style.fontSize / 4;
		//EDITOR.settings.style.font = "bold " + o_font;
		EDITOR.settings.scrollSpeedMultiplier = 1/4;
		
		visibleRows = EDITOR.view.visibleRows;
		visibleColumns = EDITOR.view.visibleColumns;
		blueBoxStartRow = file.startRow;
		
		zoomedIn = true;
		
		resetView();
		
		
		// When entering zoom. Start zooming at the caret. So that the caret is in the middle
		makeCaretCenter(file);
		
		// Scroll down so current view is in the middle!?
		
		
		
		// shift + alt + arrows to place caret !?
		/*
			Make mardown topics bigger letters
			
			## foo2 A
			
			foo2 B underline
			----
			
			foo1 A underline
			================
			
			# foo1 B
		*/
		
		
		
		
		
		// Make sure the whole window is filled with text
		
		
		
		
		
		EDITOR.renderNeeded();
	
	}
	
	function zoomReset(file, combo, character, charCode, direction) {
		
		if(zoomedIn) {
		
		console.log("zoom reset!");
		EDITOR.settings.gridHeight = o_gridHeight;
		EDITOR.settings.gridWidth = o_gridWidth;
		EDITOR.settings.style.fontSize = o_fontSize;
			EDITOR.settings.style.font = o_font;
			EDITOR.settings.scrollSpeedMultiplier = o_scrollSpeedMultiplier;
			
		zoomedIn = false;
		
			resetView();
			
			makeCaretCenter(file);
			
			
			EDITOR.renderNeeded();
		}
		
		winMenuZoom.deactivate();
	}
	
	function makeCaretCenter(file) {
		file.scrollTo(0, file.caret.row - Math.round(EDITOR.view.visibleRows / 2));
	}
	
	function scrollUp(file, combo, character, charCode, direction) {
		
		var delta = -scrollStep;
		
		file.scrollTo(0, file.startRow + delta);
		
		// Move the caret while scrolling
		for(var i=0; i<scrollStep; i++) {
			file.moveCaretUp();
		}
		
		EDITOR.renderNeeded();
		
		return true;
	}
	
	function scrollDown(file, combo, character, charCode, direction) {
		
		var delta = scrollStep;
		
		file.scrollTo(0, file.startRow + delta);
		
		// Move the caret while scrolling
		for(var i=0; i<scrollStep; i++) {
			file.moveCaretDown();
		}
		
		EDITOR.renderNeeded();
		
		return true;
	}
	
	function resetView() {
		EDITOR.view.visibleColumns = Math.ceil((EDITOR.view.canvasWidth - EDITOR.settings.leftMargin - EDITOR.settings.rightMargin) / EDITOR.settings.gridWidth);
		
		EDITOR.view.visibleRows = Math.ceil((EDITOR.view.canvasHeight - EDITOR.settings.topMargin - EDITOR.settings.bottomMargin) / EDITOR.settings.gridHeight);
		
		// Fix horizontal column
		if(EDITOR.view.endingColumn < EDITOR.view.visibleColumns) {
			EDITOR.currentFile.startColumn = 0;
			EDITOR.view.endingColumn = EDITOR.view.visibleColumns;
		}
		else {
			EDITOR.view.endingColumn = EDITOR.currentFile.startColumn + EDITOR.view.visibleColumns;
		}
		
		EDITOR.canvasContext.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
	}
	
	
	function showMarkdownHeadings(ctx, buffer, file, a, b, startRow) {
		// Check if there is any markdown headings and make them bigger
		
		if(!zoomedIn) return; // Only if zoomed in!
		
		if(buffer.length <= 1) return; // Don't bother when only one line is drawn;
		
		
		
		var H = "#";
		
		for (var row=0; row<buffer.length; row++) {
			
			var columns = buffer[row].length;
			var bufferRow = buffer[row];
			
			if(columns > 3) {
				var char1 = bufferRow[0].char;
				var char2 = bufferRow[1].char;
				var char3 = bufferRow[2].char;
				
				if(char1 == H || char2 == H || char3 == H) {
					headingMaybe(row); 
				}
				else if(char1 == "-" && char2 == "-") { // The row above is a heading
					headingMaybe(row-1, 2); 
				}
				else if(char1 == "=" && char2 == "=") {
					headingMaybe(row-1, 1);
				}
				else if(char1 == "/" && (char2 == "/" || char2 == "*") && columns > 4) { // It's a line comment
					var char4 = bufferRow[3].char;
					var char5 = bufferRow[4].char;
					
					if(char3 == H || char4 == H || char5 == H) {
						headingMaybe(row);
					}
					else if(char3 == "-" && char4 == "-") { // The row above is a heading
						headingMaybe(row-1, 2);
					}
					else if(char3 == "=" && char4 == "=") {
						headingMaybe(row-1, 1);
					}
					
				}
			}
			
		}
		
		function headingMaybe(row, size) {
			
			if(row < 0 || row >= buffer.length) return;
			
			var text = "";
			var start = 0;
			var foundH = false;
			
			if(size == undefined) size = 0;
			
			for (var col=0; col<buffer[row].length; col++) {
				var char = buffer[row][col].char;
				
				//console.log("char=" + char);
				
				if( !foundH && (char == "/" || char == "*")) {
					start++;
					//console.log("comment");
				}
				else if(char == H && !foundH) {
					start++;
					size++;
					//console.log("#");
				}
				else if(char == " " && !foundH) {
					start++;
					//console.log("space");
				}
				else {
					//console.log("found=true");
					foundH = true; // The rest of the characters will be treated as words
					text = text + char;
				}
			}
			
			console.log("Heading " + size + " :" + text);
			
			if(size > 0 || 1==1) {
				// ## Paint header
				var col = 0;
				var startRow = file.startRow;
				var left = EDITOR.settings.leftMargin + (col + buffer[row].indentation * EDITOR.settings.tabSpace - file.startColumn) * EDITOR.settings.gridWidth;
				var top = EDITOR.settings.topMargin + (row) * EDITOR.settings.gridHeight;
				var bgColor = "blue"; // EDITOR.settings.style.commentColor
				var textColor = "yellow" // EDITOR.settings.style.textColor
				
				// ### Set font (size)
				var fontSize = Math.max(10, 22 - size * 2.5);
				ctx.font= fontSize + "px " + EDITOR.settings.style.font;
				
				// ### Measure text
				
				var width = ctx.measureText(text).width;
				var height = fontSize;
				var middle = top + Math.round(height/2);
				
				
				// ### Clear background
				ctx.fillStyle = bgColor;
				ctx.fillRect(left, top, width, height);
				
				
				// # Paint text
				ctx.fillStyle = textColor;
				ctx.fillText(text, left, middle);
				ctx.stroke();
				
				
				// Reset the font
				ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
				
				//console.log("left=" + left + " top=" + top + " width=" + width + " height=" + height);
				
				/*
					##############################
					#         PRETTY!            #
					##############################
					*/
				
				
			}
			
		}
		
		
	}
	
	
})();
