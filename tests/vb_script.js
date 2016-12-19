
editor.addTest(function vbExitForIndent(callback) {
	// The parser optimizer is unable to find foo() when only parsing foo
	editor.openFile("vbExitForIndent.asp", '<%\nFOR i = 1 TO 3\nIF x = 2 THEN EXIT FOR\nNEXT\n%>\n', function(err, file) {
		
	var indentationLine4 = file.grid[3].indentation;
	
	if(indentationLine4 != 0) throw new Error("Expected indentation on line 3 to be zero");
		
		editor.closeFile(file.path);
		callback(true);
		
	});
}, 1);


