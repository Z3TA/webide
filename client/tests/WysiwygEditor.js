EDITOR.addTest(function wysiwygCorrectPreviewUrl(callback) {
	// Test if the wysiwygEditor gets the correct url and that the header and footer are not removed when editing the source
	var compiledPage = "<html>\n<body>\nheader\n<main>\n<p>main</p>\n</main>\nfooter\n</body>\n</html>\n"
	var sourcePage = "<html>\n<body>\n<p>main</p>\n</body>\n</html>\n"
	var testFolder = "/testfolder/wysiwyg/";
	var testFile = "page_compiled.htm";
	var newWindow = EDITOR.createWindow();
	
	EDITOR.createPath(testFolder, function folderCreated(err, path) {
		if(err) throw err;
		EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
	});
	
	function fileCreated(err, filePath) {
		var serveJson = {folder: testFolder};
		CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
		if(err) throw err
			
			var serveUrl = serveRespJson.url;
			
			var fileUrl = serveUrl + testFile;
		
			EDITOR.openFile("page_source.htm", sourcePage, function(err, sourceFile) {
				
				var bodyTag = "body";
				var onlyPreview = false;
				var url = fileUrl;
				var compliedSourceBodyTag = "main";
				var wysiwygEditor = new WysiwygEditor(sourceFile, bodyTag, onlyPreview, newWindow, url, wysiwygEditorLoaded, compiledPage, compliedSourceBodyTag);
				
				function wysiwygEditorLoaded() {
					
					if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
					
					// Make a edit
					sourceFile.insertTextRow("<p>Another paragraph</p>", 4);
					
					// Does the preview/wysiwyg window still contain the header and footer !?
					var html = wysiwygEditor.getPreviewWindowHtml();
					if(html.indexOf("header") == -1) throw new Error("preview/wysiwyg window doesn't contain header!");
					if(html.indexOf("footer") == -1) throw new Error("preview/wysiwyg window doesn't contain footer!");
					
					EDITOR.closeFile(sourceFile.path);
					callback(true);
					newWindow.close();
					cleanUp();
					
				}
				
			});
			});
	}
	
	function cleanUp() {
	}
	
}, 1);
