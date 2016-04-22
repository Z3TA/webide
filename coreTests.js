(function() {
	"use strict";
	
	/*
		
		This file has all the tests for the editor core.
		All (other) tests that has to do with a plugin, should be located together with the plugin file(s).
		
		Ctrl+Shift+T first times runs the first test, second time, runs all tests. 
		Pass an integer or true as second argument to editor.addTest() to run that test first!
		
		Tests should only call the callback once!
		Note: (due to bug in chromium?) there can only be one callback() in each function, or it will be called twice, 
		even when preceded with a return.
		
		If the test doesn't finish with a test result file. You have to do some detective work to see what test failed.
		
		---
		
		editor.addTest(testFunction, runFirst)
		
		The name of the test function should be unique and describing. Use comments for extra documentation.
		The testFunction has to accept a callback as first argument and call in with bool true. Ex: callback(true)
		If the test function detects any errors, just throw new Error("whats wrong") and the test will fail. 
		
		
		
	*/
	
	
	
	editor.addTest(function scriptTagInHtmlMode(callback) {
		editor.openFile("scriptTagInHtmlMode.htm", '<div class="foo">\n<script type="text/javascript">\nif((1+1) <= b) {\nfoo ="<div></div>";\n}\n</script>\n</div>\n', function(file) {
			// .htm and .html files start with xmlMode on
			var grid = file.grid;
			
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 3) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 2) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 1) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 0) throw new Error("grid[6].indentation=" + grid[6].indentation);

			editor.closeFile(file.path);
			
			callback(true);
			
		});
	});
	
	editor.addTest(function htmlWithIfAndArrow(callback) {
		editor.openFile("htmlWithIfAndArrow.js", "if((1+1) <= b) {\nfoo ='<div></div>';\n}\n", function(file) {
			
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
		editor.openFile("functionInCallArgument.js", "foo(function bar() {});\nmeh\nfoo(function () {});\nfunction baz() {}", function(file) {
			
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
		editor.openFile("indent_curly.js", "{{\n{\n{\n{\nvar foo = {};\n}\n}\n}\n}\n}\n", function(file) {
			
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
		editor.openFile("indent_html.htm", "<div>\n<div></div>\n\n</div>\n", function(file) {
			
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
			editor.openFile("regexp.js", "{\n/*\nblock comment\n*/\n'foo'.match(/\"/g);\n}", function(file) {
				
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
	
	editor.addTest(function indentVarDeclarations(callback) {
			editor.openFile("indent_var.js", "{\nvar foo,\nbar;\nvar baz = {\nban:ana\n}\nvar bus = {};\n\n}\n", function(file) {
				
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
			editor.openFile("test_moveCaretToIndex.js", "\n\t\n  if(a==b) {\n     c=d;\n  }\n", function(file) {
				
				for(var i=0; i<file.text.length; i++) {
					file.moveCaretToIndex(i);
				}
				
				editor.closeFile(file.path);
				
				callback(true);
				
			});
		});
	
	editor.addTest(function testTabAtBeginning(callback) {
			editor.openFile("file_starts_with_tab", "\tfoo\nbar\nbaz", function(file) {
				editor.closeFile(file.path);
				
				editor.openFile("file_starts_with_space", "   foo\nbar\nbaz", function(file) {
					editor.closeFile(file.path);
					
					callback(true);
				});
				
			});
		});

	editor.addTest(function selectText(callback) {
			editor.openFile("testing_select", "", function(file) {
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
			editor.openFile("testing_write", "Line1\nLine2\nLine3\n", function(file) {
				file.write("Hello");
				file.write(" world!\nYou are great!");
				
				editor.closeFile(file.path);
				
				callback(true);
			});
		});
	
	editor.addTest(function fileWriteLine(callback) {
			
			editor.openFile("testing_writeLine", "", function(file) {
				file.writeLine("Hello world!");
				file.writeLine("Hello again!");
				
				editor.closeFile(file.path);
				
				callback(true);
				});
			
	});
	
	/*
	editor.addTest(function keyBindingsReturnTrueOrFalse(callback) {
		
			var binding;
			var funReturn;
			var combo = {shift: false, alt: false, ctrl: false, sum: 0};
			var character = "T";
			var charCode = 116; // small case t
			var targetElementClass = "fileCanvas";
			
			for(var i=0, binding; i<editor.keyBindings.length; i++) {
				binding = editor.keyBindings[i];
				
				
				if(getFunctionName(binding.fun) != "runTests_5616458984153156") { // Prevent endless loop
				
					console.log("Testing " + getFunctionName(binding.fun));
					
					funReturn = binding.fun(editor.currentFile, combo, character, charCode, "down", targetElementClass);
					
					if(funReturn !== true && funReturn !== false) {
						
						throw new Error("Function: " + getFunctionName(binding.fun) + " returned " + funReturn);
						// This is not very helpful. But how can we get the source file and line number of the function!?
						// If we create a new Error here, the stack will only point here, and not to the function
					}
				}
			}
			
			callback(true);

	});
	
	*/
	
})();