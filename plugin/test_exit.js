(function() {
"use strict";

	var key_E = 69;
	
	editor.bindKey({desc: "Test exit code", charCode: key_E, combo: CTRL, fun: testExit}); // Ctrl + F
	
	function testExit() {
		console.log("Closing the editor ...");
		process.exit(1);
		return false;
	}

})();