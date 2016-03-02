
(function() {
	
	"use strict";

	var gotoDiv;
	var footer;
	var gotoInputIsVisible = false;
	var inputGoto;
	var gotoButton;
	
	window.addEventListener("load", goto_init, false);

	function goto_init() {
		
		// Create markup
		footer = document.getElementById("footer");
		gotoDiv = document.getElementById("goto");
		inputGoto = document.getElementById("inputGoto");
		gotoButton = document.getElementById("buttonGoto");
		
		// Sanity check
		if(!footer) {
			console.error(new Error("Can not find the footer!"));
		}
		
		// Insert text into translation dictionary if they dont exist
		//dictionary.default("gotoline", "Goto line")
		
		// Create the hypertext markup if it doesn't exist
		
		//build_gotoInput();
		
		hide_gotoInput();
		
		editor.keyBindings.push({charCode: 71, combo: CTRL, fun: show_gotoInput}); // ctrl + G
		editor.keyBindings.push({charCode: 27, fun: hide_gotoInput}); // Escape
		editor.keyBindings.push({charCode: 13, fun: gotoLine}); // Enter

	}
	
	function build_gotoInput() {
			
		gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("id", "gotoDiv");
		gotoDiv.setAttribute("class", "gotoDiv");
	
		inputGoto = document.createElement("input");
		inputGoto.setAttribute("type", "text");
		inputGoto.setAttribute("id", "inputGoto");
		inputGoto.setAttribute("class", "inputtext");
		
		var labelGoto = document.createElement("label");
		labelGoto.setAttribute("for", "inputGoto");
		labelGoto.appendChild(document.createTextNode("Goto line:")); // Language settings!?

		gotoButton = document.createElement("input");
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
		
		footer.appendChild(gotoDiv);
	
		gotoButton.addEventListener("click", gotoLine, false);
		
		cancelButton.addEventListener("click", hide_gotoInput, false);
		
		gotoInputIsVisible = true;
		
		console.log("built gotoInput!");

	}
	
	function show_gotoInput(file, combo) {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before showing");

		if(!gotoInputIsVisible) {
			
			console.log("gotoDiv=" + gotoDiv);
			
			if(gotoDiv) console.log("gotoDiv.style.dipslay=" + gotoDiv.style.dipslay);
			
			//if(!gotoDiv) build_gotoInput();
			build_gotoInput(); // Always build!
			
			var footerHeight = parseInt(footer.style.height);
			var heightNeeded = 45;
			
			gotoDiv.style.display="block";
			
			/* We need the footer to be this high
			if(footerHeight < heightNeeded) {
				//footer.style.height = footerHeight + heightNeeded + "px";
				editor.resizeNeeded();
			}
			*/
			
			// Remove focus from the editor
			if(editor.currentFile) {
				editor.currentFile.gotFocus = false;
			}
			
			
			inputGoto.focus();   // Add focus to the input
			inputGoto.select();  // Select all
			
		
			
			gotoInputIsVisible = true;
			
			editor.resizeNeeded();
			editor.renderNeeded();
			
		}
		
	}

	function hide_gotoInput() {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before hiding");
		
		if(gotoInputIsVisible) {
			
			// Hide the search window
			//gotoDiv.style.display="none"; // Need to hide this, or the footer will not scrimp
			
			gotoDiv.parentNode.removeChild(gotoDiv);
			
			//footer.style.height = "0px"; // Hmm, can't be less then one px
			
			// Bring back focus to the current file
			if(editor.currentFile) {
				editor.currentFile.gotFocus = true;
			}
			
			gotoInputIsVisible = false;
			
			editor.resizeNeeded();
			editor.renderNeeded();
		}

	}

	
	function gotoLine() {
		
		if(gotoInputIsVisible) {
			
			var line = parseInt(inputGoto.value);
			var file = editor.currentFile;
			
			if(isNaN(line)) {
				alert("Enter line number!");
			}
			else if(!file) {
				alert("No file open!");
			}
			else {
				
				console.log("Going to line " + line + ".");
				
				file.caret.row = line-1;
				//file.caret.col = 0;
				
				file.fixCaret();
				file.scrollToCaret();
				
				hide_gotoInput();
				
			}
		
			return false; // Return false to prevent default (typing a linebreak character)

		}
	}
	
})();