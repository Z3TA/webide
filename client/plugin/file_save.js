"use strict";

(function() {
	
	"use strict";
	
	var fileInput;
	var callback;
	var saveDialog;
	var inputPath;
	var inputPathMinSize = 50;
	var menu;
	
	var mimeMap = {
		css: "text/css",
		html: "text/html",
		htm: "text/html",
		js: "application/x-javascript",
		svg: "image/svg+xml",
		txt: "text/plain",
		xml: "application/xml",
	}
	
	// Add plugin to editor
	EDITOR.plugin({
		desc: "Choose file path for saving files",
		load: loadFileSaver,
		unload: unloadFileSaver,
	});
	
	function loadFileSaver() {
		// Called when the module is loaded
		
		var char_S = 83;
		var charEscape = 27;
		var charEnter = 13;
		
		// Bind to ctrl + S
		EDITOR.bindKey({desc: "Save current file", charCode: char_S, combo: CTRL, fun: saveCurrentFile});
		
		EDITOR.bindKey({desc: "Hide save as dialog", fun: hideSaveDialog, charCode: charEscape, combo: 0});
		
		EDITOR.bindKey({desc: "Save the file with the path in dialog", fun: enter, charCode: charEnter, combo: 0});
		
		// Add items to the canvas context meny
		menu = EDITOR.addMenuItem("Save as ...", saveAs);
		
		EDITOR.on("showMenu", showSaveOption);
		
		
	}
	
	function unloadFileSaver() {
		// Cleaning up, for example when disabling a plugin
		
		EDITOR.unbindKey(saveCurrentFile);
		EDITOR.unbindKey(hideSaveDialog);
		EDITOR.unbindKey(enter);
		
		EDITOR.removeMenuItem(menu);
		
		EDITOR.removeEvent("showMenu", showSaveOption);
		
		hideSaveDialog();
	}
	
	function buildSaveDialog() {
		
		console.log("Building save dialog");
		
		var footer = document.getElementById("footer");
		
		saveDialog = document.createElement("form");
		saveDialog.onsubmit = saveFileInPath;
		
		inputPath = document.createElement("input");
		inputPath.setAttribute("type", "text");
		inputPath.setAttribute("class", "input text path");
		inputPath.setAttribute("size", Math.max(inputPathMinSize, EDITOR.workingDirectory.length)); // Update in show()
		
		var labelPath = document.createElement("label");
		labelPath.setAttribute("for", "inputPath");
		labelPath.appendChild(document.createTextNode("Save file path:")); // Language settings!?
		labelPath.appendChild(inputPath);
		saveDialog.appendChild(labelPath);
		
		var buttonSaveAs = document.createElement("input");
		buttonSaveAs.setAttribute("type", "submit");
		buttonSaveAs.setAttribute("class", "button");
		buttonSaveAs.setAttribute("value", "Save current file as");
		saveDialog.appendChild(buttonSaveAs);
		//buttonSaveAs.addEventListener("click", saveFileInPath, false);
		
		if(RUNTIME == "browser") {
			var buttonDownload = document.createElement("input");
			buttonDownload.setAttribute("type", "button");
			buttonDownload.setAttribute("class", "button");
			buttonDownload.setAttribute("value", "Download file");
			saveDialog.appendChild(buttonDownload);
			buttonDownload.addEventListener("click", function clickDownload() {
			
				var name =  UTIL.getFilenameFromPath(inputPath.value);
				
				downloadFile(EDITOR.currentFile, name)
				
			}, false);
		}
		else {
			var buttonBrowse = document.createElement("input");
			buttonBrowse.setAttribute("type", "button");
			buttonBrowse.setAttribute("class", "button half");
			buttonBrowse.setAttribute("value", "Browse local file-system");
			saveDialog.appendChild(buttonBrowse);
			buttonBrowse.addEventListener("click", browsePath, false);
		}
		
		var cancel = document.createElement("button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel"
		cancel.addEventListener("click", function cancel() {
			hideSaveDialog();
		}, false);
		saveDialog.appendChild(cancel);
		
		
		footer.appendChild(saveDialog);
		
		
		// todo: inputPath.keyUp, if it's not a slash, auto suggest the path by checking existing paths
		// Or just make a better file dialog, like the native one, but with support for remote paths!!?
		
	}
	
	function downloadFile(file, name) {
		
		if(!file) throw new Error("No file to download!");
		
		var fileName = UTIL.getFilenameFromPath(file.path);
		var fileExtension = UTIL.getFileExtension(file.path);
			
		if(!name) name = fileName;
		
		var mime = "text/plain";
		
		if(mimeMap.hasOwnProperty(fileExtension)) mime = mimeMap[fileExtension];
		
			var a = document.createElement('a');
		a.download = name;
		a.href = "data:" + mime + ";base64," + btoa(file.text);
			
			document.body.appendChild(a); // In some browsers we need to append the link in order to click it
			a.click();
			document.body.removeChild(a);
			
		}
	
	function saveFileInPath() {
		var file = EDITOR.currentFile;
		
		if(!file) {
			alert("Can not save without a file!")
			return false;
		}
		
		if(!inputPath) throw new Error("Is the save dialog visible?");
		
		EDITOR.checkPath(inputPath.value, "Do not save the file", save);
		
		return false;
		
		function save(err, path) {
			if(err && err.code != "CANCEL") return alertBox(err.message);
			else if(!err) EDITOR.saveFile(file, path, function fileSaved(err, path) {
				if(err) {
					// Most likely cause is that the folder does not exist!
					
					//if(err.code == "ENOENT") alertBox("The file was <b>not saved</b> because the folder does not exist: " + inputPath.value);
					
					if(err.code == "CANCEL") return console.warn("The save was canceled: " + err.message);
					
					alertBox("<b>The file was NOT saved!</b>\n\n" + err.message, "warning");
					}
				});
			
			hideSaveDialog();
		}
	}
	
	
	
	function browsePath() {
		var defaultPath = "";
		
		if(EDITOR.currentFile.path.match(/\/|\\/)) defaultPath = EDITOR.currentFile.path
		else defaultPath = EDITOR.workingDirectory;
		
		//alertBox(defaultPath);
		
		EDITOR.fileSaveDialog(defaultPath, function(path) {
			
			if(path) {
				// Save the file right away
				EDITOR.saveFile(EDITOR.currentFile, path);
				
				hideSaveDialog();
				
			}
			// else: user clicked cancel!?
			
		});
	}
	
	
	function showSaveDialog() {
		
		console.log("Showing save dialog");
		
		if(!saveDialog) buildSaveDialog();
		
		inputPath.setAttribute("size", Math.max(inputPathMinSize, inputPath.value + 5, EDITOR.workingDirectory.length));
		
		//saveDialog.style.display = "block";
		
		var footer = document.getElementById("footer");
		if(!footer.contains(saveDialog)) footer.appendChild(saveDialog);
		
		EDITOR.input = false;
		inputPath.focus();
		
		EDITOR.resizeNeeded();
		
		console.log("After showing save dialog: EDITOR.input=" + EDITOR.input);
		
		return false;
	}
	
	function hideSaveDialog() {
		// Bring back focus to the current file
		if(EDITOR.currentFile) {
			EDITOR.input = true;
		}
		
		if(saveDialog) {
			
			var footer = document.getElementById("footer");
			if(footer.contains(saveDialog)) footer.removeChild(saveDialog);
			
			//saveDialog.style.display = "none";
			
			EDITOR.resizeNeeded();
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
		
		var file = EDITOR.currentFile;
		var defaultPath;
		
		if(!file) throw new Error("No file open!?");
		
		EDITOR.hideMenu(); // This will bring focus to the editor input
		
		showSaveDialog();
		
		
		var path = "";
		
		if(file.savedAs) path = file.path;
		// Why use the lastFile.path !?
		// else if(EDITOR.lastFile) path = UTIL.getDirectoryFromPath(EDITOR.lastFile.path);
		else if(file.path.charAt(0) == "/" || file.path.indexOf("\\") != -1) path = file.path;
		else path = EDITOR.workingDirectory + file.path;
		
		inputPath.value = path;
		
		var size = Math.max(inputPathMinSize, inputPath.value.length + 10)
		
		console.log("size=" + size);
		console.log("inputPathMinSize=" + inputPathMinSize);
		console.log("inputPath.value.length=" + inputPath.value.length);
		
		inputPath.setAttribute("size", size);
		
	}
	
	
	function saveCurrentFile(file, combo, character, charCode, direction) {
		
		EDITOR.hideMenu();
		
		if(file.savedAs === false || combo.sum == CTRL + SHIFT) {
			saveAs();
		}
		else {
			EDITOR.saveFile(file);
		}
		
		return false;
		
	}
	
	function showSaveOption(file, x, y, ev) {
		if(!file) return true;
		if(file.isSaved) return true;
		if(!file.savedAs) return true;
		
		EDITOR.addTempMenuItem("Save file", saveCurrentFile);
		
	}
	
})();


