(function() {
	"use strict";
	
	var moduleInfoCache;
	
	EDITOR.plugin({
		desc: "Autocomplete for Node.JS",
		load: function load() {
			
			EDITOR.on("autoComplete", autoCompleteNode);
			
			moduleInfoCache = {};
			
		},
		unload: function unload() {
			EDITOR.removeEvent("autoComplete", autoCompleteNode);
			
			moduleInfoCache = null;
		}
	});
	
	function insideFunctionCall(file, caret) {
		/*
			Also see function with the same name in plugin/javascript/autocomplete.js !
			
			Looking for foo.bar(
			
		*/
		
		var foundLeftParenthesis = 0;
		var word = "";
		var commasLeft = 0;
		for(var i=caret.index, c; i>0; i--) {
			c = file.text[i];
			console.log("autoCompleteNode: insideFunctionCall: c=" + c + " foundLeftParenthesis=" + foundLeftParenthesis + " word=" + word + " commasLeft=" + commasLeft);
			if(foundLeftParenthesis) {
				if(c=="}" || c=="]" || c==")" || c==";") {
					break;
				}
				else if(c.match(/\S/)) {
					word = c + word;
				}
				else {
					console.log("autoCompleteNode: insideFunctionCall: white space = c=" + c + " " + UTIL.lbChars(c));
				}
			}
			else if(c == "(") {
				foundLeftParenthesis = i;
			}
			else if(c == ",") {
				commasLeft++;
			}
		}
		
		word = word.replace(/\s/g, "").trim();
		
		console.log("autoCompleteNode: insideFunctionCall: word=" + word);
		
		if(!foundLeftParenthesis) return null;
		if(!word) return null;
		
		// Find the right parenthesis
		var commasRight = 0;
		for(var i=caret.index, c; i<file.text.length; i++) {
			c = file.text[i];
			if(c == ")" || c=="]" || c=="}" || c==";") {
				break;
			}
			else if(c == ",") {
				commasRight++;
			}
		}
		
		if(i==file.text.length) return null;
		
		return {word: word, commasLeft: commasLeft, commasRight: commasRight};
		
	}
	
	function findModuleInScope(file, word, callback) {
		if( word.indexOf(".") == -1 ) return callback(new Error("word=" + word + " does not contain a dot ."));
		
		var objectChain = word.split(".");
		
		var variableName = objectChain[0]; // foo in foo.bar
		
		var scope = UTIL.scope(file.caret.index, file.parsed.functions, file.parsed.globalVariables);
		
		console.log("autoCompleteNode: findModuleInScope: variableName=" + variableName);
		
		if(scope.variables.hasOwnProperty(variableName)) {
			if(scope.variables[variableName].value == "require") {
				
				var requireArgs = scope.variables[variableName].args;
				var moduleNameStr = requireArgs.replace("(", "").replace(")", "").replace(/'/g, "").replace(/"/g, "").trim();
				
				console.log("autoCompleteNode: findModuleInScope: variableName=" + variableName + " moduleNameStr=" + moduleNameStr);
				
				if( moduleInfoCache[moduleNameStr] ) return callback(null, moduleInfoCache[moduleNameStr]);
				
				var cwd = UTIL.getDirectoryFromPath(file.path);
				
				CLIENT.cmd("nodejsautocomplete.require", {nameStr: moduleNameStr, cwd: cwd}, function(err, resp) {
					if(err) return callback(err);
					
					moduleInfoCache[moduleNameStr] = resp;
					
					callback(null,resp);
				});
				return true;
			}
		}
		
		return callback(new Error("Did not find any variable named " + variableName + " in scope=" + JSON.stringify(scope, null, 2)));
	}
	
	function traverseChain(findStr, variables) {
		var objectChain = findStr.split(".");
		var chainStr = objectChain[0] + ".";
		var i = 1;
		
		return findin(variables);
		
		function findin(variables) {
			
			console.log("autoCompleteNode: traverseChain: findStr=" + findStr + " variables=" + JSON.stringify(  Object.keys(variables)  ) + " objectChain[" + i + "]=" + objectChain[i]);
			
			for(var name in variables) {
				if(name == objectChain[i]) {
					if(objectChain.length > i+1 && objectChain[i+1]) {
						i++;
						chainStr = chainStr + name + ".";
						console.log(  "autoCompleteNode: traverseChain: Look for chainStr=" + chainStr + " in name=" + name + " keys=" + JSON.stringify( Object.keys(variables[name].keys) ) + " i=" + i + " objectChain.length=" + objectChain.length + " objectChain[" + i + "]=" + objectChain[i] + "  " );
						return findin(variables[name].keys);
					}
					else {
						return {chainStr: chainStr, name: name, variable: variables[name]};
					}
				}
			}
			
			return null;
		}
	}
	
	function getModuleName(file, word) {
		/*
			Get the module name from foo.bar where foo = require("baz");
			
		*/
		
		if( word.indexOf(".") == -1 ) throw new Error("word=" + word + " does not contain a dot .");
		
		var objectChain = word.split(".");
		
		var variableName = objectChain[0]; // foo in foo.bar
		
		var scope = UTIL.scope(file.caret.index, file.parsed.functions, file.parsed.globalVariables);
		
		console.log("autoCompleteNode: getModuleName: variableName=" + variableName);
		
		if(scope.variables.hasOwnProperty(variableName)) {
			if(scope.variables[variableName].value == "require") {
				
				var requireArgs = scope.variables[variableName].args;
				var moduleNameStr = requireArgs.replace("(", "").replace(")", "").replace(/'/g, "").replace(/"/g, "").trim();
				
				console.log("autoCompleteNode: getModuleName: variableName=" + variableName + " moduleNameStr=" + moduleNameStr);
				
				return moduleNameStr;
			}
		}
		
		console.log("autoCompleteNode: getModuleName:  Did not find any variable named " + variableName + " in scope=" + JSON.stringify(scope, null, 2));
		return null;
	}
	
	function autoCompleteNode(file, wordToComplete, wordLength, gotOptions, callback) {
		
		console.log("autoCompleteNode: wordToComplete=" + wordToComplete);
		
		if(!file.parsed) return;
		
		// Autocomplete global Node.JS variables
		
		// Autocomplete built-in Node.JS module names if inside require() call
		
		
		// Show function parameters if inside function arguments
		var fc = insideFunctionCall(file, file.caret);
		if(fc) {
			// Find module method fc.word
			findModuleInScope(file, fc.word, function(err, moduleInfo) {
				if(err) return alertBox("Unable to find module info about " + fc.word + " Error: " + err.message);
				
				console.log("autoCompleteNode: fc=" + JSON.stringify(fc));
				
				var moduleName = getModuleName(file, fc.word)
				
				// Get real name
				var words = fc.word.split(".");
				words.shift();
				words.unshift(moduleName);
				var fName = words.join(".");
				
				console.log("autoCompleteNode: fName=" + fName + "");
				
				console.log("autoCompleteNode: moduleInfo.functions=" + JSON.stringify(moduleInfo.functions, null, 2));
				
				console.log("autoCompleteNode: moduleInfo.functions.length=" + moduleInfo.functions.length);
				
				for(var i=0; i<moduleInfo.functions.length; i++) {
					console.log("autoCompleteNode: function " + i + " name=" + moduleInfo.functions[i].name + " arguments=" + moduleInfo.functions[i].arguments);
					if(moduleInfo.functions[i].name == fName) {
						console.log("autoCompleteNode: Found fName=" + fName + " arguments=" + moduleInfo.functions[i].arguments);
					}
				}
				
				// Find variable member. eg. foo.bar.baz()
				var chain = traverseChain(fc.word, moduleInfo.variables);
				if(chain) {
					console.log("autoCompleteNode: Found " + chain.name + " method=" + chain.variable.method + " args=" + chain.variable.args);
				}
			});
		}
		
		return;
		
		// Check parsed variables from current file, check if value=="require", then check what the module returns
		var found = findModuleInScope(file, wordToComplete, function(err, moduleInfo) {
			if(err) return alertBox("Unable to get info about the " + wordToComplete + " module: Error: " + err.message);
			
			var objectChain = wordToComplete.split(".");
			
			var i = 1;
			var chainStr = objectChain[0] + ".";
			var options = [];
			
			findin(moduleInfo.variables)
			
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
						if(variables[name].method) options.push([chainStr + name + "()", 1]);
						else options.push(chainStr + name);
					}
				}
			}
			
		});
		
		if(found === true) return {async: true};
		
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