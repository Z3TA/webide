/*



*/

(function() {
	"use strict";

	// Only load this module if Android is detected
	if(!ANDROID) return;

	var renderAdded = false;

	EDITOR.plugin({
		desc: "Click on the canvas if you get keycode 229",
		load: function loadKeyCode229() {

			EDITOR.on("keyDown", checkForKeycode229);

		},
		unload: function unloadKeyCode229() {
			EDITOR.removeEvent("keyDown", checkForKeycode229);
		}
	});


	function checkForKeycode229(file, character, combo, ev) {
		if(ev.keyCode != 229) return ALLOW_DEFAULT;
		
		if(renderAdded) return ALLOW_DEFAULT;

		EDITOR.addRender(clickOnCanvasRenderMsg, 4650);
		renderAdded = true;
		EDITOR.renderNeeded(); // Show the message at next "tick"

		setTimeout(function() {
			EDITOR.removeRender(clickOnCanvasRenderMsg, 4650);
			renderAdded = false;
		}, 3000);
	}

	function clickOnCanvasRenderMsg(ctx) {

		var text = "If keys don't work - click anywhere here on the text canvas";

		var top = Math.floor(EDITOR.view.canvasHeight / 2);
		var middle = top - Math.floor(EDITOR.settings.gridHeight/2);
		var measuredText = ctx.measureText(text)
		var textWidth = measuredText.width;
		var textHeight = measuredText.height || EDITOR.settings.gridHeight;
		var left = Math.floor(EDITOR.view.canvasWidth / 2 - textWidth / 2);

		// Background for the text
		//ctx.fillStyle = EDITOR.settings.style.bgColor;
		ctx.fillStyle = UTIL.makeColorTransparent(EDITOR.settings.style.highlightTextBg, 90);
		ctx.fillRect(left-16, top-16-EDITOR.settings.gridHeight, textWidth+32, textHeight+32);

		// Print the text
		ctx.fillStyle = EDITOR.settings.style.textColor;
		ctx.fillText(text, left, middle);
	}

})();

