(function() {
	
	/*
		
		Some functionality is dublicated with stdin_channel.js plugin!
		The main difference is that remote_file.js work with bin/webider and stdin_channel.js work with bin/webide
		
		bin/webide is for running locally, and bin/webider should run remotely.
		
		How to test (using cloud ide)
		-----------------------------
		Open a terminal, start server:
		node server/server.js --port=/home/$(whoami)/sock/test --domain=test.$(whoami).webide.se --username=test --password=test123 --home=/home/ --tls_key=/etc/letsencrypt/live/johan.webide.se/privkey.pem --tls_cert=/etc/letsencrypt/live/johan.webide.se/fullchain.pem

		open test.user.webide.se in other browser/tab

		open a new terminal, run webider:
		./bin/webider test.js -h test.johan.webide.se -p 8103 -u test -ip 10.0.4.145 -debug



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
		
		//console.log("remote_file: remotePipeData: remotePipe=" + JSON.stringify(remotePipe));
		
		if(remotePipe.start) {
			// Do not use the same is as the socket id to prevent reusing old files
			pipeCounter++;
			socketId[pipeCounter] = remotePipe.id
		}
		
		if(remotePipe.end) {
			//console.log("remote_file: Remote pipe " + remotePipe.id + " ended!");
return;
		}
		
		var host = remotePipe.host;
		var fileName = host + ".pipe" + pipeCounter;
		
		// EDITOR.openFile is async even if the content is supplied to it
		if(EDITOR.openFileQueue.indexOf(fileName) != -1) {
			// The pipe file is about the be opened, meanwhile buffer
			if(remotePipe.content != undefined) pipeBuffer += remotePipe.content;
			//console.log("remote_file: Waiting for " + fileName + " to be opened ...");
			
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
			//console.log("remote_file: Opening " + fileName + " ...");
			EDITOR.openFile(fileName, "", function(err, file) {
				file.write(pipeBuffer);
				pipeBuffer = "";
				EDITOR.renderNeeded();
				
				
				if( !EDITOR.getKeyFor(sendPipeData) ) {
					//console.log("remote_file: Binding Enter key to sendPipeData");
					EDITOR.bindKey({desc: "Send the row through remote pipe", charCode: 13, fun: sendPipeData});
				}
			});
		}
	}
	
	function sendPipeData(file) {
		// User pressed Enter
		
		
		var localPipeId = isPipe(file);
		//console.log("remote_file: Pressed Enter! localPipeId=" + localPipeId);
		if(localPipeId) {
			CLIENT.cmd("remotePipe", {id: socketId[localPipeId], content: file.rowText(file.caret.row-1)}, function(err) {
				if(err) console.warn("remote_file: Remote pipe socket error: " + err.message);
			});
		}
		
		return ALLOW_DEFAULT;
	}
	
	function openRemoteFile(json) {
		
		//console.log( "remote_file: openRemoteFile: json=" + JSON.stringify(json, null, 2) );
		
		var hostname = json.host;

		if(hostname.length > 15) { // 111.222.333.444
			// shorten long hostname
			var dot = hostname.indexOf(".");
			if(dot < 4) dot = hostname.length; // It's probably an IP address so keep it as is !?!?
			hostname = hostname.slice(0, dot); // Cut off the domain at the first dot so that for example kaj.100m.se will be hostname=kaj
		}

		var url = "remote://" + hostname + (json.fileName.indexOf("/") == 0 ? "" : "/") + json.fileName;
		
		if(json.content.type == "Buffer") {
			var utf8decoder = new TextDecoder(); // default 'utf-8' or 'utf8'

			var arr = json.content.data;
			var u8arr = new Uint8Array(arr);
			/*
				var i8arr = new Int8Array(arr);
				var u16arr = new Uint16Array(arr);
				var i16arr = new Int16Array(arr);
				var i32arr = new Int32Array(arr);

				console.log("u8arr=" + utf8decoder.decode(u8arr));
				console.log("i8arr= " + utf8decoder.decode(i8arr));
				console.log("u16arr=" + utf8decoder.decode(u16arr));
				console.log("i16arr=" + utf8decoder.decode(i16arr));
				console.log("i32arr=" + utf8decoder.decode(i32arr));
			*/
			
			// Assuming Node.JS would have used a u8arr

			var text = utf8decoder.decode(u8arr);
		}
		else {
			var text = json.content;
		}

		UTIL.hash(text, function (err, hash) {

			for(var path in EDITOR.files) {
				if(path == url) {
					// File is already open
					// Check if the base is the same
					console.log("EDITOR.files[" + path + "].hash=" + EDITOR.files[path].hash);
					console.log("hash=" + hash);

					if(EDITOR.files[path].hash == hash) {
						// We can continue editing it, because it's the same
						EDITOR.showFile(url);
						return;
					}
					else {
						// Reopened, source changed!
						alertBox("The source has changed. Backup this file if needed. Then close it. And run webider again");
					}
				}
			}

			EDITOR.openFile(url, text, {savedAs: true, isSaved: true, props: {hash: hash}}, function(err, file) {
				if(err) throw err;

				remoteFiles.push(file);
			});

		});

		
	}
	
	function remoteFileSaved(file) {
		
		//console.log( "remote_file: remoteFileSaved: file.path=" + file.path );
		
		//console.log( "remote_file: remoteFileSaved: remoteFiles=" + JSON.stringify(remoteFiles.map(mapPath)) );
		
		if(remoteFiles.indexOf(file) != -1) {
			
			var fileName = UTIL.getPathFromUrl(file.path);
			
			CLIENT.cmd("remoteFile", {name: fileName, content: file.text}, function(err) {
				if(err) alertBox("Failed to save remote file " + fileName + ".\nError: " + err.message);
				else {
					//console.log( "remote_file: remoteFileSaved: Data sent to remote host!" );
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
		
		//console.log( "remote_file: remoteFileClosed: file.path=" + file.path + " index=" + index + " remoteFiles=" + JSON.stringify(remoteFiles.map(mapPath)) + " localPipeId=" + localPipeId );
		
		if(localPipeId) {
			//console.log( "remote_file: localPipeId=" + localPipeId + " server socketId=" + socketId[localPipeId] + " socketId=" + JSON.stringify(socketId));
			CLIENT.cmd("remotePipe", {id: socketId[localPipeId], close: true}, function(err) {
				if(err) console.warn("remote_file: Remote pipe socket error: " + err.message);
			});
			
			delete socketId[localPipeId];
			
			var activePipes = Object.keys(socketId);
			if(activePipes.length == 0) {
				//console.log("remote_file: Unbinding Enter listener");
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
