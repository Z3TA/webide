
(function() {
	
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Preview HTML files",
		load: function loadWebPreview() {
			//menuItem = EDITOR.ctxMenu.add("Preview HTML", webPreview);
			EDITOR.on("showMenu", maybeShowPreviewInMenu);
			EDITOR.on("previewTool", webPreviewTool, 2000); // Run after Static Site generator
			
			var discoveryItem = document.createElement("img");
			discoveryItem.src = "gfx/multimedia.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
			discoveryItem.title = "Live Preview"
			discoveryItem.onclick = webPreviewFromDiscovery;
			EDITOR.discoveryBar.add(discoveryItem, 8);
			
		},
		unload: function unloadWebPreview() {
			//EDITOR.ctxMenu.remove(menuItem);
			EDITOR.removeEvent("showMenu", maybeShowPreviewInMenu);
			EDITOR.removeEvent("previewTool", webPreviewTool); 
			}
		});
	
	function webPreviewFromDiscovery(clickEvent) {
		webPreview(EDITOR.currentFile, undefined, undefined, undefined, undefined, clickEvent);
	}
	
	function maybeShowPreviewInMenu() {
		
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!file.path.match(/html?$/i)) return true;
		
		menuItem = EDITOR.ctxMenu.addTemp("Web Preview", webPreview);
		
	}
	
	function webPreview(file, combo, character, charCode, direction, clickEvent) {
		
		var file = EDITOR.currentFile;
		if(!file) {
console.warn("Unable to run preview: No file open!");
			return;
		}
		
		// Use previewtool so that more specialied plugins get the chance to handle it
		EDITOR.previewTool(file, clickEvent);
		
		
		EDITOR.ctxMenu.hide();
		
		
		
	}
	
	function webPreviewTool(file) {
		
		if(!isHTML(file)) return false;
		
		if(!file.path.match(/html?$/i)) {
			var fileExt = UTIL.getFileExtension(file.path);
			var nameSugg = UTIL.getDirectoryFromPath(file.path) + UTIL.getFileNameWithoutExtension(file.path) + ".htm";
			promptBox("Can not preview a HTML file unless the file extension is .htm or .html. Rename " + UTIL.getFilenameFromPath(file.path) + " ?<br><br>New path: ", false, nameSugg, function(newPath) {
				if(newPath) {
					var filePath = file.path
					file = null; // Don't linger on the old ref, the renamed file will get a new file object!
					EDITOR.move(filePath, newPath, function fileRenamed(err, newPath) {
						if(err) return alertBox(err.message);
						var file = EDITOR.files[newPath];
						openPreviewWindow(file);
					});
				}
			});
			return false;
		}
		
		openPreviewWindow(file);
		
		return true;
	}
	
	function isHTML(file) {
		if(file.path.match(/html?$/i)) return true;
		else if(file.text.match(/<!DOCTYPE html>/i)) return true;
		else if(file.text.match(/<html>/i)) return true;
		else if(file.text.match(/<script>/i)) return true;
		
		else return false;
	}
	
	
	function openPreviewWindow(file) {
		
		console.log("openPreviewWindow: file.path=" + file.path);
		
		// Need to start in a shallow folder if there are ../ relative paths
		var backCount = 0;
		var relPath = "../";
		while(file.text.indexOf(relPath) != -1) {
			backCount++;
			relPath += "../";
		}
		
		var folder = UTIL.getDirectoryFromPath(file.path);
		
		if(backCount) {
			var root = UTIL.root(folder);
			var folders = UTIL.splitPath(folder);
			var folderIndex = folders.length - backCount;
			var paths = folders.slice(folderIndex);
			var serveFolders = folders.slice(0, folderIndex);
			var folder = UTIL.trailingSlash(UTIL.joinPaths(root, serveFolders));
			console.log("web_preview: file.path=" + file.path + " folders=" + JSON.stringify(folders) + " folderIndex=" + folderIndex + 
			" backCount=" + backCount + " paths=" + paths + " serveFolders=" + serveFolders + " folder=" + folder);
		}
		else {
			var folder = UTIL.getDirectoryFromPath(file.path);
		}
		
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
			if(err) return alertBox(err.message);
			
			console.log("web_preview: json.url=" + json.url);
			
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
			
			console.log("web_preview: urlPath=" + urlPath + " paths=" + JSON.stringify(paths) + " fileName=" + fileName);
			
			var url = UTIL.joinPaths(urlPath, paths, fileName);
			
			console.log("web_preview: url=" + url);
			
			var wEditor = new WysiwygEditor({
				sourceFile: file,
				onlyPreview: true,
					url: url,
					});
					
					wEditor.onClose = function() {
					CLIENT.cmd("stop_serve", {folder: folder}, function httpServerStopped(err, json) {
					if(err) console.warn(err.message);
					});
					}
				
			
		});
	}
	
	
})();
