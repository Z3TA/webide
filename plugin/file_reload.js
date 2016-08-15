(function() {
	
	"use strict";
	
	var menuItem;
	
	editor.plugin({
		desc: "Adds option to reload the file from disk in the context menu",
		load: load,
		unload: unload
	});
	
	function load() {
		
		menuItem = editor.addMenuItem("Relode from disk", reloadFile);
		
	}
	
	function unload() {
		editor.removeMenuItem(menuItem);
	}
	
	function reloadFile() {
		var file = editor.currentFile;
		
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
		
		editor.hideMenu();
		
		function reload() {
			editor.readFromDisk(file.path, function(err, path, text) {
				file.reload(text);
				
				file.saved(); // Because we reloaded from disk
				
});
			}
		
	}
	
	
})();