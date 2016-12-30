
editor.addTest(function aspVarInHtml(callback) {
	// Parser can't find start of baz
	editor.openFile("aspVarInHtml.asp", '<img src="<% =foo %>">', function(err, file) {
		
		if(file.parsed.xmlTags.length > 0) throw new Error("Did not expect an xml tag");
		
		console.log("aspVarInHtmlYOYO");
		console.log(file.parsed);
		
		editor.closeFile(file.path);
		callback(true);
		
	});
}, 1);

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

	
	
