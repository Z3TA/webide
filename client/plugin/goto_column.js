(function() {
	
	var widget = EDITOR.createWidget(build);
	var input;
	
	var KEY_ESC = 27;
	
	var winMenu;
	
	EDITOR.plugin({
		desc: "Go to column",
		load: function loadGoToCharacter() {
			
			EDITOR.bindKey({desc: "Hide goto-column widget", charCode: KEY_ESC, fun: hideGotoColumnWidget});
			
			winMenu = EDITOR.windowMenu.add(S("goto_column"), [S("Navigate"), 13], showGotoColumnWidget);
		},
		unload: function unloadGoToCharacter() {
			EDITOR.unbindKey(showGotoColumnWidget);
			EDITOR.unbindKey(hideGotoColumnWidget);
			
			widget.unload();
			
			EDITOR.windowMenu.remove(winMenu);
		}
	});
	
	function hideGotoColumnWidget() {
		winMenu.deactivate();
		
		return widget.hide();
	}
	
	function build(widget) {
		
		var gotoDiv = document.createElement("div");
		gotoDiv.setAttribute("class", "gotoDiv");
		
		input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("id", "inputGotoColumn");
		input.setAttribute("class", "inputtext");
		
		var labelGoto = document.createElement("label");
		labelGoto.setAttribute("for", "inputGotoColumn");
		labelGoto.appendChild(document.createTextNode("Goto column (n):")); // Language settings!?
		
		var button = document.createElement("input");
		button.setAttribute("type", "button");
		button.setAttribute("class", "button");
		button.setAttribute("value", "Go!");
		
		var cancelButton = document.createElement("input");
		cancelButton.setAttribute("type", "button");
		cancelButton.setAttribute("class", "button");
		cancelButton.setAttribute("value", "cancel");
		
		
		gotoDiv.appendChild(labelGoto);
		gotoDiv.appendChild(input);
		gotoDiv.appendChild(button);
		gotoDiv.appendChild(cancelButton);
		
		
		input.addEventListener("keyup", function(keyUpEvent) {
			keyUpEvent.preventDefault();
			if (keyUpEvent.keyCode == 13) {
				gotoColumn(); // When pressing enter
			}
			else if(keyUpEvent.keyCode == KEY_ESC) {
				hideGotoColumnWidget(); // When pressing escape
			}
		});
		
		button.addEventListener("click", gotoColumn, false);
		
		cancelButton.addEventListener("click", hideGotoColumnWidget, false);
		
		return gotoDiv;
		
		
		function gotoColumn() {
			
			var n = input.value;
			
			console.log("gotoColumn: n=" + n + " ...");
			
			var file = EDITOR.currentFile;
			
			if(isNaN(n)) {
				alert("Enter a number!");
			}
			else if(!file) {
				alert("No file open!");
			}
			else {
				
				var row = file.caret.row;
				
				if(n < 1) n = 1;
				if(n > file.grid[row].length) n = file.grid[row].length;
				
				console.log("gotoColumn: Placing caret on column " + n + " ...");
				
				file.moveCaretToCol(n-1);
				
				hideGotoColumnWidget();

			}
			
			return false; // Return false to prevent default
			
		}
		
	}
	
	function showGotoColumnWidget() {
		widget.show();
		
		winMenu.hide();
		
		input.focus();   // Add focus to the input
		input.select();  // Select all
		
		return false;
	}
	
	
	
})();
