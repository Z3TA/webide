(function() {
"use strict";

	var key_E = 69;
	
	EDITOR.bindKey({desc: "Test exit code", charCode: key_E, combo: CTRL, fun: testExit});
	
	function testExit() {
		console.log("Closing the editor ...");
		process.exit(1);
		return false;
	}

})();