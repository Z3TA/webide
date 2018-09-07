/*
	Google drive integration is a must have for a Chromebook users, since that's where they store their files.
	Most editor functionality however depends on the Editor-server-api, for example previewing html files, or running nodejs scripts.
	That's why Google Drive is mounted server side instead of using the client/web API
	
*/
(function() {
	"use strict";

var menuItem;

	var GD_MENU_NOT_CONNECTED = "Google Drive";
	var GD_MENU_CONNECTED = "Google Drive (logout)";
	
EDITOR.plugin({
	desc: "Mount Google Drive",
	load: function() {
			menuItem = EDITOR.addMenuItem(GD_MENU_NOT_CONNECTED, googleDriveInit);

},
	unload: function() {
EDITOR.removeMenuItem(menuItem);
}
});

function googleDriveInit() {
		// Hide the menu right away so the user don't think it's "locked"
		EDITOR.hideMenu();
		
		// Should we show a loading bar !?
		
		CLIENT.cmd("googleDrive", {code: null}, function(err, gd) {
if(err) return alertBox(err.message);
		
			if(gd.mounted) return mountSuccess();
			else if(gd.url) {
				EDITOR.createWindow({url: gd.url}, function(err, win) {
					// Ignore error because we shouln't be able to access this window
					
					promptBox("After authorizing with Google (new window) you will get a code. Paste the code here:", function(code) {
						
						try {
							win.close();
						}
						catch(err) {
							console.error(err);
						}
						
						if(code) {
							CLIENT.cmd("googleDrive", {code: code}, function(err) {
								if(err) return alertBox(err.message);
								else mountSuccess();
							});
						}
						else {
							CLIENT.cmd("googleDrive", {cancelLogin: true}, function(err) {
								if(err) console.error(err);
							});
						}
						
					});
					
				});
			}
			else throw new Error("Unexpected response:" + JSON.stringify(gd));
		
	});
}

	function mountSuccess() {
		// Assume it was successfully mounted
		EDITOR.fileExplorer("/googleDrive/");
		
		EDITOR.updateMenuItem(menuItem, true, GD_MENU_CONNECTED, umountGoogleDrive);
		EDITOR.hideMenu();
	}
	
function umountGoogleDrive() {
		console.log("Logging out and unmounting Google Drive ...");
	CLIENT.cmd("googleDrive", {umount: true}, function(err) {
			if(err) console.warn(err.message);
			else console.log("Successfully logged out and unmounted from Google Drive !");
			
			// Even if we got an error, the folder has likely umount'ed
			
			EDITOR.updateMenuItem(menuItem, false, GD_MENU_NOT_CONNECTED, googleDriveInit);
			EDITOR.hideMenu();
			
			// Tell file explorer to close /googleDrive folder !?
			EDITOR.fireEvent("move", ["/googleDrive/", "/dev/null"]);
			
	});
}


})();