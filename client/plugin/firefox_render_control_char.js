/*

	Firefox has problems rendering some control characters starting with "0" + 1..31
	For example \u000b and \u001a

	Replace them with a space so that Firefox don't render the control chars with zero width characters...


*/
(function() {
	"use strict";

	if(!FIREFOX) return; // Only a problem in Firefox, Chrome renders empty boxes, haven't tested in Safari yet

	EDITOR.plugin({
		desc: "Render control characters in Firefox",
		load: function loadFFencrend() {
			EDITOR.addPreRender(FFencren);
		},
		unload: function uloadFFencrend() {
			EDITOR.removePreRender(FFencren);
		}
	});

	function FFencren(buffer) {
		for (var row=0; row<buffer.length; row++) {
			for(var col=0, char; col < buffer[row].length; col++) {
				char = buffer[row][col].char;
				// note: char 9 is a tab! char 32 is a space
				if(   char.match(/[\x01-\x08]/)   ||   
				char.match(/[\x0a-\x1f]/)   ) {
					buffer[row][col].char = " ";
				}
			}
		}
		return buffer;
	}

})();
