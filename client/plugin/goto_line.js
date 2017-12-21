
(function() {
	
	"use strict";

	EDITOR.plugin({
		desc: "Goto line",
		load: gotoLine_load,
		unload: gotoLine_unload
	});
	
	var gotoDiv;
	var footer;
	var gotoInputIsVisible = false;
	var inputGoto;
	var gotoButton;
	var key_Esc = 27;
	var key_G = 71;
	
	//window.addEventListener("load", goto_init, false);

	function gotoLine_load() {
		
		// Create markup
		footer = document.getElementById("footer");
		gotoDiv = document.getElementById("goto");
		inputGoto = document.getElementById("inputGoto");
		gotoButton = document.getElementById("buttonGoto");
		
		// Sanity check
		if(!footer) {
			throw new Error("Can not find the footer!");
		}
		
		// Insert text into translation dictionary if they dont exist
		//dictionary.default("gotoline", "Goto line")
		
		// Create the hypertext markup if it doesn't exist
		
		//build_gotoInput();
		
		hide_gotoLineInput();
		
		EDITOR.bindKey({desc: "Goto line ...", charCode: key_G, combo: CTRL, fun: show_gotoInput}); // ctrl + G
		EDITOR.bindKey({desc: "Hide the goto-line GUI", charCode: key_Esc, fun: hide_gotoLineInput});
		
		EDITOR.addEvent("voiceCommand", {
			re: /(go ?to)? ?line (\d*)/i, 
			grammar: ["goto line *", "line *"], fun: gotoLineVoice
		});
		
		}
	
	function gotoLine_unload() {
		
		EDITOR.unbindKey(show_gotoInput);
		EDITOR.unbindKey(hide_gotoLineInput);
		
		EDITOR.removeEvent("voiceCommand", gotoLineVoice);
	}
	
	function gotoLineVoice(text, file, match) {
		
		console.log(match);
		
		var line = parseInt(match[2]);
		
		if(file) file.gotoLine(line);
		
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
	
	
		inputGoto.addEventListener("keyup", function(keyUpEvent) {
			keyUpEvent.preventDefault();
			if (keyUpEvent.keyCode == 13) {
				gotoLine(); // When pressing enter
			}
			else if(keyUpEvent.keyCode == key_Esc) {
				hide_gotoLineInput(); // When pressing escape
			}
		});
	
		gotoButton.addEventListener("click", gotoLine, false);
		
		cancelButton.addEventListener("click", hide_gotoLineInput, false);
		
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
				EDITOR.resizeNeeded();
			}
			*/
			
			gotoInputIsVisible = true;
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
			
		}

		// Remove focus from the editor
		if(EDITOR.currentFile) {
			EDITOR.input = false;
		}

		inputGoto.focus();   // Add focus to the input
		inputGoto.select();  // Select all
				
		return false; // Function must return false to ignore default browser action!

	}

	function hide_gotoLineInput() {
		
		console.log("gotoInputIsVisible=" + gotoInputIsVisible + " before hiding");
		
		if(gotoInputIsVisible) {
			
			// Hide the search window
			//gotoDiv.style.display="none"; // Need to hide this, or the footer will not scrimp
			
			gotoDiv.parentNode.removeChild(gotoDiv);
			
			//footer.style.height = "0px"; // Hmm, can't be less then one px
			
			// Bring back focus to the current file
			if(EDITOR.currentFile) {
				EDITOR.input = true;
			}
			
			gotoInputIsVisible = false;
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
			
			return false;
		}
		
		return true;
	}

	
	function gotoLine(line) {
		
		if(gotoInputIsVisible) {
			
			var line = parseInt(inputGoto.value);
			var file = EDITOR.currentFile;
			
			if(!file) throw new Error("No current file!");
			
			if(isNaN(line)) {
				alert("Enter line number!");
			}
			else if(!file) {
				alert("No file open!");
			}
			else {
				
				if(line < 1) line = 1;
				
				console.log("file.totalRows=" + file.totalRows);
				
				var maxLine = Math.max(file.grid.length, (file.totalRows+1));
				
				if(line > maxLine) line = maxLine;
				
				console.log("Going to line " + line + ".");
				
				file.gotoLine(line);
				
				hide_gotoLineInput();
				
			}
		
			return false; // Return false to prevent default (typing a linebreak character)

		}
		
		return true;
	}
	
})();