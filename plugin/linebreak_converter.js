(function() {
	
	"use strict";
	
	editor.plugin({
		desc: "Convert line breaks",
		load: loadLineBreakConverter,
		unload: unloadLineBreakConverter,
	});
	
	function loadLineBreakConverter() {
		
		editor.on("mouseClick", checkLineBreakConvention);
		
	}
	
	function unloadLineBreakConverter() {
		
		editor.removeEvent("mouseClick", checkLineBreakConvention);
		
	}
	
	function checkLineBreakConvention(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo) {
		
		var file = editor.currentFile;
		
		if(file) {
			
			if(mouseDirection != "up" || button != 2) return;
			
			if(navigator.platform.indexOf("Win") != -1 && file.lineBreak != "\r\n") {
				editor.addTempMenuItem("Convert line breaks from " + lbChars(file.lineBreak) + " to CRLF", convertFile);
			}
			
		}
		
		function convertFile() {
			editor.hideMenu();
			console.log("Converting line breaks to Windows default!");
			var oldText = file.text.replace(/\r/g, ""); // Remove all CR just in case
			file.reload(oldText.replace(/\n/g, "\r\n"));
		}
	}
	
	
})();