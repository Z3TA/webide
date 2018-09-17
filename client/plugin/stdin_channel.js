/*


Test in bash:
cd path/to/jzedit/bin
counter=0;while true; do echo hi $counter; counter=$((counter+1)); sleep 2; done | ./jzedit hi.txt

*/


(function() {
	"use strict";

	var stdinFilePath = "stdin";
	var stdinFile;
	var stdinBuffer = "";
	var watchFiles = [];
	var wrongStdinFileCount = 0;

	EDITOR.plugin({
		desc: "Listen for stdin messages",
		load: loadStdinChannelPlugin,
		unload: unloadStdinChannelPlugin,
	});


	function loadStdinChannelPlugin() {
		CLIENT.on("stdin", stdinPrint);
		CLIENT.on("arguments", editorArguments);
		
		EDITOR.on("fileClose", stdinChannelFileClose);
		//EDITOR.on("afterSave", stdinChannelAfterSave);

		console.log("stdin channel module loaded!");
	}

	function unloadStdinChannelPlugin() {
		// When the editor is reloaded or closed
		
		CLIENT.removeEvent("stdin", stdinPrint);
		CLIENT.removeEvent("arguments", editorArguments);
		
		EDITOR.removeEvent("fileClose", stdinChannelFileClose);
		//EDITOR.removeEvent("afterSave", stdinChannelAfterSave);

		if(stdinFile) {
			notofyEdit(stdinFile.path);
			stdinFile = null;
		}
	}
	
	
	function stdinChannelFileClose(file) {
		if(watchFiles.indexOf(file.path) != -1) notofyEdit(file.path);
	}

	function stdinChannelAfterSave(file) {
		return true;
	}

	function notofyEdit(path) {
		CLIENT.cmd("stdout", {data: path});
		watchFiles.splice(watchFiles.indexOf(path));
	}

	function editorArguments(str) {
		// Usually a file path
		var filePath = str;
		stdinFilePath = filePath; // This file will also serve as stdin file (if we get data from stdin)
		stdinFile = null; // filePath is the *new* stdin-file!
		console.log("Set stdinFilePath to " + stdinFilePath);

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
		
		if(stdinFile && stdinFile.path != stdinFilePath) {
			console.log("Changing stdinFile from " + stdinFile.path + " to " + stdinFilePath);
			stdinFile = null;
			EDITOR.openFile(stdinFilePath, undefined, stdinFileOpened);
		}
		else if(stdinFile) {
			console.log("stdinFile.path=" + stdinFile.path + " stdinFilePath=" + stdinFilePath);
			stdinFile.write(str);
			EDITOR.renderNeeded();
			return;
		}
		else console.log("No stdinFile available")
		
		stdinBuffer += str;

		if(EDITOR.openFileQueue.indexOf(stdinFilePath) != -1) return;


		// Don't open the stdin file right away, we might get "arguments".
		setTimeout(function() {
			if(EDITOR.openFileQueue.indexOf(stdinFilePath) != -1) return;
			console.log("Opening stdinFile ...");
			EDITOR.openFile(stdinFilePath, "", stdinFileOpened);
		}, 100);

		
	}
	
	function stdinFileOpened(err, file) {
		if(err) throw err;

		console.log("stdinFile opened! file==stdinFile?" + (file == stdinFile) + " path=" + file.path);
		
		if(file.path != stdinFilePath) {
			console.warn("Wrong stdinFile opened! file.path=" + file.path + " stdinFilePath=" + stdinFilePath + "\n");
			wrongStdinFileCount++;
			if(wrongStdinFileCount > 3) {
				// Avoid opening too many files
				unloadStdinChannelPlugin();
				throw new Error("Wrong stdinFile to many times (" + wrongStdinFileCount + ")! file.path=" + file.path + " stdinFilePath=" + stdinFilePath + "");
			}
			return;
		}

		stdinFile = file;
		stdinFilePath = file.path; // The path might have changed eg stdin(1)


		if(stdinBuffer.length > 0) {
			stdinFile.write(stdinBuffer);
			stdinBuffer = "";
			EDITOR.renderNeeded();
		}
	}
	
	
})();

