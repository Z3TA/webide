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
	2) Firefox on Ubuntu 16 or Samsung Dex renders font differently!
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

//console.log("settings_overload: loaded settings_overload.js");

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

	var isAndroid = /(android)/i.test(navigator.userAgent);

	// These timers are cleared in the window.onload event...
	var slowLoad = window.setTimeout( function() {
		slowBrowser = true;
		//console.warn("settings_overload: browser is slow");
	}, 100 );
	
	var verySlowLoad = window.setTimeout( function() {
		verySlowBrowser = true;
		//console.warn("settings_overload: Browser is VERY slow");
	}, 1000 );
	
	//console.log("settings_overload: browser=" + browser + " ligatures=" + ligatures + " window.devicePixelRatio=" + window.devicePixelRatio);

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
		
		debug("Use ligatures");

//debug("Using ligatures with FiraCode");
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
	else if(MSWIN && ( browser == "Chrome" || browser == "Firefox") && window.devicePixelRatio == 1) {
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
	else if(   browser=="Firefox" || browser == "Chrome" || ( MSIE && (location.host == "127.0.0.1" || location.host == "localhost") )   ) {
		
		/*
			Try to load a web font (most browsers should now support them)
			
			Font's seem to work nice on localhost/127.0.0.1 in IE, but not when using a domain ...
		*/
		
		//debug("Deciding what font to use considering LCD=" + EDITOR.settings.sub_pixel_antialias + " ");
		
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

					//debug("browser=" + browser + " loaded ubuntu font");

					EDITOR.settings.style.font = "ubuntu";
					EDITOR.settings.style.highlightMatchFont = "bold 15px ubuntu";
					EDITOR.settings.style.fontSize = 15;
					EDITOR.settings.gridHeight = 22;
					EDITOR.settings.gridWidth = 8;
					
					// Text has a different width if it's antialiased!
					var antialias = detectAntialias();
					if(antialias) {
						debug("Antialias detected! Updating grid width");
						
						if(BROWSER=="Firefox" && isAndroid ==true) {
							debug("Firefox on Android!");
							// Edit Firefox on Android here:
							EDITOR.settings.gridWidth = 8.3;

						}
						else {
							debug("Not Firefox");
							EDITOR.settings.gridWidth = 7.5;
						}
						
					}
					
					if(BROWSER == "Chrome" && DISPLAY_MODE == "standalone" && isAndroid) {
						// Weird bug when added to desktop from Chrome on Android where we get different kerning...
						debug("added to desktop from Chrome_");
						EDITOR.settings.style.highlightMatchFont = "bold 16px ubuntu";
						EDITOR.settings.style.fontSize = 16;
						EDITOR.settings.gridHeight = 22;
						EDITOR.settings.gridWidth = 8;
					}


					// Need to wait to make sure the font has really loaded!
					setTimeout(function() {
						var calibratedGridWith = measureCharacterWidth();

						debug("calibratedGridWith=" + calibratedGridWith + " EDITOR.settings.gridWidth=" + EDITOR.settings.gridWidth);

						EDITOR.settings.gridWidth = calibratedGridWith;
						EDITOR.renderNeeded();

					}, 1000 + slowBrowser*2000 + verySlowBrowser*3000);

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
	else {
		
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
		
		//debug("Using web safe font (" + EDITOR.settings.style.font + ")");
		
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
				//console.warn("settings_overload: Not loading font because browser is too slow! webFontLoading=" + webFontLoading);
				return makeGlyphWidthDetector();
			}
		}

		if( QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("font") != -1 ) {
			//console.warn("settings_overload: Not loading font because font is in the disable query string!");
			return makeGlyphWidthDetector();
		}

		if(typeof loadFont != "function") {
			//console.log("settings_overload: No web font will be loaded because typeof loadFont = " + (typeof loadFont) + "!");
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

				//console.log("settings_overload: All fonts ready!");

				CB(whenFontLoaded);

				CB(makeGlyphWidthDetector);

			});
		}
		else {
			// Re-render after the font have fully loaded (we never know when)

			var time = 300;
			if(slowBrowser) time = 1000;
			if(verySlowBrowser) time = 5000;

			setTimeout(function renderAfterFontLoad() {

				//console.log("settings_overload: All fonts ready maybe!?");

				whenFontLoaded();

				return makeGlyphWidthDetector();

			}, time);
		}
	}

	function makeGlyphWidthDetector() {
		EDITOR.fontLoaded = true;
		EDITOR.glyphWidth = EDITOR.makeGlyphWidthDetector();

		/*
			This function is always called!
			If we did load the font, it should now have finished loaded,
		*/

		/*
			Issue in Chrome: Even though the font is set on the canvas context font prop, it wont use the font unless we do a full render...
			tried running canvasContextReset, tried changing canvas width/height, running ctx.fillTex etc, but it still uses some standard font, not even our fallback font!
			So therefore we must force full re-render (in Chrome) after we have loaded the custom font

			Unfortunately this means that the editor will resize/rerender twice during startup, once now, then once again when resizing because beforeload classes are removed
		*/

		EDITOR.resize(true);
		
		
	}

	function debug(msg) {
		
		if(!EDITOR.settings.devMode && !QUERY_STRING["debugFont"]) return;

		console.log("settings_overload: debug: " + msg);
		
		if(! QUERY_STRING["debugFont"] ) return;
		
		// We can't access the console on some browsers, to use ye old alert...
		alert(msg + "\nBROWSER=" + BROWSER + "\n" +
		"MSWIN=" + MSWIN + " LINUX=" + LINUX + " MAC=" + MAC + " MSIE=" + MSIE + "\n" +
		"userAgent=" + navigator.userAgent + "\n" +
		"ligatures=" + ligatures + "\nwindow.devicePixelRatio=" + window.devicePixelRatio + "\n" +
		"slowBrowser=" + slowBrowser + " verySlowBrowser=" + verySlowBrowser + " isAndroid=" + isAndroid + "\n" +
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
	
	function measureText() {
		// Might return different values depedning on browser!

		var docElem = document.documentElement;
		var body = document.getElementsByTagName('body')[0];
		var x = window.innerWidth || docElem.clientWidth || body.clientWidth;
		var y = window.innerHeight|| docElem.clientHeight|| body.clientHeight;

		var canvasNode = document.createElement("canvas");
		canvasNode.width = x;
		canvasNode.height = y;

		// We must put this node into the body, otherwise
		// Safari Windows does not report correctly.
		//canvasNode.style.display = "none";
		//document.body.appendChild(canvasNode);
		var ctx = canvasNode.getContext("2d");

		ctx.font = "16px Arial"; // Use a safe font so we can compare between devices!
		ctx.textBaseline = "middle";

		var measure = ctx.measureText('console.log("hello world");');

		console.log("measureText: measure=", measure);

		/*
			
			Chromium on Arch Linux, pixel-ratio:1
			6.810763888
			EDITOR.settings.gridWidth = 7.5;
			7.5/6.810763888=1.101198063

			Firefox on Arch Linux, pixel-ration:1
			6.81172858344184
			EDITOR.settings.gridWidth = 8.3;
			8.3/6.81172858344184=1.2184866

			8.3/7.5=1.106666667
			6.81172858344184/6.810763888=1.000141643



			Android Tablet:
			6.83888
			6.81172858344184/6.83888=0.996
			//EDITOR.settings.gridWidth = 8.33;

			6.810763888/6.83888



		*/

		return measure.width/27;

	}


	function measureCharacterWidth(test) {
		/*
			Different devices/OS/browsers renders *the same font* differently!
			So instead of manually testing all possible combination of device/OS/browser
			we will just check what the actual glyph width is and update gridWith accordingly
		*/

		var canvas = document.createElement("canvas");
		canvas.width = 1500; // Need to be long enough to fit 100 characters!
		canvas.height = 60;

		//canvas.style="position: absolute; top: " + test*60 + "px; left: 0px; z-index: 9999; border: 1px solid red;";

		// We must put this node into the body, otherwise
		// Safari Windows does not report correctly!?!?!?
		//canvasNode.style.display = "none";
		///document.body.appendChild(canvas);
		var ctx = canvas.getContext("2d");

		ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		ctx.textBaseline = "middle";

		var bgColor = "#FFFFFF";
		var textColor = "#000000";

		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = textColor;
		var text = "abcdefghijklmnopqrstuvwxyz(){}+-*$%/@<>abcdefghijklmnopqrstuvwxyz(){}+-*$%/@<>abcdefghijklmnopqrst||";
		var measure = ctx.measureText(text);

		return measure / text.length;
	}


	function measureCharacterWidthOld(test) {
		/*
			Different devices/OS/browsers renders *the same font* differently!
			So instead of manually testing all possible combination of device/OS/browser 
			we will just check what the actual glyph width is and update gridWith accordingly
		*/

		var canvas = document.createElement("canvas");
		canvas.width = 1500; // Need to be long enough to fit 100 characters! 
		canvas.height = 60;

		//canvas.style="position: absolute; top: " + test*60 + "px; left: 0px; z-index: 9999; border: 1px solid red;";

		// We must put this node into the body, otherwise
		// Safari Windows does not report correctly!?!?!?
		//canvasNode.style.display = "none";
		///document.body.appendChild(canvas);
		var ctx = canvas.getContext("2d");

		ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
		ctx.textBaseline = "middle";

		var bgColor = "#FFFFFF";
		var textColor = "#000000";

		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = textColor;
		var text = "abcdefghijklmnopqrstuvwxyz(){}+-*$%/@<>abcdefghijklmnopqrstuvwxyz(){}+-*$%/@<>abcdefghijklmnopqrst||";
		ctx.fillText(text, 1, 30); // Starts at pixel 1
		
		var pipes = [];
		var pipeIndex = 0;

		var measure = ctx.measureText(text);

		var imageData, alpha, y = 30, insidePipe = false;
		for (var x=canvas.width-1; x>0; x--) { // first pixel is on 0, last on canvas.width-1
			imageData = ctx.getImageData(x, y, 1, 1).data
			var r = imageData[0];
		
			console.log("measureCharacterWidth: x=" + x + " r=" + imageData[0] + " g=" + imageData[1] + " b=" + imageData[2] + " a=" + imageData[3]);

			if(r < 255) { // It's not white
				if(!insidePipe) {
					pipeIndex = pipes.push({end: x, start: 0}) - 1;
					insidePipe = true;
				}
			}
			else {
				if(insidePipe) {
					pipes[pipeIndex].start = x+1;
					if(pipes.length>=2) break;
				}
				insidePipe = false;
			}
		}

		console.log("measureCharacterWidth: pipes=" + JSON.stringify(pipes, null, 2));

		var whiteSpaceDistance = pipes[0].start - pipes[1].end - 1;
		var pipeWidth = pipes[0].end - pipes[0].start + 1;
		var charWdith = whiteSpaceDistance + pipeWidth;
		var endOfLastChar = Math.ceil(pipes[0].end + whiteSpaceDistance / 2);
		var avarageCharWidth = endOfLastChar / text.length;

		debug("measure.width=" + measure.width);

		console.log("measureCharacterWidth: whiteSpaceDistance=" + whiteSpaceDistance + " pipeWidth=" + pipeWidth + " charWdith=" + charWdith + " text.length=" + text.length + " text=" + text + " measure.width=" + measure.width + " avarageCharWidth=" + avarageCharWidth + " EDITOR.settings.gridWidth=" + EDITOR.settings.gridWidth);

		return avarageCharWidth;
	}

})();