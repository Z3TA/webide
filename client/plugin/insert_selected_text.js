(function() {
	"use strict";

EDITOR.plugin({
		desc: "Insert selected text when middle mouse button is clicked",
		load: function loadMidlemouseInsert() {
			
			// Event need to be on dir:down to prevent the editor's context menu
			// But it needs to be on dir:up to stop Firefox's paste event
			// solution: Listen to both up and down.
			EDITOR.addEvent("mouseClick", {fun: insertSelectedText, dir: undefined, targetClass:"fileCanvas", button: 1});
			
		},
		unload: function unloadMidlemouseInsert() {
			
			EDITOR.removeEvent("mouseClick", insertSelectedText);
			
		}
	});

	function insertSelectedText(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {
		
		if(!EDITOR.currentFile instanceof File) return ALLOW_DEFAULT;
		
		if(mouseDirection == "down") return PREVENT_DEFAULT; // Prevent the editor's context menu
		
		var file = EDITOR.currentFile;
		
		if(EDITOR.input) var selectedText = EDITOR.currentFile.getSelectedText();
		else var selectedText = getBrowserSelectionText();
		
		//console.log("insertSelectedText: EDITOR.input=" + EDITOR.input + " selectedText=" + selectedText);
		
		// If nothing is selected. Get content from clipboard.
		if(selectedText == "") {
			//console.log("insertSelectedText: Nothing is selected. Getting clipboard data...");
			EDITOR.getClipboardContent(gotClipboarData);
		}
		else {
gotClipboarData(null, selectedText);
		}
		/*
			
			Issue: The default behaviour in Firefox (without this plugin) is to paste the clipboard content at the file caret (not where we clicked)
			We can't seem to be able to prevent the paste via mouseDownEvent.preventDefault();
			
		*/
		if(BROWSER=="Firefox") {
			//console.log("insertSelectedText: EDITOR.input=" + EDITOR.input);
			if(EDITOR.input) {
				EDITOR.input = false;
				setTimeout(function giveBackInputAfterInsertingSelectedText() {
					EDITOR.input = true;
				}, 1);
			}
		}
		
		
		return PREVENT_DEFAULT;
		
		function gotClipboarData(err, data) {
			if(err) {
				console.error(err);
				return;
			}
			
			file.insertText(data, caret);
			
		}
		
	}
	
	function getBrowserSelectionText() {
		var text = "";
		var activeEl = document.activeElement;
		var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
		if (
			(activeElTagName == "textarea") || (activeElTagName == "input" &&
		/^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
		(typeof activeEl.selectionStart == "number")
		) {
			text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
		} else if (window.getSelection) {
			text = window.getSelection().toString();
		}
		return text;
	}
	
	
})();
