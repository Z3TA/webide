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
		return true;
	}
	
	function maybeHasKeyboard(file, character, combo, keyDownEvent) {
		console.log("maybeHasKeyboard: keyDownEvent.type=" + keyDownEvent.type + " keyDownCounter=" + keyDownCounter);
		if(keyDownEvent.type=="keydown") keyDownCounter++;
		
		// We are now pretty shure that the user has a keyboard
		//alertBox("Hiding virtual keyboard!");
		
		if(keyDownCounter > 0 && EDITOR.virtualKeyboard.isVisible) EDITOR.virtualKeyboard.hide();
		
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
		
		makeButton("@", 0);
		
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
				if(typeof click != "undefined" && click.target) click.target.setAttribute("class", "keyboardButton");
				for(var char in buttons) {
					if(buttons[char].alt) buttons[char].el.innerText = char;
				}
			}
			else {
				CAPS = true;
				
				if(typeof click != "undefined" && click.target) click.target.setAttribute("class", "keyboardButton on");
				
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
		
		makeButton(" Enter ", 2, function space(click) {
			click.target.blur();
			clearSelection();
			fireKey(13, "keydown");
		});
		
		makeButton("}", 2);
		
		
		
		// ### Third row
		
		makeButton("  space  ", 3, function space(click) {
			click.target.blur();
			clearSelection();
			fireKey(32, "keypress")
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
			fireKey(EDITOR.settings.autoCompleteKey, "keydown")
		});
		
		makeButton("<", 3);
		makeButton(">", 3);
		
		makeButton(",", 3);
		makeButton("!", 3);
		makeButton("?", 3);
		makeButton(":", 3);
		
		
		makeButton("|", 3);
		makeButton("&", 3);
		
		
		
		makeButton("Big", 2, biggerButtons, "misc");
		makeButton("Sml", 2, smallerButtons, "misc");
		
	}
	
	function biggerButtons() {
		resizeButtons(1.1)
	}
	
	function smallerButtons() {
		resizeButtons(.91)
	}
	
	function resizeButtons(percentage) {
		var kb = document.getElementById("virtualKeyboard");
		var b = kb.getElementsByTagName("button");
		
		for(var i=0, ow, oh; i<b.length; i++) {
			
			//console.log("Resizing button " + i + " (" + b[i].innerText + ") from " + b[i].offsetWidth + " to " + (parseInt(b[i].offsetWidth) * percentage) );
			if(b[i]) b[i].style.width= parseInt(b[i].offsetWidth) * percentage + "px";
			if(b[i]) b[i].style.height= parseInt(b[i].offsetHeight) * percentage + "px";
			}
			EDITOR.resizeNeeded();
		}
	
	function removeButtons() {
		for(var char in buttons) {
			EDITOR.virtualKeyboard.removeKey(buttons[char].el, buttons[char].row, buttons[char].group);
		}
	}
	
	function makeButton(char, row, ev, group) {
		
		if(group == undefined) group = GROUP;
		
		if(row == undefined) row = 0;
		
		var alt = (char.length == 1 && char != char.toUpperCase()) && char.toUpperCase();
		
		var click = function(e) {
				
				e.preventDefault();
				
				clearSelection();
				
				if(ev) ev(e);
				else {
				if(alt && CAPS) fireKey(alt.charCodeAt(0));
				else fireKey(char.charCodeAt(0));
				}
				
				b.style.marginTop = "2px";
			b.style.marginBottom = "-2px";
				setTimeout(function() {
					b.style.marginTop = "0px";
				b.style.marginBottom = "0px";
				}, 50);
				
				return false;
			}
		
		
		var b = document.createElement("button");
		b.setAttribute("class", "keyboardButton");
		b.innerText = char;
		//b.onclick = ev;
		
		b.addEventListener("click", click, true); // Prevent bubbling
		b.addEventListener("touchstart", click, true); // Prevent bubbling
		
		var pos = undefined;
		
		EDITOR.virtualKeyboard.addKey(b, row, pos, group);
		
		buttons[char] = {
			el: b,
			row: row,
			group: group,
			click: click // For testing
		};
		
		if(alt) buttons[char].alt = alt;
		
		return b;
	}
	
	function insertAtCaret(t, text) {
		/*
			The caret is lost when the element is blurred, eg when you push a button on the virtual keyboard.
			Solution: Save the caret posited every time the element blurs
		*/
		
		console.log("insertAtCaret: text=" + text);
		
		if(!t.onblur) {
			t.setAttribute("sTop", t.scrollTop);
			t.setAttribute("selStart", t.selectionStart);
			t.setAttribute("selEnd", t.selectionEnd);
t.onblur = function() {
				//console.log("Blur: update from " + this.getAttribute("selStart") + " to selStart=" + this.selectionStart + " ", this);
				this.setAttribute("sTop", this.scrollTop);
				this.setAttribute("selStart", this.selectionStart);
				this.setAttribute("selEnd", this.selectionEnd);
			}
			t.onclick = function() {
				//console.log("Click: update from " + this.getAttribute("selStart") + " to selStart=" + this.selectionStart + " ", this);
				this.setAttribute("sTop", this.scrollTop);
				this.setAttribute("selStart", this.selectionStart);
				this.setAttribute("selEnd", this.selectionEnd);
			}
		}
		
		var sTop = t.scrollTop || parseInt(t.getAttribute("sTop"));
		var selStart = t.selectionStart || parseInt(t.getAttribute("selStart"));
		var selEnd = t.selectionEnd || parseInt(t.getAttribute("selEnd"));
		
		if( typeof sTop != "number" || isNaN(sTop) ) {
			throw new Error("Unable to get scroll position! scrollTop=" + t.scrollTop + " attribute sTop=" + t.getAttribute("sTop") );
		}
		if( typeof selStart != "number" || isNaN(selStart) ){
			throw new Error("Unable to get caret position! selectionStart=" + t.selectionStart + " attribute selStart=" + t.getAttribute("selStart") );
		}
		if( typeof selEnd != "number" || isNaN(selEnd) ){
			throw new Error("Unable to get selection end! selectionEnd=" + t.selectionEnd + " attribute selEnd=" + t.getAttribute("selEnd") );
		}
		
		//console.log("selStart=" + selStart + " (" + t.getAttribute("sTop") + ")");
		
		var front = (t.value).substring(0, selStart);
		var back = (t.value).substring(selEnd, t.value.length);
		
		if(text == "\b") {
			t.value = front.slice(0, -1) + back;
			selStart = selStart - 1;
		}
		else {
			t.value = front + text + back;
			selStart = selStart + text.length;
		}
		
		t.selectionStart = selStart;
		t.selectionEnd = selStart;
		t.focus();
		t.scrollTop = sTop;
		
		t.setAttribute("sTop", sTop);
		t.setAttribute("selStart", selStart);
		t.setAttribute("selEnd", selStart);
		
	}
	
	function fireKey(charCode, eventType) {
		
		//event.preventDefault();
		
		console.log("fireKey: charCode=" + charCode + " eventType=" + eventType);
		
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
	
	
	// TEST-CODE-START
	// ### Test(s)
	
	EDITOR.addTest(function testInsertAtCaret(callback) {
		// Make sure the characters are inserted in the right order.
		
		var input = document.createElement("input");
		
		var footer = document.getElementById("footer");
		
		footer.appendChild(input);
		EDITOR.resizeNeeded();
		
		//input.blur();
		
		EDITOR.virtualKeyboard.show();
		
		
		// Seems we need an event to trigger the click event
		
		input.focus(); // Element needs to have focus *before* clicking on it for the click() event to trigger.
		
		input.setAttribute("placeholder", "Double Click here to trigger the test!");
		
		input.ondblclick = function() {
			
			buttons["a"].el.click();
			buttons["b"].el.click();
			buttons["c"].el.click();
			
			setTimeout(function() {
				
				if(input.value != "abc") throw new Error("Unexpected input.value=" + input.value);
				
				footer.removeChild(input);
				
				EDITOR.virtualKeyboard.hide();
				
				return callback(true);
				
			}, 0);
			
		}
		
		return;
		
		insertAtCaret(input, "a");
		
		setTimeout(function() {
			input.blur();
			insertAtCaret(input, "b");
			setTimeout(function() {
				input.blur();
				insertAtCaret(input, "c");
				setTimeout(function() {
					
					if(input.value != "abc") throw new Error("Unexpected input.value=" + input.value);
					
					footer.removeChild(input);
					
					return callback(true);
					
				}, 500);
			}, 500);
		}, 4500);
		
	}, 1);
	
	
	// TEST-CODE-END
	
})();
