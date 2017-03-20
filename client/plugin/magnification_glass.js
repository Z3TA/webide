
(function() {

	/*
		
		All current magnification tools seems to make things blurry. We can do better!
		Todo: Have the magnifier re-render the text so that it gets big and CRISP!
	
	*/
	
	var mouseX = 0,
		mouseY = 0,
		glassSize = 200,
		magnification = 1.75,
		renderIndex = -1,
		mouseMoveIndex = -1,
		magnificationMenuItem,
		active = false;
	

	EDITOR.plugin({
		desc: "Magnification glass.",
		load: loadMagnificationGlass,
		unload: unloadMagnificationGlass,
	});
	

	function loadMagnificationGlass() {
		
		magnificationMenuItem = EDITOR.addMenuItem("Toggle magnification glass", showOrHideGlass);
		
	}
	
	function unloadMagnificationGlass() {
		
		if(active) removeFromListeners();
		
		EDITOR.removeMenuItem(magnificationMenuItem);
	}

	
	function showOrHideGlass() {
		
		EDITOR.hideMenu();
		
		active = active ? false : true; // Alternate

		if(active) {
			addToListeners();
		}
		else {
			removeFromListeners();
		}
		
		EDITOR.renderNeeded();
		
		return false; // preventDefault;
		
	}
	
	
	function addToListeners() {
		mouseMoveIndex = EDITOR.on("mouseMove", mouseMove);
		renderIndex = EDITOR.addRender(magnification_render);
	}
	
	function removeFromListeners() {
		EDITOR.removeEvent("mouseMove", mouseMove);
		
		var ja = EDITOR.removeRender(magnification_render);
		
		if(!ja) throw new Error("meh");
	}
	
	
	function mouseMove(x, y, target) {
		
		if(target.className == "fileCanvas" && active) {

			mouseX = x;
			mouseY = y;
			EDITOR.renderNeeded();

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
		var img = document.getElementById("canvas"), 
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