
/*
	
	todo: Watch the Dropbox folder in order to refresh the file explorer (if the Dropbox folder is open)
	and ask the user to reload open files if they have been updated
	
*/

(function() {
"use strict";

	var winMenuDropbox;
	var authWindow;
	var discoveryBarImage;
	var daemonAlive = false;
	
	EDITOR.plugin({
		desc: "Mount Dropbox",
		load: function loadGoogleDriveSupport() {
			
			winMenuDropbox = EDITOR.windowMenu.add("Dropbox", [S("Editor"), S("remote_fs"), 2], startDropbox);
			
			EDITOR.registerAltKey({char: "d", alt:2, label: "Dropbox", fun: startDropbox});
			
			CLIENT.on("dropbox", dropboxMessage);
			
			CLIENT.on("loginSuccess", checkIfDropboxIsRunning);
			
			discoveryBarImage = document.createElement("img");
			discoveryBarImage.src = "gfx/icon/dropbox.svg";
			discoveryBarImage.title = "Dropbox";
			discoveryBarImage.onclick = dropboxDiscoveryClicked;
			discoveryBarImage.oncontextmenu = dropboxDiscoveryContextMenuActivated;
			EDITOR.discoveryBar.add(discoveryBarImage, 50);
			
			// note: Deactivating Dropbox sync doesn't make sence
			
		},
		unload: function unloadGoogleDriveSupport() {
			
			EDITOR.windowMenu.remove(winMenuDropbox);
			
			EDITOR.unregisterAltKey(startDropbox);
			
			CLIENT.removeEvent("dropbox", dropboxMessage);
			
			CLIENT.removeEvent("loginSuccess", checkIfDropboxIsRunning);
			
			EDITOR.discoveryBar.remove(discoveryBarImage);
		}
	});
	
	function checkIfDropboxIsRunning() {
		CLIENT.cmd("checkDropboxDaemon", function(err, resp) {
			if(err) {
				alertBox("Unable to get Dropbox status: " + err.message);
				return;
			}
			
			if(!resp.dead) {
				dropboxDaemonIsRunning();
			}
			
		});
	}
	
	function dropboxDiscoveryContextMenuActivated() {
		if(daemonAlive) {
			var yes = "Yes, disconnect from Dropbox";
			var no = "No, keep Dropbox syncronized";
			confirmBox("Do you want to stop the Dropbox daemons?", [yes, no], function(answer) {
				if(answer == yes) disconnectFromDropbox();
			});
		}
		else {
			alertBox("Drobox daemon not active.")
		}
	}
	
	function disconnectFromDropbox() {
		CLIENT.cmd("stopDropboxDaemon", function(err, resp) {
			if(err) {
				alertBox("Failed to stop Dropbox daemon: " + err.message);
				return;
			}
			else {
dropboxDaemonWasKilled();
				alertBox("Dropbox daemon(s) stopped!");
			}
		});
	}
	
	function dropboxDiscoveryClicked() {
		/*
			note: The user might want to explore the Dropbox folder, so don't kill the daemon here
		*/
		
		if(daemonAlive) {
			EDITOR.fileExplorer(EDITOR.user.home + "Dropbox/");
		}
		else startDropbox();
		
	}
	
	
	
	function startOrKillDropboxDaemon() {
		
		if(daemonAlive) {
			disconnectFromDropbox();
		}
		else {
			startDropbox();
		}
		
	}
	
	function dropboxDaemonIsRunning() {
		daemonAlive = true;
		discoveryBarImage.classList.add("active");
		winMenuDropbox.activate();
		
	}
	
	function dropboxDaemonWasKilled() {
		daemonAlive = false;
		discoveryBarImage.classList.remove("active");
		winMenuDropbox.deactivate();
	}
	
	function dropboxMessage(resp) {
		
		if(resp.linked) {
			
			EDITOR.fileExplorer(EDITOR.user.home + "Dropbox/");
			
			if(authWindow) authWindow.close();
			
			alertBox("Dropbox linked!");
			
			dropboxDaemonIsRunning();
			
		}
		

	}
	
	function startDropbox() {
		CLIENT.cmd("startDropboxDaemon", function(err, resp) {
			if(err) {
alertBox(err.message);
				
				
				return;
			}
			
			if(resp.url) {
				// The auth page is not responsive!
				EDITOR.createWindow({url: resp.url, width: 1010, height: 610}, function(err, win) {
					// Ignore error because we shouln't be able to access this window
					
					authWindow = win;
					
				});
				
			}
			else if(resp.timeout) {
				dropboxDaemonIsRunning();
				EDITOR.fileExplorer(EDITOR.user.home + "Dropbox/");
			}
			
		});
	}
	
	
	
})();


