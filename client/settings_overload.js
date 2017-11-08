/*
	This file will overload the settings.js
	
	(You might want to add it to .hgignore .gitignore or equivalent)
	
	1l0Oo[]{}.,   These characters should look different using a good programmin font
	
*/

(function() { // Self calling function to not clutter global scope

	// For example, chaning the color of xml tags:
	//EDITOR.settings.style.xmlTagColor = "rgb(255,0,0)";
	
	var browser = UTIL.checkBrowser();
	
	console.log("runtime=" + runtime + " browser=" + browser + " process.platform=" + process.platform);

if(runtime=="browser") {
	
	// We better use a web safe font in the browser
	EDITOR.settings.style.font = "Courier New";
	EDITOR.settings.style.highlightMatchFont = "bold 15px Courier New";
	EDITOR.settings.style.fontSize = 15;
	EDITOR.settings.gridHeight = 23;
	EDITOR.settings.gridWidth = 9;
	
		
		var width = parseInt(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
		var height = parseInt(window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
		
		//alert("width=" + width + " height=" + height + "");
		
		if( (!isNaN(width) && width <= 600) || (!isNaN(height) && height <= 250) ) {
			// Use a smaller text size on small screens
			EDITOR.settings.style.font = "Courier New";
			EDITOR.settings.style.highlightMatchFont = "bold 11px Courier New";
			EDITOR.settings.style.fontSize = 10;
			EDITOR.settings.gridHeight = 14;
			EDITOR.settings.gridWidth = 6;
			EDITOR.settings.leftMargin = 24;
			EDITOR.settings.rightMargin = 24;
			EDITOR.settings.topMargin = 4;
			EDITOR.settings.bottomMargin = 2;
		}
		else {
		
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
		
		/*
			Ligatures
			---------
		Ligatures are basically two letter as one. Fira code for example makes => into an arrow.
		
		if(a != b && b <= c && x != y)
		
		<* <*> <+> <$> *** <| |> <|> !! || === ==> <<< >>> <> +++ <- -> => >> << >>= =<< .. ... :: -< >- -<< >>- ++ /= ==
		
	*/
		if(1==2 && (browser == "Chrome" || browser == "Safari" || browser == "Firefox")) {
			// Ligatures are confirmed to work in: Chrome/Chromium/Opera, Firefox, Safari, but not IE
		UTIL.loadCSS("gfx/font/FiraCode_1.204/fira_code.css");
		EDITOR.settings.style.font = "Fira Code";
		if(UTIL.checkBrowser() == "Firefox") {
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
		
		
		
	}

	if(process.platform == "win32" && (runtime == "nw.js" || browser == "Chrome") && EDITOR.settings.sub_pixel_antialias == true) {
		// Only Chrome/Chromium/nw.js supports sub-pixel antialias. Consolas needs sub-pixel antialias to look good
		
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

if(process.platform == "linux" && runtime == "nw.js") {
	
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
	
})();