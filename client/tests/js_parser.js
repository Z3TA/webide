
EDITOR.addTest(function dontPanicWhenReturningVoid(callback) {
	EDITOR.openFile("dontPanicWhenReturningVoid.js", '{\nreturn;\n}\n', function(err, file) {
		
		// bug: Will throw an error: Cannot read property 'returns' of undefined
		// Only when returning void, outside of a function.
		
		EDITOR.closeFile(file.path);
		
		callback(true);
	});
});

EDITOR.addTest(function findReturnedObjectLiteral(callback) {
	EDITOR.openFile("findReturnedObjectLiteral.js", 'function foo() {\nreturn {banana: 1, apple: 2}\n}\n', function(err, file) {
		
		if(!file.parsed.functions[0].returns[0].keys["banana"]) throw new Error("Expected foo to return an object literal with property banana! file.parsed.functions[0]=" + JSON.stringify(file.parsed.functions[0], null, 2));
		EDITOR.closeFile(file.path);
		
		callback(true);
	});
});

EDITOR.addTest(function monkeyPatchGlobalVariable(callback) {
	EDITOR.openFile("monkeyPatchGlobalVariable.js", 'var global = {};\n(function() {\nif(monkey==banana) global.foo = 1\n})();\n', function(err, file) {
		if(!file.parsed.globalVariables["global"].keys["foo"]) throw new Error("Expected global.foo! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function findObjects(callback) {
	EDITOR.openFile("findObjects.js", 'var foo = {};\nvar bar = {\n// Tralala\n}\nvar baz={};\nbaz.key = {}\n(function() {\nvar local = {};\nglobalVar = {};\nif(foo==bar) otherGlobal = {}\n})();\n', function(err, file) {
		if(file.parsed.globalVariables["foo"].type != "Object") throw new Error("Expected type of foo to be Object! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["bar"].type != "Object") throw new Error("Expected type of bar to be Object! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["globalVar"].type != "Object") throw new Error("Expected type of globalVar to be Object! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["otherGlobal"].type != "Object") throw new Error("Expected type of otherGlobal to be Object! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.functions[0].variables["local"].type != "Object") throw new Error("Expected type of local variable to be Object! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function namedFunctionInAnonymousObject(callback) {
	EDITOR.openFile("namedFunctionInAnonymousObject.js", '{\nfoo: function bar() {}\n}\n', function(err, file) {
		
		if(file.parsed.functions.length != 1) throw new Error("Expected one function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		
		if(file.parsed.functions[0].name != "bar") throw new Error("Expected function name to be bar! file.parsed.functions[0]=" + JSON.stringify(file.parsed.functions[0], null, 2));
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function noReParseOptShouldUpdateFunctions(callback) {
	EDITOR.openFile("noReParseOptShouldUpdateFunctions.js", 'function foo() {\naa\n}\n', function(err, file) {
		if(file.parsed.functions.length != 1) throw new Error("Expected one function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		
		if(file.parsed.functions[0].end != 20) throw new Error("Expected function to end at index 20 file.parsed.functions[0]=" + JSON.stringify(file.parsed.functions[0], null, 2));
		
		file.moveCaret(undefined, 1, 2);
		//file.moveCaretToEndOfLine();
		var BACKSPACE = 8;
		EDITOR.mock("keydown", {charCode: BACKSPACE, target: "canvas"}); // Simulate pressing backspace
		
		if(file.parsed.functions[0].end != 19) throw new Error("Expected function to end at index 19 file.parsed.functions[0]=" + JSON.stringify(file.parsed.functions[0], null, 2));
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function globalVariableMemberPointingToFunction(callback) {
	EDITOR.openFile("globalVariableMemberPointingToFunction.js", 'var foo = {};\n(function() {\nfoo.bar = function() {}\n})();\n', function(err, file) {
		if(file.parsed.functions[0].subFunctions[0].name != "foo.bar" || !file.parsed.functions[0].subFunctions[0].global) throw new Error("Expected foo.bar to be a global function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function globalVariablePointingToFunction(callback) {
	EDITOR.openFile("globalVariablePointingToFunction.js", 'var glob;\n(function() {\nglob = function Glob() {}\n})();\n', function(err, file) {
		if(file.parsed.functions[0].subFunctions[0].name != "glob" || !file.parsed.functions[0].subFunctions[0].global) throw new Error("Expected glob to be a global function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function globalVariableFalsePositive(callback) {
	EDITOR.openFile("globalVariableFalsePositive.js", 'html = html.replace(/</g, "&lt;");\nhtml = html.replace(/>/g, "&gt;");\n', function(err, file) {
		if(!file.parsed.globalVariables["html"]) throw new Error("Expected global variable html! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(Object.keys(file.parsed.globalVariables).length != 1) throw new Error("Expected only one global variable! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function findFullNameOfNamedFunctionAfterPointer(callback) {
	EDITOR.openFile("findFullNameOfNamedFunctionAfterPointer.js", "var obj = {\nbanana: function nameoffunction() {}\n}\n", function(err, file) {
		if(file.parsed.functions[0].name != "obj.banana") throw new Error("Expected function name to be obj.banana! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(!file.parsed.globalVariables["obj"]) throw new Error("Expected global variable obj! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(!file.parsed.globalVariables["obj"].keys["banana"]) throw new Error("Expected global variable obj to have a banana key! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(!file.parsed.globalVariables["obj"].keys["banana"].method) throw new Error("Expected global variable obj.banana to be a method! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function findThisVariables(callback) {
	EDITOR.openFile("findThisVariables.js", "function Person(parname) {\nthis.personname=parname;\n}", function(err, file) {
		if(file.parsed.functions[0].name != "Person") throw new Error("Expected first functions name to be Person! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(!file.parsed.functions[0].variables["this"]) throw new Error("Expected function to have a \"this\" variable! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(!file.parsed.functions[0].variables["this"].keys["personname"]) throw new Error("Expected function to have a \"this\" variable with key personname! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function markLamdaFunctions(callback) {
	EDITOR.openFile("markLamdaFunctions.js", "(function() {\nfunction notLamnda() {\nfunction subFunction() {\n}\n}\nfoo(function mylamdafunction() {\n});\n})();\n", function(err, file) {
		if(!file.parsed.functions[0].lambda) throw new Error("Expected first function to be a lambda function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(file.parsed.functions[0].subFunctions[0].lambda) throw new Error("First subfunctions should not be a lamda function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(!file.parsed.functions[0].subFunctions[1].lambda) throw new Error("Second subfunctions should be a lamda function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(file.parsed.functions[0].subFunctions[0].subFunctions[0].lambda) throw new Error("Subfunction of first subfunctions should Not be a lamda function! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function argumentIsNotGlobalVariable(callback) {
	EDITOR.openFile("argumentIsNotGlobalVariable.js", "function foo(bar) {\nbar=1;\n}\n", function(err, file) {
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected function foo! file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(file.parsed.globalVariables["bar"]) throw new Error("Unexpected global variable bar (it's in function parameters) file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function findObjectPropertiesAndMethods(callback) {
	EDITOR.openFile("findObjectPropertiesAndMethods.js", "var foo = {\nbar: 1,\nbaz: function() {}\n}\n", function(err, file) {
		if(file.parsed.functions[0].name != "foo.baz") throw new Error("Expected first function to be named foo.baz: file.parsed.functions=" + JSON.stringify(file.parsed.functions, null, 2));
		if(file.parsed.globalVariables["foo"] == undefined) throw new Error("Expected global variable foo! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["foo"].keys["bar"] == undefined) throw new Error("Expect property bar! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		//if(file.parsed.globalVariables["foo"].keys["baz"] == undefined) throw new Error("Expect method baz! file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function findPrototype(callback) {
	EDITOR.openFile("findPrototype.js", "function Foo() {}\nFoo.prototype.bar = function() {}\n", function(err, file) {
		if(file.parsed.functions[1].name != "Foo.prototype.bar") throw new Error("Expected Foo.prototype.bar: file.parsed=" + JSON.stringify(file.parsed, null, 2));
if(file.parsed.functions[0].prototype["bar"] == undefined) throw new Error("Expected prototype bar: file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function variableDeclarationAfterIf(callback) {
	EDITOR.openFile("variableDeclarationAfterIf.js", "if(1==2) var global1 = 1;\nelse {\nvar global2=2;\nglobal3=3 // no semicolon!\n}\nfunction foo() {\nif(1==2) var local1=11;\nelse {\nvar local2=22;\nglobal4=4\n}\n}\n", function(err, file) {
		if(file.parsed.globalVariables["global1"] == undefined) throw new Error("Expect global variable global1 file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["global2"] == undefined) throw new Error("Expect global variable global2 file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["global3"] == undefined) throw new Error("Expect global variable global3 file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected function name to be foo, not " + file.parsed.functions[0].name + " file.parsed=" + JSON.stringify(file.parsed, null, 2));
		
		if(file.parsed.functions[0].variables["local1"] == undefined) throw new Error("Expected local variable local1: file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(file.parsed.functions[0].variables["local2"] == undefined) throw new Error("Expected local variable local2: file.parsed=" + JSON.stringify(file.parsed, null, 2));
		if(file.parsed.globalVariables["global4"] == undefined) throw new Error("Expect global variable global4 file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function variableDeclarationInsideForLoop(callback) {
	EDITOR.openFile("variableDeclarationInsideForLoop.js", "for(var index=0; index<3; index++) {}\nfunction myFunction() {\nfor(i=0; i<3; i++)\nfor(var j=0; j<3; j++)\n}\n", function(err, file) {
		if(file.parsed.globalVariables["index"] == undefined) throw new Error("Expect global variable index file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.globalVariables["i"] == undefined) throw new Error("Expect global variable i file.parsed.globalVariables=" + JSON.stringify(file.parsed.globalVariables, null, 2));
		if(file.parsed.functions[0].variables["j"] == undefined) throw new Error("Expected local variable j: file.parsed=" + JSON.stringify(file.parsed, null, 2));
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function slashInRegexBracket(callback) {
	EDITOR.openFile("slashInRegexBracket.js", "foo.replace(/[/][*][^/*]*[*][/]/g), ''); // strip multi-line comments", function(err, file) {
		
		if(file.parsed.comments.length != 1) throw new Error("Expect 1 JavaScript comment, but found " + file.parsed.comments.length);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(function singleQuoteInDoubleQuoteHtml(callback) {
	EDITOR.openFile("singleQuoteInDoubleQuote.htm", '<html>\n<button onClick="foo.innerHTML = \'<br>\';">\n<br>\n</html>', function(err, file) {
		
		//console.log(file.parsed.xmlTags);
		if(file.parsed.xmlTags.length != 4) throw new Error("Expect 4 HTML tags, but found " + file.parsed.xmlTags.length);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(function singleDblQuoteHtml(callback) {
	EDITOR.openFile("singleDblQuoteHtml", '<!DOCTYPE html>\n<html>\n<body>\n<script>\nvar foo = \'<span class="foo"></span>\';\n</script>\n<div id="foo">\n\n</div>\n</body>\n</html>\n', function(err, file) {
		
		if(file.grid[7].indentation != 1) throw new Error("Expected indentation on line 8 to be 1, not " + file.grid[1].indentation);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(function arrowInIf(callback) {
	EDITOR.openFile("arrowInIf.js", 'if((foo) == "<") {\n\n}\n', function(err, file) {
		
		if(file.grid[1].indentation != 1) throw new Error("Expected indentation on line 2 to be 1, not " + file.grid[1].indentation);
		
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
});

EDITOR.addTest(function cantFindFunctionStart(callback) {
	EDITOR.openFile("cantFindFunctionStart.js", 'console.log = function() {\nlog("123");\n}\n\nconsole.warn = function() {\nlog("abc");\n}\n\nvar foo = {\nbar: {\nlog: function () {\n\n}\n}\n}\n', function(err, file) {
		
		file.moveCaret(undefined, 11);
		EDITOR.mock("keydown", {charCode: 65, target: "canvas"}); // Simulate entering a character. 65 = A
		
		// Uncaught Error: Grid row=18 does not exist!
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(function callbackFunctionSpaceBeforeParentheses(callback) {
	EDITOR.openFile("callbackFunctionSpaceBeforeParentheses.js", 'foo(function () {\n\n})\n', function(err, file) {
		
		file.moveCaret(undefined, 1);
		EDITOR.mock("keydown", {charCode: 65, target: "canvas"}); // Simulate entering a character. 65 = A
		
		// Uncaught Error: Unable to find start of function=** f.start=17 parseStart=-1 oo(function ()
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(function spaceAfterFunctionName(callback) {
	EDITOR.openFile("spaceAfterFunctionName.js", 'function foo () {\n\n}\n', function(err, file) {
		
		file.moveCaret(undefined, 1);
		EDITOR.mock("keydown", {charCode: 65, target: "canvas"}); // Simulate entering a character. 65 = A
		
		// Uncaught Error: Unable to find start of function=*foo* f.start=16 parseStart=-1 unction foo () 
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
})

EDITOR.addTest(function optFunOnlySameName(callback) {
	EDITOR.openFile("optFunOnlySameName.js", 'var a = {\nxxx: function xxxSomething() {\n\n}\n};\n\nvar b = {\nxxx: function foo() {\n\n}\n};\n', function(err, file) {
		
		file.moveCaret(undefined, 8);
		EDITOR.mock("keydown", {charCode: 65, target: "canvas"}); // Simulate entering a character. 65 = A
		
		// Uncaught Error: Grid row=12 does not exist!
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});


EDITOR.addTest(function htmlTagInString(callback) {
	EDITOR.openFile("htmlTagInString.js", '// foo\nvar bar = "<html>"', function(err, file) {
		
		if(file.parsed.comments.length != 1) throw new Error("Expected one comment")
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});


EDITOR.addTest(function xmlUnlosedTagColorWeirdness(callback) {
	EDITOR.openFile("xmlUnlosedTagColorWeirdness.js", "'<h1>foo</h1 '\n'<h2>bar</h2>'", function(err, file) {
		
		var quotes = file.parsed.quotes;
		
		if(!(quotes[0].start == 0 && quotes[0].end == 13)) throw new Error("Expected first quote to start=0=" + quotes[0].start + " and end=13=" + quotes[0].end);
		
		if(!(quotes[1].start == 15 && quotes[1].end == 28)) throw new Error("Expected first quote to start=15=" + quotes[0].start + " and end=28=" + quotes[0].end);


		var xmlTags = file.parsed.xmlTags;
		
		if(!(xmlTags[0].start == 1 && xmlTags[0].end == 4)) throw new Error("Expected first xml tag to start=1=" + xmlTags[0].start + " and end=4=" + xmlTags[0].end);

		if(!(xmlTags[1].start == 16 && xmlTags[1].end == 19)) throw new Error("Expected second xml tag to start=16=" + xmlTags[1].start + " and end=19=" + xmlTags[1].end);
		
		if(!(xmlTags[2].start == 23 && xmlTags[2].end == 27)) throw new Error("Expected third xml tag to start=23=" + xmlTags[2].start + " and end=27=" + xmlTags[2].end);
		
		if(xmlTags[0].wordLength != 3) throw new Error("Unexpected wordLength=" + xmlTags[0].wordLength);
		if(xmlTags[1].wordLength != 3) throw new Error("Unexpected wordLength=" + xmlTags[1].wordLength);
		if(xmlTags[2].wordLength != 4) throw new Error("Unexpected wordLength=" + xmlTags[2].wordLength);
		
		// Run prerenders to see the colors
		var buffer = file.grid;
		for(var i=0; i<EDITOR.preRenderFunctions.length; i++) {
			//funName = UTIL.getFunctionName(EDITOR.preRenderFunctions[i]);
			//console.time("prerender: " + funName);
			buffer = EDITOR.preRenderFunctions[i](buffer, file); // Call render
			//console.timeEnd("prerender: " + funName);
		}
		
		var quoteColor = buffer[0][0].color;
		
		if(buffer[1][5].color != quoteColor) throw new Error("Expected letter " + buffer[1][5].char + " on line 2 to have color " + quoteColor + " not " + buffer[1][5].color);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(function templateLiterals(callback) {
	EDITOR.openFile("templateLiterals.js", 'var strTest = `string text ${expression} string text`\nvar strTopic = `<h1>Topic</h1>`', function(err, file) {
		
		if(file.parsed.quotes.length != 2) throw new Error("Did not find all template literals");
		
		file.reload('{\n`<div>Hello</div>`;\n}\n');
		
		UTIL.assert(file.grid[2].indentation, 0);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});


EDITOR.addTest(function arrowFunctionBeforeFunction(callback) {
	// Parser can't find start of baz
	EDITOR.openFile("arrowFunctionBeforeFunction.js", 'foo = bar => baz\nfunction test() {\n\n}\n', function(err, file) {
		
		if(file.parsed.functions.length != 2) throw new Error("Expected two functions!");
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected function name to be foo, not " + file.parsed.functions[0].name);
		
		if(file.parsed.functions[1].name != "test") throw new Error("Expected function name to be test, not " + file.parsed.functions[1].name);

		
		file.moveCaret(undefined, 2);
		EDITOR.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
		// Uncaught Error: Unable to find start of function
		// because it thinks "foo = bar" is the function name
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});


EDITOR.addTest(function arrowFunctionsSubfunction(callback) {
	EDITOR.openFile("arrowFunctionsSubfunction.js", 'var foo = xxx => yyy => 42 // A function that returns a function that returns 42: ex: foo()() == 42', function(err, file) {
		
		// We will intentially not bother keeping track of subfunctions in subfunctions, just flatten all arrow functions to closest scope for now
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected function name=foo, not name=" + file.parsed.functions[0].name);
		if(file.parsed.functions[0].arguments != "xxx") throw new Error("Expected arrow function arguments to be xxx, not arguments=" + file.parsed.functions[0].arguments);
		
		if(file.parsed.functions[1].name != "") throw new Error("Expected anonymous function, not name=" + file.parsed.functions[1].name);
		if(file.parsed.functions[1].arguments != "yyy") throw new Error("Expected arrow function arguments to be yyy, not arguments=" + file.parsed.functions[1].arguments);


		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});


EDITOR.addTest(function arrowFunctions(callback) {
	EDITOR.openFile("arrowFunctions.js", 'some(someArgument, arrowFunctionArgument => returnStatement)\nanother(arrowFunctionArgument => returnStatement)\nvar foo = (a, b) => a + b\nvar bar = x => ++x\narr.map(n => n-1)\n', function(err, file) {
		
		if(file.parsed.functions[0].name != "") throw new Error("Expected anonymous function, not " + file.parsed.functions[0].name);
		if(file.parsed.functions[0].arguments != "arrowFunctionArgument") throw new Error("Expected arrow function arguments to be arrowFunctionArgument, not " + file.parsed.functions[1].arguments);
		
		if(file.parsed.functions[1].name != "") throw new Error("Expected anonymous function, not " + file.parsed.functions[1].name);
		if(file.parsed.functions[1].arguments != "arrowFunctionArgument") throw new Error("Expected arrow function arguments to be arrowFunctionArgument, not " + file.parsed.functions[1].arguments);
		
		if(file.parsed.functions[2].name != "foo") throw new Error("Expected function name to be foo, not " + file.parsed.functions[2].name);
		
		if(file.parsed.functions[3].name != "bar") throw new Error("Expected function name to be bar, not " + file.parsed.functions[3].name);
		
		if(file.parsed.functions[4].name != "") throw new Error("Expected anonymous function on line 5, not name=" + file.parsed.functions[4].name);

		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});



EDITOR.addTest(function varPointAtAnonFunction(callback) {
	EDITOR.openFile("varPointAtAnonFunction.js", 'var foo = function() {};', function(err, file) {
		
		// This is actually variable (foo) pointing to an anonymous function!!
		// writing foo() will call the nonymous function though. 
		// So for convenience we will give it the same name as the variable pointing to it
		
		// We don't however want "var" "let" etc included in the function name!
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected function name to be foo, not " + file.parsed.functions[0].name);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});


	EDITOR.addTest(function functionVariableWidthSubfunction(callback) {
	EDITOR.openFile("functionVariableWidthSubfunction.js", 'foo = function() {\nfunction bar() {\na\n}\n}', function(err, file) {
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected first function name to be foo, not " + file.parsed.functions[0].name);
		if(file.parsed.functions[0].subFunctions[0].name != "bar") throw new Error("Expected sub-function name to be bar, not " + file.parsed.functions[0].subFunctions[0].name);
		
		file.moveCaret(undefined, 2, 1);
		
		file.putCharacter("b");
		
		if(file.parsed.functions[0].subFunctions[0].subFunctions.length != 0) throw new Error("Did not expect a second subfunction: " + file.parsed.functions[0].subFunctions[0].subFunctions[0].name);
		if(file.grid[3].indentation != 1) throw new Error("Expected indentation on line 4 to be 1, not " + file.grid[3].indentation);
		if(file.grid[4].indentation != 0) throw new Error("Expected indentation on line 5 to be 0, not " + file.grid[4].indentation);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

	EDITOR.addTest(function aspVarInScript(callback) {
	// Parser can't find start of baz
	EDITOR.openFile("aspVarInScript.asp", '<%\nIF foo THEN\n%>\n<script>\nalert("Hi <% =name %>");\n</script>\n<%\nEND IF\n%>\n', function(err, file) {
	
	// Last row should have zero indentation
	if(file.grid[file.grid.length-1].indentation !== 0) throw new Error("Wrong indentation on last row!");
	
	EDITOR.closeFile(file.path);
	callback(true);
	
	});
	});
	
	EDITOR.addTest(function aspVarInHtml(callback) {
	EDITOR.openFile("aspVarInHtml.asp", '<img src="<% =foo %>">', function(err, file) {
	
	// Temp fix! Best case scenario would be if the xml tag worked
	
	if(file.parsed.xmlTags.length > 0) throw new Error("Did not expect an xml tag");
	
	EDITOR.closeFile(file.path);
	callback(true);
	
	});
	});
	
	EDITOR.addTest(function funInJson(callback) {
	// Parser can't find start of baz
	EDITOR.openFile("funInJson.js", 'foo({\nbar: "123",\nbaz: function() {\n\n}\n});\n', function(err, file) {
	
	file.moveCaret(undefined, 3);
	EDITOR.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
	// Uncaught Error: Unable to find start of function=baz parseStart=-1 (when in dev mode)
	
	//console.log(file.parsed);
	
	EDITOR.closeFile(file.path);
	callback(true);
	
	});
	});
	
	
	EDITOR.addTest(function funInHtmlDoc(callback) {
	// The parser optimizer is unable to find foo() when only parsing foo
	EDITOR.openFile("funInHtmlDoc.htm", '<!DOCTYPE html>\n<script>\nfunction foo() {\n\n}\n</script>\n', function(err, file) {
	
	file.moveCaret(undefined, 3);
	EDITOR.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
	// Might throw Error: Uncaught Error: Parsed code contains no function! 
	
	//console.log(file.parsed);
	
	EDITOR.closeFile(file.path);
	callback(true);
	
	});
	});
	
EDITOR.addTest(function cantFindFunctionWithAngelbracketsBelow(callback) {
	EDITOR.openFile("cantFindFunctionWithAngelbracketsBelow.js", 'function f()\n{\n\n}\n', function(err, file) {
		
		file.moveCaret(undefined, 2);
		EDITOR.mock("keydown", {charCode: 65, target: "canvas"}); // Simulate entering a character. 65 = A
		
		// Uncaught Error: Unable to find start of function=*f* 
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});
	
EDITOR.addTest(function singleStatementContext(callback) {
	EDITOR.openFile("singleStatementContext.js", 
	'if(1==2)\nconsole.log("1");\n' + 
	'if(1==2)\n{\nconsole.log("2")\n}\n' + 
	'if(1==2) // comment\nconsole.log("3");\n' +
'if(1==2) {\nconsole.log("4");\n}\n' +
	'if(1==2) console.log("5");\nelse console.log("5.5")', function(err, file) {
		
		// 1. Single statement contexts should be indented!
		ind(0, 0);
		ind(1, 1);
		ind(2, 0);
		
		// 2. Don't indentate the { after if
		ind(3, 0);
		ind(4, 1);
		ind(5, 0);
		
		// 3. We have a comment
		ind(6, 0);
		ind(7, 1);
		
		// 4. Angel brackets should not give double indentation
		ind(8, 0);
		ind(9, 1);
		ind(10, 0);
		
		// 5. hmm
		ind(11, 0);
		ind(12, 0);
		
		EDITOR.closeFile(file.path);
		callback(true);
		
		function ind(row, val) {
			if(file.grid[row].indentation != val) throw new Error("Expected file.grid[" + row + "].indentation=" + file.grid[row].indentation + " (line " + (row+1) + ") to be " + val);
		}
		
	});
});


EDITOR.addTest(function nameOfArrowFunction(callback) {
	EDITOR.openFile("nameOfArrowFunction.js", 'window.onload = function() {\n' +
	'for (var i=0; i<4; i++) {\n' +
	'var b = document.createElement("button");\n' +
	'b.onclick = e => alert(i);\n'+
	'body.appendChild(b);\n' +
	'}\n' +
	'}\n', function(err, file) {
		
		// Will crash right away: Uncaught TypeError: Cannot read property 'variables' of undefined
		
		// Also make sure we get the proper name (function name was "b.onclick = e")
		console.log("Functions: " + JSON.stringify(file.parsed.functions, null, 2));
		
		UTIL.assert(file.parsed.functions[0].name, "window.onload");
		UTIL.assert(file.parsed.functions[0].subFunctions[0].name, "b.onclick");
		
		// Make sure the arguments are current (argument was i)
		UTIL.assert(file.parsed.functions[0].subFunctions[0].arguments, "e");
		
		
		file.moveCaret(0, 6);
		EDITOR.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
		// Uncaught Error: Expected func.name=b.onclick start=113 character=> to be a {
		
		// Variable b should by type Element
		UTIL.assert(file.parsed.functions[0].variables["b"].type, "Element");
		
		// There should be no ("button") variable
		for(var variable in file.parsed.functions[0].variables) {
			if(!(variable=="b" || variable=="i" ) ) throw new Error("Unexpected variable: " + variable + " type=" + file.parsed.functions[0].variables[variable].type);
		}
		
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
});

EDITOR.addTest(2, function JSX1(callback) {

		EDITOR.openFile("jsx1.js", 'function foo(bar) {\nreturn <h1>Hello {bar}</h1>\n}\n<Foo bar={baz}>\nhi\n</Foo>\nif(a<b && c>d) {}\nif(a <b) {\n}\nelse if(a >b) {\n}\n', function(err, file) {
				
		if(file.parsed.xmlTags.length != 4) throw new Error("Expected 3 XML tags! file.parsed.xmlTags.length=" + file.parsed.xmlTags.length);
		
		UTIL.assert(file.grid[1].indentation, 1);
				
		UTIL.assert(file.grid[4].indentation, 1);
		
				
				EDITOR.closeFile(file.path);
				callback(true);
				
			});
			
		});

EDITOR.addTest(function JSX2(callback) {
	EDITOR.openFile("jsx2.htm", '<!DOCTYPE html>\n<script></script>\n<script></script>\n<script></script>\n', function(err, file) {
		
		UTIL.assert(file.parsed.xmlTags.length, 7);
		
		UTIL.assert(file.grid[1].indentation, 0);
		UTIL.assert(file.grid[2].indentation, 0);
		UTIL.assert(file.grid[3].indentation, 0);
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(2, function JSX3(callback) {
	EDITOR.openFile("jsx3.js", '{\nif(a.order < b.order) {\nreturn -1;\n}\nelse if(a.order > b.order) {\nreturn 1;\n}\nvar data = \'<svg xmlns="http://www.w3.org/2000/svg" width="\' + width + \'" height="\' + height + \'">\';\n//foo\n}\n', function(err, file) {
		
		UTIL.assert(file.parsed.xmlTags.length, 1); // Should be an xml tag, not an JSX tag
		
		UTIL.assert(file.grid[8].indentation, 1);
		UTIL.assert(file.grid[9].indentation, 0);
		UTIL.assert(file.grid[10].indentation, 0);
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function JSX4(callback) {
	EDITOR.openFile("jsx3.js", '{\nwhile(a <b) {\n}\nvar n = [ ".", "<", ">", ";"];\n// hmm\n}\n', function(err, file) {
		
		UTIL.assert(file.parsed.xmlTags.length, 0);
		
		UTIL.assert(file.grid[4].indentation, 1);
		UTIL.assert(file.grid[5].indentation, 0);
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(2, function JSX5(callback) {
			EDITOR.openFile("jsx5.js", 'var reScripts = /<script.*src="(.*)"><\/script>/g;\n// meh\n', function(err, file) {
					
					UTIL.assert(file.parsed.xmlTags.length, 0);
					
					UTIL.assert(file.grid[0].indentation, 0);
					
					EDITOR.closeFile(file.path);
					callback(true);
				});
		});
			
EDITOR.addTest(function JSX6(callback) {
				EDITOR.openFile("jsx6.js", '(\' <   \'>\')\n(\' <b   "> \')\n(\' <\/script>\')\n', function(err, file) {
						
						UTIL.assert(file.grid[0].indentation, 0);
						UTIL.assert(file.grid[1].indentation, 0);
						UTIL.assert(file.grid[2].indentation, 0);
						UTIL.assert(file.grid[3].indentation, 0);
						
						EDITOR.closeFile(file.path);
						callback(true);
					});
				});
		
EDITOR.addTest(function constVar(callback) {
	EDITOR.openFile("constVar.js", 'const foo = 1;\nlet bar = 2;\n', function(err, file) {
		
		if(!file.parsed.globalVariables.hasOwnProperty("foo")) throw new Error("Did not find variable foo declared with const! file.parsed.globalVariables=", file.parsed.globalVariables);
		if(!file.parsed.globalVariables.hasOwnProperty("bar")) throw new Error("Did not find variable bar declared with let! file.parsed.globalVariables=", file.parsed.globalVariables);
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

EDITOR.addTest(function asyncFunction(callback) {
	EDITOR.openFile("asyncFunction.js", 'async function foo() {\n}\n', function(err, file) {
		
		if(file.parsed.functions.length != 1 || file.parsed.functions[0].name != "foo") throw new Error("Expected function foo! file.parsed=", file.parsed);
		
		EDITOR.closeFile(file.path);
		callback(true);
	});
});

/*
	
	### parentheses Indenting
	Opinioned opinion: There should not be line breaks inside parentheses
	
	Reasons to have line breaks in parentheses:
	* Doesn't fit arbitrary line length? (Then you probably don't want to add extra indentation !?)
	
	
	EDITOR.addTest(1, function parenthesesIndenting(callback) {
	EDITOR.openFile("parenthesesIndenting.js", 'console.log("foo" +\n' +
	'"bar" + \n' +
	'"baz");\n' +
	'\n' + 
	'console.log(\n'+
	'"cat"\n' +
	'"dog"\n' +
	'"fish"\n'
	');', function(err, file) {
	
	EDITOR.closeFile(file.path);
	callback(true);
	
	});
	});
*/