
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
}, 1);

	
	
