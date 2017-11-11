(function() {
	
	var buttons = {};
	var GROUP = "main";
	
	var CAPS = false;
	var mouseCounter = 0;
	var touchCounter = 0;
	var keyDownCounter = 0;
	
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
			EDITOR.removeEvent("keyDown", maybeHasKeyboard);
			
			EDITOR.virtualKeyboard.hide();
			
		}
	});
	
	function touchMaybeOnMouseDown(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {
		console.log(mouseDownEvent);
		// Some devices only send mousedown on touch!
		// And some send both!
		console.log("touchMaybeOnMouseDown: mouseDownEvent.type=" + mouseDownEvent.type + " touchCounter=" + touchCounter + " mouseCounter=" + mouseCounter + " keyDownCounter=" + keyDownCounter + "");
		if(mouseDownEvent.type == "touchstart") {
			touchCounter++;
			EDITOR.virtualKeyboard.show();
			EDITOR.resizeNeeded(); // Needed to position the virtual keyboard
			if(touchCounter > 3 && keyDownCounter == 0) {
				EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
				EDITOR.removeEvent("keyDown", maybeHasKeyboard);
			}
		}
		else if(mouseDownEvent.type == "mousedown") {
			// Mobile browsers also send mousedown events on touchstart events!
			mouseCounter++;
		}
	}
	
	function maybeHasKeyboard(file, character, combo, keyDownEvent) {
		console.log("maybeHasKeyboard: keyDownEvent.type=" + keyDownEvent.type + " keyDownCounter=" + keyDownCounter);
		if(keyDownEvent.type=="keydown") keyDownCounter++;
		
		// We are now pretty shure that the user has a keyboard
		//alertBox("Hiding virtual keyboard!");
		
		if(keyDownCounter > 0) EDITOR.virtualKeyboard.hide();
		
		if(keyDownCounter > 50 && touchCounter == 0) {
			EDITOR.removeEvent("mouseClick", touchMaybeOnMouseDown);
			EDITOR.removeEvent("keyDown", maybeHasKeyboard);
		}
		
	}
	
	
	
	function addButtons() {
		var body = document.body;
		
		/*
			
			Use white space character like EN QUAD to align
			http://jkorpela.fi/chars/spaces.html
			
		*/
		
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
			click.target.blur();
			clearSelection();
			fireKey(8, "keydown");
			return false;
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
			click.target.blur();
			clearSelection();
			// Why is click sometimes undefined !?
			if(CAPS) {
				CAPS = false;
				if(typeof click != "undefined" && click.target) click.target.setAttribute("class", "kb");
				for(var char in buttons) {
					if(buttons[char].alt) buttons[char].el.innerText = char;
				}
			}
			else {
				CAPS = true;
				
				if(typeof click != "undefined" && click.target) click.target.setAttribute("class", "kb on");
				
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
			click.target.blur();
			clearSelection();
			EDITOR.input = true;
			EDITOR.mock( "keydown", { charCode:13 } );
		});
		
		makeButton("}", 2);
		
		
		
		
		
		makeButton("  space  ", 3, function space(click) {
			click.target.blur();
			clearSelection();
			EDITOR.input = true;
			EDITOR.mock( "keypress", { charCode: " ".charCodeAt(0) } );
		});
		
		
		makeButton("z", 3);
		makeButton("x", 3);
		makeButton("c", 3);
		makeButton("v", 3);
		makeButton("b", 3);
		makeButton("n", 3);
		makeButton("m", 3);
		
		makeButton("compl", 3, function space(click) {
			click.target.blur();
			clearSelection();
			EDITOR.input = true;
			EDITOR.mock( "keydown", { charCode: EDITOR.settings.autoCompleteKey } );
		});
		
		makeButton("<", 3);
		makeButton(">", 3);
		
		makeButton(",", 3);
		makeButton("!", 3);
		makeButton("?", 3);
		makeButton(":", 3);
		
		
		makeButton("|", 3);
		makeButton("&", 3);
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
			ev = function(e) {
				
				e.preventDefault();
				
				clearSelection();
				
				if(alt && CAPS) fireKey(alt.charCodeAt(0));
				else fireKey(char.charCodeAt(0));
				
				b.style.marginTop = "2px";
				setTimeout(function() {
					b.style.marginTop = "0px";
				}, 50);
				
				return false;
			}
		}
		
		var b = document.createElement("button");
		b.setAttribute("class", "kb");
		b.innerText = char;
		//b.onclick = ev;
		
		b.addEventListener("click", ev, true); // Prevent bubbling
		b.addEventListener("touchstart", ev, true); // Prevent bubbling
		
		EDITOR.virtualKeyboard.addKey(b, row, GROUP);
		
		buttons[char] = {
			el: b,
			row: row,
			group: GROUP
		};
		
		if(alt) buttons[char].alt = alt;
		
		return b;
	}
	
	function insertAtCaret(txtarea, text) {
		// https://stackoverflow.com/questions/1064089/inserting-a-text-where-cursor-is-using-javascript-jquery
		//var txtarea = document.getElementById(areaId);
		var scrollPos = txtarea.scrollTop;
		var caretPos = txtarea.selectionStart;
		
		var front = (txtarea.value).substring(0, caretPos);
		var back = (txtarea.value).substring(txtarea.selectionEnd, txtarea.value.length);
		txtarea.value = front + text + back;
		caretPos = caretPos + text.length;
		txtarea.selectionStart = caretPos;
		txtarea.selectionEnd = caretPos;
		txtarea.focus();
		txtarea.scrollTop = scrollPos;
	}
	
	function fireKey(charCode, eventType) {
		
		if(eventType == undefined) eventType = "keypress";
		
		// If a input or textarea element had focus, send it the character!
		if(EDITOR.lastElementWithFocus && (
		( EDITOR.lastElementWithFocus.nodeName == "INPUT" && 
		(EDITOR.lastElementWithFocus.type == "text" || EDITOR.lastElementWithFocus.type == "password")
		) || EDITOR.lastElementWithFocus.nodeName == "TEXTAREA")) {
			
			insertAtCaret(EDITOR.lastElementWithFocus, String.fromCharCode(charCode));
			
			EDITOR.lastElementWithFocus.focus();
		}
		else {
			
			EDITOR.input = true;
			var doDefaultAction = EDITOR.mock( eventType, { charCode: charCode } );
			
			console.log("eventType=" + eventType + " doDefaultAction=" + doDefaultAction);
			
		}
		
		if (navigator.vibrate) {
			// vibration API supported
			navigator.vibrate(50);
		}
		
	}
	
	function clearSelection() {
		if ( document.selection ) {
			document.selection.empty();
		} else if ( window.getSelection ) {
			window.getSelection().removeAllRanges();
		}
	}
	
})();
