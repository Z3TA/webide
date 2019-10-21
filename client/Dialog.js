/*
	
	Dialog functions

	
	
*/

"use strict";

var DIALOG_Z_INDEX = 256;
var DIALOG_LAST_MSG = "";


function Dialog(msg, options) {
	var dialog = this;
	
	if(options == undefined) options = {};
	else if(options != Object(options)) throw new Error("Second argument options need to be an object!");
	
	var icon = options.icon;
	var dialogDelay = options.delay;
	
	dialog.code = options.code || "MISC";
	
	console.log(UTIL.getStack("Creating dialog: code=" + dialog.code + " msg=" + msg));
	
	if(msg == undefined) throw new Error("Dialog without a message! msg=" + msg);
	
	msg = msg.toString(); // Convert numbers etc to string so we can use the replace method
	
	//console.log("Dialog msg=" + msg);
	
	msg = msg.replace(/\n/g, "<br>");
	
	var body = document.getElementById("body") || document.body;
	
	if(!body) {
		console.warn("Dialog created before html body is available");
		return 1;
	}
	
	
	if(typeof EDITOR != "undefined" && EDITOR.openDialogs) {
		// Prevent the exact same message from showing again
		for(var i=0; i<EDITOR.openDialogs.length; i++) {
			if(EDITOR.openDialogs[i].message == msg) {
				EDITOR.openDialogs[i].incrementRepeatCounter();
				dialog.repeat = EDITOR.openDialogs[i];
				return 0;
			}
			else {
				console.log("Not the same:\n" + msg + "\n" + EDITOR.openDialogs[i].message);
			}
		}
	}
	
	
	var message = document.createElement("div");
	message.setAttribute("class", "message");
	message.innerHTML = msg; // Support HTML
	
	dialog.message = msg;
	
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
	
	
	dialog.div = document.createElement("div");
	
	var div = dialog.div;
	
	div.setAttribute("class", "dialog");
	div.style.zIndex = (--DIALOG_Z_INDEX);
	
	div.addEventListener("click", focusDefaultElement, false);
	
	div.appendChild(message);
	
	body.appendChild(div);
	
	dialog.openedDate = new Date();
	
	if(typeof EDITOR != "undefined" && EDITOR.openDialogs) EDITOR.openDialogs.push(dialog);
	
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
	
	if(typeof EDITOR != "undefined") {
		// Give the focus to the box
		dialog.editorHadInputFocus = EDITOR.input;
	EDITOR.input = false;
	}
	
	// Give the program time to add buttons etc to the dialog
	// Also avoid accidently closing the dialog (while typing spaces)
	if(dialogDelay === 0) return 0; // Manually set focus
	if(dialogDelay == undefined) dialogDelay = 2000;
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
		
		if(typeof EDITOR != "undefined") EDITOR.input = false;
	}
}
Dialog.prototype.isOpen = function(someEvent, callback) {
	if(this.div.parentElement) return true;
	else return false;
}
Dialog.prototype.close = function(someEvent, callback) {
	var dialog = this;
	
	console.log("Dialog.prototype.close ...");
	
	if(typeof EDITOR != "undefined") {
	EDITOR.openDialogs.splice(EDITOR.openDialogs.indexOf(dialog), 1);
	
		if(EDITOR.openDialogs.length==0) {
			// Reset z-index
			DIALOG_Z_INDEX = 256;
		}
	}
	
	if(dialog.div.parentElement) dialog.div.parentElement.removeChild(dialog.div);
	else console.warn("Parent element does not exist for div=", dialog.div);
	
	if(dialog.editorHadInputFocus) {

		if(!EDITOR.input) {
			console.log("Dialog.prototype.close: Giving focus/input back to the editor. EDITOR.input=" + EDITOR.input);
			EDITOR.input = true;
			EDITOR.canvas.focus();
		}
		
		// This will work if the button was clicked on using "Enter" key
		// The editor however watches for clicks outside the "editor" area (canvas), and will disable input if such event is detected.
		// So wait until that is done before giving back input
		
		var waitTime = 10; 
		
		if(!someEvent) {
			console.warn("Dialog.prototype.close: No event given! someEvent=" + someEvent);
		}
else {
			//console.log(someEvent);
			
			console.log("Dialog.prototype.close: someEvent.type=" + someEvent.type + " someEvent.screenX=" + someEvent.screenX + " someEvent.screenY=" + someEvent.screenY);
			// If the user closes the dialog using the keyboard, we don't want to give back focus too fast, or a bunch of spaces will be inserted (if the user used the space key)
			if(someEvent.screenX == 0 && someEvent.screenY == 0) {
				// It was probably a "keyboard click"
				waitTime = 100;
			}
			else {
				waitTime = 10; // Probably a mouse click
			}
		}
		
		/*
			Issue: When in a html widget form, a Dialog comes up, 
			which then gives focus to the EDITOR, so you can't click Enter to submit the form
			Isse2: Copy/paste using virtual keyboard !? 
		*/
		
		
		setTimeout(function() {
			
			if(typeof EDITOR != "undefined") {
				console.log("Dialog.prototype.close: Giving back editor focus/input after waiting " + waitTime + "ms ... EDITOR.input=" + EDITOR.input + "")
			EDITOR.input = true;
			EDITOR.canvas.focus();
			}
			
			if(callback) callback();
			
		}, waitTime);
		
		}
	else if(callback) {
		console.log("Dialog.prototype.close: Calling callback without waiting!");
		callback();
	}
}
Dialog.prototype.incrementRepeatCounter = function incrementRepeatCounter() {
	var dialog = this;
	
	if(dialog.repeatedTimes) {
		dialog.repeatedTimes++;
		dialog.repeatedTimesEl.innerText = dialog.repeatedTimes;
	}
	else {
		dialog.repeatedTimes = 1;
		
		dialog.repeatedTimesEl = document.createElement("span");
		dialog.repeatedTimesEl.innerText = dialog.repeatedTimes;
		
		var repeatDiv = document.createElement("div");
		repeatDiv.appendChild(document.createTextNode("Message repeated "));
		repeatDiv.appendChild(dialog.repeatedTimesEl);
		repeatDiv.appendChild(document.createTextNode(" times(s)"));
		
		dialog.div.appendChild(repeatDiv);
	}
	
}


