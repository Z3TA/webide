
(function() {
	
	"use strict";
	
	var menuItem;
	var inPreview;
	var previewWin;
	
	EDITOR.plugin({
		desc: "Preview HTML files",
		load: function loadWebPreview() {
			menuItem = EDITOR.addMenuItem("Preview HTML", webPreview);
			EDITOR.on("fileSave", refreshMaybe);
		},
		unload: function unloadWebPreview() {
			EDITOR.removeMenuItem(menuItem);
			EDITOR.removeEvent("fileSave", refreshMaybe);
		}
	});
	
	function webPreview() {
		EDITOR.hideMenu();
		
		var file = EDITOR.currentFile;
		if(!file) return true;
		
		inPreview = file;
		
		var newWindow = EDITOR.createWindow();
		
		var folder = UTIL.getDirectoryFromPath(inPreview.path);
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
		
			if(err) throw err;
			
			var url = json.url;
			if(!url.match(/^http(s?):/i)) url = window.location.protocol + "//" + url;
			url += UTIL.getFilenameFromPath(inPreview.path);
			
			var onlyPreview = true;
			var bodyTag = undefined;
			previewWin = new WysiwygEditor(inPreview, bodyTag, onlyPreview, newWindow, url);
			
			previewWin.onClose = function() {
				CLIENT.cmd("serve", {folder: folder}, function httpServerStopped(err, json) {
					if(err) throw err;
					inPreview = undefined;
					previewWin = undefined;
				});
			}
			
		});
	}
	
	function refreshMaybe(fileSaved) {
		
		//console.log("inPreview=" + !!inPreview + " previewWin=" + !!previewWin);
		
		if(!inPreview || !previewWin) return true;
		
		var fileName = UTIL.getFilenameFromPath(fileSaved.path);
		
		var reStyle = new RegExp('<link.*href=.*' + fileName, "i");
		var reScript = new RegExp('<script.*src=".*' + fileName, "i");
		
		//console.log("style?" + !!inPreview.text.match(reStyle) + " script?" + !!inPreview.text.match(reScript));
		
		if(!inPreview.text.match(reStyle) && !inPreview.text.match(reScript)) return true;
		
		var contenEditable = false;
		previewWin.reload(contenEditable);
		
	}
	
})();
