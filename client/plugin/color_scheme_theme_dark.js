(function() {

	/*
		
		Works on:
		* Safari on Macbook
		
		
	*/
	
	//if(!QUERY_STRING["darkTheme"]) return;
	
	var DARK = '(prefers-color-scheme: dark)'
	var LIGHT = '(prefers-color-scheme: light)'
	
	var themeLoaded = false;
	
	var cssLink;
	
	var winMenuDarkTheme;
	
	EDITOR.plugin({
		desc: "Detect and change to dark theme",
		load: loadDarkTheme,
		unload: unloadDarkTheme,
		order: 1 // Load as early as possible 
	});
	
	function loadDarkTheme() {
		
		
		winMenuDarkTheme = EDITOR.windowMenu.add(S("dark_theme"), [S("View"), S("Theme"), 40, 2], toggleDarkTheme);
		
		if(QUERY_STRING["theme"] && QUERY_STRING["theme"] != "dark") return;
		
		
		detectColorScheme();
		
		var themeDetector = document.getElementById("themeDetector");
		if(themeDetector) {
		var themeFromCss = window.getComputedStyle(themeDetector).getPropertyValue('content').replace(/"/g, '');
		}
		
		//console.log("dark_theme: themeFromCss=" + themeFromCss);
		
		if( themeFromCss == "dark") setDarkTheme();
		
		if(QUERY_STRING["theme"] == "dark") {
setDarkTheme(); // use ?darkTheme=true to force the darke theme
		}
		
		if(themeLoaded) winMenuDarkTheme.activate();
		
		window.addEventListener("devicelight", function (event) {
			// Read out the lux value
			var lux = event.value;
			//console.log("dark_theme: lux=" + lux);
			// Ask to change to dark theme if it's dark !?
		});
		}
	
	function toggleDarkTheme() {
		
		if(themeLoaded) {
			var loadTheme = "light";
		}
		else {
			var loadTheme = "dark";
		}
		
		var yes = "Yes, reload!";
		var no = "No, dont reload";
		confirmBox("Reload the editor to change theme ?", [yes, no], function (answer) {
			if(answer == yes) {
				
				EDITOR.reload("?theme=" + loadTheme);
				
			}
		});
		
		
	}
	
	function setDarkTheme() {
		if(themeLoaded) {
			//console.log("dark_theme: Dark theme already loaded!");
			return;
		}
		
		//console.log("dark_theme: Set dark theme! ...");
		

		// Backgrounds
		EDITOR.settings.style.bgColor = "rgb(41, 42, 48)";
		EDITOR.settings.style.currentLineColor = "rgb(47, 50, 57)";
		EDITOR.settings.style.selectedTextBg = "#3e4765";
		EDITOR.settings.style.highlightTextBg = "#3e5a3d";
		
		// .diff files
		EDITOR.settings.style.addedTextColor = "rgb(235, 235, 229)";
		EDITOR.settings.style.addedTextBg = "rgb(76, 142, 58)"; // rgb(101, 185, 78)

		EDITOR.settings.style.removedTextColor = "rgb(235, 235, 229)"
		EDITOR.settings.style.removedTextBg = "rgb(255, 74, 74)";


		// Text (Colors should be in rgb() format!)
		EDITOR.settings.style.textColor = "rgb(235, 235, 229)"; // 
		EDITOR.settings.style.commentColor = "rgb(162, 228, 64)";
		EDITOR.settings.style.quoteColor = "rgb(228, 228, 183)"; // #f3f3d1
		EDITOR.settings.style.xmlTagColor = "rgb(200, 241, 250)";
		EDITOR.settings.style.lineNumberColor = "rgb(114, 114, 114)";
		
		EDITOR.settings.caret.color = "rgb(255, 255, 255)";
		
		
		// Colors for the terminal emulator
		EDITOR.settings.style.colorBlack = "rgb(235, 235, 229)";
		EDITOR.settings.style.colorRed  = "rgb(255, 168, 168)";
		EDITOR.settings.style.colorGreen = "rgb(0, 250, 0)";
		EDITOR.settings.style.colorYellow = "rgb(255, 255, 0)";
		EDITOR.settings.style.colorBlue = "rgb(204, 204, 255)";
		EDITOR.settings.style.colorMagenta = "rgb(255, 158, 255)";
		EDITOR.settings.style.colorCyan = "rgb(0, 255, 255)";
		EDITOR.settings.style.colorWhite = "rgb(0, 0, 0)";
		

		EDITOR.settings.style.colorPurple = "rgb(217, 110, 228)";
		EDITOR.settings.style.colorGray = "rgb(154, 154, 154)";
		EDITOR.settings.style.colorOrange = "rgb(220, 141, 69)";

		// Experimenting
		//EDITOR.settings.style.textColor = "rgb(221, 164, 99)"; // 
		//EDITOR.settings.style.bgColor = "rgb(11, 12, 18)";
		
		// Load CSS
		var head  = document.getElementsByTagName('head')[0];
		cssLink  = document.createElement('link');
		cssLink.rel  = 'stylesheet';
		cssLink.type = 'text/css';
		cssLink.href = '/gfx/dark-theme.css';
		cssLink.media = 'all';
		head.appendChild(cssLink);
		
		// todo: Remove current Box colors (to prevent black text)
		
		
		EDITOR.renderNeeded();
		
		themeLoaded = true;
		
		EDITOR.stat("dark_theme");
		
	}
	
	
	function unloadDarkTheme() {
		
		var head  = document.getElementsByTagName('head')[0];
		if(cssLink) head.removeChild(cssLink);
		
		//refreshCss();
	}
	
	
	
	
	
	function refreshCss() {
		var links = document.getElementsByTagName('link');
		
		for (var i=0; i<links.length; i++) {
			if(links[i].getAttribute("rel").toLowerCase().indexOf("stylesheet") != -1) {
				links[i].href = links[i].href  + "?date=" + new Date().getMilliseconds();
			}
		}
		//console.log("dark_theme: CSS refreshed!");
	}
	
	
	function changeWebsiteTheme(scheme) {
		// 'dark' or 'light' string is in scheme here
		// so the website theme can be updated
		//console.log("dark_theme: changeWebsiteTheme: scheme=" + scheme);
		if(scheme == "dark") setDarkTheme();
	}
	
	function detectColorScheme() {
		//console.log("dark_theme: Detecting platform color scheme ...");
		
		if(!window.matchMedia) {
			//console.log("dark_theme: window.matchMedia not supported!");
			return
		}
		
		var mqDark = window.matchMedia(DARK)
		mqDark.addListener(listener)
		var mqLight = window.matchMedia(LIGHT)
		mqLight.addListener(listener)
		
		function listener(ev) {
			if(!ev.matches) { // Not matching anymore = not interesting
				return
			}
			if(ev.media === DARK) {
				changeWebsiteTheme('dark')
			} else if (ev.media === LIGHT) {
				changeWebsiteTheme('light')
			}
		}
	}
	
	

})();
