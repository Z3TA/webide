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
	
*/

(function() {

	"use strict";
	
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext('2d');
	var pixelRatio = 1;
	var buttonWithToHeightRatio = 1.5;
	var buttonWidth = 10;
	var buttonHeight = 10;
	var capsLock = false;
	var buttonLocations = [];
	var buttons = [];
	var canvasWidth = 500;
	var canvasHeight = 200;
	var keyRows = 5;
	var maxButtonsPerRow = 10;
	var radius = 8;
	var margin = 4;
	var lineWidth = 1;
	var buttonsPerRow = [0,0,0,0,0,0];
	var verticalLayout = [];
	var horizontalLayout = [];
	
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
			
			EDITOR.on("afterResize", resizeVirtualKeyboard);
			
			addButtons();
			
			
			var footer = document.getElementById("footer");
			footer.appendChild(canvas);
			
		},
		unload: function unloadVirtualKeyboard() {
			
			EDITOR.removeEvent("mouseClick", keyboardPushbuttonDown);
			EDITOR.removeEvent("mouseClick", keyboardPushbuttonUp);
			
			EDITOR.removeEvent("afterResize", resizeVirtualKeyboard);
			
			footer.removeChild(canvas);
			
		}
	});
	
	
	function resizeVirtualKeyboard(file, windowWidth, windowHeight) {
		pixelRatio = window.devicePixelRatio || 1;
		
		if(windowWidth > windowHeight) {
			buttonWithToHeightRatio = 0.8;
			buttons = horizontalLayout;
buttonsPerRow = calcButtonsPerRow(buttons);
}
		else {
			buttonWithToHeightRatio = 1.5;
buttons = verticalLayout;
			buttonsPerRow = calcButtonsPerRow(buttons);
}


		canvasWidth = windowWidth;
		buttonWidth = Math.floor(canvasWidth / maxButtonsPerRow);
		buttonHeight = Math.floor(buttonWithToHeightRatio * buttonWidth);
		canvasHeight = buttonHeight * keyRows;
		
		canvas.width = canvasWidth * pixelRatio;
		canvas.height = canvasHeight * pixelRatio;
		
		// Setting the width and height will clear the canvas!
		
		radius = canvasWidth / 150; // Rounded corners
		margin = canvasWidth / 300;
		lineWidth = canvasWidth / 1500;
		
		ctx.restore();
		ctx.save();
		ctx.scale(pixelRatio,pixelRatio);
		//ctx.scale(1,1);
		
		ctx.textBaseline = "middle";
		ctx.font=  Math.floor(buttonHeight * 0.6)  + "px Arial";
		
		canvas.style.width=canvasWidth + "px";
		canvas.style.height=canvasHeight + "px";
		
		
		console.log("resizeVirtualKeyboard: canvasWidth=" + canvasWidth + " buttonWidth=" + buttonWidth + " canvasHeight=" + canvasHeight + " buttonHeight=" + buttonHeight);
		
		renderVirtualKeyboard();
		
	}
	
	function renderVirtualKeyboard() {
		
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
		
		// ### Button backgrounds
		
		ctx.fillStyle = "blue";
		ctx.strokeStyle="white";
		ctx.lineWidth=lineWidth;
		for (var i=0; i<buttons.length; i++) {
			
			startX = Math.floor( (canvasWidth - buttonsPerRow[buttons[i].row] * buttonWidth) / 2 );
			
			x1 = startX + buttons[i].col * buttonWidth - buttonWidth + margin;
			y1 = buttons[i].row * buttonHeight - buttonHeight + margin;
			
			x2 = startX + buttons[i].col * buttonWidth - margin*2;
			y2 = buttons[i].row * buttonHeight - margin*2;
			
			cX = startX + buttons[i].col * buttonWidth - buttonWidth/2 - margin;
			cY = buttons[i].row * buttonHeight - buttonHeight/2 - margin;
			
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
			gradient.addColorStop(1,"black");
			ctx.fillStyle=gradient;
			
			ctx.fill(); // Fill the path with rounded corners
			ctx.stroke();
			
			//ctx.fillRect(cX-buttonWidth/2+margin, cY-buttonHeight/2+margin, buttonWidth-margin*2, buttonHeight-margin*2);
			
			//ctx.drawImage(canvas, m, m, buttonWidth, buttonHeight, cX-buttonWidth/2+m, cY-buttonHeight/2+m, buttonWidth, buttonHeight);
		}
		
		
		// ### Button letters
		ctx.fillStyle = "#FFFFFF";
		ctx.textAlign = "center";
		
		buttonLocations.length = 0;
		
		
		ctx.beginPath();
		ctx.lineWidth="1";
		ctx.strokeStyle="red";
		
		for (var i=0; i<buttons.length; i++) {
			
			startX = Math.floor( (canvasWidth - buttonsPerRow[buttons[i].row] * buttonWidth) / 2 );
			
			cX = startX + buttons[i].col * buttonWidth - buttonWidth/2 - margin;
			cY = buttons[i].row * buttonHeight - buttonHeight/2 - margin;
			
			buttonLocations.push({id: i, x: cX, y: cY});
			
			//ctx.rect(cX-buttonWidth/2+margin, cY-buttonHeight/2+margin, buttonWidth-margin*2, buttonHeight-margin*2);
			
			ctx.fillText(buttons[i].char, cX, cY);
		}
		ctx.stroke();
		buttonLocations.sort(sortLocationsX);
		
	}
	
	function sortLocationsX(a, b) {
		if(a.x > b.x) return -1;
		else if(b.x > a.x) return 1;
		else return 0; 
	}
	
	
	function calcButtonsPerRow() {
		return [0,0,0,0,0,0];
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
		
		fireKey(capsLock ? button.charCodeCaps : button.charCode);
		
		return false;
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
		var row = 1;
		var orientation = "vertical";
		
		add("@");
		
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
		
		add("back", 0, function space(click) {
			click.target.blur();
			clearSelection();
			fireKey(8, "keydown");
			return false;
		});
		
		add("-", 0);
		add("+", 0);
		
		add("#", 0);
		
		
		
		// ## Vertical
		var row = 1;
		var orientation = "vertical";
		
		add("1");
		add("2");
		add("3");
		add("4");
		add("5");
		add("6");
		add("7");
		add("8");
		add("9");
		
		add("Q", 3, 1);
		add("W", 3, 2);
		add("E", 3, 3);
		add("R", 3, 4);
		add("T", 3, 5);
		add("Y", 3, 6);
		add("U", 3, 7);
		add("I", 3, 8);
		add("O", 3, 9);
		add("P", 3, 10);
		
		
		add(")", 3, 11);
		add("{", 3, 12);
		add("}", 3, 13);
		add("'", 3, 14);
		add('"', 3, 15);
		
		
		add("A", 4, 1);
		add("S", 4, 2);
		add("D", 4, 3);
		add("F", 4, 4);
		add("G", 4, 5);
		add("H", 4, 6);
		add("J", 4, 7);
		add("K", 4, 8);
		add("L", 4, 9);
		
		add("Z", 5, 1);
		add("X", 5, 2);
		add("C", 5, 3);
		add("V", 5, 4);
		add("B", 5, 5);
		add("N", 5, 6);
		add("M", 5, 7);
		
		maxButtonsPerRow = Math.max(buttonsPerRow[0], buttonsPerRow[1], buttonsPerRow[2], buttonsPerRow[3], buttonsPerRow[4], buttonsPerRow[5]);
		
		
		function add(char, row, col) {
			var lowerCase = char.toLowerCase();
			var upperCase = char.toUpperCase();
			var charCode = lowerCase.charCodeAt(0);
			var charCodeCaps = upperCase.charCodeAt(0);
			buttons.push({
				char: char, 
				charCode: charCode, 
				charCodeCaps: charCodeCaps, 
				row: row, 
				col: col
			});
			buttonsPerRow[row]++;
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