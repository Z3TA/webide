/*
	This file will overload the settings.js
	
	(You might want to add it to .hgignore .gitignore or equivalent)
	
	Note: Induvidual users can change their settings using Customization Scripts (webide_js_overload.js)
	
	
	1l0Oo[]{}.,   These characters should look different using a good programming font
	
	Gotchas:
	Some fonts are made for "LCD text" (Sub pixel antialias): Consolas
	Some browsers however don't support LCD text in the canvas.
	And some browsers doesn't support web fonts (can't load custom fonts from css)
	
	Browser                Fonts LCD 
	IE11 on Windows 7      No¹   No 
	Edge on Windows 10     Yes   No
	Safari on Macbook      Yes   Maybe³
	
	Chrome on Windows 10   Yes   Yes
	Chrome on Ubuntu 16    Yes   Yes
	Chrome on Macbook      Yes   Maybe³
	
	Firefox on Windows 10  Yes   Yes
	Firefox on Ubuntu 16   Yes²  No
	Firefox on Ubuntu 18   Yes   Yes
	Firefox on Macbook     Yes   Maybe³
	
	1) IE only supports web fonts on 127.0.0.1 or localhost!
	2) Firefox on Ubuntu 16 renders font differently!
	3) If you have a high pixel density screen you can turn off LCD-sub-pixel-antialias as it's no longer needed
	

	Optimizatons
	------------
	problem: Chrome will wait until the font has loaded before running code ...
	If the browser/connection is fast we want to load the font right away,
	but if it's slow we want to wait or even skip loading the font.
	
	solution: Wait for page load event before loading web fonts ?
	before: FMP 6632ms
	after: FMP 6123
	

	If font failed to load ?
	We could detect if a font failed to load by making a new canvas and printing text with unknown font, 
	then printing it with the EDITOR.settings.style.font
	and if they are the same it probably means our font failed to load...
	
	
*/

console.log("settings_overload: loaded settings_overload.js");

