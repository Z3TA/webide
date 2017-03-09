(function() {
	
	"use strict";
	
	var menuItem;
	
	EDITOR.plugin({
		desc: "Convert line break convention between Unix and Windows format (LF vs CRLF)",
		load: load,
		unload: unload,
	});
	
	function load() {
		
		menuItem = EDITOR.addMenuItem("Convert line-breaks", convertLinebreaks);
		
	}
	
	function unload() {
		EDITOR.removeMenuItem(menuItem);
	}
	
	function convertLinebreaks() {
		var file = EDITOR.currentFile;
		
		var yes = "Yes, convert";
		var no = "NO"
		var msg = "";
		var text = file.text;
		
		if(file.lineBreak == "\r\n") {
			msg = "Are you sure you want to convert the line-breaks from Windows (CRLF) to Unix (LF) ?";
			
			confirmBox(msg, [yes, no], function (answer) {
				if(answer == yes) {
					text = text.replace(/\r/g, "");
					file.reload(text);
}
			});
			
		}
		else {
			msg = "Are you sure you want to convert the line-breaks from Unix (LF) to Windows (CRLF) ?";
			
			if(text.indexOf("\r") != -1) msg = msg + "<br>(littering CR's will be removed)";
			
			confirmBox(msg, [yes, no], function (answer) {
				if(answer == yes) {
					text = text.replace(/\r/g, ""); // Removing littering CR's
					text = text.replace(/\n/g, "\r\n");
					file.reload(text);
				}
			});
			
		}
		
		EDITOR.hideMenu();
		
	}
	
	
})();