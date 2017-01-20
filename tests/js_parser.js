/*
	editor.addTest(function arrowFunctionBeforeFunction(callback) {
	// Parser can't find start of baz
	editor.openFile("arrowFunctionBeforeFunction.js", 'foo = bar => baz\nfunction test() {\n\n}', function(err, file) {
	
	file.moveCaret(undefined, 2);
	editor.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
	// Uncaught Error: Unable to find start of function
	// because it thinks "foo = bar" is the function name
	
	editor.closeFile(file.path);
	callback(true);
	
	});
	}, 1);
	
*/


	editor.addTest(function varPointAtAnonFunction(callback) {
	editor.openFile("varPointAtAnonFunction.js", 'var foo = function() {};', function(err, file) {
		
		// This is actually variable (foo) pointing to an anonymous function!!
		// writing foo() will call the nonymous function though. 
		// So for convenience we will give it the same name as the variable pointing to it
		
		// We don't however want "var" "let" etc included in the function name!
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected function name to be foo, not " + file.parsed.functions[0].name);
		
		editor.closeFile(file.path);
		callback(true);
		
	});
}, 1);



	editor.addTest(function functionVariableWidthSubfunction(callback) {
	editor.openFile("functionVariableWidthSubfunction.js", 'foo = function() {\nfunction bar() {\na\n}\n}', function(err, file) {
		
		if(file.parsed.functions[0].name != "foo") throw new Error("Expected first function name to be foo, not " + file.parsed.functions[0].name);
		if(file.parsed.functions[0].subFunctions[0].name != "bar") throw new Error("Expected sub-function name to be bar, not " + file.parsed.functions[0].subFunctions[0].name);
		
		file.moveCaret(undefined, 2, 1);
		
		file.putCharacter("b");
		
		if(file.parsed.functions[0].subFunctions[0].subFunctions.length != 0) throw new Error("Did not expect a second subfunction: " + file.parsed.functions[0].subFunctions[0].subFunctions[0].name);
		if(file.grid[3].indentation != 1) throw new Error("Expected indentation on line 4 to be 1, not " + file.grid[3].indentation);
		if(file.grid[4].indentation != 0) throw new Error("Expected indentation on line 5 to be 0, not " + file.grid[4].indentation);
		
		editor.closeFile(file.path);
		callback(true);
		
	});
});

	editor.addTest(function aspVarInScript(callback) {
	// Parser can't find start of baz
	editor.openFile("aspVarInScript.asp", '<%\nIF foo THEN\n%>\n<script>\nalert("Hi <% =name %>");\n</script>\n<%\nEND IF\n%>\n', function(err, file) {
	
	// Last row should have zero indentation
	if(file.grid[file.grid.length-1].indentation !== 0) throw new Error("Wrong indentation on last row!");
	
	editor.closeFile(file.path);
	callback(true);
	
	});
	});
	
	editor.addTest(function aspVarInHtml(callback) {
	editor.openFile("aspVarInHtml.asp", '<img src="<% =foo %>">', function(err, file) {
	
	// Temp fix! Best case scenario would be if the xml tag worked
	
	if(file.parsed.xmlTags.length > 0) throw new Error("Did not expect an xml tag");
	
	editor.closeFile(file.path);
	callback(true);
	
	});
	});
	
	editor.addTest(function funInJson(callback) {
	// Parser can't find start of baz
	editor.openFile("funInJson.js", 'foo({\nbar: "123",\nbaz: function() {\n\n}\n});\n', function(err, file) {
	
	file.moveCaret(undefined, 3);
	editor.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
	// Uncaught Error: Unable to find start of function=baz parseStart=-1 (when in dev mode)
	
	//console.log(file.parsed);
	
	editor.closeFile(file.path);
	callback(true);
	
	});
	});
	
	
	editor.addTest(function funInHtmlDoc(callback) {
	// The parser optimizer is unable to find foo() when only parsing foo
	editor.openFile("funInHtmlDoc.htm", '<!DOCTYPE html>\n<script>\nfunction foo() {\n\n}\n</script>\n', function(err, file) {
	
	file.moveCaret(undefined, 3);
	editor.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
	// Might throw Error: Uncaught Error: Parsed code contains no function! 
	
	//console.log(file.parsed);
	
	editor.closeFile(file.path);
	callback(true);
	
	});
	});
	
	
	
	
