/*
	
	Native: 
	
	987730033948-ahajn7bgtdfh09b719f9a30u9sma2n96.apps.googleusercontent.com
	webide-203608
	oz_hNXf2jtwqM3S7enuXST_j
	
	https://console.developers.google.com/apis/credentials?pli=1&project=webide-203608&folder&organizationId
	
	
*/

var menuItem;

EDITOR.plugin({
	desc: "Mount Google Drive",
	load: function() {
		menuItem = EDITOR.addMenuItem("Google Drive", googleDriveInit);

},
	unload: function() {
EDITOR.removeMenuItem(menuItem);
}
});

function googleDriveInit() {
CLIENT.cmd("googleDrive", {code: null}, function(err, authUrl) {
if(err) return alertBox(err.message);
		
		if(!authUrl) throw new Error("Unexpected authUrl=" + authUrl);
		
		EDITOR.createWindow({url: authUrl}, function(err, win) {
			// Ignore error because we shouln't be able to access this window
			
			promptBox("After authorizing Google Drive you will get a code. Paste the code here:", function(code) {
				if(code) {
					CLIENT.cmd("googleDrive", {code: code}, function(err) {
						if(err) return alertBox(err.message);
						
						// Assume it was successfully mounted
						EDITOR.fileExplorer("/googleDrive/");
						
						EDITOR.updateMenuItem(menuItem, true, "Google Drive", umountGoogleDrive);
						
					});
				}
			});
			
		});
		
	});
}

function umountGoogleDrive() {
	CLIENT.cmd("googleDrive", {umount: true}, function(err) {
		if(err) return alertBox(err.message);
		
		EDITOR.updateMenuItem(menuItem, false, "Google Drive", umountGoogleDrive);
		
	});
}


