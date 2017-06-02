(function() {
	"use strict";
	
	/*
		
		todo: Make an own file for js_parser!
		
		This file has all the tests for the editor core.
		All (other) tests that has to do with a plugin, should be placed in the tests/ folder or added in the plugin itself.
		
		Ctrl+Shift+T first times runs the first test, second time, runs all tests. 
		Pass an integer or true as second argument to EDITOR.addTest() to run that test first!
		
		Tests should only call the callback once!
		Note: (due to bug in chromium?) there can only be one callback() in each function, or it will be called twice, 
		even when preceded with a return.
		
		If the test doesn't finish with a test result file. You have to do some detective work to see what test failed.
		
		---
		
		EDITOR.addTest(testFunction, runFirst)
		
		The name of the test function should be unique and describing. Use comments for extra documentation.
		The testFunction has to accept a callback as first argument and call it with bool true. Ex: callback(true)
		If the test function detects any errors, just throw new Error("whats wrong") and the test will fail. 
		
		
		todo: The JS parser should have its own test file
		
		
		
	*/
	
	EDITOR.addTest(function doesFileCaretUpdate(callback) {
		
		// bug: File.insertLineBreak(caret) with another caret then file.caret did not update the file caret.
		
		
		EDITOR.openFile("doesFileCaretUpdate.txt", '', function(err, file) {
			
			file.write("foo\nbar", true);
			
			// I first thought the bug was in File.createCaret(), but it was actually in File.insertLineBreak() !
			
			// The sanity checks will throw if there's something wrong!

			EDITOR.closeFile(file.path);
			
			callback(true);
		});
		
		
	}, 1);
	
	EDITOR.addTest(function testRemoveRow(callback) {
		EDITOR.openFile("testRemoveRow.html", '<div>\n\t<div>\n\t\tremove me\n\t</div>\n</div>\n', function(err, file) {
			
			var row = 2;
			
			file.removeRow(row);
			
			file.checkGrid();
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function testDeleteTextRangeWithLongText(callback) {
		EDITOR.openFile("testDeleteTextRangeWithLongText.html", '<!DOCTYPE html>\r\n<div class="wrap1">\r\n\t<div class="content">\r\n\t\t\r\n\t\t<p>Esse proident dolore cupidatat in dolor reprehenderit irure nostrud eu.\r\n\t\tMollit voluptate pariatur cillum enim voluptate excepteur amet non.\r\n\t\tEnim duis irure dolore laborum quis mollit adipisicing labore excepteur fugiat dolor esse reprehenderit sunt excepteur.\r\n\t\tMollit ad laboris ad nulla dolor sint do nostrud exercitation dolore nostrud mollit.</p>\r\n\t\t\r\n\t</div>\r\n</div>\r\n', function(err, file) {
			
			var start = 62;
			var stop = 429;
			
			stop -= 2; // The fix was to not allow deleteTextRange end to include a line break
			
			console.log("text=" + UTIL.lbChars(file.text.substring(start, stop+1)));
			
			file.deleteTextRange(start,stop);
			
			// Uncaught Error: grid[3].startIndex=64 Expected startIndex=index=62
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function test_reLastIndexOf(callback) {
		
		UTIL.assert(UTIL.reLastIndexOf(/a/, "abc"), 0);
		UTIL.assert(UTIL.reLastIndexOf(/z/, "abc"), -1);
		UTIL.assert(UTIL.reLastIndexOf(/a/, "abcabc"), 3);
		UTIL.assert(UTIL.reLastIndexOf(/a/, "abcabc", 2), 0);
		
		callback(true);
		
	});
	
	EDITOR.addTest(function testDeleteTextRange(callback) {
		// Testing File.deleteTextRange()
		EDITOR.openFile("testDeleteTextRange.js", '', function(err, file) {
			
			// file.deleteTextRange calls file.sanityCheck witch will detect most errors!
			
			// Also make sure the deleted character are correct
			EDITOR.on("fileChange", change);
			var charsAfter = ""; // Will update in change
			var charactersDeleted = "";
			
			test("<body>#<div>#→Hello World!#→</div>##</body>#", 13,25);
			
			test("<body>#<div>#→#→Hello World!#→#</div>#→#→</body>#→", 15,27);
			
			test("{@#→{@#→→abc@#→→def@#→}@#}", 9,18);
			
			test("{@#→abc@#→def@#}", 4,12);
			
			test("abc#def##", 0,6);
			
			test("abcd#efghijk", 0,11);
			
			test("foo bar", 2,4);
			
			test("abc#def#ghi#jkl#", 1,13);
			
			test("{#    abc#    def#}#", 6,16);
			test("{#→→→→abc#→→→→def#}#", 6,16);
			
			test("{#    abc#    def#}gfi#", 7,20);
			
			test("{ab#    cde#", 0,10);
			
			test("{#    {#    }#}", 12,14);
			
			test("→abc#→def", 1,3);
			
			test("→abc#→def", 1,8);
			
			EDITOR.closeFile(file.path);
			
			EDITOR.removeEvent("fileChange", change);
			
			callback(true);
			
			function test(txt, start, end) {
				
				// Also run the same tests but with CRLF instead of LF
				//if(txt.indexOf("#") != -1 && txt.indexOf("@") == -1) test(txt.replace(/#/g, "@#"), start, end)
				
				console.log("Testing deleteTextRange: start=" + start + " end=" + end + "\n" + txt + "\n" + spaces(start) + underline(end-start+1) + spaces(txt.length-end) + "\n");
				
				file.text = txt.replace(/@#/g, "\r\n");
				file.text = file.text.replace(/#/g, "\n");
				file.text = file.text.replace(/→/g, "\t");
				
				file.lineBreak = UTIL.determineLineBreakCharacters(file.text);
				
				var charsBefore = file.text;
				
				file.grid = file.createGrid();
				file.deleteTextRange(start,end); // will run sanity check
				
				if(charsBefore.length - charactersDeleted.length != charsAfter.length) {
					throw new Error(`Expected charsBefore=${charsBefore.length} - charactersDeleted=${charactersDeleted.length} = charsAfter=${charsAfter.length}\n
					charsAfter=${UTIL.lbChars(charsAfter)}\n
					charactersDeleted=${UTIL.lbChars(charactersDeleted)}`); 
				}
				
				file.putCharacter("z"); // will also check file.caret
				
				function spaces(n) {
					var str = "";
					for(var i=0;i<n;i++) str += " ";
					return str;
				}
				
				function underline(n) {
					var str = "";
					for(var i=0;i<n;i++) str += "=";
					return str;
				}
				
			}
			
			function change(file, type, characters, caretIndex, row, col) {
				if(type == "deleteTextRange") {
					charsAfter = file.text;
					charactersDeleted = characters;
				}
			}
			
		});
		
	});
	
	
	EDITOR.addTest(function dblClickRemovedSpace(callback) {
		// Double clicking on the first word (start of row) and then copy, then paste, will remove the space
		// The space is lost becasue File.deleteSelection recreates the grid, and the space is treated as a indentation character!
		EDITOR.openFile("dblClickRemovedSpace.js", 'foo bar', function(err, file) {
			
			
			// Make a rowColToCord(row, col) function ??
			EDITOR.mock("doubleClick", {x: 1 + EDITOR.settings.leftMargin, y: 1 + EDITOR.settings.topMargin});
			
			var data = EDITOR.mock("copy"); 
			EDITOR.mock("paste", {data: data}); 
			EDITOR.mock("paste", {data: data}); 
			
			
			if(file.text != "foofoo bar") throw new Error("Unexpected behaviour");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function scrambledTextSelecting(callback) {
		
		var text = 'abcdefg\n1234567\n\n';
		
		EDITOR.openFile("scrambledTextSelecting.js", text, function(err, file) {
			
			var row = 2;
			var col = 0;
			
			file.moveCaret(undefined, row, col);
			
			var key_UP = 38;
			var key_X = 88;
			var key_V = 86;
			
			// Simulate select the text using the keyboard Up button
			EDITOR.mock("keydown", {charCode: key_UP, shiftKey: true}); // shift + Arrow up
			EDITOR.mock("keydown", {charCode: key_UP, shiftKey: true}); // shift + Arrow up
			
			// Hmm these seems to be async ...	Try to make sure we cut/paste in the right file
			EDITOR.showFile(file);
			document.execCommand("cut");
			EDITOR.showFile(file);
			document.execCommand("paste");
			
			if(file.text.trim() != text.trim()) throw new Error("Unexpected text=" + UTIL.lbChars(file.text) + " != " + UTIL.lbChars(text));
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function remInVbVar(callback) {
		EDITOR.openFile("remInVbVar.asp", '<%\nstrRemoteIP = Request.ServerVariables("HTTP_X_REAL_IP")\n%>\n', function(err, file) {
			
			// console.log("file.parsed.comments=" + JSON.stringify(file.parsed.comments, null, 2));
			
			var comment = file.parsed.comments[0];
			
			if(comment) throw new Error("Did not expect a comment at " + JSON.stringify(comment));
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function htmlForLoop(callback) {
		EDITOR.openFile("htmlForLoop.js", 'for(var i=0; i<html.length; i++) {\n\n}\n', function(err, file) {
			
			if(file.grid[1].indentation != 1) throw new Error("Expected 1 indentation on row 1. indenttation=" + file.grid[1].indentation);
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function thisOutsideFunction(callback) {
		EDITOR.openFile("thisOutsideFunction.js", 'var bar = this;\nfunction foo() {\n}\n', function(err, file) {
			// Did throw an error ...
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function wrongFuncNameAnonFunctionCallbackNextToParanthesis(callback) {
		EDITOR.openFile("wrongFuncNameAnonFunctionCallbackNextToParanthesis.js", 'function foo() {\n\n}\n\nbar(paranthesis(arg), wrongName, function(err) {\n\n}\n', function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(existFunctionWithName(file.parsed.functions, "wrongName")) throw new Error("Expected anonymous function instead of function name=wrongName !");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function wrongFuncNameAnonFunctionCallback(callback) {
		EDITOR.openFile("wrongFuncNameAnonFunctionCallback.js", 'webshot(site.address, snapshotPath(site), options, function(err) {\n\nif(err) {\nlog("Problem taking snapshot of " + site.address);\nthrow err;\n}\n}', function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(existFunctionWithName(file.parsed.functions, "options")) throw new Error("Expected anonymous function instead of function name=options !");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function wrongFuncNameWithPre(callback) {
		EDITOR.openFile("wrongFuncNameWithPre.htm", '<pre class="meh">\nfunction foo() {\n}\n</pre>\n<pre>\nfunction bar() {\n}\n</pre>', function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(!existFunctionWithName(file.parsed.functions, "foo")) throw new Error("Expected function foo");
			if(!existFunctionWithName(file.parsed.functions, "bar")) throw new Error("Expected function bar");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function funcCallWithFuncInArg(callback) {
		EDITOR.openFile("funcCallWithFuncInArg.js", "foo = setTimeout(function bar() {\n\n}, 1000);\n", function(err, file) {
			
			//console.log(file.parsed.functions);
			
			if(existFunctionWithName(file.parsed.functions, "foo")) throw new Error("Expected function name to be bar instead of foo");
			if(!existFunctionWithName(file.parsed.functions, "bar")) throw new Error("Expected function bar");
			
			file.moveCaret(undefined, 1);
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Might throw Error: Unable to find end of function=foo
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function wrongFunctionAnonymous(callback) {
		EDITOR.openFile("wrongFunctionAnonymous.js", "function foo() {\nbar = setTimeout(function() {\nbaz = setTimeout(function() {\n\n}, 0);\n}, 0);\n}\n", function(err, file) {
			
			
			if(file.parsed.functions[0].subFunctions[0].subFunctions[0].name == "baz") throw new Error("Expected an anonymous function instead of baz");
			
			file.moveCaret(undefined, 3);
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Might throw Error: Unable to find end of function=baz
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function unfinishedRegexp(callback) {
		EDITOR.openFile("unfinishedRegexp.js", "foo = foo.replace(/[\n// comment", function(err, file) {
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a coment");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function twoFunctionsSameName(callback) {
		// bug: parser start parsing from the second function, thus cant find the function
		EDITOR.openFile("twoFunctionsSameName.js", 'foo = function() {\n\n}\nfunction bar() {\nfoo = function() {}\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 1);
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw an error if in dev mode: "Parsed code contains no function! "
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function styleTagFuncEnd(callback) {
		// bug: parser switched to CSS mode and couln't find end of function, soluton: no CSS mode inside quotes 
		EDITOR.openFile("styleTagFuncEnd.js", '\nfunction foo() {\nvar bar = "<style>";\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 0);
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw Error: Unable to find end of function=foo
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function commentOnLastLine(callback) {
		EDITOR.openFile("commentOnLastLine.js", "// comment", function(err, file) {
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a coment");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function exitRegExp(callback) {
		EDITOR.openFile("exitRegExp.js", "foo.match(/^[\\/\\\\]/))\n// moo\n", function(err, file) {
			
			if(file.parsed.comments.length == 0) throw new Error("Did not exit RegExp");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function closingXmlTag(callback) {
		EDITOR.openFile("closingXmlTag.js", "html += '<body';\nhtml += '>';\n", function(err, file) {
			// problem: The color for xml tags spilled over to the next line
			//console.log("file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2));
			
			if(file.parsed.xmlTags.length > 0) throw new Error("Did not expect XML tag");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function parserGlobalFunctionOnlyfunctionOpt(callback) {
		// bug: Parser thought g1 vas the function name and deleted it from globalVariables
		EDITOR.openFile("parserGlobalFunctionOnlyfunctionOpt.js", 'var g1 = "";\n\nfunction foo() {\ng1 = ""\n}\n\nfunction bar() {\nif(g1 == "")\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 3, 7);
			file.putCharacter(";");
			
			// Make sure global variable g1 was found
			if(!file.parsed.globalVariables.hasOwnProperty("g1")) throw new Error("Global variable g1 does not exist in file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
			
			// Make sure function foo and bar was found
			if(!existFunctionWithName(file.parsed.functions, "foo")) throw new Error("Did not find function foo");
			if(!existFunctionWithName(file.parsed.functions, "bar")) throw new Error("Did not find function bar");
			
			callback(true);
			
			EDITOR.closeFile(file.path);
			
		});
	});
	
	EDITOR.addTest(function deleteLastCurly(callback) {
		// We should do a full parse if the ending bracket is missing !? ...
		EDITOR.openFile("deleteLastCurly.js", 'function foo() {\nfunction bar() {\n}\n}', function(err, file) {
			
			file.moveCaretToEnd(undefined, function(caret) {
				
				file.moveCaretLeft();
				file.deleteCharacter();
				
				callback(true);
				
				EDITOR.closeFile(file.path);
				
			});
		});
	});
	
	EDITOR.addTest(function updateStartRow(callback) {
		// Make sure the editor corrects the file.startRow after deleting a bunch of rows
		EDITOR.openFile("deleteabunch.txt", '0', function(err, file) {
			
			var height = Math.round(EDITOR.view.visibleRows * 2);
			
			for (var i=1; i<height; i++) {
				file.writeLine(i.toString());
			}
			
			for (var i=Math.round(EDITOR.view.visibleRows/1.5); i<file.grid.length; i++) {
				file.select(file.grid[i]);
			}
			
			file.moveCaretToEnd(undefined, function(caret) {
				file.scrollToCaret();
				file.deleteSelection();
				
				if(file.startRow > file.grid.length) throw new Error("File view out of range!");
				
				callback(true);
				
				EDITOR.closeFile(file.path);
			});
			
		});
	});
	
	EDITOR.addTest(function regexBracket(callback) {
		// bug: a slash inside a regex's bracket ended the regex, and in turn made the right ] deindent the row
		EDITOR.openFile("regexBracket.js", '{\n\nfoo.replace(/[/]/, "")\n\n}', function(err, file) {
			
			if(file.grid[2].indentation != 1) throw new Error("Expected line 3 to be indented");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function parentCodeBlockIndentation(callback) {
		EDITOR.openFile("parentCodeBlockIndentation.js", ']\n{', function(err, file) {
			
			if(file.grid[0].indentation != 0) throw new Error("Expected 0 indentation on line 1");
			if(file.grid[1].indentation != 0) throw new Error("Expected 0 indentation on line 2");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function test_fixIndentation(callback) {
		EDITOR.openFile("oldindentation.js", 'if(1==1) {\n\n\tif(1==2) {\n\t\tconsole.log("omg!);\n\t}\n\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 5);
			
			file.insertText("else if(1==3) {");
			
			file.insertLineBreak();
			
			file.putCharacter("}");
			
			if(file.grid[6].indentationCharacters == "") throw new Error("Expected a tab (indentation character) on line 7");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function selectUpAndDelete(callback) {
		EDITOR.openFile("selectUpAndDelete.js", 'abc\n', function(err, file) {
			
			file.moveCaret(undefined, 0, 3); // Move the caret into the function
			
			EDITOR.mock("keydown", {charCode: 38, shiftKey: true}); // Simulate shift + Up
			EDITOR.mock("keydown", {charCode: 46}); // Simulate delete
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function rightWrongFunctionName(callback) {
		EDITOR.openFile("rightWrongFunctionName.js", 'rightName = function wrongName() {};\nvar foo = bar\nfunction baz() {}', function(err, file) {
			
			var keys = Object.keys(file.parsed.functions);
			
			if(file.parsed.functions[0].name != "rightName") throw new Error("Expected the function name to be: 'rightName'. Not '" + file.parsed.functions[0].name + "'. file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2))
			
			if(file.parsed.functions[1].name != "baz") throw new Error("Expected the second function name to be: 'baz'. Not '" + file.parsed.functions[1].name + "'. file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2))
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function vbHtmlTagParser(callback) {
		
		EDITOR.openFile("vbHtmlTagParser.asp", '<%\n"<"\nfoo\n"<div id=""foo"">"\n%>', function(err, file) {
			
			console.log("file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2));
			
			if(file.parsed.xmlTags.length != 1) throw new Error("Expecte only one xml tag. file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2))
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function parseOnlyFunctionAutocompleteInsert(callback) {
		// The end of a function should always be a right angel bracket = }
		// Seems to be a problem when we use auto-complete, caused by the changes for test:functionEndWithRIghtBracket
		
		EDITOR.openFile("autoInsertFunc.js", 'function a() {\nfunction b() {\nfunction c() {\n\n}\nfunc\n}\n}\n', function(err, file) {
			
			//file.debugGrid();
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			file.moveCaret(undefined, 3); // Move the caret into the function
			file.insertLineBreak();
			file.moveCaret(undefined, 6, 5);
			EDITOR.autoComplete();
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			checkFunction(file, file.parsed.functions[0]);
			checkFunction(file, file.parsed.functions[0].subFunctions[0]);
			checkFunction(file, file.parsed.functions[0].subFunctions[0].subFunctions[0]);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
		
	});
	
	EDITOR.addTest(function functionEndWithRIghtBracket(callback) {
		// The end of a function should always be a right angel bracket = }
		// When using the parser optimizer that only parsers the actual function that changed, the functions start/end indexs will be off
		// The error occurs when editing a child function, then editing the parent function
		
		EDITOR.openFile("functionEndWithRIghtBracket.js", 'function foo() {\nfunction bar() {\n\n}\n\n}\n', function(err, file) {
			
			file.moveCaret(undefined, 2); // Move the caret into the function
			file.insertLineBreak();
			file.moveCaret(undefined, 5);
			file.insertLineBreak();
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			checkFunction(file, file.parsed.functions[0]);
			checkFunction(file, file.parsed.functions[0].subFunctions[0]);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function fooeqfunction(callback) {
		// Testing if the parser optimizer can handle foo = function() 
		
		EDITOR.openFile("fooeqfunction.js", 'foo = function () {\n\n};', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw Error: Unable to find start of function=foo 
			
			// Press delete to undo, to prevent warning dialog about unsaved
			EDITOR.mock("keydown", {charCode: 8});
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function secondSubfunction(callback) {
		EDITOR.openFile("secondSubfunction.js", 'function baz() {\nfunction foo() {\nabc\n}\nfunction bar() {\n\n}\n}\n', function(err, file) {
			
			// Testing if the parser optimizer can handle editing bar, then typing into baz
			
			// Add a letter to the foo function
			var char_D = 68;
			file.moveCaret(undefined, 2, 3);
			EDITOR.mock("keydown", {charCode: char_D});
			
			// Add a letter to the bar function
			var char_A = 65;
			file.moveCaret(undefined, 5);
			EDITOR.mock("keydown", {charCode: char_A});
			
			// If something wrong, and error should be thrown here from js_parser.js
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function functionInFunctionname(callback) {
		// Testing if the parser optimizer can handle functions where the function name contains the string "function"
		var done = 0;
		
		EDITOR.openFile("functionInFunctionname1.js", 'function functionInFunctionname() {\n\n};', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			// Should throw error: Parsed code contains no function! from js_parser
			
			// Press delete to undo, to prevent warning dialog about unsaved
			EDITOR.mock("keydown", {charCode: 8});
			
			EDITOR.closeFile(file.path);
			
			if(++done == 3) callback(true);
			
		});
		// hmm. what about many function declarations on the same line? 
		EDITOR.openFile("functionInFunctionname2.js", 'function foo() {function bar() {\n\n}};', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			EDITOR.mock("keydown", {charCode: 8});
			EDITOR.closeFile(file.path);
			if(++done == 3) callback(true);
		});
		
		// or somefunction(function() {}}
		EDITOR.openFile("functionInFunctionname3.js", 'function somefunction(function() {\n\n});', function(err, file) {
			file.moveCaret(undefined, 1); // Move the caret into the function
			EDITOR.mock("keydown", {charCode: 13}); // Simulate Press enter
			EDITOR.mock("keydown", {charCode: 8});
			EDITOR.closeFile(file.path);
			if(++done == 3) callback(true);
		});
		
	});
	
	EDITOR.addTest(function findPrototypeFunc(callback) {
		EDITOR.openFile("findPrototypeFunc.js", 'function foo() {};\nbar.foo = function() {};\nfoo.prototype.bar = function() {}\n', function(err, file) {
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			var functions = file.parsed.functions;
			
			console.log("functions=" + JSON.stringify(functions));
			
			if(functions[0].name != "foo") throw new Error("First function name should be foo, not " + functions[0]);
			if(functions[1].name != "bar.foo") throw new Error("First function name should be bar.foo");
			if(functions[2].name != "foo.prototype.bar") throw new Error("First function name should be foo.prototype.bar");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function jsFunctionArgAnonymous(callback) {
		EDITOR.openFile("jsFunctionArgAnonymous.js", 'foo(bar(), function() {});\nbar(function() {});', function(err, file) {
			
			//console.log("file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
			
			var n = 0;
			
			for(var i=0; i<file.parsed.functions.length; i++) {
				n++;
				if(file.parsed.functions[i].name != "") throw new Error("Function " + n + " should be anonymous! name=" + file.parsed.functions[i].name + "");
			}
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function htmlCommentInScriptTag(callback) {
		EDITOR.openFile("htmlCommentInScriptTag.htm", '<script>\n<!-- Hello! -->\n</script>', function(err, file) {
			
			if(file.parsed.comments.length != 0) throw new Error("Did not expect any comment!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function vbSingleIfThen(callback) {
		EDITOR.openFile("vbSingleIfThen.asp", '<%\nIF foo THEN bar = 1\n%>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function vbScripTagsIndention(callback) {
		EDITOR.openFile("vbScripTagsIndention.asp", '<%\nIF b THEN\nIF a THEN\n%>\nhi\n<%\nEND IF\nEND IF\nIF b THEN\nIF a THEN %>\nhi\n<% END IF\nEND IF%>\n<div>\n<%\nIF a THEN\n%>\nfoo\n<%\nEND IF\n%>\n</div>\n', function(err, file) {
			
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
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function vbScripRemInQuote(callback) {
		EDITOR.openFile("vbScripRemInQuote.asp", '<%\n"vbScrip REM in quote"\nnext line\n%>', function(err, file) {
			
			//console.log("file.parsed.quotes=" + file.parsed.quotes);
			
			if(file.parsed.comments.length != 0) throw new Error("Did not expect any comment!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function vbScriptTableInStringIndent(callback) {
		EDITOR.openFile("vbScriptTableInStringIndent.asp", '<%\nstr = "<table>"\n%>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function objHasOwnProperty(callback) {
		EDITOR.openFile("objHasOwnProperty.js", 'function foo() {\nvar obj = {"hasOwnProperty": "1", "bar": 2}\n}\n;', function(err, file) {
			
			// If it doesn't work it will probably throw an error eslewhere
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function vbScriptNestedIfs(callback) {
		EDITOR.openFile("vbScriptNestedIfs.asp", "<%\nIF 1=1 THEN\nIF 2=2 THEN\n\nEND IF\nEND IF\n%>\n ", function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function remVbComment(callback) {
		EDITOR.openFile("remVbComment.asp", "<%\nREM foo\n%>\n ", function(err, file) {
			
			if(!file.parsed) throw new Error("File was not parsed!");
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a comment!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function negativeIndentationBrackets(callback) {
		
		EDITOR.openFile("negativeIndentationBrackets.js", "re = /]]]/i\n{\n\n}\n", function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function unclosedHtmlTagInQuote(callback) {
		EDITOR.openFile("unclosedHtmlTagInQuote.js", "html += '<html';\n// foo\n", function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.comments.length == 0) throw new Error("Expected a comment!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function singleQuoteStringEscape(callback) {
		EDITOR.openFile("singleQuoteStringEscape.js", "var str = 'ab\\'cd';\n", function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.quotes[0].end != 17) throw new Error("Unexpected short quote!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function aspOnErrorResumeNext(callback) {
		EDITOR.openFile("aspOnErrorResumeNext.htm", "<%\nON ERROR RESUME NEXT\nIF 1 = 2 THEN\n\nEND IF\n%>\n", function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function htmlStyleTag(callback) {
		EDITOR.openFile("htmlStyleTag.htm", '<style>\nbody {\n\n}\n</style>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function aspTagInHtmlFile(callback) {
		EDITOR.openFile("aspTagInHtmlFile.htm", '<div>\n<%\nvar foo = "<b>bar</b>"\n%>\n</div>\n', function(err, file) {
			
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function jsLongFunction(callback) {
		EDITOR.openFile("jsLongFunction.js", 'return foo ||\nfunction() {};\n', function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			
			if(file.parsed.functions[0].name != "") throw new Error("Function should be anonymous!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function jsDivisionVsRegExp(callback) {
		EDITOR.openFile("jsDivisionVsRegExp.js", 'foo = 1 / 2;\nbar = "string"\n', function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.quotes.length == 0) throw new Error("Expected a quote!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function jsExitRegExpBackslash(callback) {
		EDITOR.openFile("jsExitRegExpBackslash.js", 'url.replace(/\\\\/g, "/");\nurl.replace(/\\s/g, "");\n', function(err, file) {
			
			//console.log("file.parsed=" + JSON.stringify(file.parsed));
			
			if(file.parsed.quotes[0].end != 21) throw new Error("Unexpected long quote!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function jsRegExpVsLineComment(callback) {
		EDITOR.openFile("jsRegExpVsLineComment.js", "if(path.match(/^.*:\\/\\//g) == null)\n", function(err, file) {
			
			if(file.parsed.comments.length > 0) throw new Error("Did not expect any comments!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function vbScriptSelectCase(callback) {
		EDITOR.openFile("vbscriptselectcaseindentation.vb", "select case foo\ncase 1\nbar(1)\ncase 2\nbar(2)\nend select\n", function(err, file) {
			// Also indentate each case in a select case
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function vbScriptComments(callback) {
		EDITOR.openFile("vbscriptcomments.vb", "if foo then\n' comment\ncall bar\nend if\n", function(err, file) {
			// There was a bug where a comment in VB scrwed up the indentation ...
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function htmlTag(callback) {
		EDITOR.openFile("html", '<html>\n<head>\n<script type="text/javascript">\nfoo = 1;\n</script>\n</head>\n', function(err, file) {
			// Test if the parser switch to thml mode when a the <html tag is found
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function parseXML(callback) {
		EDITOR.openFile("parseXML.xml", '<foo>\n<bar></bar>\n</foo>\n', function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function preHtml(callback) {
		EDITOR.openFile("preHtml.htm", '<pre></pre>\n<div>\nfoo\n</div>\n', function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function indentArrInJson(callback) {
		EDITOR.openFile("indent_arr_in_json.js", '{\nlabel: "foo",\ndatasets: [\n{\nname: "Adam"\n},\n{\nname: "Eve"\n}\n]\n};\n', function(err, file) {
			
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
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function indentVarObj(callback) {
		EDITOR.openFile("indent_var_obj.js", 'var data = {\nobj1: {\nname: "Adam"\n},\nobj2: {\nname: "Eve"\n}\n};\n', function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 2) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 0) throw new Error("grid[7].indentation=" + grid[7].indentation); 
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function noRegExpInHtmlComment(callback) {
		EDITOR.openFile("noRegExpInHtmlComment.htm", '<img src="foo"/><!-- comment -->', function(err, file) {
			// .htm and .html files start with xmlMode on
			var grid = file.grid;
			
			if(file.parsed.comments.length == 0) throw new Error("Expected at leat one comment");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function scriptTagInHtmlMode(callback) {
		EDITOR.openFile("scriptTagInHtmlMode.htm", '<div class="foo">\n<script type="text/javascript">\nif((1+1) <= b) {\nfoo ="<div></div>";\n}\n</script>\n<!-- foo -->\n</div>\n', function(err, file) {
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
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function htmlWithIfAndArrow(callback) {
		EDITOR.openFile("htmlWithIfAndArrow.js", "if((1+1) <= b) {\nfoo ='<div></div>';\n}\n", function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[4].indentation=" + grid[4].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	
	EDITOR.addTest(function findJsFunctions(callback) {
		EDITOR.openFile("functionInCallArgument.js", "foo(function bar() {});\nmeh\nfoo(function () {});\nfunction baz() {}", function(err, file) {
			
			if(!file.parsed) throw new Error("The file was not parsed!");
			if(!file.parsed.language=="JavaScript") throw new Error("The file was not parsed as JavaScript!");
			if(!existFunctionWithName(file.parsed.functions, "bar")) throw new Error("Function bar was not found when parsing!");
			if(existFunctionWithName(file.parsed.functions, "meh")) throw new Error("The second function should be anonymous!");
			if(!existFunctionWithName(file.parsed.functions, "baz")) throw new Error("Function baz was not found when parsing!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function indentCurlyBrackets(callback) {
		EDITOR.openFile("indent_curly.js", "{{\n{\n{\n{\nvar foo = {};\n}\n}\n}\n}\n}\n", function(err, file) {
			
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
			
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function indentHTML(callback) {
		EDITOR.openFile("indent_html.htm", "<div>\n<div></div>\n\n</div>\n", function(err, file) {
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
		
	});
	
	EDITOR.addTest(function parseRegExp(callback) {
		EDITOR.openFile("regexp.js", "{\n/*\nblock comment\n*/\n'foo'.match(/\"/g);\n}", function(err, file) {
			
			// note: block comments are indented
			
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
		
	});
	
	/*
		EDITOR.addTest(function indentVarDeclarations(callback) {
		EDITOR.openFile("indent_var.js", "{\nvar foo,\nbar;\nvar baz = {\nban:ana\n}\nvar bus = {};\n\n}\n", function(err, file) {
		
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
		
		EDITOR.closeFile(file.path);
		
		callback(true);
		
		});
		
		});
	*/
	
	EDITOR.addTest(function testKeyBindingFunctions(callback) {
		
		var key_X = 88;
		var key_Y = 89;
		
		EDITOR.bindKey({charCode: key_X, combo: CTRL, fun: testMethod, desc: "Just testing"});
		
		EDITOR.rebindKey("testMethod", key_Y, CTRL);
		
		var key = EDITOR.getKeyFor("testMethod");
		var expect = "CTRL + Y";
		
		if(key != expect) throw new Error("EDITOR.getKeyFor returned: " + key + " expected: " + expect);
		
		EDITOR.unbindKey("testMethod");
		
		callback(true);
		
		function testMethod() {}
		
	});
	
	/*
		EDITOR.addTest(function openFileWhileAnotherIsLoading(callback) {
		
		// Open file from the internet (via HTTP)
		
		// Directly load another file (also with latency?)
		
		});
	*/
	
	EDITOR.addTest(function test_moveCaretToIndex(callback) {
		EDITOR.openFile("test_moveCaretToIndex.js", "\n\t\n  if(a==b) {\n     c=d;\n  }\n", function(err, file) {
			
			for(var i=0; i<file.text.length; i++) {
				file.moveCaretToIndex(i);
			}
			
			EDITOR.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function testTabAtBeginning(callback) {
		EDITOR.openFile("file_starts_with_tab", "\tfoo\nbar\nbaz", function(err, file) {
			EDITOR.closeFile(file.path);
			
			EDITOR.openFile("file_starts_with_space", "   foo\nbar\nbaz", function(err, file) {
				EDITOR.closeFile(file.path);
				
				callback(true);
			});
			
		});
	});
	
	EDITOR.addTest(function selectText(callback) {
		EDITOR.openFile("testing_select", "", function(err, file) {
			file.write("abc def ghi");
			
			file.select([file.grid[0][4], file.grid[0][5], file.grid[0][6]]); // select def
			
			if(file.selected.length != 3) throw new Error("Expected file.selected.length=" + file.selected.length + " to be 3.");
			
			file.select([file.grid[0][0], file.grid[0][1], file.grid[0][2], file.grid[0][3], file.grid[0][4], file.grid[0][5], file.grid[0][6], file.grid[0][7], file.grid[0][8], file.grid[0][9], file.grid[0][10]]); // select all
			
			if(file.selected.length != 8) throw new Error("Expected file.selected.length=" + file.selected.length + " to be 8.");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function fileWrite(callback) {
		EDITOR.openFile("testing_write", "Line1\nLine2\nLine3\n", function(err, file) {
			file.write("Hello");
			file.write(" world!\nYou are great!");
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	
	function existFunctionWithName(functions, name) {
		for(var i=0; i<functions.length; i++) {
			if(functions[i].name == name) return true;
		}
		return false;
	}
	
	function checkFunction(file, func) {
		// Make sure the function starts with an { and ends with an }
		if(file.text.charAt(func.start) != "{") {
			file.debugGrid();
			throw new Error("Expected func.name=" + func.name + " start=" + func.start + " character=" + UTIL.lbChars(file.text.charAt(func.start)) + " to be a {");
		}
		
		if(file.text.charAt(func.end) != "}") {
			file.debugGrid();
			throw new Error("Expected func.name=" + func.name + " end=" + func.end + " character=" + UTIL.lbChars(file.text.charAt(func.end)) + " to be a }");
		}
	}
	
	
	
	
	
})();

