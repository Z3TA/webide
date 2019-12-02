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
			
			controls = EDITOR.createWidget(buildControls)
			
		},
unload: function unloadImageEditor() {
			
			EDITOR.removeEvent("fileShow", showImageFileMaybe);
			EDITOR.removeEvent("mouseScroll", zoomImage);
			
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
