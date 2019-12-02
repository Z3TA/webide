
(function() { 

	ImageFile = function ImageFile(base64, path, fileIndex, loadCallback) {
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
		
		var ext = UTIL.getFileExtension(path);
		
		var image = new Image();
		image.onload = function() {
			
			// Same width/height as the image
			file.canvas.width = image.width;
			file.canvas.height = image.height;
			
			file.ctx.drawImage(image, 0, 0);
			
			// Width/height on the file.canvas
			file.sWidth = image.width;
			file.sHeight = image.width;
			
			// Width/height on the editor canvas
			file.dWidth = image.width;
			file.dHeight = image.height;
			
			loadCallback();
		};
		
		console.log("Loading image data... ext=" + ext + " base64.length=" + base64.length);
		
		image.src = "data:image/" + ext + ";base64," + base64;
		
		// Source (file.canvas)
		file.sx = 0;
		file.sy = 0;
		
		// Destination (on the editor canvas)
		file.dx = 0;
		file.dy = 0;
		

		file.zoomLevel = 1;
		
	}
	
	ImageFile.prototype.zoom = function(zoomLevel, dCenterX, dCenterY) {
		var file = this;
		
		if(isNaN(parseFloat(zoomLevel))) throw new Error("Not a number: zoomLevel=" + zoomLevel + " file.zoomLevel=" + file.zoomLevel)
		
		file.zoomLevel = zoomLevel;
		
		var width = Math.round(file.sWidth * zoomLevel);
		var height = Math.round(file.sHeight * zoomLevel);
		
		console.log("ImageFile.zoom: zoomLevel=" + zoomLevel + " sWidth=" + file.sWidth + " width=" + width + " sHeight=" + file.sHeight + " height=" + height);
		
		file.dWidth = width;
		file.dHeight = height;
		
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





