(function() {

	var DARK = '(prefers-color-scheme: dark)'
	var LIGHT = '(prefers-color-scheme: light)'
	
	detectColorScheme();
	
	window.addEventListener("load", function figureTheme() {
		var themeFromCss = window.getComputedStyle(document.documentElement).getPropertyValue('content').replace(/"/g, '');
		alertBox("themeFromCss=" + themeFromCss);
	});
	
	function changeWebsiteTheme(scheme) {
		// 'dark' or 'light' string is in scheme here
		// so the website theme can be updated
		alertBox("changeWebsiteTheme: scheme=" + scheme);
	}
	
	function detectColorScheme() {
		if(!window.matchMedia) {
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