function alertBox(msg, code, icon, recursionCount) {
	var dialog = new Dialog(msg, {icon: icon, code: code});
	
	if(dialog.repeat) return dialog.repeat;
	
	if(!dialog.div) {
		return setTimeout(function wait() {
			// Wait until the body element is available
			
			if(recursionCount) recursionCount++;
			else recursionCount = 1;
			
			if(recursionCount > 4) console.warn("Unable to show alertBox, probably because the editor has not fully loaded. msg=" + msg + "");
			
			alertBox(msg, code, icon, recursionCount);
			
		}, 150);
	}
	
	
	var button = document.createElement("button");
	button.setAttribute("class", "alert");
	button.setAttribute("focus", "true");
	button.appendChild(document.createTextNode("OK"));
	
	button.addEventListener("click", function(clickEvent) {
		console.log("alertBox button click: EDITOR.input=" + ((typeof EDITOR != "undefined") && EDITOR.input) + "");
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
			
			if(recursionCount > 4) console.warn("Unable to show confirmBox msg=" + msg + " options=" + JSON.stringify(options));
			
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
		button.setAttribute("tabindex", i);
		
		// The last button will be the default (get focus)
		if(i == (options.length -1)) button.setAttribute("focus", "true");
		
		button.appendChild(document.createTextNode(txt));
		
		button.addEventListener("click", function(clickEvent) {callback(txt); dialog.close(clickEvent);}, false);
		
		dialog.div.appendChild(button); 
	}
	
}

function promptBox(msg, options, callback, recursionCount) {
	
	console.log("promptBox: typeof isPassword = " + (typeof isPassword));
	
	if(typeof options == "function" && callback == undefined) {
		callback = options;
		options = undefined;
	}
	
	if(options == undefined) options = {};
	
	var availableOptions = [
		"isPassword",
		"defaultValue",
		"dialogDelay",
		"selectAll",
		"placeholder",
		"rows"
	];
	
	for(var option in options) {
		if(availableOptions.indexOf(option) == -1) throw new Error(option + " is not a valid option for promptBox!");
	}
	
	var isPassword = options.isPassword;
	var defaultValue = options.defaultValue;
	var dialogDelay = options.dialogDelay;
	var selectAll = options.selectAll;
	
	if(selectAll) {
		dialogDelay = 0;
	}
	
	if(typeof callback != "function") throw new Error("No callback function! callback=" + callback + " arguments=" + JSON.stringify(arguments));
	
	console.log("promptBox: msg=" + msg+ " isPassword=" + isPassword + " defaultValue=" + defaultValue + " dialogDelay=" + dialogDelay + " recursionCount=" + recursionCount);
	
	var dialog = new Dialog(msg, {icon: undefined, delay: dialogDelay});
	
	if(!dialog.div) {
		console.log("promptBox: Waiting until the body element is available ...");
		return setTimeout(function wait() {
			
			if(recursionCount) recursionCount++;
			else recursionCount = 1;
			
			if(recursionCount > 4) console.warn("promptBox: Unable to show promptBox msg=" + msg + "");
			
			promptBox(msg, options, callback, recursionCount);
			
		}, 100);
	}
	
	
	
	if(isPassword) {
		var input = document.createElement("input");
		input.setAttribute("type", "password");
	}
	else {
		var input = document.createElement("textarea");
		input.setAttribute("type", "text");
		
		if(options.rows) {
			input.setAttribute("rows", options.rows);
		}
	}
	
	input.setAttribute("class", "input prompt");
	input.setAttribute("focus", "true");
	
	if(options.placeholder) {
		input.setAttribute("placeholder", options.placeholder);
	}
	
	if(defaultValue) {
		if(isPassword) input.setAttribute("value", defaultValue);
		else input.value = defaultValue;
		
		input.select();
	}
	
	var ok = document.createElement("button");
	ok.setAttribute("class", "prompt");
	ok.setAttribute("type", "submit");
	ok.appendChild(document.createTextNode("OK"));
	
	ok.addEventListener("click", function(clickEvent) {
		
		var value = input.value || input.innerText;
		console.log("promptBox: Closing dialog ...");
		dialog.close(clickEvent, function() {
			console.log("promptBox: Dialog closed. Calling back with value=" + value);
			callback(value);
		});
		
	}, false);
	
	
	var cancel = document.createElement("button");
	cancel.setAttribute("class", "prompt");
	cancel.appendChild(document.createTextNode("Cancel")); // Language?
	
	cancel.addEventListener("click", function(clickEvent) {callback(null); dialog.close(clickEvent)}, false);
	
	if(!options.rows) {
	input.addEventListener("keydown", function(keyDownEvent) {
		var enterKey = 13;
		var escapeKey = 27;
		// Clicking enter in the input area should "submit"
		if (keyDownEvent.keyCode == enterKey && !keyDownEvent.shiftKey) {
			keyDownEvent.preventDefault();
			keyDownEvent.stopPropagation();
			ok.click();
		return false;
		}
		// Clicking escape should be same as cancel
		else if(keyDownEvent.keyCode == escapeKey) cancel.click();
	});
	}
	
	dialog.div.appendChild(input);
	dialog.div.appendChild(cancel);
	dialog.div.appendChild(ok);
	
	if(dialogDelay === 0) {
		if(typeof EDITOR != "undefined") EDITOR.input = false;
		input.focus();
		
		if(selectAll) {
			input.select();
		}
	
	}
	
	return dialog;
}
