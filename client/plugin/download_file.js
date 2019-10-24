(function() {

	var windowMenu;
	
	EDITOR.plugin({
		desc: "Download file",
		load:function loadDownload() {
			
			windowMenu = EDITOR.windowMenu.add("Download", [S("File"), 130], downloadFile);
			
			var order = 500; // After share.js
			EDITOR.on("share", downloadFile, order);
			
		},
		unload: function unloadDownload() {
			
			if(windowMenu) EDITOR.windowMenu.remove(windowMenu);
			
			EDITOR.removeEvent("share", downloadFile);
			
		}
	});

	function downloadFile(filePath, combo) {
		
		if(filePath instanceof File) filePath = filePath.path;
		if(filePath == undefined && EDITOR.currentFile) return gotFile(EDITOR.currentFile.path, EDITOR.currentFile.text);
		
		if(EDITOR.files.hasOwnProperty(filePath)) {
			gotFile(filePath, EDITOR.files[filePath].text);
		}
		else {
			EDITOR.readFromDisk(filePath, function(err, data) {
				if(err) return alertBox("Unable to open filePath=" + filePath + " Error: " + err.message);
				gotFile(filePath, data);
			})
		}
		
		return true;
		
		function gotFile(filePath, text) {
			
			if(filePath == undefined || filePath=="undefined") throw new Error("filePath=" + filePath);
			if(text == undefined || text == "undefined") throw new Error("text=" + text);
			
			var filename = UTIL.getFilenameFromPath(filePath);
			
var element = document.createElement('a');
element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
element.setAttribute('download', filename);

element.style.display = 'none';
document.body.appendChild(element);

element.click();

document.body.removeChild(element);
		}
		
		return true;
}

})();