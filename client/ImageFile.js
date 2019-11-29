
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
			
			loadCallback();
		};
		image.src = "data:image/" + ext + ";base64," + base64;
		
	}

})();





