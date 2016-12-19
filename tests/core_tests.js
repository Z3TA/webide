(function() {
	"use strict";
	
	/*
		
		todo: Make an own file for js_parser!
		
		This file has all the tests for the editor core.
		All (other) tests that has to do with a plugin, should be placed in the tests/ folder or added in the plugin itself.
		
		Ctrl+Shift+T first times runs the first test, second time, runs all tests. 
		Pass an integer or true as second argument to editor.addTest() to run that test first!
		
		Tests should only call the callback once!
		Note: (due to bug in chromium?) there can only be one callback() in each function, or it will be called twice, 
		even when preceded with a return.
		
		If the test doesn't finish with a test result file. You have to do some detective work to see what test failed.
		
		---
		
		editor.addTest(testFunction, runFirst)
		
		The name of the test function should be unique and describing. Use comments for extra documentation.
		The testFunction has to accept a callback as first argument and call it with bool true. Ex: callback(true)
		If the test function detects any errors, just throw new Error("whats wrong") and the test will fail. 
		
		
		todo: The JS parser should have its own test file
		
		
		
	*/
	
	
	editor.addTest(function dblClickRemovedSpace(callback) {
		// Double clicking on the first word (start of row) and then copy, then paste, will remove the space
		// The space is lost becasue File.deleteSelection recreates the grid, and the space is treated as a indentation character!
		editor.openFile("dblClickRemovedSpace.js", 'foo bar', function(err, file) {
			
			
			// Make a rowColToCord(row, col) function ??
			editor.mock("doubleClick", {x: 1 + editor.settings.leftMargin, y: 1 + editor.settings.topMargin});
			
			var data = editor.mock("copy"); 
			editor.mock("paste", {data: data}); 
			editor.mock("paste", {data: data}); 
			
			
			if(file.text != "foofoo bar") throw new Error("Unexpected behaviour");
			
			//editor.closeFile(file.path);
			callback(true);
			
		});
	}, 1);
	
	
	editor.addTest(function scrambledTextSelecting(callback) {
		
		var text = 'abcdefg\n1234567\n\n';
		
		editor.openFile("scrambledTextSelecting.js", text, function(err, file) {
			
			var row = 2;
			var col = 0;
			
			file.moveCaret(undefined, row, col);
			
			var key_UP = 38;
			var key_X = 88;
			var key_V = 86;
			
			editor.mock("keydown", {charCode: key_UP, shiftKey: true}); // shift + Arrow up
			editor.mock("keydown", {charCode: key_UP, shiftKey: true}); // shift + Arrow up
			
			// Hmm these seems to be async ...	Try to make sure we cut/paste in the right file
			editor.showFile(file);
			document.execCommand("cut");
			editor.showFile(file);
			document.execCommand("paste");

			if(file.text.trim() != text.trim()) throw new Error("Unexpected text=" + file.text);
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	});
	
	
	editor.addTest(function remInVbVar(callback) {
		editor.openFile("remInVbVar.asp", '<%\nstrRemoteIP = Request.ServerVariables("HTTP_X_REAL_IP")\n%>\n', function(err, file) {
			
			// console.log("file.parsed.comments=" + JSON.stringify(file.parsed.comments, null, 2));
			
			var comment = file.parsed.comments[0];
			
			if(comment) throw new Error("Did not expect a comment at " + JSON.stringify(comment));
			
			editor.closeFile(file.path);
			callback(true);
			
		});
	});
	
	
	editor.addTest(function htmlForLoop(callback) {
		editor.openFile("htmlForLoop.js", 'for(var i=0; i<html.length; i++) {\n\n}\n', function(err, file) {
			
			if(file.grid[1].indentation != 1) throw new Error("Expected 1 indentation on row 1. indenttation=" + file.grid[1].indentation);
			
				editor.closeFile(file.path);
				callback(true);
				
			});
	});
	
	editor.addTest(function thisOutsideFunction(callback) {
		editor.openFile("thisOutsideFunction.js", 'var bar = this;\nfunction foo() {\n}\n', function(err, file) {
			// Did throw an error ...
						
			editor.closeFile(file.path);
			callback(true);
			 });
	});
	
	editor.addTest(function wrongFuncNameAnonFunctionCallbackNextToParanthesis(callback) {
		editor.openFile("wrongFuncNameAnonFunctionCallbackNextToParanthesis.js", 'function foo() {\n\n}\n\nbar(paranthesis(arg), wrongName, function(err) {\n\n}\n', function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(file.parsed.functions.hasOwnProperty("wrongName")) throw new Error("Expected anonymous function instead of function name=wrongName !");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function wrongFuncNameAnonFunctionCallback(callback) {
		editor.openFile("wrongFuncNameAnonFunctionCallback.js", 'webshot(site.address, snapshotPath(site), options, function(err) {\n\nif(err) {\nlog("Problem taking snapshot of " + site.address);\nthrow err;\n}\n}', function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(file.parsed.functions.hasOwnProperty("options")) throw new Error("Expected anonymous function instead of function name=options !");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function wrongFuncNameWithPre(callback) {
		editor.openFile("wrongFuncNameWithPre.htm", '<pre class="meh">\nfunction foo() {\n}\n</pre>\n<pre>\nfunction bar() {\n}\n</pre>', function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(!file.parsed.functions.hasOwnProperty("foo")) throw new Error("Expected function foo");
			if(!file.parsed.functions.hasOwnProperty("bar")) throw new Error("Expected function bar");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function funcCallWithFuncInArg(callback) {
		editor.openFile("funcCallWithFuncInArg.js", "foo = setTimeout(function bar() {\n\n}, 1000);\n", function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(file.parsed.functions.hasOwnProperty("foo")) throw new Error("Expected function name to be bar instead of foo");
			if(!file.parsed.functions.hasOwnProperty("bar")) throw new Error("Expected function bar");
			
			file.moveCaret(undefined, 1);
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Might throw Error: Unable to find end of function=foo
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function wrongFunctionAnonymous(callback) {
		editor.openFile("wrongFunctionAnonymous.js", "function foo() {\nbar = setTimeout(function() {\nbaz = setTimeout(function() {\n\n}, 0);\n}, 0);\n}\n", function(err, file) {
			
			//console.log(file.parsed.functions["foo"].subFunctions[""].subFunctions);
			
			if(file.parsed.functions["foo"].subFunctions[""].subFunctions.hasOwnProperty("baz")) throw new Error("Expected an anonymous function instead of baz");
		
		file.moveCaret(undefined, 3);
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Might throw Error: Unable to find end of function=baz
		
		editor.closeFile(file.path);
		
		callback(true);
		
	});
	});
	
	editor.addTest(function unfinishedRegexp(callback) {
		editor.openFile("unfinishedRegexp.js", "foo = foo.replace(/[\n// comment", function(err, file) {
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a coment");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function twoFunctionsSameName(callback) {
		// bug: parser start parsing from the second function, thus cant find the function
		editor.openFile("twoFunctionsSameName.js", 'foo = function() {\n\n}\nfunction bar() {\nfoo = function() {}\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 1);
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw an error if in dev mode: "Parsed code contains no function! "
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function styleTagFuncEnd(callback) {
		// bug: parser switched to CSS mode and couln't find end of function, soluton: no CSS mode inside quotes 
		editor.openFile("styleTagFuncEnd.js", '\nfunction foo() {\nvar bar = "<style>";\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 0);
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw Error: Unable to find end of function=foo
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function commentOnLastLine(callback) {
		editor.openFile("commentOnLastLine.js", "// comment", function(err, file) {
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a coment");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function exitRegExp(callback) {
		editor.openFile("exitRegExp.js", "foo.match(/^[\\/\\\\]/))\n// moo\n", function(err, file) {
			
			if(file.parsed.comments.length == 0) throw new Error("Did not exit RegExp");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function closingXmlTag(callback) {
		editor.openFile("closingXmlTag.js", "html += '<body';\nhtml += '>';\n", function(err, file) {
			// problem: The color for xml tags spilled over to the next line
			//console.log("file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2));
			
			if(file.parsed.xmlTags.length > 0) throw new Error("Did not expect XML tag");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function parserGlobalFunctionOnlyfunctionOpt(callback) {
		// bug: Parser thought g1 vas the function name and deleted it from globalVariables
		editor.openFile("parserGlobalFunctionOnlyfunctionOpt.js", 'var g1 = "";\n\nfunction foo() {\ng1 = ""\n}\n\nfunction bar() {\nif(g1 == "")\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 3, 7);
			file.putCharacter(";");
			
			// Make sure global variable g1 was found
			if(!file.parsed.globalVariables.hasOwnProperty("g1")) throw new Error("Global variable g1 does not exist in file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
			
			// Make sure function foo and bar was found
			if(!file.parsed.functions.hasOwnProperty("foo")) throw new Error("Did not find function foo");
			if(!file.parsed.functions.hasOwnProperty("bar")) throw new Error("Did not find function bar");
			
			callback(true);
				
			editor.closeFile(file.path);
			
		});
	});
	
	editor.addTest(function deleteLastCurly(callback) {
		// We should do a full parse if the ending bracket is missing !? ...
		editor.openFile("deleteLastCurly.js", 'function foo() {\nfunction bar() {\n}\n}', function(err, file) {
			
			file.moveCaretToEnd(undefined, function(caret) {
				
				file.moveCaretLeft();
				file.deleteCharacter();
				
				callback(true);
				
				editor.closeFile(file.path);
				
			});
		});
	});
	
	editor.addTest(function updateStartRow(callback) {
		// Make sure the editor corrects the file.startRow after deleting a bunch of rows
		editor.openFile("deleteabunch.txt", '0', function(err, file) {
			
			var height = Math.round(editor.view.visibleRows * 2);
			
			for (var i=1; i<height; i++) {
				file.writeLine(i.toString());
			}
			
			for (var i=Math.round(editor.view.visibleRows/1.5); i<file.grid.length; i++) {
				file.select(file.grid[i]);
			}
			
			file.moveCaretToEnd(undefined, function(caret) {
				file.scrollToCaret();
				file.deleteSelection();
				
				if(file.startRow > file.grid.length) throw new Error("File view out of range!");
				
				callback(true);
				
				editor.closeFile(file.path);
			});
			
		});
	});
	
	editor.addTest(function regexBracket(callback) {
		// bug: a slash inside a regex's bracket ended the regex, and in turn made the right ] deindent the row
		editor.openFile("regexBracket.js", '{\n\nfoo.replace(/[/]/, "")\n\n}', function(err, file) {
			
			if(file.grid[2].indentation != 1) throw new Error("Expected line 3 to be indented");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function parentCodeBlockIndentation(callback) {
		editor.openFile("parentCodeBlockIndentation.js", ']\n{', function(err, file) {
			
			if(file.grid[0].indentation != 0) throw new Error("Expected 0 indentation on line 1");
			if(file.grid[1].indentation != 0) throw new Error("Expected 0 indentation on line 2");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function test_fixIndentation(callback) {
		editor.openFile("oldindentation.js", 'if(1==1) {\n\n\tif(1==2) {\n\t\tconsole.log("omg!);\n\t}\n\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 5);
			
			file.insertText("else if(1==3) {");
			
			file.insertLineBreak();
			
			file.putCharacter("}");
			
			if(file.grid[6].indentationCharacters == "") throw new Error("Expected a tab (indentation character) on line 7");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function selectUpAndDelete(callback) {
		editor.openFile("selectUpAndDelete.js", 'abc\n', function(err, file) {
			
			file.moveCaret(undefined, 0, 3); // Move the caret into the function
			
			editor.mock("keydown", {charCode: 38, shiftKey: true}); // Simulate shift + Up
			editor.mock("keydown", {charCode: 46}); // Simulate delete
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function rightWrongFunctionName(callback) {
		editor.openFile("rightWrongFunctionName.js", 'rightName = function wrongName() {};\nvar foo = bar\nfunction baz() {}', function(err, file) {
			
			var keys = Object.keys(file.parsed.functions);
			
			if(keys[0] != "rightName") throw new Error("Expected the function name to be: 'rightName'. Not '" + keys[0] + "'. file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2))
			
			if(keys[1] != "baz") throw new Error("Expected the second function name to be: 'baz'. Not '" + keys[1] + "'. file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2))
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function vbHtmlTagParser(callback) {
		
		editor.openFile("vbHtmlTagParser.asp", '<%\n"<"\nfoo\n"<div id=""foo"">"\n%>', function(err, file) {
			
			console.log("file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2));
			
			if(file.parsed.xmlTags.length != 1) throw new Error("Expecte only one xml tag. file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2))
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function parseOnlyFunctionAutocompleteInsert(callback) {
		// The end of a function should always be a right angel bracket = }
		// Seems to be a problem when we use auto-complete, caused by the changes for test:functionEndWithRIghtBracket
		
		editor.openFile("autoInsertFunc.js", 'function a() {\nfunction b() {\nfunction c() {\n\n}\nfunc\n}\n}\n', function(err, file) {
			
			//file.debugGrid();
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			file.moveCaret(undefined, 3); // Move the caret into the function
			file.insertLineBreak();
			file.moveCaret(undefined, 6, 5);
			editor.autoComplete();
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			checkFunction(file, file.parsed.functions["a"]);
			checkFunction(file, file.parsed.functions["a"].subFunctions["b"]);
			checkFunction(file, file.parsed.functions["a"].subFunctions["b"].subFunctions["c"]);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
		
	});
	
	editor.addTest(function functionEndWithRIghtBracket(callback) {
		// The end of a function should always be a right angel bracket = }
		// When using the parser optimizer that only parsers the actual function that changed, the functions start/end indexs will be off
		// The error occurs when editing a child function, then editing the parent function
		
		editor.openFile("functionEndWithRIghtBracket.js", 'function foo() {\nfunction bar() {\n\n}\n\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 2); // Move the caret into the function
			file.insertLineBreak();
			file.moveCaret(undefined, 5);
			file.insertLineBreak();
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			checkFunction(file, file.parsed.functions["foo"]);
			checkFunction(file, file.parsed.functions["foo"].subFunctions["bar"]);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function fooeqfunction(callback) {
		// Testing if the parser optimizer can handle foo = function() 
		
		editor.openFile("fooeqfunction.js", 'foo = function () {\n\n};', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw Error: Unable to find start of function=foo 
			
			// Press delete to undo, to prevent warning dialog about unsaved
			editor.mock("keydown", {charCode: 8});
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function secondSubfunction(callback) {
		editor.openFile("secondSubfunction.js", 'function baz() {\nfunction foo() {\nabc\n}\nfunction bar() {\n\n}\n}\n', function(err, file) {
			
			// Testing if the parser optimizer can handle editing bar, then typing into baz
			
			// Add a letter to the foo function
			var char_D = 68;
			file.moveCaret(undefined, 2, 3);
			editor.mock("keydown", {charCode: char_D});
			
			// Add a letter to the bar function
			var char_A = 65;
			file.moveCaret(undefined, 5);
			editor.mock("keydown", {charCode: char_A});
			
			// If something wrong, and error should be thrown here from js_parser.js
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function functionInFunctionname(callback) {
		// Testing if the parser optimizer can handle functions where the function name contains the string "function"
		var done = 0;
		
		editor.openFile("functionInFunctionname1.js", 'function functionInFunctionname() {\n\n};', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw error: Parsed code contains no function! from js_parser
			
			// Press delete to undo, to prevent warning dialog about unsaved
			editor.mock("keydown", {charCode: 8});
			
			editor.closeFile(file.path);
			
			if(++done == 3) callback(true);
			
		});
		// hmm. what about many function declarations on the same line? 
		editor.openFile("functionInFunctionname2.js", 'function foo() {function bar() {\n\n}};', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			editor.mock("keydown", {charCode: 8});
			editor.closeFile(file.path);
			if(++done == 3) callback(true);
		});
		
		// or somefunction(function() {}}
		editor.openFile("functionInFunctionname3.js", 'function somefunction(function() {\n\n});', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			editor.mock("keydown", {charCode: 13}); // Simulate Press enter
			editor.mock("keydown", {charCode: 8});
			editor.closeFile(file.path);
			if(++done == 3) callback(true);
		});
		
	});
	
	editor.addTest(function findPrototypeFunc(callback) {
		editor.openFile("findPrototypeFunc.js", 'function foo() {};\nbar.foo = function() {};\nfoo.prototype.bar = function() {}\n', function(err, file) {
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			var functions = Object.keys(file.parsed.functions);
			
			console.log("functions=" + JSON.stringify(functions));
			
			if(functions[0] != "foo") throw new Error("First function name should be foo, not " + functions[0]);
			if(functions[1] != "bar.foo") throw new Error("First function name should be bar.foo");
			if(functions[2] != "foo.prototype.bar") throw new Error("First function name should be foo.prototype.bar");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function jsFunctionArgAnonymous(callback) {
		editor.openFile("jsFunctionArgAnonymous.js", 'foo(bar(), function() {});\nbar(function() {});', function(err, file) {
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			var n = 0;
			
			for(var name in file.parsed.functions) {
				n++;
				if(name != "") throw new Error("Function " + n + " should be anonymous! name=" + name + "");
			}
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	

	editor.addTest(function htmlCommentInScriptTag(callback) {
		editor.openFile("htmlCommentInScriptTag.htm", '<script>\n<!-- Hello! -->\n</script>', function(err, file) {
			
			if(file.parsed.comments.length != 0) throw new Error("Did not expect any comment!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});

	
	editor.addTest(function vbSingleIfThen(callback) {
		editor.openFile("vbSingleIfThen.asp", '<%\nIF foo THEN bar = 1\n%>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function vbScripTagsIndention(callback) {
		editor.openFile("vbScripTagsIndention.asp", '<%\nIF b THEN\nIF a THEN\n%>\nhi\n<%\nEND IF\nEND IF\nIF b THEN\nIF a THEN %>\nhi\n<% END IF\nEND IF%>\n<div>\n<%\nIF a THEN\n%>\nfoo\n<%\nEND IF\n%>\n</div>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 2) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 2) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 0) throw new Error("grid[7].indentation=" + grid[7].indentation);
			
			if(grid[8].indentation != 0) throw new Error("grid[8].indentation=" + grid[8].indentation);
			if(grid[9].indentation != 1) throw new Error("grid[9].indentation=" + grid[9].indentation);
			if(grid[10].indentation != 2) throw new Error("grid[10].indentation=" + grid[10].indentation);
			if(grid[11].indentation != 1) throw new Error("grid[11].indentation=" + grid[11].indentation);
			if(grid[12].indentation != 0) throw new Error("grid[12].indentation=" + grid[12].indentation);
			
			if(grid[13].indentation != 0) throw new Error("grid[13].indentation=" + grid[13].indentation);
			if(grid[14].indentation != 1) throw new Error("grid[14].indentation=" + grid[14].indentation);
			if(grid[15].indentation != 1) throw new Error("grid[15].indentation=" + grid[15].indentation);
			if(grid[16].indentation != 2) throw new Error("grid[16].indentation=" + grid[16].indentation);
			if(grid[17].indentation != 2) throw new Error("grid[17].indentation=" + grid[17].indentation);
			if(grid[18].indentation != 2) throw new Error("grid[18].indentation=" + grid[18].indentation);
			if(grid[19].indentation != 1) throw new Error("grid[19].indentation=" + grid[19].indentation);
			if(grid[20].indentation != 1) throw new Error("grid[20].indentation=" + grid[20].indentation);
			if(grid[21].indentation != 0) throw new Error("grid[21].indentation=" + grid[21].indentation);

			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function vbScripRemInQuote(callback) {
		editor.openFile("vbScripRemInQuote.asp", '<%\n"vbScrip REM in quote"\nnext line\n%>', function(err, file) {
			
			//console.log("file.parsed.quotes=" + file.parsed.quotes);
			
			if(file.parsed.comments.length != 0) throw new Error("Did not expect any comment!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function vbScriptTableInStringIndent(callback) {
		editor.openFile("vbScriptTableInStringIndent.asp", '<%\nstr = "<table>"\n%>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function objHasOwnProperty(callback) {
		editor.openFile("objHasOwnProperty.js", 'function foo() {\nvar obj = {"hasOwnProperty": "1", "bar": 2}\n}\n;', function(err, file) {
			
			// If it doesn't work it will probably throw an error eslewhere
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function vbScriptNestedIfs(callback) {
		editor.openFile("vbScriptNestedIfs.asp", "<%\nIF 1=1 THEN\nIF 2=2 THEN\n\nEND IF\nEND IF\n%>\n ", function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function remVbComment(callback) {
		editor.openFile("remVbComment.asp", "<%\nREM foo\n%>\n ", function(err, file) {
			
			if(!file.parsed) throw new Error("File was not parsed!");
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a comment!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function negativeIndentationBrackets(callback) {
		
		editor.openFile("negativeIndentationBrackets.js", "re = /]]]/i\n{\n\n}\n", function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);

			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function unclosedHtmlTagInQuote(callback) {
		editor.openFile("unclosedHtmlTagInQuote.js", "html += '<html';\n// foo\n", function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a comment!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});

	editor.addTest(function singleQuoteStringEscape(callback) {
		editor.openFile("singleQuoteStringEscape.js", "var str = 'ab\\'cd';\n", function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.quotes[0].end != 17) throw new Error("Unexpected short quote!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function aspOnErrorResumeNext(callback) {
		editor.openFile("aspOnErrorResumeNext.htm", "<%\nON ERROR RESUME NEXT\nIF 1 = 2 THEN\n\nEND IF\n%>\n", function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function htmlStyleTag(callback) {
		editor.openFile("htmlStyleTag.htm", '<style>\nbody {\n\n}\n</style>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function aspTagInHtmlFile(callback) {
		editor.openFile("aspTagInHtmlFile.htm", '<div>\n<%\nvar foo = "<b>bar</b>"\n%>\n</div>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function jsLongFunction(callback) {
		editor.openFile("jsLongFunction.js", 'return foo ||\nfunction() {};\n', function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.functions.hasOwnProperty("return foo ||")) throw new Error("Unexpected function!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function jsDivisionVsRegExp(callback) {
		editor.openFile("jsDivisionVsRegExp.js", 'foo = 1 / 2;\nbar = "string"\n', function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.quotes.length == 0) throw new Error("Expected a quote!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function jsExitRegExpBackslash(callback) {
		editor.openFile("jsExitRegExpBackslash.js", 'url.replace(/\\\\/g, "/");\nurl.replace(/\\s/g, "");\n', function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.quotes[0].end != 21) throw new Error("Unexpected long quote!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function jsRegExpVsLineComment(callback) {
		editor.openFile("jsRegExpVsLineComment.js", "if(path.match(/^.*:\\/\\//g) == null)\n", function(err, file) {
			
			if(file.parsed.comments.length > 0) throw new Error("Did not expect any comments!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	editor.addTest(function vbScriptSelectCase(callback) {
		editor.openFile("vbscriptselectcaseindentation.vb", "select case foo\ncase 1\nbar(1)\ncase 2\nbar(2)\nend select\n", function(err, file) {
			// Also indentate each case in a select case
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function vbScriptComments(callback) {
		editor.openFile("vbscriptcomments.vb", "if foo then\n' comment\ncall bar\nend if\n", function(err, file) {
			// There was a bug where a comment in VB scrwed up the indentation ...
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function htmlTag(callback) {
		editor.openFile("html", '<html>\n<head>\n<script type="text/javascript">\nfoo = 1;\n</script>\n</head>\n', function(err, file) {
// Test if the parser switch to thml mode when a the <html tag is found
var grid = file.grid;

if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
editor.closeFile(file.path);

callback(true);

});
});

	
	editor.addTest(function parseXML(callback) {
		editor.openFile("parseXML.xml", '<foo>\n<bar></bar>\n</foo>\n', function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function preHtml(callback) {
		editor.openFile("preHtml.htm", '<pre></pre>\n<div>\nfoo\n</div>\n', function(err, file) {

		var grid = file.grid;

		if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
		if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
		if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
		if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);

		editor.closeFile(file.path);

		callback(true);

		});
	});

	editor.addTest(function indentArrInJson(callback) {
		editor.openFile("indent_arr_in_json.js", '{\nlabel: "foo",\ndatasets: [\n{\nname: "Adam"\n},\n{\nname: "Eve"\n}\n]\n};\n', function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 3) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 2) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 2) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 3) throw new Error("grid[7].indentation=" + grid[7].indentation); 
			if(grid[8].indentation != 2) throw new Error("grid[8].indentation=" + grid[8].indentation);
			if(grid[9].indentation != 1) throw new Error("grid[9].indentation=" + grid[9].indentation);
			if(grid[10].indentation != 0) throw new Error("grid[10].indentation=" + grid[10].indentation);

			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function indentVarObj(callback) {
		editor.openFile("indent_var_obj.js", 'var data = {\nobj1: {\nname: "Adam"\n},\nobj2: {\nname: "Eve"\n}\n};\n', function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 2) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 0) throw new Error("grid[7].indentation=" + grid[7].indentation); 
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function noRegExpInHtmlComment(callback) {
		editor.openFile("noRegExpInHtmlComment.htm", '<img src="foo"/><!-- comment -->', function(err, file) {
			// .htm and .html files start with xmlMode on
			var grid = file.grid;

			if(file.parsed.comments.length == 0) throw new Error("Expected at leat one comment");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function scriptTagInHtmlMode(callback) {
		editor.openFile("scriptTagInHtmlMode.htm", '<div class="foo">\n<script type="text/javascript">\nif((1+1) <= b) {\nfoo ="<div></div>";\n}\n</script>\n<!-- foo -->\n</div>\n', function(err, file) {
			// .htm and .html files start with xmlMode on
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 3) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 2) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 1) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 0) throw new Error("grid[7].indentation=" + grid[7].indentation); 

			if(file.parsed.comments.length == 0) throw new Error("Expected at leat one comment");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function htmlWithIfAndArrow(callback) {
		editor.openFile("htmlWithIfAndArrow.js", "if((1+1) <= b) {\nfoo ='<div></div>';\n}\n", function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);

			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});


	editor.addTest(function findJsFunctions(callback) {
		editor.openFile("functionInCallArgument.js", "foo(function bar() {});\nmeh\nfoo(function () {});\nfunction baz() {}", function(err, file) {
			
			if(!file.parsed) throw new Error("The file was not parsed!");
			if(!file.parsed.language=="JavaScript") throw new Error("The file was not parsed as JavaScript!");
			if(!file.parsed.functions.hasOwnProperty("bar")) throw new Error("Function bar was not found when parsing!");
			if(file.parsed.functions.hasOwnProperty("meh")) throw new Error("The second function should be anonymous!");
			if(!file.parsed.functions.hasOwnProperty("baz")) throw new Error("Function baz was not found when parsing!");
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function indentCurlyBrackets(callback) {
		editor.openFile("indent_curly.js", "{{\n{\n{\n{\nvar foo = {};\n}\n}\n}\n}\n}\n", function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 2) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 3) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 4) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 5) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 4) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 3) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 2) throw new Error("grid[7].indentation=" + grid[7].indentation); 
			if(grid[8].indentation != 1) throw new Error("grid[8].indentation=" + grid[8].indentation);
			if(grid[9].indentation != 0) throw new Error("grid[9].indentation=" + grid[9].indentation);
			
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function indentHTML(callback) {
		editor.openFile("indent_html.htm", "<div>\n<div></div>\n\n</div>\n", function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			editor.closeFile(file.path);
			
			callback(true);
			
		});
		
	});
	
	editor.addTest(function parseRegExp(callback) {
		editor.openFile("regexp.js", "{\n/*\nblock comment\n*/\n'foo'.match(/\"/g);\n}", function(err, file) {
				
				// note: block comments are indented
				
				var grid = file.grid;
				
				if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
				if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
				if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
				if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
				if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
				if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);

				editor.closeFile(file.path);
				
				callback(true);
				
			});
		
	});
	
	/*
	editor.addTest(function indentVarDeclarations(callback) {
		editor.openFile("indent_var.js", "{\nvar foo,\nbar;\nvar baz = {\nban:ana\n}\nvar bus = {};\n\n}\n", function(err, file) {
				
				var grid = file.grid;
				
				if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
				if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
				if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
				if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
				if(grid[4].indentation != 3) throw new Error("grid[4].indentation=" + grid[4].indentation);
				if(grid[5].indentation != 2) throw new Error("grid[5].indentation=" + grid[5].indentation);
				if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
				if(grid[7].indentation != 1) throw new Error("grid[7].indentation=" + grid[7].indentation); 
				if(grid[8].indentation != 0) throw new Error("grid[8].indentation=" + grid[8].indentation);

				editor.closeFile(file.path);
				
				callback(true);
				
			});
		
	});
	*/
	
	editor.addTest(function testKeyBindingFunctions(callback) {
			
			var key_X = 88;
			var key_Y = 89;
			
			editor.bindKey({charCode: key_X, combo: CTRL, fun: testMethod, desc: "Just testing"});
			
			editor.rebindKey("testMethod", key_Y, CTRL);
			
			var key = editor.getKeyFor("testMethod");
			var expect = "CTRL + Y";
			
			if(key != expect) throw new Error("editor.getKeyFor returned: " + key + " expected: " + expect);
			
			editor.unbindKey("testMethod");
			
			callback(true);
			
			function testMethod() {}
			
	});
	
/*
	editor.addTest(function openFileWhileAnotherIsLoading(callback) {
			
			// Open file from the internet (via HTTP)
			
			// Directly load another file (also with latency?)
			
	});
	*/
	
	editor.addTest(function test_moveCaretToIndex(callback) {
		editor.openFile("test_moveCaretToIndex.js", "\n\t\n  if(a==b) {\n     c=d;\n  }\n", function(err, file) {
				
				for(var i=0; i<file.text.length; i++) {
					file.moveCaretToIndex(i);
				}
				
				editor.closeFile(file.path);
				
				callback(true);
				
			});
		});
	
	editor.addTest(function testTabAtBeginning(callback) {
		editor.openFile("file_starts_with_tab", "\tfoo\nbar\nbaz", function(err, file) {
				editor.closeFile(file.path);
				
				editor.openFile("file_starts_with_space", "   foo\nbar\nbaz", function(err, file) {
					editor.closeFile(file.path);
					
					callback(true);
				});
				
			});
		});

	editor.addTest(function selectText(callback) {
		editor.openFile("testing_select", "", function(err, file) {
				file.write("abc def ghi");
				
				file.select([file.grid[0][4], file.grid[0][5], file.grid[0][6]]); // select def
				
				if(file.selected.length != 3) throw new Error("Expected file.selected.length=" + file.selected.length + " to be 3.");
				
				file.select([file.grid[0][0], file.grid[0][1], file.grid[0][2], file.grid[0][3], file.grid[0][4], file.grid[0][5], file.grid[0][6], file.grid[0][7], file.grid[0][8], file.grid[0][9], file.grid[0][10]]); // select all
				
				if(file.selected.length != 8) throw new Error("Expected file.selected.length=" + file.selected.length + " to be 8.");
				
				editor.closeFile(file.path);
				
				callback(true);
			});
		});
	
	editor.addTest(function fileWrite(callback) {
		editor.openFile("testing_write", "Line1\nLine2\nLine3\n", function(err, file) {
				file.write("Hello");
				file.write(" world!\nYou are great!");
				
				editor.closeFile(file.path);
				
				callback(true);
			});
		});
	
	
	
	
	function checkFunction(file, func) {
		// Make sure the function starts with an { and ends with an }
		if(file.text.charAt(func.start) != "{") {
			file.debugGrid();
			throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + lbChars(file.text.charAt(func.start)) + " to be a {");
		}
		
		if(file.text.charAt(func.end) != "}") {
			file.debugGrid();
			throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + lbChars(file.text.charAt(func.end)) + " to be a }");
		}
	}
	
	
})();

