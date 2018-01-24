
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
		var colorNew = "#3a7f3a"; // green
		var colorOld = "#ff4a4a"; // red
		var padding = 3;
		var padCount = 0;
		
		if(file.path.slice(-5) != ".diff") return buffer;
		
for(var row = 0; row<buffer.length; row++) {

if(buffer[row][0] && buffer[row][0].char == "-") {
				colorRow(row, colorOld);
}
else if(buffer[row][0] && buffer[row][0].char == "+") {
				colorRow(row, colorNew);
}
			padCount++;
}
		
		return buffer;
		
		function colorRow(row, color) {
			padCount = 0;
			for(var col=0; col<buffer[row].length; col++) {
				buffer[row][col].color = color;
				}
		}
		}
	
})();
