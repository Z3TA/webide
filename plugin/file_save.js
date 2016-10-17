"use strict";

(function() {
	
	"use strict";
	
	var fileInput;
	var callback;
	var saveDialog;
	var inputPath;
	var inputPathMinSize = 50;
	var menu;
	
	// Add plugin to editor
	editor.plugin({
		desc: "Choose file path for saving files",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		
		var char_S = 83;
		var charEscape = 27;
		var charEnter = 13;
		
		// Bind to ctrl + S
		editor.bindKey({desc: "Save current file", charCode: char_S, combo: CTRL, fun: saveCurrentFile});
		
		editor.bindKey({desc: "Hide save as dialog", fun: hideSaveDialog, charCode: charEscape, combo: 0});
		
		editor.bindKey({desc: "Save the file with the path in dialog", fun: enter, charCode: charEnter, combo: 0});
		
		// Add items to the canvas context meny
		menu = editor.addMenuItem("Save as ...", saveAs);
		
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
		
		editor.unbindKey(saveCurrentFile);
		editor.unbindKey(hideSaveDialog);
		editor.unbindKey(enter);
		
		editor.removeMenuItem(menu);
		
		hideSaveDialog();
	}
	
	
	
	function buildSaveDialog() {
		
		console.log("Building save dialog");
		
		var footer = document.getElementById("footer");
		
		saveDialog = document.createElement("div");
		
		inputPath = document.createElement("input");
		inputPath.setAttribute("type", "text");
		inputPath.setAttribute("class", "input text path");
		inputPath.setAttribute("size", Math.max(inputPathMinSize, editor.workingDirectory.length)); // Update in show()
		
		var labelPath = document.createElement("label");
		labelPath.setAttribute("for", "inputPath");
		labelPath.appendChild(document.createTextNode("Path:")); // Language settings!?
		labelPath.appendChild(inputPath);
		
		var buttonSaveAs = document.createElement("input");
		buttonSaveAs.setAttribute("type", "button");
		buttonSaveAs.setAttribute("class", "button");
		buttonSaveAs.setAttribute("value", "Save as");
		
		var buttonBrowse = document.createElement("input");
		buttonBrowse.setAttribute("type", "button");
		buttonBrowse.setAttribute("class", "button half");
		buttonBrowse.setAttribute("value", "Browse local file-system");
		
		
		
		saveDialog.appendChild(labelPath);
		saveDialog.appendChild(buttonSaveAs);
		saveDialog.appendChild(buttonBrowse);
		
		footer.appendChild(saveDialog);
		
		// Events
		buttonBrowse.addEventListener("click", browsePath, false);
		
		buttonSaveAs.addEventListener("click", saveFileInPath, false);
		
		// todo: inputPath.keyUp, if it's not a slash, auto suggest the path by checking existing paths
		// Or just make a better file dialog, like the native one, but with support for remote paths!!?
		
	}
	
	function saveFileInPath() {
		var file = editor.currentFile;
		
		if(!file) {
			alert("Can not save without a file!")
			return;
		}
		
		if(!inputPath) throw new Error("Is the save dialog visible?");
		
		editor.saveFile(file, inputPath.value, function fileSaved(err, path) {
			if(err) {
				// Most likely cause is that the folder does not exist!
				
				if(err.code == "ENOENT") alertBox("The file was <b>not saved</b> because the folder does not exist: " + inputPath.value);
				else alertBox("<b>The file was NOT saved!</b>\n\n" + err.message, "warning");
				
			}
		});
		
		hideSaveDialog();
		
	}
	
	
	
	function browsePath() {
		var defaultPath = "";
		
		if(editor.currentFile.path.match(/\/|\\/)) defaultPath = editor.currentFile.path
		else defaultPath = editor.workingDirectory;
		
		//alertBox(defaultPath);
		
		editor.fileSaveDialog(defaultPath, function(path) {
			
			if(path) {
				// Save the file right away
				editor.saveFile(editor.currentFile, path);
				
				hideSaveDialog();
				
				}
			// else: user clicked cancel!?
			
		});
	}
	
	
	function showSaveDialog() {
		
		console.log("Showing save dialog");
		
		if(!saveDialog) buildSaveDialog();
		
		inputPath.setAttribute("size", Math.max(inputPathMinSize, inputPath.value + 5, editor.workingDirectory.length));
		
		saveDialog.style.display = "block";
		
		editor.input = false;
		inputPath.focus();
		
		editor.resizeNeeded();
		
		return false;
		}
			
	function hideSaveDialog() {
		// Bring back focus to the current file
		if(editor.currentFile) {
			editor.input = true;
		}
		
		if(saveDialog) {
			saveDialog.style.display = "none";
			editor.resizeNeeded();
		}
		
		return false;
		
	}
	
	function enter() {
		// Only save if the inputPath input text is focused
		if(document.activeElement == inputPath) {
			saveFileInPath();
			return false;
		}
		else return true;
	}
	
	
	function saveAs(e) {
		
		var file = editor.currentFile;
		var defaultPath;
		
		if(!file) throw new Error("No file open!?");
		
		editor.hideMenu(); // This will bring focus to the editor input
		
		showSaveDialog();
		
		// Set default path:
		if(file.savedAs) {
			inputPath.value = file.path;
		}
		else {
			inputPath.value = editor.workingDirectory;
		}
		
		// Check the input and att a slash
		var lastCharOfPath = inputPath.value.substring(inputPath.value.length-1);
		if(inputPath.value.indexOf("\\") && lastCharOfPath != "\\") inputPath.value += "\\"
		else if(inputPath.value.indexOf("/") && lastCharOfPath != "/") inputPath.value += "/";
		
		var size = Math.max(inputPathMinSize, inputPath.value.length + 10)
		
		console.log("size=" + size);
		console.log("inputPathMinSize=" + inputPathMinSize);
		console.log("inputPath.value.length=" + inputPath.value.length);
		
		inputPath.setAttribute("size", size);
		
	}
	
	
	function saveCurrentFile(file, combo, character, charCode, direction) {
		
		if(file.savedAs === false || combo.sum == CTRL + SHIFT) {
			saveAs();
		}
		else {
			editor.saveFile(file);
		}
		
		return false;
		
	}
	
})();


