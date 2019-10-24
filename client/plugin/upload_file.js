(function() {

	var fileInput;
	var windowMenu;
	
EDITOR.plugin({
desc: "Upload file",
load: function loadUpload() {

			windowMenu = EDITOR.windowMenu.add(S("upload_from_device"), [S("File"), 140], uploadFile);

			EDITOR.registerAltKey({char: "u", alt:2, label: S("Upload"), fun: uploadFile});
			
},
unload: function unloadUpload() {

			EDITOR.windowMenu.remove(windowMenu);
			
			EDITOR.unregisterAltKey(uploadFile);
			
			//if(fileInput) document.documentElement.removeChild(fileInput)
			
}
});
	
	
	function uploadFile() {
		
		if(!fileInput) {
fileInput = document.createElement("input")
			fileInput.setAttribute("type", "file")
			fileInput.setAttribute("multiple", "true");
			fileInput.setAttribute("accept", "*/*");
			fileInput.setAttribute("style", "display: none");
			fileInput.onchange = handleFiles;
			
			//document.documentElement.appendChild(fileInput);
		}
		
		fileInput.click();
		
		
	}
	
	function handleFiles(fileInputChangeEvent) {
		
		console.log("fileInputChangeEvent:", fileInputChangeEvent);
		
		var files = fileInput.files;
		
		console.log("files=", files);
		
		var filesToSave = 0;
		var filesSaved = 0;
		var errors = [];
		
		if(files.length == 0) return;
		
		console.log("files is an array ? " + Array.isArray(files));
		
		if(files.length == 1) var instruction = "Where to save " + files[0].name + " ? (specify folder path)";
		else var instruction = "Where to save the files ? (specify folder path)";

		EDITOR.pathPickerTool({instruction: instruction, defaultPath: EDITOR.workingDirectory || "/upload/"}, function(err, path) {
			if(err) return alertBox("Unable to get a upload path: " + err.message);
			
			EDITOR.createPath(path, function(err) {
				if(err) return alertBox("Unable to create upload path=" + path + " Error: " + err.message);
				
				console.log("Uploading " + files.length + " files ...");
				
				for(var i=0; i<files.length; i++) upload(files[i]);
				
			});
			
			function upload(file) {
				var reader = new FileReader();
				reader.onload = function (readerEvent) {
					var data = readerEvent.target.result;
					
					console.log("Read file.name=" + file.name);
					
					var filePath = UTIL.joinPaths(path, file.name);
					
					console.log("data:");
					console.log(data);
					
					// Specifying encoding:base64 will magically convert to binary!
					// We do have to remove the data:image/png metadata though!
					data = data.replace("data:" + file.type + ";base64,", "");
					// Some browsers (Firefox) does not populate file.type
					data = data.replace("data:application/octet-stream;base64,", "");
					
					filesToSave++;
					EDITOR.saveToDisk(filePath, data, false, "base64", fileSaved);
					
				};
				reader.readAsDataURL(file); // For binary files (will be base64 encoded)
			}
			
		});
		
		
		function fileSaved(err, path, hash) {
			filesSaved++;
			
			if(err) errors.push(err.message);
			
			if(filesSaved == filesToSave) {
				//alertBox("Finished uploading " + filesSaved + " file(s)");
				EDITOR.fileExplorer(path);
				
				if(errors.length > 0) alertBox("Problem saving file(s): " + errors.join("\n"));
				
			}
		}
		
	}
	
	
})();