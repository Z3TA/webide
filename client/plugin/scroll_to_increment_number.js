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
		console.log("scrollNumer: combo.sum=" + combo.sum + " dir=" + dir);
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
		
		var number = onNumber(file, caret);
		
		if(!number) return;
		
		var nr = number.nr += dir;
		
		file.moveCaret(number.start, undefined, undefined, caret);
		
		var nrStr = nr.toString();
		var decimalIndex = nrStr.indexOf(".");
		if(decimalIndex != -1) var decimals = nrStr.length - decimalIndex - 1;
		else var decimals = 0;
		
		if(number.decimals > 0) {
			if(decimals == 0) nrStr += ".";
			for(var i=0; i<number.decimals-decimals; i++) {
				nrStr += "0";
			}
		}
		
		// for future optimization: Both deleteTextRange and insertText forces a render, so use deleteCharacter, putCharacter, and EDITOR.renderRow() instead
		file.deleteTextRange(number.start, number.end-1);
		file.insertText(nrStr, caret);
		
	}
	
	function onNumber(file, caret) {
		if(!file) return null;
		
		var i = caret.index;
		
		console.log("scrollNumer: onNumber: at char=" + UTIL.lbChars(file.text[i]) + " i=" + i + " caret.row=" + caret.row + " row=" + file.rowText(caret.row));
		
		
		// Go left
		if(caret.eol) i--;
		if(file.text[i] == " ") i--;
		
		// Skip over px, pt, em, %
		if(file.text[i].match(/m|x|t/)) i = i - 2;
		if(file.text[i].match(/e|p|%/)) i--;
		
		while(isNr(file.text[i]) && i > 0) {
			console.log("scrollNumer: onNumber: Left, Numeric value=" + file.text[i] + " at i=" + i);
			i--;
		}
		var start = ++i;
		
		// Go right
		while(isNr(file.text[i]) && i < file.text.length) {
			console.log("scrollNumer: onNumber: Right, Numeric value=" + file.text[i] + " at i=" + i);
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
		
		console.log("scrollNumer: onNumber: numberStr=" + numberStr + " nr=" + nr + " decimals=" + decimals + " start=" + start + " end=" + end);
		
		if(isNaN(nr)) return null;
		
		return {nr: nr, start: start, end: end, decimals: decimals};
	}
	
	function isNr(n) {
		return (n=="." || n=="-" || n=="0" || n=="1" || n=="2" || n=="3" || n=="4" || n=="5" || n=="6" || n=="7" || n=="8" || n=="9");
	}
	
	
})();