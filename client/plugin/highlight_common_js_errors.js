/*

	The goal of this plugin is to highlght some comming JS errors (there are other plugins that do this too)

	This plugin will detect:
	* indexOf() without != or == inside if statements

	var arr = [1, 2, 3];

	if(arr.indexOf(2)) {
	arr;
	}

	arr;

*/

(function() {
	"use strict";

	var reIndexOfInIfStatement;

	EDITOR.plugin({
		desc: "Highlight common JS errors",
		load: function loadJsErrorHighlighter() {

			reIndexOfInIfStatement = /if\s*\(.*\.indexOf\(.*\)\s*\)/;

			EDITOR.on("afterSave", checkForCommonJsErrors);

		},
		unload: function unloadJsErrorHighlighter() {

			reIndexOfInIfStatement = null;

			EDITOR.removeEvent("afterSave", checkForCommonJsErrors);

		}
	});

	function checkForCommonJsErrors(file) {

		var match = file.text.match(reIndexOfInIfStatement);

		console.log("checkForCommonJsErrors: match=" + match);

		if(match === null) return;

		console.log(match);

		var pos = file.rowFromIndex(match.index);

		EDITOR.addInfo(pos.row, pos.col + match[0].length-1, "indexOf returns a number!", file, 2);

	}

})();




