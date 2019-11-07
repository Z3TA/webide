

// ### Use the Node.JS REPL to autocomplete or show values etc

if(gotOptions.length > 0) return;

var content = [];
var textContent = file.text;
var cwd = UTIL.getDirectoryFromPath(file.path);
var allFunctions = file.parsed.functions;
var functions = allFunctions;
if(allFunctions.length > 0) {
	var f = insideFunction(allFunctions, file.caret.index, false, 0);
	if(f) {
		var textContent = file.text.slice(f.start, f.end);
		var functions = f.subFunctions;
	}
	
	for (var i=0; i<functions.length; i++) {
		if(!functions[i].lambda) content.push(file.text.slice(functions[i].start, functions[i].end))
		//textContent = textContent.replace(content[content.length-1], "");
	}
	
}

var arrText = textContent.split(file.lineBreak);
content = content.concat(arrText);

//console.log("autoCompleteNode: Feed the REPL: content=" + JSON.stringify(content, null, 2));

CLIENT.cmd("nodejsrepl.autocomplete", {before: textContent, cwd: cwd, complete: wordToComplete}, function(err, resp) {
	if(err) return alertBox(err.message);
	
	if(resp) alertBox("REPL response: " + JSON.stringify(resp));
	
});
return {async: true};



function insideFunction(functions, caretIndex, parent, charactersLength) {
	// Check if inside a function
	// Returns the function, or false
	var f, s;
	
	//console.log("insideFunction: Checking " + functions.length + " functions (parent=" + (parent && parent.name) + ") ...");
	
	for(var i=0; i<functions.length; i++) {
		f = functions[i];
		//console.log("insideFunction: f.name=" + f.name + " f.arrowFunction=" + f.arrowFunction + " f.start=" + f.start + " caretIndex=" + caretIndex + " f.end=" + f.end + " charactersLength=" + charactersLength + " ");
		if(!f.arrowFunction && f.start < caretIndex && f.end >= caretIndex) {
			// Deleted text are now allowed to be larger then the function body
			if(charactersLength > 0 || (charactersLength < 0 && (f.end-f.start) > Math.abs(charactersLength) )) {
				//console.log("insideFunction: Found function=" + f.name);
				// Check sub functions
				return insideFunction(f.subFunctions, caretIndex, f, charactersLength);
			}
		}
	}
	return parent;
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