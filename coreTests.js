(function() {
	"use strict";
	
	/*
		This file has all the tests for the editor core (editor.js and File.js).
		All (other) tests that has to do with a plugin, should be located together with the plugin file(s).
		
		Tests should only call the callback once!
		
		Place new tests at top. Ctrl+Shift+T first times runs the first test, second time, runs all tests.
	*/
	

	
	editor.tests.push({
		text: "Testing File.moveCaretToIndex()",
		fun: function selectText(callback) {
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
		fun: function selectText(callback) {
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
				
				if(file.selected.length != 3) return new Error("Expected file.selected.length=" + file.selected.length + " to be 3.");
				
				file.select([file.grid[0][0], file.grid[0][1], file.grid[0][2], file.grid[0][3], file.grid[0][4], file.grid[0][5], file.grid[0][6], file.grid[0][7], file.grid[0][8], file.grid[0][9], file.grid[0][10]]); // select all
				
				if(file.selected.length != 6) return new Error("Expected file.selected.length=" + file.selected.length + " to be 6.");
				
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
					
					try {
						funReturn = binding.fun(editor.currentFile, combo, character, charCode, "down", targetElementClass);
					}
					catch(err) {
						err.message += "\nWhen calling function:" + getFunctionName(binding.fun);
						return callback(err);				
					}
					
					if(funReturn !== true && funReturn !== false) {
						
						//objInfo(binding.fun);
						
						return callback("Function: " + getFunctionName(binding.fun) + " returned " + funReturn);
						// This is not very helpful. But how can we get the source file and line number of the function!?
						// If we create a new Error here, the stack will only point here, and not to the function
					}
				}
			}
			
			callback(true);

		}
	});
	
	
	
})();