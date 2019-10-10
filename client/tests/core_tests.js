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
	
	if(EDITOR.settings.devMode) {
		
		console.log("Binding 'run tests' to Ctrl + Shift + T");
		var keyT = 84;
		EDITOR.bindKey({desc: "Run tests", charCode: keyT, fun: EDITOR.runTests, combo: CTRL + SHIFT});
		
	}
	
	EDITOR.addTest(function testPrependDir(callback) {
		
		UTIL.assert(UTIL.prependDir("c:\\Users\\zetaf\\test\\test.js", "playback", "c:\\Users\\zetaf\\"), "c:\\Users\\zetaf\\playback\\test\\test.js");
		
		UTIL.assert(UTIL.prependDir("c:\\foo\\bar\\kaboom\\filename.js", "baz", "c:\\foo\\bar\\"), "c:\\foo\\bar\\baz\\kaboom\\filename.js");
		
		UTIL.assert(UTIL.prependDir("c:\\foo\\bar\\kaboom\\filename.js", "baz"), "c:\\baz\\foo\\bar\\kaboom\\filename.js");
		
		UTIL.assert(UTIL.prependDir("/foo/bar/", "baz"), "/baz/foo/bar/");
		UTIL.assert(UTIL.prependDir("/foo/bar/", "baz", "/foo/"), "/foo/baz/bar/");
		
		
		callback(true);
		
	});
	
	EDITOR.addTest(function testFirstFolder(callback) {
		
		UTIL.assert(UTIL.firstFolder("c:\\foo\\bar\\kaboom\\filename.js"), "foo");
		UTIL.assert(UTIL.firstFolder("c:\\foo\\bar\\kaboom\\filename.js", "c:\\foo\\bar\\"), "kaboom");
		
		UTIL.assert(UTIL.firstFolder("/foo/bar/baz"), "foo");
		UTIL.assert(UTIL.firstFolder("/foo/bar/baz", "/foo/"), "bar");
		
		callback(true);
		
	});
	
	EDITOR.addTest(function getFoldersNoPath(callback) {
		
		var folders = UTIL.getFolders("sftp://foo.bar");
		
		if(!folders[0] == "/") throw new Error("Unexpected: " + JSON.stringify(folders));
		
		callback(true);
		
	});
	
	EDITOR.addTest(function testRemoveRow2(callback) {
		EDITOR.openFile("testRemoveRow2.js", '\n\n\n\n', function(err, file) {
			
			file.removeRow(2);
			
			if(file.text != "\n\n\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function getPathFromUrl(callback) {
		
		var path = UTIL.getPathFromUrl("http://127.0.0.1:8080/?repo=https://github.com/Z3TA/test.git");
		if(path != "/") throw new Error("Expected the path to be / not " + path);
		
		var path = UTIL.getPathFromUrl("/?repo=https://github.com/Z3TA/test.git");
		if(path != "/") throw new Error("Expected the path to be / not " + path);
		
		callback(true);
		
	});
	
	EDITOR.addTest(function placeCaretOnEmtyLine(callback) {
		
		// The editor should be able to place the caret on an emty line!
		
		EDITOR.openFile("placeCaretOnEmtyLine.js", '{\n\n\n\n}', function(err, file) {
			
			var caret = file.createCaret(2);
			
			if(caret.row != 1) throw new Error("Caret was expected to be on row 1: " + JSON.stringify(file.caret));
			if(caret.col != 0) throw new Error("Caret was expected to be on col 0: " + JSON.stringify(file.caret));
			if(caret.index != 2) throw new Error("Caret index was expected to be 2: " + JSON.stringify(file.caret));
			if(caret.eol != true) throw new Error("Caret was expected to be on eol: " + JSON.stringify(file.caret));
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	
	EDITOR.addTest(function selectAllThenDelete(callback) {
		
		if(EDITOR.files.hasOwnProperty("selectAllThenDelete.js")) EDITOR.closeFile("selectAllThenDelete.js");
		
		EDITOR.openFile("selectAllThenDelete.js", 'if(1==2) {\n\talert("momo");\n}\n\t', function(err, file) {
			
			if(err) throw err;
			
			// Sneak in a tab
			//file.write("\t");
			// If we try to sneak in a tab it will not be hidden in the indentationCharacters
			// The bug only appears if the tab is in the indentationCharacters
			
			
			// Select all
			var key_A = 65;
			EDITOR.mock("keydown", {charCode: key_A, ctrlKey: true});
			
			// Delete
			var key_del = 46;
			EDITOR.mock("keydown", {charCode: 46});
			
			// We should now have deleted everything!
			
			if(file.text.length > 0) {
				console.log(UTIL.lbChars(file.text));
				throw new Error("Expected all content to be deleted! file.text.length=" + file.text.length);
			}
			
			/*
				The solution to this bug was to have the File constructor remove any tabs at the beginning
				or end of the file.
			*/
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	
	EDITOR.addTest(function UTIL_getFolders(callback) {
		
		var fullPath = "/foo.txt";
		var includeHostInfo = true;
		var folderPaths = UTIL.getFolders(fullPath, includeHostInfo);
		
		// bug: it retuns ["/", "//"], we only want ["/"]
		
		if(folderPaths.length != 1) throw new Error("Only expected one item in folderPaths=" + JSON.stringify(folderPaths));
		if(folderPaths[0] != "/") throw new Error("Expected first element to be a slash in folderPaths=" + JSON.stringify(folderPaths));
		
		return callback(true);
		
	});
	
	EDITOR.addTest(function UTIL_getLocation(callback) {
		
		var loc = UTIL.getLocation("http://hostname.com/page.htm");
		if(loc.host != "hostname.com") throw new Error("loc=" + JSON.stringify(loc, null, 2));
		
		// bug: UTIL.getLocation() gives the wrong hostname if there's auth in the url
		var loc = UTIL.getLocation("http://user:pass@hostname.com/page.htm");
		if(loc.host != "hostname.com") throw new Error("loc=" + JSON.stringify(loc, null, 2));
		
		return callback(true);
		
	});
	
	
	EDITOR.addTest(function doesFileCaretUpdate(callback) {
		
		// bug: File.insertLineBreak(caret), with another caret then file.caret, did not update file.caret.
		
		EDITOR.openFile("doesFileCaretUpdate.txt", '', function(err, file) {
			
			file.write("foo" + file.lineBreak + "bar", true);
			
			// I first thought the bug was in File.createCaret(), but it was actually in File.insertLineBreak() !
			
			// The sanity checks will throw if there's something wrong!
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
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
		EDITOR.openFile("testDeleteTextRange.js", '', function (err, file) {
			
			// file.deleteTextRange calls file.sanityCheck witch will detect most errors!
			
			// Also make sure the change event is giving the correct data
			EDITOR.on("fileChange", change);
			var charsAfter = ""; // Will update in change
			var charactersDeleted = "";
			
			test("<body>#<div>#→Hello World!#→</div>##</body>#", 13,25, "\tHello World!");
			
			test("<body>#<div>#→#→Hello World!#→#</div>#→#→</body>#→", 15,27, "\tHello World!");
			
			test("{@#→{@#→→abc@#→→def@#→}@#}", 9,18, "\t\tabc\r\n\t\tdef\r\n");
			
			test("{@#→abc@#→def@#}", 4,12, "\tabc\r\n\tdef\r\n");
			
			test("abc#def##", 0,6, "abc\ndef\n");
			
			test("abcd#efghijk", 0,11, "abcd\nefghijk");
			
			test("foo bar", 2,4);
			
			test("abc#def#ghi#jkl#", 1,13);
			
			test("{#    abc#    def#}#", 6,16, "    abc\n    def\n");
			test("{#→→→→abc#→→→→def#}#", 6,16, "\t\t\t\tabc\n\t\t\t\tdef\n");
			
			test("{#    abc#    def#}gfi#", 7,20, "bc\n    def\n}gf");
			
			test("{ab#    cde#", 0,10, "{ab\n    cde\n");
			
			test("{#    {#    }#}", 12,14, "    }\n}");
			
			test("→abc#→def", 1,3);
			
			test("→abc#→def", 1,8, "\tabc\n\tdef");
			
			EDITOR.closeFile(file.path);
			
			EDITOR.removeEvent("fileChange", change);
			
			callback(true);
			
			function test(txt, start, end, expectedRemovedText) {
				
				// Also run the same tests but with CRLF instead of LF
				//if(txt.indexOf("#") != -1 && txt.indexOf("@") == -1) test(txt.replace(/#/g, "@#"), start, end)
				
				console.log("Testing deleteTextRange: start=" + start + " end=" + end + "\n" + txt + "\n" + spaces(start) + underline(end-start+1) + spaces(txt.length-end) + "\n");
				
				file.text = txt.replace(/@#/g, "\r\n");
				file.text = file.text.replace(/#/g, "\n");
				file.text = file.text.replace(/→/g, "\t");
				
				file.lineBreak = UTIL.determineLineBreakCharacters(file.text);
				
				var charsBefore = file.text;
				
				file.grid = file.createGrid();
				
				if(expectedRemovedText == undefined) expectedRemovedText = file.text.slice(start, end+1);
				
				file.deleteTextRange(start,end); // will run sanity check, removed text saved as charactersDeleted
				
				if(charsBefore.length - charactersDeleted.length != charsAfter.length) {
					throw new Error("Expected charsBefore=" + charsBefore.length + " - charactersDeleted=" + charactersDeleted.length + " = charsAfter=" + charsAfter.length + "\ncharsAfter=" + UTIL.lbChars(charsAfter) + "\ncharactersDeleted=" + UTIL.lbChars(charactersDeleted) + "");
				}
				
				if(charactersDeleted != expectedRemovedText) throw new Error("charactersDeleted=" + UTIL.lbChars(charactersDeleted) + " expectedRemovedText=" + UTIL.lbChars(expectedRemovedText));
				
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
			
			var data = file.getSelectedText();
			
			if(file.text.trim() != data.trim()) throw new Error("Unexpected text=" + UTIL.lbChars(file.text) + " != " + UTIL.lbChars(data));
			
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
	
	
	EDITOR.addTest(3, function closingXmlTag(callback) {
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
			
			file.moveCaretToEndOfFile(undefined, function(caret) {
				
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
			
			file.moveCaretToEndOfFile(undefined, function(caret) {
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
		EDITOR.openFile("/test_fixIndentation.js", 'if(1==1) {\n\n\tif(1==2) {\n\t\tconsole.log("omg!);\n\t}\n\n}\n', function(err, file) {
			if(err) throw err;
			if(!file) throw new Error("file=" + file);
			
			file.moveCaret(undefined, 5);
			
			file.insertText("else if(1==3) {");
			
			file.insertLineBreak();
			
			file.putCharacter("}");
			
			EDITOR.saveFile(file, file.path, function fileSaved(err) {
				if(err) throw err;
				
				if(file.grid[6].indentationCharacters == "") throw new Error("Expected a tab (indentation character) on line 7");
				
				EDITOR.closeFile(file.path);
				EDITOR.deleteFile(file.path);
				
			});
			
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
			if(!file.parsed.language=="JS") throw new Error("The file was not parsed as JavaScript!");
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
	
	EDITOR.addTest(function testUtilResolvePath(callback) {
		
		var R = UTIL.resolvePath;
		
		// Windows path's
		UTIL.assert(R("C:\\foo\\bar\\", "baz/"), "C:\\foo\\bar\\baz\\");
		UTIL.assert(R("C:\\foo\\bar\\", "../"), "C:\\foo\\");
		UTIL.assert(R("C:\\foo\\bar\\", "../../../fizz.txt"), "C:\\fizz.txt");
		
		// Unix/Linux paths
		UTIL.assert(R("/foo/bar/", "baz"), "/foo/bar/baz");
		UTIL.assert(R("/foo/bar/", "../baz"), "/foo/baz");
		UTIL.assert(R("/foo/bar/", "../../baz"), "/baz");
		UTIL.assert(R("/foo/bar/", "./baz"), "/foo/bar/baz");
		
		UTIL.assert(R("http://www.foo.com/foo/bar/", "/baz"), "http://www.foo.com/baz");
		UTIL.assert(R("http://www.foo.com/foo/bar/", "/baz/"), "http://www.foo.com/baz/");
		UTIL.assert(R("http://www.foo.com/foo/bar/", "../baz/"), "http://www.foo.com/foo/baz/");
		UTIL.assert(R("http://www.foo.com/", "/baz"), "http://www.foo.com/baz");
		UTIL.assert(R("http://www.foo.com/bar/", "baz/file.htm"), "http://www.foo.com/bar/baz/file.htm");
		
		callback(true);
		
	});
	
	EDITOR.addTest(function supportWindowsPaths(callback) {
		
		var oldWorkingDir = EDITOR.workingDirectory;
		
		EDITOR.changeWorkingDir("C:\\Users\\Jon Doe\\");
		// System's path delimiter is taken from the working dir
		
		UTIL.assert(UTIL.joinPaths(["/foo/bar/", "baz"]), "/foo/bar/baz");
		UTIL.assert(UTIL.joinPaths(["C:\\\\users\\me\\foo", "bar\\baz\\"]), "C:\\users\\me\\foo\\bar\\baz\\");
		UTIL.assert(UTIL.joinPaths(["C:\\\\users\\me\\foo", "bar/baz/"]), "C:\\users\\me\\foo\\bar\\baz\\");
		
		UTIL.assert(UTIL.toSystemPathDelimiters("C:\\\\foo\\bar/baz.txt"), "C:\\\\foo\\bar\\baz.txt");
		UTIL.assert(UTIL.toSystemPathDelimiters("C:\\\\foo//bar/baz.txt"), "C:\\\\foo\\bar\\baz.txt");
		UTIL.assert(UTIL.toSystemPathDelimiters("C:\\\\foo\\\\bar\\\\baz.txt"), "C:\\\\foo\\bar\\baz.txt");
		
		EDITOR.changeWorkingDir(oldWorkingDir);
		
		callback(true);
		
	});
	
	EDITOR.addTest(function testParseStackTrace(callback) {
		
		var s = UTIL.parseStackTrace("creating caret: at File.createCaret (http://127.0.0.1:8080/File.js:434:20)");
		if(s[0].fName != "File.createCaret" || s[0].lineno != "434") throw new Error("Unexpected: " + JSON.stringify(s, null, 2) );
		
		var s = UTIL.parseStackTrace("@http://127.0.0.1:8080/rs9snkpfpe/inlineErrorMessages.htm:4:7");
		if(s[0].lineno != "4") throw new Error("Unexpected: " + JSON.stringify(s, null, 2));
		
		var s = UTIL.parseStackTrace("hi 1539955769156: oleLog@http://127.0.0.1:8080/WysiwygEditor.js:2085:24");
		if(s[0].fName != "oleLog" || s[0].lineno != "2085") throw new Error("Unexpected: " + JSON.stringify(s, null, 2));
		
		callback(true);
	});
	
	EDITOR.addTest(function testParseJavaScriptError(callback) {
		
		// Edge on Windows 10
		var s = UTIL.parseErrorMessage('Error: This is an error! 1570601270105\nat Anonymous function (http://127.0.0.1/rpr9comthz/inlineErrorMessages.htm:4:1)');
		if(s.line != 4) throw new Error("s.line=" + s.line + " s=" + JSON.stringify(s, null, 2));
		if(s.col != 1) throw new Error("s.col=" + s.col + " s=" + JSON.stringify(s, null, 2));
		if(s.source != "http://127.0.0.1/rpr9comthz/inlineErrorMessages.htm") throw new Error("s.source=" + s.source + " s=" + JSON.stringify(s, null, 2));
		if(s.message != "Error: This is an error! 1570601270105") throw new Error("s.message=" + s.message + " s=" + JSON.stringify(s, null, 2));
		if(s.stack.length != 1) throw new Error("s.stack.length=" + s.stack.length + " s=" + JSON.stringify(s, null, 2));
		
		
		// Safari browser on Macbook pro
		var s = UTIL.parseErrorMessage('the message: oleLog@http://192.168.0.3/WysiwygEditor.js:2130:56\nconsoleLogCapturer@http://192.168.0.3/WysiwygEditor.js:1808:28\nhttp://192.168.0.3/0tgxkypi7y/inlineConsoleLog.htm:4:12');
		if(s.line != 2130) throw new Error("s.line=" + s.line + " s=" + JSON.stringify(s, null, 2));
		if(s.col != 56) throw new Error("s.col=" + s.col + " s=" + JSON.stringify(s, null, 2));
		if(s.source != "http://192.168.0.3/WysiwygEditor.js") throw new Error("s.source=" + s.source + " s=" + JSON.stringify(s, null, 2));
		if(s.message != "the message") throw new Error("s.message=" + s.message + " s=" + JSON.stringify(s, null, 2));
		if(s.stack.length != 3) throw new Error("s.stack.length=" + s.stack.length + " s=" + JSON.stringify(s, null, 2));
		
		
		// Firefox browser running on Linux (Ubuntu)
		var s = UTIL.parseErrorMessage("hi 1552910288020: oleLog@http://127.0.0.1:8080/WysiwygEditor.js:2083:24\nconsoleLogCapturer@http://127.0.0.1:8080/WysiwygEditor.js:1791:4\n@http://127.0.0.1:8080/gme8e1qgab/inlineConsoleLog.htm:4:1");
		if(s.fun != "oleLog") throw new Error("s.fun=" + s.fun + " s=" + JSON.stringify(s, null, 2));
		if(s.col != 24) throw new Error("s.col=" + s.col + " s=" + JSON.stringify(s, null, 2));
		if(s.message != "hi 1552910288020") throw new Error("s.message=" + s.message + " s=" + JSON.stringify(s, null, 2));
		if(s.stack.length != 3) throw new Error("s.stack.length=" + s.stack.length + " s=" + JSON.stringify(s, null, 2));
		
		
		// Nodejs v8 (V8 engine) running on Linux 
		var s = UTIL.parseErrorMessage("/home/zeta/test/error.js:7\na=1;\n ^\n\n\nReferenceError: a is not defined\nat /home/zeta/test/error.js:7:2\nat /home/zeta/test/error.js:9:3\nat Object.<anonymous> (/home/zeta/test/error.js:12:3)\nat Module._compile (module.js:652:30)\nat Object.Module._extensions..js (module.js:663:10)\nat Module.load (module.js:565:32)\nat tryModuleLoad (module.js:505:12)\nat Function.Module._load (module.js:497:3)\nat Function.Module.runMain (module.js:693:10)\nat startup (bootstrap_node.js:188:16)");
		if(s.line != 7) throw new Error("s.line=" + s.line + " s=" + JSON.stringify(s, null, 2));
		if(s.col != 2) throw new Error("s.col=" + s.col + " s=" + JSON.stringify(s, null, 2));
		if(s.source != "/home/zeta/test/error.js") throw new Error("s.source=" + s.source + " s=" + JSON.stringify(s, null, 2));
		if(s.message != "ReferenceError: a is not defined") throw new Error("s.message=" + s.message + " s=" + JSON.stringify(s, null, 2));
		if(s.stack.length != 10) throw new Error("s.stack.length=" + s.stack.length + " s=" + JSON.stringify(s, null, 2));
		
		
		// "throw" in Nodejs v8 (V8 egnine) running on Linux. eg throw "foo"
		var s = UTIL.parseErrorMessage('/home/zeta/test/error2.js:4\nthrow "foobar";\n^\nfoobar\n');
		if(s.line != 4) throw new Error("s.line=" + s.line + " s=" + JSON.stringify(s, null, 2));
		if(s.col != 1) throw new Error("s.col=" + s.col + " s=" + JSON.stringify(s, null, 2));
		if(s.source != "/home/zeta/test/error2.js") throw new Error("s.source=" + s.source + " s=" + JSON.stringify(s, null, 2));
		if(s.message != "foobar") throw new Error("s.message=" + s.message + " s=" + JSON.stringify(s, null, 2));
		if(s.stack.length != 0) throw new Error("s.stack.length=" + s.stack.length + " s=" + JSON.stringify(s, null, 2));
		
		
		callback(true);
	});
	
	EDITOR.addTest(function noTextOusideScreen(callback) {
		
		EDITOR.openFile("textOutsideScreen.txt", 'Row 0', function(err, file) {
			
			if(err) throw err;
			
			var canvasHeight = EDITOR.view.canvasHeight;
			var gridBoxHeight = EDITOR.settings.gridHeight;
			var topMargin = EDITOR.settings.topMargin;
			var bottomMargin = EDITOR.settings.bottomMargin;
			var visibleRows = Math.ceil( (canvasHeight - topMargin - bottomMargin) / gridBoxHeight );
			
			for (var row=1; row<visibleRows; row++) {
				file.writeLine("Row " + row);
			}
			
			file.moveCaretToEndOfFile();
			file.scrollToCaret();
			
			if(file.startRow != 1) throw new Error("Text is outside the screen! file.startRow=" + file.startRow + " visibleRows=" + visibleRows);
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function renderCaretWhenSwitchingBetweenFiles(callback) {
		/*
			bug: You will get an error if you type in a big file, then switch to another file that has less rows
		*/
		EDITOR.openFile("smallFile.txt", '1\n2\n3\n', function(err, smallFile) {
			if(err) throw err;
			EDITOR.openFile("bigFile.txt", '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n', function(err, bigFile) {
				if(err) throw err;
				
				for (var i=0; i<10000; i++) {
					bigFile.writeLineBreak();
				}
				bigFile.moveCaretToEndOfFile();
				EDITOR.showFile(bigFile);
				EDITOR.mock("typing", "abc");
				EDITOR.showFile(smallFile);
				// We would now get an error: Uncaught Error: row=9 does not exist in file grid! 
				// Hmm, the error is not thrown right away !?
				// It was due to the render-caret animation, which renders the caret after 3 seconds!
				// So make sure the bigFile is BIG so that whatever file we land into after 3 seconds are smaller in order to trigger the bug
				
				setTimeout(function() {
					EDITOR.closeFile(bigFile);
					EDITOR.closeFile(smallFile);
					
					callback(true);
				}, 5000);
				
			});
		});
	});
	
	EDITOR.addTest(function writeLines(callback) {
		var testFolder = "/bigFileWriteLines/"
		var originalFilePath = testFolder + "/writeLinesTest";
		var testFiles = [];
		var testCounter = 0;
		
		// Todo: test with \r\n line breaks
		
		var tests = [
			{
				add: "Hello\nworld\n\n",
				start: 1,
				result: "Hello\nworld\n\nFirst\nSecond\n"
			},
			{
				add: "Line 2\nLine 3",
				start: 2,
				result: "Hello\nLine 2\nLine 3\nworld\n\nFirst\nSecond\n"
			},
			{
				add: "Line 2 foo\nLine 3 bar",
				start: 2,
				end: 3,
				overwrite: true,
				result: "Hello\nLine 2 foo\nLine 3 bar\nworld\n\nFirst\nSecond\n"
			},
			{
				add: "Replaced line 3",
				start: 3,
				end: 3,
				overwrite: true,
				result: "Hello\nLine 2 foo\nReplaced line 3\nworld\n\nFirst\nSecond\n"
			},
			{
				add: "Line1\nLine2\nLine3",
				start: 1,
				end: 3,
				overwrite: true,
				result: "Line1\nLine2\nLine3\nworld\n\nFirst\nSecond\n"
			},
			{
				add: "A\nB\nC",
				start: 4,
				end: 6,
				overwrite: true,
				result: "Line1\nLine2\nLine3\nA\nB\nC\nSecond\n"
			}
			
			
		];
		
		EDITOR.createPath(testFolder, function(err) {
			if(err) throw err;
			
			// Run the tests with different chunk sizes
			run(tests, 1024, function(err) {
				if(err) throw err;
				run(tests, 3, function(err) {
					if(err) throw err;
					run(tests, 12, function(err) {
						if(err) throw err;
						
						cleanup();
					});
				});
			});
		});
		
		function cleanup() {
			CLIENT.cmd("deleteDirectory", {recursive: true, directory: testFolder}, function(err) {
				if(err) throw err;
				
				callback(true);
				
			});
		}
		
		
		function run(originalTests, chunkSize, callback) {
			
			testCounter++;
			
			var filePath = originalFilePath + testCounter;
			
			console.log("chunkSize=" + chunkSize);
			
			var tests = originalTests.slice(); // Copy array
			
			EDITOR.saveToDisk(filePath, "First\nSecond\n", function(err) {
				if(err) throw err;
				test();
			});
			
			function test() {
				if(tests.length == 0) {
					CLIENT.cmd("deleteFile", {filePath: filePath}, function(err) {
						if(err && err.code != "ENOENT") throw err;
						callback(null);
					});
					return;
				}
				var item = tests.shift();
				var options = {path: filePath, chunkSize: chunkSize, content: item.add, start: item.start, end: item.end, overwrite: item.overwrite};
				CLIENT.cmd("writeLines", options, function(err) {
					if(err) throw err;
					
					CLIENT.cmd("readFromDisk", {path: filePath}, function(err, read) {
						if(err) throw err;
						
						if(read.data != item.result) {
							console.log("Added: " + item.add);
							console.log("start=" + item.start + " end=" + item.end);
							console.log("Expected file content: " + UTIL.lbChars(item.result));
							console.log("Actual file content: " + UTIL.lbChars(read.data));
							EDITOR.openFile(filePath, function(err) {
								if(err) throw err;
								
								throw new Error("Unexpected file content after writeLines operation! See " + filePath + " and console.logs for more details. chunkSize=" + chunkSize);
							}); 
						}
						else test(); // Run next test
						
					});
					
				});
			}
		}
	});
	
	EDITOR.addTest(function editBigFile(callback) {
		// note: Need to place the testfile.txt inside the user home dir!
		
		var filePath = "/testfile.txt";
		var testFile = "/editBigFileTest.txt";
		
		console.log("Saving copy of " + filePath + " at " + testFile + " ...");
		CLIENT.cmd("copyFile", {from: filePath, to: testFile}, function(err) {
			if(err) throw err;
			
			if(EDITOR.files.hasOwnProperty(testFile)) throw new Error("testFile=" + testFile + " is already open!");
			
			console.log("Opening " + testFile + " ...");
			EDITOR.openFile(testFile, function gotoLine2000(err, file) {
				if(err) throw err;
				
				if(!file.isBig) throw new Error("file.isBig=" + file.isBig + " file.text.length=" + file.text.length + " file.grid.length=" + file.grid.length);
				if(file.totalRows != 33999) throw new Error("Expected file.totalRows=" + file.totalRows + " to be 33999 !");
				
				
				console.log("Going to line 2000 in " + testFile + " ...");
				file.gotoLine(2000, function atLine2000(err) {
					if(err) throw err;
					
					file.moveCaretToEndOfLine();
					
					var insertedText = " test edit on l2k";
					file.insertText(insertedText);
					
					console.log("Saving " + testFile + " ...");
					EDITOR.saveFile(file, function(err) {
						if(err) throw err;
						
						EDITOR.closeFile(file);
						
						console.log("(Re)opening " + testFile + " ...");
						EDITOR.openFile(testFile, function(err, file) {
							if(err) throw err;
							
							var text = file.rowText(1999);
							var expectedText = "L2000_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKL" + insertedText;
							if(text != expectedText) {
								console.log("Going to line 2000 to show error in " + testFile + " ...");
								file.gotoLine(2000, function(err) {
									if(err) throw err;
									throw new Error("Expected Line 2000 to be " + expectedText);
								});
							}
							else {
								console.log("Going to line 5000 in " + testFile + " ...");
								file.gotoLine(5000, function checkLine5000(err) {
									if(err) throw err;
									
									var text = file.rowText(file.caret.row);
									var expectedText = "L5000_abcdefghijklmnopqrstuvwxyzåäöABCD";
									
									if(text != expectedText) throw new Error('Expected line 5000 to be "' + expectedText + '" but it is "' + text + '".');
									else {
										EDITOR.closeFile(file);
										console.log("Deleting " + testFile + " ...");
										CLIENT.cmd("deleteFile", {filePath: testFile}, function(err) {
											if(err) throw err;
											
											EDITOR.closeAllDialogs("BIG_FILE");
											
											callback(true);
										});
									}
								});
							}
						});
					});
				});
			});
		});
	});
	
	EDITOR.addTest(function editBigFile2(callback) {
		var filePath = "/testfile.txt";
		var testFile = "/editBigFileTest2.txt";
		
		console.log("Saving copy of " + filePath + " at " + testFile + " ...");
		CLIENT.cmd("copyFile", {from: filePath, to: testFile}, function(err) {
			if(err) throw err;
			
			console.log("Opening " + testFile + " ...");
			EDITOR.openFile(testFile, function(err, file) {
				
				console.log("Going to line 5000 in " + testFile + " ...");
				file.gotoLine(5000, function(err) {
					if(err) throw err;
					
					
					
					file.moveCaretToEndOfLine();
					
					var insertedText = " test edit on l5k";
					file.insertText(insertedText);
					
					console.log("Saving " + testFile + " ...");
					EDITOR.saveFile(file, function(err) {
						if(err) throw err;
						
						EDITOR.closeFile(file);
						
						console.log("(Re)opening " + testFile + " ...");
						EDITOR.openFile(testFile, function(err, file) {
							if(err) throw err;
							
							var text = file.rowText(1999);
							var expectedText = "L2000_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKL";
							if(text != expectedText) {
								console.log("Going to line 2000 to show error in " + testFile + " ...");
								file.gotoLine(2000, function(err) {
									if(err) throw err;
									throw new Error("Expected Line 2000 to be " + expectedText);
								});
							}
							else {
								console.log("Going to line 10000 in " + testFile + " ...");
								file.gotoLine(10000, function(err) {
									if(err) throw err;
									
									var text = file.rowText(file.caret.row);
									var expectedText = "L10000_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ1234567";
									
									if(text != expectedText) throw new Error("Expected line 10000 to be " + expectedText);
									else {
										EDITOR.closeFile(file);
										console.log("Deleting " + testFile + " ...");
										CLIENT.cmd("deleteFile", {filePath: testFile}, function(err) {
											if(err) throw err;
											
											callback(true);
											
											setTimeout(function() {
												var dialogCodes = EDITOR.openDialogs.map(function(dialog) { return dialog.code });
												if(dialogCodes.indexOf("BIG_FILE") != -1) EDITOR.closeAllDialogs("BIG_FILE");
											}, 1000);
											
										});
									}
								});
							}
						});
					});
				});
			});
		});
	});
	
	EDITOR.addTest(function testJoinPath(callback) {
		
		var assert = UTIL.assert;
		
		assert(UTIL.joinPaths(["foo", "bar", "baz"]), "/foo/bar/baz");
		assert(UTIL.joinPaths(["foo", ["keff", "beff"], "baz"]), "/foo/keff/beff/baz");
		assert(UTIL.joinPaths("foo", ["keff", "beff"], "baz"), "/foo/keff/beff/baz");
		assert(UTIL.joinPaths("http://127.0.0.1:8080/xucxrrklac/", ["en"], "index.htm"), "http://127.0.0.1:8080/xucxrrklac/en/index.htm");
		
		
		callback(true);
	});
	
	EDITOR.addTest(500, false, function closeDialogWithCode(callback) {
		
		if(EDITOR.openDialogs.length > 0) throw new Error("Can not run test closeDialogWithCode while there are open dialogs!");
		
		alertBox("This dialog should be kept open", "OTHER_CODE");
		alertBox("This dialog should be closed 1", "SPECIAL_DIALOG_CODE");
		alertBox("This dialog should be closed 2", "SPECIAL_DIALOG_CODE");
		alertBox("This dialog should be closed 3", "SPECIAL_DIALOG_CODE");
		
		EDITOR.closeAllDialogs("SPECIAL_DIALOG_CODE");
		
		if(EDITOR.openDialogs.length != 1) throw new Error("The dialog's didn't close!");
		
		EDITOR.closeAllDialogs("OTHER_CODE");
		
		if(EDITOR.openDialogs.length != 0) throw new Error("The other dialog didn't close!");
		
		callback(true);
		
	});
	
	EDITOR.addTest(1000, false, function testDoubleLogin(callback) {
		// It should not be possible to be logged in twice
		
		var userValue = "";
		var pwValue = "";
		var loginSuccessCounter = -1; // We will get one loginSuccess when we call CLIENT.on("loginSuccess") then another after the re-connection
		var loginAttempts = 0;
		
		CLIENT.on("clientJoin", testDoubleLoginClientJoin);
		CLIENT.on("connectionConnected", testDoubleLoginConnectionConnected);
		CLIENT.on("loginSuccess", testDoubleLoginLoginSuccess);
		
		EDITOR.localStorage.getItem(["editorServerUser", "editorServerPw"], function gotLoginFromLocalStorage(err, obj) {
			if(err) throw new Error("Failed to get login credentials! Error: " + err);
			else {
				
				userValue = obj.editorServerUser;
				pwValue = obj.editorServerPw;
				
				CLIENT.disconnect();
				CLIENT.connect();
				
			}
			
		});
		
		function testDoubleLoginLoginSuccess(json) {
			console.warn("testDoubleLogin: loginSuccess! json=" + JSON.stringify(json, null, 2));
			
			loginSuccessCounter++;
			
			if(loginSuccessCounter>1) throw new Error("Logged in " + loginSuccessCounter + " times!");
			
			if(loginAttempts == 2) {
				CLIENT.removeEvent("clientJoin", testDoubleLoginClientJoin);
				CLIENT.removeEvent("connectionConnected", testDoubleLoginConnectionConnected);
				CLIENT.removeEvent("loginSuccess", testDoubleLoginLoginSuccess);
				callback(true);
				userValue = null;
				pwValue = null;
			}
		}
		
		function testDoubleLoginClientJoin(json) {
			var connectedClientIds = json.connectedClientIds;
			if(connectedClientIds.length > 1) throw new Error("Logged in more then once !");
		}
		
		function testDoubleLoginConnectionConnected(err) {
			// Try to login twice
			CLIENT.cmd("identify", {username: userValue, password: pwValue, sessionId: "abc"}, function loggedInMaybe(err, resp) {
				loginAttempts++;
				if(err) {
					console.log("testDoubleLogin: First login attempt failed! Error: " + err.message);
				}
				else {
					console.log("testDoubleLogin: First login attempt succeeded!");
				}
			});
			
			CLIENT.cmd("identify", {username: userValue, password: pwValue, sessionId: "def"}, function loggedInMaybe(err, resp) {
				loginAttempts++;
				if(err) {
					console.log("testDoubleLogin: Second login attempt failed! Error: " + err.message);
				}
				else {
					console.log("testDoubleLogin: Second login attempt succeeded!");
				}
			});
		}
		
	}); // Run this last because it will interfere (logging out) with other tests 
	
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
