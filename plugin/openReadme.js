(function() {
	/*
		If no file has been opened after one second. Open the README.txt
		
	*/
"use strict";
	
	var timer = 1000; // Milliseconds
	
	editor.on("start", openReadme);
	
	function openReadme() {
		setTimeout(function () {
			
			if(Object.keys(editor.files).length === 0) {
				editor.openFile("README.txt");
			}
			
		}, timer);
		
	}
	

})();