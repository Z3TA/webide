
var ImageFile;

(function() { 

	ImageFile = function ImageFile(data, path, fileIndex, loadCallback) {
		var file = this;
		
		file.hash = "";
		file.path = path;
		file.name = UTIL.getFilenameFromPath(path);
		
		file.changed = false; // If the file has changed from last save
		file.isSaved = false; // file.isSaved is the opposit of file.changed, but can only be true if the file is also saved as!
		file.savedAs = false;
		file.lastChange = new Date();
		
		file.canvas = document.createElement("canvas");
		file.ctx = file.canvas.getContext("2d");
		
		// Source (file.canvas)
		file.sx = 0;
		file.sy = 0;
		
		file.zoomLevel = 1;
		
		file.scaled = 1;
		
		var ext = UTIL.getFileExtension(path);
		
		var image = new Image();
		image.onload = function() {
			
			// Same width/height as the image
			file.canvas.width = image.width;
			file.canvas.height = image.height;
			
			file.ctx.drawImage(image, 0, 0);
			
			// Width/height on the file.canvas
			file.sWidth = image.width;
			file.sHeight = image.height;
			
			// Width/height on the editor canvas
			file.dWidth = image.width;
			file.dHeight = image.height;
			
			file.centralize();
			
			loadCallback();
			loadCallback = null;
		};
		
		console.log("ImageFile: Loading image data... ext=" + ext + " data.length=" + data.length);
		console.log("ImageFile: Image data starts with: " + data.slice(0, 100) + " and ends with " + data.slice(-100));
		
		if(data.indexOf("blob:") == 0) image.src = data;
		else image.src = "data:image/" + ext + ";base64," + data;
		
		setTimeout(function loadTimeout() {
			if(!loadCallback) return;
			
			loadCallback(new Error("Failed to load the image in a timely manner: data=" + data));
			loadCallback = null;
		}, 2000);
		
	}
	
	ImageFile.prototype.pixelCoordinateFromMousePosition = function(mouseX, mouseY) {
		// Calculate the pixel on the fiel.canvas
		
		var file = this;
		
		var x = Math.round((mouseX - file.dx) / file.zoomLevel);
		var y = Math.round((mouseY - file.dy) / file.zoomLevel);
		
return {x: x, y: y};
	}
	
	ImageFile.prototype.scale = function(n) {

/*

https://stackoverflow.com/questions/18547042/resizing-a-canvas-image-without-blurring-it

*/

		var file = this;
		
		file.scaled = file.scaled * n;
		
		if(file.scaled == 1) {
			
			if(file.original) file.canvas = file.original;
			return;
			
		}
		
		if(!file.original) {
file.original = file.canvas;
			file.canvas = document.createElement("canvas");
		}
		
		var origCanvas = file.original;
		var origCanvasContext = file.original.getContext('2d');
		
		var scaledCanvas = file.canvas;
		var scaledCanvasContext = file.canvas.getContext('2d');
		
		scaledCanvas.width = origCanvas.width * file.scaled;
		scaledCanvas.height = origCanvas.height * file.scaled;
		
		console.log("ImageFile.scale: scaled=" + file.scaled + " origCanvas.width=" + origCanvas.width + " origCanvas.height=" + origCanvas.height + " scaledCanvas.width=" + scaledCanvas.width + " scaledCanvas.height=" + scaledCanvas.height);
		
		file.sWidth = scaledCanvas.width;
		file.sHeight = scaledCanvas.height;
		file.dWidth = scaledCanvas.width;
file.dHeight = scaledCanvas.height;

		scaledCanvasContext.imageSmoothingEnabled = false;
		
		scaledCanvasContext.drawImage(origCanvas, 0,0, scaledCanvas.width, scaledCanvas.height);
		
		file.centralize();
		
		EDITOR.renderNeeded();
		
		return;
		
		
		var origData = origCanvasContext.getImageData(0,0, origCanvas.width, origCanvas.height);
		var scaledData = scaledCanvasContext.getImageData(0,0, scaledCanvas.width, scaledCanvas.height);
		for (var x=0; x<scaledCanvas.width; x++) {
			for (var y=0; y<scaledCanvas.height; y++) {
				for (var c=0; c<4; c++) {
					// you can improve these calculations, I let them so for clarity
					
					// >>1 devides by 2
					
					scaledData.data[(y*scaledCanvas.height+x)*4+c] = origData.data[((y>>1)*origCanvas.height+(x>>1))*4+c];
				}
			}
		}
		scaledCanvasContext.putImageData(scaledData, 0, 0);
		
		
		EDITOR.renderNeeded();
		
	}
	
	ImageFile.prototype.centralize = function(centerX, centerY) {
		var file = this;
		
		if(centerX == undefined) centerX = Math.round(EDITOR.view.canvasWidth/2);
		if(centerY == undefined) centerY = Math.round(EDITOR.view.canvasHeight/2);
		
		file.dx = Math.round(centerX - file.dWidth/2);
		file.dy = Math.round(centerY - file.dHeight/2);
		
		EDITOR.renderNeeded();
		
	}
	
	
	ImageFile.prototype.zoom = function(zoomLevel, dCenterX, dCenterY) {
		var file = this;
		
		if(isNaN(parseFloat(zoomLevel))) throw new Error("Not a number: zoomLevel=" + zoomLevel + " file.zoomLevel=" + file.zoomLevel)
		
		// Where on the image is the mouse?
		var mouseImageX = dCenterX - file.dx;
		var mouseImageY = dCenterY - file.dy;
		console.log("ImageFile.zoom: mouseImageX=" + mouseImageX);
		
		
		
		
		file.zoomLevel = zoomLevel;
		
		
		
		
		
		var width = Math.round(file.sWidth * zoomLevel);
		var height = Math.round(file.sHeight * zoomLevel);
		
		
		
		
		
		var oldWidth = file.dWidth;
		var oldHeight = file.dHeight;
		
		// Update
		file.dWidth = width;
		file.dHeight = height;
		
		// How much larger has the image become
		var deltaX = width - oldWidth;
		var deltaY = height - oldHeight;
		
		var centerX = EDITOR.view.canvasWidth / 2;
		var centerY = EDITOR.view.canvasHeight / 2;
		
		//file.dx = file.dx - Math.round((width - oldWidth)/2 + dCenterX);
		//file.dy = file.dy - Math.round((height - oldHeight)/2 + dCenterY);
		
		console.log("ImageFile.zoom: zoomLevel=" + zoomLevel + " sWidth=" + file.sWidth + " width=" + width + " deltaX=" + deltaX + " sHeight=" + file.sHeight + " height=" + height);
		
		// Centralize the image
		
		
		if(dCenterX < centerX) {
			file.dx = Math.round(file.dx + deltaX/2);
		}
		else {
			file.dx = Math.round(file.dx - deltaX);
		}
		
		
		//file.dy = Math.round((file.dy - (centerY - dCenterY)/deltaY);
		
		//file.centralize(dCenterX, dCenterY);
		
		
		/*
			if(width > EDITOR.view.canvasWidth || height > EDITOR.view.canvasHeight) {
			
			var ratio = Math.max(width/EDITOR.view.canvasWidth, height/EDITOR.view.canvasHeight);
			var diffX = Math.max(width - EDITOR.view.canvasWidth);
			var diffY = Math.max(height - EDITOR.view.canvasHeight);
			
			// We want to keep the same pixel on the cursor after zooming!
			file.dx = -Math.round(diffX * ratio);
			file.dy = -Math.round(diffY * ratio);
			
			
			
			var centerX = EDITOR.view.canvasWidth / 2;
			var centerY = EDITOR.view.canvasHeight / 2;
			
			}
			else {
			file.dx = 0;
			file.dy = 0;
			}
		*/
		
		EDITOR.renderNeeded();
		
		
		
		if(EDITOR.settings.devMode) {
			EDITOR.canvasContext.beginPath();
			EDITOR.canvasContext.arc(dCenterX, dCenterY, 20, 0, 2 * Math.PI); // Debug
			EDITOR.canvasContext.stroke(); 
		}
	}
	
	ImageFile.prototype.saved = function(callback) {
		/*
			Only set state
			Let the editor handle saving and loading from disk
		*/
		var file = this;
		
		file.isSaved = true;
		file.changed = false;
		file.savedAs = true;
		
		// The afterSave event listeners need to take a callback or return something, so we can know when they're done'
		EDITOR.callEventListeners("afterSave", file, function allListenersCalled(errors) {
			
			if(errors.length > 0) console.warn("Some afterSave event listeners failed:");
			for (var i=0; i<errors.length; i++) {
				console.error(errors[i]);
			}
			
			if(errors) var err = new Error("Some afterSave event listeners failed! (see console log's in dev tools)");
			
			if(callback) callback(err);
		});
		
	}
	
	
})();





