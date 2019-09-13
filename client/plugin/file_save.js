"use strict";

(function() {
	
	"use strict";
	
	var fileInput;
	var callback;
	var saveDialog;
	var inputPath;
	var inputPathMinSize = 50;
	var menu;
	var folderPicker;
	var suggestedFolderButtons = {};
	var windowMenuSave, windowMenuSaveAs;
	
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
		unload: unloadFileSaver
	});
	
	function loadFileSaver() {
		// Called when the module is loaded
		
		var char_S = 83;
		var charEscape = 27;
		var charEnter = 13;
		
		// Bind to ctrl + S
		EDITOR.bindKey({desc: "Save current file", charCode: char_S, combo: CTRL, fun: saveFileFromKeyboardCombo});
		
		EDITOR.bindKey({desc: "Hide save as dialog", fun: hideSaveDialog, charCode: charEscape, combo: 0});
		
		EDITOR.bindKey({desc: "Save the file with the path in dialog", fun: enter, charCode: charEnter, combo: 0});
		
		// Add items to the canvas context meny
		menu = EDITOR.ctxMenu.add("Save as ...", saveAs, 2);
		
		windowMenuSave = EDITOR.windowMenu.add("Save", ["File", 1], saveFileFromWindowMenu);
		windowMenuSaveAs = EDITOR.windowMenu.add("Save as", ["File", 2], saveAs);
		
		EDITOR.on("showMenu", showSaveOption);
		
		EDITOR.registerAltKey({char: "s", alt:2, label: "save", fun: saveFileFromVirtualKeyboard});
		
	}
	
	function unloadFileSaver() {
		// Cleaning up, for example when disabling a plugin
		
		EDITOR.unbindKey(saveFileFromKeyboardCombo);
		EDITOR.unbindKey(hideSaveDialog);
		EDITOR.unbindKey(enter);
		
		EDITOR.ctxMenu.remove(menu);
		
		EDITOR.windowMenu.remove(windowMenuSave);
		EDITOR.windowMenu.remove(windowMenuSaveAs);
		
		EDITOR.removeEvent("showMenu", showSaveOption);
		
		EDITOR.unregisterAltKey(saveFileFromVirtualKeyboard);
		
		hideSaveDialog();
	}
	
	function saveFileFromVirtualKeyboard(file, combo) {
		EDITOR.stat("saveFileFromVirtualKeyboard");
		return saveCurrentFile(file, combo);
	}
	
	function saveFileFromContextMenu(file, combo) {
		EDITOR.stat("saveFileFromContextMenu");
		EDITOR.ctxMenu.hide();
		return saveCurrentFile(file, combo);
	}
	
	function saveFileFromWindowMenu(file, combo) {
		EDITOR.stat("saveFileFromWindowMenu");
		windowMenuSave.hide();
		return saveCurrentFile(file, combo);
	}
	
	function saveFileFromKeyboardCombo(file, combo) {
		EDITOR.stat("saveFileFromKeyboardCombo");
		return saveCurrentFile(file, combo);
	}
	
	function setCaretPosition(elemId, caretPos) {
		var el = document.getElementById(elemId);
		
		el.value = el.value;
		// ^ this is used to not only get "focus", but
		// to make sure we don't have it everything -selected-
		// (it causes an issue in chrome, and having it doesn't hurt any other browser)
		
		if (el !== null) {
			
			if (el.createTextRange) {
				var range = el.createTextRange();
				range.move('character', caretPos);
				range.select();
				return true;
			}
			
			else {
				// (el.selectionStart === 0 added for Firefox bug)
				if (el.selectionStart || el.selectionStart === 0) {
					el.focus();
					el.setSelectionRange(caretPos, caretPos);
					return true;
				}
				
				else  { // fail city, fortunately this never happens (as far as I've tested) :)
					el.focus();
					return false;
				}
			}
		}
	}
	
	function pathKeyDown(keyDownEvent) {
		console.log("pathKeyDown: inputPath.value=" + inputPath.value);
		var keyTab = 9;
		// Autocomplete the path when pressing tab
		if(keyDownEvent.keyCode == keyTab) {
			var text = inputPath.value;
			if(text.length == 0) return ALLOW_DEFAULT;
			
			var caretPos = inputPath.selectionStart;
			
			if(caretPos != text.length) {
				var afterCaret = text.slice(caretPos);
				text = text.slice(0, caretPos);
				console.log("afterCaret=" + afterCaret);
				console.log("text=" + text);
			}
			
			EDITOR.autoCompletePath({path: text, onlyDirectories: true}, function(err, path) {
				if(err && err.code != "ENOENT") return alertBox(err.message);
				else if(!err && path != inputPath.value) {
					
					if(afterCaret) {
						inputPath.value = path + afterCaret;
						setCaretPosition("inputPath", path.length);
					}
					else inputPath.value = path;
					
					if(UTIL.isDirectory(path)) suggestFolders(path);
				}
			});
			keyDownEvent.preventDefault();
			return PREVENT_DEFAULT;
		}
		else return ALLOW_DEFAULT;
	}
	
	function pathKeyInput(inputEvent) {
		console.log("pathKeyInput: inputPath.value=" + inputPath.value);
		
		suggestFolders(inputPath.value);
		return ALLOW_DEFAULT;
	}
	
	var oldPath = "", currentPath = "", oldFolder = "", currentFolder = "";
	function suggestFolders(pathValue) {
		// Does the path match any of the path-pickers ?
		
		console.log("pathValue=" + pathValue);
		if(!pathValue) {
			console.warn("pathValue=" + pathValue);
			return;
		}
		
		oldPath = currentPath;
		currentPath = pathValue;
		
		if(oldPath == currentPath) return; // Path didn't change
		
		oldFolder = currentFolder;
		currentFolder = UTIL.getDirectoryFromPath(currentPath);
		
		var pathIsFolder = UTIL.isDirectory(pathValue);
		
		if(oldFolder != currentFolder) {
			// Folder did change!?
			var pathToFolder = currentFolder;
			if(pathIsFolder) {
				// We want to show folders in the parent path !?
			}
			updateFolderPicker(pathToFolder, highLight);
		}
		else highLight(null);
		
		function highLight(err) {
			
			if(err) {
console.error(err);
			return;
			}
			
			if(pathIsFolder) return;
			
			var suggestedFolders = Object.keys(suggestedFolderButtons);
			
			for (var i=0, part; i<suggestedFolders.length; i++) {
				part = suggestedFolders[i].slice(0, pathValue.length)
				console.log("(" + suggestedFolders[i] + ") " + part + " == " + pathValue + " ? " + (part==pathValue));
				if(part == pathValue) {
					console.log("Highlight: " + suggestedFolders[i]);
					suggestedFolderButtons[suggestedFolders[i]].setAttribute("class", "highlighted");
				}
				else {
					suggestedFolderButtons[suggestedFolders[i]].setAttribute("class", "");
				}
			}
		}
	}
	
	function updateFolderPicker(pathToFolder, callback) {
		while(folderPicker.firstChild)folderPicker.removeChild(folderPicker.firstChild);
		
		addFolder("../");
		
		for(var path in suggestedFolderButtons) delete suggestedFolderButtons[path];
		
		EDITOR.listFiles(pathToFolder, function fileList(err, files) {
			
			if(err) {
				if(callback) return callback(err);
				else throw err;
			}
			
			if(files) {
				for (var i=0; i<files.length; i++) {
				if(files[i].type=="d") addFolder(files[i].name);
			}
			}
			
			if(callback) callback(null);
			
			EDITOR.resizeNeeded();
			
		});
		
		return ALLOW_DEFAULT;
	
		function addFolder(name) {
			console.log("Adding folder button name=" + name);
			
			var fullPath = UTIL.resolvePath(pathToFolder, name);
			fullPath = UTIL.trailingSlash(fullPath);
			
			var button = document.createElement("button");
			button.innerText = name;
			button.onclick = function clickButton() {
				inputPath.value = fullPath;
				suggestFolders(fullPath);
				inputPath.focus();
			}
			
			suggestedFolderButtons[fullPath] = button;
			
			folderPicker.appendChild(button);
		}
		
	}
	
	function buildSaveDialog() {
		
		console.log("Building save dialog");
		
		var footer = document.getElementById("footer");
		
		saveDialog = document.createElement("form");
		saveDialog.onsubmit = saveFileInPath;
		
		inputPath = document.createElement("input");
		inputPath.setAttribute("type", "text");
		inputPath.setAttribute("id", "inputPath");
		inputPath.setAttribute("class", "input text path");
		inputPath.setAttribute("size", Math.max(inputPathMinSize, EDITOR.workingDirectory.length)); // Update in show()
		inputPath.addEventListener("keydown", pathKeyDown); // input value has not been updated
		inputPath.addEventListener("input", pathKeyInput); // input value HAS been updated! Also captures most changes.
		
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
		
		folderPicker = document.createElement("div");
		folderPicker.setAttribute("class", "folderPicker");
		saveDialog.appendChild(folderPicker);
		
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
					
					if(err.code == "CANCEL") {
console.warn("The save was canceled: " + err.message);
					return;
					}
					
					alertBox("<b>The file was NOT saved!</b>\n\n" + err.message, "FILE", "warning");
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
		
		EDITOR.ctxMenu.hide(); // This will bring focus to the editor input
		
		showSaveDialog();
		
		var path = "";
		
		if(file.savedAs) path = file.path;
		// Why use the lastFileShowed.path !?
		// else if(EDITOR.lastFileShowed) path = UTIL.getDirectoryFromPath(EDITOR.lastFileShowed.path);
		else if(file.path.charAt(0) == "/" || file.path.indexOf("\\") != -1) path = file.path;
		else path = EDITOR.workingDirectory + file.path;
		
		inputPath.value = path;
		
		var size = Math.max(inputPathMinSize, inputPath.value.length + 10)
		
		console.log("size=" + size);
		console.log("inputPathMinSize=" + inputPathMinSize);
		console.log("inputPath.value.length=" + inputPath.value.length);
		
		inputPath.setAttribute("size", size);
		
		var folder = UTIL.getDirectoryFromPath(path);
		
		suggestFolders(folder);
	}
	
	
	function saveCurrentFile(file, combo, character, charCode, direction) {
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
		
		EDITOR.ctxMenu.addTemp("Save file", saveFileFromContextMenu);
		
	}
	
})();


