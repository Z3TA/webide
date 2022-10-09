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

		problem: We can not capture T9 keys (the numeric keys) (only arrow keys, Call, EndCall, MicrophoneToggle)
		We can however capture the numeric key if they are longpressed...
		When a textarea is focused the only event the fires is the input event, but it doesn't say which key was pressed.
		We can however see the content of the textarea!
		If we know textarea is "cd", the user has pressed button 2 three times (because 2=abc) and one time on button 3 (because 3=def) , 


		note: EndCall exits the browser on KaiOS device, we probably want to leave it off, or only bind to it while in INPUT or NAV mode


		todo:
		- test developerMenu
		
		Goals:
		- make it possible to develop KaiOS apps from within the editor


	*/


	// Don't do anything if it's not a KaiOS device!
	if(typeof window.navigator != "object" || typeof window.navigator.mozApps != "object") return;

	//if(! QUERY_STRING["kaios"] ) return;

	console.log("KaiOS!")

	//document.location = "st.htm";

	LOW_RAM = true; // Otherwise KaiOS will just kill Firefox if it uses too much RAM!

	var INSERT = "T9-insert";
	var NAV = "T9-navigate";
	
	var messageToShow = "KaiOS";
	var textarea;

	var originalBottomMargin = EDITOR.settings.bottomMargin;
	var originalRightMargin = EDITOR.settings.rightMargin;

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

		var disabledBy = "KaiOS";
		EDITOR.discoveryBar.disable(disabledBy);
		EDITOR.dashboard.disable(disabledBy);

		//alertBox("KaiOS support loaded!");

		//testConfirm(); // Sometimes when we show a prompt KaiOS say Enter or Done... but doesn't when we want to test it ...

		EDITOR.addRender(kaiOsStatus, 4650);

		textarea = document.getElementById("keyboardCatcher");
		// note: inserting an element in the body and then focusing it causes the top window menu to disappear! ... (so use existing textarea element)
		textarea.value = "";


		//textarea.addEventListener("keypress", function(e) {console.log("textarea keypress: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "")}, false);
		//textarea.addEventListener("keydown", function(e) {console.log("textarea keydown: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "");}, false);
		//textarea.addEventListener("keyup", function(e) {console.log("textarea keyup: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "")}, false);
		//textarea.addEventListener("input", function(e) {console.log("textarea input: keyCode=" + e.keyCode + " key=" + e.key + " code=" + e.code + "");console.log(UTIL.objInfo(e, true));}, false);

		// Only the input event is fired when we type anything in the textarea
		textarea.addEventListener("input", textareaInput, false);
		textarea.addEventListener('blur', textareaBlur, false);

		// The editor can pick up on some of the KaiOS keyboard keys, like Call, arrow keys, etc, but not when focused on a textarea!
		// but 
		//EDITOR.on("keyPressed", function kaiOsKeyPressed(file, character, combo, ev) {console.log("EDITOR keyPressed: character=" + character + " keyCode=" + ev.keyCode + " key=" + ev.key + " code=" + ev.code + "");return ALLOW_DEFAULT;});
		EDITOR.on("keyDown", kaiOsDebugKeyDown);
		//EDITOR.bindKey({desc: "Focus next element", key: "SoftRight", fun: focusNextElement});
		//EDITOR.bindKey({desc: "Show context menu", key: "SoftLeft", fun: kaiToggleMenuOnKeyPress});
		EDITOR.bindKey({desc: "Toggle between T9 modes", key: "Call", mode: "*", fun: kaiToggleMode});

		// TEST-CODE-START
		EDITOR.bindKey({desc: "Reload KaiOS plugin", key: "SoftRight", mode: "*", fun: kaiReloadPlugin});
		// TEST-CODE-END

		EDITOR.bindKey({desc: "Delete character", key: "Backspace", mode: INSERT, fun: kaiBackspaceInInsertMode}); // Backspace does not fire textarea input event!
		
		EDITOR.bindKey({desc: "Go down", key: "ArrowDown", mode: INSERT, fun: kaiArrowDownInInsertMode});
		EDITOR.bindKey({desc: "Go up", key: "ArrowUp", mode: INSERT, fun: kaiArrowUpInInsertMode});
		EDITOR.bindKey({desc: "Go left", key: "ArrowLeft", mode: INSERT, fun: kaiArrowLeftInInsertMode});
		EDITOR.bindKey({desc: "Go right", key: "ArrowRight", mode: INSERT, fun: kaiArrowRightInInsertMode});


		// Enter key (middle key on KaiOS device) is captured using input event while focused on a textarea! However isComposing will be true
		EDITOR.bindKey({desc: "KaiOS Enter", key: "Enter", mode: INSERT, fun: kaiEnterInInsertMode});
		
		//EDITOR.bindKey({desc: "Toggle mic", key: "MicrophoneToggle", fun: microphoneToggle}); // Randomly triggers when pressing Main button

		//EDITOR.bindKey({desc: "Switch mode", key: "k", combo: ALT, mode: "*", fun: kaiToggleMode2}); // For testing on non-t9 keyboard


		//inputGoto.addEventListener("keypress", function() {alert("keypress");}, false);
	
		
		EDITOR.settings.bottomMargin = 28; // KaiOS has a bar at the bottom that covers the canvas
		EDITOR.settings.rightMargin = 8; // 

		EDITOR.resizeNeeded();

		alertBox("Hello KaiOS/FirefoxOS user. Use the green phone button to switch editor mode. Support is experimental, please leave feedback :)");

	}

	function unloadKaiOsSupport() {

		EDITOR.removeMode(INSERT);
		EDITOR.removeMode(NAV);

		//var body = document.getElementById("body");
		//body.removeChild(textarea);

		EDITOR.removeEvent("keyDown", kaiOsDebugKeyDown);

		EDITOR.unbindKey(kaiToggleMode);
		EDITOR.unbindKey(kaiReloadPlugin);
		EDITOR.unbindKey(kaiBackspaceInInsertMode);
		EDITOR.unbindKey(kaiEnterInInsertMode);
		EDITOR.unbindKey(kaiArrowDownInInsertMode);
		EDITOR.unbindKey(kaiArrowUpInInsertMode);
		EDITOR.unbindKey(kaiArrowLeftInInsertMode);
		EDITOR.unbindKey(kaiArrowRightInInsertMode);

		EDITOR.removeRender(kaiOsStatus);

		EDITOR.settings.bottomMargin = originalBottomMargin;
		EDITOR.settings.rightMargin = originalRightMargin;
		EDITOR.resizeNeeded();

		setNormalMode();

	}

	function developerMenu() {
		if(window.MozActivity) {
			var act = new MozActivity({
				name: "configure",
				data: {
					target: "device",
					section: "developer"
				}
			})
		} else if(window.WebActivity) { // KaiOS 3.0
			var act = new WebActivity("configure", {
				target: "device",
				section: "developer"
			})
			act.start().catch(function(e){window.alert('Cannot launch developer menu: ' + e)})
		} else {
			alertBox("MozActivity nor WebActivity supported on your device. See https://bananahackers.net/");
		}
	}


	function kaiBackspaceInInsertMode() {
		var file = EDITOR.currentFile;
		if(!file) return ALLOW_DEFAULT;

		file.moveCaretLeft();
		file.deleteCharacter();
		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function kaiEnterInInsertMode() {
		var file = EDITOR.currentFile;
		if(!file) return ALLOW_DEFAULT;

		file.insertLineBreak();
		file.scrollToCaret();

		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function kaiArrowDownInInsertMode() {
		var file = EDITOR.currentFile;
		if(!file) return ALLOW_DEFAULT;

		file.moveCaretDown();
		file.scrollToCaret();
		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function kaiArrowUpInInsertMode() {
		var file = EDITOR.currentFile;
		if(!file) return ALLOW_DEFAULT;

		file.moveCaretUp();
		file.scrollToCaret();
		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function kaiArrowLeftInInsertMode() {
		var file = EDITOR.currentFile;
		if(!file) return ALLOW_DEFAULT;

		file.moveCaretLeft();
		file.scrollToCaret();
		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function kaiArrowRightInInsertMode() {
		var file = EDITOR.currentFile;
		if(!file) return ALLOW_DEFAULT;

		file.moveCaretRight();
		file.scrollToCaret();
		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function sanityCheck() {
		if(typeof EDITOR.setMode != "function") throw new Error("EDITOR.setMode=" + EDITOR.setMode);
	}

	function kaiOsDebugKeyDown(file, character, combo, ev) {
		console.log("EDITOR keyDown: character=" + character + " keyCode=" + ev.keyCode + " key=" + ev.key + " code=" + ev.code + " mode=" + EDITOR.mode); 
		return ALLOW_DEFAULT;
	}
	
	function kaiReloadPlugin() {
		console.log("kaiReloadPlugin!");
		sanityCheck();

		var head = document.getElementsByTagName("html")[0];
		var scripts = head.getElementsByTagName("script");

		// Find the script ...
		var reloaded = false;
		for(var i=0; i < scripts.length; i++) {
			if( scripts[i].src.indexOf("kaios.js") == -1) {
				//console.log("kaiReloadPlugin: Not kaios plugin: " + scripts[i].src);
				continue;
			}
			else {
				break;
			}
		}

		console.log("kaiReloadPlugin: i=" + i + " scripts.length=" + scripts.length + "");

		if(i == scripts.length) {
			console.log("kaiReloadPlugin: Unable to find KaiOS plugin!");
			throw new Error("Unable to find KaiOS plugin!");
		}

		var script = scripts[i];
		var scriptSource = script.src;
		var parent = script.parentNode;

		if(!parent) {
			console.log("kaiReloadPlugin: parent=" + parent);
		}

		unloadKaiOsSupport();

		parent.removeChild(script);

		script = document.createElement("script");
		script.src = scriptSource; // Relative path
		script.type = "text/javascript";

		try {
			parent.appendChild(script);
		}
		catch(err) {
			console.log("kaiReloadPlugin: Failed to append script!");
		}

		sanityCheck();

		return PREVENT_DEFAULT;
	}

	function textareaInput(ev) {

		console.log( "KaiOS:textareaInput: textarea.value=" + UTIL.lbChars(textarea.value + " ev.isComposing=" + ev.isComposing) );
		//console.log( "KaiOS:textareaInput: debug: " + UTIL.objInfo(ev, true) );

		if(ev.isComposing) return ALLOW_DEFAULT; // Means the user is still generating the character...

		if(EDITOR.mode == INSERT) {
			insert(textarea.value);
		}
		else if(EDITOR.mode == NAV) {
			kaiNav(textarea.value);
		}

		textarea.value = "";

		sanityCheck();

		// note: returning false aka PREVENT_DEFAULT will not prevent input into the textarea!
	}

	function textareaBlur() {
		console.log("KaiOS:textareaBlur!");
		setNormalMode();
	}

	function kaiNav(str) {

	}

	function insert(str) {
		var file = EDITOR.currentFile;
		if(file == undefined) return ALLOW_DEFAULT;
		for (var i=0, letter=""; i<str.length; i++) {
			letter = str[i];
			console.log("KayOS:insert:str=" + str + " str[" + i + "]=" + str[i]);

			if(letter == "\n") {
				file.insertLineBreak();
			}
			else file.putCharacter(letter);
		}
		EDITOR.renderNeeded();
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
		
		console.log("KaiOS: EDITOR.view=" + JSON.stringify(EDITOR.view) + " EDITOR.settings.bottomMargin=" + EDITOR.settings.bottomMargin);

		if(EDITOR.mode != INSERT && EDITOR.mode != NAV) {
			EDITOR.setMode(INSERT);
			EDITOR.showVirtualKeyboard();
			messageToShow = INSERT;
			EDITOR.input = false;
			textarea.focus();
		}
		else if(EDITOR.mode == INSERT) {
			EDITOR.setMode(NAV);
			EDITOR.hideVirtualKeyboard();
			messageToShow = NAV;
			EDITOR.input = false;
			textarea.focus();
		}
		else if(EDITOR.mode == NAV) {
			setNormalMode();
		}

		EDITOR.renderNeeded();

		return PREVENT_DEFAULT;
	}

	function setNormalMode() {
		console.log("KaiOS:setNormalMode!");
		EDITOR.setMode(EDITOR.defaultMode);
		EDITOR.hideVirtualKeyboard();
		messageToShow = "DEFAULT (non modal) MODE";
		textarea.blur();
		EDITOR.canvas.focus();
		EDITOR.input = true;
		EDITOR.renderNeeded();
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

		//console.log("KaiOS:showMessage: text=" + text);

		if(text.length == 0) return;

		var top = EDITOR.view.canvasHeight - EDITOR.settings.gridHeight - EDITOR.settings.bottomMargin;
		var middle = top + Math.floor(EDITOR.settings.gridHeight/2);
		var measuredText = ctx.measureText(text)
		var textWidth = measuredText.width;
		var textHeight = measuredText.height || EDITOR.settings.gridHeight;
		var left = EDITOR.view.canvasWidth - textWidth - EDITOR.settings.rightMargin;

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