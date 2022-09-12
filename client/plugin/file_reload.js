(function() {
	
	"use strict";
	
	var winMenuReloadFromDisk;
	
	EDITOR.plugin({
		desc: "Adds option to reload the file from disk in the context menu",
		load: loadFileReload,
		unload: unloadFileReload
	});
	
	function loadFileReload() {
		
		// Both Ctrl+R and Alt+R are protected by Firefox
		EDITOR.bindKey({desc: S("reload_from_disk"), charCode: 82, combo: CTRL+SHIFT, fun: reloadFileFromKeyCombo});
		
		EDITOR.bindKey({desc: S("reload_from_disk"), key: "BrowserRefresh", combo: CTRL, fun: reloadFileViaBrowserRefresh});
		
		EDITOR.bindKey({desc: S("reload_from_disk"), charCode: 82, combo: CTRL, fun: reloadFileFromKeyComboStandalone});
		
		EDITOR.on("ctxMenu", reloadFileCtxOption);
		EDITOR.on("changeBranch", reloadFilesWhenChangingBranch);

		winMenuReloadFromDisk = EDITOR.windowMenu.add(S("reload_from_disk"), [S("Edit"), 4], reloadFileFromWindowMenu, reloadFileFromKeyCombo);
		
		EDITOR.registerAltKey({char: "back", alt:1, label: S("reload"), fun: reloadFile});
	}
	
	function unloadFileReload() {
		EDITOR.unbindKey(reloadFileFromKeyCombo);
		EDITOR.unbindKey(reloadFileViaBrowserRefresh);
		EDITOR.unbindKey(reloadFileFromKeyComboStandalone);
		
		EDITOR.removeEvent("ctxMenu", reloadFileCtxOption);
		EDITOR.removeEvent("changeBranch", reloadFilesWhenChangingBranch);

		EDITOR.windowMenu.remove(winMenuReloadFromDisk);
		EDITOR.unregisterAltKey(reloadFile);
	}
	
	function reloadFileFromKeyComboStandalone(file) {
		return reloadFile(file);
	}
	
	function reloadFileViaBrowserRefresh(file) {
		return reloadFile(file);
	}
	
	function reloadFileFromKeyCombo(file) {
		return reloadFile(file);
	}
	
	function reloadFileFromWindowMenu(file) {
		return reloadFile(file);
	}
	
	function reloadFilesWhenChangingBranch(branchName) {

		for(var filePath in EDITOR.files) {
			reload(EDITOR.files[filePath]);
		}

		function reload(file) {

			if(file.changed) {
				// Don't reload
				return;
			}
			else if(!file.savedAs) {
				// Don't reload
				return;
			}
			else if(file.isBig) {
				var filePath = file.path;
				EDITOR.closeFile(file);
				EDITOR.openFile(filePath);
			}
			else {
				EDITOR.readFromDisk(file.path, function(err, path, text, hash) {
					if(err) {
						if(err.code == "ENOENT") {
							file.changed = true;
							file.isSaved = false;
							file.savedAs = false;
						}
						else throw err;
					}
					else {
						file.reload(text, options);
						file.hash = hash;
						file.saved(); // Because we reloaded from disk
					}
				});
			}
		}


	}

	function reloadFileCtxOption(file, combo, caret, target) {
		if(target.className=="fileCanvas" && file) {
			var filePath = file.path;
		}
		else if(typeof target.getAttribute == "function" && target.getAttribute("path")) { // note: Need to use getAttribute to get custom attributes from DOM elements
			var filePath = target.getAttribute("path");
		}
		
		if(!filePath) return;
		
		// File need to be opened!
		if(!EDITOR.files.hasOwnProperty(filePath)) return;
		
		var fileToBeReloaded = EDITOR.files[filePath];
		
		EDITOR.ctxMenu.addItem({
			temp: true, 
			text: S("reload_from_disk"),
			callback: function reloadFileFromCtxmenu() {
				reloadFile(fileToBeReloaded);
			},
			keyCombo: reloadFileFromKeyCombo
		});
	}
	
	function reloadFile(file, options) {
		
		if(!file) return true;

		if(!file.savedAs) {
			alertBox("Can not reload " + file.path + " because it has not been saved!");
			return PREVENT_DEFAULT;
		}
		
		if(file.changed) {
			
			var yes = "Yes, discard changes";
			var no = "NO"
			var msg = "";
			var text = file.text;
			
			msg = "Are you sure you want to reload the file from disk ?<br>" + file.path;
			
			confirmBox(msg, [yes, no], function (answer) {
				if(answer == yes) {
					reload();
				}
			});
		}
		else reload();
		
		EDITOR.ctxMenu.hide();
		
		return PREVENT_DEFAULT;

		function reload() {
			
			if(file.isBig) {
				var filePath = file.path;
				EDITOR.closeFile(file);
				EDITOR.openFile(filePath);
			}
			else {
				EDITOR.readFromDisk(file.path, function(err, path, text, hash) {
					if(err) {
						if(err.code == "ENOENT") {
							alertBox("The file no longer exist on disk: " + file.path);
					}
					else throw err;
				}
				else {
						file.reload(text, options);
					file.hash = hash;
					file.saved(); // Because we reloaded from disk
				}
				});
		}
		}
		
	}
	
	
})();