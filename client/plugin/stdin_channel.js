
(function() {
	"use strict";

	var stdinFilePath = "stdin";
	var stdinFile;
	var stdinBuffer = "";
	var watchFiles = [];
	
	EDITOR.plugin({
		desc: "Listen for stdin messages",
		load: function() {
			
			CLIENT.on("stdin", stdinPrint);
			CLIENT.on("arguments", editorArguments);
			

			EDITOR.on("fileClose", stdinChannelFileClose);
			EDITOR.on("afterSave", stdinChannelAfterSave);



			console.log("stdin channel module loaded!");
			
		},
		unload: function() {
			CLIENT.removeEvent("stdin", stdinPrint);
			CLIENT.removeEvent("arguments", editorArguments);
			
			EDITOR.removeEvent("fileClose", stdinChannelFileClose);
			EDITOR.removeEvent("afterSave", stdinChannelAfterSave);

			if(stdinFile) EDITOR.closeFile(stdinFilePath);
			
		},
	});
	
	function stdinChannelFileClose(file) {
		if(watchFiles.indexOf(file.path) != -1) notofyEdit(file.path);
	}

	function stdinChannelAfterSave(file) {

	}

	function notofyEdit(path) {
		CLIENT.cmd("stdout", {data: path});
		watchFiles.splice(watchFiles.indexOf(path));
	}

	function editorArguments(str) {
		// Usually a file path
		var filePath = str;
		stdinFilePath = filePath; // This file will also serve as stdin file (if we get data from stdin)
		stdinFile = null; // This is the *new* stdin-file!

		EDITOR.openFile(filePath, undefined, function(err, file) {
			/*
				We want to tell the stdin channel when this file is closed!
			*/
			if(err) {
				if(err.code == "ENOENT") {
					EDITOR.openFile(filePath, "", function(err, file) {
						if(err) throw err;
						else fileOpened(file);
					});
				}
				else alertBox("Failed to open (code=" + err.code + ") " + filePath + "\n" + err.message);
			}
			else {
				fileOpened(file);
			}
		});
	}

	function fileOpened(file) {
		console.log("File specified in arguments opened: " + file.path)
		// Other files might open and take away focus...
		setTimeout(function() {	EDITOR.showFile(file); }, 500);
		setTimeout(function() {	EDITOR.showFile(file); }, 1000);
		setTimeout(function() {	EDITOR.showFile(file); }, 1500);
		setTimeout(function() {	EDITOR.showFile(file); }, 2000);

		watchFiles.push(file.path);

		// ALways make the latest file opened in arguments the stdin-file 
		if(!stdinFile) stdinFileOpened(null, file);

	}
	
	function stdinPrint(str) {
		
		console.log("stdinPrint: str=" + str);
		
		if(stdinFile) {
			stdinFile.write(str);
			return;
		}
		else console.log("No stdinFile available")
		
		if(EDITOR.openFileQueue.indexOf(stdinFilePath) == -1) {
			console.log("Opening stdinFile ...");
			EDITOR.openFile(stdinFilePath, "", stdinFileOpened);
		}
		
		stdinBuffer += str;
		
	}
	
	function stdinFileOpened(err, file) {
		console.log("stdinFile opened! file==stdinFile?" + (file == stdinFile));
		if(err) throw err;
		stdinFile = file;
		if(stdinBuffer) stdinFile.write(stdinBuffer);
		stdinBuffer = "";
	}
	
	
})();

