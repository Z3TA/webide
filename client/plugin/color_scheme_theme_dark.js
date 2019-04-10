(function() {

	/*
		
		Works on:
		* Safari on Macbook
		
		
	*/
	
	if(!QUERY_STRING["darkTheme"]) return;
	
	
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
		
		// Backgrounds
		EDITOR.settings.style.bgColor = "#202221";
		EDITOR.settings.style.currentLineColor = "#2f2e29";
		EDITOR.settings.style.selectedTextBg = "#3e4765";
		EDITOR.settings.style.highlightTextBg = "#3e5a3d";
		
		// Text
		EDITOR.settings.style.textColor = "#ffffff";
		EDITOR.settings.style.commentColor = "#4ce447";
		EDITOR.settings.style.quoteColor = "#47b3e4";
		EDITOR.settings.style.xmlTagColor = "#9988e3";
		
		
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
