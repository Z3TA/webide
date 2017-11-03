(function() {
	
	var buttons = {};
	var GROUP = "main";
	
	var CAPS = false;
	var TOUCH = false;
	var mouseCounter = 0;
	var touchCounter = 0;
	
	EDITOR.plugin({
		desc: "Add a default set of buttons to the virtual keyboard",
		load: function loadVirtualKeyboard() {
			
			// enable vibration support
			navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;
			
			addButtons();
			
			// Wait for touch events before showing the virtual keyboard
			EDITOR.on("mouseClick", touchMaybeOnMouseDown);
			
			// Listen for keyboard events to make sure the user has a keyboard before hiding the virtual keyboard
			EDITOR.on("keyDown", maybeHasKeyboard);
			
			
		},
		unload: function unloadVirtualKeyboard() {
			
			removeButtons();
			
			EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
			
			
		}
	});
	
	function touchMaybeOnMouseDown(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {
		console.log(mouseDownEvent);
		if(mouseDownEvent.type == "touchstart") {
			TOUCH = true;
			touchCounter++;
			EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
			EDITOR.virtualKeyboard.show();
		}
		else if(mouseDownEvent.type == "mousedown") {
			// Mobile browsers also send mousedown events on touchstart events!
			mouseCounter++;
			if(mouseCounter > 1 && mouseCounter > touchCounter) {
				TOUCH = false;
				EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
				EDITOR.virtualKeyboard.hide();
			}
		}
	}
	
	function maybeHasKeyboard(file, character, combo, keyDownEvent) {
		console.log(keyDownEvent);
	}
	
	function addButtons() {
		var body = document.body;
		
		// ### First row
		
		makeButton("1", 0);
		makeButton("2", 0);
		makeButton("3", 0);
		makeButton("4", 0);
		makeButton("5", 0);
		makeButton("6", 0);
		makeButton("7", 0);
		makeButton("8", 0);
		makeButton("9", 0);
		makeButton("0", 0);
		
		makeButton("[", 0);
		makeButton("]", 0);
		
		makeButton("-", 0);
		makeButton("+", 0);
		
		makeButton("back", 0, function space(click) {
			EDITOR.input = true;
			EDITOR.mock( "keydown", { charCode:8 } );
		});
		
		makeButton("#", 0);
		makeButton("\\", 0);
		
		makeButton("^", 0);
		
		
		// ### Second row
		makeButton("q", 1);
		makeButton("w", 1);
		makeButton("e", 1);
		makeButton("r", 1);
		makeButton("t", 1);
		makeButton("y", 1);
		makeButton("u", 1);
		makeButton("i", 1);
		makeButton("o", 1);
		makeButton("p", 1);
		makeButton("å", 1);
		
		makeButton("=", 1);
		
		makeButton("'", 1);
		makeButton('"', 1);
		
		makeButton("/", 1);
		makeButton("*", 1);
		makeButton("%", 1);
		makeButton("~", 1);
		
		
		
		
		makeButton("CAPS", 2, function capsLock(click) {
			if(CAPS) {
				CAPS = false;
				click.target.setAttribute("class", "kb");
				for(var char in buttons) {
					if(buttons[char].alt) buttons[char].el.innerText = char;
				}
			}
			else {
				CAPS = true;
				click.target.setAttribute("class", "kb on");
				
				for(var char in buttons) {
					if(buttons[char].alt) buttons[char].el.innerText = buttons[char].alt;
				}
			}
		});
		
		makeButton("a", 2);
		makeButton("s", 2);
		makeButton("d", 2);
		makeButton("f", 2);
		makeButton("g", 2);
		makeButton("h", 2);
		makeButton("j", 2);
		makeButton("k", 2);
		makeButton("l", 2);
		makeButton("ö", 2);
		makeButton("ä", 2);
		
		makeButton(".", 2);
		
		makeButton(";", 2);
		
		makeButton("{", 2);
		
		makeButton("Enter ", 2, function space(click) {
			EDITOR.input = true;
			EDITOR.mock( "keydown", { charCode:13 } );
		});
		
		makeButton("}", 2);
		
		
		
		
		
		
		makeButton("compl", 3, function space(click) {
			EDITOR.input = true;
			EDITOR.mock( "keydown", { charCode: EDITOR.settings.autoCompleteKey } );
		});
		
		makeButton("z", 3);
		makeButton("x", 3);
		makeButton("c", 3);
		makeButton("v", 3);
		makeButton("b", 3);
		makeButton("n", 3);
		makeButton("m", 3);
		
		makeButton("<", 3);
		makeButton(">", 3);
		
		makeButton(",", 3);
		makeButton("!", 3);
		makeButton(":", 3);
		
		makeButton(" space ", 3, function space(click) {
			EDITOR.input = true;
			EDITOR.mock( "keypress", { charCode: " ".charCodeAt(0) } );
		});
		
		makeButton("|", 3);
		makeButton("@", 3);
		
		
		
		
		
		
	}
	
	function removeButtons() {
		for(var char in buttons) {
			EDITOR.virtualKeyboard.removeKey(buttons[char].el, buttons[char].row, buttons[char].group);
		}
	}
	
	function makeButton(char, row, ev) {
		
		if(row == undefined) row = 0;
		
		var alt = (char.length == 1 && char != char.toUpperCase()) && char.toUpperCase();
		
		if(ev == undefined) {
			ev = function() {
				EDITOR.input = true;
				if(alt && CAPS) EDITOR.mock( "keypress", { charCode: alt.charCodeAt(0) } );
				else EDITOR.mock( "keypress", { charCode: char.charCodeAt(0) } );
				if (navigator.vibrate) {
					// vibration API supported
					navigator.vibrate(50);
				}
				
			}
		}
		
		var b = document.createElement("button");
		b.setAttribute("class", "kb");
		b.innerText = char;
		b.onclick = ev;
		EDITOR.virtualKeyboard.addKey(b, row, GROUP);
		
		buttons[char] = {
			el: b,
			row: row,
			group: GROUP
		};
		
		if(alt) buttons[char].alt = alt;
		
		return b;
	}
	
})();
