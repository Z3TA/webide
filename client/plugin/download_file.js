(function() {

	var windowMenu;
	
	EDITOR.plugin({
		desc: "Download file",
		load:function loadDownload() {
			
			windowMenu = EDITOR.windowMenu.add("Download", ["File", 130], downloadFile);
			
			EDITOR.on("share", downloadFile);
			
		},
		unload: function unloadDownload() {
			
			if(windowMenu) EDITOR.windowMenu.remove(windowMenu);
			
			EDITOR.removeEvent("share", downloadFile);
			
		}
	});

	function downloadFile(file, combo) {
		
		if(file == undefined) file = EDITOR.currentFile;
		
		var filename = UTIL.getFilenameFromPath(file.path);
		var text = file.text;
		
var element = document.createElement('a');
element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
element.setAttribute('download', filename);

element.style.display = 'none';
document.body.appendChild(element);

element.click();

document.body.removeChild(element);
		
		return true;
}

})();