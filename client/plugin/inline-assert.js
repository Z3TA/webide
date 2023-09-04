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
	var reAssert = /assert:(.*)/;
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

		checkTimer = setTimeout(function() {
			doCheck(file);
		}, 256);
	
	}

	function doCheck(file) {

		if(!file.parsed) return;
		if(EDITOR.currentFile != file) return;

		render.length = 0;

		var comment = file.parsed.comments;

		if(!comment) return;

		for(var i=0; i<comment.length; i++) {

			//console.log("inline-assert: doCheck: ", comment[i]);
			checkComment(file, comment[i].start, comment[i].end);

		}


	}

	function checkComment(file, start, end) {
		var str = file.text.slice(start, end);

		//console.log("inline-assert: checkComment: ", str);

		var match = str.match(reAssert);
		if(!match) {
			//console.log("inline-assert: checkComment: str=" + str + " did not match reAssert=" + reAssert);
			return;
		}

		var test = parseStr(match[1]);
		if(!test) return;

		//console.log("inline-assert:checkComment: ", test);

		var row = file.rowFromIndex(end).row;
		var pos = {row: row, col: str.length + 4};
		

			
		EDITOR.eval(file.text + ";" + test.left, function(err, result) {
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

		

	}

	function parseStr(str) {
		//console.log("inline-assert: parseStr: ", str);

		var lastEq = str.lastIndexOf("=");

		if(lastEq == -1) return null;

		var leftSide = str.slice(0, lastEq).trim();
		var rightSide = str.slice(lastEq+1).trim();

		var firstParenthese = leftSide.indexOf("(");
		var functionName = leftSide.slice(0, firstParenthese).trim();

		return {fname: functionName, left: leftSide, right: rightSide};

	}

	function inlineAssertChecks(ctx, buffer, file, screenStartRow, containSpecialWidthCharacters, bufferStartRow) {

		//console.log("inline-assert: inlineAssertChecks: ", render);

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

				//console.log("inline-assert: inlineAssertChecks: screenStartRow=" + screenStartRow + " bufferStartRow=" + bufferStartRow + " render[" + i + "].pos.row=" + render[i].pos.row + " left=" + left + " top=" + top + " middle=" + middle + " EDITOR.settings.gridHeight=" + EDITOR.settings.gridHeight);

				ctx.fillText(render[i].text, left, middle);

			}
		}

	}

	// TEST-CODE-START

	EDITOR.addTest(false, function testInlineAssertInFileWithWindowsLinebreak(callback) { // Might need to be sync ? yes
		// inline-assert did not work because the file has window style line breaks
		EDITOR.openFile("testInlineAssert.js", 'function foo() {return "bar"}\r\n// assert: foo()="baz"\r\n', function terminalTestFileOpened(err, file) {

			// Give the eval function time to run
			setTimeout(function() {
				if( render.length == 0 ) throw new Error("Expected non empty array render=" + JSON.stringify(render, null, 2) + "");
				
				if(render[0].text != "bar") throw new Error("Expected render[0].text=" + render[0].text + " to be bar");

				EDITOR.closeFile(file);

				callback(true);
			}, 500);

		});
	});

	EDITOR.addTest(false, function assertVariables(callback) { // Might need to be sync ? yes
		// include declared variables as well when doing assertions
		EDITOR.openFile("testInlineAssert.js", 'const foo = _ => 1;\nlet bar = 2;\n// assert: foo() + bar = 2\n', function terminalTestFileOpened(err, file) {

			// Give the eval function time to run
			setTimeout(function() {

				if( render.length == 0 ) throw new Error("Expected non empty array render=" + JSON.stringify(render, null, 2) + "");
				
				//console.log("render=" + JSON.stringify(render, null, 2));

				//console.log("render[0].text=" + render[0].text);

				if(render[0].text != "3") throw new Error("Expected render[0].text=" + render[0].text + " to be 3");


				EDITOR.closeFile(file);

				callback(true);
			}, 500);

		});
	});

	// TEST-CODE-END


})();