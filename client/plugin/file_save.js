"use strict";

(function() {
	
	"use strict";
	
	var fileInput;
	var callback;
	var saveDialog;
	var inputPath;
	var inputPathMinSize = 50;
	var folderPicker;
	var suggestedFolderButtons = {};
	var windowMenuSave, windowMenuSaveAs;
	var discoveryBarIcon;
	
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
		EDITOR.bindKey({desc: S("save_current_file"), charCode: char_S, combo: CTRL, fun: saveFileFromKeyboardCombo});
		
		EDITOR.bindKey({desc: S("hide_saveas_widget"), fun: hideSaveDialog, charCode: charEscape, combo: 0});
		
		// todo: use inpout.keyup instead of global listener!
		EDITOR.bindKey({desc: "Save the file with the path in dialog", fun: enter, charCode: charEnter, combo: 0});
		
		windowMenuSave = EDITOR.windowMenu.add(S("save"), [S("File"), 1], saveFileFromWindowMenu, saveFileFromKeyboardCombo);
		windowMenuSaveAs = EDITOR.windowMenu.add(S("save_as"), [S("File"), 2], saveAs);
		
		EDITOR.on("ctxMenu", showSaveOption);
		
		EDITOR.registerAltKey({char: "s", alt:2, label: S("save"), fun: saveFileFromVirtualKeyboard});
		
		discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/disk.svg", 10,  S("save_current_file") + " (" + EDITOR.getKeyFor(saveFileFromKeyboardCombo) + ")", "save", saveFileFromDiscoveryBar);
		
	}
	
	function unloadFileSaver() {
		// Cleaning up, for example when disabling a plugin
		
		EDITOR.unbindKey(saveFileFromKeyboardCombo);
		EDITOR.unbindKey(hideSaveDialog);
		EDITOR.unbindKey(enter);
		
		EDITOR.windowMenu.remove(windowMenuSave);
		EDITOR.windowMenu.remove(windowMenuSaveAs);
		
		EDITOR.removeEvent("ctxMenu", showSaveOption);
		
		EDITOR.unregisterAltKey(saveFileFromVirtualKeyboard);
		
EDITOR.discoveryBar.remove(discoveryBarIcon);

		hideSaveDialog();
	}
	
	function saveFileFromDiscoveryBar(file, combo) {
		EDITOR.stat("saveFileFromDiscoveryBar");
		return saveCurrentFile(file, combo);
	}
	
	function saveFileFromVirtualKeyboard(file, combo) {
		EDITOR.stat("saveFileFromVirtualKeyboard");
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
	
	
	function saveAs(originalFilePath) {
		
		if(originalFilePath == undefined) throw new Error("originalFilePath=" + originalFilePath);
		else if(typeof originalFilePath == "object" && originalFilePath.hasOwnProperty("path")) originalFilePath = originalFilePath.path;
		
		EDITOR.ctxMenu.hide(); // This will bring focus to the editor input
		
		showSaveDialog(); // This will remove focus from the editor input
		
		// Sometimes files does not have full path because they are not saved
		// todo: hmm, how does windows paths look like? Answer: C:\folder\file
		if(originalFilePath.charAt(0) != "/" && originalFilePath.indexOf("\\") == -1 && originalFilePath.match(/^.*:\/\/.*/) == null  && originalFilePath.match(/^.*:\\.*/) == null) {
originalFilePath = EDITOR.workingDirectory + originalFilePath;
		}
		
		inputPath.value = originalFilePath;
		
		var size = Math.max(inputPathMinSize, inputPath.value.length + 10)
		
		console.log("size=" + size);
		console.log("inputPathMinSize=" + inputPathMinSize);
		console.log("inputPath.value.length=" + inputPath.value.length);
		
		inputPath.setAttribute("size", size);
		
		var folder = UTIL.getDirectoryFromPath(originalFilePath);
		
		suggestFolders(folder);
	}
	
	
	function saveCurrentFile(file, combo) {
		if(file.savedAs === false || combo.sum == CTRL + SHIFT) {
			saveAs(file.path);
		}
		else {
			EDITOR.saveFile(file, function(err) {
				if(err) alertBox("Unable to save file!\n" + err.message, err.code, "warning");
			});
		}
		
		return false;
	}
	
	function showSaveOption(file, combo, caret, target) {
		
		if(target.className=="fileCanvas" && file) {
			var filePathToBeSaved = file.path;
		}
		else if(target.getAttribute("path")) { // note: Need to use getAttribute to get custom attributes from DOM elements
			var filePathToBeSaved = target.getAttribute("path");
		}
		
		if(!filePathToBeSaved) return;
		
		if(!EDITOR.files.hasOwnProperty(filePathToBeSaved)) {
			// File is not opened
			// Can not call saveAs() here, as it will save the file currenctly opened! We might be clicking on an item outside the file canvas!
			return;
		}
		
		var fileToBeSaved = EDITOR.files[filePathToBeSaved];
		if(!fileToBeSaved.isSaved) EDITOR.ctxMenu.addTemp("Save file", saveFileFromContextMenu, saveFileFromKeyboardCombo);
		
		EDITOR.ctxMenu.addTemp(S("save_as"), saveAsFromContextMenu);
		
		function saveFileFromContextMenu() {
			
			EDITOR.stat("saveFileFromContextMenu");
			EDITOR.ctxMenu.hide();
			return saveCurrentFile(fileToBeSaved, combo);
		}
		
		function saveAsFromContextMenu() {
			EDITOR.stat("saveAsFromContextMenu");
			EDITOR.ctxMenu.hide();
			return saveAs(filePathToBeSaved)
		}
	}
	
})();


