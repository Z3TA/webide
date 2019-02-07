(function() {
	
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Adds option to reload the file from disk in the context menu",
		load: load,
		unload: unload
	});
	
	function load() {
		
		menuItem = EDITOR.addMenuItem("Relode from disk", reloadFile, 6);
		
	}
	
	function unload() {
		EDITOR.removeMenuItem(menuItem);
	}
	
	function reloadFile() {
		var file = EDITOR.currentFile;
		
if(!file) return true;

		if(!file.saved) {
			
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
		
		EDITOR.hideMenu();
		
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
					file.reload(text);
					file.hash = hash;
					file.saved(); // Because we reloaded from disk
				}
				});
		}
		}
		
	}
	
	
})();