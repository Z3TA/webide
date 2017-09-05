(function() {
	/*
		If no file has been opened after one second. Open the welcome file
		
	*/
	"use strict";
	
	var timer = 1000; // Milliseconds
	
	var loadOrder = 999; // Load late
	
	EDITOR.on("start", openWelcome, loadOrder);
	
	function openWelcome() {
		setTimeout(function openWelcomeFileAfterSomeTime() {
			
			if(Object.keys(EDITOR.files).length === 0) {
				
				EDITOR.openFile("/wwwpub/welcome.html", undefined, function fileOpened(err, file) {
					
					if(err) console.warn(err);
					
				});
				
				
			}
		}, timer);
		
	}
	
	
})();
