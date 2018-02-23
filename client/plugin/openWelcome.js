(function() {
	/*
		Open the welcome file
		
	*/
	"use strict";
	
	if(QUERY_STRING["embed"]) return;
	
	// The file is not available until the user has logged in
	CLIENT.on("loginSuccess", openWelcome);
	
	function openWelcome(login) {
		
			if(Object.keys(EDITOR.files).length === 0) {
				
				EDITOR.openFile("/wwwpub/welcome.html", undefined, function fileOpened(err, file) {
					
					if(err) console.warn(err);
					
				});
				}
			
	}
	
	
})();
