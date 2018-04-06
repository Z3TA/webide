(function() {

EDITOR.addTest(function previewCompiled(callback) {
	/*
		Should we allow the compiler to add arbitary line breaks as padding for the body/main element !?
	*/
	
	return callback(true);
	
	var compiledPage = "<html>\n<body>\nheader\n<main>\n\n\n<h1>Hello world</h1>\n\n<p>Paragraph</p>\n\n\t</main>\nfooter\n</body>\n</html>\n"
	var sourcePage = "<html>\n<body>\n\n<h1>Hello world</h1>\n\n<p>Paragraph</p>\n\n</body>\n</html>\n"
	var testFolder = "/testfolder/wysiwyg/";
	var testFile = "page_compiled_extra_added.htm";
	var newWindow;
	
	EDITOR.createWindow({url: "about:blank"}, windowOpened);
	
	function windowOpened (err, theWindow) {
		if(err) throw err;
		newWindow = theWindow;
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
		});
	}
	
	function fileCreated(err, filePath) {
		var serveJson = {folder: testFolder};
		CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
			if(err) throw err
			
			var serveUrl = document.location.protocol + "//" + serveRespJson.url;
			
			var fileUrl = serveUrl + testFile;
			
			EDITOR.openFile("page_source.htm", sourcePage, function(err, sourceFile) {
				
				var url = fileUrl;
				
				var wysiwygEditor = new WysiwygEditor({
					sourceFile: sourceFile,
					bodyTagSource: "body",
					onlyPreview: false,
					newWindow: newWindow,
					url: url,
					whenLoaded: wysiwygEditorLoaded,
					compiledSource: compiledPage,
					bodyTagPreview: "main"
				});
				
				function wysiwygEditorLoaded() {
					
					// Does it load !?
					
					EDITOR.closeFile(sourceFile.path);
					wysiwygEditor.close();
					cleanUp();
					callback(true);
					
				}
				
			});
		});
	}
	
	function cleanUp() {
	}
	
});


EDITOR.addTest(function wysiwygCompiledHeaderFooter(callback) {
	/*
	Test if the wysiwygEditor gets the correct url in WYSIWYG-editing mode, 
		and that the header and footer are not removed when editing the source
	
		This test never failed. The bug was in the SSG ...
		This test sometimes failed/fails because the document was not fully loaded ... 
	*/
	
	var compiledPage = "<html>\n<body>\nheader\n<main>\n<p>main</p>\n</main>\nfooter\n</body>\n</html>\n"
	var sourcePage = "<html>\n<body>\n<p>main</p>\n</body>\n</html>\n"
	var testFolder = "/testfolder/wysiwyg/";
	var testFile = "page_compiled.htm";
	var newWindow;
	
	EDITOR.createWindow({url: "about:blank"}, windowOpened);
	
	function windowOpened (err, theWindow) {
		if(err) throw err;
		newWindow = theWindow;
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
		});
	}
	
	function fileCreated(err, filePath) {
		var serveJson = {folder: testFolder};
		CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
		if(err) throw err
			
			var serveUrl = document.location.protocol + "//" + serveRespJson.url;
			
			var fileUrl = serveUrl + testFile;
		
			EDITOR.openFile("page_source.htm", sourcePage, function(err, sourceFile) {
				if(err) throw err;
				
				var url = fileUrl;
				var wysiwygEditorLoadedCalled = false;
				
				setTimeout(function() {
					if(!wysiwygEditorLoadedCalled) {
						throw new Error("wysiwygEditor did not load in a timely manner.  Load the dev console on the opened window and check for errors!");
					}
				}, 8000);
				
				var wysiwygEditor = new WysiwygEditor({
					sourceFile: sourceFile, 
					bodyTagSource: "body", 
					onlyPreview: false, 
					newWindow: newWindow, 
					url: url, 
					whenLoaded: wysiwygEditorLoaded, 
					compiledSource: compiledPage, 
					bodyTagPreview: "main"
});
				
				function wysiwygEditorLoaded() {
					
					wysiwygEditorLoadedCalled = true;
					
					if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
					
					// Make a edit
					sourceFile.insertTextRow("<p>Another paragraph</p>", 4);
					
					// Does the preview/wysiwyg window still contain the header and footer !?
					var html = wysiwygEditor.getPreviewWindowHtml();
					if(html.indexOf("header") == -1) throw new Error("preview/wysiwyg window doesn't contain header!");
					if(html.indexOf("footer") == -1) throw new Error("preview/wysiwyg window doesn't contain footer!");
					
					EDITOR.closeFile(sourceFile.path);
					wysiwygEditor.close();
					cleanUp();
					callback(true);
					
				}
				
			});
			});
	}
	
	function cleanUp() {
	}
	
});


