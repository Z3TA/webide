

(function() {

	/*
	
		Renders hits for arguments etc
	
	*/
	
	editor.renderFunctions.push(hintsRender);
	
	console.log("Loaded textRenderer");
	
	function hintsRender2(ctx, buffer, file) {
		var hint
		
	}
	
	
	function hintsRender(ctx, buffer, file) {
		
		console.time("hintsRender");
		
		// Set text style
		ctx.font=editor.settings.style.fontSize + "px " + editor.settings.style.font;
		ctx.textBaseline = "top";
		
		var left = 0,
			top = 0,
			indentation = 0,
			txt = "foo, bar, baz",
			textWidth = ctx.measureText(txt).width;
		
	

		
		ctx.beginPath(); // Reset all the paths!
		
		ctx.fillStyle="rgba(255,255,0,0.5)"; 
		ctx.fillRect(left,top,textWidth,50);
		
		ctx.fillStyle="rgba(50,100,50,0.75)"; 
		ctx.fillText(txt, left, top);
		

		
		console.timeEnd("hintsRender");


	}

	
	
	

})();