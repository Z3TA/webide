/*
	
	Sugg: Detect if on desktop computer, only available if you got a big screen !?
	Answer: Some mobiles support split screen, then it could be useful.
	
*/

(function() {
	"use strict";
	
	var ctxMenuNewWindow;
	var windowMenuNewWindow, windowMenuSplitScreen;
	var discoveryItem;
	
	EDITOR.plugin({
		desc: "Open file in new window",
		load: function loadFloatingWindow() {
			
			ctxMenuNewWindow = EDITOR.ctxMenu.add("Open in new window", openInNewWindow, 4);
			windowMenuNewWindow = EDITOR.windowMenu.add("Open in new window", ["File", 9], openInNewWindow);
			windowMenuSplitScreen = EDITOR.windowMenu.add("Split screen/new window", ["View", 50], splitScreen);
			
			discoveryItem = document.createElement("img");
			discoveryItem.src = "gfx/new-window.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
			discoveryItem.title = "Open new window";
			discoveryItem.onclick = openWindowFromMenu;
			EDITOR.discoveryBar.add(discoveryItem, 100);
			
		},
		unload: function unloadFloatingWindow() {
			EDITOR.ctxMenu.remove(ctxMenuNewWindow);
			EDITOR.windowMenu.remove(windowMenuNewWindow);
			EDITOR.windowMenu.remove(windowMenuSplitScreen);
			EDITOR.discoveryBar.remove(discoveryItem);
		},
	});
	
	function openWindowFromMenu() {
		openInNewWindow(EDITOR.currentFile);
	}
	
	function splitScreen() {
		
		// todo: Test with multiple screens, and windows managers (such as i3)
		
		var browserWindowWidth = window.outerWidth;
		var browserWindowHeight = window.outerHeight;
		var browserWindowPositionX = window.screenX || window.screenLeft;
		var browserWindowPositionY = window.screenY || window.screenTop;
		
		var screenWidth = screen.width;
		var screenHeight = screen.height;
		
		var editorCodeWindow = window;
		
		var width1 = Math.floor(browserWindowWidth / 2);
		var width2 = width1*2 == browserWindowWidth ? width1 : width1+1;
		
		var height = browserWindowHeight;
		var browserChromeHeight = 30;
		
		var isAtMaxWidth = screen.availWidth - window.innerWidth === 0; // Seems we can't resize a window that is maximized'
		
		console.log("splitScreen: browserWindowWidth=" + browserWindowWidth + " browserWindowHeight=" + browserWindowHeight + " isAtMaxWidth=" + isAtMaxWidth);
		console.log("splitScreen: screenWidth=" + screenWidth + " screenHeight=" + screenHeight);
		console.log("splitScreen: browserWindowPositionX=" + browserWindowPositionX + " browserWindowPositionY=" + browserWindowPositionY);
		console.log("splitScreen: width1=" + width1 + " width2=" + width2 + " height=" + height);
		
		//editorCodeWindow.moveTo(0, 0);
		editorCodeWindow.resizeTo(width1, height);
		EDITOR.resizeNeeded();
		
		var options = {
			top: browserWindowPositionY-browserChromeHeight,
			left: browserWindowPositionX+width1,
			width: width2,
			height: height
		}
		
		openInNewWindow(EDITOR.currentFile, options, function windowOpened(err, win) {
			
			//win.resizeTo(width2, height);
			//win.moveTo(options.left, options.top);
			
			windowMenuSplitScreen.hide();
		}); 
		
		// canvas freezes when the other window is closed !?
		
	}
	
	function openInNewWindow(file, browserWindowOptions, callback) {
		
		if(typeof browserWindowOptions == "function" && callback == undefined) {
			callback = browserWindowOptions;
			browserWindowOptions = {};
		}
		
		if(typeof browserWindowOptions != "object") {
			browserWindowOptions = {};
		}
		
		EDITOR.ctxMenu.hide();
		windowMenuNewWindow.hide();
		
		if(!browserWindowOptions.url) browserWindowOptions.url = "/?disable=collaboration_notice,reopen_files,trmb,file_tabs,discoveryBar";
		if(!browserWindowOptions.waitUntilLoaded) browserWindowOptions.waitUntilLoaded = true;
		
		if(QUERY_STRING["theme"]) browserWindowOptions.url += "&theme=" + QUERY_STRING["theme"];
		
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
				
				if(typeof callback == "function") callback(null, browserWindow);
				
				function checkIfClosed() {
					if(!browserWindow || browserWindow.closed) {
						browserWindowClosed();
					}
				}
				
				function checkIfOpen() {
					if(browserWindow && browserWindow.window.EDITOR) {
						clearInterval(checkOpenInterval);
						closeCollabDialogs();
					}
					//else console.log("File in other window not yet opened ... browserWindow? " + !!browserWindow + " browserWindow.window.EDITOR? " + !!browserWindow.window.EDITOR + " thisEditor.openDialogs.length=" + thisEditor.openDialogs.length + " ");
				}
				
				function browserWindowClosed() {
					clearInterval(checkCloseInterval);
					
					closeCollabDialogs();
					}
				
				
			});
			
			function closeCollabDialogs() {
				// Close dialog about collaboratior leaving
				
				var dialogCodes = EDITOR.openDialogs.map(function(dialog) { return dialog.code });
				if(dialogCodes.indexOf("COLLABORATION_NOTICE") != -1) EDITOR.closeAllDialogs("COLLABORATION_NOTICE");
				
				// Sometimes the dialog comes up late ...
				setTimeout(closeCollabDialogs, 50);
			}
			
		});
	}
	
	
})();
