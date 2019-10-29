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
					var moduleNameStr = requireArgs.replace("(", "").replace(")", "").replace(/'/g, "").replace(/"/g, "").trim();
					
					console.log("autoCompleteNode: variableName=" + variableName + " moduleNameStr=" + moduleNameStr);
					
					// Alawys re-require the module name in case it has been updated
					checkModule(objectChain, moduleNameStr, UTIL.getDirectoryFromPath(file.path));
					return {async: true};
				}
			}
		}
	
	function checkModule(objectChain, moduleNameStr, cwd) {
		// moduleNameStr can be both a module name and a path!
		
			CLIENT.cmd("nodejsautocomplete.require", {nameStr: moduleNameStr, cwd: cwd}, function(err, resp) {
				if(err) return alertBox("Unable to get info about the " + moduleNameStr + " module: Error: " + err.message);
				
				var i = 1;
				var chainStr = objectChain[0] + ".";
				var options = [];
				
				findin(resp.variables)
				
				console.log("autoCompleteNode: checkModule: options=" + JSON.stringify(options) );
				
				callback(options);
				
				function findin(variables) {
					
					console.log("autoCompleteNode: findin: variables:" + JSON.stringify(  Object.keys(variables)  ) + " objectChain[" + i + "]=" + objectChain[i]);
					
					for(var name in variables) {
						if(objectChain[i] == "") {
							options.push(chainStr + name);
						}
						else if(name == objectChain[i]) {
							if(objectChain.length > i-1 && objectChain[i+1] != "") {
								i++;
								chainStr = chainStr + name + "."; 
								return findin(variables[name].keys);
							}
							else {
								// Show all available method/properties ?
								
							}
						}
						else if(name.slice(0, objectChain[i].length) == objectChain[i]) {
							// Autocomplete the name
							options.push(chainStr + name);
						}
					}
				}
				
			});
			
		}
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