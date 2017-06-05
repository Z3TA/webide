/*
	This file will overload the settings.js
	
	(You might want to add it to .hgignore .gitignore or equivalent)
	
*/

//EDITOR.settings.style.xmlTagColor = "rgb(255,0,0)";

// 1l0Oo[]{}.,

console.log("runtime=" + runtime);

if(runtime=="browser") {
	
	// We better use a web safe font ...
	EDITOR.settings.style.font = "Courier New";
	EDITOR.settings.style.highlightMatchFont = "bold 15px Courier New";
	EDITOR.settings.style.fontSize = 15;
	EDITOR.settings.gridHeight = 23;
	EDITOR.settings.gridWidth = 9;
	
	// Web safe fonts are ugly, try to load a nice font ...
	// OMG! DIFFERENT BROWSERS HAVE DIFFERENT SPACINGS FOR THE SAME FONT
	if(UTIL.checkBrowser() != "Firefox") {
		UTIL.loadCSS("gfx/font/DejaVuSansMono/DejaVuSansMono.css");
		EDITOR.settings.style.font = "DejaVuSansMono";
	EDITOR.settings.style.highlightMatchFont = "bold 14px DejaVuSansMono";
	EDITOR.settings.style.fontSize = 13;
	EDITOR.settings.gridHeight = 22;
	EDITOR.settings.gridWidth = 7.83;
	}
	
	
	/*
		Ligature test
		Ligatures are basically two letter as one. Fira code for example makes => into an arrow.
		Confirmed to worke in: Chrome/Chromium, Firefox, 
		
		if(a != b && b <= c && x != y)
		
		<* <*> <+> <$> *** <| |> <|> !! || === ==> <<< >>> <> +++ <- -> => >> << >>= =<< .. ... :: -< >- -<< >>- ++ /= ==
		
	*/
	if(1==1) {
		UTIL.loadCSS("gfx/font/FiraCode_1.204/fira_code.css");
		EDITOR.settings.style.font = "Fira Code";
		}
	
	
}
else if(process.platform == "windows") {
	
/*
	Windows with "Smooth edges of screen fonts" turned off.
	These font's look good:
	
	* DejaVu Sans Mono 14px
	* ProggyCleanTT <=16px (very small)
	* Ubuntu Mono (many sizes look good!)
	* Luculent 14px (many sizes look good!)
	* Lucida Console 13px
	* Courier New 16-17px
	* Liberation Mono 12px
	
		otherwise Consolas is the best ;)
		
*/
	
	EDITOR.settings.style.font = "Consolas";
	EDITOR.settings.style.highlightMatchFont = "bold 15px Consolas";
	EDITOR.settings.style.fontSize = 15;
	EDITOR.settings.gridHeight = 23;
	EDITOR.settings.gridWidth = 8.25;
	
}
else if(process.platform == "linux") {
	
	/*
		
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
