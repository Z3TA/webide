(function() {
	"use strict";
	
	console.log("animate_delete_letter ...");
	
	EDITOR.plugin({
		desc: "Show animation when deleting letters",
		load: function() {
			
			EDITOR.on("fileChange", animate_delete_letter);
			
		},
		unload: function() {
			
			EDITOR.removeEvent("fileChange", animate_delete_letter);
			
		}
	});
	
	function animate_delete_letter(file, type, characters, caretIndex, row, col) {
		
		//console.log("animate_delete_letter: type=" + type + " row=" + row + " col=" + col);
		
		if(type == "delete") {
			startAnimation(file, row, col, 1);
		}
		else return true;
	}
	
	function startAnimation(file, row, col, textLength) {
		
		console.log("Starting animation on row=" + row + " col=" + col);
		
		var indentation = file.grid[row].indentation;
		var indentationWidth = indentation * EDITOR.settings.tabSpace;
		
		var startRow = file.startRow;
		var top = EDITOR.settings.topMargin + (row-startRow) * EDITOR.settings.gridHeight;
		var left = EDITOR.settings.leftMargin + (Math.max(0, indentationWidth - file.startColumn) + col) * EDITOR.settings.gridWidth;
		var width = parseInt(EDITOR.settings.gridWidth * textLength);
		var height = parseInt(EDITOR.settings.gridHeight);
		
		console.log("top=" + top + " left=" + left);
		
		var ctx = EDITOR.canvasContext;
		
		var image = ctx.getImageData(left, top, width, height);
		var bgColor = pixelColor(image, 1, 1);
		
		var pixels = [];
		var color = "";
		for(var x=left; x<left+width; x++) {
			for(var y=top; y<top+height; y++) {
				color = pixelColor(image, x, y);
				pixels.push({x: x, y: y, img: ctx.getImageData(x, y, 1, 1)});
			}
		}
		
		var bgX = top-width;
		var bgY = left-height;
		var bgW = width*3;
		var bgH = height*3;
		
		var background = ctx.getImageData(bgX, bgY, bgW, bgH);
		
		var animationFunction = createAnimation(left, top, width, height, background, bgX, bgY, bgColor, pixels, EDITOR.animationFrame)
		
		EDITOR.addAnimation(animationFunction);
		EDITOR.renderNeeded();
		
		setTimeout(function() {
			EDITOR.removeAnimation(animationFunction);
			EDITOR.renderNeeded();
		}, 150);
		
	}
	
	function pixelColor(img, x, y) {
		var colorIndices = getColorIndicesForCoord(x, y, img.width);
		var redIndex = colorIndices[0];
		var greenIndex = colorIndices[1];
		var blueIndex = colorIndices[2];
		var alphaIndex = colorIndices[3];
		//console.log("colorIndices=", colorIndices);
		
		//console.log(img);
		
		var redForCoord = img.data[redIndex];
		var greenForCoord = img.data[greenIndex];
		var blueForCoord = img.data[blueIndex];
		var alphaForCoord = img.data[alphaIndex];
		
		//console.log("redForCoord=" + redForCoord + " greenForCoord=" + greenForCoord + " blueForCoord=" + blueForCoord + " alphaForCoord=" + alphaForCoord);
		
		return "rgb(" + redForCoord + "," + greenForCoord + "," + blueForCoord + ")";
		
		function getColorIndicesForCoord(x, y, width) {
			var red = y * (width * 4) + x * 4;
			//console.log("x=" + x + " y=" + y + " width=" + width + " red=" + red);
			return [red, red + 1, red + 2, red + 3];
		}
	}
	
	function createAnimation(x, y, width, height, background, bgX, bgY, bgColor, pixels, frameStart) {
		return function deleteLetterAnimation(ctx, frameCount) {
			console.time("deleteLetterAnimation");
			// Called by the editor at every frame
			
			var frame = frameCount-frameStart;
			
			ctx.save();
			
			ctx.putImageData(background, bgX, bgY);
			
			// Fill instead of clearing!
			ctx.fillStyle = bgColor;
			ctx.fillRect(x, y, width, height); 
			
			var dx = 0;
			var dy = 0;
			
			for (var i=0; i<pixels.length; i++) {
				dx = Math.random() * 2 - 1;
				dy = Math.random() * 2 - 1;
				ctx.putImageData(pixels[i].img, pixels[i].x += dx, pixels[i].y += dy);
			}
			//console.log("Running animation! x=" + x + " y=" + y + " frame=" + frame);
			console.timeEnd("deleteLetterAnimation");
		};
	}
	
	
})();
