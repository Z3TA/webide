/*
	
	todo: Zoom, color picker!
	
*/

(function() {
	
	var controls;
	var zoomInput;
	
	
	EDITOR.plugin({
		desc: "Edit images",
		load: function loadImageEditor() {

			EDITOR.on("fileShow", showImageFileMaybe);
			EDITOR.on("mouseScroll", zoomImage);
			EDITOR.on("paste", imagePaste);
			
			controls = EDITOR.createWidget(buildControls)
			
		},
unload: function unloadImageEditor() {
			
			EDITOR.removeEvent("fileShow", showImageFileMaybe);
			EDITOR.removeEvent("mouseScroll", zoomImage);
			EDITOR.removeEvent("paste", imagePaste);
			
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
			console.log("image_editor: Pasted " + items.length + " items ...");
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
	
	function zoomImage(dir, steps, combo, scrollEvent) {
		
		var file = EDITOR.currentFile;
		
		var mouseX = scrollEvent.offsetX==undefined ? scrollEvent.layerX : scrollEvent.offsetX;
		var mouseY = scrollEvent.offsetY==undefined ? scrollEvent.layerY : scrollEvent.offsetY;
		
		var zoomLevel = file.zoomLevel + 0.1 * -dir; // Scrolling up zooms in (like in Gimp and Firefox)
		
		
		if(zoomInput) zoomInput.value = zoomLevel*100;
		
		file.zoom(zoomLevel, mouseX, mouseY);
		
	}
	
	function showControls() {
		controls.show();
	}
	
	function showImageFileMaybe(file) {
		
		if(file.canvas != undefined) {
			EDITOR.canvas.style.cursor = 'default';
			showControls();
		}
		else if(file.text != undefined) {
			EDITOR.canvas.style.cursor = 'text';
		}
		else {
			EDITOR.canvas.style.cursor = 'help';
		}
		
	}
	
	
})();
