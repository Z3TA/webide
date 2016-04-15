
(function() {
	
	"use strict";
	
	window.addEventListener("load", main, false);

	var fileInput;
		
	
	function main() {
		
		// Bind to ctrl + O
		editor.keyBindings.push({charCode: 79, combo: CTRL, fun: openFile});

		// Add items to the canvas context meny
		editor.addMenuItem("Open file (Ctrl+O)", openFile);
		
	}

	function openFile() {
		
		editor.hideMenu();
		
		console.log("Opening file ...");
		
		var defaultPath = "";
		var file = editor.currentFile;
		
		if(file) {
			// Check if the cursor is on a file path
			
			var startIndex = file.grid[file.caret.row].startIndex;
			var endIndex = (file.grid.length-1 > file.caret.row ? file.grid[file.caret.row+1].startIndex : file.text.length) - file.lineBreak.length;
			var filePath = file.text.substring(startIndex, endIndex).trim(); //substring: second argument: Index
			
			if(isFilePath(filePath)) {
				// The text on the row is a file path! Open that file.
				var content = editor.readFileSync(filePath);
				
				editor.openFile(filePath, content, function(file) {  // path, content, callback
				
					// Mark the file as saved, because we just opened it
					file.isSaved = true;
					file.savedAs = true;
					file.changed = false;
					
					editor.renderNeeded();
					//editor.render(); // It will be black!? if we render right away!
					
				});
				
				return false; // Exit function, and prevent default browser action
				
			}
		
		
			// Change default directory to the same as current file
			defaultPath = getDir(editor.currentFile.path);

		
		}
		else {
			// No current file opened. Use working dir!?
			//defaultPath = editor.workingDirectory;
		}
		
		console.log("Telling the editor to open the file dialog window ...");
		editor.fileOpenDialog(defaultPath, function after_dialog_open_file(filePath, content) {
			
			console.log("File was selected from file dialog: " + filePath + "\nTelling the editor to open it up for editing ...")
			
			editor.openFile(filePath, content, function after_open_file(file, err) {  // path, content, callback
			
				if(err) throw err;
			
				// Mark the file as saved, because we just opened it
				file.isSaved = true;
				file.savedAs = true;
				file.changed = false;
				
				editor.renderNeeded();
				editor.render();
				console.log("File ready for editing");
				
			});
		});
		
		return false; // Prevent default
	}
	

	
	
})();