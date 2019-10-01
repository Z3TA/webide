(function() {

/*

		navigator.share will only work on websites with httpS and not HTTP !!
		
		problem: Files get renamed to share1253283535.htm

*/

	var windowMenu;
	
EDITOR.plugin({
desc: "Allow sharing stuff with other apps",
		load:function loadShare() {

			CLIENT.on("uploadedFiles", uploadedFiles);
			
			// todo: Share files via URL
			// ask: Share file to other app on your device, or share file via URL
			
			windowMenu = EDITOR.windowMenu.add("Share", ["File", 15], shareSomething);

			console.log("typeof navigator.share=" + typeof navigator.share);

			EDITOR.on("share", shareSomething);
			
},
		unload: function unloadShare() {

			if(windowMenu) EDITOR.windowMenu.remove(windowMenu);
			
			EDITOR.removeEvent("share", shareSomething);
			
			CLIENT.removeEvent("uploadedFiles", uploadedFiles);
}
});
	
	function uploadedFiles(fileNames) {
		console.log("uploadedFiles: " + JSON.stringify(fileNames));
		
		for(var i=0, path; i<fileNames.length; i++) {
			path = "/upload/" + fileNames[i];
			EDITOR.openFile(path);
		}
		
	}
	
	function shareUsingUrl(file) {
		
		if(file.path.indexOf("/wwwpub/") == 0) {
			showUrl(file);
		}
		else {
			
			var newPath = UTIL.joinPaths("/wwwpub/", file.path); 
			
			var move = "Move the file to wwwpub folder";
			var copy = "Share a copy of the file ";
			var cancel = "Cancel";
			
			confirmBox("Move or copy the file to " + newPath + " ?", [move, copy, cancel], function(answer) {
				if(answer == move) return moveFile(file);
				else if(answer == copy) return copyFile(file);
				else if(answer != cancel) throw new Error("Unexpected answer=" + answer);
			});
			
		}
		
		function moveFile(file) {
			EDITOR.move(file, newPath, function(err, newPath) {
				if(err) return alertBox(err.message);
				else showUrl(newPath);
			});
		}
		
		function copyFile(file) {
			EDITOR.copyFile(file, newPath, function(err, newPath) {
				if(err) return alertBox(err.message);
				else showUrl(newPath);
			});
		} 
		
		function showUrl(filePath) {
			
			console.log("showUrl: filePath=" + filePath);
			
			if(filePath instanceof File) filePath = filePath.path;
			
			if(filePath.indexOf("/wwwpub/") != 0) throw new Error("File is not in /wwwpub/ ! path=" + filePath);
			
			var loc = document.location;
			var path = filePath.replace("/wwwpub/", "");
			var url = loc.protocol + "//" + EDITOR.user.name + "." + loc.hostname + "/" + path;
			
			EDITOR.putIntoClipboard(url, function(err, prompted) {
				if(!prompted) {
					var copied = err ? "" : "copied to clipboard";
					var msg = 'Public URL ' + copied + ':\n<a href="' + url + '" target="_blank">' + url + '</a>'
					alertBox(msg);
				}
			});
			
		}
		
	}
	
	function shareSomething(file, combo) {
		
		if(file == undefined) file = EDITOR.currentFile;
		if(file == undefined) return alertBox("No file specified. Please open the file you want to share.");
		
		if(typeof navigator.share == "undefined") {
			console.warn("navigator.share not available on your browser/device (" + BROWSER + ")");
			return shareUsingUrl(file);
		}
		else if(file.path.indexOf("/wwwpub/") == 0) {
			return shareUsingUrl(file);
		}
		else {
			var webShare = "Share via other app";
			var urlShare = "Share as URL";
			var cancel = "Cancel";
			confirmBox("Share the file with other apps on your device, or make it accessable via a web address/URL?", [webShare, urlShare, cancel], function(answer) {
				if(answer == webShare) shareUsingWebShare(file);
				else if(answer == urlShare) shareUsingUrl(file);
				else if(answer != cancel) throw new Error("Unexpected answer=" + answer);
			});
		}
	}
	
function shareUsingWebShare(file) {
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