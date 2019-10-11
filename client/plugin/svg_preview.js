(function() {

"use strict";

	var filesInPreviw = {};
	var isReloading = false;
	
EDITOR.plugin({
		desc: "Preview SVG images",
		load: function loadSvgPreview() {
			
			EDITOR.on("previewTool", previewSvg);
			
},
unload: function unloadSvgPreview() {
			
			EDITOR.removeEvent("previewTool", previewSvg);
			
}
});

	function buildSvgPreviewWidget() {
		/*
			A range slider for zooming in out which will resize the preview window
		*/
	}
	
	function previewSvg(file) {
		
		var ext = UTIL.getFileExtension(file.path);
		if(!ext.match(/svg/i)) {
			console.log("previewSvg: Not a SVG file: " + ext);
			return false;
		}
		
		var folder = UTIL.getDirectoryFromPath(file.path);
		var fileName = UTIL.getFilenameFromPath(file.path);
		
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
			if(err) return alertBox(err.message);
			
			var urlPath = json.url;
			
			// HTTP serve gives the URL without protocol !?
			var reHttp = /^http(s?):/i;
			if(!urlPath.match(reHttp)) {
				if(window.location.protocol.match(reHttp)) {
					urlPath = window.location.protocol + "//" + urlPath;
				}
				else urlPath = "http://" + urlPath;
			}
			var fileName = UTIL.getFilenameFromPath(file.path);
			var url = UTIL.joinPaths(urlPath, fileName);
			
			console.log("previewSvg: url=" + url);
			
			// Figure out image width/height
			
			
			
			var windowOptions = {
				url: url
			};
			
			filesInPreviw[file.path] = {
				windowOptions: windowOptions,
				file: file
			};
			
			if(!EDITOR.hasEvent("afterSave", previewSvgFileSaved)) EDITOR.on("afterSave", previewSvgFileSaved);
			
			reopen(filesInPreviw[file.path]);
			
			
		});
		
		
		return true;
	}
	
	function previewSvgFileSaved(file) {
		if(!filesInPreviw.hasOwnProperty(file.path)) return;
		
		// note: We can't use location.reload() because we would loose track of the window!
		// instead we need to close and reopen the window
		
		reopen(filesInPreviw[file.path]);
	}
	
	function reopen(info) {
		
		info.isReloading = true;
		
		if(info.previewWin) info.previewWin.close();
		
		
		
		EDITOR.createWindow(info.windowOptions, function windowCreated(err, previewWin) {
			if(err) return alertBox(err.message);
			
			info.previewWin = previewWin;
			
			previewWin.onload = function() {
				alertBox("Previewwindow loaded!");
				info.isReloading = false;
			}
			
			previewWin.window.onbeforeunload = function onbeforeunload() {
				if(!info.isReloading) {
					
					// User closed the preview window
					
					delete filesInPreviw[info.file.path];
					
					if(Object.keys(filesInPreviw).length == 0) EDITOR.removeEvent("afterSave", previewSvgFileSaved);
					
				}
			};
			
		});

	}
	
})();
