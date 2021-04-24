(function() {
	"use strict";

	/*

		Example:

		function foo(n) {
		if(n < 10 || n > 100) throw new Error("Expected n=" + n + " to be between 10 and 100");
		return n*2;
		}
		// assert: foo(10) = 20



		todo: optimization: Only check if the comment is visible on screen

	*/

	var checkTimer;
	var reAssert = /assert:(.*)$/;
	var render = [];

	EDITOR.plugin({
		desc: "Inline assert",
		load: function loadInlineAssert() {
			
			EDITOR.on("fileChange", checkAssertions);
			
			EDITOR.addRender(inlineAssertChecks, 5100);

			EDITOR.on("fileShow", checkInlineAssertWhenSwitchingFile);

		},
		unload: function unloadInlineAssert() {
			EDITOR.removeEvent("fileChange", checkAssertions);

			EDITOR.removeRender(inlineAssertChecks);

			EDITOR.removeEvent("fileShow", checkInlineAssertWhenSwitchingFile);
		}
	});

	function checkInlineAssertWhenSwitchingFile(file) {
		render.length = 0;
		doCheck(file);
	}

	function checkAssertions(file) {
		clearTimeout(checkTimer);

		setTimeout(function() {
			doCheck(file);
		}, 0);
	
	}

	function doCheck(file) {

		if(!file.parsed) return;

		render.length = 0;

		var comment = file.parsed.comments;

		if(!comment) return;

		for(var i=0; i<comment.length; i++) {

			console.log("doCheck: ", comment[i]);
			checkComment(file, comment[i].start, comment[i].end);

		}


	}

	function checkComment(file, start, end) {
		var str = file.text.slice(start, end);

		console.log("checkComment: ", str);

		var match = str.match(reAssert);
		if(!match) return;

		var test = parseStr(match[1]);
		if(!test) return;

		console.log("checkComment: ", test);

		var scope = UTIL.scope(start, file.parsed.functions);

		console.log("checkComment: scope=", scope);

		var func = scope.functions[test.fname];

		var row = file.rowFromIndex(end).row;
		var pos = {row: row, col: str.length + 1};
		
		if(!func) {
			// It might be a builtin function!

			//render.push({pos: pos, text: "Can't find function " + test.fname});
			//return;

			var fBody = "";
		}
		else {

			// note: function body does not include function declaration (but does include start and end angel bracket, unless its a arrow function)

			var fBody = "function " + test.fname + "(" + func.arguments + ")" + file.text.slice(func.start, func.end+1);
		}

		console.log("checkComment: fBody=", fBody);
		// First test the function to make sure it's parseable
		EDITOR.eval(fBody, function(err, result) {
			if(err) {
				render.push({pos: pos, text: err.message});
				EDITOR.renderNeeded();
				return;
			}

			// Need to pass both the function and test function call so that it is run in the same eval
			EDITOR.eval(fBody + ";" + test.left, function(err, result) {
				if(err) {
					render.push({pos: pos, text: err && err.message || err});
					EDITOR.renderNeeded();
					return;
				}

				var fReturn = result;

				if(fReturn == test.right) {
					render.push({pos: pos, text: "✅"});
				}
				else {
					//render.push({pos: pos, text: "Returned " + fReturn + ""});
					render.push({pos: pos, text: fReturn});
				}

				EDITOR.renderNeeded();

			});

		});

	}

	function parseStr(str) {
		console.log("parseStr: ", str);

		var lastEq = str.lastIndexOf("=");

		if(lastEq == -1) return null;

		var leftSide = str.slice(0, lastEq).trim();
		var rightSide = str.slice(lastEq+1).trim();

		var firstParenthese = leftSide.indexOf("(");
		var functionName = leftSide.slice(0, firstParenthese).trim();

		return {fname: functionName, left: leftSide, right: rightSide};

	}

	function inlineAssertChecks(ctx, buffer, file, screenStartRow, containSpecialWidthCharacters, bufferStartRow) {

		console.log("inlineAssertChecks: ", render);

		if(render.length == 0) return;

		var endRow = bufferStartRow + buffer.length;

		var top = 0;
		var middle = 0;
		var left = 0;

		ctx.fillStyle = UTIL.makeColorTransparent(EDITOR.settings.style.textColor, 50);

		for(var i=0; i<render.length; i++) {
			if(render[i].pos.row >= bufferStartRow && render[i].pos.row < endRow) {
				top = EDITOR.settings.topMargin + (render[i].pos.row - (screenStartRow == bufferStartRow ? 0 : bufferStartRow) ) * EDITOR.settings.gridHeight;
				middle = top + Math.floor(EDITOR.settings.gridHeight/2);
				left = EDITOR.settings.leftMargin + (file.startColumn + render[i].pos.col) * EDITOR.settings.gridWidth;

				console.log("inlineAssertChecks: screenStartRow=" + screenStartRow + " bufferStartRow=" + bufferStartRow + " render[" + i + "].pos.row=" + render[i].pos.row + " left=" + left + " top=" + top + " middle=" + middle + " EDITOR.settings.gridHeight=" + EDITOR.settings.gridHeight);

				ctx.fillText(render[i].text, left, middle);

			}
		}

	}


})();