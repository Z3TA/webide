(function() {
	/*
		If no file has been opened after one second. Open the README.txt
		
	*/
"use strict";
	
	var timer = 1000; // Milliseconds
	
	var loadOrder = 999; // Load late
	
	EDITOR.on("start", openReadme, loadOrder);
	
	function openReadme() {
		setTimeout(function openReadmeFileAfterSomeTime() {
			
			if(Object.keys(EDITOR.files).length === 0) {
				
				if(runtime == "browser") {
					EDITOR.openFile("README.txt");
				}
				
				else {
					
					var path = require("path");
					var dirname = require("dirname");
					
					var filePath = path.join(dirname + "/README.txt");
					
					EDITOR.openFile(filePath);
				}
			}
		}, timer);
		
	}
	

})();