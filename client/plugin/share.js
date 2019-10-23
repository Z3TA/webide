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

			var order = 100; // Before download_file.js
			EDITOR.on("share", shareSomething, order);
			
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
	
	function shareUsingUrl(filePath) {
		
		if(filePath.indexOf("/wwwpub/") == 0) {
			showUrl(filePath);
		}
		else {
			
			console.log(UTIL.getStack("shareUsingUrl"));
			
			var newPath = UTIL.joinPaths(EDITOR.user.home, "/wwwpub/", filePath); 
			
			var move = "Move the file to wwwpub folder";
			var copy = "Make a copy of the file ";
			var cancel = "Cancel";
			
			confirmBox("Move or copy " + filePath + " to " + newPath + " ?", [move, copy, cancel], function(answer) {
				
				if(answer == move || answer == copy) {
					// Create the target folder first!
					var directory = UTIL.getDirectoryFromPath(newPath);
					EDITOR.createPath(directory, function(err) {
						if(err) return alertBox("Unable to create directory=" + directory + " Error: " + err.message);
						
						if(answer == move) return moveFile(filePath);
						else if(answer == copy) return copyFile(filePath);
						else if(answer != cancel) throw new Error("Unexpected answer=" + answer);
						
					})
				}
				
			});
			
		}
		
		return true;
		
		function moveFile(filePath) {
			EDITOR.move(filePath, newPath, function afterFileMovedToWwwPub(err, newPath) {
				if(err) return alertBox("Unable to move " + filePath + " Error: " + err.message);
				else showUrl(newPath);
			});
		}
		
		function copyFile(filePath) {
			EDITOR.copyFile(filePath, newPath, function afterFileCopiedToWwwPub(err, newPath) {
				if(err) return alertBox("Unable to copy " + filePath + " to " + newPath + " Error: " + err.message);
				else showUrl(newPath);
			});
		} 
		
		function showUrl(filePath) {
			
			console.log("showUrl: filePath=" + filePath);
			
			if(filePath instanceof File) filePath = filePath.path;
			
			var wwwpub = "/wwwpub/";
			if(filePath.indexOf(wwwpub) != 0) wwwpub = UTIL.joinPaths(EDITOR.user.home, wwwpub);
			
			if(filePath.indexOf(wwwpub) != 0) throw new Error("File is not in " + wwwpub + " ! filePath=" + filePath);
			
			var loc = document.location;
			
			//if(UTIL.isPrivateIp(loc.hostname)) var editorUrl = EDITOR.settings.publicUrl || "https://webide.se/"; 
			
			var editorUrl = loc.protocol + "//" + loc.hostname + "/";
			
			var path = filePath.replace(wwwpub, "");
			var fileUrl = loc.protocol + "//" + EDITOR.user.name + "." + loc.hostname + "/" + path;
			var shareUrl = editorUrl + "?open=" + encodeURIComponent(fileUrl);
			
			EDITOR.putIntoClipboard(shareUrl, "Share this URL: ", function(err, prompted) {
				if(!prompted) {
					var copied = err ? "" : "copied to clipboard";
					var msg = 'Public URL ' + copied + ':\n<a href="' + shareUrl + '" target="_blank">' + shareUrl + '</a>';
					alertBox(msg);
				}
			});
			
		}
		
	}
	
	function shareSomething(filePath, combo) {
		
		// Need to return true if we claim the share event, or false if we do not!
		
		if(filePath instanceof File) filePath = filePath.path;
		if(filePath == undefined) filePath = EDITOR.currentFile.path;
		if(filePath == undefined) {
//alertBox("No file specified. Please open the file you want to share. Or specify a file path.");
			return false;
		}
		
		if(typeof navigator.share == "undefined") {
			console.warn("navigator.share not available on your browser/device (" + BROWSER + ")");
			return shareUsingUrl(filePath);
		}
		else if(filePath.indexOf("/wwwpub/") == 0) {
			return shareUsingUrl(filePath);
		}
		else if(UTIL.isPrivateIp(document.location.hostname)) {
			return shareUsingWebShare(filePath);
		}
		else {
			var webShare = "Share via other app";
			var urlShare = "Share as URL";
			var cancel = "Cancel";
			confirmBox("Share the file with other apps on your device, or make it accessable via a web address/URL?", [webShare, urlShare, cancel], function(answer) {
				if(answer == webShare) shareUsingWebShare(filePath);
				else if(answer == urlShare) shareUsingUrl(filePath);
				else if(answer != cancel) throw new Error("Unexpected answer=" + answer);
			});
		}
	}
	
	function shareUsingWebShare(filePath) {
		
		if(EDITOR.files.hasOwnProperty(filePath)) {
			gotFile(filePath, EDITOR.files[filePath].text);
		}
		else {
			EDITOR.readFromDisk(filePath, function(err, data) {
				if(err) return alertBox("Unable to open filePath=" + filePath + " Error: " + err.message);
				gotFile(filePath, data);
			});
		}
		
		return true;
		
		function gotFile(text) {
			
			if(typeof BrowserFile != "undefined") {
				var fileBits = [filePath.text];
				var fileName = UTIL.getFilenameFromPath(filePath);
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
					text: text,
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
	}
	
})();