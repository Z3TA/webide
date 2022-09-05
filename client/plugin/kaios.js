(function() {
	/*
		Support for KaiOS
		
		Simulator:
		https://developer.kaiostech.com/simulator
		
		Keys:
		OK: Enter (13)
		upper right: SoftRight
		upper left: SoftLeft
		arrow up: ArrowUp
		arrow down: ArrowDown
		arrow left: ArrowLeft
		arrow right: ArrowRight
		Green phone: Call
		Red phone: Backspace
		numpad-1: 1
		numpad-2:
		numpad+*: *
		numpad#: # (35)
		
		todo: use Green phone to toggle between insert and nav mode!
		
		note: Having the main button mock escape key was stupid because it meant widgets being closed when you clicked on something

		problem: We can not capture keys while the canvas element is focused! (only arrow keys, Call, EndCall, MicrophoneToggle)
		We can capture the numeric key if they are longpressed...
		We can also capture input if a textarea is focused!
		so we know textarea is "cd", the user has pressed 3 times on 2 (because 2=abc) and one time on 3 (because 3=def) , 


	*/


	// Don't do anything if it's not a KaiOS device!
	//if(typeof window.navigator != "object" || typeof window.navigator.mozApps != "object") return;

	console.log("KaiOS!")

	//document.location = "st.htm";

	LOW_RAM = true;

	var INSERT = "numericKeypadInsert";
	var NAV = "numericKeypadNavigate";
	
	var messageToShow = "KaiOS";
	var textarea;

	EDITOR.plugin({
		desc: "Support for KaiOS",
		load: loadKaiOsSupport,
		unload: unloadKaiOsSupport,
		order: 1
	});
	
	function loadKaiOsSupport() {

		var canvas = document.getElementById("editorCanvas");

		EDITOR.disablePlugin("File tabs", true); // File tabs take up a lot of screen space

		EDITOR.addMode(INSERT);
		EDITOR.addMode(NAV);

		//EDITOR.bindKey({desc: "Focus next element", key: "SoftRight", fun: focusNextElement});
		//EDITOR.bindKey({desc: "Show context menu", key: "SoftLeft", fun: kaiToggleMenuOnKeyPress});
		EDITOR.bindKey({desc: "Switch mode", key: "Call", mode: "*", fun: kaiToggleMode});
		//EDITOR.bindKey({desc: "Toggle mic", key: "MicrophoneToggle", fun: microphoneToggle}); // Randomly triggers when pressing Main button

		EDITOR.bindKey({desc: "Switch mode", key: "k", combo: ALT, mode: "*", fun: kaiToggleMode2});
		

		EDITOR.discoveryBar.disable("KaiOS");
		EDITOR.dashboard.disable("KaiOS");

		//alertBox("KaiOS support loaded!");

		// Sometimes when we show a prompt KaiOS say Enter or Done... but not when we want to test it ...
		//testConfirm();

		//window.addEventListener("input", function(e) {console.log("input: " + UTIL.objInfo(e, true))}, false);
		//window.addEventListener("keypress", function(e) {console.log("window keypress: " + UTIL.objInfo(e, true))}, false);
		//window.addEventListener("keydown", function(e) {console.log("window keydown: " + UTIL.objInfo(e, true))}, false);
		//window.addEventListener("keyup", function(e) {console.log("window keyup: " + UTIL.objInfo(e, true))}, false);


		EDITOR.addRender(kaiOsStatus, 4650);

		textarea = document.getElementById("clipboardcatcher");
		textarea.addEventListener("keypress", function(e) {console.log("textarea keypress: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "")}, false);
		textarea.addEventListener("keydown", function(e) {console.log("textarea keydown: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "");}, false);
		textarea.addEventListener("keyup", function(e) {console.log("textarea keyup: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "")}, false);
		

		EDITOR.on("keyPressed", function kaiOsKeyPressed(file, character, combo, ev) {
			console.log("EDITOR keyPressed: character=" + character + " keyCode=" + ev.keyCode + " key=" + ev.key + " code=" + ev.code + ""); 
			return ALLOW_DEFAULT;
		});
		EDITOR.on("keyDown", function kaiOsKeyDown(file, character, combo, ev) {console.log("EDITOR keyDown: character=" + character + " keyCode=" + ev.keyCode + " key=" + ev.key + " code=" + ev.code + ""); return ALLOW_DEFAULT;});
		

		//inputGoto.addEventListener("keypress", function() {alert("keypress");}, false);
	}

	function unloadKaiOsSupport() {

		//EDITOR.unbindKey(microphoneToggle);
		EDITOR.removeRender(showMessage);

	}

	function kaiToggleMode2(file, character, combo, ev) {
		return kaiToggleMode(file, character, combo, ev);
	}

	function kaiOsInput(ev) {
		console.log("KaiOS:kaiOsInput: ev=" + UTIL.objInfo(ev, true));
	}

	function kaiOsKeypress(ev) {
		console.log("KaiOS:kaiOsKeypress: ev=" + UTIL.objInfo(ev, true));
	}

	function testConfirm() {
		var yes = "Yes, please";
		var no = "No, never mind";

		confirmBox("This is a confirm box. What do you choose ?", [yes, no], function(answer) {
			alertBox("Your answer: " + answer);
		});
	}

	function microphoneToggle() {
	}

	function adoptForSmallScreen() {

	}

	function mozInfo() {

		if(typeof window.navigator == "object" || typeof window.navigator.mozApps == "object" || typeof window.navigator.mozApps.getSelf != "function") return;

		var request = window.navigator.mozApps.getSelf();
		request.onsuccess = function() {
			if (request.result) {
				// Pull the name of the app out of the App object
				alert("KaiOS: Name of current app: " + request.result.manifest.name);
			} else {
				alert("KaiOS: Called from outside of an app");
			}
		};
		request.onerror = function() {
			// Display error name from the DOMError object
			alert("KaiOS: Error: " + request.error.name);
		};

	}

	function mozInstall() {

		/*
			Try to "install" the web app
			https://developer.mozilla.org/en-US/docs/Archive/Marketplace/API/DOMApplicationsRegistry/install

			Test trigger. Run in FirefoxOS simulator debugger:
			window.open("http://192.168.0.3/index.htm");

		*/
		if(typeof window.navigator == "object" && typeof window.navigator.mozApps == "object" && typeof window.navigator.mozApps.install == "function") {
			//console.log("KaiOS: : Attempting install ...");

			/*
				Install failed, error: INVALID_URL
				I tried:
				./manifest.webapp
				manifest.webapp
				/manifest.webapp

				Got it working with: (but got another error: Install failed, error: REINSTALL_FORBIDDEN)
				http://192.168.0.3/manifest.webapp

			*/

			var manifestUrl = document.location.protocol + "//" + document.location.host + "/manifest.webmanifest";
			var request = window.navigator.mozApps.install(manifestUrl);
			request.onsuccess = function () {
				// Save the App object that is returned
				var appRecord = this.result;
				alertBox('KaiOS: Installation successful!');
			};
			request.onerror = function () {
				// Display the error information from the DOMError object
				alertBox('KaiOS: Install failed, error: ' + this.error.name + " manifestUrl=" + manifestUrl);
			};
		}

	}

	function kaiToggleMode() {
		console.log("kaiToggleMode: EDITOR.mode=" + EDITOR.mode);
		
		if(EDITOR.mode == INSERT) {
			EDITOR.setMode(NAV);
			EDITOR.hideVirtualKeyboard();
		}
		else {
			EDITOR.setMode(INSERT);
			EDITOR.showVirtualKeyboard();
		}
		
		EDITOR.input = false;
		textarea.focus();

		messageToShow = "mode: " + EDITOR.mode;
		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}
	
	function kaiToggleMenuOnKeyPress(file, combo, character, charCode, direction, targetElementClass, keyDownEvent) {
		EDITOR.ctxMenu.show(keyDownEvent);
		
		EDITOR.input = false; // Prevent inserting control character to file 
		
		return PREVENT_DEFAULT;
	}
	
	function focusNextElement() {
		//console.log("KaiOS: focusNextElement");
		//add all elements we want to include in our selection
		
		var activeElement = document.activeElement;
		var body = document.getElementById("body");
		
		if(activeElement == body) activeElement = EDITOR.lastElementWithFocus;
		
		//console.log("focusNextElement: document.activeElement=", document.activeElement);
		//console.log("focusNextElement: EDITOR.lastElementWithFocus=", EDITOR.lastElementWithFocus);
		
		if (activeElement) {
			// Can't have editor input or the editor will complain about control character being inserted
			EDITOR.input = false;
			
			activeElement.focus();
			var focussable = getFocusableElements(activeElement);
			//console.log("focusNextElement: focussable (" + focussable.length + ") ", focussable);
			var index = focussable.indexOf(activeElement);
			//console.log("focusNextElement: index=" + index);
			if(index > -1) {
				var nextElement = focussable[index + 1] || focussable[0];
				nextElement.focus();
				//console.log(nextElement);
			}
			else {
				//console.log("focusNextElement: No element to focus on!?");
				// Give back focus to the editor, for input
				setTimeout(function() {
					EDITOR.input = true;
				}, 600);
			}
			
		}
		
		return PREVENT_DEFAULT;
		
		function getFocusableElements(el) {
			var focussableElements = 'a:not([disabled]), button:not([disabled]), input[type=text]:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])';
			var focussable = Array.prototype.filter.call(el.querySelectorAll(focussableElements), function (element) {
				//check for visibility while always include the current activeElement
				return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement
			});
			
			if(focussable.length == 0 && el.parentElement) return  getFocusableElements(el.parentElement);
			
			return focussable;
		}
		
	}
	
	function kaiOsStatus(ctx) {
		//if(EDITOR.mode != INSERT && EDITOR.mode != NAV) return;

		var text = messageToShow + " " + textarea.value;

		console.log("KaiOS:showMessage: text=" + text);

		if(text.length == 0) return;

		var top = EDITOR.view.canvasHeight - EDITOR.settings.gridHeight - EDITOR.settings.bottomMargin - 80;
		var middle = top + Math.floor(EDITOR.settings.gridHeight/2);
		var measuredText = ctx.measureText(text)
		var textWidth = measuredText.width;
		var textHeight = measuredText.height || EDITOR.settings.gridHeight;
		var left = EDITOR.view.canvasWidth - textWidth - EDITOR.settings.rightMargin - 20;

		//console.log("measuredText=", measuredText);

		// Transparent padding / text fade out before cut
		ctx.fillStyle = UTIL.makeColorTransparent(EDITOR.settings.style.bgColor, 70);
		ctx.fillRect(left-40, top-16, 24, textHeight+64);

		// Background for the text
		ctx.fillStyle = EDITOR.settings.style.bgColor;
		ctx.fillRect(left-16, top-16, textWidth+64, textHeight+64);

		// Print the text
		ctx.fillStyle = EDITOR.settings.style.textColor;
		ctx.fillText(text, left, middle);

		// Show caret
		//var textToCaret = ctx.measureText(text.slice(0, commandCaretPosition)).width;
		//ctx.fillStyle = EDITOR.settings.caret.color;
		//ctx.fillRect(left + textToCaret + 1, top, EDITOR.settings.caret.width, textHeight);

	}



	/*
		
		
		var allowedTags = {input: true, textarea: true, button: true};
		
		var walker = document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT, {acceptNode: acceptNode}, false);
		
		walker.currentNode = currentElement;
		if (!walker.nextNode()) {
		// Restart search from the start of the document
		walker.currentNode = walker.root;
		walker.nextNode();
		}
		if (walker.currentNode && walker.currentNode != walker.root) walker.currentNode.focus();
		
		
		function acceptNode(node) {
		if (node.localName in allowedTags)
		return NodeFilter.FILTER_ACCEPT;
		else
		NodeFilter.FILTER_SKIP;
		}
	*/
	
	
	
})();