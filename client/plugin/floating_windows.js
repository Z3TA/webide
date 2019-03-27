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
		
		var thisEditor = window.EDITOR;
		
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
				
				
				var checkOpenInterval = setInterval(checkIfOpen, 1);
				/*
					Callbacks from the other window will refer to the other window!??!?
					So we can't actually have any code here, as that code wont run here !?!?
				*/
				
				
				// Hide "collaborator leaved" message when window is closed ...
				var checkCloseInterval = setInterval(checkIfClosed, 1000);
				
				setTimeout(function() {
					// This callback function seem to run in this window context though !?!?
					browserWindow.window.onbeforeunload = function() {
						clearInterval(checkCloseInterval);
						checkCloseInterval = setInterval(checkIfClosed, 1);
						return undefined; // Will not warn about unsaved changes
					}
				}, 1000);
				
				function checkIfClosed() {
					if(!browserWindow || browserWindow.closed) {
						browserWindowClosed();
					}
				}
				
				function checkIfOpen() {
					if(browserWindow && browserWindow.window.EDITOR && thisEditor.openDialogs.length > 0) {
						clearInterval(checkOpenInterval);
						EDITOR.closeAllDialogs("COLLABORATION_NOTICE");
					}
					//else console.log("File in other window not yet opened ... browserWindow? " + !!browserWindow + " browserWindow.window.EDITOR? " + !!browserWindow.window.EDITOR + " thisEditor.openDialogs.length=" + thisEditor.openDialogs.length + " ");
				}
				
				function browserWindowClosed() {
					clearInterval(checkCloseInterval);
					
					closeCollabDialogs();
					
					// Sometimes the dialog comes up late ...
					setTimeout(closeCollabDialogs, 50);
				}
				
				
			});
			
			function closeCollabDialogs() {
				// Close dialog about collaboratior leaving
				
				var dialogCodes = EDITOR.openDialogs.map(function(dialog) { return dialog.code });
				if(dialogCodes.indexOf("COLLABORATION_NOTICE") != -1) EDITOR.closeAllDialogs("COLLABORATION_NOTICE");
			}
			
		});
	}
	
	
})();
