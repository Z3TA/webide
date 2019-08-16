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
		
	*/
	
	var INSERT = "numericKeypadInsert";
	var NAV = "numericKeypadNavigate";
	
	EDITOR.plugin({
		desc: "Support for KaiOS",
		load: loadKaiOsSupport,
		unload: unloadKaiOsSupport
	});
	
	function loadKaiOsSupport() {
		EDITOR.bindKey({desc: "Focus next element", key: "SoftRight", fun: focusNextElement});
		EDITOR.bindKey({desc: "Show context menu", key: "SoftLeft", fun: kaiTogglewMenu});
		EDITOR.bindKey({desc: "Show context menu", key: "Call", fun: kaiToggleMode});
		
		EDITOR.addMode(INSERT);
		EDITOR.addMode(NAV);
		
		/*
			Try to "install" the web app 
			https://developer.mozilla.org/en-US/docs/Archive/Marketplace/API/DOMApplicationsRegistry/install
			
			Test trigger. Run in FirefoxOS simulator debugger:
			window.open("http://192.168.0.3/index.htm");
			
		*/
		if(typeof window.navigator == "object" && typeof window.navigator.mozApps == "object" && typeof window.navigator.mozApps.install == "function") {
			console.log("KaiOS: : Attempting install ...");
			
			/*
				Install failed, error: INVALID_URL
				I tried: 
				./manifest.webapp
				manifest.webapp
				/manifest.webapp
				
				Got it working with: (but got another error: Install failed, error: REINSTALL_FORBIDDEN)
				http://192.168.0.3/manifest.webapp
				
			*/
			
			var manifestUrl = document.location.protocol + "//" + document.location.host + "/manifest.webapp";
			var request = window.navigator.mozApps.install(manifestUrl);
			request.onsuccess = function () {
				// Save the App object that is returned
				var appRecord = this.result;
				alertBox('Installation successful!');
			};
			request.onerror = function () {
				// Display the error information from the DOMError object
				alertBox('Install failed, error: ' + this.error.name + " manifestUrl=" + manifestUrl);
			};
		}
		
	}
	
	function unloadKaiOsSupport() {}
	
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
		
		return PREVENT_DEFAULT;
	}
	
	function kaiTogglewMenu() {
		EDITOR.ctxMenu.show();
		
		EDITOR.input = false; // Prevent inserting control character to file 
		
		return PREVENT_DEFAULT;
	}
	
	function focusNextElement() {
		console.log("KaiOS: focusNextElement");
		//add all elements we want to include in our selection
		
		var activeElement = document.activeElement;
		var body = document.getElementById("body");
		
		if(activeElement == body) activeElement = EDITOR.lastElementWithFocus;
		
		console.log("focusNextElement: document.activeElement=", document.activeElement);
		console.log("focusNextElement: EDITOR.lastElementWithFocus=", EDITOR.lastElementWithFocus);
		
		if (activeElement) {
			// Can't have editor input or the editor will complain about control character being inserted
			EDITOR.input = false;
			
			activeElement.focus();
			var focussable = getFocusableElements(activeElement);
			console.log("focusNextElement: focussable (" + focussable.length + ") ", focussable);
			var index = focussable.indexOf(activeElement);
			console.log("focusNextElement: index=" + index);
			if(index > -1) {
				var nextElement = focussable[index + 1] || focussable[0];
				nextElement.focus();
				console.log(nextElement);
			}
			else {
				console.log("focusNextElement: No element to focus on!?");
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