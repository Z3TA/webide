(function() {
	/*
		
		Creates a preview/"scrollbar".
	
		Place this file below everything that loads in the left column! So those will hide before calculating the width of this.
		
	*/
	
	"use strict";
	
	if(EDITOR.settings.enableDocumentPreview === false) return; 
	
	var minification = 3; // 3
	var originalRightMargin = EDITOR.view.rightMargin;
	var documentPreviewDiv; 
	var canvas;
	var context;
	var previewStartRow = 0;
	var mouseStartY = 0;
	var isScrolling = false;
	var lastY = 0;
	var lastX = 0;
	var maxColumns = 0;
	var loadOrder = 200; // Set high if you want it to load last, or low if you want it to load first
	
	//window.addEventListener("load", documentLoad, false);
	
	EDITOR.on("start", initPreview, loadOrder);
	
	function initPreview() {

		documentLoad();
		
		EDITOR.on("beforeResize", setCanvasSize);
		EDITOR.on("fileOpen", setCanvasSize);
		
		EDITOR.on("fileHide", hideDocumentPreviewDiv);
		EDITOR.on("fileShow", showDocumentPreviewDiv);

		EDITOR.addRender(renderPreview, 3000);

		EDITOR.addEvent("mouseClick", {fun: scrollToSection, dir: "down", targetClass:"documentPreviewCanvas", button: 0});
		EDITOR.addEvent("mouseClick", {fun: mouseClick, targetClass:"documentPreviewCanvas", button: 0});
		
		// Hmm, why should I scroll using the right mouse button instead of the left buton!?
		
	}
	
	function mouseClick(mouseX, mouseY, caret, direction, button, target, keyboardCombo) {
		
		console.log("mouseClick! Mouse direction" + direction + " button=" + button);
		
		if(button <= -1) return true;
		
		console.log("yes scroll");
			
			// Scroll using the right mouse button
		
			if(direction=="down") {
				lastX = mouseX;
				lastY = mouseY;
				isScrolling = true;
				EDITOR.on("mouseMove", document_preview_mouseMove);
				console.log("started scrolling");
				
			}
			else if(direction=="up") {
				stopScrolling();
			}
		
		return false;
	}
	
	function stopScrolling() {
		isScrolling = false;
		console.log("stopped scrolling");
		EDITOR.removeEvent("mouseMove", document_preview_mouseMove);
		EDITOR.input = true; // Give back focus to the file, it auto lose focus when clicking outside the canvas.
	}
	
	function document_preview_mouseMove(mouseX, mouseY, target) {
		
		console.log("document_preview_mouseMove");
		
		var moveUp = lastY > mouseY;
		var file = EDITOR.currentFile;
		var fileRows = file.grid.length;
		var movePerPxY = fileRows / 500;
		var movePerPxX = maxColumns / 500;
		
		if(!file) throw new Error("No file selected while scrolling!");
		
		if(target.id != "documentPreviewCanvas") { // Mouse goes outside
			stopScrolling(); 
			return;
		}
		
		console.log("target=" + target.id)
		
		var startRow = file.startRow;
		
		var diffY = mouseY - lastY;
		var diffX = mouseX - lastX;

		var moveY = movePerPxY * diffY;
		var moveX = movePerPxX * diffX;

		console.log("moveX=" + moveX + " lastX=" + lastX + " mouseX=" + mouseX);
		
		if(Math.abs(moveX) > 1) {
			var startColumn = file.startColumn;
			
			startColumn += Math.round(moveX);
			
			if(startColumn < 0) {
				startColumn = 0;
			}
			else if(startColumn > maxColumns - EDITOR.view.visibleColumns) {
				startColumn = Math.max(0, maxColumns - EDITOR.view.visibleColumns);
			}
			
			file.scrollTo(startColumn, undefined);
			
			lastX = mouseX;
			
			EDITOR.renderNeeded();
		}
		
		if(Math.abs(moveY) > 1) {
			
			startRow += Math.round(moveY);
			
			
			
			if(startRow < 0) {
				startRow = 0;
			}
			else if(startRow > fileRows - EDITOR.view.visibleRows) {
				startRow = Math.max(0, fileRows - EDITOR.view.visibleRows);
			}
			
			console.log("startRow=" + startRow);
			
			file.scrollTo(undefined, startRow);
			
			lastY = mouseY;
			
			EDITOR.renderNeeded();
		}
		
		
		
	}
	
	function hideDocumentPreviewDiv() {
		documentPreviewDiv.style.display="none";
		console.log("Hide documentPreviewDiv");
	}
	
	function showDocumentPreviewDiv() {
		documentPreviewDiv.style.display="block";
		console.log("Show documentPreviewDiv");

	}

	function scrollToSection(mouseX, mouseY, caret, direction, button, target, keyboardCombo) {
		
		var file = EDITOR.currentFile;
		
		if(button != 0) return true;
		
		// Translate mouse position to row
			
			var mouseRow = Math.floor(mouseY / EDITOR.settings.gridHeight * minification) + previewStartRow + 1;

			console.log("CLICKZA SIG " + mouseRow);
			
			// Center on that row
			var startRow = Math.max(0, mouseRow - Math.floor(EDITOR.view.visibleRows / 2));
			
			file.scrollTo(undefined, startRow);
			
			// Keep focus on the document
			
			if(EDITOR.currentFile) {
				EDITOR.input = true;
			}
			
			EDITOR.renderNeeded();
		
		return false;
		
	}
	
	function setCanvasSize() {
		if(canvas) {
			/*
				Problem:  The center column depends on the width of the left and right column (the preview is located in the right column).
				          So we do not know how wide it is when this function is called.
						 
				Solution: We can however estimate it's width based on the width of the right column!
			
				combinedWidth = columnWidth + columnWidth / minification
				
				columnWidth = (minification * combinedWidth) / (minification+1)
				
				EDITOR.settings.gridWidth ?
			*/
			
			var rightColumn = document.getElementById("rightColumn");
			var leftColumn = document.getElementById("rightColumn");
			var header = document.getElementById("header");
			var footer = document.getElementById("footer");
			
			var windowWidth = window.innerWidth;
			var windowHeight = window.innerHeight;
			var leftColumnWidth = parseInt(leftColumn.offsetWidth);
			var combinedWidth = windowWidth - leftColumnWidth;
			var centerColumnWidth = (minification * combinedWidth) / (minification+1);
			var previewWidth = Math.floor(centerColumnWidth / minification);
			var maxPreviewWidth = 150;
			
			console.log("leftColumnWidth=" + leftColumnWidth);
			console.log("combinedWidth=" + combinedWidth);
			console.log("previewWidth=" + previewWidth);
			
			//previewWidth = Math.min(previewWidth, maxPreviewWidth);

			
			var headerHeight = parseInt(header.offsetHeight);
			var footerHeight = parseInt(footer.offsetHeight);
			var previewHeight = windowHeight - headerHeight - footerHeight;
			
			
			
			console.log("Preview canvas: width=" + previewWidth + " height=" + previewHeight + "");
			
			canvas.style.width = previewWidth + "px";
			canvas.style.height = previewHeight + "px";
			
			canvas.width = previewWidth;
			canvas.height = previewHeight;
			
		}
	}
	
	function documentLoad() {
		
		documentPreviewDiv = document.getElementById("documentPreviewDiv");
		
		
		if(!documentPreviewDiv) {
			documentPreviewDiv = document.createElement("div");
			documentPreviewDiv.setAttribute("id", "documentPreviewDiv");
			documentPreviewDiv.setAttribute("class", "documentPreviewDiv");
			documentPreviewDiv.draggable = false;

			canvas = document.createElement("canvas");
			canvas.setAttribute("id", "documentPreviewCanvas");
			canvas.setAttribute("class", "documentPreviewCanvas");

			canvas.setAttribute("style", "background-color: red");
			
			context = canvas.getContext("2d"); // , {alpha: false});
			
			documentPreviewDiv.appendChild(canvas);
			
			var rightColumn = document.getElementById("rightColumn");
			
			rightColumn.appendChild(documentPreviewDiv);
			
			EDITOR.resizeNeeded(); // Fixed bug: preview not loading for the first file that opens.
		}
		
		
		
		EDITOR.resizeNeeded();

	}
	
	
	
	function renderPreview(fileContext, viewBuffer, file) {
		/*
			
			The "view" should always be inside the preview!
			The optimal preview would be if the "view" is in the middle.

		*/
		
		maxColumns = 0;
		
		var grid = file.grid,
			startRow = file.startRow, // starting visible row on the document
			endRow = Math.min(grid.length, startRow+EDITOR.view.visibleRows), // ending visible row on the document
			maxRows = Math.floor(EDITOR.view.visibleRows * minification); // Visible lines in the preview

		previewStartRow = Math.floor(Math.min( Math.max(0, grid.length-maxRows), Math.max(0, endRow - maxRows/2 - EDITOR.view.visibleRows/2) ));

		var previewEndRow = Math.min(grid.length, startRow+maxRows),
			indentation = 0,
		middle = 0,
			topMargin = 0 - previewStartRow * EDITOR.settings.gridHeight / minification,
			left = 0,
			char = "",
			previewStartCol = EDITOR.view.visibleColumns * EDITOR.settings.gridWidth - EDITOR.settings.leftMargin - EDITOR.view.visibleColumns / minification;
			
		
		//console.log("previewStartRow=" + previewStartRow);
		//console.log("previewEndRow=" + previewEndRow);
		
		context.font=EDITOR.settings.style.fontSize / minification + "px " + EDITOR.settings.style.font;

		// Clear the canvas
		context.fillStyle = EDITOR.settings.style.bgColor;
		//context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillRect(0, 0, canvas.width, canvas.height);
		
			
		context.beginPath(); // Reset all the paths!
		
		// Print the characters
		for(var row = previewStartRow; row < previewEndRow; row++) {
			
			//console.log("row=" + row + " topMargin=" + topMargin + " previewStartRow=" + previewStartRow);
			
			indentation = grid[row].indentation;
			
			maxColumns = Math.max(maxColumns, grid[row].length);
			
			middle = (row * EDITOR.settings.gridHeight + Math.floor(EDITOR.settings.gridHeight/2)) / minification + topMargin;
			
			//console.log("top=" + top);
			
			for(var col = 0; col < grid[row].length; col++) {
				
				left = (col + indentation * EDITOR.settings.tabSpace) * EDITOR.settings.gridWidth / minification;
				
				if(grid[row][col].hasCharacter) {
					
					char = grid[row][col].char;
								
					context.fillStyle = grid[row][col].color;// for fillText rgb 
						
					context.fillText(char, left, middle);
					
				}

				
			}
			
		}
		
		// Overlay of current view
		context.rect(0,
			(startRow-1) * EDITOR.settings.gridHeight / minification + topMargin,
			EDITOR.view.visibleColumns * EDITOR.settings.gridWidth / minification, 
			EDITOR.view.visibleRows * EDITOR.settings.gridHeight / minification
		);
		context.fillStyle = "rgba(255,255,0, 0.1)"; // Same as #ffffe6 (the default current line color)
		context.fill();
		

	}


})();