/*
	
	Reason for making a canvas based virtual keyboard instead of a html-button's based:
	* Slighly faster to render
	* Can be rendered on-top of the main canvas, where html elements on-top of a canvas will slow down rendering.
	* Easier to ajust buttons so they fill the whole screen, compared to CSS and old browser support
	
	Problem: Smartphone screens are way too small for touch typing. 4x9 buttons work great, but it gets problematic if you need 5x20
	Solution: Use a stulys !? Not many mobile phones support a stylus though
	
	Problem: The virtual keyboard is too large to fit on the screen.
	Solution: Hide the file tabs while the virtual keyboard is visible !?
	
	
	Q: Why not use the device's keyboard !?
	A: Programming on it is a pain as keys souch as {[]}" is hard to reach
	
	Note: We will need two views: one for when the device is in horizontal, and one for when it's vertical!
	
	Problem: When a widget is fired, there's simply no more space available, can't have both the keyboard and the widget visible at the same time.
	
	
	Problem: When clicking on an input element inside a widget, the device wants to bring up the devices's virtual keyboard
	
	Long-press: Inserts the character, then auto-complete
	
	
	
*/

(function() {

	"use strict";
	
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext('2d', {alpha: false, antialias: false});
	var pixelRatio = 1;
	var buttonWithToHeightRatio = 1.5;
	var buttonWidth = 10;
	var buttonHeight = 10;
	var CAPS = false;
	var buttonLocations = [];
	var buttons = [];
	var canvasWidth = 500;
	var canvasHeight = 200;
	var maxButtonsPerRow = 10;
	var radius = 8;
	var margin = 4;
	var lineWidth = 1;
	var buttonsPerRow = [0,0,0,0,0,0];
	var verticalLayout = [];
	var horizontalLayout = [];
	var totalRows = 3;
	var ACTIVE = false;
	var menuItem;
	// Each key can have 3 alternative functions, depending if alt1, alt2 or both alt1 and alt2 is active
	var ALT1 = false;
	var ALT2 = false;
	
	
	canvas.onmousedown = canvasMouseDown;
	canvas.onmouseup = canvasMouseUp;
	canvas.ontouchstart = canvasMouseDown;
	canvas.ontouchend = canvasMouseUp;
	
	
	
	
	
	EDITOR.plugin({
		desc: "Testing canvas based virtual keyboard",
		load: function loadVirtualKeyboard() {
			
			// Wait for touch events before showing the virtual keyboard
			EDITOR.addEvent( "mouseClick", {dir: "down", fun: keyboardPushbuttonDown, targetClass:"fileCanvas", order: 10} );
			EDITOR.addEvent( "mouseClick", {dir: "up", fun: keyboardPushbuttonUp, targetClass:"fileCanvas", order: 10} );
			
			EDITOR.on("beforeResize", virtualKeyboardClaimHeight);
			EDITOR.on("afterResize", resizeVirtualKeyboard);
			
			
			addButtons();
			
			menuItem = EDITOR.addMenuItem("Virtual Keyboard 2", toggleVirtualKeyboard2, 26);
			
			toggleVirtualKeyboard2();
			
			var wrapper = document.getElementById("virtualKeyboard2");
			
			
			
			//wrapper.setAttribute("style", "border: 2px solid red; overflow: hide;");
			
			wrapper.appendChild(canvas);
			
		},
		unload: function unloadVirtualKeyboard() {
			
			EDITOR.removeEvent("mouseClick", keyboardPushbuttonDown);
			EDITOR.removeEvent("mouseClick", keyboardPushbuttonUp);
			
			EDITOR.removeEvent("beforeResize", virtualKeyboardClaimHeight);
			EDITOR.removeEvent("afterResize", resizeVirtualKeyboard);
			
			toggleVirtualKeyboard2(false);
			
			EDITOR.removeMenuItem(menuItem);
			
			var wrapper = document.getElementById("virtualKeyboard2");
			wrapper.removeChild(canvas);
			
		}
	});
	
	function toggleVirtualKeyboard2(state) {
		var oldState = ACTIVE;
		
		if(typeof state == "boolean") {
			ACTIVE = state;
		}
		
		ACTIVE = !ACTIVE;
		
		var wrapper = document.getElementById("virtualKeyboard2");
		
		if(ACTIVE && !oldState) {
			wrapper.style.display="block";
		}
		else if(!ACTIVE && oldState) {
			wrapper.style.display="none";
		}
		
		if(oldState != ACTIVE) {
EDITOR.resizeNeeded();
			EDITOR.updateMenuItem(menuItem, ACTIVE);
		}
		
		return ACTIVE;
	}
	
	
	
	
	function virtualKeyboardClaimHeight(file, windowWidth, windowHeight) {
		
		/*
			Claim the height needed
		*/
		
		
		
		if(windowWidth > windowHeight) {
			var orientation = "horizontal";
			buttonWithToHeightRatio = 0.8;
			buttons = horizontalLayout;
buttonsPerRow = calcButtonsPerRow(buttons);
}
		else {
			var orientation = "vertical";
			buttonWithToHeightRatio = 1.7;
buttons = verticalLayout;
			buttonsPerRow = calcButtonsPerRow(buttons);
}

		if(buttons.length == 0) throw new Error("No buttons found! windowWidth=" + windowWidth + " windowHeight=" + windowHeight + " (orientation=" + orientation + ") horizontalLayout.length=" + horizontalLayout.length + " verticalLayout.length=" + verticalLayout.length);
		if(buttonsPerRow[0] == 0) throw new Error("First row has no buttons! buttonsPerRow=" + JSON.stringify(buttonsPerRow) + " buttons=" + JSON.stringify(buttons, null, 2));
		if(buttonsPerRow[1] == 0) throw new Error("Second row has no buttons! buttonsPerRow=" + JSON.stringify(buttonsPerRow) + " buttons=" + JSON.stringify(buttons, null, 2));
		if(buttonsPerRow[2] == 0) throw new Error("Third row has no buttons! buttonsPerRow=" + JSON.stringify(buttonsPerRow) + " buttons=" + JSON.stringify(buttons, null, 2));
		
		console.log("maxButtonsPerRow=" + maxButtonsPerRow);
		console.log("buttonsPerRow=" + JSON.stringify(buttonsPerRow));
		console.log("totalRows=" + totalRows);
		
		canvasWidth = windowWidth;
		buttonWidth = canvasWidth / maxButtonsPerRow;
		buttonHeight = buttonWithToHeightRatio * buttonWidth;
		canvasHeight = buttonHeight * totalRows;
		
		
		
		
		radius = canvasWidth / 150; // Rounded corners
		margin = canvasWidth / 300;
		lineWidth = canvasWidth / 1500;
		
		
		var wrapper = document.getElementById("virtualKeyboard2");
		wrapper.style.width=canvasWidth + "px";
		wrapper.style.height=canvasHeight + "px";
		
		
		EDITOR.virtualKeyboardHeight = canvasHeight;
		
		console.log("virtualKeyboardClaimHeight: canvasWidth=" + canvasWidth + " buttonWidth=" + buttonWidth + " canvasHeight=" + canvasHeight + " buttonHeight=" + buttonHeight);
		
	}
	
	function resizeVirtualKeyboard(file, windowWidth, windowHeight) {
		
		// debug
		var wrapper = document.getElementById("virtualKeyboard2");
		var wrapperBefore = wrapper.offsetWidth + "x" + wrapper.offsetHeight;
		
		var pixelRatio = window.devicePixelRatio || 1;
		
		canvas.width = canvasWidth * pixelRatio;
		canvas.height = canvasHeight * pixelRatio;
		// Setting the width and height will clear the canvas!
		ctx.restore();
		ctx.save();
		ctx.scale(pixelRatio,pixelRatio);
		//ctx.scale(1,1);
		ctx.textBaseline = "middle"; // Will also be reset when setting canvas.width!
		
		canvas.style.width=canvasWidth + "px";
		canvas.style.height=canvasHeight + "px";
		
		renderVirtualKeyboard();
		
		// debug
		var wrapperAfter = wrapper.offsetWidth + "x" + wrapper.offsetHeight;
		console.log("resizeVirtualKeyboard: pixelRatio=" + pixelRatio + " windowWidth=" + windowWidth + " windowHeight=" + windowHeight + " actual window size=" + window.innerWidth + "x" + window.innerHeight + " canvasWidth=" + canvasWidth + " canvasHeight=" + canvasHeight + " wrapperBefore=" + wrapperBefore + " wrapperAfter=" + wrapperAfter);
	}
	
	
	function calcButtonsPerRow(buttons) {
		
		if(buttons.length == 0) throw new Error("buttons.length=" + buttons.length);
		
		var buttonsPerRow = [0,0,0,0,0,0];
		
		for (var i=0; i<buttons.length; i++) {
			buttonsPerRow[buttons[i].row] += buttons[i].width;
		}
		
		for (var i=0; i<buttonsPerRow.length; i++) {
			if(buttonsPerRow[i] == 0) {
totalRows = i;
				break;
			}
		}
		
		maxButtonsPerRow = Math.max(buttonsPerRow[0], buttonsPerRow[1], buttonsPerRow[2], buttonsPerRow[3], buttonsPerRow[4], buttonsPerRow[5]);
		
		if(maxButtonsPerRow == 0) throw new Error("maxButtonsPerRow=" + maxButtonsPerRow + " buttonsPerRow=" + JSON.stringify(buttonsPerRow));
		if(isNaN(maxButtonsPerRow)) throw new Error("maxButtonsPerRow=" + maxButtonsPerRow + " buttonsPerRow=" + JSON.stringify(buttonsPerRow));
		
		return buttonsPerRow;
		
	}
	
	function renderVirtualKeyboard() {
		/*
			
			Optimization: Measured when clicking ALt keys
			Naive/Original: 1.4 - 2.6 ms on Chrome
			Cache background: 1.9 - 3.5 on Chrome. Huh? Seems like copying from another canvas cost a lot!
			Use translate: 
		*/
		console.time("renderVirtualKeyboard");
		
		if(buttons.length == 0) throw new Error("buttons.length=" + buttons.length);
		
		/*
			if(pixelRatio !== 1) {
			ctx.restore();
			ctx.save();
			ctx.scale(pixelRatio,pixelRatio);
			//ctx.scale(1,1);
			}
		*/
		
		// Background
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		var cX = 0;
		var cY = 0;
		var x1 = 0;
		var y1 = 0;
		var x2 = 0;
		var y2 = 0;
		var gradient;
		var startX = 0;
		var accumulatedWidth = 0;
		var lastRow = 0;
		
		// ### Button backgrounds
		
		ctx.strokeStyle="white";
		ctx.lineWidth=lineWidth;
		
		for (var i=0; i<buttons.length; i++) {
			
			if(buttons[i].row != lastRow) {
				lastRow = buttons[i].row;
				accumulatedWidth = 0;
			}
			
			startX = (canvasWidth - (buttonsPerRow[buttons[i].row]) * buttonWidth) / 2;
			
			x1 = startX + accumulatedWidth + margin;
			y1 = (buttons[i].row+1) * buttonHeight - buttonHeight + margin;
			
			x2 = startX + accumulatedWidth + buttons[i].width*buttonWidth - margin*2;
			y2 = (buttons[i].row+1) * buttonHeight - margin*2;
			
			accumulatedWidth += buttons[i].width * buttonWidth;
			
			//cX = startX + buttons[i].col * buttonWidth - buttonWidth/2 - margin;
			//cY = (buttons[i].row+1) * buttonHeight - buttonHeight/2 - margin;
			
			// A path with rounded corners
			ctx.beginPath();
			ctx.moveTo(x1 + radius, y1);
			ctx.lineTo(x2 - radius, y1);
			ctx.quadraticCurveTo(x2, y1, x2, y1 + radius);
			ctx.lineTo(x2, y2 - radius);
			ctx.quadraticCurveTo(x2, y2, x2 - radius, y2);
			ctx.lineTo(x1 + radius, y2);
			ctx.quadraticCurveTo(x1, y2, x1, y2 - radius);
			ctx.lineTo(x1, y1 + radius);
			ctx.quadraticCurveTo(x1, y1, x1 + radius, y1);
			ctx.closePath();
			
			
			// A gradient background
			//gradient=ctx.createLinearGradient(cX-buttonWidth/2, cY-buttonHeight/2, buttonWidth, buttonHeight);
			gradient=ctx.createLinearGradient(x2, y1, x2, y2);
			gradient.addColorStop(0,"#656565");
			
			if(ALT1 && ALT2 && buttons[i].highlightAlt3) gradient.addColorStop(1,"orange");
			else if(ALT1 && buttons[i].highlightAlt1) gradient.addColorStop(1,"green");
			else if(ALT2 && buttons[i].highlightAlt2) gradient.addColorStop(1,"yellow");
			else gradient.addColorStop(1,"black");
			
			ctx.fillStyle=gradient;
			
			ctx.fill(); // Fill the path with rounded corners
			ctx.stroke();
			
			//ctx.fillRect(cX-buttonWidth/2+margin, cY-buttonHeight/2+margin, buttonWidth-margin*2, buttonHeight-margin*2);
			
			//ctx.drawImage(canvas, m, m, buttonWidth, buttonHeight, cX-buttonWidth/2+m, cY-buttonHeight/2+m, buttonWidth, buttonHeight);
		}
		
		// ### Button letters
		ctx.fillStyle = "#FFFFFF";
		ctx.textAlign = "center";
		ctx.font=  Math.floor(buttonHeight * 0.6)  + "px Arial";
		
		buttonLocations.length = 0;
		
		
		ctx.beginPath();
		ctx.lineWidth="1";
		ctx.strokeStyle="red";
		
		//var textWidth = 0;
		var text = "";
		for (var i=0; i<buttons.length; i++) {
			
			startX = (canvasWidth - buttonsPerRow[buttons[i].row] * buttonWidth) / 2;
			
			ctx.font = Math.floor(buttonHeight * 0.6 * buttons[i].textSize)  + "px Arial";
			//textWidth = ctx.measureText(comment.count.toString()).width;
			
			if(buttons[i].row != lastRow) {
				lastRow = buttons[i].row;
				accumulatedWidth = 0;
			}
			
			cX = startX + accumulatedWidth + buttonWidth*buttons[i].width/2 - margin/2;
			cY = (buttons[i].row+1) * buttonHeight - buttonHeight/2 - margin/2;
			
			accumulatedWidth += buttons[i].width * buttonWidth;
			
			buttonLocations.push({id: i, x: cX, y: cY});
			
			//ctx.rect(cX-buttonWidth/2+margin, cY-buttonHeight/2+margin, buttonWidth-margin*2, buttonHeight-margin*2);
			
			if(CAPS && buttons[i].charCodeCaps != buttons[i].charCode) {
				text = String.fromCharCode(buttons[i].charCodeCaps);
			}
			else if(ALT1 && ALT2 && buttons[i].alt3) {
				text = buttons[i].alt3;
			}
			else if(ALT1 && buttons[i].alt1) {
				text = buttons[i].alt1;
			}
			else if(ALT2 && buttons[i].alt2) {
				text = buttons[i].alt2;
			}
			else {
				text = buttons[i].char
			}
			
			ctx.fillText(text, cX, cY);
		}
		ctx.stroke();
		buttonLocations.sort(sortLocationsX);
		
		
		console.timeEnd("renderVirtualKeyboard");
	}
	
	function sortLocationsX(a, b) {
		if(a.x > b.x) return -1;
		else if(b.x > a.x) return 1;
		else return 0; 
	}
	
	function canvasMouseDown(mouseDownEvent) {
		
		mouseDownEvent.preventDefault();
		mouseDownEvent.stopPropagation();
		
		if (navigator.vibrate) {
			// vibration API supported
			navigator.vibrate(50);
		}
		EDITOR.beep(0.1, 120, "sine", 39);
		return false;
	}
	
	function canvasMouseUp(mouseUpEvent) {
		
		mouseUpEvent.preventDefault();
		mouseUpEvent.stopPropagation();
		
		var click = getMouseLocation(mouseUpEvent);
		
		// Locations are sorted in X axis
		for (var i=0; i<buttonLocations.length; i++) {
			
			console.log("click.x=" + click.x + " click.y=" + click.y + " button.x=" + buttonLocations[i].x + " button.y=" + buttonLocations[i].y + " buttonWidth=" + buttonWidth + " buttonHeight=" + buttonHeight + " ");
			
			if( click.x > (buttonLocations[i].x - buttonWidth/2)  &&  click.x < (buttonLocations[i].x + buttonWidth/2) && 
			click.y > (buttonLocations[i].y - buttonHeight/2)  &&  click.y < (buttonLocations[i].y + buttonHeight/2) ) return clickButton(buttonLocations[i].id);
		}
		
		return true;
	}
	
	
	function clickButton(id) {
		
		//EDITOR.renderColumn(EDITOR.currentFile.caret.row, EDITOR.currentFile.caret.col, "X", EDITOR.settings.style.textColor);
		//file.putCharacter("X");
		//EDITOR.renderRow();
		
		var button = buttons[id];
		
		button.fun();
		
		return false;
	}
	
	// Buttons that have a function specified need to handle ALT1, ALT2, ALT2 && ALT2, and CAPS in that function
	// If ALT is a special function, the key need to have a function specified.
	function normalButtonClick() {
		var button  = this;
		if(ALT1 && ALT2 && button.alt3) fireKey( button.alt3.charCodeAt(0) );
		else if(ALT1 && button.alt1) fireKey( button.alt1.charCodeAt(0) );
		else if(ALT2 && button.alt2) fireKey( button.alt2.charCodeAt(0) );
		else fireKey(CAPS ? button.charCodeCaps : button.charCode);
	}
	
	function fireKey(charCode, eventType) {
		
		//event.preventDefault();
		
		console.log("fireKey: charCode=" + charCode + " eventType=" + eventType +
		" document.activeElement: id=" + document.activeElement.id + " node=" + document.activeElement.nodeName +
		" EDITOR.lastElementWithFocus: id=" + EDITOR.lastElementWithFocus.id + " node=" + EDITOR.lastElementWithFocus.nodeName);
		
		if(eventType == undefined) eventType = "keypress";
		
		var el = document.activeElement;
		
		//if(document.activeElement != EDITOR.lastElementWithFocus) el = EDITOR.lastElementWithFocus;
		
		console.log("el: id=" + el.id + " node=" + el.nodeName + " type=" + el.type);
		
		// If a input or textarea element had focus, send it the character!
		if(el &&   (( el.nodeName == "INPUT" &&  (el.type == "text" || el.type == "password") ) || el.nodeName == "TEXTAREA")) {
			
			insertAtCaret(el, String.fromCharCode(charCode));
			
			el.focus();
		}
		else {
			
			EDITOR.input = true;
			var doDefaultAction = EDITOR.mock( eventType, { charCode: charCode } );
			
			console.log("eventType=" + eventType + " doDefaultAction=" + doDefaultAction);
			
		}
		
	}
	
	function insertAtCaret(t, text) {
		/*
			The caret is lost when the element is blurred, eg when you push a button on the virtual keyboard.
			Solution: Save the caret posited every time the element blurs
		*/
		
		console.log("insertAtCaret: text=" + text + " Element: id=" + t.id);
		
		var sTop = t.scrollTop || parseInt(t.getAttribute("sTop"));
		var selStart = t.selectionStart || parseInt(t.getAttribute("selStart"));
		var selEnd = t.selectionEnd || parseInt(t.getAttribute("selEnd"));
		
		if( typeof selStart != "number" || isNaN(selStart) ){
			throw new Error("Unable to get caret position for element id=" + t.id + " selectionStart=" + t.selectionStart + " attribute selStart=" + t.getAttribute("selStart") );
		}
		if( typeof selEnd != "number" || isNaN(selEnd) ){
			throw new Error("Unable to get selection end for element id=" + t.id + " selectionEnd=" + t.selectionEnd + " attribute selEnd=" + t.getAttribute("selEnd") );
		}
		if( typeof sTop != "number" || isNaN(sTop) ) {
			throw new Error("Unable to get scroll position for element id=" + t.id + " scrollTop=" + t.scrollTop + " attribute sTop=" + t.getAttribute("sTop") );
		}
		
		//console.log("selStart=" + selStart + " (" + t.getAttribute("sTop") + ")");
		
		var front = (t.value).substring(0, selStart);
		var back = (t.value).substring(selEnd, t.value.length);
		
		if(text == "\b") {
			console.log("Deleting character: " + front.slice(-1) + " at selStart=" + selStart);
			t.value = front.slice(0, -1) + back;
			selStart = selStart - 1;
		}
		else {
			console.log("Adding character(s): " + text + " at selStart=" + selStart);
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
		
		if(EDITOR.settings.devMode) {
			// Sanity check
			var sTop = t.scrollTop || parseInt(t.getAttribute("sTop"));
			var selStart = t.selectionStart || parseInt(t.getAttribute("selStart"));
			var selEnd = t.selectionEnd || parseInt(t.getAttribute("selEnd"));
			
			if( typeof selStart != "number" || isNaN(selStart) ){
				throw new Error("Nuked selectionStart for element id=" + t.id + " selectionStart=" + t.selectionStart + " attribute selStart=" + t.getAttribute("selStart") );
			}
			if( typeof selEnd != "number" || isNaN(selEnd) ){
				throw new Error("Nuked selection end for element id=" + t.id + " selectionEnd=" + t.selectionEnd + " attribute selEnd=" + t.getAttribute("selEnd") );
			}
			if( typeof sTop != "number" || isNaN(sTop) ) {
				throw new Error("Nuked scroll position for element id=" + t.id + " scrollTop=" + t.scrollTop + " attribute sTop=" + t.getAttribute("sTop") );
			}
		}
		
	}
	
	
	function addButtons() {
		
		
		buttonsPerRow = [0,0,0,0,0,0];
		
		
		// ## Horizontal
		var row = 0;
		var col = 0;
		var orientation = "horizontal";
		
		add("1");
		add("2");
		add("3");
		add("4");
		add("5");
		add("6");
		add("7");
		add("8");
		add("9");
		add("0");
		
		add("(");
		add(")");
		
		add("[");
		add("]");
		
		add("back", {
			fun: function space(click) {
			fireKey(8, "keydown");
			return false;
		},
			charCode: 8,
			width: 2,
			textSize: 0.8
		});
		
		
		add("-");
		add("+");
		
		add("#");
		
		
		// ### Horizontal second row
		row = 1;
		col = 0
		
		add("@");
		add("q");
		add("w");
		add("e");
		add("r");
		add("t");
		add("y");
		add("u");
		add("i");
		add("o");
		add("p");
		add("å");
		
		add("=");
		
		add("'");
		add('"');
		
		add("/");
		add("*");
		add("%");
		add("~");
		
		
		// ### Horizontal third row
		row = 2;
		col = 0
		
		add("CAPS", {
fun: function capsLock(click) {
				CAPS = !CAPS;
				renderVirtualKeyboard();
			},
			charCode: -1,
			width: 1.5,
			textSize: 0.6
});
		
		add("a");
		add("s");
		add("d");
		add("f");
		add("g");
		add("h");
		add("j");
		add("k");
		add("l");
		add("ö");
		add("ä");
		
		add(".");
		
		add(";");
		
		add("{");
		
		add("Enter", {
fun: function space(click) {
				fireKey(13, "keydown");
			},
			charCode: 13,
			width: 1.5,
			textSize: 0.8
		});
		
		add("}");
		
		add("\\");
		
		
		// ### Horizontal fourth row
		row = 3;
		col = 0
		
		add("^");
		
		add("&");
		
		
		add("z");
		add("x");
		add("c");
		add("v");
		add("b");
		add("n");
		add("m");
		
		add("space", {
			charCode: 32,
			width: 1.5,
			textSize: 0.8
});
		
		add("compl", {
fun: function space(click) {
				fireKey(EDITOR.settings.autoCompleteKey, "keydown");
			},
			charCode: -1,
			width: 1.5,
			textSize: 0.8
});
		
		add("<");
		add(">");
		
		add(",");
		add("!");
		add("?");
		add(":");
		
		
		add("|");
		
		
		
		
		
		
		
		
		
		
		
		
		
		// ## Vertical
		row = 0;
		col = 0
		orientation = "vertical";
		
		/*
			
			
			add("1");
		add("2");
		add("3");
		add("4");
		add("5");
		add("6");
		add("7");
		add("8");
		add("9");
			add("0");
		*/
		
		// ### Vertical first row
		row = 0;
		col = 0
		
		add("q", {alt1: "1"});
		add("w", {alt1: "2"});
		add("e", {alt1: "3"});
		add("r", {alt1: "4"});
		add("t", {alt1: "5"});
		add("y", {alt1: "6"});
		add("u", {alt1: "7"});
		add("i", {alt1: "8"});
		add("o", {alt1: "9"});
		add("p", {alt1: "0"});
		
		add("back", {
			fun: function space(click) {
				fireKey(8, "keydown");
				return false;
			},
			charCode: 8,
			width: 1,
			textSize: 0.3,
		});
		
		
		// ### Vertical second row
		row = 1;
		col = 0
		
		add("CAPS", {
			fun: function capsLock(click) {
				CAPS = !CAPS;
				if(CAPS) {
					ALT1 = false;
					ALT2 = false;
				}
				renderVirtualKeyboard();
			},
			charCode: -1,
			width: 1,
			textSize: 0.3
		});
		
		add("a");
		add("s");
		add("d");
		add("f");
		add("g");
		add("h");
		add("j");
		add("k", {alt2: "{"});
		add("l", {alt2: "}"});
		
		add("space", {
			fun: function space(click) {
				if(ALT2) fireKey(13, "keydown"); // Enter
				else fireKey(32, "keypress"); // space
			},
			charCode: 32,
			width: 1,
			textSize: 0.3,
			alt2: "Enter"
		});
		
		
		
		// ### Vertical third row
		row = 2;
		col = 0;
		
		add("Alt-1", {
			fun: function alternate1() {
				ALT1=!ALT1;
				CAPS = false;
				renderVirtualKeyboard();
			},
			charCode: -1,
			highlightWhenActive: true,
			width: 1.5,
			textSize: 0.6,
			highlightAlt1: true,
			highlightAlt3: true
		});
		
		add("z");
		add("x");
		add("c");
		add("v");
		add("b");
		add("n");
		add("m");
		add(".", {alt1: '"', alt2: ","});
		
		add("Alt-2", {
			fun: function alternate1() {
				ALT2=!ALT2;
				renderVirtualKeyboard();
			},
			charCode: -1,
			highlightWhenActive: true,
			width: 1.5,
			textSize: 0.6,
			highlightAlt2: true,
			highlightAlt3: true
		});
		
		
		
		
		function add(char, options) {
			
			console.log("Adding virtual keyboard key: char=" + char + " orientation=" + orientation);
			
			if(options == undefined) options = {};
			
			var lowerCase = char.toLowerCase();
			var upperCase = char.toUpperCase();
			var charCode = lowerCase.charCodeAt(0);
			var charCodeCaps = upperCase.charCodeAt(0);
			var buttons = orientation == "horizontal" ? horizontalLayout : verticalLayout;
			
			if(options.charCode && !options.charCodeCaps) options.charCodeCaps = options.charCode;
			
			buttons.push({
				char: char, 
				charCode: options.charCode || charCode, 
				charCodeCaps: options.charCodeCaps || charCodeCaps, 
				row: options.row || row, 
				col: options.col || ++col,
				width: options.width || 1,
				textSize: options.textSize || 1,
				fun: options.fun || normalButtonClick,
				alt1: options.alt1,
				alt2: options.alt2,
				alt3: options.alt3,
				highlightAlt1: options.highlightAlt1 || false,
				highlightAlt2: options.highlightAlt2 || false,
				highlightAlt3: options.highlightAlt3 || false
			});
		}
		
	}
	
	function removeButtons() {
		
	}
	
	
	
	function getMouseLocation(mouseEvent) {
		
		// Mouse position is on the current element (most likely Canvas)
		var mouseX = mouseEvent.offsetX==undefined?mouseEvent.layerX:mouseEvent.offsetX;
		var mouseY = mouseEvent.offsetY==undefined?mouseEvent.layerY:mouseEvent.offsetY;
		
		var badLocation = mouseX == undefined || mouseY == undefined || mouseX <= 0 || mouseY <= 0;
		
		if(mouseEvent.changedTouches && badLocation) {
			
			mouseX = Math.round(mouseEvent.changedTouches[mouseEvent.changedTouches.length-1].pageX); // pageX
			mouseY = Math.round(mouseEvent.changedTouches[mouseEvent.changedTouches.length-1].pageY);
			
			// The editor doesn't allow scrolling, so pageX is thus the same as clientX !
			
			// Touch events only have pageX which is the whole page. We only want the position on the canvas !?
			var rect = canvas.getBoundingClientRect();
			//console.log(rect.top, rect.right, rect.bottom, rect.left);
			mouseX = mouseX - rect.left;
			mouseY = mouseY - rect.top;
		}
		
		return {x: mouseX, y: mouseY};
	}
	
	
	function keyboardPushbuttonDown (mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseUpEvent) {
		return true;
		if(mouseY > 50) return true;
		else {
			if(vibrate) vibrate(50);
			EDITOR.beep(0.1, 120, "sine", 39);
			return false;
		}
	}
	
	function keyboardPushbuttonUp(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseUpEvent) {
		return true;
		if(mouseY > 50) return true;
		
		var file = EDITOR.currentFile;
		if(!file)  return true;
		
		//EDITOR.renderColumn(EDITOR.currentFile.caret.row, EDITOR.currentFile.caret.col, "X", EDITOR.settings.style.textColor);
		EDITOR.mock("keypress", {charCode: 65});
		//file.putCharacter("X");
		//EDITOR.renderRow();
		
		return false;
		}
	
	
	
})();