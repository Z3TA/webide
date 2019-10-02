
(function() {
	
	"use strict";
	
	var winMenuWysiwygHtml;
	var tempCtxMenuWebPreview;
	
	EDITOR.plugin({
		desc: "Preview HTML files",
		load: function loadWebPreview() {
			
			EDITOR.on("showMenu", maybeShowPreviewInMenu);
			EDITOR.on("previewTool", webPreviewTool, 2000); // Run after Static Site generator
			
			var discoveryItem = document.createElement("img");
			discoveryItem.src = "gfx/multimedia.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
			discoveryItem.title = "Live Preview"
			discoveryItem.setAttribute("id","previewDiscovery");
			discoveryItem.onclick = webPreviewFromDiscovery;
			EDITOR.discoveryBar.add(discoveryItem, 30);
			
			winMenuWysiwygHtml = EDITOR.windowMenu.add("What you see is what you get", ["Edit", 120], startHtmlWysiwyg);
			
			if(QUERY_STRING["single_page_wysiwyg"]) {
				
				// Note: For static site generator's sites use ?editPage=URL
				
				// To open a single page in WYSIWYG mode, use ?single_page_wysiwyg=PATH
				
				CLIENT.on("loginSuccess", function(loggedIn) {
					// Need to wait for the reopen-files plugin ...
					setTimeout(function() {
						editFile(QUERY_STRING["single_page_wysiwyg"]);
					}, 500);
					
				});
			}
		},
		unload: function unloadWebPreview() {
			
			EDITOR.removeEvent("showMenu", maybeShowPreviewInMenu);
			EDITOR.removeEvent("previewTool", webPreviewTool); 
			
			EDITOR.windowMenu.remove(winMenuWysiwygHtml);
		},
		order: 2100 // Run after reopen_files to prevent warning of file already being opened
	});
	
	function webPreviewFromDiscovery(clickEvent) {
		webPreview(EDITOR.currentFile, undefined, undefined, undefined, undefined, clickEvent);
	}
	
	function maybeShowPreviewInMenu() {
		
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		if(!file.path.match(/html?$/i)) return true;
		
		tempCtxMenuWebPreview = EDITOR.ctxMenu.addTemp("Web Preview", webPreview);
		
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
	
	function startHtmlWysiwyg(file) {
		if(!(file instanceof File)) file = EDITOR.currentFile;
		
		if(file == undefined) {
			alertBox("No file open!");
			return;
		}
		
		openPreviewWindow(file, true);
	}
	
	function editFile(filePath) {
		filePath = UTIL.sanitize(filePath);
		
		if(filePath == "/") filePath = "/wwwpub/index.htm";
		
		EDITOR.openFile(filePath, function(err, file) {
			if(err) {
				alertBox("Unable to edit " + filePath + " " + err.message);
				return;
			}
			
			if(file.changed || !file.isSaved) {
				
				var save = "Save it now";
				var discard = "Discard unsaved changes"
				var cancel = "No, cancel!";
				
				confirmBox("Save " + file.path + " before editing in WYSIWYG mode?", [save, discard, cancel], function(answer) {
					if(answer == discard) openPreviewWindow(file, true);
					else if(answer == save) {
						EDITOR.saveFile(file, function fileSaved(err, path) {
							if(err) alertBox(err.message);
							else openPreviewWindow(file, true);
						});
					}
				})
				
			}
			else openPreviewWindow(file, true);
			
		});
	}
	
	function webPreviewTool(file) {
		
		if(!isHTML(file)) return false;
		
		if(!file.path.match(/html?$/i)) {
			var fileExt = UTIL.getFileExtension(file.path);
			var nameSugg = UTIL.getDirectoryFromPath(file.path) + UTIL.getFileNameWithoutExtension(file.path) + ".htm";
			promptBox("Can not preview a HTML file unless the file extension is .htm or .html. Rename " + UTIL.getFilenameFromPath(file.path) + " ?<br><br>New path: ", {defaultValue: nameSugg}, function(newPath) {
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
	
	
	function openPreviewWindow(file, wysiwyg) {
		
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
				onlyPreview: !!!wysiwyg,
				url: url,
			});
			
			wEditor.onClose = function() {
				CLIENT.cmd("stop_serve", {folder: folder}, function httpServerStopped(err, json) {
					if(err) console.warn(err.message);
				});
			}
			
			
			if(wysiwyg) EDITOR.stat("web_wysiwyg");
			else EDITOR.stat("web_preview");
			
		});
	}
	
	
})();
