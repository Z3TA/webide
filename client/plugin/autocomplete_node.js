(function() {
	"use strict";
	
	EDITOR.plugin({
		desc: "Autocomplete for Node.JS",
		load: function load() {
			
			EDITOR.on("autoComplete", autoCompleteNode);
			
		},
		unload: function unload() {
			EDITOR.removeEvent("autoComplete", autoCompleteNode);
		}
	});
	
	function autoCompleteNode(file, wordToComplete, wordLength, gotOptions, callback) {
		
		console.log("autoCompleteNode: wordToComplete=" + wordToComplete);
		
		// Autocomplete global Node.JS variables
		
		// Autocomplete built-in Node.JS module names if inside require() call
		
		// Check parsed variables from current file, check if value=="require", then check what the module returns
		if(file.parsed && wordToComplete.indexOf(".") != -1) {
			
			var objectChain = wordToComplete.split(".");
			
			var variableName = objectChain[0]; // foo in foo.bar
			
			var scope = UTIL.scope(file.caret.index, file.parsed.functions, file.parsed.globalVariables);
			
			if(scope.variables.hasOwnProperty(variableName)) {
				if(scope.variables[variableName].value == "require") {
					
					var requireArgs = scope.variables[variableName].args;
					var moduleNameStr = requireArgs.replace("(", "").replace(")", "").trim();
					
					console.log("autoCompleteNode: variableName=" + variableName + " moduleNameStr=" + moduleNameStr);
					
					// Alawys re-require the module name in case it has been updated
					checkModule(objectChain, moduleNameStr, UTIL.getDirectoryFromPath(file.path));
					return {async: true};
				}
			}
		}
	}
	
	function checkModule(objectChain, moduleNameStr, cwd) {
		// moduleNameStr can be both a module name and a path!
		
		CLIENT.cmd("nodejs.require", {nameStr: moduleNameStr, cwd: cwd}, function(err, members) {
			
		});
		
	}
	
	EDITOR.addTest(1, function autocomplete_node_modules(callback) {
		EDITOR.openFile("autocomplete_node.js", 'var http = re\n', function(err, file) {
			var atCaret = autoComplete(file, 13);
			UTIL.assert(file.rowText(0), "var http = require");
			
			file.write('("h');
			file.moveCaretToEndOfLine();
			var atCaret = autoComplete(file, 19);
			UTIL.assert(file.rowText(0), 'var http = require("http');
			
			// Make sure it can find the right method once patched
			file.write('").cre');
			file.moveCaretToEndOfLine();
			var atCaret = autoComplete(file, 150);
			UTIL.assert(file.rowText(0), 'var http = require("http").createServer()');
			
			EDITOR.closeFile(file);
			callback(true);
		});
	});
	
})();