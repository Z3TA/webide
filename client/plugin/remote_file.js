(function() {
	var remoteFiles = [];
	
	EDITOR.plugin({
		desc: "Handle files opened on remote computers",
		load: loadRemoteFileHandler,
		unload: unloadRemoteFileHandler
	});
	
	function loadRemoteFileHandler() {
		
		CLIENT.on("remoteFile", openRemoteFile);
		
		EDITOR.on("beforeSave", remoteFileSaved);
		EDITOR.on("fileClose", remoteFileClosed);
		
	}
	
	function unloadRemoteFileHandler() {
		
		CLIENT.removeEvent("remoteFile", openRemoteFile)
		
		EDITOR.removeEvent("beforeSave", remoteFileSaved);
		EDITOR.removeEvent("fileClose", remoteFileClosed);
		
	}
	
	function openRemoteFile(json) {
		
		console.log( "openRemoteFile: json=" + JSON.stringify(json, null, 2) );
		
		var url = "remote://" + json.host + (json.fileName.indexOf("/") == 0 ? "" : "/") + json.fileName;
		
		EDITOR.openFile(url, json.content, {savedAs: true, isSaved: true}, function(err, file) {
			if(err) throw err;
			
			remoteFiles.push(file);
		});
	}
	
	function remoteFileSaved(file) {
		
		console.log( "remoteFileSaved: file.path=" + file.path );
		
		console.log( "remoteFileSaved: remoteFiles=" + JSON.stringify(remoteFiles.map(mapPath)) );
		
		if(remoteFiles.indexOf(file) != -1) {

			var fileName = UTIL.getPathFromUrl(file.path);
			
			CLIENT.cmd("remoteFile", {name: fileName, content: file.text}, function(err) {
				if(err) alertBox("Failed to save remote file " + fileName + ".\nError: " + err.message);
				else {
				console.log( "remoteFileSaved: Data sent to remote host!" );
				file.saved();
				}
			});
			
			return PREVENT_DEFAULT;
		}
		else if(file.path.indexOf("remote://") == 0) {
			alertBox( "Unknown remote file: " + file.path + ". remote=" + JSON.stringify(remoteFiles.map(mapPath)) );
			return PREVENT_DEFAULT;
		}
		
		return ALLOW_DEFAULT;
		
	}
	
	function remoteFileClosed(file) {
		
		var index = remoteFiles.indexOf(file);
		
		console.log( "remoteFileClosed: file.path=" + file.path + " index=" + index + " remoteFiles=" + JSON.stringify(remoteFiles.map(mapPath)) );
		
		if(index != -1) {
			remoteFiles.splice(index, 1);
			
			var fileName = UTIL.getPathFromUrl(file.path);
			
			CLIENT.cmd("remoteFile", {name: fileName, close: true}, function(err) {
				if(err) alertBox("Remote socket error: " + err.message);
		});
		}
		else if(file.path.indexOf("remote://") == 0) {
			console.warn("Unknown remote file: " + file.path);
		}
	}
	
	function mapPath(file) {
		return file.path;
	}
	
})();
