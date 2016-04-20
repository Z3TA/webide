(function() {
	"use strict";
	
	/*
		This file has all the tests for the editor core (editor.js and File.js).
		All (other) tests that has to do with a plugin, should be located together with the plugin file(s).
		
		Tests should only call the callback once!
		
		Place new tests at top. Ctrl+Shift+T first times runs the first test, second time, runs all tests.
		
		Node: (due to bug in chromium?) there can only be one callback() in each function, or it will be called twice, 
		even when preceded with a return.
		
		If the test doesn't finish with a test result file. You have to do some detective work to see what test failed.
		
	*/
	
	editor.tests.push({
		text: "Indentation of HTML",
		fun: function indentHTML(callback) {
			editor.openFile("indent_html.htm", "<div>\n<div></div>\n<meh\n</div>\n", function(file) {
				
				var grid = file.grid;
				
				if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
				if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
				if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
				if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
				
				editor.closeFile(file.path);
				
				callback(true);
				
			});
		}
	});
	
	editor.tests.push({
		text: "Parse RegExp",
		fun: function parseRegExp(callback) {
			editor.openFile("indent_var.js", "{\n'foo'.match(/\"/g);\n}", function(file) {
				
				var grid = file.grid;
				
				if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
				if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
				if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);

				editor.closeFile(file.path);
				
				callback(true);
				
			});
		}
	});
	
	editor.tests.push({
		text: "Indentation of JavaScript var declarations",
		fun: function indentVarDeclarations(callback) {
			editor.openFile("indent_var.js", "{\nvar foo,\nbar;\nvar baz = {\nban:ana\n}\nvar bus = {};\n\n}\n", function(file) {
				
				var grid = file.grid;
				
				if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
				if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
				if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
				if(grid[3].indentation != 1) throw new Error("grid[3].indentation=" + grid[3].indentation);
				if(grid[4].indentation != 2) throw new Error("grid[4].indentation=" + grid[4].indentation);
				if(grid[5].indentation != 1) throw new Error("grid[5].indentation=" + grid[5].indentation);
				if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
				if(grid[7].indentation != 1) throw new Error("grid[7].indentation=" + grid[7].indentation); 
				if(grid[8].indentation != 0) throw new Error("grid[8].indentation=" + grid[8].indentation);

				editor.closeFile(file.path);
				
				callback(true);
				
			});
		}
	});
	

	
	editor.tests.push({
		text: "Indentation of curly brackets",
		fun: function indentCurlyBrackets(callback) {
			editor.openFile("indent_curly.js", "{{\n{\n{\n{\nvar foo = {};\n}\n}\n}\n}}", function(file) {
				
				var grid = file.grid;
				
				if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
				if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
				if(grid[2].indentation != 2) throw new Error("grid[2].indentation=" + grid[2].indentation);
				if(grid[3].indentation != 3) throw new Error("grid[3].indentation=" + grid[3].indentation);
				if(grid[4].indentation != 4) throw new Error("grid[4].indentation=" + grid[4].indentation);
				if(grid[5].indentation != 3) throw new Error("grid[5].indentation=" + grid[5].indentation);
				if(grid[6].indentation != 2) throw new Error("grid[6].indentation=" + grid[6].indentation);
				if(grid[7].indentation != 1) throw new Error("grid[7].indentation=" + grid[7].indentation); 
				if(grid[8].indentation != 0) throw new Error("grid[8].indentation=" + grid[8].indentation);

				
				editor.closeFile(file.path);
				
				callback(true);
				
			});
		}
	});
	
	
	editor.tests.push({
		text: "Testing editor.bindKey(), editor.rebindKey(), editor.getKeyFor() and editor.unbindKey()",
		fun: function testKeyBindings(callback) {
			
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
			
		}
	});
	
/*
	editor.tests.push({
		text: "Opening a file while another is loading",
		fun: function openFileWhileAnotherIsLoading(callback) {
			
			// Open file from the internet (via HTTP)
			
			// Directly load another file (also with latency?)
			
		}
	});
	*/
	
	editor.tests.push({
		text: "Testing File.moveCaretToIndex()",
		fun: function test_moveCaretToIndex(callback) {
			editor.openFile("test_moveCaretToIndex.js", "  if(a==b) {\n     c=d;\n  }\n", function(file) {
				
				for(var i=0; i<file.text.length; i++) {
					file.moveCaretToIndex(i);
				}
				
				editor.closeFile(file.path);
				
				callback(true);
				
			});
		}
	});
	editor.tests.push({
		text: "Opening a file that starts with a tab or space",
		fun: function testTabAtBeginning(callback) {
			editor.openFile("file_starts_with_tab", "\tfoo\nbar\nbaz", function(file) {
				editor.closeFile(file.path);
				
				editor.openFile("file_starts_with_space", "   foo\nbar\nbaz", function(file) {
					editor.closeFile(file.path);
					
					callback(true);
				});
				
			});
		}
	});
	editor.tests.push({
		text: "Select text that has a part that is already selected",
		fun: function selectText(callback) {
			editor.openFile("testing_select", "", function(file) {
				file.write("abc def ghi");
				
				file.select([file.grid[0][4], file.grid[0][5], file.grid[0][6]]); // select def
				
				if(file.selected.length != 3) throw new Error("Expected file.selected.length=" + file.selected.length + " to be 3.");
				
				file.select([file.grid[0][0], file.grid[0][1], file.grid[0][2], file.grid[0][3], file.grid[0][4], file.grid[0][5], file.grid[0][6], file.grid[0][7], file.grid[0][8], file.grid[0][9], file.grid[0][10]]); // select all
				
				if(file.selected.length != 8) throw new Error("Expected file.selected.length=" + file.selected.length + " to be 8.");
				
				editor.closeFile(file.path);
				
				callback(true);
			});
		}
	});
	
	editor.tests.push({
		text: "Write text using File.write()",
		fun: function fileWriteLine(callback) {
			editor.openFile("testing_write", "Line1\nLine2\nLine3\n", function(file) {
				file.write("Hello");
				file.write(" world!\nYou are great!");
				
				editor.closeFile(file.path);
				
				callback(true);
			});
		}
	});
	
	editor.tests.push({
		text: "Write text using File.writeLine()",
		fun: function fileWriteLine(callback) {
			
			editor.openFile("testing_writeLine", "", function(file) {
				file.writeLine("Hello world!");
				file.writeLine("Hello again!");
				
				editor.closeFile(file.path);
				
				callback(true);
				});
			}
	});
	
	/*
	editor.tests.push({
		text: "Run all keyBindings and see if they return true or false", 
		fun: function testKeyBindings(callback) {
		
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

		}
	});
	
	*/
	
})();