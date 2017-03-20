(function() {
	
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Adds option to reload the file from disk in the context menu",
		load: load,
		unload: unload
	});
	
	function load() {
		
		menuItem = EDITOR.addMenuItem("Relode from disk", reloadFile);
		
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
			EDITOR.readFromDisk(file.path, function(err, path, text) {
				file.reload(text);
				
				file.saved(); // Because we reloaded from disk
				
});
			}
		
	}
	
	
})();