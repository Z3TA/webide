/*
	
	todo: Zoom, color picker!
	
*/

(function() {
	
	var controls;
	var zoomInput;
	var coordinateX, coordinateY;
	var originalSizeWidth, originalSizeHeight;
	var inputPath;
	var imageModeAlreadyDisabled = true;
	var imageModeAlreadyEnabled = false;
	
	EDITOR.plugin({
		desc: "Edit images",
		load: function loadImageEditor() {

			EDITOR.on("fileShow", showImageFileMaybe);
			EDITOR.on("mouseScroll", zoomImage);
			EDITOR.on("paste", imagePaste);
			EDITOR.on("mouseClick", colorPicker);
			
			controls = EDITOR.createWidget(buildControls)
			
		},
unload: function unloadImageEditor() {
			
			EDITOR.removeEvent("fileShow", showImageFileMaybe);
			EDITOR.removeEvent("mouseScroll", zoomImage);
			EDITOR.removeEvent("paste", imagePaste);
			EDITOR.removeEvent("mouseClick", colorPicker);
			EDITOR.removeEvent("mouseMove", moveMouseOnImage);
			
			controls.unload();
			
}
	});
	
	function buildControls(widget) {
		
		var wrap = document.createElement("div");
		
		var zoomLabel = document.createElement("label");
		zoomLabel.setAttribute("for", "imageZoom");
		zoomLabel.innerText = "Zoom: ";
		
		zoomInput = document.createElement("input");
		zoomInput.setAttribute("id", "imageZoom");
		zoomInput.setAttribute("type", "number");
		zoomInput.setAttribute("size", "4");
		zoomInput.setAttribute("min", "1");
		zoomInput.setAttribute("max", "500");
		zoomInput.setAttribute("step", "10");
		zoomInput.setAttribute("value", (EDITOR.currentFile.zoom ? EDITOR.currentFile.zoom * 100 : 100));
		zoomInput.onchange = function changeZoomViaInput() {
			var file = EDITOR.currentFile;
			if(file.zoom == undefined) return alertBox("Current file is not (an image) zoomable!");
			var zoomLevel = parseInt(zoomInput.value) / 100;
			console.log("image_editor: changeZoomViaInput: zoomLevel=" + zoomLevel);
			file.zoom(zoomLevel);
		};
		wrap.appendChild(zoomLabel);
		wrap.appendChild(zoomInput);
		
		var colorInput = document.createElement("input");
		colorInput.setAttribute("id", "colorInput");
		colorInput.setAttribute("type", "color");
		colorInput.setAttribute("value", "#eeeeee"); // Need to have a start value for onchange to trigger
		colorInput.onchange = function copyColorToClipboard() {
			EDITOR.putIntoClipboard(colorInput.value);
		};
		wrap.appendChild(colorInput);
		
		var originalSizeLabel = document.createElement("label");
		originalSizeLabel.innerText = "Original size: ";
		wrap.appendChild(originalSizeLabel);
		var originalSize = document.createElement("span");
		originalSize.classList.add("widgetItem");
		originalSizeWidth = document.createElement("span");
		originalSizeWidth.classList.add("size");
		originalSize.appendChild(document.createTextNode("width="));
		originalSize.appendChild(originalSizeWidth);
		originalSize.appendChild(document.createTextNode(", height="))
		originalSizeHeight = document.createElement("span");
		originalSizeHeight.classList.add("size");
		originalSize.appendChild(originalSizeHeight);
		wrap.appendChild(originalSize);
		
		
		var pathLabel = document.createElement("label");
		pathLabel.innerText = "Path: ";
		wrap.appendChild(pathLabel);
		inputPath = document.createElement("input");
		inputPath.setAttribute("type", "text");
		wrap.appendChild(inputPath);
		var resetPath = document.createElement("button");
		resetPath.classList.add("button");
		resetPath.innerText = "Reset path";
		resetPath.onclick = function() {
			inputPath.value = "";
		}
		wrap.appendChild(resetPath);
		
		var coordinatesLabel = document.createElement("label");
		coordinatesLabel.innerText = "Coordinates: ";
		wrap.appendChild(coordinatesLabel);
		var coordinates = document.createElement("span");
		coordinates.classList.add("widgetItem");
		coordinateX = document.createElement("span");
		coordinateX.classList.add("coordinate");
		coordinates.appendChild(document.createTextNode("x="));
		coordinates.appendChild(coordinateX);
		coordinates.appendChild(document.createTextNode(", y="))
		coordinateY = document.createElement("span");
		coordinateY.classList.add("coordinate");
		coordinates.appendChild(coordinateY);
		
		coordinates.onclick = function copyCoordinatesToClipboard() {
			
		}
		wrap.appendChild(coordinates);
		
		return wrap;
		
	}
	
	function imagePaste(file, text, pasteEvent) {
		var imageFound = false;
		
		if(window.clipboardData) { // IE
			var items = window.clipboardData.items;
		}
		else if(pasteEvent.clipboardData) {
			var items = pasteEvent.clipboardData.items;
		}
		else {
			throw new Error("Unable to get clipboard data! BROWSER=" + BROWSER);
		}
		
		if(items) {
			console.log("image_editor: Pasted " + items.length + " items. Checking if it's an image ...");
			for (var i = 0; i < items.length; i++) {
				if (items[i].type.indexOf("image") !== -1) {
					openImage(items[i]);
				}
			}
		}
		
		
		if(imageFound) {
			return PREVENT_DEFAULT;
		}
		else return ALLOW_DEFAULT;
		
		function openImage(item) {
			imageFound = true;
			
			if(pasteEvent && typeof pasteEvent.preventDefault == "function") pasteEvent.preventDefault();
			
			var blob = item.getAsFile();
			var URLObj = window.URL || window.webkitURL;
			var source = URLObj.createObjectURL(blob);
			
			console.log("image_editor: Opening image...");
			
			EDITOR.openFile(item.name, source, {image: true}, function(err, file) {
				if(err) return alertBox(err.message);
				
				EDITOR.dashboard.hide();
			}); 
			
		}
		
	}
	
	function colorPicker(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {

		var file = EDITOR.currentFile;
		
		if(!(file instanceof ImageFile)) return true;
		
		console.log("image_editor: colorPicker: target=" + target);
		
		if(target != EDITOR.canvas) return true;
		
		// Take the pixel from EDITOR.canvas rather then file.canvas
		
		var colors = EDITOR.canvasContext.getImageData(mouseX, mouseY, 1, 1).data;
		
		var red = colors[0];
		var green = colors[1];
		var blue = colors[2];
		
		var hex = "#" + UTIL.zeroPad(red.toString(16)) + UTIL.zeroPad(green.toString(16)) + UTIL.zeroPad(blue.toString(16));
		
		var rgbStr = "rgb(" + red + ", " + green + ", " + blue + ")";
		
		console.log("image_editor: colorPicker: red=" + red + " green=" + green + " blue=" + blue + " hex=" + hex);
		
		if(typeof colorInput != "undefined") colorInput.value = hex;
		// Updating the colorInput will not trigger it's onchange event!
EDITOR.putIntoClipboard(rgbStr);

		return ALLOW_DEFAULT;
	}
	
	function zoomImage(dir, steps, combo, scrollEvent) {
		
		var file = EDITOR.currentFile;
		
		if(! (file instanceof ImageFile)) return;
		
		var mouseX = scrollEvent.offsetX==undefined ? scrollEvent.layerX : scrollEvent.offsetX;
		var mouseY = scrollEvent.offsetY==undefined ? scrollEvent.layerY : scrollEvent.offsetY;
		
		var zoomLevel = file.zoomLevel + 0.1 * -dir; // Scrolling up zooms in (like in Gimp and Firefox)
		
		
		if(zoomInput) zoomInput.value = zoomLevel*100;
		
		file.zoom(zoomLevel, mouseX, mouseY);
		
	}
	
	function showImageFileMaybe(file) {
		
		console.log("image_editor: showImageFileMaybe: file.path=" + file.path);
		
		if(file.canvas != undefined) {
			enableImageMode(file);
		}
		else if(file.text != undefined) {
			disableImageMode();
		}
		else {
			EDITOR.canvas.style.cursor = 'help';
		}
		
	}
	
	function enableImageMode(file) {
		
		console.log("image_editor: enableImageMode:imageModeAlreadyEnabled=" + imageModeAlreadyEnabled);
		
		if(imageModeAlreadyEnabled) return showOtherImage(file);
		
		EDITOR.canvas.style.cursor = 'default';
		controls.show();
		
		showOtherImage(file);
		
		EDITOR.on("mouseMove", moveMouseOnImage);
		EDITOR.on("mouseClick", addToPath);
		
		imageModeAlreadyEnabled = true;
		imageModeAlreadyDisabled = false;
	}
	
	function disableImageMode() {
		console.log("image_editor: enableImageMode:imageModeAlreadyDisabled=" + imageModeAlreadyDisabled);
		
		if(imageModeAlreadyDisabled) return;
		
		EDITOR.canvas.style.cursor = 'text';
		controls.hide();
		EDITOR.removeEvent("mouseMove", moveMouseOnImage);
		EDITOR.removeEvent("mouseClick", addToPath);
		imageModeAlreadyEnabled = false;
		imageModeAlreadyDisabled = true;
	}
	
	function showOtherImage(file) {
		originalSizeWidth.innerText = file.sWidth;
		originalSizeHeight.innerText = file.sHeight;
	}
	
	function addToPath(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {
		if(target != EDITOR.canvas) return true;
		var file = EDITOR.currentFile;
		if(!(file instanceof ImageFile)) return true;
		
		if(mouseDirection != "down") return true;
		
		
		var pos = file.pixelCoordinateFromMousePosition(mouseX, mouseY);
		
		
		inputPath.value = inputPath.value + " L " + pos.x + " " + pos.y;
		
		return ALLOW_DEFAULT;
	}
	
	function moveMouseOnImage(mouseX, mouseY, target, mouseMoveEvent) {
		var file = EDITOR.currentFile;
		
		if(!(file instanceof ImageFile)) return true;
		
		var pos = file.pixelCoordinateFromMousePosition(mouseX, mouseY);
		
		coordinateX.innerText =pos.x;
		coordinateY.innerText = pos.y;
		
	}
	
	
})();
