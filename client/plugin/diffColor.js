
(function() {
	EDITOR.plugin({
		desc: "Add colors to .diff files",
		load: function loadDiffColor() {
			EDITOR.preRenderFunctions.push(applyDiffColors);
},
		unload: function unloadDiffColor() {
			EDITOR.preRenderFunctions.splice(EDITOR.preRenderFunctions.indexOf(applyDiffColors));
},
		});
	
	function applyDiffColors(buffer, file) {
		if(file.path.slice(-5) != ".diff") return buffer;
		
		var colorNew = EDITOR.settings.style.removedTextColor; // green
		var colorOld = EDITOR.settings.style.addedTextColor; // red
		
for(var row = 0; row<buffer.length; row++) {

			if(buffer[row][0] && buffer[row][0].char == "-" && !(buffer[row].length > 2 && buffer[row][buffer[row].length-1].char == "-")) {
				colorRow(row, colorOld);
			}
				else if(buffer[row][0] && buffer[row][0].char == "+") {
					colorRow(row, colorNew);
				}
				}
		
		return buffer;
		
		function colorRow(row, color) {
			for(var col=0; col<buffer[row].length; col++) {
				buffer[row][col].color = color;
				}
		}
		}
	
})();
