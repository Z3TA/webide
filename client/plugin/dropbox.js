(function() {
"use strict";

	var winMenuDropbox;
	var authWindow;
	var discoveryBarImage;
	
	EDITOR.plugin({
		desc: "Mount Dropbox",
		load: function loadGoogleDriveSupport() {
			
			winMenuDropbox = EDITOR.windowMenu.add("Dropbox", [S("Editor"), S("remote_fs"), 2], startDropbox);
			
			EDITOR.registerAltKey({char: "d", alt:2, label: "Dropbox", fun: startDropbox});
			
			CLIENT.on("dropbox", dropboxMessage);
			
			discoveryBarImage = document.createElement("img");
			discoveryBarImage.src = "gfx/icon/dropbox.svg";
			discoveryBarImage.title = S("dropbox_sync");
			discoveryBarImage.onclick = activateOrDeactivateDropboxSync;
			EDITOR.discoveryBar.add(discoveryBarImage, 50);
			
		},
		unload: function unloadGoogleDriveSupport() {
			
			EDITOR.windowMenu.remove(winMenuDropbox);
			
			EDITOR.unregisterAltKey(startDropbox);
			
			CLIENT.removeEvent("dropbox", dropboxMessage);
			
			EDITOR.discoveryBar.remove(discoveryBarImage);
		}
	});
	
	function activateOrDeactivateDropboxSync() {
		alertBox("Click Dropbox");
	}
	
	function dropboxMessage(resp) {
		
		if(resp.linked) {
			
			EDITOR.fileExplorer(EDITOR.user.home + "Dropbox/");
			
			if(authWindow) authWindow.close();
			
			alertBox("Dropbox linked!");
			
			discoveryBarImage.classList.add("active");
			
		}
		

	}
	
	function startDropbox() {
		CLIENT.cmd("startDropbox", {code: null}, function(err, resp) {
			if(err) return alertBox(err.message);

			if(resp.url) {
				// The auth page is not responsive!
				EDITOR.createWindow({url: resp.url, width: 1010, height: 610}, function(err, win) {
					// Ignore error because we shouln't be able to access this window
					
					authWindow = win;
					
				});
				
			}
			else if(resp.timeout) {
				EDITOR.fileExplorer(EDITOR.user.home + "Dropbox/");
			}
			
			winMenuDropbox.activate();
			
			
		});
	}
	
	
	
})();


