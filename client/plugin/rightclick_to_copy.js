(function() {
	"use strict";

	var clipboardHasData = false;
	
	EDITOR.plugin({
		desc: "Copy/cut/paste via context menu",
		load: function loadContextCopy() {

			EDITOR.on("ctxMenu", contextCopyShowOptions);
			EDITOR.on("copy", contextCopy);
			
		},
		unload: function unloadCOntextCopy() {
			
			EDITOR.removeEvent("ctxMenu", contextCopyShowOptions);
			EDITOR.removeEvent("copy", contextCopy);
			
		}
	});
	
	function contextCopy(text, copiedIntoPlatformClipboard, manuallyCopied) {
		if(text.length == 0) return;
		
		clipboardHasData = true;
		
		EDITOR.removeEvent("copy", contextCopy); 
	}
	
	function contextCopyShowOptions(file, posX, posY, clickEvent) {
		if(!file) return; // No file open
		
		if(file.selected.length == 0) {
			// Nothing selected
			if(clipboardHasData) {
				EDITOR.getClipboardContent({silent: true}, function(err, text) {
					
					if(err) var contentPreview = "";
					else {
var contentPreview = ": ";
						
						if(text.length < 50) {
contentPreview += text;
						}
						else if(text.indexOf("\n") != -1) {
							var lines = UTIL.occurrences(text, "\n") + 1;
							contentPreview = contentPreview + text.slice(0, Math.min(15, text.indexOf("\n"))) + "... (" + lines + " rows)";
						}
						else {
							contentPreview = contentPreview + text.slice(0, 15) + "... (" + text.length + " characters)";
						}
					}
					
					EDITOR.ctxMenu.addTemp("Paste" + contentPreview, true, ctxPaste);
				});
			}
		}
		else {
			EDITOR.ctxMenu.addTemp("Copy", false, ctxCopy);
			EDITOR.ctxMenu.addTemp("Cut", true, ctxCut);
		}
	}
	
	function ctxCopy(file) {
		var textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
		EDITOR.putIntoClipboard(textToPutOnClipboard);
		EDITOR.ctxMenu.hide();
	}
	
	function ctxCut(file) {
		var textToPutOnClipboard = EDITOR.currentFile.getSelectedText();
		EDITOR.putIntoClipboard(textToPutOnClipboard);
		
		file.deleteSelection();
		
		EDITOR.ctxMenu.hide();
	}
	
	function ctxPaste(file, combo, character, charCode, direction, clickEvent) {
		EDITOR.getClipboardContent(function(err, text) {
			EDITOR.ctxMenu.hide();
			
			console.log("ctxPaste: EDITOR.getClipboardContent: err=" + (err && err.message) + " text=" + text);
			
			if(err && err.code != "CANCEL") {
				console.log("ctxPaste: Using pseudoClipboard because of error from EDITOR.getClipboardContent: " + err.message);
				text = EDITOR.pseudoClipboard;
			}
			
			if(text != undefined) file.insertText(text);
			
		});
	}
	
	
})();
