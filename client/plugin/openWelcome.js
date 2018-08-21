(function() {
	/*
		Open the welcome file
		
	*/
	"use strict";
	
	if(QUERY_STRING["embed"]) return;
	
	// The file is not available until the user has logged in
	// (we could cheat and serve it with the editor itself)
	
	CLIENT.on("loginSuccess", openWelcome, 2000);
	
	function openWelcome(login) {
		
		if(window.location.search) {
			console.log("Not opening welcome file because window.location.search=" + window.location.search);
			return;
		}
		
		if(EDITOR.startedCounter == 1) {
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
