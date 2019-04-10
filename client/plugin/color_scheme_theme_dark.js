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
	
	EDITOR.plugin({
		desc: "Detect and change to dark theme",
		load: loadDarkTheme,
		unload: unloadDarkTheme
	});
	
	function loadDarkTheme() {
		
		detectColorScheme();
		
		var themeFromCss = window.getComputedStyle(document.documentElement).getPropertyValue('content').replace(/"/g, '');
		console.log("dark_theme: themeFromCss=" + themeFromCss);
		if( themeFromCss == "dark") setDarkTheme();
		
		setDarkTheme();
		
	}
	
	function setDarkTheme() {
		if(themeLoaded) {
			console.log("dark_theme: Dark theme already loaded!");
			return;
		}
		console.log("dark_theme: Set dark theme! ...");
		
		// 
		
		// Backgrounds
		EDITOR.settings.style.bgColor = "#2b2c27";
		EDITOR.settings.style.currentLineColor = "#404036";
		EDITOR.settings.style.selectedTextBg = "#3e4765";
		EDITOR.settings.style.highlightTextBg = "#3e5a3d";
		
		// Text (Colors should be in rgb() format!)
		EDITOR.settings.style.textColor = "rgb(235, 235, 229)"; // 
		EDITOR.settings.style.commentColor = "rgb(162, 228, 64)";
		EDITOR.settings.style.quoteColor = "rgb(228, 228, 183)"; // #f3f3d1
		EDITOR.settings.style.xmlTagColor = "rgb(200, 241, 250)";
		EDITOR.settings.style.lineNumberColor = "rgb(114, 114, 114)";
		
		EDITOR.settings.caret.color = "#ffffff";
		
		
		
		
		
		
		// Load CSS
		var head  = document.getElementsByTagName('head')[0];
		cssLink  = document.createElement('link');
		cssLink.rel  = 'stylesheet';
		cssLink.type = 'text/css';
		cssLink.href = '/gfx/dark-theme.css';
		cssLink.media = 'all';
		head.appendChild(cssLink);
		
		
		EDITOR.renderNeeded();
		
		themeLoaded = true;
		
	}
	
	
	function unloadDarkTheme() {
		
		var head  = document.getElementsByTagName('head')[0];
		head.removeChild(cssLink);
		
		//refreshCss();
	}
	
	
	
	
	
	function refreshCss() {
		var links = document.getElementsByTagName('link');
		
		for (var i=0; i<links.length; i++) {
			if(links[i].getAttribute("rel").toLowerCase().indexOf("stylesheet") != -1) {
				links[i].href = links[i].href  + "?date=" + new Date().getMilliseconds();
			}
		}
		console.log("dark_theme: CSS refreshed!");
	}
	
	
	function changeWebsiteTheme(scheme) {
		// 'dark' or 'light' string is in scheme here
		// so the website theme can be updated
		console.log("dark_theme: changeWebsiteTheme: scheme=" + scheme);
		if(scheme == "dark") setDarkTheme();
	}
	
	function detectColorScheme() {
		console.log("dark_theme: Detecting platform color scheme ...");
		
		if(!window.matchMedia) {
			console.log("dark_theme: window.matchMedia not supported!");
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