EDITOR.addTest(function wysiwygRemoveLineReplaceLine(callback) {
	/*
		It should handle a diff where one line have been removed and one line has been changed
	
		The bug is actually because the file has two emty lines (instead of only one) after the body start tag!
		Causing the startrow to be one off, then the ending line break get removed!
		
	*/
	
	var compiledPage = "<html>\n<body>\nheader\n<main>\n\n\n<p>Paragraph</p>\n\n\n</main>\nfooter\n</body>\n</html>\n";
	
	var sourcePage = "<html>\n<body>\n\n\n<p>Paragraph</p>\n\n\n</body>\n</html>\n";
	
	var testFolder = "/testfolder/wysiwyg/";
	var testFile = "wysiwygRemoveLineReplaceLine.htm";
	var newWindow;
	var wysiwygEditorLoadedCalled = false;
	
	EDITOR.createWindow({url: "about:blank"}, windowOpened);
	
	setTimeout(function() {
		if(!wysiwygEditorLoadedCalled) {
			throw new Error("wysiwygEditor did not load in a timely manner. Load the dev console on the opened window and check for errors!");
			// The test can however succeed without any errors! It just takes too long. WHY??
		}
	}, 8000);
	
	function windowOpened(err, theWindow) {
		if(err) throw err;
		
		if(!theWindow) throw new Error("theWindow=" + theWindow);
		
		newWindow = theWindow;
		
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
		});
	}
	
	function fileCreated(err, filePath) {
		var serveJson = {folder: testFolder};
		CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
			if(err) throw err
			
			var serveUrl = document.location.protocol + "//" + serveRespJson.url;
			
			var fileUrl = serveUrl + testFile;
			
			EDITOR.openFile(testFile, sourcePage, function(err, sourceFile) {
				
				if(err) throw err;
				
				var bodyTag = "body";
				var onlyPreview = false;
				var url = fileUrl;
				var compliedSourceBodyTag = "main";
				var wysiwygEditor = new WysiwygEditor({
sourceFile: sourceFile, 
bodyTagSource: bodyTag, 
onlyPreview: onlyPreview, 
newWindow: newWindow, 
url: url, 
whenLoaded: wysiwygEditorLoaded, 
compiledSource: compiledPage, 
bodyTagPreview: compliedSourceBodyTag
				});
				
				function wysiwygEditorLoaded(err, sourceFile, previewWin) {
					wysiwygEditorLoadedCalled = true;
					if(err) throw err;
					
					if(!wysiwygEditor) throw new Error("wysiwygEditor=" + wysiwygEditor);
					
					if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
					
					// Remove a line and change one line
					var doc = previewWin.document;
					var contentElement = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
					
					contentElement.innerHTML = "\n<p>Paragraph</p>\n\n\<p>foo</p>\n";
					
					// Trigger oninput
					wysiwygEditor.previewInput();
					
					// If the bug exist, it should now have removed the last line break
					// So it's now in a bad state
					// Trigger oninput again
					wysiwygEditor.previewInput();
					// The wysiwygEditor will now complain: Uncaught Error: Text on row=6 doesn't match text to be removed!
					
					
					EDITOR.closeFile(sourceFile.path);
					previewWin.close();
					cleanUp();
					callback(true);
					
					/*
						setTimeout(function checkifWindowClosed() {
					if(newWindow) throw new Error("window doesn't appear the be closed: newWindow=" + newWindow);
					}, 1000);
					*/
					
				}
				
			});
		});
	}
	
	function cleanUp() {
	}
	
});

