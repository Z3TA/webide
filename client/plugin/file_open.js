
(function() {
	
	"use strict";
	
	var fileInput;
	var menu;
	
	EDITOR.plugin({
		desc: "Open local file dialog",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Bind to ctrl + O
		EDITOR.bindKey({desc: "Open a local file using native file select dialog", charCode: 79, combo: CTRL + SHIFT, fun: openFile});
		
		// Add items to the canvas context meny
		menu = EDITOR.addMenuItem("Open local file ...", openFile);
		
		EDITOR.on("openFileTool", openLocalFileTool);
		
	}
	
	function unload() {
		EDITOR.unbindKey(openFile);
		
		EDITOR.removeMenuItem(menu);
		
		EDITOR.removeEvent("openFileTool", openLocalFileTool);
		
	}
	
	function openFile() {
		
		EDITOR.hideMenu();
		
		console.log("Opening file ...");
		
		var defaultPath = "";
		var file = EDITOR.currentFile;
		
		if(file) {
			// Check if the cursor is on a file path
			
			var startIndex = file.grid[file.caret.row].startIndex;
			var endIndex = (file.grid.length-1 > file.caret.row ? file.grid[file.caret.row+1].startIndex : file.text.length) - file.lineBreak.length;
			var filePath = file.text.substring(startIndex, endIndex).trim(); //substring: second argument: Index
			
			if(UTIL.isFilePath(filePath)) {
				// The text on the row is a file path! Open that file.
				
				EDITOR.openFile(filePath, undefined, function(err, file) {  // path, content, callback
					
					if(err) {
						alert(err.message);
						return;
}
					
					// Mark the file as saved, because we just opened it
					file.isSaved = true;
					file.savedAs = true;
					file.changed = false;
					
					EDITOR.renderNeeded();
					//EDITOR.render(); // It will be black!? if we render right away!
					
				});
				
				return false; // Exit function, and prevent default browser action
				
			}
		
		// Change default directory to the same as current file
			
			if(file.path.indexOf(EDITOR.workingDirectory) != -1) defaultPath = EDITOR.workingDirectory;
			else {
				var folders = getFolders(file.path);
				if(folders.length > 0) folders.pop(); // Use parent folder
				defaultPath = folders.pop();
				console.log("defaultPath=" + defaultPath);
			}
			
		}
		else {
			// No current file opened. Use working dir!?
			//defaultPath = EDITOR.workingDirectory;
		}
		
		//alertBox(defaultPath);
		// It doesn't seem we can set default path in Linux !
		
		openLocalFile(defaultPath);
		
		return false; // Prevent default
	}
	
	function openLocalFile(directory) {
		console.log("Telling the editor to open the file dialog window ...");
		EDITOR.localFileDialog(directory, function after_dialog_open_file(filePath, content) {
			
			//console.log("filePath=" + filePath);
			//console.log("content=" + content);
			
			console.log("File was selected from file dialog: " + filePath + "\nTelling the editor to open it up for editing ...")
			
			EDITOR.openFile(filePath, content, function after_open_file(err, file) {  // path, content, callback
				
				if(err) throw err;
				
				// Mark the file as saved, because we just opened it
				file.isSaved = true;
				file.savedAs = true;
				file.changed = false;
				
				EDITOR.renderNeeded();
				EDITOR.render();
				console.log("File ready for editing");
				
			});
		});
	}
	
	function openLocalFileTool(directory) {
		// Only answer on openFileTool events if we are running locally/"native"
		if(EDITOR.user != "admin") return false;
		
		openLocalFile(directory);
		
	}
	
})();