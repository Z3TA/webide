EDITOR.addTest(function wysiwygCorrectPreviewUrl(callback) {
	// Test if the wysiwygEditor gets the correct url and that the header and footer are not removed when editing the source
	var compiledPage = "<html>\n<body>\nheader\n<main>\n<p>main</p>\n</main>\nfooter\n</body>\n</html>\n"
	var sourcePage = "<html>\n<body>\n<p>main</p>\n</body>\n</html>\n"
	
	// serve ...
	
	EDITOR.openFile("wysiwygCorrectPreviewUrl.htm", compiledPage, function(err, file) {
		
		if(file.parsed.comments.length != 1) throw new Error("Expected one comment")
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
	
});
