(function() {
	
	/*
		
		Some functionality is dublicated with stdin_channel.js plugin!
		The main different is that remote_file.js work with bin/webider and stdin_channel.js work with bin/webide
		
		bin/webide is for running locally, and bin/webider should run remotely.
		
	*/
	
	var remoteFiles = [];
	var pipeCounter = 0;
	var pipeBuffer = "";
	var socketId = {}; // local pipe id to server pipe socket id
	var ENTER = String.fromCharCode(13);
	
	EDITOR.plugin({
		desc: "Open files and pipe data to the editor from remote computers (using bin/webider)",
		load: loadRemoteFileHandler,
		unload: unloadRemoteFileHandler
	});
	
	function loadRemoteFileHandler() {
		
		CLIENT.on("remoteFile", openRemoteFile);
		CLIENT.on("remotePipe", remotePipeData);
		
		EDITOR.on("beforeSave", remoteFileSaved);
		EDITOR.on("fileClose", remoteFileClosed);
		EDITOR.on("fileOpen", oldPipeFileOpenedMaybe);
		
	}
	
	
	function unloadRemoteFileHandler() {
		
		CLIENT.removeEvent("remoteFile", openRemoteFile)
		CLIENT.removeEvent("remotePipe", remotePipeData);
		
		EDITOR.removeEvent("beforeSave", remoteFileSaved);
		EDITOR.removeEvent("fileClose", remoteFileClosed);
		EDITOR.removeEvent("fileOpen", oldPipeFileOpenedMaybe);
		
	EDITOR.unbindKey(sendPipeData);// Event is only added when a pipe is opened (want to be careful not to slow down key presses)
		
	}
	
	function isPipe(file) {
		var fileExtension = UTIL.getFileExtension(file.path);
		var matchPipe = fileExtension.match(/^pipe(\d*)/)
		if(matchPipe) {
			//console.log("remote_file: matchPipe=" + JSON.stringify(matchPipe));
			return parseInt(matchPipe[1]);
		}
		else return 0;
	}
	
	function oldPipeFileOpenedMaybe(file) {
		
		var id = isPipe(file);
		
		if(id && id != pipeCounter) {
			// It's an old pipe file. Make sure its not going to get reused
			pipeCounter = Math.max(pipeCounter, id+1);
		}
	}
	
	function remotePipeData(remotePipe) {
		
		console.log("remote_file: remotePipeData: remotePipe=" + JSON.stringify(remotePipe));
		
		if(remotePipe.start) {
			// Do not use the same is as the socket id to prevent reusing old files
			pipeCounter++;
			socketId[pipeCounter] = remotePipe.id
		}
		
		if(remotePipe.end) {
			console.log("remote_file: Remote pipe " + remotePipe.id + " ended!");
return;
		}
		
		var host = remotePipe.host;
		var fileName = host + ".pipe" + pipeCounter;
		
		// EDITOR.openFile is async even if the content is supplied to it
		if(EDITOR.openFileQueue.indexOf(fileName) != -1) {
			// The pipe file is about the be opened, meanwhile buffer
			if(remotePipe.content != undefined) pipeBuffer += remotePipe.content;
			console.log("remote_file: Waiting for " + fileName + " to be opened ...");
			
return;
		}
		
		var file = EDITOR.files[fileName];
		
		if(file) {
			if(remotePipe.content != undefined) {
			file.write(remotePipe.content);
			EDITOR.renderNeeded();
			}
		}
		else {
			if(remotePipe.content != undefined) pipeBuffer += remotePipe.content;
			console.log("remote_file: Opening " + fileName + " ...");
			EDITOR.openFile(fileName, "", function(err, file) {
				file.write(pipeBuffer);
				pipeBuffer = "";
				EDITOR.renderNeeded();
				
				
				if( !EDITOR.getKeyFor(sendPipeData) ) {
					console.log("remote_file: Binding Enter key to sendPipeData");
					EDITOR.bindKey({desc: "Send the row through remote pipe", charCode: 13, fun: sendPipeData});
				}
			});
		}
	}
	
	function sendPipeData(file) {
		// User pressed Enter
		
		
		var localPipeId = isPipe(file);
		console.log("remote_file: Pressed Enter! localPipeId=" + localPipeId);
		if(localPipeId) {
			CLIENT.cmd("remotePipe", {id: socketId[localPipeId], content: file.rowText(file.caret.row-1)}, function(err) {
				if(err) console.warn("remote_file: Remote pipe socket error: " + err.message);
			});
		}
		
		return ALLOW_DEFAULT;
	}
	
	function openRemoteFile(json) {
		
		console.log( "remote_file: openRemoteFile: json=" + JSON.stringify(json, null, 2) );
		
		var url = "remote://" + json.host + (json.fileName.indexOf("/") == 0 ? "" : "/") + json.fileName;
		
		EDITOR.openFile(url, json.content, {savedAs: true, isSaved: true}, function(err, file) {
			if(err) throw err;
			
			remoteFiles.push(file);
		});
	}
	
	function remoteFileSaved(file) {
		
		console.log( "remote_file: remoteFileSaved: file.path=" + file.path );
		
		console.log( "remote_file: remoteFileSaved: remoteFiles=" + JSON.stringify(remoteFiles.map(mapPath)) );
		
		if(remoteFiles.indexOf(file) != -1) {
			
			var fileName = UTIL.getPathFromUrl(file.path);
			
			CLIENT.cmd("remoteFile", {name: fileName, content: file.text}, function(err) {
				if(err) alertBox("Failed to save remote file " + fileName + ".\nError: " + err.message);
				else {
					console.log( "remote_file: remoteFileSaved: Data sent to remote host!" );
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
		
		var localPipeId = isPipe(file);
		
		console.log( "remote_file: remoteFileClosed: file.path=" + file.path + " index=" + index + " remoteFiles=" + JSON.stringify(remoteFiles.map(mapPath)) + " localPipeId=" + localPipeId );
		
		if(localPipeId) {
			console.log( "remote_file: localPipeId=" + localPipeId + " server socketId=" + socketId[localPipeId] + " socketId=" + JSON.stringify(socketId));
			CLIENT.cmd("remotePipe", {id: socketId[localPipeId], close: true}, function(err) {
				if(err) console.warn("remote_file: Remote pipe socket error: " + err.message);
			});
			
			delete socketId[localPipeId];
			
			var activePipes = Object.keys(socketId);
			if(activePipes.length == 0) {
				console.log("remote_file: Unbinding Enter listener");
				EDITOR.unbindKey(sendPipeData);
			}
		}
		
		
		if(index != -1) {
			remoteFiles.splice(index, 1);
			
			var fileName = UTIL.getPathFromUrl(file.path);
			
			CLIENT.cmd("remoteFile", {name: fileName, close: true}, function(err) {
				if(err) console.warn("remote_file: Remote socket error: " + err.message);
		});
		}
		else if(file.path.indexOf("remote://") == 0) {
			console.warn("remote_file: Unknown remote file: " + file.path);
		}
	}
	
	function mapPath(file) {
		return file.path;
	}
	
})();