EDITOR.addTest(function wysiwygNoExtraLineBreaks(callback) {
		var fileHtml = '<head></head><body>\n\n<p>Test wysiwygNoExtraLineBreaks</p>\n</body>';
		//var fileHtml = '<html>\n<body>\n\n<p>Test wysiwygNoExtraLineBreaks</p>\n</body></html>';
	
	launchServe(fileHtml, fileHtml, "wysiwygNoExtraLineBreaks.htm", function(err, preview, cleanup) {
		if(err) throw err;
		
		if(preview.previewWin == window) throw new Error("The preview window should not be the same as the editor's window!");
		
		var fileBodyHtml = preview.getSourceCodeBody();
		var prewBodyHTML = preview.getContentEditableCode();
		var prewHTML = preview.getPreviewWindowHtml();
		//var lb = "\n";
		//var lbPrewHTML = UTIL.occurrences(prewHTML, lb);
		//var lbHtml = UTIL.occurrences(fileHtml, lb);
		
		console.log("fileBodyHtml: " + UTIL.lbChars(fileBodyHtml));
		console.log("prewBodyHTML: " + UTIL.lbChars(prewBodyHTML));
		console.log("prewHTML: " + UTIL.lbChars(prewHTML));
		console.log("fileHtml: " + UTIL.lbChars(fileHtml));
		
		if(fileBodyHtml != prewBodyHTML)  {
			throw new Error("The fileBodyHtml is not the same as prewBodyHTML!");
		}
		
		cleanup();
		
		callback(true);
		});
});

EDITOR.addTest(function inlineConsoleLog(callback) {
	// The window might load before WysiwygEditor has overloaded window.console.log! So we need to set a timer !
		var fileHtml = '<head></head><body>\n<script>\nsetTimeout(function() {\nconsole.log("hi " + (new Date()).getTime());\n},50);\n</script>\n\n<p>Test inlineConsoleLog</p>\n</body>';
	
	launchServe(fileHtml, fileHtml, "inlineConsoleLog.htm", function(err, preview, cleanup) {
		if(err) throw err;
		
		if(preview.previewWin == window) throw new Error("The preview window should not be the same as the editor's window!");
		
		console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
		
		setTimeout(function checkEditorInfo() {
			console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
if(EDITOR.info.length == 0) throw new Error("Expected EDITOR.info!");
		
		cleanup();
		
		callback(true);
		}, 100);
		
	});
});

/*
	EDITOR.addTest(function inlineConsoleLogFast(callback) {
	// The window might load before WysiwygEditor has overloaded window.console.log! So we need to set a timer !
	var fileHtml = '<head></head><body>\n<script>\nsetTimeout(function() {\nconsole.log("hi " + (new Date()).getTime());\n},10);\n</script>\n\n<p>Hello World!</p>\n</body>';
	
	launchServe(fileHtml, fileHtml, "inlineConsoleLogFast.htm", function(err, preview, cleanup) {
		if(err) throw err;
		
		if(preview.previewWin == window) throw new Error("The preview window should not be the same as the editor's window!");
		
		console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
		
		setTimeout(function checkEditorInfo() {
			console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
			if(EDITOR.info.length == 0) throw new Error("Expected EDITOR.info!");
			
			cleanup();
			
			callback(true);
		}, 100);
		
	});
}, 1);
*/

