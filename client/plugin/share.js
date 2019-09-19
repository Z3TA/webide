(function() {

/*

		navigator.share will only work on websites with httpS and not HTTP !!
		
		problem: Files get renamed to share1253283535.htm

*/

	var windowMenu;
	
EDITOR.plugin({
desc: "Allow sharing stuff with other apps",
		load:function loadShare() {

			if(typeof navigator.share == "undefined") {
				console.warn("navigator.share not available on your browser/device (" + BROWSER + ")");
				return;
			}
			
			windowMenu = EDITOR.windowMenu.add("Send/Share", ["File", 15], shareSomething);

			console.log("typeof navigator.share=" + typeof navigator.share);

			EDITOR.on("share", shareSomething);
			
},
		unload: function unloadShare() {

			if(windowMenu) EDITOR.windowMenu.remove(windowMenu);
			
			EDITOR.removeEvent("share", shareSomething);
			
}
});
	
	
	function shareSomething(file, combo) {
		
		if(file == undefined) file = EDITOR.currentFile;
		
		if(typeof BrowserFile != "undefined") {
			 var fileBits = [file.text];
			var fileName = UTIL.getFilenameFromPath(file.path);
			var options = {type: "text/plain"};
			
			var filesArray = [
				new BrowserFile(fileBits, fileName, options)
			];
		}
		else {
			alertBox("The share module was unable to create a file object!");
			return false;
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
		} 
		else {
			
			// Try sharing the file as text
			navigator.share({
				title: fileName,
				text: file.text,
			})
			.then(shareSuccessful)
			.catch(shareError);
		}
		
		return true;
		
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