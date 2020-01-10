(function() {
	/*
		Open the welcome file
		
	*/
	"use strict";
	
	if(QUERY_STRING["embed"]) return;
	
	if(window.location.search) {
		console.log("Not opening welcome file because window.location.search=" + window.location.search);
		return;
	}
	
	var host = window.location.hostname;
	if(host == "127.0.0.1" || host.indexOf("192.168") != -1) {
		console.log("Not opening welcome file because window.location.hostname=" + host);
		return;
	}
	
	CLIENT.on("loginCounter", openWelcome, 2000);
	
	function openWelcome(loginCounter) {
		
		if(loginCounter == 1) {
			// First time the editor is started. And nothing in query string (eg no repos to download) Open the welcome right away
			openWelcomeFile();
		}
		else {
			
		// The user might have edited the file, so it will be opened by the reopen_files plugin.
		// So wait a bit ...
		
		setTimeout(function wait() {
			if(Object.keys(EDITOR.files).length === 0 && EDITOR.openFileQueue.length == 0) {
					openWelcomeFile();
				}
		}, 1000); // reopen_files seem to take an awful long time
	}
	}
	
	function openWelcomeFile() {
		EDITOR.openFile("/wwwpub/welcome.htm", undefined, function fileOpened(err, file) {
			
			if(err) console.warn(err);
			
		});
	}
	
})();
