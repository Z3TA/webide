
(function() {
	
	var mouseX = 0,
		mouseY = 0,
		glassSize = 200,
		magnification = 1.75,
		renderIndex = -1,
		mouseMoveIndex = -1,
		active = false;
	

	// Wait for the program to load the user interface, then Add to the context menu
	editor.on("start", function() {
		
		editor.addMenuItem("Toggle magnification glass", showOrHideGlass);
		
	});
	

	
	function showOrHideGlass() {
		
		editor.hideMenu();
		
		active = active ? false : true; // Alternate

		if(active) {
			addToListeners();
		}
		else {
			removeFromListeners();
		}
		
		editor.renderNeeded();
		
		return false; // preventDefault;
		
	}
	
	
	function addToListeners() {
		mouseMoveIndex = editor.on("mouseMove", mouseMove);
		renderIndex = editor.addRender(magnification_render);
	}
	
	function removeFromListeners() {
		editor.removeEvent("mouseMove", mouseMove);
		
		var ja = editor.removeRender(magnification_render);
		
		if(!ja) throw new Error("meh");
	}
	
	
	function mouseMove(x, y, target) {
		
		if(target.className == "fileCanvas" && active) {

			mouseX = x;
			mouseY = y;
			editor.renderNeeded();

		}
		

		
	}

	
	function magnification_render(ctx, buffer, file) {
		
		// The clipping arc
		var centerX = mouseX,
			centerY = mouseY, 
			radius = glassSize / 2,
			startAngle = 0, 
			endAngle = Math.PI*2, 
			counterclockwise = false;
		
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, startAngle, endAngle, counterclockwise);

		// Save and clip
		ctx.save();
		ctx.clip();
		

		
		// The image
		var img = file.canvas, 
			clipStartX = mouseX - radius / magnification, 
			clipStartY = mouseY - radius / magnification,
			clipWidth = glassSize / magnification, 
			clipHeigh = glassSize / magnification, 
			posX = mouseX - radius,
			posY = mouseY - radius, 
			width = glassSize,
			height = glassSize;

		ctx.drawImage(img, clipStartX, clipStartY, clipWidth, clipHeigh, posX, posY, width, height);
		   


		ctx.stroke();
		
		ctx.restore();
		
		ctx.rect(posX,posY,width,height);
		ctx.stroke();
		
		console.log("Rendered magnification glass");
		
	}
	
	
	
})();