(function() {
	"use strict";
	
	var o_gridHeight, o_gridWidth, o_fontSize, visibleRows, visibleColumns, blueBoxStartRow, o_font, o_scrollStep;
	
	var zoomedIn = false;
	
	var charCodeUp = 38;
	var charCodeDown = 40;
	var charCodeAlt = 18;
	var charCodeShift = 16;
	var charCodeZ = 90;
	var scrollStep = 5;
	var loadOrder = 999; // Should load after the renders
	
	editor.on("start", zoomInit, loadOrder);
	
	function zoomInit() {
		o_gridHeight = global.settings.gridHeight;
		o_gridWidth = global.settings.gridWidth;
		o_fontSize = global.settings.style.fontSize;
		o_font = global.settings.style.font;
		o_scrollStep = global.settings.scrollStep;
		
		global.keyBindings.push({charCode: charCodeZ, combo: ALT, fun: zoomSwitch});
		
		
		global.keyBindings.push({charCode: charCodeUp, combo: ALT + CTRL, fun: scrollUp});
		
		global.keyBindings.push({charCode: charCodeDown, combo: ALT + CTRL, fun: scrollDown});
		
		global.renders.push(showMarkdownHeadings);
	}
	
	function zoomSwitch(file, combo, character, charCode, direction) {
		if(zoomedIn) zoomReset(file, combo, character, charCode, direction)
		else zoom(file, combo, character, charCode, direction);
		
		
	}
	
	function zoom(file, combo, character, charCode, direction) {
	
		console.log("zooming!");
		global.settings.gridHeight = global.settings.gridHeight / 6;
		global.settings.gridWidth = global.settings.gridWidth / 6;
		global.settings.style.fontSize = global.settings.style.fontSize / 4;
		//global.settings.style.font = "bold " + o_font;
		global.settings.scrollStep = 20;
		
		visibleRows = global.view.visibleRows;
		visibleColumns = global.view.visibleColumns;
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
		
		
		
		
		
		editor.renderNeeded();
	
	}
	
	function zoomReset(file, combo, character, charCode, direction) {
		
		if(zoomedIn) {
		
		console.log("zoom reset!");
		global.settings.gridHeight = o_gridHeight;
		global.settings.gridWidth = o_gridWidth;
		global.settings.style.fontSize = o_fontSize;
			global.settings.style.font = o_font;
			global.settings.scrollStep = o_scrollStep;
			
		zoomedIn = false;
		
			resetView();
			
			makeCaretCenter(file);
			
			
			editor.renderNeeded();
		}
	}
	
	function makeCaretCenter(file) {
		file.scrollTo(0, file.caret.row - Math.round(global.view.visibleRows / 2));
	}
	
	function scrollUp(file, combo, character, charCode, direction) {
		
		var delta = -scrollStep;
		
		file.scrollTo(0, file.startRow + delta);
		
		// Move the caret while scrolling
		for(var i=0; i<scrollStep; i++) {
			file.moveCaretUp();
		}
		
		
		editor.renderNeeded();
			}
	
	function scrollDown(file, combo, character, charCode, direction) {
		
		var delta = scrollStep;
		
		file.scrollTo(0, file.startRow + delta);
		
		// Move the caret while scrolling
		for(var i=0; i<scrollStep; i++) {
			file.moveCaretDown();
		}
		
		editor.renderNeeded();
		
	}
	
	function resetView() {
		global.view.visibleColumns = Math.ceil((global.view.canvasWidth - global.settings.leftMargin - global.settings.rightMargin) / global.settings.gridWidth);
		
		global.view.visibleRows = Math.ceil((global.view.canvasHeight - global.settings.topMargin - global.settings.bottomMargin) / global.settings.gridHeight);
		
		// Fix horizontal column
		if(global.view.endingColumn < global.view.visibleColumns) {
			global.currentFile.startColumn = 0;
			global.view.endingColumn = global.view.visibleColumns;
		}
		else {
			global.view.endingColumn = global.currentFile.startColumn + global.view.visibleColumns;
		}
		
		
	}
	
	
	function showMarkdownHeadings(ctx, buffer, file, a, b, startRow) {
		// Check if there is any markdown headings and make them bigger
		
		if(!zoomedIn) return; // Only if zoomed in!
		
		if(buffer.length <= 1) return; // Don't bother when only one line is drawn;
		
		
		
		var H = "#";
		
		for (var row=0; row<buffer.length; row++) {
			
			let columns = buffer[row].length;
			let bufferRow = buffer[row];
			
			if(columns > 3) {
				let char1 = bufferRow[0].char;
				let char2 = bufferRow[1].char;
				let char3 = bufferRow[2].char;
				
				if(char1 == H || char2 == H || char3 == H) {
					headingMaybe(row); 
				}
				else if(char1 == "-" && char2 == "-") { // The row above is a heading
					headingMaybe(row-1, 2); 
				}
				else if(char1 == "=" && char2 == "=") {
					headingMaybe(row-1, 1);
				}
				else if(char1 == "/" && char2 == "/" && columns > 4) { // It's a line comment
					let char4 = bufferRow[3].char;
					let char5 = bufferRow[4].char;
					
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
			
			var text = "";
			var start = 0;
			var foundH = false;
			
			if(size == undefined) size = 0;
			
			for (var col=0; col<buffer[row].length; col++) {
				let char = buffer[row][col].char;
				
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
				let col = 0;
				let startRow = file.startRow;
				let left = global.settings.leftMargin + (col + buffer[row].indentation * global.settings.tabSpace - file.startColumn) * global.settings.gridWidth;
				let top = global.settings.topMargin + (row) * global.settings.gridHeight;
				let bgColor = "blue"; // global.settings.style.commentColor
				let textColor = "yellow" // global.settings.style.textColor
				
				// ### Set font (size)
				let fontSize = 22 - size * 2.5;
				ctx.font= fontSize + "px " + global.settings.style.font;
				//ctx.textBaseline = "bottom"; // top
				
				// ### Measure text
				
				let width = ctx.measureText(text).width;
				let height = fontSize;
				
				// ### Clear background
				ctx.fillStyle = bgColor;
				ctx.fillRect(left, top, width, height);
				
				
				// # Paint text
				ctx.fillStyle = textColor;
				ctx.fillText(text, left, top);
				ctx.stroke();
				
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
