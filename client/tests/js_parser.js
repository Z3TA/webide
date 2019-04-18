

EDITOR.addTest(1, function variableDeclarationInsideForLoop(callback) {
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
			if(variable != "b") throw new Error("Unexpected variable: " + variable + " type=" + file.parsed.functions[0].variables[variable].type);
		}
		
		
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