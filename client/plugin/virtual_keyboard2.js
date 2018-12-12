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
	
	We tried having alt-keys, but typing was too slow, where alt keys required 3 key presses.
	
	Most common characters, beside the normal latin letters:
	space=6772002 
	Enter=986014 
	,=679396 
	.=591280 
	)=506646 
	(=506640 
	==456621 
	"=378701 
	;=374216 
	/=284895 
	0=275398 
	'=265540 
	-=224118 
	1=206276 
	{=203136 
	}=202922 
	_=198407 
	:=195979 
	=165540 
	2=154382 
	*=129766 
	+=123478 
	3=119448 
	[=99911 
	]=99547 
	4=99258 
	5=97924 
	6=89885 
	7=81554 
	8=79697 
	9=71607 
	\=69728 
	&=68828 
	>=57232 
	<=56023 
	!=55563 
	|=51660 
	`=33476 
	?=29721 
	@=24256 
	$=17894 
	%=12639 
	#=10033 
	^=4949  
	
	Don't forget about the clipboard!
	
	Split keyboard!?
	
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
	var clickTimer;
	var customAltKeys = [];
	var MY_NAME = "virtual_keyboard2";
	var oldCanvasHeight = 0; // Optimization: Don't resize and re-render if the size is the same as before
	
	canvas.onmousedown = canvasMouseDown;
	canvas.onmouseup = canvasMouseUp;
	canvas.ontouchstart = canvasMouseDown;
	canvas.ontouchend = canvasMouseUp;
	
	
	EDITOR.plugin({
		desc: "Testing canvas based virtual keyboard",
		load: function loadVirtualKeyboard() {
			
			// Wait for touch events before showing the virtual keyboard
			EDITOR.addEvent( "mouseClick", {dir: "down", fun: keyboardPushbuttonDown, targetClass:"fileCanvas", order: 1000} );
			EDITOR.addEvent( "mouseClick", {dir: "up", fun: keyboardPushbuttonUp, targetClass:"fileCanvas", order: 1000} );
			
			EDITOR.on("beforeResize", virtualKeyboardClaimHeight);
			EDITOR.on("afterResize", resizeVirtualKeyboard);
			EDITOR.on("hideVirtualKeyboard", hideVirtualKeyboard2);
			EDITOR.on("showVirtualKeyboard", showVirtualKeyboard2);
			
			addButtons();
			
			menuItem = EDITOR.addMenuItem("Virtual Keyboard", toggleVirtualKeyboard2, 26);
			
			EDITOR.on("registerAltKey", updateAltKey);
			EDITOR.on("unregisterAltKey", removeAltKey);
			
			var wrapper = document.getElementById("virtualKeyboard2");
			wrapper.style.display="none";
			wrapper.appendChild(canvas);
			
			
		},
		unload: function unloadVirtualKeyboard() {
			
			EDITOR.removeEvent("mouseClick", keyboardPushbuttonDown);
			EDITOR.removeEvent("mouseClick", keyboardPushbuttonUp);
			
			EDITOR.removeEvent("beforeResize", virtualKeyboardClaimHeight);
			EDITOR.removeEvent("afterResize", resizeVirtualKeyboard);
			EDITOR.removeEvent("hideVirtualKeyboard", hideVirtualKeyboard2);
			EDITOR.removeEvent("showVirtualKeyboard", showVirtualKeyboard2);
			
			EDITOR.removeEvent("registerAltKey", updateAltKey);
			
			toggleVirtualKeyboard2(false);
			
			EDITOR.removeMenuItem(menuItem);
			
			var wrapper = document.getElementById("virtualKeyboard2");
			wrapper.removeChild(canvas);
			
		}
	});
	
	function hideVirtualKeyboard2(keyboards) {
		if( keyboards.length==0 || keyboards.indexOf(MY_NAME) != -1 ) {
			if(ACTIVE) {
				toggleVirtualKeyboard2(false);
				return [MY_NAME];
			}
		}
		else {
			console.log("keyboards=" + JSON.stringify(keyboards) + " ACTIVE=" + ACTIVE);
		}
		return [];
	}
	
	function showVirtualKeyboard2(keyboards) {
		if( keyboards.length==0 || keyboards.indexOf(MY_NAME) != -1 ) {
			if(!ACTIVE) {
				toggleVirtualKeyboard2(true);
				return [MY_NAME];
			}
		}
		else {
			console.log("keyboards=" + JSON.stringify(keyboards));
		}
		return [];
	}
	
	function removeAltKey(fun) {
		var id = 0;
		var altNr = 0;
		for (var i=0; i<customAltKeys.length; i++) {
			if(customAltKeys[i].fun == fun) {
				
				id = customAltKeys[i].id;
				altNr = customAltKeys[i].alt;

				customAltKeys.splice(i, 1);
				
				delete verticalLayout[i]["alt" + altNr];
				
				console.log("Removed alternate key for " + UTIL.getFunctionName(fun) + " from " + verticalLayout[i].char + " !");
				
				return;
			}
		}
		
		console.log("No match for " + UTIL.getFunctionName(fun) + " in customAltKeys!");
	}
	
	function updateAltKey(key) {
		console.log("updateAltKey: char=" + key.char + " alt=" + key.alt);
if(key.alt > 3) {
			console.log("Virtual keyboard only allow 3 alternatives per button!");
return false;
}
		for (var i=0, button; i<verticalLayout.length; i++) {
			button = verticalLayout[i];
			if(button.char == key.char) {
				console.log("Found char=" + key.char);
				if(verticalLayout[i]["alt" + key.alt] != undefined) {
					throw new Error("There is already something registered on " + button.char + " for alt=" + key.alt + " ! Unable to register function " + UTIL.getFunctionName(key.fun));
					return false;
				}
				else {
					verticalLayout[i]["alt" + key.alt] = key.label;
					customAltKeys.push({id: i, alt: key.alt, fun: key.fun});
					console.log("Added " + UTIL.getFunctionName(key.fun) + " as alt" + key.alt + " on " + key.char + " !");
					return true;
				}
			}
		}
		console.log("Could not find char=" + key.char + " on the virtual keyboard!");
		return false;
	}
	
	function toggleVirtualKeyboard2(state) {
		EDITOR.hideMenu();
		
		var oldState = ACTIVE;
		
		if(typeof state == "boolean") {
			ACTIVE = state;
		}
		else ACTIVE = !ACTIVE;
		
		console.log("toggleVirtualKeyboard2: oldState=" + oldState + " newState=" + ACTIVE);
		
		var wrapper = document.getElementById("virtualKeyboard2");
		
		if(ACTIVE && !oldState) {
			wrapper.style.display="block";
		}
		else if(!ACTIVE && oldState) {
			oldCanvasHeight = canvasHeight;
			wrapper.style.display="none";
		}
		
		if(oldState != ACTIVE) {
			EDITOR.resizeNeeded();
			EDITOR.updateMenuItem(menuItem, ACTIVE);
		}
		
		console.log("Virtual keyboard visible ? " + ACTIVE);
		
		return ACTIVE;
	}
	
	
	
	
	function virtualKeyboardClaimHeight(file, windowWidth, windowHeight) {
		
		/*
			Claim the height needed
		*/
		
		if(!ACTIVE) return;
		
		buttons = verticalLayout;
		
		canvasWidth = windowWidth;
		
		if(windowWidth > windowHeight) {
			var orientation = "horizontal";
			buttonWithToHeightRatio = 0.9;
			//buttons = horizontalLayout;
			
			radius = canvasWidth / 200; // Rounded corners
			margin = canvasWidth / 500;
			lineWidth = canvasWidth / 2000;
		}
		else {
			var orientation = "vertical";
			buttonWithToHeightRatio = 2;
			
			radius = canvasWidth / 150; // Rounded corners
			margin = canvasWidth / 300;
			lineWidth = canvasWidth / 1500;
		}
		
		buttonsPerRow = calcButtonsPerRow(buttons);
		
		if(buttons.length == 0) throw new Error("No buttons found! windowWidth=" + windowWidth + " windowHeight=" + windowHeight + " (orientation=" + orientation + ") horizontalLayout.length=" + horizontalLayout.length + " verticalLayout.length=" + verticalLayout.length);
		if(buttonsPerRow[0] == 0) throw new Error("First row has no buttons! buttonsPerRow=" + JSON.stringify(buttonsPerRow) + " buttons=" + JSON.stringify(buttons, null, 2));
		if(buttonsPerRow[1] == 0) throw new Error("Second row has no buttons! buttonsPerRow=" + JSON.stringify(buttonsPerRow) + " buttons=" + JSON.stringify(buttons, null, 2));
		if(buttonsPerRow[2] == 0) throw new Error("Third row has no buttons! buttonsPerRow=" + JSON.stringify(buttonsPerRow) + " buttons=" + JSON.stringify(buttons, null, 2));
		
		console.log("maxButtonsPerRow=" + maxButtonsPerRow);
		console.log("buttonsPerRow=" + JSON.stringify(buttonsPerRow));
		console.log("totalRows=" + totalRows);
		
		
		buttonWidth = canvasWidth / maxButtonsPerRow;
		
		buttonHeight = buttonWithToHeightRatio * buttonWidth;
		canvasHeight = Math.ceil(buttonHeight * totalRows + margin);
		
		
		
		var wrapper = document.getElementById("virtualKeyboard2");
		wrapper.style.width=canvasWidth + "px";
		wrapper.style.height=canvasHeight + "px";
		
		
		//EDITOR.virtualKeyboardHeight = canvasHeight;
		
		console.log("virtualKeyboardClaimHeight: canvasWidth=" + canvasWidth + " buttonWidth=" + buttonWidth + " canvasHeight=" + canvasHeight + " buttonHeight=" + buttonHeight);
		
	}
	
	function resizeVirtualKeyboard(file, windowWidth, windowHeight) {
		
		if(!ACTIVE) return;
		
		if(canvasHeight == oldCanvasHeight) return;
		
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
		
		var buttonsPerRow = [0,0,0,0,0,0,0];
		
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
		
		var text = "";
		var alt1 = "";
		var alt2 = "";
		var textWidth = 0;
		var textHeight = 0;
		var textArr = [];
		var textMeasure;
		var fontSize = 0;
		
		// Note: ctx.measureText() only has one property: width (not height)
		
		for (var i=0; i<buttons.length; i++) {
			
			startX = (canvasWidth - buttonsPerRow[buttons[i].row] * buttonWidth) / 2;
			
			fontSize = Math.floor(buttonHeight * 0.4 * buttons[i].textSize)
			
			ctx.font = fontSize + "px Arial";
			//textWidth = ctx.measureText(comment.count.toString()).width;
			
			if(buttons[i].row != lastRow) {
				lastRow = buttons[i].row;
				accumulatedWidth = 0;
			}
			
			cX = startX + accumulatedWidth + buttonWidth*buttons[i].width/2 - margin/2;
			cY = (buttons[i].row+1) * buttonHeight - buttonHeight/2 - margin/2;
			
			accumulatedWidth += buttons[i].width * buttonWidth;
			
			buttonLocations.push({id: i, x: cX, y: cY, width: buttons[i].width});
			
			//ctx.rect(cX-buttonWidth/2+margin, cY-buttonHeight/2+margin, buttonWidth-margin*2, buttonHeight-margin*2);
			
			
			
			if(ALT1 && ALT2 && buttons[i].alt3) {
				text = (CAPS && buttons[i].fun == normalButton) ? buttons[i].alt3.toUpperCase() : buttons[i].alt3;
			}
			else if(ALT1 && !ALT2 && buttons[i].alt1) {
				text = (CAPS && buttons[i].fun == normalButton) ? buttons[i].alt1.toUpperCase() : buttons[i].alt1;
			}
			else if(ALT2 && !ALT1 && buttons[i].alt2) {
				text = (CAPS && buttons[i].fun == normalButton) ? buttons[i].alt2.toUpperCase() : buttons[i].alt2;
			}
			else if(!ALT1 && !ALT2 && !(ALT1 && ALT2)) {
				text = (CAPS && buttons[i].fun == normalButton) ? buttons[i].char.toUpperCase() : buttons[i].char;
			}
			else text = null;
			
			if(text) printText(text, cX, cY, fontSize);
			
			alt1 = buttons[i].alt1 && (CAPS && buttons[i].fun == normalButton) ? buttons[i].alt1.toUpperCase() : buttons[i].alt1;
			alt2 = buttons[i].alt2 && (CAPS && buttons[i].fun == normalButton) ? buttons[i].alt2.toUpperCase() : buttons[i].alt2;
			
			//if(alt1 && ALT1) alt1 = (CAPS && buttons[i].fun == normalButton) ? buttons[i].char.toUpperCase() : buttons[i].char;
			//if(alt2 && ALT2) alt2 = (CAPS && buttons[i].fun == normalButton) ? buttons[i].char.toUpperCase() : buttons[i].char;
			
			if( (alt1 || alt2) && (!ALT1 && !ALT2) ) {
				
				fontSize = Math.floor(buttonHeight * 0.2 * buttons[i].textSize);
				
				ctx.font = fontSize + "px Arial";
				//textWidth = ctx.measureText(comment.count.toString()).width;
				
				if(alt1) printText(alt1, cX, cY-buttonHeight/3 + margin, fontSize, true); // ctx.fillText(alt1, cX, cY-buttonHeight/3 + margin);
				if(alt2) printText(alt2, cX, cY+buttonHeight/3 + margin, fontSize, true); // ctx.fillText(alt2, cX, cY+buttonHeight/3 - margin);
			}
		}
		ctx.stroke();
		buttonLocations.sort(sortLocationsX);
		
		
		console.timeEnd("renderVirtualKeyboard");
		
		function printText(text, cX, cY, fontSize, noSplit) {
			var textArr = [text];
			
			// Make sure the text fits
			var textWidth = ctx.measureText(text).width;
			var maxWidth = (buttonWidth*buttons[i].width+margin*2);
			if(textWidth > maxWidth) {
				console.warn("text=" + text + " fontSize=" + fontSize + " textWidth=" + textWidth + " buttonWidth=" + buttonWidth);
				
				if(!noSplit) {
					// Attempt to split it
					textArr = text.split(" ");
					textWidth = ctx.measureText(textArr[0]).width;
				}
				
				if(textWidth > maxWidth) {
					// Still too wide, use smaller font
					fontSize = Math.floor(fontSize * 0.8 * maxWidth / textWidth);
					ctx.font =  fontSize + "px Arial";
					console.log("Using fontSize=" + fontSize + " for text=" + text + " because textWidth was " + textWidth);
				}
			}
			
			for (var j=0; j<textArr.length; j++) {
				ctx.fillText( textArr[j], cX, cY + j*(fontSize+margin) - (textArr.length-1) * fontSize );
			}
		}
		
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
			
			//console.log("click.x=" + click.x + " click.y=" + click.y + " button.x=" + buttonLocations[i].x + " button.y=" + buttonLocations[i].y + " buttonWidth=" + buttonWidth + " buttonHeight=" + buttonHeight + " ");
			
			if( click.x > (buttonLocations[i].x - buttonWidth * buttonLocations[i].width / 2)  &&  click.x < (buttonLocations[i].x + buttonWidth * buttonLocations[i].width / 2) && 
			click.y > (buttonLocations[i].y - buttonHeight/2)  &&  click.y < (buttonLocations[i].y + buttonHeight/2) ) return clickButton(buttonLocations[i].id);
		}
		
		return true;
	}
	
	
	function clickButton(id) {
		
		//EDITOR.renderColumn(EDITOR.currentFile.caret.row, EDITOR.currentFile.caret.col, "X", EDITOR.settings.style.textColor);
		//file.putCharacter("X");
		//EDITOR.renderRow();
		
		var button = buttons[id];
		var customFunction;
		
		var altNr = 0;
		
		if(ALT1 && ALT2) altNr = 3;
		else if(ALT1) altNr = 1;
		else if(ALT2) altNr = 2;
		
		for (var i=0; i<customAltKeys.length; i++) {
			if(customAltKeys[i].id == id && customAltKeys[i].alt == altNr) {
				customFunction = customAltKeys[i].fun;
				console.log("Using custom function " + UTIL.getFunctionName(customFunction) + " from alt keys!");
				break;
			}
		}
		
		if(customFunction) customFunction(EDITOR.currentFile, {shift: false, alt: false, ctrl: false, sum: 0});
		else button.fun(); // Need to be button.fun so that the function will get the proper this
		
		
		clearTimeout(clickTimer);
		
		if(!button.alt) {
			// To save one click you automatically go back to normal
			// But give enough time to allow many clicks
			clickTimer = setTimeout(function restore() {
				if(ALT1 || ALT2) {
					ALT1 = false;
					ALT2 = false;
					renderVirtualKeyboard();
				}
			}, 500);
		}
		
		return false;
	}
	
	// Buttons that have a function specified need to handle ALT1, ALT2, ALT2 && ALT2, and CAPS in that function
	// If ALT is a special function, the key need to have a function specified.
	function normalButton() {
		var button  = this;
		if(ALT1 && ALT2 && button.alt3) fireKey( CAPS ? button.alt3.toUpperCase().charCodeAt(0) : button.alt3.toLowerCase().charCodeAt(0) );
		else if(ALT1 && button.alt1) fireKey( CAPS ? button.alt1.toUpperCase().charCodeAt(0) : button.alt1.toLowerCase().charCodeAt(0) );
		else if(ALT2 && button.alt2) fireKey(CAPS ? button.alt2.toUpperCase().charCodeAt(0) : button.alt2.toLowerCase().charCodeAt(0) );
		else fireKey(CAPS ? button.charCodeCaps : button.charCode);
	}
	
	function fireKey(charCode, eventType) {
		
		/*
			Note: KeyCode is NOT the same as charCode!!
			
		*/
		
		console.log("fireKey: charCode=" + charCode + " eventType=" + eventType +
		" document.activeElement: id=" + document.activeElement.id + " node=" + document.activeElement.nodeName +
		" EDITOR.lastElementWithFocus: id=" + EDITOR.lastElementWithFocus.id + " node=" + EDITOR.lastElementWithFocus.nodeName);
		
		if(charCode == 8592) var KeyCode = 37; // ← left
		if(charCode == 8594) var KeyCode = 39; // → right
		if(charCode == 8593) var KeyCode = 38; // ↑ up
		if(charCode == 8595) var KeyCode = 40; // ↓ down
		
		if(KeyCode) eventType = "keydown";
		
		//event.preventDefault();
		
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
			var doDefaultAction = EDITOR.mock( eventType, { charCode: KeyCode || charCode } );
			
			console.log("eventType=" + eventType + " doDefaultAction=" + doDefaultAction);
			
		}
		
	}
	
	function insertAtCaret(t, text) {
		/*
			The caret is lost when the element is blurred, eg when you push a button on the virtual keyboard.
			Solution: Save the caret position every time the element blurs
		*/
		
		var sTop = t.scrollTop || parseInt(t.getAttribute("sTop")) || 0;
		var selStart = t.selectionStart || parseInt(t.getAttribute("selStart")) || 0;
		var selEnd = t.selectionEnd || parseInt(t.getAttribute("selEnd")) || 0;
		
		console.log("insertAtCaret: text=" + text + " Element: id=" + t.id + " sTop=" + sTop + " selStart=" + selStart + " selEnd=" + selEnd);
		
		if( typeof selStart != "number" || isNaN(selStart) ){
			throw new Error("Unable to get caret position (selStart=" + selStart + ") for element id=" + t.id + " selectionStart=" + t.selectionStart + " attribute selStart=" + t.getAttribute("selStart") + " value=" + t.value );
		}
		if( typeof selEnd != "number" || isNaN(selEnd) ){
			throw new Error("Unable to get selection end (selEnd=" + selEnd + ") for element id=" + t.id + " selectionEnd=" + t.selectionEnd + " attribute selEnd=" + t.getAttribute("selEnd") + " value=" + t.value );
		}
		if( typeof sTop != "number" || isNaN(sTop) ) {
			throw new Error("Unable to get scroll position (sTop=" + sTop + ") for element id=" + t.id + " scrollTop=" + t.scrollTop + " attribute sTop=" + t.getAttribute("sTop") + " value=" + t.value );
		}
		
		//console.log("selStart=" + selStart + " (" + t.getAttribute("sTop") + ")");
		
		var front = (t.value).substring(0, selStart);
		var back = (t.value).substring(selEnd, t.value.length);
		
		
		if(text == "←") {
			if(selStart>0) selStart--;
		}
		else if(text == "→") {
			if(selStart<t.value.length) selStart++;
		}
		else if(text == "↑") {
			if(sTop>0) sTop--;
		}
		else if(text == "↓") {
			sTop++;
		}
		else if(text == "\b") {
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
		
		/*
			
			
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
			textSize: 0.8
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
		
		*/
		
		
		
		
		
		
		
		
		
		
		
		// ## Vertical
		var row = 0;
		var col = 0
		var orientation = "vertical";
		
		add("1", {           alt2: "~", alt3: "¹", width: 1.1}); // 206276
		
		add("q", {alt1: "2", alt2: "@", alt3: "²"});
		add("w", {alt1: "3", alt2: "#", alt3: "³"});
		add("e", {alt1: "4", alt2: "$", alt3: "£"});
		add("r", {alt1: "5", alt2: "%", atl3: "®"});
		add("t", {           alt2: "^", alt3: "þ"});
		
		add('"', {alt1: "'", alt2: "`", alt3: "་", width: 1.6}); // 378701
		add("&", {width: 1.2}); // 195979
		
		add("y", {                      alt3: "ü"});
		add("u", {alt1: "6",            alt3: "µ"});
		add("i", {alt1: "7",            alt3: "í"});
		add("o", {alt1: "8",            alt3: "¤"});
		add("p", {alt1: "9", alt2: "ö"});
		
		add("0", {width: 1.2}); // 275398
		
		
		// ### Vertical second row
		row = 1;
		col = 0
		
		add("(", {alt1: "{", alt2: "[", width: 1.5}); // 506640
		
		add("a", {alt1: "ä",            alt3: "á"});
		add("s", {alt1: "å",            alt3: "§"});
		add("d", {                      alt3: "€"});
		add("f", {                      alt3: "т"});
		add("g", {                      alt3: "я"});
		
		add("=", {width: 1.4}); // 456621
		
		add("ABC", { // Could use 🔠 but not supported by all browsers
			fun: function capsLock(click) {
				CAPS = !CAPS;
				renderVirtualKeyboard();
			},
			charCode: -1,
			width: 1.6,
			textSize: 0.8
		});
		
		add("h", {alt1: "←",    alt3: "н"}); // move left
		add("j", {alt1: "↓"}); // move down
		add("k", {alt1: "↑",    alt3: "к"}); // move up
		add("l", {alt1: "→"}); // move right
		
		add(")", {alt1: "}", alt2: "]", width: 1.6}); // 506646
		
		
		// ### Vertical third row
		row = 2;
		col = 0;
		
		add("copy", {
			fun: function copyPaste(click) {
				if(!EDITOR.currentFile) return;
				
				if(ALT1) {
					var clipboardData = EDITOR.getClipboardContent(gotClipboard);
				}
				else if(ALT2) {
					EDITOR.putIntoClipboard(EDITOR.currentFile.getSelectedText());
					EDITOR.currentFile.deleteSelection();
				}
				else {
					EDITOR.putIntoClipboard(EDITOR.currentFile.getSelectedText());
				}
				
				function gotClipboard(err, data) {
					if(err) alertBox(err.message);
					else EDITOR.mock("paste", {data: data});
				}
			},
			charCode: 8,
			width: 1.2,
			textSize: 0.8,
			alt1: "paste",
			alt2: "cut"
		});
		
		add("!", {width: 0.8}); // 55563
		
		add("z", {                      alt3: "œ"});
		add("x", {                      alt3: "¢"});
		add("c", {                      alt3: "©"});
		add("v");
		add("b", {                      alt3: "в"});
		
		add("/", {alt1: "\\", alt2: "|", width: 1}); // 284895
		add("+", {width: 1}); // 123478
		add("-", {alt1: "_", width: 1}); // 198407
		
		
		add("n", {                       alt3: "π"}); // n might be used as bigint annotator
		add("m", {                       alt3: "м"});
		
		add("*", {alt1: "?"}); // 129766
		
		
		
		add("back", {
			fun: function back(click) {
				fireKey(8, "keydown");
				return false;
			},
			charCode: 8,
			width: 2.1,
			textSize: 0.8,
		});
		
		
		
		// ### Vertical fourth row
		row = 3;
		col = 0;
		
		add("Compl", {
			fun: function autocomplete(click) {
				if(ALT2) toggleVirtualKeyboard2(false);
				else fireKey(EDITOR.settings.autoCompleteKey, "keydown");
			},
			charCode: EDITOR.settings.autoCompleteKey,
			width: 1.3,
			textSize: 0.7,
			alt2: "Done"
		});
		
		add(";", {width: 1.4}); // 374216
		
		add("Alt-1", {
			fun: function alternate1() {
				ALT1=!ALT1;
				renderVirtualKeyboard();
			},
			charCode: -1,
			highlightWhenActive: true,
			width: 1.5,
			textSize: 0.6,
			highlightAlt1: true,
			highlightAlt3: true,
			alt: true
		});
		
		add(",", {width: 1.5, textSize: 1.5}); // 679396
		
		add("space", {
			fun: function space(click) {
				fireKey(32, "keypress"); // space
			},
			charCode: 32,
			width: 2.4,
			textSize: 0.7,
		});
		
		add(".", {alt1: ":", width: 1.5, textSize: 1.5}); // 591280
		
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
			highlightAlt3: true,
			alt: true
		});
		
		add("<"); // 56023
		add(">"); // 57232
		
		add("Enter", {
			fun: function enter(click) {
				fireKey(13, "keydown");
			},
			charCode: 13,
			width: 2,
			textSize: 0.8
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
				fun: options.fun || normalButton,
				alt1: options.alt1,
				alt2: options.alt2,
				alt3: options.alt3,
				highlightAlt1: options.highlightAlt1 || false,
				highlightAlt2: options.highlightAlt2 || false,
				highlightAlt3: options.highlightAlt3 || false,
				alt: options.alt || false // If it's an button that changes ALT1,ALT2
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
	}
	
	function keyboardPushbuttonUp(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseUpEvent) {
		
		if(mouseUpEvent.type == "touchend") {
			toggleVirtualKeyboard2(true);
			if(EDITOR.currentFile) {
				// Wait for the resize, then scroll to the caret (where you clicked)
				setTimeout(function() {
					EDITOR.currentFile.scrollToCaret();
				}, 500);
			}
		}
		
		return true;
		
		if(mouseY > 50) return true;
		
		var file = EDITOR.currentFile;
		if(!file)  return true;
		
		// Is it faster to click on the file canvas ? It's no difference.
		EDITOR.mock("keypress", {charCode: 65});
		
		return false;
	}
	
	
	// TEST-CODE-START
	// ### Test(s)
	
	function clickLetter(letter) {
		
		var id;
		
		if(buttons.length == 0) buttons = verticalLayout;
		
		for (var i=0; i<buttons.length; i++) {
			if(buttons[i].char==letter) {
				id = i;
				break;
			}
		}
		
		if(!id) throw new Error("Unable to find button " + letter + " buttons.length=" + (buttons && buttons.length));
		
		clickButton(id);
		
	}
	
	EDITOR.addTest(1, function testInsertAtCaret(callback) {
		// Make sure the characters are inserted in the right order.
		
		var input = document.createElement("input");
		
		var footer = document.getElementById("footer");
		
		footer.appendChild(input);
		EDITOR.resizeNeeded();
		
		
		// Seems we need an event to trigger the click event
		input.focus(); // Element needs to have focus *before* clicking on it for the click() event to trigger.
		//input.setAttribute("placeholder", "Double Click here to trigger the test!");
		input.setAttribute("id", "testVirtualKeyboardInput");
		
		
		//input.addEventListener("dblclick", function enterText() {
		
		clickLetter("a");
		clickLetter("b");
		clickLetter("c");
		
		setTimeout(function() {
			
			if(input.value != "abc") throw new Error("Unexpected input.value=" + input.value);
			
			footer.removeChild(input);
			
			return callback(true);
			
		}, 0);
		
		//});
		
	});
	
	// TEST-CODE-END
	
	
})();