
(function() {
	
	var gotoCharDialog = EDITOR.createWidget(buildGotoCharDialog);
	
	EDITOR.plugin({
		desc: "Go to character",
		load: loadGoToCharacter,
		unload: unloadGoToCharacter
	});
	
	function loadGoToCharacter() {
		gotoCharDialog = 
	}
	
	function unloadGoToCharacter() {
		
	}
	
	function buildGotoCharDialog(widget) {
		
		var gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("id", "gotoDiv");
		gotoDiv.setAttribute("class", "gotoDiv");
		
		var inputGoto = document.createElement("input");
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
		
		return gotoDiv;
		
		
		inputGoto.addEventListener("keyup", function(keyUpEvent) {
			keyUpEvent.preventDefault();
			if (keyUpEvent.keyCode == 13) {
				gotoChar(); // When pressing enter
			}
			else if(keyUpEvent.keyCode == key_Esc) {
				hideGotoCharWidget(); // When pressing escape
			}
		});
		
		gotoButton.addEventListener("click", gotoChar, false);
		
		cancelButton.addEventListener("click", hideGotoCharWidget, false);
		
		function gotoChar() {
			var charNr = inputGoto.value;
			
		}
		
	}
	
	function hideGotoCharWidget() {
		return gotoCharDialog.hide();
	}
	
})();
