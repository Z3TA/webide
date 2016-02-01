
(function() {
	
	"use strict";
	
	window.addEventListener("load", main, false);

	var fileInput;
		
	
	function main() {
		
		// Bind to ctrl + O
		global.keyBindings.push({charCode: 79, combo: CTRL, fun: openFile});

		// Add items to the canvas context meny
		editor.addMenuItem("Open file (Ctrl+O)", openFile);
		
	}

	function openFile() {
		
		editor.hideMenu();
		
		console.log("Opening file ...");
		
		var defaultPath = "";
		var file = global.currentFile;
		
		if(file) {
			// Check if the cursor is on a file path
			
			var startIndex = file.grid[file.caret.row].startIndex;
			var endIndex = (file.grid.length-1 > file.caret.row ? file.grid[file.caret.row+1].startIndex : file.text.length) - file.lineBreak.length;
			var filePath = file.text.substring(startIndex, endIndex).trim(); //substring: second argument: Index
			var isFilePath = false;
			
			try {
				var stat = fs.lstatSync(filePath);
				isFilePath = stat.isFile();
			}
			catch(e) {
				//console.log(e);
			}
			
			if(isFilePath) {
				// The text on the row is a file path! Open that file.
				var content = editor.readFileSync(filePath);
				
				editor.openFile(filePath, content, function(file) {  // path, content, callback
				
					// Mark the file as saved, because we just opened it
					file.isSaved = true;
					file.savedAs = true;
					file.changed = false;
					
					global.render = true;
					editor.render();
					
				});
				
				return false; // Exit function, and prevent default browser action
				
			}
		
		
			// Change default directory to the same as current file
			defaultPath = editor.getDir(global.currentFile.path);

		
		}
		
		console.log("Telling the editor to open the file dialog window ...");
		editor.fileOpenDialog(defaultPath, function(filePath, content) {
			
			console.log("File was selected from file dialog: " + filePath + "\nTelling the editor to open it up for editing ...")
			
			editor.openFile(filePath, content, function(file) {  // path, content, callback
			
				// Mark the file as saved, because we just opened it
				file.isSaved = true;
				file.savedAs = true;
				file.changed = false;
				
				global.render = true;
				editor.render();
				console.log("File ready for editing");
				
			});
		});
		
		return false; // Prevent default
	}
	

	
	
})();