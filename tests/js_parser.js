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
	
	
	
	