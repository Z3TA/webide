(function() {
	/*
		
		Allow the user to overload the CSS and JS using data from localStorage
		
	*/
	
	var nameOfJS = "jzedit_js_overload.js";
	var nameOfCSS = "jzedit_css_overload.css"
	
	EDITOR.plugin({
		desc: "Editor configuration and customization via JS and CSS overloading",
		load: load,
		unload: unload,
		order: 10000 // Run late
	});
	
	function unload() {
		EDITOR.removeEvent("afterSave", configurationMaybe);
	}
	
	function load() {
		if(!window.localStorage) {
			console.warn("window.localStorage not available. Not able to load user configuration/customization!");
			return;
		}
		
		EDITOR.on("afterSave", configurationMaybe);
		
		var jsCode = getJS();
		if(jsCode) overloadJs(jsCode)
		
		var cssCode = getCSS();
		if(cssCode) overloadCss(cssCode);
		
	}
	
	function configurationMaybe(file) {
		var fileName = UTIL.getFilenameFromPath(file.path);
		
		console.warn("configurationMaybe: fileName=" + fileName);
		
		if(fileName == nameOfJS || fileName == nameOfCSS) {
			var yes = "Save it"
			var overload = "Save and reload editor"
			var no = "Not now";
			confirmBox("Do you want to apply " + fileName + "  configuration?", [yes, overload, no], function(answer) {
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

