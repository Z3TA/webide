(function() {
	/*
		
		Allow the user to overload the CSS and JS using data from localStorage
		
	*/
	
	var nameOfJS = "webide_js_overload.js";
	var nameOfCSS = "webide_css_overload.css"
	
	var winMenuEditorCustomization;
	
	EDITOR.plugin({
		desc: "Editor configuration and customization via JS and CSS overloading",
		load: load,
		unload: unload,
		order: 10000 // Run late
	});
	
	function unload() {
		EDITOR.removeEvent("afterSave", configurationMaybe);
		EDITOR.unregisterAltKey(showLocalCustomization);
		EDITOR.windowMenu.remove(winMenuEditorCustomization);
	}
	
	function load() {
		if(!window.localStorage) {
			console.warn("window.localStorage not available. Not able to load user configuration/customization!");
			return;
		}
		
		EDITOR.on("afterSave", configurationMaybe);
		
		winMenuEditorCustomization = EDITOR.windowMenu.add("Customization scripts", ["Editor", 16], showLocalCustomization);
		
		EDITOR.registerAltKey({char: "Compl", alt:3, label: "Editor customization", fun: showLocalCustomization});
		
		var root = (EDITOR.user && EDITOR.user.homeDir) || "/";
		
		var jsCode = getJS();
		if(jsCode) overloadJs(jsCode);
		/*
			else {
			EDITOR.readFromDisk( UTIL.joinPaths(root,nameOfJS), function(err, jsCode) {
			if(!err && jsCode) {
			overloadJs(jsCode);
			}
			});
			}
		*/
		
		var cssCode = getCSS();
		if(cssCode) overloadCss(cssCode);
		/*
			else {
			EDITOR.readFromDisk( UTIL.joinPaths(root,nameOfCSS), function(err, cssCode) {
			if(!err && cssCode) {
			overloadCss(cssCode);
			}
			});
			}
		*/
		
	}
	
	function configurationMaybe(file) {
		var fileName = UTIL.getFilenameFromPath(file.path);
		
		console.warn("configurationMaybe: fileName=" + fileName);
		
		if(fileName == nameOfJS || fileName == nameOfCSS) {
			var yes = "Yes";
			var overload = "Yes, and restart!";
			var no = "Not now";
			confirmBox("Save the content of " + fileName + " locally and run it when the editor loads !?", [yes, overload, no], function(answer) {
				if(answer==overload || answer==yes) {
					if(fileName==nameOfJS) saveJS(file.text);
					else if(fileName==nameOfCSS) saveCSS(file.text);
					else throw new Error("filename=" + fileName);
				}
				
				if(answer==overload) EDITOR.reload();
			});
		}
		
		return ALLOW_DEFAULT;
	}
	
	function overloadJs(jsCode) {
		// todo: Load the script as is instead !?
		try {
			eval(jsCode);
		}
		catch (err) {
			alertBox("Failed to run " + nameOfJS + ": " + err.message + " (Open dev-tools Ctrl-Shift-I for more info");
			console.error(err);
		}
	}
	
	function overloadCss(cssCode) {
		var links = document.getElementsByTagName('link');
		var lastLink = links[links.length-1];
		
		var style = document.createElement("style");
		style.type = 'text/css';
		if (style.styleSheet){
			// This is required for IE8 and below.
			style.styleSheet.cssText = css;
		}
		else {
			style.appendChild(document.createTextNode(cssCode));
		}
		
		insertAfter(style, lastLink);
		
		// The browser should now load the CSS (could take a few seconds)
		
		function insertAfter(newNode, referenceNode) {
			// https://stackoverflow.com/questions/4793604/how-to-insert-an-element-after-another-element-in-javascript-without-using-a-lib
			referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
		}
	}
	
	function showLocalCustomization() {
		var jsCode = getJS();
		var cssCode = getCSS();
		
		if(!jsCode) {
			jsCode = '/*\nThis code will execute every time you start the editor!\n*/\n\n';
		}
		
		if(!cssCode) {
			cssCode = '/*\nThese CSS rules will be applied when you start the editor!\n*/';
		}
		
		EDITOR.openFile(nameOfJS, jsCode, function(err, file) {
			if(err) throw err;
			
		});
		
		EDITOR.openFile(nameOfCSS, cssCode, function(err, file) {
			if(err) throw err;
			
		});
		
		EDITOR.ctxMenu.hide();
		winMenuEditorCustomization.hide();
	}
	
	function getJS() {
		return window.localStorage.getItem(nameOfJS);
	}
	
	function getCSS() {
		return window.localStorage.getItem(nameOfCSS);
	}
	
	function saveJS(jsCode) {
		window.localStorage.setItem(nameOfJS, jsCode);
	}
	
	function saveCSS(cssCode) {
		window.localStorage.setItem(nameOfCSS, cssCode);
	}
	
	
})();

