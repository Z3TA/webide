
(function() {
	
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Preview HTML files",
		load: function loadWebPreview() {
			//menuItem = EDITOR.addMenuItem("Preview HTML", webPreview);
			EDITOR.on("showMenu", maybeShowPreviewInMenu);
			EDITOR.on("previewTool", webPreviewTool, 2000); // Run after Static Site generator
		},
		unload: function unloadWebPreview() {
			//EDITOR.removeMenuItem(menuItem);
			EDITOR.removeEvent("showMenu", maybeShowPreviewInMenu);
			EDITOR.removeEvent("previewTool", webPreviewTool); 
			}
		});
	
	function maybeShowPreviewInMenu() {
		
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!file.path.match(/html?$/i)) return true;
		
		menuItem = EDITOR.addTempMenuItem("Web Preview", webPreview);
		
	}
	
	function webPreview(file, combo, character, charCode, direction, clickEvent) {
		
		var file = EDITOR.currentFile;
		if(!file) return console.warn("Unable to run preview: No file open!");
		
		// Use previewtool so that more specialied plugins get the chance to handle it
		EDITOR.previewTool(file, clickEvent);
		
		
		EDITOR.hideMenu();
		
		
		
	}
	
	function webPreviewTool(file) {
		
		if(!file.path.match(/html?$/i)) return false;
		
		openPreviewWindow(file);
		
		return true;
	}
	
	
	function openPreviewWindow(file) {
		var folder = UTIL.getDirectoryFromPath(file.path);
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
			if(err) return alertBox(err.message);
			
			console.log("Serve URL=" + json.url);
			
			var urlPath = json.url;
			
			// HTTP serve gives the URL without protocol !?
			var reHttp = /^http(s?):/i;
			if(!urlPath.match(reHttp)) {
				if(window.location.protocol.match(reHttp)) {
					urlPath = window.location.protocol + "//" + urlPath;
				}
				else urlPath = "http://" + urlPath;
			}
			var url = urlPath + UTIL.getFilenameFromPath(file.path);
			
			var wEditor = new WysiwygEditor({
				sourceFile: file,
				onlyPreview: true,
					url: url,
					});
					
					wEditor.onClose = function() {
					CLIENT.cmd("stop_serve", {folder: folder}, function httpServerStopped(err, json) {
					if(err) throw err;
					});
					}
				
			
		});
	}
	
	
})();
