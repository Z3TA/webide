/*
	
	Sugg: Detect if on desktop computer, only available if you got a big screen !?
	Answer: Some mobiles support split screen, then it could be useful.
	
*/

(function() {
	"use strict";
	
	var menu;
	
	EDITOR.plugin({
		desc: "Open file in new window",
		load: function loadFloatingWindow() {
			
			menu = EDITOR.addMenuItem("Open in new window", openInNewWindow, 4);
			
		},
		unload: function unloadFloatingWindow() {
			EDITOR.removeMenuItem(menu);
		},
	});
	
	
	function openInNewWindow(file) {
		
		EDITOR.hideMenu();
		
		var browserWindowOptions = {
			url: "/?disable=collaboration_notice,reopen_files,trmb,file_tabs",
			waitUntilLoaded: true
		};
		
		
		
		EDITOR.createWindow(browserWindowOptions, function windowOpened(err, browserWindow) {
			if(err) throw err;
			
			// Load the file in the other window
			console.log(browserWindow.window);
			var otherEditor = browserWindow.window.EDITOR;
			
			otherEditor.openFile(file.path, file.text, {isSaved: file.isSaved, savedAs: file.savedAs, changed: file.changed}, function(err, fileInOtherWindow) {
				if(err) throw err;
				
				var line = file.caret.row + file.partStartRow + 1;
				
				fileInOtherWindow.gotoLine(line);
				
				otherEditor.on("fileClose", function fileClosed(closedFile) {
					var openedFiles = Object.keys(otherEditor.files);
					if(openedFiles.length == 1) {
						browserWindow.close();
						setTimeout(browserWindowClosed, 100);
					}
				});
				
				
				// Close dialog about collaboratior joining
				EDITOR.closeAllDialogs();
				
				
				// Hide "collaborator leaved" message when window is closed ...
				
				var checkCloseInterval = setInterval(checkIfClosed, 1000);
				
				setTimeout(function() {
					browserWindow.window.onbeforeunload = function() {
						//alertBox("Other window unloading!");
						clearInterval(checkCloseInterval);
						checkCloseInterval = setInterval(checkIfClosed, 10);
						return undefined; // Will not warn about unsaved changes
					}
				}, 1000);
				
				function checkIfClosed() {
					if(!browserWindow || browserWindow.closed) {
						browserWindowClosed();
					}
				}
				
				function browserWindowClosed() {
					clearInterval(checkCloseInterval);
					
					// Close dialog about collaboratior leaving
					EDITOR.closeAllDialogs();
				}
				
			});
			
		});
	}
	
	
})();
