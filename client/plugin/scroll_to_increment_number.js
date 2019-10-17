(function() {

"use strict";

EDITOR.plugin({
desc: "Shift+scroll to increment/decrement a numeric value",
		load: function loadScrollIncrement() {

			EDITOR.on("mouseScroll", changeNumericValue);

			//widget = EDITOR.createWidget(buildNumberSlider);

},
		unload: function unloadScrollIncrement() {

			EDITOR.removeEvent("mouseScroll", changeNumericValue);

}
});

	function changeNumericValue(dir, steps, combo, scrollEvent) {
		console.log("scrollNumber: combo.sum=" + combo.sum + " dir=" + dir);
		if(combo.sum != SHIFT) return;
		
		var caret = EDITOR.mousePositionToCaret(EDITOR.canvasMouseX, EDITOR.canvasMouseY, 0);
		
		var file = EDITOR.currentFile;
		
		/*
			EDITOR.addRender(scrollToIncrementDebugPosition, 20000);
			function scrollToIncrementDebugPosition() {
			var indentation = file.grid[caret.row].indentation;
			var indentationWidth = indentation * EDITOR.settings.tabSpace
			var top = EDITOR.settings.topMargin + (caret.row-file.startRow) * EDITOR.settings.gridHeight;
			var left = EDITOR.settings.leftMargin + (caret.col + indentationWidth - file.startColumn) * EDITOR.settings.gridWidth;
			
			EDITOR.canvasContext.beginPath();
			EDITOR.canvasContext.rect(left, top, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
			EDITOR.canvasContext.rect(left, top, EDITOR.settings.gridWidth, EDITOR.settings.gridHeight);
			
			EDITOR.canvasContext.strokeStyle = "red";
			//EDITOR.canvasContext.fillStyle = "#FF0000";
			EDITOR.canvasContext.stroke();
			console.log("changeNumericValue: top=" + top + " left=" + left + " caret.row=" + caret.row + " caret.col=" + caret.col + " file.startRow=" + file.startRow);
			}
			setTimeout(function() {
			EDITOR.removeRender(scrollToIncrementDebugPosition);
			}, 1000);
		*/
		
		var color = onColor(file, caret);
		var number = onNumber(file, caret);
		if(color) {
			
			console.log("scrollNumber: Before, color.rgb=" + JSON.stringify(color.rgb) + "");
			
			incrementColor(color.rgb, dir);
			
			console.log("scrollNumber: Efter, color.rgb=" + JSON.stringify(color.rgb) + "");
			
			var start = color.start;
			var end = color.end;
			var str = hexFromRgb(color.rgb);
			
		}
		else if(number) {
			
			var nr = number.nr += dir;
			var str = nr.toString();
			var decimalIndex = str.indexOf(".");
			if(decimalIndex != -1) var decimals = str.length - decimalIndex - 1;
			else var decimals = 0;
			
			if(number.decimals > 0) {
				if(decimals == 0) str += ".";
				for(var i=0; i<number.decimals-decimals; i++) {
					str += "0";
				}
			}
			
			var start = number.start;
			var end = number.end;
			
		}
		else return;
		
		
		file.moveCaret(start, undefined, undefined, caret);
		
		// for future optimization: Both deleteTextRange and insertText forces a render, so use deleteCharacter, putCharacter, and EDITOR.renderRow() instead
		file.deleteTextRange(start, end-1);
		file.insertText(str, caret);
		
	}
	
	function hexFromRgb(color) {
		return componentToHex(color.r) + componentToHex(color.g) + componentToHex(color.b);
	}
	
	function componentToHex(c) {
		var hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	}
	
	function incrementColor(color, amt) {
		// Can make color both lighter and darker (mutable)
		
		if(typeof amt != "number") throw new Error("Second parameter amt=" + amt + " must be a number!");
		
		color.r += amt;
		
		if (color.r > 255) color.r = 255;
		else if (color.r < 0) color.r = 0;
		
		color.g += amt;
		
		if (color.g > 255) color.g = 255;
		else if (color.g < 0) color.g = 0;
		
		color.b += amt;
		
		if (color.b > 255) color.b = 255;
		else if (color.b < 0) color.b = 0;
		
		return color;
	}
	
	function onNumber(file, caret) {
		if(!file) return null;
		
		var i = caret.index;
		
		console.log("scrollNumber: onNumber: at char=" + UTIL.lbChars(file.text[i]) + " i=" + i + " caret.row=" + caret.row + " row=" + file.rowText(caret.row));
		
		
		// Go left
		if(caret.eol) i--;
		if(file.text[i] == " ") i--;
		
		// Skip over px, pt, em, %
		if(file.text[i].match(/m|x|t/)) i = i - 2;
		if(file.text[i].match(/e|p|%/)) i--;
		
		while(isNr(file.text[i]) && i > 0) {
			console.log("scrollNumber: onNumber: Left, Numeric value=" + file.text[i] + " at i=" + i);
			i--;
		}
		var start = ++i;
		
		// Go right
		while(isNr(file.text[i]) && i < file.text.length) {
			console.log("scrollNumber: onNumber: Right, Numeric value=" + file.text[i] + " at i=" + i);
			i++;
		}
		
		var end = i;
		
		var numberStr = file.text.slice(start, end);
		
		var decimalIndex = numberStr.indexOf(".");
		if(decimalIndex != -1) {
			var decimals = numberStr.length - decimalIndex - 1;
		}
		else var decimals = 0;
		
		var nr = parseFloat(numberStr);
		
		console.log("scrollNumber: onNumber: numberStr=" + numberStr + " nr=" + nr + " decimals=" + decimals + " start=" + start + " end=" + end);
		
		if(isNaN(nr)) return null;
		
		return {nr: nr, start: start, end: end, decimals: decimals};
	}
	
	function isNr(n) {
		return (n=="." || n=="-" || n=="0" || n=="1" || n=="2" || n=="3" || n=="4" || n=="5" || n=="6" || n=="7" || n=="8" || n=="9");
	}
	
	function isHex(n) {
		return ( n=="0" || n=="1" || n=="2" || n=="3" || n=="4" || n=="5" || n=="6" || n=="7" || n=="8" || n=="9" || n=="a" || n=="A" || n=="b" || n=="B" || n=="c" || n=="C" || n=="d" || n=="D" || n=="e" || n=="E" || n=="f" || n=="F");
	}
	
	function onColor(file, caret) {
		var i = caret.index;
		
		// Go left
		if(caret.eol) i--;
		
		while(isHex(file.text[i]) && i > 0) {
			console.log("scrollNumber: onColor: Left, value=" + file.text[i] + " at i=" + i);
			i--;
		}
		
		if(file.text[i] != "#") {
			console.log("scrollNumber: onColor: character i=" + i + " " + file.text[i] + " is not a hashtag!");
			return null;
		}
		var start = ++i;
		
		// Go right
		while(isHex(file.text[i]) && i < file.text.length) {
			console.log("scrollNumber: onColor: Right, value=" + file.text[i] + " at i=" + i);
			i++;
		}
		var end = i;
		
		var letters = file.text.slice(start, end);;
		console.log("scrollNumber: letters=" + letters + " letters.length=" + letters.length + " start=" + start + " end=" + end);
		
		if(letters.length == 3) {
			var rgb = {
				r: parseInt(letters.charAt(0),16)*0x11,
				g: parseInt(letters.charAt(1),16)*0x11,
				b: parseInt(letters.charAt(2),16)*0x11
			}
		}
		else if(letters.length == 6) {
			var rgb = {
				r: parseInt(letters.substr(0,2),16),
				g: parseInt(letters.substr(2,2),16),
				b: parseInt(letters.substr(4,2),16)
			}
		}
		
		if(!rgb) {
			return null;
		}
		
		return {value: letters, start: start, end: end, rgb: rgb};
	}
	
})();