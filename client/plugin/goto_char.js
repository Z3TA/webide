
(function() {
	
	var gotoCharDialog = EDITOR.createWidget(buildGotoCharDialog);
	var inputGoto;
	
	var KEY_H = 72;
	var KEY_ESC = 27;
	
	var winMenuGotoCharacter;
	
	EDITOR.plugin({
		desc: "Go to character",
		load: loadGoToCharacter,
		unload: unloadGoToCharacter
	});
	
	function loadGoToCharacter() {
		EDITOR.bindKey({desc: S("goto_char_index"), charCode: KEY_H, combo: CTRL, fun: showGotoCharWidget});
		EDITOR.bindKey({desc: S("hide_goto_char_widget"), charCode: KEY_ESC, fun: hideGotoCharWidget});
		
		winMenuGotoCharacter = EDITOR.windowMenu.add(S("goto_char_index"), [S("Navigate"), 12], showGotoCharWidget);
	}
	
	function unloadGoToCharacter() {
		EDITOR.unbindKey(showGotoCharWidget);
		EDITOR.unbindKey(hideGotoCharWidget);
		
		gotoCharDialog.unload();
		
		EDITOR.windowMenu.remove(winMenuGotoCharacter);
	}
	
	function buildGotoCharDialog(widget) {
		
		var gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("id", "gotoDiv");
		gotoDiv.setAttribute("class", "gotoDiv");
		
		inputGoto = document.createElement("input");
		inputGoto.setAttribute("type", "text");
		inputGoto.setAttribute("id", "inputGoto");
		inputGoto.setAttribute("class", "inputtext");
		
		var labelGoto = document.createElement("label");
		labelGoto.setAttribute("for", "inputGoto");
		labelGoto.appendChild(document.createTextNode("Goto character (n):")); // Language settings!?
		
		var gotoButton = document.createElement("input");
		gotoButton.setAttribute("type", "button");
		gotoButton.setAttribute("class", "button");
		gotoButton.setAttribute("id", "gotoButton");
		gotoButton.setAttribute("value", "Go!");
		
		var cancelButton = document.createElement("input");
		cancelButton.setAttribute("type", "button");
		cancelButton.setAttribute("class", "button");
		cancelButton.setAttribute("id", "cancelButton");
		cancelButton.setAttribute("value", "cancel");
		
		
		gotoDiv.appendChild(labelGoto);
		gotoDiv.appendChild(inputGoto);
		gotoDiv.appendChild(gotoButton);
		gotoDiv.appendChild(cancelButton);
		
		
		inputGoto.addEventListener("keyup", function(keyUpEvent) {
			keyUpEvent.preventDefault();
			if (keyUpEvent.keyCode == 13) {
				gotoChar(); // When pressing enter
			}
			else if(keyUpEvent.keyCode == KEY_ESC) {
				hideGotoCharWidget(); // When pressing escape
			}
		});
		
		gotoButton.addEventListener("click", gotoChar, false);
		
		cancelButton.addEventListener("click", hideGotoCharWidget, false);
		
		return gotoDiv;
		
		
		function gotoChar() {
			
			var charNr = inputGoto.value;
			
			console.log("gotoChar " + charNr + " ...");
			
			var file = EDITOR.currentFile;
			
			if(isNaN(charNr)) {
				alert("Enter a number!");
			}
			else if(!file) {
				alert("No file open!");
			}
			else {
				
				if(charNr < 1) charNr = 1;
				if(charNr > file.text.length) charNr = file.text.length;
				
				console.log("Placing caret near character nr " + charNr + " ...");
				
				file.moveCaretToIndex(charNr);
				
				hideGotoCharWidget();
				
			}
			
			return false; // Return false to prevent default
			
		}
		
	}
	
	function showGotoCharWidget() {
		gotoCharDialog.show();
		
		winMenuGotoCharacter.hide();
		
		inputGoto.focus();   // Add focus to the input
		inputGoto.select();  // Select all
		
		return false;
	}
	
	function hideGotoCharWidget() {
		winMenuGotoCharacter.deactivate();
		
		return gotoCharDialog.hide();
	}
	
})();
