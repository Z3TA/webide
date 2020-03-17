
/*
	
	todo: Watch the Dropbox folder in order to refresh the file explorer (if the Dropbox folder is open)
	and ask the user to reload open files if they have been updated
	
*/

(function() {
"use strict";

	var winMenuDropbox;
	var authWindow;
	var discoveryBarIcon;
	var daemonAlive = false;
	
	EDITOR.plugin({
		desc: "Mount Dropbox",
		load: function loadGoogleDriveSupport() {
			
			winMenuDropbox = EDITOR.windowMenu.add("Dropbox", [S("Editor"), S("remote_fs"), 2], startDropbox);
			
			EDITOR.registerAltKey({char: "d", alt:2, label: "Dropbox", fun: startDropbox});
			
			CLIENT.on("dropbox", dropboxMessage);
			
			CLIENT.on("loginSuccess", checkIfDropboxIsRunning);
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/icon/dropbox.svg", 70, "Dropbox", "DRBOX", dropboxDiscoveryClicked, dropboxDiscoveryContextMenuActivated);
			// Icon created by: https://www.flaticon.com/authors/phatplus
			
			
			// note: Deactivating Dropbox sync doesn't make sense
			
		},
		unload: function unloadGoogleDriveSupport() {
			
			EDITOR.windowMenu.remove(winMenuDropbox);
			
			EDITOR.unregisterAltKey(startDropbox);
			
			CLIENT.removeEvent("dropbox", dropboxMessage);
			
			CLIENT.removeEvent("loginSuccess", checkIfDropboxIsRunning);
			
			if(discoveryBarIcon) EDITOR.discoveryBar.remove(discoveryBarIcon);
		}
	});
	
	function checkIfDropboxIsRunning(login) {
if(!login.tld) {
console.warn("Disabling Dropbox plugin");
EDITOR.disablePlugin("Mount Dropbox", true);
return;
}

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
			EDITOR.fileExplorer(EDITOR.user.homeDir + "Dropbox/");
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
		if(discoveryBarIcon) discoveryBarIcon.classList.add("active");
		winMenuDropbox.activate();
		
	}
	
	function dropboxDaemonWasKilled() {
		daemonAlive = false;
		if(discoveryBarIcon) discoveryBarIcon.classList.remove("active");
		winMenuDropbox.deactivate();
	}
	
	function dropboxMessage(resp) {
		
		if(resp.linked) {
			
			EDITOR.fileExplorer(EDITOR.user.homeDir + "Dropbox/");
			
			if(authWindow) {
authWindow.close();
				authWindow = null;
			}
			
			alertBox("Dropbox linked!");
			
			dropboxDaemonIsRunning();
			
// First time we opened the file explorer the Dropbox folder was probably empty
EDITOR.fileExplorer(EDITOR.user.homeDir + "Dropbox/");

		}
		else if(resp.url) {
			auth(resp.url);
		}
		else throw new Error("Unable to handle Dropbox message: resp=" + JSON.stringify(resp));
		
		
	}
	
	function startDropbox() {
		CLIENT.cmd("startDropboxDaemon", function(err, resp) {
			if(err) {
alertBox(err.message);
				
				
				return;
			}
			
			if(resp.url) {
				auth(resp.url);
				
			}
			else if(resp.timeout) {
				dropboxDaemonIsRunning();
				EDITOR.fileExplorer(EDITOR.user.homeDir + "Dropbox/");
			}
			
		});
	}
	
	function auth(url) {
		
		//console.log("Dropbox: authWindow=" + authWindow);
		
		if(authWindow) {
			console.warn("Dropbox: Already got an authWindow!");
			return;
		}
		
		// The auth page has a static width and height (eg it does not adapt to window size)!
		EDITOR.createWindow({url: url, width: 1010, height: 610}, function(err, win) {
			// Ignore error because we shouln't be able to access this window
			
			authWindow = win;
			
		});
	}
	
	
})();


