/*
	
	Dialog functions

	
	
*/

"use strict";

function Dialog(msg, icon) {
	
	console.warn("Creating dialog: msg=" + msg); // Using console.warn so we'll get callsite
	
	if(msg == undefined) throw new Error("Dialog without a message!");
	
	msg = msg.toString(); // Convert numbers etc to string so we can use the replace method
	
	//console.log("Dialog msg=" + msg);
	
	msg = msg.replace(/\n/g, "<br>");
	
	var body = document.getElementById("body") || document.body;
	
	if(!body) {
		console.warn("Dialog created before html body is available");
		return 1;
	}
	
	var message = document.createElement("div");
	message.setAttribute("class", "message");
	message.innerHTML = msg; // Support HTML
	
	var img;
	
	if(icon == "warning" ) {
		img = document.createElement("img");
		img.setAttribute("src", "gfx/warning.svg");
	}
	else if(icon == "error") {
		img = document.createElement("img");
		img.setAttribute("src", "gfx/error.svg");
	}
	else if(icon) {
		throw new Error("Dialog icon not supported: " + icon);
	}
	
	
	this.div = document.createElement("div");
	
	var div = this.div;
	
	div.setAttribute("class", "dialog");
	div.setAttribute("style", "position: absolute; top: 50px; left: 50px");
	
	div.addEventListener("click", focusDefaultElement, false);
	
	div.appendChild(message);
	
	body.appendChild(div);
	
	if(img) {
		//alert(icon);
		// If an icon is used adjust it's size
		var messageHeight = parseInt(message.offsetHeight);
		console.log("messageHeight=" + messageHeight);
		img.setAttribute("height", Math.round(messageHeight / 2));
		
		if(message.childNodes.length == 1) {
			img.style.verticalAlign = "middle";
			img.style.float = "none";
			img.style.display = "inline-block";
		}
		else {
			img.style.float = "left";
		}
		
		message.insertBefore(img, message.firstChild);
	}
	
	// Get the computed size of the box
	var divHeight = parseInt(div.offsetHeight);
	var divWidth = parseInt(div.offsetWidth);
	
	// Place it in the middle of the screen
	var windowHeight = parseInt(window.innerHeight);
	var windowWidth = parseInt(window.innerWidth);
	
	var sligtlyUp = 32; // Space for buttons and stuff
	
	div.style.top = Math.round(windowHeight / 2 - divHeight/2 - sligtlyUp) + "px";
	div.style.left = Math.round(windowWidth / 2 - divWidth/2) + "px";
	
	
	// Give the focus to the box
	this.editorHadInputFocus = EDITOR.input;
	EDITOR.input = false;
	
	// Give the program time to add buttons etc to the dialog
	// Also avoid accidently closing the dialog (while typing spaces)
	var dialogDelay = 2000;
	setTimeout(focusDefaultElement, dialogDelay); 
	
	return 0;
	
	function focusDefaultElement() {
		// Give focus to the element with attribute focus:true
		
		var childElement = div.childNodes;
		for (var i=0; i<childElement.length; i++) {
			if(childElement[i].getAttribute("focus") == "true") {
				childElement[i].focus();
				break;
			}
		}
		
		EDITOR.input = false;
	}
}
Dialog.prototype.close = function(someEvent) {
	this.div.parentElement.removeChild(this.div);
	
	if(this.editorHadInputFocus) {
		// The editor watches for clicks outside the "editor" area (canvas), so wait until that is done before giving back input
		
		//console.log(someEvent);
		
		console.log("someEvent.type=" + someEvent.type + " someEvent.screenX=" + someEvent.screenX + " someEvent.screenY=" + someEvent.screenY);
		// If the user closes the dialog using the keyboard, we don't want to give back focus too fast, or a bunch of spaces will be inserted (if the user used the space key)
		if(someEvent.screenX == 0 && someEvent.screenY == 0) {
			// It was probably a "keyboard click"
			var waitTime = 500;
		}
		else {
			// Probably a mouse click
			var waitTime = 0;
		}
		
		setTimeout(function() {
			console.log("Giving back editor focus/input ... EDITOR.input=" + EDITOR.input + "")
			EDITOR.input = true;
			EDITOR.canvas.focus();
		}, waitTime);
	}
}

function alertBox(msg, icon) {
	var dialog = new Dialog(msg, icon);
	
	var button = document.createElement("button");
	button.setAttribute("class", "alert");
	button.setAttribute("focus", "true");
	button.appendChild(document.createTextNode("OK"));
	
	button.addEventListener("click", function(clickEvent) {
		console.log("alertBox button click: EDITOR.input=" + EDITOR.input + "");
		dialog.close(clickEvent);
	}, false);
	
	dialog.div.appendChild(button);
	
	return dialog;
}


//window.alert = alertBox; // Override the native alert box

/*
	Example reason why you want to use custom confirm box:
	* Native confirm box registers a keyPress if it was called on a keydown event
*/
function confirmBox(msg, options, callback, recursionCount) {
	
	var dialog = new Dialog(msg);
	
	if(!dialog.div) {
		return setTimeout(function wait() {
			// Wait until the body element is available
			
			if(recursionCount) recursionCount++;
			else recursionCount = 1;
			
			if(recursionCount > 4) throw new Error("Unable to show confirmBox msg=" + msg + " options=" + JSON.stringify(options));
			
			confirmBox(msg, options, callback, recursionCount);
		
		}, 100);
	}
	
	for (var i=0; i<options.length; i++) {
		makeButton(i);
	}
	
	return dialog;
	
	function makeButton(i) {
		var txt = options[i];
		var button = document.createElement("button");
		button.setAttribute("class", "confirm");
		
		// The last button will be the default (get focus)
		if(i == (options.length -1)) button.setAttribute("focus", "true");
		
		button.appendChild(document.createTextNode(txt));
		
		button.addEventListener("click", function(clickEvent) {callback(txt); dialog.close(clickEvent);}, false);
		
		dialog.div.appendChild(button); 
	}
	
}

function promptBox(msg, isPassword, defaultValue, callback) {
	var dialog = new Dialog(msg);
	
	var input = document.createElement("input");
	
	if(isPassword) input.setAttribute("type", "password")
	else input.setAttribute("type", "text");
	
	input.setAttribute("class", "input prompt");
	input.setAttribute("focus", "true");
	
	if(defaultValue) input.setAttribute("value", defaultValue);
	
	var ok = document.createElement("button");
	ok.setAttribute("class", "prompt");
	ok.setAttribute("type", "submit");
	ok.appendChild(document.createTextNode("OK"));
	
	ok.addEventListener("click", function(clickEvent) {callback(input.value); dialog.close(clickEvent)}, false);
	
	
	var cancel = document.createElement("button");
	cancel.setAttribute("class", "prompt");
	cancel.appendChild(document.createTextNode("Cancel")); // Language?
	
	cancel.addEventListener("click", function(clickEvent) {callback(null); dialog.close(clickEvent)}, false);
	
	
	input.addEventListener("keyup", function(e) {
		e.preventDefault();
		var enterKey = 13;
		var escapeKey = 27;
		// Clicking enter in the input area should "submit"
		if (e.keyCode == enterKey) ok.click()
		// Clicking escape should be same as cancel
		else if(e.keyCode == escapeKey) cancel.click();
	});
	
	
	dialog.div.appendChild(input);
	dialog.div.appendChild(cancel);
	dialog.div.appendChild(ok);
	
	return dialog;
}
