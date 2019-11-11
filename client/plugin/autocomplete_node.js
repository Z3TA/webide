(function() {
	"use strict";
	
	if(QUERY_STRING["disable_nodejsautocomplete"]) {
		console.warn("autoCompleteNode: Disabled by query string");
		return;
	}
	
	var moduleInfoCache;
	
	var builtinNodeModules = [
		"assert",
		"async_hooks",
		"buffer",
		"child_process",
		"cluster",
		"console",
		"constants",
		"crypto",
		"dgram",
		"dns",
		"domain",
		"events",
		"fs",
		"http",
		"http2",
		"https",
		"inspector",
		"module",
		"net",
		"os",
		"path",
		"perf_hooks",
		"process",
		"punycode",
		"querystring",
		"readline",
		"repl",
		"stream",
		"string_decoder",
		"timers",
		"tls",
		"trace_events",
		"tty",
		"url",
		"util",
		"v8",
		"vm",
		"zlib"
	];
	
	
	var nodeGlobalFunctions = [
		{name: "require", arguments: "moduleNameOrPathToFile", type: ["any",  "other"]},
		{name: "setImmediate", arguments: "callback, args", type: "Object"},
		
		{name: "TextDecoder", arguments: "encoding, options", type: "TextDecoder", variables: {
prototype: {
					"encoding": {type: "String"},
					"ignoreBOM": {type: "Boolen"},
					"fatal": {type: "Boolen"}
}
}},
		{name: "TextDecoder.prototype.decode", arguments: "data", type: "String"},
		{name: "TextDecoder.prototype.encode", arguments: "data", type: "uint8array"},

		
		
		{name: "URL", arguments: "input, base", type: "URL", variables: {
				prototype: {
					"hash": {type: "String"},
					"host": {type: "String"},
					"hostname": {type: "String"}
				}
		}},
	];
	
	
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
		var openParenthesis = 0;
		var openCurlyBrackets = 0;
		for(var i=caret.index-1, c; i>0; i--) {
			c = file.text[i];
			console.log("autoCompleteNode: insideFunctionCall: Searching left: i=" + i + " c=" + c + " foundLeftParenthesis=" + foundLeftParenthesis + " word=" + word + " commasLeft=" + commasLeft + " openParenthesis=" + openParenthesis);
			if(foundLeftParenthesis) {
				if(c=="}" || c=="]" || c==")" || c==";" || c=="=") {
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
				openParenthesis--;
				if(openParenthesis == -1 && openCurlyBrackets == 0 && !foundLeftParenthesis) foundLeftParenthesis = i;
			}
			else if(c == ")") {
				openParenthesis++;
			}
			else if(c =="}") {
				openCurlyBrackets++;
			}
			else if(c =="{") {
				openCurlyBrackets--;
			}
			else if(c == ",") {
				commasLeft++;
			}
		}
		
		word = word.replace(/\s/g, "").trim();
		
		console.log("autoCompleteNode: insideFunctionCall: word=" + word);
		
		if(!foundLeftParenthesis) {
			console.log("autoCompleteNode: insideFunctionCall: Returning null because foundLeftParenthesis=" + foundLeftParenthesis);
			return null;
		}
		if(!word) {
			console.log("autoCompleteNode: insideFunctionCall: Returning null because word=" + word);
			return null;
		}
		
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
		
		if(i==file.text.length) {
			console.warn("autoCompleteNode: insideFunctionCall: i=" + i + " and file.text.length=" + file.text.length + " (did not find the right parenthesis) word=" + word);
		}
		
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
				
				if( moduleInfoCache[moduleNameStr] ) {
					callback(null, moduleInfoCache[moduleNameStr]);
					return true;
				}
				
				var cwd = UTIL.getDirectoryFromPath(file.path);
				
				CLIENT.cmd("nodejsautocomplete.require", {nameStr: moduleNameStr, cwd: cwd}, function(err, resp) {
					if(err) return callback(err);
					
					moduleInfoCache[moduleNameStr] = resp;
					// Only save the cache for one second
					setTimeout(function() {
						delete moduleInfoCache[moduleNameStr];
					}, 1000);
					
					callback(null,resp);
				});
				return true;
			}
			else {
				console.log("autoCompleteNode: findModuleInScope: scope.variables[" + variableName + "].value=" + scope.variables[variableName].value + " (not require)");
			}
		}
		
		callback(new Error("Did not find any variable named " + variableName + " in scope=" + JSON.stringify(scope, null, 2)));
		return false;
	}
	
	
	
	function showArgumentHint(file, caret, argStr, argIndex) {
		var args = argStr.split(",");
		
		console.log("autoCompleteNode: showArgumentHint: args.length=" + args.length + " argIndex=" + argIndex);
		
		if(argIndex < args.length) {
			// Highlight the current parameter
			argStr = argStr.replace(args[argIndex], "<b>" + args[argIndex] + "</b>");
		}
		
		EDITOR.addInfo(caret.row, caret.col, argStr, file);
	}
	
	function autoCompleteNode(file, wordToComplete, wordLength, gotOptions, callback) {
		
		console.log("autoCompleteNode: wordToComplete=" + wordToComplete);
		
		if(!file.parsed) return;
		
		// Check global Node.JS functions
		var options = [];
		for (var i=0, match; i<nodeGlobalFunctions.length; i++) {
			match = (nodeGlobalFunctions[i].name.substr(0, wordLength) == wordToComplete);
			console.warn("autoCompleteNode: Do wordToComplete=" + wordToComplete + " match function name=" + nodeGlobalFunctions[i].name + "? " + match);
			if(match) options.push([nodeGlobalFunctions[i].name + "()", 1]);
		}
		if(options.length > 0) return options;
		
		
		// Show function parameters if inside function arguments
		var fc = insideFunctionCall(file, file.caret);
		if(fc) {
			
			console.log("autoCompleteNode: fc.word=" + fc.word);
			
			if(fc.word == "require") {
				console.log("autoCompleteNode: Inside a require call!");
				// Autocomplete built-in Node.JS module names if inside require() call
				
				var strToCompleteStartsWithQuote = wordToComplete.charAt(0);
				var strToCompleteEndsWithQuote = wordToComplete.charAt(0);
				var validQuotes = ["'", '"', "`"];
				if(validQuotes.indexOf(strToCompleteStartsWithQuote) == -1) strToCompleteStartsWithQuote = false;
				if(validQuotes.indexOf(strToCompleteEndsWithQuote) == -1) strToCompleteEndsWithQuote = false;
				
				var options = [];
				
				var moduleNameToComplete = wordToComplete;
				if(strToCompleteStartsWithQuote) moduleNameToComplete = moduleNameToComplete.replace(strToCompleteStartsWithQuote, "");
				if(strToCompleteEndsWithQuote) moduleNameToComplete = moduleNameToComplete.replace(strToCompleteEndsWithQuote, "");
				moduleNameToComplete = moduleNameToComplete.trim();
				
				var completedStrWithOrWithoutQuotes = "";
				for(var i=0; i<builtinNodeModules.length; i++) {
					if(builtinNodeModules[i].slice(0, moduleNameToComplete.length) == moduleNameToComplete) {
						completedStrWithOrWithoutQuotes = "";
						if(strToCompleteStartsWithQuote) completedStrWithOrWithoutQuotes += strToCompleteStartsWithQuote;
						completedStrWithOrWithoutQuotes += builtinNodeModules[i];
						if(strToCompleteEndsWithQuote) completedStrWithOrWithoutQuotes += strToCompleteEndsWithQuote;
						
						options.push(completedStrWithOrWithoutQuotes);
					}
				}
				
				return options;
			}
			else {
				// Find module method fc.word
				var found = findModuleInScope(file, fc.word, function(err, moduleInfo) {
					if(err) {
						console.log("autoCompleteNode: Unable to find module info about " + fc.word + " (inside function call) Error: " + err.message);
						return;
					}
					
					console.log("autoCompleteNode: fc=" + JSON.stringify(fc));
					
					// Get mehod name chain
					var words = fc.word.split(".");
					words.shift();
					words.unshift(moduleInfo.nameStr);
					var fName = words.join(".");
					
					console.log("autoCompleteNode: fName=" + fName + "");
					
					console.log("autoCompleteNode: moduleInfo.functions=" + JSON.stringify(moduleInfo.functions, null, 2));
					
					console.log("autoCompleteNode: moduleInfo.functions.length=" + moduleInfo.functions.length);
					
					for(var i=0; i<moduleInfo.functions.length; i++) {
						console.log("autoCompleteNode: function " + i + " name=" + moduleInfo.functions[i].name + " arguments=" + moduleInfo.functions[i].arguments);
						if(moduleInfo.functions[i].name == fName) {
							console.log("autoCompleteNode: Found fName=" + fName + " arguments=" + moduleInfo.functions[i].arguments);
							return showArgumentHint(file, file.caret, moduleInfo.functions[i].arguments, fc.commasLeft);
						}
					}
					
				});
				
				if(found) {
					console.log("autoCompleteNode: Not autocompleting because we are maybe showing function argument helper");
					return;
				}
			}
		}
		else {
console.log("autoCompleteNode: Not inside a function call!");
		}
		
		// Check parsed variables from current file, check if value=="require", then check what the module returns
		var found = findModuleInScope(file, wordToComplete, function(err, moduleInfo) {
			if(err) {
				console.log("autoCompleteNode: Unable to get info about the " + wordToComplete + " module: Error: " + err.message);
				return callback();
			}
			
			var objectChain = wordToComplete.split(".");
			
			var i = 1;
			var chainStr = objectChain[0] + ".";
			var options = [];
			
			findin(moduleInfo.variables)
			
			console.log("autoCompleteNode: Calling back with opptions=" + JSON.stringify(options));
			
			callback(options);
			
			function findin(variables) {
				
				console.log("autoCompleteNode: findin: variables:" + JSON.stringify(  Object.keys(variables)  ) + " objectChain[" + i + "]=" + objectChain[i]);
				
				for(var name in variables) {
					if(objectChain[i] == "") {
						options.push(chainStr + name);
					}
					else if(name == objectChain[i] && objectChain.length > i+1 && objectChain[i+1]) {
						i++;
						chainStr = chainStr + name + ".";
						return findin(variables[name].keys);
					}
					else if(name.slice(0, objectChain[i].length) == objectChain[i]) {
						// Autocomplete the name
						if(variables[name].method) options.push([chainStr + name + "()", 1]);
						else options.push(chainStr + name);
					}
				}
			}
			
		});
		if(found === true) {
			return {async: true};
		}
		
		
	}
	
	EDITOR.addTest(1, function autocomplete_node_modules(callback) {
		EDITOR.openFile("autocomplete_node.js", 'var http = re\n', function(err, file) {
			var atCaret = autoComplete(file, 13);
			UTIL.assert(file.rowText(0), "var http = require()");
			
			file.insertText('"h');
			var atCaret = autoComplete(file, 21);
			UTIL.assert(file.rowText(0), 'var http = require("http)');
			
			file.insertText('"');
			file.moveCaretRight();
			file.insertText(';');
			file.insertLineBreak();
			file.insertText("http.cre");
			// Make sure it can find the right method once patched
			var atCaret = autoComplete(file, 36);
			// note: This is async!
			setTimeout(function() {
				UTIL.assert(file.rowText(1), 'http.createServer()');
				
				EDITOR.closeFile(file);
				callback(true);
			}, 300);
			
		});
		
		function autoComplete(file, index) {
			
			var key_tab = 9;
			var wordDelimiters = " \t\r\n;:()"
			
			file.moveCaretToIndex(index);
			EDITOR.showFile(file);
			EDITOR.mock("keydown", {charCode: key_tab}); // tab to autocomplete
			
			return file.wordAtCaret(file.caret, wordDelimiters);
		}
	});
	
	
})();