EDITOR.addTest(function inlineErrorMessages(callback) {
	// The window might load before WysiwygEditor has set the error listener! So we need to set a timer !
		var fileHtml = '<head></head><body>\n<script>\nsetTimeout(function() {\nthrow new Error("This is an error! " + (new Date()).getTime());\n},50);\n</script>\n\n<p>Test inlineErrorMessages</p>\n</body>';
	
		launchServe(fileHtml, fileHtml, "inlineErrorMessages.htm", function(err, preview, cleanup) {
		if(err) throw err;
		
		if(preview.previewWin == window) throw new Error("The preview window should not be the same as the editor's window!");
		
		console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
		
		setTimeout(function checkEditorInfo() {
			console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
			if(EDITOR.info.length == 0) throw new Error("Expected EDITOR.info!");
			
			cleanup();
			
			callback(true);
		}, 100);
		
	});
});

EDITOR.addTest(function previewAutocomplete(callback) {
	
	var var1 = "ocument.act";
	var var2 = 'document.getElementById("foobar").innerH';
		var fileHtml = '<head></head><body>\n<script>\nd' + var1 + '\n' + var2 + '\n</script>\n<div id="foobar">Test previewAutocomplete</div>\n</body>';
	
	launchServe(fileHtml, fileHtml, "previewAutocomplete.htm", function(err, preview, cleanup) {
		if(err) throw err;
		
		var file = preview.sourceFile;
		var index = file.text.indexOf(var1) + var1.length;
		var atCaret = autoComplete(file, index);
		UTIL.assert(atCaret.word, "document.activeElement");
		
		var index = file.text.indexOf(var2) + var2.length;
		var atCaret = autoComplete(file, index);
		UTIL.assert(atCaret.word, '.innerHTML');
		
		EDITOR.closeFile(file.path);
		callback(true);
		
	});
	
	function autoComplete(file, index) {
		
		var key_tab = 9;
		var wordDelimiters = " \t\r\n;:()"
		
		file.moveCaretToIndex(index);
			EDITOR.showFile(file);
		EDITOR.mock("keydown", {charCode: key_tab}); // tab to autocomplete
		
		return file.wordAtCaret(file.caret, wordDelimiters);
	}
	
	}, 1);

	
	
function launchServe(sourcePage, compiledPage, testFile, callback) {
	
	var testFolder = "/testfolder/wysiwyg/";
	
	EDITOR.createPath(testFolder, function folderCreated(err, path) {
		if(err) return callback(err);
			EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
		});
	
	function fileCreated(err, filePath) {
		if(err) return callback(err);
		CLIENT.cmd("serve", {folder: testFolder}, function(err, serveRespJson) {
			if(err) return callback(err);
			
			var serveUrl = document.location.protocol + "//" + serveRespJson.url;
			var fileUrl = serveUrl + testFile;
			
			EDITOR.openFile(testFile, sourcePage, function(err, sourceFile) {
				if(err) return callback(err);
				
				var url = fileUrl;
				var wysiwygEditorLoadedCalled = false;
				
				setTimeout(function() {
					if(!wysiwygEditorLoadedCalled) {
						callback(new Error("wysiwygEditor did not load in a timely manner. Load the dev console on the opened window and check for errors! You might also have to enable popups!"));
						callback =  null; // Prevent it from calling again
					}
				}, 5000);
				
				var opt = {
					sourceFile: sourceFile,
					bodyTagSource: "body",
					onlyPreview: true,
					url: url,
					whenLoaded: wysiwygEditorLoaded,
				}
				
				if(compiledPage != sourcePage) {
opt.compiledSource = compiledPage;
					if(compiledPage.indexOf("<main") != -1) opt.bodyTagPreview = "main";
				}
				
				var wysiwygEditor = new WysiwygEditor(opt);
				
				function wysiwygEditorLoaded() {
					
					wysiwygEditorLoadedCalled = true;
					
					if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
					
					if(callback) callback(null, wysiwygEditor, cleanUp);
					
				}
				
				function cleanUp() {
					EDITOR.closeFile(sourceFile.path);
					wysiwygEditor.close();
				}
				
			});
		});
	}
}

})();

