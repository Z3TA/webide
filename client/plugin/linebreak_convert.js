(function() {
	
	"use strict";
	
	var menuItem;
	var winMenu;
	
	EDITOR.plugin({
		desc: "Convert line break convention between Unix and Windows format (LF vs CRLF)",
		load: load,
		unload: unload,
	});
	
	function load() {
		
		//menuItem = EDITOR.ctxMenu.add("Convert line-breaks", convertLinebreaks, 7);
		
		winMenu = EDITOR.windowMenu.add("Convert line-breaks", ["File", 17], convertLinebreaks);
		
		EDITOR.registerAltKey({char: "back", alt:3, label: "Convert line-breaks", fun: convertLinebreaks});
		
	}
	
	function unload() {
		//EDITOR.ctxMenu.remove(menuItem);
		EDITOR.windowMenu.remove(winMenu);
		EDITOR.unregisterAltKey(convertLinebreaks);
	}
	
	function convertLinebreaks() {
		var file = EDITOR.currentFile;
		
		if(!file) return alertBox("No file open!");
		
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
		
		EDITOR.ctxMenu.hide();
		
	}
	
	
})();