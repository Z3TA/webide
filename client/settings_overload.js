/*
	This file will overload the settings.js
	
	(You might want to add it to .hgignore .gitignore or equivalent)
	
	1l0Oo[]{}.,   These characters should look different using a good programmin font
	
*/

(function() { // Self calling function to not clutter global scope

	// For example, chaning the color of xml tags:
	//EDITOR.settings.style.xmlTagColor = "rgb(255,0,0)";
	
	var browser = UTIL.checkBrowser();
	var ligatures = false;

	console.log("settings_overload.js: RUNTIME=" + RUNTIME + " browser=" + browser + " process.platform=" + process.platform + " ligatures=" + false);

	if(ligatures && (browser == "Chrome" || browser == "Safari" || browser == "Firefox")) {
		/*
			Ligatures
			---------
			Ligatures are basically two letter as one. Fira code for example makes => into an arrow.
			
			if(a != b && b <= c && x != y)
			
			<* <*> <+> <$> *** <| |> <|> !! || === ==> <<< >>> <> +++ <- -> => >> << >>= =<< .. ... :: -< >- -<< >>- ++ /= ==
			
			Ligatures are confirmed to work in: Chrome/Chromium/Opera, Firefox, Safari, but not MSIE
			Download Fira Code (https://github.com/tonsky/FiraCode/releases/) and put it in gfx/font/ 
			and change the path (/FiraCode_1.204/) below:
			
			*/
		UTIL.loadCSS("gfx/font/FiraCode_1.204/fira_code.css");
		EDITOR.settings.style.font = "Fira Code";
		
		if(browser == "Firefox") {
			// Firefox renders font's differently
			EDITOR.settings.style.fontSize = 15;
			EDITOR.settings.gridHeight = 23;
			EDITOR.settings.gridWidth = 9;
			EDITOR.settings.style.highlightMatchFont = "bold 15px Fira Code";
		}
		else {
			EDITOR.settings.style.fontSize = 13;
			EDITOR.settings.gridHeight = 22;
			EDITOR.settings.gridWidth = 7.83;
			EDITOR.settings.style.highlightMatchFont = "bold 14px Fira Code";
		}
	}
	else if(process.platform == "win32" && (RUNTIME == "nw.js" || browser == "Chrome") && window.devicePixelRatio == 1) {
		// Only Chrome/Chromium/nw.js supports sub-pixel antialias. Consolas needs sub-pixel antialias to look good
		EDITOR.settings.sub_pixel_antialias = true;
		
	/*
			When Windows with "Smooth edges of screen fonts" turned off, these font's look good:
		
		* DejaVu Sans Mono 14px
		* ProggyCleanTT <=16px (very small)
		* Ubuntu Mono (many sizes look good!)
		* Luculent 14px (many sizes look good!)
		* Lucida Console 13px
		* Courier New 16-17px
		* Liberation Mono 12px
		
			otherwise Consolas looks best ;)
		
	*/
	
	EDITOR.settings.style.font = "Consolas";
	EDITOR.settings.style.highlightMatchFont = "bold 15px Consolas";
	EDITOR.settings.style.fontSize = 15;
	EDITOR.settings.gridHeight = 23;
	EDITOR.settings.gridWidth = 8.25;
	
}
	else if(process.platform == "linux" && RUNTIME == "nw.js") {
	
	/*
			Linux does not have Consolas (see README.txt on how to download it if you are desperate)
			
		Tested fonts: 
		* Inconsolata
		* Ubuntu Mono
		* Nimbus Mono L
		* Droid Sans Mono
		* Source Code Pro
		* Liberation Mono
		
		Ended up using Liberation Mono and the following font settings (Linux, Ubuntu) 
		Font manager (sudo apt-get install font-manager): (aB icon) "Set font preferences" --> Advanced settings
		* Antialias: Yes
		* Auto-Hint: No
		* Hinting: Medium
		* LCD Filter: Default
		
	*/
	
	
	/*
		EDITOR.settings.gridHeight = 17;
		EDITOR.settings.gridWidth = 8;
		EDITOR.settings.leftMargin = 30;
		EDITOR.settings.style.fontSize = 12;
		EDITOR.settings.style.font = "Liberation Mono";
		EDITOR.settings.style.highlightMatchFont = "bold 12px Liberation Mono";
	*/
	
	EDITOR.settings.style.font = "DejaVu Sans Mono";
	EDITOR.settings.style.highlightMatchFont = "bold 14px DejaVu Sans Mono";
	EDITOR.settings.style.fontSize = 13;
	EDITOR.settings.gridHeight = 22;
	EDITOR.settings.gridWidth = 7.83;
	
}
	else if(  RUNTIME=="browser" && browser != "Firefox" && (browser.indexOf("MSIE") != 0 || location.host == "127.0.0.1" || location.host == "localhost")  ) {
		// Firefox have font render issues
		// Web safe fonts are ugly, try to load a nice font ...
		if(browser != "Firefox") { // Firefox have wierd kerning/spacing
			UTIL.loadCSS("gfx/font/DejaVuSansMono/DejaVuSansMono.css");
			EDITOR.settings.style.font = "DejaVuSansMono";
			EDITOR.settings.style.highlightMatchFont = "bold 13px DejaVuSansMono";
			EDITOR.settings.style.fontSize = 13;
			EDITOR.settings.gridHeight = 22;
			EDITOR.settings.gridWidth = 7.83;
		}
	}
	else if(RUNTIME=="browser") {
		
		// Internet Explorer doesn't support sub-pixel rendering / LCD-text in the Canvas!
		// So Consolas wont look that good ...
		// Nor does Internet Explorer support custom fonts (unless on localhost)!
		
		// We better use a web safe font in the browser
		EDITOR.settings.style.font = "Courier New, Courier, monospace";
		EDITOR.settings.style.highlightMatchFont = "bold 15px Courier New, Courier, monospace";
		EDITOR.settings.style.fontSize = 15;
		EDITOR.settings.gridHeight = 23;
		EDITOR.settings.gridWidth = 9;
		
		
		var width = parseInt(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
		var height = parseInt(window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
		
		//alert("width=" + width + " height=" + height + "");
		
		
		if( (!isNaN(width) && width <= 600) || (!isNaN(height) && height <= 250) ) {
			// Use a smaller text size on small screens
			// On some devices which doesn't have high DPI screen, the small text size is undreadable!
			/*
				alert("Setting extra small text size due to width=" + width + " and height=" + height);
				EDITOR.settings.style.font = "Courier New, Courier, monospace";
				EDITOR.settings.style.highlightMatchFont = "bold 10px Courier New, Courier, monospace";
				EDITOR.settings.style.fontSize = 10;
				EDITOR.settings.gridHeight = 14;
				EDITOR.settings.gridWidth = 6;
				EDITOR.settings.leftMargin = 24;
				EDITOR.settings.rightMargin = 24;
				EDITOR.settings.topMargin = 4;
				EDITOR.settings.bottomMargin = 2;
			*/
		}
		
	}
})();