(function() {

/*

		navigator.share will only work on websites with httpS and not HTTP !!
		

*/

	var windowMenu;
	
EDITOR.plugin({
desc: "Allow sharing stuff with other apps",
		load:function loadShare() {

			windowMenu = EDITOR.windowMenu.add("Share", ["Edit", 10], shareSomething);

			console.log("typeof navigator.share=" + typeof navigator.share);

},
		unload: function unloadShare() {

EDITOR.windowMenu.remove(windowMenu);
			
}
});
	
	
	function shareSomething() {
		
		if(typeof navigator.share == "undefined") {
			alertBox("navigator.share not available on your browser/device (" + BROWSER + ")");
			return;
		}
		
		if(typeof BrowserFile != "undefined") {
			 
			var file = EDITOR.currentFile;
			
			var fileBits = [file.text];
			var fileName = UTIL.getFilenameFromPath(file.path);
			var options = {type: "text/plain"};
			
			var filesArray = [
				new BrowserFile(fileBits, fileName, options)
			];
		}
		else {
			alertBox("Unable to create a file object!");
		}
		

		if (navigator.canShare && navigator.canShare( { files: filesArray } )) {
			navigator.share({
				files: filesArray,
				title: fileName,
				name: fileName,
				text: 'File shared from ' + document.location.hostname,
			})
			.then(shareSuccessful)
			.catch(shareError);
		} else {
			
			// Try sharing the file as text
			navigator.share({
				title: fileName,
				text: file.text,
			})
			.then(shareSuccessful)
			.catch(shareError);
			
		}
		
		
		function shareSuccessful() {
			console.log('Share was successful.');
			windowMenu.hide();
		}
		
		function shareError(err) {
			console.error(err);
			
			var CANCEL = 20;
			
			if(err.code != CANCEL) {
				alertBox("Problems sharing fileName=" + fileName + " Error: " + err.message + " (code=" + err.code + ")");
			}
		}
		
	}
	
	
})();