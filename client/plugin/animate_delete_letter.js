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
		
		console.log("animate_delete_letter: type=" + type + " row=" + row + " col=" + col);
		
		if(type == "delete") {
			startAnimation(file, row, col, 1);
		}
		else if(type == "deleteTextRange") {
			if(characters.indexOf("\n") == -1) startAnimation(file, row, col, characters.length);
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
		
		var charImage = ctx.getImageData(left, top, width, height);
		var bgColor = pixelColor(charImage, 1, 1);
		
		var pixels = [];
		var color = "";
		for(var x=1; x<width; x++) {
			for(var y=1; y<height; y++) {
				color = pixelColor(charImage, x, y, null);
				if(color != EDITOR.settings.style.highlightMatchBackground &&
					color != EDITOR.settings.style.selectedTextBg &&
				color != EDITOR.settings.style.highlightTextBg) {
					
					pixels.push({x: x+left, y: y+top, color: pixelColor(charImage, x, y, .24)});
				}
			}
		}
		
		var animationFunction = createAnimation(left, top, width, height, pixels, EDITOR.animationFrame)
		
		EDITOR.addAnimation(animationFunction);
		EDITOR.renderNeeded();
		
		setTimeout(function() {
			EDITOR.removeAnimation(animationFunction);
			EDITOR.renderNeeded();
		}, 100);
		
	}
	
	function pixelColor(img, x, y, opacity) {
		if(opacity === undefined) opacity = 1;
		
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
		
		if(opacity) return "rgba(" + redForCoord + ", " + greenForCoord + ", " + blueForCoord + ", " + opacity + ")";
		else return "rgb(" + redForCoord + ", " + greenForCoord + ", " + blueForCoord + ")";
		
		function getColorIndicesForCoord(x, y, width) {
			var red = y * (width * 4) + x * 4;
			//console.log("x=" + x + " y=" + y + " width=" + width + " red=" + red);
			return [red, red + 1, red + 2, red + 3];
		}
	}
	
	function createAnimation(x, y, width, height, pixels, frameStart) {
		return function deleteLetterAnimation(ctx, frameCount) {
			// Called by the editor at every frame
			var frame = frameCount-frameStart;
			
			//console.time("deleteLetterAnimation frame=" + frame);
			
			var dx = 0;
			var dy = 0;
			
			var centerX = x + width/2;
			var centerY = y + height/2;
			
			for (var i=0; i<pixels.length; i++) {
				dx = (pixels[i].x - centerX) / width * frame*2;
				dy = (pixels[i].y - centerY+3) / height * frame*2;
				
				ctx.fillStyle = pixels[i].color;
				ctx.fillRect(pixels[i].x + dx, pixels[i].y + dy, 1, 1);
			}
			
			//console.timeEnd("deleteLetterAnimation frame=" + frame);
		};
	}
	
	
})();