(function() { // Self calling function to not clutter global scope
	"use strict";
	
	var browser = UTIL.checkBrowser();
	var ligatures = false;
	
	var webFontLoading;
	
	var slowBrowser = false;
	var verySlowBrowser = false;
	var loadFont;
	var whenFontLoaded;

	var loadCSS_error = false;

	// These timers are cleared in the window.onload event...
	var slowLoad = window.setTimeout( function() {
		slowBrowser = true;
		console.warn("settings_overload: browser is slow");
	}, 100 );
	
	var verySlowLoad = window.setTimeout( function() {
		verySlowBrowser = true;
		console.warn("settings_overload: Browser is VERY slow");
	}, 1000 );
	
	console.log("settings_overload: RUNTIME=" + RUNTIME + " browser=" + browser + " process.platform=" + process.platform + 
	" ligatures=" + ligatures + " window.devicePixelRatio=" + window.devicePixelRatio);

	if(ligatures && (browser == "Chrome" || browser == "Safari" || browser == "Firefox")) {
		/*
			Ligatures
			---------
			Ligatures are basically two letter as one. Fira code for example makes => into an arrow.
			
			if(a != b && b <= c && x != y)
			
			<* <*> <+> <$> *** <| |> <|> !! || === ==> <<< >>> <> +++ <- -> => >> << >>= =<< .. ... :: -< >- -<< >>- ++ /= ==
			
			Ligatures are confirmed to work in: Chrome/Chromium/Opera, Firefox, Safari, but not MSIE or Edge!
			
			INSTALL LIGATURE FONT:
			Download Fira Code (https://github.com/tonsky/FiraCode/releases/) and put it in gfx/font/ 
			and change the path (/FiraCode_1.204/) below:
			
			*/
		
debug("Using ligatures with FiraCode");
		webFontLoading = "FiraCode";
		loadFont = function() {
			UTIL.loadCSS("gfx/font/FiraCode_1.204/fira_code.css", cssLoadedMaybe);
		};
		whenFontLoaded = function() {
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
		};
		
		
	}
	else if(MSWIN && (RUNTIME == "nw.js" || browser == "Chrome" || browser == "Firefox") && window.devicePixelRatio == 1) {
		/*
			IE and Edge does not suppport sub-pixel-antialias in the Canvas!
			Consolas needs sub-pixel antialias to look good.
			
			In Windows with "Smooth edges of screen fonts" turned off, these font's look good:
		
		* DejaVu Sans Mono 14px
		* ProggyCleanTT <=16px (very small)
		* Ubuntu Mono (many sizes look good!)
		* Luculent 14px (many sizes look good!)
		* Lucida Console 13px
		* Courier New 16-17px
		* Liberation Mono 12px
		
			otherwise Consolas looks best ;)
		
	*/
		
		debug("Using Consolas with LCD sub pixel antialias!");
		
		// Tested in Firefox on Windows 10
		
		EDITOR.settings.sub_pixel_antialias = true; // Consolas requires LCD text or it will look ugly!
	EDITOR.settings.style.font = "Consolas";
	EDITOR.settings.style.highlightMatchFont = "bold 15px Consolas";
	EDITOR.settings.style.fontSize = 15;
	EDITOR.settings.gridHeight = 23;
		EDITOR.settings.gridWidth = 8;
		
		if(MSWIN && browser == "Chrome") {
			EDITOR.settings.gridWidth = 8.25;
		}
		
}
	else if(LINUX && RUNTIME == "nw.js") {
	
		debug("nw.js on Linux!");
		
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
	else if(    RUNTIME=="browser" && (   browser=="Firefox" || browser == "Chrome" || ( MSIE && (location.host == "127.0.0.1" || location.host == "localhost") )   )    ) {
		
		/*
			Try to load a web font (most browsers should now support them)
			
			Font's seem to work nice on localhost/127.0.0.1 in IE, but not when using a domain ...
*/
		
		debug("Loading nice font ... LCD=" + EDITOR.settings.sub_pixel_antialias + " platform=" + process.platform);
		
		if(MSWIN) {
			// Windows fonts are rendered more hard and slightly smaller then on Linux and Mac, so use a more roundish font
			
			// LiberationMono looks nice in Edge!
webFontLoading = "liberationMono";
			loadFont = function() {
				UTIL.loadCSS("gfx/font/liberation-fonts-ttf-2.00.1/liberationMono.css", cssLoadedMaybe);
			};
			whenFontLoaded = function() {
EDITOR.settings.style.font = "LiberationMono";
				EDITOR.settings.style.highlightMatchFont = "bold 14px LiberationMono";
				EDITOR.settings.style.fontSize = 14;
				EDITOR.settings.gridHeight = 22;
				EDITOR.settings.gridWidth = 8.433;
			};
		}
		else {
			// We choose Ubuntu Mono as standard because it looks good with both CLD, GrayScale, *and* without Antialias! 
			
			webFontLoading = "ubuntu";
			loadFont = function() {
				UTIL.loadCSS("gfx/font/ubuntu/ubuntu.css", cssLoadedMaybe);
			};
			whenFontLoaded = function() {
				if(webFontLoading == "ubuntu") {
					EDITOR.settings.style.font = "ubuntu";
					EDITOR.settings.style.highlightMatchFont = "bold 15px ubuntu";
					EDITOR.settings.style.fontSize = 15;
					EDITOR.settings.gridHeight = 22;
					EDITOR.settings.gridWidth = 8;
					
					
					// Text has a different width if it's antialiased!
					var antialias = detectAntialias();
					if(antialias) {
						debug("Antialias detected! Updating grid width");
EDITOR.settings.gridWidth = 7.5;
}
					
var isAndroid = /(android)/i.test(navigator.userAgent);
					if(BROWSER == "Chrome" && DISPLAY_MODE == "standalone" && isAndroid) {
						// Weird bug when added to desktop from Chrome on Android where we get different kerning...
						EDITOR.settings.style.highlightMatchFont = "bold 16px ubuntu";
						EDITOR.settings.style.fontSize = 16;
						EDITOR.settings.gridHeight = 22;
						EDITOR.settings.gridWidth = 8;
					}
					
					// mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmoxx
				}
			};
			
			
			/*
				
				
webFontLoading = "DejaVuSansMono";
			loadFont = function() {
				UTIL.loadCSS("gfx/font/DejaVuSansMono/DejaVuSansMono.css", cssLoadedMaybe);
				};
			whenFontLoaded = function() {
			if(webFontLoading == "DejaVuSansMono") {
				EDITOR.settings.style.font = "DejaVuSansMono";
				EDITOR.settings.style.highlightMatchFont = "bold 13px DejaVuSansMono";
				EDITOR.settings.style.fontSize = 13;
				EDITOR.settings.gridHeight = 22;
				EDITOR.settings.gridWidth = 7.83;
				
				if(browser == "Firefox") {
					// Hmm, this worked fine until I reinstalled ... Why do I have to adjust this !?
						// And now suddenly it's no longer needed!? Nothing changed ...
				//EDITOR.settings.gridWidth = 8;
				// mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmoxx
			}
			}
			};
				
			*/

		}
		
		
		
	}
	else if(RUNTIME=="browser") {
		
		// Internet Explorer doesn't support sub-pixel rendering / LCD-text in the Canvas!
		// So Consolas wont look that good ...
		// Nor does Internet Explorer support custom fonts (unless on localhost)!
		
		// We better use a web safe font in the browser
		
		
		// This looks big and nice in Firefox on Ubuntu 18
		EDITOR.settings.style.font = "Courier New, Courier, monospace";
		EDITOR.settings.style.highlightMatchFont = "bold 15px Courier New, Courier, monospace";
		EDITOR.settings.style.fontSize = 15;
		EDITOR.settings.gridHeight = 23;
		EDITOR.settings.gridWidth = 9;
		
		debug("Using web safe font (" + EDITOR.settings.style.font + ")");
		
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
	
	window.addEventListener( 'load', function() {
		window.clearTimeout(slowLoad);
		window.clearTimeout(verySlowLoad);

		if(slowBrowser) {
			CLIENT.pingTimeout = 3000;
			CLIENT.cmdTimeout = CLIENT.pingTimeout * 6;
		}

		if(verySlowBrowser) {
			CLIENT.pingTimeout = 6000;
			CLIENT.cmdTimeout = CLIENT.pingTimeout * 6;

			if(webFontLoading != "ubuntu") { // Always load the ubuntu font because it will be downloaded by the service worker!
				console.warn("settings_overload: Not loading font because browser is too slow! webFontLoading=" + webFontLoading);
				return makeGlyphWidthDetector();
			}
		}

		if( QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("font") != -1 ) {
			console.warn("settings_overload: Not loading font because font is in the disable query string!");
			return makeGlyphWidthDetector();
		}

		if(typeof loadFont != "function") {
			console.log("settings_overload: No web font will be loaded because typeof loadFont = " + (typeof loadFont) + "!");
			return makeGlyphWidthDetector();
		}

		loadFont(); // Loads the css file containing the font

	}, false );

	// note: The css file is loaded in the window.onload event.
	function cssLoadedMaybe(err) {
		if(err) {
			console.error(err);
			loadCSS_error = err;
			return makeGlyphWidthDetector();
		}

		if(typeof whenFontLoaded != "function") return makeGlyphWidthDetector();

		if(document.fonts && document.fonts.ready) {
			document.fonts.ready.then(function () {

				console.log("settings_overload: All fonts ready!");

				whenFontLoaded();

				return makeGlyphWidthDetector();

			});
		}
		else {
			// Re-render after the font have fully loaded (we never know when)

			var time = 300;
			if(slowBrowser) time = 1000;
			if(verySlowBrowser) time = 5000;

			setTimeout(function renderAfterFontLoad() {

				console.log("settings_overload: All fonts ready maybe!?");

				whenFontLoaded();

				return makeGlyphWidthDetector();

			}, time);
		}
	}

	function makeGlyphWidthDetector() {
		EDITOR.glyphWidth = EDITOR.makeGlyphWidthDetector();

		EDITOR.renderNeeded();
		EDITOR.render();
	}

	function debug(msg) {
		
		console.log("settings_overload: debug: " + msg);
		if(! QUERY_STRING["debugFont"] ) return;
		
		// Because Edge and Firefox's Developer tools are so freaking slow
		alert(msg + "\nRUNTIME=" + RUNTIME + "\nBROWSER=" + BROWSER + "\nprocess.platform=" + process.platform + "\n" +
"MSWIN=" + MSWIN + " LINUX=" + LINUX + " MAC=" + MAC + " MSIE=" + MSIE + "\n" +
		"ligatures=" + ligatures + "\nwindow.devicePixelRatio=" + window.devicePixelRatio + "\n" +
		"slowBrowser=" + slowBrowser + " verySlowBrowser=" + verySlowBrowser + "\n" +
		"loadCSS_error=" + (loadCSS_error && loadCSS_error.message));
		
	}
	
	
	function detectAntialias() {
var canvasNode = document.createElement("canvas");
		canvasNode.width = "35";
		canvasNode.height = "35";
		
		// We must put this node into the body, otherwise
		// Safari Windows does not report correctly.
		canvasNode.style.display = "none";
		document.body.appendChild(canvasNode);
		var ctx = canvasNode.getContext("2d");
		
		// draw a black letter "O", 32px Arial.
		ctx.textBaseline = "top";
		ctx.font = "32px Arial";
		ctx.fillStyle = "black";
		ctx.strokeStyle = "black";
		
		ctx.fillText("O", 0, 0);
		
		// start at (8,1) and search the canvas from left to right,
		// top to bottom to see if we can find a non-black pixel.  If
		// so we return true.
		for (var j = 8; j <= 32; j++) {
			for (var i = 1; i <= 32; i++) {
				var imageData = ctx.getImageData(i, j, 1, 1).data
				var alpha = imageData[3];
				
				if (alpha != 255 && alpha != 0 && alpha > 180) {
					return true; // font-smoothing must be on.
				}
			}
			
		}
		
		// didn't find any non-black pixels - return false.
		return false;
	}
	
})();